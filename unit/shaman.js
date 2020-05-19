function shaman(node) {


    var me = this;
    loadHorde4();
    hordeling.call(this, unit.types.hordeling4, node);

    function loadHorde4() {
        me.sprite = new Image();
        me.sprite.src = "images/horde4.png";
        me.sWidth = 56;
        me.sHeight = 56;
        me.speed = 14;
        me.life = 3;
        me.strength = 1;
        me.isMobile = true;
        me.hasFireball = true;
        me.spellRange = 30;

        me.animate = {
            source: {
                up: { sy: 0 },
                down: { sy: 65 },
                left: { sy: 65 },
                right: { sy: 0 },
                die: { sy: 278 },
                attack: { sy: 135 },
                castSpell: { sy: 135 }
            }
        }
    }
}


shaman.prototype = new hordeling();

shaman.prototype.ai = function () {
    var me = this;

    switch (me.action) {
        case hordeling.actions.casting:
            me.frame++;
            if (me.frame == 1) {
                //spawn a fireball
                me.fireArrow();
                me.target = null;
            }
            else if (me.frame == 4) {
                me.frame = 0;
                me.action = hordeling.actions.nothing;
                me.target = null;
            }

            me.animate.sx = me.frame * me.sWidth;
            break;
        default:
            //try a fireball
            if (me.hasFireball) {
                var nearbyEnemy = me.findFireBallTarget();
                if (nearbyEnemy) {
                    me.action = hordeling.actions.casting;
                    me.frame = 0;
                    me.target = nearbyEnemy;
                    me.hasFireball = false; 
                    return;
                }
            }

            hordeling.prototype.ai.call(me);
            break;
    }
}

shaman.prototype.fireArrow = function (target) {
    var me = this;
    var arrow = new shamanFireball(me.position.node, { x: me.position.offset.x, y: me.position.offset.y });
    arrow.target = target || me.target;
    arrow.handleMovement(arrow.target.position.node, arrow.target.position.offset);
    game.units.arrows.push(arrow);
}

shaman.prototype.findFireBallTarget = function () {
    var me = this;
    return game.units.all.concat([game.player])
        .filter(function (u) { return u.action != unit.actions.dead && me.getOffsetDistanceFrom(u).dist < me.spellRange; })[0];

}