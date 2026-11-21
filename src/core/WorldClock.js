/**
 * 《浮世江湖》時鐘與時辰狀態機
 */
export class WorldClock {
  constructor(day = 1, hour = 8) {
    this.day = day;
    this.hour = hour;
  }

  advance(hours) {
    this.hour += hours;
    while (this.hour >= 24) {
      this.hour -= 24;
      this.day += 1;
    }
  }

  getShichenName() {
    const h = this.hour;
    if (h === 23 || h === 0) return '子時 (半夜)';
    if (h >= 1 && h < 3) return '丑時 (雞鳴)';
    if (h >= 3 && h < 5) return '寅時 (平旦)';
    if (h >= 5 && h < 7) return '卯時 (日出)';
    if (h >= 7 && h < 9) return '辰時 (食時)';
    if (h >= 9 && h < 11) return '巳時 (隅中)';
    if (h >= 11 && h < 13) return '午時 (正午)';
    if (h >= 13 && h < 15) return '未時 (日昳)';
    if (h >= 15 && h < 17) return '申時 (晡時)';
    if (h >= 17 && h < 19) return '酉時 (日暮)';
    if (h >= 19 && h < 21) return '戌時 (掌燈)';
    return '亥時 (夜闌)';
  }

  getFormattedString() {
    const hh = this.hour.toString().padStart(2, '0');
    return `第 ${this.day} 日 ${this.getShichenName()} (${hh}:00)`;
  }

  getLighting() {
    const h = this.hour;
    if (h >= 6 && h < 16) {
      return { name: '白晝麗日', color: 0x000000, alpha: 0.0, isNight: false };
    } else if (h >= 16 && h < 18) {
      return { name: '夕陽晚霞', color: 0xd97706, alpha: 0.18, isNight: false };
    } else if (h >= 18 && h < 20) {
      return { name: '掌燈黃昏', color: 0x4c1d95, alpha: 0.28, isNight: false };
    } else if (h >= 20 || h < 5) {
      return { name: '月黑風高', color: 0x080a14, alpha: 0.72, isNight: true };
    } else {
      return { name: '拂曉破曉', color: 0x3b82f6, alpha: 0.18, isNight: false };
    }
  }
}

// CommonJS 兼容器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WorldClock };
}
