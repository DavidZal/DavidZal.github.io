var game = {
    init: function () {
        this.nodeSize = 100;
        this.offsetSize = this.nodeSize / 10;
        this.images.init();

        this.map = new map(100, 6);
        this.phase = {
            current: 0,
            round: 0,
            nextCount: 0,
            types: {
                start: 0,
                battle: 1,
                build: 2,
                battleEnd: 3,
                battleStart: 4,
                buildStart: 5

            }
        };
        this.inGame = true;
        this.gold = 1000000;
        this.player = unit.createUnit(unit.types.chauncey, this.map.center);

        this.canvasElm = document.getElementById('mapcanvas');
        this.gameCanvasElm = document.getElementById('canvas');
        this.moveMap(this.map.center);
        this.canvas.drawCanvas();
        this.gameLoop.ticker = 0;
        this.gameLoop();

        $('#mapcanvas').click(this.canvas.clickOnCanvas).mousemove(game.canvas.hoverOnCanvas).mouseleave(function () { delete game.canvasElm.hover; })[0].crazyLock = 0;
    },
    units: { all: [], arrows: [], castles: [], alive: function () { return this.all.filter(function (u) { return u.action != unit.actions.dead; }); } },
    horde: {
		types: [{ type: unit.types.hordeling1, rank: 1 }, { type: unit.types.hordeling2, rank: 2 }, { type: unit.types.hordeling3, rank: 4 }, { type: unit.types.hordeling4, rank: 6 }],      
        hordeStrength: 2,
        hordelings: [],
    },
    initBattlePhase: function () {

        var horde = game.horde;

        //clear old horde
        horde.hordelings = [];
        horde.inactiveHordelings = [];
        //add new hordelings
        horde.hordeStrength += 1 + Math.floor(game.phase.round * .75) + Math.floor(game.phase.round / 5) * 5 + Math.floor(game.phase.round / 20) * 100;
        var hCounter = horde.hordeStrength;

        var min = Math.ceil((game.map.fullSize - game.map.size) / 2);
        var max = min + game.map.size - 2;
        game.map.data = game.map.getNodesByType(); //update node data after build stage

        var allPossibleStartLocations = game.map.data.grass.filter(function (n) { 
		if( n.isVisible && (n.x == min || n.x == max || n.y == min || n.y == max)){ //all nodes around the perimeter
			var dummyHordeling = hordeling.factory(unit.types.hordeling1, n);
			var path = astar.search(game.map,n,game.map.center,dummyHordeling);
			
			return !!path.length;
		}
		return false; }); //isn't locked out 

        while (hCounter) {
            var possibles = horde.types.filter(function (h) { return h.rank <= hCounter && h.rank <= game.phase.round; });

            var startNode = allPossibleStartLocations[Math.floor(Math.random() * allPossibleStartLocations.length)];

            var newHordeling = possibles[Math.floor(Math.random() * possibles.length)];

            horde.inactiveHordelings.push(hordeling.factory(newHordeling.type, startNode));

            hCounter = hCounter - newHordeling.rank;
        }

        //load all houses as targets
        hordeling.targets = game.map.data.house.map(function (h) { return new attackableTarget(attackableTarget.types.house, h); });

        //load all mills as targets
        game.map.data.mill.forEach(function (h) { hordeling.targets.push(new attackableTarget(attackableTarget.types.mill, h)); });

        //load all castles as targets and units
        game.map.data.castle.forEach(function (h) {
            var castle = new attackableTarget(attackableTarget.types.castle, h);
            hordeling.targets.push(castle);
            game.units.castles.push(castle);
        });

        //add cows
        game.map.data.cow.forEach(function (cow) { hordeling.targets.push(new attackableTarget(attackableTarget.types.cow, cow, game.createMidOffsetObj())); });

        game.resetStartPos();

        game.units.all.forEach(function (u) {
            hordeling.targets.push(u);  //add all units as targets

            if (u.type == unit.types.knight) { //re-position knights around Chauncey
                u.position.node = game.player.position.node;
                u.position.offset = game.getRandomOffset();
            }
        });
        game.player.life++;

        //map all clusters of units for hordeling swarming
        unitGroup.init();

        game.phase.current = game.phase.types.battle; //start battle
        game.phase.nextCount = 0;
    },
    endBattlePhase: function () {
        game.phase.current = game.phase.types.battleEnd;
        game.player.target = null;
        game.player.walkTo = {};
        game.calcGold();
        game.units.arrows = [];
    },
    initBuildPhase: function () {
        game.units.all = game.units.alive();
        hordeling.targets && hordeling.targets.forEach(function (u) { u.restoreStart(); }); //restore start pos and life for units and cows
        game.phase.round++;
        game.phase.nextCount = 100 + game.phase.round * 10;
        game.ui.buildMenu.startRound.meter.max = game.phase.nextCount;
        game.map.newPhase();
        game.resetStartPos();
        game.horde.hordelings = [];
        hordeling.targets = [];
        game.ui.buildMenu.option.options.forEach(function (o) { o.selected = false; });
        game.phase.current = game.phase.types.build;
    },

    images: {
        init: function () {
            this.grass = new Image();
            this.grass.src = 'images/grass.jpg';
            this.water = new Image();
            this.water.src = 'images/water.jpg';
            this.field = new Image();
            this.field.src = 'images/field.jpg';
            this.house = new Image();
            this.house.src = 'images/house.jpg';
            this.mill = new Image();
            this.mill.src = 'images/mill.jpg';
            this.castle = new Image();
            this.castle.src = 'images/castle.jpg';
            this.black = new Image();
            this.black.src = 'images/black.jpg';
            this.pathH = new Image();
            this.pathH.src = 'images/path2.jpg';
            this.pathV = new Image();
            this.pathV.src = 'images/path1.jpg';
            this.pathB = new Image();
            this.pathB.src = 'images/path3.jpg';
            this.spikePit = new Image();
            this.spikePit.src = 'images/spikePit.jpg';
            this.rubbleHouse = new Image();
            this.rubbleHouse.src = 'images/rubbleHouse.jpg';
            this.rubbleField = new Image();
            this.rubbleField.src = 'images/rubbleField.jpg';
            this.fightCloud = new Image();
            this.fightCloud.src = 'images/cloud1.png';
            this.cow = new Image();
            this.cow.src = 'images/cow.jpg';
            this.catapult = new Image();
            this.catapult.src = 'images/catapult.png';
        }
    },
    resetStartPos: function () {

        game.player.position.node = game.map.center;
        game.player.position.offset = game.createMidOffsetObj();
        game.player.walk(unit.directions.down);
        game.moveMap(game.player.position.node);
        game.player.action = unit.actions.nothing;
    },

    moveMap: function (newCenterNode) {
        var grid = this.map.grid;
        var canvas = this.canvasElm;
        if (this.screen) {
            this.screen.forEach(function (s) { delete s.canvas; }); //remove canvas from old screen nodes
        }
        this.screen = [];

        var width = canvas.width / game.nodeSize + 4;
        var height = canvas.height / game.nodeSize + 4;
        var dx = Math.floor(canvas.width / game.nodeSize / 2);
        var dy = Math.floor(canvas.height / game.nodeSize / 2);

        for (var y = -2; y < height - 2; y++) {
            for (var x = -2; x < width - 2; x++) {
                var nx = newCenterNode.x - dx + x;
                var ny = newCenterNode.y - dy + y;
                var node;
                if (grid[nx] && grid[nx][ny] && grid[nx][ny].isVisible) {
                    node = grid[nx][ny];
                } else {
                    node = new landNode(-1, -1, landNode.types.black);
                }
                node.canvas = { x: x, y: y };
                this.screen.push(node);
            }
        }
    },

    gameLoop: function () {

        game.gameLoop.ticker = ++game.gameLoop.ticker > 60 ? 0 : game.gameLoop.ticker;

        switch (game.phase.current) {
            case game.phase.types.buildStart:
                game.initBuildPhase();
                break;
            case game.phase.types.build:
                switch (game.player.action) {
                    case unit.actions.walking:
                        game.player.handleFrames();
                        game.moveMap(game.player.position.node); //adjust screen nodes    
                        break;
                }
                if (timeToAct(20)) {
                    if (!game.phase.nextCount) {
                        game.phase.current = game.phase.types.battleStart;
                    } else {
                        game.phase.nextCount--;
                    }
                }
                break;
            case game.phase.types.battleStart:
                game.initBattlePhase();
                break;
            case game.phase.types.battle:

                //add more hordelings

                if (game.horde.inactiveHordelings.length && timeToAct(5)) {
                    var newHordeling = game.horde.inactiveHordelings.pop();
                    newHordeling.action = hordeling.actions.nothing;
                    game.horde.hordelings.push(newHordeling);
                }

                //update units groups
                unitGroup.update();

                //chauncey
                switch (game.player.action) {
                    case unit.actions.nothing:
                        if (timeToAct(game.player.speed)) {
                            game.player.dizziness = --game.player.dizziness < 0 ? 0 : game.player.dizziness; //reduce dizziness
                        }
                        break;
                    case unit.actions.walking:
                        if (timeToAct(game.player.speed)) {
                            if (game.player.target && game.player.target.getOffsetDistanceFrom(game.player).dist < game.player.range) { //has target and within range...
                                game.player.attack();
                            } else {
                                game.player.handleFrames();
                                game.moveMap(game.player.position.node); //adjust screen nodes 
                                if (game.player.target && game.player.action == unit.actions.nothing) {//if finished walking and target walked out of attack range, create new walk path
                                    game.player.handleMovement(game.player.target.position.node, game.player.target.position.offset);
                                }
                            }
                            game.player.dizziness = --game.player.dizziness < 0 ? 0 : game.player.dizziness;  //reduce dizziness
                        }
                        break;
                    case unit.actions.reeling:
                        game.player.handleFrames();
                        game.moveMap(game.player.position.node);//adjust screen nodes
                        break;
                    case unit.actions.attacking:
                        if (timeToAct(game.player.speed)) {
                            game.player.frame = ++game.player.frame > 4 ? 0 : game.player.frame; //frame ==4 is a fake frame to make the sword spin a full circle
                            if (game.player.frame == 1) {
                                game.horde.hordelings.forEach(function (h) {
                                    if (h.action != unit.actions.dead && h.getOffsetDistanceFrom(game.player).dist < game.player.range) {
                                        h.gotAttacked(game.player.strength);
                                    }
                                });
                            }
                            else if (game.player.frame == 4) { //end of attack sword spin

                                game.player.action = unit.actions.nothing;
                                game.player.frame = 0;
                                game.player.dizziness += 40;

                            }
                            game.player.animate.sx = game.player.sWidth * game.player.frame;

                        }
                        break;
                    case unit.actions.dead:
                        game.inGame = false; //game over
                        break;
                    case unit.actions.dizzy:
                        if (timeToAct(game.player.speed)) {
                            game.player.dizziness--;
                            if (game.player.dizziness > 0) {
                                game.player.frame = game.player.dizziness % 4;
                                game.player.animate.sx = game.player.frame * game.player.sWidth;
                            } else {
                                game.player.walk(unit.directions.down); //remove dizzy animation
                                game.player.action = unit.actions.nothing;
                                game.player.dizziness = 0;
                            }
                        }
                        break;
                }

                //hordelings
                if (game.phase.nextCount == 1) {
                    game.endBattlePhase();
                } else if (game.phase.nextCount > 1) {
                    game.phase.nextCount--;
                } else if (!game.horde.inactiveHordelings.length && game.horde.hordelings.every(function (h) { return h.action == hordeling.actions.dead; })) { //killed all hordeiings
                    game.phase.nextCount = 60;
                } else {
                    game.horde.hordelings
                        .filter(function (h) { return h.action != hordeling.actions.dead && h.action != hordeling.actions.inactive; })
                        .forEach(function (h) {
                            if (timeToAct(h.speed, h.tickerOffset)) {
                                h.ai();
                            }
                        });
                }

                //units
                game.units.alive()
                    .forEach(function (u) {
                        if (timeToAct(u.speed, u.tickerOffset)) {
                            u.ai();
                        }
                    });

                //castles
                game.units.castles
                    .forEach(function (u) {
                        if (timeToAct(u.speed, u.tickerOffset)) {
                            u.ai();
                        }
                    });

                //flying arrows
                game.units.arrows
                    .forEach(function (u) {
                        if (timeToAct(u.speed, u.tickerOffset)) {
                            u.ai();
                        }
                    });

                break;
            case game.phase.types.battleEnd:

                break;
        }

        game.canvas.drawCanvas();

        if (game.inGame) {
            window.requestAnimationFrame(game.gameLoop);
        }

        function timeToAct(speed, offset) {
            return (game.gameLoop.ticker + (offset || 0)) % speed == 0;
        }

    },
    calcGold: function () {

        var data = game.map.getNodesByType();

        var villagers = data.house.length + data.mill.length + data.castle.length + hordeling.targets.filter(function (t) { return t.type == attackableTarget.types.villager; }).length;
        var oldVillagers = game.summary && game.summary.villagers ? game.summary.villagers.current : 0;
        var oldFields = game.summary && game.summary.fields ? game.summary.fields.current : 0;
        var oldMills = game.summary && game.summary.mills ? game.summary.mills.current : 0;
        var oldCastles = game.summary && game.summary.castles ? game.summary.castles.current : 0;
        var oldCows = game.summary && game.summary.cows ? game.summary.cows.current : 0;
        var oldguards = game.summary && game.summary.guards ? game.summary.guards.current : 0;
        var oldArchers = game.summary && game.summary.archers ? game.summary.archers.current : 0;
        var oldKnights = game.summary && game.summary.knights ? game.summary.knights.current : 0;
        var oldCatapults = game.summary && game.summary.catapults ? game.summary.catapults.current : 0;
        game.summary = {
            villagers: { name: "Villagers", current: villagers, change: villagers - oldVillagers },
            fields: { name: "Fields", current: data.field.length, change: data.field.length - oldFields, revenue: 5 },
            mills: { name: "Mills", current: data.mill.length, change: data.mill.length - oldMills, revenue: 50 },
            castles: { name: "Castles", current: data.castle.length, change: data.castle.length - oldCastles, revenue: 100 },
            cows: { name: "Cows", current: data.cow.length, change: data.cow.length - oldCows, revenue: 25 },
            guards: { name: "Guards", current: game.units.alive().filter(function (u) { return u.type == unit.types.guard; }).length, revenue: -game.ui.buildMenu.option.options.filter(function (o) { return o.model && o.model.type == unit.types.guard; })[0].price, type: unit.types.guard },
            archers: { name: "Archers", current: game.units.alive().filter(function (u) { return u.type == unit.types.archer; }).length, revenue: -game.ui.buildMenu.option.options.filter(function (o) { return o.model && o.model.type == unit.types.archer; })[0].price, type: unit.types.archer },
            knights: { name: "Knights", current: game.units.alive().filter(function (u) { return u.type == unit.types.knight; }).length, revenue: -game.ui.buildMenu.option.options.filter(function (o) { return o.model && o.model.type == unit.types.knight; })[0].price, type: unit.types.knight },
            catapults: { name: "Catapults", current: game.units.alive().filter(function (u) { return u.type == unit.types.catapult; }).length, revenue: -game.ui.buildMenu.option.options.filter(function (o) { return o.model && o.model.type == unit.types.catapult; })[0].price, type: unit.types.catapult },
        };
        game.summary.guards.change = game.summary.guards.current - oldguards;
        game.summary.archers.change = game.summary.archers.current - oldArchers;
        game.summary.knights.change = game.summary.knights.current - oldKnights;
        game.summary.catapults.change = game.summary.catapults.current - oldCatapults;

        var goldChange = game.summary.fields.current * game.summary.fields.revenue
            + game.summary.mills.current * game.summary.mills.revenue
            + game.summary.castles.current * game.summary.castles.revenue
            + game.summary.cows.current * game.summary.cows.revenue
            + game.summary.guards.current * game.summary.guards.revenue
            + game.summary.archers.current * game.summary.archers.revenue
            + game.summary.catapults.current * game.summary.catapults.revenue
            + game.summary.knights.current * game.summary.knights.revenue;

        //if you're in debt from prev round and after gold change, you still broke, start remove units until you're OK

        while (game.gold < 0 && game.gold + goldChange < 0 && game.units.alive().length) {
            var removedUnit = game.units.alive().pop();
            goldChange += game.ui.buildMenu.option.options.filter(function (o) { return o.model && o.model.type == removedUnit.type; })[0].price;
            game.units.all = game.units.all.filter(function (u) { return u != removedUnit; });
            var summaryItem = game.summary[Object.keys(game.summary).filter(function (prop) { return game.summary[prop].type == removedUnit.type; })[0]];
            summaryItem.current--;
            summaryItem.change--;
        }


        game.gold += goldChange;

        game.summary.gold = { current: game.gold, change: goldChange };
    },
    ui: {
        map: { x: 1390, y: 590, width: 310, height: 310 },
        summary: { x: 500, y: 100, width: 700, height: 500, btn: { y: 400, width: 140, height: 50 }, save: { x: 500, y: 400, width: 140, height: 50 } },
        buildMenu: {
            x: 0, y: 650, width: 1400, height: 200,
            gold: { x: 0, y: -50, height: 50, width: 150 },
            option: {
                width: 100, height: 100, margin: 40, selected: { x: -10, y: -10, width: 20, height: 20, cancel: { radius: 15 } },
                options: [
                    { name: "Remove", price: 0, type: 'remove' },
                    { name: "Spike Pit", img: landNode.types.spikePit, price: 10, type: landNode },
                    { name: "Cow", img: landNode.types.cow, price: 100, type: landNode },
                    { name: "Guard", model: unit.createUnit(unit.types.guard, null), price: 50, type: unit },
                    { name: "Archer", model: unit.createUnit(unit.types.archer, null), price: 100, type: unit },
                    { name: "Knight", model: unit.createUnit(unit.types.knight, null), price: 125, type: unit },
                    { name: "Catapult", model: unit.createUnit(unit.types.catapult, null), price: 500, type: unit }
                ]
            },
            startRound: { x: 150, y: -50, width: 300, height: 50, meter: { x: 180, y: 10, width: 100, height: 30, margin: 5 }, btn: { x: 10, y: 10, width: 150, height: 30 } }
        },
        start: {
            x: 500, y: 200, width: 700, height: 500, btn: { y: 200, width: 300, height: 100 }, load: { y: 320, width: 300, height: 100 }
        },
        hordelingCounter: { x: 1350, y: 0, height: 50 }
    },
    getRandomOffset: function () {
        var offsetsInNode = game.nodeSize / game.offsetSize;
        return { x: Math.floor(Math.random() * offsetsInNode), y: Math.floor(Math.random() * offsetsInNode) };
    },
    createMidOffsetObj: function () { return { x: Math.floor(game.offsetSize / 2), y: Math.floor(game.offsetSize / 2) }; },

    saveGame: function () {
        var saveObj = {
            date: Date(),
            gold: game.gold,
            life: game.player.life,
            round: game.phase.round,
            units: game.units.alive().map(function (u) { return { type: u.type, node: { x: u.position.node.x, y: u.position.node.y }, offset: { x: u.position.offset.x, y: u.position.offset.y } }; }),
            hordeStrength: game.horde.hordeStrength,
            summary: game.summary,
            map: {
                size: game.map.size,
                fullSize: game.map.fullSize,
                nodes: game.map.nodes.map(function (n) { return { type: n.type, x: n.x, y: n.y }; })
            }

        };
        localStorage.save = JSON.stringify(saveObj);
    },
    loadGame: function () {
        if (!localStorage.save) {
            return;
        }

        var saveObj = JSON.parse(localStorage.save);

        if (game.map.fullSize != saveObj.map.fullSize) {
            game.map = new map(saveObj.map.fullSize, 0);
        }

        game.map.size = saveObj.map.size;

        saveObj.map.nodes.forEach(function (n) { game.map.grid[n.x][n.y].type = n.type; });

        game.gold = saveObj.gold;
        game.player.life = saveObj.life;
        game.phase.round = saveObj.round;
        game.horde.hordeStrength = saveObj.hordeStrength;
        game.summary = saveObj.summary;
        game.units.all = saveObj.units.map(function (u) { return unit.createUnit(u.type, game.map.grid[u.node.x][u.node.y], { x: u.offset.x, y: u.offset.y }); });
        game.map.data = game.map.getNodesByType();
        game.map.setVisible(game.map.size);
    }
};


