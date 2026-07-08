import { LandType, Phase, TargetType, UnitAction } from '../config/constants.js';

const MAP_UI = { x: 1390, y: 590, width: 310, height: 310 };
const HORDELING_COUNTER = { x: 1350, y: 50 };

export class CanvasRenderer {
  constructor(gameCanvas, mapCanvas) {
    this.gameCanvas = gameCanvas;
    this.mapCanvas = mapCanvas;
    this.ctx = gameCanvas.getContext('2d');
    this.mapCtx = mapCanvas.getContext('2d');
    this.chaunceyDx = 0;
    this.chaunceyDy = 0;
    this._minimapDirty = true;
    this._minimapTick = 0;
  }

  invalidateMinimap() {
    this._minimapDirty = true;
  }

  draw(game) {
    const ctx = this.ctx;
    const canvas = game._renderer?.mapCanvas ?? this.mapCanvas;

    ctx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

    const textsToAnimate = [];

    for (const node of game.screen) {
      let img;
      if (node.type === LandType.road) {
        const neys = game.map
          .getNeighbors(node)
          .filter((n) => n.type === LandType.road && !n.isDiagonal(node));
        if (neys.some((n) => n.x === node.x) && neys.some((n) => n.y === node.y)) {
          img = game.assets.get('pathB');
        } else if (neys.some((n) => n.x === node.x)) {
          img = game.assets.get('pathV');
        } else {
          img = game.assets.get('pathH');
        }
      } else {
        img = game.assets.get(node.type);
      }
      const pts = this._getNodeXY(game, node);
      if (img) ctx.drawImage(img, pts.x, pts.y);
    }

    this.chaunceyDx = this.chaunceyDx || (canvas.width - game.player.animate.sWidth) / 2;
    this.chaunceyDy = this.chaunceyDy || (canvas.height - game.player.animate.sHeight) / 2;

    if (game.phase.current === Phase.Battle) {
      this._drawBattle(game, ctx, textsToAnimate);
    } else if (game.phase.current === Phase.Build) {
      this._drawBuildPreview(game, ctx);
      game.units.alive().forEach((u) => this._drawMob(game, u, ctx, textsToAnimate));
    }

    for (const txt of textsToAnimate) {
      ctx.font = '20px Calibri, sans-serif';
      ctx.fillStyle = 'red';
      ctx.fillText(txt.text, txt.x, txt.y - (txt.count + 1) * 2);
    }

    this._drawMinimap(game);
  }

  _drawBattle(game, ctx, textsToAnimate) {
    const dead = game.horde.hordelings.filter((h) => h.action === UnitAction.dead);
    const alive = game.horde.hordelings.filter((h) => h.action !== UnitAction.dead);

    dead.forEach((h) => this._drawMob(game, h, ctx, textsToAnimate));
    game.units.all
      .filter((u) => u.action === UnitAction.dead)
      .forEach((u) => this._drawMob(game, u, ctx, textsToAnimate));
    alive.forEach((h) => this._drawMob(game, h, ctx, textsToAnimate));

    this._drawCharacter(ctx, game.player.animate, this.chaunceyDx, this.chaunceyDy);

    game.player.animate.lifeLossTexts = game.player.animate.lifeLossTexts.filter((txt) => {
      if (txt.count) txt.count++;
      else {
        txt.x = this.chaunceyDx;
        txt.y = this.chaunceyDy;
        txt.count = 1;
      }
      return txt.count < 50;
    });
    textsToAnimate.push(...game.player.animate.lifeLossTexts);

    game.units.alive().forEach((u) => this._drawMob(game, u, ctx, textsToAnimate));
    game.units.arrows.forEach((a) => this._drawMob(game, a, ctx, textsToAnimate));

    for (const t of game.horde.targets) {
      if (!t.position.node.canvas) continue;
      if (t.type === TargetType.villager) this._drawMob(game, t, ctx, textsToAnimate);
      if (
        t.underAttack &&
        [TargetType.villager, TargetType.cow].includes(t.type)
      ) {
        const pts = this._getNodeXY(game, t.position.node);
        const img = game.assets.get('fightCloud');
        if (img) ctx.drawImage(img, pts.x, pts.y);
      }
    }

    ctx.font = '40px Calibri, sans-serif';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'start';
    ctx.fillText(
      `Hordelings: ${game.horde.aliveHordelings.length}`,
      HORDELING_COUNTER.x,
      HORDELING_COUNTER.y
    );
  }

