import { UnitAction, UnitType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { createUnit } from './createUnit.js';
import { Unit } from './Unit.js';

export class Catapult extends Unit {
  constructor(type, node, offset) {
    super(type, node, offset);
  }

  attack(target) {
    if (this.action !== UnitAction.attacking) {
      this.frame = 0;
      this.action = UnitAction.attacking;
      const distObj = target.getOffsetDistanceFrom(this);
      if (distObj?.dir.some((d) => /right/i.test(d))) {
        this.animate.sy = this.animate.source.attack.syLeft;
      } else {
        this.animate.sy = this.animate.source.attack.sy;
      }
    } else {
      this.frame++;
    }

    this.animate.sx = this.frame * this.sWidth;

    if (this.frame === 5) {
      this.fireProjectiles(this.target.position.node, this.target.position.offset);
    } else if (this.frame === 9) {
      this.frame = 0;
      this.action = UnitAction.nothing;
      this.target = null;
    }
  }

  fireProjectiles(node, offset) {
    const game = getGame();

    const catapultX = this.position.node.x * game.offsetSize + this.position.offset.x;
    const catapultY = this.position.node.y * game.offsetSize + this.position.offset.y;

    const targetX = (node.x * game.offsetSize + offset.x - catapultX) * 0.9;
    const targetY = (node.y * game.offsetSize + offset.y - catapultY) * 0.9;

    const radius = Math.sqrt(targetX * targetX + targetY * targetY);
    const angle = (Math.atan2(targetX, targetY) * 360) / (2 * Math.PI);

    let fireball = createUnit(UnitType.fireball, this.position.node, {
      x: this.position.offset.x,
      y: this.position.offset.y,
    });
    fireball.handleMovement(node, { x: offset.x, y: offset.y });
    game.units.addArrow(fireball);

    for (const a of [angle + this.multiProjectileAngle, angle - this.multiProjectileAngle]) {
      const rad = (a * Math.PI) / 180;
      const bigX = catapultX + radius * Math.sin(rad);
      const bigY = catapultY + radius * Math.cos(rad);

      const newOffset = {
        x: Math.floor(bigX % game.offsetSize),
        y: Math.floor(bigY % game.offsetSize),
      };
      let nodeX = Math.floor((bigX - newOffset.x) / game.offsetSize);
      let nodeY = Math.floor((bigY - newOffset.y) / game.offsetSize);

      nodeX = Math.max(0, Math.min(game.map.fullSize - 1, nodeX));
      nodeY = Math.max(0, Math.min(game.map.fullSize - 1, nodeY));

      const newNode = game.map.grid[nodeX][nodeY];
      fireball = createUnit(UnitType.fireball, this.position.node, {
        x: this.position.offset.x,
        y: this.position.offset.y,
      });
      fireball.handleMovement(newNode, newOffset);
      game.units.addArrow(fireball);
    }
  }
}
