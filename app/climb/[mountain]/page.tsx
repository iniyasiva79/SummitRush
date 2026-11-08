import type { Metadata } from "next";
import { ClimbPlaceholder } from "../../components/ClimbPlaceholder";
import { MOUNTAINS, isMountainId, mountainById } from "../../lib/mountains";

type ClimbPageProps = {
  params: Promise<{ mountain: string }>;
};

export function generateStaticParams() {
  return MOUNTAINS.map((mountain) => ({ mountain: mountain.id }));
}

export async function generateMetadata({ params }: ClimbPageProps): Promise<Metadata> {
  const { mountain } = await params;
  const known = isMountainId(mountain) ? mountainById(mountain) : null;
  return {
    title: known ? `${known.name} · SummitRush` : "Climb · SummitRush",
    description: "The SummitRush climb screen is not built yet.",
  };
}

export default async function ClimbPage({ params }: ClimbPageProps) {
  const { mountain } = await params;
  return <ClimbPlaceholder mountainId={mountain} />;
}
