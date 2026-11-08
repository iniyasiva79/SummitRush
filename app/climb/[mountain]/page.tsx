import type { Metadata } from "next";
import { ClimbScreen } from "../../components/ClimbScreen";
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
    description: "Create a task, predict its time, and climb this SummitRush mountain.",
  };
}

export default async function ClimbPage({ params }: ClimbPageProps) {
  const { mountain } = await params;
  return <ClimbScreen mountainId={mountain} />;
}
