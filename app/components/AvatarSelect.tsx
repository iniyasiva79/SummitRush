"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { updateActiveAccount, useActiveAccount } from "../lib/accounts";
import { AVATARS, type AvatarId } from "../lib/avatars";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./AvatarSelect.module.css";

export function AvatarSelect() {
  const account = useActiveAccount();
  const params = useSearchParams();
  const router = useRouter();
  const changing = params.get("change") === "1";
  const [choice, setChoice] = useState<AvatarId | null>(null);
  const [notice, setNotice] = useState("");
  const selected = choice ?? account?.avatarId ?? null;

  useEffect(() => {
    if (account?.avatarId && !changing) {
      router.replace("/mountains");
    }
  }, [account?.avatarId, changing, router]);

  function confirm() {
    if (!selected) {
      setNotice("Choose an avatar first.");
      return;
    }
    if (!account) {
      setNotice("Log in so this avatar is saved to your account.");
      return;
    }
    updateActiveAccount({ avatarId: selected });
    router.push("/mountains");
  }

  return (
    <ScreenFrame scene="terrain">
      <SummitBar />
      <main className={styles.main}>
        <h1>Choose your mountaineer</h1>
        <p className={styles.lead}>
          Pick one starter avatar. The basic outfit is what you begin with.
          Accessories you buy later appear on this character.
        </p>
        <div className={styles.grid}>
          {AVATARS.map((avatar) => {
            const isSelected = selected === avatar.id;
            return (
              <button
                key={avatar.id}
                type="button"
                className={isSelected ? `${styles.card} ${styles.selected}` : styles.card}
                aria-pressed={isSelected}
                onClick={() => {
                  setChoice(avatar.id);
                  setNotice("");
                }}
              >
                <AvatarFigure
                  avatarId={avatar.id}
                  equipped={isSelected ? account?.equippedAccessories : []}
                />
                <span className={styles.label}>{avatar.label}</span>
                <span className={styles.detail}>{avatar.detail}</span>
              </button>
            );
          })}
        </div>
        {notice ? (
          <p className={styles.notice} role="alert">
            {notice}
          </p>
        ) : null}
        <div className={styles.actions}>
          <GameButton onClick={confirm}>Confirm Selection</GameButton>
          {!account ? (
            <Link href="/login">Log in to save this avatar</Link>
          ) : null}
        </div>
      </main>
    </ScreenFrame>
  );
}
