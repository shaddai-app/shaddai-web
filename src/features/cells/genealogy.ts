import type { GenealogyNode } from '../../api/cells';

export interface TreeNode extends GenealogyNode {
  children: TreeNode[];
  /** 1 = raíz. */
  generation: number;
}

/** Arma el árbol a partir de parentCellId (las huérfanas quedan como raíz). */
export function buildTree(items: GenealogyNode[]): TreeNode[] {
  const byParent = new Map<number | null, GenealogyNode[]>();
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    const parent = item.parentCellId !== null && ids.has(item.parentCellId) ? item.parentCellId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), item]);
  }
  const build = (parent: number | null, generation: number): TreeNode[] =>
    (byParent.get(parent) ?? []).map((n) => ({ ...n, generation, children: build(n.id, generation + 1) }));
  return build(null, 1);
}

export function treeStats(roots: TreeNode[]) {
  let cells = 0;
  let generations = 0;
  let multiplications = 0;
  const walk = (n: TreeNode) => {
    cells++;
    generations = Math.max(generations, n.generation);
    if (n.generation > 1) multiplications++;
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return { cells, generations, multiplications };
}

/** Activa (o en pausa), o con alguna descendiente que lo esté: una madre cerrada sigue uniendo el árbol. */
export const isAlive = (n: TreeNode): boolean =>
  n.status === 'active' || n.status === 'paused' || n.children.some(isAlive);
