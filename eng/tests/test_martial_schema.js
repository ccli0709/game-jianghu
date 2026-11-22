/**
 * test_martial_schema.js
 * 驗證武功與心法全域系統規範、等級成長曲線、門派歸屬與裝備上限約束
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  SECTS,
  MARTIAL_TYPES,
  MAX_LEVEL,
  MAX_EQUIPPED_MARTIALS,
  MAX_EQUIPPED_CULTIVATIONS,
  getRealmTitle,
  getExpRequiredForLevel,
  generateLevelBonuses,
  generateDefaultMartials
} = require('../../src/core/MartialGenerator');

const MARTIALS_FILE = path.join(__dirname, '../../data/martials.json');
const MARTIALS_DEFAULT_FILE = path.join(__dirname, '../../data/martials_default.json');

const VALID_SECT_IDS = Object.keys(SECTS);
const VALID_TYPES = Object.keys(MARTIAL_TYPES);

function runTests() {
  console.log('--- [TEST] Martial & Cultivation Schema Integrity Tests ---');

  // 1. 核心規則常數檢驗
  assert.strictEqual(MAX_LEVEL, 20, '武功與心法最高等級必須為 20 級');
  assert.strictEqual(MAX_EQUIPPED_MARTIALS, 3, '一次最多裝備三個武功');
  assert.strictEqual(MAX_EQUIPPED_CULTIVATIONS, 3, '一次最多裝備三個心法');
  assert.strictEqual(VALID_SECT_IDS.length, 7, '必須完整涵蓋七大門派體系');

  // 2. 經驗值與境界稱謂梯度檢驗
  assert.strictEqual(getRealmTitle(1), '初窺門徑', '1 級稱謂應為 初窺門徑');
  assert.strictEqual(getRealmTitle(10), '融會貫通', '10 級稱謂應為 融會貫通');
  assert.strictEqual(getRealmTitle(20), '登峰造極', '20 級稱謂應為 登峰造極');

  assert.strictEqual(getExpRequiredForLevel(1), 50, '1 級升級所需經驗應為 50');
  assert.strictEqual(getExpRequiredForLevel(20), 0, '20 級滿級所需經驗應為 0');
  assert.ok(getExpRequiredForLevel(10) > getExpRequiredForLevel(5), '升級經驗值隨等級平滑遞增');

  // 3. 檔案存在性檢驗
  assert.ok(fs.existsSync(MARTIALS_FILE), `武學資料庫檔案必須存在於 ${MARTIALS_FILE}`);
  assert.ok(fs.existsSync(MARTIALS_DEFAULT_FILE), `預設武學備份檔案必須存在於 ${MARTIALS_DEFAULT_FILE}`);

  const raw = fs.readFileSync(MARTIALS_FILE, 'utf8');
  let martials;
  try {
    martials = JSON.parse(raw);
  } catch (e) {
    assert.fail(`data/martials.json 格式必須為合法 JSON: ${e.message}`);
  }

  assert.ok(Array.isArray(martials), 'data/martials.json 必須為陣列');
  assert.ok(martials.length >= 10, `預設武學心法資料庫至少應有 10 部以上，現有: ${martials.length}`);

  // 4. 武學與心法欄位、門派、加成矩陣逐項校驗
  const idSet = new Set();
  let martialCount = 0;
  let cultivationCount = 0;

  martials.forEach((item, idx) => {
    assert.ok(item.id && typeof item.id === 'string', `第 ${idx} 項必須具備字串 id`);
    assert.ok(!idSet.has(item.id), `武學 ID 重複: "${item.id}" (第 ${idx} 項)`);
    idSet.add(item.id);

    assert.ok(item.name && typeof item.name === 'string', `武學 "${item.id}" 缺少名稱 name`);
    assert.ok(VALID_TYPES.includes(item.type), `武學 "${item.id}" 的 type "${item.type}" 不合法`);
    assert.ok(VALID_SECT_IDS.includes(item.sect), `武學 "${item.id}" 的門派 "${item.sect}" 不合法`);
    assert.strictEqual(item.maxLevel, 20, `武學 "${item.id}" 的 maxLevel 必須為 20`);

    if (item.type === 'MARTIAL') martialCount++;
    if (item.type === 'CULTIVATION') cultivationCount++;

    // 檢驗 1~20 級成長矩陣
    assert.ok(Array.isArray(item.levelBonuses), `武學 "${item.id}" 必須具備 20 級成長矩陣 levelBonuses`);
    assert.strictEqual(item.levelBonuses.length, 20, `武學 "${item.id}" 的 levelBonuses 陣列長度必須剛好為 20 級`);

    for (let lv = 1; lv <= 20; lv++) {
      const bonus = item.levelBonuses[lv - 1];
      assert.strictEqual(bonus.level, lv, `武學 "${item.id}" 的等級指標必須對應 ${lv}`);
      assert.ok(bonus.title && typeof bonus.title === 'string', `武學 "${item.id}" 第 ${lv} 級必須具備境界稱謂`);
      assert.ok(typeof bonus.expNeeded === 'number', `武學 "${item.id}" 第 ${lv} 級經驗需求必須為數字`);

      if (item.type === 'MARTIAL') {
        // 武功加成偏向外功攻擊力
        assert.ok(typeof bonus.atk === 'number' && bonus.atk > 0, `外功武學 "${item.id}" 第 ${lv} 級必須具備攻擊力加成 atk > 0`);
        assert.ok(typeof bonus.critRate === 'number', `外功武學 "${item.id}" 第 ${lv} 級必須具備暴擊率加成`);
        if (lv > 1) {
          const prev = item.levelBonuses[lv - 2];
          assert.ok(bonus.atk >= prev.atk, `外功武學 "${item.id}" 等級提升時攻擊力必須遞增`);
        }
      } else {
        // 心法加成偏向輔助、防禦、氣血上限
        assert.ok(typeof bonus.def === 'number' && bonus.def > 0, `內功心法 "${item.id}" 第 ${lv} 級必須具備防禦加成 def > 0`);
        assert.ok(typeof bonus.hpMax === 'number' && bonus.hpMax > 0, `內功心法 "${item.id}" 第 ${lv} 級必須具備氣血上限加成 hpMax > 0`);
        if (lv > 1) {
          const prev = item.levelBonuses[lv - 2];
          assert.ok(bonus.def >= prev.def, `內功心法 "${item.id}" 等級提升時防禦力必須遞增`);
        }
      }
    }
  });

  assert.ok(martialCount > 0, '資料庫中必須包含外功武學 (MARTIAL)');
  assert.ok(cultivationCount > 0, '資料庫中必須包含內功心法 (CULTIVATION)');

  console.log(`✅ 通過 ${martials.length} 部武功心法（外功: ${martialCount}，內功: ${cultivationCount}）Schema 與 20 級成長數值驗證！`);
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
