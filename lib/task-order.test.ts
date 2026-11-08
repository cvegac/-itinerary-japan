import { describe, expect, it } from "vitest";
import type { TripTask } from "@/types/Trip";
import { isTaskOpen, orderTasks } from "./task-order";

const t = (id: string, extra: Partial<TripTask> = {}): TripTask => ({ id, text: id, ...extra });

describe("isTaskOpen", () => {
  it("sin fecha de apertura se puede hacer ya", () => {
    expect(isTaskOpen(t("a"), "2026-11-08")).toBe(true);
  });

  it("se puede hacer desde el día de apertura, no antes", () => {
    expect(isTaskOpen(t("a", { from: "2026-11-19" }), "2026-11-18")).toBe(false);
    expect(isTaskOpen(t("a", { from: "2026-11-19" }), "2026-11-19")).toBe(true);
  });
});

describe("orderTasks", () => {
  it("primero lo que ya se puede hacer, por el día del viaje más cercano; después lo que abre más adelante", () => {
    const tasks = [
      t("sin-dia"),
      t("sky", { date: "2026-12-03", from: "2026-11-19" }),
      t("hida", { date: "2026-11-18" }),
      t("kuroshio", { date: "2026-11-14" }),
      t("odoriko", { date: "2026-11-30", from: "2026-11-10" }),
      t("otro-sin-dia"),
    ];
    expect(orderTasks(tasks, "2026-11-08").map((x) => x.id)).toEqual([
      "kuroshio",
      "hida",
      "sin-dia",
      "otro-sin-dia",
      "odoriko",
      "sky",
    ]);
  });

  it("una tarea que ya abrió se ordena con las demás por su día", () => {
    const tasks = [t("hida", { date: "2026-11-18" }), t("odoriko", { date: "2026-11-30", from: "2026-11-10" })];
    expect(orderTasks(tasks, "2026-11-12").map((x) => x.id)).toEqual(["hida", "odoriko"]);
  });

  it("no cambia la lista original", () => {
    const tasks = [t("b", { date: "2026-11-20" }), t("a", { date: "2026-11-10" })];
    orderTasks(tasks, "2026-11-08");
    expect(tasks.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
