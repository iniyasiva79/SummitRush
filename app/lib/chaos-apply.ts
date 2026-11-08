import { updateActiveAccount, type PublicAccount } from "./accounts";
import { offerChaos } from "./chaos";
import type { GameTask } from "./gameplay";

export function rollAndSaveChaos(input: {
  account: PublicAccount;
  enabled: boolean;
  mountainId: string;
  triggerKey: string;
  resumeTaskId: string | null;
  tasks: GameTask[];
}) {
  const result = offerChaos({
    enabled: input.enabled,
    events: input.account.chaosEvents,
    rolls: input.account.chaosRolls,
    mountainId: input.mountainId,
    triggerKey: input.triggerKey,
    timerRunning: false,
    now: Date.now(),
    seed: input.account.id,
    ownedCosmetics: input.account.equippedAccessories,
    resumeTaskId: input.resumeTaskId,
  });
  updateActiveAccount({
    chaosEvents: result.events,
    chaosRolls: result.rolls,
    coins: input.account.coins + result.coinsDelta,
    equippedAccessories: result.cosmeticId
      ? [...new Set([...input.account.equippedAccessories, result.cosmeticId])]
      : input.account.equippedAccessories,
    tasks: input.tasks,
    progress: {
      ...input.account.progress,
      coinsEarned: input.account.progress.coinsEarned + Math.max(0, result.coinsDelta),
    },
  });
  return result.created;
}
