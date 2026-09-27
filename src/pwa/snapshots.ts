import type { Me } from '../api/types';
import { kv, safe } from './idb';

// Instantáneas de lo que se leyó con señal, para poder abrir la app y cargar un reporte sin ella.

interface Snapshot<T> {
  savedAt: number;
  data: T;
}

/** Más viejo que esto no se usa (mismo orden que la sesión recordada). */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function saveSnapshot(key: string, data: unknown) {
  await safe(
    () => kv.set(`snap:${key}`, { savedAt: Date.now(), data } satisfies Snapshot<unknown>),
    undefined,
  );
}

export async function readSnapshot<T>(key: string): Promise<T | null> {
  const snap = await safe(() => kv.get<Snapshot<T>>(`snap:${key}`), undefined);
  if (!snap || Date.now() - snap.savedAt > MAX_AGE_MS) return null;
  return snap.data;
}

/** Error de red (fetch sin conexión), no una respuesta de la API. */
export const isNetworkError = (err: unknown) => err instanceof TypeError;

/**
 * Lee de la API y guarda la instantánea; sin conexión devuelve la última guardada (o el error).
 * Usar con `networkMode: 'offlineFirst'` para que React Query ejecute la función aun sin red.
 */
export async function withSnapshot<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    void saveSnapshot(key, data);
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      const snap = await readSnapshot<T>(key);
      if (snap) return snap;
    }
    throw err;
  }
}

export const saveMeSnapshot = (me: Me) => saveSnapshot('me', me);
export const readMeSnapshot = () => readSnapshot<Me>('me');

/** Al cerrar sesión no queda nada del usuario en el dispositivo (instantáneas ni borradores). */
export const clearOfflineData = () => safe(() => kv.clear(), undefined);
