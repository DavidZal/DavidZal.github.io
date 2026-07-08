import { UnitType } from '../config/constants.js';
import { countVillagers } from './GoldCalculator.js';
import { createUnit } from '../units/createUnit.js';

export const VILLAGERS_PER_PATROL_GUARD = 20;

export function clearPatrolGuards(game) {
  game.units.all = game.units.all.filter((u) => u.type !== UnitType.patrolGuard);
  game.units.rebuildAlive();
}

export function spawnPatrolGuards(game) {
  clearPatrolGuards(game);

  const count = Math.floor(countVillagers(game) / VILLAGERS_PER_PATROL_GUARD);
  if (count < 1) return 0;

  const roads = game.map.data.road.filter((n) => n.isVisible);
  if (!roads.length) return 0;

  for (let i = 0; i < count; i++) {
    const node = roads[Math.floor(Math.random() * roads.length)];
    game.units.add(createUnit(UnitType.patrolGuard, node));
  }

  return count;
}
