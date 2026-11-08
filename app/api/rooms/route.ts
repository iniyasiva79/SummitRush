import { isAvatarId } from "../../lib/avatars";
import { isMountainId } from "../../lib/mountains";
import { createStoredRoom, multiplayerBackend } from "../../lib/rooms-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    backend: multiplayerBackend(),
    needsRedis: multiplayerBackend() === "missing",
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Send room details as JSON." }, { status: 400 });
  }
  const result = await createStoredRoom({
    name: String(body.name ?? ""),
    maxPlayers: Number(body.maxPlayers),
    mountainId: isMountainId(body.mountainId) ? body.mountainId : "fuji",
    host: {
      id: String(body.playerId ?? ""),
      username: String(body.username ?? ""),
      avatarId: isAvatarId(body.avatarId) ? body.avatarId : null,
      equippedAccessories: Array.isArray(body.equippedAccessories)
        ? body.equippedAccessories.filter((item): item is string => typeof item === "string")
        : [],
      wallet: Number(body.coins),
    },
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result.room);
}
