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
| 規模: 寬高 1~128 區塊 (預設 16x16, 最大 16,384 個獨立區域地圖)                 |
| 規格約束: 每格代表一張專屬區域地圖，嚴格唯一性排他約束 (非重複不可佔用)        |
+-------------------------------------------------------------------------+
                                   |
                                   v (雙向導航 / 跨界漫遊)
+-------------------------------------------------------------------------+
| Level 2: 區域地圖探索區塊 (Overworld Chunk)                                 |
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
      mapFile: string;      // 區域地圖檔案檔名 (例: "overworld_default.tmj")
      name: string;         // 分境名稱 (例: "中原核心郡縣 (洛陽·龍門)")
      biome: BiomeType;     // 風貌類型: 'PLAINS' | 'MOUNTAIN' | 'SWAMP' | 'DESERT' | 'SNOW'
      assignedAt: string;   // ISO 8601 時間戳
    }
  }
}
```

### 2.2 區域地圖與戰術地圖 Tiled 規範 (`.tmj` / `.json`)

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
   * **區域地圖 GID 映射**：
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
* **觸發條件**：玩家在區域地圖網格坐標挪移，產生目標 $(nx, ny)$ 超出 $[0, 15]$ 邊界。
* **跨圖向量轉換矩陣**：
  $$\begin{cases} nx < 0 \implies targetChunkX = curChunkX - 1, & enterX = 15, & enterY = ny \\ nx \ge 16 \implies targetChunkX = curChunkX + 1, & enterX = 0, & enterY = ny \\ ny < 0 \implies targetChunkY = curChunkY - 1, & enterX = nx, & enterY = 15 \\ ny \ge 16 \implies targetChunkY = curChunkY + 1, & enterX = nx, & enterY = 0 \end{cases}$$
* **邊界裁決規則 (Boundary Arbitration)**：
  1. 若 $targetChunkX \notin [0, width-1]$ 或 $targetChunkY \notin [0, height-1]$ $\implies$ 觸發「世界極限邊界阻絕」，留在原地，雷達閃爍警示。
  2. 若目標區塊未配置區域地圖（`!worldData.cells[key]`） $\implies$ 觸發「未拓荒原阻絕」，留在原地，雷達閃爍警示。
  3. 若目標區塊已配置區域地圖 $\implies$ 執行無縫載入，耗時 1 小時，重構 SceneGraph，中心格轉移至新區塊。
* **3×3 雷達渲染狀態與佈局**：
  * **視窗佈局**：雷達 HUD 置於右側情報面板 (`#panel-overworld`) 最頂端，完全獨立於 640×640 遊戲畫布之外，確保遊戲地圖視野 100% 無遮擋。
  * 遍歷 $(\Delta x, \Delta y) \in \{-1, 0, 1\}^2$ 共 9 格。
  * 四正方向 $(\Delta x=0 \lor \Delta y=0)$ 若皆通暢，雷達狀態指示燈為綠燈；若任一正向受阻，狀態燈轉為黃燈並標註阻絕方位。

### 3.3 區域地圖移動速度與時辰耗費動態補間 (`MovementDynamics`)
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

### 3.6 全域武功與心法系統規範 (`MartialSystem`)
* **資料儲存路徑**：`data/martials.json`、`data/martials_default.json`
* **兩大類型分類 (`MARTIAL_TYPES`)**：
  * `MARTIAL` (外功武學)：戰鬥出招主動施展，加成攻擊力 (`atk`)、暴擊率 (`critRate`) 與護甲穿透 (`armorPierce`)。
  * `CULTIVATION` (內功心法)：運氣行脈被動輔助，加成防禦力 (`def`)、氣血上限 (`hpMax`)、真氣上限 (`qiMax`)、每時辰調息 (`regen`) 與減傷百分比 (`damageReduction`)。
* **七大門派體系 (`SECTS`)**：
  * 少林寺 (`SHAOLIN`)、武當派 (`WUDANG`)、華山派 (`HUASHAN`)、丐幫 (`GAIBANG`)、峨嵋派 (`EMEI`)、逍遙派 (`XIAOYAO`)、江湖散人 (`NEUTRAL`)。
* **等級上限與境界稱謂梯級 (`MAX_LEVEL = 20`)**：
  * 最高等級為 20 重境界：1~3 重（初窺門徑）、4~6 重（略有小成）、7~9 重（駕輕就熟）、10~12 重（融會貫通）、13~15 重（爐火純青）、16~18 重（出神入化）、19 重（傲視群雄）、20 重（登峰造極）。
