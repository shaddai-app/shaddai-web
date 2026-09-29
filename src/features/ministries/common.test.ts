import { describe, expect, it } from 'vitest';
import { moveItem } from './common';

describe('orden de los puestos', () => {
  it('sube y baja un elemento sin salirse de la lista', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    const same = ['a', 'b'];
    expect(moveItem(same, 0, -1)).toBe(same);
    expect(moveItem(same, 1, 1)).toBe(same);
  });
});
