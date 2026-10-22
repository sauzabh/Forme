import { REGIONS, getRegion, type RegionId } from "@/lib/regions";
import styles from "./StudyPanel.module.css";

type StudyPanelProps = {
  region: RegionId | null;
  onRegionChange: (region: RegionId | null) => void;
};

/**
 * Study mode: pick a region and the camera moves in close to it. A short
 * note sits bottom-left. "Full figure" pulls back out.
 */
export default function StudyPanel({ region, onRegionChange }: StudyPanelProps) {
  const current = region ? getRegion(region) : null;

  return (
    <>
      <div className={`panel ${styles.note}`}>
        <span className="text-meta">{current ? "Studying" : "Study"}</span>
        <span className={styles.name}>{current ? current.name : "Pick a region"}</span>
        <p className="text-secondary">
          {current
            ? current.note
            : "Pick a part of the body below, or step through with ← →. Peel the layers with S, M and B."}
        </p>
      </div>

      <div className={styles.regions} role="group" aria-label="Study region">
        <button
          type="button"
          className={region === null ? "chip chip-active" : "chip"}
          aria-pressed={region === null}
          onClick={() => onRegionChange(null)}
        >
          Full figure
        </button>
        <span className={styles.separator} />
        {REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={r.id === region ? "chip chip-active" : "chip"}
            aria-pressed={r.id === region}
            onClick={() => onRegionChange(r.id)}
          >
            {r.name}
          </button>
        ))}
      </div>
    </>
  );
}
