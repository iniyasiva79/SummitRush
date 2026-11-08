import { isAvatarId } from "../../../lib/avatars";
import { isMountainId } from "../../../lib/mountains";
import { makeToken, type RoomAction } from "../../../lib/multiplayer";
import { actOnRoom, readPublicRoom } from "../../../lib/rooms-store";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { code } = await params;
  const url = new URL(request.url);
  const result = await readPublicRoom(
    code,
    url.searchParams.get("playerId"),
    url.searchParams.get("token"),
  );
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 404 });
  }
  return Response.json(result.room, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request, { params }: RouteProps) {
  const { code } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Send the room action as JSON." }, { status: 400 });
  }
  const playerId = String(body.playerId ?? "");
  const actionName = String(body.action ?? "");
  if (!playerId || !actionName) {
    return Response.json({ error: "Missing player or action." }, { status: 400 });
  }
  const tokenFromClient = typeof body.token === "string" ? body.token : null;
  const joinToken = actionName === "join" ? makeToken() : tokenFromClient;
  const action = toAction(actionName, body, playerId, joinToken);
  if (!action) {
    return Response.json({ error: "Unknown room action." }, { status: 400 });
  }
  const result = await actOnRoom(code, playerId, joinToken, action);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result.room, {
    headers: { "Cache-Control": "no-store" },
  });
}

function toAction(
  action: string,
  body: Record<string, unknown>,
  playerId: string,
  token: string | null,
): RoomAction | null {
  const now = Date.now();
  if (action === "join" && token) {
    return {
      type: "join",
      member: {
        id: playerId,
        token,
        username: String(body.username ?? ""),
        avatarId: isAvatarId(body.avatarId) ? body.avatarId : null,
        equippedAccessories: stringList(body.equippedAccessories),
        wallet: Number(body.coins),
      },
    };
  }
  if (action === "leave") {
    return { type: "leave" };
  }
  if (action === "heartbeat") {
    return {
      type: "heartbeat",
      accumulatedMs: typeof body.accumulatedMs === "number" ? body.accumulatedMs : undefined,
      equippedAccessories: Array.isArray(body.equippedAccessories)
        ? stringList(body.equippedAccessories)
        : undefined,
      avatarId: body.avatarId === null || isAvatarId(body.avatarId) ? body.avatarId : undefined,
    };
  }
  if (action === "ready") {
    return { type: "ready", ready: body.ready !== false };
  }
  if (action === "configure") {
    return {
      type: "configure",
      name: typeof body.name === "string" ? body.name : undefined,
      maxPlayers: typeof body.maxPlayers === "number" ? body.maxPlayers : undefined,
      mountainId: isMountainId(body.mountainId) ? body.mountainId : undefined,
    };
  }
  if (action === "start") {
    return { type: "start" };
  }
  if (action === "submitTask") {
    return {
      type: "submitTask",
      name: String(body.name ?? ""),
      predictedMinutes: Number(body.predictedMinutes),
    };
  }
  if (action === "placeWagers") {
    return {
      type: "placeWagers",
      wagers: Array.isArray(body.wagers)
        ? body.wagers.flatMap((item) => {
            if (!item || typeof item !== "object") {
              return [];
            }
            const wager = item as Record<string, unknown>;
            return [{
              targetId: String(wager.targetId ?? ""),
              predictedMinutes: Number(wager.predictedMinutes),
              amount: Number(wager.amount),
            }];
          })
        : [],
    };
  }
  if (action === "startTask") {
    return { type: "startTask", now };
  }
  if (action === "pauseTask") {
    return { type: "pauseTask", now };
  }
  if (action === "resumeTask") {
    return { type: "resumeTask", now };
  }
  if (action === "finishTask") {
    return { type: "finishTask", now };
  }
  return null;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
