/**
 * 《浮世江湖》- 區域地圖與全域設定總管一致性校驗與同步服務 (MapSyncService)
 * 確保所有區域地圖 (.tmj) 中的：
 * - 關聯門派 (faction) 來自武學/門派設定總管
 * - 可能出現任務 (possibleQuests) 來自任務事件總管 (QUEST)
 * - 可能出現事件 (possibleEvents) 來自任務事件總管 (EVENT)
 * - 可能掉落寶物 (possibleLoot) 來自物品總管
 * - 可能出現敵人 (possibleEnemies) 來自角色總管
 */
const fs = require('fs');
const path = require('path');

function safeReadJson(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) { }
  return fallback;
}

function loadReferenceCatalogs(dataDir) {
  const items = safeReadJson(path.join(dataDir, 'items.json'), []);
  const martials = safeReadJson(path.join(dataDir, 'martials.json'), []);
  const characters = safeReadJson(path.join(dataDir, 'characters.json'), []);
  const questsAll = safeReadJson(path.join(dataDir, 'quests.json'), []);

  const quests = questsAll.filter(q => q.entryType === 'QUEST');
  const events = questsAll.filter(q => q.entryType === 'EVENT');

  // 從 martials 收集門派名稱（含標準七大門派）
  const sectSet = new Set(['少林寺', '武當派', '華山派', '丐幫', '峨嵋派', '逍遙派', '江湖散人']);
  martials.forEach(m => {
    if (m.sectName && typeof m.sectName === 'string') sectSet.add(m.sectName.trim());
  });

  return {
    items,
    martials,
    characters,
    quests,
    events,
    sects: Array.from(sectSet)
  };
}

function getPropMap(tmj) {
  const map = {};
  if (Array.isArray(tmj.properties)) {
    tmj.properties.forEach(p => { map[p.name] = p; });
  }
  return map;
}

function setProp(tmj, name, type, value) {
  if (!Array.isArray(tmj.properties)) tmj.properties = [];
  const existing = tmj.properties.find(p => p.name === name);
  if (existing) {
    existing.type = type;
    existing.value = value;
  } else {
    tmj.properties.push({ name, type, value });
  }
}

function pickSubsetBySeed(arr, count, seedNum) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const res = [];
  const used = new Set();
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    let idx = Math.abs((seedNum + i * 7) % arr.length);
    while (used.has(idx) && used.size < arr.length) {
      idx = (idx + 1) % arr.length;
    }
    used.add(idx);
    res.push(arr[idx]);
  }
  return res;
}

/**
 * 校驗並同步單張區域地圖的 properties 是否與各總管相符
 * @returns {{ changed: boolean, reasons: string[] }}
 */
