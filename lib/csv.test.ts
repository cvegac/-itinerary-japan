import { describe, expect, it } from "vitest";
import { expensesCsv } from "./csv";
import type { Expense, Withdrawal } from "./expenses";

const expenses: Expense[] = [
  {
    id: "e1",
    date: "2026-11-02",
    amount: 1570,
    currency: "JPY",
    method: "cash",
    note: 'Toshogu, entrada "general"',
    createdAt: 2,
    perUsd: 157,
    rateDate: "2026-11-02",
  },
  { id: "e2", date: "2026-11-01", amount: 12.5, currency: "USD", method: "card", note: "Taxi", createdAt: 1 },
];
const withdrawals: Withdrawal[] = [{ id: "w1", date: "2026-11-01", amountYen: 30000, note: "Cajero", createdAt: 3 }];

const rows = (csv: string) => csv.replace(/^﻿/, "").trimEnd().split("\r\n");

describe("expensesCsv", () => {
  it("empieza con BOM para que Excel lea bien tildes y ¥", () => {
    expect(expensesCsv(expenses, withdrawals).startsWith("﻿")).toBe(true);
  });

  it("tiene encabezado y una fila por gasto o retiro, ordenadas por fecha", () => {
    const [header, ...data] = rows(expensesCsv(expenses, withdrawals));
    expect(header).toBe("Fecha,Tipo,Monto,Moneda,Forma de pago,En qué,Cotización (1 US$ =),Fecha cotización,≈ US$");
    expect(data).toEqual([
      "2026-11-01,Gasto,12.5,USD,Tarjeta,Taxi,1,,12.50",
      "2026-11-01,Retiro,30000,JPY,Efectivo,Cajero,,,",
      '2026-11-02,Gasto,1570,JPY,Efectivo,"Toshogu, entrada ""general""",157,2026-11-02,10.00',
    ]);
  });

  it("sin cotización guardada deja la columna vacía y usa el cambio de respaldo", () => {
    const [, row] = rows(
      expensesCsv([{ id: "x", date: "2026-11-03", amount: 3140, currency: "JPY", method: "card", note: "", createdAt: 1 }], [])
    );
    expect(row).toBe("2026-11-03,Gasto,3140,JPY,Tarjeta,,,,20.00");
  });

  it("sin registros devuelve solo el encabezado", () => {
    expect(rows(expensesCsv([], []))).toHaveLength(1);
  });
});
