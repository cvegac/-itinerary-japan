import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preconnect } from "react-dom";
import { getTripData, getAllTripSlugs } from "@/data/trips";
import TripApp from "@/components/TripApp";

// Desde Next 15, params llega como Promise
type Props = {
  params: Promise<{ trip: string }>;
};

export function generateStaticParams() {
  return getAllTripSlugs().map((trip) => ({ trip }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trip } = await params;
  const tripData = getTripData(trip);
  if (!tripData) return {};

  return {
    title: `${tripData.meta.title} ${tripData.meta.emoji}`,
    description: tripData.meta.subtitle,
  };
}

export default async function TripPage({ params }: Props) {
  const { trip } = await params;
  const tripData = getTripData(trip);
  if (!tripData) notFound();

  // El mapa pide estilo, tiles y relieve a estos servidores: abrir la conexión desde el HTML
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });
  preconnect("https://elevation-tiles-prod.s3.amazonaws.com", { crossOrigin: "anonymous" });

  return <TripApp tripData={tripData} />;
}
