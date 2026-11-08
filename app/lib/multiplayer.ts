import { isAvatarId, normalizeAccessoryIds, type AvatarId } from "./avatars";
import {
  COMEBACK_COINS,
  PERFECT_PACE_COINS,
  CLOSE_PREDICTION_MS,
} from "./gameplay";
import { MOUNTAINS, isMountainId, type MountainId } from "./mountains";

export const ROOM_MIN = 2;
export const ROOM_MAX = 6;
export const ROOM_CODE_LENGTH = 6;
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type RoomMode = "showdown";
export type RoomPhase = "lobby" | "live" | "finished";
export type TaskPlayStatus = "none" | "ready" | "running" | "paused" | "completed";

export type RoomWager = {
  targetId: string;
  predictedMs: number;
  amount: number;
  settled: boolean;
  won: boolean | null;
};

export type RoomTask = {
  name: string;
  predictedMs: number;
  stake: number;
  status: TaskPlayStatus;
  startedAt: number | null;
  accumulatedMs: number;
  actualMs: number | null;
  finishedAt: number | null;
  success: boolean | null;
  bonusCoins: number;
  bonuses: string[];
};

export type RoomMember = {
  id: string;
  token: string;
  username: string;
  avatarId: AvatarId | null;
  equippedAccessories: string[];
  wallet: number;
  ready: boolean;
  left: boolean;
  lastSeen: number;
  task: RoomTask;
  wagers: RoomWager[];
  completedCount: number;
};

export type RoomState = {
  code: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  mode: RoomMode;
  mountainId: MountainId;
  phase: RoomPhase;
  createdAt: number;
  members: RoomMember[];
  teamCompletions: number;
  teamBonusPaid: boolean;
  revision: number;
};

export type PublicMember = {
  id: string;
  username: string;
  avatarId: AvatarId | null;
  equippedAccessories: string[];
  isHost: boolean;
  ready: boolean;
  left: boolean;
  connected: boolean;
  status: TaskPlayStatus;
  completedCount: number;
  required: number;
  progress: number;
  predictedMinutes: number | null;
  elapsedMs: number | null;
  finished: boolean;
  success: boolean | null;
  bonusCoins: number;
  wallet: number;
  you: boolean;
  taskName: string | null;
  wagersLocked: boolean;
  wagers: PublicWager[];
};

export type PublicWager = {
  targetId: string;
  username: string;
  predictedMinutes: number;
  amount: number;
  settled: boolean;
  won: boolean | null;
};

export type PublicRoom = {
  code: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  mode: RoomMode;
  mountainId: MountainId;
  mountainName: string;
  required: number;
  teamGoal: number;
  teamCompletions: number;
  phase: RoomPhase;
  createdAt: number;
  members: PublicMember[];
  leaderboard: PublicMember[];
  you: PublicMember | null;
  token: string | null;
  invitePath: string;
};

export type RoomAction =
  | { type: "join"; member: Omit<RoomMember, "task" | "wagers" | "completedCount" | "ready" | "left" | "lastSeen"> }
  | { type: "leave" }
  | { type: "heartbeat"; accumulatedMs?: number; equippedAccessories?: string[]; avatarId?: AvatarId | null }
  | { type: "ready"; ready: boolean }
  | { type: "configure"; name?: string; maxPlayers?: number; mountainId?: MountainId }
  | { type: "start" }
  | { type: "submitTask"; name: string; predictedMinutes: number }
  | { type: "placeWagers"; wagers: { targetId: string; predictedMinutes?: number; amount: number }[] }
  | { type: "startTask"; now: number }
  | { type: "pauseTask"; now: number }
  | { type: "resumeTask"; now: number }
  | { type: "finishTask"; now: number };

function emptyTask(): RoomTask {
  return {
    name: "",
    predictedMs: 0,
    stake: 0,
    status: "none",
    startedAt: null,
    accumulatedMs: 0,
    actualMs: null,
    finishedAt: null,
    success: null,
    bonusCoins: 0,
    bonuses: [],
  };
}

