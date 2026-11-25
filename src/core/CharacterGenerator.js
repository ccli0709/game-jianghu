/**
 * 《浮世江湖》- 全域角色與怪物實體生成器 (CharacterGenerator)
 * 涵蓋三大種族 (人類、野獸、魔物)、形態梯級 (等級範圍約束)、以及相異攻擊模式
 */

const RACES = {
  HUMAN: {
    id: 'HUMAN',
    name: '人類',
    icon: '👤',
    desc: '萬物之靈，擅使各路兵刃拳腳與心法絕學，戰術靈動，著重招架與氣勁。',
    forms: {
      CIVILIAN: { id: 'CIVILIAN', name: '鄉井平民', minLevel: 1, maxLevel: 5, desc: '販夫走卒或尋常鄉民，戰力微薄，慌亂推打或求饒逃避' },
      OUTLAW: { id: 'OUTLAW', name: '綠林草莽', minLevel: 4, maxLevel: 12, desc: '攔路劫匪或江湖宵小，擅使快刀暗箭與淬毒伏擊' },
      MARTIAL_ARTIST: { id: 'MARTIAL_ARTIST', name: '江湖遊俠', minLevel: 10, maxLevel: 20, desc: '習武有成的江湖俠客或鏢頭，精通外家武學與招架反制' },
      SECT_ELITE: { id: 'SECT_ELITE', name: '名門菁英', minLevel: 18, maxLevel: 30, desc: '各大名門正派長老堂主，內功深厚，絕學連綿護體' },
      GRANDMASTER: { id: 'GRANDMASTER', name: '絕頂宗師', minLevel: 28, maxLevel: 50, desc: '威震武林的一代傳奇，罡氣護體，氣勁破空碎甲' }
    }
  },
  BEAST: {
    id: 'BEAST',
    name: '野獸',
    icon: '🐺',
    desc: '大自然孕育之猛獸靈禽，野性直覺敏銳，擅長高速猛撲、撕裂持續流血與狂暴咆哮。',
    forms: {
      WILD_BEAST: { id: 'WILD_BEAST', name: '荒原群獸', minLevel: 1, maxLevel: 8, desc: '山林尋常野狼惡犬，群聚活動，本能撲擊與敏捷游走' },
      FERAL_PREDATOR: { id: 'FERAL_PREDATOR', name: '兇殘猛獸', minLevel: 7, maxLevel: 18, desc: '巨熊斑斕猛虎，皮糙肉厚，重爪拍擊附帶強烈擊退與眩暈' },
      MUTATED_BEAST: { id: 'MUTATED_BEAST', name: '異變靈獸', minLevel: 15, maxLevel: 28, desc: '受奇花異草或靈脈滋養異變，毒腺噴濺，嗜血狂暴' },
      ANCIENT_CALAMITY: { id: 'ANCIENT_CALAMITY', name: '上古凶獸', minLevel: 26, maxLevel: 50, desc: '傳說中盤踞名山大川之蛟龍巨獸，撼動山嶽，踐踏滅敵' }
    }
  },
  MONSTER: {
    id: 'MONSTER',
    name: '魔物',
    icon: '👹',
    desc: '幽冥冥界異化的妖魔邪物，行徑詭譎，擅長血魄汲取、地獄火毒腐蝕與心智恐懼。',
    forms: {
      IMP_GHOUL: { id: 'IMP_GHOUL', name: '幽魂腐屍', minLevel: 3, maxLevel: 12, desc: '戰場怨靈或荒冢屍魅，物理抗性強，陰煞侵蝕' },
      ABYSSAL_FIEND: { id: 'ABYSSAL_FIEND', name: '地淵魔魁', minLevel: 10, maxLevel: 22, desc: '九幽血池爬出的煞魔，以爪撕敵，汲取精血回復自身' },
      CHAOS_SORCERER: { id: 'CHAOS_SORCERER', name: '冥幽術士', minLevel: 20, maxLevel: 32, desc: '操弄邪咒之妖道魔修，製造燃燒火海與恐懼凝視' },
      DEMON_LORD: { id: 'DEMON_LORD', name: '羅剎魔皇', minLevel: 30, maxLevel: 50, desc: '統率魔域之萬古魔君，魔煞爆震，所過之處盡化死地' }
    }
  }
};

