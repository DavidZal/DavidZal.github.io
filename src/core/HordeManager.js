import { HORDE_TYPES, LandType, Phase, TargetType, UnitAction, UnitType, DRAGON_MAX_RATIO } from '../config/constants.js';
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

    const initialCounter = hCounter;
    const dragonCap =
      game.phase.round >= 10 ? Math.floor(initialCounter * DRAGON_MAX_RATIO) : 0;
    let dragonsSpawned = 0;

    while (hCounter > 0) {
      let possibles = HORDE_TYPES.filter((h) => {
        if (h.rank > hCounter || h.rank > game.phase.round) return false;
        if (h.minRound && game.phase.round < h.minRound) return false;
        if (h.type === UnitType.hordelingDragon && dragonsSpawned >= dragonCap) return false;
        return true;
      });

      if (!possibles.length) break;

      let pick;
      const canSpawnDragon =
        game.phase.round >= 10 &&
        dragonsSpawned < dragonCap &&
        possibles.some((h) => h.type === UnitType.hordelingDragon);

      if (canSpawnDragon && Math.random() < DRAGON_MAX_RATIO) {
        pick = possibles.find((h) => h.type === UnitType.hordelingDragon);
        dragonsSpawned++;
      } else {
        const withoutDragon = possibles.filter((h) => h.type !== UnitType.hordelingDragon);
        const pool = withoutDragon.length ? withoutDragon : possibles;
        pick = pool[Math.floor(Math.random() * pool.length)];
      }

      const startNode =
        allPossibleStartLocations[Math.floor(Math.random() * allPossibleStartLocations.length)];
      this.inactiveHordelings.push(createHordeling(pick.type, startNode));
      hCounter -= pick.rank;
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
