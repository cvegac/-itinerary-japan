// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Nube de mentira: estado de sesión, documento remoto y lo que se guardó
const cloud = vi.hoisted(() => {
  type Listener = () => void;
  const listeners = new Set<Listener>();
  return {
    state: { status: "idle", user: null as null | { uid: string }, error: null },
    remote: undefined as undefined | null | { doneTasks: string[] },
    watcher: null as null | ((d: { doneTasks: string[] } | null) => void),
    saved: [] as string[][],
    listeners,
    login(uid = "u1") {
      this.state = { status: "signed-in", user: { uid }, error: null };
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
  watchTrip: (_uid: string, _slug: string, cb: (d: { doneTasks: string[] } | null) => void) => {
    cloud.watcher = cb;
    if (cloud.remote !== undefined) cb(cloud.remote);
    return () => {};
  },
  saveTrip: (_uid: string, _slug: string, data: { doneTasks: string[] }) => void cloud.saved.push(data.doneTasks),
}));

import { useDoneTasks } from "./done-tasks";

const KEY = "viajes-tareas-japan";
const PENDING = "viajes-tareas-japan-sin-subir";

beforeEach(() => {
  cloud.state = { status: "idle", user: null, error: null };
  cloud.remote = undefined;
  cloud.watcher = null;
  cloud.saved = [];
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const render = () => renderHook(() => useDoneTasks("japan"));

describe("useDoneTasks", () => {
  it("sin sesión guarda solo en el dispositivo y marca que falta subirlo", () => {
    const { result } = render();
    act(() => result.current[1]("a"));
    expect(result.current[0]).toEqual(["a"]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["a"]);
    expect(localStorage.getItem(PENDING)).toBe("1");
    expect(cloud.saved).toEqual([]);
  });

  it("al iniciar sesión sin nada en la nube, sube lo del dispositivo", () => {
    localStorage.setItem(KEY, JSON.stringify(["a"]));
    localStorage.setItem(PENDING, "1");
    cloud.remote = null;
    render();
    act(() => cloud.login());
    expect(cloud.saved).toEqual([["a"]]);
    expect(localStorage.getItem(PENDING)).toBeNull();
  });

  it("si lo del dispositivo ya estaba subido, manda la nube", () => {
    localStorage.setItem(KEY, JSON.stringify(["a"]));
    cloud.remote = { doneTasks: ["b"] };
    const { result } = render();
    act(() => cloud.login());
    expect(result.current[0]).toEqual(["b"]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["b"]);
    expect(cloud.saved).toEqual([]);
  });

  it("lo que hiciste sin sesión se suma a lo de la nube", () => {
    localStorage.setItem(KEY, JSON.stringify(["a"]));
    localStorage.setItem(PENDING, "1");
    cloud.remote = { doneTasks: ["b"] };
    const { result } = render();
    act(() => cloud.login());
    expect(result.current[0]).toEqual(["b", "a"]);
    expect(cloud.saved).toEqual([["b", "a"]]);
  });

  it("con sesión, cada cambio se sube y los cambios de otro dispositivo llegan solos", () => {
    cloud.remote = { doneTasks: [] };
    const { result } = render();
    act(() => cloud.login());
    act(() => result.current[1]("a"));
    expect(cloud.saved.at(-1)).toEqual(["a"]);
    expect(localStorage.getItem(PENDING)).toBeNull();

    act(() => cloud.watcher!({ doneTasks: ["a", "c"] }));
    expect(result.current[0]).toEqual(["a", "c"]);
  });

  it("tocar de nuevo una tarea hecha la vuelve a pendiente", () => {
    localStorage.setItem(KEY, JSON.stringify(["a"]));
    const { result } = render();
    act(() => result.current[1]("a"));
    expect(result.current[0]).toEqual([]);
  });
});
