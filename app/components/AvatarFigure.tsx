import Image from "next/image";
import {
  avatarById,
  wearablesFor,
  type AvatarId,
} from "../lib/avatars";
import styles from "./AvatarFigure.module.css";

type AvatarFigureProps = {
  avatarId: AvatarId;
  equipped?: string[];
  size?: "card" | "profile" | "trail";
};

const SLOT_CLASS: Record<string, string> = {
  head: styles.head,
  face: styles.face,
  pack: styles.pack,
  boots: styles.boots,
};

const ITEM_CLASS: Record<string, string> = {
  beanie: styles.beanie,
  glasses: styles.glasses,
  helmet: styles.helmet,
  backpack: styles.backpack,
};

export function AvatarFigure({
  avatarId,
  equipped = [],
  size = "card",
}: AvatarFigureProps) {
  const avatar = avatarById(avatarId);
  if (!avatar) {
    return null;
  }
  const gear = wearablesFor(equipped);

  return (
    <div
      className={`${size === "profile" ? styles.profile : size === "trail" ? styles.trail : styles.card} ${styles[avatarId]}`}
    >
      <Image
        src={size === "trail" ? avatar.trailSrc : avatar.src}
        alt=""
        fill
        sizes={size === "trail" ? "96px" : "(max-width: 720px) 90vw, 360px"}
      />
      {gear.map((item) => (
        <span
          key={item.id}
          className={`${styles.wear} ${SLOT_CLASS[item.slot] ?? ""} ${ITEM_CLASS[item.id] ?? ""}`}
        >
          <Image src={item.overlaySrc ?? item.src} alt="" fill sizes="160px" />
        </span>
      ))}
    </div>
  );
}
