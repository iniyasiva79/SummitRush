"use client";

import { useLayoutEffect } from "react";
import { useSettings } from "../lib/settings";

export function SettingsApplier() {
  const settings = useSettings();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = settings.reducedMotion ? "reduce" : "allow";
    root.dataset.contrast = settings.highContrast ? "high" : "normal";
    root.dataset.text = settings.textSize;
    root.dataset.sound = settings.sound ? "on" : "off";
    root.dataset.chaos = settings.chaosCards ? "on" : "off";
    root.dataset.stakes = settings.noStakes ? "off" : "on";
  }, [settings]);

  return null;
}
