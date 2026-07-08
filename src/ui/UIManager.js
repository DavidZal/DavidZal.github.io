import { BUILD_OPTIONS, Phase } from '../config/constants.js';
import { createUnit } from '../units/createUnit.js';

export class UIManager {
  constructor(root) {
    this.root = root;
    this._callbacks = {};
    this._els = {};
    this._buildModels = {};
  }

  on(event, cb) {
    this._callbacks[event] = cb;
  }

  setLoadProgress(pct) {
    const bar = this._els.loadBar;
    if (bar) bar.style.width = `${pct * 100}%`;
  }

  hideLoading() {
    this._els.loading?.classList.add('hidden');
  }

  showStartScreen(hasSave) {
    this._hideAll();
    this._els.start?.classList.remove('hidden');
    this._els.loadBtn?.classList.toggle('hidden', !hasSave);
  }

  onPhaseChange(phase) {
    this._hideAll();
    switch (phase) {
      case Phase.Start:
        break;
      case Phase.Build:
        this._els.hud?.classList.remove('hidden');
        this._els.buildMenu?.classList.remove('hidden');
        this._updateBuildUI();
        break;
      case Phase.Battle:
        this._els.hud?.classList.remove('hidden');
        break;
      case Phase.BattleEnd:
        this._els.hud?.classList.remove('hidden');
        this._els.summary?.classList.remove('hidden');
        break;
    }
  }

  _hideAll() {
    ['start', 'hud', 'buildMenu', 'summary', 'gameOver', 'toast'].forEach((id) => {
      this._els[id]?.classList.add('hidden');
    });
  }

  showGameOver() {
    this._els.gameOver?.classList.remove('hidden');
  }

