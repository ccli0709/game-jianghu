# 《浮世江湖》測試規範與品質保證體系 (Test Engineering & Verification)

> 文件版本：v1.2.0  
> 測試套件目錄：[eng/tests/](file:///d:/Repositories/game-jianghu/eng/tests/)  
> 執行指令：`npm test` 或 `node eng/tests/run_all_tests.js`

---

## 1. 測試策略 (Testing Strategy)

本專案採三層自動化驗證模型：

```
       +------------------------------------+
       |  層級 3: 地圖結構與資料完整性測試     | -> test_map_schema.js
       |  (Tiled TMJ, Properties, World JSON)|
       +------------------------------------+
       |  層級 2: 系統整合與邊界跨圖驗證       | -> test_chunk_transition.js
       |  (Chunk Hopping, World Bounds)     |
       +------------------------------------+
       |  層級 1: 核心演算法與狀態單元測試     | -> test_world_clock.js
       |  (A* Pathfinding, WorldClock, FSM)  |    test_pathfinder.js
       +------------------------------------+
```

---

## 2. 測試案例矩陣 (Test Case Matrix)

| 模組 | 測試檔案 | 測試要點 | 預期結果 |
| :--- | :--- | :--- | :--- |
| **時鐘與時辰** | `test_world_clock.js` | 1. 24 小時累進與換日邏輯<br>2. 十二時辰對應名稱正確性<br>3. 白晝、夕陽、掌燈、深夜光照狀態轉換<br>4. 深夜提燈遮罩 (Night Lantern Mask) 啟用狀態 | 100% 吻合規格，無時序偏差 |
| **A* 尋路演算法** | `test_pathfinder.js` | 1. 直線無障礙尋路<br>2. 繞行岩壁障礙 (Wall/Rock)<br>3. 權衡繞開高代價地格 (泥濘 160 vs 青石 100)<br>4. 目標不可達時之空路徑安全返回 | 尋獲之代價總和為數學最優解，不穿牆 |
| **跨區漫遊狀態機** | `test_chunk_transition.js` | 1. 16×16 邊緣出界向量運算 (東出西進、南出北進等)<br>2. 世界極限邊界阻絕 ($<0$ 或 $\ge 128$)<br>3. 未拓荒原相鄰阻絕判定<br>4. 3×3 雷達四周連通性統計 | 阻絕判定 100% 攔截，無穿模或陣列越界 |
| **地圖 Schema 規範** | `test_map_schema.js` | 1. `maps/world_default.json` 頂層欄位與 cells 格式<br>2. 所有被引用的 `.tmj` 檔案在磁碟之存在性<br>3. `properties` 屬性覆蓋 (mapName, difficulty, specialType, possibleQuests, possibleLoot)<br>4. Tiled 1.10 圖層長度與 GID 合法性 | 所有專案地圖檔案均合規，無孤立斷鏈地圖 |

---

## 3. 測試執行指引

在專案根目錄終端機執行：

```bash
# 執行全部測試套件
npm test

# 或單獨執行某項測試
node eng/tests/test_world_clock.js
node eng/tests/test_pathfinder.js
node eng/tests/test_chunk_transition.js
node eng/tests/test_map_schema.js
```
