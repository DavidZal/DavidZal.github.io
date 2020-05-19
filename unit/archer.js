function archer(type, node,offset) {

    this.sprite = new Image();
    this.sprite.src = "images/archer.png";
    this.sWidth = 56;
    this.sHeight = 56;
    this.speed = 12;
    this.life = 2;
    this.strength = 1;
    this.range = 3;
    this.isMobile = false;

    this.animate = {
        source: {
            down: { sx: 0, sy: 0 },
            attack: { sy: 120, syLeft: 175 },
            die: { sy: 70 }
        }
    }

    unit.call(this, type, node,offset);
}

archer.prototype = new unit();

archer.prototype.attack = function (target) {
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

    if (this.frame == 4) {
        if (me.target && me.target.action != unit.actions.dead && me.target.getOffsetDistanceFrom(me).dist < me.range) { //fire at target
            me.fireArrow(me.target);
        } else {
            target = me.getHordelingWithinRange();
            if (target) {
                me.target = target;
                //shoot at other enemy
                me.fireArrow(target);
            } else {
                me.action = unit.actions.nothing;
                me.target = null;
            }
        }
    } else if (this.frame == 5) {
        me.frame = 0;
    }
};

archer.prototype.fireArrow = function (target) {
    var me = this;
    var arrow = unit.createUnit(unit.types.arrow, me.position.node, { x: me.position.offset.x, y: me.position.offset.y });
    arrow.target = target || me.target;
    arrow.handleMovement(arrow.target.position.node, arrow.target.position.offset);
    game.units.arrows.push(arrow);
}