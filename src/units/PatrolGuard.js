import { Direction, LandType, UnitAction } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';
import { Unit } from './Unit.js';

const DETECTION_RANGE_TILES = 6;
const PATROL_LEG_TILES = 2;

export class PatrolGuard extends Unit {
  isWalkable(node) {
    if (!this.target) {
      return node.type === LandType.road && node.isVisible;
    }
    return super.isWalkable(node);
  }

  nodeDistanceTo(node) {
    return Math.max(
      Math.abs(this.position.node.x - node.x),
      Math.abs(this.position.node.y - node.y)
    );
  }

  getRoadNeighbors(node) {
    const game = getGame();
    return game.map
      .getNeighbors(node)
      .filter((n) => n.type === LandType.road && n.isVisible);
  }

  planPatrolDestination() {
    const current = this.position.node;
    const neighbors = this.getRoadNeighbors(current);
    if (!neighbors.length) return null;

    const first = neighbors[Math.floor(Math.random() * neighbors.length)];
    const dirX = Math.sign(first.x - current.x);
    const dirY = Math.sign(first.y - current.y);

    let destination = first;
    let node = first;

    for (let step = 1; step < PATROL_LEG_TILES; step++) {
      const game = getGame();
      const ahead = game.map.grid[node.x + dirX]?.[node.y + dirY];
      if (ahead?.type === LandType.road && ahead.isVisible) {
        destination = ahead;
        node = ahead;
      } else {
        break;
      }
    }

    return destination;
  }

  startPatrolLeg() {
    const game = getGame();
    const destination = this.planPatrolDestination();
    if (!destination) {
      this.walk(Direction.down);
      return;
    }

    this.handleMovement(destination, game.getRandomOffset());
    this.walkTo.destination = destination;
    this.walkTo.isPatrol = true;
  }

  getHordelingWithinDetectionRange() {
    const game = getGame();
    let nearest = null;
    let bestDist = DETECTION_RANGE_TILES + 1;

    for (const h of game.horde.hordelings) {
      if (h.action === UnitAction.dead || h.action === UnitAction.inactive) continue;
      if (h.isFlying) continue;
      const dist = this.nodeDistanceTo(h.position.node);
      if (dist <= DETECTION_RANGE_TILES && dist < bestDist) {
        bestDist = dist;
        nearest = h;
      }
    }

    return nearest;
  }

  chaseTarget(target) {
    const dest = target.position.node;
    const offset = target.position.offset;
    const walkTo = this.walkTo;

    if (
      walkTo.destination === dest &&
      walkTo.offset?.x === offset.x &&
      walkTo.offset?.y === offset.y &&
      walkTo.path?.length
    ) {
      return;
    }

    this.handleMovement(dest, offset);
    this.walkTo.destination = dest;
    this.walkTo.isPatrol = false;
  }

  ai() {
    switch (this.action) {
      case UnitAction.nothing: {
        const inMelee = this.getHordelingWithinRange();
        if (inMelee) {
          this.target = inMelee;
          this.attack(inMelee);
          break;
        }

        const detected = this.getHordelingWithinDetectionRange();
        if (detected) {
          this.target = detected;
          this.chaseTarget(detected);
        } else {
          this.target = null;
          this.startPatrolLeg();
        }
        break;
      }
      case UnitAction.walking:
        if (this.target?.action === UnitAction.dead) {
          this.action = UnitAction.nothing;
          this.target = null;
          this.walkTo = {};
        } else if (this.target && this.target.getOffsetDistanceFrom(this).dist < this.range) {
          this.attack(this.target);
        } else {
          const detected = this.getHordelingWithinDetectionRange();
          if (detected) {
            if (detected !== this.target) {
              this.target = detected;
            }
            if (!this.walkTo.path?.length && this.position.node !== detected.position.node) {
              this.chaseTarget(detected);
            } else {
              this.handleFrames();
            }
          } else {
            this.target = null;
            this.handleFrames();
          }
        }
        break;
      case UnitAction.attacking:
        if (this.target?.action === UnitAction.dead) {
          this.target = null;
          this.action = UnitAction.nothing;
          this.walk(Direction.down);
        } else if (this.target) {
          if (this.target.getOffsetDistanceFrom(this).dist > this.range) {
            this.action = UnitAction.nothing;
            this.chaseTarget(this.target);
          } else {
            this.attack(this.target);
          }
        } else {
          this.action = UnitAction.nothing;
        }
        break;
    }
  }
}
