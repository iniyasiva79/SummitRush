"use client";

import { useActiveAccount } from "../lib/accounts";
import { avatarById } from "../lib/avatars";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./ProfileScreen.module.css";

export function ProfileScreen() {
  const account = useActiveAccount();
  const avatar = avatarById(account?.avatarId);

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <GameCard title="Profile">
          {!account ? (
            <p>Log in to see the avatar saved with your account.</p>
          ) : avatar ? (
            <div className={styles.chosen}>
              <AvatarFigure
                avatarId={avatar.id}
                equipped={account.equippedAccessories}
                size="profile"
              />
              <p>
                Username: <strong>{account.username}</strong>
              </p>
              <p>
                Avatar: <strong>{avatar.label}</strong>
              </p>
              <p>
                {account.equippedAccessories.length > 0
                  ? "Bought accessories are shown on this avatar."
                  : "Basic outfit. Bought accessories will appear here."}
              </p>
              <GameButton href="/play?change=1">Change avatar</GameButton>
            </div>
          ) : (
            <div className={styles.chosen}>
              <p>
                Username: <strong>{account.username}</strong>
              </p>
              <p>No avatar is saved for this account yet.</p>
              <GameButton href="/play">Choose avatar</GameButton>
            </div>
          )}
        </GameCard>
      </main>
    </ScreenFrame>
  );
}
