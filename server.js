const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const MAPS_DIR = path.join(ROOT_DIR, 'maps');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const DEFAULT_FILE = path.join(DATA_DIR, 'default.json');
const ITEMS_DEFAULT_FILE = path.join(DATA_DIR, 'items_default.json');
const MARTIALS_FILE = path.join(DATA_DIR, 'martials.json');
const MARTIALS_DEFAULT_FILE = path.join(DATA_DIR, 'martials_default.json');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const CHARACTERS_DEFAULT_FILE = path.join(DATA_DIR, 'characters_default.json');

const ItemGenerator = require('./src/core/ItemGenerator');
const MartialGenerator = require('./src/core/MartialGenerator');
const CharacterGenerator = require('./src/core/CharacterGenerator');

// 確保 maps, data 與 saves 目錄存在
if (!fs.existsSync(MAPS_DIR)) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

// 檢測初始物品檔：若無則建立命名為 default (default.json)，各類物品各種等級分別隨機生成 3 樣並保存於 default
function ensureDefaultItems() {
  const needsDefault = !fs.existsSync(DEFAULT_FILE) || !fs.existsSync(ITEMS_DEFAULT_FILE);
  const needsItems = !fs.existsSync(ITEMS_FILE);

  if (needsDefault || needsItems) {
    console.log('⚡ 檢測到尚未具備初始物品檔，自動生成 default 全品類各等級隨機物品 (各 3 樣)...');
    const defaultCatalog = ItemGenerator.generateDefaultCatalog(3);
    const content = JSON.stringify(defaultCatalog, null, 2);
    if (!fs.existsSync(DEFAULT_FILE)) {
      fs.writeFileSync(DEFAULT_FILE, content, 'utf8');
    }
    if (!fs.existsSync(ITEMS_DEFAULT_FILE)) {
      fs.writeFileSync(ITEMS_DEFAULT_FILE, content, 'utf8');
    }
    if (!fs.existsSync(ITEMS_FILE)) {
      fs.writeFileSync(ITEMS_FILE, content, 'utf8');
    }
    console.log(`✅ 已成功生成並保存 default 物品資料庫，共 ${defaultCatalog.length} 件物品！`);
  }
}
ensureDefaultItems();

// 檢測初始武學心法檔：若無則建立預設 default 名門武學與心法寶典庫
function ensureDefaultMartials() {
  const needsDefault = !fs.existsSync(MARTIALS_DEFAULT_FILE);
  const needsMartials = !fs.existsSync(MARTIALS_FILE);

  if (needsDefault || needsMartials) {
    console.log('⚡ 檢測到尚未具備初始武學心法檔，自動生成 default 名門武學與心法寶典庫...');
    const defaultMartials = MartialGenerator.generateDefaultMartials();
    const content = JSON.stringify(defaultMartials, null, 2);
    if (!fs.existsSync(MARTIALS_DEFAULT_FILE)) {
      fs.writeFileSync(MARTIALS_DEFAULT_FILE, content, 'utf8');
    }
    if (!fs.existsSync(MARTIALS_FILE)) {
      fs.writeFileSync(MARTIALS_FILE, content, 'utf8');
    }
    console.log(`✅ 已成功生成並保存 default 武學心法資料庫，共 ${defaultMartials.length} 部武學！`);
  }
}
ensureDefaultMartials();

