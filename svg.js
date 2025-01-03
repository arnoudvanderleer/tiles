export function add_use(id, attributes) {
    if (!attributes) {
        attributes = {};
    }

    return add_shape('use', {
        ...attributes,
        href: "#" + id,
    });
}

export function add_shape(shape, parameters) {
    let node = document.createElementNS('http://www.w3.org/2000/svg', shape);
    for (let p in parameters) {
        node.setAttribute(p, parameters[p]);
    }
    return node;
}