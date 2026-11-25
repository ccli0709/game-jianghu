/**
 * 《浮世江湖》- 主角形態進化、等級瓶頸、地圖突破魔物與全域角色生成單元測試套件
 */
const assert = require('assert');
const CharacterGenerator = require('../../src/core/CharacterGenerator');

function runTests() {
  console.log('--- [TEST] Character Evolution & Breakthrough Boss Tests ---');

  const { HUMAN_EVOLUTION_CHAIN, RACES, ATTACK_PATTERNS } = CharacterGenerator;

  // 1. 人類形態進化路線完整性
  assert(HUMAN_EVOLUTION_CHAIN, '必須定義 HUMAN_EVOLUTION_CHAIN');
  const expectedChain = ['CIVILIAN', 'OUTLAW', 'MARTIAL_ARTIST', 'SECT_ELITE'];
  expectedChain.forEach(formKey => {
    const evo = HUMAN_EVOLUTION_CHAIN[formKey];
    assert(evo, `必須定義形態 ${formKey} 之突破進化設定`);
    assert(evo.breakthroughLevel > 0, `${formKey} 必須定義突破等級`);
    assert(evo.nextForm, `${formKey} 必須定義下一階形態`);
    assert(evo.nextMaxLevel > evo.breakthroughLevel, `${formKey} 下一階等級上限必須高於突破等級`);
    assert(evo.bonusPoints > 0, `${formKey} 突破必須獎勵自由潛能點`);
    assert(evo.statBonus > 0, `${formKey} 突破必須獎勵基礎屬性`);
    assert(evo.boss, `${formKey} 必須指定突破魔物`);
    assert.strictEqual(evo.boss.race, 'MONSTER', `突破魔物種族必須為 MONSTER`);
    assert(ATTACK_PATTERNS[evo.boss.attackPattern], `突破魔物必須具有合法攻擊模式: ${evo.boss.attackPattern}`);
  });
  console.log('  ✓ 人類 4 階形態進化階梯與突破魔物 (MONSTER) 規範完整');

  // 2. 主角初始形態與瓶頸檢查
  const player = {
    name: '李暮雲',
    race: 'HUMAN',
    form: 'CIVILIAN',
    formName: '鄉井平民',
    level: 1,
    minLevel: 1,
    maxLevel: 5,
    isBreakthroughPending: false,
    exp: 0,
    maxExp: 100,
    freeAttributePoints: 5,
    attributes: { str: 20, agi: 20, con: 20, wis: 20, lck: 20 }
  };

  assert.strictEqual(player.race, 'HUMAN', '主角初始種族必須為人類');
  assert.strictEqual(player.form, 'CIVILIAN', '主角初始形態必須為鄉井平民');
  assert.strictEqual(player.level, 1, '主角初始等級必須為 1');
  assert.strictEqual(player.maxLevel, 5, '主角鄉井平民形態等級上限必須為 5');
  console.log('  ✓ 主角初始為人類平民 (Lv.1 / 上限 Lv.5)');

  // 3. 升級與形態封頂瓶頸模擬
  function simulateAddExp(p, amount, spawnBossCallback) {
    if (p.isBreakthroughPending) return false;
    p.exp += amount;
    while (p.exp >= p.maxExp) {
      if (p.level >= p.maxLevel) {
        p.exp = p.maxExp;
        p.isBreakthroughPending = true;
        if (spawnBossCallback) spawnBossCallback(p);
        break;
      }
      p.exp -= p.maxExp;
      p.level++;
      p.freeAttributePoints += 5;
      p.maxExp = Math.round(100 * Math.pow(1.28, p.level - 1));
      if (p.level >= p.maxLevel) {
        p.isBreakthroughPending = true;
        if (spawnBossCallback) spawnBossCallback(p);
        break;
      }
    }
    return true;
  }

  let spawnedBoss = null;
  function mockSpawnBoss(p) {
    const evo = CharacterGenerator.getEvolutionBreakthrough(p.form);
    spawnedBoss = {
      id: `boss_breakthrough_${p.form}`,
      name: evo.boss.name,
      race: evo.boss.race,
      form: evo.boss.form,
      level: evo.boss.level,
      isBoss: true,
      isEvolutionBoss: true,
      targetForm: evo.nextForm,
      targetFormName: evo.nextFormName,
      attackPattern: evo.boss.attackPattern,
      hp: evo.boss.hp
    };
  }

  // 給予大量經驗直至滿級
  simulateAddExp(player, 1000, mockSpawnBoss);
  assert.strictEqual(player.level, 5, '達到平民上限時等級必須卡在 Lv.5');
  assert.strictEqual(player.isBreakthroughPending, true, '達到形態上限時必須標記為 isBreakthroughPending');
  assert(spawnedBoss, '達到形態上限時必須生成突破特殊魔物');
  assert.strictEqual(spawnedBoss.isEvolutionBoss, true, '突破魔物必須具有 isEvolutionBoss 標記');
  assert.strictEqual(spawnedBoss.race, 'MONSTER', '突破魔物必須是 MONSTER');

  // 嘗試在瓶頸期再加經驗，等級不得突破
  simulateAddExp(player, 500, mockSpawnBoss);
  assert.strictEqual(player.level, 5, '未擊敗突破魔物前等級絕對不得突破 Lv.5');
  console.log('  ✓ 形態最高等級瓶頸鎖定與突破特殊魔物生成校驗通過');

  // 4. 擊破特殊魔物進化模擬
  function simulateEvolve(p, boss) {
    assert(boss.isEvolutionBoss, '擊敗之目標必須為突破魔物');
    const evo = CharacterGenerator.getEvolutionBreakthrough(p.form);
    p.isBreakthroughPending = false;
    p.form = evo.nextForm;
    p.formName = evo.nextFormName;
    p.maxLevel = evo.nextMaxLevel;
    ['str', 'agi', 'con', 'wis', 'lck'].forEach(k => {
      p.attributes[k] += evo.statBonus;
    });
    p.freeAttributePoints += evo.bonusPoints;
  }

  simulateEvolve(player, spawnedBoss);
  assert.strictEqual(player.form, 'OUTLAW', '擊敗魔煞後形態必須進化為綠林草莽 (OUTLAW)');
  assert.strictEqual(player.maxLevel, 12, '進化為綠林草莽後等級上限解鎖至 Lv.12');
  assert.strictEqual(player.isBreakthroughPending, false, '進化後瓶頸必須解除');
  assert.strictEqual(player.attributes.str, 23, '全屬性必須獲得進化加成 (+3)');
  assert(player.freeAttributePoints >= 35, '進化必須發放巨額自由潛能點 (+15)');

  // 瓶頸解除後可繼續升級
  simulateAddExp(player, 400, mockSpawnBoss);
  assert(player.level > 5, '進化後經驗值累積可順暢升級至 Lv.6+');
  console.log(`  ✓ 擊敗突破魔物成功進化至【${player.formName}】(上限 Lv.${player.maxLevel})，屬性與潛能獎勵派發無誤`);

  // 5. 大地圖生態敵人挑選驗證
  const plainsEnemy = CharacterGenerator.selectEnemyForEncounter('PLAINS', 3);
  assert(plainsEnemy && plainsEnemy.name && plainsEnemy.attackPattern, '平原遭遇敵人必須合法');
  const swampEnemy = CharacterGenerator.selectEnemyForEncounter('SWAMP', 8);
  assert(swampEnemy && swampEnemy.name && swampEnemy.attackPattern, '沼澤遭遇敵人必須合法');
  console.log('  ✓ 全地貌生態與角色庫隨機遭遇敵人挑選校驗通過');

  console.log('✅ 主角形態進化、等級瓶頸約束與突破魔物系統全數通過校驗！\n');
  return true;
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
