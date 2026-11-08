import {
  MOUNTAINS,
  isMountainId,
  mountainById,
  tasksCompleted,
  type MountainId,
} from "./mountains";

export const CHECKPOINT_COINS = 10;
export const PERFECT_PACE_COINS = 25;
export const COMEBACK_COINS = 30;
export const UNDERDOG_COINS = 50;
export const SUMMIT_COINS = 200;
export const INTERVAL_STEP_MIN = 5;
export const CLOSE_PREDICTION_MS = 2 * 60 * 1000;

export type TaskStatus = "pending" | "running" | "paused" | "checkpoint" | "completed";
export type CheckpointState = "pending" | "completed" | "skipped";

export type CheckpointRecord = {
  id: string;
  atMs: number;
  state: CheckpointState;
  rewardPaid: boolean;
};

export type TaskResult = {
  finishedAt: number;
  actualMs: number;
  success: boolean;
  stakeNet: number;
  checkpointCoins: number;
  bonusCoins: number;
  bonuses: string[];
  reachedSummit: boolean;
  unlockedMountainName: string | null;
  coinsAfter: number;
  settled: true;
};

export type GameTask = {
  id: string;
  mountainId: MountainId;
  name: string;
  description: string;
  category: string;
  predictedMs: number;
  stake: number;
  stakeHeld: boolean;
  status: TaskStatus;
  createdAt: number;
  segmentStartedAt: number | null;
  accumulatedMs: number;
  intervalMin: number;
  summitSight: boolean;
  checkpoints: CheckpointRecord[];
  openCheckpointId: string | null;
  result: TaskResult | null;
};

export type TaskDraft = {
  name: string;
  description: string;
  category: string;
  predictedMinutes: number;
  stake: number;
};

