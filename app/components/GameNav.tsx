import styles from "./GameNav.module.css";

type GameNavItem = {
  href: string;
  label: string;
};

type GameNavProps = {
  brand: string;
  items: GameNavItem[];
};

export function GameNav({ brand, items }: GameNavProps) {
  return (
    <header className={styles.bar}>
      <a className={styles.brand} href="#top">
        {brand}
      </a>
      <nav aria-label="Theme sections">
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.href}>
              <a className={styles.link} href={item.href}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
