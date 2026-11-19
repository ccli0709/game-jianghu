# 《浮世江湖》高自由度 2D 全回合制 RPG 設計規格書 (GDD)

---

## 1. 遊戲定位與核心哲學

* **類型**：2D 俯視角（Top-Down）、**三層空間多尺度架構**（世界地圖宏觀佈局 $\rightarrow$ 大地圖小時時序探索 $\rightarrow$ 戰術小地圖死鬥博弈）。
* **平台目標**：Web 首發（瀏覽器即玩，HTML5 / WebGL / WebGPU），後續可無縫包裝跨平台（Electron / Tauri）。
* **核心哲學**：
  * **三層空間多尺度分工**：
    * **世界地圖（World Map，最大 128x128 區塊）**：掌管天下九州大勢、地理板塊接壤、門派領地疆界與大型天候生態圈。世界地圖上的每一格皆對應一張專屬大地圖，**且嚴格禁止重複使用相同大地圖（排他性唯一約束）**，確保天下山水千姿百態。
    * **大地圖區塊（Overworld Chunk，16x16）**：專注於宏觀江湖旅行、時序推演（小時/十二時辰制）、情報打聽、門派勢力巡邏、懸賞接取與隨機奇遇。
    * **戰術小地圖（Tactical Arena，16x16）**：遇敵時依據當前地形（密林、客棧、水泊、荒野）動態生成微觀網格戰場，專注於招式預判、元素化學反應與擊退物理。
  * **環境即武器**：戰術場景內所有介質、地形、障礙具備物理/化學反應屬性。
  * **世界有記憶**：NPC 具備獨立記憶、動態人情網絡與死後生態位替補（權力真空）。
  * **確定性博弈**：全回合制，摒棄純數值堆疊，強化時間差、擊退、預判與代價決策。

---

## 2. 時間與行動核心系統 (Energy/Tick & World Clock System)

### 2.1 雙層時間流速體系
遊戲劃分為「大地圖宏觀旅行時間」與「戰術微觀時間片」：

1. **大地圖小時與時辰制 (World Clock)**：
   * 宏觀時間以**小時 (Hour)** 與 **十二時辰**（子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥）為基本刻度。
   * **地塊小時消耗 (Overworld Terrain Time Cost)**：
     * **平原官道 (Plains)**：耗費 1 小時（大道平坦，暢行無阻）。
     * **崎嶇荒丘 (Hills)**：耗費 2 小時（碎石坡道，需繞行擇路）。
     * **黑風密林 (Forest)**：耗費 3 小時（草木繁茂，辨識路徑困難）。
     * **城鎮/客棧 (Town/Inn)**：耗費 1 小時。
     * **客棧投宿打尖 (Rest)**：耗費 8 小時（推進至翌日時辰，回滿氣血）。
   * **晝夜光照與夜行提燈 (Day/Night & Lantern System)**：
     * **白晝 (06:00 ~ 16:00)**：麗日晴空，無遮罩。
     * **黃昏 (16:00 ~ 20:00)**：夕陽與晚霞琥珀色濾鏡。
     * **深夜 (20:00 ~ 05:00)**：月黑風高，觸發提燈光環（Radial Gradient Spotlight），僅照亮玩家周遭 2~3 格範圍，遠處隱蔽於迷霧黑暗中。

2. **戰術小地圖能源輪循制 (Energy/Tick Loop)**：
   * 進入戰鬥後時間切換為毫秒級動作能量（基準 100 能量行動一次），由 Speed 決定行動頻率。

---

## 3. 模組化架構準備 (Modular Architecture & Asset Pipeline)

為未來更換美術圖片、自訂地圖與社群 Mod 預留標準 JSON 介面：

### 3.1 圖形與素材註冊表 (`AssetRegistry`)
* 支援外部 PNG / WebP 貼圖動態注入。
* 未載入圖片時，無縫回退至 Canvas 向量幾何與高品質中文字體渲染：
```javascript
AssetRegistry.registerImage('tile_forest', 'assets/tiles/forest.png');
AssetRegistry.draw(ctx, 'tile_forest', px, py, width, height, fallbackCanvasDrawFn);
```

