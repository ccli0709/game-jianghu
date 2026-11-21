/**
 * 《浮世江湖》全域空間與地貌常數規範
 */
export const SPATIAL = {
  TILE_PX: 40,
  GRID_SIZE: 16,
  VIEW_SIZE: 640,
  WORLD_MAX_DIM: 128
};

export const GAME_MODE = {
  OVERWORLD: 'OVERWORLD',
  BATTLE: 'BATTLE'
};

export const BIOMES = {
  PLAINS: { id: 'PLAINS', name: '中原草莽', icon: '🌲', color: '#143823' },
  MOUNTAIN: { id: 'MOUNTAIN', name: '蜀道崇山', icon: '⛰️', color: '#283548' },
  SWAMP: { id: 'SWAMP', name: '苗疆毒沼', icon: '〰', color: '#262412' },
  DESERT: { id: 'DESERT', name: '漠北荒原', icon: '▲', color: '#452a12' },
  SNOW: { id: 'SNOW', name: '長白雪域', icon: '❄️', color: '#1a3048' }
};

export const OVERWORLD_TILES = {
  PLAINS: { id: 0, gid: 1, name: '平原官道', hourCost: 1, color: 0x1a261f, icon: '·' },
  MOUNTAIN: { id: 1, gid: 2, name: '高聳崇山', hourCost: 999, color: 0x313845, icon: '⛰️' },
  FOREST: { id: 2, gid: 3, name: '黑風密林', hourCost: 3, color: 0x0e2015, icon: '🌲' },
  TOWN: { id: 3, gid: 4, name: '洛陽古城', hourCost: 1, color: 0x632b17, icon: '🏯' },
  INN: { id: 4, gid: 5, name: '龍門客棧', hourCost: 1, color: 0x8d3f0d, icon: '🍶' },
  HILLS: { id: 5, gid: 6, name: '崎嶇荒丘', hourCost: 2, color: 0x27291e, icon: '▲' }
};

export const BATTLE_TILES = {
  FLOOR: { id: 0, gid: 1, name: '青石地面', cost: 100, color: 0x161922, icon: '' },
  MUD: { id: 1, gid: 2, name: '泥濘沼澤', cost: 160, color: 0x261e16, icon: '〰' },
  WATER: { id: 2, gid: 3, name: '深水淺灘', cost: 200, color: 0x132338, icon: '≈' },
  RUBBLE: { id: 3, gid: 4, name: '碎石陡坡', cost: 130, color: 0x23252d, icon: '▲' },
  WALL: { id: 4, gid: 5, name: '岩壁掩體', cost: 9999, color: 0x383c48, icon: '■' }
};

export const SURFACES = {
  NONE: 0,
  OIL: 1,
  FIRE: 2,
  ICE: 3
};

// CommonJS 兼容器 (利於 Node.js 測試與原生瀏覽器 ES 模組通用)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SPATIAL, GAME_MODE, BIOMES, OVERWORLD_TILES, BATTLE_TILES, SURFACES };
}
