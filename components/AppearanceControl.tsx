import { CLOTHING_OPTIONS, HAIR_STYLES, hairStyleFor, type Appearance, type PosableId } from "@/lib/appearance";
import styles from "./AppearanceControl.module.css";

type AppearanceControlProps = {
  figure: PosableId;
  appearance: Appearance;
  /** Changes to merge into the current appearance. */
  onChange: (change: Partial<Appearance>) => void;
  onClose: () => void;
};

/**
 * Optional hair and clothing, opened from the dock's Appearance button.
 * Everything is off by default; the bare figure stays the reference.
 */
export default function AppearanceControl({ figure, appearance, onChange, onClose }: AppearanceControlProps) {
  const style = hairStyleFor(appearance, figure);
  const clothing = CLOTHING_OPTIONS.find((c) => c.id === appearance.clothing) ?? CLOTHING_OPTIONS[0];

  return (
    <section className={`panel ${styles.panel}`} aria-label="Appearance">
      <header className={styles.header}>
        <span className={styles.title}>Appearance</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close appearance" title="Close (A)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className={styles.group}>
        <button
          type="button"
          role="switch"
          aria-checked={appearance.hair}
          className={styles.toggleRow}
          onClick={() => onChange({ hair: !appearance.hair })}
        >
          <span className={styles.label}>Hair</span>
          <span className={`${styles.switch} ${appearance.hair ? styles.switchOn : ""}`}>
            <span className={styles.knob} />
          </span>
        </button>
        {appearance.hair && (
          <div className={styles.chips} role="radiogroup" aria-label="Hairstyle">
            {HAIR_STYLES[figure].map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.id === style.id}
                className={option.id === style.id ? "chip chip-active" : "chip"}
                onClick={() => onChange({ hairStyle: { ...appearance.hairStyle, [figure]: option.id } })}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <hr className="divider" />

      <div className={styles.group}>
        <span className={styles.label}>Clothes</span>
        <div className={styles.grid} role="radiogroup" aria-label="Clothes">
          {CLOTHING_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={option.id === appearance.clothing}
              className={`${styles.option} ${option.id === appearance.clothing ? styles.optionActive : ""}`}
              onClick={() => onChange({ clothing: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className={styles.detail}>{clothing.detail}</span>
      </div>
    </section>
  );
}
