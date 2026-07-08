import { LandType } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';

export class LandNode {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.weight = 1;
  }

  createId() {
    return `node-${this.x}-${this.y}`;
  }

  distFromNode(other) {
    const d1 = Math.abs(this.x - other.x);
    const d2 = Math.abs(this.y - other.y);
    return Math.sqrt(d1 * d1 + d2 * d2);
  }

  isBuildable(units) {
    const unitList = units ?? getGame().units.all;
    return (
      this.type === LandType.grass &&
      !unitList.some((u) => u.position.node === this)
    );
  }

  isDiagonal(other) {
    return this.x !== other.x && this.y !== other.y;
  }

  isWalkable() {
    return ![
      LandType.black,
      LandType.water,
      LandType.house,
      LandType.mill,
      LandType.castle,
    ].includes(this.type);
  }

  getCost(fromNeighbor) {
    if (fromNeighbor && fromNeighbor.x !== this.x && fromNeighbor.y !== this.y) {
      return this.weight * 1.41421;
    }
    return this.weight;
  }

  getStrength() {
    return this.type === LandType.spikePit ? 1 : 0;
  }
}

LandNode.types = LandType;
