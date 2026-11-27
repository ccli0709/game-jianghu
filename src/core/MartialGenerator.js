/**
 * MartialGenerator.js
 * 浮世江湖 · 武功與心法全域生成器與資料規範模型
 * 
 * 核心規則：
 * 1. 類型分為外功武學 (MARTIAL) 與內功心法 (CULTIVATION)
 * 2. 涵蓋七大門派體系 (少林、武當、華山、丐幫、峨嵋、逍遙、江湖散人)
 * 3. 最高等級為 20 級 (Level 1 ~ 20)，具備平滑精確的等級加成曲線
 * 4. 武功加成偏向外功攻擊力、暴擊、招式殺傷
 * 5. 心法加成偏向防禦護體、氣血/真氣上限、自然調息與輔助減傷
 * 6. 武功由每次戰鬥出招時累積經驗，一次最多裝備三個
 * 7. 心法由戰鬥獲勝結算時累積經驗，一次最多裝備三個
 */

const SECTS = {
  SHAOLIN: { id: 'SHAOLIN', name: '少林寺', desc: '天下武功出少林，內外兼修，至剛至陽護體硬功。', color: '#fbbf24' },
  WUDANG: { id: 'WUDANG', name: '武當派', desc: '道法自然，太極陰陽以柔克剛，神純氣足。', color: '#60a5fa' },
  HUASHAN: { id: 'HUASHAN', name: '華山派', desc: '劍氣雙修，奇拔險峻，劍意凌厲如落雁孤峰。', color: '#38bdf8' },
  GAIBANG: { id: 'GAIBANG', name: '丐幫', desc: '至剛降龍十八掌與靈動打狗棒，豪邁不羈。', color: '#f97316' },
  EMEI: { id: 'EMEI', name: '峨嵋派', desc: '金頂佛光，飄逸瀟灑，劍掌生風，九陽凌霜。', color: '#f472b6' },
  XIAOYAO: { id: 'XIAOYAO', name: '逍遙派', desc: '乘天地之正，御六氣之辯，仙風道骨神妙莫測。', color: '#a78bfa' },
  NEUTRAL: { id: 'NEUTRAL', name: '江湖散人', desc: '不拘一格，兼收百家，草莽奇俠自創絕藝。', color: '#34d399' }
};

const MARTIAL_TYPES = {
  MARTIAL: { id: 'MARTIAL', name: '外功武學', desc: '戰鬥出招主動施展，加成攻擊力與外功招式殺傷。' },
  CULTIVATION: { id: 'CULTIVATION', name: '內功心法', desc: '運氣行脈被動輔助，加成防禦、氣血上限與調息復原。' }
};

const MAX_LEVEL = 20;
const MAX_EQUIPPED_MARTIALS = 3;
const MAX_EQUIPPED_CULTIVATIONS = 3;

const MARTIAL_TIERS = [
  { name: '凡品', class: 'tier-white', mult: 1.0 },
  { name: '良品', class: 'tier-green', mult: 1.35 },
  { name: '上品', class: 'tier-purple', mult: 1.8 },
  { name: '極品', class: 'tier-gold', mult: 2.4 },
  { name: '寶器', class: 'tier-orange', mult: 3.1 },
  { name: '神兵絕品', class: 'tier-red', mult: 4.0 }
];

