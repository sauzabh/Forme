import styles from "./ModeSwitcher.module.css";

export type Mode = "pose" | "study" | "drill";

const MODES: { key: Mode; label: string }[] = [
  { key: "pose", label: "Pose" },
  { key: "study", label: "Study" },
  { key: "drill", label: "Drill" },
];

type ModeSwitcherProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

/**
 * The Pose / Study / Drill switcher. Clicking a tab tells Studio (via
 * onModeChange) to change the active mode — Studio owns the actual
 * state, this component just displays it and reports clicks.
 */
export default function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className={styles.track}>
      {MODES.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.key === mode ? `${styles.tab} ${styles.active}` : styles.tab}
          onClick={() => onModeChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
