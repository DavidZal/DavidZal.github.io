game.canvas = {
    drawCanvas: function () {

        var canvas = game.canvasElm;
        var ctx = game.gameCanvasElm.getContext('2d');
        var mapCtx = canvas.getContext('2d');
        var textsToAnimate = [];
        var canvasNodes = game.screen;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        canvasNodes.forEach(function (node) {
            var img;

            if (node.type == landNode.types.road) {
                var neys = game.map.getNeighbors(node).filter(function (n) { return n.type == landNode.types.road && !n.isDiagonal(node); }); //get all road neighbors
                if (neys.some(function (n) { return n.x == node.x; }) && neys.some(function (n) { return n.y == node.y; })) {
                    img = game.images.pathB;
                } else if (neys.some(function (n) { return n.x == node.x; })) { //on same vertical axis
                    img = game.images.pathV;
                } else { //horz axis
                    img = game.images.pathH;
                }
            } else {
                img = game.images[node.type];
            }

            var points = getNodeXY(node);
            draw(img, points.x, points.y);

        });

        game.canvas.chaunceyDx = game.canvas.chaunceyDx || (game.canvasElm.width - game.player.animate.sWidth) / 2;
        game.canvas.chaunceyDy = game.canvas.chaunceyDy || (game.canvasElm.height - game.player.animate.sHeight) / 2;

        switch (game.phase.current) {
            case game.phase.types.battle:
               
                //draw dead hordelings
                game.horde.hordelings.filter(function (h) { return h.action == hordeling.actions.dead; }).forEach(drawMobs);
                //draw dead units
                game.units.all.filter(function (u) { return u.action == unit.actions.dead; }).forEach(drawMobs);

                //draw dead hordelings
                game.horde.hordelings.filter(function (h) { return h.action != hordeling.actions.dead; }).forEach(drawMobs);

				//draw chauncey
                drawCharacter(game.player.animate, game.canvas.chaunceyDx, game.canvas.chaunceyDy);
                game.player.animate.lifeLossTexts = game.player.animate.lifeLossTexts.filter(function (txt) {
                    if (txt.count) {
                        txt.count++;
                    } else {
                        txt.x = game.canvas.chaunceyDx;
                        txt.y = game.canvas.chaunceyDy;
                        txt.count = 1;
                    }
                    return txt.count < 50;
                });
                textsToAnimate = textsToAnimate.concat(game.player.animate.lifeLossTexts);
				
                //units
                drawUnits();

                hordeling.targets && hordeling.targets.forEach(function (t) {
                    if (t.position.node.canvas) {

                        if (t.type == attackableTarget.types.villager) {
                            drawMobs(t);
                        }

                        //draw fight cloud
                        if (t.underAttack && [attackableTarget.types.villager, attackableTarget.types.cow].includes(t.type)) {
                            var points = getNodeXY(t.position.node);
                            var img = game.images.fightCloud;
                            draw(img, points.x, points.y);
                        }
                    }
                });

                //add any life loss floating texts
                textsToAnimate.forEach(function (txt) {

                    ctx.font = '20px Calibri';
                    ctx.fillStyle = 'red';
                    ctx.fillText(txt.text, txt.x, txt.y - (txt.count + 1) * 2);
                });

                //hordeling left info
                var hCounter = game.ui.hordelingCounter;
                ctx.font = '40px Calibri';
                ctx.fillStyle = 'red';
                ctx.textAlign = 'start';
                ctx.fillText("Hordelings: " + game.horde.hordelings.filter(function (h) { return h.action != hordeling.actions.dead; }).length, hCounter.x, hCounter.y + hCounter.height);

                break;
            case game.phase.types.build:
                drawUnits();

                var buildMenu = game.ui.buildMenu;
                //build menu
                ctx.fillStyle = "#7F5E3D";
                ctx.fillRect(buildMenu.x, buildMenu.y, buildMenu.width, buildMenu.height);

                //gold display
                ctx.fillRect(buildMenu.x + buildMenu.gold.x, buildMenu.y + buildMenu.gold.y, buildMenu.gold.width, buildMenu.gold.height);
                ctx.font = '20px Calibri';
                ctx.textAlign = 'start';
                ctx.fillStyle = game.gold < 0 ? 'red' : 'gold';
                ctx.fillText("Gold: " + game.gold, buildMenu.x + buildMenu.gold.x + 20, buildMenu.y + buildMenu.gold.y + 30);

                //start time left
                var startRound = buildMenu.startRound;
                ctx.fillStyle = "#7F5E3D";
                ctx.fillRect(buildMenu.x + startRound.x, buildMenu.y + startRound.y, startRound.width, startRound.height);
                ctx.fillStyle = "gray";
                ctx.fillRect(buildMenu.x + startRound.x + startRound.meter.x, buildMenu.y + startRound.y + startRound.meter.y, startRound.meter.width, startRound.meter.height);
                ctx.fillStyle = "red";
                ctx.fillRect(buildMenu.x + startRound.x + startRound.meter.x + startRound.meter.margin, buildMenu.y + startRound.y + startRound.meter.y + startRound.meter.margin, (startRound.meter.width - startRound.meter.margin * 2) * (game.phase.nextCount) / startRound.meter.max, startRound.meter.height - startRound.meter.margin * 2);
                ctx.fillStyle = "blue";
                ctx.fillRect(buildMenu.x + startRound.x + startRound.btn.x, buildMenu.y + startRound.y + startRound.btn.y, startRound.btn.width, startRound.btn.height);
                ctx.fillStyle = "yellow";
                ctx.textAlign = 'center';
                ctx.fillText("Begin Round", buildMenu.x + startRound.x + startRound.btn.x + startRound.btn.width / 2, buildMenu.y + startRound.y + startRound.btn.y + 20);
                //add options
                buildMenu.option.options.forEach(function (o, i) {
                    var x = buildMenu.x + (buildMenu.option.width + 2 * buildMenu.option.margin) * i + buildMenu.option.margin;
                    var y = buildMenu.y + buildMenu.option.margin;

                    if (o.selected) { //yellow outline
                        ctx.fillStyle = 'yellow';
                        ctx.fillRect(x + buildMenu.option.selected.x, y + buildMenu.option.selected.y, buildMenu.option.width + buildMenu.option.selected.width, buildMenu.option.height + buildMenu.option.selected.height);
                    }

                    if (o.type == unit) {
                        ctx.drawImage(game.images.grass, x, y);
                        drawCharacter(o.model.animate, x + (buildMenu.option.width - o.model.sWidth) / 2, y + (buildMenu.option.height - o.model.sHeight) / 2);
                    } else if (o.type == 'remove') {
                        ctx.drawImage(game.images[landNode.types.grass], x, y);
                        ctx.font = 'bold 100px Calibri';
                        ctx.fillStyle = 'red';
                        ctx.textAlign = 'center';
                        ctx.fillText("X", x + buildMenu.option.width / 2, y + buildMenu.option.height - 20);
                    } else {
                        ctx.drawImage(game.images[o.img], x, y);
                    }


                    if (game.gold < o.price) { //disabled
                        ctx.fillStyle = "rgba(0,0,0,0.5)";
                        ctx.fillRect(x, y, buildMenu.option.width, buildMenu.option.height);
                    }

                    ctx.font = '20px Calibri';
                    ctx.fillStyle = 'black';
                    ctx.textAlign = 'center';
                    ctx.fillText(o.name, x + buildMenu.option.width / 2, y + buildMenu.option.height + 20);

                    if (o.selected) {
                        ctx.beginPath();
                        ctx.fillStyle = 'red';
                        ctx.arc(x + buildMenu.option.width, y, buildMenu.option.selected.cancel.radius, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.textAlign = "center";
                        ctx.font = '25px Calibri';
                        ctx.fillStyle = 'white';
                        ctx.fillText('X', x + buildMenu.option.width, y);
                        ctx.textAlign = "start";

                        //if hovering w/ selected option on the canvas:
                        if (game.canvasElm.hover && game.canvasElm.hover.node) {
                            var points = getNodeXY(game.canvasElm.hover.node);
                            if (o.type == unit) {
                                var canvasX = points.x + game.canvasElm.hover.offset.x * game.offsetSize - o.model.sWidth / 2;
                                var canvasY = points.y + game.canvasElm.hover.offset.y * game.offsetSize - o.model.sHeight / 2;
                                drawCharacter(o.model.animate, canvasX, canvasY);
                            } else if (o.type == 'remove') {
                                if (game.ui.buildMenu.option.options.map(function (b) { return b.img; }).includes(game.canvasElm.hover.node.type)) { //a node type build option
                                    ctx.fillStyle = "rgba(255, 77, 77,0.5)";
                                    ctx.fillRect(points.x, points.y, buildMenu.option.width, buildMenu.option.height);
                                } else {
                                    var hoverOverUnit = game.units.all.reduce(function (current, u) {
                                        if (u.position.node == game.canvasElm.hover.node) {
                                            var dist = u.getOffsetDistanceFrom(game.canvasElm.hover).dist;
                                            if (dist < current.dist) {
                                                return { u: u, dist: dist };
                                            }
                                        }
                                        return current;
                                    }, { dist: Infinity }).u;
                                    if (hoverOverUnit) {
                                        ctx.fillStyle = "rgba(255, 77, 77,0.5)";

                                        var pts = getNodeXY(game.canvasElm.hover.node);

                                        canvasX = pts.x + hoverOverUnit.position.offset.x * game.offsetSize - hoverOverUnit.sWidth / 2;
                                        canvasY = pts.y + hoverOverUnit.position.offset.y * game.offsetSize - hoverOverUnit.sHeight / 2;
                                        ctx.fillRect(canvasX, canvasY, hoverOverUnit.sWidth, hoverOverUnit.sHeight);
                                    }

                                }
                            } else {
                                draw(game.images[o.img], points.x, points.y);
                            }
                        }
                    }
                });

                break;
            case game.phase.types.battleEnd:
                if (game.summary) {
                    var summaryUi = game.ui.summary;
                    var summary = game.summary;

                    ctx.textAlign = 'center';
                    ctx.fillStyle = "lightgray";
                    ctx.fillRect(summaryUi.x, summaryUi.y, summaryUi.width, summaryUi.height);
                    ctx.fillStyle = "gray";
                    ctx.fillRect(summaryUi.x + 10, summaryUi.y + 10, summaryUi.width - 20, summaryUi.height - 20);
                    //next round btn
                    ctx.fillStyle = "blue";
                    summaryUi.btn.x = (summaryUi.width - summaryUi.btn.width) / 2;
                    ctx.fillRect(summaryUi.x + summaryUi.btn.x, summaryUi.y + summaryUi.btn.y, summaryUi.btn.width, summaryUi.btn.height);
                    ctx.font = '20px Calibri';
                    ctx.fillStyle = 'yellow';
                    ctx.fillText("Next Round", summaryUi.x + summaryUi.width / 2, summaryUi.y + summaryUi.btn.y + 30);
                    //save btn
                    ctx.fillStyle = "green";
                    ctx.fillRect(summaryUi.x + summaryUi.save.x, summaryUi.y + summaryUi.save.y, summaryUi.save.width, summaryUi.save.height);
                    ctx.font = '20px Calibri';
                    ctx.fillStyle = 'yellow';
                    ctx.fillText("Save Game", summaryUi.x + summaryUi.save.x + summaryUi.save.width / 2, summaryUi.y + summaryUi.save.y + 30);
                    //round
                    ctx.font = '40px Calibri';
                    ctx.fillText("Round " + game.phase.round + " summary", summaryUi.x + summaryUi.width / 2, summaryUi.y + 50);
                    ctx.textAlign = 'start';
                    ctx.font = '20px Calibri';
                    var stockX = summaryUi.x + 20;
                    var stockY = summaryUi.y + 130;
                    var margin = 30;
                    for (var prop in summary) {
                        if (["gold", "mills", "castles"].includes(prop.toLowerCase()))
                            continue;

                        var item = summary[prop];
                        if (item.current || item.change) {
                            ctx.fillStyle = 'yellow';
                            ctx.fillText(item.name + ": " + item.current, stockX, stockY);
                            ctx.fillStyle = 'orange';
                            if (item.change) { ctx.fillText("(" + (item.change < 0 ? "-" : "+") + item.change + ")", stockX + 200, stockY); }
                            stockY += margin;
                        }
                    }

                    var accountX = summaryUi.x + 300;
                    var accountY = summaryUi.y + 100;
                    var accountNumbersX = accountX + 250;
                    ctx.fillStyle = 'gold';
                    ctx.fillText("Gold", accountX, accountY);

                    accountY += margin;
                    ctx.fillStyle = 'yellow';
                    ctx.fillText("Previous:", accountX, accountY);
                    var prevGold = summary.gold.current - summary.gold.change;
                    ctx.fillStyle = prevGold < 0 ? 'red' : 'yellow';
                    ctx.fillText(prevGold, accountNumbersX, accountY);
                    accountY += margin;
                    for (prop in summary) {
                        if (["gold", "villagers"].includes(prop.toLowerCase()))
                            continue;
                        ctx.fillStyle = 'yellow';
                        item = summary[prop];
                        if (item.current) {
                            ctx.fillText(item.name + ": " + item.current + " X " + item.revenue + " =", accountX, accountY);
                            if (item.revenue < 0) {
                                ctx.fillStyle = 'red';
                            }
                            ctx.fillText(item.current * item.revenue, accountNumbersX, accountY);
                            accountY += margin;
                        }
                    }
                    ctx.fillStyle = 'yellow';
                    ctx.fillText("Total:", accountX, accountY);
                    ctx.fillStyle = summary.gold.current < 0 ? 'red' : 'yellow';
                    ctx.fillText(summary.gold.current, accountNumbersX, accountY);
                }
                break;
            case game.phase.types.start:
                var start = game.ui.start;

                ctx.fillStyle = "#993300";
                ctx.fillRect(start.x, start.y, start.width, start.height);
                ctx.textAlign = 'center';
                ctx.fillStyle = "red";
                ctx.font = '100px Calibri bold';
                ctx.fillText("The Horde", start.x + start.width / 2, start.y + 120);
                //start btn
                ctx.fillStyle = "blue";
                ctx.fillRect(start.x + (start.width - start.btn.width) / 2, start.y + start.btn.y, start.btn.width, start.btn.height);
                ctx.fillStyle = "yellow";
                ctx.font = '60px Calibri bold';
                ctx.fillText("Start", start.x + start.width / 2, start.y + start.btn.y + 70);
                //load game btn
                if (localStorage.save) {
                    ctx.fillStyle = "green";
                    ctx.fillRect(start.x + (start.width - start.load.width) / 2, start.y + start.load.y, start.load.width, start.load.height);
                    ctx.fillStyle = "yellow";
                    ctx.font = '60px Calibri bold';
                    ctx.fillText("Load Game", start.x + start.width / 2, start.y + start.load.y + 70);
                }
                break;
        }

        //add map
        if (game.gameLoop.ticker % 3 == 0) {
            mapCtx.clearRect(0, 0, canvas.width, canvas.height);
            var mapUi = game.ui.map;
            var mapX = mapUi.x + 10;
            var mapY = mapUi.y + 10;
            var delta = Math.round((game.map.fullSize - game.map.size) / 2);
            var mapNodeSize = (mapUi.width - 10) / game.map.size;

            mapCtx.fillStyle = "darkgray";
            mapCtx.fillRect(mapUi.x, mapUi.y, mapUi.width, mapUi.height);
            game.canvas.map = {};


            mapCtx.fillStyle = "green";
            mapCtx.fillRect(mapX, mapY, game.map.size * mapNodeSize, game.map.size * mapNodeSize);

            for (var dt in game.map.data) {
                if (dt != landNode.types.grass) {
                    game.map.data[dt].forEach(function (n) {
                        if (n.isVisible && n.x >= delta && n.y >= delta) {
                            mapCtx.fillStyle = getMapNodeColor(n);
                            mapCtx.fillRect(mapX + (n.x - delta) * mapNodeSize, mapY + (n.y - delta) * mapNodeSize, mapNodeSize, mapNodeSize);
                        }
                    });
                }
            }
            if (game.phase.current == game.phase.types.battle) {
                //add chauncey
                mapCtx.fillStyle = "#3366cc";
                mapCtx.fillRect(mapX + (game.player.position.node.x - delta) * mapNodeSize, mapY + (game.player.position.node.y - delta) * mapNodeSize, mapNodeSize, mapNodeSize);

                //add hordelings
                mapCtx.fillStyle = "red";
                game.horde.hordelings.forEach(function (h) {
                    if (h.action != unit.actions.dead && h.action != unit.actions.inactive && h.position.node.isVisible) {
                        mapCtx.fillRect(mapX + (h.position.node.x - delta) * mapNodeSize, mapY + (h.position.node.y - delta) * mapNodeSize, mapNodeSize, mapNodeSize);
                    }
                });
            }
            //add units
            mapCtx.fillStyle = "#595959";
            game.units.all.forEach(function (u) {
                if (u.action != unit.actions.dead) {
                    mapCtx.fillRect(mapX + (u.position.node.x - delta) * mapNodeSize, mapY + (u.position.node.y - delta) * mapNodeSize, mapNodeSize, mapNodeSize);
                }
            });


            mapCtx.strokeStyle = "#ffffff";
            mapCtx.strokeRect(mapX + (game.player.position.node.x - delta - canvas.width / 2 / game.nodeSize) * mapNodeSize, mapY + (game.player.position.node.y - delta - canvas.height / 2 / game.nodeSize) * mapNodeSize, game.canvasElm.width / game.nodeSize * mapNodeSize, game.canvasElm.height / game.nodeSize * mapNodeSize);

            mapCtx.clearRect(mapUi.x - 200, mapUi.y - 200, 200, mapUi.height + 200);
            mapCtx.clearRect(mapUi.x, mapUi.y - 200, mapUi.width, 200);
        }

        function getMapNodeColor(node) {
            switch (node.type) {
                case landNode.types.black:
                    return "black";
                case landNode.types.field:
                    return "#00cc00";
                case landNode.types.grass:
                    return "green";
                case landNode.types.mill:
                case landNode.types.house:
                case landNode.types.castle:
                    return "#999966";
                case landNode.types.road:
                    return "#ffcc66";
                case landNode.types.rubbleField:
                    return "#996633";
                case landNode.types.rubbleHouse:
                    return "#663300";
                case landNode.types.water:
                    return "blue";
                case landNode.types.spikePit:
                    return "#1a1a1a";
                case landNode.types.cow:
                    return "white";
            }
        }
        function draw(img, x, y) {
            ctx.drawImage(img, x, y);
        }

        function drawCharacter(animateObj, dx, dy) {
            ctx.drawImage(animateObj.img, animateObj.sx, animateObj.sy, animateObj.sWidth, animateObj.sHeight, dx, dy, animateObj.sWidth, animateObj.sHeight);
        }

        function getNodeXY(node) {
            var canvasX = node.canvas.x * game.nodeSize - game.player.position.offset.x * game.offsetSize + Math.floor(game.nodeSize / 2);
            var canvasY = node.canvas.y * game.nodeSize - game.player.position.offset.y * game.offsetSize + Math.floor(game.nodeSize / 2);

            return { x: canvasX, y: canvasY };
        }

        function drawMobs(mob) {
            if (mob.position.node.canvas) {
                var points = getNodeXY(mob.position.node);
                mob.animate.canvasX = points.x + mob.position.offset.x * game.offsetSize - mob.animate.sWidth / 2;
                mob.animate.canvasY = points.y + mob.position.offset.y * game.offsetSize - mob.animate.sHeight / 2;
                drawCharacter(mob.animate, mob.animate.canvasX, mob.animate.canvasY);

                if (mob.animate.lifeLossTexts) {
                    mob.animate.lifeLossTexts = mob.animate.lifeLossTexts.filter(function (txt) {
                        if (txt.count) {
                            txt.count++;
                        } else {
                            txt.y = mob.animate.canvasY;
                            txt.x = mob.animate.canvasX;
                            txt.count = 1;
                        }
                        return txt.count < 50;

                    });
                    textsToAnimate = textsToAnimate.concat(mob.animate.lifeLossTexts);
                }
            }
        }

        function drawUnits() {
            //draw units
            game.units.alive().forEach(drawMobs);
            game.units.arrows.forEach(drawMobs);
        }

    },
    clickOnCanvas: function (event) {
        var pos = game.canvas.getCanvasPoints(event);

        if (pos) {
            var position = game.canvas.getPositionByPoints(pos);			
            var node = position.node;
            var offset = position.offset;

            switch (game.phase.current) {
                case game.phase.types.battle:
                    if (![unit.actions.reeling, unit.actions.dizzy, unit.actions.dead, unit.actions.attacking].includes(game.player.action) && !game.canvas.pointsOnUi(pos, game.ui.map)) { //moving is disabled && not on map
                        //clicked on enemy
                        var enemy = game.canvas.getHordelingByCanvasPoints(pos.x, pos.y);
                        if (enemy) {
                            game.player.target = enemy;
                        } else {
                            game.player.target = null;
                        }

                        game.player.handleMovement(node, offset);
                    }
                    break;
                case game.phase.types.build:
                    if (game.canvas.pointsOnUi(pos, game.ui.map)) { //click on map
                        var mapX = Math.floor((pos.x - game.ui.map.x - 10) / (game.ui.map.width - 10) * game.map.size + (game.map.fullSize - game.map.size) / 2);
                        var mapY = Math.floor((pos.y - game.ui.map.y - 10) / (game.ui.map.height - 10) * game.map.size + (game.map.fullSize - game.map.size) / 2);
                        node = game.map.nodes.filter(function (n) { return n.x == mapX && n.y == mapY; })[0];
                        if (node) {
                            game.player.position.node = node;
                            game.moveMap(game.player.position.node);
                        }
                    } else if (game.canvas.pointsOnUi(pos, game.ui.buildMenu.startRound.btn)) {
                        game.phase.current = game.phase.types.battleStart;
                    } else if (game.canvas.pointsOnUi(pos, game.ui.buildMenu)) { //in menu menu
                        var option = game.canvas.pointsOnUi(pos, game.ui.buildMenu.option);
                        if (option && option.price <= game.gold) {
                            game.ui.buildMenu.option.options.forEach(function (o) { o.selected = false; }); //reset all selecteds
                            option.selected = true;
                            game.canvasElm.defaultCursor = "crosshair";
                        } else if (game.canvas.pointsOnUi(pos, game.ui.buildMenu.option.selected.cancel)) { //clicked to cancel selected build option
                            game.ui.buildMenu.option.options.forEach(function (o) { o.selected = false; }); //reset all selecteds
                            game.canvasElm.defaultCursor = "initial ";
                        }

                    } else {
                        var selected = game.ui.buildMenu.option.options.filter(function (o) { return o.selected; })[0];
                        if (selected && selected.price <= game.gold) { //selcted build item over rest of canvas
                            if (selected.type == unit) {
                                if (selected.model.isBuildable(position)) { //no other unit is there
                                    var newUnit = unit.createUnit(selected.model.type, node, offset);
                                    game.units.all.push(newUnit);
                                    game.gold -= selected.price;
                                };
                            } else if (selected.type == landNode && node.isBuildable()) {
                                node.type = selected.img;
                                game.gold -= selected.price;
                            } else if (selected.type == 'remove') {
                                var hoverOverUnit = game.units.all.reduce(function (current, u) {
                                    if (u.position.node == game.canvasElm.hover.node) {
                                        var dist = u.getOffsetDistanceFrom(game.canvasElm.hover).dist;
                                        if (dist < current.dist) {
                                            return { u: u, dist: dist };
                                        }
                                    }
                                    return current;
                                }, { dist: Infinity }).u;
                                if (hoverOverUnit) {
                                    game.units.all = game.units.all.filter(function (u) { return u != hoverOverUnit; });
                                    game.gold += game.ui.buildMenu.option.options.filter(function (o) { return o.model && o.model.type == hoverOverUnit.type; })[0].price;
                                } else if (game.ui.buildMenu.option.options.map(function (b) { return b.img; }).includes(position.node.type)) { //a node type build option
                                    game.gold += game.ui.buildMenu.option.options.filter(function (o) { return o.type == landNode && o.img == position.node.type; })[0].price;
                                    position.node.type = landNode.types.grass;
                                }
                            }

                            if (selected.price > game.gold) {
                                game.canvasElm.defaultCursor = "initial ";
                                selected.selected = false;
                            }
                        }
                    }
                    break;
                case game.phase.types.battleEnd:
                    if (game.canvas.pointsOnUi(pos, game.ui.summary.btn)) {
                        game.phase.current = game.phase.types.buildStart;
                    }
                    if (game.canvas.pointsOnUi(pos, game.ui.summary.save)) {
                        game.saveGame();
                    }
                    break;
                case game.phase.types.start:
                    if (game.canvas.pointsOnUi(pos, game.ui.start.btn)) {
                        game.phase.current = game.phase.types.buildStart;
                    }
                    if (game.canvas.pointsOnUi(pos, game.ui.start.load)) {
                        game.loadGame();
                        game.phase.current = game.phase.types.battleEnd;
                    }
            }
        }
    },
    hoverOnCanvas: function (event) {
        this.crazyLock = ++this.crazyLock > 3 ? 0 : this.crazyLock;
        if (this.crazyLock)
            return;

        var pos = game.canvas.getCanvasPoints(event);
        this.defaultCursor = this.defaultCursor || "initial";
        switch (game.phase.current) {
            case game.phase.types.battle:
                if (!game.canvas.pointsOnUi(pos, game.ui.map) && game.canvas.getHordelingByCanvasPoints(pos.x, pos.y)) { //hover on non-map AND over hordeling
                    this.style.cursor = "pointer";
                } else {
                    this.style.cursor = this.defaultCursor = "initial";
                }
                break;
            case game.phase.types.build:
                var canvas = game.canvasElm;
                var grid = game.map.grid;
                var hoverSize = game.nodeSize / 2;
                var currentNode = game.player.position.node;
                this.style.cursor = this.defaultCursor;
                delete game.canvasElm.hover;
                if (game.canvas.pointsOnUi(pos, game.ui.buildMenu.startRound.btn)) {//start round tbn
                    this.style.cursor = "pointer";
                } else if (game.canvas.pointsOnUi(pos, game.ui.buildMenu)) {
                    var buildOption = game.canvas.pointsOnUi(pos, game.ui.buildMenu.option);
                    this.style.cursor = "initial";
                    if (buildOption) { //build menu options
                        if (game.gold < buildOption.price) {
                            this.style.cursor = "not-allowed";
                        } else {
                            this.style.cursor = "pointer";
                        }
                    } else if (game.canvas.pointsOnUi(pos, game.ui.buildMenu.option.selected.cancel)) {
                        this.style.cursor = "pointer";
                    }
                } else if (!game.canvas.pointsOnUi(pos, game.ui.map) && !game.canvas.pointsOnUi(pos, game.ui.buildMenu)) {
                    if (pos.y > canvas.height - hoverSize && grid[currentNode.x][currentNode.y + 3] && grid[currentNode.x][currentNode.y + 3].isVisible) { //scroll down            
                        game.player.position.node = grid[currentNode.x][currentNode.y + 1];
                        game.moveMap(game.player.position.node);
                        this.style.cursor = "move";
                    } else if (pos.y < hoverSize && grid[currentNode.x][currentNode.y - 3] && grid[currentNode.x][currentNode.y - 3].isVisible) { //scroll up
                        game.player.position.node = grid[currentNode.x][currentNode.y - 1];
                        game.moveMap(game.player.position.node);
                        this.style.cursor = "move";
                    } else if (pos.x > canvas.width - hoverSize && grid[currentNode.x + 3] && grid[currentNode.x + 3][currentNode.y].isVisible) { //scroll right
                        game.player.position.node = grid[currentNode.x + 1][currentNode.y];
                        game.moveMap(game.player.position.node);
                        this.style.cursor = "move";
                    } else if (pos.x < hoverSize && grid[currentNode.x - 3] && grid[currentNode.x - 3][currentNode.y].isVisible) { //scroll left
                        game.player.position.node = grid[currentNode.x - 1][currentNode.y];
                        game.moveMap(game.player.position.node);
                        this.style.cursor = "move";
                    }
                    //hovering with seelcted build option
                    game.canvasElm.hover = game.canvas.getPositionByPoints(pos);
                    var selected = game.ui.buildMenu.option.options.filter(function (o) { return o.selected; })[0];
                    if (game.canvasElm.hover.node && selected && (selected.type == unit && !selected.model.isBuildable(game.canvasElm.hover) || ![unit, 'remove'].includes(selected.type) && !game.canvasElm.hover.node.isBuildable())) { //can't place selected build option here
                        delete game.canvasElm.hover;
                        this.style.cursor = "not-allowed";
                    }
                }

                break;
            case game.phase.types.battleEnd:
                if (game.canvas.pointsOnUi(pos, game.ui.summary.btn) || game.canvas.pointsOnUi(pos, game.ui.summary.save)) {
                    this.style.cursor = "pointer";
                } else {
                    this.style.cursor = "initial";
                }
                break;
            case game.phase.types.start:
                if (game.canvas.pointsOnUi(pos, game.ui.start.btn) || game.canvas.pointsOnUi(pos, game.ui.start.load)) {
                    this.style.cursor = "pointer";
                } else {
                    this.style.cursor = "initial";
                }
        }
    },
    getCanvasPoints: function (event) {
        var rect = game.canvasElm.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        return { x: x, y: y };
    },
    getPositionByPoints: function (pos) {
        var adjustedX = pos.x + game.player.position.offset.x * game.offsetSize - Math.floor(game.nodeSize / 2);
        var adjustedY = pos.y + +game.player.position.offset.y * game.offsetSize - Math.floor(game.nodeSize / 2);;
        var nodeX = Math.floor(adjustedX / game.nodeSize);
        var nodeY = Math.floor(adjustedY / game.nodeSize);

        var node = game.screen.filter(function (n) { return n.canvas && n.canvas.x == nodeX && n.canvas.y == nodeY; })[0];
        var offset;
        if (node) {

            offset = {
                x: Math.floor(adjustedX % game.nodeSize / game.offsetSize),
                y: Math.floor(adjustedY % game.nodeSize / game.offsetSize)
            };
        }
        return { node: node, offset: offset };
    },
    getHordelingByCanvasPoints: function (x, y) {
        var hrs = game.horde.hordelings.filter(function (h) { return h.action != unit.actions.dead; });
        for (var i = 0; i < hrs.length; i++) {
            var hor = hrs[i];
            if (x > hor.animate.canvasX && x < hor.animate.canvasX + hor.sWidth && y > hor.animate.canvasY && y < hor.animate.canvasY + hor.sHeight) {
                return hor;
            }
        }
    },
    pointsOnUi: function (pos, ui) {

        switch (ui) {
            case game.ui.summary.btn:
                var nextRoundBtn = { minX: game.ui.summary.x + game.ui.summary.btn.x, minY: game.ui.summary.y + game.ui.summary.btn.y, maxX: game.ui.summary.x + game.ui.summary.btn.x + game.ui.summary.btn.width, maxY: game.ui.summary.y + game.ui.summary.btn.y + game.ui.summary.btn.height };
                return pos && pos.x > nextRoundBtn.minX && pos.x < nextRoundBtn.maxX && pos.y > nextRoundBtn.minY && pos.y < nextRoundBtn.maxY;
            case game.ui.summary.save:
                var saveBtn = { minX: game.ui.summary.x + game.ui.summary.save.x, minY: game.ui.summary.y + game.ui.summary.save.y, maxX: game.ui.summary.x + game.ui.summary.save.x + game.ui.summary.save.width, maxY: game.ui.summary.y + game.ui.summary.save.y + game.ui.summary.save.height };
                return pos && pos.x > saveBtn.minX && pos.x < saveBtn.maxX && pos.y > saveBtn.minY && pos.y < saveBtn.maxY;
            case game.ui.map:
                return pos && pos.x > game.ui.map.x && pos.y > game.ui.map.y;
            case game.ui.buildMenu.option: //returns which option
                var buildMenu = game.ui.buildMenu;
                return buildMenu.option.options.filter(function (o, i) {
                    var x = buildMenu.x + (buildMenu.option.width + 2 * buildMenu.option.margin) * i + buildMenu.option.margin;
                    var y = buildMenu.y + buildMenu.option.margin;
                    return pos.x > x && pos.x < x + buildMenu.option.width && pos.y > y && pos.y < y + buildMenu.option.height;
                })[0];

            case game.ui.buildMenu:
                buildMenu = game.ui.buildMenu;

                return pos.x > buildMenu.x && pos.x < buildMenu.x + buildMenu.width && pos.y > buildMenu.y + buildMenu.gold.y && pos.y < buildMenu.y + buildMenu.height;
            case game.ui.buildMenu.option.selected.cancel:
                buildMenu = game.ui.buildMenu;
                return buildMenu.option.options.filter(function (o, i) {
                    var x = buildMenu.x + (buildMenu.option.width + 2 * buildMenu.option.margin) * i + buildMenu.option.margin + buildMenu.option.width - buildMenu.option.selected.cancel.radius;
                    var y = buildMenu.y + buildMenu.option.margin - buildMenu.option.selected.cancel.radius;
                    return o.selected && pos.x > x && pos.x < x + buildMenu.option.selected.cancel.radius * 2 && pos.y > y && pos.y < y + buildMenu.option.selected.cancel.radius * 2;
                })[0];
            case game.ui.start.btn:
                var start = game.ui.start;
                var startGameBtn = { minX: start.x + start.btn.width / 2, maxX: start.x + start.btn.width / 2 + start.btn.width, minY: start.y + start.btn.y, maxY: start.y + start.btn.y + start.btn.height };
                return pos && pos.x > startGameBtn.minX && pos.x < startGameBtn.maxX && pos.y > startGameBtn.minY && pos.y < startGameBtn.maxY;
            case game.ui.start.load:
                start = game.ui.start;
                var loadGameBtn = { minX: start.x + start.load.width / 2, maxX: start.x + start.load.width / 2 + start.load.width, minY: start.y + start.load.y, maxY: start.y + start.load.y + start.load.height };
                return localStorage.save && pos && pos.x > loadGameBtn.minX && pos.x < loadGameBtn.maxX && pos.y > loadGameBtn.minY && pos.y < loadGameBtn.maxY;
            case game.ui.buildMenu.startRound.btn:
                start = game.ui.buildMenu.startRound;
                buildMenu = game.ui.buildMenu;
                var startRoundBtn = { minX: buildMenu.x + start.x + start.btn.x, maxX: buildMenu.x + start.x + start.btn.x + start.btn.width, minY: buildMenu.y + start.y + start.btn.y, maxY: buildMenu.y + start.y + start.btn.y + start.btn.height };
                return pos && pos.x > startRoundBtn.minX && pos.x < startRoundBtn.maxX && pos.y > startRoundBtn.minY && pos.y < startRoundBtn.maxY;
        }
    }
}