const SECT_PROFILES = {
  SHAOLIN: {
    prefixes: ['少林', '達摩', '金剛', '羅漢', '伏魔', '般若', '韋陀', '菩提'],
    martialSuffixes: ['神拳', '禪杖法', '伏虎掌', '金剛指', '破戒刀', '袈裟伏魔功'],
    cultivationSuffixes: ['洗髓經', '金鐘罩', '不動明王訣', '易筋心法', '禪定真經'],
    martialIcons: ['🥊', '🔱', '🖐️'],
    cultivationIcons: ['🧘', '🛡️', '📿'],
    martialSynergy: { targetCategory: 'MELEE_WEAPON', targetCategoryName: '近戰兵刃 (拳套/棍杖)', bonusStat: 'atkPct', bonusLabel: '外功傷害', baseVal: 10 },
    cultivationSynergy: { targetCategory: 'ARMOR', targetCategoryName: '各式防具 (重鎧/護心鏡)', bonusStat: 'defPct', bonusLabel: '護體防禦', baseVal: 12 },
    trait: '佛門禪武，至剛至陽，擅以重手硬功與金剛護體鎮壓群雄'
  },
  WUDANG: {
    prefixes: ['太極', '純陽', '真武', '玄虛', '兩儀', '繞指', '松鶴', '雲手'],
    martialSuffixes: ['神劍', '綿掌', '柔劍訣', '八卦掌', '連環劍', '玄門刺'],
    cultivationSuffixes: ['無極功', '太極心經', '純陽吐納訣', '清靜真經', '兩儀歸元訣'],
    martialIcons: ['⚔️', '🗡️', '☯️'],
    cultivationIcons: ['☯️', '🌀', '🪷'],
    martialSynergy: { targetCategory: 'MELEE_WEAPON', targetCategoryName: '近戰兵刃 (長劍)', bonusStat: 'critRate', bonusLabel: '暴擊率', baseVal: 6 },
    cultivationSynergy: { targetCategory: 'SPECIAL', targetCategoryName: '秘寶奇物 (道門靈寶)', bonusStat: 'regen', bonusLabel: '每時辰調息', baseVal: 3 },
    trait: '道法自然，以柔克剛，劍勢連綿如長江大河，真氣綿長'
  },
  HUASHAN: {
    prefixes: ['華山', '紫霞', '落雁', '朝陽', '玉女', '孤峰', '狂風', '獨孤'],
    martialSuffixes: ['劍法', '破氣劍', '奪命十三劍', '快劍式', '混元掌', '劈石拳'],
    cultivationSuffixes: ['紫霞神功', '混元功', '抱元勁', '氣宗心法', '太華吐納篇'],
    martialIcons: ['🗡️', '⚔️', '⚡'],
    cultivationIcons: ['🪻', '🌬️', '✨'],
    martialSynergy: { targetCategory: 'MELEE_WEAPON', targetCategoryName: '近戰兵刃 (輕劍/長劍)', bonusStat: 'armorPierce', bonusLabel: '穿透護甲', baseVal: 8 },
    cultivationSynergy: { targetCategory: 'ARMOR', targetCategoryName: '各式防具 (貼身輕袍)', bonusStat: 'dodge', bonusLabel: '身法閃避', baseVal: 5 },
    trait: '劍氣雙修，招法奇拔險峻，出劍如孤峰峭壁凌厲絕倫'
  },
  GAIBANG: {
    prefixes: ['降龍', '打狗', '逍遙遊', '亢龍', '見龍', '鐵帚', '銅錘', '蓮花'],
    martialSuffixes: ['神掌', '棒法', '鐵拳', '擒龍手', '霸王掌', '狂風棍'],
    cultivationSuffixes: ['控鶴訣', '混天功', '鐵布衫心法', '烈陽內功', '行乞歸元訣'],
    martialIcons: ['🐉', '🥢', '👊'],
    cultivationIcons: ['🦅', '🔥', '🛡️'],
    martialSynergy: { targetCategory: 'MELEE_WEAPON', targetCategoryName: '近戰兵刃 (長棍/拳掌)', bonusStat: 'atkPct', bonusLabel: '剛猛破敵', baseVal: 12 },
    cultivationSynergy: { targetCategory: 'ARMOR', targetCategoryName: '各式防具 (護腕/輕甲)', bonusStat: 'hpMax', bonusLabel: '氣血上限', baseVal: 45 },
    trait: '天下第一大幫絕藝，剛猛無儔，越戰越勇，氣血充沛'
  },
  EMEI: {
    prefixes: ['峨嵋', '金頂', '佛光', '九陽', '清風', '凌霜', '截手', '金針'],
    martialSuffixes: ['綿掌', '劍訣', '九式', '渡劫指', '飛針術', '玉女拳'],
    cultivationSuffixes: ['九陽功', '臨濟十二莊', '冰心訣', '佛光普照篇', '回氣心經'],
    martialIcons: ['🪷', '🗡️', '🎯'],
    cultivationIcons: ['☀️', '❄️', '🪷'],
    martialSynergy: { targetCategory: 'RANGED_WEAPON', targetCategoryName: '遠程暗器 (飛針/短劍)', bonusStat: 'critRate', bonusLabel: '會心一擊', baseVal: 7 },
    cultivationSynergy: { targetCategory: 'SPECIAL', targetCategoryName: '秘寶奇物 (佛門奇寶)', bonusStat: 'qiMax', bonusLabel: '真氣上限', baseVal: 35 },
    trait: '外柔內剛，出招飄逸如仙，兼擅凌霜劍意與靈動暗器'
  },
  XIAOYAO: {
    prefixes: ['北冥', '天山', '凌波', '白虹', '折梅', '生死', '小無相', '龜息'],
    martialSuffixes: ['六陽掌', '折梅手', '飛仙術', '無相指', '暗器訣', '御風步'],
    cultivationSuffixes: ['北冥神功', '小無相功', '八荒六合功', '長春心法', '逍遙御風篇'],
    martialIcons: ['❄️', '🎯', '🌀'],
    cultivationIcons: ['🌊', '🌌', '✨'],
    martialSynergy: { targetCategory: 'RANGED_WEAPON', targetCategoryName: '遠程暗器 (機關暗器)', bonusStat: 'rangedAtkPct', bonusLabel: '暗器殺傷', baseVal: 12 },
    cultivationSynergy: { targetCategory: 'SPECIAL', targetCategoryName: '秘寶奇物 (秘笈寶品)', bonusStat: 'qiMax', bonusLabel: '真氣容量', baseVal: 50 },
    trait: '仙風道骨，神妙莫測，能以無相真氣催動各路奇門暗器與寶物'
  },
  NEUTRAL: {
    prefixes: ['天目', '巫山', '神龍', '太湖', '開禧', '浙西', '黑水', '太祖'],
    martialSuffixes: ['長拳', '快刀法', '追魂刺', '裂石掌', '流雲劍', '穿心鏢'],
    cultivationSuffixes: ['吐納心法', '導引術', '鐵骨訣', '太湖行氣篇', '巫山養氣錄'],
    martialIcons: ['👊', '🪓', '🏹'],
    cultivationIcons: ['🫁', '🪨', '🌿'],
    martialSynergy: { targetCategory: 'MELEE_WEAPON', targetCategoryName: '近戰兵刃 (刀劍短匕)', bonusStat: 'atkPct', bonusLabel: '實戰傷害', baseVal: 9 },
    cultivationSynergy: { targetCategory: 'ARMOR', targetCategoryName: '各式防具 (輕袍/軟靴)', bonusStat: 'damageReduction', bonusLabel: '傷害減免', baseVal: 5 },
    trait: '兼收百家之長，貼近實戰殺伐，江湖散客與隱世奇人賴以立身之本'
  }
};

