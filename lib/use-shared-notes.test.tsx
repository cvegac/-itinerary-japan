// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedNote, SharedTrip } from "./shared-notes";

// Nube de mentira: sesión, viajes y notas que "llegan" de Firestore, y lo que se escribió
const cloud = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    state: { status: "signed-out", user: null as null | { uid: string; name: string }, error: null },
    listeners,
    trips: null as null | ((t: SharedTrip[]) => void),
    notes: null as null | ((n: SharedNote[]) => void),
    watchedTrip: null as string | null,
    calls: [] as unknown[][],
    joinError: false,
    login(uid = "cris") {
      this.state = { status: "signed-in", user: { uid, name: uid }, error: null };
      listeners.forEach((l) => l());
    },
  };
});

vi.mock("@/lib/cloud", () => ({
  getCloudState: () => cloud.state,
  subscribeCloud: (l: () => void) => {
    cloud.listeners.add(l);
    return () => cloud.listeners.delete(l);
  },
  signIn: () => cloud.calls.push(["signIn"]),
  watchMyTrips: (_uid: string, _slug: string, cb: (t: SharedTrip[]) => void) => {
    cloud.trips = cb;
    return () => {};
  },
  watchNotes: (tripId: string, cb: (n: SharedNote[]) => void) => {
    cloud.watchedTrip = tripId;
    cloud.notes = cb;
    return () => {};
  },
  createSharedTrip: (_user: unknown, slug: string) => (cloud.calls.push(["create", slug]), "nuevo"),
  joinSharedTrip: async (id: string) => {
    cloud.calls.push(["join", id]);
    if (cloud.joinError) throw new Error("permission-denied");
  },
  addNote: (...args: unknown[]) => cloud.calls.push(["add", ...args]),
  editNote: (...args: unknown[]) => cloud.calls.push(["edit", ...args]),
  deleteNote: (...args: unknown[]) => cloud.calls.push(["delete", ...args]),
}));

import { useSharedNotes } from "./use-shared-notes";

const trip: SharedTrip = { id: "t1", members: ["cris", "karla"], names: { cris: "Cris", karla: "Karla" } };
const note = (id: string, author = "karla"): SharedNote => ({ id, day: "2026-11-03", text: id, author, createdAt: 1 });

beforeEach(() => {
  cloud.state = { status: "signed-out", user: null, error: null };
  cloud.trips = cloud.notes = null;
  cloud.watchedTrip = null;
  cloud.calls = [];
  cloud.joinError = false;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

const render = () => renderHook(() => useSharedNotes("japan"));

describe("useSharedNotes", () => {
  it("sin sesión no hay notas y ofrece entrar", () => {
    const { result } = render();
    expect(result.current.status).toBe("signed-out");
    act(() => result.current.signIn());
    expect(cloud.calls).toEqual([["signIn"]]);
  });

  it("con sesión trae las notas del viaje compartido y los nombres", () => {
    const { result } = render();
    act(() => cloud.login());
    expect(result.current.status).toBe("loading");
    act(() => cloud.trips!([trip]));
    expect(cloud.watchedTrip).toBe("t1");
    act(() => cloud.notes!([note("a")]));
    expect(result.current.status).toBe("ready");
    expect(result.current.notes.map((n) => n.id)).toEqual(["a"]);
    expect(result.current.names.karla).toBe("Karla");
  });

  it("la primera nota crea el viaje si todavía no existe", () => {
    const { result } = render();
    act(() => cloud.login());
    act(() => cloud.trips!([]));
    expect(result.current.status).toBe("ready");
    act(() => result.current.add("2026-11-03", "  Llevar abrigo  ", "Ameyoko"));
    expect(cloud.calls).toEqual([
      ["create", "japan"],
      ["add", "nuevo", "cris", { day: "2026-11-03", text: "Llevar abrigo", place: "Ameyoko" }],
    ]);
  });

  it("no guarda notas vacías", () => {
    const { result } = render();
    act(() => cloud.login());
    act(() => cloud.trips!([trip]));
    act(() => result.current.add("2026-11-03", "   "));
    expect(cloud.calls).toEqual([]);
  });

  it("edita y borra en el viaje", () => {
    const { result } = render();
    act(() => cloud.login());
    act(() => cloud.trips!([trip]));
    act(() => result.current.edit("a", "otra cosa"));
    act(() => result.current.remove("a"));
    expect(cloud.calls).toEqual([
      ["edit", "t1", "a", "otra cosa"],
      ["delete", "t1", "a"],
    ]);
  });

  it("las nuevas del otro dejan de serlo al verlas, y queda guardado en el dispositivo", () => {
    const { result } = render();
    act(() => cloud.login());
    act(() => cloud.trips!([trip]));
    act(() => cloud.notes!([note("a"), note("b"), note("mia", "cris")]));
    expect(result.current.unseen.map((n) => n.id)).toEqual(["a", "b"]);
    act(() => result.current.markSeen(["a"]));
    expect(result.current.unseen.map((n) => n.id)).toEqual(["b"]);
    expect(JSON.parse(localStorage.getItem("viajes-notas-vistas-japan")!)).toEqual(["a"]);
  });

  it("el link de invitación crea el viaje si hace falta", () => {
    const { result } = render();
    act(() => cloud.login());
    act(() => cloud.trips!([]));
    let link: string | null = null;
    act(() => {
      link = result.current.invite();
    });
    expect(link).toBe("http://localhost:3000/?unirse=nuevo");
  });

  it("con el link: al entrar se suma al viaje y limpia la dirección", async () => {
    window.history.replaceState(null, "", "/japan/?unirse=t1");
    const { result } = render();
    expect(result.current.invited).toBe(true);
    act(() => cloud.login("karla"));
    await waitFor(() => expect(result.current.invited).toBe(false));
    expect(cloud.calls).toEqual([["join", "t1"]]);
    expect(window.location.search).toBe("");
  });

  it("si el link ya no sirve, lo avisa", async () => {
    cloud.joinError = true;
    window.history.replaceState(null, "", "/japan/?unirse=t1");
    const { result } = render();
    act(() => cloud.login("caro"));
    await waitFor(() => expect(result.current.inviteError).toMatch(/ya no sirve/));
  });
});
