import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import {
  applyRoomAction,
  createMember,
  isRoomCode,
  makeRoomCode,
  makeToken,
  toPublicRoom,
  type RoomAction,
  type RoomState,
} from "./multiplayer";
import { isMountainId, type MountainId } from "./mountains";

const ROOM_TTL_SECONDS = 60 * 60 * 24;
const FILE_PATH = path.join(process.cwd(), ".data", "rooms.json");

type FileDump = Record<string, RoomState>;

let fileCache: FileDump | null = null;
let queue: Promise<unknown> = Promise.resolve();
let redis: Redis | null | undefined;

function redisClient() {
  if (redis !== undefined) {
    return redis;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

export function multiplayerBackend() {
  if (redisClient()) {
    return "upstash" as const;
  }
  if (process.env.NODE_ENV === "production") {
    return "missing" as const;
  }
  return "local" as const;
}

function enqueue<T>(work: () => Promise<T>) {
  const run = queue.then(work, work);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readFileDump(): Promise<FileDump> {
  if (fileCache) {
    return fileCache;
  }
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    fileCache = JSON.parse(raw) as FileDump;
  } catch {
    fileCache = {};
  }
  return fileCache;
}

async function writeFileDump(dump: FileDump) {
  fileCache = dump;
  await mkdir(path.dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(dump));
}

async function getRoom(code: string): Promise<RoomState | null> {
  const key = code.toUpperCase();
  const client = redisClient();
  if (client) {
    const room = await client.get<RoomState>(`summitrush:room:${key}`);
    return room ?? null;
  }
  if (multiplayerBackend() === "missing") {
    return null;
  }
  const dump = await readFileDump();
  return dump[key] ?? null;
}

async function saveRoom(room: RoomState) {
  const client = redisClient();
  if (client) {
    await client.set(`summitrush:room:${room.code}`, room, { ex: ROOM_TTL_SECONDS });
    return;
  }
  const dump = await readFileDump();
  dump[room.code] = room;
  await writeFileDump(dump);
}

export async function createStoredRoom(input: {
  name: string;
  maxPlayers: number;
  mode: "showdown" | "team";
  mountainId: MountainId;
  host: {
    id: string;
    username: string;
    avatarId: RoomState["members"][number]["avatarId"];
    equippedAccessories: string[];
    wallet: number;
  };
}) {
  return enqueue(async () => {
    if (multiplayerBackend() === "missing") {
      return { ok: false as const, error: "Multiplayer needs Upstash Redis on this deployment." };
    }
    const name = input.name.trim().slice(0, 40);
    if (name.length < 2) {
      return { ok: false as const, error: "Enter a room name." };
    }
    if (!Number.isInteger(input.maxPlayers) || input.maxPlayers < 2 || input.maxPlayers > 6) {
      return { ok: false as const, error: "Rooms hold 2 to 6 players." };
    }
    if (!isMountainId(input.mountainId)) {
      return { ok: false as const, error: "Choose a mountain." };
    }
    const username = input.host.username.trim().slice(0, 20);
    if (username.length < 3) {
      return { ok: false as const, error: "Sign in before creating a room." };
    }
    let code = makeRoomCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (!(await getRoom(code))) {
        break;
      }
      code = makeRoomCode();
    }
    if (await getRoom(code)) {
      return { ok: false as const, error: "Could not create a unique room code. Try again." };
    }
    const token = makeToken();
    const now = Date.now();
    const host = createMember({
      id: input.host.id,
      token,
      username,
      avatarId: input.host.avatarId,
      equippedAccessories: input.host.equippedAccessories,
      wallet: input.host.wallet,
      now,
    });
    const room: RoomState = {
      code,
      name,
      hostId: host.id,
      maxPlayers: input.maxPlayers,
      mode: input.mode,
      mountainId: input.mountainId,
      phase: "lobby",
      createdAt: now,
      members: [host],
      teamCompletions: 0,
      teamBonusPaid: false,
      revision: 1,
    };
    await saveRoom(room);
    return { ok: true as const, room: toPublicRoom(room, host.id, true) };
  });
}

export async function readPublicRoom(code: string, playerId?: string | null, token?: string | null) {
  if (multiplayerBackend() === "missing") {
    return { ok: false as const, error: "Multiplayer needs Upstash Redis on this deployment." };
  }
  if (!isRoomCode(code.toUpperCase())) {
    return { ok: false as const, error: "That room code is not valid." };
  }
  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return { ok: false as const, error: "No room uses that code." };
  }
  const member = playerId ? room.members.find((item) => item.id === playerId) : null;
  if (playerId && token && member && member.token !== token) {
    return { ok: false as const, error: "This room session is no longer valid." };
  }
  return { ok: true as const, room: toPublicRoom(room, playerId, Boolean(member && token && member.token === token)) };
}

export async function actOnRoom(
  code: string,
  playerId: string,
  token: string | null,
  action: RoomAction,
) {
  return enqueue(async () => {
    if (multiplayerBackend() === "missing") {
      return { ok: false as const, error: "Multiplayer needs Upstash Redis on this deployment." };
    }
    const key = code.toUpperCase();
    const room = await getRoom(key);
    if (!room) {
      return { ok: false as const, error: "No room uses that code." };
    }
    if (action.type !== "join") {
      const member = room.members.find((item) => item.id === playerId);
      if (!member || member.token !== token) {
        return { ok: false as const, error: "This room session is no longer valid." };
      }
    } else if (!token) {
      return { ok: false as const, error: "Missing room token." };
    }
    const next = structuredClone(room);
    const result = applyRoomAction(next, playerId, action);
    if (!result.ok) {
      return result;
    }
    await saveRoom(result.room);
    const viewer = result.room.members.find((item) => item.id === playerId);
    return {
      ok: true as const,
      room: toPublicRoom(result.room, playerId, Boolean(viewer)),
    };
  });
}
