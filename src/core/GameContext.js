/** Module-level game reference — set once at init, used by entities that need global access */
let _game = null;

export function setGame(game) {
  _game = game;
}

export function getGame() {
  if (!_game) {
    throw new Error('Game not initialized');
  }
  return _game;
}
