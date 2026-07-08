export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
  }

  emit(event, data) {
    this._listeners.get(event)?.forEach((handler) => handler(data));
  }
}

export const GameEvents = Object.freeze({
  UNIT_DIED: 'unit:died',
  BUILDING_DESTROYED: 'building:destroyed',
  PHASE_CHANGED: 'phase:changed',
  GOLD_CHANGED: 'gold:changed',
  GAME_OVER: 'game:over',
});
