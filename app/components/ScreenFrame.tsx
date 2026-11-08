import type { ReactNode } from "react";
import styles from "./ScreenFrame.module.css";

type ScreenFrameProps = {
  children: ReactNode;
};

export function ScreenFrame({ children }: ScreenFrameProps) {
  return <div className={styles.frame}>{children}</div>;
}
