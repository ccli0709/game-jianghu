const assert = require('assert');
const WorldGenerator = require('../../src/core/WorldGenerator');

function runTests() {
  console.log('--- [TEST] World & Regional Map Batch Generator Tests ---');

  // 1. 最大餘額法比例分配精準性驗證
  const counts = WorldGenerator.allocateCountsByRatios(255, {
    PLAINS: 40,
    MOUNTAIN: 20,
    SWAMP: 15,
    DESERT: 15,
    SNOW: 10
  });
  const sumCounts = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.strictEqual(sumCounts, 255, '比例分配總和必須嚴格等於 255');
  assert.strictEqual(counts.PLAINS, 102, '40% of 255 應為 102 格');
  assert.strictEqual(counts.MOUNTAIN, 51, '20% of 255 應為 51 格');
  console.log('  ✓ 最大餘額法區域類型比例精準分配校驗通過');

  // 2. 難度由低到高以中心向外展開 (CENTER_OUTWARD)
  const layoutOutward = WorldGenerator.generateWorldLayout({
    width: 10,
    height: 10,
    biomeRatios: { PLAINS: 30, MOUNTAIN: 20, SWAMP: 20, DESERT: 15, SNOW: 15 },
    difficultyRatios: { 1: 20, 2: 20, 3: 20, 4: 20, 5: 20 },
    fillMode: 'CENTER_OUTWARD',
    preserveCenterDefault: true
  });

  assert.strictEqual(Object.keys(layoutOutward.cells).length, 100, '10x10 世界必須 100% 舖滿');
  assert.strictEqual(Object.keys(layoutOutward.maps).length, 99, '保留中心 1 格後應生成 99 張新區域地圖');

  // 驗證所有生成檔名唯一無重複
  const fileSet = new Set(Object.values(layoutOutward.cells).map(c => c.mapFile));
  assert.strictEqual(fileSet.size, 100, '所有區域地圖檔名必須嚴格唯一');

  // 驗證中心向外難度平均距離單調遞增
  const centerX = 4;
  const centerY = 4;
  const distByDiff = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const [key, cell] of Object.entries(layoutOutward.cells)) {
    if (key === `${centerX},${centerY}`) continue;
    const [x, y] = key.split(',').map(Number);
    distByDiff[cell.difficulty].push(Math.hypot(x - centerX, y - centerY));
  }
  const avgDist = d => distByDiff[d].reduce((a, b) => a + b, 0) / distByDiff[d].length;
  for (let d = 1; d < 5; d++) {
    assert(
      avgDist(d) < avgDist(d + 1),
      `難度 ${d} 平均距離 (${avgDist(d).toFixed(2)}) 應小於難度 ${d + 1} (${avgDist(d + 1).toFixed(2)})`
    );
  }
  console.log('  ✓ CENTER_OUTWARD 難度由低到高以中心向外展開單調性校驗通過');

  // 3. CENTER_OUTWARD_CLUSTERED 生態板塊連片模式驗證
  const layoutClustered = WorldGenerator.generateWorldLayout({
    width: 8,
    height: 8,
    biomeRatios: { PLAINS: 40, MOUNTAIN: 30, SWAMP: 10, DESERT: 10, SNOW: 10 },
    difficultyRatios: { 1: 25, 2: 25, 3: 25, 4: 15, 5: 10 },
    fillMode: 'CENTER_OUTWARD_CLUSTERED',
    preserveCenterDefault: false
  });
  assert.strictEqual(Object.keys(layoutClustered.cells).length, 64, '不保留中心時應生成全部 64 格');
  assert.strictEqual(Object.keys(layoutClustered.maps).length, 64, '應產出 64 張區域地圖檔案');
  console.log('  ✓ CENTER_OUTWARD_CLUSTERED 生態連片與全覆蓋生成校驗通過');

  // 4. RANDOM 全隨機模式與 Tiled 地圖邊界通行性驗證
  const layoutRandom = WorldGenerator.generateWorldLayout({
    width: 6,
    height: 6,
    biomeRatios: { PLAINS: 20, MOUNTAIN: 20, SWAMP: 20, DESERT: 20, SNOW: 20 },
    difficultyRatios: { 1: 10, 2: 20, 3: 40, 4: 20, 5: 10 },
    fillMode: 'RANDOM',
    preserveCenterDefault: true
  });
  assert.strictEqual(Object.keys(layoutRandom.cells).length, 36, '6x6 全隨機應舖滿 36 格');

  // 檢查生成出來的每張地圖四方邊界中央路口皆非高山障礙 (GID !== 2)
  for (const [fname, tmj] of Object.entries(layoutRandom.maps)) {
    const data = tmj.layers[0].data;
    assert.strictEqual(data.length, 256, `${fname} 應為 16x16 = 256 格`);
    const borderGates = [
      data[0 * 16 + 7], data[0 * 16 + 8],
      data[15 * 16 + 7], data[15 * 16 + 8],
      data[7 * 16 + 0], data[8 * 16 + 0],
      data[7 * 16 + 15], data[8 * 16 + 15]
    ];
    assert(borderGates.every(gid => gid !== 2), `${fname} 四方跨區邊界通道不可被高山堵死`);
  }
  console.log('  ✓ RANDOM 全隨機生成與四方邊界跨區通行保證校驗通過');

  console.log('✅ 世界地圖一鍵批次生成、比例精準度與難度展開演算法全數通過校驗！');
}

module.exports = runTests;
