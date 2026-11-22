const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const MAPS_DIR = path.join(ROOT_DIR, 'maps');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const DEFAULT_FILE = path.join(DATA_DIR, 'default.json');
const ITEMS_DEFAULT_FILE = path.join(DATA_DIR, 'items_default.json');
const ItemGenerator = require('./src/core/ItemGenerator');

// 確保 maps 與 data 目錄存在
if (!fs.existsSync(MAPS_DIR)) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
    console.log(`  地圖儲存目錄: ${MAPS_DIR}`);
    console.log(`  物品資料檔案: ${ITEMS_FILE}`);
    console.log(`  預設基準檔案: ${DEFAULT_FILE}`);
    console.log(`===============================================`);
  });
}

module.exports = { server, ensureDefaultItems };
