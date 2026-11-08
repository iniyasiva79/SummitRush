import type { Metadata } from "next";
import { MountainGate } from "../components/MountainGate";

export const metadata: Metadata = {
  title: "Mountains · SummitRush",
  description: "Mountain selection opens after an avatar is saved.",
};

export default function MountainsPage() {
  return <MountainGate />;
}
