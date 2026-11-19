const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const MAPS_DIR = path.join(ROOT_DIR, 'maps');

// 確保 maps 目錄存在
if (!fs.existsSync(MAPS_DIR)) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
}

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

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  浮世江湖 本機開發伺服器已啟動`);
  console.log(`  遊戲入口: http://localhost:${PORT}/index.html`);
  console.log(`  地圖編輯器: http://localhost:${PORT}/editor.html`);
  console.log(`  地圖儲存目錄: ${MAPS_DIR}`);
  console.log(`===============================================`);
});
