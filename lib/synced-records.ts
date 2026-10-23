import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  deleteRecord,
  getCloudState,
  saveRecord,
  subscribeCloud,
  watchTrip,
  type CloudState,
  type RecordField,
} from "@/lib/cloud";

// Registros de un viaje (gastos, retiros): primero en el dispositivo (funciona
// sin conexión) y, con sesión, en la nube. Cada registro es una clave propia del
// mapa: dos cargados en dos dispositivos a la vez conviven sin pisarse.

export type SyncedRecord = { id: string; date: string; createdAt: number };
type RecordMap<T> = Record<string, T>;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento (modo privado): queda en memoria hasta recargar
  }
}

function forget(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // nada que borrar
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const SERVER_STATE: CloudState = { status: "idle", user: null, error: null };

/**
 * @param field   campo del documento del viaje en la nube
 * @param storage nombre en el dispositivo: viajes-{storage}-{slug}
 * @param normalize adapta registros viejos al formato actual
 */
export function useSyncedRecords<T extends SyncedRecord>(
  slug: string,
  field: RecordField,
  storage: string,
  normalize: (raw: T) => T = (r) => r
) {
  const listKey = `viajes-${storage}-${slug}`;
  /** Ids cargados sin sesión que todavía no están en la nube */
  const pendingKey = `${listKey}-sin-subir`;

  const [map, setMap] = useState<RecordMap<T>>({});
  const cloud = useSyncExternalStore(subscribeCloud, getCloudState, () => SERVER_STATE);
  const uid = cloud.user?.uid ?? null;
  const mapRef = useRef(map);
  mapRef.current = map;

  // Se lee después de montar: el HTML estático no sabe qué cargaste
  useEffect(() => setMap(read<RecordMap<T>>(listKey, {})), [listKey]);

  useEffect(() => {
    if (!uid) return;
    let first = true;
    return watchTrip(uid, slug, (remote) => {
      const next: RecordMap<T> = { ...((remote?.[field] as RecordMap<T> | undefined) ?? {}) };
      // Al conectar: se suben solo los registros cargados sin sesión
      if (first) {
        const local = read<RecordMap<T>>(listKey, {});
        read<string[]>(pendingKey, []).forEach((id) => {
          if (local[id] && !next[id]) {
            next[id] = local[id];
            saveRecord(uid, slug, field, local[id]);
          }
        });
        forget(pendingKey);
        first = false;
      }
      write(listKey, next);
      setMap(next);
    });
  }, [uid, slug, field, listKey, pendingKey]);

  function add(input: Omit<T, "id" | "createdAt">) {
    const record = { ...input, id: newId(), createdAt: Date.now() } as T;
    const next = { ...mapRef.current, [record.id]: record };
    setMap(next);
    write(listKey, next);
    if (uid) saveRecord(uid, slug, field, record);
    else write(pendingKey, [...read<string[]>(pendingKey, []), record.id]);
  }

  function remove(id: string) {
    const { [id]: _removed, ...next } = mapRef.current;
    setMap(next);
    write(listKey, next);
    if (uid) deleteRecord(uid, slug, field, id);
    else write(pendingKey, read<string[]>(pendingKey, []).filter((p) => p !== id));
  }

  const records = Object.values(map)
    .map(normalize)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

  return { records, add, remove };
}
