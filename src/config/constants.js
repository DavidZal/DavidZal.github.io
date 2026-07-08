export const CANVAS_WIDTH = 1700;
export const CANVAS_HEIGHT = 900;
export const NODE_SIZE = 100;
export const OFFSET_DIVISOR = 10;
export const TICKS_PER_SECOND = 60;
export const TICK_MS = 1000 / TICKS_PER_SECOND;
export const TICKS_PER_FRAME = 60;

export const INITIAL_GOLD = 2000;
export const MAP_FULL_SIZE = 200;
export const MAP_INITIAL_WATERS = 24;
export const MAP_INITIAL_VISIBLE = 48;
export const MAP_GROWTH_PER_ROUND = 10;
export const SAVE_KEY = 'theHorde_save_v2';
export const SAVE_VERSION = 2;

export const Phase = Object.freeze({
  Start: 0,
  Battle: 1,
  Build: 2,
  BattleEnd: 3,
  BattleStart: 4,
  BuildStart: 5,
});

export const UnitAction = Object.freeze({
  inactive: -1,
  nothing: 0,
  walking: 1,
  attacking: 2,
  underAttack: 3,
  dead: 4,
  reeling: 5,
  dizzy: 6,
  swarming: 7,
  casting: 'casting',
});

export const Direction = Object.freeze({
  up: 'up',
  right: 'right',
  down: 'down',
  left: 'left',
  upright: 'upright',
  downright: 'downright',
  upleft: 'upleft',
  downleft: 'downleft',
});

export const UnitType = Object.freeze({
  chauncey: 'chauncey',
  hordeling1: 'hordeling1',
  hordeling2: 'hordeling2',
  hordeling3: 'hordeling3',
  hordeling4: 'hordeling4',
  guard: 'guard',
  patrolGuard: 'patrolGuard',
  archer: 'archer',
  knight: 'knight',
  arrow: 'arrow',
  catapult: 'catapult',
  fireball: 'fireball',
  shamanFireball: 'shamanFireball',
});

export const LandType = Object.freeze({
  black: 'black',
  grass: 'grass',
  water: 'water',
  road: 'road',
  house: 'house',
  mill: 'mill',
  field: 'field',
  rubbleHouse: 'rubbleHouse',
  rubbleField: 'rubbleField',
  spikePit: 'spikePit',
  cow: 'cow',
  castle: 'castle',
});

export const TargetType = Object.freeze({
  house: 'house',
  mill: 'mill',
  castle: 'castle',
  villager: 'villager',
  chauncey: 'chauncey',
  cow: 'cow',
});

export const BUILD_OPTIONS = [
  { name: 'Remove', price: 0, type: 'remove' },
  { name: 'Spike Pit', img: LandType.spikePit, price: 10, type: 'land' },
  { name: 'Cow', img: LandType.cow, price: 100, type: 'land' },
  { name: 'Guard', unitType: UnitType.guard, price: 50, type: 'unit' },
  { name: 'Archer', unitType: UnitType.archer, price: 100, type: 'unit' },
  { name: 'Knight', unitType: UnitType.knight, price: 125, type: 'unit' },
  { name: 'Catapult', unitType: UnitType.catapult, price: 500, type: 'unit' },
];

export const HORDE_TYPES = [
  { type: UnitType.hordeling1, rank: 1 },
  { type: UnitType.hordeling2, rank: 2 },
  { type: UnitType.hordeling3, rank: 4 },
  { type: UnitType.hordeling4, rank: 6 },
];

export const IMAGE_PATHS = [
  'grass.jpg', 'water.jpg', 'field.jpg', 'house.png', 'mill.png', 'castle.png',
  'black.jpg', 'path2.jpg', 'path1.jpg', 'path3.jpg', 'spikePit.jpg',
  'rubbleHouse.png', 'rubbleField.jpg', 'cloud1.png', 'cow.png', 'catapult.png',
  'sprite.png', 'horde1.png', 'horde2.png', 'horde3.png', 'horde4.png',
  'guard.png', 'arrow.png', 'knight.png', 'archer.png', 'fireball.png',
  'villager.png',
];