// 攻擊模式體系定義 (相異行為機制)
const ATTACK_PATTERNS = {
  // 人類攻擊模式
  MARTIAL_COMBO: {
    id: 'MARTIAL_COMBO',
    race: 'HUMAN',
    name: '外功絕學連招',
    icon: '⚔️',
    desc: '耗費內力施展宗門武功，招法剛柔並濟，高暴擊率並享有破甲增傷',
    dmgMultiplier: 1.35,
    range: 1,
    energyCost: 75,
    statusTrigger: { id: 'INSPIRED', chance: 0.25, duration: 2 }
  },
  TACTICAL_KITE: {
    id: 'TACTICAL_KITE',
    race: 'HUMAN',
    name: '戰術身法游擊',
    icon: '🏹',
    desc: '遠程施射暗器飛鏢，命中後身形後撤一格，保持射程並減緩敵速',
    dmgMultiplier: 1.05,
    range: 3,
    energyCost: 65,
    statusTrigger: null
  },
  PARRY_COUNTER: {
    id: 'PARRY_COUNTER',
    race: 'HUMAN',
    name: '守勢招架反制',
    icon: '🛡️',
    desc: '進入防禦格擋姿態，大幅提升護體防禦，受到攻擊時以 1.5 倍威力震退反擊',
    dmgMultiplier: 1.2,
    range: 1,
    energyCost: 60,
    statusTrigger: { id: 'INSPIRED', chance: 0.3, duration: 2 }
  },
  CIVILIAN_FLEE: {
    id: 'CIVILIAN_FLEE',
    race: 'HUMAN',
    name: '慌亂推搡擲石',
    icon: '🪨',
    desc: '非戰鬥人員驚恐防衛，遠程投擲石塊或推打，傷害微薄，優先逃向安全處',
    dmgMultiplier: 0.6,
    range: 2,
    energyCost: 50,
    statusTrigger: null
  },

  // 野獸攻擊模式
  BEAST_POUNCE: {
    id: 'BEAST_POUNCE',
    race: 'BEAST',
    name: '疾影猛撲突進',
    icon: '🐾',
    desc: '直線高速暴衝 2~3 格撲向目標，強烈物理衝擊，50% 造成擊退與暈眩 1 回合',
    dmgMultiplier: 1.4,
    range: 3,
    energyCost: 80,
    statusTrigger: { id: 'STUNNED', chance: 0.45, duration: 1 }
  },
  FRENZY_BITE: {
    id: 'FRENZY_BITE',
    race: 'BEAST',
    name: '狂暴撕裂撕咬',
    icon: '🩸',
    desc: '猛獸獠牙狠狠撕扯目標皮肉，造成大撕裂傷口，必定附加【受傷/流血】狀態',
    dmgMultiplier: 1.25,
    range: 1,
    energyCost: 65,
    statusTrigger: { id: 'WOUNDED', chance: 0.8, duration: 3 }
  },
  TERRIFYING_ROAR: {
    id: 'TERRIFYING_ROAR',
    race: 'BEAST',
    name: '萬獸狂暴怒吼',
    icon: '📢',
    desc: '仰天長嘯震懾四野，削弱周遭 3 格所有敵人 25% 防禦，自身獲得【奮起】狀態',
    dmgMultiplier: 0.8,
    range: 2,
    energyCost: 70,
    statusTrigger: { id: 'INSPIRED', chance: 1.0, duration: 3 }
  },
  VENOM_SPRAY: {
    id: 'VENOM_SPRAY',
    race: 'BEAST',
    name: '毒腺噴射毒液',
    icon: '🧪',
    desc: '異獸毒牙噴射烈性毒液，附著侵蝕，造成直接傷害並附加 3 輪【中毒】腐蝕',
    dmgMultiplier: 1.15,
    range: 2,
    energyCost: 70,
    statusTrigger: { id: 'POISONED', chance: 0.85, duration: 3 }
  },

  // 魔物攻擊模式
  CHAOS_SURFACE: {
    id: 'CHAOS_SURFACE',
    race: 'MONSTER',
    name: '地獄深淵腐蝕',
    icon: '🔥',
    desc: '魔煞烈焰噴湧，直接引燃目標及其鄰近地格，化作燃燒火海 (FIRE) 灼傷踏入者',
    dmgMultiplier: 1.3,
    range: 2,
    energyCost: 85,
    statusTrigger: null
  },
  LIFE_DRAIN: {
    id: 'LIFE_DRAIN',
    race: 'MONSTER',
    name: '血魄冥氣汲取',
    icon: '🦇',
    desc: '釋放暗黑血線抽取目標精血，將造成傷害的 60% 直接轉化為自身氣血回復',
    dmgMultiplier: 1.2,
    range: 2,
    energyCost: 75,
    statusTrigger: { id: 'WOUNDED', chance: 0.35, duration: 2 }
  },
  AOE_NOVA: {
    id: 'AOE_NOVA',
    race: 'MONSTER',
    name: '滅世魔煞爆震',
    icon: '💥',
    desc: '以自身為中心蓄力引爆十字 4 格範圍魔氣衝擊波，擊退敵人並造成大量傷害',
    dmgMultiplier: 1.5,
    range: 1,
    energyCost: 95,
    statusTrigger: { id: 'STUNNED', chance: 0.3, duration: 1 }
  },
  STUN_GAZE: {
    id: 'STUN_GAZE',
    race: 'MONSTER',
    name: '幽冥恐懼凝視',
    icon: '👁️',
    desc: '雙目射出攝魂陰光，直接震懾目標心智，使其神經麻痺，陷入【暈眩】無法行動',
    dmgMultiplier: 0.9,
    range: 3,
    energyCost: 70,
    statusTrigger: { id: 'STUNNED', chance: 0.9, duration: 1 }
  }
};

