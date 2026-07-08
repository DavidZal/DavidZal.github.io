import { Direction, LandType, TargetType, UnitAction, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { Unit } from './Unit.js';

export class Hordeling extends Unit {
  constructor(type, node, offset) {
    super(type, node, offset);
    this.action = UnitAction.inactive;
    this.target = null;
    this.swarmDist = 7;
  }

  ai() {
    switch (this.action) {
      case UnitAction.nothing:
        if (this.target && this.getOffsetDistanceFrom(this.target).dist < this.range) {
          this.action = UnitAction.attacking;
        } else if (!this.target) {
          this.target = this.findNearestTarget();
        } else {
          this.handleMovement(this.target.position.node, this.target.position.offset);
        }
        break;
      case UnitAction.walking: {
        const game = getGame();
        if (this.position.node.type === LandType.field) {
          this.position.node.type = LandType.rubbleField;
        } else if (this.position.node.type === LandType.spikePit) {
          this.gotAttacked(this.position.node.getStrength());
          this.position.node.type = LandType.grass;
          return;
        }

        const nearbyUnit = this.getNearbyUnit();
        if (nearbyUnit) {
          this.target = nearbyUnit;
          this.action = UnitAction.attacking;
        } else if (this.target?.life > 0) {
          const nodeDist = Math.floor(
            this.position.node.distFromNode(this.target.position.node)
          );
          if ([this.swarmDist, this.swarmDist - 1].includes(nodeDist) && this.swarm()) {
            this.action = UnitAction.swarming;
            this.walk(Direction.down);
          } else {
            this.handleFrames();
          }
        } else {
          this.action = UnitAction.nothing;
          this.target = null;
        }
        break;
      }
      case UnitAction.attacking:
        if (
          this.target?.life > 0 &&
          this.getOffsetDistanceFrom(this.target).dist < this.range
        ) {
          this.attack(this.target);
        } else {
          this.action = UnitAction.nothing;
          this.target = null;
          this.walk(Direction.down);
        }
        break;
      case UnitAction.swarming: {
        const nearby = this.getNearbyUnit();
        if (nearby) {
          this.target = nearby;
          this.action = UnitAction.attacking;
        } else if (!this.swarm()) {
          this.action = UnitAction.nothing;
        }
        break;
      }
    }
  }

  findNearestTarget() {
    const game = getGame();
    return game.horde.targets.reduce(
      (current, t) => {
        if (
          t.type === TargetType.villager &&
          game.horde.hordelings.some((h) => h.target === t)
        ) {
          return current;
        }
        const dist = this.getOffsetDistanceFrom(t).dist;
        return dist < current.dist ? { t, dist } : current;
      },
      { dist: Infinity }
    ).t;
  }

  attack(target) {
    const game = getGame();
    this.frame = ++this.frame > 3 ? 0 : this.frame;
    this.animate.sy = this.animate.source.attack.sy;
    this.animate.sx = this.frame * this.sWidth;

    if (target.gotAttacked(this.strength)) {
      target.underAttack = false;
      game.horde.targets = game.horde.targets.filter((t) => t !== this.target);

      const lastTarget = game.horde.targets[game.horde.targets.length - 1];
      if (
        lastTarget?.type === TargetType.villager &&
        lastTarget.position.node === this.position.node
      ) {
        this.target = lastTarget;
      } else {
        this.target = null;
      }

      if (!game.horde.targets.length) {
        game.horde.targets.push(game.player);
      }
    } else {
      target.underAttack = true;
    }
  }

  swarm() {
    const game = getGame();
    const ratio = 3;

    if (!this.target?.group) return false;
    if (game.player.position.node.distFromNode(this.position.node) < 2) return false;
    if (
      game.units.alive().some(
        (u) => u.position.node.distFromNode(this.position.node) < 2
      )
    ) {
      return false;
    }

    const group = this.target.group;
    const fellowHordelings = group.hordelings;
    const swarmingCount = fellowHordelings.filter((h) => {
      const nodeDist = h.target
        ? Math.floor(h.position.node.distFromNode(h.target.position.node))
        : Infinity;
      return nodeDist <= h.swarmDist;
    }).length;

    return (
      group.units.length * ratio < fellowHordelings.length &&
      swarmingCount < fellowHordelings.length * 0.8
    );
  }

  getNearbyUnit() {
    const game = getGame();
    return [...game.units.alive(), game.player].reduce(
      (current, u) => {
        if (u.action !== UnitAction.dead) {
          const distObj = this.getOffsetDistanceFrom(u);
          if (
            distObj.dist === 0 ||
            (distObj.dist < this.range &&
              distObj.dist >= this.minRange &&
              distObj.dir.some((d) => new RegExp(d, 'i').test(this.direction)) &&
              distObj.dist < current.dist)
          ) {
            return { u, dist: distObj.dist };
          }
        }
        return current;
      },
      { dist: Infinity }
    ).u;
  }
}

Hordeling.actions = { ...UnitAction, casting: UnitAction.casting };