/**
 * 境界名稱階梯 (1~20 級)
 */
function getRealmTitle(level) {
  if (level <= 3) return '初窺門徑';
  if (level <= 6) return '略有小成';
  if (level <= 9) return '駕輕就熟';
  if (level <= 12) return '融會貫通';
  if (level <= 15) return '爐火純青';
  if (level <= 18) return '出神入化';
  if (level === 19) return '傲視群雄';
  return '登峰造極';
}

/**
 * 計算指定等級升級所需經驗值 (1~20 級)
 */
function getExpRequiredForLevel(level) {
  if (level >= MAX_LEVEL) return 0;
  // 基礎 50，隨等級指數漸增
  return Math.round(50 * Math.pow(1.22, level - 1));
}

/**
 * 生成單一武學/心法的 1~20 級成長矩陣 (Level Bonuses)
 * @param {string} type 'MARTIAL' | 'CULTIVATION'
 * @param {object} baseParams 基礎 1 級數值
 */
function generateLevelBonuses(type, baseParams = {}) {
  const bonuses = [];
  const isMartial = type === 'MARTIAL';

  // 1 級基準
  const baseAtk = baseParams.atk || (isMartial ? 15 : 0);
  const baseCrit = baseParams.critRate || (isMartial ? 5 : 0);
  const baseDef = baseParams.def || (isMartial ? 0 : 10);
  const baseHpMax = baseParams.hpMax || (isMartial ? 0 : 30);
  const baseQiMax = baseParams.qiMax || (isMartial ? 0 : 20);
  const baseRegen = baseParams.regen || (isMartial ? 0 : 2);

  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const mult = 1 + (lv - 1) * 0.28; // 每級約提升 28%
    const title = getRealmTitle(lv);
    const expNeeded = getExpRequiredForLevel(lv);

    if (isMartial) {
      const atk = Math.round(baseAtk * mult);
      const critRate = Math.min(60, Math.round(baseCrit + (lv - 1) * 2.2));
      const armorPierce = Math.round((lv - 1) * 2.5);
      bonuses.push({
        level: lv,
        title,
        expNeeded,
        atk,
        critRate,
        armorPierce,
        summary: `外功攻擊力 +${atk} ｜ 暴擊率 +${critRate}% ｜ 穿透護甲 +${armorPierce}`
      });
    } else {
      const def = Math.round(baseDef * mult);
      const hpMax = Math.round(baseHpMax * mult);
      const qiMax = Math.round(baseQiMax * mult);
      const regen = Math.round(baseRegen + (lv - 1) * 0.8);
      const damageReduction = Math.min(40, Math.round((lv - 1) * 1.8));
      bonuses.push({
        level: lv,
        title,
        expNeeded,
        def,
        hpMax,
        qiMax,
        regen,
        damageReduction,
        summary: `護體防禦 +${def} ｜ 氣血上限 +${hpMax} ｜ 真氣上限 +${qiMax} ｜ 每時辰調息 +${regen} ｜ 減傷 +${damageReduction}%`
      });
    }
  }

  return bonuses;
}