// 預設 24 組官方經典角色庫 (三大種族、各形態、等級階梯分明)
const DEFAULT_CHARACTERS = [
  // --- 人類 HUMAN ---
  {
    id: 'char_hum_villager_01',
    name: '落魄老農',
    race: 'HUMAN',
    form: 'CIVILIAN',
    formName: '鄉井平民',
    level: 2,
    minLevel: 1,
    maxLevel: 5,
    title: '手無寸鐵的鄉民',
    icon: '👨‍🌾',
    color: '#94a3b8',
    desc: '洛陽近郊墾荒老農，遭遇江湖廝殺只求保命，若被逼急了也會拿起鋤頭丟石頭抗爭。',
    attackPattern: 'CIVILIAN_FLEE',
    skillName: '鋤頭擲石',
    attributes: { str: 10, agi: 9, con: 12, wis: 8, lck: 14, hp: 55, qi: 20, speed: 75, def: 6 },
    drops: { minGold: 1, maxGold: 5, itemId: 'food_steamed_bun', dropRate: 0.4 }
  },
  {
    id: 'char_hum_merchant_02',
    name: '行腳貨郎',
    race: 'HUMAN',
    form: 'CIVILIAN',
    formName: '鄉井平民',
    level: 4,
    minLevel: 1,
    maxLevel: 5,
    title: '走南闖北的商人',
    icon: '🧑‍💼',
    color: '#cbd5e1',
    desc: '挑擔販賣草藥與針線的游販，腳力尚可，身上偶爾藏有微量碎銀與應急金創藥。',
    attackPattern: 'CIVILIAN_FLEE',
    skillName: '貨擔揮擋',
    attributes: { str: 12, agi: 14, con: 12, wis: 14, lck: 18, hp: 65, qi: 30, speed: 85, def: 8 },
    drops: { minGold: 5, maxGold: 15, itemId: 'med_jinchuang_small', dropRate: 0.5 }
  },
  {
    id: 'char_hum_bandit_03',
    name: '黑風寨嘍囉',
    race: 'HUMAN',
    form: 'OUTLAW',
    formName: '綠林草莽',
    level: 6,
    minLevel: 4,
    maxLevel: 12,
    title: '剪徑劫道的強梁',
    icon: '🗡️',
    color: '#ef4444',
    desc: '落草黑風寨的小匪，慣使一柄豁口朴刀，專在古道隘口伏擊落單客商。',
    attackPattern: 'MARTIAL_COMBO',
    skillName: '潑風狂刀',
    attributes: { str: 18, agi: 16, con: 16, wis: 10, lck: 11, hp: 95, qi: 40, speed: 90, def: 14 },
    drops: { minGold: 8, maxGold: 20, itemId: 'eq_knife_iron', dropRate: 0.3 }
  },
  {
    id: 'char_hum_assassin_04',
    name: '夜行暗樁',
    race: 'HUMAN',
    form: 'OUTLAW',
    formName: '綠林草莽',
    level: 10,
    minLevel: 4,
    maxLevel: 12,
    title: '暗影行刺的死士',
    icon: '🥷',
    color: '#a855f7',
    desc: '行蹤詭秘的黑夜刺客，腰懸袖箭短匕，精於戰術風箏游擊與淬毒致命一擊。',
    attackPattern: 'TACTICAL_KITE',
    skillName: '連珠淬毒鏢',
    attributes: { str: 16, agi: 25, con: 14, wis: 16, lck: 16, hp: 85, qi: 60, speed: 115, def: 12 },
    drops: { minGold: 15, maxGold: 35, itemId: 'wp_needle_poison', dropRate: 0.35 }
  },
  {
    id: 'char_hum_swordsman_05',
    name: '華山劍客',
    race: 'HUMAN',
    form: 'MARTIAL_ARTIST',
    formName: '江湖遊俠',
    level: 14,
    minLevel: 10,
    maxLevel: 20,
    title: '正氣凜然的遊俠',
    icon: '🤺',
    color: '#38bdf8',
    desc: '下山歷練的名門弟子，劍走輕靈，精通清風快劍，常在市鎮路見不平拔刀相助。',
    attackPattern: 'MARTIAL_COMBO',
    skillName: '華山九式劍意',
    attributes: { str: 24, agi: 26, con: 22, wis: 24, lck: 18, hp: 140, qi: 90, speed: 105, def: 22 },
    drops: { minGold: 20, maxGold: 45, itemId: 'eq_sword_steel', dropRate: 0.4 }
  },
  {
    id: 'char_hum_guard_06',
    name: '同福鏢局鏢頭',
    race: 'HUMAN',
    form: 'MARTIAL_ARTIST',
    formName: '江湖遊俠',
    level: 18,
    minLevel: 10,
    maxLevel: 20,
    title: '老練沉穩的行鏢客',
    icon: '🛡️',
    color: '#f59e0b',
    desc: '行走中原三十載的老江湖，一手鐵臂招架刀法滴水不漏，極擅招架防反。',
    attackPattern: 'PARRY_COUNTER',
    skillName: '金刀鎖關反勁',
    attributes: { str: 26, agi: 18, con: 28, wis: 22, lck: 16, hp: 180, qi: 80, speed: 95, def: 32 },
    drops: { minGold: 30, maxGold: 60, itemId: 'eq_armor_leather', dropRate: 0.35 }
  },
  {
    id: 'char_hum_elder_07',
    name: '武當傳功長老',
    race: 'HUMAN',
    form: 'SECT_ELITE',
    formName: '名門菁英',
    level: 25,
    minLevel: 18,
    maxLevel: 30,
    title: '德高望重的道家高士',
    icon: '☯️',
    color: '#34d399',
    desc: '精研太極純陽奧義，身披鶴氅道袍，舉手投足引動天地陰陽真氣，招招內蘊真勁。',
    attackPattern: 'MARTIAL_COMBO',
    skillName: '太極混元劍芒',
    attributes: { str: 32, agi: 28, con: 34, wis: 38, lck: 24, hp: 260, qi: 180, speed: 100, def: 42 },
    drops: { minGold: 60, maxGold: 120, itemId: 'med_yang_pill', dropRate: 0.45 }
  },
  {
    id: 'char_hum_master_08',
    name: '無名劍聖【獨孤暮】',
    race: 'HUMAN',
    form: 'GRANDMASTER',
    formName: '絕頂宗師',
    level: 38,
    minLevel: 28,
    maxLevel: 50,
    title: '傲視天下的劍道宗師',
    icon: '👑',
    color: '#eab308',
    desc: '一生求一敗而不可得，草木竹石皆可為劍，周身護體劍罡自成領域，碎石裂金。',
    attackPattern: 'MARTIAL_COMBO',
    skillName: '萬劍歸元破天罡',
    attributes: { str: 48, agi: 45, con: 42, wis: 46, lck: 32, hp: 420, qi: 300, speed: 125, def: 58 },
    drops: { minGold: 150, maxGold: 300, itemId: 'eq_sword_mythic', dropRate: 0.6 }
  },

  // --- 野獸 BEAST ---
  {
    id: 'char_bst_wolf_01',
    name: '荒野灰狼',
    race: 'BEAST',
    form: 'WILD_BEAST',
    formName: '荒原群獸',
    level: 3,
    minLevel: 1,
    maxLevel: 8,
    title: '伺機撲擊的獵食者',
    icon: '🐺',
    color: '#94a3b8',
    desc: '群居於中原西北密林與荒丘的野狼，雙目幽綠，極擅奔突撲咬獵物後腿。',
    attackPattern: 'BEAST_POUNCE',
    skillName: '群狼飛撲',
    attributes: { str: 14, agi: 20, con: 12, wis: 6, lck: 12, hp: 60, qi: 0, speed: 110, def: 8 },
    drops: { minGold: 2, maxGold: 8, itemId: 'mat_wolf_pelt', dropRate: 0.6 }
  },
  {
    id: 'char_bst_hound_02',
    name: '狂獒獵犬',
    race: 'BEAST',
    form: 'WILD_BEAST',
    formName: '荒原群獸',
    level: 6,
    minLevel: 1,
    maxLevel: 8,
    title: '兇殘成性的惡犬',
    icon: '🐕',
    color: '#ea580c',
    desc: '綠林山寨豢養之兇狠烈犬，嗅覺靈敏，一旦咬中獵物絕不鬆口，造成撕裂流血。',
    attackPattern: 'FRENZY_BITE',
    skillName: '惡犬碎骨撕咬',
    attributes: { str: 18, agi: 18, con: 16, wis: 8, lck: 10, hp: 85, qi: 0, speed: 105, def: 12 },
    drops: { minGold: 4, maxGold: 12, itemId: 'mat_hound_fang', dropRate: 0.5 }
  },
  {
    id: 'char_bst_bear_03',
    name: '黑風鐵掌熊',
    race: 'BEAST',
    form: 'FERAL_PREDATOR',
    formName: '兇殘猛獸',
    level: 12,
    minLevel: 7,
    maxLevel: 18,
    title: '力逾千鈞的山林巨霸',
    icon: '🐻',
    color: '#78350f',
    desc: '盤踞黑風密林深處的成年公熊，皮厚如鋼板，一記厚掌能輕易拍碎頑石巨木。',
    attackPattern: 'BEAST_POUNCE',
    skillName: '裂地撼山拍',
    attributes: { str: 32, agi: 12, con: 34, wis: 8, lck: 14, hp: 220, qi: 0, speed: 80, def: 30 },
    drops: { minGold: 15, maxGold: 40, itemId: 'mat_bear_bile', dropRate: 0.55 }
  },
  {
    id: 'char_bst_tiger_04',
    name: '斑斕吊睛虎',
    race: 'BEAST',
    form: 'FERAL_PREDATOR',
    formName: '兇殘猛獸',
    level: 16,
    minLevel: 7,
    maxLevel: 18,
    title: '山野林莽之百獸之王',
    icon: '🐅',
    color: '#f97316',
    desc: '額生王字斑紋之食人猛虎，咆哮之聲響徹山谷，氣勢驚人，利爪可輕易破甲。',
    attackPattern: 'TERRIFYING_ROAR',
    skillName: '虎嘯生風碎金爪',
    attributes: { str: 34, agi: 24, con: 28, wis: 12, lck: 18, hp: 240, qi: 0, speed: 110, def: 24 },
    drops: { minGold: 25, maxGold: 60, itemId: 'mat_tiger_bone', dropRate: 0.5 }
  },
  {
    id: 'char_bst_spider_05',
    name: '赤目千絲毒蛛',
    race: 'BEAST',
    form: 'MUTATED_BEAST',
    formName: '異變靈獸',
    level: 22,
    minLevel: 15,
    maxLevel: 28,
    title: '苗疆古窟的劇毒妖物',
    icon: '🕷️',
    color: '#84cc16',
    desc: '生長於苗疆迷沼古洞中的異種巨蛛，背生赤目鬼面，毒腺噴射如濃墨，沾染即腐。',
    attackPattern: 'VENOM_SPRAY',
    skillName: '腐骨魔絲毒霧',
    attributes: { str: 26, agi: 32, con: 26, wis: 16, lck: 20, hp: 230, qi: 40, speed: 120, def: 28 },
    drops: { minGold: 40, maxGold: 90, itemId: 'mat_spider_venom', dropRate: 0.6 }
  },
  {
    id: 'char_bst_dragon_06',
    name: '墨鱗赤目蛟',
    race: 'BEAST',
    form: 'ANCIENT_CALAMITY',
    formName: '上古凶獸',
    level: 36,
    minLevel: 26,
    maxLevel: 50,
    title: '沉睡深潭的上古凶蛟',
    icon: '🐉',
    color: '#065f46',
    desc: '活過五百載的深潭靈蛟，鱗甲如重鍛玄鐵，刀槍不入，一尾橫掃巨浪滔天。',
    attackPattern: 'BEAST_POUNCE',
    skillName: '蛟龍出海覆天地',
    attributes: { str: 46, agi: 36, con: 48, wis: 28, lck: 26, hp: 520, qi: 150, speed: 105, def: 60 },
    drops: { minGold: 120, maxGold: 260, itemId: 'mat_dragon_scale', dropRate: 0.65 }
  },

  // --- 魔物 MONSTER ---
  {
    id: 'char_mon_ghost_01',
    name: '荒冢夜泣魂',
    race: 'MONSTER',
    form: 'IMP_GHOUL',
    formName: '幽魂腐屍',
    level: 5,
    minLevel: 3,
    maxLevel: 12,
    title: '古戰場飄蕩的怨煞鬼影',
    icon: '👻',
    color: '#67e8f9',
    desc: '邊陲古戰場兵卒死後怨氣不散所化的陰魂，身形虛化穿透岩障，常以冷冽陰氣蝕骨。',
    attackPattern: 'STUN_GAZE',
    skillName: '陰煞攝魄寒氣',
    attributes: { str: 12, agi: 22, con: 14, wis: 18, lck: 12, hp: 75, qi: 80, speed: 100, def: 20 },
    drops: { minGold: 6, maxGold: 18, itemId: 'mat_ghost_essence', dropRate: 0.45 }
  },
  {
    id: 'char_mon_zombie_02',
    name: '覆甲白僵',
    race: 'MONSTER',
    form: 'IMP_GHOUL',
    formName: '幽魂腐屍',
    level: 9,
    minLevel: 3,
    maxLevel: 12,
    title: '古墓掘出的不腐死屍',
    icon: '🧟',
    color: '#059669',
    desc: '地底陰脈浸泡百年的古甲屍體，軀體僵硬刀槍難入，指甲暗藏屍毒，劇痛攻心。',
    attackPattern: 'FRENZY_BITE',
    skillName: '腐爛屍爪掏心',
    attributes: { str: 24, agi: 10, con: 30, wis: 8, lck: 10, hp: 160, qi: 30, speed: 70, def: 35 },
    drops: { minGold: 10, maxGold: 25, itemId: 'mat_corpse_nail', dropRate: 0.5 }
  },
  {
    id: 'char_mon_fiend_03',
    name: '血池魔魁',
    race: 'MONSTER',
    form: 'ABYSSAL_FIEND',
    formName: '地淵魔魁',
    level: 15,
    minLevel: 10,
    maxLevel: 22,
    title: '九幽血池孕育的殺戮狂魔',
    icon: '👹',
    color: '#dc2626',
    desc: '吸納千萬生靈鮮血成型的魔界壯漢，戰意如狂，攻擊時瘋狂抽取敵人氣血補益自身。',
    attackPattern: 'LIFE_DRAIN',
    skillName: '嗜血血魄汲元抓',
    attributes: { str: 30, agi: 18, con: 28, wis: 16, lck: 14, hp: 230, qi: 100, speed: 90, def: 26 },
    drops: { minGold: 25, maxGold: 65, itemId: 'mat_blood_stone', dropRate: 0.5 }
  },
  {
    id: 'char_mon_sorcerer_04',
    name: '黃泉幽冥術士',
    race: 'MONSTER',
    form: 'CHAOS_SORCERER',
    formName: '冥幽術士',
    level: 24,
    minLevel: 20,
    maxLevel: 32,
    title: '操弄鬼火的地府巫官',
    icon: '🧙‍♂️',
    color: '#7c3aed',
    desc: '修煉黃泉秘術的墮落邪道，擅以幽冥鬼火腐蝕戰場大地，令人落入無邊火海。',
    attackPattern: 'CHAOS_SURFACE',
    skillName: '幽冥鬼火引爆煞',
    attributes: { str: 22, agi: 24, con: 26, wis: 42, lck: 22, hp: 250, qi: 240, speed: 95, def: 28 },
    drops: { minGold: 50, maxGold: 110, itemId: 'book_chaos_scroll', dropRate: 0.55 }
  },
  {
    id: 'char_mon_overlord_05',
    name: '羅剎魔尊【血獄天】',
    race: 'MONSTER',
    form: 'DEMON_LORD',
    formName: '羅剎魔皇',
    level: 40,
    minLevel: 30,
    maxLevel: 50,
    title: '號令萬魔的血海魔皇',
    icon: '👿',
    color: '#991b1b',
    desc: '自九幽地底衝破封印出世的遠古魔皇，降臨之處天昏地暗，一擊魔煞震波崩山裂地。',
    attackPattern: 'AOE_NOVA',
    skillName: '萬劫魔煞十字爆',
    attributes: { str: 52, agi: 38, con: 50, wis: 44, lck: 28, hp: 680, qi: 350, speed: 110, def: 65 },
    drops: { minGold: 200, maxGold: 450, itemId: 'eq_armor_demon_god', dropRate: 0.7 }
  }
];

