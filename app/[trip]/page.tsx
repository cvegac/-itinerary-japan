import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTripData, getAllTripSlugs } from "@/data/trips";
import TripApp from "@/components/TripApp";

type Props = {
  params: { trip: string };
};

export function generateStaticParams() {
  return getAllTripSlugs().map((trip) => ({ trip }));
}

export function generateMetadata({ params }: Props): Metadata {
  const tripData = getTripData(params.trip);
  if (!tripData) return {};

  return {
    title: `${tripData.meta.title} ${tripData.meta.emoji}`,
    description: tripData.meta.subtitle,
  };
}

export default function TripPage({ params }: Props) {
  const tripData = getTripData(params.trip);
  if (!tripData) notFound();

  return <TripApp tripData={tripData} />;
}
