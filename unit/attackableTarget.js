function attackableTarget(type, node, offset) {
    this.type = type;
    this.position = {
        node: node,
        offset: offset
    };
    this.underAttack = false;
    this.start = {};

    switch (this.type) {
        case attackableTarget.types.house:
            this.start.life = 10;
            break;
        case attackableTarget.types.mill:
            this.start.life = 15;
            break;
        case attackableTarget.types.castle:
            this.start.life = 20;
            this.range = 4 * game.offsetSize;
            this.speed = 12;
            this.frame = 0;
            this.tickerOffset = Math.floor(Math.random() * this.speed);
            break;
        case attackableTarget.types.villager:
            this.start.life = 8;
            this.animate = { sWidth: 56, sHeight: 56, sx: 0, sy: 0 };
            this.animate.img = new Image();
            this.animate.img.src = 'images/villager.png';
            break;
        case attackableTarget.types.cow:
            this.start.life = 8;
            break;
    }


    this.life = this.start.life;
}

attackableTarget.types = {
    "house": "house",
    "mill": "mill",
    "castle":"castle",
    "villager": "villager",
    "chauncey": "chauncey",
    "cow": "cow"
}

attackableTarget.prototype.gotAttacked = function (strength) {
    this.life -= strength;

    if (this.life < 1) { //got destroyed
        this.life = 0;

        switch (this.type) {

            case attackableTarget.types.house: //add villager
            case attackableTarget.types.mill:
            case attackableTarget.types.castle:
                this.position.node.type = landNode.types.rubbleHouse;
                hordeling.targets.push(new attackableTarget(attackableTarget.types.villager, this.position.node, { x: Math.floor(game.offsetSize / 2), y: Math.floor(game.offsetSize / 2) }));
                //castle also has to be removed for units.castles
                if (this.type == attackableTarget.types.castle) {
                    var me = this;
                    game.units.castles = game.units.castles.filter(function(c) { return c != me; });
                }
                break;
            case attackableTarget.types.cow:
                this.position.node.type = landNode.types.grass;
                break;
        }
    }

    return !this.life; //true if dead
};


attackableTarget.prototype.restoreStart = function () {
    this.life = this.start.life;
}

attackableTarget.prototype.hasVillager = function () {
    return [attackableTarget.types.house, attackableTarget.types.mill, attackableTarget.types.castle].includes(this.type);
}

attackableTarget.prototype.ai = function () {
    var me = this;
    if (me.type == attackableTarget.types.castle) {
        me.frame++;
        if (me.frame == 10) {
            var target = game.horde.hordelings.filter(function(h) { return h.action != unit.actions.dead && h.getOffsetDistanceFrom(me).dist < me.range; })[0];
            if (target) {
                var arrow = new unit(unit.types.arrow, me.position.node, game.createMidOffsetObj());
                arrow.target = target;
                arrow.handleMovement(target.position.node, target.position.offset);
                game.units.arrows.push(arrow);
            }
            me.frame = 0;
        }
    }
}