export const CHAOS_LIMIT = 3;
export const BOULDER_COINS = 20;
export const CRATE_COINS = 15;

export const CHAOS_CARDS = [
  "boulder-breakdown",
  "rockslide",
  "mystery-supply-crate",
] as const;

export type ChaosCardId = (typeof CHAOS_CARDS)[number];

export type ChaosEvent = {
  id: string;
  card: ChaosCardId;
  mountainId: string;
  triggerKey: string;
  createdAt: number;
  prompt: string;
  choices: string[];
  answer: string;
  coinDelta: number;
  rewardApplied: boolean;
  cosmeticId: string | null;
  outcome: string;
  solved: boolean;
  acknowledged: boolean;
  resumeTaskId: string | null;
};

const COSMETICS = ["beanie", "glasses"] as const;

export function chaosTitle(card: ChaosCardId) {
  if (card === "boulder-breakdown") {
    return "Boulder Breakdown";
  }
  if (card === "rockslide") {
    return "Rockslide";
  }
  return "Mystery Supply Crate";
}

export function chaosSummary(card: ChaosCardId) {
  if (card === "boulder-breakdown") {
    return "A boulder blocks the trail. Complete a short puzzle to earn 20 additional coins.";
  }
  if (card === "rockslide") {
    return "The path temporarily becomes more challenging visually. Complete a simple math problem to clear the obstacle.";
  }
  return "Discover a random cosmetic item or a small coin reward.";
}

export function chaosArt(card: ChaosCardId) {
  if (card === "boulder-breakdown") {
    return "/chaos/card-boulder.jpg";
  }
  if (card === "rockslide") {
    return "/chaos/card-rockslide.jpg";
  }
  return "/chaos/card-crate.jpg";
}

export type ChaosRollResult = {
  events: ChaosEvent[];
  rolls: string[];
  coinsDelta: number;
  cosmeticId: string | null;
  created: ChaosEvent | null;
};

function emptyRoll(events: ChaosEvent[], rolls: string[]): ChaosRollResult {
  return { events, rolls, coinsDelta: 0, cosmeticId: null, created: null };
}

export function offerChaos(input: {
  enabled: boolean;
  events: ChaosEvent[];
  rolls: string[];
  mountainId: string;
  triggerKey: string;
  timerRunning: boolean;
  now: number;
  seed: string;
  ownedCosmetics: string[];
  resumeTaskId?: string | null;
}): ChaosRollResult {
  if (input.events.some((event) => !event.acknowledged)) {
    return emptyRoll(input.events, input.rolls);
  }
  if (!input.enabled || input.timerRunning) {
    return emptyRoll(input.events, input.rolls);
  }
  if (input.rolls.includes(input.triggerKey)) {
    return emptyRoll(input.events, input.rolls);
  }
  const rolls = [...input.rolls, input.triggerKey];
  const onMountain = input.events.filter((event) => event.mountainId === input.mountainId).length;
  const roll = chaosHash(`${input.seed}:${input.triggerKey}`);
  if (onMountain >= CHAOS_LIMIT || roll % 4 !== 0) {
    return emptyRoll(input.events, rolls);
  }
  const card = CHAOS_CARDS[roll % CHAOS_CARDS.length];
  const created = buildEvent(card, input, roll);
  return {
    events: [...input.events, created],
    rolls,
    coinsDelta: created.coinDelta,
    cosmeticId: created.cosmeticId,
    created,
  };
}

export function solveChaos(event: ChaosEvent, choice: string) {
  if (event.acknowledged || event.solved || event.card === "mystery-supply-crate") {
    return { event, coinsDelta: 0 };
  }
  if (choice !== event.answer) {
    return { event, coinsDelta: 0 };
  }
  const coinsDelta = event.card === "boulder-breakdown" && !event.rewardApplied ? BOULDER_COINS : 0;
  return {
    coinsDelta,
    event: {
      ...event,
      solved: true,
      rewardApplied: true,
      coinDelta: event.coinDelta + coinsDelta,
    },
  };
}

export function acknowledgeChaos(event: ChaosEvent) {
  if (!event.solved || event.acknowledged) {
    return null;
  }
  return { ...event, acknowledged: true };
}

