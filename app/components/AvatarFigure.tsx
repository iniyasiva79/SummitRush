import Image from "next/image";
import {
  accessoriesFor,
  avatarById,
  type AvatarId,
} from "../lib/avatars";
import styles from "./AvatarFigure.module.css";

type AvatarFigureProps = {
  avatarId: AvatarId;
  equipped?: string[];
  size?: "card" | "profile" | "trail";
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
  const gear = accessoriesFor(equipped);

  return (
    <div className={size === "profile" ? styles.profile : size === "trail" ? styles.trail : styles.card}>
      <Image
        src={avatar.src}
        alt=""
        fill
        sizes="(max-width: 720px) 90vw, 360px"
      />
      {gear.map((item) => (
        <span
          key={item.id}
          className={item.slot === "head" ? styles.head : styles.face}
        >
          <Image src={item.src} alt="" fill sizes="120px" />
        </span>
      ))}
      {gear.length > 0 ? (
        <p className={styles.gearList}>
          {gear.map((item) => item.name).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
