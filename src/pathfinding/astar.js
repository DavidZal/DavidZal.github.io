import { MinHeap } from './MinHeap.js';

export const astar = {
  search(graph, start, end, unit) {
    astar.graph = graph;
    astar.dirtyNodes = new Set([start, end]);
    astar.end = end;
    astar.unit = unit;

    const openHeap = new MinHeap((a, b) => a.f - b.f);
    const openSet = new Set();

    let currentNode = start;
    currentNode.g = currentNode.g || 0;

    while (currentNode && currentNode !== end) {
      currentNode.closed = true;

      const neighbors = astar.getNeighbors(currentNode);

      for (const n of neighbors) {
        astar.dirtyNodes.add(n);
        n.f = n.f || 0;
        n.g = n.g || 0;

        const newG = currentNode.g + currentNode.getCost(n);

        if (openSet.has(n)) {
          if (newG < n.g) {
            n.g = newG;
            n.parent = currentNode;
            n.f = n.g + n.h;
          }
        } else {
          n.g = newG;
          n.h = astar.getH(n);
          n.parent = currentNode;
          n.f = n.g + n.h;
          openSet.add(n);
          openHeap.push(n);
        }
      }

      currentNode = openHeap.pop();
      if (currentNode) {
        openSet.delete(currentNode);
      }
    }

    const path = [];
    while (currentNode?.parent) {
      path.push(currentNode);
      currentNode = currentNode.parent;
    }

    for (const n of astar.dirtyNodes) {
      astar.resetNode(n);
    }
    return path;
  },

  getNeighbors(node) {
    const gr = astar.graph.grid;
    const neys = [];

    if (gr[node.x - 1]) {
      neys.push(gr[node.x - 1][node.y]);
      neys.push(gr[node.x - 1][node.y + 1]);
      neys.push(gr[node.x - 1][node.y - 1]);
    }
    if (gr[node.x + 1]) {
      neys.push(gr[node.x + 1][node.y + 1]);
      neys.push(gr[node.x + 1][node.y]);
      neys.push(gr[node.x + 1][node.y - 1]);
    }
    neys.push(gr[node.x][node.y + 1]);
    neys.push(gr[node.x][node.y - 1]);

    return neys.filter(
      (n) => n && !n.closed && (astar.unit.isWalkable(node) || n === astar.end)
    );
  },

  getH(n) {
    const d1 = Math.abs(astar.end.x - n.x);
    const d2 = Math.abs(astar.end.y - n.y);
    return Math.sqrt(d1 * d1 + d2 * d2);
  },

  resetNode(n) {
    n.g = 0;
    n.h = 0;
    n.f = 0;
    n.closed = false;
    n.weight = 1;
    n.parent = null;
  },
};