export function createMember(input: {
  id: string;
  token: string;
  username: string;
  avatarId: AvatarId | null;
  equippedAccessories: string[];
  wallet: number;
  now: number;
}): RoomMember {
  return {
    id: input.id,
    token: input.token,
    username: input.username,
    avatarId: input.avatarId && isAvatarId(input.avatarId) ? input.avatarId : null,
    equippedAccessories: normalizeAccessoryIds(input.equippedAccessories),
    wallet: Math.max(0, Math.floor(Number.isFinite(input.wallet) ? input.wallet : 0)),
    ready: false,
    left: false,
    lastSeen: input.now,
    task: emptyTask(),
    wagers: [],
    completedCount: 0,
  };
}

export function makeRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isRoomCode(value: string) {
  return new RegExp(`^[${CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(value);
}

function mountainByIdSafe(id: MountainId) {
  return MOUNTAINS.find((item) => item.id === id) ?? null;
}

type ActionResult = { ok: true; room: RoomState } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

export function applyRoomAction(
  room: RoomState,
  actorId: string,
  action: RoomAction,
): ActionResult {
  if (action.type === "join") {
    return joinRoom(room, action.member);
  }
  const actor = room.members.find((item) => item.id === actorId);
  if (!actor || actor.left) {
    return { ok: false, error: "You are not in this room." };
  }
  actor.lastSeen = Date.now();
  if (action.type === "leave") {
    return leaveRoom(room, actor);
  }
  if (action.type === "heartbeat") {
    if (typeof action.accumulatedMs === "number" && action.accumulatedMs >= 0 && actor.task.status === "running") {
      actor.task.accumulatedMs = Math.floor(action.accumulatedMs);
    }
    if (action.equippedAccessories) {
      actor.equippedAccessories = normalizeAccessoryIds(action.equippedAccessories);
    }
    if (action.avatarId === null || isAvatarId(action.avatarId)) {
      actor.avatarId = action.avatarId ?? actor.avatarId;
    }
    return ok(room);
  }
  if (action.type === "ready") {
    if (room.phase !== "lobby") {
      return { ok: false, error: "The climb has already started." };
    }
    actor.ready = action.ready;
    return ok(room);
  }
  if (action.type === "configure") {
    if (actor.id !== room.hostId) {
      return { ok: false, error: "Only the host can change room settings." };
    }
    if (room.phase !== "lobby") {
      return { ok: false, error: "The climb has already started." };
    }
    if (typeof action.name === "string") {
      const name = action.name.trim().slice(0, 40);
      if (name.length < 2) {
        return { ok: false, error: "Enter a room name." };
      }
      room.name = name;
    }
    if (typeof action.maxPlayers === "number") {
      if (!Number.isInteger(action.maxPlayers) || action.maxPlayers < ROOM_MIN || action.maxPlayers > ROOM_MAX) {
        return { ok: false, error: "Rooms hold 2 to 6 players." };
      }
      if (action.maxPlayers < seatedCount(room)) {
        return { ok: false, error: "Too many players are already in this room." };
      }
      room.maxPlayers = action.maxPlayers;
    }
    room.mode = "showdown";
    if (action.mountainId && isMountainId(action.mountainId)) {
      room.mountainId = action.mountainId;
    }
    return ok(room);
  }
  if (action.type === "start") {
    if (actor.id !== room.hostId) {
      return { ok: false, error: "Only the host can start the climb." };
    }
    if (room.phase !== "lobby") {
      return { ok: false, error: "The climb has already started." };
    }
    const seated = room.members.filter((item) => !item.left);
    if (seated.length < ROOM_MIN) {
      return { ok: false, error: "At least two players need to join before starting." };
    }
    if (seated.some((item) => !item.ready)) {
      return { ok: false, error: "Every player must be ready before the host starts." };
    }
    room.phase = "live";
    return ok(room);
  }
  if (action.type === "submitTask") {
    return submitTask(room, actor, action);
  }
  if (action.type === "placeWagers") {
    return placeWagers(room, actor, action.wagers);
  }
  if (action.type === "startTask") {
    return beginTask(room, actor, action.now);
  }
  if (action.type === "pauseTask") {
    if (actor.task.status !== "running" || actor.task.startedAt == null) {
      return { ok: false, error: "No running task to pause." };
    }
    actor.task.accumulatedMs += Math.max(0, action.now - actor.task.startedAt);
    actor.task.startedAt = null;
    actor.task.status = "paused";
    return ok(room);
  }
  if (action.type === "resumeTask") {
    if (actor.task.status !== "paused") {
      return { ok: false, error: "No paused task to resume." };
    }
    actor.task.startedAt = action.now;
    actor.task.status = "running";
    return ok(room);
  }
  if (action.type === "finishTask") {
    return finishMemberTask(room, actor, action.now);
  }
  return { ok: false, error: "Unknown room action." };
}

function joinRoom(
  room: RoomState,
  incoming: Omit<RoomMember, "task" | "wagers" | "completedCount" | "ready" | "left" | "lastSeen">,
): ActionResult {
  if (room.phase !== "lobby") {
    const existing = room.members.find((item) => item.id === incoming.id);
    if (existing) {
      existing.token = incoming.token;
      existing.left = false;
      existing.lastSeen = Date.now();
      existing.username = incoming.username.slice(0, 20);
      existing.avatarId = incoming.avatarId;
      existing.equippedAccessories = normalizeAccessoryIds(incoming.equippedAccessories);
      return ok(room);
    }
    return { ok: false, error: "This climb has already started." };
  }
  const existing = room.members.find((item) => item.id === incoming.id);
  if (existing) {
    existing.token = incoming.token;
    existing.left = false;
    existing.lastSeen = Date.now();
    existing.username = incoming.username.slice(0, 20);
    existing.avatarId = incoming.avatarId;
    existing.equippedAccessories = normalizeAccessoryIds(incoming.equippedAccessories);
    existing.wallet = Math.max(0, Math.floor(incoming.wallet));
    return ok(room);
  }
  if (seatedCount(room) >= room.maxPlayers) {
    return { ok: false, error: "This room is full." };
  }
  room.members.push(
    createMember({
      ...incoming,
      now: Date.now(),
    }),
  );
  return ok(room);
}

function leaveRoom(room: RoomState, actor: RoomMember): ActionResult {
  actor.left = true;
  actor.ready = false;
  actor.lastSeen = Date.now();
  if (actor.task.status === "running" && actor.task.startedAt != null) {
    actor.task.accumulatedMs += Math.max(0, Date.now() - actor.task.startedAt);
    actor.task.startedAt = null;
    actor.task.status = "paused";
  }
  if (room.phase === "lobby") {
    room.members = room.members.filter((item) => item.id !== actor.id);
    if (room.hostId === actor.id) {
      const nextHost = room.members.find((item) => !item.left);
      if (nextHost) {
        room.hostId = nextHost.id;
      }
    }
  }
  return ok(room);
}

function submitTask(
  room: RoomState,
  actor: RoomMember,
  action: { name: string; predictedMinutes: number },
): ActionResult {
  if (room.phase !== "live") {
    return { ok: false, error: "Wait for the host to start the climb." };
  }
  if (actor.task.status !== "none") {
    return { ok: false, error: "Your task is already locked in." };
  }
  const name = action.name.trim().slice(0, 80);
  if (name.length < 2) {
    return { ok: false, error: "Enter a task name." };
  }
  if (!Number.isInteger(action.predictedMinutes) || action.predictedMinutes < 1 || action.predictedMinutes > 240) {
    return { ok: false, error: "Predict between 1 and 240 minutes." };
  }
  actor.task = {
    ...emptyTask(),
    name,
    predictedMs: action.predictedMinutes * 60_000,
    stake: 0,
    status: "ready",
  };
  return ok(room);
}

function placeWagers(
  room: RoomState,
  actor: RoomMember,
  wagers: { targetId: string; predictedMinutes?: number; amount: number }[],
): ActionResult {
  if (room.phase !== "live" || actor.task.status !== "ready") {
    return { ok: false, error: "Lock in your own task, then place wagers before starting the timer." };
  }
  if (actor.wagers.length > 0) {
    return { ok: false, error: "Your wagers are already locked in." };
  }
  if (wagers.some((item) => item.targetId === actor.id)) {
    return { ok: false, error: "You cannot bet on yourself." };
  }
  const others = room.members.filter((item) => !item.left && item.id !== actor.id);
  const next: RoomWager[] = [];
  let total = 0;
  for (const other of others) {
    const wager = wagers.find((item) => item.targetId === other.id);
    if (!wager || !Number.isInteger(wager.amount) || wager.amount < 0) {
      return { ok: false, error: "Enter a wager for each other climber. Use 0 to skip." };
    }
    const publishedMinutes = other.task.predictedMs > 0 ? other.task.predictedMs / 60_000 : null;
    const fallbackMinutes = wager.predictedMinutes;
    const predictedMinutes = publishedMinutes ?? fallbackMinutes;
    if (wager.amount > 0 && (predictedMinutes == null || !Number.isInteger(predictedMinutes) || predictedMinutes < 1 || predictedMinutes > 240)) {
      return { ok: false, error: `Wait for ${other.username} to lock in a predicted time, or wager 0 to skip.` };
    }
    total += wager.amount;
    next.push({
      targetId: other.id,
      predictedMs: predictedMinutes && predictedMinutes > 0 ? predictedMinutes * 60_000 : 0,
      amount: wager.amount,
      settled: false,
      won: null,
    });
  }
  if (total > actor.wallet) {
    return { ok: false, error: "Those wagers cost more Summit Coins than you have." };
  }
  actor.wallet -= total;
  actor.wagers = next;
  return ok(room);
}

function finishMemberTask(room: RoomState, actor: RoomMember, now: number): ActionResult {
  if (actor.task.status !== "running" && actor.task.status !== "paused") {
    return { ok: false, error: "Start your task before finishing it." };
  }
  const actualMs =
    actor.task.status === "running" && actor.task.startedAt != null
      ? actor.task.accumulatedMs + Math.max(0, now - actor.task.startedAt)
      : actor.task.accumulatedMs;
  const success = actualMs <= actor.task.predictedMs;
  const bonuses: string[] = [];
  let bonusCoins = 0;
  const withinTwo = success && actor.task.predictedMs - actualMs <= CLOSE_PREDICTION_MS;
  const halfTime = success && actualMs * 2 <= actor.task.predictedMs;
  if (withinTwo || halfTime) {
    bonusCoins += PERFECT_PACE_COINS;
    bonuses.push("Perfect Pace +25");
  }
  if (!success) {
    bonusCoins += COMEBACK_COINS;
    bonuses.push("Comeback Climber +30");
  }
  if (actor.task.stake > 0) {
    actor.wallet += actor.task.stake;
    actor.task.stake = 0;
  }
  actor.wallet += bonusCoins;
  actor.task.status = "completed";
  actor.task.startedAt = null;
  actor.task.accumulatedMs = actualMs;
  actor.task.actualMs = actualMs;
  actor.task.finishedAt = now;
  actor.task.success = success;
  actor.task.bonusCoins = bonusCoins;
  actor.task.bonuses = bonuses;
  actor.completedCount += 1;
  room.teamCompletions += 1;
  room.mode = "showdown";
  for (const member of room.members) {
    for (const wager of member.wagers) {
      if (wager.targetId !== actor.id || wager.settled || wager.amount <= 0) {
        continue;
      }
      const won = wager.predictedMs > 0 && actualMs <= wager.predictedMs;
      wager.settled = true;
      wager.won = won;
      if (won) {
        member.wallet += wager.amount * 2;
      }
    }
  }
  const seated = room.members.filter((item) => !item.left);
  if (seated.every((item) => item.task.status === "completed")) {
    room.phase = "finished";
  }
  return ok(room);
}

function seatedCount(room: RoomState) {
  return room.members.filter((item) => !item.left).length;
}

function ok(room: RoomState): ActionResult {
  room.revision += 1;
  return { ok: true, room };
}

export function toPublicRoom(room: RoomState, viewerId?: string | null, includeToken = false): PublicRoom {
  const mountain = mountainByIdSafe(room.mountainId);
  const required = 1;
  const seated = room.members.filter((item) => !item.left);
  const teamGoal = Math.max(1, seated.length);
  const members = room.members.map((member) => toPublicMember(room, member, required, viewerId));
  const walletById = new Map(room.members.map((member) => [member.id, member.wallet]));
  const leaderboard = [...members]
    .filter((item) => !item.left)
    .sort((left, right) => {
      if (right.progress !== left.progress) {
        return right.progress - left.progress;
      }
      const leftHits = accuracy(room, left.id);
      const rightHits = accuracy(room, right.id);
      if (rightHits !== leftHits) {
        return rightHits - leftHits;
      }
      return (walletById.get(right.id) ?? 0) - (walletById.get(left.id) ?? 0);
    });
  const you = members.find((item) => item.you) ?? null;
  const token = includeToken ? room.members.find((item) => item.id === viewerId)?.token ?? null : null;
  return {
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    mode: "showdown",
    mountainId: room.mountainId,
    mountainName: mountain?.name ?? "Mount Fuji",
    required,
    teamGoal,
    teamCompletions: room.teamCompletions,
    phase: room.phase,
    createdAt: room.createdAt,
    members,
    leaderboard,
    you,
    token,
    invitePath: `/join/${room.code}`,
  };
}

function toPublicMember(
  room: RoomState,
  member: RoomMember,
  required: number,
  viewerId?: string | null,
): PublicMember {
  const you = member.id === viewerId;
  const live = member.task.status === "running" || member.task.status === "paused" ? 0.18 : 0;
  const progress = Math.min(1, member.completedCount / Math.max(1, required) + live);
  return {
    id: member.id,
    username: member.username,
    avatarId: member.avatarId,
    equippedAccessories: member.equippedAccessories,
    isHost: member.id === room.hostId,
    ready: member.ready,
    left: member.left,
    connected: !member.left && Date.now() - member.lastSeen < 20_000,
    status: member.task.status,
    completedCount: member.completedCount,
    required,
    progress,
    predictedMinutes: member.task.predictedMs > 0 ? member.task.predictedMs / 60_000 : null,
    elapsedMs: you && member.task.status !== "none" ? workingTaskMs(member.task, Date.now()) : null,
    finished: member.task.status === "completed",
    success: you ? member.task.success : member.task.status === "completed" ? member.task.success : null,
    bonusCoins: you ? member.task.bonusCoins : 0,
    wallet: you ? member.wallet : 0,
    you,
    taskName: you ? member.task.name || null : null,
    wagersLocked: member.wagers.length > 0,
    wagers: you ? publicWagers(room, member) : [],
  };
}

function publicWagers(room: RoomState, member: RoomMember): PublicWager[] {
  return member.wagers.map((wager) => {
    const target = room.members.find((item) => item.id === wager.targetId);
    return {
      targetId: wager.targetId,
      username: target?.username ?? "climber",
      predictedMinutes: wager.predictedMs > 0 ? wager.predictedMs / 60_000 : target && target.task.predictedMs > 0 ? target.task.predictedMs / 60_000 : 0,
      amount: wager.amount,
      settled: wager.settled,
      won: wager.won,
    };
  });
}

function accuracy(room: RoomState, memberId: string) {
  const member = room.members.find((item) => item.id === memberId);
  if (!member || member.task.status !== "completed" || member.task.actualMs == null || member.task.predictedMs <= 0) {
    return 0;
  }
  return 1 - Math.min(1, Math.abs(member.task.actualMs - member.task.predictedMs) / member.task.predictedMs);
}

export function workingTaskMs(task: RoomTask, now: number) {
  if (task.status === "running" && task.startedAt != null) {
    return task.accumulatedMs + Math.max(0, now - task.startedAt);
  }
  return task.accumulatedMs;
}

export function beginTask(room: RoomState, actor: RoomMember, now: number): ActionResult {
  if (actor.task.status !== "ready") {
    return fail("Lock in your task before starting the timer.");
  }
  const others = room.members.filter((item) => !item.left && item.id !== actor.id);
  if (others.length > 0 && actor.wagers.length === 0) {
    return fail("Place your wagers before starting the climb.");
  }
  actor.task.status = "running";
  actor.task.startedAt = now;
  return ok(room);
}
