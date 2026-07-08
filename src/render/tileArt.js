import { LandType } from '../config/constants.js';

function hash(x, y, salt = 0) {
  let h = x * 374761393 + y * 668265263 + salt * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

function rand(x, y, salt = 0) {
  return hash(x, y, salt) / 0xffffffff;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/** Continuous 2D value noise — consistent across tile boundaries */
function noise2(wx, wy) {
  const ix = Math.floor(wx);
  const iy = Math.floor(wy);
  const fx = smoothstep(wx - ix);
  const fy = smoothstep(wy - iy);
  const a = rand(ix, iy);
  const b = rand(ix + 1, iy);
  const c = rand(ix, iy + 1);
  const d = rand(ix + 1, iy + 1);
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

function grassColorAt(wx, wy) {
  const n = noise2(wx * 0.06, wy * 0.06);
  const n2 = noise2(wx * 0.15 + 40, wy * 0.12 + 20) * 0.35;
  const v = n * 0.65 + n2;
  const hue = 98 + v * 20;
  const sat = 30 + v * 12;
  const light = 44 + v * 18;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export function drawTerrainTile(ctx, type, x, y, size, nodeX, nodeY, ticker = 0) {
  switch (type) {
    case LandType.grass:
      drawGrass(ctx, x, y, size, nodeX, nodeY);
      break;
    case LandType.water:
      drawWater(ctx, x, y, size, nodeX, nodeY, ticker);
      break;
    case LandType.field:
      drawField(ctx, x, y, size, nodeX, nodeY);
      break;
    case LandType.black:
      drawFog(ctx, x, y, size);
      break;
    default:
      return false;
  }
  if (type !== LandType.grass && type !== LandType.water && type !== LandType.field) {
    drawTileBorder(ctx, x, y, size, type);
  }
  return true;
}

function drawGrass(ctx, x, y, size, nx, ny) {
  const worldOx = nx * size;
  const worldOy = ny * size;
  const patches = 8;
  const ps = size / patches;

  // Smooth base — colors sampled in world space so adjacent tiles match at edges
  for (let py = 0; py < patches; py++) {
    for (let px = 0; px < patches; px++) {
      const wx = worldOx + px * ps + ps * 0.5;
      const wy = worldOy + py * ps + ps * 0.5;
      ctx.fillStyle = grassColorAt(wx, wy);
      ctx.fillRect(x + px * ps - 0.5, y + py * ps - 0.5, ps + 1, ps + 1);
    }
  }

  // Grass blades on a world-space lattice (not per-tile), with jitter
  const step = 11;
  const cellX0 = Math.floor(worldOx / step);
  const cellY0 = Math.floor(worldOy / step);
  const cellX1 = Math.ceil((worldOx + size) / step);
  const cellY1 = Math.ceil((worldOy + size) / step);

  for (let cy = cellY0; cy <= cellY1; cy++) {
    for (let cx = cellX0; cx <= cellX1; cx++) {
      const density = rand(cx, cy, 7);
      if (density < 0.22) continue;

      const wx = cx * step + rand(cx, cy, 1) * step;
      const wy = cy * step + rand(cx, cy, 2) * step;

      if (wx < worldOx || wx >= worldOx + size || wy < worldOy || wy >= worldOy + size) continue;

      const bx = x + (wx - worldOx);
      const by = y + (wy - worldOy);
      const bladeH = 5 + rand(cx, cy, 3) * 16;
      const lean = (rand(cx, cy, 4) - 0.5) * 10;
      const shade = rand(cx, cy, 5);

      ctx.strokeStyle = shade > 0.55 ? 'rgba(140, 210, 110, 0.45)' : 'rgba(70, 130, 55, 0.35)';
      ctx.lineWidth = 0.9 + rand(cx, cy, 6) * 0.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + lean, by - bladeH * 0.45, bx + lean * 0.4, by - bladeH);
      ctx.stroke();
    }
  }

  // Occasional flowers — world-positioned
  const flowerCell = Math.floor(worldOx / size) * 1000 + Math.floor(worldOy / size);
  if (rand(flowerCell, 0, 99) > 0.88) {
    const fx = x + rand(flowerCell, 1, 99) * size;
    const fy = y + rand(flowerCell, 2, 99) * size;
    ctx.fillStyle = rand(flowerCell, 3, 99) > 0.5 ? '#e8c840' : '#f0a0c0';
    ctx.beginPath();
    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWater(ctx, x, y, size, nx, ny, ticker) {
  const worldOx = nx * size;
  const worldOy = ny * size;
  const patches = 6;
  const ps = size / patches;

  for (let py = 0; py < patches; py++) {
    for (let px = 0; px < patches; px++) {
      const wx = worldOx + px * ps;
      const wy = worldOy + py * ps;
      const wave = Math.sin(ticker * 0.08 + wx * 0.04 + wy * 0.03) * 0.5 + 0.5;
      const n = noise2(wx * 0.05, wy * 0.05);
      ctx.fillStyle = `hsl(${205 + n * 8}, ${50 + wave * 12}%, ${26 + wave * 8 + n * 6}%)`;
      ctx.fillRect(x + px * ps - 0.5, y + py * ps - 0.5, ps + 1, ps + 1);
    }
  }

  ctx.strokeStyle = 'rgba(180, 230, 255, 0.12)';
  ctx.lineWidth = 1.5;
  const offset = ((ticker * 2 + worldOx * 0.3) % (size + 30)) - 15;
  ctx.beginPath();
  ctx.moveTo(x, y + offset);
  ctx.bezierCurveTo(x + size * 0.3, y + offset - 3, x + size * 0.7, y + offset + 3, x + size, y + offset);
  ctx.stroke();
}

function fieldSoilColor(wx, wy) {
  const n = noise2(wx * 0.18, wy * 0.16);
  const n2 = noise2(wx * 0.4 + 12, wy * 0.35 + 8) * 0.3;
  const v = n * 0.7 + n2;
  const hue = 28 + v * 10;
  const sat = 32 + v * 14;
  const light = 20 + v * 10;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function drawFieldSoil(ctx, x, y, size, nx, ny) {
  const worldOx = nx * size;
  const worldOy = ny * size;
  const patches = 8;
  const ps = size / patches;

  for (let py = 0; py < patches; py++) {
    for (let px = 0; px < patches; px++) {
      const wx = worldOx + px * ps;
      const wy = worldOy + py * ps;
      ctx.fillStyle = fieldSoilColor(wx, wy);
      ctx.fillRect(x + px * ps - 0.5, y + py * ps - 0.5, ps + 1, ps + 1);
    }
  }
}

function drawWheatStalk(ctx, bx, by, h, lean, ripeness) {
  const stemH = h * 0.58;
  const headH = h * 0.42;
  const topX = bx + lean * 0.35;
  const topY = by - stemH;

  ctx.strokeStyle = ripeness > 0.45 ? '#3d7028' : '#4a8530';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(topX, topY);
  ctx.stroke();

  ctx.strokeStyle = ripeness > 0.55 ? '#e8b828' : '#c89018';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(topX + lean * 0.25, topY - headH);
  ctx.stroke();

  ctx.strokeStyle = '#f0d040';
  ctx.lineWidth = 0.7;
  const bristles = 3 + Math.floor(ripeness * 3);
  for (let j = 0; j < bristles; j++) {
    const t = j / bristles;
    const px = topX + lean * 0.25 * t;
    const py = topY - headH * t;
    const dir = j % 2 === 0 ? 2 : -2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + dir, py - 2);
    ctx.stroke();
  }
}

function drawWheatField(ctx, x, y, size, nx, ny) {
  const rows = 11;
  const margin = 5;
  const rowH = (size - margin * 2) / rows;

  for (let row = 0; row < rows; row++) {
    const stalksInRow = 16;
    const ry = y + margin + row * rowH + rowH * 0.85;
    const stagger = (row % 2) * ((size - margin * 2) / stalksInRow / 2);

    for (let col = 0; col < stalksInRow; col++) {
      const bx = x + margin + stagger + col * ((size - margin * 2) / stalksInRow);
      const h = 16 + rand(nx, ny, row * 100 + col) * 12;
      const lean = (rand(nx, ny, row * 50 + col + 1) - 0.5) * 4;
      const ripeness = rand(nx, ny, row * 30 + col + 2);
      drawWheatStalk(ctx, bx, ry, h, lean, ripeness);
    }
  }
}

function drawCornStalk(ctx, cx, baseY, h, nx, ny, row, col) {
  const topY = baseY - h;

  ctx.strokeStyle = '#2d6a22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.lineTo(cx, topY);
  ctx.stroke();

  ctx.fillStyle = '#3d8a2a';
  ctx.beginPath();
  ctx.ellipse(cx - 7, baseY - h * 0.45, 8, 3, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, baseY - h * 0.58, 8, 3, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e0b020';
  ctx.fillRect(cx - 2, baseY - h * 0.68, 4, 9);
  ctx.fillStyle = '#f0d038';
  ctx.fillRect(cx - 1, baseY - h * 0.66, 2, 3);

  if (rand(nx, ny, row * 11 + col + 40) > 0.55) {
    ctx.fillStyle = '#c8a018';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx - 3, topY - 5);
    ctx.lineTo(cx + 3, topY - 5);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCornField(ctx, x, y, size, nx, ny) {
  const cols = 5;
  const rows = 5;
  const margin = 8;
  const cellW = (size - margin * 2) / cols;
  const baseY = y + size - margin;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = x + margin + col * cellW + cellW * 0.5;
      const h = 32 + rand(nx, ny, row * 10 + col) * 18;
      drawCornStalk(ctx, cx, baseY - row * 2, h, nx, ny, row, col);
    }
  }
}

function drawLeafyField(ctx, x, y, size, nx, ny) {
  const rows = 5;
  const rowH = size / rows;

  for (let row = 0; row < rows; row++) {
    const ry = y + row * rowH;
    if (row > 0) {
      ctx.fillStyle = 'rgba(25, 15, 5, 0.45)';
      ctx.fillRect(x + 3, ry - 1, size - 6, 5);
    }

    const plants = 7;
    for (let col = 0; col < plants; col++) {
      const px = x + 10 + col * ((size - 20) / plants) + rand(nx, ny, row * 20 + col) * 5;
      const py = ry + rowH * 0.58;
      const r = 6 + rand(nx, ny, row * 10 + col + 5) * 5;

      ctx.fillStyle = '#2a5520';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a9035';
      ctx.beginPath();
      ctx.arc(px - 2, py - 2, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6ab84a';
      ctx.beginPath();
      ctx.arc(px + 1, py - 3, r * 0.52, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFlowerField(ctx, x, y, size, nx, ny) {
  const inset = 5;
  const plotX = x + inset;
  const plotY = y + inset;
  const plotW = size - inset * 2;
  const plotH = size - inset * 2;

  const g = ctx.createLinearGradient(plotX, plotY, plotX, plotY + plotH);
  g.addColorStop(0, '#2d5c2a');
  g.addColorStop(1, '#1a3a18');
  ctx.fillStyle = g;
  ctx.fillRect(plotX, plotY, plotW, plotH);

  const rows = 9;
  const cols = 12;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (rand(nx, ny, row * 100 + col + 80) < 0.12) continue;
      const fx = plotX + 4 + col * (plotW / cols) + (row % 2) * 3;
      const fy = plotY + 4 + row * (plotH / rows);
      ctx.fillStyle = '#e8e8d8';
      ctx.fillRect(fx, fy, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fx + 1, fy, 1, 1);
    }
  }
}

function drawFieldPlotEdge(ctx, x, y, size) {
  const rim = 4;
  ctx.fillStyle = 'rgba(20, 12, 4, 0.55)';
  ctx.fillRect(x, y, size, rim);
  ctx.fillRect(x, y + size - rim, size, rim);
  ctx.fillRect(x, y, rim, size);
  ctx.fillRect(x + size - rim, y, rim, size);
}

function drawField(ctx, x, y, size, nx, ny) {
  drawFieldSoil(ctx, x, y, size, nx, ny);

  const variant = rand(nx, ny, 50);
  if (variant < 0.4) {
    drawWheatField(ctx, x, y, size, nx, ny);
  } else if (variant < 0.65) {
    drawCornField(ctx, x, y, size, nx, ny);
  } else if (variant < 0.82) {
    drawLeafyField(ctx, x, y, size, nx, ny);
  } else {
    drawFlowerField(ctx, x, y, size, nx, ny);
  }

  drawFieldPlotEdge(ctx, x, y, size);
}

function drawFog(ctx, x, y, size) {
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = 'rgba(30, 30, 40, 0.4)';
  ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
}

function drawTileBorder(ctx, x, y, size, type) {
  if (type === LandType.black) return;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
}

export function drawBuildingWithShadow(ctx, img, x, y, size, nodeX, nodeY, ticker = 0) {
  drawTerrainTile(ctx, LandType.grass, x, y, size, nodeX, nodeY, ticker);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size - 6, size * 0.38, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  if (img) {
    const scale = (size * 0.88) / Math.max(img.width, img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const dx = x + (size - w) / 2;
    const dy = y + (size - h) / 2 + size * 0.04;
    ctx.drawImage(img, dx, dy, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(dx, dy, w, h * 0.3);
  }
}

export function drawUnitShadow(ctx, dx, dy, w, h) {
  const footX = dx + w / 2;
  const footY = dy + h - 4;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(footX, footY, w * 0.35, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFightCloud(ctx, x, y, size, ticker) {
  const pulse = 0.85 + Math.sin(ticker * 0.25) * 0.15;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.35 * pulse;

  for (let i = 0; i < 5; i++) {
    const angle = (ticker * 0.1 + i * 1.2) % (Math.PI * 2);
    const puffX = cx + Math.cos(angle) * r * 0.6;
    const puffY = cy + Math.sin(angle) * r * 0.4 - 10;
    const grad = ctx.createRadialGradient(puffX, puffY, 0, puffX, puffY, r * 0.7);
    grad.addColorStop(0, 'rgba(220, 220, 220, 0.9)');
    grad.addColorStop(0.5, 'rgba(180, 180, 180, 0.5)');
    grad.addColorStop(1, 'rgba(120, 120, 120, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(puffX, puffY, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawDamageText(ctx, text, x, y, count) {
  const ty = y - (count + 1) * 2;
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 3;
  ctx.strokeText(text, x + 20, ty);
  ctx.fillStyle = '#ff4444';
  ctx.fillText(text, x + 20, ty);
  ctx.textAlign = 'start';
}

export function drawHealthBar(ctx, x, y, w, life, maxLife) {
  if (maxLife <= 0) return;
  const barW = w;
  const barH = 5;
  const bx = x;
  const by = y - 10;
  const pct = Math.max(0, life / maxLife);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
  ctx.fillStyle = '#331111';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = pct > 0.3 ? '#44cc44' : '#cc4444';
  ctx.fillRect(bx, by, barW * pct, barH);
}

export function drawVignette(ctx, width, height) {
  const g = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.25,
    width / 2,
    height / 2,
    height * 0.85
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

export function drawPlayerRing(ctx, x, y, w, h, ticker) {
  const cx = x + w / 2;
  const cy = y + h - 8;
  const pulse = 1 + Math.sin(ticker * 0.15) * 0.08;
  ctx.strokeStyle = `rgba(255, 215, 80, ${0.5 + Math.sin(ticker * 0.1) * 0.2})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.4 * pulse, h * 0.12 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function tintRoadImage(ctx, img, x, y, size) {
  ctx.drawImage(img, x, y, size, size);
  ctx.fillStyle = 'rgba(180, 140, 80, 0.15)';
  ctx.fillRect(x, y, size, size);
}

/** Grass tile + user's cow sprite (transparent PNG) */
export function drawCowOnGrass(ctx, cowImg, x, y, size, nodeX, nodeY, ticker = 0) {
  drawTerrainTile(ctx, LandType.grass, x, y, size, nodeX, nodeY, ticker);
  if (cowImg) drawCowImage(ctx, cowImg, x, y, size);
}

export function drawCowImage(ctx, img, x, y, size) {
  const scale = (size * 0.82) / Math.max(img.width, img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const dx = x + (size - w) / 2;
  const dy = y + (size - h) / 2 + size * 0.06;
  drawUnitShadow(ctx, dx, dy, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(dx + w * 0.12, dy + h * 0.1, w * 0.76, h * 0.72);
  ctx.drawImage(img, dx, dy, w, h);
}
