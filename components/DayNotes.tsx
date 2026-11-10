"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogIn, MessageSquare, MessageSquarePlus, Pencil, Trash2, X } from "lucide-react";
import { NOTE_MAX, generalNotes, type SharedNote } from "@/lib/shared-notes";
import type { SharedNotesApi } from "@/lib/use-shared-notes";
import { authorColor } from "@/components/noteAuthor";

/** Las nuevas de un día se marcan mientras está abierto y quedan como vistas */
export function useFreshNotes(api: SharedNotesApi | undefined, date: string): Set<string> {
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => setFresh(new Set()), [date]);
  const ids = (api?.unseen ?? []).filter((n) => n.day === date).map((n) => n.id);
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    const list = key.split(",");
    setFresh((f) => new Set(Array.from(f).concat(list)));
    api?.markSeen(list);
    // Solo cuando cambian cuáles son nuevas (api es un objeto nuevo en cada render)
  }, [key]);
  return fresh;
}

const authorName = (api: SharedNotesApi, note: SharedNote) =>
  note.author === api.me ? "Vos" : (api.names[note.author] ?? "Alguien");

/** Una nota: quién, qué y, si es tuya, editarla; cualquiera de los dos la borra */
export function NoteCard({ note, api, fresh }: { note: SharedNote; api: SharedNotesApi; fresh: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const mine = note.author === api.me;

  return (
    <li className={`rounded-xl border p-2.5 text-sm ${fresh ? "border-accent/40 bg-accent/5" : "border-line bg-surface"}`}>
      <div className="flex items-center gap-1.5 text-xs">
        <span className={`font-semibold ${authorColor(note.author, api.me)}`}>{authorName(api, note)}</span>
        {fresh && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg">Nueva</span>}
        {note.createdAt === null && <span className="text-muted">· sin subir</span>}
        <span className="ml-auto flex gap-0.5">
          {mine && draft === null && (
            <button type="button" aria-label="Editar nota" onClick={() => setDraft(note.text)} className="rounded-md p-1 text-muted hover:bg-surface-2">
              <Pencil className="size-3.5" />
            </button>
          )}
          <button type="button" aria-label="Borrar nota" onClick={() => api.remove(note.id)} className="rounded-md p-1 text-muted hover:bg-surface-2">
            <Trash2 className="size-3.5" />
          </button>
        </span>
      </div>
      {draft === null ? (
        <p className="mt-1 whitespace-pre-wrap leading-snug">{note.text}</p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-1.5">
          <textarea
            aria-label="Editar nota"
            value={draft}
            maxLength={NOTE_MAX}
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface p-2 text-base outline-none focus:border-accent sm:text-sm"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => {
                api.edit(note.id, draft);
                setDraft(null);
              }}
              className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg disabled:opacity-50"
            >
              Guardar
            </button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Notas de todo el día y un botón que abre la ventana para dejar una (del día o de un lugar) */
export default function DayNotes({
  api,
  date,
  places,
  fresh,
}: {
  api: SharedNotesApi;
  date: string;
  /** Lugares del día: una nota puede ser para uno de ellos */
  places: string[];
  fresh: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [date]);
  const notes = api.status === "ready" ? generalNotes(api.notes, date) : [];
  if (api.status === "loading") return null;

  return (
    <section aria-label="Notas del día" className="flex flex-col gap-2">
      {notes.length > 0 && (
        <>
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            <MessageSquare className="size-3.5" aria-hidden />
            Notas del día
          </h3>
          <ul aria-label="Notas" className="flex flex-col gap-1.5">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} api={api} fresh={fresh.has(n.id)} />
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        aria-label="Agregar nota"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-surface-2 px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-line"
      >
        <MessageSquarePlus className="size-4" aria-hidden />
        Nota
      </button>
      {open && <NewNoteModal api={api} date={date} places={places} onClose={() => setOpen(false)} />}
    </section>
  );
}

/** Ventana para escribir una nota: sobre todo el día o sobre un lugar. Se cierra con la X, Escape o tocando afuera */
function NewNoteModal({
  api,
  date,
  places,
  onClose,
}: {
  api: SharedNotesApi;
  date: string;
  places: string[];
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    api.add(date, text, target || undefined);
    onClose();
  }

  // Directo en el body, como los otros modales: si no, la barra de navegación queda encima
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nueva nota"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-3 rounded-t-3xl bg-surface px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Nueva nota</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        {api.status === "signed-out" ? (
          <>
            <p className="text-sm text-muted">Entrá con Google para dejar tips y ver los de quien viaja con vos.</p>
            <button
              type="button"
              onClick={api.signIn}
              className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
            >
              <LogIn className="size-4" aria-hidden />
              Iniciar sesión con Google
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2">
            {places.length > 0 && (
              <select
                aria-label="Sobre qué"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2 py-2 text-base sm:text-sm"
              >
                <option value="">Todo el día</option>
                {places.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
            <textarea
              aria-label="Nueva nota"
              placeholder="Un tip, una recomendación…"
              autoFocus
              value={text}
              maxLength={NOTE_MAX}
              rows={3}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface p-2 text-base outline-none focus:border-accent sm:text-sm"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="self-end rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
            >
              Guardar
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