// 人類形態進化路線定義 (每一階梯的突破等級、下一形態、突破特殊魔物、屬性加成與解鎖上限)
const HUMAN_EVOLUTION_CHAIN = {
  CIVILIAN: {
    form: 'CIVILIAN',
    name: '鄉井平民',
    breakthroughLevel: 5,
    nextForm: 'OUTLAW',
    nextFormName: '綠林草莽',
    nextMaxLevel: 12,
    bonusPoints: 15,
    statBonus: 3,
    newTitle: '綠林豪客',
    boss: {
      name: '荒冢夜泣魂【魔煞】',
      race: 'MONSTER',
      form: 'IMP_GHOUL',
      formName: '幽魂腐屍',
      level: 5,
      attackPattern: 'LIFE_DRAIN',
      hp: 180,
      atk: 32,
      def: 18,
      speed: 90,
      icon: '👻',
      color: 0x9333ea,
      desc: '盤踞荒野陰冢聚斂煞氣成形的厲魂，唯有將其斬滅，方能淬鍊心神突破平民之軀。'
    }
  },
  OUTLAW: {
    form: 'OUTLAW',
    name: '綠林草莽',
    breakthroughLevel: 12,
    nextForm: 'MARTIAL_ARTIST',
    nextFormName: '江湖遊俠',
    nextMaxLevel: 20,
    bonusPoints: 20,
    statBonus: 4,
    newTitle: '仗劍遊俠',
    boss: {
      name: '覆甲白僵煞【魔煞】',
      race: 'MONSTER',
      form: 'IMP_GHOUL',
      formName: '幽魂腐屍',
      level: 12,
      attackPattern: 'FRENZY_BITE',
      hp: 280,
      atk: 48,
      def: 30,
      speed: 95,
      icon: '🧟',
      color: 0x7c3aed,
      desc: '千年古墓爬出的鐵甲殭屍，煞氣附骨刀槍不入，突破綠林瓶頸之宿命死敵。'
    }
  },
  MARTIAL_ARTIST: {
    form: 'MARTIAL_ARTIST',
    name: '江湖遊俠',
    breakthroughLevel: 20,
    nextForm: 'SECT_ELITE',
    nextFormName: '名門菁英',
    nextMaxLevel: 30,
    bonusPoints: 25,
    statBonus: 5,
    newTitle: '名門翹楚',
    boss: {
      name: '血池魔魁·赤狂【魔煞】',
      race: 'MONSTER',
      form: 'ABYSSAL_FIEND',
      formName: '地淵魔魁',
      level: 20,
      attackPattern: 'AOE_NOVA',
      hp: 420,
      atk: 65,
      def: 45,
      speed: 100,
      icon: '👹',
      color: 0x991b1b,
      desc: '血池孕育的九幽凶魔，雙拳可碎裂金石，唯有擊殺此魔方能褪去凡骨晉入名門至尊。'
    }
  },
  SECT_ELITE: {
    form: 'SECT_ELITE',
    name: '名門菁英',
    breakthroughLevel: 30,
    nextForm: 'GRANDMASTER',
    nextFormName: '絕頂宗師',
    nextMaxLevel: 50,
    bonusPoints: 35,
    statBonus: 8,
    newTitle: '武林至尊',
    boss: {
      name: '黃泉幽冥術士【冥妖】',
      race: 'MONSTER',
      form: 'CHAOS_SORCERER',
      formName: '冥幽術士',
      level: 30,
      attackPattern: 'CHAOS_SURFACE',
      hp: 600,
      atk: 88,
      def: 58,
      speed: 105,
      icon: '🧙‍♂️',
      color: 0x6b21a8,
      desc: '操弄冥火與虛空業障的魔道祭司，擊潰此妖方能領悟天人之境，登臨絕頂宗師！'
    }
  }
};

