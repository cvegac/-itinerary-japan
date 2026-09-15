import { ITINERARY, NIGHT_BUS_SUMMARY } from "@/data/itinerary";

export { NIGHT_BUS_SUMMARY };

export const LEGEND = [
  { label: "Naturaleza", color: "bg-emerald-400" },
  { label: "Logística", color: "bg-slate-400" },
  { label: "Ciudad", color: "bg-orange-400" },
  { label: "Paisaje", color: "bg-sky-400" },
  { label: "Vistas", color: "bg-violet-400" },
  { label: "Compras", color: "bg-pink-400" },
  { label: "Libre", color: "bg-yellow-400" },
  { label: "Bus Nocturno", color: "bg-orange-400", icon: "🚌" },
] as const;

export const WEEK_LABELS = ["1 nov", "8 nov", "15 nov", "22 nov", "29 nov"] as const;

export function getWeekLabel(date?: string): string {
  if (!date) return "";
  const d = new Date(date + "T12:00:00");
  const start = new Date("2026-11-01T12:00:00");
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const wi = Math.min(Math.floor(diffDays / 7), WEEK_LABELS.length - 1);
  return `${wi + 1}/5 (${WEEK_LABELS[wi]})`;
}

export const COST_SUMMARY = (() => {
  const weeks: { weekNum: number; label: string; days: { date: string; label: string; budget: string; cost: number }[]; total: number }[] = [];
  let wIndex = -1;
  let gTotal = 0;

  ITINERARY.forEach((day, i) => {
    const budgetRaw = day.budget.replace(/[^0-9]/g, "");
    const cost = budgetRaw ? parseInt(budgetRaw, 10) : 0;

    if (i % 7 === 0) {
      wIndex++;
      weeks.push({ weekNum: wIndex + 1, label: WEEK_LABELS[wIndex] ?? `Semana ${wIndex + 1}`, days: [], total: 0 });
    }

    weeks[wIndex].total += cost;
    gTotal += cost;
    weeks[wIndex].days.push({ date: day.date, label: day.label, budget: day.budget, cost });
  });

  return { weeks, total: gTotal };
})();
