import { LandType } from '../config/constants.js';
import { LandNode } from './LandNode.js';
import { getGame } from '../core/GameContext.js';

export class Map {
  constructor(size, waters) {
    if (arguments.length) {
      return this.generate(size, waters);
    }
  }

  generate(size, waters) {
    if ((size >> 0) < 24) throw new Error('map too small');

    this.fullSize = size;
    const grid = [];
    this.nodes = [];
    this.grid = grid;

    for (let x = 0; x < this.fullSize; x++) {
      grid.push([]);
      for (let y = 0; y < this.fullSize; y++) {
        const node = new LandNode(x, y, LandType.grass);
        grid[x][y] = node;
        this.nodes.push(node);
      }
    }
    this.setVisible(24);

    const potentialWaterNodes = this.nodes.filter((node) => {
      const q = this.fullSize / 3;
      const q3 = 2 * q;
      return (
        ((node.x <= q && node.y >= q && node.y <= q3) ||
          (node.x >= q3 && node.y >= q && node.y <= q3) ||
          (node.y <= q && node.x >= q && node.x <= q3) ||
          (node.y >= q3 && node.x >= q && node.x <= q3)) &&
        this.getNeighbors(node).length === 8
      );
    });

    const waterNodeSpawners = [];
    while (waterNodeSpawners.length < waters) {
      const node = potentialWaterNodes[Math.floor(Math.random() * potentialWaterNodes.length)];
      if (waterNodeSpawners.every((n) => node.distFromNode(n) > 8)) {
        waterNodeSpawners.push(node);
        node.type = LandType.water;
      }
    }

    waterNodeSpawners.forEach((waterSource) => {
      let waterNodes = [waterSource];
      for (let i = 0; i < this.fullSize / 4; i++) {
        waterNodes = waterNodes.filter(
          (w) =>
            this.getNeighbors(w).filter((n) => n.type === LandType.grass).length > 1
        );
        const expand = waterNodes[Math.floor(Math.random() * waterNodes.length)];
        this.getNeighbors(expand).forEach((n) => {
          n.type = LandType.water;
          waterNodes.push(n);
        });
      }
    });

    const mid = Math.floor(this.fullSize / 2);
    this.center = grid[mid][mid];
    this.center.type = LandType.road;
    this.getNeighbors(this.center).forEach((n) => {
      if (n.isBuildable()) n.type = LandType.road;
    });
  }

  getNeighbors(node) {
    const neys = [];
    const grid = this.grid;
    if (grid[node.x - 1]) {
      neys.push(grid[node.x - 1][node.y]);
      neys.push(grid[node.x - 1][node.y + 1]);
      neys.push(grid[node.x - 1][node.y - 1]);
    }
    if (grid[node.x + 1]) {
      neys.push(grid[node.x + 1][node.y + 1]);
      neys.push(grid[node.x + 1][node.y]);
      neys.push(grid[node.x + 1][node.y - 1]);
    }
    neys.push(grid[node.x][node.y + 1]);
    neys.push(grid[node.x][node.y - 1]);
    return neys.filter(Boolean);
  }

  getNodesByType() {
    const data = {};
    for (const type of Object.values(LandType)) {
      data[type] = [];
    }
    this.nodes.forEach((node) => data[node.type].push(node));
    return data;
  }