export function normalizeChaosEvents(value: unknown): ChaosEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const event = item as Partial<ChaosEvent>;
    if (!isCard(event.card) || typeof event.id !== "string" || typeof event.mountainId !== "string") {
      return [];
    }
    if (typeof event.triggerKey !== "string" || typeof event.createdAt !== "number") {
      return [];
    }
    return [{
      id: event.id,
      card: event.card,
      mountainId: event.mountainId,
      triggerKey: event.triggerKey,
      createdAt: event.createdAt,
      prompt: typeof event.prompt === "string" ? event.prompt : "",
      choices: Array.isArray(event.choices) ? event.choices.filter((choice) => typeof choice === "string") : [],
      answer: typeof event.answer === "string" ? event.answer : "",
      coinDelta: nonNegative(event.coinDelta),
      rewardApplied: event.rewardApplied === true,
      cosmeticId: typeof event.cosmeticId === "string" ? event.cosmeticId : null,
      outcome: typeof event.outcome === "string" ? event.outcome : "",
      solved: event.solved === true,
      acknowledged: event.acknowledged === true,
      resumeTaskId: typeof event.resumeTaskId === "string" ? event.resumeTaskId : null,
    }];
  });
}

export function normalizeChaosRolls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string").slice(0, 240);
}

function buildEvent(
  card: ChaosCardId,
  input: {
    mountainId: string;
    triggerKey: string;
    now: number;
    ownedCosmetics: string[];
    resumeTaskId?: string | null;
  },
  roll: number,
): ChaosEvent {
  const base = {
    id: `chaos-${input.triggerKey}`,
    card,
    mountainId: input.mountainId,
    triggerKey: input.triggerKey,
    createdAt: input.now,
    coinDelta: 0,
    rewardApplied: false,
    cosmeticId: null as string | null,
    solved: false,
    acknowledged: false,
    resumeTaskId: input.resumeTaskId ?? null,
  };
  if (card === "boulder-breakdown") {
    return {
      ...base,
      prompt: "Three holds are marked 2, 5, and 9. Which marking is the middle hold?",
      choices: ["2", "5", "9"],
      answer: "5",
      outcome: "The boulder blocks the trail until the puzzle is solved. The correct hold earns 20 Summit Coins.",
    };
  }
  if (card === "rockslide") {
    const fallen = (roll % 5) + 4;
    const passed = (Math.floor(roll / 8) % 3) + 1;
    const answer = String(fallen - passed);
    return {
      ...base,
      prompt: `${fallen} rocks fell onto the switchback and ${passed} rolled past. How many rocks are still blocking the path?`,
      choices: orderedChoices(answer, roll),
      answer,
      outcome: "The rockslide makes the path harder to see. The right answer clears the rocks. This card does not change Summit Coins.",
    };
  }
  const available = COSMETICS.find((item) => !input.ownedCosmetics.includes(item));
  if (available && roll % 2 === 0) {
    const name = available === "beanie" ? "Summit beanie" : "Glacier glasses";
    return {
      ...base,
      prompt: "",
      choices: [],
      answer: "",
      solved: true,
      rewardApplied: true,
      cosmeticId: available,
      outcome: `The crate held the ${name}. It is now on this account and does not change the score.`,
    };
  }
  return {
    ...base,
    prompt: "",
    choices: [],
    answer: "",
    solved: true,
    rewardApplied: true,
    coinDelta: CRATE_COINS,
    outcome: `The crate held ${CRATE_COINS} Summit Coins. They have been added once.`,
  };
}

function orderedChoices(answer: string, roll: number) {
  const correct = Number(answer);
  const options = [String(correct), String(correct + 1), String(Math.max(0, correct - 1))];
  const unique = [...new Set(options)];
  return unique.sort((a, b) => chaosHash(`${roll}:${a}`) - chaosHash(`${roll}:${b}`));
}

function chaosHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isCard(value: unknown): value is ChaosCardId {
  return value === "boulder-breakdown" || value === "rockslide" || value === "mystery-supply-crate";
}

function nonNegative(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}
