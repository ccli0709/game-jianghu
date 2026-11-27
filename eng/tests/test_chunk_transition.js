const assert = require('assert');

// 模擬跨區漫遊計算器
class ChunkTransitionEngine {
  constructor(worldWidth = 16, worldHeight = 16, cells = {}) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.cells = cells;
  }

  calculateTransition(curChunkX, curChunkY, curX, curY, dx, dy) {
    const nx = curX + dx;
    const ny = curY + dy;

    // 尚未出界 (16x16 內部)
    if (nx >= 0 && nx < 16 && ny >= 0 && ny < 16) {
      return { type: 'INTERNAL', x: nx, y: ny };
    }

    let targetChunkX = curChunkX;
    let targetChunkY = curChunkY;
    let enterX = curX;
    let enterY = curY;

    if (dx > 0) { targetChunkX += 1; enterX = 0; }
    else if (dx < 0) { targetChunkX -= 1; enterX = 15; }

    if (dy > 0) { targetChunkY += 1; enterY = 0; }
    else if (dy < 0) { targetChunkY -= 1; enterY = 15; }

    // 1. 檢測極限世界疆界
    if (targetChunkX < 0 || targetChunkX >= this.worldWidth || targetChunkY < 0 || targetChunkY >= this.worldHeight) {
      return {
        type: 'BLOCKED_WORLD_LIMIT',
        reason: '前方已至神州浩土極限邊界',
        targetChunk: [targetChunkX, targetChunkY]
      };
    }

    // 2. 檢測相鄰區域地圖是否存在
    const key = `${targetChunkX},${targetChunkY}`;
    const targetCell = this.cells[key];
    if (!targetCell || !targetCell.mapFile) {
      return {
        type: 'BLOCKED_UNEXPLORED',
        reason: '相鄰區塊尚未開闢區域地圖',
        targetChunk: [targetChunkX, targetChunkY]
      };
    }

    // 3. 通過跨圖檢驗
    return {
      type: 'SUCCESS_TRANSITION',
      newChunkX: targetChunkX,
      newChunkY: targetChunkY,
      enterX: enterX,
      enterY: enterY,
      targetCell: targetCell
    };
  }

  getRadarBoundaryStatus(curChunkX, curChunkY) {
    const blockedDirs = [];
    const checks = [
      { dir: '北', dx: 0, dy: -1 },
      { dir: '南', dx: 0, dy: 1 },
      { dir: '西', dx: -1, dy: 0 },
      { dir: '東', dx: 1, dy: 0 }
    ];

    for (const c of checks) {
      const cx = curChunkX + c.dx;
      const cy = curChunkY + c.dy;
      if (cx < 0 || cx >= this.worldWidth || cy < 0 || cy >= this.worldHeight) {
        blockedDirs.push(c.dir);
      } else if (!this.cells[`${cx},${cy}`]?.mapFile) {
        blockedDirs.push(c.dir);
      }
    }
    return {
      isAllConnected: blockedDirs.length === 0,
      blockedDirections: blockedDirs
    };
  }
}

function runTests() {
  console.log('--- [TEST] Chunk Transition & Boundary Tests ---');

  const mockCells = {
    '7,7': { mapFile: 'overworld_default.tmj', name: '中原核心' },
    '8,7': { mapFile: 'overworld_c8_7.tmj', name: '中原平原' },
    '7,8': { mapFile: 'overworld_c7_8.tmj', name: '蜀道崇山' }
    // 注意：未定義 (6,7) 西方 與 (7,6) 北方
  };

  const engine = new ChunkTransitionEngine(16, 16, mockCells);

  // Test 1: 東出西進成功跨圖 (在 x=15 向東走)
  const resEast = engine.calculateTransition(7, 7, 15, 8, 1, 0);
  assert.strictEqual(resEast.type, 'SUCCESS_TRANSITION');
  assert.strictEqual(resEast.newChunkX, 8);
  assert.strictEqual(resEast.newChunkY, 7);
  assert.strictEqual(resEast.enterX, 0, '東出進入鄰格應落在最西側 x=0');
  assert.strictEqual(resEast.enterY, 8, '進入 y 坐標應保持不變');

  // Test 2: 南出北進成功跨圖 (在 y=15 向南走)
  const resSouth = engine.calculateTransition(7, 7, 5, 15, 0, 1);
  assert.strictEqual(resSouth.type, 'SUCCESS_TRANSITION');
  assert.strictEqual(resSouth.newChunkX, 7);
  assert.strictEqual(resSouth.newChunkY, 8);
  assert.strictEqual(resSouth.enterX, 5);
  assert.strictEqual(resSouth.enterY, 0, '南出進入鄰格應落在最北側 y=0');

  // Test 3: 未開闢相鄰地圖阻絕 (在 x=0 向西走進入 6,7)
  const resWest = engine.calculateTransition(7, 7, 0, 8, -1, 0);
  assert.strictEqual(resWest.type, 'BLOCKED_UNEXPLORED', '未配置區域地圖之區塊必須攔截');

  // Test 4: 世界極限邊界阻絕 (在 chunk 0,0 之 x=0 向西走出界)
  const resLimit = engine.calculateTransition(0, 0, 0, 5, -1, 0);
  assert.strictEqual(resLimit.type, 'BLOCKED_WORLD_LIMIT', '超出世界維度必須攔截');

  // Test 5: 3x3 邊界雷達連通性檢查
  const radarStatus = engine.getRadarBoundaryStatus(7, 7);
  assert.strictEqual(radarStatus.isAllConnected, false);
  assert.deepStrictEqual(radarStatus.blockedDirections, ['北', '西'], '應精確識別北與西受阻');

  console.log('✅ Chunk Transition 5/5 測試通過！');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
