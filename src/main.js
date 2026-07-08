import './styles.css';
import { Phase } from './config/constants.js';
import { Game } from './core/Game.js';
import { InputManager } from './input/InputManager.js';
import { CanvasRenderer } from './render/CanvasRenderer.js';
import { UIManager } from './ui/UIManager.js';

const app = document.getElementById('app');
const ui = new UIManager(app);
ui.mount();

const gameCanvas = document.getElementById('canvas');
const mapCanvas = document.getElementById('mapcanvas');
const renderer = new CanvasRenderer(gameCanvas, mapCanvas);
const input = new InputManager(mapCanvas, renderer);
const game = new Game();

ui.on('start', () => game.startGame());
ui.on('load', () => game.loadSavedGame());
ui.on('beginRound', () => game.setPhase(Phase.BattleStart));
ui.on('nextRound', () => game.setPhase(Phase.BuildStart));
ui.on('save', () => game.saveGame());

game.init(renderer, input, ui).then(() => {
  ui.bindGame(game);
  game.events.on('phase:changed', () => ui._updateBuildUI());

  setInterval(() => {
    if (game.phase.current === Phase.Build) ui._updateBuildUI();
  }, 200);
});
