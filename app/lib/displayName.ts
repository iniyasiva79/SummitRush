import { useSyncExternalStore } from "react";
import { readActiveAccount, updateActiveAccount } from "./accounts";

export const DISPLAY_NAME_KEY = "summitrush.displayName";
export const DISPLAY_NAME_LIMIT = 24;

const CHANGE_EVENT = "summitrush-display-name";

let snapshot = "";

export function readDisplayName(): string {
  try {
    const active = readActiveAccount();
    if (active) {
      return active.displayName;
    }
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeDisplayName(name: string): void {
  if (readActiveAccount()) {
    updateActiveAccount({ displayName: name });
    snapshot = name;
    return;
  }
  localStorage.setItem(DISPLAY_NAME_KEY, name);
  snapshot = name;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void) {
  const handleChange = () => {
    snapshot = readDisplayName();
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("summitrush-account", handleChange);
  window.addEventListener("storage", handleChange);
  snapshot = readDisplayName();
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("summitrush-account", handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

export function useDisplayName() {
  return useSyncExternalStore(subscribe, () => snapshot, () => "");
}
