const { runTests: runClockTests } = require('./test_world_clock');
const { runTests: runPathTests } = require('./test_pathfinder');
const { runTests: runChunkTests } = require('./test_chunk_transition');
const { runTests: runSchemaTests } = require('./test_map_schema');
const { runTests: runDynamicsTests } = require('./test_movement_dynamics');
const { runTests: runItemSchemaTests } = require('./test_item_schema');
const { runTests: runMartialSchemaTests } = require('./test_martial_schema');
const { runTests: runCombatStatsTests } = require('./test_combat_stats_system');
const { runTests: runCharacterSchemaTests } = require('./test_character_schema');
const runCharacterEvolutionTests = require('./test_character_evolution');
const runStorySaveTests = require('./test_story_save_system');
const runWorldGeneratorTests = require('./test_world_generator');

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
  { name: '全域物品資料 Schema 與完整性校驗', fn: runItemSchemaTests },
  { name: '全域武學與心法 20 級成長矩陣與門派約束校驗', fn: runMartialSchemaTests },
  { name: '人物經驗升級、自由潛能點與綜合戰鬥數值引擎', fn: runCombatStatsTests },
  { name: '角色實體、三大種族、形態等級區間與相異攻擊模式', fn: runCharacterSchemaTests },
  { name: '主角形態進化、等級瓶頸約束與地圖特殊魔物系統', fn: runCharacterEvolutionTests },
  { name: '故事首頁、獨立存檔打包封裝與設定資料隔離系統', fn: runStorySaveTests },
  { name: '世界地圖一鍵舖滿隨機區域地圖、比例與難度展開引擎', fn: runWorldGeneratorTests }
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