//----------------------------------------
$(document).ready(function () {
    game.init();
});

function print() {
    var s = Array.from(arguments).reduce(function (st, o) {
        st += ssss(o);

        return st;
    }, "");

    console.log(s);

    function ssss(p) {
        var st = '';
        if (typeof p == "object") {
            for (var prop in p) {
                st += prop + ": " + ssss(p[prop]) + ", ";
            }

        } else if (typeof p != "function") {
            st = p;
        }
        return st;
    }
}

function test() {
    game.inGame = false;
    window.canvas = document.getElementById('canvas');
    window.ctx = window.canvas.getContext('2d');
    ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
    window.arrow = unit.createUnit(unit.types.arrow, game.map.center);
    window.hor = new hordeling(unit.types.hordeling1, game.map.center);
    game.horde.hordelings = [window.hor];
    var animateObj = arrow.animate;
    ctx.drawImage(animateObj.img, animateObj.sx, animateObj.sy, animateObj.sWidth, animateObj.sHeight, 0, 0, animateObj.sWidth, animateObj.sHeight);
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, animateObj.sWidth, animateObj.sHeight);
}

function nextFrame() {
    ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
    arrow.attack(window.hor);
    var animateObj = arrow.animate;
    ctx.drawImage(animateObj.img, animateObj.sx, animateObj.sy, animateObj.sWidth, animateObj.sHeight, 0, 0, animateObj.sWidth, animateObj.sHeight);
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, animateObj.sWidth, animateObj.sHeight);

    ctx.drawImage(animateObj.img, 0, 100);
    ctx.strokeRect(animateObj.sx, animateObj.sy + 100, animateObj.sWidth, animateObj.sHeight);
}