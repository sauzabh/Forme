import { VIEWS, type ViewId } from "@/lib/camera";
import styles from "./CameraControl.module.css";

type CameraControlProps = {
  view: ViewId | null;
  onViewChange: (view: ViewId) => void;
  lightOpen: boolean;
  onToggleLight: () => void;
};

/**
 * The right-hand toolbar: camera views, then the Light button that opens
 * and closes the lighting panel. `view` is null after free orbiting, so no
 * view button stays highlighted once the camera has been moved by hand.
 */
export default function CameraControl({ view, onViewChange, lightOpen, onToggleLight }: CameraControlProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.group} role="group" aria-label="Camera view">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`${styles.button} ${v.id === view ? styles.active : ""}`}
            aria-pressed={v.id === view}
            title={`${v.name} (${v.shortcut})`}
            onClick={() => onViewChange(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      <button
        type="button"
        className={`${styles.button} ${styles.lightButton} ${lightOpen ? styles.active : ""}`}
        aria-pressed={lightOpen}
        aria-expanded={lightOpen}
        title={lightOpen ? "Hide light controls (L)" : "Show light controls (L)"}
        onClick={onToggleLight}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </svg>
        <span>Light</span>
      </button>
    </div>
  );
}
