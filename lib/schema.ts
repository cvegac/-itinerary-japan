import { z } from "zod";
import type { DayEntry } from "@/types/DayEntry";

// Esquema de los itinerarios (los JSON de data/trips). Lo usan solo los tests:
// el JSON entra a la app con "as DayEntry[]", así que TypeScript no ve un campo
// mal escrito o un monto inválido; este esquema sí. strict(): un campo que no
// existe en el tipo es un error.

const currency = z.enum(["JPY", "USD", "COP"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha YYYY-MM-DD");
const latLng = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);
const text = z.string().min(1);

const moneyFields = {
  amount: z.number().nonnegative(),
  max: z.number().positive().optional(),
  currency,
  approx: z.boolean().optional(),
};
const rangeOk = (m: { amount: number; max?: number }) => m.max === undefined || m.max > m.amount;
const RANGE = { message: "max tiene que ser mayor que amount" };

export const MoneySchema = z.object(moneyFields).strict().refine(rangeOk, RANGE);

export const CostSchema = z
  .object({ ...moneyFields, perLeg: z.boolean().optional(), included: text.optional(), detail: text.optional() })
  .strict()
  .refine(rangeOk, RANGE);

const TransportSchema = z
  .object({
    mode: text,
    line: text.optional(),
    from: text,
    to: text,
    via: z.array(text).min(1).optional(),
    duration: text.optional(),
    cost: CostSchema.optional(),
    optional: z.boolean().optional(),
    note: text.optional(),
  })
  .strict();

const ActivitySchema = z.union([
  text,
  z.object({ text, price: MoneySchema.optional(), optional: z.boolean().optional() }).strict(),
]);

const PoiSchema = z
  .object({ name: text, coords: latLng, night: z.boolean().optional(), icon: text.optional() })
  .strict();

export const DaySchema = z
  .object({
    date: isoDate,
    label: text,
    location: text,
    category: text,
    notes: z.string(),
    weekday: z.enum(["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]),
    food: z.string(),
    transport: z.array(TransportSchema),
    accommodation: text,
    lodgingPlace: text.optional(),
    zona: z.string(),
    accommodationCoords: latLng,
    lodgingCost: z.number().positive().optional(),
    lodgingJa: z.object({ name: text, address: text, phone: text.optional() }).strict().optional(),
    checkIn: text.optional(),
    checkOut: text.optional(),
    pois: z.array(PoiSchema).optional(),
    keepOrder: z.boolean().optional(),
    keepOrderReason: text.optional(),
    hike: z.boolean().optional(),
    budget: z.string().regex(/^\$\d+$/, "presupuesto como $123"),
    activitiesDay: z.array(ActivitySchema),
    activitiesNight: z.array(ActivitySchema),
    isTransit: z.boolean(),
    enRoute: z.boolean().optional(),
    nightBus: text.optional(),
    timeSaved: text.optional(),
    busRoute: text.optional(),
    busCost: text.optional(),
    hotelSaved: text.optional(),
  })
  .strict();

export const ItinerarySchema = z.array(DaySchema);

/** Errores de un itinerario, legibles: "2026-11-04 transport.0.cost.currency: …" */
export function itineraryIssues(itinerary: unknown): string[] {
  const result = ItinerarySchema.safeParse(itinerary);
  if (result.success) return [];
  const days = itinerary as DayEntry[];
  return result.error.issues.map((issue) => {
    const [index, ...path] = issue.path;
    const date = days[index as number]?.date ?? `día ${String(index)}`;
    return `${date} ${path.join(".")}: ${issue.message}`;
  });
}
