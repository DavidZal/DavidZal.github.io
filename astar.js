
var astar = {

    search: function (graph, start, end, unit) {

        astar.graph = graph;
        //   astar.cleanDirty();
        astar.dirtyNodes = new Set([start, end]);
        astar.end = end;
        astar.unit = unit;
        var currentNode = start;
        var opens = [];

        while (currentNode && currentNode != end) {
            currentNode.closed = true;
            currentNode.g = currentNode.g || 0;

            var neighbors = astar.getNeighbors(currentNode);

            neighbors.forEach(function (n) {
                astar.dirtyNodes.add(n);
                n.f = n.f || 0;
                n.g = n.g || 0;
                n.mod = n.mod || 0;

                if (opens.includes(n)) {
                    var newG = currentNode.g + currentNode.getCost(n);
                    if (newG < n.g) {
                        n.g = newG;
                        n.parent = currentNode;
                    }
                } else {
                    n.g = currentNode.g + currentNode.getCost(n);
                    n.mob = astar.getH(n);
                    n.parent = currentNode;
                    opens.push(n);
                }

                n.f = n.g + n.mob;
            });

            currentNode = astar.getLowestCost(opens);
        }
        var path = [];
        while (currentNode && currentNode.parent) {
            path.push(currentNode);
            currentNode = currentNode.parent;
        }

        //clean dirty nodes
        Array.from(astar.dirtyNodes).forEach(astar.resetNode);
        return path;
    },
    getNeighbors: function (node) {

        var gr = astar.graph.grid;
        var neys = [];

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

        return neys.filter(function (n) {
            return n && !n.closed && (astar.unit.isWalkable(node) || n == astar.end);
        });
    },

    getH: function (n) {
        var pos0 = n;
        var pos1 = astar.end;

        var d1 = Math.abs(pos1.x - pos0.x);
        var d2 = Math.abs(pos1.y - pos0.y);

        return Math.sqrt(d1 * d1 + d2 * d2);
    },
    getLowestCost: function (arr) {
        arr.sort(function (a, b) { return b.f - a.f; });
        return arr.pop();
    },
    resetNode: function (n) {
        //astar.graph.grid.forEach(function (arr) {
        //    arr.forEach(function (n) {
        //        n.g = 0;
        //        n.mob = 0;
        //        n.f = 0;
        //        n.closed = false;
        //        n.weight = 1;
        //        n.parent = null;
        //    });
        //});


        n.g = 0;
        n.mob = 0;
        n.f = 0;
        n.closed = false;
        n.weight = 1;
        n.parent = null;

    }
}
