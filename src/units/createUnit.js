import { UnitAction } from '../config/constants.js';
import { UnitType } from '../config/constants.js';
import { Archer } from './Archer.js';
import { Catapult } from './Catapult.js';
import { Fireball } from './Fireball.js';
import { Hordeling } from './Hordeling.js';
import { Knight } from './Knight.js';
import { Shaman } from './Shaman.js';
import { Unit } from './Unit.js';

export class UnitRegistry {
  constructor() {
    this.all = [];
    this.arrows = [];
    this.castles = [];
    this._aliveCache = [];
    this._aliveDirty = true;
  }

  alive() {
    if (this._aliveDirty) this.rebuildAlive();
    return this._aliveCache;
  }

  rebuildAlive() {
    this._aliveCache = this.all.filter((u) => u.action !== UnitAction.dead);
    this._aliveDirty = false;
  }

  add(unit) {
    this.all.push(unit);
    this._aliveDirty = true;
  }

  addArrow(arrow) {
    this.arrows.push(arrow);
  }

  removeArrow(arrow) {
    this.arrows = this.arrows.filter((a) => a !== arrow);
  }

  onUnitDied(unit) {
    this._aliveDirty = true;
    if (unit.group) {
      unit.group.units = unit.group.units.filter((u) => u !== unit);
    }
  }

  clearArrows() {
    this.arrows = [];
  }
}

export function createUnit(type, node, offset) {
  switch (type) {
    case UnitType.knight:
      return new Knight(type, node, offset);
    case UnitType.archer:
      return new Archer(type, node, offset);
    case UnitType.catapult:
      return new Catapult(type, node, offset);
    case UnitType.fireball:
      return new Fireball(type, node, offset);
    case UnitType.hordeling1:
    case UnitType.hordeling2:
    case UnitType.hordeling3:
      return new Hordeling(type, node, offset);
    case UnitType.hordeling4:
      return new Shaman(node);
    default:
      return new Unit(type, node, offset);
  }
}

export function createHordeling(type, node) {
  if (type === UnitType.hordeling4) return new Shaman(node);
  return new Hordeling(type, node);
}
