# 《浮世江湖》系統軟體工程規格書 (System Architecture & Technical Specifications)

> 文件版本：v1.2.0  
> 基準代碼依據：[DESIGN.md](file:///d:/Repositories/game-jianghu/DESIGN.md)、[index.html](file:///d:/Repositories/game-jianghu/index.html)、[editor.html](file:///d:/Repositories/game-jianghu/editor.html)、[world_editor.html](file:///d:/Repositories/game-jianghu/world_editor.html)  
> 核心引擎：Pixi.js v7 WebGL 2D Engine

---

## 1. 系統邊界與三層空間多尺度規格 (Spatial Dimension Specifications)

本系統採 **三層空間階層遞進架構 (3-Tier Hierarchical Spatial Architecture)**：

```
+-------------------------------------------------------------------------+
| Level 1: 世界地圖宏觀佈局 (World Map Grid)                                |
| 規模: 寬高 1~128 區塊 (預設 16x16, 最大 16,384 個獨立大地圖)                 |
| 規格約束: 每格代表一張專屬大地圖，嚴格唯一性排他約束 (非重複不可佔用)        |
+-------------------------------------------------------------------------+
                                   |
                                   v (雙向導航 / 跨界漫遊)
+-------------------------------------------------------------------------+
| Level 2: 大地圖探索區塊 (Overworld Chunk)                                 |
| 規模: 16x16 網格地貌 (256 格, 單格 40x40 像素)                            |
| 職責: 宏觀時序推演 (小時/時辰)、據點交互 (客棧/城鎮)、邊界無縫切換           |
+-------------------------------------------------------------------------+
                                   |
                                   v (遭遇敵手 / 踩中埋伏)
+-------------------------------------------------------------------------+
| Level 3: 戰術死鬥小地圖 (Tactical Arena)                                  |
| 規模: 16x16 戰術微觀網格 (256 格, 單格 40x40 像素)                        |
| 職責: 能量動作輪循 (Tick Loop)、A* 地形加權尋路、地表化學連鎖、擊退碰撞      |
+-------------------------------------------------------------------------+
```

### 1.1 空間尺度常數規範
* `TILE_PX`: 單一地塊渲染像素寬高 = `40px`。
* `GRID_SIZE`: 單一地圖標準寬高 = `16` 格。
* `VIEW_SIZE`: 畫布可視寬高 = `640px` ($16 \times 40$)。
* `WORLD_MAX_DIM`: 世界地圖最大尺寸 = `128` 區塊 ($128 \times 128$)。

---

## 2. 資料結構規範 (Data Schema Specifications)

### 2.1 世界地圖資料結構 (`maps/world_default.json`)

```typescript
interface WorldMapConfig {
  id: string;               // 世界地圖唯一識別碼 (例: "world_jianghu_main")
  name: string;             // 世界名稱 (例: "神州浩土全圖")
  version: string;          // 規範版本 (例: "1.0.0")
  width: number;            // 當前世界寬度 (1~128)
  height: number;           // 當前世界高度 (1~128)
  maxWidth: number;         // 128
  maxHeight: number;        // 128
  chunkTileSize: number;    // 16
  cells: {
    [coordKey: string]: {   // 鍵值格式: "chunkX,chunkY" (例: "7,7")
      mapFile: string;      // 大地圖檔案檔名 (例: "overworld_default.tmj")
      name: string;         // 分境名稱 (例: "中原核心郡縣 (洛陽·龍門)")
      biome: BiomeType;     // 風貌類型: 'PLAINS' | 'MOUNTAIN' | 'SWAMP' | 'DESERT' | 'SNOW'
      assignedAt: string;   // ISO 8601 時間戳
    }
  }
}
```

### 2.2 大地圖與戰術地圖 Tiled 規範 (`.tmj` / `.json`)

地圖檔案遵循 **Tiled Map Editor JSON 1.10** 工業規範，並透過頂層 `properties` 陣列承載江湖情報與任務鏈：

#### 全域 Properties 欄位規範 (Map Metadata Properties)
| 屬性名稱 (`name`) | 型別 (`type`) | 說明 | 範例 |
| :--- | :--- | :--- | :--- |
| `mapName` | `string` | 分境顯示名稱 | `"蜀道重巒絕壁 (7, 8)"` |
| `description` | `string` | 地圖背景簡介、地理險阻與傳聞 | `"一線天峽谷險峰，棧道懸空，易守難攻..."` |
| `difficulty` | `int` | 危險難度等級 (1~5 星) | `3` (風雲變幻，建議 Lv.26~45) |
| `specialType` | `string` | 特殊據點類型 | `'SECT_BASE'` (門派總壇)、`'STRONGHOLD'` (綠林匪寨)、`'TOWN_MARKET'` (城鎮)、`'SECRET_REALM'` (秘境)、`'INN_POST'` (客棧) |
| `faction` | `string` | 關聯門派或割據勢力 | `"黑風寨"`、`"少林派"`、`"洛陽府尹"` |
| `possibleQuests` | `string` | 可能出現任務池 (換行分隔) | 供城鎮/客棧懸賞告示牌動態隨機抽取 |
| `possibleLoot` | `string` | 可能掉落寶物/奇珍 (換行分隔) | 戰鬥或探索搜獲之神兵、丹藥與秘笈 |

#### 圖層規範
1. **`Terrain_Layer` (tilelayer)**：
   * 尺寸: $16 \times 16$，`data` 陣列共 256 個 GID (1-based)。
   * **大地圖 GID 映射**：
     * `1`: PLAINS (平原官道, 耗時 1h)
     * `2`: MOUNTAIN (高聳崇山, 耗時 999h 不可通行)
     * `3`: FOREST (黑風密林, 耗時 3h)
     * `4`: TOWN (城鎮市集, 耗時 1h)
     * `5`: INN (客棧驛站, 耗時 1h)
     * `6`: HILLS (崎嶇荒丘, 耗時 2h)
   * **戰術地圖 GID 映射**：
     * `1`: FLOOR (青石地面, 移動耗能 100)
     * `2`: MUD (泥濘沼澤, 移動耗能 160)
     * `3`: WATER (深水淺灘, 移動耗能 200)
     * `4`: RUBBLE (碎石陡坡, 移動耗能 130)
     * `5`: WALL (岩壁掩體, 移動耗能 9999 不可穿越)
2. **`Entities_and_POIs` (objectgroup)**：
   * 包含客棧 (INN)、城鎮 (TOWN) 與怪物生成點 (SPAWNER) 物件。

---

## 3. 核心子系統狀態機規範 (Subsystem State Machine Specs)

### 3.1 時鐘與時辰系統 (`WorldClock`)
* **時序刻度**：1 小時為一單位步長；24 小時累進 1 日。
* **十二時辰映射表**：
  * $23 \sim 0$ 時：子時 (半夜)
  * $1 \sim 2$ 時：丑時 (雞鳴)
  * $3 \sim 4$ 時：寅時 (平旦)
  * $5 \sim 6$ 時：卯時 (日出)
  * $7 \sim 8$ 時：辰時 (食時)
  * $9 \sim 10$ 時：巳時 (隅中)
  * $11 \sim 12$ 時：午時 (正午)
  * $13 \sim 14$ 時：未時 (日昳)
  * $15 \sim 16$ 時：申時 (晡時)
  * $17 \sim 18$ 時：酉時 (日暮)
  * $19 \sim 20$ 時：戌時 (掌燈)
  * $21 \sim 22$ 時：亥時 (夜闌)
* **大氣光照狀態機**：
  * $06:00 \sim 16:00$：白晝麗日 (無遮罩, Alpha 0.0)
  * $16:00 \sim 18:00$：夕陽晚霞 (琥珀色, Alpha 0.18)
  * $18:00 \sim 20:00$：掌燈黃昏 (紫暮色, Alpha 0.28)
  * $20:00 \sim 05:00$：月黑風高 (深夜遮罩, Alpha 0.72, 啟動半徑 120px 提燈鏤空)
  * $05:00 \sim 06:00$：拂曉破曉 (冷藍色, Alpha 0.18)

### 3.2 跨區塊漫遊與 3×3 邊界雷達狀態機 (`ChunkTransitionSystem`)
* **觸發條件**：玩家在大地圖網格坐標挪移，產生目標 $(nx, ny)$ 超出 $[0, 15]$ 邊界。
* **跨圖向量轉換矩陣**：
  $$\begin{cases} nx < 0 \implies targetChunkX = curChunkX - 1, & enterX = 15, & enterY = ny \\ nx \ge 16 \implies targetChunkX = curChunkX + 1, & enterX = 0, & enterY = ny \\ ny < 0 \implies targetChunkY = curChunkY - 1, & enterX = nx, & enterY = 15 \\ ny \ge 16 \implies targetChunkY = curChunkY + 1, & enterX = nx, & enterY = 0 \end{cases}$$
* **邊界裁決規則 (Boundary Arbitration)**：
  1. 若 $targetChunkX \notin [0, width-1]$ 或 $targetChunkY \notin [0, height-1]$ $\implies$ 觸發「世界極限邊界阻絕」，留在原地，雷達閃爍警示。
  2. 若目標區塊未配置大地圖（`!worldData.cells[key]`） $\implies$ 觸發「未拓荒原阻絕」，留在原地，雷達閃爍警示。
  3. 若目標區塊已配置大地圖 $\implies$ 執行無縫載入，耗時 1 小時，重構 SceneGraph，中心格轉移至新區塊。
* **3×3 雷達渲染狀態與佈局**：
  * **視窗佈局**：雷達 HUD 置於右側情報面板 (`#panel-overworld`) 最頂端，完全獨立於 640×640 遊戲畫布之外，確保遊戲地圖視野 100% 無遮擋。
  * 遍歷 $(\Delta x, \Delta y) \in \{-1, 0, 1\}^2$ 共 9 格。
  * 四正方向 $(\Delta x=0 \lor \Delta y=0)$ 若皆通暢，雷達狀態指示燈為綠燈；若任一正向受阻，狀態燈轉為黃燈並標註阻絕方位。

### 3.3 大地圖移動速度與時辰耗費動態補間 (`MovementDynamics`)
* **動態補間公式**：
  $$\text{lerpFactor} = \text{baseSpeed}(\text{hourCost}) \times \Delta t$$
  其中：
  $$\text{baseSpeed}(\text{hourCost}) = \begin{cases} 0.24 & \text{if } \text{hourCost} = 1 \text{ (平原、官道，輕快疾行)} \\ 0.13 & \text{if } \text{hourCost} = 2 \text{ (荒丘、深泥，步履稍緩)} \\ 0.065 & \text{if } \text{hourCost} \ge 3 \text{ (黑風密林、險隘，艱難沉重)} \end{cases}$$
* **補間防抖鎖定 (Movement Debounce Lock)**：
  在使用者觸發移動指令時，計算當前俠客的視覺座標與邏輯目標之歐式距離 $D = \sqrt{(visualX - owX \cdot TILE\_PX)^2 + (visualY - owY \cdot TILE\_PX)^2}$。
  若 $D > 5\text{px}$，表示前一步跋涉補間尚未收尾，暫緩連續跳步，確保耗時地形之沉浸感與防狂按穿透。
* **碰壁回彈機制 (Bump & Rebound Animation)**：
  當玩家試圖踏入不可通行地格（如崇山峻嶺、阻隔岩壁、或未開闢之世界天塹邊界）時：
  1. 邏輯坐標 $(owX, owY)$ 保持不動；
  2. 俠客視覺座標朝移動方向探進偏移：$visualX = owX \cdot TILE\_PX + dx \cdot 12\text{px}$, $visualY = owY \cdot TILE\_PX + dy \cdot 12\text{px}$；
  3. 由 Ticker 每幀插值補間迅速拉回目標網格中心點，產生「前衝受阻碰壁後彈性退回」之真實物理觸感。

### 3.3 A* 地形權重尋路系統 (`PathFinder`)
* **評估函式**：$f(n) = g(n) + h(n)$
  * $g(n) = \sum \text{MovementCost}(x, y)$
  * $h(n) = (|x_{current} - x_{target}| + |y_{current} - y_{target}|) \times 100$
* **動態介質影響**：結冰地面覆蓋時，該格移動代價動態降為 40；障礙岩壁代價為 9999 (不可通行)。

### 3.4 戰術地表化學狀態機 (`SurfaceAutomata`)
* 介質列舉：`NONE(0)`, `OIL(1)`, `FIRE(2)`, `ICE(3)`。
* **連鎖轉移**：
  * 當某一格為 `FIRE` 時，每回合燃燒持續時間遞減 1。
  * 鄰近四格中若有 `OIL`，立即連鎖引爆轉化為 `FIRE`，並重設燃燒輪數為 4。
  * 水面上釋放玄冥指，水面轉化為 `ICE`，維持 4 回合。

### 3.5 全域物品與神兵裝備總管系統 (`ItemCatalogSystem`)
* **資料儲存路徑**：`data/items.json`
* **物品大類定義 (`ItemCategory`)**：
  * `MELEE_WEAPON` (近戰武器)：專屬屬性 `atk` (物理攻擊力), `speedMod` (招式攻速 %), `armorPiercing` (破甲率 %), `reach` (攻擊距離: 1~2格), `martialMove` (專屬招式), `specialEffect` (特效詞條)。
  * `RANGED_WEAPON` (遠程暗器)：專屬屬性 `rangedAtk` (暗器傷害), `effectiveRange` (有效射程: 3~6格), `critRate` (暴擊率 %), `poisonChance` (淬毒命中率 %), `isConsumable` (消耗品判定), `ammoCost` (彈藥消耗)。
  * `ARMOR` (各式防具)：專屬屬性 `armorSlot` (部位: 輕袍/重鎧/軟靴/護腕/靈寶/護心鏡), `def` (外功防禦), `hpBonus` (氣血上限), `strainRes` (經脈抗性 %), `dodgeMod` (閃避修正 %), `stealthMod` (夜行隱匿 %)。
  * `MEDICINE` (補血丹藥)：專屬屬性 `medType` (外傷靈藥/內服靈丹/清心解毒/續命仙草), `healHp` (氣血回復), `healQi` (真氣回復), `cureEffects` (異常解除), `combatUsable` (戰鬥可用性), `cooldownTurns` (調息輪數)。
  * `ENHANCEMENT` (強化鍛造)：專屬屬性 `targetType` (淬鍊部位), `upgradeBonus` (強化詞條), `successRate` (成功率 %), `maxGrade` (上限階級), `consumedMaterial` (消耗材料)。
  * `SPECIAL` (秘寶奇物)：專屬屬性 `specialType` (宗門信物/武學殘卷/秘鑰), `questLink` (任務關聯), `passiveBonus` (常駐光環)。
* **品質階級矩陣 (`ItemTier`)**：
  * `COMMON` (凡品 - 白), `UNCOMMON` (良品 - 綠), `RARE` (上品 - 紫), `EPIC` (極品 - 金), `LEGENDARY` (寶器 - 橙), `MYTHIC` (神兵絕品 - 紅)。
* **隨機建議生成器 (`RandomSuggesterEngine`)**：
  * 結合武俠名詞矩陣、品質係數縮放 ($V = V_{base} \times Mult$) 與典故文案生成自洽平衡之裝備數值。
* **多存檔與本機磁碟讀寫機制 (`SaveSlotAndLocalStorage`)**：
  * **專案存檔槽位**：支援在 `data/` 目錄中自由載入、切換與另存新檔（如 `items.json`, `items_default.json`, `items_custom.json`）。
  * **本機磁碟直讀直存**：支援瀏覽器 File System Access API（`showOpenFilePicker`），可直接從本機磁碟選擇任意 JSON 存檔，編輯後直接原地回寫保存，亦支援無伺服器純離線本機快取。

---

## 4. 本地開發與持久化 REST API 契約

由 [server.js](file:///d:/Repositories/game-jianghu/server.js) 原生提供：

1. `GET /api/maps`
   * 回傳：專案 `maps/` 目錄內所有 `.tmj` 與 `.json` 檔案字串陣列。
2. `GET /api/maps/:filename`
   * 回傳：指定地圖之完整 JSON 物件。
3. `POST /api/maps/:filename`
   * 請求體：合法 JSON 字串。
   * 回傳：`{ success: true, message: string, filename: string }`，直接原子性寫入專案磁碟。
4. `GET /api/items/files`
   * 回傳：專案 `data/` 目錄內所有物品存檔檔案名稱陣列（例如 `["items.json", "items_default.json"]`）。
5. `GET /api/items/files/:filename`
   * 回傳：指定物品存檔檔案之完整 JSON 陣列。
6. `POST /api/items/files/:filename`
   * 請求體：合法物品清單 JSON 陣列。
   * 回傳：`{ success: true, message: string, filename: string, count: number }`，原子性寫入指定之存檔檔案。
7. `GET /api/items` 或 `GET /api/items/default`
   * 回傳：預設物品庫清單。
8. `POST /api/items/reset-default`
   * 動作：呼叫生成器重新隨機產生 108 件物品（各類各級 3 樣），覆寫保存至 default 與 items 檔。
