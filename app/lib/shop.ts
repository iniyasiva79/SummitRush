import {
  accessoryById,
  grantOwned,
  normalizeAccessoryIds,
  type Accessory,
} from "./avatars";

export function buyAccessory(
  coins: number,
  owned: string[],
  itemId: string,
):
  | { ok: true; coins: number; owned: string[]; item: Accessory }
  | { ok: false; error: string } {
  const item = accessoryById(itemId);
  if (!item) {
    return { ok: false, error: "That item is not in the shop." };
  }
  if (owned.includes(item.id)) {
    return { ok: false, error: `${item.name} is already owned.` };
  }
  if (coins < item.price) {
    return { ok: false, error: `Need ${item.price.toLocaleString("en-US")} Summit Coins for ${item.name}.` };
  }
  const granted = grantOwned(owned, [], item.id);
  return {
    ok: true,
    coins: coins - item.price,
    owned: granted.owned,
    item,
  };
}

export function mergeOwned(owned: unknown, equipped: unknown) {
  return normalizeAccessoryIds([
    ...normalizeAccessoryIds(owned),
    ...normalizeAccessoryIds(equipped),
  ]);
}
