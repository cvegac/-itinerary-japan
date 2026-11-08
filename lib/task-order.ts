import type { TripTask } from "@/types/Trip";

/** ¿Ya se puede hacer? (sin fecha de apertura, sí) */
export function isTaskOpen(task: TripTask, today: string): boolean {
  return !task.from || task.from <= today;
}

/**
 * Orden de las pendientes, para hacer todo lo antes posible: primero lo que ya se
 * puede hacer, por el día del viaje en que se necesita (las que no tienen día, al
 * final de ese grupo); después lo que abre más adelante, por su fecha de apertura.
 * A igualdad, se respeta el orden original.
 */
export function orderTasks(tasks: TripTask[], today: string): TripTask[] {
  const key = (t: TripTask) => (isTaskOpen(t, today) ? `0 ${t.date ?? "~"}` : `1 ${t.from}`);
  return tasks
    .map((task, i) => ({ task, i, k: key(task) }))
    .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.i - b.i))
    .map((x) => x.task);
}