  _drawBuildPreview(game, ctx) {
    if (!game.hover?.node || !game.selectedBuildOption) return;
    const opt = game.selectedBuildOption;
    const pts = this._getNodeXY(game, game.hover.node);

    if (opt.type === 'unit' && opt.model) {
      const cx = pts.x + game.hover.offset.x * game.offsetSize - opt.model.sWidth / 2;
      const cy = pts.y + game.hover.offset.y * game.offsetSize - opt.model.sHeight / 2;
      this._drawCharacter(ctx, opt.model.animate, cx, cy);
    } else if (opt.type === 'land' && opt.img) {
      const img = game.assets.get(opt.img);
      if (img) ctx.drawImage(img, pts.x, pts.y);
    } else if (opt.type === 'remove') {
      ctx.fillStyle = 'rgba(255, 77, 77, 0.5)';
      if ([LandType.cow, LandType.spikePit].includes(game.hover.node.type)) {
        ctx.fillRect(pts.x, pts.y, 100, 100);
      }
    }
  }

  _drawMob(game, mob, ctx, textsToAnimate) {
    if (!mob.position?.node?.canvas) return;
    const pts = this._getNodeXY(game, mob.position.node);
    mob.animate.canvasX = pts.x + mob.position.offset.x * game.offsetSize - mob.animate.sWidth / 2;
    mob.animate.canvasY = pts.y + mob.position.offset.y * game.offsetSize - mob.animate.sHeight / 2;
    this._drawCharacter(ctx, mob.animate, mob.animate.canvasX, mob.animate.canvasY);

    if (mob.animate.lifeLossTexts) {
      mob.animate.lifeLossTexts = mob.animate.lifeLossTexts.filter((txt) => {
        if (txt.count) txt.count++;
        else {
          txt.y = mob.animate.canvasY;
          txt.x = mob.animate.canvasX;
          txt.count = 1;
        }
        return txt.count < 50;
      });
      textsToAnimate.push(...mob.animate.lifeLossTexts);
    }
  }

  _drawCharacter(ctx, anim, dx, dy) {
    if (!anim.img) return;
    ctx.drawImage(anim.img, anim.sx, anim.sy, anim.sWidth, anim.sHeight, dx, dy, anim.sWidth, anim.sHeight);
  }

  _getNodeXY(game, node) {
    return {
      x:
        node.canvas.x * game.nodeSize -
        game.player.position.offset.x * game.offsetSize +
        Math.floor(game.nodeSize / 2),
      y:
        node.canvas.y * game.nodeSize -
        game.player.position.offset.y * game.offsetSize +
        Math.floor(game.nodeSize / 2),
    };
  }

