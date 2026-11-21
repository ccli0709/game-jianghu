const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../../');
const MAPS_DIR = path.join(ROOT_DIR, 'maps');
const WORLD_FILE = path.join(MAPS_DIR, 'world_default.json');

function runTests() {
  console.log('--- [TEST] Map Schema & Data Integrity Tests ---');

  // Test 1: world_default.json 格式驗證
  assert.ok(fs.existsSync(WORLD_FILE), 'world_default.json 必須存在');
  const worldJson = JSON.parse(fs.readFileSync(WORLD_FILE, 'utf8'));

  assert.ok(worldJson.width >= 1 && worldJson.width <= 128, '世界寬度必須在 1~128 區塊');
  assert.ok(worldJson.height >= 1 && worldJson.height <= 128, '世界高度必須在 1~128 區塊');
  assert.ok(worldJson.cells && typeof worldJson.cells === 'object', 'cells 必須為物件字典');

  const cellEntries = Object.entries(worldJson.cells);
  assert.ok(cellEntries.length > 0, '世界地圖必須至少包含 1 個已配置區塊');

  // Test 2: 世界地圖中所有引用的 mapFile 實體檔案存在性與不重複約束驗證
  const referencedFiles = new Set();
  for (const [key, cell] of cellEntries) {
    assert.ok(cell.mapFile, `區塊 [${key}] 必須具有 mapFile 屬性`);
    assert.ok(!referencedFiles.has(cell.mapFile), `嚴格排他性約束違背：${cell.mapFile} 被重複指派！`);
    referencedFiles.add(cell.mapFile);

    const fullPath = path.join(MAPS_DIR, cell.mapFile);
    assert.ok(fs.existsSync(fullPath), `世界地圖引用的檔案不存在於磁碟：${cell.mapFile}`);
  }

  // Test 3: 大地圖 Tiled 1.10 與 Properties 規範性檢測
  const mapFiles = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.tmj'));
  assert.ok(mapFiles.length > 0, 'maps/ 目錄必須包含 .tmj 地圖檔案');

  for (const file of mapFiles) {
    const filePath = path.join(MAPS_DIR, file);
    const tmj = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    assert.strictEqual(tmj.width, 16, `${file} 寬度必須為 16`);
    assert.strictEqual(tmj.height, 16, `${file} 高度必須為 16`);
    assert.strictEqual(tmj.tilewidth, 40, `${file} 單元寬度必須為 40`);
    assert.strictEqual(tmj.tileheight, 40, `${file} 單元高度必須為 40`);

    // 檢查圖層
    const tileLayer = tmj.layers?.find(l => l.type === 'tilelayer');
    assert.ok(tileLayer, `${file} 必須具備 tilelayer 地形層`);
    assert.strictEqual(tileLayer.data.length, 256, `${file} 地形層數據必須為 256 個 GID (16x16)`);

    // 若為大地圖 (非戰術圖)，驗證 properties 結構
    if (!file.includes('arena')) {
      assert.ok(Array.isArray(tmj.properties), `${file} 必須具備 properties 屬性陣列`);
      const propMap = {};
      tmj.properties.forEach(p => { propMap[p.name] = p.value; });

      assert.ok(propMap.mapName !== undefined, `${file} properties 必須包含 mapName`);
      assert.ok(propMap.difficulty !== undefined, `${file} properties 必須包含 difficulty (1~5)`);
      assert.ok(propMap.specialType !== undefined, `${file} properties 必須包含 specialType`);
      assert.ok(propMap.possibleQuests !== undefined, `${file} properties 必須包含 possibleQuests`);
      assert.ok(propMap.possibleLoot !== undefined, `${file} properties 必須包含 possibleLoot`);
    }
  }

  console.log(`✅ Map Schema 驗證通過：共檢查了 ${mapFiles.length} 張地圖與 ${cellEntries.length} 個世界區塊！`);
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
