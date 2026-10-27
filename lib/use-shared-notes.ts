import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  addNote,
  createSharedTrip,
  deleteNote,
  editNote,
  getCloudState,
  joinSharedTrip,
  signIn,
  subscribeCloud,
  watchMyTrips,
  watchNotes,
  type CloudState,
} from "@/lib/cloud";
import {
  INVITE_PARAM,
  NOTE_MAX,
  inviteLink,
  invitedTripId,
  pickTrip,
  unseenNotes,
  type SharedNote,
  type SharedTrip,
} from "@/lib/shared-notes";

export type SharedNotesApi = {
  status: "disabled" | "signed-out" | "loading" | "ready";
  me: string | null;
  trip: SharedTrip | null;
  notes: SharedNote[];
  names: Record<string, string>;
  /** Las del otro que todavía no se vieron en este dispositivo */
  unseen: SharedNote[];
  markSeen: (ids: string[]) => void;
  add: (day: string, text: string, place?: string) => void;
  edit: (id: string, text: string) => void;
  remove: (id: string) => void;
  /** Link para sumar a otra persona (crea el viaje si todavía no existe) */
  invite: () => string | null;
  signIn: () => void;
  /** Se abrió con un link de invitación que todavía no se usó */
  invited: boolean;
  inviteError: string | null;
};

const SERVER_STATE: CloudState = { status: "idle", user: null, error: null };
const seenKey = (slug: string) => `viajes-notas-vistas-${slug}`;

function readSeen(slug: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(seenKey(slug)) ?? "[]");
  } catch {
    return [];
  }
}

function writeSeen(slug: string, seen: string[]) {
  try {
    localStorage.setItem(seenKey(slug), JSON.stringify(seen));
  } catch {
    // Sin almacenamiento: vuelven a aparecer como nuevas al recargar
  }
}

/** Saca ?unirse= de la dirección sin recargar ni sumar al historial */
function forgetInvite() {
  const url = new URL(window.location.href);
  url.searchParams.delete(INVITE_PARAM);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

export function useSharedNotes(slug: string): SharedNotesApi {
  const cloud = useSyncExternalStore(subscribeCloud, getCloudState, () => SERVER_STATE);
  const user = cloud.status === "signed-in" ? cloud.user : null;
  const uid = user?.uid ?? null;

  const [trips, setTrips] = useState<SharedTrip[] | null>(null);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const trip = trips ? pickTrip(trips) : null;
  const tripId = trip?.id ?? null;
  // Viaje creado acá y que todavía no volvió en la consulta
  const created = useRef<string | null>(null);

  // Del dispositivo y de la dirección: después de montar (el HTML es estático)
  useEffect(() => {
    setSeen(readSeen(slug));
    setInviteId(invitedTripId(window.location.search));
  }, [slug]);

  useEffect(() => {
    setTrips(null);
    if (!uid) return;
    return watchMyTrips(uid, slug, setTrips);
  }, [uid, slug]);

  useEffect(() => {
    setNotes([]);
    if (!tripId) return;
    created.current = null;
    return watchNotes(tripId, setNotes);
  }, [tripId]);

  // Con sesión y link: sumarse una vez
  useEffect(() => {
    if (!user || !inviteId) return;
    let live = true;
    joinSharedTrip(inviteId, user)
      .then(() => live && setInviteError(null))
      .catch(() => live && setInviteError("Ese link ya no sirve: el viaje ya está compartido con otra persona."))
      .finally(() => {
        if (!live) return;
        forgetInvite();
        setInviteId(null);
      });
    return () => {
      live = false;
    };
    // user cambia de identidad en cada render del estado de la nube: alcanza con el uid
  }, [uid, inviteId]);

  const unseen = useMemo(() => unseenNotes(notes, uid, seen), [notes, uid, seen]);

  function ensureTrip(): string | null {
    if (tripId) return tripId;
    if (!user) return null;
    created.current ??= createSharedTrip(user, slug);
    return created.current;
  }

  return {
    status: cloud.status === "disabled" ? "disabled" : !uid ? "signed-out" : trips === null ? "loading" : "ready",
    me: uid,
    trip,
    notes,
    names: trip?.names ?? {},
    unseen,
    markSeen(ids) {
      const next = [...seen, ...ids.filter((id) => !seen.includes(id))];
      if (next.length === seen.length) return;
      setSeen(next);
      writeSeen(slug, next);
    },
    add(day, text, place) {
      const clean = text.trim().slice(0, NOTE_MAX);
      if (!clean || !uid) return;
      const id = ensureTrip();
      if (id) addNote(id, uid, { day, text: clean, ...(place ? { place } : {}) });
    },
    edit(id, text) {
      const clean = text.trim().slice(0, NOTE_MAX);
      if (clean && tripId) editNote(tripId, id, clean);
    },
    remove(id) {
      if (tripId) deleteNote(tripId, id);
    },
    invite() {
      const id = ensureTrip();
      return id ? inviteLink(window.location.href, id) : null;
    },
    signIn: () => void signIn(),
    invited: !!inviteId,
    inviteError,
  };
}
