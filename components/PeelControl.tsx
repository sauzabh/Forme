import styles from "./PeelControl.module.css";

export type Layer = "skin" | "bone";

type PeelControlProps = {
  layer: Layer;
  onLayerChange: (layer: Layer) => void;
  boneAvailable: boolean;
};

/**
 * Anatomy layers. Skin and Bone are real; Bone needs a figure with a fitted
 * skeleton (currently the realistic male). Muscle is shown — but clearly
 * unavailable — so the roadmap is visible without pretending it works.
 */
export default function PeelControl({ layer, onLayerChange, boneAvailable }: PeelControlProps) {
  const items: { id: Layer | "muscle"; label: string; available: boolean; note?: string; hint?: string }[] = [
    { id: "skin", label: "Skin", available: true },
    { id: "muscle", label: "Muscle", available: false, note: "Soon", hint: "Muscle layer arrives with the full anatomy model" },
    {
      id: "bone",
      label: "Bone",
      available: boneAvailable,
      note: boneAvailable ? undefined : "Male",
      hint: boneAvailable ? "Show the skeleton" : "The skeleton is fitted to the realistic male figure",
    },
  ];

  return (
    <div className={styles.rail} role="radiogroup" aria-label="Anatomy layer">
      <span className={`text-meta ${styles.heading}`}>Layer</span>
      {items.map((item) => {
        const active = item.available && item.id === layer;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!item.available}
            title={item.hint}
            className={`${styles.item} ${active ? styles.active : ""}`}
            onClick={() => item.id !== "muscle" && onLayerChange(item.id)}
          >
            <span className={styles.dot} />
            <span className={styles.label}>{item.label}</span>
            {item.note && <span className={styles.note}>{item.note}</span>}
          </button>
        );
      })}
    </div>
  );
}
