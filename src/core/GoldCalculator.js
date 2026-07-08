import { BUILD_OPTIONS, TargetType, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';

export function calcGold(game) {
  const data = game.map.getNodesByType();

  const villagers =
    data.house.length +
    data.mill.length +
    data.castle.length +
    game.horde.targets.filter((t) => t.type === TargetType.villager).length;

  const prev = game.summary ?? {};
  const getPrev = (key) => prev[key]?.current ?? 0;

  const guards = game.units.alive().filter((u) => u.type === UnitType.guard).length;
  const archers = game.units.alive().filter((u) => u.type === UnitType.archer).length;
  const knights = game.units.alive().filter((u) => u.type === UnitType.knight).length;
  const catapults = game.units.alive().filter((u) => u.type === UnitType.catapult).length;

  const guardPrice = BUILD_OPTIONS.find((o) => o.unitType === UnitType.guard)?.price ?? 50;
  const archerPrice = BUILD_OPTIONS.find((o) => o.unitType === UnitType.archer)?.price ?? 100;
  const knightPrice = BUILD_OPTIONS.find((o) => o.unitType === UnitType.knight)?.price ?? 125;
  const catapultPrice = BUILD_OPTIONS.find((o) => o.unitType === UnitType.catapult)?.price ?? 500;

  game.summary = {
    villagers: { name: 'Villagers', current: villagers, change: villagers - getPrev('villagers') },
    fields: {
      name: 'Fields',
      current: data.field.length,
      change: data.field.length - getPrev('fields'),
      revenue: 5,
    },
    mills: {
      name: 'Mills',
      current: data.mill.length,
      change: data.mill.length - getPrev('mills'),
      revenue: 50,
    },
    castles: {
      name: 'Castles',
      current: data.castle.length,
      change: data.castle.length - getPrev('castles'),
      revenue: 100,
    },
    cows: {
      name: 'Cows',
      current: data.cow.length,
      change: data.cow.length - getPrev('cows'),
      revenue: 25,
    },
    guards: {
      name: 'Guards',
      current: guards,
      change: guards - getPrev('guards'),
      revenue: -guardPrice,
      type: UnitType.guard,
    },
    archers: {
      name: 'Archers',
      current: archers,
      change: archers - getPrev('archers'),
      revenue: -archerPrice,
      type: UnitType.archer,
    },
    knights: {
      name: 'Knights',
      current: knights,
      change: knights - getPrev('knights'),
      revenue: -knightPrice,
      type: UnitType.knight,
    },
    catapults: {
      name: 'Catapults',
      current: catapults,
      change: catapults - getPrev('catapults'),
      revenue: -catapultPrice,
      type: UnitType.catapult,
    },
  };

  let goldChange =
    game.summary.fields.current * game.summary.fields.revenue +
    game.summary.mills.current * game.summary.mills.revenue +
    game.summary.castles.current * game.summary.castles.revenue +
    game.summary.cows.current * game.summary.cows.revenue +
    game.summary.guards.current * game.summary.guards.revenue +
    game.summary.archers.current * game.summary.archers.revenue +
    game.summary.catapults.current * game.summary.catapults.revenue +
    game.summary.knights.current * game.summary.knights.revenue;

  while (game.gold < 0 && game.gold + goldChange < 0 && game.units.alive().length) {
    const alive = game.units.alive();
    const removed = alive[alive.length - 1];
    const price =
      BUILD_OPTIONS.find((o) => o.unitType === removed.type)?.price ?? 0;
    goldChange += price;
    game.units.all = game.units.all.filter((u) => u !== removed);
    const summaryKey = Object.keys(game.summary).find(
      (k) => game.summary[k].type === removed.type
    );
    if (summaryKey) {
      game.summary[summaryKey].current--;
      game.summary[summaryKey].change--;
    }
    game.units.rebuildAlive();
  }

  game.gold += goldChange;
  game.summary.gold = { current: game.gold, change: goldChange };
  game.events.emit('gold:changed', { gold: game.gold, change: goldChange });
}
