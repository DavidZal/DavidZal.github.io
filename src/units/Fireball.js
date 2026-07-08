import { UnitAction } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { Unit } from './Unit.js';

export class Fireball extends Unit {
  constructor(type, node, offset) {
    super(type, node, offset);
  }

  ai() {
    switch (this.action) {
      case UnitAction.nothing:
      case UnitAction.attacking:
        this.attack();
        break;
      case UnitAction.walking:
        this.handleFrames();
        break;
    }
  }

  attack() {
    const game = getGame();
    if (this.action !== UnitAction.attacking) {
      this.frame = 0;
      this.action = UnitAction.attacking;
      this.animate.sy = this.animate.source.attack.sy;
    } else {
      this.frame++;
    }

    this.animate.sx = this.frame * this.sWidth;

    if (this.frame === 1) {
      const hordelingsInRange = game.horde.hordelings.filter(
        (h) => h.action !== UnitAction.dead && h.getOffsetDistanceFrom(this).dist < this.range
      );
      if (hordelingsInRange.length) {
        const hits = Math.floor(this.strength / hordelingsInRange.length);
        const mod = this.strength % hordelingsInRange.length;
        for (let i = 0; i < hordelingsInRange.length; i++) {
          const h = hordelingsInRange[i];
          if (i < mod) h.gotAttacked(hits + 1);
          else if (hits > 0) h.gotAttacked(hits);
          else break;
        }
      }
    } else if (this.frame === 8) {
      game.units.removeArrow(this);
    }
  }
}
