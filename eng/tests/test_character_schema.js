/**
 * 《浮世江湖》- 角色實體、三大種族、形態等級區間與相異攻擊模式 Schema 驗證套件
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const CharacterGenerator = require('../../src/core/CharacterGenerator');

function runTests() {
  console.log('--- [TEST] Character Schema & Race Form Integrity Tests ---');

  const { RACES, ATTACK_PATTERNS } = CharacterGenerator;

  // 1. 三大主要種族完整性
  assert(RACES.HUMAN, '必須包含人類 (HUMAN) 種族');
  assert(RACES.BEAST, '必須包含野獸 (BEAST) 種族');
  assert(RACES.MONSTER, '必須包含魔物 (MONSTER) 種族');
  console.log('  ✓ 三大種族 (人類/野獸/魔物) 定義完整');

  // 2. 形態與等級區間約束檢驗
  Object.entries(RACES).forEach(([raceKey, raceDef]) => {
    assert(raceDef.forms && Object.keys(raceDef.forms).length >= 3, `${raceKey} 必須具備至少 3 種強度形態`);
    Object.entries(raceDef.forms).forEach(([formKey, form]) => {
      assert(typeof form.minLevel === 'number' && typeof form.maxLevel === 'number', `${formKey} 形態必須定義 minLevel 與 maxLevel`);
      assert(form.minLevel <= form.maxLevel, `${formKey} 之 minLevel (${form.minLevel}) 不得大於 maxLevel (${form.maxLevel})`);
      assert(form.desc, `${formKey} 必須有形態描述`);
    });
  });
  console.log('  ✓ 所有種族之形態階梯與等級區間規範完整');

  // 3. 相異攻擊模式行為特徵檢驗
  assert(Object.keys(ATTACK_PATTERNS).length >= 8, '必須具備足夠豐富的相異攻擊模式');
  const humanPatterns = Object.values(ATTACK_PATTERNS).filter(p => p.race === 'HUMAN');
  const beastPatterns = Object.values(ATTACK_PATTERNS).filter(p => p.race === 'BEAST');
  const monsterPatterns = Object.values(ATTACK_PATTERNS).filter(p => p.race === 'MONSTER');

  assert(humanPatterns.length >= 3, '人類至少應有 3 種攻擊模式 (招式、風箏、反制等)');
  assert(beastPatterns.length >= 3, '野獸至少應有 3 種攻擊模式 (撲擊、撕裂、咆哮等)');
  assert(monsterPatterns.length >= 3, '魔物至少應有 3 種攻擊模式 (腐蝕、吸血、爆震等)');

  Object.values(ATTACK_PATTERNS).forEach(p => {
    assert(p.dmgMultiplier > 0, `${p.id} 傷害倍率必須大於 0`);
    assert(p.range >= 1 && p.range <= 4, `${p.id} 攻擊射程必須在 1~4 格之間`);
    assert(p.energyCost >= 40 && p.energyCost <= 100, `${p.id} 行動耗能必須在 40~100 之間`);
  });
  console.log(`  ✓ 攻擊模式體系檢驗通過 (人類: ${humanPatterns.length}, 野獸: ${beastPatterns.length}, 魔物: ${monsterPatterns.length})`);

  // 4. 預設角色資料庫校驗 (characters.json & characters_default.json)
  const dataDir = path.join(__dirname, '../../data');
  const filesToCheck = ['characters.json', 'characters_default.json'];

  filesToCheck.forEach(filename => {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  - 檔案 ${filename} 不存在，透過 Generator 生成...`);
      const catalog = CharacterGenerator.generateDefaultCatalog();
      fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2), 'utf8');
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert(Array.isArray(data), `${filename} 必須為陣列清單格式`);
    assert(data.length >= 15, `${filename} 至少收錄 15 組以上預設角色`);

    const idSet = new Set();
    data.forEach((c, idx) => {
      assert(!idSet.has(c.id), `${filename} 存在重複的角色 ID: ${c.id}`);
      idSet.add(c.id);

      const validation = CharacterGenerator.validateCharacterSchema(c);
      assert(validation.valid, `${filename} 第 ${idx + 1} 筆角色 [${c.id}] 驗證失敗: ${validation.message}`);
    });
  });
  console.log('  ✓ 預設角色實體資料庫 (characters.json & characters_default.json) Schema 校驗 100% 通過');

  // 5. 隨機生成角色與邊界約束檢驗
  ['HUMAN', 'BEAST', 'MONSTER'].forEach(race => {
    const randomChar = CharacterGenerator.generateRandomCharacter(race);
    const valid = CharacterGenerator.validateCharacterSchema(randomChar);
    assert(valid.valid, `隨機生成 ${race} 角色驗證失敗: ${valid.message}`);
    assert(randomChar.level >= randomChar.minLevel && randomChar.level <= randomChar.maxLevel, '生成等級必須嚴格落在形態等級範圍內');
  });
  console.log('  ✓ 三大種族動態隨機生成與等級邊界約束校驗通過');

  // 6. 一鍵生成三族自訂形態數、非重疊等級區間與三族屬性平衡校驗
  ['HUMAN', 'BEAST', 'MONSTER'].forEach(raceId => {
    [3, 5, 7].forEach(cnt => {
      const tiers = CharacterGenerator.buildNonOverlappingTiers(raceId, cnt, 50);
      assert.strictEqual(tiers.length, cnt, `${raceId} 應生成 ${cnt} 種形態`);
      assert.strictEqual(tiers[0].minLevel, 1, '第 1 階起點必須為 Lv.1');
      assert.strictEqual(tiers[tiers.length - 1].maxLevel, 50, '最終階上限必須為 Lv.50');
      for (let i = 0; i < tiers.length - 1; i++) {
        assert.strictEqual(tiers[i].maxLevel + 1, tiers[i + 1].minLevel, `${raceId} 層級 ${i + 1} 與 ${i + 2} 等級區間不得重疊且須連續`);
      }
    });
  });

  const balancedCatalog = CharacterGenerator.generateBalancedCatalog({
    humanForms: 5,
    beastForms: 5,
    monsterForms: 5,
    charsPerForm: 2,
    maxLevelCap: 50
  });
  assert.strictEqual(balancedCatalog.length, 30, '3族 × 5形態 × 2名 應生成 30 名角色');
  const balancedNames = new Set();
  balancedCatalog.forEach(c => {
    const v = CharacterGenerator.validateCharacterSchema(c);
    assert(v.valid, `一鍵生成角色 [${c.name}] 驗證失敗: ${v.message}`);
    assert(!balancedNames.has(c.name), `角色名稱重複: ${c.name}`);
    balancedNames.add(c.name);
  });

  // 同等級三種族屬性戰力平衡驗證
  const calcPower = (attr) => attr.hp * 0.2 + attr.str * 2.2 + attr.agi * 1.8 + attr.con * 1.8 + attr.wis * 1.8 + attr.def * 2.5 + attr.speed * 0.4;
  const pH = calcPower(CharacterGenerator.computeBalancedAttributes('HUMAN', 25, () => 0.5));
  const pB = calcPower(CharacterGenerator.computeBalancedAttributes('BEAST', 25, () => 0.5));
  const pM = calcPower(CharacterGenerator.computeBalancedAttributes('MONSTER', 25, () => 0.5));
  const avgP = (pH + pB + pM) / 3;
  [pH, pB, pM].forEach(p => {
    const diffRatio = Math.abs(p - avgP) / avgP;
    assert(diffRatio <= 0.1, `同等級三種族綜合戰力偏差過大 (${(diffRatio * 100).toFixed(1)}%)`);
  });
  console.log('  ✓ 一鍵生成自訂形態數、非重疊等級區間與三族屬性平衡校驗通過');

  console.log('✅ 角色實體、種族形態與相異攻擊模式 Schema 全數通過校驗！');
}

module.exports = { runTests };

if (require.main === module) {
  runTests();
}
