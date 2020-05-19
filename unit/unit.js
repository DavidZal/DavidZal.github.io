function unit(type, node, offset) {

    if (!arguments.length)
        return;

    var me = this;
    me.type = type;
    me.frame = 0;

    me.walkTo = {}; //path,offset,targetNode,targetOffset
    me.position = { node: node, offset: offset }; //node, offset
    if (game && !offset) {
        me.position.offset = {
            x: Math.floor(game.offsetSize / 2),
            y: Math.floor(game.offsetSize / 2)
        }
    }
    me.action = unit.actions.nothing;
    me.animate = me.animate || {};
    me.animate.lifeLossTexts = [];
    switch (type) {
        case unit.types.chauncey:
            loadChauncey();
            break;
        case unit.types.hordeling1:
            loadHorde1();
            break;
        case unit.types.hordeling2:
            loadHorde2();
            break;
        case unit.types.hordeling3:
            loadHorde3();
            break;
        case unit.types.guard:
            loadguard();
            break;
        case unit.types.arrow:
            loadArrow();
            break;
    }

    this.walk(unit.directions.down);
    //prepare start
    me.start = {
        life: me.life,
        position: {
            node: me.position.node
        }
    }

    if (me.position.offset) {
        me.start.position.offset = {
            x: me.position.offset.x,
            y: me.position.offset.y
        }
    }

    if (game) {
        me.range = (me.range || 0.5) * game.offsetSize; //range in offsets
        me.minRange = (me.minRange || 0) * game.offsetSize;
    }

    me.tickerOffset = Math.floor(Math.random() * me.speed);


    function loadChauncey() {
        me.sprite = new Image();
        me.sprite.src = "images/sprite.png";
        me.sWidth = 56;
        me.sHeight = 56;
        me.speed = 2;
        me.life = 10;
        me.strength = 1;
        me.dizziness = 0;
        me.isMobile = true;

        me.animate.source = {
            up: { sy: 168 },
            down: { sy: 0 },
            left: { sy: 56 },
            right: { sy: 112 },
            attack: { sy: 224 },
            dizzy: { sy: 336 },
            die: { sy: 280 }
        }

    };

    function loadHorde1() {
        me.sprite = new Image();
        me.sprite.src = "images/horde1.png";
        me.sWidth = 56;
        me.sHeight = 56;
        me.speed = 12;
        me.life = 1;
        me.strength = 1;
        me.isMobile = true;

        me.animate.source = {
            up: { sy: 168 },
            down: { sy: 0 },
            left: { sy: 56 },
            right: { sy: 112 },
            die: { sy: 224 },
            attack: { sy: 280 },
        }
    }

    function loadHorde2() {
        me.sprite = new Image();
        me.sprite.src = "images/horde2.png";
        me.sWidth = 56;
        me.sHeight = 56;
        me.speed = 6;
        me.life = 1;
        me.strength = 1;
        me.isMobile = true;

        me.animate.source = {
            up: { sy: 168 },
            down: { sy: 0 },
            left: { sy: 56 },
            right: { sy: 112 },
            die: { sy: 224 },
            attack: { sy: 280 },
        }
    }

    function loadHorde3() {
        me.sprite = new Image();
        me.sprite.src = "images/horde3.png";
        me.sWidth = 112;
        me.sHeight = 112;
        me.speed = 22;
        me.life = 10;
        me.strength = 2;
        me.isMobile = true;

        me.animate.source = {
            up: { sy: 336 },
            down: { sy: 0 },
            left: { sy: 112 },
            right: { sy: 224 },
            die: { sy: 448 },
            attack: { sy: 560 },
        }
        me.bulk = 0.5 * game.offsetSize;
    }

    function loadguard() {
        me.sprite = new Image();
        me.sprite.src = "images/guard.png";
        me.sWidth = 56;
        me.sHeight = 53;
        me.speed = 8;
        me.life = 3;
        me.strength = 1;
        me.isMobile = false;

        me.animate.source = {
            up: { sy: 53 },
            down: { sy: 0 },
            left: { sy: 106 },
            right: { sy: 159 },
            attack: { sy: 212 },
            die: { sy: 265 }
        }
    }

    function loadArrow() {
        me.sprite = new Image();
        me.sprite.src = "images/arrow.png";
        me.sWidth = 35;
        me.sHeight = 40;
        me.speed = 2;
        me.life = 1;
        me.strength = 1;
        me.range = 0.2;
        me.isMobile = true;

        me.animate.source = {
            up: { sx: 0, sy: 0 },
            down: { sx: 147, sy: 36 },
            right: { sx: 0, sy: 40 },
            left: { sx: 135, sy: 120 },
            upleft: { sx: 65, sy: 90 },
            upright: { sx: 70, sy: 0 },
            downleft: { sx: 65, sy: 120 },
            downright: { sx: 70, sy: 40 },
        }
    }

}

