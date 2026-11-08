import { readActiveAccount, updateActiveAccount, type PublicAccount } from "./accounts";
import type { PublicRoom } from "./multiplayer";
import { isMountainId, type MountainId } from "./mountains";

const TOKEN_PREFIX = "summitrush.roomToken.";
const WALLET_PREFIX = "summitrush.roomWallet.";

export function roomTokenKey(code: string) {
  return `${TOKEN_PREFIX}${code.toUpperCase()}`;
}

export function readRoomToken(code: string) {
  try {
    return sessionStorage.getItem(roomTokenKey(code));
  } catch {
    return null;
  }
}

export function writeRoomToken(code: string, token: string) {
  sessionStorage.setItem(roomTokenKey(code), token);
}

export function clearRoomSession(code: string) {
  sessionStorage.removeItem(roomTokenKey(code));
  sessionStorage.removeItem(`${WALLET_PREFIX}${code.toUpperCase()}`);
}

export function syncRoomWallet(room: PublicRoom) {
  if (!room.you) {
    return;
  }
  const key = `${WALLET_PREFIX}${room.code}`;
  const stored = sessionStorage.getItem(key);
  if (stored == null) {
    sessionStorage.setItem(key, String(room.you.wallet));
    return;
  }
  const last = Number(stored);
  const delta = room.you.wallet - last;
  if (delta !== 0) {
    const account = readActiveAccount();
    if (account) {
      updateActiveAccount({ coins: Math.max(0, account.coins + delta) });
    }
    sessionStorage.setItem(key, String(room.you.wallet));
  }
}

export async function fetchRoom(code: string, account: PublicAccount | null) {
  const token = readRoomToken(code);
  const params = new URLSearchParams();
  if (account) {
    params.set("playerId", account.id);
  }
  if (token) {
    params.set("token", token);
  }
  const response = await fetch(`/api/rooms/${code}?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as PublicRoom & { error?: string };
  if (!response.ok) {
    return { ok: false as const, error: payload.error ?? "Could not load that room." };
  }
  if (payload.token) {
    writeRoomToken(payload.code, payload.token);
  }
  syncRoomWallet(payload);
  return { ok: true as const, room: payload };
}

export async function createRoom(input: {
  account: PublicAccount;
  name: string;
  maxPlayers: number;
  mountainId: MountainId;
}) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      maxPlayers: input.maxPlayers,
      mountainId: isMountainId(input.mountainId) ? input.mountainId : "fuji",
      playerId: input.account.id,
      username: input.account.username,
      avatarId: input.account.avatarId,
      equippedAccessories: input.account.equippedAccessories,
      coins: input.account.coins,
    }),
  });
  const payload = (await response.json()) as PublicRoom & { error?: string };
  if (!response.ok) {
    return { ok: false as const, error: payload.error ?? "Could not create the room." };
  }
  if (payload.token) {
    writeRoomToken(payload.code, payload.token);
  }
  syncRoomWallet(payload);
  return { ok: true as const, room: payload };
}

export async function roomAction(
  code: string,
  account: PublicAccount,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const response = await fetch(`/api/rooms/${code}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      playerId: account.id,
      token: readRoomToken(code),
      username: account.username,
      avatarId: account.avatarId,
      equippedAccessories: account.equippedAccessories,
      coins: account.coins,
      ...extra,
    }),
  });
  const payload = (await response.json()) as PublicRoom & { error?: string };
  if (!response.ok) {
    return { ok: false as const, error: payload.error ?? "The room could not update." };
  }
  if (payload.token) {
    writeRoomToken(payload.code, payload.token);
  }
  syncRoomWallet(payload);
  return { ok: true as const, room: payload };
}
