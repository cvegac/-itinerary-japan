import type { DayEntry } from "@/types/DayEntry";

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

export const WEEK_COLORS_HEX = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
] as const;

export const WEEK_COLORS_CLASS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-blue-500",
] as const;

export function getWeekIndex(date: string, startDate: string): number {
  const d = new Date(date + "T12:00:00");
  const start = new Date(startDate + "T12:00:00");
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return Math.floor(diffDays / 7);
}

export function getTotalWeeks(itinerary: DayEntry[], startDate: string): number {
  if (itinerary.length === 0) return 0;
  const lastDate = itinerary[itinerary.length - 1].date;
  return getWeekIndex(lastDate, startDate) + 1;
}

export function getWeekGroup(itinerary: DayEntry[], selectedDate: string, startDate: string): DayEntry[] {
  const wi = getWeekIndex(selectedDate, startDate);
  return itinerary.filter((e) => getWeekIndex(e.date, startDate) === wi);
}

function weekStartLabel(startDate: string, weekIndex: number): string {
  const weekStart = new Date(startDate + "T12:00:00");
  weekStart.setDate(weekStart.getDate() + weekIndex * 7);
  return weekStart.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function getWeekLabel(
  date: string | undefined | null,
  startDate: string,
  itinerary: DayEntry[]
): string {
  if (!date) return "";
  const wi = getWeekIndex(date, startDate);
  const total = getTotalWeeks(itinerary, startDate);
  return `${wi + 1}/${total} (${weekStartLabel(startDate, wi)})`;
}

export type CostSummary = {
  weeks: {
    weekNum: number;
    label: string;
    days: { date: string; label: string; budget: string; cost: number }[];
    total: number;
  }[];
  total: number;
};

export function computeCostSummary(itinerary: DayEntry[], startDate: string): CostSummary {
  const weeksMap = new Map<number, CostSummary["weeks"][number]>();
  let gTotal = 0;

  itinerary.forEach((day) => {
    const wi = getWeekIndex(day.date, startDate);
    const budgetRaw = day.budget.replace(/[^0-9]/g, "");
    const cost = budgetRaw ? parseInt(budgetRaw, 10) : 0;

    if (!weeksMap.has(wi)) {
      weeksMap.set(wi, { weekNum: wi + 1, label: weekStartLabel(startDate, wi), days: [], total: 0 });
    }

    const week = weeksMap.get(wi)!;
    week.total += cost;
    gTotal += cost;
    week.days.push({ date: day.date, label: day.label, budget: day.budget, cost });
  });

  const weeks = Array.from(weeksMap.values()).sort((a, b) => a.weekNum - b.weekNum);
  return { weeks, total: gTotal };
}
