import { UnitAction, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { Hordeling } from './Hordeling.js';
import { ShamanFireball } from './ShamanFireball.js';

export class Shaman extends Hordeling {
  constructor(node) {
    super(UnitType.hordeling4, node);
    this.hasFireball = true;
    this.spellRange = 30;
  }

  ai() {
    if (this.action === UnitAction.casting) {
      this.frame++;
      if (this.frame === 1) {
        this.fireArrow();
        this.target = null;
      } else if (this.frame === 4) {
        this.frame = 0;
        this.action = UnitAction.nothing;
        this.target = null;
      }
      this.animate.sx = this.frame * this.sWidth;
      return;
    }

    if (this.hasFireball) {
      const nearbyEnemy = this.findFireBallTarget();
      if (nearbyEnemy) {
        this.action = UnitAction.casting;
        this.frame = 0;
        this.target = nearbyEnemy;
        this.hasFireball = false;
        return;
      }
    }

    super.ai();
  }

  fireArrow(target) {
    const game = getGame();
    const arrow = new ShamanFireball(this.position.node, {
      x: this.position.offset.x,
      y: this.position.offset.y,
    });
    arrow.target = target ?? this.target;
    arrow.handleMovement(arrow.target.position.node, arrow.target.position.offset);
    game.units.addArrow(arrow);
  }

  findFireBallTarget() {
    const game = getGame();
    return [...game.units.alive(), game.player].find(
      (u) => u.action !== UnitAction.dead && this.getOffsetDistanceFrom(u).dist < this.spellRange
    );
  }
}