### 3.2 業界標準 Tiled 宣告式地圖格式 (.tmj / .json)
* 全面採用 2D 遊戲領域工業級標準 **Tiled Map Editor 格式**：
  * **大地圖標準檔案**：[maps/overworld_default.tmj](file:///d:/Repositories/game-jianghu/maps/overworld_default.tmj)
    * `Terrain_Layer` (tilelayer)：1-indexed GID 映射地表類型（平原、崇山、密林、荒丘）。
    * `POIs_and_Entities` (objectgroup)：客棧 (INN)、城鎮 (TOWN) 與遊蕩怪生成點 (SPAWNER) 坐標與自訂屬性 (`hourCost`, `services`, `respawnHours`)。
  * **戰術地圖標準檔案**：[maps/arena_forest_ambush.tmj](file:///d:/Repositories/game-jianghu/maps/arena_forest_ambush.tmj)
    * `Terrain_Layer` (tilelayer)：青石 (100E)、泥濘 (160E)、深水 (200E)、碎石 (130E)、掩體岩壁。
    * `Chemical_Surfaces` 與 `Tactical_Spawns` (objectgroup)：火油桶位置、雙方出生陣位。

### 3.3 本地視覺化地圖編輯器 (`editor.html` - 直存直取專案版)
專案自帶無需配置任何第三方服務的專屬地圖編輯工具 [editor.html](file:///d:/Repositories/game-jianghu/editor.html)：
* **專案地圖選單 (Project Map Selector)**：下拉選單直接檢視並切換專案 `maps/` 目錄內現有的所有 `.tmj` / `.json` 地圖，切換即時載入編輯。
* **一鍵新增地圖 (New Map Modal)**：自訂地圖檔名（如 `arena_cave.tmj` 或 `overworld_south.tmj`）與地圖類型（大地圖 / 戰術圖），自動生成標準初始版型並直接納入專案。
* **直接保存至專案 (Direct Disk Persistence)**：
  * 點擊「💾 直接保存至專案」或快捷鍵 <kbd>Ctrl+S</kbd>，直接將修改後的 Tiled JSON 寫入專案磁碟的 `maps/` 資料夾，免去手動下載、重命名與搬移檔案的繁瑣流程。
  * **雙引擎持久化支援**：
    * **本地開發伺服器模式**：執行 `npm start`（或 `node server.js`），編輯器透過 `/api/maps` REST API 直讀直寫專案磁碟。
    * **瀏覽器原生 File System Access API 模式**：若直接以 Chrome/Edge 開啟檔案，點擊授權專案 `maps/` 目錄後，亦可直接以原生檔案控制代碼直寫磁碟。
* **多功能繪圖工具組**：單格筆刷 (Brush)、區域填充 (Bucket Flood Fill)、地格吸管 (Eyedropper)、重設清空。
* **調色盤直覺選色**：整合各類地貌、移動消耗 (小時 / 能量) 與對應圖示。

### 3.4 宏觀世界地圖編輯器 (`world_editor.html` - 最大 128x128 網格)
專案提供掌管神州浩土宏觀佈局的專用編輯器 [world_editor.html](file:///d:/Repositories/game-jianghu/world_editor.html)：
* **規格與規模**：支援最大 $128 \times 128$ 個大地圖區塊（即最多容納 $16,384$ 張獨立大地圖），預設規格為 $16 \times 16$ 區塊。
* **嚴格唯一性排他約束 (Non-duplication Guarantee)**：
  * 世界地圖上的每一個區塊代表一張專屬大地圖。
  * 挑選專案現有大地圖時，編輯器演算法自動排除所有已被其他區塊佔用的檔案，嚴格杜絕重複指派。
* **程序化隨機大地圖生成 (Procedural Biome Generator)**：
  * 當專案現有大地圖不足或需開闢新疆土時，可一鍵隨機生成五大地貌風格的大地圖：
    * **中原草莽 (Plains)**：綠茵遍野、官道縱橫、散落客棧與茶棚。
    * **蜀道崇山 (Mountain)**：棧道險峰、高聳石壁阻絕、官道穿鑿峽谷。
    * **苗疆毒沼 (Swamp)**：迷離泥沼、毒草密林、水泊遍布。
    * **漠北荒原 (Desert)**：戈壁沙丘、碎石狂風、孤立驛站。
    * **長白雪域 (Snow)**：積雪寒峰、霜凍徑道、極寒冰湖。
  * 點擊「隨機生成新圖並指派入格」後，演算法直接產生相容 Tiled 1.10 的標準 16x16 JSON 結構，並即時寫入專案 `maps/` 目錄，自動完成格位綁定。
* **視口虛擬化 (Viewport Culling) 與相機漫遊**：
  * 在 128x128 ($16,384$ 格) 超大海量網格下，僅動態繪製視口可見區塊（Culling），縮放比例越小時自動過濾小字標籤，保持極限 60 FPS 流暢度。
  * 支援滑鼠滾輪自由縮放 (12% ~ 400%)、滑鼠中鍵或空白鍵拖曳平移 (Pan/Zoom)。
* **雙向無縫跳轉編輯**：
  * 點選任意已指派區塊，右側檢測器即時渲染 16x16 迷你地貌縮圖。
  * 點擊「進入此大地圖編輯」一鍵跳轉至 [editor.html](file:///d:/Repositories/game-jianghu/editor.html)，帶入該地圖檔名並直接進行細節微雕。
* **直存直取世界設定檔**：
  * 快捷鍵 <kbd>Ctrl+S</kbd> 或點擊保存，直接將世界架構持久化至專案 [maps/world_default.json](file:///d:/Repositories/game-jianghu/maps/world_default.json)。

### 3.5 本地極速開發伺服器 (`server.js`)
專案提供零依賴原生 Node.js 開發伺服器 [server.js](file:///d:/Repositories/game-jianghu/server.js)：
* 執行 `npm start` 即可同時啟動：
  * 遊戲本體：`http://localhost:3000/index.html`
  * 單地圖視覺化編輯器：`http://localhost:3000/editor.html`
  * 宏觀世界地圖編輯器：`http://localhost:3000/world_editor.html`
  * 專案地圖 API：提供 `GET /api/maps`、`GET /api/maps/:file` 與 `POST /api/maps/:file` 雙向讀寫支援。

### 3.6 官方 Tiled 桌面版編輯器相容
* 開發者若偏好 C++/Qt 桌面版大型工具，亦可直接使用官方開源 [Tiled Map Editor](https://www.mapeditor.org/) 開啟並編輯 `maps/` 目錄下的所有 `.tmj` 地圖。

### 2.2 核心排程器實作 (TypeScript)

```typescript
export interface Entity {
  id: string;
  isPlayer: boolean;
  speed: number;       // 速度基準 (預設 100)
  energy: number;      // 當前能量庫存
  actionQueue: Action[];
}

export interface Action {
  cost: number;        // 消耗能量 (普通移動 100, 輕功 60, 重擊 150)
  execute: () => ActionResult;
}

export class TimeScheduler {
  private entities: Entity[] = [];

  public advanceToNextActor(): Entity {
    while (true) {
      // 1. 找出可行動的實體
      const readyEntity = this.entities.find(e => e.energy >= 100);
      if (readyEntity) {
        return readyEntity;
      }

      // 2. 全場累積能量
      for (const entity of this.entities) {
        entity.energy += entity.speed;
      }

      // 3. 環境與持續狀態結算 (Tick 級)
      this.tickEnvironment();
    }
  }

  private tickEnvironment(): void {
    // 結算地面燃燒、毒霧飄散、流血、冰融化等元胞自動機邏輯
  }
}
```

---

## 3. 元素與氣勁化學引擎 (Cellular Tag System)

地圖網格（Tile）與實體均綁定介質與物理標籤，形成湧現式交互：

```
[液體/表面]           [氣勁/外力]            [產生結果]
水面 (Water)      +  玄冥勁 (Cold)       -> 冰面 (Slippery, 易擊倒, 破裂穿刺)
酒/油 (Oil)       +  烈陽勁/火把 (Fire)   -> 爆燃火海 (持續燃燒, 消耗氧氣)
火海 (Fire)       +  掌風/氣浪 (Force)   -> 扇形擴散 (將火焰推向木牆/草堆)
毒池 (Poison)     +  烈陽勁 (Fire)       -> 毒煙爆炸 (轉化為範圍性有毒煙霧)
```

---

## 4. 模組化武學與人物裝備系統 (Character & Equipment System)

### 4.1 六維指標與核心修為
* **氣血 (HP) / 真氣 (Qi)**：基礎生命與內力池。
* **臂力 (Strength)**：影響外功物理傷害、格擋減傷率與破甲。
* **身法 (Agility)**：直接影響行動速度基準（Speed）與閃避率。
* **根骨 (Constitution)**：影響氣血上限與經脈抗壓韌性。
* **悟性 (Comprehension)**：影響招式領悟速度與施展武學時的真氣損耗。
* **福緣 (Luck)**：影響奇遇觸發概率與戰利品爆率。
* **江湖聲望 (Reputation)**：影響城鎮 NPC 態度、懸賞報酬與黑市門檻。
* **經脈負荷 (Strain)**：經脈透支（Overdraw）將累積負荷，超過閾值造成永久殘疾或內傷。

### 4.2 身上穿戴行頭 (Equipment Slots)
* **主手兵刃 (Weapon)**：如【寒鐵青鋒劍】（上品），提供攻擊力、招式速度與特殊元素詞條（15% 觸發霜凍）。
* **貼身防具 (Armor)**：如【流雲夜行袍】（良品），提供防禦力與大地圖夜行隱匿加成。
* **腰佩靈寶 (Accessory)**：如【白玉長生珮】（寶器），提供生命上限與大圖行進真氣自回。
* **快捷檢視操作**：任何時刻按下快捷鍵 <kbd>C</kbd> 或點擊頂部狀態欄「人物屬性與裝備」按鈕，即可瞬間喚出雙欄式人物儀表板。

---

## 5. 模組化自創武學引擎 (Composable Skill System)

捨棄固定技能樹，玩家透過蒐集/領悟四個模組拼裝招式：

$$\text{自創招式} = \text{起手式 (Frame/Cost)} + \text{運勁軌跡 (Trajectory)} + \text{氣勁屬性 (Qi Affinity)} + \text{收招變異 (Modifier)}$$

```typescript
export interface MartialMove {
  id: string;
  name: string;
  stance: {
    energyCost: number;       // 能量消耗
    recoveryVulnerability: number; // 破綻倍率 (次回合受擊增傷)
  };
  trajectory: {
    shape: 'LINE' | 'CONE' | 'CIRCLE' | 'SECTOR';
    range: number;
    pierce: boolean;
    knockback: number;        // 擊退格數
  };
  qiAffinity: {
    element: 'YIN' | 'YANG' | 'POISON' | 'PURE';
    damageRatio: number;
    tileReaction?: string;    // 例如 "FREEZE_TERRAIN"
  };
  meridianStrain: {
    targetMeridian: 'LUNG' | 'HEART' | 'LIVER'; // 經脈負荷
    strainValue: number;      // 超載將導致內傷殘疾
  };
}
```

---

## 5. 動態人情圖譜與流言傳播 (Social Graph & Gossip)

NPC 具備獨立認知資料庫，非單純好感度數值。

### 5.1 情感維度與記憶
* `trust` (-100 ~ 100): 信任程度（影響交易折扣、密信交付）。
* `fear` (0 ~ 100): 恐懼程度（影響求饒、逃跑、報官意願）。
* `grudge` (-100 ~ 100): 恩怨值（決定是否暗殺、尋仇或生死相救）。
* `witnessedEvents`: 記錄目擊事件（殺人、偷竊、栽贓）。

### 5.2 流言封包 (Rumor Packet)
* 事件發生時，生成封包沿著「目擊者 $\rightarrow$ 客棧/茶館 $\rightarrow$ 往來商隊」擴散。
* 流言傳播會失真，NPC 依據立場加入偏見（例如：將正派弟子的劫掠美化成義舉）。

---

## 6. 權力真空與江湖生態 (Power Vacuum)

* **所有 NPC 皆可被殺死**：包含掌門、官差、神醫。
* **連鎖反應機制**：
  * 掌門死亡 $\rightarrow$ 觸發門派奪位內訌 $\rightarrow$ 外部仇敵藉機進攻 $\rightarrow$ 該門派秘笈流落黑市。
  * 鏢局全滅 $\rightarrow$ 區域商路中斷 $\rightarrow$ 城鎮物價上漲 $\rightarrow$ 盜匪轉向打劫村莊。

---

## 7. 高自由度回合制戰鬥機制

### 7.1 多種類型地格與移動力消耗 (Terrain Movement Cost)
戰術網格不再只有通行/不通行，而是具備動態能量代價（Cost）：
* **青石地面 (Floor)**: 基準 100 能量。
* **碎石陡坡 (Rubble)**: 130 能量（崎嶇地形，輕微降速）。
* **泥濘沼澤 (Mud)**: 160 能量（黏滯深陷，大幅消耗移動力）。
* **深水淺灘 (Water)**: 200 能量（嚴重阻礙移動，但可被冰系武學凍結）。
* **結冰地面 (Ice Surface)**: 40 能量（摩擦力驟降，疾行或滑行）。
* **堅石障礙 (Wall/Rock)**: 9999 能量（不可穿越，受擊退撞擊會承受震傷與暈眩）。

### 7.2 智能 A* 尋路演算法 (A-Star Pathfinding)
* 敵手 AI 不再採用簡單差值朝向，而是使用具備權重啟發式的 A* 演算法：
  $$f(n) = g(n) + h(n)$$
  * $g(n)$：真實地形移動消耗累加（會主動繞開高消耗的泥濘/深水與障礙岩壁）。
  * $h(n)$：曼哈頓距離 $\times$ 基礎消耗。
* 若敵手能量不足以支付眼前的高阻力地格（如 200 能量之深水），將自動在原地多輪蓄能再強渡，或選擇繞行青石路。

### 7.3 步數借支與經脈透支 (Energy Overdraw)
* 當回合可透支下回合 Energy 連動 2~3 次（用以絕殺或突圍）。
* 代價：下回合陷入「脫力」狀態，無法行動且被爆擊率 100%。

### 7.4 確定性預判虛影與擊退碰撞 (Telegraphing & Knockback)
* 烈陽掌擊退敵人撞擊岩壁：額外受到 15 點撞擊震傷並**暈眩 1 回合**。
* 撞擊其他實體：雙方平分衝擊傷害。

---

## 8. Web 技術架構選型 (Pixi.js WebGL Engine)

| 模組 | 選用技術 | 技術重點 |
| :--- | :--- | :--- |
| **渲染管線** | **Pixi.js v7 (WebGL/WebGPU)** | 完整的 SceneGraph 場景樹、批次 Sprite/幾何繪製，具備視網膜 High-DPI 適配 (`autoDensity: true`, `resolution: devicePixelRatio`)。 |
| **場景圖架構** | **分層 Container 系統** | `overworldContainer`（地形網格層、據點標籤層、實體層、大氣光照遮罩層）與 `battleContainer`（戰術網格層、地表化學層、戰鬥實體層）。 |
| **動畫系統** | **Pixi.js Ticker Loop** | 每幀執行補間插值（Lerp Animation），角色與敵方在網格間移動時呈現滑順過渡，不再是瞬間跳格。 |
| **持久化存檔** | **SQLite-WASM + OPFS** | 原生檔案系統存取，執行標準 SQL 關聯查詢處理 NPC 複雜人際網與世界狀態。 |
| **UI 介面** | **HTML/CSS Overlay** | 遊戲主畫面用 WebGL Canvas，背包、對話框、修煉介面以 DOM 覆蓋，兼顧排版與可維護性。 |
| **戰報日誌** | **倒序先進先出佇列 (Reverse FIFO)** | 訊息採「由新到舊 (最新在頂部)」呈現，自動保持最多 200 筆緩衝，移除過期最舊記錄。 |

---

## 9. 異步聯網機制 (Asynchronous Online Features)

1. **骨灰塚與執念化身 (Bones File)**：
   * 玩家死亡後，其遺體、裝備與自創招式上傳至伺服器。
   * 其他玩家探索時可能遇到該「瘋癲劍客/怨靈」，擊敗可獲取其原創秘笈。
2. **江湖大事記同步 (Central Rumor Feed)**：
   * 各玩家存檔中的重大滅門/刺殺事件以匿名形式同步至中央伺服器。
   * 各存檔的客棧說書人會講述其他玩家的世界大事，塑造「千人同演江湖」氛圍。

---

## 10. 後續微調與待辦清單 (Roadmap)

- [ ] **Phase 1: 最小原型 (PoC)**
  - 實作 `TimeScheduler` 與 2D 基礎網格。
  - 串接 Pixi.js 渲染基礎移動與 FOV 陰影視野。
- [ ] **Phase 2: 化學與交互層**
  - 實作火、水、油、冰之元胞自動機邏輯與連鎖反應。
- [ ] **Phase 3: 武學拼裝系統**
  - 招式資料結構建立與網格範圍判定演算法。
- [ ] **Phase 4: NPC AI 與 SQLite 存檔**
  - 建立基於 SQLite-WASM 的關聯資料表與 Utility AI 決策樹。
