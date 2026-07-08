import { LandType, Phase, TargetType, UnitAction } from '../config/constants.js';
import {
  drawBuildingWithShadow,
  drawCowOnGrass,
  drawDamageText,
  drawFightCloud,
  drawHealthBar,
  drawPlayerRing,
  drawTerrainTile,
  drawUnitShadow,
  drawVignette,
  tintRoadImage,
} from './tileArt.js';

const MAP_UI = { x: 1390, y: 590, width: 310, height: 310 };
const HORDELING_COUNTER = { x: 1350, y: 50 };

const PROCEDURAL_TERRAIN = new Set([
  LandType.grass,
  LandType.water,
  LandType.field,
  LandType.black,
]);

const BUILDING_TYPES = new Set([
  LandType.house,
  LandType.mill,
  LandType.castle,
  LandType.spikePit,
  LandType.rubbleHouse,
  LandType.rubbleField,
]);

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
    this.ctx.imageSmoothingEnabled = false;
  }

  invalidateMinimap() {
    this._minimapDirty = true;
  }

  draw(game) {
    const ctx = this.ctx;
    const canvas = game._renderer?.mapCanvas ?? this.mapCanvas;
    const ticker = game.ticker;

    this._drawSky(ctx);

    const textsToAnimate = [];

    for (const node of game.screen) {
      const pts = this._getNodeXY(game, node);
      this._drawTile(game, ctx, node, pts, ticker);
    }

    this.chaunceyDx = this.chaunceyDx || (canvas.width - game.player.animate.sWidth) / 2;
    this.chaunceyDy = this.chaunceyDy || (canvas.height - game.player.animate.sHeight) / 2;

    if (game.phase.current === Phase.Battle) {
      this._drawBattle(game, ctx, textsToAnimate, ticker);
    } else if (game.phase.current === Phase.Build) {
      this._drawBuildPreview(game, ctx);
      this._drawSortedMobs(
        game,
        ctx,
        textsToAnimate,
        game.units.alive().map((u) => ({ mob: u, isPlayer: false }))
      );
    }

    for (const txt of textsToAnimate) {
      drawDamageText(ctx, txt.text, txt.x, txt.y, txt.count);
    }

    drawVignette(ctx, this.gameCanvas.width, this.gameCanvas.height);
    this._drawMinimap(game);
    this._drawHudPanel(game, ctx);
  }

  _drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.gameCanvas.height);
    g.addColorStop(0, '#3a5a7a');
    g.addColorStop(0.4, '#6a9a6a');
    g.addColorStop(1, '#5a8a58');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }

  _drawTile(game, ctx, node, pts, ticker) {
    const { x, y } = pts;
    const size = game.nodeSize;

    if (node.type === LandType.road) {
      const neys = game.map
        .getNeighbors(node)
        .filter((n) => n.type === LandType.road && !n.isDiagonal(node));
      let img;
      if (neys.some((n) => n.x === node.x) && neys.some((n) => n.y === node.y)) {
        img = game.assets.get('pathB');
      } else if (neys.some((n) => n.x === node.x)) {
        img = game.assets.get('pathV');
      } else {
        img = game.assets.get('pathH');
      }
      if (img) tintRoadImage(ctx, img, x, y, size);
      else drawTerrainTile(ctx, LandType.grass, x, y, size, node.x, node.y, ticker);
      return;
    }

    if (PROCEDURAL_TERRAIN.has(node.type)) {
      drawTerrainTile(ctx, node.type, x, y, size, node.x, node.y, ticker);
      return;
    }

    if (node.type === LandType.cow) {
      drawCowOnGrass(ctx, game.assets.get('cow'), x, y, size, node.x, node.y, ticker);
      return;
    }

    if (BUILDING_TYPES.has(node.type)) {
      drawBuildingWithShadow(ctx, game.assets.get(node.type), x, y, size, node.x, node.y, ticker);
      return;
    }

    const img = game.assets.get(node.type);
    if (img) ctx.drawImage(img, x, y, size, size);
  }

  _drawBattle(game, ctx, textsToAnimate, ticker) {
    const dead = [];
    const aliveMobs = [];

    for (const h of game.horde.hordelings) {
      (h.action === UnitAction.dead ? dead : aliveMobs).push({ mob: h, isPlayer: false });
    }
    for (const u of game.units.all) {
      if (u.action === UnitAction.dead) dead.push({ mob: u, isPlayer: false });
    }

    dead.forEach((d) => this._drawMob(game, d.mob, ctx, textsToAnimate, { ghost: true }));

    const sorted = [
      ...aliveMobs,
      ...game.units.alive().map((u) => ({ mob: u, isPlayer: false })),
      ...game.units.arrows.map((a) => ({ mob: a, isPlayer: false })),
      { mob: game.player, isPlayer: true },
    ];
    this._drawSortedMobs(game, ctx, textsToAnimate, sorted, ticker);

    for (const t of game.horde.targets) {
      if (!t.position.node.canvas) continue;
      if (t.type === TargetType.villager) {
        this._drawMob(game, t, ctx, textsToAnimate);
      }
      if (t.underAttack && [TargetType.villager, TargetType.cow].includes(t.type)) {
        const pts = this._getNodeXY(game, t.position.node);
        drawFightCloud(ctx, pts.x, pts.y, game.nodeSize, ticker);
      }
      if (t.life !== undefined && t.start?.life) {
        const pts = this._getNodeXY(game, t.position.node);
        drawHealthBar(ctx, pts.x + 10, pts.y + 10, game.nodeSize - 20, t.life, t.start.life);
      }
    }
  }

  _drawSortedMobs(game, ctx, textsToAnimate, mobs, ticker = 0) {
    const withY = mobs
      .map(({ mob, isPlayer }) => {
        if (isPlayer) {
          return { mob, isPlayer, sortY: this.chaunceyDy, useFixed: true };
        }
        if (!mob.position?.node?.canvas) return null;
        const pts = this._getNodeXY(game, mob.position.node);
        const cy = pts.y + mob.position.offset.y * game.offsetSize - (mob.animate?.sHeight ?? 0) / 2;
        return { mob, isPlayer, sortY: cy };
      })
      .filter(Boolean)
      .sort((a, b) => a.sortY - b.sortY);

    for (const { mob, isPlayer } of withY) {
      if (isPlayer) {
        drawPlayerRing(ctx, this.chaunceyDx, this.chaunceyDy, mob.animate.sWidth, mob.animate.sHeight, ticker);
        this._drawCharacter(ctx, mob.animate, this.chaunceyDx, this.chaunceyDy, true);
        drawHealthBar(ctx, this.chaunceyDx, this.chaunceyDy, mob.animate.sWidth, mob.life, mob.start?.life ?? 10);
        mob.animate.lifeLossTexts = mob.animate.lifeLossTexts.filter((txt) => {
          if (txt.count) txt.count++;
          else {
            txt.x = this.chaunceyDx;
            txt.y = this.chaunceyDy;
            txt.count = 1;
          }
          return txt.count < 50;
        });
        textsToAnimate.push(...mob.animate.lifeLossTexts);
      } else {
        this._drawMob(game, mob, ctx, textsToAnimate);
      }
    }
  }

  _drawBuildPreview(game, ctx) {
    if (!game.hover?.node || !game.selectedBuildOption) return;
    const opt = game.selectedBuildOption;
    const pts = this._getNodeXY(game, game.hover.node);
    const size = game.nodeSize;

    ctx.save();
    ctx.globalAlpha = 0.65;

    if (opt.type === 'unit' && opt.model) {
      const cx = pts.x + game.hover.offset.x * game.offsetSize - opt.model.sWidth / 2;
      const cy = pts.y + game.hover.offset.y * game.offsetSize - opt.model.sHeight / 2;
      drawUnitShadow(ctx, cx, cy, opt.model.sWidth, opt.model.sHeight);
      this._drawCharacter(ctx, opt.model.animate, cx, cy);
    } else if (opt.type === 'land' && opt.img) {
      if (opt.img === LandType.cow) {
        drawCowOnGrass(ctx, game.assets.get('cow'), pts.x, pts.y, size, game.hover.node.x, game.hover.node.y, 0);
      } else if (PROCEDURAL_TERRAIN.has(opt.img)) {
        drawTerrainTile(ctx, opt.img, pts.x, pts.y, size, game.hover.node.x, game.hover.node.y, 0);
      } else {
        drawBuildingWithShadow(ctx, game.assets.get(opt.img), pts.x, pts.y, size, game.hover.node.x, game.hover.node.y, 0);
      }
    } else if (opt.type === 'remove') {
      ctx.fillStyle = 'rgba(255, 77, 77, 0.45)';
      ctx.fillRect(pts.x, pts.y, size, size);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(pts.x + 2, pts.y + 2, size - 4, size - 4);
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 100, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(pts.x + 1, pts.y + 1, size - 2, size - 2);
    ctx.setLineDash([]);
  }

  _drawMob(game, mob, ctx, textsToAnimate, opts = {}) {
    if (!mob.position?.node?.canvas) return;
    const pts = this._getNodeXY(game, mob.position.node);
    const w = mob.animate?.sWidth ?? 56;
    const h = mob.animate?.sHeight ?? 56;
    mob.animate.canvasX = pts.x + mob.position.offset.x * game.offsetSize - w / 2;
    mob.animate.canvasY = pts.y + mob.position.offset.y * game.offsetSize - h / 2;

    if (opts.ghost) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.filter = 'grayscale(0.8)';
    }

    drawUnitShadow(ctx, mob.animate.canvasX, mob.animate.canvasY, w, h);
    this._drawCharacter(ctx, mob.animate, mob.animate.canvasX, mob.animate.canvasY);

    if (mob.life !== undefined && mob.start?.life) {
      drawHealthBar(ctx, mob.animate.canvasX, mob.animate.canvasY, w, mob.life, mob.start.life);
    }

    if (opts.ghost) ctx.restore();

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

  _drawCharacter(ctx, anim, dx, dy, isPlayer = false) {
    if (!anim.img) return;
    ctx.drawImage(anim.img, anim.sx, anim.sy, anim.sWidth, anim.sHeight, dx, dy, anim.sWidth, anim.sHeight);
    if (isPlayer) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(dx, dy, anim.sWidth, anim.sHeight * 0.4);
    }
  }

  _drawHudPanel(game, ctx) {
    if (game.phase.current !== Phase.Battle) return;

    const x = HORDELING_COUNTER.x - 12;
    const y = HORDELING_COUNTER.y - 36;

    ctx.fillStyle = 'rgba(20, 10, 5, 0.75)';
    ctx.strokeStyle = 'rgba(180, 80, 60, 0.8)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, x, y, 280, 48, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ff6655';
    ctx.textAlign = 'start';
    ctx.fillText(`Hordelings: ${game.horde.aliveHordelings.length}`, HORDELING_COUNTER.x, HORDELING_COUNTER.y);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
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

    mapCtx.fillStyle = 'rgba(15, 10, 8, 0.85)';
    this._roundRect(mapCtx, mapUi.x, mapUi.y, mapUi.width, mapUi.height, 10);
    mapCtx.fill();
    mapCtx.strokeStyle = '#8b6914';
    mapCtx.lineWidth = 3;
    mapCtx.stroke();

    mapCtx.fillStyle = '#2d5a2d';
    mapCtx.fillRect(mapX, mapY, game.map.size * mapNodeSize, game.map.size * mapNodeSize);

    for (const dt of Object.keys(game.map.data ?? {})) {
      if (dt === LandType.grass) continue;
      game.map.data[dt]?.forEach((n) => {
        if (n.isVisible && n.x >= delta && n.y >= delta) {
          mapCtx.fillStyle = this._mapNodeColor(n);
          mapCtx.fillRect(
            mapX + (n.x - delta) * mapNodeSize,
            mapY + (n.y - delta) * mapNodeSize,
            mapNodeSize + 0.5,
            mapNodeSize + 0.5
          );
        }
      });
    }

    if (game.phase.current === Phase.Battle) {
      mapCtx.fillStyle = '#4488ff';
      mapCtx.fillRect(
        mapX + (game.player.position.node.x - delta) * mapNodeSize,
        mapY + (game.player.position.node.y - delta) * mapNodeSize,
        mapNodeSize,
        mapNodeSize
      );
      mapCtx.fillStyle = '#cc3333';
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

    mapCtx.fillStyle = '#888';
    game.units.alive().forEach((u) => {
      mapCtx.fillRect(
        mapX + (u.position.node.x - delta) * mapNodeSize,
        mapY + (u.position.node.y - delta) * mapNodeSize,
        mapNodeSize,
        mapNodeSize
      );
    });

    mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    mapCtx.lineWidth = 2;
    mapCtx.strokeRect(
      mapX + (game.player.position.node.x - delta - canvas.width / 2 / game.nodeSize) * mapNodeSize,
      mapY + (game.player.position.node.y - delta - canvas.height / 2 / game.nodeSize) * mapNodeSize,
      (canvas.width / game.nodeSize) * mapNodeSize,
      (canvas.height / game.nodeSize) * mapNodeSize
    );

    mapCtx.font = 'bold 12px sans-serif';
    mapCtx.fillStyle = '#d4b87a';
    mapCtx.fillText('MAP', mapUi.x + 14, mapUi.y + 22);

    this._minimapDirty = false;
  }

  _mapNodeColor(node) {
    const colors = {
      [LandType.black]: '#111',
      [LandType.field]: '#6a5520',
      [LandType.grass]: '#5a9a4a',
      [LandType.mill]: '#8a7a50',
      [LandType.house]: '#9a8a60',
      [LandType.castle]: '#7a6a48',
      [LandType.road]: '#c9a050',
      [LandType.rubbleField]: '#6a5030',
      [LandType.rubbleHouse]: '#5a3820',
      [LandType.water]: '#2a6090',
      [LandType.spikePit]: '#2a2a2a',
      [LandType.cow]: '#ddd',
    };
    return colors[node.type] ?? '#3a7a3a';
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
