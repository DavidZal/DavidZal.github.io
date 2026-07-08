import { UnitAction, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { Hordeling } from './Hordeling.js';

export class ShamanFireball extends Hordeling {
  constructor(node, offset) {
    super(UnitType.shamanFireball, node, offset);
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
      const unitsInRange = [...game.units.alive(), game.player].filter(
        (u) => u.action !== UnitAction.dead && this.getOffsetDistanceFrom(u).dist < this.range
      );
      if (unitsInRange.length) {
        const hits = Math.floor(this.strength / unitsInRange.length);
        const mod = this.strength % unitsInRange.length;
        for (let i = 0; i < unitsInRange.length; i++) {
          const h = unitsInRange[i];
          let isDead = false;
          if (i < mod) isDead = h.gotAttacked(hits + 1);
          else if (hits > 0) isDead = h.gotAttacked(hits);
          else break;
          if (isDead) {
            game.horde.targets = game.horde.targets.filter((t) => t !== h);
          }
        }
      }
    } else if (this.frame === 8) {
      game.units.removeArrow(this);
    }
  }
}
