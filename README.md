# 浮世江湖 - Pixi.js 2D WebGL 引擎版本 (PoC)

此專案已全面遷移至 **Pixi.js (WebGL 2D Engine)** 驅動，具備硬體加速、SceneGraph 分層渲染、平滑補間插值與雙層地圖循環。

---

## 快速啟動

* **離線即玩**：核心依賴庫 [libs/pixi.min.js](file:///d:/Repositories/game-jianghu/libs/pixi.min.js) 已預先下載至本機目錄。
* **直接執行**：直接在瀏覽器雙擊打開 [index.html](file:///d:/Repositories/game-jianghu/index.html) 即可立即運行。

---

## Pixi.js 引擎技術特性

1. **SceneGraph 場景樹架構**：
   * `overworldContainer`：
     * `owTileGraphics`：硬體批次繪製地表網格
     * `owLabelsContainer`：Pixi.Text 高清晰據點標籤（客棧/洛陽/山脈）
     * `owEnemiesContainer`：遊蕩實體容器
     * `owPlayerGraphic`：俠客主體
     * `owLightingGraphic`：晝夜濾鏡與深夜提燈動態遮罩（Hole Masking）
   * `battleContainer`：
     * `battleTileGraphics`：戰術多樣地格（青石、泥濘、深水、碎石、岩壁）
     * `battleSurfacesGraphics`：地表化學物質（爆燃火海、火油、冰面）
     * `battleEntitiesContainer`：敵人模型、雙層動態血條與頭頂名號
2. **平滑補間動畫 (Lerp Ticker Loop)**：
   * 角色與敵手在網格間挪移不再是僵硬跳格，由 `app.ticker` 每幀執行補間插值，視覺極為絲滑。
3. **視網膜 High-DPI 抗鋸齒**：
   * 啟用 `resolution: window.devicePixelRatio` 與 `autoDensity: true`，在 4K 或 125%/150% 縮放螢幕下文字與圖形完全不發虛。

---

## 遊戲核心系統

* **大地圖小時時辰制**：按地塊耗損不同時數（平原 1h、荒丘 2h、密林 3h），對應十二時辰時序與晝夜提燈。
* **A\* 智慧尋路**：戰術小地圖敵手自主繞行掩體與權衡高消耗泥沼/深水。
* **元素化學連鎖**：潑油＋烈陽掌 $\rightarrow$ 爆燃蔓延；玄冥指 $\rightarrow$ 冰封水塘。
* **撞擊物理與經脈透支**：烈陽掌擊退撞牆引發震傷暈眩；按 `Space` 突破回合限制連動。

---

## 操作指南

| 模式 | 操作按鍵 | 作用 |
| :--- | :--- | :--- |
| **通用** | <kbd>C</kbd> | **快速檢視人物詳細屬性、六維修為與佩戴裝備** |
| **通用** | <kbd>ESC</kbd> | 關閉人物詳情面板 / 城鎮視窗 |
| **大地圖** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / 方向鍵 | 旅行移動、按地塊消耗小時時序 |
| **大地圖** | <kbd>E</kbd> / <kbd>Enter</kbd> | 進入客棧/城鎮（打聽消息、接取懸賞、投宿回血） |
| **戰術戰鬥** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | 身法挪移或普通出招攻擊鄰格目標 |
| **戰術戰鬥** | <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | 切換招式（烈陽神掌 / 玄冥指 / 擲火油罈） |
| **戰術戰鬥** | <kbd>Space</kbd> | 經脈透支（借支 100 能量） |

---

## 視覺化地圖編輯器 (Visual Map Editor)

專案自帶無需配置的離線地圖編輯工具：[editor.html](file:///d:/Repositories/game-jianghu/editor.html)

* **編輯大地圖 / 戰術圖**：支援筆刷 (Brush)、油漆桶填充 (Bucket) 與吸管 (Picker)。
* **工業標準 Tiled 相容**：直接導出與載入標準 `.tmj` / `.json` 格式，亦可搭配官方 [Tiled Map Editor](https://www.mapeditor.org/) 桌面端無縫協同開發。
* **預設地圖規格**：
  * 大地圖範本：[maps/overworld_default.tmj](file:///d:/Repositories/game-jianghu/maps/overworld_default.tmj)
  * 戰術伏擊陣：[maps/arena_forest_ambush.tmj](file:///d:/Repositories/game-jianghu/maps/arena_forest_ambush.tmj)
