/**
 * test_item_schema.js
 * 驗證 SPEC 3.5「全域物品與裝備設計系統規範」與 data/items.json 資料完整性
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { generateDefaultCatalog, CATEGORIES, TIER_DEFS } = require('../../src/core/ItemGenerator');

const ITEMS_FILE = path.join(__dirname, '../../data/items.json');
const DEFAULT_FILE = path.join(__dirname, '../../data/default.json');
const ITEMS_DEFAULT_FILE = path.join(__dirname, '../../data/items_default.json');

const VALID_CATEGORIES = [
  'MELEE_WEAPON',
  'RANGED_WEAPON',
  'ARMOR',
  'MEDICINE',
  'ENHANCEMENT',
  'SPECIAL'
];

const VALID_TIERS = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'MYTHIC'
];

function runTests() {
  console.log('--- [TEST] Item Schema & Catalog Data Integrity Tests ---');

  // 1. 檔案存在性檢驗
  assert.ok(fs.existsSync(ITEMS_FILE), `物品資料檔案必須存在於 ${ITEMS_FILE}`);

  const raw = fs.readFileSync(ITEMS_FILE, 'utf8');
  let items;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    assert.fail(`data/items.json 必須為合法的 JSON 格式: ${e.message}`);
  }

  assert.ok(Array.isArray(items), 'data/items.json 必須為陣列清單');
  assert.ok(items.length >= 10, `預設物品庫至少應包含 10 件以上核心物品，現有: ${items.length}`);

  // 2. ID 唯一性與通用欄位檢查
  const idSet = new Set();

  items.forEach((item, idx) => {
    assert.ok(item.id && typeof item.id === 'string', `第 ${idx} 項物品必須具備字串 id`);
    assert.ok(!idSet.has(item.id), `物品 ID 重複: "${item.id}" (第 ${idx} 項)`);
    idSet.add(item.id);

    assert.ok(item.name && typeof item.name === 'string', `物品 "${item.id}" 缺少名稱 name`);
    assert.ok(VALID_CATEGORIES.includes(item.category), `物品 "${item.id}" 的 category "${item.category}" 不合法`);
    assert.ok(VALID_TIERS.includes(item.tier), `物品 "${item.id}" 的 tier "${item.tier}" 不合法`);
    assert.ok(typeof item.value === 'number' && item.value >= 0, `物品 "${item.id}" 價值 value 必須為 >= 0 的數字`);
    assert.ok(item.attributes && typeof item.attributes === 'object', `物品 "${item.id}" 必須具備 attributes 物件`);

    // 3. 依照類型的專屬屬性檢驗
    const attrs = item.attributes;
    if (item.category === 'MELEE_WEAPON') {
      assert.ok(typeof attrs.atk === 'number' && attrs.atk > 0, `近戰武器 "${item.id}" 必須具備攻擊力 atk > 0`);
      assert.ok(typeof attrs.reach === 'number' && attrs.reach >= 1, `近戰武器 "${item.id}" 必須具備攻擊距離 reach >= 1`);
    } else if (item.category === 'RANGED_WEAPON') {
      assert.ok(typeof attrs.rangedAtk === 'number' && attrs.rangedAtk > 0, `遠程暗器 "${item.id}" 必須具備殺傷力 rangedAtk > 0`);
      assert.ok(typeof attrs.effectiveRange === 'number' && attrs.effectiveRange >= 2, `遠程暗器 "${item.id}" 必須具備有效射程 effectiveRange >= 2`);
    } else if (item.category === 'ARMOR') {
      assert.ok(typeof attrs.def === 'number' && attrs.def >= 0, `防具 "${item.id}" 必須具備防禦力 def >= 0`);
      assert.ok(typeof attrs.hpBonus === 'number' && attrs.hpBonus >= 0, `防具 "${item.id}" 必須具備氣血加成 hpBonus >= 0`);
    } else if (item.category === 'MEDICINE') {
      assert.ok(typeof attrs.healHp === 'number' && attrs.healHp >= 0, `藥品 "${item.id}" 必須具備回復量 healHp >= 0`);
      assert.ok(attrs.medType && typeof attrs.medType === 'string', `藥品 "${item.id}" 必須具備藥物分類 medType`);
    } else if (item.category === 'ENHANCEMENT') {
      assert.ok(attrs.targetType && typeof attrs.targetType === 'string', `強化材料 "${item.id}" 必須具備強化部位 targetType`);
      assert.ok(attrs.upgradeBonus && typeof attrs.upgradeBonus === 'string', `強化材料 "${item.id}" 必須具備增益詞條 upgradeBonus`);
    } else if (item.category === 'SPECIAL') {
      assert.ok(attrs.specialType && typeof attrs.specialType === 'string', `奇寶 "${item.id}" 必須具備奇物分類 specialType`);
    }
  });

  // 4. Default 物品檔存在性與合法性檢驗 (支援 default.json 與 items_default.json)
  assert.ok(fs.existsSync(DEFAULT_FILE) || fs.existsSync(ITEMS_DEFAULT_FILE), `default 物品檔案必須存在於 ${DEFAULT_FILE} 或 ${ITEMS_DEFAULT_FILE}`);
  const targetDefaultFile = fs.existsSync(DEFAULT_FILE) ? DEFAULT_FILE : ITEMS_DEFAULT_FILE;
  const defaultItems = JSON.parse(fs.readFileSync(targetDefaultFile, 'utf8'));
  assert.ok(Array.isArray(defaultItems) && defaultItems.length >= 108, `default 物品檔至少應包含 108 件物品 (現有: ${defaultItems.length})`);

  // 5. ItemGenerator 隨機生成器規格驗證 (各類別各種等級分別隨機生成 3 樣)
  const generated = generateDefaultCatalog(3);
  assert.strictEqual(generated.length, 108, `6 類別 * 6 等級 * 各 3 樣應精確為 108 件，實際為: ${generated.length}`);

  // 檢查各類別數量
  CATEGORIES.forEach(cat => {
    const catCount = generated.filter(i => i.category === cat).length;
    assert.strictEqual(catCount, 18, `類別 ${cat} 應剛好有 18 件 (6 等級 * 3 樣)，實際為: ${catCount}`);
  });

  // 檢查各等級數量
  Object.keys(TIER_DEFS).forEach(tier => {
    const tierCount = generated.filter(i => i.tier === tier).length;
    assert.strictEqual(tierCount, 18, `品質 ${tier} 應剛好有 18 件 (6 類別 * 3 樣)，實際為: ${tierCount}`);
  });

  console.log(`✅ Item Schema 驗證通過：共檢查了現存與生成之物品，全部符合各類各級 3 樣之 default 規範！`);
}

module.exports = { runTests };
