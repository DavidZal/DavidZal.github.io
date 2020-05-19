function knight(type, node, offset) {

    this.sprite = new Image();
    this.sprite.src = "images/knight.png";
    this.sWidth = 56;
    this.sHeight = 73;
    this.speed = 3;
    this.life = 4;
    this.strength = 1;
    this.isMobile = true;

    this.animate = {
        source: {
            up: { sy: 73 },
            down: { sy: 0 },
            left: { sy: 146 },
            right: { sy: 219 },
            attack: { sy: 292 },
            die: { sy: 365 }
        }
    }

    unit.call(this, type, node, offset);
}

knight.prototype = new unit();

knight.prototype.ai = function () {
    var me = this;

    switch (me.action) {
        case unit.actions.nothing:

            var target = me.getHordelingWithinRange(); //if enemy within range, attack
            if (target) {
                me.target = target;
                me.attack(target);
            } else {
                target = game.horde.hordelings.filter(function (h) { return h.action != unit.actions.dead && h.getOffsetDistanceFrom(me).dist < 3 * game.offsetSize; })[0]; //if enemy within visible range
                if (target) {
                    me.target = target;
                    me.handleMovement(me.target.position.node, me.target.position.offset);
                } else if (me.position.node.distFromNode(game.player.position.node) > 2) { //if chauncey moved away from him
                    me.handleMovement(game.player.position.node, game.getRandomOffset());
                }
            }
            break;
        case unit.actions.walking:
            if (me.target && me.target.action == unit.actions.dead) { //target is dead
                me.action = unit.actions.nothing;
                me.target = null;
            } else if (me.target && me.target.getOffsetDistanceFrom(me).dist < me.range) { //in range of target
                me.attack(me.target);
            } else {
                var nearByH = game.horde.hordelings.filter(function (h) { return h.action != unit.actions.dead && h.getOffsetDistanceFrom(me).dist < me.range; })[0];
                if (nearByH) { //ran into a different target
                    me.target = nearByH;
                    me.attack(me.target);
                } else { //keep walkin'
                    me.handleFrames();
                }
            }
            break;
        case unit.actions.attacking:
            if (me.target && me.target.action != unit.actions.dead) {
                me.attack(me.target);
            } else {
                me.target = null;
                me.action = unit.actions.nothing;
            }
            break;
    }
};
knight.prototype.attack = function (target) {
    var me = this;

    if (me.action != unit.actions.attacking) { //start of attack
        me.frame = 0;
        me.action = unit.actions.attacking;
        me.animate.sy = me.animate.source.attack.sy;
    } else {
        this.frame = ++this.frame > 3 ? 0 : this.frame;
    }

    me.animate.sx = me.frame * me.sWidth;

    if (this.frame == 1 && target.gotAttacked(me.strength)) { //attacks on frame 1. if killed enemy...
        me.target = null;
    } else if (this.frame == 3 && !me.target) { //attack animation ends on frame 3. if enemy is dead, do nothing
        me.action = unit.actions.nothing;
        me.walk(unit.directions.down);
    }
};
