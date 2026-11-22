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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SECTS,
    MARTIAL_TYPES,
    MAX_LEVEL,
    MAX_EQUIPPED_MARTIALS,
    MAX_EQUIPPED_CULTIVATIONS,
    getRealmTitle,
    getExpRequiredForLevel,
    generateLevelBonuses,
    generateDefaultMartials
  };
}
