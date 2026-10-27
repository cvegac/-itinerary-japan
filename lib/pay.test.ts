import { describe, expect, it } from "vitest";
import { dayPayments, payLabel } from "@/lib/pay";
import { makeDay } from "@/components/__tests__/fixtures";

describe("payLabel", () => {
  it("nombra los medios conocidos y deja tal cual el nombre de un pase", () => {
    expect(payLabel("suica")).toBe("Suica / PASMO");
    expect(payLabel("efectivo")).toBe("Efectivo");
    expect(payLabel("NIKKO PASS")).toBe("NIKKO PASS");
  });
});

describe("dayPayments", () => {
  it("junta los tramos del día por medio de pago, en el orden en que aparecen", () => {
    const day = makeDay("2026-11-02", "Lun", {
      transport: [
        { mode: "metro", line: "Ginza Line", from: "Inaricho", to: "Asakusa", pay: ["suica"] },
        { mode: "tren", line: "Tobu Nikko Line", from: "Asakusa", to: "Tobu-Nikko", pay: ["NIKKO PASS"] },
        { mode: "caminar", from: "Tobu-Nikko", to: "Shinkyo" },
        { mode: "bus", from: "Chikatsuyu", to: "Kii-Tanabe", pay: ["suica", "efectivo"] },
      ],
    });
    expect(dayPayments(day)).toEqual([
      { method: "suica", label: "Suica / PASMO", legs: ["Ginza Line", "Chikatsuyu → Kii-Tanabe"] },
      { method: "NIKKO PASS", label: "NIKKO PASS", legs: ["Tobu Nikko Line"] },
      { method: "efectivo", label: "Efectivo", legs: ["Chikatsuyu → Kii-Tanabe"] },
    ]);
  });

  it("no repite un tramo que aparece dos veces (ida y vuelta por la misma línea)", () => {
    const day = makeDay("2026-11-16", "Lun", {
      transport: [
        { mode: "tren", line: "JR Biwako Line", from: "Otsu", to: "Kioto", pay: ["suica"] },
        { mode: "tren", line: "JR Biwako Line", from: "Kioto", to: "Otsu", pay: ["suica"] },
      ],
    });
    expect(dayPayments(day)).toEqual([{ method: "suica", label: "Suica / PASMO", legs: ["JR Biwako Line"] }]);
  });

  it("devuelve una lista vacía si ningún tramo dice cómo se paga", () => {
    expect(dayPayments(makeDay("2026-11-01", "Dom"))).toEqual([]);
  });
});
