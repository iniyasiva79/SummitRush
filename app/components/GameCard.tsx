import type { ReactNode } from "react";
import styles from "./GameCard.module.css";

type GameCardProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
};

export function GameCard({ id, eyebrow, title, children }: GameCardProps) {
  return (
    <section id={id} className={styles.card}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h2>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
