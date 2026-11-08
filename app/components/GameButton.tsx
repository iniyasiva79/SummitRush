import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./GameButton.module.css";

type GameButtonVariant = "primary" | "secondary" | "gold" | "hazard";

type GameButtonProps = {
  variant?: GameButtonVariant;
  href?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function GameButton({
  variant = "primary",
  className,
  type = "button",
  href,
  children,
  ...props
}: GameButtonProps) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
