import { updateActiveAccount, type PublicAccount } from "./accounts";
import { grantOwned } from "./avatars";
import { offerChaos } from "./chaos";
import type { GameTask } from "./gameplay";

export function rollAndSaveChaos(input: {
  account: PublicAccount;
  enabled: boolean;
  mountainId: string;
  triggerKey: string;
  resumeTaskId: string | null;
  tasks: GameTask[];
  guaranteed?: boolean;
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
    ownedCosmetics: input.account.ownedAccessories,
    resumeTaskId: input.resumeTaskId,
    guaranteed: input.guaranteed,
  });
  const granted = result.cosmeticId
    ? grantOwned(
        input.account.ownedAccessories,
        input.account.equippedAccessories,
        result.cosmeticId,
      )
    : {
        owned: input.account.ownedAccessories,
        equipped: input.account.equippedAccessories,
      };
  updateActiveAccount({
    chaosEvents: result.events,
    chaosRolls: result.rolls,
    coins: input.account.coins + result.coinsDelta,
    ownedAccessories: granted.owned,
    equippedAccessories: granted.equipped,
    tasks: input.tasks,
    progress: {
      ...input.account.progress,
      coinsEarned: input.account.progress.coinsEarned + Math.max(0, result.coinsDelta),
    },
  });
  return result.created;
}
