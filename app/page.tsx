import { GameButton } from "./components/GameButton";
import { ScreenFrame } from "./components/ScreenFrame";
import { SummitBar } from "./components/SummitBar";
import styles from "./page.module.css";

export default function Home() {
  return (
    <ScreenFrame>
      <SummitBar />
      <main id="top" className={styles.main}>
        <header className={styles.hero}>
          <h1>SummitRush</h1>
          <p className={styles.tagline}>
            Bet on yourself. Conquer your goals. Reach the summit.
          </p>
        </header>
        <div className={styles.menu}>
          <GameButton href="/play" className={styles.menuButton}>
            Play
          </GameButton>
          <GameButton
            href="/room"
            variant="secondary"
            className={styles.menuButton}
          >
            Private Room
          </GameButton>
        </div>
      </main>
    </ScreenFrame>
  );
}
