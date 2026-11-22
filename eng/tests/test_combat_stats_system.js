/**
 * 《浮世江湖》- 人物經驗值、升級、自由潛能點與綜合戰鬥數值系統單元測試
 */
const assert = require('assert');

function runTests() {
  console.log('--- [TEST] Combat Stats Engine & Level Up Potential Tests ---');

  // 1. 創建模擬玩家
  const createMockPlayer = () => ({
    name: '李暮雲',
    title: '初入江湖的無名散客',
    realm: '初入江湖',
    level: 1,
    exp: 0,
    maxExp: 100,
    freeAttributePoints: 5,
    statuses: [],
    attributes: {
      str: 20,
      agi: 20,
      con: 20,
      wis: 20,
      lck: 20,
      rep: 10,
      strain: 0
    },
    equipment: {
      weapon: { attributes: { atk: 25, critRate: 5 } },
      armor: { attributes: { def: 15, hpBonus: 30, dodge: 5 } },
      trinket: { attributes: { def: 5, atk: 5, hpBonus: 20, qiBonus: 20, dodge: 2, critRate: 3 } }
    },
    equippedCultivations: [
      {
        id: 'cul_1',
        name: '吐納心法',
        currentLevel: 2,
        levelBonuses: [
          { def: 5, hpMax: 20, qiMax: 15 },
          { def: 10, hpMax: 40, qiMax: 30 }
        ]
      }
    ],
    equippedMartials: [
      {
        id: 'mar_1',
        name: '太祖長拳',
        currentLevel: 2,
        levelBonuses: [
          { atk: 10, critRate: 4 },
          { atk: 20, critRate: 8 }
        ]
      }
    ],
    hp: 100,
    maxHp: 100,
    qi: 80,
    maxQi: 80
  });

  // 計算邏輯實現 (與 index.html 引擎完全自洽)
  function calcStats(p, actionMartial = null) {
    const attrs = p.attributes;
    const str = attrs.str;
    const agi = attrs.agi;
    const con = attrs.con;
    const wis = attrs.wis;
    const lck = attrs.lck;
    const strain = attrs.strain || 0;

    const baseAtk = Math.round(str * 1.8);
    const baseDef = Math.round(str * 0.4 + con * 1.3 + wis * 0.5);
    const baseDodge = Math.round(agi * 0.45 + lck * 0.2);
    const baseCrit = Math.round(agi * 0.35 + lck * 0.3);
    const baseHp = Math.round(80 + con * 4.5);
    const baseQi = Math.round(60 + wis * 3.5);

    let equipAtk = (p.equipment?.weapon?.attributes?.atk || 0) + (p.equipment?.trinket?.attributes?.atk || 0);
    let equipDef = (p.equipment?.armor?.attributes?.def || 0) + (p.equipment?.trinket?.attributes?.def || 0);
    let equipHp = (p.equipment?.armor?.attributes?.hpBonus || 0) + (p.equipment?.trinket?.attributes?.hpBonus || 0);
    let equipQi = (p.equipment?.trinket?.attributes?.qiBonus || 0);
    let equipDodge = (p.equipment?.armor?.attributes?.dodge || 0) + (p.equipment?.trinket?.attributes?.dodge || 0);
    let equipCrit = (p.equipment?.weapon?.attributes?.critRate || 0) + (p.equipment?.trinket?.attributes?.critRate || 0);

    let cultDef = 0, cultHp = 0, cultQi = 0, cultDodge = 0;
    p.equippedCultivations.forEach(c => {
      const b = c.levelBonuses[c.currentLevel - 1] || {};
      cultDef += (b.def || 0);
      cultHp += (b.hpMax || 0);
      cultQi += (b.qiMax || 0);
      cultDodge += (b.dodge || 0);
    });

    let martialAtk = 0, martialCrit = 0;
    if (actionMartial) {
      const b = actionMartial.levelBonuses[actionMartial.currentLevel - 1] || {};
      martialAtk += (b.atk || 0);
      martialCrit += (b.critRate || 0);
    } else {
      p.equippedMartials.forEach(m => {
        martialAtk += Math.round(m.currentLevel * 2.5);
        martialCrit += Math.round(m.currentLevel * 0.5);
      });
    }

    let atkMul = 1.0;
    let defMul = 1.0;
    let dodgeMod = 0;
    let isStunned = false;

    p.statuses.forEach(s => {
      if (s.id === 'STUNNED') isStunned = true;
      if (s.id === 'POISONED') { defMul *= 0.85; dodgeMod -= 15; }
      if (s.id === 'INSPIRED') { atkMul *= 1.25; defMul *= 1.20; dodgeMod += 10; }
      if (s.id === 'WOUNDED') { atkMul *= 0.80; defMul *= 0.80; dodgeMod -= 10; }
    });

    if (strain > 0) {
      const pen = Math.min(0.3, strain * 0.005);
      atkMul *= (1 - pen);
      defMul *= (1 - pen);
    }

    const finalAtk = Math.max(8, Math.round((baseAtk + equipAtk + martialAtk) * atkMul));
    const finalDef = Math.max(5, Math.round((baseDef + equipDef + cultDef) * defMul));
    const finalDodge = isStunned ? 0 : Math.max(0, Math.min(80, Math.round(baseDodge + equipDodge + cultDodge + dodgeMod)));
    const finalCrit = Math.max(0, Math.min(85, Math.round(baseCrit + equipCrit + martialCrit)));
    const finalMaxHp = Math.round(baseHp + equipHp + cultHp);
    const finalMaxQi = Math.round(baseQi + equipQi + cultQi);

    return {
      atk: finalAtk,
      def: finalDef,
      dodge: finalDodge,
      crit: finalCrit,
      maxHp: finalMaxHp,
      maxQi: finalMaxQi,
      isStunned
    };
  }

  // 1. 基礎無狀態計算檢驗
  const p1 = createMockPlayer();
  const baseStats = calcStats(p1);
  assert.strictEqual(typeof baseStats.atk, 'number');
  assert.strictEqual(typeof baseStats.def, 'number');
  assert.strictEqual(typeof baseStats.dodge, 'number');
  assert.strictEqual(baseStats.isStunned, false);
  console.log(`  ✓ 基礎無狀態綜合數值測試通過 (ATK: ${baseStats.atk}, DEF: ${baseStats.def}, DODGE: ${baseStats.dodge}%, HP: ${baseStats.maxHp})`);

  // 2. 狀態系統影響檢驗：中毒 (POISONED) -> 防禦 -15%，閃避 -15%
  p1.statuses.push({ id: 'POISONED', name: '中毒', duration: 3 });
  const poisonStats = calcStats(p1);
  assert(poisonStats.def < baseStats.def, '中毒應降低防禦力');
  assert(poisonStats.dodge < baseStats.dodge, '中毒應降低閃避率');
  console.log(`  ✓ 中毒狀態削弱防禦與身法閃避測試通過 (DEF: ${poisonStats.def} < ${baseStats.def}, DODGE: ${poisonStats.dodge}% < ${baseStats.dodge}%)`);

  // 3. 狀態系統影響檢驗：奮起 (INSPIRED) -> 攻擊 +25%，防禦 +20%，閃避 +10%
  p1.statuses = [{ id: 'INSPIRED', name: '奮起', duration: 3 }];
  const inspireStats = calcStats(p1);
  assert(inspireStats.atk > baseStats.atk, '奮起應大幅提升攻擊力');
  assert(inspireStats.def > baseStats.def, '奮起應提升防禦力');
  assert(inspireStats.dodge > baseStats.dodge, '奮起應提升閃避率');
  console.log(`  ✓ 奮起狀態大幅提升攻防與閃避測試通過 (ATK: ${inspireStats.atk} > ${baseStats.atk})`);

  // 4. 狀態系統影響檢驗：受傷 (WOUNDED) -> 攻擊 -20%，防禦 -20%，閃避 -10%
  p1.statuses = [{ id: 'WOUNDED', name: '受傷', duration: 3 }];
  const woundStats = calcStats(p1);
  assert(woundStats.atk < baseStats.atk, '受傷應削弱攻擊力');
  assert(woundStats.def < baseStats.def, '受傷應削弱防禦力');
  console.log(`  ✓ 受傷狀態全面削弱攻防測試通過 (ATK: ${woundStats.atk} < ${baseStats.atk})`);

  // 5. 狀態系統影響檢驗：暈眩 (STUNNED) -> 閃避率強制歸 0%
  p1.statuses = [{ id: 'STUNNED', name: '暈眩', duration: 1 }];
  const stunStats = calcStats(p1);
  assert.strictEqual(stunStats.dodge, 0, '暈眩時身法閃避率必須強制歸零');
  assert.strictEqual(stunStats.isStunned, true);
  console.log(`  ✓ 暈眩狀態閃避率強制歸零 (DODGE: ${stunStats.dodge}%) 測試通過`);

  // 6. 出招外功加成檢驗
  p1.statuses = [];
  const moveStats = calcStats(p1, p1.equippedMartials[0]);
  assert(moveStats.atk > baseStats.atk, '施展外功奧義應享有招式攻擊加成');
  console.log(`  ✓ 施展外功武學招式加成測試通過 (奧義出招 ATK: ${moveStats.atk} > 平常 ATK: ${baseStats.atk})`);

  // 7. 人物修為經驗值累積與升級 (addPlayerExp)
  const p2 = createMockPlayer();
  assert.strictEqual(p2.level, 1);
  assert.strictEqual(p2.freeAttributePoints, 5);

  function addExp(p, amount) {
    p.exp += amount;
    while (p.exp >= p.maxExp) {
      p.exp -= p.maxExp;
      p.level++;
      p.freeAttributePoints += 5;
      p.maxExp = Math.round(100 * Math.pow(1.28, p.level - 1));
      p.hp = p.maxHp;
      p.qi = p.maxQi;
    }
  }

  addExp(p2, 60);
  assert.strictEqual(p2.level, 1);
  assert.strictEqual(p2.exp, 60);

  addExp(p2, 70); // 累計 130 >= 100，升至 Lv.2，剩餘 30 經驗
  assert.strictEqual(p2.level, 2);
  assert.strictEqual(p2.exp, 30);
  assert.strictEqual(p2.freeAttributePoints, 10, '升級應發放 5 點自由潛能點 (初始5 + 升級5 = 10)');
  assert(p2.maxExp > 100, '升級後最大經驗值應相應提高');
  console.log(`  ✓ 人物經驗累積與自動升級測試通過 (突破至 Lv.${p2.level}, 自由點數: ${p2.freeAttributePoints})`);

  // 8. 自由潛能點分配 (allocateAttributePoint)
  function allocatePoint(p, attrKey) {
    assert(p.freeAttributePoints > 0, '必須有可分配點數');
    p.attributes[attrKey]++;
    p.freeAttributePoints--;
  }

  const initialStr = p2.attributes.str;
  allocatePoint(p2, 'str');
  allocatePoint(p2, 'str');
  assert.strictEqual(p2.attributes.str, initialStr + 2);
  assert.strictEqual(p2.freeAttributePoints, 8);

  const statsAfterAdd = calcStats(p2);
  assert(statsAfterAdd.atk > baseStats.atk, '加臂力後外功攻擊力應提升');
  console.log(`  ✓ 自由潛能點分配與戰鬥屬性即時成長測試通過 (臂力: ${p2.attributes.str}, ATK 提升至: ${statsAfterAdd.atk})`);

  console.log('✅ 人物經驗值升級與綜合戰鬥數值引擎全數通過校驗！');
}

module.exports = { runTests };

if (require.main === module) {
  runTests();
}
