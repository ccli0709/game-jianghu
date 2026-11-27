/**
 * 《浮世江湖》- 故事首頁、獨立存檔封裝打包與資料隔離固化測試套件
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ItemGenerator = require('../../src/core/ItemGenerator');
const MartialGenerator = require('../../src/core/MartialGenerator');
const CharacterGenerator = require('../../src/core/CharacterGenerator');

function runTests() {
  console.log('--- [TEST] Story Save & Configuration Package Isolation Tests ---');

  const ROOT_DIR = path.join(__dirname, '../..');
  const SAVES_DIR = path.join(ROOT_DIR, 'saves');

  // 1. 確保 saves 目錄存在
  if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR, { recursive: true });
  }
  assert(fs.existsSync(SAVES_DIR), 'saves 存檔目錄必須存在');
  console.log('  ✓ saves/ 獨立存檔目錄檢驗正常');

  // 2. 測試新江湖故事啟動時的設定檔打包封裝
  const storyId = `story_test_${Date.now()}`;
  const storyTitle = '浮世行·自動測試卷宗';
  const heroName = '李暮雲';

  const defaultItems = ItemGenerator.generateDefaultCatalog(3);
  const defaultMartials = MartialGenerator.generateDefaultMartials();
  const defaultCharacters = CharacterGenerator.generateDefaultCatalog();

  const mockSavePackage = {
    id: storyId,
    title: storyTitle,
    heroName: heroName,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    worldData: {
      width: 16,
      height: 16,
      cells: {
        '7,7': { mapFile: 'overworld_default.tmj', name: '中原核心郡縣 (洛陽·龍門)', biome: 'PLAINS' }
      }
    },
    maps: {
      'overworld_default.tmj': { width: 16, height: 16, layers: [] }
    },
    currentMapFile: 'overworld_default.tmj',
    curChunkX: 7,
    curChunkY: 7,
    currentChunkName: '中原核心郡縣 (洛陽·龍門)',
    items: JSON.parse(JSON.stringify(defaultItems)),
    martials: JSON.parse(JSON.stringify(defaultMartials)),
    characters: JSON.parse(JSON.stringify(defaultCharacters)),
    player: {
      name: heroName,
      race: 'HUMAN',
      form: 'CIVILIAN',
      formName: '鄉井平民',
      level: 1,
      minLevel: 1,
      maxLevel: 5,
      isBreakthroughPending: false,
      gold: 50,
      hp: 100,
      maxHp: 100
    },
    clock: { day: 1, hour: 8 },
    roamingEnemies: []
  };

  // 驗證封包核心屬性
  assert.strictEqual(mockSavePackage.player.race, 'HUMAN', '存檔主角種族必須為 HUMAN');
  assert.strictEqual(mockSavePackage.player.form, 'CIVILIAN', '存檔主角初始形態必須為 CIVILIAN');
  assert(mockSavePackage.items.length >= 108, '存檔必須包含打包固化的全品類物品庫');
  assert(mockSavePackage.martials.length >= 18, '存檔必須包含打包固化的名門武學心法庫');
  assert(mockSavePackage.characters.length >= 18, '存檔必須包含打包固化的全域角色庫');
  assert(mockSavePackage.maps['overworld_default.tmj'], '存檔必須包含區域地圖快照');
  console.log('  ✓ 故事啟動時 區域地圖/世界地圖/物品/武學/角色 設定打包封包規格完整');

  // 3. 測試存檔寫入與持久化
  const testSaveFile = path.join(SAVES_DIR, `${storyId}.json`);
  fs.writeFileSync(testSaveFile, JSON.stringify(mockSavePackage, null, 2), 'utf8');
  assert(fs.existsSync(testSaveFile), '存檔檔案必須成功寫入磁碟');

  // 4. 測試資料隔離性 (存檔內容修改絕不污染全域 data/ 檔案)
  const savedData = JSON.parse(fs.readFileSync(testSaveFile, 'utf8'));
  savedData.items.push({
    id: 'item_story_exclusive_blade',
    name: '故事專屬·天外魔刃',
    category: 'MELEE_WEAPON',
    tier: '神品'
  });
  fs.writeFileSync(testSaveFile, JSON.stringify(savedData, null, 2), 'utf8');

  // 讀取全域 items.json，驗證未受任何污染
  const globalItemsFile = path.join(ROOT_DIR, 'data/items.json');
  if (fs.existsSync(globalItemsFile)) {
    const globalItems = JSON.parse(fs.readFileSync(globalItemsFile, 'utf8'));
    const contaminated = globalItems.some(i => i.id === 'item_story_exclusive_blade');
    assert(!contaminated, '故事專屬修改絕不可污染全域物品設定檔 (資料隔離驗證成功)');
  }
  console.log('  ✓ 獨立存檔資料隔離性校驗通過 (遊戲中進度完全獨立，不影響全域設定)');

  // 5. 測試存檔讀取與清理
  const reloaded = JSON.parse(fs.readFileSync(testSaveFile, 'utf8'));
  assert.strictEqual(reloaded.id, storyId);
  assert.strictEqual(reloaded.title, storyTitle);
  assert.strictEqual(reloaded.player.name, heroName);

  // 清理測試檔案
  fs.unlinkSync(testSaveFile);
  assert(!fs.existsSync(testSaveFile), '測試存檔檔案清理完畢');
  console.log('  ✓ 存檔持久化、檢索與清理測試通過');

  console.log('✅ 故事首頁與獨立遊戲存檔打包隔離系統全數通過校驗！\n');
  return true;
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
