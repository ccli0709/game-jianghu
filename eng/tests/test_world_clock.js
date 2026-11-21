const assert = require('assert');
const { WorldClock } = require('../../src/core/WorldClock');

function runTests() {
  console.log('--- [TEST] WorldClock Unit Tests ---');

  // Test 1: 初始化與時辰名稱
  const clock = new WorldClock(1, 8);
  assert.strictEqual(clock.getShichenName(), '辰時 (食時)', '初始 08:00 應為辰時');
  assert.strictEqual(clock.getLighting().isNight, false, '08:00 不應為黑夜');

  // Test 2: 前進 8 小時至 16:00
  clock.advance(8);
  assert.strictEqual(clock.hour, 16);
  assert.strictEqual(clock.getShichenName(), '申時 (晡時)');
  assert.strictEqual(clock.getLighting().name, '夕陽晚霞');

  // Test 3: 前進 6 小時至 22:00 (進入深夜)
  clock.advance(6);
  assert.strictEqual(clock.hour, 22);
  assert.strictEqual(clock.getShichenName(), '亥時 (夜闌)');
  assert.strictEqual(clock.getLighting().isNight, true, '22:00 必須觸發深夜提燈');
  assert.strictEqual(clock.getLighting().alpha, 0.72);

  // Test 4: 跨日推進 (投宿 8 小時跨越午夜)
  clock.advance(8); // 22:00 + 8h = 次日 06:00
  assert.strictEqual(clock.day, 2, '應推進至第 2 日');
  assert.strictEqual(clock.hour, 6, '小時應為 06:00');
  assert.strictEqual(clock.getShichenName(), '卯時 (日出)');
  assert.strictEqual(clock.getLighting().isNight, false);

  console.log('✅ WorldClock 4/4 測試通過！');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
