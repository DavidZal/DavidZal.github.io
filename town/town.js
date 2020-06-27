function map() {
    if (arguments.length) {
        return this.generate.apply(this, arguments);
    }
}


map.prototype.generate = function (size, waters) {

    if (size >> 0 < 24)
        throw new Error("map too small");

    var theMap = this;
    theMap.fullSize = size;
    var grid = [];
    theMap.nodes = [];
    theMap.grid = grid;

    for (var x = 0; x < theMap.fullSize; x++) {
        grid.push([]);
        for (var y = 0; y < theMap.fullSize; y++) {
            var node = new landNode(x, y, landNode.types.grass);
            grid[x][y] = node;
            theMap.nodes.push(node);
        }
    }
    theMap.setVisible(24);

    //water
    var potentialWaterNodes = theMap.nodes.filter(function (node) {
        var q = theMap.fullSize / 3;
        var q3 = 2 * q;
        return (node.x <= q && node.y >= q && node.y <= q3 ||
            node.x >= q3 && node.y >= q && node.y <= q3 ||
            node.y <= q && node.x >= q && node.x <= q3 ||
            node.y >= q3 && node.x >= q && node.x <= q3) &&
        theMap.getNeighbors(node).length == 8;
    });


    var waterNodeSpawners = [];

    while (waterNodeSpawners.length < waters) {
        node = potentialWaterNodes[Math.floor(Math.random() * potentialWaterNodes.length)];

        if (waterNodeSpawners.every(function (n) {
          return node.distFromNode(n) > 8;
        })) {
            waterNodeSpawners.push(node);
            node.type = landNode.types.water;
        }
    }

    waterNodeSpawners.forEach(function (waterSource) {
        var waterNodes = [waterSource];


        for (var i = 0; i < theMap.fullSize / 4; i++) {
            waterNodes = waterNodes.filter(function (w) { return theMap.getNeighbors(w).filter(function (n) { return n.type == landNode.types.grass; }).length > 1; }); //get all water nodes that have at least 1 grass neighbor

            var expand = waterNodes[Math.floor(Math.random() * waterNodes.length)];

            theMap.getNeighbors(expand).forEach(function (n) { n.type = landNode.types.water; waterNodes.push(n); });
        }
    });
    //end water


    //init town square 3x3
    var mid = Math.floor(theMap.fullSize / 2);
    theMap.center = grid[mid][mid];
    theMap.center.type = landNode.types.road;
    theMap.getNeighbors(theMap.center).forEach(function (n) {
        if (n.isBuildable()) {
            n.type = landNode.types.road;
        }
    });
};
map.prototype.getNeighbors = function (node) {

    var neys = [];
    var grid = this.grid;

    if (grid[node.x - 1]) {
        neys.push(grid[node.x - 1][node.y]);
        neys.push(grid[node.x - 1][node.y + 1]);
        neys.push(grid[node.x - 1][node.y - 1]);
    }

    if (grid[node.x + 1]) {
        neys.push(grid[node.x + 1][node.y + 1]);
        neys.push(grid[node.x + 1][node.y]);
        neys.push(grid[node.x + 1][node.y - 1]);
    }


    neys.push(grid[node.x][node.y + 1]);
    neys.push(grid[node.x][node.y - 1]);

    return neys.filter(function (n) { return n; });
};
map.prototype.getNodesByType = function () {
    var nodes = this.nodes;
    var data = {};

    Object.keys(landNode.types).forEach(function (type) {
        data[type] = [];
    });

    nodes.forEach(function (node) {
        data[node.type].push(node);
    });

    return data;
};
map.prototype.newPhase = function () {
    var theMap = this;

    //increase visiblity
    theMap.size += 5;
    theMap.size = theMap.size > theMap.fullSize ? theMap.fullSize : theMap.size;
    theMap.setVisible(theMap.size);

    theMap.data = theMap.getNodesByType();

    var newHouses = Math.ceil((theMap.data.house.length + theMap.data.mill.length + theMap.data.castle.length) / 5) + 1;
    var newRoads = Math.ceil(newHouses / 2);

    while (newHouses > 0) {
        if (theMap.data.rubbleHouse.length) {
            theMap.data.rubbleHouse.pop().type = landNode.types.house;
            newHouses--;
        } else if (newRoads > 0) {

            var road = addNewRoad();

            addHouseByRoad(road);
            addHouseByRoad(road);

            newHouses--;
            newHouses--;
            newRoads--;
        } else {
            theMap.data = theMap.getNodesByType();
            addHouseByRoad(theMap.data.road);
            newHouses--;
        }
    }


    theMap.data = theMap.getNodesByType();

    //upgrade houses to mill 2 /10 ratio
    var houseCount = theMap.data.house.length;
    var millCount = theMap.data.mill.length;

    var newMills = Math.floor(0.2 * houseCount) - millCount;

    if (newMills > 0) {
        theMap.data.house
            .map(function (h) { return { house: h, score: Math.random() }; })
            .sort(function (h1, h2) { return h1.score - h2.score; })
            .slice(0, newMills)
            .forEach(function (h) { h.house.type = landNode.types.mill; });
    }

    //upgrade houses to castles 
    var newCastles = Math.floor(0.1 * houseCount) - theMap.data.castle.length;
    if (newCastles > 0) {
        theMap.data = theMap.getNodesByType();

        theMap.data.house
            .map(function (m) { return { house: m, score: m.distFromNode(theMap.center) }; })
            .sort(function (h1, h2) { return h2.score - h1.score; })
            .slice(0, newCastles)
            .forEach(function (h) { h.house.type = landNode.types.castle; });
    }

    //add 1 field next to each structure
    theMap.data.house.concat(theMap.data.mill).concat(theMap.data.castle).forEach(function (h) {
        var allNeys = theMap.getNeighbors(h);
        var rubble = allNeys.filter(function (n) { return n.type == landNode.types.rubbleField; })[0]; //check for rubble fields first
        if (rubble) {
            rubble.type = landNode.types.field;
        } else if (Math.random() > 0.25 || game.phase.round == 1) {
            var neys = allNeys.filter(function (n) { return n.isBuildable(); });
            if (neys.length) {
                neys[Math.floor(Math.random() * neys.length)].type = landNode.types.field;
            }
        }


    });

    //last node update before build round begins
    theMap.data = theMap.getNodesByType();
    //---------------------------
    function addHouseByRoad(road) {
        var potentialHouses = new Set(road.reduce(function (arr, n) {
            return arr.concat(theMap.getNeighbors(n).filter(function (m) {
                return m.isBuildable() && m.isVisible && !m.isDiagonal(n) && theMap.getNeighbors(m).filter(function (p) {
                    return p.type == landNode.types.road;
                }).length > 1;
            }));
        }, []));

        potentialHouses = Array.from(potentialHouses);

        potentialHouses.forEach(function (n) { n.score = theMap.getNeighbors(n).filter(function (m) { return m.isBuildable() && m.isVisible; }).length > 1 ? 2 : 1; });
        var topHouse = potentialHouses.reduce(function (arr, n) {
            if (!arr.length || arr[0].score == n.score) {
                arr.push(n);
            } else if (arr[0].score < n.score) {
                arr = [n];
            }
            return arr;
        }, []);
        var theHouse = topHouse[Math.floor(Math.random() * topHouse.length)];

        if (theHouse)
            theHouse.type = landNode.types.house;
    }

    function addNewRoad() {
        var potentialRoads = [];

        theMap.data.road.forEach(function (path) {
            var neys = theMap.getNeighbors(path).filter(function (n) { return !n.isDiagonal(path) && n.isBuildable() && n.isVisible; });

            neys.forEach(function (n) {
                var road = getTilesInARow(path, n, 3);

                if (road && road.every(function (n) { return n.isBuildable() && n.isVisible; })) {
                    potentialRoads.push({
                        road: road,
                        dist: theMap.center.distFromNode(road[1]), //dist from center
                        freeSpace: calcFreeSpaceAroundNodes(road) //buildable neighbors
                    });
                }
            });
        });
        if (potentialRoads.length) {
            potentialRoads.forEach(function (r) { r.score = r.freeSpace - r.dist * 2; });
            var theRoad = potentialRoads.reduce(function (a, b) { return a.score > b.score ? a : b; });
            theRoad.road.forEach(function (n) { n.type = landNode.types.road; });
            return theRoad.road;
        }

        return [];
    }


    function getTilesInARow(origin, first, count) {
        var road = [];
        var grid = theMap.grid;

        var dx = first.x - origin.x;
        var dy = first.y - origin.y;

        recursive(first);

        return road.length == count ? road : null;

        function recursive(node) {
            if (!node || road.length == count) {
                return;
            }
            road.push(node);

            if (grid[node.x + dx]) {
                recursive(grid[node.x + dx][node.y + dy]);
            }
        }

    }

    function calcFreeSpaceAroundNodes(nodes) {
        //get 2 layers of neighbors; remove original nodes, count the buildable ones;

        var freeSet = new Set();

        allNeys = [].concat.apply([], [].concat.apply([], nodes.map(function (n) { return theMap.getNeighbors(n).map(function (n) { return theMap.getNeighbors(n); }); })));

        allNeys.filter(function (n) { return n.isBuildable() && n.isVisible; }).forEach(function (n) {
            freeSet.add(n);
        });

        nodes.forEach(function (n) { freeSet.delete(n); });

        return freeSet.size;
    }
};

map.prototype.setVisible = function (size) {
    var theMap = this;

    var min = Math.floor((theMap.fullSize - size) / 2);
    var max = min + size;

    theMap.nodes.forEach(function (node) {
        if (node.x >= min && node.x <= max && node.y >= min && node.y <= max) {
            node.isVisible = true;
        }
    });

    theMap.size = size;
};
