import type { Metadata } from "next";
import { PlaceholderPage } from "../components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Profile · SummitRush",
  description: "SummitRush profile and avatar selection are not ready yet.",
};

export default function ProfilePage() {
  return (
    <PlaceholderPage
      title="Profile"
      note="Avatar selection is not built yet. Your username is shown below."
    />
  );
}
