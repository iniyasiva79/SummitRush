import { GameButton } from "./components/GameButton";
import { GameCard } from "./components/GameCard";
import { Palette } from "./components/Palette";
import { ScreenFrame } from "./components/ScreenFrame";
import { SummitBar } from "./components/SummitBar";
import styles from "./page.module.css";

const themeSections = [
  { href: "#palette", label: "Palette" },
  { href: "#buttons", label: "Buttons" },
  { href: "#cards", label: "Cards" },
];

export default function Home() {
  return (
    <ScreenFrame>
      <SummitBar themeLinks={themeSections} />
      <main id="top" className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.kicker}>Visual theme</p>
          <h1>SummitRush</h1>
          <p className={styles.tagline}>
            Bet on yourself. Conquer your goals. Reach the summit.
          </p>
        </header>
        <div className={styles.grid}>
          <GameCard id="buttons" eyebrow="Controls" title="Trail buttons">
            <div className={styles.actions}>
              <GameButton variant="primary">Onward</GameButton>
              <GameButton variant="secondary">Rest</GameButton>
              <GameButton variant="gold">Coins</GameButton>
              <GameButton variant="hazard">Danger</GameButton>
            </div>
          </GameCard>
          <GameCard id="cards" eyebrow="Panels" title="Base camp card">
            <p>
              Snow panels, rocky ink outlines, and hard comic shadows are ready
              for later screens.
            </p>
          </GameCard>
        </div>
        <GameCard id="palette" eyebrow="Colors" title="Mountain palette">
          <Palette />
        </GameCard>
      </main>
    </ScreenFrame>
  );
}
