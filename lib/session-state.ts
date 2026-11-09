// Dónde estabas en la app: Android la cierra en segundo plano y al volver
// arrancaría de cero. Se guarda en el dispositivo y se recupera si es reciente
// (después de unas horas lo útil es volver al día de hoy).

export type SessionState = {
  date: string;
  view: string;
  itineraryView: "itinerary" | "agenda";
  agendaOpen: boolean;
  mapMode: string;
  dayLayer: string;
  snap: string;
};

const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const key = (slug: string) => `viajes-estado-${slug}`;

export function saveSession(slug: string, state: SessionState, now = Date.now()): void {
  try {
    localStorage.setItem(key(slug), JSON.stringify({ ...state, at: now }));
  } catch {
    // sin almacenamiento (modo privado): no se recuerda, nada más
  }
}

export function readSession(slug: string, now = Date.now()): SessionState | null {
  try {
    const raw = localStorage.getItem(key(slug));
    if (!raw) return null;
    const { at, ...state } = JSON.parse(raw) as SessionState & { at: number };
    return typeof at === "number" && now - at >= 0 && now - at < MAX_AGE_MS ? state : null;
  } catch {
    return null;
  }
}