/**
 * 預設官方名門武學與心法寶典庫 (涵蓋 7 大門派)
 */
function generateDefaultMartials() {
  const catalog = [
    // --- 少林寺 ---
    {
      id: 'mar_shaolin_luohan_fist',
      name: '羅漢拳法',
      type: 'MARTIAL',
      sect: 'SHAOLIN',
      sectName: '少林寺',
      icon: '🥊',
      cost: 10,
      range: 1,
      tier: '良品',
      tierClass: 'tier-green',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '少林入門外家拳法，拳路光明正大，勢沈力猛。出招時累積武功經驗。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 16, critRate: 6 })
    },
    {
      id: 'mar_shaolin_damo_sword',
      name: '達摩劍法',
      type: 'MARTIAL',
      sect: 'SHAOLIN',
      sectName: '少林寺',
      icon: '🗡️',
      cost: 25,
      range: 2,
      tier: '極品',
      tierClass: 'tier-gold',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '達摩祖師手創少林七十二絕技之一，一劍化千影，破盡魔障。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 35, critRate: 14 })
    },
    {
      id: 'cul_shaolin_yijinjing',
      name: '易筋洗髓經',
      type: 'CULTIVATION',
      sect: 'SHAOLIN',
      sectName: '少林寺',
      icon: '🧘',
      cost: 0,
      range: 0,
      tier: '神兵絕品',
      tierClass: 'tier-red',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '佛門無上鎮寺心法，易筋伐髓，脫胎換骨，氣血防禦生生不息。戰勝結算時累積經驗。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 25, hpMax: 80, qiMax: 50, regen: 6 })
    },
    {
      id: 'cul_shaolin_golden_bell',
      name: '金鐘罩硬氣功',
      type: 'CULTIVATION',
      sect: 'SHAOLIN',
      sectName: '少林寺',
      icon: '🛡️',
      cost: 0,
      range: 0,
      tier: '上品',
      tierClass: 'tier-purple',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '少林正宗金剛不壞外罩護身心法，刀槍難入，固若金湯。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 20, hpMax: 50, qiMax: 20, regen: 3 })
    },

    // --- 武當派 ---
    {
      id: 'mar_wudang_taiji_sword',
      name: '太極神劍',
      type: 'MARTIAL',
      sect: 'WUDANG',
      sectName: '武當派',
      icon: '⚔️',
      cost: 20,
      range: 2,
      tier: '極品',
      tierClass: 'tier-gold',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '張三丰祖師參悟陰陽至理所創，大巧若拙，連綿不絕如流水。出招時累積經驗。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 28, critRate: 10 })
    },
    {
      id: 'mar_wudang_tianshan_palm',
      name: '震山掌勁',
      type: 'MARTIAL',
      sect: 'WUDANG',
      sectName: '武當派',
      icon: '🖐️',
      cost: 15,
      range: 1,
      tier: '良品',
      tierClass: 'tier-green',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '沉如松嶽，動如游龍，掌風暗藏柔勁化解敵勢。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 18, critRate: 8 })
    },
    {
      id: 'cul_wudang_pure_yang',
      name: '純陽無極功',
      type: 'CULTIVATION',
      sect: 'WUDANG',
      sectName: '武當派',
      icon: '☯️',
      cost: 0,
      range: 0,
      tier: '寶器',
      tierClass: 'tier-orange',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '武當第一心法，純陽罡氣循環無端，調息化瘀，百毒不侵。戰勝時累積經驗。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 18, hpMax: 60, qiMax: 65, regen: 5 })
    },
    {
      id: 'cul_wudang_taiji_breath',
      name: '太極圓轉心法',
      type: 'CULTIVATION',
      sect: 'WUDANG',
      sectName: '武當派',
      icon: '🌀',
      cost: 0,
      range: 0,
      tier: '上品',
      tierClass: 'tier-purple',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '借力打力，將敵方攻擊化解於無形，化險為夷。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 22, hpMax: 40, qiMax: 35, regen: 4 })
    },

    // --- 華山派 ---
    {
      id: 'mar_huashan_lonely_nine',
      name: '獨孤九劍',
      type: 'MARTIAL',
      sect: 'HUASHAN',
      sectName: '華山派',
      icon: '🗡️',
      cost: 30,
      range: 2,
      tier: '神兵絕品',
      tierClass: 'tier-red',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '無招勝有招，專破天下各式兵刃與內家拳腳，凌厲絕倫。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 45, critRate: 20 })
    },
    {
      id: 'cul_huashan_zixia',
      name: '紫霞神功',
      type: 'CULTIVATION',
      sect: 'HUASHAN',
      sectName: '華山派',
      icon: '🪻',
      cost: 0,
      range: 0,
      tier: '極品',
      tierClass: 'tier-gold',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '華山氣宗鎮山之寶，運氣時滿面紫氣，內力綿密醇厚。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 16, hpMax: 45, qiMax: 70, regen: 5 })
    },

    // --- 丐幫 ---
    {
      id: 'mar_gaibang_dragon_palm',
      name: '降龍十八掌',
      type: 'MARTIAL',
      sect: 'GAIBANG',
      sectName: '丐幫',
      icon: '🐉',
      cost: 35,
      range: 2,
      tier: '神兵絕品',
      tierClass: 'tier-red',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '亢龍有悔，見龍在田！天下至剛至陽掌法，威勢無儔，摧枯拉朽。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 48, critRate: 18 })
    },
    {
      id: 'cul_gaibang_hunting_dragon',
      name: '擒龍控鶴訣',
      type: 'CULTIVATION',
      sect: 'GAIBANG',
      sectName: '丐幫',
      icon: '🦅',
      cost: 0,
      range: 0,
      tier: '寶器',
      tierClass: 'tier-orange',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '凌空控勁，氣勁凝實，大幅提升體魄氣血與戰損耐受。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 20, hpMax: 75, qiMax: 40, regen: 4 })
    },

    // --- 峨嵋派 ---
    {
      id: 'mar_emei_jinding_palm',
      name: '金頂綿掌',
      type: 'MARTIAL',
      sect: 'EMEI',
      sectName: '峨嵋派',
      icon: '🪷',
      cost: 18,
      range: 1,
      tier: '上品',
      tierClass: 'tier-purple',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '外柔內剛，綿綿不絕，掌勁隨心而發，極難閃避。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 24, critRate: 12 })
    },
    {
      id: 'cul_emei_nine_yang',
      name: '峨嵋九陽功',
      type: 'CULTIVATION',
      sect: 'EMEI',
      sectName: '峨嵋派',
      icon: '☀️',
      cost: 0,
      range: 0,
      tier: '極品',
      tierClass: 'tier-gold',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '郭襄祖師源自九陽真經之傳承，回氣迅速，百脈自愈。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 18, hpMax: 55, qiMax: 60, regen: 6 })
    },

    // --- 逍遙派 ---
    {
      id: 'mar_xiaoyao_six_meridians',
      name: '天山六陽掌',
      type: 'MARTIAL',
      sect: 'XIAOYAO',
      sectName: '逍遙派',
      icon: '❄️',
      cost: 28,
      range: 2,
      tier: '寶器',
      tierClass: 'tier-orange',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '陰陽合一，掌發真氣可凝生死之符，飄忽無定。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 38, critRate: 16 })
    },
    {
      id: 'cul_xiaoyao_north_sea',
      name: '北冥神功',
      type: 'CULTIVATION',
      sect: 'XIAOYAO',
      sectName: '逍遙派',
      icon: '🌊',
      cost: 0,
      range: 0,
      tier: '神兵絕品',
      tierClass: 'tier-red',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '海納百川，有容乃大。敵手內力皆入我淵，真氣浩瀚如深海。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 24, hpMax: 60, qiMax: 100, regen: 7 })
    },

    // --- 江湖散人 (無門派) ---
    {
      id: 'mar_neutral_taizu_fist',
      name: '太祖長拳',
      type: 'MARTIAL',
      sect: 'NEUTRAL',
      sectName: '江湖散人',
      icon: '👊',
      cost: 8,
      range: 1,
      tier: '凡品',
      tierClass: 'tier-white',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '天下初學者通用外家拳術，招法樸實無華，出招時累積武功經驗。',
      levelBonuses: generateLevelBonuses('MARTIAL', { atk: 12, critRate: 5 })
    },
    {
      id: 'cul_neutral_basic_breathing',
      name: '基礎吐納心法',
      type: 'CULTIVATION',
      sect: 'NEUTRAL',
      sectName: '江湖散人',
      icon: '🫁',
      cost: 0,
      range: 0,
      tier: '凡品',
      tierClass: 'tier-white',
      maxLevel: 20,
      currentLevel: 1,
      exp: 0,
      desc: '江湖散客入門打坐行氣法門，調理內息，滋潤四肢百骸。',
      levelBonuses: generateLevelBonuses('CULTIVATION', { def: 8, hpMax: 25, qiMax: 20, regen: 2 })
    }
  ];

  return catalog;
}

