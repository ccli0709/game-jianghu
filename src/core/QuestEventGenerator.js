/**
 * 《浮世江湖》- 任務與隨機事件全域生成器 (QuestEventGenerator)
 * 參考《神龍大俠傳》、《巫山傳》南宋江湖背景（繁體中文）
 *
 * 區分兩大核心類型：
 * 1. QUEST (主動接取任務)：主角可自由選擇是否接取；完成必得經驗值與金錢，少數任務可獲得稀有物品。
 * 2. EVENT (隨機觸發事件)：漫遊區域地圖時隨機觸發（如撿到碎銀、觀景頓悟加經驗、險惡地形失足受傷等）。
 */
(function (root) {
  const ENTRY_TYPES = {
    QUEST: { id: 'QUEST', name: '江湖任務', desc: '需由主角於客棧/官府主動接取並可選擇是否承接，完成後發放經驗、金錢與少數物品獎勵。' },
    EVENT: { id: 'EVENT', name: '隨機事件', desc: '漫遊區域地圖時依地形與福緣隨機觸發，如拾獲錢財、頓悟增經驗或險地受傷。' }
  };

  const QUEST_SUBTYPES = {
    BOUNTY: { id: 'BOUNTY', name: '緝拿除惡', icon: '⚔️' },
    ESCORT: { id: 'ESCORT', name: '護送押鏢', icon: '🛡️' },
    EXPLORE: { id: 'EXPLORE', name: '秘境探查', icon: '🧭' },
    DELIVERY: { id: 'DELIVERY', name: '江湖傳書', icon: '📜' }
  };

  const EVENT_CATEGORIES = {
    TREASURE: { id: 'TREASURE', name: '意外拾財', icon: '🪙' },
    EPIPHANY: { id: 'EPIPHANY', name: '江湖頓悟', icon: '💡' },
    HAZARD: { id: 'HAZARD', name: '險地受創', icon: '⚠️' },
    ENCOUNTER: { id: 'ENCOUNTER', name: '偶遇善緣', icon: '🍵' }
  };

  const STORY_QUEST_TEMPLATES = [
    {
      subType: 'BOUNTY', title: '緝拿浙西五虎餘黨', difficulty: 1, hasItemReward: false,
      desc: '臨安府官道近來有「浙西五虎」餘孽攔路劫道，官府懸賞十方俠士前往清剿。'
    },
    {
      subType: 'DELIVERY', title: '天目山莊急件傳書', difficulty: 1, hasItemReward: false,
      desc: '西門莊主託付將一封密函火速送往忠義營，途中有金國細作窺伺，務必小心。'
    },
    {
      subType: 'EXPLORE', title: '追查太湖七十二洞天奇石', difficulty: 2, hasItemReward: true,
      rewardItemId: 'med_xiaohuan_pill',
      desc: '開封府總捕馬雲龍委託追查遺失的太湖仙石線索，據傳石屑落於江南水畔。'
    },
    {
      subType: 'BOUNTY', title: '清剿黑水寨悍匪', difficulty: 2, hasItemReward: false,
      desc: '黑水寨盜匪頻頻劫掠過往商隊，當地商會聯合出資招募俠客討伐寨主。'
    },
    {
      subType: 'ESCORT', title: '護送忠義營軍餉赴開封', difficulty: 3, hasItemReward: false,
      desc: '抗金前線急需軍糧銀兩，忠義營招募武林好手護送鏢車穿越荒丘密林。'
    },
    {
      subType: 'EXPLORE', title: '探查巫山十二峰瘴氣源頭', difficulty: 3, hasItemReward: true,
      rewardItemId: 'med_qingxin_pill',
      desc: '巴蜀巫山近來瘴氣瀰漫，傳聞七十二洞妖道在深谷祭煉毒物，亟待俠士查明。'
    },
    {
      subType: 'BOUNTY', title: '截擊塞外三絕密探', difficulty: 4, hasItemReward: true,
      rewardItemId: 'wpn_cold_iron_sword',
      desc: '塞外三絕「地絕腿、火絕掌、風絕棍」門下煞星潛入中原，務必將其阻截於邊陲。'
    },
    {
      subType: 'EXPLORE', title: '破除石窟古墓陰煞', difficulty: 4, hasItemReward: false,
      desc: '古墓深處傳出妖異嘯聲，附近鄉民人心惶惶，懸賞高人入內鎮壓陰煞魔靈。'
    },
    {
      subType: 'BOUNTY', title: '討伐巫山九幽魔魁', difficulty: 5, hasItemReward: true,
      rewardItemId: 'arm_jade_pendant',
      desc: '巫山絕頂出現九幽煞魔肆虐，正道群雄齊聚號召絕頂高手前往誅魔衛道。'
    },
    {
      subType: 'ESCORT', title: '護送神劍山莊秘寶入京', difficulty: 3, hasItemReward: false,
      desc: '神劍山莊邵莊主欲將傳世寶匣送往臨安，沿途各路綠林虎視眈眈。'
    },
    {
      subType: 'DELIVERY', title: '送達抗金密報予辛將軍', difficulty: 2, hasItemReward: false,
      desc: '江南義軍探得金軍動向，急需身法敏捷的俠士將密報送達前方大營。'
    },
    {
      subType: 'BOUNTY', title: '除盡長白雪域嗜血妖獸', difficulty: 5, hasItemReward: false,
      desc: '北方雪域連日暴雪，山中異變巨獸下山傷人，當地獵戶集資重賞求助。'
    }
  ];

  const STORY_EVENT_TEMPLATES = [
    {
      eventCategory: 'TREASURE', title: '破廟佛龕拾獲碎銀', triggerTerrains: ['PLAINS', 'HILLS', 'ALL'],
      expDelta: 0, goldDelta: 18, hpDelta: 0, statusEffect: null,
      desc: '途經荒廢山神廟避雨時，在傾頹香案下發現前人遺落的銅錢碎銀。'
    },
    {
      eventCategory: 'TREASURE', title: '官道拾得商旅遺落錢袋', triggerTerrains: ['PLAINS', 'ALL'],
      expDelta: 0, goldDelta: 26, hpDelta: 0, statusEffect: null,
      desc: '官道泥轍旁躺著一只錦囊錢袋，四顧無人認領，姑且收入行囊權作盤纏。'
    },
    {
      eventCategory: 'TREASURE', title: '枯井古匣尋獲金葉', triggerTerrains: ['FOREST', 'HILLS'],
      expDelta: 10, goldDelta: 40, hpDelta: 0, statusEffect: null,
      desc: '在枯藤纏繞的古井石縫中摸出一只銅匣，內藏數片前朝金葉與半頁殘札。'
    },
    {
      eventCategory: 'EPIPHANY', title: '摩挲太湖奇石參透勁道', triggerTerrains: ['PLAINS', 'HILLS', 'ALL'],
      expDelta: 45, goldDelta: 0, hpDelta: 0, statusEffect: null,
      desc: '路見一塊宛如「七十二洞天」的太湖靈石，觀其孔竅氣流迴轉，忽然悟出運勁新法！'
    },
    {
      eventCategory: 'EPIPHANY', title: '遙望巫山雲霧心生頓悟', triggerTerrains: ['MOUNTAIN', 'HILLS', 'ALL'],
      expDelta: 60, goldDelta: 0, hpDelta: 0, statusEffect: null,
      desc: '立於峭壁看雲海翻湧聚散無常，心境豁然開朗，內息修為精進一籌。'
    },
    {
      eventCategory: 'EPIPHANY', title: '茶棚聽聞神龍大俠事蹟有感', triggerTerrains: ['PLAINS', 'FOREST'],
      expDelta: 35, goldDelta: 0, hpDelta: 0, statusEffect: null,
      desc: '憶起江湖流傳「俠之大者、泰山崩於前而色不改」之語，胸中豪氣頓生！'
    },
    {
      eventCategory: 'HAZARD', title: '崎嶇荒丘失足滾落碎石坡', triggerTerrains: ['HILLS', 'MOUNTAIN'],
      expDelta: 5, goldDelta: 0, hpDelta: -18, statusEffect: 'WOUNDED',
      desc: '山道碎石鬆動，一時腳下打滑跌入淺溝，雖勉強撐住卻擦傷筋骨。'
    },
    {
      eventCategory: 'HAZARD', title: '密林瘴霧誤觸毒荊棘', triggerTerrains: ['FOREST', 'SWAMP'],
      expDelta: 0, goldDelta: 0, hpDelta: -14, statusEffect: 'POISONED',
      desc: '黑風密林霧氣濃厚，撥開枝葉時不慎被帶毒荊棘劃破衣袖。'
    },
    {
      eventCategory: 'HAZARD', title: '戈壁暗風飛沙割面', triggerTerrains: ['DESERT', 'HILLS'],
      expDelta: 0, goldDelta: 0, hpDelta: -15, statusEffect: null,
      desc: '大漠驟起狂風捲起碎石砂礫，迎面撲來令人皮肉生痛，耗損不少氣血。'
    },
    {
      eventCategory: 'HAZARD', title: '暗夜林間誤踩獵戶捕獸夾', triggerTerrains: ['FOREST'],
      expDelta: 0, goldDelta: 0, hpDelta: -22, statusEffect: 'WOUNDED',
      desc: '草叢深處暗藏鏽鐵獸夾，一時未察踏個正著，痛徹心扉！'
    },
    {
      eventCategory: 'ENCOUNTER', title: '遇見雲遊郎中贈藥療傷', triggerTerrains: ['ALL', 'PLAINS', 'FOREST'],
      expDelta: 15, goldDelta: 0, hpDelta: 25, statusEffect: null,
      desc: '一位背著藥簍的老醫見你風塵僕僕，隨手贈予一碗清熱草藥湯並指點穴位。'
    },
    {
      eventCategory: 'ENCOUNTER', title: '忠義營斥候分贈乾糧飲水', triggerTerrains: ['PLAINS', 'HILLS', 'ALL'],
      expDelta: 20, goldDelta: 10, hpDelta: 15, statusEffect: null,
      desc: '途中遇見南宋忠義營巡哨義士，彼此交換江湖情報並贈予些許盤纏乾糧。'
    }
  ];

  function generateDefaultQuestsCatalog() {
    const catalog = [];

    STORY_QUEST_TEMPLATES.forEach((tpl, idx) => {
      const sub = QUEST_SUBTYPES[tpl.subType] || QUEST_SUBTYPES.BOUNTY;
      const exp = 50 + tpl.difficulty * 45;
      const gold = 30 + tpl.difficulty * 35;
      catalog.push({
        id: `quest_def_${idx + 1}`,
        entryType: 'QUEST',
        subType: tpl.subType,
        subTypeName: sub.name,
        icon: sub.icon,
        title: tpl.title,
        difficulty: tpl.difficulty,
        targetCount: tpl.difficulty >= 4 ? 2 : 1,
        desc: tpl.desc,
        rewards: {
          exp,
          gold,
          itemId: tpl.hasItemReward ? (tpl.rewardItemId || 'med_jinchuang_ointment') : null
        }
      });
    });

    STORY_EVENT_TEMPLATES.forEach((tpl, idx) => {
      const cat = EVENT_CATEGORIES[tpl.eventCategory] || EVENT_CATEGORIES.TREASURE;
      catalog.push({
        id: `event_def_${idx + 1}`,
        entryType: 'EVENT',
        eventCategory: tpl.eventCategory,
        eventCategoryName: cat.name,
        icon: cat.icon,
        title: tpl.title,
        triggerTerrains: tpl.triggerTerrains || ['ALL'],
        weight: 10,
        desc: tpl.desc,
        effects: {
          expDelta: tpl.expDelta || 0,
          goldDelta: tpl.goldDelta || 0,
          hpDelta: tpl.hpDelta || 0,
          statusEffect: tpl.statusEffect || null
        }
      });
    });

    return catalog;
  }

  /**
   * 一鍵生成隨機任務與事件庫
   * @param {Object} options
   * @param {number} [options.questCount=12] 生成主動任務數量
   * @param {number} [options.eventCount=12] 生成隨機事件數量
   * @param {number} [options.itemRewardRatio=0.25] 任務附帶物品獎勵的比例 (0~1，少數任務可獲物品)
   * @param {Function} [options.rng=Math.random]
   */
  function generateBalancedQuestsCatalog(options = {}) {
    const questCount = Math.max(1, Math.min(50, parseInt(options.questCount, 10) || 12));
    const eventCount = Math.max(1, Math.min(50, parseInt(options.eventCount, 10) || 12));
    const itemRewardRatio = Math.max(0, Math.min(0.6, Number(options.itemRewardRatio ?? 0.25)));
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;

    const catalog = [];
    const questSubKeys = Object.keys(QUEST_SUBTYPES);
    const locations = ['臨安府', '天目山', '巫山十二峰', '太湖水畔', '黑水寨', '開封城外', '蜀道雲棧', '長白雪嶺'];
    const targets = ['浙西響馬', '塞外細作', '巫山瘴魔', '七十二洞妖徒', '古墓屍魅', '惡霸山賊', '異變狂獸'];
    const rareItems = ['med_xiaohuan_pill', 'med_jinchuang_ointment', 'wpn_cold_iron_sword', 'arm_jade_pendant'];

    for (let i = 1; i <= questCount; i++) {
      const tpl = STORY_QUEST_TEMPLATES[(i - 1) % STORY_QUEST_TEMPLATES.length];
      const subKey = questSubKeys[(i - 1) % questSubKeys.length];
      const sub = QUEST_SUBTYPES[subKey];
      const diff = Math.min(5, Math.max(1, ((i - 1) % 5) + 1));
      const loc = locations[Math.floor(rng() * locations.length)];
      const tgt = targets[Math.floor(rng() * targets.length)];
      const hasItem = rng() < itemRewardRatio;
      const suffix = i > STORY_QUEST_TEMPLATES.length ? `·${loc}` : '';

      catalog.push({
        id: `quest_gen_${i}_${Math.floor(rng() * 0xffff).toString(36)}`,
        entryType: 'QUEST',
        subType: subKey,
        subTypeName: sub.name,
        icon: sub.icon,
        title: i <= STORY_QUEST_TEMPLATES.length ? tpl.title : `${loc}${sub.name}：${tgt}${suffix}`,
        difficulty: diff,
        targetCount: diff >= 4 ? 2 : 1,
        desc: i <= STORY_QUEST_TEMPLATES.length ? tpl.desc : `${loc}近來傳出${tgt}作亂消息，亟待江湖俠士主動揭榜前往處理。`,
        rewards: {
          exp: Math.round((45 + diff * 40) * (0.9 + rng() * 0.2)),
          gold: Math.round((25 + diff * 32) * (0.9 + rng() * 0.2)),
          itemId: hasItem ? rareItems[Math.floor(rng() * rareItems.length)] : null
        }
      });
    }

    const eventCatKeys = Object.keys(EVENT_CATEGORIES);
    for (let i = 1; i <= eventCount; i++) {
      const tpl = STORY_EVENT_TEMPLATES[(i - 1) % STORY_EVENT_TEMPLATES.length];
      const catKey = i <= STORY_EVENT_TEMPLATES.length ? tpl.eventCategory : eventCatKeys[(i - 1) % eventCatKeys.length];
      const cat = EVENT_CATEGORIES[catKey];
      const loc = locations[Math.floor(rng() * locations.length)];

      let effects;
      let terrains = tpl.triggerTerrains || ['ALL'];
      if (i <= STORY_EVENT_TEMPLATES.length) {
        effects = {
          expDelta: tpl.expDelta || 0,
          goldDelta: tpl.goldDelta || 0,
          hpDelta: tpl.hpDelta || 0,
          statusEffect: tpl.statusEffect || null
        };
      } else if (catKey === 'TREASURE') {
        effects = { expDelta: 0, goldDelta: 15 + Math.floor(rng() * 35), hpDelta: 0, statusEffect: null };
        terrains = ['PLAINS', 'HILLS', 'ALL'];
      } else if (catKey === 'EPIPHANY') {
        effects = { expDelta: 30 + Math.floor(rng() * 45), goldDelta: 0, hpDelta: 0, statusEffect: null };
        terrains = ['MOUNTAIN', 'HILLS', 'ALL'];
      } else if (catKey === 'HAZARD') {
        effects = { expDelta: 0, goldDelta: 0, hpDelta: -(12 + Math.floor(rng() * 18)), statusEffect: rng() > 0.5 ? 'WOUNDED' : 'POISONED' };
        terrains = ['HILLS', 'FOREST', 'MOUNTAIN', 'SWAMP'];
      } else {
        effects = { expDelta: 15, goldDelta: 10, hpDelta: 20, statusEffect: null };
        terrains = ['ALL'];
      }

      catalog.push({
        id: `event_gen_${i}_${Math.floor(rng() * 0xffff).toString(36)}`,
        entryType: 'EVENT',
        eventCategory: catKey,
        eventCategoryName: cat.name,
        icon: cat.icon,
        title: i <= STORY_EVENT_TEMPLATES.length ? tpl.title : `${loc}・${cat.name}`,
        triggerTerrains: terrains,
        weight: 10,
        desc: i <= STORY_EVENT_TEMPLATES.length ? tpl.desc : `行經${loc}荒野時意外觸發的江湖奇遇事件。`,
        effects
      });
    }

    return catalog;
  }

  function validateQuestEventSchema(entry) {
    if (!entry || typeof entry !== 'object') return { valid: false, message: '項目必須為非空 Object' };
    if (!entry.id || typeof entry.id !== 'string') return { valid: false, message: '缺少合法 id' };
    if (!entry.title || typeof entry.title !== 'string') return { valid: false, message: `${entry.id} 缺少標題 title` };
    if (!ENTRY_TYPES[entry.entryType]) return { valid: false, message: `${entry.id} entryType 必須為 QUEST 或 EVENT` };

    if (entry.entryType === 'QUEST') {
      if (!entry.rewards || typeof entry.rewards !== 'object') {
        return { valid: false, message: `任務 ${entry.id} 缺少 rewards 物件` };
      }
      if (typeof entry.rewards.exp !== 'number' || entry.rewards.exp <= 0) {
        return { valid: false, message: `任務 ${entry.id} 必須具備大於 0 的經驗值獎勵` };
      }
      if (typeof entry.rewards.gold !== 'number' || entry.rewards.gold <= 0) {
        return { valid: false, message: `任務 ${entry.id} 必須具備大於 0 的金錢獎勵` };
      }
    } else {
      if (!entry.effects || typeof entry.effects !== 'object') {
        return { valid: false, message: `事件 ${entry.id} 缺少 effects 物件` };
      }
      if (!Array.isArray(entry.triggerTerrains) || entry.triggerTerrains.length === 0) {
        return { valid: false, message: `事件 ${entry.id} 必須具備 triggerTerrains 陣列` };
      }
    }

    return { valid: true };
  }

  const exported = {
    ENTRY_TYPES,
    QUEST_SUBTYPES,
    EVENT_CATEGORIES,
    generateDefaultQuestsCatalog,
    generateBalancedQuestsCatalog,
    validateQuestEventSchema
  };

  if (typeof window !== 'undefined') {
    window.QuestEventGenerator = exported;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }
})(typeof self !== 'undefined' ? self : this);
