import { useSyncExternalStore } from "react";

export const DISPLAY_NAME_KEY = "summitrush.displayName";
export const DISPLAY_NAME_LIMIT = 24;

const CHANGE_EVENT = "summitrush-display-name";

export function readDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useDisplayName() {
  return useSyncExternalStore(subscribe, readDisplayName, () => "");
}
