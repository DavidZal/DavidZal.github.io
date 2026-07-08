import { HORDE_TYPES, LandType, Phase, TargetType, UnitAction, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { astar } from '../pathfinding/astar.js';
import { AttackableTarget } from '../units/AttackableTarget.js';
import { createHordeling } from '../units/createUnit.js';
import { UnitGroup } from '../units/UnitGroup.js';
import { spawnPatrolGuards } from './PatrolGuardManager.js';

export class HordeManager {
  constructor() {
    this.hordeStrength = 2;
    this.hordelings = [];
    this.inactiveHordelings = [];
    this.targets = [];
  }

  static roundStrengthGain(round) {
    return (
      1 +
      Math.floor(round * 0.75) +
      Math.floor(round / 5) * 5 +
      Math.floor(round / 20) * 100
    );
  }

  static calcStrengthAfterRound(round) {
    let strength = 2;
    for (let r = 1; r <= round; r++) {
      strength += HordeManager.roundStrengthGain(r);
    }
    return strength;
  }

  initBattlePhase() {
    const game = getGame();
    this.hordelings = [];
    this.inactiveHordelings = [];
    this.targets = [];

    this.hordeStrength += HordeManager.roundStrengthGain(game.phase.round);

    let hCounter = this.hordeStrength;
    const min = Math.ceil((game.map.fullSize - game.map.size) / 2);
    const max = min + game.map.size - 2;
    game.map.data = game.map.getNodesByType();

    const allPossibleStartLocations = game.map.data.grass.filter((n) => {
      if (
        n.isVisible &&
        (n.x === min || n.x === max || n.y === min || n.y === max)
      ) {
        const dummy = createHordeling(UnitType.hordeling1, n);
        const path = astar.search(game.map, n, game.map.center, dummy);
        return path.length > 0;
      }
      return false;
    });

    while (hCounter > 0) {
      const possibles = HORDE_TYPES.filter(
        (h) => h.rank <= hCounter && h.rank <= game.phase.round
      );
      const startNode =
        allPossibleStartLocations[Math.floor(Math.random() * allPossibleStartLocations.length)];
      const newHordeling = possibles[Math.floor(Math.random() * possibles.length)];
      this.inactiveHordelings.push(createHordeling(newHordeling.type, startNode));
      hCounter -= newHordeling.rank;
    }

    this.targets = game.map.data.house.map(
      (h) => new AttackableTarget(TargetType.house, h)
    );
    game.map.data.mill.forEach((h) => {
      this.targets.push(new AttackableTarget(TargetType.mill, h));
    });
    game.map.data.castle.forEach((h) => {
      const castle = new AttackableTarget(TargetType.castle, h);
      this.targets.push(castle);
      game.units.castles.push(castle);
    });
    game.map.data.cow.forEach((cow) => {
      this.targets.push(
        new AttackableTarget(TargetType.cow, cow, game.createMidOffsetObj())
      );
    });

    game.resetStartPos();

    spawnPatrolGuards(game);

    game.units.alive().forEach((u) => {
      this.targets.push(u);
      if (u.type === UnitType.knight) {
        u.position.node = game.player.position.node;
        u.position.offset = game.getRandomOffset();
      }
    });

    game.player.life++;
    UnitGroup.init();
  }

  get aliveHordelings() {
    return this.hordelings.filter((h) => h.action !== UnitAction.dead);
  }

  get activeHordelings() {
    return this.hordelings.filter(
      (h) => h.action !== UnitAction.dead && h.action !== UnitAction.inactive
    );
  }
}
