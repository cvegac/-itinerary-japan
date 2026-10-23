import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getCloudState, saveTrip, subscribeCloud, watchTrip, type CloudState } from "@/lib/cloud";

// Tareas hechas de un viaje: primero en el dispositivo (funciona sin conexión) y,
// con sesión iniciada, sincronizadas con la nube.
const doneKey = (slug: string) => `viajes-tareas-${slug}`;
/** Hay cambios hechos sin sesión que todavía no están en la nube */
const pendingKey = (slug: string) => `viajes-tareas-${slug}-sin-subir`;

function read(slug: string): string[] {
  try {
    const raw = localStorage.getItem(doneKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(slug: string, done: string[], pending: boolean) {
  try {
    localStorage.setItem(doneKey(slug), JSON.stringify(done));
    if (pending) localStorage.setItem(pendingKey(slug), "1");
    else localStorage.removeItem(pendingKey(slug));
  } catch {
    // Sin almacenamiento (modo privado): queda en memoria hasta recargar
  }
}

function hasPending(slug: string): boolean {
  try {
    return localStorage.getItem(pendingKey(slug)) === "1";
  } catch {
    return false;
  }
}

const SERVER_STATE: CloudState = { status: "idle", user: null, error: null };

/** [ids de las tareas hechas, marcar/desmarcar una] */
export function useDoneTasks(slug: string): [string[], (id: string) => void] {
  const [done, setDone] = useState<string[]>([]);
  const cloud = useSyncExternalStore(subscribeCloud, getCloudState, () => SERVER_STATE);
  const uid = cloud.user?.uid ?? null;
  const doneRef = useRef(done);
  doneRef.current = done;

  // Se lee después de montar: el HTML estático no sabe qué tildaste
  useEffect(() => setDone(read(slug)), [slug]);

  useEffect(() => {
    if (!uid) return;
    let first = true;
    return watchTrip(uid, slug, (remote) => {
      const local = read(slug);
      let next = remote?.doneTasks ?? [];
      // Al conectar: si no hay nada en la nube o hay cambios hechos sin sesión, se suman
      if (first && (remote === null || hasPending(slug))) {
        next = [...next, ...local.filter((id) => !next.includes(id))];
        saveTrip(uid, slug, { doneTasks: next });
      }
      first = false;
      write(slug, next, false);
      setDone(next);
    });
  }, [uid, slug]);

  function toggle(id: string) {
    const current = doneRef.current;
    const next = current.includes(id) ? current.filter((d) => d !== id) : [...current, id];
    setDone(next);
    write(slug, next, !uid);
    if (uid) saveTrip(uid, slug, { doneTasks: next });
  }

  return [done, toggle];
}
