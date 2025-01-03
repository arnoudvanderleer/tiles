import { EPSILON } from './draw.js';
import { get_wrap, wrap_index } from './util.js';
import Vector from './Vector.js';

export class Tile {
    static id_counter = 0;

    constructor(node, points, neighbours) {
        this.id = Tile.id_counter++;
        this.node = node;
        this.points = points;
        this.neighbours = neighbours;
        this.original_points = this.deduplicate();
        this.direction = this.get_direction();
        this.parity = this.get_parity();

        this.node.dataset.id = this.id;
        this.node.classList.add(this.parity == 0 ? 'even' : 'odd');
    }

    get center() {
        return this.points.reduce((a, b) => a.add(b), new Vector(0, 0)).mul(1 / this.points.length);
    }

    point(i) {
        return get_wrap(this.points, i);
    }

    edge(i) {
        return this.point(i + 1).sub(this.point(i));
    }

    corner(i) {
        let v1 = this.edge(i - 1).normalize();
        let v2 = this.edge(i).normalize();
        return {
            dot: v1.dot(v2),
            sign: Math.sign(v1.cross(v2))
        };
    }

    get_direction() {
        let p = this.point(0);
        let e = this.edge(0);
        let t = p.add(e.mul(.5)).add(new Vector(-e.y, e.x).mul(.1));

        for (let n of document.elementsFromPoint(t.x, t.y)) {
            if (n == this.node) {
                return 1;
            }
        }

        return -1;
    }

    deduplicate() {
        candidate_loop: for (let i in this.points) {
            i = Number(i);
            if (i == 0 || this.points.length % i != 0) {
                continue;
            }
            for (let j in this.points) {
                j = Number(j);
                if (j < i) {
                    continue;
                }
                let c1 = this.corner(j);
                let c2 = this.corner(j % i);
                if (Math.abs(this.edge(j).length() - this.edge(j % i).length()) > EPSILON
                    || Math.abs(c1.dot - c2.dot) > EPSILON
                    || c1.sign != c2.sign) {
                    continue candidate_loop;
                }
            }
            return this.points.slice(0, i);
        }
        return this.points;
    }

    get_parity() {
        if (!this.neighbours) {
            return 0;
        }
        let result = null;
        for (let i in this.neighbours) {
            if (result == null) {
                result = (this.neighbours[i].tile.parity + 1) % 2;
            }
            if (result != (this.neighbours[i].tile.parity + 1) % 2) {
                console.log("Parity mismatch: ", this, i, this.neighbours[i]);
            }
        }
        return result ?? 0;
    }

    neighbour(i) {
        return get_wrap(this.neighbours, i) ?? null;
    }

    set_neighbour(i, tile, edge) {
        if (tile == null) {
            delete this.neighbours[wrap_index(i, this.points.length)];
        } else {
            this.neighbours[wrap_index(i, this.points.length)] = {
                tile,
                edge
            };
        }
    }
}
