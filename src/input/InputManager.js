import { LandType, Phase, UnitAction } from '../config/constants.js';
import { BUILD_OPTIONS } from '../config/constants.js';
import { createUnit } from '../units/createUnit.js';

export class InputManager {
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.game = null;
    this._pendingHover = null;
    this._hoverRaf = null;
  }

  attach(game) {
    this.game = game;

    this.canvas.addEventListener('pointerdown', (e) => this._onClick(e));
    this.canvas.addEventListener('pointermove', (e) => this._onHover(e));
    this.canvas.addEventListener('pointerleave', () => {
      game.hover = null;
    });

    // Edge-scroll must work when the bottom build toolbar overlaps the canvas
    this._onDocPointerMove = (e) => {
      if (game.phase.current === Phase.Build) {
        this._processBuildEdgeScroll(game, e.clientX, e.clientY);
      }
    };
    document.addEventListener('pointermove', this._onDocPointerMove);

    window.addEventListener('keydown', (e) => this._onKeyDown(e));
  }

  _clientToCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      inCanvasX: clientX >= rect.left && clientX <= rect.right,
    };
  }

  _processBuildEdgeScroll(game, clientX, clientY) {
    const canvas = this.canvas;
    const grid = game.map.grid;
    const current = game.player.position.node;
    const hoverSize = game.nodeSize / 2;
    const pos = this._clientToCanvas(clientX, clientY);

    if (!pos.inCanvasX || this.renderer.isOnMinimap(pos)) return;

    if (pos.y > canvas.height - hoverSize && grid[current.x]?.[current.y + 3]?.isVisible) {
      game.player.position.node = grid[current.x][current.y + 1];
      game.moveMap(game.player.position.node);
    } else if (pos.y < hoverSize && grid[current.x]?.[current.y - 3]?.isVisible) {
      game.player.position.node = grid[current.x][current.y - 1];
      game.moveMap(game.player.position.node);
    } else if (pos.x > canvas.width - hoverSize && grid[current.x + 3]?.[current.y]?.isVisible) {
      game.player.position.node = grid[current.x + 1][current.y];
      game.moveMap(game.player.position.node);
    } else if (pos.x < hoverSize && grid[current.x - 3]?.[current.y]?.isVisible) {
      game.player.position.node = grid[current.x - 1][current.y];
      game.moveMap(game.player.position.node);
    }
  }

  _onKeyDown(e) {
    const game = this.game;
    if (!game?.inGame) return;

    const key = e.key.toLowerCase();
    const grid = game.map.grid;
    const node = game.player.position.node;

    if (game.phase.current === Phase.Build) {
      const num = parseInt(key, 10);
      if (num >= 1 && num <= BUILD_OPTIONS.length) {
        const opt = BUILD_OPTIONS[num - 1];
        if (opt.price <= game.gold) {
          game.selectedBuildOption = this._makeBuildOption(opt);
        }
        e.preventDefault();
      }
      if (key === 'escape') {
        game.selectedBuildOption = null;
        e.preventDefault();
      }
      if (key === 'enter' || key === ' ') {
        game.setPhase(Phase.BattleStart);
        e.preventDefault();
      }
    }

    if ([Phase.Battle, Phase.Build].includes(game.phase.current)) {
      const moves = {
        w: [0, -1],
        s: [0, 1],
        a: [-1, 0],
        d: [1, 0],
      };
      if (moves[key]) {
        const [dx, dy] = moves[key];
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (grid[nx]?.[ny]?.isVisible) {
          game.player.position.node = grid[nx][ny];
          game.moveMap(game.player.position.node);
        }
        e.preventDefault();
      }
    }
  }

  _onClick(e) {
    const game = this.game;
    const pos = this.renderer.getCanvasPoints(e, this.canvas);
    const position = this.renderer.getPositionByPoints(game, pos);
    if (!position.node) return;

    switch (game.phase.current) {
      case Phase.Battle:
        this._handleBattleClick(game, pos, position);
        break;
      case Phase.Build:
        this._handleBuildClick(game, pos, position);
        break;
    }
  }

  _handleBattleClick(game, pos, position) {
    const p = game.player;
    if (
      [UnitAction.reeling, UnitAction.dizzy, UnitAction.dead, UnitAction.attacking].includes(
        p.action
      ) ||
      this.renderer.isOnMinimap(pos)
    ) {
      return;
    }

    const enemy = this.renderer.getHordelingAt(game, pos.x, pos.y);
    p.target = enemy ?? null;
    p.handleMovement(position.node, position.offset);
  }

  _handleBuildClick(game, pos, position) {
    if (this.renderer.isOnMinimap(pos)) {
      const node = this.renderer.getNodeFromMinimapClick(game, pos);
      if (node) {
        game.player.position.node = node;
        game.moveMap(node);
      }
      return;
    }

    const opt = game.selectedBuildOption;
    if (!opt || opt.price > game.gold) return;

    const { node, offset } = position;

    if (opt.type === 'unit' && opt.model?.isBuildable(position)) {
      const unit = createUnit(opt.model.type, node, offset);
      game.units.add(unit);
      game.gold -= opt.price;
      game.units.rebuildAlive();
    } else if (opt.type === 'land' && node.isBuildable()) {
      node.type = opt.img;
      game.gold -= opt.price;
      game._renderer.invalidateMinimap();
    } else if (opt.type === 'remove') {
      this._handleRemove(game, position, opt);
    }

    if (opt.price > game.gold) {
      game.selectedBuildOption = null;
    }
  }

  _handleRemove(game, position, opt) {
    const hoverUnit = game.units.all.reduce(
      (cur, u) => {
        if (u.position.node === game.hover?.node) {
          const dist = u.getOffsetDistanceFrom(game.hover).dist;
          if (dist < cur.dist) return { u, dist };
        }
        return cur;
      },
      { dist: Infinity }
    ).u;

    if (hoverUnit) {
      game.units.all = game.units.all.filter((u) => u !== hoverUnit);
      const price = BUILD_OPTIONS.find((o) => o.unitType === hoverUnit.type)?.price ?? 0;
      game.gold += price;
      game.units.rebuildAlive();
    } else if (
      [LandType.cow, LandType.spikePit].includes(position.node.type)
    ) {
      const price =
        BUILD_OPTIONS.find((o) => o.type === 'land' && o.img === position.node.type)?.price ?? 0;
      game.gold += price;
      position.node.type = LandType.grass;
      game._renderer.invalidateMinimap();
    }
  }

  _onHover(e) {
    this._pendingHover = e;
    if (!this._hoverRaf) {
      this._hoverRaf = requestAnimationFrame(() => {
        this._hoverRaf = null;
        if (this._pendingHover) this._processHover(this._pendingHover);
      });
    }
  }

  _processHover(e) {
    const game = this.game;
    const pos = this.renderer.getCanvasPoints(e, this.canvas);

    if (game.phase.current === Phase.Battle) {
      const onEnemy = !this.renderer.isOnMinimap(pos) && this.renderer.getHordelingAt(game, pos.x, pos.y);
      this.canvas.style.cursor = onEnemy ? 'pointer' : 'default';
      return;
    }

    if (game.phase.current === Phase.Build) {
      this._processBuildHover(game, pos, e);
    }
  }

  _processBuildHover(game, pos, e) {
    const canvas = this.canvas;

    game.hover = null;
    canvas.style.cursor = 'default';

    if (this.renderer.isOnMinimap(pos)) return;

    // Edge scrolling handled by document pointermove (_processBuildEdgeScroll)

    const position = this.renderer.getPositionByPoints(game, pos);
    const opt = game.selectedBuildOption;
    if (position.node && opt) {
      const canPlace =
        opt.type === 'unit'
          ? opt.model?.isBuildable(position)
          : opt.type === 'land'
            ? position.node.isBuildable()
            : true;
      if (canPlace) {
        game.hover = position;
        canvas.style.cursor = 'crosshair';
      } else {
        canvas.style.cursor = 'not-allowed';
      }
    }
  }

  _makeBuildOption(opt) {
    if (opt.type === 'unit') {
      return {
        ...opt,
        model: createUnit(opt.unitType, null),
      };
    }
    return { ...opt };
  }
}
