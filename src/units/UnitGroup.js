import { UnitAction } from '../config/constants.js';
import { getGame } from '../core/GameContext.js';

export class UnitGroup {
  constructor(units) {
    this.units = [];
    this.hordelings = [];
    this.addUnits(units);
    UnitGroup.groups.push(this);
  }

  addUnits(units) {
    units.forEach((u) => {
      u.group = this;
      this.units.push(u);
    });
  }

  static groups = [];

  static init() {
    const game = getGame();
    UnitGroup.groups = UnitGroup.groups.filter((g) => g.units.length);

    let stationaryUnits = game.units.all.filter((u) => !u.isMobile);

    while (stationaryUnits.length) {
      recursiveAddToGroup(stationaryUnits.pop());
    }

    function recursiveAddToGroup(u) {
      const nearBy = stationaryUnits.filter(
        (b) => b !== u && u.position.node.distFromNode(b.position.node) < 2
      );

      if (nearBy.length > 1 || u.group) {
        stationaryUnits = stationaryUnits.filter((s) => !nearBy.includes(s));
        if (!u.group) u.group = new UnitGroup([u]);
        u.group.addUnits(nearBy);
        nearBy.forEach(recursiveAddToGroup);
      }
    }
  }

  static update() {
    const game = getGame();
    UnitGroup.groups.forEach((g) => {
      g.units = g.units.filter((u) => {
        const isAlive = u.action !== UnitAction.dead;
        if (!isAlive) u.group = undefined;
        return isAlive;
      });
      g.hordelings = game.horde.hordelings.filter(
        (h) => h.action !== UnitAction.dead && h.target && g === h.target.group
      );
    });
  }
}

export const unitGroup = UnitGroup;
