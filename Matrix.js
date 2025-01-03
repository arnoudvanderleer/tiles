import { EPSILON } from "./draw.js";
import Vector from "./Vector.js";

export default class Matrix {
    constructor(m11, m12, m13, m21, m22, m23) {
        this.m11 = m11;
        this.m12 = m12;
        this.m13 = m13;
        this.m21 = m21;
        this.m22 = m22;
        this.m23 = m23;
    }

    apply(v) {
        return new Vector(
            this.m11 * v.x + this.m12 * v.y + this.m13,
            this.m21 * v.x + this.m22 * v.y + this.m23
        );
    }

    mul(m) {
        return new Matrix(
            this.m11 * m.m11 + this.m12 * m.m21,
            this.m11 * m.m12 + this.m12 * m.m22,
            this.m11 * m.m13 + this.m12 * m.m23 + this.m13,
            this.m21 * m.m11 + this.m22 * m.m21,
            this.m21 * m.m12 + this.m22 * m.m22,
            this.m21 * m.m13 + this.m22 * m.m23 + this.m23,
        );
    }

    rotation() {
        return new Matrix(this.m11, this.m12, 0, this.m21, this.m22, 0);
    }
    
    equals(other) {
        return (
            Math.abs(this.m11 - other.m11) < EPSILON && 
            Math.abs(this.m12 - other.m12) < EPSILON && 
            Math.abs(this.m13 - other.m13) < EPSILON && 
            Math.abs(this.m21 - other.m21) < EPSILON && 
            Math.abs(this.m22 - other.m22) < EPSILON && 
            Math.abs(this.m23 - other.m23) < EPSILON
        );
    }

    toString() { 
        return `matrix(${this.m11}, ${this.m21}, ${this.m12}, ${this.m22}, ${this.m13}, ${this.m23})`;
    }

    static I = new Matrix(1, 0, 0, 0, 1, 0);

    static rotate_vector(v1, v2) {
        v1 = v1.normalize();
        v2 = v2.normalize();
        let u = v1.dot(v2);
        let v = v1.cross(v2);
        return new Matrix(u, -v, 0, v, u, 0);
    }

    static rotate_line(p1, d1, p2, d2) {
        let m = Matrix.rotate_vector(d1, d2);
        return Matrix.translate(p2.sub(m.apply(p1))).mul(m);
    }

    static translate(x, y) {
        if (x instanceof Vector) {
            y = x.y;
            x = x.x;
        }
        return new Matrix(1, 0, x, 0, 1, y);
    }

    static scale(x, y) {
        return new Matrix(x, 0, 0, 0, y, 0);
    }
}