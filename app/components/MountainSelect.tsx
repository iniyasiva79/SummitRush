"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useActiveAccount } from "../lib/accounts";
import { avatarById } from "../lib/avatars";
import {
  MOUNTAINS,
  isMountainComplete,
  isMountainUnlocked,
  tasksCompleted,
} from "../lib/mountains";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./MountainSelect.module.css";

export function MountainSelect() {
  const account = useActiveAccount();
  const avatar = avatarById(account?.avatarId);
  const tasks = account?.progress.mountainTasks;
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const mountain = MOUNTAINS[index];
  const unlocked = isMountainUnlocked(tasks, mountain.id);
  const complete = isMountainComplete(tasks, mountain.id);
  const done = tasksCompleted(tasks, mountain.id);
  const remaining = Math.max(mountain.tasks - done, 0);
  const previous = index > 0 ? MOUNTAINS[index - 1] : null;

  function show(next: number) {
    const clamped = Math.max(0, Math.min(MOUNTAINS.length - 1, next));
    setIndex(clamped);
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>(`[data-index="${clamped}"]`);
    if (!track || !card) {
      return;
    }
    const reduce =
      document.documentElement.dataset.motion === "reduce" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }

  if (!account || !avatar) {
    return (
      <ScreenFrame>
        <SummitBar />
        <main className={styles.main}>
          <section className={styles.detail}>
            <h1>Choose an avatar first</h1>
            <p>Mountain progress is saved on a signed-in account after an avatar is chosen.</p>
            <GameButton href={account ? "/play" : "/login"}>
              {account ? "Choose avatar" : "Log in"}
            </GameButton>
          </section>
        </main>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <h1>Choose a mountain</h1>
        <p className={styles.lead}>
          Mount Fuji is open. Each later mountain opens after the previous
          mountain&apos;s tasks are finished. Start an unlocked climb to create a task.
        </p>
        <div className={styles.scroller}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Previous mountain"
            disabled={index === 0}
            onClick={() => show(index - 1)}
          >
            ‹
          </button>
          <div className={styles.track} ref={trackRef}>
            {MOUNTAINS.map((item, itemIndex) => {
              const open = isMountainUnlocked(tasks, item.id);
              const finished = isMountainComplete(tasks, item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  data-index={itemIndex}
                  className={itemIndex === index ? `${styles.card} ${styles.focused}` : styles.card}
                  aria-pressed={itemIndex === index}
                  aria-disabled={!open}
                  onClick={() => show(itemIndex)}
                >
                  <span className={styles.art}>
                    <Image src={item.src} alt="" fill sizes="240px" />
                  </span>
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.meta}>{item.tasks} tasks</span>
                  <span className={open ? styles.open : styles.locked}>
                    {finished ? "Complete" : open ? "Unlocked" : "Locked"}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Next mountain"
            disabled={index === MOUNTAINS.length - 1}
            onClick={() => show(index + 1)}
          >
            ›
          </button>
        </div>

        <section className={styles.detail} aria-live="polite">
          <div className={styles.hero}>
            <Image src={mountain.src} alt="" fill sizes="(max-width: 720px) 100vw, 640px" />
          </div>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{mountain.feature}</p>
            <h2>{mountain.name}</h2>
            <p>{mountain.geography}</p>
            <p>
              Tasks required: <strong>{mountain.tasks}</strong>
            </p>
            <p>
              Completed: <strong>{done}</strong>. Remaining: <strong>{remaining}</strong>.
            </p>
            {complete ? <p>This mountain is complete for {account.username}.</p> : null}
            {unlocked ? (
              <GameButton href={`/climb/${mountain.id}`}>Start Climb</GameButton>
            ) : (
              <p className={styles.lockNote}>
                Locked. Finish {previous?.tasks} tasks on {previous?.name} before
                entering {mountain.name}.{" "}
                {tasksCompleted(tasks, previous?.id ?? "fuji")} of {previous?.tasks} are
                saved.
              </p>
            )}
            <p className={styles.credit}>
              Original illustration of this peak&apos;s real geography.
            </p>
          </div>
          <AvatarFigure
            avatarId={avatar.id}
            equipped={account.equippedAccessories}
            size="profile"
          />
        </section>
      </main>
    </ScreenFrame>
  );
}
