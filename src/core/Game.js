import {
  INITIAL_GOLD,
  LandType,
  MAP_FULL_SIZE,
  MAP_INITIAL_WATERS,
  NODE_SIZE,
  OFFSET_DIVISOR,
  Phase,
  TICK_MS,
  TICKS_PER_FRAME,
  UnitAction,
  UnitType,
} from '../config/constants.js';
import { EventBus, GameEvents } from './EventBus.js';
import { setGame } from './GameContext.js';
import { AssetLoader } from './AssetLoader.js';
import { HordeManager } from './HordeManager.js';
import { calcGold } from './GoldCalculator.js';
import { clearPatrolGuards } from './PatrolGuardManager.js';
import { SaveManager } from './SaveManager.js';
import { Map } from '../map/Map.js';
import { LandNode } from '../map/LandNode.js';
import { createUnit, UnitRegistry } from '../units/createUnit.js';
import { UnitGroup } from '../units/UnitGroup.js';

export class Game {
  constructor() {
    this.nodeSize = NODE_SIZE;
    this.offsetSize = NODE_SIZE / OFFSET_DIVISOR;
    this.events = new EventBus();
    this.assets = new AssetLoader();
    this.units = new UnitRegistry();
    this.horde = new HordeManager();
    this.phase = { current: Phase.Start, round: 0, nextCount: 0 };
    this.inGame = false;
    this.gold = INITIAL_GOLD;
    this.summary = null;
    this.screen = [];
    this.hover = null;
    this.selectedBuildOption = null;
    this.ticker = 0;
    this._accumulator = 0;
    this._lastTime = 0;
    this._renderer = null;
    this._input = null;
    this._ui = null;
  }

