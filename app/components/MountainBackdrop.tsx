import styles from "./MountainBackdrop.module.css";

export function MountainBackdrop() {
  return (
    <div className={styles.scene}>
      <div className={styles.shade} />
      <p className={styles.credit}>
        Mount Fuji at Lake Kawaguchi, with its snow cap, forested slopes, and
        cherry blossoms. Photo by Midori, resized for the web.{" "}
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          rel="license noopener noreferrer"
          target="_blank"
        >
          CC BY 3.0
        </a>
        .{" "}
        <a
          href="https://commons.wikimedia.org/wiki/File:Lake_Kawaguchiko_Sakura_Mount_Fuji_3.JPG"
          rel="noopener noreferrer"
          target="_blank"
        >
          Source
        </a>
      </p>
    </div>
  );
}
