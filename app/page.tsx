import Link from "next/link";
import { getAllTrips } from "@/data/trips";

export default function HomePage() {
  const trips = getAllTrips();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-900">Mis Viajes</h1>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {trips.map((trip) => (
          <Link
            key={trip.meta.slug}
            href={`/${trip.meta.slug}`}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-400 transition-colors"
          >
            <span className="text-2xl">{trip.meta.emoji}</span>
            <div>
              <div className="font-semibold text-gray-900">{trip.meta.title}</div>
              <div className="text-xs text-gray-500">{trip.meta.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
