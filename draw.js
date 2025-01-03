import Matrix from './Matrix.js';
import { Piece } from './Piece.js';
import UndoStack from './UndoStack.js';
import Vector from './Vector.js';
import { add_shape, add_use } from './svg.js';
import { get_wrap, wrap_index } from './util.js';

export const EPSILON = 1e-3;
export const EPSILON2 = 1e-6;

let pieces_container = document.getElementById("pieces");
let controls = document.getElementById("controls");
let canvas = document.getElementById("canvas");
let canvas_defs = document.getElementById("canvas-defs");
let palette = document.getElementById("palette");
let buttons = document.getElementById("buttons");

let global_propagate = 5;

let pieces = [];

let tiles = new Map();

let candidate_edges = new Set();
let candidates = [];
let candidate = null;

let undo_stack = new UndoStack(
    buttons.getElementsByClassName('undo')[0],
    buttons.getElementsByClassName('redo')[0],
    () => refresh_edges(0, []),
);

(async () => {
    let pieces_data = await fetch("pieces-8.svg");
    pieces_container.innerHTML = await pieces_data.text();

    let pieces_svg = pieces_container.getElementsByTagName("svg")[0];

    palette.setAttribute("width", pieces_svg.getAttribute("width"));
    palette.setAttribute("height", pieces_svg.getAttribute("height"));

    pieces = Array.from(pieces_container.getElementsByTagName("path")).map(p => new Piece(p));
    pieces.forEach(p => {
        canvas_defs.append(p.node);
        let node = add_use(p.node.id);
        palette.append(node);
        node.addEventListener('click', () => piece_clicked(p, node));
    });

    window.addEventListener('mousemove', refresh_candidates);

    canvas.addEventListener('mousedown', e => {
        if (e.button == 0) {
            confirm_candidate();
        }
    });

    window.addEventListener('keydown', e => {
        if (e.key == 'ArrowRight' && candidates.length > 0) {
            let i = candidates.indexOf(candidate);
            switch_candidate(get_wrap(candidates, i + 1));
        }
        if (e.key == 'ArrowLeft' && candidates.length > 0) {
            let i = candidates.indexOf(candidate);
            switch_candidate(get_wrap(candidates, i - 1));
        }
        if (e.key == 'z' && e.ctrlKey) {
            undo_stack.undo();
        }
        if ((e.key == 'y' || e.key == 'Z') && e.ctrlKey) {
            undo_stack.redo();
        }
        if (e.key == 's' && e.ctrlKey) {
            download();
            e.preventDefault();
        }
    });

    window.addEventListener('wheel', e => {
        if (candidates.length > 0) {
            let i = candidates.indexOf(candidate);
            switch_candidate(get_wrap(candidates, i + Math.sign(e.wheelDelta)));
        }
    });

    buttons.getElementsByClassName('clear')[0].addEventListener('click', () => {
        let action = undo_stack.add_undo_action();
        for (let tile of tiles.values()) {
            remove_new_tile(tile, action);
        }
        refresh_edges(0, []);
    });

    buttons.getElementsByClassName('edit')[0].addEventListener('click', () => {
        document.body.classList.toggle('edit');
    });

    buttons.getElementsByClassName('new_tab')[0].addEventListener('click', new_tab);
    buttons.getElementsByClassName('download')[0].addEventListener('click', download);

    buttons.getElementsByClassName('propagate')[0].addEventListener('input', () => {
        global_propagate = buttons.getElementsByClassName('propagate')[0].value;
    });
})();

function piece_clicked(piece, node) {
    let action = undo_stack.add_undo_action();
    if (tiles.size > 0) {
        piece.active = !piece.active;
        node.classList.toggle('disabled');
        let flip = () => {
            node.classList.toggle('disabled');
            piece.active = !piece.active;
        };
        action.undo.push(flip);
        action.redo.push(flip);
    } else {
        add_new_tile(
            piece.transform(Matrix.translate(new Vector(window.innerWidth / 2, window.innerHeight / 2).sub(piece.center)), new Array(piece.points.length)),
            action
        );
    }
    refresh_edges(global_propagate, action);
}

function refresh_edges(propagate, action) {
    let edges = [];
    Array.from(controls.getElementsByClassName("edge")).forEach(c => c.remove());
    for (let tile of tiles.values()) {
        for (let i in tile.points) {
            i = Number(i);
            if (tile.neighbour(i) != null) {
                continue;
            }
            let edge = tile.edge(i);
            let point = tile.point(i);

            let transform =
                Matrix.translate(point)
                    .mul(Matrix.rotate_vector(new Vector(1, 0), edge))
                    .mul(Matrix.scale(edge.length(), 25));

            let circle = add_shape('circle', {
                cx: .5,
                cy: 0,
                r: .5,
                transform,
                class: 'edge',
            });
            circle.dataset.id = tile.id;
            circle.dataset.edge = i;
            controls.append(circle);
            edges.push(circle);
        }
    }

    let changed = false;
    for (let edge of edges) {
        let edge_candidates = get_edge_candidates(edge);
        if (edge_candidates.length == 0) {
            edge.classList.add('impossible');
        }
        if (propagate > 0 && edge_candidates.length == 1) {
            let candidate = edge_candidates[0];
            add_new_tile(candidate.piece.transform(candidate.transform, candidate.neighbours), action);
            changed = true;
        }
    }
    if (changed) {
        refresh_edges(propagate - 1, action);
    }

    switch_candidate(null);
}