class CharacterGenerator {
  static get RACES() { return RACES; }
  static get ATTACK_PATTERNS() { return ATTACK_PATTERNS; }
  static get HUMAN_EVOLUTION_CHAIN() { return HUMAN_EVOLUTION_CHAIN; }

  // 取得指定形態之突破魔物與進化參數
  static getEvolutionBreakthrough(formId) {
    return HUMAN_EVOLUTION_CHAIN[formId] || null;
  }

  // 取得形態詳細定義
  static getFormDef(raceId, formId) {
    const race = RACES[raceId];
    if (!race || !race.forms) return null;
    return race.forms[formId] || null;
  }

  // 依地貌與玩家等級挑選最相稱的野生遭遇敵人
  static selectEnemyForEncounter(biome = 'PLAINS', playerLevel = 1, catalog = null) {
    const chars = Array.isArray(catalog) && catalog.length > 0 ? catalog : DEFAULT_CHARACTERS;
    
    // 生態群落偏向之種族分配
    const biomeBias = {
      PLAINS: ['HUMAN', 'HUMAN', 'BEAST'],
      FOREST: ['BEAST', 'BEAST', 'HUMAN'],
      MOUNTAIN: ['BEAST', 'HUMAN', 'MONSTER'],
      SNOW: ['BEAST', 'BEAST', 'MONSTER'],
      SWAMP: ['MONSTER', 'MONSTER', 'BEAST'],
      DESERT: ['MONSTER', 'BEAST', 'HUMAN']
    }[biome] || ['HUMAN', 'BEAST'];

    const chosenRace = biomeBias[Math.floor(Math.random() * biomeBias.length)];

    // 在角色庫中尋找相符種族且等級落差在合理範圍內的角色 (相差不超過 4 級)
    const matching = chars.filter(c => 
      c.race === chosenRace && 
      Math.abs((c.level || 1) - playerLevel) <= 4
    );

    if (matching.length > 0) {
      const selected = matching[Math.floor(Math.random() * matching.length)];
      return JSON.parse(JSON.stringify(selected));
    }

    // 若無現成角色庫項目，動態隨機生成一個符合條件的角色
    const raceDef = RACES[chosenRace] || RACES.HUMAN;
    const formKeys = Object.keys(raceDef.forms);
    // 找出等級覆蓋 playerLevel 的形態
    const validForms = formKeys.filter(fk => {
      const f = raceDef.forms[fk];
      return playerLevel >= f.minLevel - 1 && playerLevel <= f.maxLevel + 1;
    });
    const chosenForm = validForms.length > 0 
      ? validForms[Math.floor(Math.random() * validForms.length)]
      : formKeys[0];

    return this.generateRandomCharacter(chosenRace, chosenForm, playerLevel);
  }

