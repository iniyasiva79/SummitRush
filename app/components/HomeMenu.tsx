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
      <div className={styles.mode}>
        <GameButton href="/play" className={styles.menuButton}>
          PLAYER
        </GameButton>
        <p className={styles.modeNote}>
          1 Player — Complete tasks and climb mountains on your own.
        </p>
      </div>
      <div className={styles.mode}>
        <GameButton href="/room" variant="secondary" className={styles.menuButton}>
          PRIVATE ROOM
        </GameButton>
        <p className={styles.modeNote}>
          Multiplayer — Create or join a private room to compete with friends.
        </p>
      </div>
    </div>
  );
}
