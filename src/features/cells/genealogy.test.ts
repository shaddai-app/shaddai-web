import { describe, expect, it } from 'vitest';
import type { CellStatus, GenealogyNode } from '../../api/cells';
import { buildTree, isAlive, treeStats } from './genealogy';

const node = (id: number, parentCellId: number | null, status: CellStatus = 'active'): GenealogyNode => ({
  id,
  name: `C${id}`,
  status,
  parentCellId,
  startedAt: null,
  closedAt: null,
  multipliedAt: null,
  memberCount: 5,
  childCount: 0,
  leader: { id, firstName: 'L', lastName: String(id) },
  zone: { id: 1, name: 'Z', network: { id: 1, name: 'R', color: 'blue' } },
});

describe('genealogía', () => {
  it('arma madres → hijas; una madre fuera del alcance deja a la hija como raíz', () => {
    const roots = buildTree([node(1, null), node(2, 1), node(3, 2), node(4, 99)]);
    expect(roots.map((r) => r.id)).toEqual([1, 4]);
    expect(roots[0]?.children[0]?.children[0]).toMatchObject({ id: 3, generation: 3 });
    expect(treeStats(roots)).toEqual({ cells: 4, generations: 3, multiplications: 2 });
  });

  it('una madre cerrada con hijas activas sigue en el árbol; una rama cerrada entera no', () => {
    const [closedMother, closedBranch] = buildTree([
      node(1, null, 'closed'),
      node(2, 1),
      node(3, null, 'multiplied'),
      node(4, 3, 'closed'),
    ]);
    expect(isAlive(closedMother!)).toBe(true);
    expect(isAlive(closedBranch!)).toBe(false);
  });
});
