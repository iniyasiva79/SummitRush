import type { Metadata } from "next";
import { MountainSelect } from "../components/MountainSelect";

export const metadata: Metadata = {
  title: "Mountains · SummitRush",
  description: "Choose the next SummitRush mountain. Mount Fuji starts unlocked.",
};

export default function MountainsPage() {
  return <MountainSelect />;
}
