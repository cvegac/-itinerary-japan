import type { TripData } from "@/types/Trip";
import { japanTrip } from "./japan";
import { ejeCafeteroTrip } from "./eje-cafetero";

const TRIPS: Record<string, TripData> = {
  [japanTrip.meta.slug]: japanTrip,
  [ejeCafeteroTrip.meta.slug]: ejeCafeteroTrip,
};

export function getTripData(slug: string): TripData | undefined {
  return TRIPS[slug];
}

export function getAllTripSlugs(): string[] {
  return Object.keys(TRIPS);
}

export function getAllTrips(): TripData[] {
  return Object.values(TRIPS);
}
