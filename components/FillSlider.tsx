import styles from "./FillSlider.module.css";

type FillSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Text shown on the right, e.g. "42°". */
  display: string;
  onChange: (value: number) => void;
  ariaLabel?: string;
  compact?: boolean;
};

/**
 * A slider drawn as a filled bar: label on the left, value on the right,
 * the grey fill showing how far along it is. A real (invisible) range
 * input sits on top, so dragging, clicking and the arrow keys all work.
 */
export default function FillSlider({ label, value, min, max, display, onChange, ariaLabel, compact }: FillSliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <label className={`${styles.slider} ${compact ? styles.compact : ""}`}>
      <span className={styles.fill} style={{ width: `${percent}%` }} />
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{display}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={ariaLabel ?? label}
        aria-valuetext={display}
        className={styles.input}
      />
    </label>
  );
}
