/**
 * 浮世江湖 - 世界與區域地圖程序化生成核心 (WorldGenerator)
 * 支援 Node.js 與瀏覽器環境，負責：
 * 1. 依比例配置各類區域地圖類型 (PLAINS / MOUNTAIN / SWAMP / DESERT / SNOW)
 * 2. 依難度比例 (1~5 級) 與舖滿方式 (RANDOM / CENTER_OUTWARD / CENTER_OUTWARD_CLUSTERED / EDGE_INWARD) 規劃世界網格
 * 3. 生成標準 16x16 Tiled (.tmj) 區域地圖資料並確保四邊跨區通路暢通
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WorldGenerator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const BIOMES = ['PLAINS', 'MOUNTAIN', 'SWAMP', 'DESERT', 'SNOW'];
  const DIFFICULTIES = [1, 2, 3, 4, 5];
  const ORTHODOX_SECTS = ['少林寺', '武當派', '華山派', '丐幫', '峨嵋派', '逍遙派'];

  const BIOME_META = {
    PLAINS: { name: '中原平原分境', short: '🌲 中原', color: '#143823' },
    MOUNTAIN: { name: '蜀道重巒分境', short: '⛰️ 蜀道', color: '#283548' },
    SWAMP: { name: '苗疆迷沼分境', short: '〰 毒沼', color: '#262412' },
    DESERT: { name: '戈壁沙海分境', short: '▲ 戈壁', color: '#452a12' },
    SNOW: { name: '長白雪域分境', short: '❄️ 雪域', color: '#1a3048' }
  };

  const DIFFICULTY_META = {
    1: { label: '★☆☆☆☆ 初入江湖', color: '#10b981' },
    2: { label: '★★☆☆☆ 略有凶險', color: '#38bdf8' },
    3: { label: '★★★☆☆ 風雲變幻', color: '#f59e0b' },
    4: { label: '★★★★☆ 凶險萬分', color: '#f97316' },
    5: { label: '★★★★★ 九死一生', color: '#ef4444' }
  };

  /**
   * 最大餘額法 (Hamilton Method) 依權重比例精準分配總數
   * @param {number} total 總格數
   * @param {Object<string, number>} ratioMap 各鍵值之權重 (不需剛好加總為 100)
   * @returns {Object<string, number>} 各鍵值分得的整數格數
   */
  function allocateCountsByRatios(total, ratioMap) {
    const keys = Object.keys(ratioMap);
    const result = {};
    keys.forEach(k => { result[k] = 0; });
    if (total <= 0 || keys.length === 0) return result;

    let sum = 0;
    const cleanRatios = {};
    for (const k of keys) {
      const val = Math.max(0, Number(ratioMap[k]) || 0);
      cleanRatios[k] = val;
      sum += val;
    }

    // 若全部權重皆為 0，則均等分配
    if (sum <= 0) {
      keys.forEach(k => { cleanRatios[k] = 1; });
      sum = keys.length;
    }

    const remainders = [];
    let allocated = 0;
    for (const k of keys) {
      const exact = (cleanRatios[k] / sum) * total;
      const floored = Math.floor(exact);
      result[k] = floored;
      allocated += floored;
      remainders.push({ key: k, rem: exact - floored, weight: cleanRatios[k] });
    }

    // 依餘數大小由大到小補齊剩餘格數
    remainders.sort((a, b) => (b.rem - a.rem) || (b.weight - a.weight));
    let idx = 0;
    while (allocated < total) {
      result[remainders[idx % remainders.length].key] += 1;
      allocated += 1;
      idx += 1;
    }

    return result;
  }

  /**
   * Fisher-Yates 洗牌
   */
  function shuffleArray(arr, rng = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * 依各項目數量展開成陣列
   */
  function expandCountPool(countsMap, transformKey = k => k) {
    const pool = [];
    for (const [k, count] of Object.entries(countsMap)) {
      const val = transformKey(k);
      for (let i = 0; i < count; i++) {
        pool.push(val);
      }
    }
    return pool;
  }

  /**
   * 生成單一區域地圖的 16x16 Tiled (.tmj) 資料
   */
  function createProceduralRegionalMap(biome, difficulty, x, y, filename, rng = Math.random, poiFlags = null) {
    const grid = new Uint8Array(16 * 16);
    const diff = Math.min(5, Math.max(1, parseInt(difficulty, 10) || 2));
    const flags = poiFlags || { hasInn: true, hasTown: diff <= 2, hasSectBranch: false, sectHqName: null, factionName: '' };

    // GID 定義: 1=平原, 2=高山(不可通行), 3=密林, 4=城鎮市集, 5=龍門客棧, 6=荒丘, 7=門派分舵, 8=門派總舵
    const obstacleCountBase = 15 + diff * 8;

    if (biome === 'PLAINS') {
      grid.fill(1);
      for (let i = 0; i < 20 + diff * 3; i++) grid[Math.floor(rng() * 256)] = 3;
      for (let i = 0; i < Math.floor(diff * 3); i++) grid[Math.floor(rng() * 256)] = 2;
    } else if (biome === 'MOUNTAIN') {
      grid.fill(6);
      for (let i = 0; i < obstacleCountBase + 15; i++) grid[Math.floor(rng() * 256)] = 2;
      const roadRow = 6 + Math.floor(rng() * 4);
      const roadCol = 6 + Math.floor(rng() * 4);
      for (let cx = 0; cx < 16; cx++) grid[roadRow * 16 + cx] = 1; // 橫貫官道
      for (let cy = 0; cy < 16; cy++) grid[cy * 16 + roadCol] = 1; // 縱貫山徑
    } else if (biome === 'SWAMP') {
      grid.fill(1);
      for (let i = 0; i < 40 + diff * 5; i++) grid[Math.floor(rng() * 256)] = 3;
      for (let i = 0; i < diff * 4; i++) grid[Math.floor(rng() * 256)] = 2;
    } else if (biome === 'DESERT') {
      grid.fill(6);
      for (let i = 0; i < obstacleCountBase; i++) grid[Math.floor(rng() * 256)] = 2;
    } else if (biome === 'SNOW') {
      grid.fill(6);
      for (let i = 0; i < obstacleCountBase + 10; i++) grid[Math.floor(rng() * 256)] = 2;
    } else {
      grid.fill(1);
    }

    // 確保四方邊界中央路口 (7,8) 永遠可通行，避免世界漫遊跨區卡死
    const openSpots = [
      [7, 0], [8, 0],
      [7, 15], [8, 15],
      [0, 7], [0, 8],
      [15, 7], [15, 8],
      [7, 7], [8, 8]
    ];
    for (const [ox, oy] of openSpots) {
      if (grid[oy * 16 + ox] === 2) {
        grid[oy * 16 + ox] = (biome === 'MOUNTAIN' || biome === 'DESERT' || biome === 'SNOW') ? 6 : 1;
      }
    }

    // 依 POI 規劃精準放置 城鎮市集(4)、龍門客棧(5)、門派分舵(7)、門派總舵(8)
    const usedSpots = new Set();
    const pickPoiSpot = () => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const px = 2 + Math.floor(rng() * 12);
        const py = 2 + Math.floor(rng() * 12);
        const k = `${px},${py}`;
        if (!usedSpots.has(k)) {
          usedSpots.add(k);
          return [px, py];
        }
      }
      return [8, 8];
    };

    const objects = [];
    let objId = 1;

    if (flags.hasInn) {
      const [ix, iy] = pickPoiSpot();
      grid[iy * 16 + ix] = 5;
      objects.push({
        id: objId++,
        name: '龍門客棧',
        type: 'INN',
        x: ix * 40,
        y: iy * 40,
        width: 40,
        height: 40,
        properties: [{ name: 'services', type: 'string', value: 'REST,RUMOR' }]
      });
    }
    if (flags.hasTown) {
      const [tx, ty] = pickPoiSpot();
      grid[ty * 16 + tx] = 4;
      objects.push({
        id: objId++,
        name: '城鎮市集',
        type: 'TOWN',
        x: tx * 40,
        y: ty * 40,
        width: 40,
        height: 40,
        properties: [{ name: 'services', type: 'string', value: 'REST,TRADE,BOUNTY' }]
      });
    }
    if (flags.hasSectBranch) {
      const [bx, by] = pickPoiSpot();
      grid[by * 16 + bx] = 7;
      objects.push({
        id: objId++,
        name: `${flags.factionName || '江湖'}分舵`,
        type: 'SECT_BRANCH',
        x: bx * 40,
        y: by * 40,
        width: 40,
        height: 40,
        properties: [{ name: 'services', type: 'string', value: 'LEARN_MARTIAL' }]
      });
    }
    if (flags.sectHqName) {
      const [hx, hy] = pickPoiSpot();
      grid[hy * 16 + hx] = 8;
      objects.push({
        id: objId++,
        name: `${flags.sectHqName}總舵`,
        type: 'SECT_HQ',
        x: hx * 40,
        y: hy * 40,
        width: 40,
        height: 40,
        properties: [{ name: 'services', type: 'string', value: 'JOIN_SECT,LEARN_MARTIAL' }]
      });
    }

    const meta = BIOME_META[biome] || { name: '未知分境' };
    const diffLabel = (DIFFICULTY_META[diff] && DIFFICULTY_META[diff].label) || '';
    const mapTitle = flags.sectHqName ? `${flags.sectHqName}總壇 · ${meta.name} (${x}, ${y})` : `${meta.name} (${x}, ${y})`;

    return {
      compressionlevel: -1,
      width: 16,
      height: 16,
      tilewidth: 40,
      tileheight: 40,
      infinite: false,
      orientation: 'orthogonal',
      renderorder: 'right-down',
      tiledversion: '1.10.2',
      version: '1.10',
      type: 'map',
      properties: [
        { name: 'mapName', type: 'string', value: mapTitle },
        { name: 'description', type: 'string', value: `${meta.name}（${diffLabel}），天地遼闊，常有各路江湖散客與猛獸遊歷。` },
        { name: 'difficulty', type: 'int', value: diff },
        { name: 'specialType', type: 'string', value: flags.sectHqName ? 'SECT_BASE' : (flags.hasTown ? 'TOWN_MARKET' : 'NORMAL') },
        { name: 'faction', type: 'string', value: flags.sectHqName || flags.factionName || '' },
        { name: 'possibleQuests', type: 'string', value: `【懸賞】擊斃${diff >= 4 ? '兇悍魔煞' : '遊蕩悍匪'} (賞金 ${diff * 35} 兩)\n【探尋】探查此地未名奇遇` },
        { name: 'possibleLoot', type: 'string', value: diff >= 4 ? '玄鐵重刃\n大還丹' : '青鋼短劍\n行軍乾糧' }
      ],
      tilesets: [{
        firstgid: 1,
        name: 'Jianghu_Overworld_Tiles',
        tilewidth: 40,
        tileheight: 40,
        tilecount: 8,
        columns: 8,
        tiles: [
          { id: 0, properties: [{ name: 'terrainType', type: 'string', value: 'PLAINS' }, { name: 'hourCost', type: 'int', value: 1 }] },
          { id: 1, properties: [{ name: 'terrainType', type: 'string', value: 'MOUNTAIN' }, { name: 'hourCost', type: 'int', value: 999 }] },
          { id: 2, properties: [{ name: 'terrainType', type: 'string', value: 'FOREST' }, { name: 'hourCost', type: 'int', value: 3 }] },
          { id: 3, properties: [{ name: 'terrainType', type: 'string', value: 'TOWN' }, { name: 'hourCost', type: 'int', value: 1 }] },
          { id: 4, properties: [{ name: 'terrainType', type: 'string', value: 'INN' }, { name: 'hourCost', type: 'int', value: 1 }] },
          { id: 5, properties: [{ name: 'terrainType', type: 'string', value: 'HILLS' }, { name: 'hourCost', type: 'int', value: 2 }] },
          { id: 6, properties: [{ name: 'terrainType', type: 'string', value: 'SECT_BRANCH' }, { name: 'hourCost', type: 'int', value: 1 }] },
          { id: 7, properties: [{ name: 'terrainType', type: 'string', value: 'SECT_HQ' }, { name: 'hourCost', type: 'int', value: 1 }] }
        ]
      }],
      layers: [
        {
          id: 1,
          name: 'Terrain_Layer',
          type: 'tilelayer',
          width: 16,
          height: 16,
          x: 0,
          y: 0,
          opacity: 1,
          visible: true,
          data: Array.from(grid)
        },
        {
          id: 2,
          name: 'POIs_and_Entities',
          type: 'objectgroup',
          opacity: 1,
          visible: true,
          x: 0,
          y: 0,
          objects
        }
      ]
    };
  }

  /**
   * 依聚落種子點進行區域地貌擴散 (兼顧板塊連片與精準比例)
   */
  function assignClusteredBiomes(coords, biomeCounts, width, height, rng = Math.random) {
    const activeBiomes = Object.entries(biomeCounts).filter(([, c]) => c > 0);
    if (activeBiomes.length === 0) return {};

    // 依每種地貌的目標數量建立數個種子點 (大區塊給多點種子，避免單一極端角落)
    const seeds = [];
    for (const [biome, count] of activeBiomes) {
      const seedCount = Math.max(1, Math.round(count / Math.max(8, (width * height) / 14)));
      for (let s = 0; s < seedCount; s++) {
        seeds.push({
          biome,
          x: rng() * width,
          y: rng() * height
        });
      }
    }

    // 對每個座標計算到最近同類種子的偏好順序，同時用配額限制確保不超過設定比例
    const remaining = { ...biomeCounts };
    const assigned = {};
    const shuffledCoords = shuffleArray([...coords], rng);

    // 先計算每個點對各生物群系的距離分數
    for (const coord of shuffledCoords) {
      const scores = [];
      for (const [biome] of activeBiomes) {
        if (remaining[biome] <= 0) continue;
        let minDist = Infinity;
        for (const sd of seeds) {
          if (sd.biome === biome) {
            const d = Math.hypot(coord.x - sd.x, coord.y - sd.y);
            if (d < minDist) minDist = d;
          }
        }
        // 加入少量隨機擾動讓板塊邊界更自然
        scores.push({ biome, dist: minDist + (rng() - 0.5) * 0.4 });
      }
      scores.sort((a, b) => a.dist - b.dist);
      const chosen = scores[0].biome;
      assigned[coord.key] = chosen;
      remaining[chosen] -= 1;
    }

    return assigned;
  }

  /**
   * 一鍵生成舖滿整個世界地圖的區域地圖規劃與 Tiled 地圖檔
   * @param {Object} options
   * @param {number} options.width 世界寬度 (1~128)
   * @param {number} options.height 世界高度 (1~128)
   * @param {Object<string, number>} options.biomeRatios 各類區域地圖類型比例
   * @param {Object<string|number, number>} options.difficultyRatios 難度 1~5 比例
   * @param {'RANDOM'|'CENTER_OUTWARD'|'CENTER_OUTWARD_CLUSTERED'|'EDGE_INWARD'} options.fillMode 舖滿方式
   * @param {boolean} [options.preserveCenterDefault=true] 是否保留中心 (預設 7,7 或 width/2,height/2) 為 overworld_default.tmj
   * @param {Object} [options.existingCenterCell] 原先中心的 cell 資料
   * @param {Function} [options.rng=Math.random] 隨機數生成器
   * @returns {{ cells: Object, maps: Object, summary: Object }}
   */
  function generateWorldLayout(options) {
    const width = Math.min(128, Math.max(1, parseInt(options.width, 10) || 16));
    const height = Math.min(128, Math.max(1, parseInt(options.height, 10) || 16));
    const fillMode = options.fillMode || 'CENTER_OUTWARD';
    const preserveCenterDefault = options.preserveCenterDefault === true;
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;

    const centerX = Math.floor((width - 1) / 2);
    const centerY = Math.floor((height - 1) / 2);
    const centerKey = `${centerX},${centerY}`;

    const coords = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        if (preserveCenterDefault && key === centerKey) continue;
        const dist = Math.hypot(x - centerX, y - centerY);
        coords.push({ x, y, key, dist });
      }
    }

    const targetCount = coords.length;

    // 1. 計算各類區域地圖數量與各難度數量
    const biomeCounts = allocateCountsByRatios(targetCount, options.biomeRatios || {
      PLAINS: 30, MOUNTAIN: 20, SWAMP: 15, DESERT: 20, SNOW: 15
    });
    const diffCounts = allocateCountsByRatios(targetCount, options.difficultyRatios || {
      1: 20, 2: 25, 3: 25, 4: 20, 5: 10
    });

    // 2. 分配難度 (依 fillMode)
    const diffPool = expandCountPool(diffCounts, k => parseInt(k, 10)).sort((a, b) => a - b);
    const coordDifficulties = {};

    if (fillMode === 'RANDOM') {
      shuffleArray(diffPool, rng);
      coords.forEach((c, idx) => {
        coordDifficulties[c.key] = diffPool[idx];
      });
    } else if (fillMode === 'EDGE_INWARD') {
      // 外圍距離較遠處難度低 -> 中心距離較近處難度高
      const sorted = [...coords].sort((a, b) => (b.dist - a.dist) || (rng() - 0.5));
      sorted.forEach((c, idx) => {
        coordDifficulties[c.key] = diffPool[idx];
      });
    } else {
      // CENTER_OUTWARD / CENTER_OUTWARD_CLUSTERED: 距離中心越近難度越低，越遠越高
      // 同距離加上微小隨機抖動讓環帶交界自然
      const sorted = [...coords].sort((a, b) => (a.dist - b.dist) || (rng() - 0.5));
      sorted.forEach((c, idx) => {
        coordDifficulties[c.key] = diffPool[idx];
      });
    }

    // 3. 分配區域地貌類型
    let coordBiomes = {};
    if (fillMode === 'CENTER_OUTWARD_CLUSTERED') {
      coordBiomes = assignClusteredBiomes(coords, biomeCounts, width, height, rng);
    } else {
      const biomePool = shuffleArray(expandCountPool(biomeCounts), rng);
      coords.forEach((c, idx) => {
        coordBiomes[c.key] = biomePool[idx];
      });
    }

    // 4. 規劃全世界區域地圖 POI 出現比例：
    //    - 各門派「門派總舵」在全世界只能出現 1 次（不可調整）
    //    - 「門派分舵」預設 5% (可調整)
    //    - 「城鎮市集」預設 20% (可調整)
    //    - 「龍門客棧」預設 50% (可調整)
    const poiRatios = options.poiRatios || {};
    const sectBranchPct = Math.max(0, Math.min(100, Number(poiRatios.sectBranchPct ?? 5)));
    const townPct = Math.max(0, Math.min(100, Number(poiRatios.townPct ?? 20)));
    const innPct = Math.max(0, Math.min(100, Number(poiRatios.innPct ?? 50)));

    const sectBranchTarget = Math.round((targetCount * sectBranchPct) / 100);
    const townTarget = Math.round((targetCount * townPct) / 100);
    const innTarget = Math.round((targetCount * innPct) / 100);

    const poiByKey = {};
    coords.forEach(c => {
      poiByKey[c.key] = { hasInn: false, hasTown: false, hasSectBranch: false, sectHqName: null, factionName: '' };
    });

    // 4A. 各門派總舵：每個門派在全世界精確出現 1 次
    const hqCandidates = shuffleArray([...coords], rng);
    ORTHODOX_SECTS.forEach((sectName, sIdx) => {
      if (sIdx < hqCandidates.length) {
        const key = hqCandidates[sIdx].key;
        poiByKey[key].sectHqName = sectName;
        poiByKey[key].factionName = sectName;
      }
    });

    // 4B. 門派分舵 (預設 5%)
    const branchCandidates = shuffleArray([...coords], rng);
    for (let i = 0; i < Math.min(sectBranchTarget, branchCandidates.length); i++) {
      const key = branchCandidates[i].key;
      poiByKey[key].hasSectBranch = true;
      if (!poiByKey[key].factionName) {
        poiByKey[key].factionName = ORTHODOX_SECTS[i % ORTHODOX_SECTS.length];
      }
    }

    // 4C. 城鎮市集 (預設 20%)
    const townCandidates = shuffleArray([...coords], rng);
    for (let i = 0; i < Math.min(townTarget, townCandidates.length); i++) {
      poiByKey[townCandidates[i].key].hasTown = true;
    }

    // 4D. 龍門客棧 (預設 50%)
    const innCandidates = shuffleArray([...coords], rng);
    for (let i = 0; i < Math.min(innTarget, innCandidates.length); i++) {
      poiByKey[innCandidates[i].key].hasInn = true;
    }

    // 5. 組裝 worldData.cells 與對應的區域地圖 TMJ
    const cells = {};
    const maps = {};
    const nowIso = new Date().toISOString();

    const usedFilenames = new Set();
    const usedSignatures = new Set();

    if (preserveCenterDefault) {
      cells[centerKey] = options.existingCenterCell ? { ...options.existingCenterCell } : {
        mapFile: 'overworld_default.tmj',
        name: '中原核心郡縣 (洛陽·龍門)',
        biome: 'PLAINS',
        difficulty: 1,
        assignedAt: nowIso
      };
      if (!cells[centerKey].difficulty) cells[centerKey].difficulty = 1;
      usedFilenames.add(cells[centerKey].mapFile);
    }

    for (const c of coords) {
      const biome = coordBiomes[c.key] || 'PLAINS';
      const difficulty = coordDifficulties[c.key] || 2;
      const poiFlags = poiByKey[c.key];

      // 確保檔名嚴格唯一
      let filename = '';
      do {
        const randTag = Math.floor(rng() * 0xffffff).toString(36).padStart(4, '0');
        filename = `overworld_c${c.x}_${c.y}_${biome.toLowerCase()}_${randTag}.tmj`;
      } while (usedFilenames.has(filename));
      usedFilenames.add(filename);

      // 確保每張區域地圖地形矩陣也嚴格不重複
      let mapObj = null;
      let attempts = 0;
      do {
        mapObj = createProceduralRegionalMap(biome, difficulty, c.x, c.y, filename, rng, poiFlags);
        const sig = `${biome}:${mapObj.layers[0].data.join(',')}`;
        if (!usedSignatures.has(sig) || attempts >= 8) {
          usedSignatures.add(sig);
          break;
        }
        attempts++;
      } while (true);

      const meta = BIOME_META[biome] || { name: '未知分境' };

      cells[c.key] = {
        mapFile: filename,
        name: poiFlags.sectHqName ? `${poiFlags.sectHqName}總壇 (${c.x}, ${c.y})` : `${meta.name} (${c.x}, ${c.y})`,
        biome,
        difficulty,
        pois: poiFlags,
        assignedAt: nowIso
      };

      maps[filename] = mapObj;
    }

    return {
      cells,
      maps,
      summary: {
        width,
        height,
        totalCells: width * height,
        generatedCount: coords.length,
        biomeCounts,
        difficultyCounts: diffCounts,
        poiStats: {
          sectHqCount: Math.min(ORTHODOX_SECTS.length, coords.length),
          sectBranchCount: Math.min(sectBranchTarget, coords.length),
          townCount: Math.min(townTarget, coords.length),
          innCount: Math.min(innTarget, coords.length)
        },
        fillMode
      }
    };
  }

  return {
    BIOMES,
    DIFFICULTIES,
    ORTHODOX_SECTS,
    BIOME_META,
    DIFFICULTY_META,
    allocateCountsByRatios,
    createProceduralRegionalMap,
    generateWorldLayout
  };
}));