  newPhase() {
    const theMap = this;
    const round = getGame().phase.round;

    theMap.size += 5;
    theMap.size = theMap.size > theMap.fullSize ? theMap.fullSize : theMap.size;
    theMap.setVisible(theMap.size);
    theMap.data = theMap.getNodesByType();

    let newHouses =
      Math.ceil(
        (theMap.data.house.length + theMap.data.mill.length + theMap.data.castle.length) / 5
      ) + 1;
    let newRoads = Math.ceil(newHouses / 2);

    while (newHouses > 0) {
      if (theMap.data.rubbleHouse.length) {
        theMap.data.rubbleHouse.pop().type = LandType.house;
        newHouses--;
      } else if (newRoads > 0) {
        const road = addNewRoad();
        addHouseByRoad(road);
        addHouseByRoad(road);
        newHouses -= 2;
        newRoads--;
      } else {
        theMap.data = theMap.getNodesByType();
        addHouseByRoad(theMap.data.road);
        newHouses--;
      }
    }

    theMap.data = theMap.getNodesByType();

    const houseCount = theMap.data.house.length;
    const millCount = theMap.data.mill.length;
    const newMills = Math.floor(0.2 * houseCount) - millCount;

    if (newMills > 0) {
      theMap.data.house
        .map((h) => ({ house: h, score: Math.random() }))
        .sort((a, b) => a.score - b.score)
        .slice(0, newMills)
        .forEach((h) => {
          h.house.type = LandType.mill;
        });
    }

    const newCastles = Math.floor(0.1 * houseCount) - theMap.data.castle.length;
    if (newCastles > 0) {
      theMap.data = theMap.getNodesByType();
      theMap.data.house
        .map((m) => ({ house: m, score: m.distFromNode(theMap.center) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, newCastles)
        .forEach((h) => {
          h.house.type = LandType.castle;
        });
    }

    theMap.data.house
      .concat(theMap.data.mill)
      .concat(theMap.data.castle)
      .forEach((h) => {
        const allNeys = theMap.getNeighbors(h);
        const rubble = allNeys.find((n) => n.type === LandType.rubbleField);
        if (rubble) {
          rubble.type = LandType.field;
        } else if (Math.random() > 0.25 || round === 1) {
          const neys = allNeys.filter((n) => n.isBuildable());
          if (neys.length) {
            neys[Math.floor(Math.random() * neys.length)].type = LandType.field;
          }
        }
      });

    theMap.data = theMap.getNodesByType();

    function addHouseByRoad(road) {
      const potentialHouses = new Set(
        road.reduce((arr, n) => {
          return arr.concat(
            theMap
              .getNeighbors(n)
              .filter(
                (m) =>
                  m.isBuildable() &&
                  m.isVisible &&
                  !m.isDiagonal(n) &&
                  theMap.getNeighbors(m).filter((p) => p.type === LandType.road).length > 1
              )
          );
        }, [])
      );

      const houses = Array.from(potentialHouses);
      houses.forEach((n) => {
        n.score =
          theMap.getNeighbors(n).filter((m) => m.isBuildable() && m.isVisible).length > 1
            ? 2
            : 1;
      });

      const topHouse = houses.reduce((arr, n) => {
        if (!arr.length || arr[0].score === n.score) {
          arr.push(n);
        } else if (arr[0].score < n.score) {
          return [n];
        }
        return arr;
      }, []);

      const theHouse = topHouse[Math.floor(Math.random() * topHouse.length)];
      if (theHouse) theHouse.type = LandType.house;
    }

    function addNewRoad() {
      const potentialRoads = [];
      theMap.data.road.forEach((path) => {
        const neys = theMap
          .getNeighbors(path)
          .filter((n) => !n.isDiagonal(path) && n.isBuildable() && n.isVisible);
        neys.forEach((n) => {
          const road = getTilesInARow(path, n, 3);
          if (road?.every((rn) => rn.isBuildable() && rn.isVisible)) {
            potentialRoads.push({
              road,
              dist: theMap.center.distFromNode(road[1]),
              freeSpace: calcFreeSpaceAroundNodes(road),
            });
          }
        });
      });

      if (potentialRoads.length) {
        potentialRoads.forEach((r) => {
          r.score = r.freeSpace - r.dist * 2;
        });
        const theRoad = potentialRoads.reduce((a, b) => (a.score > b.score ? a : b));
        theRoad.road.forEach((n) => {
          n.type = LandType.road;
        });
        return theRoad.road;
      }
      return [];
    }

    function getTilesInARow(origin, first, count) {
      const road = [];
      const grid = theMap.grid;
      const dx = first.x - origin.x;
      const dy = first.y - origin.y;

      function recursive(node) {
        if (!node || road.length === count) return;
        road.push(node);
        if (grid[node.x + dx]) recursive(grid[node.x + dx][node.y + dy]);
      }

      recursive(first);
      return road.length === count ? road : null;
    }

    function calcFreeSpaceAroundNodes(nodes) {
      const freeSet = new Set();
      const allNeys = nodes.flatMap((n) =>
        theMap.getNeighbors(n).flatMap((nn) => theMap.getNeighbors(nn))
      );
      allNeys.filter((n) => n.isBuildable() && n.isVisible).forEach((n) => freeSet.add(n));
      nodes.forEach((n) => freeSet.delete(n));
      return freeSet.size;
    }
  }

  setVisible(size) {
    const min = Math.floor((this.fullSize - size) / 2);
    const max = min + size;
    this.nodes.forEach((node) => {
      node.isVisible = node.x >= min && node.x <= max && node.y >= min && node.y <= max;
    });
    this.size = size;
  }
}

/** Legacy alias */
export const map = Map;
