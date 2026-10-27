"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { DayEntry } from "@/types/DayEntry";
import { ITEM_MAX, LIST_TITLE_MAX, sortItems, type ListItem } from "@/lib/shared-notes";
import type { SharedNotesApi } from "@/lib/use-shared-notes";

/** Qué abre la ventana: una lista existente, o una nueva (opcionalmente para un día) */
export type ListTarget = { listId?: string; day?: string | null };

type Props = {
  api: SharedNotesApi;
  target: ListTarget;
  itinerary: DayEntry[];
  onClose: () => void;
};

const SUGGESTIONS = ["Compras", "Empacar", "Regalos", "Antes de salir"];

function dayOption(day: DayEntry): string {
  const date = new Date(day.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  return `${day.weekday} ${date} · ${day.label}`;
}

/** Ventana de una lista de los dos: crearla, o tildar, agregar y corregir sus cosas */
export default function ListModal({ api, target, itinerary, onClose }: Props) {
  // Al crear una lista, la ventana sigue abierta con la nueva
  const [listId, setListId] = useState(target.listId ?? null);
  const list = listId ? api.lists.find((l) => l.id === listId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const daySelect = (value: string | null, onChange: (day: string | null) => void) => (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
      Día
      <select
        aria-label="Día"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm font-normal text-fg"
      >
        <option value="">Sin día (para todo el viaje)</option>
        {itinerary.map((d) => (
          <option key={d.date} value={d.date}>
            {dayOption(d)}
          </option>
        ))}
      </select>
    </label>
  );

  const title = !listId ? "Nueva lista" : (list?.title ?? "Lista");

  // Directo en el body, como las otras ventanas: si no, la barra de navegación queda encima
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="min-w-0 truncate text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {!listId ? (
            <NewList
              defaultDay={target.day ?? null}
              daySelect={daySelect}
              onCreate={(name, day) => setListId(api.createList(name, day))}
            />
          ) : !list ? (
            <p className="rounded-2xl bg-surface-2 p-3.5 text-sm text-muted">Esta lista ya no existe: la borraron.</p>
          ) : (
            <ListBody api={api} listId={list.id} title={list.title} day={list.day} daySelect={daySelect} onDeleted={onClose} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function NewList({
  defaultDay,
  daySelect,
  onCreate,
}: {
  defaultDay: string | null;
  daySelect: (value: string | null, onChange: (day: string | null) => void) => React.ReactNode;
  onCreate: (title: string, day: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [day, setDay] = useState(defaultDay);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onCreate(name, day);
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Nombre
        <input
          aria-label="Nombre de la lista"
          autoFocus
          value={name}
          maxLength={LIST_TITLE_MAX}
          placeholder="Compras para Nikko, empacar…"
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-base font-normal text-fg outline-none focus:border-accent sm:text-sm"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => setName(s)} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold hover:bg-line">
            {s}
          </button>
        ))}
      </div>
      {daySelect(day, setDay)}
      <button
        type="submit"
        disabled={!name.trim()}
        className="self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
      >
        Crear lista
      </button>
    </form>
  );
}

function ListBody({
  api,
  listId,
  title,
  day,
  daySelect,
  onDeleted,
}: {
  api: SharedNotesApi;
  listId: string;
  title: string;
  day: string | null;
  daySelect: (value: string | null, onChange: (day: string | null) => void) => React.ReactNode;
  onDeleted: () => void;
}) {
  const items = sortItems(api.items[listId] ?? []);
  const done = items.filter((i) => i.done).length;
  const [text, setText] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">{daySelect(day, (next) => api.updateList(listId, { day: next }))}</div>
        <span className="pb-2 text-xs font-semibold text-muted">
          {done} de {items.length}
        </span>
      </div>

      {renaming === null ? (
        <button type="button" onClick={() => setRenaming(title)} className="inline-flex items-center gap-1 self-start text-xs font-semibold text-muted hover:text-fg">
          <Pencil className="size-3.5" aria-hidden />
          Renombrar lista
        </button>
      ) : (
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            api.updateList(listId, { title: renaming });
            setRenaming(null);
          }}
        >
          <input
            aria-label="Nuevo nombre"
            autoFocus
            value={renaming}
            maxLength={LIST_TITLE_MAX}
            onChange={(e) => setRenaming(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-base outline-none focus:border-accent sm:text-sm"
          />
          <button type="submit" disabled={!renaming.trim()} className="rounded-full bg-accent px-3 text-sm font-semibold text-accent-fg disabled:opacity-50">
            Guardar
          </button>
        </form>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          api.addItem(listId, text);
          setText("");
        }}
        className="flex gap-1.5"
      >
        <input
          aria-label="Agregar a la lista"
          placeholder="Agregar algo…"
          value={text}
          maxLength={ITEM_MAX}
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-base outline-none focus:border-accent sm:text-sm"
        />
        <button type="submit" disabled={!text.trim()} className="rounded-full bg-accent px-3 text-sm font-semibold text-accent-fg disabled:opacity-50">
          Agregar
        </button>
      </form>

      {items.length > 0 ? (
        <ul aria-label="Cosas de la lista" className="flex flex-col gap-1">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} api={api} listId={listId} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Todavía no hay nada en la lista.</p>
      )}

      <div className="border-t border-line pt-3">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Se borra para los dos, con todo lo que tiene.</span>
            <button
              type="button"
              onClick={() => {
                api.removeList(listId);
                onDeleted();
              }}
              className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white"
            >
              Sí, borrar la lista
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full bg-surface-2 px-3 py-1 font-semibold">
              No
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-red-700">
            <Trash2 className="size-4" aria-hidden />
            Borrar lista
          </button>
        )}
      </div>
    </>
  );
}

function ItemRow({ item, api, listId }: { item: ListItem; api: SharedNotesApi; listId: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const who = item.doneBy && item.doneBy !== api.me ? api.names[item.doneBy] : null;

  return (
    <li className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.text}
        onClick={() => api.toggleItem(listId, item.id)}
        className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          item.done ? "border-accent bg-accent text-white" : "border-line"
        }`}
      >
        {item.done && <Check className="size-4" strokeWidth={3} aria-hidden />}
      </button>
      {draft === null ? (
        <span className="min-w-0 flex-1 text-sm">
          <span className={item.done ? "text-muted line-through" : ""}>{item.text}</span>
          {item.done && who && <span className="ml-1.5 text-xs text-muted">✓ {who}</span>}
        </span>
      ) : (
        <form
          className="min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            api.editItem(listId, item.id, draft);
            setDraft(null);
          }}
        >
          <input
            aria-label={`Corregir ${item.text}`}
            autoFocus
            value={draft}
            maxLength={ITEM_MAX}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setDraft(null)}
            className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-base outline-none focus:border-accent sm:text-sm"
          />
        </form>
      )}
      {draft === null && (
        <button type="button" aria-label="Corregir" onClick={() => setDraft(item.text)} className="rounded-md p-1 text-muted hover:bg-surface-2">
          <Pencil className="size-3.5" />
        </button>
      )}
      <button type="button" aria-label="Quitar" onClick={() => api.removeItem(listId, item.id)} className="rounded-md p-1 text-muted hover:bg-surface-2">
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
