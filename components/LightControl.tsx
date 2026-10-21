"use client";

import { useRef } from "react";
import {
  ELEVATION_MAX,
  ELEVATION_MIN,
  LIGHT_PRESETS,
  matchingPreset,
  normalizeAngle,
  type Light,
} from "@/lib/lighting";
import FillSlider from "./FillSlider";
import styles from "./LightControl.module.css";

type LightControlProps = {
  light: Light;
  onChange: (light: Light) => void;
  onClose: () => void;
};

const DIAL_RADIUS = 56;

/**
 * The lighting panel, opened from the toolbar's Light button.
 * The dial is a top-down map of the room: the figure is in the middle
 * facing down ("Front"), and the dot is the lamp. Drag it around.
 */
export default function LightControl({ light, onChange, onClose }: LightControlProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const active = matchingPreset(light);

  function setAzimuthFromPointer(event: React.PointerEvent) {
    const rect = dialRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    onChange({ ...light, azimuth: Math.round((Math.atan2(dx, dy) * 180) / Math.PI) });
  }

  function onDialKey(event: React.KeyboardEvent) {
    const step = event.shiftKey ? 15 : 5;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange({ ...light, azimuth: normalizeAngle(light.azimuth - step) });
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange({ ...light, azimuth: normalizeAngle(light.azimuth + step) });
    }
  }

  const rad = (light.azimuth * Math.PI) / 180;
  const handleX = Math.sin(rad) * DIAL_RADIUS;
  const handleY = Math.cos(rad) * DIAL_RADIUS;

  return (
    <section className={`panel ${styles.panel}`} aria-label="Light">
      <header className={styles.header}>
        <span className={styles.title}>Light</span>
        <span className={styles.readout}>{active ? active.description : "Custom"}</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close light controls" title="Close (L)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div
        ref={dialRef}
        className={styles.dial}
        role="slider"
        tabIndex={0}
        aria-label="Light direction"
        aria-valuemin={-180}
        aria-valuemax={180}
        aria-valuenow={light.azimuth}
        aria-valuetext={`${Math.abs(light.azimuth)}° ${light.azimuth >= 0 ? "left" : "right"} of front`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setAzimuthFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) setAzimuthFromPointer(event);
        }}
        onKeyDown={onDialKey}
      >
        <div className={styles.ring} />
        <svg className={styles.ray} viewBox="-70 -70 140 140" aria-hidden="true">
          <line x1="0" y1="0" x2={handleX} y2={handleY} />
        </svg>
        <div className={styles.figure} />
        <div className={styles.handle} style={{ transform: `translate(${handleX}px, ${handleY}px)` }} />
        <span className={styles.front}>Front</span>
      </div>

      <FillSlider
        label="Height"
        min={ELEVATION_MIN}
        max={ELEVATION_MAX}
        value={light.elevation}
        display={`${light.elevation}°`}
        onChange={(elevation) => onChange({ ...light, elevation })}
        ariaLabel="Light height"
      />

      <div className={styles.presets} role="group" aria-label="Light presets">
        {LIGHT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            className={preset.id === active?.id ? "chip chip-active" : "chip"}
            onClick={() => onChange({ azimuth: preset.azimuth, elevation: preset.elevation })}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
