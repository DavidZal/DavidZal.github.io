function fireball(type, node) {

    this.sprite = new Image();
    this.sprite.src = "images/fireball.png";
    this.sWidth = 38;
    this.sHeight = 38;
    this.speed = 2;
    this.life = 1;
    this.strength = 4;
    this.range = 1;
    this.animate = {
        source: {
            up: { sx: 228, sy: 0 },
            down: { sx: 76, sy: 0 },
            right: { sx: 0, sy: 0 },
            left: { sx: 152, sy: 0 },
            upleft: { sx: 190, sy: 0 },
            upright: { sx: 266, sy: 0 },
            downleft: { sx: 228, sy: 0 },
            downright: { sx: 38, sy: 0 },
            attack: { sy: 38 },
        }
    }

    unit.call(this, type, node);
}

fireball.prototype = new unit();


fireball.prototype.ai = function () {
    var me = this;

    switch (me.action) {
        case unit.actions.nothing:
            me.attack();
            break;
        case unit.actions.walking:
            //no target, just keep on walkin'
            me.handleFrames();
            break;
        case unit.actions.attacking:
            me.attack();
            break;
    }
}

fireball.prototype.attack = function () {
    var me = this;
    if (me.action != unit.actions.attacking) { //start of attack, rest frame
        me.frame = 0;
        me.action = unit.actions.attacking;
        me.animate.sy = me.animate.source.attack.sy;
    } else {
        this.frame++;
    }

    me.animate.sx = me.frame * me.sWidth;

    if (this.frame == 1) { //explode, split damage amongst all in range

        var hordelingsInRange = game.horde.hordelings.filter(function (h) { return h.action != unit.actions.dead && h.getOffsetDistanceFrom(me).dist < me.range; });
        if (hordelingsInRange.length) {
            var hits = Math.floor(me.strength / hordelingsInRange.length);
            var mod = me.strength % hordelingsInRange.length;
            for (var i = 0; i < hordelingsInRange.length; i++) {
                var h = hordelingsInRange[i];
                if (i < mod) {
                    h.gotAttacked(hits + 1);
                }else if (hits > 0) {
                    h.gotAttacked(hits);
                } else {
                    break;
                }
            }
        }
    } else if (this.frame == 8) { //done
        game.units.arrows = game.units.arrows.filter(function (a) { return a != me; });
    }
};
