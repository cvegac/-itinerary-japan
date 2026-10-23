// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Expense } from "./expenses";

type Remote = { expenses?: Record<string, Expense> } | null;

const cloud = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    state: { status: "idle", user: null as null | { uid: string }, error: null },
    remote: undefined as undefined | Remote,
    watcher: null as null | ((d: Remote) => void),
    saved: [] as Expense[],
    deleted: [] as string[],
    listeners,
    login() {
      this.state = { status: "signed-in", user: { uid: "u1" }, error: null };
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
  watchTrip: (_uid: string, _slug: string, cb: (d: Remote) => void) => {
    cloud.watcher = cb;
    if (cloud.remote !== undefined) cb(cloud.remote);
    return () => {};
  },
  saveExpense: (_uid: string, _slug: string, e: Expense) => void cloud.saved.push(e),
  deleteExpense: (_uid: string, _slug: string, id: string) => void cloud.deleted.push(id),
}));

import { spentByDate, useExpenses } from "./expenses";

const KEY = "viajes-gastos-japan";
const exp = (id: string, date: string, amountYen: number, note = ""): Expense => ({
  id,
  date,
  amountYen,
  note,
  createdAt: 1,
});

beforeEach(() => {
  cloud.state = { status: "idle", user: null, error: null };
  cloud.remote = undefined;
  cloud.watcher = null;
  cloud.saved = [];
  cloud.deleted = [];
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const render = () => renderHook(() => useExpenses("japan"));

describe("useExpenses", () => {
  it("no guarda nada solo por abrir", () => {
    render();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("sin sesión guarda el gasto en el dispositivo", () => {
    const { result } = render();
    act(() => result.current.add("2026-11-02", 1600, "Toshogu"));
    expect(result.current.expenses).toMatchObject([{ date: "2026-11-02", amountYen: 1600, note: "Toshogu" }]);
    expect(Object.keys(JSON.parse(localStorage.getItem(KEY)!))).toHaveLength(1);
    expect(cloud.saved).toEqual([]);
  });

  it("al iniciar sesión sube los gastos cargados sin sesión, sin pisar los de la nube", () => {
    const { result } = render();
    act(() => result.current.add("2026-11-02", 1600, "Toshogu"));
    cloud.remote = { expenses: { b: exp("b", "2026-11-01", 900, "Ramen") } };
    act(() => cloud.login());
    expect(cloud.saved).toMatchObject([{ amountYen: 1600 }]);
    expect(result.current.expenses.map((e) => e.amountYen)).toEqual([900, 1600]);
  });

  it("los gastos ya subidos no se vuelven a subir: lo borrado en otro dispositivo no revive", () => {
    localStorage.setItem(KEY, JSON.stringify({ a: exp("a", "2026-11-01", 500) }));
    cloud.remote = { expenses: {} };
    const { result } = render();
    act(() => cloud.login());
    expect(cloud.saved).toEqual([]);
    expect(result.current.expenses).toEqual([]);
  });

  it("con sesión cada gasto se sube al cargarlo y se borra de la nube al quitarlo", () => {
    cloud.remote = { expenses: {} };
    const { result } = render();
    act(() => cloud.login());
    act(() => result.current.add("2026-11-03", 2000, "Bici"));
    expect(cloud.saved).toHaveLength(1);
    const id = cloud.saved[0].id;
    act(() => result.current.remove(id));
    expect(cloud.deleted).toEqual([id]);
    expect(result.current.expenses).toEqual([]);
  });

  it("los gastos de otro dispositivo llegan solos", () => {
    cloud.remote = { expenses: {} };
    const { result } = render();
    act(() => cloud.login());
    act(() => cloud.watcher!({ expenses: { z: exp("z", "2026-11-05", 3000, "Ferry") } }));
    expect(result.current.expenses).toMatchObject([{ id: "z", amountYen: 3000 }]);
  });
});

describe("spentByDate", () => {
  it("suma los gastos de cada día", () => {
    const totals = spentByDate([exp("a", "2026-11-01", 500), exp("b", "2026-11-01", 700), exp("c", "2026-11-02", 100)]);
    expect(totals).toEqual({ "2026-11-01": 1200, "2026-11-02": 100 });
  });
});
