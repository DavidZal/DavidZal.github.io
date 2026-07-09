import {
  Direction,
  LandType,
  UnitAction,
  UnitType,
} from '../config/constants.js';
import { UNIT_DEFS } from '../config/unitDefs.js';
import { getGame } from '../core/GameContext.js';
import { astar } from '../pathfinding/astar.js';

export class Unit {
  constructor(type, node, offset) {
    this.type = type;
    this.frame = 0;
    this.walkTo = {};
    this.position = { node, offset };
    this.action = UnitAction.nothing;
    this.animate = { lifeLossTexts: [] };
    this.target = null;

    const def = UNIT_DEFS[type];
    if (!def) throw new Error(`Unknown unit type: ${type}`);

    const game = getGame();
    Object.assign(this, {
      sWidth: def.sWidth,
      sHeight: def.sHeight,
      speed: def.speed,
      life: def.life,
      strength: def.strength,
      isMobile: def.isMobile ?? false,
      bulk: def.bulk ? def.bulk * game.offsetSize : 0,
      hasFireball: def.hasFireball,
      spellRange: def.spellRange,
      multiProjectileAngle: def.multiProjectileAngle,
    });

    this.animate.source = structuredClone(def.animate);
    this.sprite = game.assets.get(def.sprite.replace('.png', '').replace('.jpg', '')) ??
      game.assets.get(def.sprite);

    if (!offset && node) {
      this.position.offset = {
        x: Math.floor(game.offsetSize / 2),
        y: Math.floor(game.offsetSize / 2),
      };
    }

    this.walk(Direction.down);

    this.start = {
      life: this.life,
      position: { node: this.position.node },
    };
    if (this.position.offset) {
      this.start.position.offset = {
        x: this.position.offset.x,
        y: this.position.offset.y,
      };
    }

    this.range = (def.range ?? 0.5) * game.offsetSize;
    this.minRange = (def.minRange ?? 0) * game.offsetSize;
    this.tickerOffset = Math.floor(Math.random() * this.speed);

    if (type === UnitType.chauncey) this.dizziness = 0;
  }

  walk(dir) {
    const src = this.animate.source[dir];
    if (!src) return;
    const sx = src.sx;
    const sy = src.sy;
    this.frame = ++this.frame > 3 ? 0 : this.frame;
    this.animate.img = this.sprite;
    this.animate.sx = sx === undefined ? this.frame * this.sWidth : sx;
    this.animate.sy = sy;
    this.animate.sWidth = this.sWidth;
    this.animate.sHeight = this.sHeight;
    this.direction = Direction[dir] ?? dir;
  }

  updateTargetNode() {
    const game = getGame();
    const pos = this.position;
    const maxOffset = game.offsetSize;
    const walkTo = this.walkTo;

    if (pos.node.x !== walkTo.targetNode.x) {
      pos.offset.x = pos.offset.x === 0 ? maxOffset - 1 : 0;
    }
    if (pos.node.y !== walkTo.targetNode.y) {
      pos.offset.y = pos.offset.y === 0 ? maxOffset - 1 : 0;
    }
    pos.node = walkTo.targetNode;
    delete walkTo.targetOffset;
  }

  handleMovement(destination, offset) {
    const game = getGame();
    this.walkTo.path = astar.search(game.map, this.position.node, destination, this);
    this.walkTo.offset = offset ?? {
      x: Math.floor(game.offsetSize / 2),
      y: Math.floor(game.offsetSize / 2),
    };
    this.action = UnitAction.walking;
  }

  gotAttacked(strength) {
    const game = getGame();
    this.life -= strength;

    if (this.life < 1) {
      this.life = 0;
      this.die();
    } else if (this.type === UnitType.chauncey) {
      this.action = UnitAction.reeling;
      const neys = game.map
        .getNeighbors(this.position.node)
        .filter((n) => n.isWalkable());
      const node = neys[Math.floor(Math.random() * neys.length)];
      this.walkTo.path = astar.search(game.map, this.position.node, node, this);
      this.walkTo.offset = this.position.offset;
    }

    this.animate.lifeLossTexts.push({ text: `life: ${this.life}` });
    return !this.life;
  }

