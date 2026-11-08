"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { logout, useActiveAccount } from "../lib/accounts";
import { avatarById } from "../lib/avatars";
import { chaosSummary, chaosTitle } from "../lib/chaos";
import { MOUNTAINS, mountainById, progressLabel, tasksCompleted } from "../lib/mountains";
import { CheckpointHost } from "./CheckpointHost";
import { useCoins } from "../lib/coins";
import {
  updateSettings,
  useSettings,
  type TextSize,
} from "../lib/settings";
import styles from "./SummitBar.module.css";

type ThemeLink = {
  href: string;
  label: string;
};

type SummitBarProps = {
  themeLinks?: ThemeLink[];
};

export function SummitBar({ themeLinks = [] }: SummitBarProps) {
  const account = useActiveAccount();
  const coins = useCoins();
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const gearRef = useRef<HTMLButtonElement>(null);
  const infoCloseRef = useRef<HTMLButtonElement>(null);
  const settingsCloseRef = useRef<HTMLButtonElement>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const settings = useSettings();
  const infoTitleId = useId();
  const settingsTitleId = useId();
  const textSizes: TextSize[] = ["small", "medium", "large"];

  useEffect(() => {
    if (!infoOpen && !settingsOpen) {
      return;
    }

    (infoOpen ? infoCloseRef : settingsCloseRef).current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setInfoOpen(false);
      setSettingsOpen(false);
      (infoOpen ? menuRef : gearRef).current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const insideInfo = infoPanelRef.current?.contains(target);
      const insideSettings = settingsPanelRef.current?.contains(target);
      const onMenu = menuRef.current?.contains(target);
      const onGear = gearRef.current?.contains(target);
      if (insideInfo || insideSettings || onMenu || onGear) {
        return;
      }
      setInfoOpen(false);
      setSettingsOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [infoOpen, settingsOpen]);

  const playerName = account?.username ?? "";
  const avatar = avatarById(account?.avatarId);

  return (
    <div className={styles.wrap}>
      <header className={styles.bar}>
        <div className={styles.left}>
        <button
          ref={gearRef}
          type="button"
          className={styles.iconButton}
          aria-expanded={settingsOpen}
          aria-controls="accessibility-panel"
          onClick={() => {
            setSettingsOpen((open) => !open);
            setInfoOpen(false);
          }}
        >
          <GearIcon />
          <span className={styles.srOnly}>Accessibility settings</span>
        </button>
        <Link className={styles.iconButton} href="/" aria-label="Home">
          <HomeIcon />
        </Link>
        </div>
        <div className={styles.right}>
          <div className={styles.tools}>
            <p className={styles.coins}>
              <CoinIcon />
              <span>{coins.toLocaleString("en-US")}</span>
              <span className={styles.srOnly}>Summit Coins</span>
            </p>
            <Link className={styles.iconButton} href="/shop" aria-label="Shop">
              <ShopIcon />
            </Link>
            <Link
              className={styles.iconButton}
              href="/profile"
              aria-label={playerName ? `Profile for ${playerName}` : "Profile"}
            >
              {avatar ? (
                <Image
                  className={styles.avatarPhoto}
                  src={avatar.src}
                  alt=""
                  width={30}
                  height={30}
                />
              ) : (
                <AvatarIcon />
              )}
            </Link>
            <button
              ref={menuRef}
              type="button"
              className={styles.iconButton}
              aria-expanded={infoOpen}
              aria-controls="info-panel"
              onClick={() => {
                setInfoOpen((open) => !open);
                setSettingsOpen(false);
              }}
            >
              <MenuIcon />
              <span className={styles.srOnly}>Game information</span>
            </button>
          </div>
          {account ? (
            <div className={styles.session}>
              <p className={styles.username}>{account.username}</p>
              <button type="button" className={styles.save} onClick={logout}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {infoOpen ? (
        <div
          ref={infoPanelRef}
          id="info-panel"
          className={styles.panel}
          role="region"
          aria-labelledby={infoTitleId}
        >
          <div className={styles.panelHeader}>
            <h2 id={infoTitleId}>Field notes</h2>
            <button
              ref={infoCloseRef}
              type="button"
              className={styles.save}
              onClick={() => {
                setInfoOpen(false);
                menuRef.current?.focus();
              }}
            >
              Close
            </button>
          </div>
          <InfoSection title="Chaos Cards">
            <p>
              Chaos Cards are occasional trail events, at most three per
              mountain. The first card can appear after one minute of working
              time. The timer pauses while a card is open.
            </p>
            <ul>
              <li>Boulder Breakdown: a short puzzle can earn 20 coins.</li>
              <li>Rockslide: a simple math problem clears the path.</li>
              <li>Mystery Supply Crate: a small coin reward or a cosmetic.</li>
            </ul>
            <p>
              Setting: {settings.chaosCards ? "on" : "off"}. Cards triggered:{" "}
              {account?.chaosEvents.length ?? 0}. Rewards received:{" "}
              {account
                ? account.chaosEvents.reduce((sum, event) => sum + event.coinDelta, 0)
                : 0}{" "}
              Summit Coins. Penalties received: 0.
            </p>
            {account && account.chaosEvents.length > 0 ? (
              <ul>
                {account.chaosEvents.map((event) => (
                  <li key={event.id}>
                    {chaosTitle(event.card)}
                    {mountainById(event.mountainId) ? ` · ${mountainById(event.mountainId)?.name}` : ""}
                    {": "}
                    {chaosSummary(event.card)}{" "}
                    {event.coinDelta > 0 ? `Reward +${event.coinDelta} coins. ` : "No coin change. "}
                    {event.acknowledged ? "Cleared." : "Still on the trail."}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No Chaos Cards have been triggered on this account yet.</p>
            )}
          </InfoSection>
          <InfoSection title="Bonuses">
            <ul>
              <li>Perfect Pace: +25 coins for a very close time prediction.</li>
              <li>Underdog: +50 coins for improving on a difficult task.</li>
              <li>Comeback Climber: +30 coins for finishing after the prediction.</li>
              <li>Checkpoint: +10 coins. Summit: +200 coins. Team climb: +100 coins.</li>
            </ul>
            <ul>
              <li>Perfect Pace bonuses: {account?.progress.perfectPace ?? 0}</li>
              <li>Underdog bonuses: {account?.progress.underdog ?? 0}</li>
              <li>Comeback Climber bonuses: {account?.progress.comeback ?? 0}</li>
              <li>Summit bonuses: {account?.progress.summits ?? 0}</li>
            </ul>
          </InfoSection>
          <InfoSection title="Progress tracking">
            <ul>
              <li>Total completed tasks: {account?.progress.completedTasks ?? 0}</li>
              <li>Successful time predictions: {account?.progress.successfulPredictions ?? 0}</li>
              <li>Unsuccessful time predictions: {account?.progress.unsuccessfulPredictions ?? 0}</li>
              <li>
                Total mountains completed:{" "}
                {account
                  ? MOUNTAINS.filter(
                      (mountain) =>
                        tasksCompleted(account.progress.mountainTasks, mountain.id) >=
                        mountain.tasks,
                    ).length
                  : 0}
              </li>
              <li>
                Current mountain progress:{" "}
                {account
                  ? progressLabel(account.progress.mountainTasks)
                  : "not started."}
              </li>
              <li>Summit Coins earned: {account?.progress.coinsEarned ?? 0}</li>
              <li>Summit Coins lost: {account?.progress.coinsLost ?? 0}</li>
              <li>Checkpoints reached: {account?.progress.checkpoints ?? 0}</li>
              <li>SummitSight activities completed: {account?.progress.summitSightCompleted ?? 0}</li>
              <li>
                Achievements:{" "}
                {account && account.progress.achievements.length > 0
                  ? account.progress.achievements.join(", ")
                  : "none yet."}
              </li>
            </ul>
            <p>
              {account
                ? "This record is saved with the signed-in account."
                : "Sign in to keep this record with an account."}
            </p>
          </InfoSection>
          <InfoSection title="Wins and losses">
            <ul>
              <li>Betting wins: {account?.progress.bettingWins ?? 0}</li>
              <li>Betting losses: {account?.progress.bettingLosses ?? 0}</li>
            </ul>
          </InfoSection>
          {themeLinks.length > 0 ? (
            <nav aria-label="On this page">
              <ul className={styles.themeLinks}>
                {themeLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} onClick={() => setInfoOpen(false)}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      ) : null}

      {settingsOpen ? (
        <div
          ref={settingsPanelRef}
          id="accessibility-panel"
          className={`${styles.panel} ${styles.panelLeft}`}
          role="region"
          aria-labelledby={settingsTitleId}
        >
          <div className={styles.panelHeader}>
            <h2 id={settingsTitleId}>Accessibility</h2>
            <button
              ref={settingsCloseRef}
              type="button"
              className={styles.save}
              onClick={() => {
                setSettingsOpen(false);
                gearRef.current?.focus();
              }}
            >
              Close
            </button>
          </div>
          <div className={styles.controls}>
            <Switch
              label="Sound effects"
              checked={settings.sound}
              onChange={(sound) => updateSettings({ sound })}
            />
            <Switch
              label="Reduced motion"
              checked={settings.reducedMotion}
              onChange={(reducedMotion) => updateSettings({ reducedMotion })}
            />
            <Switch
              label="High contrast"
              checked={settings.highContrast}
              onChange={(highContrast) => updateSettings({ highContrast })}
            />
            <Switch
              label="Chaos Cards"
              checked={settings.chaosCards}
              onChange={(chaosCards) => updateSettings({ chaosCards })}
            />
            <Switch
              label="Solo, no stakes"
              checked={settings.noStakes}
              onChange={(noStakes) => updateSettings({ noStakes })}
            />
            <div className={styles.sizeGroup} role="group" aria-label="Text size">
              <span className={styles.sizeLabel}>Text size</span>
              {textSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={styles.sizeButton}
                  aria-pressed={settings.textSize === size}
                  onClick={() => updateSettings({ textSize: size })}
                >
                  {size}
                </button>
              ))}
            </div>
            <p className={styles.hint}>
              These choices are saved on this browser. Solo, no stakes skips
              task bets. Checkpoint rewards still apply. Summit Coins are
              fictional. Chaos Cards follow the on/off setting above and never
              interrupt a running timer.
            </p>
          </div>
        </div>
      ) : null}
      <CheckpointHost />
    </div>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className={styles.section}>
      <summary>{title}</summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={styles.switch}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span>{checked ? "On" : "Off"}</span>
    </button>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M7 10.5V19h10v-8.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" />
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
