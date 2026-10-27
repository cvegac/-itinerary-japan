"use client";

import { useState } from "react";
import { Check, ChevronRight, LogIn, Plus } from "lucide-react";
import type { DayEntry } from "@/types/DayEntry";
import type { TripNoteTopic, TripNotes, TripTask } from "@/types/Trip";
import { useDoneTasks } from "@/lib/done-tasks";
import { useBackClose } from "@/lib/use-back-close";
import NoteTopicModal from "@/components/NoteTopicModal";
import TripSharing from "@/components/TripSharing";
import ListCards from "@/components/ListCards";
import type { ListTarget } from "@/components/ListModal";
import type { SharedNotesApi } from "@/lib/use-shared-notes";

type Props = {
  notes: TripNotes;
  itinerary: DayEntry[];
  /** Separa lo guardado de cada viaje */
  slug: string;
  onDaySelect: (day: DayEntry) => void;
  /** Viaje compartido: invitar a alguien a dejar notas */
  sharing?: SharedNotesApi;
  /** Abre una lista de los dos, o una nueva */
  onOpenList?: (target: ListTarget) => void;
};

function shortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function NotesView({ notes, itinerary, slug, onDaySelect, sharing, onOpenList }: Props) {
  // Lo tildado se guarda en el dispositivo al tildar algo; con sesión, también en la nube
  const [done, toggle] = useDoneTasks(slug);

  // Las hechas se archivan: salen de la lista pero no se borran
  const pending = notes.tasks.filter((t) => !done.includes(t.id));
  const archived = notes.tasks.filter((t) => done.includes(t.id));
  const [showArchived, setShowArchived] = useState(false);

  // El botón atrás del celular cierra el tema abierto
  const [openTopic, openTopicWith, closeTopic] = useBackClose<TripNoteTopic>("noteTopic");
  const showTopic = (topic: TripNoteTopic) => openTopicWith(topic, topic.id);

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

      {sharing && <TripSharing api={sharing} />}

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

      {/* Listas de los dos: compras, cosas para empacar… (con o sin día) */}
      {sharing && onOpenList && sharing.status !== "disabled" && sharing.status !== "loading" && (
        <section aria-label="Listas" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold">Listas</h3>
            {sharing.status === "ready" && (
              <button
                type="button"
                onClick={() => onOpenList({})}
                className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
              >
                <Plus className="size-4" aria-hidden />
                Nueva lista
              </button>
            )}
          </div>
          {sharing.status === "signed-out" ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-3.5 text-sm">
              <p className="text-muted">Entrá con Google para armar listas de compras o de cosas para empacar, que los dos pueden tildar.</p>
              <button
                type="button"
                onClick={sharing.signIn}
                className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
              >
                <LogIn className="size-4" aria-hidden />
                Iniciar sesión con Google
              </button>
            </div>
          ) : sharing.lists.length > 0 ? (
            <ListCards api={sharing} lists={sharing.lists} onOpen={onOpenList} />
          ) : (
            <p className="rounded-2xl bg-surface-2 p-3.5 text-sm text-muted">
              Todavía no hay listas. Armá una para las compras o para lo que hay que empacar.
            </p>
          )}
        </section>
      )}

      {notes.topics && notes.topics.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="text-lg font-bold">Temas</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {notes.topics.map((topic) => (
              <li key={topic.id}>
                <button
                  type="button"
                  onClick={() => showTopic(topic)}
                  className="flex h-full w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span aria-hidden className="text-2xl">
                    {topic.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{topic.title}</span>
                    <span className="block text-sm text-muted">{topic.summary}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {openTopic && <NoteTopicModal topic={openTopic} onClose={closeTopic} />}
    </div>
  );
}
