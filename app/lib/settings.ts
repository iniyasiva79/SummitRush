import { useSyncExternalStore } from "react";

export const SETTINGS_KEY = "summitrush.settings";

export type TextSize = "small" | "medium" | "large";

export type Settings = {
  sound: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  textSize: TextSize;
  chaosCards: boolean;
  noStakes: boolean;
};

export const defaultSettings: Settings = {
  sound: true,
  reducedMotion: false,
  highContrast: false,
  textSize: "medium",
  chaosCards: true,
  noStakes: false,
};

const CHANGE_EVENT = "summitrush-settings";

let snapshot: Settings = defaultSettings;

function isTextSize(value: unknown): value is TextSize {
  return value === "small" || value === "medium" || value === "large";
}

function normalize(value: unknown): Settings {
  if (!value || typeof value !== "object") {
    return defaultSettings;
  }
  const raw = value as Partial<Settings>;
  return {
    sound: typeof raw.sound === "boolean" ? raw.sound : defaultSettings.sound,
    reducedMotion:
      typeof raw.reducedMotion === "boolean"
        ? raw.reducedMotion
        : defaultSettings.reducedMotion,
    highContrast:
      typeof raw.highContrast === "boolean"
        ? raw.highContrast
        : defaultSettings.highContrast,
    textSize: isTextSize(raw.textSize) ? raw.textSize : defaultSettings.textSize,
    chaosCards:
      typeof raw.chaosCards === "boolean"
        ? raw.chaosCards
        : defaultSettings.chaosCards,
    noStakes:
      typeof raw.noStakes === "boolean" ? raw.noStakes : defaultSettings.noStakes,
  };
}

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function subscribe(onStoreChange: () => void) {
  const handleChange = () => {
    snapshot = readSettings();
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  snapshot = readSettings();
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function getSnapshot() {
  return snapshot;
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, () => defaultSettings);
}

export function updateSettings(partial: Partial<Settings>) {
  const next = normalize({ ...snapshot, ...partial });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  snapshot = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
