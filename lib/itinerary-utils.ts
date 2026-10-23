import type { DayEntry } from "@/types/DayEntry";

export const WEEK_COLORS_HEX = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
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

export type LodgingStay = {
  /** Fecha de la primera noche (check-in) */
  checkIn: string;
  /** Día siguiente a la última noche (check-out) */
  checkOut: string;
  nights: number;
  place: string;
  recommendation: string;
};

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Agrupa las noches seguidas en el mismo hospedaje. Salta los días sin cama:
 *  tránsito, bus nocturno o accommodation "---". */
export function computeLodgingSummary(itinerary: DayEntry[]): LodgingStay[] {
  const stays: (LodgingStay & { key: string })[] = [];

  itinerary.forEach((day) => {
    if (day.isTransit || day.nightBus || day.accommodation === "---") return;

    const key = day.lodgingPlace ?? day.accommodation;
    const last = stays[stays.length - 1];
    if (last && last.key === key && last.checkOut === day.date) {
      last.nights += 1;
      last.checkOut = addDays(day.date, 1);
      return;
    }

    stays.push({
      key,
      checkIn: day.date,
      checkOut: addDays(day.date, 1),
      nights: 1,
      place: day.lodgingPlace ?? day.zona,
      recommendation: day.accommodation,
    });
  });

  return stays.map(({ key: _key, ...stay }) => stay);
}
