import type { ReactNode } from "react";
import { MountainBackdrop } from "./MountainBackdrop";
import styles from "./ScreenFrame.module.css";

type ScreenFrameProps = {
  children: ReactNode;
};

export function ScreenFrame({ children }: ScreenFrameProps) {
  return (
    <div className={styles.frame}>
      <MountainBackdrop />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