unit.prototype.walk = function (dir) {

    var sx = this.animate.source[dir].sx;
    var sy = this.animate.source[dir].sy;

    this.frame = ++this.frame > 3 ? 0 : this.frame;
    this.animate.img = this.sprite;
    this.animate.sx = sx == undefined ? this.frame * this.sWidth : sx;
    this.animate.sy = sy;
    this.animate.sWidth = this.sWidth;
    this.animate.sHeight = this.sHeight;
    this.direction = unit.directions[dir];
};


unit.prototype.updateTargetNode = function () {
    var pos = this.position;
    var maxOffset = game.offsetSize;

    var walkTo = this.walkTo;
    if (pos.node.x != walkTo.targetNode.x) {
        pos.offset.x = pos.offset.x == 0 ? maxOffset - 1 : 0;
    }

    if (pos.node.y != walkTo.targetNode.y) {
        pos.offset.y = pos.offset.y == 0 ? maxOffset - 1 : 0;
    }

    pos.node = walkTo.targetNode;
    delete walkTo.targetOffset; //so it will be re-defined later
};
unit.prototype.handleMovement = function (destination, offset) {

    this.walkTo.path = astar.search(game.map, this.position.node, destination, this);
    this.walkTo.offset = offset || {
        x: Math.floor(game.offsetSize / 2),
        y: Math.floor(game.offsetSize / 2)
    };
    this.action = unit.actions.walking;
};


unit.prototype.gotAttacked = function (strength) {
    this.life -= strength;

    if (this.life < 1) { //got killed
        this.life = 0;
        this.die();
    } else {
        if (this.type == unit.types.chauncey) { //its chauncey
            this.action = unit.actions.reeling;
            var neys = game.map.getNeighbors(this.position.node).filter(function (n) { return n.isWalkable(); });
            var node = neys[Math.floor(Math.random() * neys.length)];
            this.walkTo.path = astar.search(game.map, this.position.node, node, this);
            this.walkTo.offset = this.position.offset;
        }
    }

    this.animate.lifeLossTexts.push({ text: "life: " + this.life });
    return !this.life; //true if dead
};

unit.prototype.die = function () {
    this.action = unit.actions.dead;
    if (this.target) {
        this.target.underAttack = false;
        this.target = null;
    }

    this.animate.sx = 0;
    this.animate.sy = this.animate.source.die.sy;

}

unit.prototype.isWalkable = function (node) {

    if ([unit.types.arrow, unit.types.fireball].includes(this.type)) //projectiles fly over everything
        return true;

    //shared
    var nodeType = node.type;
    if ([landNode.types.black, landNode.types.water, landNode.types.house, landNode.types.mill, landNode.types.castle].includes(nodeType)) {
        return false;
    }

    switch (this.type) {
        case unit.types.chauncey:
            if ([landNode.types.spikePit, landNode.types.cow].includes(nodeType))
                return false;
            break;
        case unit.types.hordeling1:
            break;
    }

    return true;
}

unit.prototype.ai = function () { //for guards
    var me = this;
    switch (me.action) {
        case unit.actions.nothing:
            switch (me.type) {
                case unit.types.guard:
                    var target = me.getHordelingWithinRange(); //if enemy within range, attack
                    if (target) {
                        me.target = target;
                        me.attack(target);
                    } else {
                        target = game.horde.hordelings.filter(function (h) { return h.action != unit.actions.dead && h.position.node == me.position.node; })[0]; //if enemy within node, walk
                        if (target) {
                            me.target = target;
                            me.handleMovement(me.target.position.node, me.target.position.offset);
                        }
                    }
                    break;

                case unit.types.arrow:
                    game.units.arrows = game.units.arrows.filter(function (a) { return a != me; });
                    break;

                case unit.types.archer:
                case unit.types.catapult:
                    target = me.getHordelingWithinRange();

                    if (target) {
                        me.target = target;
                        me.attack(target);
                    } else {
                        me.walk(unit.directions.down);//just for animatation
                    }
                    break;
            }
            break;
        case unit.actions.walking:
            if (me.target && me.target.action == unit.actions.dead) { //target is dead
                me.action = unit.actions.nothing;
                me.target = null;
            } else if (me.target && me.target.getOffsetDistanceFrom(me).dist < me.range) { //in range of target
                me.attack(me.target);
            } else { //keep walkin'
                me.handleFrames();
            }
            break;
        case unit.actions.attacking:
            me.attack(me.target);
            break;

    }
}

