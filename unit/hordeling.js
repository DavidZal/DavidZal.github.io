function hordeling(type, node) {

    if (!arguments.length)
        return;

    unit.call(this, type, node);
    this.action = hordeling.actions.inactive;
    this.target = null;
    this.swarmDist = 7;
}

hordeling.prototype = new unit();

hordeling.prototype.ai = function () {
    var me = this;

    switch (me.action) {
        case hordeling.actions.nothing:
            if (me.target && me.getOffsetDistanceFrom(me.target).dist < me.range) { //if in range of target
                me.action = hordeling.actions.attacking;
            } else {
                if (!me.target) { //get a target
                    me.target = me.findNearestTarget();
                } else { //start walkin'
                    me.handleMovement(me.target.position.node, me.target.position.offset);
                }
            }
            break;
        case hordeling.actions.walking:

            if (me.position.node.type == landNode.types.field) { //walked on field
                me.position.node.type = landNode.types.rubbleField;
            } else if (me.position.node.type == landNode.types.spikePit) {  //walked on spike pit
                me.gotAttacked(me.position.node.getStrength());
                me.position.node.type = landNode.types.grass;
                return;
            }

            var nearbyUnit = me.getNearbyUnit(); //chauncey or unit
            if (nearbyUnit) {
                me.target = nearbyUnit;
                me.action = hordeling.actions.attacking;
            } else if (me.target && me.target.life > 0) {
                if ([me.swarmDist, me.swarmDist - 1].includes(Math.floor(me.position.node.distFromNode(me.target.position.node))) && me.swarm()) {
                    me.action = hordeling.actions.swarming;
                    me.walk(unit.directions.down);
                } else {
                    me.handleFrames();
                }
            } else {
                me.action = hordeling.actions.nothing;
                me.target = null;
            }

            break;
        case hordeling.actions.attacking:
            if (me.target && me.target.life > 0 && me.getOffsetDistanceFrom(me.target).dist < me.range) { //if target still exists and I'm in range...
                me.attack(me.target); //attack
            } else { //else go back to nothing
                me.action = hordeling.actions.nothing;
                me.target = null;
                me.walk(unit.directions.down);
            }
            break;
        case hordeling.actions.swarming:
            nearbyUnit = me.getNearbyUnit(); //chauncey or unit
            if (nearbyUnit) {
                me.target = nearbyUnit;
                me.action = hordeling.actions.attacking;
            } else if (!me.swarm()) {
                me.action = hordeling.actions.nothing;
            }
            break;
    }
};

hordeling.prototype.findNearestTarget = function () { //get closest target
    var me = this;
    return hordeling.targets.reduce(function (current, t) {

        //only 1 hordeling will attack villager
        if (t.type == attackableTarget.types.villager && game.horde.hordelings.some(function (h) { return h.target == t; })) {
            return current;
        }
        var dist = me.getOffsetDistanceFrom(t).dist;
        if (dist < current.dist) {
            return { t: t, dist: dist };
        }

        return current;

    }, { dist: Infinity }).t;
};
hordeling.prototype.attack = function (target) {
    var me = this;
    this.frame = ++this.frame > 3 ? 0 : this.frame;
    me.animate.sy = me.animate.source.attack.sy;
    me.animate.sx = me.frame * me.sWidth;
    if (target.gotAttacked(this.strength)) { //destroyed
        target.underAttack = false;
        hordeling.targets = hordeling.targets.filter(function (t) { return t != me.target; });

        //if I destroyed house, target villager which should be last target in target list
        var lastTarget = hordeling.targets[hordeling.targets.length - 1];
        if (lastTarget && lastTarget.type == attackableTarget.types.villager && lastTarget.position.node == me.position.node) {
            me.target = lastTarget;
        } else {
            me.target = null;
        }

        //if all targets are dead, target units and chauncey
        if (!hordeling.targets.length) {
            hordeling.targets.push(game.player);
            //game.units.all.forEach(function (u) { if (u.action != unit.actions.dead) hordeling.targets.push(u); });
        }

    } else {
        target.underAttack = true;
    }
};

hordeling.prototype.swarm = function () {
    var me = this, ratio = 3;
    //var unitsInArea = game.units.all.filter(function (u) { return u.action != unit.actions.dead && me.target.position.node.distFromNode(u.position.node) < 2; });

    //no target or no target group => false
    if (!me.target || !me.target.group) {
        return false;
    }

    //chauncy is close, run!!
    if (game.player.position.node.distFromNode(me.position.node) < 2) {
        return false;
    }

    //some unit is close, run!!
    if (game.units.all.some(function (u) { return u.action != unit.actions.dead && me.position.node.distFromNode(u.position.node) < 2; })) {
        return false;
    }

    var group = me.target.group;
    var fellowHordelings = group.hordelings;

    var swarmingHordelingsCount = fellowHordelings.reduce(function (arr, h) {

        var nodeDist = h.target ? Math.floor(h.position.node.distFromNode(h.target.position.node)) : Infinity;

        if (nodeDist <= h.swarmDist) {
            arr.push(h);
        }

        return arr;
    }, []).length;

    //can swarm AND waiting for more hordelings
    return group.units.length * ratio < fellowHordelings.length && swarmingHordelingsCount < fellowHordelings.length * 0.8;
};

hordeling.prototype.getNearbyUnit = function () {
    var me = this;

    return game.units.all.concat([game.player]).reduce(function (current, u) {
        if (u.action != unit.actions.dead) {
            var distObj = me.getOffsetDistanceFrom(u);
            if (distObj.dist == 0 || distObj.dist < me.range && distObj.dist >= me.minRange && distObj.dir.some(function (d) { return new RegExp(d, 'i').test(me.direction); }) && distObj.dist < current.dist) {
                return { u: u, dist: distObj.dist };
            }
        }
        return current;
    }, { dist: Infinity }).u;

}

hordeling.actions = {
    casting: 'casting'
};

for (var prop in unit.actions) {
    hordeling.actions[prop] = unit.actions[prop];
}

hordeling.factory = function (type, node) {
    switch (type) {
        case unit.types.hordeling4:
            return new shaman(node);
        default:
            return new hordeling(type, node);
    }
}