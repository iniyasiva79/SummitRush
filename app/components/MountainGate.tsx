"use client";

import { useActiveAccount } from "../lib/accounts";
import { avatarById } from "../lib/avatars";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./ProfileScreen.module.css";

export function MountainGate() {
  const account = useActiveAccount();
  const avatar = avatarById(account?.avatarId);

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <GameCard eyebrow="Next" title="Mountain selection">
          {avatar ? (
            <div className={styles.chosen}>
              <AvatarFigure
                avatarId={avatar.id}
                equipped={account?.equippedAccessories}
                size="profile"
              />
              <p>
                {avatar.label} is saved
                {account ? ` for ${account.username}` : ""}. The mountain
                chooser is not built yet.
              </p>
              <GameButton href="/play?change=1" variant="secondary">
                Change avatar
              </GameButton>
            </div>
          ) : (
            <div className={styles.chosen}>
              <p>Choose an avatar before the mountains open.</p>
              <GameButton href="/play">Choose avatar</GameButton>
            </div>
          )}
        </GameCard>
      </main>
    </ScreenFrame>
  );
}
