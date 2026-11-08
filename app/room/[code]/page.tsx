import type { Metadata } from "next";
import { RoomSession } from "../../components/RoomSession";
import { isRoomCode } from "../../lib/multiplayer";

type RoomCodePageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: RoomCodePageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Room ${code.toUpperCase()} · SummitRush`,
    description: "SummitRush private room lobby and Summit Showdown.",
  };
}

export default async function RoomCodePage({ params }: RoomCodePageProps) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  return <RoomSession code={isRoomCode(normalized) ? normalized : code} />;
}
