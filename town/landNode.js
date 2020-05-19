function landNode(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.weight = 1;
}

landNode.prototype.createId = function () {
    return "node-" + this.x + "-" + this.y;
};
landNode.prototype.distFromNode = function (other) {

    var d1 = Math.abs(this.x - other.x);
    var d2 = Math.abs(this.y - other.y);

    return Math.sqrt(d1 * d1 + d2 * d2);
};
landNode.prototype.isBuildable = function () {
    var me = this;
    return me.type == landNode.types.grass && (typeof game == "undefined" || !game.units.all.some(function (u) { return u.position.node == me; }));
};
landNode.prototype.isDiagonal = function (other) {
    return this.x != other.x && this.y != other.y;
};
landNode.prototype.isWalkable = function () {
    return ![landNode.types.black, landNode.types.water, landNode.types.house, landNode.types.mill,landNode.types.castle].includes(this.type);
};
landNode.prototype.getCost = function (fromNeighbor) {
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
        return this.weight * 1.41421;
    }
    return this.weight;
};

landNode.prototype.getStrength= function() {
    return this.type == landNode.types.spikePit ? 1 : 0;
}


landNode.types = {
    "black": "black",
    "grass": "grass",
    "water": "water",
    "road": "road",
    "house": "house",
    "mill": "mill",
    "field": "field",
    "rubbleHouse": "rubbleHouse",
    "rubbleField": "rubbleField",
    "spikePit": "spikePit",
    "cow": "cow",
    "castle": "castle"
}