  die() {
    const game = getGame();
    this.action = UnitAction.dead;
    if (this.target) {
      this.target.underAttack = false;
      this.target = null;
    }
    this.animate.sx = 0;
    if (this.animate.source.die) {
      this.animate.sy = this.animate.source.die.sy;
    }
    game.units.onUnitDied(this);
    game.events.emit('unit:died', { unit: this });
  }

  isWalkable(node) {
    if ([UnitType.arrow, UnitType.fireball, UnitType.shamanFireball].includes(this.type)) {
      return true;
    }
    const nodeType = node.type;
    if (
      [LandType.black, LandType.water, LandType.house, LandType.mill, LandType.castle].includes(
        nodeType
      )
    ) {
      return false;
    }
    if (this.type === UnitType.chauncey) {
      if ([LandType.spikePit, LandType.cow].includes(nodeType)) return false;
    }
    return true;
  }

  ai() {
    const game = getGame();
    switch (this.action) {
      case UnitAction.nothing:
        switch (this.type) {
          case UnitType.guard:
          case UnitType.patrolGuard: {
            let target = this.getHordelingWithinRange();
            if (target) {
              this.target = target;
              this.attack(target);
            } else {
              target = game.horde.hordelings.find(
                (h) =>
                  h.action !== UnitAction.dead && h.position.node === this.position.node
              );
              if (target) {
                this.target = target;
                this.handleMovement(target.position.node, target.position.offset);
              }
            }
            break;
          }
          case UnitType.arrow:
            game.units.removeArrow(this);
            break;
          case UnitType.archer:
          case UnitType.catapult: {
            const target = this.getHordelingWithinRange();
            if (target) {
              this.target = target;
              this.attack(target);
            } else {
              this.walk(Direction.down);
            }
            break;
          }
        }
        break;
      case UnitAction.walking:
        if (this.target?.action === UnitAction.dead) {
          this.action = UnitAction.nothing;
          this.target = null;
        } else if (this.target && this.target.getOffsetDistanceFrom(this).dist < this.range) {
          this.attack(this.target);
        } else {
          this.handleFrames();
        }
        break;
      case UnitAction.attacking:
        this.attack(this.target);
        break;
    }
  }

  handleFrames() {
    const game = getGame();
    const position = this.position;
    const walkTo = this.walkTo;

    if (!walkTo.targetOffset) {
      if (walkTo.path?.length) {
        walkTo.targetNode = walkTo.path.pop();
        walkTo.targetOffset = { x: position.offset.x, y: position.offset.y };

        if (walkTo.targetNode.x < position.node.x) walkTo.targetOffset.x = 0;
        else if (walkTo.targetNode.x > position.node.x) walkTo.targetOffset.x = game.offsetSize - 1;

        if (walkTo.targetNode.y < position.node.y) walkTo.targetOffset.y = 0;
        else if (walkTo.targetNode.y > position.node.y) walkTo.targetOffset.y = game.offsetSize - 1;
      } else {
        walkTo.targetNode = position.node;
        walkTo.targetOffset = walkTo.offset;
      }
    }

    if (
      position.offset.x === walkTo.targetOffset.x &&
      position.offset.y === walkTo.targetOffset.y
    ) {
      if (walkTo.targetNode !== position.node && this.isWalkable(walkTo.targetNode)) {
        this.updateTargetNode();
      } else {
        this.action = UnitAction.nothing;
        this.walkTo = {};
      }
    } else {
      const dir = [];
      if (walkTo.targetOffset.x > position.offset.x) {
        position.offset.x++;
        dir.push(Direction.right);
      } else if (walkTo.targetOffset.x < position.offset.x) {
        position.offset.x--;
        dir.push(Direction.left);
      }
      if (walkTo.targetOffset.y > position.offset.y) {
        position.offset.y++;
        dir.push(Direction.down);
      } else if (walkTo.targetOffset.y < position.offset.y) {
        position.offset.y--;
        dir.push(Direction.up);
      }

      if (this.animate.source.downleft && dir.length === 2) {
        if (dir.includes(Direction.up) && dir.includes(Direction.right)) this.walk(Direction.upright);
        else if (dir.includes(Direction.up) && dir.includes(Direction.left)) this.walk(Direction.upleft);
        else if (dir.includes(Direction.down) && dir.includes(Direction.right)) this.walk(Direction.downright);
        else if (dir.includes(Direction.down) && dir.includes(Direction.left)) this.walk(Direction.downleft);
      } else {
        this.walk(dir.pop());
      }
    }
  }

