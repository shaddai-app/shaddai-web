// Almacenamiento clave → valor en IndexedDB para lo que la app necesita sin señal: instantáneas
// (último /me, células del líder) y borradores de reportes. Sin dependencias.

const DB_NAME = 'shaddai';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('IndexedDB'));
    };
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB'));
  });
}

export const kv = {
  get: <T>(key: string) => run<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
  set: (key: string, value: unknown) => run('readwrite', (s) => s.put(value, key)).then(() => undefined),
  delete: (key: string) => run('readwrite', (s) => s.delete(key)).then(() => undefined),
  /** Claves que empiezan con el prefijo. */
  keys: async (prefix: string) =>
    (await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys()))
      .map(String)
      .filter((k) => k.startsWith(prefix)),
  clear: () => run('readwrite', (s) => s.clear()).then(() => undefined),
};

/** Si IndexedDB no está disponible (navegación privada, tests), la app sigue funcionando sin offline. */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
