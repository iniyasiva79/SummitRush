import styles from "./MountainBackdrop.module.css";

type MountainBackdropProps = {
  scene?: "summit" | "terrain";
};

export function MountainBackdrop({ scene = "summit" }: MountainBackdropProps) {
  return (
    <div className={scene === "terrain" ? `${styles.scene} ${styles.terrain}` : styles.scene}>
      <p className={styles.srOnly}>
        {scene === "terrain"
          ? "Rocky ground and a turquoise stream, with pines and distant snowy ridges."
          : "An original illustrated mountain range with snowy peaks, rocky cliffs, evergreen forest, and a golden meadow under a turquoise and pink sky."}
      </p>
      <div className={styles.light} />
      <svg
        className={styles.clouds}
        viewBox="0 0 1200 360"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="cloud-blur">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <g className={styles.cloudNear} filter="url(#cloud-blur)">
          <Cloud x={80} y={70} scale={1} />
          <Cloud x={430} y={40} scale={1.25} />
          <Cloud x={820} y={90} scale={0.9} />
          <Cloud x={1100} y={48} scale={1.15} />
        </g>
        <g className={styles.cloudFar} filter="url(#cloud-blur)">
          <Cloud x={180} y={150} scale={0.7} />
          <Cloud x={560} y={130} scale={0.85} />
          <Cloud x={940} y={160} scale={0.65} />
        </g>
      </svg>
      <div className={styles.mist} />
    </div>
  );
}

function Cloud({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#fff6ee" opacity="0.42">
      <ellipse cx="0" cy="18" rx="78" ry="26" />
      <ellipse cx="-34" cy="10" rx="36" ry="24" />
      <ellipse cx="28" cy="6" rx="42" ry="28" />
      <ellipse cx="8" cy="-8" rx="28" ry="20" />
    </g>
  );
}
