const assert = require('assert');
const fs = require('fs');
const path = require('path');
const QuestEventGenerator = require('../../src/core/QuestEventGenerator');

function runTests() {
  console.log('--- [TEST] Quest & Random Event Schema Integrity Tests ---');

  // 1. 預設任務與事件庫驗證
  const defaults = QuestEventGenerator.generateDefaultQuestsCatalog();
  assert(defaults.length >= 20, `預設任務與事件庫至少應有 20 筆，現有 ${defaults.length}`);

  const quests = defaults.filter(e => e.entryType === 'QUEST');
  const events = defaults.filter(e => e.entryType === 'EVENT');
  assert(quests.length >= 10, '至少應包含 10 個江湖任務 (QUEST)');
  assert(events.length >= 10, '至少應包含 10 個隨機事件 (EVENT)');

  // 驗證任務獎勵規則：基本必得 exp > 0 與 gold > 0，且少數可獲得物品
  let withItemCount = 0;
  quests.forEach(q => {
    const v = QuestEventGenerator.validateQuestEventSchema(q);
    assert(v.valid, `任務 ${q.id} 驗證失敗: ${v.message}`);
    assert(q.rewards.exp > 0, `任務 ${q.title} 必須有經驗值獎勵`);
    assert(q.rewards.gold > 0, `任務 ${q.title} 必須有金錢獎勵`);
    if (q.rewards.itemId) withItemCount++;
  });
  assert(withItemCount > 0 && withItemCount < quests.length, `應只有少數任務附帶物品獎勵 (目前 ${withItemCount}/${quests.length})`);

  // 驗證事件涵蓋：撿到錢 (TREASURE)、頓悟增經驗 (EPIPHANY)、險地受傷 (HAZARD)
  const hasTreasure = events.some(e => e.eventCategory === 'TREASURE' && e.effects.goldDelta > 0);
  const hasEpiphany = events.some(e => e.eventCategory === 'EPIPHANY' && e.effects.expDelta > 0);
  const hasHazard = events.some(e => e.eventCategory === 'HAZARD' && e.effects.hpDelta < 0);
  assert(hasTreasure, '隨機事件必須包含撿到錢 (TREASURE)');
  assert(hasEpiphany, '隨機事件必須包含頓悟增加經驗值 (EPIPHANY)');
  assert(hasHazard, '隨機事件必須包含險惡地形受傷 (HAZARD)');

  events.forEach(ev => {
    const v = QuestEventGenerator.validateQuestEventSchema(ev);
    assert(v.valid, `事件 ${ev.id} 驗證失敗: ${v.message}`);
  });

  // 2. 一鍵隨機生成驗證
  const generated = QuestEventGenerator.generateBalancedQuestsCatalog({
    questCount: 15,
    eventCount: 15,
    itemRewardRatio: 0.25
  });
  assert.strictEqual(generated.length, 30, '應精確生成 15 任務 + 15 事件 = 30 筆');
  generated.forEach(entry => {
    const v = QuestEventGenerator.validateQuestEventSchema(entry);
    assert(v.valid, `隨機生成項目 ${entry.id} 驗證失敗: ${v.message}`);
  });

  // 3. 檢查 data/quests.json 若已存在則驗證其合法性
  const questsFile = path.join(__dirname, '../../data/quests.json');
  if (fs.existsSync(questsFile)) {
    const saved = JSON.parse(fs.readFileSync(questsFile, 'utf8'));
    assert(Array.isArray(saved) && saved.length > 0, 'data/quests.json 必須為非空陣列');
    saved.forEach(item => {
      const v = QuestEventGenerator.validateQuestEventSchema(item);
      assert(v.valid, `data/quests.json 項目 ${item.id} 驗證失敗: ${v.message}`);
    });
  }

  console.log(`✅ 通過 ${defaults.length} 筆預設與 ${generated.length} 筆隨機任務/事件 Schema 與規則校驗！`);
}

module.exports = runTests;
