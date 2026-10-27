// Notas del viaje compartido: por día o por lugar, de quien viaja y de a quien
// se invitó con el link. Viven en Firestore (viajes/{id}/notas, ver firestore.rules).

export type SharedNote = {
  id: string;
  /** Fecha del día ("2026-11-03") */
  day: string;
  /** Nombre de un lugar del día; sin lugar, es para todo el día */
  place?: string;
  text: string;
  /** uid de quien la escribió */
  author: string;
  /** ms; null mientras no llegó al servidor (sin conexión) */
  createdAt: number | null;
  editedAt?: number | null;
};

export type SharedTrip = { id: string; members: string[]; names: Record<string, string> };

/** Las reglas no aceptan notas más largas */
export const NOTE_MAX = 1000;

/** Parámetro del link de invitación */
export const INVITE_PARAM = "unirse";

export function dayNotes(notes: SharedNote[], date: string): SharedNote[] {
  return notes
    .filter((n) => n.day === date)
    .sort((a, b) => (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity));
}

export function generalNotes(notes: SharedNote[], date: string): SharedNote[] {
  return dayNotes(notes, date).filter((n) => !n.place);
}

export function placeNotes(notes: SharedNote[], date: string, place: string): SharedNote[] {
  return dayNotes(notes, date).filter((n) => n.place === place);
}

/** Las que escribió el otro y todavía no se vieron en este dispositivo */
export function unseenNotes(notes: SharedNote[], me: string | null, seen: string[]): SharedNote[] {
  return notes.filter((n) => n.author !== me && !seen.includes(n.id));
}

/** Si quedó más de un viaje con el mismo nombre (alguien escribió antes de
 *  sumarse con el link), vale el que tiene más gente */
export function pickTrip(trips: SharedTrip[]): SharedTrip | null {
  return trips.reduce<SharedTrip | null>((best, t) => (!best || t.members.length > best.members.length ? t : best), null);
}

export function inviteLink(pageUrl: string, tripId: string): string {
  const url = new URL(pageUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set(INVITE_PARAM, tripId);
  return url.toString();
}

export function invitedTripId(search: string): string | null {
  return new URLSearchParams(search).get(INVITE_PARAM);
}