  async init(renderer, input, ui) {
    setGame(this);
    this._renderer = renderer;
    this._input = input;
    this._ui = ui;

    await this.assets.loadAll((p) => ui.setLoadProgress(p));

    this.map = new Map(MAP_FULL_SIZE, MAP_INITIAL_WATERS);
    this.map.data = this.map.getNodesByType();
    this.player = createUnit(UnitType.chauncey, this.map.center);
    this.inGame = true;

    this.moveMap(this.map.center);
    ui.hideLoading();
    ui.showStartScreen(SaveManager.hasSave());

    input.attach(this);
    this._lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  setPhase(phase) {
    this.phase.current = phase;
    this.events.emit(GameEvents.PHASE_CHANGED, { phase });
    this._ui.onPhaseChange(phase);
  }

  resetStartPos() {
    this.player.position.node = this.map.center;
    this.player.position.offset = this.createMidOffsetObj();
    this.player.walk('down');
    this.moveMap(this.player.position.node);
    this.player.action = UnitAction.nothing;
  }

  moveMap(newCenterNode) {
    const canvas = this._renderer.mapCanvas;
    if (this.screen) {
      this.screen.forEach((s) => delete s.canvas);
    }
    this.screen = [];

    const width = canvas.width / this.nodeSize + 4;
    const height = canvas.height / this.nodeSize + 4;
    const dx = Math.floor(canvas.width / this.nodeSize / 2);
    const dy = Math.floor(canvas.height / this.nodeSize / 2);

    for (let y = -2; y < height - 2; y++) {
      for (let x = -2; x < width - 2; x++) {
        const nx = newCenterNode.x - dx + x;
        const ny = newCenterNode.y - dy + y;
        let node;
        if (this.map.grid[nx]?.[ny]?.isVisible) {
          node = this.map.grid[nx][ny];
        } else {
          node = new LandNode(-1, -1, LandType.black);
        }
        node.canvas = { x, y };
        this.screen.push(node);
      }
    }
    this._renderer.invalidateMinimap();
  }

  initBuildPhase() {
    clearPatrolGuards(this);
    this.units.all = this.units.alive();
    this.horde.targets.forEach((t) => t.restoreStart?.());
    this.phase.round++;
    this.phase.nextCount = 100 + this.phase.round * 10;
    this.map.newPhase();
    this.resetStartPos();
    this.horde.hordelings = [];
    this.horde.targets = [];
    this.selectedBuildOption = null;
    this.setPhase(Phase.Build);
  }

  initBattlePhase() {
    this.horde.initBattlePhase();
    this.setPhase(Phase.Battle);
    this.phase.nextCount = 0;
  }

  endBattlePhase() {
    clearPatrolGuards(this);
    this.setPhase(Phase.BattleEnd);
    this.player.target = null;
    this.player.walkTo = {};
    calcGold(this);
    this.units.clearArrows();
  }

  startGame() {
    this.setPhase(Phase.BuildStart);
  }

  loadSavedGame() {
    if (SaveManager.load(this)) {
      this.setPhase(Phase.BattleEnd);
    }
  }

  saveGame() {
    SaveManager.save(this);
    this._ui.showToast('Game saved!');
  }

  cheatAddGold(amount = 10000) {
    this.gold += amount;
    this.events.emit('gold:changed', { gold: this.gold, change: amount });
    this._ui.showToast(`Cheat: +${amount.toLocaleString()} gold`);
  }

  cheatJumpToRound(targetRound) {
    const target = Math.max(1, Math.min(99, Math.floor(targetRound)));

    if (this.phase.round < target) {
      while (this.phase.round < target) {
        this.phase.round++;
        this.map.newPhase();
      }
    } else {
      this.phase.round = target;
    }

    this.phase.nextCount = 100 + this.phase.round * 10;
    this.units.all = this.units.alive();
    this.horde.hordeStrength = HordeManager.calcStrengthAfterRound(target);
    this.horde.hordelings = [];
    this.horde.targets = [];
    this.horde.inactiveHordelings = [];
    this.selectedBuildOption = null;
    this.player.target = null;
    this.player.walkTo = {};
    this.resetStartPos();
    this.setPhase(Phase.Build);
    this._ui._updateBuildUI();
    this._ui.showToast(`Cheat: jumped to round ${target}`);
  }

  getRandomOffset() {
    const offsetsInNode = this.nodeSize / this.offsetSize;
    return {
      x: Math.floor(Math.random() * offsetsInNode),
      y: Math.floor(Math.random() * offsetsInNode),
    };
  }

  createMidOffsetObj() {
    return {
      x: Math.floor(this.offsetSize / 2),
      y: Math.floor(this.offsetSize / 2),
    };
  }

  timeToAct(speed, offset = 0) {
    return (this.ticker + offset) % speed === 0;
  }

  _loop(timestamp) {
    if (!this.inGame) return;

    const delta = Math.min(timestamp - this._lastTime, 100);
    this._lastTime = timestamp;
    this._accumulator += delta;

    while (this._accumulator >= TICK_MS) {
      this._update();
      this._accumulator -= TICK_MS;
    }

    this._renderer.draw(this);
    requestAnimationFrame((t) => this._loop(t));
  }

  _update() {
    this.ticker = ++this.ticker > TICKS_PER_FRAME ? 0 : this.ticker;

    const handlers = {
      [Phase.BuildStart]: () => this.initBuildPhase(),
      [Phase.BattleStart]: () => this.initBattlePhase(),
    };

    if (handlers[this.phase.current]) {
      handlers[this.phase.current]();
      return;
    }

    switch (this.phase.current) {
      case Phase.Build:
        this._updateBuild();
        break;
      case Phase.Battle:
        this._updateBattle();
        break;
      case Phase.BattleEnd:
        break;
      case Phase.Start:
        break;
    }
  }

  _updateBuild() {
    if (this.player.action === UnitAction.walking) {
      this.player.handleFrames();
      this.moveMap(this.player.position.node);
    }
    if (this.timeToAct(20)) {
      if (!this.phase.nextCount) {
        this.setPhase(Phase.BattleStart);
      } else {
        this.phase.nextCount--;
      }
    }
  }

  _updateBattle() {
    if (this.horde.inactiveHordelings.length && this.timeToAct(5)) {
      const h = this.horde.inactiveHordelings.pop();
      h.action = UnitAction.nothing;
      this.horde.hordelings.push(h);
    }

    UnitGroup.update();
    this._updatePlayer();

    if (this.phase.nextCount === 1) {
      this.endBattlePhase();
    } else if (this.phase.nextCount > 1) {
      this.phase.nextCount--;
    } else if (
      !this.horde.inactiveHordelings.length &&
      this.horde.hordelings.every((h) => h.action === UnitAction.dead)
    ) {
      this.phase.nextCount = 60;
    } else {
      this.horde.hordelings
        .filter((h) => h.action !== UnitAction.dead && h.action !== UnitAction.inactive)
        .forEach((h) => {
          if (this.timeToAct(h.speed, h.tickerOffset)) h.ai();
        });
    }

    this.units.alive().forEach((u) => {
      if (u.action === UnitAction.walking && u.type === UnitType.patrolGuard) {
        if (this.timeToAct(u.speed, u.tickerOffset)) {
          u.ai();
        } else {
          u.handleFrames();
        }
      } else if (this.timeToAct(u.speed, u.tickerOffset)) {
        u.ai();
      }
    });
    this.units.castles.forEach((c) => {
      if (this.timeToAct(c.speed, c.tickerOffset)) c.ai();
    });
    this.units.arrows.forEach((a) => {
      if (this.timeToAct(a.speed, a.tickerOffset)) a.ai();
    });
  }

  _updatePlayer() {
    const p = this.player;
    switch (p.action) {
      case UnitAction.nothing:
        if (this.timeToAct(p.speed)) {
          p.dizziness = Math.max(0, p.dizziness - 1);
        }
        break;
      case UnitAction.walking:
        if (this.timeToAct(p.speed)) {
          if (p.target && p.target.getOffsetDistanceFrom(p).dist < p.range) {
            p.attack();
          } else {
            p.handleFrames();
            this.moveMap(p.position.node);
            if (p.target && p.action === UnitAction.nothing) {
              p.handleMovement(p.target.position.node, p.target.position.offset);
            }
          }
          p.dizziness = Math.max(0, p.dizziness - 1);
        }
        break;
      case UnitAction.reeling:
        p.handleFrames();
        this.moveMap(p.position.node);
        break;
      case UnitAction.attacking:
        if (this.timeToAct(p.speed)) {
          p.frame = ++p.frame > 4 ? 0 : p.frame;
          if (p.frame === 1) {
            this.horde.hordelings.forEach((h) => {
              if (h.action !== UnitAction.dead && h.getOffsetDistanceFrom(p).dist < p.range) {
                h.gotAttacked(p.strength);
              }
            });
          } else if (p.frame === 4) {
            p.action = UnitAction.nothing;
            p.frame = 0;
            p.dizziness += 40;
          }
          p.animate.sx = p.sWidth * p.frame;
        }
        break;
      case UnitAction.dead:
        this.inGame = false;
        this.events.emit(GameEvents.GAME_OVER, {});
        this._ui.showGameOver();
        break;
      case UnitAction.dizzy:
        if (this.timeToAct(p.speed)) {
          p.dizziness--;
          if (p.dizziness > 0) {
            p.frame = p.dizziness % 4;
            p.animate.sx = p.frame * p.sWidth;
          } else {
            p.walk('down');
            p.action = UnitAction.nothing;
            p.dizziness = 0;
          }
        }
        break;
    }
  }
}
