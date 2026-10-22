import styles from "./PeelControl.module.css";

export type Layer = "skin" | "bone";

type PeelControlProps = {
  layer: Layer;
  onLayerChange: (layer: Layer) => void;
};

/**
 * Anatomy layers, peeled from the outside in. Skin uses the muscular figure
 * from Pose; Bone shows the skeleton inside the realistic anatomy figure.
 * Muscle is shown — but clearly unavailable — until a proper muscle model
 * is in. Keys: S, B.
 */
export default function PeelControl({ layer, onLayerChange }: PeelControlProps) {
  const items: { id: Layer | "muscle"; label: string; available: boolean; note?: string; hint?: string }[] = [
    { id: "skin", label: "Skin", available: true, note: "S", hint: "Surface forms (S)" },
    { id: "muscle", label: "Muscle", available: false, note: "Soon", hint: "Muscle layer coming soon" },
    { id: "bone", label: "Bone", available: true, note: "B", hint: "The skeleton inside the anatomy figure (B)" },
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