unit.prototype.handleFrames = function () {
    var me = this;
    var position = me.position;
    var walkTo = me.walkTo;

    if (!walkTo.targetOffset) { //create target offset if it doesn't exist
        if (walkTo.path.length) {
            walkTo.targetNode = walkTo.path.pop();
            walkTo.targetOffset = { x: position.offset.x, y: position.offset.y };

            if (walkTo.targetNode.x < position.node.x) { //above
                walkTo.targetOffset.x = 0;
            } else if (walkTo.targetNode.x > position.node.x) { //below
                walkTo.targetOffset.x = game.offsetSize - 1;
            }

            if (walkTo.targetNode.y < position.node.y) { //left
                walkTo.targetOffset.y = 0;
            } else if (walkTo.targetNode.y > position.node.y) { //right
                walkTo.targetOffset.y = game.offsetSize - 1;
            }
        } else {
            walkTo.targetNode = position.node;
            walkTo.targetOffset = walkTo.offset;
        }
    }

    if (position.offset.x == walkTo.targetOffset.x && position.offset.y == walkTo.targetOffset.y) { //reached target offset
        if (walkTo.targetNode != position.node && me.isWalkable(walkTo.targetNode)) { //have more to walk
            me.updateTargetNode(); //update targetNode & offset
        } else {
            me.action = unit.actions.nothing; //reached target spot
            me.walkTo = {};
        }
    } else { //targetoffset is defined, but we're not there yet

        var dir = [];

        if (walkTo.targetOffset.x > position.offset.x) {
            position.offset.x++;
            dir.push(unit.directions.right);
        } else if (walkTo.targetOffset.x < position.offset.x) {
            position.offset.x--;
            dir.push(unit.directions.left);
        }
        if (walkTo.targetOffset.y > position.offset.y) {
            position.offset.y++;
            dir.push(unit.directions.down);
        } else if (walkTo.targetOffset.y < position.offset.y) {
            position.offset.y--;
            dir.push(unit.directions.up);

        }

        //check if unit has diagonal movement animation
        if (me.animate.source.downLeft && dir.length == 2) {
            if (dir.includes(unit.directions.up) && dir.includes(unit.directions.right)) {
                me.walk(unit.directions.upright);
            } else if (dir.includes(unit.directions.up) && dir.includes(unit.directions.left)) {
                me.walk(unit.directions.upleft);
            } else if (dir.includes(unit.directions.down) && dir.includes(unit.directions.right)) {
                me.walk(unit.directions.downright);
            } else if (dir.includes(unit.directions.down) && dir.includes(unit.directions.left)) {
                me.walk(unit.directions.downleft);
            }
        } else {
            me.walk(dir.pop());
        }

    }

    //console.log("pos node x: " + position.node.x + " y: " + position.node.y + "\n pos offset x: " + position.offset.x + " y: " + position.offset.y);
},


    unit.prototype.attack = function (target) {
        var me = this;
        switch (me.type) {
            case unit.types.chauncey:  //chauncey attacks all enemies around
                me.frame = 0;
                me.animate.sx = me.frame * me.sWidth;
                if (me.dizziness > 140) {
                    me.action = unit.actions.dizzy;
                    me.animate.sy = me.animate.source.dizzy.sy;
                } else {
                    me.action = unit.actions.attacking;
                    me.animate.sy = me.animate.source.attack.sy;
                }

                break;
            case unit.types.guard:

                this.frame = ++this.frame > 3 ? 0 : this.frame;
                me.animate.sy = me.animate.source.attack.sy;
                me.animate.sx = me.frame * me.sWidth;
                me.action = unit.actions.attacking;
                if (this.frame % 2) { //attacks every other frame. if killed enemy...
                    target.gotAttacked(me.strength);
                }
                if (target.life < 1) { //killed
                    me.target = null;
                    me.action = unit.actions.nothing;
                    me.walk(unit.directions.down);
                }

                break;

            case unit.types.arrow:
                target.gotAttacked(me.strength);
                game.units.arrows = game.units.arrows.filter(function (a) { return a != me; }); //remove arrow
                break;
        }
    }

