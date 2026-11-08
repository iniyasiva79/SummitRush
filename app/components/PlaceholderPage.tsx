import Link from "next/link";
import { GameCard } from "./GameCard";
import { SavedName } from "./SavedName";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./PlaceholderPage.module.css";

type PlaceholderPageProps = {
  title: string;
  note: string;
};

export function PlaceholderPage({ title, note }: PlaceholderPageProps) {
  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <GameCard eyebrow="Temporary page" title={title}>
          <p>{note}</p>
          <SavedName />
          <Link className={styles.back} href="/">
            Back to SummitRush
          </Link>
        </GameCard>
      </main>
    </ScreenFrame>
  );
}
