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
* **相鄰大地圖無縫漫遊 (Chunk Hopping)**：大地圖 (16×16) 邊界相通，移動超出邊緣時自動檢測世界地圖中相鄰的專屬大地圖，無縫跨入並更新時序與地貌生態。
* **世界地圖 3×3 邊界雷達 HUD**：大地圖右上角即時呈現以玩家當前區塊為中心的 3×3 略縮圖，綠色標示相鄰可通大地圖，虛線/暗紅精準標記未拓荒原與世界極限邊界。
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

專案自帶兩款專屬地圖編輯工具，均支援直讀直寫專案 `maps/` 目錄：

### 1. 宏觀世界地圖編輯器：[world_editor.html](file:///d:/Repositories/game-jianghu/world_editor.html)
* **規格與規模**：支援最大 **128×128** 區塊（即最多 16,384 格），每格代表一張獨立大地圖。
* **嚴格唯一性排他約束**：挑選專案現有大地圖時，系統自動過濾已在其他區塊使用過的地圖，保證每塊天地獨一無二。
* **隨機大地圖生成器**：提供五大生態主題（中原草莽、蜀道崇山、苗疆毒沼、漠北荒原、長白雪域），演算法直接產出標準 16×16 Tiled 格式檔案並即時寫入專案磁碟。
* **視口虛擬化 (Culling) 與順暢導航**：在 16,384 格海量視圖下仍極速流暢；滾輪自由縮放視角（12% ~ 400%），滑鼠中鍵或空白鍵拖曳平移。
* **無縫銜接單圖編輯**：選中區塊即時呈現 16×16 迷你預覽，點擊一鍵跳轉至單圖編輯器進行細節打磨。
* **直接保存至專案**：點擊「💾 保存世界配置」或按 <kbd>Ctrl+S</kbd>，直接寫入專案 `maps/world_default.json`。

### 2. 單圖視覺化編輯器：[editor.html](file:///d:/Repositories/game-jianghu/editor.html)

* **選擇專案地圖**：頂部下拉選單自動列出專案 `maps/` 目錄內現存地圖，切換即時載入。
* **江湖情報與任務設定**：右側面板全面移除資料預覽代碼框，支援直接設定：
  * **地圖簡介**：背景故事、地理險阻與江湖傳聞。
  * **危險難度**：1~5 星級別評定（初入江湖至九死一生）。
  * **特殊地圖設定**：標註門派總壇、綠林匪寨、繁華城鎮、隱世秘境、荒野客棧及關聯勢力。
  * **可能出現任務池**：城鎮客棧隨機懸賞的來源題庫（支援一鍵追加緝拿、探尋、押鏢）。
  * **可能掉落寶物**：戰鬥探索獲得的神兵、丹藥與秘笈（支援一鍵追加模板）。
* **修改後直接保存至專案**：點擊「💾 保存地圖與情報設定」或按 <kbd>Ctrl+S</kbd>，直接覆寫專案磁碟 `maps/` 目錄檔案，屬性存入 Tiled 規範 `properties`，無需手動下載或搬移！
* **雙模式支援**：
  * **推薦方式 (本地伺服器)**：在專案根目錄終端機執行 `npm start`，訪問 `http://localhost:3000/editor.html`，透過 REST API 直讀直存。
  * **直接瀏覽器開啟 (File System Access)**：若以 Chrome/Edge 直接雙擊打開 `editor.html`，可授權專案 `maps/` 目錄直接讀寫。
