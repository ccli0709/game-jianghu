/**
 * ItemGenerator.js
 * 浮世江湖 · 全域物品隨機生成器
 * 依據各類別、各品質階級與三大種族 (人類/野獸/魔物) 動態生成規格完整、數值平衡的武俠裝備道具
 */
(function (root) {
  const TIER_DEFS = {
    COMMON: { name: '凡品', class: 'tier-white', mult: 1.0, realm: '初入江湖' },
    UNCOMMON: { name: '良品', class: 'tier-green', mult: 1.5, realm: '三流散客' },
    RARE: { name: '上品', class: 'tier-purple', mult: 2.4, realm: '二流高手' },
    EPIC: { name: '極品', class: 'tier-gold', mult: 3.8, realm: '一流高手' },
    LEGENDARY: { name: '寶器', class: 'tier-orange', mult: 6.0, realm: '化境宗師' },
    MYTHIC: { name: '神兵絕品', class: 'tier-red', mult: 10.0, realm: '絕頂宗師' }
  };

  const CATEGORIES = [
    'MELEE_WEAPON',
    'RANGED_WEAPON',
    'ARMOR',
    'MEDICINE',
    'ENHANCEMENT',
    'SPECIAL'
  ];

  const DICTIONARY = {
    MELEE_WEAPON: {
      prefixes: ['寒鐵', '青鋒', '奔雷', '紫電', '七星', '純陽', '玄鐵', '修羅', '斬月', '九霄', '無雙', '伏魔', '赤霄', '百鍊', '龍泉', '照膽', '太白', '巨闕', '鳴鴻', '承影'],
      nouns: [
        { name: '劍', icon: '🗡️', reach: 1, sub: 'SWORD', move: '白虹貫日' },
        { name: '青鋼長劍', icon: '🗡️', reach: 1, sub: 'SWORD', move: '流霜刺水' },
        { name: '厚背重刀', icon: '🪓', reach: 1, sub: 'BLADE', move: '力劈華山' },
        { name: '九環鋼刀', icon: '🪓', reach: 1, sub: 'BLADE', move: '狂風絕息斬' },
        { name: '盤龍亮銀槍', icon: '🔱', reach: 2, sub: 'SPEAR', move: '毒龍穿心刺' },
        { name: '熟銅伏魔棍', icon: '🔱', reach: 2, sub: 'STAFF', move: '瘋魔杖法' },
        { name: '幽冥奪魂短匕', icon: '🗡️', reach: 1, sub: 'DAGGER', move: '瞬影鎖喉' },
        { name: '玄武金絲拳套', icon: '🥊', reach: 1, sub: 'FIST', move: '破玉拳勁' }
      ],
      effects: [
        '攻擊時 15% 機率觸發【霜凍】，令敵手招式遲緩',
        '命中時 20% 造成【流血】，每回合扣減氣血 12 點',
        '擊中時 25% 機率【破甲】，削弱敵方護體防禦 30%',
        '招式外功暴擊率提升 15%，勢如破竹',
        '命中時有 20% 機率將敵手震退 1 格',
        '出招消耗真氣減免 10 點，行雲流水'
      ],
      descs: [
        '極地寒鐵慢火鍛打九九八十一日而成，刃口寒光凝霜，出鞘帶嘯鳴之聲。',
        '前朝名匠百煉鋼胚鑄造，剛柔相濟，劍脊柔韌能曲如游龍。',
        '邊塞古戰場殺伐百戰遺留之利刃，血槽深陷，煞氣逼人。',
        '玄門道派開山祖師所佩兵刃，內蘊純陽罡氣，能破各路邪魔外道。'
      ]
    },
    RANGED_WEAPON: {
      prefixes: ['穿雲', '奪魄', '連珠', '追魂', '無影', '九幽', '霹靂', '破罡', '含沙', '透骨', '漫天', '幽冥'],
      nouns: [
        { name: '飛刀', icon: '🎯', range: 4, sub: 'DART', isConsumable: true },
        { name: '金錢鏢', icon: '🎯', range: 4, sub: 'DART', isConsumable: true },
        { name: '透骨釘', icon: '🎯', range: 5, sub: 'NEEDLE', isConsumable: true },
        { name: '霹靂雷火彈', icon: '💣', range: 4, sub: 'BOMB', isConsumable: true },
        { name: '神機連珠袖箭', icon: '🏹', range: 5, sub: 'BOW', isConsumable: false },
        { name: '含沙射影暗器匣', icon: '📦', range: 5, sub: 'BOX', isConsumable: false }
      ],
      effects: [
        '40% 附帶【鶴頂劇毒】，每回合扣減氣血 15 點',
        '觸地即爆，在目標地格鋪設【火海 (FIRE)】持續 3 回合',
        '暗器破空無聲，夜行暗殺命中必定暴擊',
        '穿透直線障礙，直襲目標身後一格敵手',
        '精準打中穴道，令目標定身封穴 1 回合'
      ],
      descs: [
        '蜀中唐門秘傳機關暗器，匣內暗藏七十二枚淬毒細針，按動機簧百步穿楊。',
        '西域火器宗匠以黑石火硝精配之雷火彈，觸地炸裂，烈火沖天。',
        '五毒教採百蟲毒液反覆浸淬之毒鏢，破皮即化，見血封喉。'
      ]
    },
    ARMOR: {
      prefixes: ['流雲', '天蠶', '鎖子', '軟蝟', '烏金', '踏雲', '千鱗', '紫霞', '金絲', '護心', '夜行', '玄武'],
      nouns: [
        { name: '貼身輕袍', icon: '🥋', slot: '貼身輕袍', weight: 1.5, dodge: 12, stealth: 25 },
        { name: '重光鎖子甲', icon: '🛡️', slot: '身軀重鎧', weight: 12.0, dodge: -8, stealth: -15 },
        { name: '踏雲軟靴', icon: '🥾', slot: '踏雲軟靴', weight: 0.8, dodge: 18, stealth: 15 },
        { name: '白玉長生珮', icon: '📿', slot: '腰佩靈寶', weight: 0.3, dodge: 5, stealth: 0 },
        { name: '金絲護腕', icon: '🥋', slot: '護腕靈鐲', weight: 0.6, dodge: 8, stealth: 5 },
        { name: '八卦護心鏡', icon: '🛡️', slot: '護心重鏡', weight: 2.0, dodge: 0, stealth: -5 }
      ],
      effects: [
        '夜間旅行隱匿度 +25%，不易遭遇荒野仇家伏擊',
        '區域地圖行進真氣自回 +2/h，調和陰陽氣血',
        '受到外功物理傷害降低 15%，護身罡氣自成',
        '戰鬥中挪移身法每步能量消耗減免 15 點',
        '化解 20% 所受內力震盪衝擊'
      ],
      descs: [
        '採深山靈蠶生絲混編而就，水火不侵，刀劍難破，穿在身上輕若鴻毛。',
        '邊塞大將精鋼鎖子甲，層層相疊，經千錘百鍊，外功難以破體。',
        '前朝名貴羊脂玉佩，溫潤微潤，有定神補氣、百邪不侵之靈氣。'
      ]
    },
    MEDICINE: {
      prefixes: ['回春', '九轉', '小還', '玄冰', '天王', '生肌', '百草', '洗髓', '培元', '清心', '靈芝', '雪蓮'],
      nouns: [
        { name: '金瘡散', icon: '🩹', type: '外傷靈藥', hp: 50, qi: 0, cure: '止血' },
        { name: '生肌斷續膏', icon: '🩹', type: '外傷靈藥', hp: 80, qi: 0, cure: '止血、化瘀' },
        { name: '保元小還丹', icon: '💊', type: '內服靈丹', hp: 60, qi: 40, cure: '平息真氣' },
        { name: '大還天王丹', icon: '💊', type: '內服靈丹', hp: 120, qi: 80, cure: '修復中度內傷' },
        { name: '清心辟毒丸', icon: '🧪', type: '清心解毒', hp: 40, qi: 20, cure: '化解劇毒' },
        { name: '九葉天山雪蓮', icon: '🪷', type: '續命仙草', hp: 200, qi: 150, cure: '起死回生、拔除百毒' }
      ],
      effects: [
        '立即回復氣血，並在 2 回合內緩慢癒合外傷',
        '大幅充盈真氣脈絡，消除經脈紊亂走火入魔風險',
        '起死回生神藥，瀕死時全滿復活並獲得 2 回合護體罡氣',
        '拔除周身劇毒並免疫異常狀態持續 3 回合'
      ],
      descs: [
        '少林達摩堂秘傳靈藥，以長白山百年野山參及三十六味名藥熬製。',
        '生長於絕壁萬年玄冰之側的仙草，汲取日月精華，有起死回生神效。',
        '苗疆藥王親自調配，專克天下一百零八種奇淫劇毒。'
      ]
    },
    ENHANCEMENT: {
      prefixes: ['千年', '極地', '深海', '太乙', '赤火', '地脈', '星辰', '混沌', '玄天', '萬載'],
      nouns: [
        { name: '寒鐵礦石', icon: '🪨', target: '兵刃淬鍊', stat: '攻擊力' },
        { name: '烏金玄石', icon: '🪨', target: '兵刃淬鍊', stat: '破甲率' },
        { name: '千鱗玄甲片', icon: '✨', target: '護甲加固', stat: '護體防禦' },
        { name: '通靈古玉砂', icon: '💎', target: '靈寶開光', stat: '真氣上限' },
        { name: '易筋鍛骨丹', icon: '✨', target: '根骨洗髓', stat: '氣血上限' }
      ],
      effects: [
        '可將兵刃淬火進階，大幅提升破甲與鋒銳度',
        '永久提升氣血上限 +30 點、經脈負荷上限 +10%',
        '鍛造成功率高達 85%，失敗不掉落原有品質階級'
      ],
      descs: [
        '採自極寒地脈千丈之下之奇礦，至寒至剛，為淬火神兵不二之選。',
        '萬年地火熔漿中凝結之烏金石，堅逾金剛，遇火不熔。'
      ]
    },
    SPECIAL: {
      prefixes: ['純陽', '真武', '黑木', '桃花', '龍門', '逍遙', '達摩', '武當', '少林', '峨眉'],
      nouns: [
        { name: '執法長老令', icon: '🪙', type: '宗門信物' },
        { name: '秘境玄鐵鑰', icon: '🗝️', type: '江湖秘鑰' },
        { name: '武學心法殘卷', icon: '📜', type: '武學殘卷' },
        { name: '同福通緝令', icon: '🔖', type: '懸賞證物' },
        { name: '鏢局暗鏢信印', icon: '🪙', type: '宗門信物' }
      ],
      effects: [
        '出示此令可行走於各大名門分舵，採買宗派物資享受八折優待',
        '解鎖特定隱藏秘境或江湖通緝主線任務',
        '持令行走江湖，江湖聲望增長速度提升 25%'
      ],
      descs: [
        '武林正道執法長老手諭信物，見令如見長老，群雄肅然起敬。',
        '傳聞記載著失傳百年絕世武學的一角殘卷，筆跡蒼勁，暗藏玄機。'
      ]
    }
  };

  const RACE_EQUIPMENT_DICT = {
    BEAST: {
      MELEE_WEAPON: {
        prefixes: ['巫山', '神農', '巴蜀', '赤嶺', '天目', '玄岳', '毒瘴', '太古'],
        nouns: [
          { name: '裂岩利爪', icon: '🐾', reach: 1, sub: 'CLAW', move: '撕裂撲擊' },
          { name: '淬毒尖牙', icon: '🦷', reach: 1, sub: 'FANG', move: '狂暴撕咬' },
          { name: '鐵骨獸角', icon: '🦏', reach: 1, sub: 'HORN', move: '蠻牛衝撞' },
          { name: '蛟龍尾棘', icon: '🐉', reach: 2, sub: 'TAIL', move: '蒼龍擺尾' }
        ],
        effects: ['撲擊時 25% 機率觸發【流血】', '撕咬附帶強烈擊退與暈眩衝擊'],
        descs: ['山林猛獸淬鍊多年之天然利爪尖牙，鋒銳無匹，專供野獸敵人撕裂獵物。']
      },
      RANGED_WEAPON: {
        prefixes: ['毒瘴', '赤練', '雲霧', '九峰', '幽谷'],
        nouns: [
          { name: '劇毒腺囊', icon: '🧪', range: 4, sub: 'VENOM', isConsumable: false },
          { name: '破空羽箭', icon: '🪶', range: 5, sub: 'FEATHER', isConsumable: false },
          { name: '腐蝕酸液囊', icon: '💦', range: 4, sub: 'ACID', isConsumable: false }
        ],
        effects: ['遠程噴吐毒霧，35% 機率附加【中毒】狀態', '高速射出硬羽，破甲率提升 20%'],
        descs: ['異獸體內孕育之遠程攻擊器官，可於數步外噴吐毒液或飛羽傷敵。']
      },
      ARMOR: {
        prefixes: ['玄鱗', '厚皮', '金毛', '蒼龍', '赤甲'],
        nouns: [
          { name: '硬甲獸皮', icon: '🐗', slot: '獸軀硬甲', weight: 6.0, dodge: 4, stealth: 0 },
          { name: '靈脈鱗甲', icon: '🐊', slot: '護體鱗片', weight: 8.0, dodge: 0, stealth: 5 },
          { name: '疾風絨毛', icon: '🐺', slot: '野性皮毛', weight: 2.0, dodge: 14, stealth: 12 }
        ],
        effects: ['減少 15% 外功物理傷害，提升野性閃避', '遭受攻擊時反震敵手'],
        descs: ['盤踞巫山與天目山之猛獸天然外甲，刀劍難傷。']
      }
    },
    MONSTER: {
      MELEE_WEAPON: {
        prefixes: ['九幽', '巫山', '七十二洞', '陰山', '血池', '修羅', '太古', '荒塚'],
        nouns: [
          { name: '鬼手骨爪', icon: '💀', reach: 1, sub: 'DEMON_CLAW', move: '陰煞奪魂' },
          { name: '瘴魔血刃', icon: '🩸', reach: 1, sub: 'DEMON_BLADE', move: '血海狂斬' },
          { name: '妖道白骨杖', icon: '🪄', reach: 2, sub: 'DEMON_STAFF', move: '鬼火焚心' },
          { name: '幽冥鎖魂鏈', icon: '⛓️', reach: 2, sub: 'CHAIN', move: '九幽纏身' }
        ],
        effects: ['命中時汲取目標 15% 氣血回復自身', '附帶【瘴毒】侵蝕敵方經脈'],
        descs: ['凝聚九幽陰煞與洞天邪氣之魔兵，僅魔物妖邪可驅使，凡人觸之即傷。']
      },
      RANGED_WEAPON: {
        prefixes: ['幽冥', '瘴氣', '鬼火', '血煞', '洞天'],
        nouns: [
          { name: '聚陰鬼火珠', icon: '🔮', range: 5, sub: 'ORB', isConsumable: false },
          { name: '蝕骨魔針', icon: '🪡', range: 4, sub: 'CURSE_NEEDLE', isConsumable: false },
          { name: '巫山瘴毒彈', icon: '☠️', range: 4, sub: 'MIASMA', isConsumable: false }
        ],
        effects: ['遠程施放鬼火邪咒，30% 機率觸發【暈眩】', '穿透護體真氣造成陰寒內傷'],
        descs: ['七十二洞邪修與巫山瘴魔祭煉之遠程魔器，陰毒詭譎。']
      },
      ARMOR: {
        prefixes: ['陰煞', '白骨', '血魔', '幽冥', '玄陰'],
        nouns: [
          { name: '冥甲護盾', icon: '🛡️', slot: '魔軀重甲', weight: 9.0, dodge: -2, stealth: 5 },
          { name: '煞氣黑袍', icon: '👘', slot: '幽冥魔袍', weight: 2.0, dodge: 10, stealth: 20 },
          { name: '聚魂骨飾', icon: '🧿', slot: '邪靈護符', weight: 0.5, dodge: 8, stealth: 10 }
        ],
        effects: ['化解 20% 正道內力衝擊', '戰鬥中每回合緩慢回復陰煞護盾'],
        descs: ['魔域妖物用以護體之邪甲魔袍，繚繞黑霧，防禦力極強。']
      }
    }
  };

  /**
   * 隨機生成單件物品 (支援 equipRace: 'HUMAN' | 'BEAST' | 'MONSTER' | 'ALL')
   */
  function generateSingleItem(category, tier, index = 1, equipRace = null) {
    const tierInfo = TIER_DEFS[tier] || TIER_DEFS.COMMON;
    const isEquipCat = category === 'MELEE_WEAPON' || category === 'RANGED_WEAPON' || category === 'ARMOR';
    const resolvedRace = isEquipCat ? (equipRace || 'HUMAN') : 'ALL';

    const raceDict = (resolvedRace === 'BEAST' || resolvedRace === 'MONSTER')
      ? RACE_EQUIPMENT_DICT[resolvedRace]?.[category]
      : null;
    const dict = raceDict || DICTIONARY[category] || DICTIONARY.MELEE_WEAPON;

    const pfx = dict.prefixes[Math.floor(Math.random() * dict.prefixes.length)];
    const nounObj = dict.nouns[Math.floor(Math.random() * dict.nouns.length)];
    const name = `${pfx}${nounObj.name}`;
    const icon = nounObj.icon || '📦';
    const desc = dict.descs[Math.floor(Math.random() * dict.descs.length)];
    const effect = dict.effects[Math.floor(Math.random() * dict.effects.length)];

    // 唯一 ID 命名格式: def_<類別縮寫>_<種族>_<等級縮寫>_<序號>_<隨機雜湊>
    const catCode = category.toLowerCase().replace('_weapon', '').replace('_', '');
    const raceCode = resolvedRace === 'ALL' ? 'all' : resolvedRace.toLowerCase().slice(0, 3);
    const tierCode = tier.toLowerCase().slice(0, 3);
    const hash = Math.random().toString(36).slice(2, 6);
    const id = `def_${catCode}_${raceCode}_${tierCode}_${index}_${hash}`;

    const baseVal = category === 'MEDICINE' ? 20 : 45;
    const value = Math.round(baseVal * tierInfo.mult);

    let attributes = {};
    let stackMax = 1;
    let weight = 2.0;

    if (category === 'MELEE_WEAPON') {
      attributes = {
        atk: Math.round(14 * tierInfo.mult),
        speedMod: Math.floor(Math.random() * 16) - 5,
        armorPiercing: Math.round(8 * tierInfo.mult),
        reach: nounObj.reach || 1,
        martialMove: nounObj.move || '清松迎客',
        specialEffect: effect
      };
      weight = nounObj.reach === 2 ? 6.0 : 3.0;
    } else if (category === 'RANGED_WEAPON') {
      attributes = {
        rangedAtk: Math.round(12 * tierInfo.mult),
        effectiveRange: nounObj.range || 4,
        critRate: Math.round(10 * tierInfo.mult),
        poisonChance: name.includes('毒') ? 40 : 0,
        isConsumable: nounObj.isConsumable !== false,
        ammoCost: 1,
        specialEffect: effect
      };
      stackMax = attributes.isConsumable ? 30 : 1;
      weight = attributes.isConsumable ? 0.2 : 2.0;
    } else if (category === 'ARMOR') {
      attributes = {
        armorSlot: nounObj.slot || '貼身輕袍',
        def: Math.round(10 * tierInfo.mult),
        hpBonus: Math.round(25 * tierInfo.mult),
        strainRes: Math.round(5 * tierInfo.mult),
        dodgeMod: nounObj.dodge || 5,
        stealthMod: nounObj.stealth || 0,
        specialEffect: effect
      };
      weight = nounObj.weight || 2.0;
    } else if (category === 'MEDICINE') {
      attributes = {
        medType: nounObj.type || '內服靈丹',
        healHp: Math.round((nounObj.hp || 50) * tierInfo.mult * 0.8),
        healQi: Math.round((nounObj.qi || 20) * tierInfo.mult * 0.8),
        cureEffects: nounObj.cure || '調息理氣',
        combatUsable: true,
        cooldownTurns: 2,
        specialEffect: effect
      };
      stackMax = 20;
      weight = 0.1;
    } else if (category === 'ENHANCEMENT') {
      attributes = {
        targetType: nounObj.target || '兵刃淬鍊',
        upgradeBonus: `${nounObj.stat || '攻擊力'} +${Math.round(4 * tierInfo.mult)}`,
        successRate: Math.max(35, Math.round(95 - tierInfo.mult * 8)),
        maxGrade: Math.round(3 * tierInfo.mult),
        consumedMaterial: '炭火 5 斤',
        specialEffect: effect
      };
      stackMax = 20;
      weight = 1.0;
    } else {
      // SPECIAL
      attributes = {
        specialType: nounObj.type || '宗門信物',
        questLink: `QUEST_DEF_${catCode.toUpperCase()}_${tierCode.toUpperCase()}`,
        passiveBonus: '江湖威名提升速度 +20%',
        specialEffect: effect
      };
      weight = 0.5;
    }

    return {
      id,
      name,
      category,
      subCategory: nounObj.sub || 'GENERAL',
      equipRace: resolvedRace,
      icon,
      tier,
      tierName: tierInfo.name,
      tierClass: tierInfo.class,
      value,
      stackMax,
      weight,
      requiredRealm: tierInfo.realm,
      desc,
      attributes
    };
  }

  /**
   * 依各品質品階與種族專用武器防具設定一鍵生成隨機物品庫
   * - 人類 (HUMAN)：預設每品質每大類生成 5 個（裝備人類可用，藥品/強化/奇寶為通用 ALL）
   * - 野獸 (BEAST) 與魔物 (MONSTER)：專屬武器防具 (MELEE_WEAPON / RANGED_WEAPON / ARMOR) 預設每品質每類生成 2 個，作為敵人裝備
   * @param {Object} [options]
   * @param {Object<string, number>} [options.humanCountsByTier] 各品質人類可用數量 (預設每品質 5)
   * @param {Object<string, number>} [options.beastCountsByTier] 各品質野獸裝備數量 (預設每品質 2)
   * @param {Object<string, number>} [options.monsterCountsByTier] 各品質魔物裝備數量 (預設每品質 2)
   */
  function generateRaceBalancedCatalog(options = {}) {
    const catalog = [];
    const tierKeys = Object.keys(TIER_DEFS);
    const equipCats = ['MELEE_WEAPON', 'RANGED_WEAPON', 'ARMOR'];

    const humanCounts = options.humanCountsByTier || {};
    const beastCounts = options.beastCountsByTier || {};
    const monsterCounts = options.monsterCountsByTier || {};

    for (const tier of tierKeys) {
      const hCount = Math.max(0, parseInt(humanCounts[tier] ?? 5, 10) || 0);
      const bCount = Math.max(0, parseInt(beastCounts[tier] ?? 2, 10) || 0);
      const mCount = Math.max(0, parseInt(monsterCounts[tier] ?? 2, 10) || 0);

      // 1. 人類可用全大類 (裝備為 HUMAN，消耗品/強化/奇寶為 ALL)
      for (const cat of CATEGORIES) {
        const raceTag = equipCats.includes(cat) ? 'HUMAN' : 'ALL';
        for (let i = 1; i <= hCount; i++) {
          catalog.push(generateSingleItem(cat, tier, i, raceTag));
        }
      }

      // 2. 野獸專用武器防具 (作為敵人裝備)
      for (const cat of equipCats) {
        for (let i = 1; i <= bCount; i++) {
          catalog.push(generateSingleItem(cat, tier, i, 'BEAST'));
        }
      }

      // 3. 魔物專用武器防具 (作為敵人裝備)
      for (const cat of equipCats) {
        for (let i = 1; i <= mCount; i++) {
          catalog.push(generateSingleItem(cat, tier, i, 'MONSTER'));
        }
      }
    }

    return catalog;
  }

  /**
   * 核心功能：依照 6 大類別、6 大品質等級，各隨機生成 countPerTier (預設 3) 樣物品
   * 總量 = 6 * 6 * 3 = 108 樣物品
   */
  function generateDefaultCatalog(countPerTier = 3) {
    const catalog = [];
    const tierKeys = Object.keys(TIER_DEFS);

    for (const cat of CATEGORIES) {
      for (const tier of tierKeys) {
        for (let i = 1; i <= countPerTier; i++) {
          const item = generateSingleItem(cat, tier, i, null);
          catalog.push(item);
        }
      }
    }

    return catalog;
  }

  const exported = {
    generateDefaultCatalog,
    generateRaceBalancedCatalog,
    generateSingleItem,
    TIER_DEFS,
    CATEGORIES
  };

  if (typeof window !== 'undefined') {
    window.ItemGenerator = exported;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }
})(typeof self !== 'undefined' ? self : this);
