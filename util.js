export const wrap_index = (i, n) => (i % n + n) % n;

export const get_wrap = (array, i) => array[wrap_index(i, array.length)];