import { TargetType, UnitAction } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { Hordeling } from './Hordeling.js';

const BUILDING_TYPES = new Set([TargetType.house, TargetType.mill, TargetType.castle]);
const TAKEOFF_PAUSE_TICKS = 180;

export class DragonHordeling extends Hordeling {
  constructor(type, node, offset) {
    super(type, node, offset);
    this.isFlying = true;
    this.landingPause = 0;
    this.houseTarget = null;
    this.flyDirX = -1;
    this.pickInnerHouse();
  }

  pickInnerHouse() {
    const game = getGame();
    const buildings = game.horde.targets.filter(
      (t) => BUILDING_TYPES.has(t.type) && t.life > 0
    );
    if (!buildings.length) {
      this.houseTarget = null;
      this.target = null;
      return;
    }

    const center = game.map.center;
    const ranked = buildings
      .map((b) => ({ b, dist: b.position.node.distFromNode(center) }))
      .sort((a, b) => a.dist - b.dist);
    const innerCount = Math.max(1, Math.ceil(ranked.length * 0.5));
    const inner = ranked.slice(0, innerCount);
    this.houseTarget = inner[Math.floor(Math.random() * inner.length)].b;
    this.target = this.houseTarget;
    this.animateFly();
  }

  getNearbyUnit() {
    return null;
  }

  animateFly() {
    this.frame = ++this.frame > 3 ? 0 : this.frame;
    this.animate.sy = this.animate.source.down.sy;
    this.animate.sx = this.frame * this.sWidth;
  }

  animateLand() {
    this.animate.sy = this.animate.source.land.sy;
    this.animate.sx = 0;
  }

  animateEat() {
    this.frame = ++this.frame > 3 ? 0 : this.frame;
    this.animate.sy = this.animate.source.attack.sy;
    this.animate.sx = this.frame * this.sWidth;
  }

  flyStepToward(dest) {
    const node = this.position.node;
    const dx = dest.x - node.x;

    if (dx !== 0) this.flyDirX = Math.sign(dx);

    if (node.x !== dest.x) {
      node.x += Math.sign(dest.x - node.x);
    } else if (node.y !== dest.y) {
      node.y += Math.sign(dest.y - node.y);
    }

    this.action = UnitAction.walking;
    this.animateFly();
  }

  land() {
    this.isFlying = false;
    this.action = UnitAction.attacking;
    this.position.offset = getGame().createMidOffsetObj();
    this.animateLand();
  }

  die() {
    super.die();
    if (this.animate.source.die) {
      this.animate.sy = this.animate.source.die.sy;
    }
  }

  attackBuilding(target) {
    this.animateEat();

    if (this.frame % 2 === 0) return;

    if (target?.gotAttacked(this.strength)) {
      target.underAttack = false;
      if (target.life < 1) {
        this.landingPause = TAKEOFF_PAUSE_TICKS;
        this.isFlying = false;
        this.pickInnerHouse();
      }
    } else if (target) {
      target.underAttack = true;
    }
  }

  ai() {
    if (this.action === UnitAction.dead || this.landingPause > 0) return;

    if (this.isFlying) {
      if (!this.houseTarget || this.houseTarget.life < 1) {
        this.pickInnerHouse();
      }
      if (!this.houseTarget) return;

      const dest = this.houseTarget.position.node;
      if (this.position.node === dest) {
        this.land();
        return;
      }

      this.flyStepToward(dest);
      return;
    }

    if (!this.houseTarget || this.houseTarget.life < 1) {
      this.landingPause = TAKEOFF_PAUSE_TICKS;
      this.pickInnerHouse();
      return;
    }

    this.action = UnitAction.attacking;
    this.attackBuilding(this.houseTarget);
  }
}

DragonHordeling.TAKEOFF_PAUSE_TICKS = TAKEOFF_PAUSE_TICKS;
