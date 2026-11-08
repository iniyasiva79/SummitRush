import type { Metadata } from "next";
import { PlaceholderPage } from "../components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Play · SummitRush",
  description: "Avatar selection and mountain selection are not ready yet.",
};

export default function PlayPage() {
  return (
    <PlaceholderPage
      title="Play"
      note="Avatar selection is not built yet. Mountain selection opens after an avatar is chosen, and that is not built yet either."
    />
  );
}
