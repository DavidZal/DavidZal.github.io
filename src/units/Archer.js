import { Direction, UnitAction, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { createUnit } from './createUnit.js';
import { Unit } from './Unit.js';

export class Archer extends Unit {
  constructor(type, node, offset) {
    super(type, node, offset);
  }

  getHordelingWithinRange() {
    return super.getHordelingWithinRange(true);
  }

  attack(target) {
    if (this.action !== UnitAction.attacking) {
      this.frame = 0;
      this.action = UnitAction.attacking;
      const distObj = target.getOffsetDistanceFrom(this);
      if (distObj?.dir.some((d) => new RegExp(d, 'i').test(Direction.right))) {
        this.animate.sy = this.animate.source.attack.syLeft;
      } else {
        this.animate.sy = this.animate.source.attack.sy;
      }
    } else {
      this.frame++;
    }

    this.animate.sx = this.frame * this.sWidth;

    if (this.frame === 4) {
      if (
        this.target &&
        this.target.action !== UnitAction.dead &&
        this.target.getOffsetDistanceFrom(this).dist < this.range
      ) {
        this.fireArrow(this.target);
      } else {
        const newTarget = this.getHordelingWithinRange();
        if (newTarget) {
          this.target = newTarget;
          this.fireArrow(newTarget);
        } else {
          this.action = UnitAction.nothing;
          this.target = null;
        }
      }
    } else if (this.frame === 5) {
      this.frame = 0;
    }
  }

  fireArrow(target) {
    const game = getGame();
    const arrow = createUnit(UnitType.arrow, this.position.node, {
      x: this.position.offset.x,
      y: this.position.offset.y,
    });
    arrow.target = target ?? this.target;
    arrow.handleMovement(arrow.target.position.node, arrow.target.position.offset);
    game.units.addArrow(arrow);
  }
}
