"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import type { DayEntry } from "@/types/DayEntry";
import type { TripNotes, TripTask } from "@/types/Trip";

type Props = {
  notes: TripNotes;
  itinerary: DayEntry[];
  /** Separa lo guardado de cada viaje */
  slug: string;
  onDaySelect: (day: DayEntry) => void;
};

// Lo tildado vive solo en este dispositivo y recién se guarda al tildar algo
const storageKey = (slug: string) => `viajes-tareas-${slug}`;

function readDone(slug: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function NotesView({ notes, itinerary, slug, onDaySelect }: Props) {
  const [done, setDone] = useState<string[]>([]);

  // Se lee después de montar: el HTML estático no sabe qué tildaste
  useEffect(() => setDone(readDone(slug)), [slug]);

  function toggle(id: string) {
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    setDone(next);
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(next));
    } catch {
      // Sin almacenamiento (modo privado): queda tildada hasta recargar
    }
  }

  // Las hechas se archivan: salen de la lista pero no se borran
  const pending = notes.tasks.filter((t) => !done.includes(t.id));
  const archived = notes.tasks.filter((t) => done.includes(t.id));
  const [showArchived, setShowArchived] = useState(false);

  const taskList = (tasks: TripTask[], label: string) => (
    <ul aria-label={label} className="flex flex-col gap-2">
      {tasks.map((task) => {
        const checked = done.includes(task.id);
        const day = task.date ? itinerary.find((d) => d.date === task.date) : undefined;
        return (
          <li
            key={task.id}
            className={`flex items-start gap-3 rounded-2xl border border-line p-3.5 ${checked ? "bg-surface-2" : "bg-surface"}`}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={task.text}
              onClick={() => toggle(task.id)}
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                checked ? "border-accent bg-accent text-white" : "border-line"
              }`}
            >
              {checked && <Check className="size-4" strokeWidth={3} aria-hidden />}
            </button>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${checked ? "text-muted line-through" : ""}`}>
                {task.text}
              </span>
              {task.detail && <span className="mt-0.5 block text-sm text-muted">{task.detail}</span>}
            </span>
            {day && (
              <button
                type="button"
                aria-label={`Ver el día ${shortDate(day.date)}`}
                onClick={() => onDaySelect(day)}
                className="flex shrink-0 items-center gap-0.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-line"
              >
                {shortDate(day.date)}
                <ChevronRight className="size-3.5" aria-hidden />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
      <header>
        <h2 className="text-2xl font-bold">Notas</h2>
        <p className="text-sm text-muted">Lo que falta hacer y lo que conviene tener a mano</p>
      </header>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-bold">Por hacer</h3>
          <span className="text-sm text-muted">
            {archived.length} de {notes.tasks.length} hechas
          </span>
        </div>
        {pending.length > 0 ? (
          taskList(pending, "Tareas pendientes")
        ) : (
          <p className="rounded-2xl bg-surface-2 p-3.5 text-sm text-muted">No queda nada pendiente</p>
        )}
        {archived.length > 0 && (
          <button
            type="button"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((v) => !v)}
            className="self-start rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-line"
          >
            {showArchived ? "Ocultar archivadas" : `Ver archivadas (${archived.length})`}
          </button>
        )}
        {showArchived && archived.length > 0 && taskList(archived, "Tareas archivadas")}
      </section>

      {notes.sections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="mb-2 font-bold">{section.title}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