  // 取得完整官方預設角色庫
  static generateDefaultCatalog() {
    return JSON.parse(JSON.stringify(DEFAULT_CHARACTERS));
  }

  // 根據種族、形態與等級隨機生成平衡角色
  static generateRandomCharacter(raceId = 'HUMAN', formId = 'MARTIAL_ARTIST', level = null) {
    const race = RACES[raceId] || RACES.HUMAN;
    const form = race.forms[formId] || Object.values(race.forms)[0];

    const actualLevel = level !== null
      ? Math.max(form.minLevel, Math.min(form.maxLevel, level))
      : Math.floor(Math.random() * (form.maxLevel - form.minLevel + 1)) + form.minLevel;

    // 匹配對應攻擊模式
    const availablePatterns = Object.values(ATTACK_PATTERNS).filter(p => p.race === race.id);
    const pattern = availablePatterns.length > 0
      ? availablePatterns[Math.floor(Math.random() * availablePatterns.length)]
      : ATTACK_PATTERNS.MARTIAL_COMBO;

    const prefixList = {
      HUMAN: ['快刀', '行雲', '落霞', '鐵臂', '追魂', '青衫', '狂風', '破天'],
      BEAST: ['嗜血', '斑斕', '狂暴', '荒原', '赤目', '裂爪', '金毛', '玄陰'],
      MONSTER: ['九幽', '地淵', '血煞', '黃泉', '噬魂', '陰冥', '魔煞', '萬劫']
    }[race.id] || ['江湖'];

    const suffixList = {
      HUMAN: ['俠客', '散人', '鏢頭', '刀客', '長老', '秀才', '行者', '遊俠'],
      BEAST: ['猛獸', '野狼', '巨虎', '靈猿', '毒蛛', '玄豹', '大鵰', '蛟龍'],
      MONSTER: ['邪靈', '妖魔', '腐屍', '魔魁', '夜叉', '幽冥', '術士', '魔皇']
    }[race.id] || ['生靈'];

    const name = `${prefixList[Math.floor(Math.random() * prefixList.length)]}${suffixList[Math.floor(Math.random() * suffixList.length)]}`;
    const id = `char_${race.id.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;

    // 依等級線性與形態微調屬性
    const baseMult = 1 + (actualLevel - 1) * 0.12;
    const str = Math.round((12 + Math.random() * 8) * baseMult);
    const agi = Math.round((10 + Math.random() * 10) * baseMult);
    const con = Math.round((12 + Math.random() * 8) * baseMult);
    const wis = Math.round((8 + Math.random() * 12) * baseMult);
    const lck = Math.round(10 + Math.random() * 10);

    const hp = Math.round(60 + con * 5 * baseMult);
    const qi = race.id === 'BEAST' ? 0 : Math.round(30 + wis * 4 * baseMult);
    const speed = Math.round(85 + agi * 0.5);
    const def = Math.round(6 + (con * 0.8 + str * 0.3) * baseMult);

    return {
      id,
      name,
      race: race.id,
      form: form.id,
      formName: form.name,
      level: actualLevel,
      minLevel: form.minLevel,
      maxLevel: form.maxLevel,
      title: `${race.name} · ${form.name}`,
      icon: race.icon,
      color: race.id === 'HUMAN' ? '#38bdf8' : (race.id === 'BEAST' ? '#f97316' : '#dc2626'),
      desc: `出沒於江湖險地的${race.name}形態【${form.name}】，擅使${pattern.name}，行事兇悍。`,
      attackPattern: pattern.id,
      skillName: `${pattern.name}·絕`,
      attributes: { str, agi, con, wis, lck, hp, qi, speed, def },
      drops: {
        minGold: actualLevel * 2,
        maxGold: actualLevel * 6,
        itemId: 'food_steamed_bun',
        dropRate: 0.4
      }
    };
  }

  // Schema 檢驗約束
  static validateCharacterSchema(c) {
    if (!c || typeof c !== 'object') return { valid: false, message: '角色物件必須為非空 Object' };
    if (!c.id || typeof c.id !== 'string') return { valid: false, message: '角色缺少合法 id' };
    if (!c.name || typeof c.name !== 'string') return { valid: false, message: '角色缺少合法 name' };
    if (!RACES[c.race]) return { valid: false, message: `無效的種族: ${c.race}` };

    const raceDef = RACES[c.race];
    if (!raceDef.forms[c.form]) return { valid: false, message: `種族 ${c.race} 不包含形態 ${c.form}` };

    const formDef = raceDef.forms[c.form];
    if (typeof c.level !== 'number' || c.level < formDef.minLevel || c.level > formDef.maxLevel) {
      return { valid: false, message: `等級 ${c.level} 超出形態 ${c.form} 允許範圍 (${formDef.minLevel}~${formDef.maxLevel})` };
    }

    if (!ATTACK_PATTERNS[c.attackPattern]) {
      return { valid: false, message: `未知的攻擊模式: ${c.attackPattern}` };
    }

    if (!c.attributes || typeof c.attributes !== 'object') {
      return { valid: false, message: '缺少 attributes 屬性資料' };
    }

    return { valid: true };
  }
}

if (typeof window !== 'undefined') {
  window.CharacterGenerator = CharacterGenerator;
  window.RACES = RACES;
  window.ATTACK_PATTERNS = ATTACK_PATTERNS;
  window.DEFAULT_CHARACTERS = DEFAULT_CHARACTERS;
  window.HUMAN_EVOLUTION_CHAIN = HUMAN_EVOLUTION_CHAIN;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CharacterGenerator;
}
