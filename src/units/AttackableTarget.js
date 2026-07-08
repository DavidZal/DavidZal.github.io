import { LandType, TargetType, UnitAction, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { createUnit } from './createUnit.js';

export class AttackableTarget {
  constructor(type, node, offset) {
    this.type = type;
    this.position = { node, offset };
    this.underAttack = false;
    this.start = {};

    const game = getGame();

    switch (type) {
      case TargetType.house:
        this.start.life = 10;
        break;
      case TargetType.mill:
        this.start.life = 15;
        break;
      case TargetType.castle:
        this.start.life = 20;
        this.range = 4 * game.offsetSize;
        this.speed = 12;
        this.frame = 0;
        this.tickerOffset = Math.floor(Math.random() * this.speed);
        break;
      case TargetType.villager:
        this.start.life = 8;
        this.animate = { sWidth: 56, sHeight: 56, sx: 0, sy: 0 };
        this.animate.img = game.assets.get('villager');
        break;
      case TargetType.cow:
        this.start.life = 8;
        break;
    }

    this.life = this.start.life;
  }

  gotAttacked(strength) {
    const game = getGame();
    this.life -= strength;

    if (this.life < 1) {
      this.life = 0;

      switch (this.type) {
        case TargetType.house:
        case TargetType.mill:
        case TargetType.castle:
          this.position.node.type = LandType.rubbleHouse;
          game.horde.targets.push(
            new AttackableTarget(TargetType.villager, this.position.node, {
              x: Math.floor(game.offsetSize / 2),
              y: Math.floor(game.offsetSize / 2),
            })
          );
          if (this.type === TargetType.castle) {
            game.units.castles = game.units.castles.filter((c) => c !== this);
          }
          game.events.emit('building:destroyed', { target: this });
          break;
        case TargetType.cow:
          this.position.node.type = LandType.grass;
          break;
      }
    }

    return !this.life;
  }

  restoreStart() {
    this.life = this.start.life;
  }

  hasVillager() {
    return [TargetType.house, TargetType.mill, TargetType.castle].includes(this.type);
  }

  ai() {
    if (this.type !== TargetType.castle) return;
    const game = getGame();
    this.frame++;
    if (this.frame === 10) {
      const target = game.horde.hordelings.find(
        (h) => h.action !== UnitAction.dead && h.getOffsetDistanceFrom(this).dist < this.range
      );
      if (target) {
        const arrow = createUnit(UnitType.arrow, this.position.node, game.createMidOffsetObj());
        arrow.target = target;
        arrow.handleMovement(target.position.node, target.position.offset);
        game.units.addArrow(arrow);
      }
      this.frame = 0;
    }
  }
}

AttackableTarget.types = TargetType;
export const attackableTarget = AttackableTarget;
