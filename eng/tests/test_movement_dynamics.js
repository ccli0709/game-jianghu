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

  // 5. 碰壁回彈 (Bump & Rebound) 動畫計算驗證
  const bumpOffset = 12;
  const dx = 1, dy = 0; // 朝右撞牆
  const bumpedVisualX = targetX + dx * bumpOffset;
  const bumpedVisualY = targetY + dy * bumpOffset;
  assert.strictEqual(bumpedVisualX, targetX + 12, '碰壁時視覺 X 座標應朝撞擊方向微突 12px');
  assert.strictEqual(shouldLockMovement(bumpedVisualX, bumpedVisualY, targetX, targetY), true, '碰壁剛觸發時因距離 12px > 5px 應受防抖保護');

  // 模擬 Ticker 回彈收斂 (lerpFactor = 0.24)
  let simX = bumpedVisualX;
  for (let frame = 0; frame < 6; frame++) {
    simX += (targetX - simX) * 0.24;
  }
  const remainingDist = Math.abs(simX - targetX);
  assert.ok(remainingDist < 3.0, `回彈 6 幀後殘餘距離應小於 3px，實際為 ${remainingDist.toFixed(2)}px`);

  console.log('✅ Movement Dynamics 5/5 測試通過！');
}

module.exports = { runTests, getLerpFactor, shouldLockMovement };