/**
 * 依指定門派、武學分類與品質品階生成單一特色武學/心法（含專屬裝備/寶品加成）
 */
function generateRandomMartialBySpec(sectId, type, tierObj, index = 1, usedNames = null, rng = Math.random) {
  const sect = SECTS[sectId] || SECTS.NEUTRAL;
  const profile = SECT_PROFILES[sectId] || SECT_PROFILES.NEUTRAL;
  const tier = typeof tierObj === 'string'
    ? (MARTIAL_TIERS.find(t => t.name === tierObj) || MARTIAL_TIERS[0])
    : (tierObj || MARTIAL_TIERS[0]);

  const isMartial = type === 'MARTIAL';
  const suffixes = isMartial ? profile.martialSuffixes : profile.cultivationSuffixes;
  const icons = isMartial ? profile.martialIcons : profile.cultivationIcons;

  let name = '';
  let attempts = 0;
  do {
    const pfx = profile.prefixes[Math.floor(rng() * profile.prefixes.length)];
    const sfx = suffixes[Math.floor(rng() * suffixes.length)];
    name = `${pfx}${sfx}`;
    if (attempts >= 6) name = `${name}·${['初式', '真傳', '秘本', '殘篇', '奧義'][attempts % 5]}`;
    attempts++;
  } while (usedNames && usedNames.has(name) && attempts < 20);
  if (usedNames) usedNames.add(name);

  const icon = icons[Math.floor(rng() * icons.length)];
  const mult = tier.mult;

  const baseParams = isMartial
    ? {
      atk: Math.round((12 + rng() * 5) * mult),
      critRate: Math.round((4 + rng() * 3) * Math.sqrt(mult))
    }
    : {
      def: Math.round((8 + rng() * 4) * mult),
      hpMax: Math.round((25 + rng() * 10) * mult),
      qiMax: Math.round((20 + rng() * 10) * mult),
      regen: Math.max(2, Math.round((2 + rng() * 1.5) * Math.sqrt(mult)))
    };

  const synCfg = isMartial ? profile.martialSynergy : profile.cultivationSynergy;
  const synBonusVal = Math.round(synCfg.baseVal * Math.sqrt(mult));
  const unitSuffix = synCfg.bonusStat.endsWith('Pct') || synCfg.bonusStat === 'critRate' || synCfg.bonusStat === 'dodge' || synCfg.bonusStat === 'damageReduction' ? '%' : '';
  const gearSynergy = {
    targetCategory: synCfg.targetCategory,
    targetCategoryName: synCfg.targetCategoryName,
    bonusStat: synCfg.bonusStat,
    bonusLabel: synCfg.bonusLabel,
    bonusValue: synBonusVal,
    summary: `搭配【${synCfg.targetCategoryName}】時，${synCfg.bonusLabel}額外 +${synBonusVal}${unitSuffix}`
  };

  const hash = Math.floor(rng() * 0xffff).toString(36);
  const id = `${isMartial ? 'mar' : 'cul'}_${sect.id.toLowerCase()}_${index}_${hash}`;

  return {
    id,
    name,
    type,
    sect: sect.id,
    sectName: sect.name,
    icon,
    cost: isMartial ? Math.round((8 + rng() * 6) * Math.sqrt(mult)) : 0,
    range: isMartial ? (sect.id === 'EMEI' || sect.id === 'XIAOYAO' ? 2 : 1) : 0,
    tier: tier.name,
    tierClass: tier.class,
    maxLevel: MAX_LEVEL,
    currentLevel: 1,
    exp: 0,
    gearSynergy,
    desc: `【${sect.name}·${tier.name}】${profile.trait}。${gearSynergy.summary}。`,
    levelBonuses: generateLevelBonuses(type, baseParams)
  };
}

