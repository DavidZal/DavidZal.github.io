function catapult(type, node) {

    this.sprite = new Image();
    this.sprite.src = "images/catapult.png";
    this.sWidth = 100;
    this.sHeight = 100;
    this.speed = 14;
    this.life = 10;
    this.strength = 1;
    this.range = 5;
    this.minRange = 2;
    this.multiProjectileAngle = 20;
    this.isMobile = false;

    this.animate = {
        source: {
            down: { sx: 0, sy: 0 },
            attack: { sy: 0, syLeft: 100 },
            die: { sy: 200 }
        }
    }

    unit.call(this, type, node);
}

catapult.prototype = new unit();

catapult.prototype.attack = function (target) {
    var me = this;
    if (me.action != unit.actions.attacking) { //start of attack, rest frame
        me.frame = 0;
        me.action = unit.actions.attacking;
        var distObj = target.getOffsetDistanceFrom(me);

        if (distObj && distObj.dir.some(function (d) { return new RegExp(d, 'i').test(unit.directions.right); })) {
            me.animate.sy = me.animate.source.attack.syLeft; //face left
        } else {
            me.animate.sy = me.animate.source.attack.sy; //face right
        }
    } else {
        this.frame++;
    }

    me.animate.sx = me.frame * me.sWidth;

    if (this.frame == 5) { //fire 

        me.fireProjectiles(me.target.position.node, me.target.position.offset);

    } else if (this.frame == 9) {
        me.frame = 0;
        me.action = unit.actions.nothing;
        me.target = null;
    }
};

catapult.prototype.fireProjectiles = function (node, offset) {
    var me = this;

    var catapultX = me.position.node.x * game.offsetSize + me.position.offset.x;
    var catapultY = me.position.node.y * game.offsetSize + me.position.offset.y;

    //reduce by 90% to hit in front of target
    var targetX = (node.x * game.offsetSize + offset.x - catapultX)*0.9;
    var targetY = (node.y * game.offsetSize + offset.y - catapultY) * 0.9;

    var radius = Math.sqrt(Math.pow(targetX, 2) + Math.pow(targetY, 2));

    var angle = Math.atan2(targetX, targetY) * 360 / (2 * Math.PI);

    //center fireball
    var fireball = unit.createUnit(unit.types.fireball, me.position.node, { x: me.position.offset.x, y: me.position.offset.y });
    fireball.handleMovement(node, { x: offset.x, y: offset.y });
    game.units.arrows.push(fireball);

    //add two more fireballs
    [angle + me.multiProjectileAngle, angle - me.multiProjectileAngle].forEach(function (a) {

        a = a * Math.PI / 180;//in radians
        var bigX = catapultX + radius * Math.sin(a);
        var bigY = catapultY + radius * Math.cos(a);

        var newOffset = { x: Math.floor(bigX % game.offsetSize), y: Math.floor(bigY % game.offsetSize) };
        var nodeX = Math.floor((bigX - newOffset.x) / game.offsetSize);
        var nodeY = Math.floor((bigY - newOffset.y) / game.offsetSize);

        if (nodeX >= game.map.fullSize) { //adjust if off map
            nodeX = game.map.fullSize - 1;
        } else if (nodeX < 0) {
            nodeX = 0;
        }
        if (nodeY >= game.map.fullSize) {
            nodeY = game.map.fullSize - 1;
        } else if (nodeY < 0) {
            nodeY = 0;
        }

        var newNode = game.map.grid[nodeX][nodeY];
        fireball = unit.createUnit(unit.types.fireball, me.position.node, { x: me.position.offset.x, y: me.position.offset.y });
        fireball.handleMovement(newNode, newOffset);
        game.units.arrows.push(fireball);
    });
}
