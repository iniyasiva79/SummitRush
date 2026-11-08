import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./GameButton.module.css";

type GameButtonVariant = "primary" | "secondary" | "gold" | "hazard";

type GameButtonProps = {
  variant?: GameButtonVariant;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function GameButton({
  variant = "primary",
  className,
  type = "button",
  children,
  ...props
}: GameButtonProps) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
