import { VIEWS, type ViewId } from "@/lib/camera";
import styles from "./CameraControl.module.css";

type CameraControlProps = {
  view: ViewId | null;
  onViewChange: (view: ViewId) => void;
  lightOpen: boolean;
  onToggleLight: () => void;
  /** Hair and clothing; left out where they don't apply (Study). */
  appearanceOpen?: boolean;
  onToggleAppearance?: () => void;
};

/**
 * Top-down diagram for a camera view: the figure in the middle facing
 * down (its front), and a dot where the camera stands. Same language as
 * the light dial, so "where am I looking from" reads at a glance.
 */
function ViewIcon({ azimuth }: { azimuth: number }) {
  const a = (azimuth * Math.PI) / 180;
  const cx = 14 + Math.sin(a) * 11;
  const cy = 14 + Math.cos(a) * 11;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className={styles.icon}>
      <circle cx="14" cy="14" r="11" className={styles.orbit} />
      {/* Figure seen from above: shoulders, head, and a nose pointing to its front. */}
      <rect x="7.5" y="12" width="13" height="4" rx="2" className={styles.shoulders} />
      <circle cx="14" cy="14" r="3" className={styles.head} />
      <circle cx="14" cy="18.2" r="1" className={styles.head} />
      <line x1={cx} y1={cy} x2="14" y2="14" className={styles.sight} />
      <circle cx={cx} cy={cy} r="3" className={styles.camera} />
    </svg>
  );
}

/**
 * The right-hand controls: a vertical pill of camera views, and below it
 * round buttons that open the Light and Appearance panels.
 * `view` is null after free orbiting, so nothing stays highlighted once the
 * camera has been moved by hand.
 */
export default function CameraControl({
  view,
  onViewChange,
  lightOpen,
  onToggleLight,
  appearanceOpen = false,
  onToggleAppearance,
}: CameraControlProps) {
  return (
    <div className={styles.dock}>
      <div className={styles.pill} role="group" aria-label="Camera view">
        {VIEWS.map((v) => {
          const active = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              className={`${styles.view} ${active ? styles.active : ""}`}
              aria-pressed={active}
              aria-label={v.name}
              title={`${v.name} (${v.shortcut})`}
              onClick={() => onViewChange(v.id)}
            >
              <ViewIcon azimuth={v.azimuth} />
              <span className={styles.label}>{v.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={`${styles.light} ${lightOpen ? styles.lightOn : ""}`}
        aria-pressed={lightOpen}
        aria-expanded={lightOpen}
        aria-label="Light controls"
        title={lightOpen ? "Hide light controls (L)" : "Light controls (L)"}
        onClick={onToggleLight}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </svg>
      </button>

      {onToggleAppearance && (
        <button
          type="button"
          className={`${styles.light} ${appearanceOpen ? styles.lightOn : ""}`}
          aria-pressed={appearanceOpen}
          aria-expanded={appearanceOpen}
          aria-label="Hair and clothes"
          title={appearanceOpen ? "Hide hair and clothes (A)" : "Hair and clothes (A)"}
          onClick={onToggleAppearance}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4 4 6.5 2.5 11l3 1.2L7 10v10h10V10l1.5 2.2 3-1.2L20 6.5 15 4c-.5 1.5-1.6 2.3-3 2.3S9.5 5.5 9 4Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
