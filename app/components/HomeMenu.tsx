import { GameButton } from "./GameButton";
import styles from "../page.module.css";

export function HomeMenu() {
  return (
    <div className={styles.menu}>
      <div className={styles.authRow}>
        <GameButton href="/login" className={styles.authButton}>
          Log In
        </GameButton>
        <GameButton
          href="/signup"
          variant="secondary"
          className={styles.authButton}
        >
          Sign Up
        </GameButton>
      </div>
      <GameButton href="/play" className={styles.menuButton}>
        Play
      </GameButton>
      <GameButton href="/room" variant="secondary" className={styles.menuButton}>
        Private Room
      </GameButton>
    </div>
  );
}