function syncSingleRegionalMap(tmj, catalogs, seedNum = 1) {
  const propMap = getPropMap(tmj);
  const reasons = [];
  let changed = false;

  const difficulty = parseInt(propMap.difficulty?.value, 10) || 2;
  const validItemNames = new Set(catalogs.items.map(i => i.name));
  const validQuestTitles = new Set(catalogs.quests.map(q => q.title));
  const validEventTitles = new Set(catalogs.events.map(e => e.title));
  const validCharNames = new Set(catalogs.characters.map(c => c.name));
  const validSects = new Set(catalogs.sects);

  // 1. 門派 (faction) 校驗：若非空且不在合法門派中，重置為合法門派或清空
  const curFaction = (propMap.faction?.value || '').trim();
  if (curFaction && !validSects.has(curFaction)) {
    const newFaction = catalogs.sects[seedNum % catalogs.sects.length] || '';
    setProp(tmj, 'faction', 'string', newFaction);
    reasons.push(`門派 [${curFaction}] 已更新為 [${newFaction}]`);
    changed = true;
  }

  // 2. 可能出現任務 (possibleQuests) 校驗：必須來自 quests.json (QUEST)
  const rawQuests = (propMap.possibleQuests?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const keptQuests = rawQuests.filter(q => validQuestTitles.has(q));
  if (catalogs.quests.length > 0 && (keptQuests.length === 0 || keptQuests.length !== rawQuests.length)) {
    const diffMatched = catalogs.quests.filter(q => Math.abs((q.difficulty || 2) - difficulty) <= 1);
    const pool = diffMatched.length > 0 ? diffMatched : catalogs.quests;
    const picked = pickSubsetBySeed(pool, 2, seedNum).map(q => q.title);
    const finalQuests = keptQuests.length > 0
      ? Array.from(new Set([...keptQuests, ...picked])).slice(0, 3)
      : picked;
    setProp(tmj, 'possibleQuests', 'string', finalQuests.join('\n'));
    reasons.push('possibleQuests 已對齊任務總管');
    changed = true;
  }

  // 3. 可能出現事件 (possibleEvents) 校驗：必須來自 quests.json (EVENT)
  const rawEvents = (propMap.possibleEvents?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const keptEvents = rawEvents.filter(e => validEventTitles.has(e));
  if (catalogs.events.length > 0 && (keptEvents.length === 0 || keptEvents.length !== rawEvents.length)) {
    const picked = pickSubsetBySeed(catalogs.events, 2, seedNum + 3).map(e => e.title);
    const finalEvents = keptEvents.length > 0
      ? Array.from(new Set([...keptEvents, ...picked])).slice(0, 3)
      : picked;
    setProp(tmj, 'possibleEvents', 'string', finalEvents.join('\n'));
    reasons.push('possibleEvents 已對齊事件總管');
    changed = true;
  }

  // 4. 可能掉落寶物 (possibleLoot) 校驗：必須來自 items.json
  const rawLoot = (propMap.possibleLoot?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const keptLoot = rawLoot.filter(l => validItemNames.has(l));
  if (catalogs.items.length > 0 && (keptLoot.length === 0 || keptLoot.length !== rawLoot.length)) {
    const humanItems = catalogs.items.filter(i => !i.equipRace || i.equipRace === 'HUMAN' || i.equipRace === 'ALL');
    const pool = humanItems.length > 0 ? humanItems : catalogs.items;
    const picked = pickSubsetBySeed(pool, 3, seedNum + 5).map(i => i.name);
    const finalLoot = keptLoot.length > 0
      ? Array.from(new Set([...keptLoot, ...picked])).slice(0, 3)
      : picked;
    setProp(tmj, 'possibleLoot', 'string', finalLoot.join('\n'));
    reasons.push('possibleLoot 已對齊物品總管');
    changed = true;
  }

  // 5. 可能出現敵人 (possibleEnemies) 校驗：必須來自 characters.json
  const rawEnemies = (propMap.possibleEnemies?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const keptEnemies = rawEnemies.filter(e => validCharNames.has(e));
  if (catalogs.characters.length > 0 && (keptEnemies.length === 0 || keptEnemies.length !== rawEnemies.length)) {
    const targetMinLv = Math.max(1, (difficulty - 1) * 10);
    const targetMaxLv = difficulty * 10 + 4;
    const levelMatched = catalogs.characters.filter(c => (c.level || 1) >= targetMinLv && (c.level || 1) <= targetMaxLv);
    const pool = levelMatched.length > 0 ? levelMatched : catalogs.characters;
    const picked = pickSubsetBySeed(pool, 3, seedNum + 9).map(c => c.name);
    const finalEnemies = keptEnemies.length > 0
      ? Array.from(new Set([...keptEnemies, ...picked])).slice(0, 3)
      : picked;
    setProp(tmj, 'possibleEnemies', 'string', finalEnemies.join('\n'));
    reasons.push('possibleEnemies 已對齊角色總管');
    changed = true;
  }

  return { changed, reasons };
}

/**
 * 檢查並同步 maps/ 目錄下所有區域地圖
 */
function syncAllRegionalMaps(mapsDir, dataDir, dryRun = false) {
  const catalogs = loadReferenceCatalogs(dataDir);
  if (!fs.existsSync(mapsDir)) {
    return { checkedMaps: 0, updatedMaps: 0, details: [] };
  }

  const files = fs.readdirSync(mapsDir).filter(f => f.endsWith('.tmj') && !f.includes('arena'));
  let updatedMaps = 0;
  const details = [];

  files.forEach((fname, idx) => {
    const fullPath = path.join(mapsDir, fname);
    try {
      const tmj = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const res = syncSingleRegionalMap(tmj, catalogs, idx + 1);
      if (res.changed) {
        updatedMaps++;
        details.push({ file: fname, reasons: res.reasons });
        if (!dryRun) {
          fs.writeFileSync(fullPath, JSON.stringify(tmj, null, 2), 'utf8');
        }
      }
    } catch (e) { }
  });

  return {
    checkedMaps: files.length,
    updatedMaps,
    details
  };
}

module.exports = {
  loadReferenceCatalogs,
  syncSingleRegionalMap,
  syncAllRegionalMaps
};
