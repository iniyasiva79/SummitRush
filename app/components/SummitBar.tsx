"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  DISPLAY_NAME_LIMIT,
  useDisplayName,
  writeDisplayName,
} from "../lib/displayName";
import styles from "./SummitBar.module.css";

type ThemeLink = {
  href: string;
  label: string;
};

type SummitBarProps = {
  themeLinks?: ThemeLink[];
};

export function SummitBar({ themeLinks = [] }: SummitBarProps) {
  const savedName = useDisplayName();
  const [draft, setDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const nameValue = draft ?? savedName;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nameFieldId = useId();
  const panelTitleId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (panelRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = nameValue.trim().slice(0, DISPLAY_NAME_LIMIT);
    try {
      writeDisplayName(next);
    } catch {
      setNotice("The name could not be saved in this browser.");
      return;
    }
    setDraft(null);
    setNotice(next ? `Saved display name ${next}.` : "Display name cleared.");
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.bar}>
        <button
          ref={menuRef}
          type="button"
          className={styles.iconButton}
          aria-expanded={menuOpen}
          aria-controls="settings-panel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon />
          <span className={styles.srOnly}>Menu</span>
        </button>

        <form className={styles.nameForm} onSubmit={saveName}>
          <label className={styles.nameLabel} htmlFor={nameFieldId}>
            Display name
          </label>
          <input
            id={nameFieldId}
            className={styles.nameInput}
            value={nameValue}
            maxLength={DISPLAY_NAME_LIMIT}
            autoComplete="nickname"
            placeholder="Your name"
            onChange={(event) => {
              setDraft(event.target.value);
              setNotice("");
            }}
          />
          <button type="submit" className={styles.save}>
            Save
          </button>
        </form>

        <div className={styles.cluster}>
          <p className={styles.coins}>
            <CoinIcon />
            <span>0</span>
            <span className={styles.srOnly}>Summit Coins</span>
          </p>
          <Link className={styles.iconButton} href="/shop" aria-label="Shop">
            <ShopIcon />
          </Link>
          <Link
            className={styles.iconButton}
            href="/profile"
            aria-label={
              nameValue.trim() ? `Profile for ${nameValue.trim()}` : "Profile"
            }
          >
            <AvatarIcon />
          </Link>
        </div>
      </header>

      {menuOpen ? (
        <div
          ref={panelRef}
          id="settings-panel"
          className={styles.panel}
          role="region"
          aria-labelledby={panelTitleId}
        >
          <div className={styles.panelHeader}>
            <h2 id={panelTitleId}>Settings</h2>
            <button
              ref={closeRef}
              type="button"
              className={styles.save}
              onClick={() => {
                setMenuOpen(false);
                menuRef.current?.focus();
              }}
            >
              Close
            </button>
          </div>
          <ul className={styles.later}>
            <li>Audio — not available yet</li>
            <li>High contrast — not available yet</li>
            <li>Reduced motion — not available yet</li>
            <li>Help — not available yet</li>
          </ul>
          {themeLinks.length > 0 ? (
            <nav aria-label="On this page">
              <ul className={styles.themeLinks}>
                {themeLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      ) : null}
      <p className={styles.notice} aria-live="polite">
        {notice}
      </p>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.coinIcon}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5v9M9.5 9.5c.6-.8 1.4-1.2 2.5-1.2 1.6 0 2.6.8 2.6 2s-1 1.8-2.6 2-2.6.8-2.6 2 1 2 2.6 2c1.1 0 1.9-.4 2.5-1.2" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M5 9h14l-1.2 9H6.2L5 9z" />
      <path d="M8 9V7.5A4 4 0 0 1 12 4a4 4 0 0 1 4 3.5V9" />
    </svg>
  );
}

function AvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <circle cx="12" cy="9" r="3.2" />
      <path d="M6.5 18.5c1.2-2.4 3.1-3.5 5.5-3.5s4.3 1.1 5.5 3.5" />
    </svg>
  );
}
