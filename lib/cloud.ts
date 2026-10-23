import type { FirebaseApp } from "firebase/app";
import type { Auth, User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { FIREBASE_CONFIG } from "@/lib/firebase-config";
import type { Expense } from "@/lib/expenses";

// Login con Google y datos en Firestore, opcionales. Firebase se descarga y se
// inicia recién cuando iniciás sesión (o si ya la habías iniciado antes): sin
// login la app no guarda nada fuera de lo que vos tildes.

export type CloudUser = { uid: string; name: string | null; email: string | null; photo: string | null };
export type CloudStatus = "disabled" | "idle" | "loading" | "signed-in" | "signed-out";
export type CloudState = { status: CloudStatus; user: CloudUser | null; error: string | null };
/** Lo que se guarda por viaje en users/{uid}/trips/{slug} */
export type TripCloudData = { doneTasks?: string[]; expenses?: Record<string, Expense> };

/** Marca de "inicié sesión en este dispositivo": solo existe después de un login */
const SESSION_KEY = "viajes-sesion";

let state: CloudState = { status: FIREBASE_CONFIG ? "idle" : "disabled", user: null, error: null };
const listeners = new Set<() => void>();

function setState(next: Partial<CloudState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const getCloudState = () => state;
export function subscribeCloud(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storage(action: (s: Storage) => void) {
  try {
    action(localStorage);
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura lo que la pestaña
  }
}

// ── Carga diferida de Firebase ─────────────────────────────────────────────
type Modules = {
  app: typeof import("firebase/app");
  auth: typeof import("firebase/auth");
  fs: typeof import("firebase/firestore");
};
type Services = { m: Modules; app: FirebaseApp; auth: Auth; db: Firestore };

let modules: Promise<Modules> | null = null;
let services: Services | null = null;

/** Descarga el código de Firebase sin iniciar nada (no escribe en el dispositivo) */
function loadModules(): Promise<Modules> {
  modules ??= Promise.all([import("firebase/app"), import("firebase/auth"), import("firebase/firestore")]).then(
    ([app, auth, fs]) => ({ app, auth, fs })
  );
  return modules;
}

function toUser(u: User): CloudUser {
  return { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL };
}

/** Inicia Firebase: es sincrónico a propósito, para que el popup de Google
 *  se abra dentro del mismo toque del usuario (si no, el navegador lo bloquea) */
function start(m: Modules): Services {
  if (services) return services;
  const app = m.app.getApps()[0] ?? m.app.initializeApp(FIREBASE_CONFIG!);
  const auth = m.auth.getAuth(app);
  // Copia local de Firestore: lo tildado se ve y se guarda sin conexión
  const db = m.fs.initializeFirestore(app, {
    localCache: m.fs.persistentLocalCache({ tabManager: m.fs.persistentMultipleTabManager() }),
  });
  m.auth.onAuthStateChanged(auth, (u) => {
    if (u) {
      setState({ status: "signed-in", user: toUser(u), error: null });
    } else {
      storage((s) => s.removeItem(SESSION_KEY));
      setState({ status: "signed-out", user: null });
    }
  });
  services = { m, app, auth, db };
  return services;
}

/** Al abrir la app: retoma la sesión solo si ya la habías iniciado en este dispositivo */
export function resumeSession() {
  if (state.status !== "idle") return;
  let had = false;
  storage((s) => (had = s.getItem(SESSION_KEY) === "1"));
  if (!had) return;
  setState({ status: "loading" });
  loadModules()
    .then(start)
    .catch(() => setState({ status: "signed-out", error: "No se pudo conectar" }));
}

/** Al abrir el panel de la cuenta: adelanta la descarga para que el login sea al toque */
export function prepareSignIn() {
  if (state.status !== "disabled") loadModules().catch(() => {});
}

export async function signIn() {
  if (state.status === "disabled") return;
  setState({ status: "loading", error: null });
  try {
    const s = start(await loadModules());
    await s.m.auth.signInWithPopup(s.auth, new s.m.auth.GoogleAuthProvider());
    storage((st) => st.setItem(SESSION_KEY, "1"));
  } catch {
    setState({
      status: state.user ? "signed-in" : "signed-out",
      error: "No se pudo iniciar sesión. Probá de nuevo con conexión.",
    });
  }
}

/** Cierra la sesión y borra la copia local de la nube: el dispositivo queda limpio */
export async function signOutUser() {
  if (!services) return;
  const { m, app, auth, db } = services;
  await m.auth.signOut(auth);
  await m.fs.terminate(db);
  await m.fs.clearIndexedDbPersistence(db);
  await m.app.deleteApp(app);
  services = null;
  storage((s) => s.removeItem(SESSION_KEY));
  setState({ status: "idle", user: null, error: null });
}

// ── Datos del viaje ────────────────────────────────────────────────────────
function tripDoc(s: Services, uid: string, slug: string) {
  return s.m.fs.doc(s.db, "users", uid, "trips", slug);
}

/** Escucha el documento del viaje (null si todavía no existe) */
export function watchTrip(uid: string, slug: string, onData: (data: TripCloudData | null) => void): () => void {
  if (!services) return () => {};
  const s = services;
  return s.m.fs.onSnapshot(tripDoc(s, uid, slug), (snap) =>
    onData(snap.exists() ? (snap.data() as TripCloudData) : null)
  );
}

/** Guarda en la nube; sin conexión queda en cola y sube cuando vuelve la señal.
 *  merge: solo pisa los campos que se mandan (y dentro de los mapas, sus claves) */
export function saveTrip(uid: string, slug: string, data: Record<string, unknown>) {
  if (!services) return;
  const s = services;
  s.m.fs
    .setDoc(tripDoc(s, uid, slug), { ...data, updatedAt: s.m.fs.serverTimestamp() }, { merge: true })
    .catch(() => {});
}

/** Un gasto es una clave del mapa "expenses": se agregan sin pisar los demás */
export function saveExpense(uid: string, slug: string, expense: Expense) {
  saveTrip(uid, slug, { expenses: { [expense.id]: expense } });
}

export function deleteExpense(uid: string, slug: string, id: string) {
  if (!services) return;
  saveTrip(uid, slug, { expenses: { [id]: services.m.fs.deleteField() } });
}
