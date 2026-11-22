const { runTests: runClockTests } = require('./test_world_clock');
const { runTests: runPathTests } = require('./test_pathfinder');
const { runTests: runChunkTests } = require('./test_chunk_transition');
const { runTests: runSchemaTests } = require('./test_map_schema');
const { runTests: runDynamicsTests } = require('./test_movement_dynamics');
const { runTests: runItemSchemaTests } = require('./test_item_schema');

console.log('====================================================');
console.log('      《浮世江湖》系統品質保證與自動化測試套件        ');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

const suites = [
  { name: 'WorldClock 時鐘與時辰系統', fn: runClockTests },
  { name: 'A* 智能尋路演算法', fn: runPathTests },
  { name: '跨區漫遊與世界邊界狀態機', fn: runChunkTests },
  { name: '地圖 Schema 與 Tiled 規範校驗', fn: runSchemaTests },
  { name: '移動速度動態補間與防抖鎖定', fn: runDynamicsTests },
  { name: '全域物品資料 Schema 與完整性校驗', fn: runItemSchemaTests }
];

const startTime = Date.now();

for (const suite of suites) {
  try {
    suite.fn();
    passCount++;
  } catch (err) {
    failCount++;
    console.error(`❌ [FAILED] ${suite.name}:`, err.message);
    if (err.stack) console.error(err.stack);
  }
  console.log('');
}

const elapsed = Date.now() - startTime;
console.log('----------------------------------------------------');
console.log(`測試套件執行完畢 (耗時 ${elapsed}ms)`);
console.log(`通過套件: ${passCount} / ${suites.length}`);
console.log(`失敗套件: ${failCount} / ${suites.length}`);
console.log('----------------------------------------------------');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 全部系統測試 100% 驗證通過！');
  process.exit(0);
}
