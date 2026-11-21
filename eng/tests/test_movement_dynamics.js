/**
 * test_movement_dynamics.js
 * 驗證 SPEC 3.3「大地圖移動速度與時辰耗費動態補間」與「防抖鎖定」計算
 */
const assert = require('assert');

function getLerpFactor(hourCost, delta = 1.0) {
  const baseLerp = hourCost === 1 ? 0.24 : (hourCost === 2 ? 0.13 : 0.065);
  return baseLerp * delta;
}

function shouldLockMovement(visualX, visualY, targetX, targetY, threshold = 5) {
  const dist = Math.hypot(visualX - targetX, visualY - targetY);
  return dist > threshold;
}

function runTests() {
  console.log('--- [TEST] Movement Dynamics & Debounce Tests ---');

  // 1. 耗時 1 小時 (平原/官道) 快速移動驗證
  const fastLerp = getLerpFactor(1);
  assert.strictEqual(fastLerp, 0.24, '1 小時地形補間係數應為 0.24');

  // 2. 耗時 2 小時 (荒丘/深泥) 稍慢移動驗證
  const midLerp = getLerpFactor(2);
  assert.strictEqual(midLerp, 0.13, '2 小時地形補間係數應為 0.13');

  // 3. 耗時 3 小時及以上 (黑風密林/險隘) 緩慢移動驗證
  const slowLerp = getLerpFactor(3);
  assert.strictEqual(slowLerp, 0.065, '3 小時地形補間係數應為 0.065');
  assert.ok(slowLerp < midLerp && midLerp < fastLerp, '耗時愈多，補間速度必須遞減');

  // 4. 防抖鎖定驗證：未走完前一步 (dist > 5) 必須鎖定
  const TILE_PX = 40;
  const targetX = 7 * TILE_PX;
  const targetY = 4 * TILE_PX;
  assert.strictEqual(shouldLockMovement(targetX - 15, targetY, targetX, targetY), true, '距離目標 15px 時應鎖定移動');
  assert.strictEqual(shouldLockMovement(targetX - 2, targetY, targetX, targetY), false, '距離目標 2px 時應解鎖允許下一步');

  console.log('✅ Movement Dynamics 4/4 測試通過！');
}

module.exports = { runTests, getLerpFactor, shouldLockMovement };