* **經驗值獲取機制與裝備上限約束**：
  * **外功武學**：由每次戰鬥出招/使用時累積招式歷練經驗，一次最多裝備 **3 個** (`MAX_EQUIPPED_MARTIALS = 3`)。
  * **內功心法**：由戰鬥獲勝打敗敵人時隨著等級結算經驗一起得到，一次最多裝備 **3 個** (`MAX_EQUIPPED_CULTIVATIONS = 3`)。
  * **升級經驗曲線**：$Exp(lv) = \text{round}(50 \times 1.22^{lv - 1})$；第 20 重滿級經驗為 0。
* **20 級成長矩陣 (`LevelBonuses`)**：
  * 支援平滑係數推演與逐級微調自定義矩陣，武學偏向外功攻擊增幅，心法偏向防護氣血減傷。
* **戰術交鋒招式動態綁定與打擊感視覺狀態機 (`TacticalCombatFX`)**：
  * **招式動態綁定**：戰術小地圖技能面板動態綁定玩家已裝備外功武學（快捷鍵 1~3 對應 Slot 1~3，基礎平A調用首位外功）。
  * **招式圖標釋放視覺**：每次發動招式，於打擊網格動態生成該外功專屬 Emoji 圖標（如 👊、🗡️、🐉），先驟放放大（$0.6 \to 1.4\times$），隨後平滑淡出。
  * **敵我雙向傷害飄字**：不論敵我受創或承受環境傷害，向上漂移浮動數字（暴擊標註金色文字，受擊 crimson 紅色），平滑淡出銷毀。
  * **物理打擊感頓挫回饋 (`HitImpact`)**：受擊方觸發衰減高頻震動 ($\pm 6\text{px}$ 搖晃)、物理衝擊內凹壓縮（半徑由 14px 壓至 12px）與高光白色/血紅受創閃光與衝擊波環。

### 3.7 人物經驗升級、自由潛能點與綜合戰鬥數值引擎 (`PlayerCombatStatsEngine`)
* **人物經驗值與升級成長 (`PlayerProgression`)**：
  * **數值結構**：`level` (等級), `exp` (當前經驗), `maxExp` (突破門檻), `freeAttributePoints` (自由分配潛能點)。
  * **經驗曲線**：$MaxExp(lv) = \text{round}(100 \times 1.28^{lv - 1})$。
  * **升級回饋**：經驗滿自動突破境界，升級獎勵 **5 點自由潛能點**，氣血與真氣充盈回滿，自動刷新境界稱謂（如初入江湖、略有小成、聲名鵲起、江湖豪俠、武林名宿、一代宗師、登峰造極）。
  * **經驗獲得管道**：戰鬥獲勝打敗敵人時，與心法周天修為同步結算獲得人物修為經驗（普通敵手 +65，懸賞首領 +180）。
* **自由潛能點分配 (`AttributeAllocation`)**：
  * 玩家於屬性視窗中可將剩餘自由潛能點手動分配至核心五維：
    * **臂力 (STR)**：破外功攻擊與格擋。
    * **身法 (AGI)**：身形速度、暴擊與主要閃避。
    * **根骨 (CON)**：生命儲備上限與外功護體防禦。
    * **悟性 (WIS)**：內力真氣上限與化勁減傷。
    * **福緣 (LCK)**：暴擊機緣與幸運閃避。
  * 分配後即時更新人物各項數值並觸發戰鬥綜合指標重算。
* **戰鬥綜合數值計算引擎 (`calcPlayerCombatStats`)**：
  * **外功攻擊力 (ATK)**：
    $$\text{ATK} = (\text{STR} \times 1.8 + \text{Weapon}_{\text{atk}} + \text{Trinket}_{\text{atk}} + \text{Martial}_{\text{atk}}) \times \text{Mul}_{\text{atk}}$$
  * **護體防禦力 (DEF)**：
    $$\text{DEF} = (\text{STR} \times 0.4 + \text{CON} \times 1.3 + \text{WIS} \times 0.5 + \text{Armor}_{\text{def}} + \text{Trinket}_{\text{def}} + \text{Cultivation}_{\text{def}}) \times \text{Mul}_{\text{def}}$$
  * **身法閃避率 (DODGE %)**：
    $$\text{DODGE} = \begin{cases} 0\% & \text{if STUNNED} \\ \min(80\%, \max(0\%, \text{AGI} \times 0.45 + \text{LCK} \times 0.2 + \text{Equip}_{\text{dodge}} + \text{Cultivation}_{\text{dodge}} + \Delta_{\text{dodge}})) & \text{otherwise} \end{cases}$$
  * **致命暴擊率 (CRIT %)**：
    $$\text{CRIT} = \min(85\%, \max(0\%, \text{AGI} \times 0.35 + \text{LCK} \times 0.3 + \text{Equip}_{\text{crit}} + \text{Martial}_{\text{crit}}))$$
  * **氣血與真氣上限 (Max HP / Max Qi)**：由根骨、悟性、防具飾品及運轉中三大心法層數綜合決定。
