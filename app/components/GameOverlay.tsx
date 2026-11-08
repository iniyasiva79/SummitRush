"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./GameOverlay.module.css";

type GameOverlayProps = {
  labelledBy: string;
  children: ReactNode;
  size?: "wide" | "card";
};

function subscribe() {
  return () => {};
}

export function GameOverlay({ labelledBy, children, size = "wide" }: GameOverlayProps) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) {
    return null;
  }
  return createPortal(
    <div className={styles.backdrop} role="presentation">
      <section
        className={`${styles.dialog} ${size === "card" ? styles.card : styles.wide}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}
