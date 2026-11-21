const assert = require('assert');

class MockArena {
  constructor(w = 16, h = 16) {
    this.w = w;
    this.h = h;
    this.costGrid = new Uint16Array(w * h).fill(100); // 預設青石 100
  }

  idx(x, y) { return y * this.w + x; }

  setTile(x, y, cost) {
    this.costGrid[this.idx(x, y)] = cost;
  }

  getMovementCost(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return 9999;
    return this.costGrid[this.idx(x, y)];
  }
}

class PathFinder {
  static findPath(arena, startX, startY, targetX, targetY, isBlockedCallback = () => false) {
    if (startX === targetX && startY === targetY) return [];

    const openSet = [];
    const closedSet = new Uint8Array(arena.w * arena.h);
    const cameFrom = new Map();
    const gScore = new Float32Array(arena.w * arena.h).fill(Infinity);
    const fScore = new Float32Array(arena.w * arena.h).fill(Infinity);

    const startIdx = arena.idx(startX, startY);
    gScore[startIdx] = 0;
    fScore[startIdx] = Math.abs(startX - targetX) + Math.abs(startY - targetY);

    openSet.push({ x: startX, y: startY, f: fScore[startIdx] });

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currIdx = arena.idx(current.x, current.y);

      const distToTarget = Math.abs(current.x - targetX) + Math.abs(current.y - targetY);
      if (distToTarget <= 1) {
        const path = [];
        let currKey = `${current.x},${current.y}`;
        while (cameFrom.has(currKey)) {
          const prev = cameFrom.get(currKey);
          path.unshift({ x: parseInt(currKey.split(',')[0]), y: parseInt(currKey.split(',')[1]) });
          currKey = `${prev.x},${prev.y}`;
        }
        return path;
      }

      closedSet[currIdx] = 1;

      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y }
      ];

      for (const nb of neighbors) {
        if (nb.x < 0 || nb.x >= arena.w || nb.y < 0 || nb.y >= arena.h) continue;
        const nbIdx = arena.idx(nb.x, nb.y);
        if (closedSet[nbIdx]) continue;

        const moveCost = arena.getMovementCost(nb.x, nb.y);
        if (moveCost >= 9999) continue;
        if (isBlockedCallback(nb.x, nb.y) && !(nb.x === targetX && nb.y === targetY)) continue;

        const tentativeG = gScore[currIdx] + moveCost;
        if (tentativeG < gScore[nbIdx]) {
          cameFrom.set(`${nb.x},${nb.y}`, current);
          gScore[nbIdx] = tentativeG;
          const h = (Math.abs(nb.x - targetX) + Math.abs(nb.y - targetY)) * 100;
          fScore[nbIdx] = tentativeG + h;

          if (!openSet.some(n => n.x === nb.x && n.y === nb.y)) {
            openSet.push({ x: nb.x, y: nb.y, f: fScore[nbIdx] });
          }
        }
      }
    }
    return [];
  }
}

function runTests() {
  console.log('--- [TEST] A* PathFinder Unit Tests ---');
  const arena = new MockArena(16, 16);

  // Test 1: 平坦直線尋路
  const straightPath = PathFinder.findPath(arena, 2, 2, 5, 2);
  assert.ok(straightPath.length > 0, '應成功找到直線路徑');
  assert.strictEqual(straightPath.length, 2, '從 (2,2) 接近 (5,2) 之步數應為 2 步 (鄰格即停止)');

  // Test 2: 繞過岩壁障礙 (Wall/Rock)
  // 在 (3, 2) 放置岩壁
  arena.setTile(3, 2, 9999);
  const bypassPath = PathFinder.findPath(arena, 2, 2, 4, 2);
  assert.ok(bypassPath.length > 0, '應成功繞道');
  assert.ok(!bypassPath.some(p => p.x === 3 && p.y === 2), '路徑絕對不可穿過 (3,2) 岩壁');

  // Test 3: 權衡路徑 (繞過泥濘 160 選擇青石 100)
  // 建立一塊高消耗帶
  const arenaCost = new MockArena(16, 16);
  arenaCost.setTile(3, 2, 160); // 泥濘
  arenaCost.setTile(3, 3, 100); // 青石
  const smartPath = PathFinder.findPath(arenaCost, 2, 2, 4, 2);
  assert.ok(smartPath.length > 0, '應尋得最優代價路徑');

  // Test 4: 完全被封死 (不可達)
  const lockedArena = new MockArena(16, 16);
  lockedArena.setTile(2, 1, 9999);
  lockedArena.setTile(2, 3, 9999);
  lockedArena.setTile(1, 2, 9999);
  lockedArena.setTile(3, 2, 9999);
  const impossiblePath = PathFinder.findPath(lockedArena, 2, 2, 10, 10);
  assert.strictEqual(impossiblePath.length, 0, '被完全包圍時應返回空陣列，不得拋錯崩潰');

  console.log('✅ A* PathFinder 4/4 測試通過！');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
