"use client";

import { updateActiveAccount, useActiveAccount } from "../lib/accounts";
import {
  ACCESSORIES,
  AVATARS,
  accessoriesFor,
  avatarById,
  toggleEquipped,
} from "../lib/avatars";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./ProfileScreen.module.css";

export function ProfileScreen() {
  const account = useActiveAccount();
  const avatar = avatarById(account?.avatarId);
  const owned = account?.ownedAccessories ?? [];
  const equipped = account?.equippedAccessories ?? [];
  const ownedItems = ACCESSORIES.filter((item) => owned.includes(item.id));

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <GameCard title="Profile">
          {!account ? (
            <p>Log in to see the avatar saved with your account.</p>
          ) : (
            <div className={styles.chosen}>
              {avatar ? (
                <AvatarFigure
                  avatarId={avatar.id}
                  equipped={equipped}
                  size="profile"
                />
              ) : null}
              <p>
                Username: <strong>{account.username}</strong>
              </p>
              <p>
                Summit Coins: <strong>{account.coins.toLocaleString("en-US")}</strong>
              </p>
              <p>
                Avatar: <strong>{avatar?.label ?? "none yet"}</strong>
              </p>
              <p>
                {accessoriesFor(equipped).length > 0
                  ? `Equipped: ${accessoriesFor(equipped).map((item) => item.name).join(", ")}`
                  : "Basic mountaineer outfit."}
              </p>
              <div className={styles.row}>
                {AVATARS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={account.avatarId === option.id ? styles.on : styles.off}
                    onClick={() => updateActiveAccount({ avatarId: option.id })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <GameButton href="/play?change=1">Change avatar</GameButton>
              <GameButton href="/shop" variant="secondary">Open shop</GameButton>
            </div>
          )}
        </GameCard>

        {account ? (
          <GameCard title="Owned accessories">
            {ownedItems.length === 0 ? (
              <p>No accessories owned yet. Buy gear in the shop or find a crate on the trail.</p>
            ) : (
              <ul className={styles.list}>
                {ownedItems.map((item) => (
                  <li key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      {" · "}
                      {item.detail}
                    </span>
                    <button
                      type="button"
                      className={equipped.includes(item.id) ? styles.on : styles.off}
                      onClick={() =>
                        updateActiveAccount({
                          equippedAccessories: toggleEquipped(owned, equipped, item.id),
                        })
                      }
                    >
                      {equipped.includes(item.id) ? "Unequip" : "Equip"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </GameCard>
        ) : null}
      </main>
    </ScreenFrame>
  );
}