// 檢測初始角色檔：若無則建立預設 default 角色實體庫 (三大種族、各形態、相異攻擊模式)
function ensureDefaultCharacters() {
  const needsDefault = !fs.existsSync(CHARACTERS_DEFAULT_FILE);
  const needsCharacters = !fs.existsSync(CHARACTERS_FILE);

  if (needsDefault || needsCharacters) {
    console.log('⚡ 檢測到尚未具備初始角色實體檔，自動生成 default 三大種族全形態角色庫...');
    const defaultCharacters = CharacterGenerator.generateDefaultCatalog();
    const content = JSON.stringify(defaultCharacters, null, 2);
    if (!fs.existsSync(CHARACTERS_DEFAULT_FILE)) {
      fs.writeFileSync(CHARACTERS_DEFAULT_FILE, content, 'utf8');
    }
    if (!fs.existsSync(CHARACTERS_FILE)) {
      fs.writeFileSync(CHARACTERS_FILE, content, 'utf8');
    }
    console.log(`✅ 已成功生成並保存 default 角色實體資料庫，共 ${defaultCharacters.length} 組角色！`);
  }
}
ensureDefaultCharacters();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.tmj': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // 設置 CORS 標頭以利跨來源或本機開發
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API 1: 列出專案內 maps/ 的所有地圖檔案
  if (req.method === 'GET' && pathname === '/api/maps') {
    fs.readdir(MAPS_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const mapFiles = files.filter(f => f.endsWith('.tmj') || f.endsWith('.json'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mapFiles));
    });
    return;
  }

  // API 2: 讀取指定地圖
  if (req.method === 'GET' && pathname.startsWith('/api/maps/')) {
    const filename = path.basename(pathname.replace('/api/maps/', ''));
    const filePath = path.join(MAPS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '地圖檔案不存在' }));
      return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // API 3A: 批次儲存/清理並寫入多張區域地圖與世界地圖
  if (req.method === 'POST' && pathname === '/api/maps/batch') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        let deletedCount = 0;

        if (payload.clearAllRegionalMaps) {
          const preserveSet = new Set(Array.isArray(payload.preserveFiles) ? payload.preserveFiles : []);
          const existingFiles = fs.readdirSync(MAPS_DIR);
          for (const f of existingFiles) {
            const isWorldOrArena = f.startsWith('world_') || f.includes('arena');
            const isMapFile = f.endsWith('.tmj') || f.endsWith('.json');
            if (isMapFile && !isWorldOrArena && !preserveSet.has(f)) {
              fs.unlinkSync(path.join(MAPS_DIR, f));
              deletedCount++;
            }
          }
        } else if (payload.cleanupGenerated) {
          const existingFiles = fs.readdirSync(MAPS_DIR);
          for (const f of existingFiles) {
            if (/^overworld_c\d+_\d+_/.test(f) && f.endsWith('.tmj')) {
              fs.unlinkSync(path.join(MAPS_DIR, f));
              deletedCount++;
            }
          }
        }

        let writtenCount = 0;
        if (payload.maps && typeof payload.maps === 'object') {
          for (const [fname, content] of Object.entries(payload.maps)) {
            const safeName = path.basename(fname);
            const filePath = path.join(MAPS_DIR, safeName);
            const jsonStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
            fs.writeFileSync(filePath, jsonStr, 'utf8');
            writtenCount++;
          }
        }

        if (payload.worldData) {
          const worldPath = path.join(MAPS_DIR, 'world_default.json');
          fs.writeFileSync(worldPath, JSON.stringify(payload.worldData, null, 2), 'utf8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, writtenCount, deletedCount }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '批次寫入地圖失敗: ' + e.message }));
      }
    });
    return;
  }

  // API 3: 直接儲存/覆寫/新增地圖到專案 maps/
  if (req.method === 'POST' && pathname.startsWith('/api/maps/')) {
    const filename = path.basename(pathname.replace('/api/maps/', ''));
    const filePath = path.join(MAPS_DIR, filename);

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        // 驗證是否為有效 JSON
        JSON.parse(body);
        fs.writeFile(filePath, body, 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `地圖已成功寫入 ${filename}`, filename }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '無效的 JSON 數據格式' }));
      }
    });
    return;
  }

  // API 4: 取得所有物品存檔檔案清單
  if (req.method === 'GET' && pathname === '/api/items/files') {
    ensureDefaultItems();
    fs.readdir(DATA_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(jsonFiles));
    });
    return;
  }

  // API 4.1: 讀取指定名稱的物品存檔檔案
  if (req.method === 'GET' && pathname.startsWith('/api/items/files/')) {
    const filename = path.basename(pathname.replace('/api/items/files/', ''));
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `存檔檔案不存在: ${filename}` }));
      return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // API 4.2: 儲存至指定名稱的物品存檔檔案 (新建或覆寫)
  if (req.method === 'POST' && pathname.startsWith('/api/items/files/')) {
    const filename = path.basename(pathname.replace('/api/items/files/', ''));
    const filePath = path.join(DATA_DIR, filename);

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed)) {
          throw new Error('物品資料必須為陣列清單格式');
        }
        fs.writeFile(filePath, JSON.stringify(parsed, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `物品存檔已成功寫入 ${filename}，共 ${parsed.length} 件物品`,
            filename,
            count: parsed.length
          }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || '無效的 JSON 數據格式' }));
      }
    });
    return;
  }

  // API 4.3: 取得預設全遊戲物品清單
  if (req.method === 'GET' && (pathname === '/api/items' || pathname === '/api/items/default')) {
    const targetFile = pathname === '/api/items/default' ? (fs.existsSync(DEFAULT_FILE) ? DEFAULT_FILE : ITEMS_DEFAULT_FILE) : ITEMS_FILE;
    if (!fs.existsSync(targetFile)) {
      ensureDefaultItems();
    }

    fs.readFile(fs.existsSync(targetFile) ? targetFile : (fs.existsSync(DEFAULT_FILE) ? DEFAULT_FILE : ITEMS_DEFAULT_FILE), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // API 4.1: 重新隨機生成 default 物品資料 (各類各級各 3 樣)
  if (req.method === 'POST' && pathname === '/api/items/reset-default') {
    try {
      const defaultCatalog = ItemGenerator.generateDefaultCatalog(3);
      const content = JSON.stringify(defaultCatalog, null, 2);
      fs.writeFileSync(DEFAULT_FILE, content, 'utf8');
      fs.writeFileSync(ITEMS_DEFAULT_FILE, content, 'utf8');
      fs.writeFileSync(ITEMS_FILE, content, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `已重設生成 default 物品資料庫，各類別各等級共 ${defaultCatalog.length} 件物品！`,
        count: defaultCatalog.length
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 5: 儲存/更新全遊戲物品清單
  if (req.method === 'POST' && pathname === '/api/items') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed)) {
          throw new Error('物品資料必須為陣列清單格式');
        }
        fs.writeFile(ITEMS_FILE, JSON.stringify(parsed, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `全域物品庫已成功更新，共 ${parsed.length} 件物品`, count: parsed.length }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || '無效的 JSON 數據格式' }));
      }
    });
    return;
  }

  // ==========================================
  // 武學心法全域管理 API (Martials & Cultivations)
  // ==========================================

  // API 6: 取得所有武學存檔清單
  if (req.method === 'GET' && pathname === '/api/martials/files') {
    ensureDefaultMartials();
    fs.readdir(DATA_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const jsonFiles = files.filter(f => f.startsWith('martial') && f.endsWith('.json'));
      // 若無特化前綴，亦回傳 martials.json, martials_default.json
      if (files.includes('martials.json') && !jsonFiles.includes('martials.json')) jsonFiles.push('martials.json');
      if (files.includes('martials_default.json') && !jsonFiles.includes('martials_default.json')) jsonFiles.push('martials_default.json');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(jsonFiles.length > 0 ? jsonFiles : ['martials.json', 'martials_default.json']));
    });
    return;
  }

  // API 6.1: 讀取指定名稱的武學存檔
  if (req.method === 'GET' && pathname.startsWith('/api/martials/files/')) {
    const filename = path.basename(pathname.replace('/api/martials/files/', ''));
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `武學存檔不存在: ${filename}` }));
      return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // API 6.2: 儲存指定名稱的武學存檔
  if (req.method === 'POST' && pathname.startsWith('/api/martials/files/')) {
    const filename = path.basename(pathname.replace('/api/martials/files/', ''));
    const filePath = path.join(DATA_DIR, filename);

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed)) throw new Error('武學資料必須為陣列清單格式');
        fs.writeFile(filePath, JSON.stringify(parsed, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `武學心法存檔已成功寫入 ${filename}，共 ${parsed.length} 部武學！`,
            filename,
            count: parsed.length
          }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || '無效的 JSON 數據格式' }));
      }
    });
    return;
  }

  // API 6.3: 取得預設全域武學清單
  if (req.method === 'GET' && (pathname === '/api/martials' || pathname === '/api/martials/default')) {
    const targetFile = pathname === '/api/martials/default' ? MARTIALS_DEFAULT_FILE : MARTIALS_FILE;
    if (!fs.existsSync(targetFile)) {
      ensureDefaultMartials();
    }

    fs.readFile(fs.existsSync(targetFile) ? targetFile : MARTIALS_DEFAULT_FILE, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // API 6.4: 重設生成預設名門武學庫
  if (req.method === 'POST' && pathname === '/api/martials/reset-default') {
    try {
      const defaultMartials = MartialGenerator.generateDefaultMartials();
      const content = JSON.stringify(defaultMartials, null, 2);
      fs.writeFileSync(MARTIALS_DEFAULT_FILE, content, 'utf8');
      fs.writeFileSync(MARTIALS_FILE, content, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `已重設生成預設名門武學心法寶典庫，共 ${defaultMartials.length} 部武學！`,
        count: defaultMartials.length
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 6.5: 儲存至當前武學庫
  if (req.method === 'POST' && pathname === '/api/martials') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed)) throw new Error('武學資料必須為陣列清單格式');
        fs.writeFile(MARTIALS_FILE, JSON.stringify(parsed, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `全域武學庫已更新，共 ${parsed.length} 部武學`, count: parsed.length }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || '無效的 JSON 數據格式' }));
      }
    });
    return;
  }

  // ==========================================
  // 角色全域設計管理 API (Characters & Monsters)
  // ==========================================

  // API 7.1: 取得所有角色存檔檔案清單
  if (req.method === 'GET' && pathname === '/api/characters/files') {
    ensureDefaultCharacters();
    fs.readdir(DATA_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const jsonFiles = files.filter(f => f.startsWith('character') && f.endsWith('.json'));
      if (files.includes('characters.json') && !jsonFiles.includes('characters.json')) jsonFiles.push('characters.json');
      if (files.includes('characters_default.json') && !jsonFiles.includes('characters_default.json')) jsonFiles.push('characters_default.json');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(jsonFiles.length > 0 ? jsonFiles : ['characters.json', 'characters_default.json']));
    });
    return;
  }

  // API 7.2: 讀取指定角色存檔檔案
  if (req.method === 'GET' && pathname.startsWith('/api/characters/files/')) {
    const filename = path.basename(pathname.replace('/api/characters/files/', ''));
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
      ensureDefaultCharacters();
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `找不到角色存檔檔案: ${filename}` }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // API 7.3: 寫入/儲存指定角色存檔檔案
  if (req.method === 'POST' && pathname.startsWith('/api/characters/files/')) {
    const filename = path.basename(pathname.replace('/api/characters/files/', ''));
    const filePath = path.join(DATA_DIR, filename);

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed)) throw new Error('角色資料必須為陣列清單格式');
        fs.writeFile(filePath, JSON.stringify(parsed, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `角色存檔已成功寫入 ${filename}，共 ${parsed.length} 組角色`,
            filename,
            count: parsed.length
          }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || '無效的 JSON 數據格式' }));
      }
    });
    return;
  }

  // API 7.4: 取得預設/當前角色庫
  if (req.method === 'GET' && (pathname === '/api/characters' || pathname === '/api/characters/default')) {
    const targetFile = pathname === '/api/characters/default' ? CHARACTERS_DEFAULT_FILE : CHARACTERS_FILE;
    if (!fs.existsSync(targetFile)) {
      ensureDefaultCharacters();
    }

    fs.readFile(fs.existsSync(targetFile) ? targetFile : CHARACTERS_DEFAULT_FILE, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // API 7.5: 重設生成預設三大種族角色庫
  if (req.method === 'POST' && pathname === '/api/characters/reset-default') {
    try {
      const defaultChars = CharacterGenerator.generateDefaultCatalog();
      const content = JSON.stringify(defaultChars, null, 2);
      fs.writeFileSync(CHARACTERS_DEFAULT_FILE, content, 'utf8');
      fs.writeFileSync(CHARACTERS_FILE, content, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `已重設生成預設三大種族角色庫，共 ${defaultChars.length} 組角色！`,
        count: defaultChars.length
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 7.6: 儲存至當前角色庫 (characters.json)
  if (req.method === 'POST' && pathname === '/api/characters') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed)) throw new Error('角色資料必須為陣列清單格式');
        fs.writeFile(CHARACTERS_FILE, JSON.stringify(parsed, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `全域角色庫已更新，共 ${parsed.length} 組角色`, count: parsed.length }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || '無效的 JSON 數據格式' }));
      }
    });
    return;
  }

  // API 8.1: 取得所有遊戲故事存檔列表 (摘要資訊)
  if (req.method === 'GET' && pathname === '/api/saves') {
    fs.readdir(SAVES_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const summaries = [];

      for (const f of jsonFiles) {
        try {
          const content = fs.readFileSync(path.join(SAVES_DIR, f), 'utf8');
          const save = JSON.parse(content);
          summaries.push({
            id: save.id || f.replace('.json', ''),
            filename: f,
            title: save.title || '江湖故事',
            heroName: save.player?.name || save.heroName || '俠客',
            realm: save.player?.realm || '初入江湖',
            race: save.player?.race || 'HUMAN',
            formName: save.player?.formName || '鄉井平民',
            level: save.player?.level || 1,
            gold: save.player?.gold || 0,
            curChunkName: save.currentChunkName || '中原',
            clock: save.clock || { day: 1, hour: 8 },
            updatedAt: save.updatedAt || save.createdAt || new Date().toISOString(),
            createdAt: save.createdAt || new Date().toISOString()
          });
        } catch (e) { }
      }

      // 按最後更新時間倒序排列
      summaries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(summaries));
    });
    return;
  }

  // API 8.2: 讀取指定獨立故事存檔完整資料
  if (req.method === 'GET' && pathname.startsWith('/api/saves/')) {
    const filename = path.basename(pathname.replace('/api/saves/', ''));
    const safeName = filename.endsWith('.json') ? filename : `${filename}.json`;
    const filePath = path.join(SAVES_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `存檔不存在: ${safeName}` }));
      return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // API 8.3: 寫入/保存指定獨立故事存檔
  if (req.method === 'POST' && pathname.startsWith('/api/saves/')) {
    const filename = path.basename(pathname.replace('/api/saves/', ''));
    const safeName = filename.endsWith('.json') ? filename : `${filename}.json`;
    const filePath = path.join(SAVES_DIR, safeName);

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        parsed.updatedAt = new Date().toISOString();
        const content = JSON.stringify(parsed, null, 2);
        fs.writeFile(filePath, content, 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `江湖故事存檔已保存至 ${safeName}`,
            filename: safeName,
            id: parsed.id || safeName.replace('.json', '')
          }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || '無效的 JSON 存檔格式' }));
      }
    });
    return;
  }

  // API 8.4: 刪除指定故事存檔
  if (req.method === 'DELETE' && pathname.startsWith('/api/saves/')) {
    const filename = path.basename(pathname.replace('/api/saves/', ''));
    const safeName = filename.endsWith('.json') ? filename : `${filename}.json`;
    const filePath = path.join(SAVES_DIR, safeName);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `已成功刪除存檔 ${safeName}` }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `存檔不存在: ${safeName}` }));
    }
    return;
  }

  // 靜態檔案託管
  let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  浮世江湖 本機開發伺服器已啟動`);
    console.log(`  遊戲入口: http://localhost:${PORT}/index.html`);
    console.log(`  地圖編輯器: http://localhost:${PORT}/editor.html`);
    console.log(`  世界編輯器: http://localhost:${PORT}/world_editor.html`);
    console.log(`  物品設計總管: http://localhost:${PORT}/item_manager.html`);
    console.log(`  武學心法總管: http://localhost:${PORT}/martial_manager.html`);
    console.log(`  角色實體總管: http://localhost:${PORT}/character_manager.html`);
    console.log(`  地圖儲存目錄: ${MAPS_DIR}`);
    console.log(`  物品資料檔案: ${ITEMS_FILE}`);
    console.log(`  武學資料檔案: ${MARTIALS_FILE}`);
    console.log(`  角色資料檔案: ${CHARACTERS_FILE}`);
    console.log(`  預設基準檔案: ${DEFAULT_FILE}`);
    console.log(`===============================================`);
  });
}

module.exports = { server, ensureDefaultItems, ensureDefaultMartials, ensureDefaultCharacters };