function refresh_candidates(e) {
    let new_candidate_edges = new Set(document.elementsFromPoint(e.pageX, e.pageY).filter(x => 
        x.parentNode == controls && x.classList.contains('edge')
    ));
    if (candidate_edges.symmetricDifference(new_candidate_edges).size == 0) {
        return;
    }

    let old_edges = candidate_edges.difference(new_candidate_edges);
    candidates.forEach(c => c.edges = c.edges.difference(old_edges));
    candidates = candidates.filter(c => c.edges.size > 0);

    let new_edges = new_candidate_edges.difference(candidate_edges);
    for (let new_edge of new_edges) {
        for (let c of get_edge_candidates(new_edge)) {
            let existing_candidates = candidates.filter(ec => 
                ec.piece == c.piece &&
                shape_equals(ec.piece, ec.transform, c.transform)
            );
            if (existing_candidates.length > 0) {
                existing_candidates[0].edges.add(new_edge);
            } else {
                candidates.push(c);
            }
        }
    }

    if (candidates.indexOf(candidate) < 0) {
        switch_candidate(candidates[0] ?? null);
    }
    candidate_edges = new_candidate_edges;
}

function shape_equals(piece, transform1, transform2) {
    let points1 = piece.points.map(p => transform1.apply(p));
    let points2 = piece.points.map(p => transform2.apply(p));

    let match_points = Array.from(points1.keys()).filter(i => points1[0].sub(points2[i]).length2() < EPSILON2);
    if (match_points.length == 0) {
        return false;
    }
    let match_index = match_points[0];
    for (let i in points1) {
        i = Number(i);
        if (points1[i].sub(get_wrap(points2, i + match_index)).length2() > EPSILON2) {
            return false;
        }
    }
    return true;
}

function get_edge_candidates(node) {
    let tile = tiles.get(Number(node.dataset.id));
    let i = Number(node.dataset.edge);
    let result = [];

    for (let piece of pieces) {
        if (!piece.active) {
            continue;
        }
        for (let j in piece.original_points) {
            j = Number(j);
            let neighbours = piece.fits(j, tile, i);
            if (neighbours == null) {
                continue;
            }

            result.push({
                piece,
                neighbours,
                transform: Matrix.rotate_line(
                    piece.point(j + 1),
                    piece.edge(j).mul(-1),
                    tile.point(i),
                    tile.edge(i)
                ),
                edges: new Set([node]),
            });
        }
    }

    return result;
}

function switch_candidate(new_candidate) {
    Array.from(controls.getElementsByClassName('candidate')).forEach(c => c.remove());
    candidate = new_candidate;
    if (candidate == null) {
        return;
    }
    controls.append(add_use(candidate.piece.node.id, {
        transform: candidate.transform,
        class: 'candidate'
    }));
}

function confirm_candidate() {
    if (candidate == null) {
        return;
    }
    let action = undo_stack.add_undo_action();
    add_new_tile(candidate.piece.transform(candidate.transform, candidate.neighbours), action);
    refresh_edges(global_propagate, action);
}

function add_new_tile(tile, action) {
    action.redo.push(() => add_tile(tile));
    action.undo.push(() => remove_tile(tile));
    add_tile(tile);
    tile.node.addEventListener('contextmenu', e => {
        remove_new_tile(tile, undo_stack.add_undo_action());
        refresh_edges(0, []);
        e.preventDefault();
    });
}

function add_tile(tile) {
    for (let i in tile.neighbours) {
        tile.neighbours[i].tile.set_neighbour(tile.neighbours[i].edge, tile, Number(i));
    }
    tiles.set(tile.id, tile);
    canvas.append(tile.node);
}

function remove_new_tile(tile, action) {
    action.redo.push(() => remove_tile(tile));
    action.undo.push(() => add_tile(tile));
    remove_tile(tile);
}

function remove_tile(tile) {
    for (let i in tile.neighbours) {
        tile.neighbours[i].tile.set_neighbour(tile.neighbours[i].edge, null);
    }
    tiles.delete(tile.id);
    tile.node.remove();
}

function download() {
    const data = new Blob([canvas.outerHTML], {type:"image/svg+xml;charset=utf-8"});
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'tiling.svg';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

function new_tab() {
    const data = new Blob([canvas.outerHTML], {type:"image/svg+xml;charset=utf-8"});
    const url = window.URL.createObjectURL(data);

    let tab = window.open();
    tab.location.href = url;
}
