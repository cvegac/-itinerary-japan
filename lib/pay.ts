import type { DayEntry } from "@/types/DayEntry";

// Cómo se paga cada tramo (campo `pay` de TransportSegment). Los ids conocidos
// tienen nombre; cualquier otro texto es el nombre de un pase y va tal cual.
export const PAY_LABELS: Record<string, string> = {
  suica: "Suica / PASMO",
  boleto: "Boleto en la estación",
  tarjeta: "Tarjeta de crédito",
  efectivo: "Efectivo",
  app: "App de bici compartida",
};

export type DayPayment = { method: string; label: string; legs: string[] };

export function payLabel(method: string): string {
  return PAY_LABELS[method] ?? method;
}

/** Medios de pago del día con los tramos en que sirve cada uno, en el orden en que aparecen */
export function dayPayments(day: DayEntry): DayPayment[] {
  const byMethod = new Map<string, DayPayment>();
  for (const leg of day.transport) {
    const name = leg.line ?? `${leg.from} → ${leg.to}`;
    for (const method of leg.pay ?? []) {
      const entry = byMethod.get(method) ?? { method, label: payLabel(method), legs: [] };
      if (!entry.legs.includes(name)) entry.legs.push(name);
      byMethod.set(method, entry);
    }
  }
  return Array.from(byMethod.values());
}
