"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { readActiveAccount, updateActiveAccount, useActiveAccount } from "../lib/accounts";
import {
  ACCESSORIES,
  AVATARS,
  accessoriesFor,
  toggleEquipped,
  type Accessory,
  type ShopCategory,
} from "../lib/avatars";
import { buyAccessory } from "../lib/shop";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { GameOverlay } from "./GameOverlay";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./ShopScreen.module.css";

const TABS: { id: ShopCategory; label: string }[] = [
  { id: "gear", label: "Climbing gear" },
  { id: "effects", label: "Cosmetic effects" },
  { id: "avatars", label: "Avatars" },
];

export function ShopScreen() {
  const account = useActiveAccount();
  const [tab, setTab] = useState<ShopCategory>("gear");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<Accessory | null>(null);
  const buying = useRef(false);
  const titleId = useId();
  const owned = account?.ownedAccessories ?? [];
  const equipped = account?.equippedAccessories ?? [];
  const items = ACCESSORIES.filter((item) => item.category === tab);

  function buy(item: Accessory) {
    if (buying.current || confirm) {
      return;
    }
    const current = readActiveAccount();
    if (!current) {
      setNotice("Log in to spend Summit Coins on this account.");
      return;
    }
    const result = buyAccessory(current.coins, current.ownedAccessories, item.id);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    buying.current = true;
    updateActiveAccount({
      coins: result.coins,
      ownedAccessories: result.owned,
    });
    setConfirm(result.item);
    setNotice("");
  }

  function wear(itemId: string) {
    if (!account) {
      return;
    }
    updateActiveAccount({
      equippedAccessories: toggleEquipped(owned, equipped, itemId),
    });
  }

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <header className={styles.head}>
          <p className={styles.kicker}>Summit Shop</p>
          <h1>Outfit the climb</h1>
          <p>
            Spend Summit Coins on hats, helmets, packs, boots, and trail effects.
            Starter avatars stay with this account. Purchases are saved here and
            can be equipped from Profile.
          </p>
          <p className={styles.balance} aria-live="polite">
            {account
              ? `Balance: ${account.coins.toLocaleString("en-US")} Summit Coins`
              : "Log in to spend your Summit Coins"}
          </p>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Shop categories">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? styles.tabOn : styles.tab}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {notice ? <p className={styles.notice} role="alert">{notice}</p> : null}

        {tab === "avatars" ? (
          <section className={styles.avatars}>
            <p>Both starter mountaineers are included. Changing avatars keeps owned gear.</p>
            <div className={styles.grid}>
              {AVATARS.map((avatar) => (
                <article key={avatar.id} className={styles.card}>
                  <AvatarFigure avatarId={avatar.id} equipped={equipped} />
                  <h2>{avatar.label}</h2>
                  <p>{avatar.detail}</p>
                  <p className={styles.owned}>Included</p>
                  {account?.avatarId === avatar.id ? (
                    <p>Currently selected.</p>
                  ) : account ? (
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => updateActiveAccount({ avatarId: avatar.id })}
                    >
                      Use this avatar
                    </button>
                  ) : (
                    <GameButton href="/login">Log in</GameButton>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.grid}>
            {items.map((item) => {
              const isOwned = owned.includes(item.id);
              const isOn = equipped.includes(item.id);
              return (
                <article key={item.id} className={styles.card}>
                  <div className={styles.preview}>
                    <Image src={item.src} alt="" fill sizes="280px" />
                  </div>
                  <h2>{item.name}</h2>
                  <p>{item.detail}</p>
                  <p className={styles.price}>
                    {isOwned ? "Owned" : `${item.price.toLocaleString("en-US")} Summit Coins`}
                  </p>
                  {isOwned ? (
                    <button type="button" className={styles.secondary} onClick={() => wear(item.id)}>
                      {isOn ? "Unequip" : "Equip"}
                    </button>
                  ) : (
                    <button type="button" className={styles.primary} onClick={() => buy(item)}>
                      Buy
                    </button>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {account?.avatarId ? (
          <aside className={styles.previewRow}>
            <h2>Preview</h2>
            <AvatarFigure
              avatarId={account.avatarId}
              equipped={equipped}
              size="profile"
            />
            <p>
              {accessoriesFor(equipped).length > 0
                ? accessoriesFor(equipped).map((item) => item.name).join(", ")
                : "Basic mountaineer outfit."}
            </p>
          </aside>
        ) : null}

        {confirm ? (
          <GameOverlay labelledBy={titleId} size="card">
            <h2 id={titleId}>{confirm.name} purchased</h2>
            <p>
              {confirm.price.toLocaleString("en-US")} Summit Coins were deducted once.
              The item is owned on this account. Equip it here or on Profile.
            </p>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                buying.current = false;
                setConfirm(null);
              }}
            >
              Continue
            </button>
          </GameOverlay>
        ) : null}
      </main>
    </ScreenFrame>
  );
}
