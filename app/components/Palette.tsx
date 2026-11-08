import styles from "./Palette.module.css";

const swatches = [
  { name: "Forest green", token: "--forest" },
  { name: "Sky blue", token: "--sky" },
  { name: "Ice blue", token: "--ice" },
  { name: "Snow white", token: "--snow" },
  { name: "Rocky gray", token: "--rock" },
  { name: "Golden yellow", token: "--gold" },
  { name: "Orange red", token: "--hazard" },
] as const;

export function Palette() {
  return (
    <ul className={styles.list}>
      {swatches.map((swatch) => (
        <li key={swatch.token} className={styles.item}>
          <span
            className={styles.chip}
            style={{ background: `var(${swatch.token})` }}
            aria-hidden="true"
          />
          <span>{swatch.name}</span>
        </li>
      ))}
    </ul>
  );
}
