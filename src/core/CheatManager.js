const BUFFER_LIMIT = 24;
const BUFFER_TIMEOUT_MS = 3000;
const LEVEL_CHEAT_DELAY_MS = 450;

export class CheatManager {
  constructor() {
    this._buffer = '';
    this._timeout = null;
    this._levelTimeout = null;
  }

  handleKey(key, game) {
    if (key.length !== 1 || !/[a-z0-9]/.test(key)) return false;

    const beforeAppend = this._buffer;
    this._buffer = (this._buffer + key).slice(-BUFFER_LIMIT);
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this._buffer = '';
    }, BUFFER_TIMEOUT_MS);

    if (this._buffer.endsWith('gold10k')) {
      clearTimeout(this._levelTimeout);
      game.cheatAddGold(10000);
      this._buffer = '';
      return true;
    }

    if (this._tryLevelCheat(key, beforeAppend, game)) {
      return true;
    }

    return false;
  }

  _tryLevelCheat(key, beforeAppend, game) {
    const afterMatch = this._buffer.match(/level(\d{1,2})$/);
    if (!afterMatch) return false;

    const digits = afterMatch[1];

    if (/\d/.test(key)) {
      if (digits.length >= 2) {
        this._executeLevelCheat(parseInt(digits, 10), game);
        return true;
      }

      clearTimeout(this._levelTimeout);
      this._levelTimeout = setTimeout(() => {
        const pending = this._buffer.match(/level(\d{1,2})$/);
        if (pending) {
          this._executeLevelCheat(parseInt(pending[1], 10), game);
        }
      }, LEVEL_CHEAT_DELAY_MS);
      return true;
    }

    const priorMatch = beforeAppend.match(/level(\d{1,2})$/);
    if (priorMatch && /[a-z]/.test(key)) {
      clearTimeout(this._levelTimeout);
      this._executeLevelCheat(parseInt(priorMatch[1], 10), game);
      return true;
    }

    return false;
  }

  _executeLevelCheat(round, game) {
    clearTimeout(this._levelTimeout);
    game.cheatJumpToRound(round);
    this._buffer = '';
  }
}
