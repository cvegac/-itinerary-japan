import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  deleteExpense,
  getCloudState,
  saveExpense,
  subscribeCloud,
  watchTrip,
  type CloudState,
} from "@/lib/cloud";

// Gastos reales del viaje: primero en el dispositivo (funciona sin conexión) y,
// con sesión, en la nube. Cada gasto es un registro con su id: dos cargados en
// dos dispositivos a la vez conviven sin pisarse.

export type Expense = {
  id: string;
  /** Día del itinerario (YYYY-MM-DD) */
  date: string;
  amountYen: number;
  note: string;
  createdAt: number;
};
type ExpenseMap = Record<string, Expense>;

const listKey = (slug: string) => `viajes-gastos-${slug}`;
/** Ids cargados sin sesión que todavía no están en la nube */
const pendingKey = (slug: string) => `viajes-gastos-${slug}-sin-subir`;

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

const sorted = (map: ExpenseMap) =>
  Object.values(map).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Total en yenes de cada día */
export function spentByDate(expenses: Expense[]): Record<string, number> {
  const totals: Record<string, number> = {};
  expenses.forEach((e) => (totals[e.date] = (totals[e.date] ?? 0) + e.amountYen));
  return totals;
}

const SERVER_STATE: CloudState = { status: "idle", user: null, error: null };

export function useExpenses(slug: string) {
  const [map, setMap] = useState<ExpenseMap>({});
  const cloud = useSyncExternalStore(subscribeCloud, getCloudState, () => SERVER_STATE);
  const uid = cloud.user?.uid ?? null;
  const mapRef = useRef(map);
  mapRef.current = map;

  // Se lee después de montar: el HTML estático no sabe qué cargaste
  useEffect(() => setMap(read<ExpenseMap>(listKey(slug), {})), [slug]);

  useEffect(() => {
    if (!uid) return;
    let first = true;
    return watchTrip(uid, slug, (remote) => {
      const next: ExpenseMap = { ...(remote?.expenses ?? {}) };
      // Al conectar: se suben solo los gastos cargados sin sesión
      if (first) {
        const local = read<ExpenseMap>(listKey(slug), {});
        read<string[]>(pendingKey(slug), []).forEach((id) => {
          if (local[id] && !next[id]) {
            next[id] = local[id];
            saveExpense(uid, slug, local[id]);
          }
        });
        forget(pendingKey(slug));
        first = false;
      }
      write(listKey(slug), next);
      setMap(next);
    });
  }, [uid, slug]);

  function add(date: string, amountYen: number, note: string) {
    const expense: Expense = { id: newId(), date, amountYen, note: note.trim(), createdAt: Date.now() };
    const next = { ...mapRef.current, [expense.id]: expense };
    setMap(next);
    write(listKey(slug), next);
    if (uid) saveExpense(uid, slug, expense);
    else write(pendingKey(slug), [...read<string[]>(pendingKey(slug), []), expense.id]);
  }

  function remove(id: string) {
    const { [id]: _removed, ...next } = mapRef.current;
    setMap(next);
    write(listKey(slug), next);
    if (uid) deleteExpense(uid, slug, id);
    else write(pendingKey(slug), read<string[]>(pendingKey(slug), []).filter((p) => p !== id));
  }

  return { expenses: sorted(map), add, remove };
}
