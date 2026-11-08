import Image from "next/image";
import type { ChaosCardId } from "../lib/chaos";
import { trailPoint } from "../lib/gameplay";
import styles from "./ChaosScenery.module.css";

const ROCKS = [
  { start: "22%", endX: "36%", endY: "58%", delay: "0ms", size: 54 },
  { start: "38%", endX: "44%", endY: "66%", delay: "90ms", size: 42 },
  { start: "51%", endX: "49%", endY: "74%", delay: "40ms", size: 62 },
  { start: "63%", endX: "58%", endY: "61%", delay: "150ms", size: 48 },
  { start: "74%", endX: "67%", endY: "72%", delay: "70ms", size: 36 },
];

export function ChaosScenery({
  card,
  fraction,
}: {
  card: ChaosCardId;
  fraction: number;
}) {
  if (card === "boulder-breakdown") {
    const point = trailPoint(Math.min(0.9, Math.max(0.18, fraction + 0.08)));
    return (
      <span
        className={styles.boulder}
        style={{ ["--x" as string]: point.left, ["--y" as string]: point.bottom }}
        aria-hidden="true"
      >
        <Image src="/chaos/boulder.png" alt="" fill sizes="140px" />
      </span>
    );
  }
  if (card === "rockslide") {
    return (
      <div className={styles.slide} aria-hidden="true">
        {ROCKS.map((rock) => (
          <span
            key={`${rock.start}-${rock.delay}`}
            style={{
              ["--start" as string]: rock.start,
              ["--end-x" as string]: rock.endX,
              ["--end-y" as string]: rock.endY,
              ["--delay" as string]: rock.delay,
              ["--size" as string]: `${rock.size}px`,
            }}
          >
            <Image src="/chaos/rocks.png" alt="" fill sizes="80px" />
          </span>
        ))}
      </div>
    );
  }
  const point = trailPoint(Math.min(0.86, Math.max(0.16, fraction + 0.04)));
  return (
    <span
      className={styles.crate}
      style={{ ["--x" as string]: point.left, ["--y" as string]: point.bottom }}
      aria-hidden="true"
    >
      <Image src="/chaos/crate.png" alt="" fill sizes="90px" />
      <span className={styles.dust} />
    </span>
  );
}