  _drawMinimap(game) {
    this._minimapTick++;
    if (!this._minimapDirty && this._minimapTick % 3 !== 0) return;

    const mapCtx = this.mapCtx;
    const canvas = this.mapCanvas;
    mapCtx.clearRect(0, 0, canvas.width, canvas.height);

    const mapUi = MAP_UI;
    const mapX = mapUi.x + 10;
    const mapY = mapUi.y + 10;
    const delta = Math.round((game.map.fullSize - game.map.size) / 2);
    const mapNodeSize = (mapUi.width - 10) / game.map.size;

    mapCtx.fillStyle = 'darkgray';
    mapCtx.fillRect(mapUi.x, mapUi.y, mapUi.width, mapUi.height);
    mapCtx.fillStyle = 'green';
    mapCtx.fillRect(mapX, mapY, game.map.size * mapNodeSize, game.map.size * mapNodeSize);

    for (const dt of Object.keys(game.map.data ?? {})) {
      if (dt === LandType.grass) continue;
      game.map.data[dt]?.forEach((n) => {
        if (n.isVisible && n.x >= delta && n.y >= delta) {
          mapCtx.fillStyle = this._mapNodeColor(n);
          mapCtx.fillRect(
            mapX + (n.x - delta) * mapNodeSize,
            mapY + (n.y - delta) * mapNodeSize,
            mapNodeSize,
            mapNodeSize
          );
        }
      });
    }

    if (game.phase.current === Phase.Battle) {
      mapCtx.fillStyle = '#3366cc';
      mapCtx.fillRect(
        mapX + (game.player.position.node.x - delta) * mapNodeSize,
        mapY + (game.player.position.node.y - delta) * mapNodeSize,
        mapNodeSize,
        mapNodeSize
      );
      mapCtx.fillStyle = 'red';
      game.horde.activeHordelings.forEach((h) => {
        if (h.position.node.isVisible) {
          mapCtx.fillRect(
            mapX + (h.position.node.x - delta) * mapNodeSize,
            mapY + (h.position.node.y - delta) * mapNodeSize,
            mapNodeSize,
            mapNodeSize
          );
        }
      });
    }

    mapCtx.fillStyle = '#595959';
    game.units.alive().forEach((u) => {
      mapCtx.fillRect(
        mapX + (u.position.node.x - delta) * mapNodeSize,
        mapY + (u.position.node.y - delta) * mapNodeSize,
        mapNodeSize,
        mapNodeSize
      );
    });

    mapCtx.strokeStyle = '#ffffff';
    mapCtx.strokeRect(
      mapX + (game.player.position.node.x - delta - canvas.width / 2 / game.nodeSize) * mapNodeSize,
      mapY + (game.player.position.node.y - delta - canvas.height / 2 / game.nodeSize) * mapNodeSize,
      (canvas.width / game.nodeSize) * mapNodeSize,
      (canvas.height / game.nodeSize) * mapNodeSize
    );

    this._minimapDirty = false;
  }

  _mapNodeColor(node) {
    const colors = {
      [LandType.black]: 'black',
      [LandType.field]: '#00cc00',
      [LandType.grass]: 'green',
      [LandType.mill]: '#999966',
      [LandType.house]: '#999966',
      [LandType.castle]: '#999966',
      [LandType.road]: '#ffcc66',
      [LandType.rubbleField]: '#996633',
      [LandType.rubbleHouse]: '#663300',
      [LandType.water]: 'blue',
      [LandType.spikePit]: '#1a1a1a',
      [LandType.cow]: 'white',
    };
    return colors[node.type] ?? 'green';
  }

  getCanvasPoints(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  getPositionByPoints(game, pos) {
    const adjustedX =
      pos.x + game.player.position.offset.x * game.offsetSize - Math.floor(game.nodeSize / 2);
    const adjustedY =
      pos.y + game.player.position.offset.y * game.offsetSize - Math.floor(game.nodeSize / 2);
    const nodeX = Math.floor(adjustedX / game.nodeSize);
    const nodeY = Math.floor(adjustedY / game.nodeSize);
    const node = game.screen.find((n) => n.canvas?.x === nodeX && n.canvas?.y === nodeY);
    if (!node) return { node: null, offset: null };
    return {
      node,
      offset: {
        x: Math.floor((adjustedX % game.nodeSize) / game.offsetSize),
        y: Math.floor((adjustedY % game.nodeSize) / game.offsetSize),
      },
    };
  }

  getHordelingAt(game, x, y) {
    for (const h of game.horde.aliveHordelings) {
      if (
        x > h.animate.canvasX &&
        x < h.animate.canvasX + h.sWidth &&
        y > h.animate.canvasY &&
        y < h.animate.canvasY + h.sHeight
      ) {
        return h;
      }
    }
    return null;
  }

  isOnMinimap(pos) {
    return pos.x > MAP_UI.x && pos.y > MAP_UI.y;
  }

  getNodeFromMinimapClick(game, pos) {
    const mapX = Math.floor(
      ((pos.x - MAP_UI.x - 10) / (MAP_UI.width - 10)) * game.map.size +
        (game.map.fullSize - game.map.size) / 2
    );
    const mapY = Math.floor(
      ((pos.y - MAP_UI.y - 10) / (MAP_UI.height - 10)) * game.map.size +
        (game.map.fullSize - game.map.size) / 2
    );
    return game.map.nodes.find((n) => n.x === mapX && n.y === mapY) ?? null;
  }
}
