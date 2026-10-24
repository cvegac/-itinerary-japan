import { expenseUsd, type Expense, type Withdrawal } from "@/lib/expenses";

// Exportación de gastos y retiros a CSV (RFC 4180: coma, comillas dobles,
// fin de línea CRLF). Con BOM para que Excel lea bien tildes y ¥.

const HEADER = [
  "Fecha",
  "Tipo",
  "Monto",
  "Moneda",
  "Forma de pago",
  "En qué",
  "Cotización (1 US$ =)",
  "Fecha cotización",
  "≈ US$",
];

/** Entre comillas si tiene coma, comillas o salto de línea; las comillas se duplican */
function cell(value: string | number | undefined): string {
  const s = value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function expensesCsv(expenses: Expense[], withdrawals: Withdrawal[]): string {
  const rows = [
    ...expenses.map((e) => ({
      date: e.date,
      createdAt: e.createdAt,
      cells: [
        e.date,
        "Gasto",
        e.amount,
        e.currency,
        e.method === "cash" ? "Efectivo" : "Tarjeta",
        e.note,
        e.currency === "USD" ? 1 : e.perUsd,
        e.rateDate,
        expenseUsd(e).toFixed(2),
      ],
    })),
    ...withdrawals.map((w) => ({
      date: w.date,
      createdAt: w.createdAt,
      cells: [w.date, "Retiro", w.amountYen, "JPY", "Efectivo", w.note, undefined, undefined, undefined],
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

  const lines = [HEADER, ...rows.map((r) => r.cells)].map((cells) => cells.map(cell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Descarga el CSV en el dispositivo (en el celular queda en Descargas) */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
