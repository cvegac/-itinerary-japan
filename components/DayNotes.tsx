"use client";

import { useEffect, useState, type RefObject } from "react";
import { LogIn, MessageSquare, Pencil, Trash2 } from "lucide-react";
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

/** Notas de todo el día y el formulario para dejar una (del día o de un lugar) */
export default function DayNotes({
  api,
  date,
  places,
  target,
  onTargetChange,
  fresh,
  inputRef,
}: {
  api: SharedNotesApi;
  date: string;
  /** Lugares del día: una nota puede ser para uno de ellos */
  places: string[];
  /** Lugar elegido para la próxima nota ("" = todo el día) */
  target: string;
  onTargetChange: (place: string) => void;
  fresh: Set<string>;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const [text, setText] = useState("");
  const notes = generalNotes(api.notes, date);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    api.add(date, text, target || undefined);
    setText("");
  }

  return (
    <section aria-label="Notas del día" className="flex flex-col gap-2.5 rounded-2xl bg-surface-2 p-3.5">
      <h3 className="flex items-center gap-1.5 text-sm font-bold">
        <MessageSquare className="size-4 text-muted" aria-hidden />
        Notas del día
      </h3>

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
      ) : api.status === "loading" ? (
        <p className="text-sm text-muted">Cargando notas…</p>
      ) : (
        <>
          {notes.length > 0 && (
            <ul aria-label="Notas" className="flex flex-col gap-1.5">
              {notes.map((n) => (
                <NoteCard key={n.id} note={n} api={api} fresh={fresh.has(n.id)} />
              ))}
            </ul>
          )}
          <form onSubmit={submit} className="flex flex-col gap-1.5">
            {places.length > 0 && (
              <select
                aria-label="Sobre qué"
                value={target}
                onChange={(e) => onTargetChange(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
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
              ref={inputRef}
              aria-label="Nueva nota"
              placeholder="Un tip, una recomendación…"
              value={text}
              maxLength={NOTE_MAX}
              rows={2}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface p-2 text-base outline-none focus:border-accent sm:text-sm"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="self-start rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg disabled:opacity-50"
            >
              Agregar nota
            </button>
          </form>
        </>
      )}
    </section>
  );
}
