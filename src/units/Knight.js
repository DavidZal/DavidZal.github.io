import { Direction, UnitAction, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { Unit } from './Unit.js';

export class Knight extends Unit {
  constructor(type, node, offset) {
    super(type, node, offset);
  }

  ai() {
    const game = getGame();
    switch (this.action) {
      case UnitAction.nothing: {
        let target = this.getHordelingWithinRange();
        if (target) {
          this.target = target;
          this.attack(target);
        } else {
          target = game.horde.hordelings.find(
            (h) =>
              h.action !== UnitAction.dead &&
              h.getOffsetDistanceFrom(this).dist < 3 * game.offsetSize
          );
          if (target) {
            this.target = target;
            this.handleMovement(target.position.node, target.position.offset);
          } else if (this.position.node.distFromNode(game.player.position.node) > 2) {
            this.handleMovement(game.player.position.node, game.getRandomOffset());
          }
        }
        break;
      }
      case UnitAction.walking:
        if (this.target?.action === UnitAction.dead) {
          this.action = UnitAction.nothing;
          this.target = null;
        } else if (this.target && this.target.getOffsetDistanceFrom(this).dist < this.range) {
          this.attack(this.target);
        } else {
          const nearByH = game.horde.hordelings.find(
            (h) =>
              h.action !== UnitAction.dead && h.getOffsetDistanceFrom(this).dist < this.range
          );
          if (nearByH) {
            this.target = nearByH;
            this.attack(this.target);
          } else {
            this.handleFrames();
          }
        }
        break;
      case UnitAction.attacking:
        if (this.target && this.target.action !== UnitAction.dead) {
          this.attack(this.target);
        } else {
          this.target = null;
          this.action = UnitAction.nothing;
        }
        break;
    }
  }

  attack(target) {
    if (this.action !== UnitAction.attacking) {
      this.frame = 0;
      this.action = UnitAction.attacking;
      this.animate.sy = this.animate.source.attack.sy;
    } else {
      this.frame = ++this.frame > 3 ? 0 : this.frame;
    }
    this.animate.sx = this.frame * this.sWidth;

    if (this.frame === 1 && target?.gotAttacked(this.strength)) {
      this.target = null;
    } else if (this.frame === 3 && !this.target) {
      this.action = UnitAction.nothing;
      this.walk(Direction.down);
    }
  }
}
