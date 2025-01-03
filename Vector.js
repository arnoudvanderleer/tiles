export default class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(v2) {
        return new Vector(this.x + v2.x, this.y + v2.y);
    }

    sub(v2) {
        return new Vector(this.x - v2.x, this.y - v2.y);
    }

    mul(f) {
        return new Vector(this.x * f, this.y * f);
    }

    length2() {
        return this.dot(this);
    }

    length() {
        return Math.sqrt(this.length2());
    }

    normalize() {
        return this.mul(1 / this.length());
    }

    dot(v2) {
        return this.x * v2.x + this.y * v2.y;
    }
    
    cross(v2) {
        return this.x * v2.y - v2.x * this.y;
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}