  showToast(msg) {
    const t = this._els.toast;
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2000);
  }

  bindGame(game) {
    this.game = game;
    game.events.on('gold:changed', () => this._updateBuildUI({ rebuildOptions: false }));
  }

  _updateBuildUI(options = {}) {
    const game = this.game;
    if (!game) return;

    const goldEl = this._els.gold;
    if (goldEl) {
      goldEl.textContent = `Gold: ${game.gold}`;
      goldEl.classList.toggle('debt', game.gold < 0);
    }

    const timer = this._els.timerBar;
    const max = 100 + game.phase.round * 10;
    if (timer && game.phase.current === Phase.Build) {
      timer.style.width = `${(game.phase.nextCount / max) * 100}%`;
    }

    if (options.rebuildOptions !== false) {
      this._renderBuildOptions();
    } else {
      this._syncBuildOptionStates();
    }
    this._renderSummary();
  }

  _syncBuildOptionStates() {
    const container = this._els.buildOptions;
    if (!container || !this.game) return;
    container.querySelectorAll('.build-option').forEach((btn, i) => {
      const opt = BUILD_OPTIONS[i];
      if (!opt) return;
      btn.disabled = this.game.gold < opt.price && opt.price > 0;
      btn.classList.toggle('selected', this.game.selectedBuildOption?.name === opt.name);
    });
  }

  _renderBuildOptions() {
    const container = this._els.buildOptions;
    if (!container || !this.game) return;
    container.innerHTML = '';

    BUILD_OPTIONS.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'build-option';
      btn.type = 'button';
      btn.dataset.index = i;
      btn.innerHTML = `<span class="opt-name">${i + 1}. ${opt.name}</span><span class="opt-price">${opt.price}g</span>`;
      btn.disabled = this.game.gold < opt.price && opt.price > 0;
      btn.classList.toggle(
        'selected',
        this.game.selectedBuildOption?.name === opt.name
      );
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (opt.price <= this.game.gold || opt.price === 0) {
          this.game.selectedBuildOption =
            opt.type === 'unit'
              ? { ...opt, model: createUnit(opt.unitType, null) }
              : { ...opt };
          this._syncBuildOptionStates();
        }
      });
      container.appendChild(btn);
    });
  }

  _renderSummary() {
    const el = this._els.summaryContent;
    const game = this.game;
    if (!el || !game?.summary || game.phase.current !== Phase.BattleEnd) return;

    const s = game.summary;
    let html = `<h2>Round ${game.phase.round} Summary</h2><div class="summary-grid">`;

    for (const [key, item] of Object.entries(s)) {
      if (key === 'gold' || key === 'mills' || key === 'castles') continue;
      if (item.current || item.change) {
        const ch =
          item.change !== 0
            ? ` <span class="change">(${item.change < 0 ? '' : '+'}${item.change})</span>`
            : '';
        html += `<div>${item.name}: ${item.current}${ch}</div>`;
      }
    }

    html += '</div><div class="summary-account">';
    const prevGold = s.gold.current - s.gold.change;
    html += `<div>Previous gold: <span class="${prevGold < 0 ? 'debt' : ''}">${prevGold}</span></div>`;

    for (const [key, item] of Object.entries(s)) {
      if (['gold', 'villagers'].includes(key) || !item.revenue) continue;
      if (item.current) {
        html += `<div>${item.name}: ${item.current} × ${item.revenue} = <span class="${item.revenue < 0 ? 'debt' : ''}">${item.current * item.revenue}</span></div>`;
      }
    }

    html += `<div><strong>Total: <span class="${s.gold.current < 0 ? 'debt' : ''}">${s.gold.current}</span></strong></div></div>`;
    el.innerHTML = html;
  }

  mount() {
    this.root.innerHTML = `
      <div id="loading" class="overlay">
        <h1>The Horde</h1>
        <div class="load-bar-track"><div id="loadBar" class="load-bar"></div></div>
        <p>Loading assets...</p>
      </div>
      <div id="start" class="overlay hidden">
        <h1>The Horde</h1>
        <button id="startBtn" class="btn btn-primary">Start</button>
        <button id="loadBtn" class="btn btn-secondary hidden">Load Game</button>
      </div>
      <div id="gameOver" class="overlay hidden">
        <h1>Game Over</h1>
        <p>Chauncey has fallen!</p>
        <button id="restartBtn" class="btn btn-primary">Play Again</button>
      </div>
      <div id="hud" class="hud hidden">
        <div id="gold" class="gold-display">Gold: 0</div>
      </div>
      <div id="buildMenu" class="build-menu hidden">
        <div class="build-timer"><div id="timerBar" class="timer-bar"></div></div>
        <button id="beginRoundBtn" class="btn btn-action">Begin Round</button>
        <div id="buildOptions" class="build-options"></div>
        <p class="hint">Keys: 1-7 select · Enter start round · WASD scroll · Esc cancel · Cheats: gold10k, level##</p>
      </div>
      <div id="summary" class="overlay summary-panel hidden">
        <div id="summaryContent"></div>
        <button id="nextRoundBtn" class="btn btn-primary">Next Round</button>
        <button id="saveBtn" class="btn btn-secondary">Save Game</button>
      </div>
      <div id="toast" class="toast hidden"></div>
      <div class="game-container">
        <canvas id="canvas" width="1700" height="900"></canvas>
        <canvas id="mapcanvas" width="1700" height="900"></canvas>
      </div>
    `;

    for (const id of [
      'loading', 'loadBar', 'start', 'startBtn', 'loadBtn', 'gameOver', 'restartBtn',
      'hud', 'gold', 'buildMenu', 'timerBar', 'beginRoundBtn', 'buildOptions',
      'summary', 'summaryContent', 'nextRoundBtn', 'saveBtn', 'toast',
    ]) {
      this._els[id] = document.getElementById(id);
    }

    this._els.startBtn?.addEventListener('click', () => this._callbacks.start?.());
    this._els.loadBtn?.addEventListener('click', () => this._callbacks.load?.());
    this._els.restartBtn?.addEventListener('click', () => location.reload());
    this._els.beginRoundBtn?.addEventListener('click', () => this._callbacks.beginRound?.());
    this._els.nextRoundBtn?.addEventListener('click', () => this._callbacks.nextRound?.());
    this._els.saveBtn?.addEventListener('click', () => this._callbacks.save?.());

    this._setupResponsiveCanvas();
  }

  _setupResponsiveCanvas() {
    const container = this.root.querySelector('.game-container');
    const canvases = container.querySelectorAll('canvas');
    const buildMenu = this._els.buildMenu;

    const resize = () => {
      const menuHeight = buildMenu?.offsetHeight ?? 120;
      const maxW = window.innerWidth;
      const maxH = window.innerHeight - menuHeight - 16;
      const scale = Math.min(maxW / 1700, maxH / 900, 1);
      container.style.width = `${1700 * scale}px`;
      container.style.height = `${900 * scale}px`;
      canvases.forEach((c) => {
        c.style.width = `${1700 * scale}px`;
        c.style.height = `${900 * scale}px`;
      });
    };

    window.addEventListener('resize', resize);
    resize();
  }
}
