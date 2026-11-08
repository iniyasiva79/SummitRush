import type { Metadata } from "next";
import { PlaceholderPage } from "../components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Private Room · SummitRush",
  description: "Private room creation is not ready yet.",
};

export default function RoomPage() {
  return (
    <PlaceholderPage
      title="Private Room"
      note="Private room creation is not built yet. Room names, invite codes, and multiplayer are a later phase."
    />
  );
}
