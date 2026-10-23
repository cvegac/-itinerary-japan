// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Expense, Withdrawal } from "./expenses";

type Remote = Record<string, Record<string, unknown> | undefined> | null;

const cloud = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    state: { status: "idle", user: null as null | { uid: string }, error: null },
    remote: undefined as undefined | Remote,
    watchers: [] as ((d: Remote) => void)[],
    saved: [] as { field: string; record: { id: string } }[],
    deleted: [] as { field: string; id: string }[],
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
    cloud.watchers.push(cb);
    if (cloud.remote !== undefined) cb(cloud.remote);
    return () => {};
  },
  saveRecord: (_uid: string, _slug: string, field: string, record: { id: string }) =>
    void cloud.saved.push({ field, record }),
  deleteRecord: (_uid: string, _slug: string, field: string, id: string) => void cloud.deleted.push({ field, id }),
}));

import { cashBalance, dailySummary, spentByDate, useExpenses, useWithdrawals } from "./expenses";

const KEY = "viajes-gastos-japan";
const expense = (over: Partial<Expense> = {}): Expense => ({
  id: "e1",
  date: "2026-11-02",
  amount: 1600,
  currency: "JPY",
  method: "cash",
  note: "Toshogu",
  createdAt: 1,
  ...over,
});
const withdrawal = (over: Partial<Withdrawal> = {}): Withdrawal => ({
  id: "w1",
  date: "2026-11-01",
  amountYen: 30000,
  note: "",
  createdAt: 1,
  ...over,
});

beforeEach(() => {
  cloud.state = { status: "idle", user: null, error: null };
  cloud.remote = undefined;
  cloud.watchers = [];
  cloud.saved = [];
  cloud.deleted = [];
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const newExpense = { date: "2026-11-02", amount: 1600, currency: "JPY" as const, method: "cash" as const, note: "Toshogu" };

describe("useExpenses", () => {
  it("no guarda nada solo por abrir", () => {
    renderHook(() => useExpenses("japan"));
    expect(localStorage.length).toBe(0);
  });

  it("sin sesión guarda el gasto en el dispositivo, con su moneda y cómo se pagó", () => {
    const { result } = renderHook(() => useExpenses("japan"));
    act(() => result.current.add(newExpense));
    expect(result.current.records).toMatchObject([newExpense]);
    expect(Object.keys(JSON.parse(localStorage.getItem(KEY)!))).toHaveLength(1);
    expect(cloud.saved).toEqual([]);
  });

  it("lee los gastos del formato anterior (solo yenes) como yenes", () => {
    localStorage.setItem(KEY, JSON.stringify({ a: { id: "a", date: "2026-11-01", amountYen: 900, note: "Ramen", createdAt: 1 } }));
    const { result } = renderHook(() => useExpenses("japan"));
    expect(result.current.records).toMatchObject([{ amount: 900, currency: "JPY", method: "card" }]);
  });

  it("al iniciar sesión sube lo cargado sin sesión, sin pisar lo de la nube", () => {
    const { result } = renderHook(() => useExpenses("japan"));
    act(() => result.current.add(newExpense));
    cloud.remote = { expenses: { b: expense({ id: "b", date: "2026-11-01", amount: 900 }) } };
    act(() => cloud.login());
    expect(cloud.saved).toMatchObject([{ field: "expenses", record: { amount: 1600 } }]);
    expect(result.current.records.map((e) => e.amount)).toEqual([900, 1600]);
  });

  it("lo ya subido no se vuelve a subir: lo borrado en otro dispositivo no revive", () => {
    localStorage.setItem(KEY, JSON.stringify({ a: expense({ id: "a" }) }));
    cloud.remote = { expenses: {} };
    const { result } = renderHook(() => useExpenses("japan"));
    act(() => cloud.login());
    expect(cloud.saved).toEqual([]);
    expect(result.current.records).toEqual([]);
  });

  it("con sesión cada gasto se sube y se borra de la nube", () => {
    cloud.remote = { expenses: {} };
    const { result } = renderHook(() => useExpenses("japan"));
    act(() => cloud.login());
    act(() => result.current.add(newExpense));
    const id = cloud.saved[0].record.id;
    act(() => result.current.remove(id));
    expect(cloud.deleted).toEqual([{ field: "expenses", id }]);
    expect(result.current.records).toEqual([]);
  });
});

describe("useWithdrawals", () => {
  it("guarda los retiros aparte de los gastos y los sincroniza en su propio campo", () => {
    cloud.remote = {};
    const { result } = renderHook(() => useWithdrawals("japan"));
    act(() => cloud.login());
    act(() => result.current.add({ date: "2026-11-01", amountYen: 30000, note: "Cajero 7-Eleven" }));
    expect(cloud.saved).toMatchObject([{ field: "withdrawals", record: { amountYen: 30000 } }]);
    expect(localStorage.getItem("viajes-retiros-japan")).not.toBeNull();
  });
});

describe("cashBalance", () => {
  it("efectivo = retiros − lo pagado en efectivo con yenes", () => {
    const balance = cashBalance(
      [
        expense({ amount: 1600, method: "cash" }),
        expense({ id: "e2", amount: 5000, method: "card" }),
        expense({ id: "e3", amount: 20, currency: "USD", method: "cash" }),
      ],
      [withdrawal({ amountYen: 30000 }), withdrawal({ id: "w2", amountYen: 10000 })]
    );
    expect(balance).toEqual({ withdrawn: 40000, spentCash: 1600, balance: 38400 });
  });
});

describe("spentByDate", () => {
  it("suma lo gastado cada día en dólares, juntando monedas", () => {
    const totals = spentByDate([
      expense({ amount: 1500 }),
      expense({ id: "e2", amount: 40000, currency: "COP" }),
      expense({ id: "e3", date: "2026-11-03", amount: 5, currency: "USD" }),
    ]);
    expect(totals).toEqual({ "2026-11-02": 20, "2026-11-03": 5 });
  });
});

describe("dailySummary", () => {
  it("agrupa gastos y retiros por día, en orden", () => {
    const days = dailySummary(
      [expense({ date: "2026-11-02", amount: 1500 }), expense({ id: "e2", date: "2026-11-01", amount: 3000 })],
      [withdrawal({ date: "2026-11-01" })]
    );
    expect(days.map((d) => [d.date, d.expenses.length, d.withdrawals.length, d.totalUsd])).toEqual([
      ["2026-11-01", 1, 1, 20],
      ["2026-11-02", 1, 0, 10],
    ]);
  });
});
