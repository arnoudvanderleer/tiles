import { EPSILON } from './draw.js';
import { add_use } from './svg.js';
import { Tile } from './Tile.js';
import { wrap_index } from './util.js';
import Vector from './Vector.js';

export class Piece extends Tile {
    constructor(node, neighbours) {
        super(node, Piece.parse_path(node.getAttribute("d")), neighbours);
        this.active = true;
    }

    transform(transform, neighbours) {
        let node = add_use(this.node.id, {
            transform
        });
        return new Tile(node, this.points.map(p => transform.apply(p)), neighbours);
    }

    static parse_path(d) {
        let points = [];
        let point = new Vector(0, 0);
        let mode = 'l';
        for (let s of d.split(" ")) {
            if (/^[a-zA-Z]$/.test(s)) {
                mode = s;
                continue;
            }
            if (/^[a-z]$/.test(mode)) {
                let delta = new Vector(0, 0);
                switch (mode) {
                    case 'l':
                    case 'm':
                        [delta.x, delta.y] = s.split(",").map(parseFloat);
                        break;
                    case 'h':
                        delta.x = parseFloat(s);
                        break;
                    case 'v':
                        delta.y = parseFloat(s);
                        break;
                }
                point = point.add(delta);
            }
            if (/^[A-Z]$/.test(mode)) {
                switch (mode) {
                    case 'L':
                    case 'M':
                        point = new Vector(...s.split(",").map(parseFloat));
                        break;
                    case 'H':
                        point = new Vector(parseFloat(s), point.y);
                        break;
                    case 'V':
                        point = new Vector(point.x, parseFloat(s));
                        break;
                }
            }
            points.push(point);
            if (mode == 'm') {
                mode = 'l';
            }
            if (mode == 'M') {
                mode = 'L';
            }
        }
        let first = points[0];
        let last = points[points.length - 1];
        if (first.sub(last).length2() < EPSILON) {
            points.pop();
        }
        return points;
    }

    fits(i, tile, j) {
        let neighbours = new Array(this.points.length);
        for (let d = 1; d >= -1; d -= 2) {
            let current_tile = tile;
            let current_edge = j;
            k_loop:
            for (let k = 0; k < this.points.length; k++) {
                if (Math.abs(this.edge(i + k * d).length() - current_tile.edge(current_edge - k * d).length()) > EPSILON
                    || current_tile.neighbour(current_edge - k * d) != null) {
                    return null;
                }

                neighbours[wrap_index(i + k * d, this.points.length)] = {tile: current_tile, edge: current_edge - k * d};

                let c1 = this.corner(i + d * k + (1 + d) / 2);
                let c2 = current_tile.corner(current_edge - d * k + (1 - d) / 2);

                if (Math.abs(c1.dot + c2.dot) < EPSILON && c1.sign == c2.sign && c1.sign > 0) {
                    for (let t = 0; t < 2; t++) {
                        let neighbour = current_tile.neighbour(current_edge - (k + 1) * d);
                        if (neighbour == null) {
                            break k_loop;
                        }
                        current_tile = neighbour.tile;
                        current_edge = neighbour.edge + k * d;
                    }
                    continue;
                }
                if (Math.abs(c1.dot - c2.dot) < EPSILON && c1.sign == -c2.sign) {
                    continue;
                }
                return null;
            }
        }
        return neighbours;
    }
}
