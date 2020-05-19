function unitGroup(units) {
    this.units = [];
    this.addUnits(units);
    unitGroup.groups.push(this);
}

unitGroup.prototype.addUnits = function (units) {
    var me = this;
    units.forEach(function (u) { u.group = me; me.units.push(u); });
}

//static
unitGroup.groups = [];

unitGroup.init = function () {
    //remove empty groups
    unitGroup.groups = unitGroup.groups.filter(function (g) { return g.units.length; });

    var stationaryUnits = game.units.all.filter(function (u) { return !u.isMobile; });   

    while (stationaryUnits.length) {
        recursiveAddToGroup(stationaryUnits.pop());
    }

    function recursiveAddToGroup(u) {

        var nearByStationaryUnits = stationaryUnits.filter(function (b) { return b != u && u.position.node.distFromNode(b.position.node) < 2; });

        //a group is at least 3 (me + 2 others) Or I'm in a group already
        if (nearByStationaryUnits.length > 1 || u.group) {

            //remove from list
            stationaryUnits = stationaryUnits.filter(function (s) { return !nearByStationaryUnits.includes(s); });

            if (!u.group) {
                u.group = new unitGroup([u]);
            }

            u.group.addUnits(nearByStationaryUnits);

            nearByStationaryUnits.forEach(recursiveAddToGroup);
        }

    }
}

unitGroup.update = function () {
    unitGroup.groups.forEach(function (g) {
        //remove dead units from group
        g.units = g.units.filter(function (u) {
            var isAlive = u.action != unit.actions.dead;
            //remove dead unit's pointer on group
            if (!isAlive) {
                u.group = undefined;
            }
            return isAlive;
        });
        g.hordelings = game.horde.hordelings.filter(function (h) { return h.action != hordeling.actions.dead && h.target && g == h.target.group; });
    });
}