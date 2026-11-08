import type { Metadata } from "next";
import { ProfileScreen } from "../components/ProfileScreen";

export const metadata: Metadata = {
  title: "Profile · SummitRush",
  description: "Your SummitRush avatar and username.",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
