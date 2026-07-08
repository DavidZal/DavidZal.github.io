import { SAVE_KEY, SAVE_VERSION } from '../config/constants.js';
import { Map } from '../map/Map.js';
import { createUnit } from '../units/createUnit.js';

export class SaveManager {
  static save(game) {
    const saveObj = {
      version: SAVE_VERSION,
      date: new Date().toISOString(),
      gold: game.gold,
      life: game.player.life,
      round: game.phase.round,
      units: game.units.alive().map((u) => ({
        type: u.type,
        node: { x: u.position.node.x, y: u.position.node.y },
        offset: { x: u.position.offset.x, y: u.position.offset.y },
      })),
      hordeStrength: game.horde.hordeStrength,
      summary: game.summary,
      map: {
        size: game.map.size,
        fullSize: game.map.fullSize,
        nodes: game.map.nodes.map((n) => ({ type: n.type, x: n.x, y: n.y })),
      },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveObj));
    return true;
  }

  static hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static load(game) {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    let saveObj;
    try {
      saveObj = JSON.parse(raw);
    } catch {
      console.warn('Corrupt save file, ignoring');
      return false;
    }

    if (!saveObj.map?.nodes || !Array.isArray(saveObj.map.nodes)) {
      console.warn('Invalid save format');
      return false;
    }

    if (game.map.fullSize !== saveObj.map.fullSize) {
      game.map = new Map(saveObj.map.fullSize, 0);
    }

    game.map.size = saveObj.map.size;
    saveObj.map.nodes.forEach((n) => {
      if (game.map.grid[n.x]?.[n.y]) {
        game.map.grid[n.x][n.y].type = n.type;
      }
    });

    game.gold = saveObj.gold ?? 0;
    game.player.life = saveObj.life ?? 10;
    game.phase.round = saveObj.round ?? 0;
    game.horde.hordeStrength = saveObj.hordeStrength ?? 2;
    game.summary = saveObj.summary ?? null;
    game.units.all = (saveObj.units ?? []).map((u) =>
      createUnit(u.type, game.map.grid[u.node.x][u.node.y], { x: u.offset.x, y: u.offset.y })
    );
    game.units.rebuildAlive();
    game.map.data = game.map.getNodesByType();
    game.map.setVisible(game.map.size);
    return true;
  }
}
