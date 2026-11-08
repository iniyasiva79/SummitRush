import styles from "./MountainBackdrop.module.css";

/**
 * Original comic illustration of Mount Fuji seen from the north across
 * Lake Kawaguchi. The photographs below were references only and are not
 * shipped in the app.
 *
 * - NASA / ISS Expedition 19, photograph ISS019-E-5286, 8 April 2009.
 *   Public domain (U.S. government work).
 *   https://science.nasa.gov/earth/earth-observatory/mount-fuji-japan-39099/
 * - Midori, "Lake Kawaguchiko Sakura Mount Fuji 3."
 *   Wikimedia Commons, CC BY 3.0.
 *   https://commons.wikimedia.org/wiki/File:Lake_Kawaguchiko_Sakura_Mount_Fuji_3.JPG
 */
export function MountainBackdrop() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <svg
        className={styles.land}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          className={styles.haze}
          d="M0 560 C220 500 420 470 640 468 C860 466 1080 500 1440 560 L1440 700 L0 700 Z"
        />
        <path
          className={styles.scoria}
          d="M180 520 C360 430 540 360 690 300 L820 312 C980 370 1180 450 1380 530 L1440 560 L1440 690 L0 690 L0 560 C60 540 110 532 180 520 Z"
        />
        <path
          className={styles.forest}
          d="M0 690 L0 600 C200 560 380 530 560 520 L900 528 C1120 548 1300 590 1440 640 L1440 760 L0 760 Z"
        />
        <path
          className={styles.forestShade}
          d="M860 340 C980 400 1140 470 1320 540 L1220 590 C1040 520 920 470 820 430 Z"
        />
        <path
          className={styles.snow}
          d="M430 455 C500 400 590 300 660 200 C700 140 728 100 748 74 L828 74 C852 108 890 170 950 250 C1020 340 1100 400 1200 455 L1130 488 C980 450 820 446 680 470 C560 486 480 478 430 455 Z"
        />
        <path className={styles.gully} d="M790 84 C820 150 848 220 890 300" />
        <path className={styles.gullySoft} d="M774 92 C742 160 710 230 668 310" />
        <path className={styles.shore} d="M0 742 H1440 V778 H0 Z" />
        <path className={styles.lake} d="M0 768 H1440 V900 H0 Z" />
        <path className={styles.reflection} d="M700 786 C736 812 790 812 826 786" />
        <g className={styles.blossom} transform="translate(48 700)">
          <path d="M28 78 C30 46 52 28 54 8" />
          <circle cx="22" cy="22" r="16" />
          <circle cx="50" cy="10" r="18" />
          <circle cx="66" cy="32" r="13" />
        </g>
        <g className={styles.blossom} transform="translate(1240 692)">
          <path d="M64 84 C52 48 34 28 18 6" />
          <circle cx="22" cy="18" r="17" />
          <circle cx="50" cy="10" r="15" />
          <circle cx="68" cy="34" r="14" />
        </g>
        <g className={styles.cloudFar}>
          <ellipse cx="180" cy="150" rx="54" ry="24" />
          <ellipse cx="214" cy="138" rx="36" ry="22" />
          <ellipse cx="146" cy="142" rx="30" ry="18" />
        </g>
        <g className={styles.cloudNear}>
          <ellipse cx="1240" cy="210" rx="62" ry="26" />
          <ellipse cx="1284" cy="194" rx="40" ry="24" />
          <ellipse cx="1198" cy="198" rx="34" ry="20" />
        </g>
      </svg>
      <div className={styles.light} />
      <div className={`${styles.cloud} ${styles.cloudFar}`} />
      <div className={`${styles.cloud} ${styles.cloudNear}`} />
    </div>
  );
}