const STATUSES = new Set<TaskStatus>([
  "pending",
  "running",
  "paused",
  "checkpoint",
  "completed",
]);

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = `${minutes}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : clock;
}

export function checkpointId(atMs: number) {
  return `cp-${atMs}`;
}

export function checkpointTimes(predictedMs: number, intervalMin: number) {
  const predictedMin = Math.floor(predictedMs / 60000);
  if (
    !Number.isInteger(intervalMin) ||
    intervalMin < INTERVAL_STEP_MIN ||
    intervalMin % INTERVAL_STEP_MIN !== 0 ||
    intervalMin >= predictedMin
  ) {
    return [];
  }
  const times: number[] = [];
  for (let minute = intervalMin; minute < predictedMin; minute += intervalMin) {
    times.push(minute * 60 * 1000);
  }
  return times;
}

export function intervalChoices(predictedMs: number) {
  const predictedMin = Math.floor(predictedMs / 60000);
  const choices: number[] = [];
  for (let minute = INTERVAL_STEP_MIN; minute < predictedMin; minute += INTERVAL_STEP_MIN) {
    choices.push(minute);
  }
  return choices;
}

export function defaultInterval(predictedMs: number) {
  const choices = intervalChoices(predictedMs);
  if (choices.includes(15)) {
    return 15;
  }
  if (choices.includes(10)) {
    return 10;
  }
  return choices[0] ?? 0;
}

export function workingMs(task: GameTask, now: number) {
  if (task.status === "running" && task.segmentStartedAt != null) {
    return task.accumulatedMs + Math.max(0, now - task.segmentStartedAt);
  }
  return task.accumulatedMs;
}

type TrailPoint = { x: number; y: number };

const TRAIL_KNOTS: TrailPoint[] = [
  { x: 42, y: 88 },
  { x: 64, y: 80 },
  { x: 31, y: 71 },
  { x: 58, y: 61 },
  { x: 27, y: 51 },
  { x: 55, y: 41 },
  { x: 38, y: 36 },
  { x: 68, y: 31 },
];

function trailSegment(index: number) {
  const p0 = TRAIL_KNOTS[Math.max(0, index - 1)];
  const p1 = TRAIL_KNOTS[index];
  const p2 = TRAIL_KNOTS[index + 1];
  const p3 = TRAIL_KNOTS[Math.min(TRAIL_KNOTS.length - 1, index + 2)];
  return {
    p1,
    p2,
    c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
    c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
  };
}

function curvePoint(index: number, t: number): TrailPoint {
  const { p1, c1, c2, p2 } = trailSegment(index);
  const u = 1 - t;
  return {
    x: u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x,
    y: u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y,
  };
}

const TRAIL_SAMPLES: TrailPoint[] = (() => {
  const samples: TrailPoint[] = [];
  const steps = 16;
  for (let index = 0; index < TRAIL_KNOTS.length - 1; index += 1) {
    for (let step = 0; step < steps; step += 1) {
      samples.push(curvePoint(index, step / steps));
    }
  }
  samples.push(TRAIL_KNOTS[TRAIL_KNOTS.length - 1]);
  return samples;
})();

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

export function trailPath() {
  const start = TRAIL_KNOTS[0];
  let path = `M ${start.x} ${start.y}`;
  for (let index = 0; index < TRAIL_KNOTS.length - 1; index += 1) {
    const { c1, c2, p2 } = trailSegment(index);
    path += ` C ${rounded(c1.x)} ${rounded(c1.y)} ${rounded(c2.x)} ${rounded(c2.y)} ${rounded(p2.x)} ${rounded(p2.y)}`;
  }
  return path;
}

export function trailPoint(fraction: number) {
  const t = Math.min(1, Math.max(0, fraction));
  const point = TRAIL_SAMPLES[Math.round(t * (TRAIL_SAMPLES.length - 1))];
  const x = rounded(point.x);
  const y = rounded(point.y);
  return { x, y, left: `${x}%`, bottom: `${100 - y}%` };
}

export function describeStake(stake: number, noStakes: boolean) {
  if (noStakes) {
    return "Solo, no stakes is on. This task records the prediction and climbs the mountain without betting Summit Coins. Checkpoint rewards of 10 coins still apply.";
  }
  return `On time: the ${stake.toLocaleString("en-US")} stake is returned plus a matching reward, for a net gain of ${stake.toLocaleString("en-US")}. Late: the stake is lost. Finishing late still counts and earns the 30-coin Comeback Climber bonus. An on-time finish within 2 minutes, or in half the predicted time, adds the 25-coin Perfect Pace bonus once.`;
}

function freshCheckpoints(predictedMs: number, intervalMin: number): CheckpointRecord[] {
  return checkpointTimes(predictedMs, intervalMin).map((atMs) => ({
    id: checkpointId(atMs),
    atMs,
    state: "pending" as const,
    rewardPaid: false,
  }));
}

export function createTask(mountainId: MountainId, draft: TaskDraft, now: number): GameTask {
  const predictedMs = draft.predictedMinutes * 60000;
  const intervalMin = defaultInterval(predictedMs);
  return {
    id: crypto.randomUUID(),
    mountainId,
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category.trim(),
    predictedMs,
    stake: Math.max(0, Math.floor(draft.stake)),
    stakeHeld: false,
    status: "pending",
    createdAt: now,
    segmentStartedAt: null,
    accumulatedMs: 0,
    intervalMin,
    summitSight: true,
    checkpoints: freshCheckpoints(predictedMs, intervalMin),
    openCheckpointId: null,
    result: null,
  };
}

export function editPendingTask(task: GameTask, draft: TaskDraft): GameTask {
  if (task.status !== "pending" || task.result) {
    return task;
  }
  const predictedMs = draft.predictedMinutes * 60000;
  const choices = intervalChoices(predictedMs);
  const intervalMin = choices.includes(task.intervalMin)
    ? task.intervalMin
    : defaultInterval(predictedMs);
  return {
    ...task,
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category.trim(),
    predictedMs,
    stake: Math.max(0, Math.floor(draft.stake)),
    intervalMin,
    checkpoints: freshCheckpoints(predictedMs, intervalMin),
  };
}

export function inProgress(task: GameTask) {
  return task.status === "running" || task.status === "paused" || task.status === "checkpoint";
}

export function startTask(tasks: GameTask[], taskId: string, coins: number, now: number, noStakes: boolean) {
  if (tasks.some((task) => inProgress(task))) {
    return { ok: false as const, error: "A task timer is already saved on this account. Finish it before starting another." };
  }
  const task = tasks.find((item) => item.id === taskId);
  if (!task || task.status !== "pending") {
    return { ok: false as const, error: "Choose a task that has not started." };
  }
  const stake = noStakes ? 0 : task.stake;
  if (stake > coins) {
    return { ok: false as const, error: "That stake is higher than the Summit Coins on this account." };
  }
  const next: GameTask = {
    ...task,
    stake,
    stakeHeld: stake > 0,
    status: "running",
    segmentStartedAt: now,
    accumulatedMs: 0,
  };
  return {
    ok: true as const,
    coins: coins - stake,
    tasks: tasks.map((item) => (item.id === task.id ? next : item)),
  };
}

export function pauseTask(task: GameTask, now: number): GameTask {
  if (task.status !== "running" || task.segmentStartedAt == null) {
    return task;
  }
  return {
    ...task,
    status: "paused",
    accumulatedMs: workingMs(task, now),
    segmentStartedAt: null,
  };
}

export function resumeTask(task: GameTask, now: number): GameTask {
  if (task.status !== "paused") {
    return task;
  }
  return { ...task, status: "running", segmentStartedAt: now };
}

export function catchCheckpoint(task: GameTask, now: number): GameTask | null {
  if (task.status !== "running") {
    return null;
  }
  const elapsed = workingMs(task, now);
  const due = task.checkpoints
    .filter((checkpoint) => checkpoint.state === "pending" && checkpoint.atMs <= elapsed)
    .sort((a, b) => a.atMs - b.atMs)[0];
  if (!due) {
    return null;
  }
  return {
    ...task,
    status: "checkpoint",
    accumulatedMs: due.atMs,
    segmentStartedAt: null,
    openCheckpointId: due.id,
  };
}

export function saveCheckpointSettings(
  task: GameTask,
  intervalMin: number,
  summitSight: boolean,
  now: number,
): GameTask {
  if (task.status === "completed") {
    return task;
  }
  const choices = intervalChoices(task.predictedMs);
  const nextInterval = choices.includes(intervalMin) ? intervalMin : 0;
  const working =
    task.status === "pending" ? 0 : workingMs(task, now);
  const kept = task.checkpoints.filter((checkpoint) => checkpoint.state !== "pending");
  const pendingDue = task.checkpoints.filter(
    (checkpoint) =>
      checkpoint.state === "pending" &&
      (checkpoint.atMs <= working || checkpoint.id === task.openCheckpointId),
  );
  const used = new Set([...kept, ...pendingDue].map((checkpoint) => checkpoint.atMs));
  const future = checkpointTimes(task.predictedMs, nextInterval)
    .filter((atMs) => atMs > working && !used.has(atMs))
    .map((atMs) => ({
      id: checkpointId(atMs),
      atMs,
      state: "pending" as const,
      rewardPaid: false,
    }));
  const checkpoints = [...kept, ...pendingDue, ...future].sort((a, b) => a.atMs - b.atMs);
  return { ...task, intervalMin: nextInterval, summitSight, checkpoints };
}

export function rewardCheckpoint(task: GameTask, coins: number) {
  const checkpoint = task.checkpoints.find((item) => item.id === task.openCheckpointId);
  if (!checkpoint || checkpoint.rewardPaid) {
    return { task, coins, paid: 0 };
  }
  return {
    coins: coins + CHECKPOINT_COINS,
    paid: CHECKPOINT_COINS,
    task: {
      ...task,
      checkpoints: task.checkpoints.map((item) =>
        item.id === checkpoint.id
          ? { ...item, state: "completed" as const, rewardPaid: true }
          : item,
      ),
    },
  };
}

export function skipCheckpoint(task: GameTask, now: number): GameTask {
  return resumeFromCheckpoint(task, now, "skipped");
}

export function resumeOpenCheckpoint(task: GameTask, now: number): GameTask {
  const checkpoint = task.checkpoints.find((item) => item.id === task.openCheckpointId);
  const state = checkpoint?.state === "pending" ? "pending" : checkpoint?.state;
  if (state === "pending") {
    return task;
  }
  return {
    ...task,
    status: "running",
    segmentStartedAt: now,
    openCheckpointId: null,
  };
}

function resumeFromCheckpoint(task: GameTask, now: number, state: "skipped"): GameTask {
  return {
    ...task,
    status: "running",
    segmentStartedAt: now,
    openCheckpointId: null,
    checkpoints: task.checkpoints.map((item) =>
      item.id === task.openCheckpointId ? { ...item, state } : item,
    ),
  };
}

type FinishProgress = {
  completedTasks: number;
  successfulPredictions: number;
  unsuccessfulPredictions: number;
  bettingWins: number;
  bettingLosses: number;
  coinsEarned: number;
  coinsLost: number;
  perfectPace: number;
  underdog: number;
  comeback: number;
  summits: number;
  achievements: string[];
  mountainTasks: Record<string, number>;
};

export function finishTask(
  tasks: GameTask[],
  taskId: string,
  now: number,
  coins: number,
  progress: FinishProgress,
) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task || task.result?.settled) {
    return { ok: false as const, error: "This task is already settled." };
  }
  if (task.status !== "running" && task.status !== "paused") {
    return { ok: false as const, error: "Finish the checkpoint activity before ending the task." };
  }
  const held = catchCheckpoint(task, now);
  if (held) {
    return { ok: true as const, held, tasks: tasks.map((item) => (item.id === task.id ? held : item)) };
  }
  const mountain = mountainById(task.mountainId);
  if (!mountain) {
    return { ok: false as const, error: "This mountain is no longer available." };
  }
  const actualMs = workingMs(task, now);
  const success = actualMs <= task.predictedMs;
  const bonuses: string[] = [];
  let bonusCoins = 0;
  const withinTwo = success && task.predictedMs - actualMs <= CLOSE_PREDICTION_MS;
  const halfTime = success && actualMs * 2 <= task.predictedMs;
  if (withinTwo || halfTime) {
    bonusCoins += PERFECT_PACE_COINS;
    bonuses.push(
      withinTwo
        ? "Perfect Pace +25"
        : "Half-time prediction bonus +25",
    );
  }
  if (!success) {
    bonusCoins += COMEBACK_COINS;
    bonuses.push("Comeback Climber +30");
  }
  if (isUnderdog(task, tasks, actualMs)) {
    bonusCoins += UNDERDOG_COINS;
    bonuses.push("Underdog +50");
  }
  const before = tasksCompleted(progress.mountainTasks, mountain.id);
  const after = before + 1;
  const reachedSummit = before < mountain.tasks && after >= mountain.tasks;
  if (reachedSummit) {
    bonusCoins += SUMMIT_COINS;
    bonuses.push("Summit +200");
  }
  const stake = task.stakeHeld ? task.stake : 0;
  const stakePayout = success ? stake * 2 : 0;
  const stakeNet = success ? stake : -stake;
  const checkpointCoins = task.checkpoints.reduce(
    (sum, checkpoint) => sum + (checkpoint.rewardPaid ? CHECKPOINT_COINS : 0),
    0,
  );
  const nextIndex = MOUNTAINS.findIndex((item) => item.id === mountain.id) + 1;
  const unlocked = reachedSummit ? MOUNTAINS[nextIndex] ?? null : null;
  const coinsAfter = coins + stakePayout + bonusCoins;
  const achievements = reachedSummit && !progress.achievements.includes(`Summited ${mountain.name}`)
    ? [...progress.achievements, `Summited ${mountain.name}`]
    : progress.achievements;
  const result: TaskResult = {
    finishedAt: now,
    actualMs,
    success,
    stakeNet,
    checkpointCoins,
    bonusCoins,
    bonuses,
    reachedSummit,
    unlockedMountainName: unlocked?.name ?? null,
    coinsAfter,
    settled: true,
  };
  const settled: GameTask = {
    ...task,
    status: "completed",
    stakeHeld: false,
    segmentStartedAt: null,
    accumulatedMs: actualMs,
    openCheckpointId: null,
    result,
  };
  return {
    ok: true as const,
    held: null,
    coins: coinsAfter,
    tasks: tasks.map((item) => (item.id === task.id ? settled : item)),
    pendingResultTaskId: task.id,
    progress: {
      ...progress,
      completedTasks: progress.completedTasks + 1,
      mountainTasks: { ...progress.mountainTasks, [mountain.id]: after },
      successfulPredictions: progress.successfulPredictions + (success ? 1 : 0),
      unsuccessfulPredictions: progress.unsuccessfulPredictions + (success ? 0 : 1),
      bettingWins: progress.bettingWins + (stake > 0 && success ? 1 : 0),
      bettingLosses: progress.bettingLosses + (stake > 0 && !success ? 1 : 0),
      coinsEarned:
        progress.coinsEarned + (success ? stake : 0) + bonusCoins,
      coinsLost: progress.coinsLost + (success ? 0 : stake),
      perfectPace: progress.perfectPace + (withinTwo || halfTime ? 1 : 0),
      underdog: progress.underdog + (bonuses.some((item) => item.startsWith("Underdog")) ? 1 : 0),
      comeback: progress.comeback + (success ? 0 : 1),
      summits: progress.summits + (reachedSummit ? 1 : 0),
      achievements,
    },
  };
}

function isUnderdog(task: GameTask, tasks: GameTask[], actualMs: number) {
  const category = task.category.trim().toLowerCase();
  if (!category) {
    return false;
  }
  const prior = tasks.filter(
    (item) =>
      item.id !== task.id &&
      item.result?.settled &&
      item.category.trim().toLowerCase() === category,
  );
  if (prior.length === 0) {
    return false;
  }
  const average =
    prior.reduce((sum, item) => sum + (item.result?.actualMs ?? 0), 0) / prior.length;
  return actualMs + 60000 <= average;
}

export function replaceTask(tasks: GameTask[], task: GameTask) {
  return tasks.map((item) => (item.id === task.id ? task : item));
}

export function normalizeTasks(value: unknown): GameTask[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const tasks = value.flatMap((item) => {
    const task = normalizeTask(item);
    return task ? [task] : [];
  });
  let active = false;
  return tasks.map((task) => {
    if (!inProgress(task)) {
      return task;
    }
    if (active) {
      return { ...task, status: "paused", segmentStartedAt: null, openCheckpointId: null };
    }
    active = true;
    return task;
  });
}

function normalizeTask(value: unknown): GameTask | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<GameTask>;
  if (!isMountainId(raw.mountainId) || typeof raw.id !== "string" || typeof raw.name !== "string") {
    return null;
  }
  const predictedMs =
    typeof raw.predictedMs === "number" && raw.predictedMs >= 60000
      ? Math.floor(raw.predictedMs / 60000) * 60000
      : 60000;
  const status = STATUSES.has(raw.status as TaskStatus) ? (raw.status as TaskStatus) : "pending";
  const checkpoints = normalizeCheckpoints(raw.checkpoints, predictedMs);
  const open = checkpoints.find((checkpoint) => checkpoint.id === raw.openCheckpointId);
  const result = normalizeResult(raw.result);
  let nextStatus = result ? "completed" : status;
  if (nextStatus === "checkpoint" && !open) {
    nextStatus = "paused";
  }
  return {
    id: raw.id,
    mountainId: raw.mountainId,
    name: raw.name.slice(0, 80),
    description: typeof raw.description === "string" ? raw.description.slice(0, 280) : "",
    category: typeof raw.category === "string" ? raw.category.slice(0, 40) : "",
    predictedMs,
    stake: nonNegative(raw.stake),
    stakeHeld: raw.stakeHeld === true && !result,
    status: nextStatus,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0,
    segmentStartedAt:
      nextStatus === "running" && typeof raw.segmentStartedAt === "number"
        ? raw.segmentStartedAt
        : null,
    accumulatedMs: nonNegative(raw.accumulatedMs),
    intervalMin: intervalChoices(predictedMs).includes(raw.intervalMin ?? -1)
      ? (raw.intervalMin as number)
      : 0,
    summitSight: raw.summitSight !== false,
    checkpoints,
    openCheckpointId: nextStatus === "checkpoint" && open ? open.id : null,
    result,
  };
}

function normalizeCheckpoints(value: unknown, predictedMs: number): CheckpointRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const checkpoints: CheckpointRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const raw = item as Partial<CheckpointRecord>;
    if (typeof raw.atMs !== "number" || raw.atMs <= 0 || raw.atMs >= predictedMs) {
      continue;
    }
    const atMs = Math.floor(raw.atMs / 60000) * 60000;
    const id = checkpointId(atMs);
    if (seen.has(id) || atMs <= 0 || atMs >= predictedMs) {
      continue;
    }
    seen.add(id);
    const state: CheckpointState =
      raw.state === "completed" || raw.state === "skipped" || raw.state === "pending"
        ? raw.state
        : "pending";
    checkpoints.push({
      id,
      atMs,
      state,
      rewardPaid: raw.rewardPaid === true && state === "completed",
    });
  }
  return checkpoints.sort((a, b) => a.atMs - b.atMs);
}

function normalizeResult(value: unknown): TaskResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<TaskResult>;
  if (raw.settled !== true || typeof raw.actualMs !== "number") {
    return null;
  }
  return {
    finishedAt: typeof raw.finishedAt === "number" ? raw.finishedAt : 0,
    actualMs: Math.max(0, Math.floor(raw.actualMs)),
    success: raw.success === true,
    stakeNet: integer(raw.stakeNet),
    checkpointCoins: nonNegative(raw.checkpointCoins),
    bonusCoins: nonNegative(raw.bonusCoins),
    bonuses: Array.isArray(raw.bonuses)
      ? raw.bonuses.filter((item) => typeof item === "string")
      : [],
    reachedSummit: raw.reachedSummit === true,
    unlockedMountainName:
      typeof raw.unlockedMountainName === "string" ? raw.unlockedMountainName : null,
    coinsAfter: nonNegative(raw.coinsAfter),
    settled: true,
  };
}

function nonNegative(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

function integer(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

export function validateDraft(draft: TaskDraft, coins: number, noStakes: boolean) {
  const errors: Partial<Record<keyof TaskDraft, string>> = {};
  if (draft.name.trim().length < 1 || draft.name.trim().length > 80) {
    errors.name = "Enter a task name up to 80 characters.";
  }
  if (draft.description.trim().length > 280) {
    errors.description = "Keep the description under 280 characters.";
  }
  if (draft.category.trim().length > 40) {
    errors.category = "Keep the category under 40 characters.";
  }
  if (
    !Number.isInteger(draft.predictedMinutes) ||
    draft.predictedMinutes < 1 ||
    draft.predictedMinutes > 720
  ) {
    errors.predictedMinutes = "Enter a predicted time from 1 to 720 minutes.";
  }
  if (!noStakes) {
    if (!Number.isInteger(draft.stake) || draft.stake < 0) {
      errors.stake = "Enter a stake of zero or more.";
    } else if (draft.stake > coins) {
      errors.stake = "That stake is higher than the coins on this account.";
    }
  }
  return errors;
}
