import { useEffect, useState } from "react";
import styles from "./TickSlider.module.css";

type TickSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Text shown on the right, e.g. "53". */
  display: string;
  onChange: (value: number) => void;
  ariaLabel?: string;
  /** Number of tick marks drawn along the track. */
  ticks?: number;
};

/**
 * A slider drawn as a row of tick marks: dark up to the value, light after
 * it. A real (invisible) range input sits on top, so dragging, clicking
 * and the arrow keys all work. While held it swells slightly, so it feels
 * like something you grab and pull.
 */
export default function TickSlider({ label, value, min, max, display, onChange, ariaLabel, ticks = 48 }: TickSliderProps) {
  const [grabbing, setGrabbing] = useState(false);
  const filled = Math.round(((value - min) / (max - min)) * ticks);

  // Release wherever the pointer ends up, even outside the slider.
  useEffect(() => {
    if (!grabbing) return;
    // Keep the grabbing hand even if the pointer drifts off the slider.
    const root = document.documentElement;
    root.style.cursor = "grabbing";
    const release = () => setGrabbing(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      root.style.cursor = "";
    };
  }, [grabbing]);

  return (
    <div className={`${styles.slider} ${grabbing ? styles.grabbing : ""}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.track}>
        <div className={styles.ticks} aria-hidden="true">
          {Array.from({ length: ticks }, (_, i) => (
            <span key={i} className={i < filled ? `${styles.tick} ${styles.on}` : styles.tick} />
          ))}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          onPointerDown={() => setGrabbing(true)}
          aria-label={ariaLabel ?? label}
          aria-valuetext={display}
          className={styles.input}
        />
      </div>
      <span className={styles.value}>{display}</span>
    </div>
  );
}