* **狀態系統 (`StatusEffects`)**：
  * **暈眩 (`STUNNED` 💫)**：周身僵滯，跳過出招回合，**身法閃避率強制歸 0%**。
  * **中毒 (`POISONED` 🧪)**：每輪流失 15 點氣血，**防禦力 -15%**、**閃避率 -15%**。
  * **奮起 (`INSPIRED` ⚔️)**：暴擊重創或戰意觸發，**攻擊力 +25%**、**防禦力 +20%**、**閃避率 +10%**。
  * **受傷 (`WOUNDED` 🩸)**：筋骨挫傷，**攻擊力 -20%**、**防禦力 -20%**、**閃避率 -10%**。
  * **經脈負荷 (`STRAINED` ⚡)**：經脈負荷 $strain > 0$ 時，攻防依比例受到削弱。
* **戰術交鋒命中與閃避判定**：
  * 敵方進攻時優先檢驗玩家綜合閃避率，若判定為閃避，飄浮冰藍色「💨 閃避!」字樣且不受任何傷害；
  * 若未閃避，傷害依照敵方攻擊力經過玩家綜合防禦公式 $Dmg = \max(5, \text{EnemyAtk} \times \frac{120}{120 + \text{DEF}})$ 計算實質減免，並附帶受傷/中毒機率。

