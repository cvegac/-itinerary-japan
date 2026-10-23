import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAllTrips } from "@/data/trips";

export default function HomePage() {
  const trips = getAllTrips();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mis viajes</h1>
        <p className="text-sm text-muted">Itinerarios, mapas, costos y hospedaje</p>
      </header>
      <ul className="flex flex-col gap-3">
        {trips.map(({ meta }) => (
          <li key={meta.slug}>
            <Link
              href={`/${meta.slug}`}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-surface-2 text-3xl">
                {meta.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{meta.title}</span>
                <span className="block text-sm text-muted">{meta.subtitle}</span>
              </span>
              <ChevronRight className="size-5 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
