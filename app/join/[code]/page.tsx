import type { Metadata } from "next";
import { RoomSession } from "../../components/RoomSession";
import { isRoomCode } from "../../lib/multiplayer";

type JoinPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Join ${code.toUpperCase()} · SummitRush`,
    description: "Join a SummitRush private room with a room code.",
  };
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  return <RoomSession code={isRoomCode(normalized) ? normalized : code} autoJoin />;
}
