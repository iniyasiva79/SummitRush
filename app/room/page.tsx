import type { Metadata } from "next";
import { RoomHub } from "../components/RoomHub";

export const metadata: Metadata = {
  title: "Private Room · SummitRush",
  description: "Create or join a Summit Showdown private room.",
};

export default function RoomPage() {
  return <RoomHub />;
}
