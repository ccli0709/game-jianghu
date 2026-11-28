const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MapSyncService = require('../../src/core/MapSyncService');

function runTests() {
  console.log('--- [TEST] Regional Map <-> Managers Reference Sync Tests ---');

  const dataDir = path.join(__dirname, '../../data');
  const catalogs = MapSyncService.loadReferenceCatalogs(dataDir);

  assert(catalogs.items.length > 0, 'items.json 必須有物品資料');
  assert(catalogs.characters.length > 0, 'characters.json 必須有角色資料');
  assert(catalogs.quests.length > 0, 'quests.json 必須有任務資料');
  assert(catalogs.events.length > 0, 'quests.json 必須有事件資料');
  assert(catalogs.sects.length >= 7, '必須有至少 7 大門派');

  // 模擬一張含有過期/不存在的敵人、任務、事件、物品、門派之區域地圖
  const staleMap = {
    width: 16,
    height: 16,
    properties: [
      { name: 'mapName', type: 'string', value: '測試過期分境' },
      { name: 'difficulty', type: 'int', value: 2 },
      { name: 'faction', type: 'string', value: '不存在的魔教分舵' },
      { name: 'possibleQuests', type: 'string', value: '已刪除的過期任務' },
      { name: 'possibleEvents', type: 'string', value: '已刪除的過期事件' },
      { name: 'possibleLoot', type: 'string', value: '已刪除的過期神兵' },
      { name: 'possibleEnemies', type: 'string', value: '已刪除的過期魔王' }
    ]
  };

  const res = MapSyncService.syncSingleRegionalMap(staleMap, catalogs, 3);
  assert.strictEqual(res.changed, true, '過期設定地圖必須被標記為已更新');
  assert.strictEqual(res.reasons.length, 5, '應修復全部 5 項過期欄位 (門派/任務/事件/物品/敵人)');

  const propMap = {};
  staleMap.properties.forEach(p => { propMap[p.name] = p.value; });

  const validSects = new Set(catalogs.sects);
  const validQuests = new Set(catalogs.quests.map(q => q.title));
  const validEvents = new Set(catalogs.events.map(e => e.title));
  const validItems = new Set(catalogs.items.map(i => i.name));
  const validChars = new Set(catalogs.characters.map(c => c.name));

  assert(validSects.has(propMap.faction), '同步後門派必須來自門派/武學總管');
  propMap.possibleQuests.split('\n').forEach(q => assert(validQuests.has(q), `任務 [${q}] 必須來自任務總管`));
  propMap.possibleEvents.split('\n').forEach(e => assert(validEvents.has(e), `事件 [${e}] 必須來自事件總管`));
  propMap.possibleLoot.split('\n').forEach(l => assert(validItems.has(l), `物品 [${l}] 必須來自物品總管`));
  propMap.possibleEnemies.split('\n').forEach(c => assert(validChars.has(c), `敵人 [${c}] 必須來自角色總管`));

  // 再次校驗應顯示無需更新
  const res2 = MapSyncService.syncSingleRegionalMap(staleMap, catalogs, 3);
  assert.strictEqual(res2.changed, false, '已同步完成之地圖再次校驗不應重複修改');

  console.log('  ✓ 過期區域地圖自動同步對齊敵人/任務/事件/物品/門派校驗通過');
  console.log('✅ 區域地圖與四大設定總管引用一致性與同步引擎全數通過校驗！');
}

module.exports = runTests;