unit.prototype.isBuildable = function (pos) { //when placing units => 4 max per node, diff offset, on grass or road
    var node = pos.node;
    var offset = pos.offset;
    var unitsOnSameNode = game.units.all.filter(function (u) { return u.position.node == node; });
    return unitsOnSameNode.length < 5 && !unitsOnSameNode.some(function (u) { return u.position.offset.x == offset.x && u.position.offset.y == offset.y || u.type == unit.types.catapult; }) && [landNode.types.grass, landNode.types.road].includes(node.type);
}

unit.prototype.restoreStart = function () {
    this.life = this.start.life;
    this.position.node = this.start.position.node;
    this.position.offset.x = this.start.position.offset.x;
    this.position.offset.y = this.start.position.offset.y;
    this.action = unit.actions.nothing;
    this.walk(unit.directions.down);
}

unit.prototype.getHordelingWithinRange = function () { //get closest hordeling within range 
    var me = this;
    return game.horde.hordelings.reduce(function (current, h) {
        if (h.action != unit.actions.dead) {
            var dist = h.getOffsetDistanceFrom(me).dist;
            if (dist < me.range && dist >= me.minRange && dist < current.dist) { //catapults have min ranges
                return { h: h, dist: dist };
            }
        }
        return current;
    }, { dist: Infinity }).h;
}

unit.prototype.getOffsetDistanceFrom = function (from) {
    var dx, dy, offsetsInANode = game.nodeSize / game.offsetSize;
    var dist = 100;
    var dir = [];
    if (from.position) {
        if (from.position.offset) {
            dx = this.position.node.x * offsetsInANode + this.position.offset.x - from.position.node.x * offsetsInANode - from.position.offset.x;
            dy = this.position.node.y * offsetsInANode + this.position.offset.y - from.position.node.y * offsetsInANode - from.position.offset.y;
        } else {     //targets that take up the whole node, like a house
            var fakeOffset = { x: 0, y: 0 };
            if (this.position.node.x == from.position.node.x) {
                fakeOffset.x = this.position.offset.x;
            } else if (this.position.node.x > from.position.node.x) {
                fakeOffset.x = offsetsInANode - 1;
            }
            if (this.position.node.y == from.position.node.y) {
                fakeOffset.y = this.position.offset.y;
            } else if (this.position.node.y > from.position.node.y) {
                fakeOffset.y = offsetsInANode - 1;
            }
            dx = this.position.node.x * offsetsInANode + this.position.offset.x - from.position.node.x * offsetsInANode - fakeOffset.x;
            dy = this.position.node.y * offsetsInANode + this.position.offset.y - from.position.node.y * offsetsInANode - fakeOffset.y;
        }
        dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) - (this.bulk >> 0); //big hordelings are "closer"

        //the enemy is to the [dir] of me...
        if (dx > 0) {
            dir.push(unit.directions.left);
        }
        else if (dx < 0) {
            dir.push(unit.directions.right);
        }

        if (dy > 0) {
            dir.push(unit.directions.up);
        }
        else if (dy < 0) {
            dir.push(unit.directions.down);
        }
    }
    return { dist: dist, dir: dir };
};


unit.actions = {
    inactive: -1,
    nothing: 0,
    walking: 1,
    attacking: 2,
    underAttack: 3,
    dead: 4,
    reeling: 5,
    dizzy: 6,
    swarming: 7
};

unit.directions = {
    up: 'up',
    right: 'right',
    down: 'down',
    left: 'left',
    upright: 'upright',
    downright: 'downright',
    upleft: 'upleft',
    downleft: 'downleft',
}

unit.types = {
    chauncey: "chauncey",
    hordeling1: "hordeling1",
    guard: "guard",
    hordeling2: "hordeling2",
    hordeling3: "hordeling3",
    hordeling4: "hordeling4",
    archer: "archer",
    knight: "knight",
    arrow: "arrow",
    catapult: "catapult",
    fireball: "fireball",
    shamanFireball:"shamanFireball"
}

unit.createUnit = function (type, node, offset) {
    switch (type) {
        case unit.types.knight:
            return new knight(type, node, offset);
        case unit.types.archer:
            return new archer(type, node, offset);
        case unit.types.catapult:
            return new catapult(type, node, offset);
        case unit.types.fireball:
            return new fireball(type, node, offset);
        default:
            return new unit(type, node, offset);
    }
}