  attack(target) {
    const game = getGame();
    switch (this.type) {
      case UnitType.chauncey:
        this.frame = 0;
        this.animate.sx = this.frame * this.sWidth;
        if (this.dizziness > 140) {
          this.action = UnitAction.dizzy;
          this.animate.sy = this.animate.source.dizzy.sy;
        } else {
          this.action = UnitAction.attacking;
          this.animate.sy = this.animate.source.attack.sy;
        }
        break;
      case UnitType.guard:
      case UnitType.patrolGuard: {
        this.frame = ++this.frame > 3 ? 0 : this.frame;
        this.animate.sy = this.animate.source.attack.sy;
        this.animate.sx = this.frame * this.sWidth;
        this.action = UnitAction.attacking;
        if (this.frame % 2) target?.gotAttacked(this.strength);
        if (target?.life < 1) {
          this.target = null;
          this.action = UnitAction.nothing;
          this.walk(Direction.down);
        }
        break;
      }
      case UnitType.arrow:
        target?.gotAttacked(this.strength);
        game.units.removeArrow(this);
        break;
    }
  }

  isBuildable(pos) {
    const game = getGame();
    const { node, offset } = pos;
    const unitsOnSameNode = game.units.all.filter((u) => u.position.node === node);
    return (
      unitsOnSameNode.length < 5 &&
      !unitsOnSameNode.some(
        (u) =>
          (u.position.offset.x === offset.x && u.position.offset.y === offset.y) ||
          u.type === UnitType.catapult
      ) &&
      [LandType.grass, LandType.road].includes(node.type)
    );
  }

  restoreStart() {
    this.life = this.start.life;
    this.position.node = this.start.position.node;
    this.position.offset.x = this.start.position.offset.x;
    this.position.offset.y = this.start.position.offset.y;
    this.action = UnitAction.nothing;
    this.walk(Direction.down);
  }

  getHordelingWithinRange(includeFlying = false) {
    const game = getGame();
    return game.horde.hordelings.reduce(
      (current, h) => {
        if (h.action !== UnitAction.dead && (includeFlying || !h.isFlying)) {
          const dist = h.getOffsetDistanceFrom(this).dist;
          if (dist < this.range && dist >= this.minRange && dist < current.dist) {
            return { h, dist };
          }
        }
        return current;
      },
      { dist: Infinity }
    ).h;
  }

  getOffsetDistanceFrom(from) {
    const game = getGame();
    const offsetsInANode = game.nodeSize / game.offsetSize;
    let dist = 100;
    const dir = [];

    if (from.position) {
      let dx;
      let dy;
      if (from.position.offset) {
        dx =
          this.position.node.x * offsetsInANode +
          this.position.offset.x -
          from.position.node.x * offsetsInANode -
          from.position.offset.x;
        dy =
          this.position.node.y * offsetsInANode +
          this.position.offset.y -
          from.position.node.y * offsetsInANode -
          from.position.offset.y;
      } else {
        const fakeOffset = { x: 0, y: 0 };
        if (this.position.node.x === from.position.node.x) {
          fakeOffset.x = this.position.offset.x;
        } else if (this.position.node.x > from.position.node.x) {
          fakeOffset.x = offsetsInANode - 1;
        }
        if (this.position.node.y === from.position.node.y) {
          fakeOffset.y = this.position.offset.y;
        } else if (this.position.node.y > from.position.node.y) {
          fakeOffset.y = offsetsInANode - 1;
        }
        dx =
          this.position.node.x * offsetsInANode +
          this.position.offset.x -
          from.position.node.x * offsetsInANode -
          fakeOffset.x;
        dy =
          this.position.node.y * offsetsInANode +
          this.position.offset.y -
          from.position.node.y * offsetsInANode -
          fakeOffset.y;
      }
      dist = Math.sqrt(dx * dx + dy * dy) - (this.bulk | 0);

      if (dx > 0) dir.push(Direction.left);
      else if (dx < 0) dir.push(Direction.right);
      if (dy > 0) dir.push(Direction.up);
      else if (dy < 0) dir.push(Direction.down);
    }
    return { dist, dir };
  }
}

Unit.actions = UnitAction;
Unit.directions = Direction;
Unit.types = UnitType;
