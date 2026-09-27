import { cellsApi, reportsApi } from '../../api/cells';
import { withSnapshot } from '../../pwa/snapshots';

// Queries de células que también funcionan sin señal (devuelven la última instantánea guardada).
// `offlineFirst`: React Query ejecuta la función aun sin conexión, y ahí entra la instantánea.

export const cellKey = (id: number) => ['cells', 'detail', id];

export const cellDetailQuery = (id: number, userId: number) => ({
  queryKey: cellKey(id),
  queryFn: () => withSnapshot(`u${userId}:cell:${id}`, () => cellsApi.get(id)),
  networkMode: 'offlineFirst' as const,
});

/** Células que lidero, colidero u hospedo. */
export const myCellsQuery = (userId: number) => ({
  queryKey: ['cells', 'mine'],
  queryFn: () =>
    withSnapshot(`u${userId}:my-cells`, () =>
      cellsApi.list({ mine: true, pageSize: 20 }).then((r) => r.items),
    ),
  networkMode: 'offlineFirst' as const,
});

export const cellReportsQuery = (cellId: number, pageSize = 5) => ({
  queryKey: ['reports', 'cell', cellId, pageSize],
  queryFn: () => reportsApi.listForCell(cellId, { pageSize }),
});