/**
 * 一鍵生成隨機武學心法庫：
 * 各門派 (7) × 各武學分類 (2) × 各品質品階 (6) 分別隨機生成 countPerCombo (預設 1) 項
 * 預設總計 = 7 * 2 * 6 * 1 = 84 部武學心法
 */
function generateBalancedMartialsCatalog(countPerCombo = 1, rng = Math.random) {
  const count = Math.max(1, Math.min(5, parseInt(countPerCombo, 10) || 1));
  const catalog = [];
  const usedNames = new Set();

  Object.keys(SECTS).forEach(sectId => {
    Object.keys(MARTIAL_TYPES).forEach(type => {
      MARTIAL_TIERS.forEach(tierObj => {
        for (let i = 1; i <= count; i++) {
          catalog.push(generateRandomMartialBySpec(sectId, type, tierObj, i, usedNames, rng));
        }
      });
    });
  });

  return catalog;
}

const exportedMartials = {
  SECTS,
  MARTIAL_TYPES,
  MARTIAL_TIERS,
  SECT_PROFILES,
  MAX_LEVEL,
  MAX_EQUIPPED_MARTIALS,
  MAX_EQUIPPED_CULTIVATIONS,
  getRealmTitle,
  getExpRequiredForLevel,
  generateLevelBonuses,
  generateDefaultMartials,
  generateRandomMartialBySpec,
  generateBalancedMartialsCatalog
};

if (typeof window !== 'undefined') {
  Object.assign(window, exportedMartials);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exportedMartials;
}
