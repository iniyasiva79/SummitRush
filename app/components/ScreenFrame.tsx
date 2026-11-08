import type { ReactNode } from "react";
import { MountainBackdrop } from "./MountainBackdrop";
import styles from "./ScreenFrame.module.css";

type ScreenFrameProps = {
  children: ReactNode;
  scene?: "summit" | "terrain";
};

export function ScreenFrame({ children, scene = "summit" }: ScreenFrameProps) {
  return (
    <div className={styles.frame}>
      <MountainBackdrop scene={scene} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