### 3.8 角色實體、三大種族、形態等級區間與相異攻擊模式 (`CharacterSystem`)
* **資料儲存路徑**：`data/characters.json`、`data/characters_default.json`
* **獨立視覺化編輯器**：[character_manager.html](file:///d:/Repositories/game-jianghu/character_manager.html)
* **三大主要種族 (`RACES`)**：
  * **人類 (`HUMAN` 👤)**：萬物之靈，擅使各路兵刃拳腳與心法絕學，戰術靈動，著重招架與氣勁。
  * **野獸 (`BEAST` 🐺)**：大自然孕育之猛獸靈禽，野性直覺敏銳，擅長高速猛撲、撕裂持續流血與狂暴咆哮。
  * **魔物 (`MONSTER` 👹)**：幽冥冥界異化的妖魔邪物，行徑詭譎，擅長血魄汲取、地獄火毒腐蝕與心智恐懼。
* **各族強度形態梯級與等級區間約束 (`FORMS & LEVEL_RANGES`)**：
  * **人類 (`HUMAN`)**：
    * `CIVILIAN` (鄉井平民 / 販夫走卒)：等級區間 **Lv 1 ~ 5**，慌亂推打或求饒逃竄。
    * `OUTLAW` (綠林草莽 / 剪徑宵小)：等級區間 **Lv 4 ~ 12**，快刀暗箭與淬毒伏擊。
    * `MARTIAL_ARTIST` (江湖遊俠 / 鏢頭劍客)：等級區間 **Lv 10 ~ 20**，正宗外家拳劍與招架反制。
    * `SECT_ELITE` (名門菁英 / 舵主長老)：等級區間 **Lv 18 ~ 30**，門派絕學連擊與內功護體。
    * `GRANDMASTER` (絕頂宗師 / 武林至尊)：等級區間 **Lv 28 ~ 50**，罡氣領域與氣勁破空碎甲。
  * **野獸 (`BEAST`)**：
    * `WILD_BEAST` (荒原群獸 / 惡狼獵犬)：等級區間 **Lv 1 ~ 8**，群聚撲咬與敏捷游走。
    * `FERAL_PREDATOR` (兇殘猛獸 / 巨熊猛虎)：等級區間 **Lv 7 ~ 18**，重爪拍擊擊退與眩暈。
    * `MUTATED_BEAST` (異變靈獸 / 赤目毒蛛)：等級區間 **Lv 15 ~ 28**，毒腺噴射與嗜血狂暴。
    * `ANCIENT_CALAMITY` (上古凶獸 / 墨鱗神蛟)：等級區間 **Lv 26 ~ 50**，撼動山嶽與踐踏滅敵。
  * **魔物 (`MONSTER`)**：
    * `IMP_GHOUL` (幽魂腐屍 / 怨靈屍魅)：等級區間 **Lv 3 ~ 12**，物理抗性強，陰煞侵蝕。
    * `ABYSSAL_FIEND` (地淵魔魁 / 嗜血狂魔)：等級區間 **Lv 10 ~ 22**，血魄冥氣汲取，以戰養血。
    * `CHAOS_SORCERER` (冥幽術士 / 黃泉祭司)：等級區間 **Lv 20 ~ 32**，地獄火海腐蝕與恐懼凝視。
    * `DEMON_LORD` (羅剎魔皇 / 滅世天魔)：等級區間 **Lv 30 ~ 50**，魔煞十字爆震，領域死境。
* **相異攻擊模式體系 (`ATTACK_PATTERNS`)**：
  * **人類專屬**：
    * `MARTIAL_COMBO` (外功絕學連招)：消耗真氣施展武學，威力 1.35x，高暴擊率並附加破甲增傷。
    * `TACTICAL_KITE` (戰術身法游擊)：遠程射程 3 格暗器連射，命中後靈動後撤拉開安全距離。
    * `PARRY_COUNTER` (守勢招架反制)：進入高防禦格擋姿態，受擊後爆發 1.5x 反震傷害。
    * `CIVILIAN_FLEE` (慌亂推搡擲石)：非戰鬥人員投擲石塊或推打，傷害微薄 (0.6x)，優先逃竄。
  * **野獸專屬**：
    * `BEAST_POUNCE` (疾影猛撲突進)：高速直線暴衝 2~3 格撲向目標，45% 造成擊退與暈眩 1 回合。
    * `FRENZY_BITE` (狂暴撕裂撕咬)：尖牙狠咬皮肉，造成大撕裂傷口，80% 機率附加持續【受傷】流血。
    * `TERRIFYING_ROAR` (萬獸狂暴怒吼)：震撼長嘯，削弱周遭 3 格敵人 25% 防禦，自身獲得【奮起】。
    * `VENOM_SPRAY` (毒腺噴射毒液)：射程 2 格噴射烈性毒液，造成傷害並 85% 附加 3 輪【中毒】腐蝕。
  * **魔物專屬**：
    * `CHAOS_SURFACE` (地獄深淵腐蝕)：直接將目標及其鄰近地格轉化為烈焰火海 (`FIRE`) 焚燒敵手。
    * `LIFE_DRAIN` (血魄冥氣汲取)：射程 2 格暗黑血線，將造成傷害的 60% 直接轉化為自身氣血回復。
    * `AOE_NOVA` (滅世魔煞爆震)：以自身為中心蓄力引爆十字 4 格範圍魔氣衝擊波，威力 1.5x 並附帶眩暈擊退。
    * `STUN_GAZE` (幽冥恐懼凝視)：射程 3 格雙目射出攝魂陰光，90% 必定造成目標陷入【暈眩】。

### 3.9 主角形態進化、等級瓶頸與區域地圖突破特殊魔物系統 (Character Evolution & Breakthrough Boss)

1. **全域角色庫驅動**：
   * 區域地圖遊蕩散客與敵手（`roamingEnemies`）完全由 `src/core/CharacterGenerator.js` 角色庫資料庫及生態群落挑選演算法（`selectEnemyForEncounter`）動態生成，具備三大種族（`HUMAN`、`BEAST`、`MONSTER`）、形態與 12 種相異攻擊模式（`attackPattern`）。
2. **主角人類初始規範**：
   * 主角種族綁定為人類（`HUMAN`），初始為最低形態鄉井平民（`CIVILIAN`，等級 1，等級區間 `[1, 5]`）。
   * 人物面板完整呈現種族、當前形態與當前形態等級上限（例如：`人類 · 鄉井平民 (當前上限 Lv.5)`）。
3. **等級瓶頸約束與地圖特殊魔物降世**：
   * 當主角修為達到當前形態之最高等級（如平民 Lv.5、草莽 Lv.12、遊俠 Lv.20、菁英 Lv.30）時，經驗值封頂，鎖定 `isBreakthroughPending = true`。
   * 自動調用 `spawnEvolutionBoss()` 於當前區域地圖玩家鄰近安全通行地格召喚對應階梯的特殊突破魔物（`isEvolutionBoss = true`，紫黑煞氣微光光環與標記 `⚡【魔煞】`）。
   * 戰報廣播天地異變與魔煞降臨警訊，未擊滅魔煞前無法越級升級。
4. **戰鬥中相異攻擊模式真實執行**：
   * 戰鬥敵人行動（`executeEnemyAction`）完整對接執行其 `attackPattern`（如野獸疾影猛撲突進撲擊與暈眩、撕裂流血、怒吼削弱防禦、毒腺噴射中毒、魔物深淵地獄火海腐蝕地格、血魄冥氣吸血回復、滅世魔煞十字爆震擊退、幽冥恐懼凝視暈眩等），配合動態招式圖案、飄字傷害與受擊震顫動畫。
5. **斬殺魔煞與形態涅槃進化結算**：
   * 戰勝擊倒 `isEvolutionBoss` 後，解除 `isBreakthroughPending` 瓶頸。
   * 呼叫 `handlePlayerFormEvolution()` 進化至下一形態（`CIVILIAN` -> `OUTLAW` -> `MARTIAL_ARTIST` -> `SECT_ELITE` -> `GRANDMASTER`）。
   * 解鎖全新等級上限，全基礎屬性永久提升（+3 ~ +8），發放巨額突破自由潛能點（+15 ~ +35 點），內力氣血完全充盈滿溢，並可繼續累積經驗升級。

3.10 遊戲首頁、新江湖故事打包封裝與獨立遊戲存檔機制 (Story Home Screen & Save Isolation)
---------------------------------------------------------------------------------------------------------
1. **遊戲啟動首頁 (Home / Title Screen)**：
   * 進入遊戲時優先展示沉浸式水墨江湖主選單（`#home-screen`），包含【踏入江湖 · 開啟新故事】、【故劍重溫 · 繼續江湖卷宗】與【乾坤推演 · 世界編輯器總覽】三大核心區塊。
2. **全設定深拷貝打包另存機制**：
   * 當啟動任一全新江湖故事時，系統自動將當前區域地圖（`maps/overworld_default.tmj`）、世界地圖 3x3 區塊配置（`world_default.json`）、全品類物品庫（`items.json`）、名門武學心法（`martials.json`）與全域角色庫（`characters.json`）深拷貝封裝，另存為獨立存檔檔案（`saves/story_<timestamp>.json`）。
3. **冒險過程之資料隔離固化與編輯器隔離**：
   * 遊戲進行中所有遭遇、物品掉落、敵人生成、招式研習與地貌漫遊，皆唯一讀寫當前存檔內的固化快照數據，絕不污染亦不受外部全域編輯器變更影響。
   * 遊戲頂部 Header 完全移除所有 5 大編輯器跳轉按鈕，改為提供「📖 當前故事卷名」、「💾 保存進度」與「🚪 返回首頁」按鈕。

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
9. `GET /api/martials/files`
   * 回傳：專案 `data/` 目錄內所有武學存檔檔案名稱陣列（例如 `["martials.json", "martials_default.json"]`）。
10. `GET /api/martials/files/:filename`
    * 回傳：指定武學存檔檔案之完整 JSON 陣列。
11. `POST /api/martials/files/:filename`
    * 請求體：合法武學清單 JSON 陣列。
    * 回傳：`{ success: true, message: string, filename: string, count: number }`，原子性寫入指定之存檔檔案。
12. `GET /api/martials` 或 `GET /api/martials/default`
    * 回傳：預設武學心法清單。
13. `POST /api/martials/reset-default`
    * 動作：重設預設 18 部名門武學心法資料庫，寫入 `martials.json` 與 `martials_default.json`。
14. `GET /api/characters/files`
    * 回傳：專案 `data/` 目錄內所有角色存檔檔案名稱陣列（例如 `["characters.json", "characters_default.json"]`）。
15. `GET /api/characters/files/:filename`
    * 回傳：指定角色存檔檔案之完整 JSON 陣列。
16. `POST /api/characters/files/:filename`
    * 請求體：合法角色清單 JSON 陣列。
    * 回傳：`{ success: true, message: string, filename: string, count: number }`，原子性寫入指定之存檔檔案。
17. `GET /api/characters` 或 `GET /api/characters/default`
    * 回傳：預設全角色資料庫清單。
18. `POST /api/characters/reset-default`
    * 動作：重設預設三大種族全形態角色資料庫，覆寫寫入 `characters.json` 與 `characters_default.json`。
19. `GET /api/saves`
    * 回傳：所有歷史故事存檔摘要陣列（包含 id, filename, title, heroName, level, formName, curChunkName, clock, updatedAt）。
20. `GET /api/saves/:filename`
    * 回傳：指定故事存檔之完整獨立封包 JSON。
21. `POST /api/saves/:filename`
    * 請求體：合法故事存檔 JSON 物件。
    * 回傳：`{ success: true, message: string, filename: string, id: string }`，原子性保存至 `saves/` 目錄。
22. `DELETE /api/saves/:filename`
    * 動作：刪除指定存檔檔案。
