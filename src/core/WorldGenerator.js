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
  function createProceduralRegionalMap(biome, difficulty, x, y, filename, rng = Math.random) {
    const grid = new Uint8Array(16 * 16);
    const diff = Math.min(5, Math.max(1, parseInt(difficulty, 10) || 2));

    // GID 定義: 1=平原, 2=高山(不可通行), 3=密林, 4=城鎮, 5=客棧, 6=荒丘
    const obstacleCountBase = 15 + diff * 8;
    const innX = 3 + Math.floor(rng() * 10);
    const innY = 3 + Math.floor(rng() * 10);

    if (biome === 'PLAINS') {
      grid.fill(1);
      for (let i = 0; i < 20 + diff * 3; i++) grid[Math.floor(rng() * 256)] = 3;
      for (let i = 0; i < Math.floor(diff * 3); i++) grid[Math.floor(rng() * 256)] = 2;
      if (diff <= 2) {
        const tx = 2 + Math.floor(rng() * 12);
        const ty = 2 + Math.floor(rng() * 12);
        grid[ty * 16 + tx] = 4; // 低難度隨機城鎮
      }
      grid[innY * 16 + innX] = 5; // 客棧
    } else if (biome === 'MOUNTAIN') {
      grid.fill(6);
      for (let i = 0; i < obstacleCountBase + 15; i++) grid[Math.floor(rng() * 256)] = 2;
      const roadRow = 6 + Math.floor(rng() * 4);
      const roadCol = 6 + Math.floor(rng() * 4);
      for (let cx = 0; cx < 16; cx++) grid[roadRow * 16 + cx] = 1; // 橫貫官道
      for (let cy = 0; cy < 16; cy++) grid[cy * 16 + roadCol] = 1; // 縱貫山徑
      grid[innY * 16 + innX] = 5;
    } else if (biome === 'SWAMP') {
      grid.fill(1);
      for (let i = 0; i < 40 + diff * 5; i++) grid[Math.floor(rng() * 256)] = 3;
      for (let i = 0; i < diff * 4; i++) grid[Math.floor(rng() * 256)] = 2;
      grid[innY * 16 + innX] = 5;
    } else if (biome === 'DESERT') {
      grid.fill(6);
      for (let i = 0; i < obstacleCountBase; i++) grid[Math.floor(rng() * 256)] = 2;
      grid[innY * 16 + innX] = 5;
    } else if (biome === 'SNOW') {
      grid.fill(6);
      for (let i = 0; i < obstacleCountBase + 10; i++) grid[Math.floor(rng() * 256)] = 2;
      grid[innY * 16 + innX] = 5;
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
    // 確保客棧至少存在一處
    if (grid[innY * 16 + innX] === 2) grid[innY * 16 + innX] = 5;

    const meta = BIOME_META[biome] || { name: '未知分境' };
    const diffLabel = (DIFFICULTY_META[diff] && DIFFICULTY_META[diff].label) || '';
    const mapTitle = `${meta.name} (${x}, ${y})`;

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
        { name: 'specialType', type: 'string', value: 'NORMAL' },
        { name: 'faction', type: 'string', value: '' },
        { name: 'possibleQuests', type: 'string', value: `【懸賞】擊斃${diff >= 4 ? '兇悍魔煞' : '遊蕩悍匪'} (賞金 ${diff * 35} 兩)\n【探尋】探查此地未名奇遇` },
        { name: 'possibleLoot', type: 'string', value: diff >= 4 ? '玄鐵重刃\n大還丹' : '青鋼短劍\n行軍乾糧' }
      ],
      tilesets: [{
        firstgid: 1,
        name: 'Jianghu_Overworld_Tiles',
        tilewidth: 40,
        tileheight: 40,
        tilecount: 6,
        columns: 6,
        tiles: [
          { id: 0, properties: [{ name: 'terrainType', type: 'string', value: 'PLAINS' }, { name: 'hourCost', type: 'int', value: 1 }] },
          { id: 1, properties: [{ name: 'terrainType', type: 'string', value: 'MOUNTAIN' }, { name: 'hourCost', type: 'int', value: 999 }] },
          { id: 2, properties: [{ name: 'terrainType', type: 'string', value: 'FOREST' }, { name: 'hourCost', type: 'int', value: 3 }] },
          { id: 3, properties: [{ name: 'terrainType', type: 'string', value: 'TOWN' }, { name: 'hourCost', type: 'int', value: 1 }] },
          { id: 4, properties: [{ name: 'terrainType', type: 'string', value: 'INN' }, { name: 'hourCost', type: 'int', value: 1 }] },
          { id: 5, properties: [{ name: 'terrainType', type: 'string', value: 'HILLS' }, { name: 'hourCost', type: 'int', value: 2 }] }
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
          objects: [
            {
              id: 1,
              name: diff <= 2 ? '官道驛站客棧' : '荒野險地茶棚',
              type: 'INN',
              x: 320,
              y: 320,
              width: 40,
              height: 40,
              properties: [{ name: 'services', type: 'string', value: 'REST,RUMOR' }]
            }
          ]
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

    // 4. 組裝 worldData.cells 與對應的區域地圖 TMJ
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
        mapObj = createProceduralRegionalMap(biome, difficulty, c.x, c.y, filename, rng);
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
        name: `${meta.name} (${c.x}, ${c.y})`,
        biome,
        difficulty,
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
        fillMode
      }
    };
  }

  return {
    BIOMES,
    DIFFICULTIES,
    BIOME_META,
    DIFFICULTY_META,
    allocateCountsByRatios,
    createProceduralRegionalMap,
    generateWorldLayout
  };
}));
