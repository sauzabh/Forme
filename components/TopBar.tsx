import ModeSwitcher, { type Mode } from "./ModeSwitcher";
import styles from "./TopBar.module.css";

type TopBarProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onHideInterface: () => void;
};

/**
 * Wordmark, mode switcher, and the "hide interface" button. It floats over
 * the 3D canvas without a background of its own, so the studio reads as
 * one continuous space.
 */
export default function TopBar({ mode, onModeChange, onHideInterface }: TopBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.side}>
        <span className={styles.wordmark}>Figura</span>
      </div>

      <ModeSwitcher mode={mode} onModeChange={onModeChange} />

      <div className={`${styles.side} ${styles.right}`}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onHideInterface}
          title="Hide interface (Space)"
          aria-label="Hide interface"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
      </div>
    </header>
  );
}
