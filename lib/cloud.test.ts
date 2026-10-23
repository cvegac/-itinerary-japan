// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Firebase de mentira: registra qué se llamó y deja disparar el cambio de usuario
const fb = vi.hoisted(() => ({
  loaded: false,
  authCallback: null as null | ((u: unknown) => void),
  calls: [] as string[],
}));

vi.mock("firebase/app", () => {
  fb.loaded = true;
  return {
    getApps: () => [],
    initializeApp: () => ({ name: "app" }),
    deleteApp: async () => void fb.calls.push("deleteApp"),
  };
});
vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  GoogleAuthProvider: class {},
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
    fb.authCallback = cb;
    return () => {};
  },
  signInWithPopup: async () => {
    fb.calls.push("signInWithPopup");
    fb.authCallback?.({ uid: "u1", displayName: "Cris", email: "c@x.com", photoURL: null });
  },
  signOut: async () => {
    fb.calls.push("signOut");
    fb.authCallback?.(null);
  },
}));
vi.mock("firebase/firestore", () => ({
  initializeFirestore: () => ({}),
  persistentLocalCache: () => ({}),
  persistentMultipleTabManager: () => ({}),
  terminate: async () => void fb.calls.push("terminate"),
  clearIndexedDbPersistence: async () => void fb.calls.push("clearIndexedDbPersistence"),
  doc: () => ({}),
  onSnapshot: () => () => {},
  setDoc: async () => {},
  serverTimestamp: () => "ts",
}));

async function loadCloud(config: object | null = { apiKey: "k", projectId: "p" }) {
  vi.resetModules();
  vi.doMock("@/lib/firebase-config", () => ({ FIREBASE_CONFIG: config }));
  return import("./cloud");
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  fb.loaded = false;
  fb.authCallback = null;
  fb.calls = [];
});
afterEach(() => localStorage.clear());

describe("cloud", () => {
  it("sin configuración queda deshabilitado", async () => {
    const cloud = await loadCloud(null);
    expect(cloud.getCloudState().status).toBe("disabled");
  });

  it("al abrir sin haber iniciado sesión nunca no carga Firebase ni guarda nada", async () => {
    const cloud = await loadCloud();
    cloud.resumeSession();
    await flush();
    expect(fb.loaded).toBe(false);
    expect(cloud.getCloudState().status).toBe("idle");
    expect(localStorage.length).toBe(0);
  });

  it("iniciar sesión abre Google y recuerda la sesión para la próxima vez", async () => {
    const cloud = await loadCloud();
    await cloud.signIn();
    expect(fb.calls).toContain("signInWithPopup");
    expect(cloud.getCloudState()).toMatchObject({ status: "signed-in", user: { uid: "u1", name: "Cris" } });
    expect(localStorage.getItem("viajes-sesion")).toBe("1");
  });

  it("con una sesión de antes, la retoma al abrir", async () => {
    localStorage.setItem("viajes-sesion", "1");
    const cloud = await loadCloud();
    cloud.resumeSession();
    await flush();
    expect(cloud.getCloudState().status).toBe("loading");
    fb.authCallback?.({ uid: "u1", displayName: "Cris", email: null, photoURL: null });
    expect(cloud.getCloudState().status).toBe("signed-in");
  });

  it("si la sesión de antes ya no vale, olvida la marca", async () => {
    localStorage.setItem("viajes-sesion", "1");
    const cloud = await loadCloud();
    cloud.resumeSession();
    await flush();
    fb.authCallback?.(null);
    expect(cloud.getCloudState().status).toBe("signed-out");
    expect(localStorage.getItem("viajes-sesion")).toBeNull();
  });

  it("cerrar sesión borra la marca y la copia local de la nube", async () => {
    const cloud = await loadCloud();
    await cloud.signIn();
    await cloud.signOutUser();
    expect(fb.calls).toEqual(
      expect.arrayContaining(["signOut", "terminate", "clearIndexedDbPersistence", "deleteApp"])
    );
    expect(localStorage.getItem("viajes-sesion")).toBeNull();
    expect(cloud.getCloudState()).toMatchObject({ status: "idle", user: null });
  });
});
