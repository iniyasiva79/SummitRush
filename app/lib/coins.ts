import { useSyncExternalStore } from "react";
import { readActiveAccount, updateActiveAccount } from "./accounts";
import { STARTING_COINS } from "./constants";

export const COINS_KEY = "summitrush.coins";
export { STARTING_COINS };

const CHANGE_EVENT = "summitrush-coins";

let snapshot = STARTING_COINS;

function readCoins(): number {
  try {
    const active = readActiveAccount();
    if (active) {
      return active.coins;
    }
    const raw = localStorage.getItem(COINS_KEY);
    if (raw === null) {
      localStorage.setItem(COINS_KEY, String(STARTING_COINS));
      return STARTING_COINS;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      return STARTING_COINS;
    }
    return value;
  } catch {
    return STARTING_COINS;
  }
}

function subscribe(onStoreChange: () => void) {
  const handleChange = () => {
    snapshot = readCoins();
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("summitrush-account", handleChange);
  window.addEventListener("storage", handleChange);
  snapshot = readCoins();
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("summitrush-account", handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

export function useCoins() {
  return useSyncExternalStore(subscribe, () => snapshot, () => STARTING_COINS);
}

export function updateCoins(next: number) {
  const value = Math.max(0, Math.floor(next));
  if (readActiveAccount()) {
    updateActiveAccount({ coins: value });
    snapshot = value;
    return;
  }
  try {
    localStorage.setItem(COINS_KEY, String(value));
  } catch {
    return;
  }
  snapshot = value;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
