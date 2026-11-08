"use client";

import Image from "next/image";
import { useActiveAccount } from "../lib/accounts";
import { avatarById } from "../lib/avatars";
import {
  isMountainId,
  isMountainUnlocked,
  mountainById,
  tasksCompleted,
} from "../lib/mountains";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./MountainSelect.module.css";

type ClimbPlaceholderProps = {
  mountainId: string;
};

export function ClimbPlaceholder({ mountainId }: ClimbPlaceholderProps) {
  const account = useActiveAccount();
  const mountain = isMountainId(mountainId) ? mountainById(mountainId) : null;
  const unlocked = mountain
    ? isMountainUnlocked(account?.progress.mountainTasks, mountain.id)
    : false;
  const avatar = avatarById(account?.avatarId);

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <section className={styles.detail}>
          {!mountain ? (
            <div className={styles.copy}>
              <h1>Unknown mountain</h1>
              <GameButton href="/mountains">Back to mountains</GameButton>
            </div>
          ) : !unlocked ? (
            <div className={styles.copy}>
              <h1>{mountain.name} is locked</h1>
              <p>This climb cannot be entered until the previous mountain is finished.</p>
              <GameButton href="/mountains">Back to mountains</GameButton>
            </div>
          ) : (
            <>
              <div className={styles.hero}>
                <Image src={mountain.src} alt="" fill sizes="(max-width: 720px) 100vw, 640px" />
              </div>
              <div className={styles.copy}>
                <p className={styles.eyebrow}>Phase 4 placeholder</p>
                <h1>{mountain.name}</h1>
                <p>
                  {tasksCompleted(account?.progress.mountainTasks, mountain.id)} of{" "}
                  {mountain.tasks} tasks are saved. The climb, timer, and task
                  completion are not built yet, so this mountain does not advance.
                </p>
                <GameButton href="/mountains">Back to mountains</GameButton>
              </div>
              {avatar ? (
                <AvatarFigure
                  avatarId={avatar.id}
                  equipped={account?.equippedAccessories}
                  size="profile"
                />
              ) : null}
            </>
          )}
        </section>
      </main>
    </ScreenFrame>
  );
}
