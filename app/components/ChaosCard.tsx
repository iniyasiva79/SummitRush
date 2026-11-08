"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { readActiveAccount, updateActiveAccount, useActiveAccount } from "../lib/accounts";
import {
  acknowledgeChaos,
  chaosArt,
  chaosSummary,
  chaosTitle,
  solveChaos,
} from "../lib/chaos";
import { replaceTask, resumeTask } from "../lib/gameplay";
import { useSettings } from "../lib/settings";
import { GameOverlay } from "./GameOverlay";
import styles from "./ChaosCard.module.css";

const REVEAL_MS = 1400;

export function ChaosCard() {
  const account = useActiveAccount();
  const settings = useSettings();
  const titleId = useId();
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState("");
  const event = account?.chaosEvents.find((item) => !item.acknowledged) ?? null;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  if (!account || !event) {
    return null;
  }
  const revealed = settings.reducedMotion || (now > 0 && now - event.createdAt >= REVEAL_MS);
  if (!revealed) {
    return null;
  }

  function choose(choice: string) {
    const current = readActiveAccount();
    const open = current?.chaosEvents.find((item) => item.id === event?.id);
    if (!current || !open) {
      return;
    }
    const solved = solveChaos(open, choice);
    if (!solved.event.solved) {
      setNotice("That is not the answer. The trail is still blocked.");
      return;
    }
    updateActiveAccount({
      chaosEvents: current.chaosEvents.map((item) => (item.id === open.id ? solved.event : item)),
      coins: current.coins + solved.coinsDelta,
      progress: {
        ...current.progress,
        coinsEarned: current.progress.coinsEarned + solved.coinsDelta,
      },
    });
    setNotice(solved.coinsDelta > 0 ? `+${solved.coinsDelta} Summit Coins` : "The path is clear.");
  }

  function acknowledge() {
    const current = readActiveAccount();
    const open = current?.chaosEvents.find((item) => item.id === event?.id);
    if (!current || !open) {
      return;
    }
    const done = acknowledgeChaos(open);
    if (!done) {
      setNotice("Finish the challenge before continuing.");
      return;
    }
    const task = done.resumeTaskId
      ? current.tasks.find((item) => item.id === done.resumeTaskId && item.status === "paused")
      : null;
    updateActiveAccount({
      chaosEvents: current.chaosEvents.map((item) => (item.id === done.id ? done : item)),
      tasks: task ? replaceTask(current.tasks, resumeTask(task, Date.now())) : current.tasks,
    });
    setNotice("");
  }

  return (
    <GameOverlay labelledBy={titleId} size="card">
      <p className={styles.kicker}>Chaos Card</p>
      <div className={styles.art}>
        <Image src={chaosArt(event.card)} alt="" fill sizes="520px" />
      </div>
      <h2 id={titleId}>{chaosTitle(event.card)}</h2>
      <p>{chaosSummary(event.card)}</p>
      <p>{event.outcome}</p>
      {event.coinDelta > 0 ? <p className={styles.reward}>+{event.coinDelta} Summit Coins</p> : null}
      {event.cosmeticId ? <p className={styles.reward}>A cosmetic was added to this account.</p> : null}
      {event.prompt ? <p className={styles.prompt}>{event.prompt}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {event.choices.length > 0 && !event.solved ? (
        <div className={styles.choices}>
          {event.choices.map((choice) => (
            <button key={choice} type="button" className={styles.secondary} onClick={() => choose(choice)}>
              {choice}
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className={styles.primary} onClick={acknowledge} disabled={!event.solved}>
        Continue
      </button>
    </GameOverlay>
  );
}
