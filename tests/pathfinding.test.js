import { describe, expect, it } from 'vitest';
import { MinHeap } from '../src/pathfinding/MinHeap.js';
import { LandNode } from '../src/map/LandNode.js';
import { LandType } from '../src/config/constants.js';

describe('MinHeap', () => {
  it('extracts lowest element first', () => {
    const heap = new MinHeap((a, b) => a - b);
    heap.push(5);
    heap.push(1);
    heap.push(3);
    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(5);
  });
});

describe('LandNode', () => {
  it('applies diagonal movement cost', () => {
    const a = new LandNode(0, 0, LandType.grass);
    const b = new LandNode(1, 1, LandType.grass);
    expect(a.getCost(b)).toBeCloseTo(1.41421);
  });

  it('blocks water from walking', () => {
    const water = new LandNode(0, 0, LandType.water);
    expect(water.isWalkable()).toBe(false);
  });
});
