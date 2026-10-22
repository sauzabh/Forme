import styles from "./PeelControl.module.css";

export type Layer = "skin" | "muscle" | "bone";

type PeelControlProps = {
  layer: Layer;
  onLayerChange: (layer: Layer) => void;
};

/**
 * Anatomy layers, peeled from the outside in. Skin and Muscle use the
 * muscular figure from Pose; Muscle tints it and deepens its sculpted
 * muscle forms so each group reads clearly. Bone shows the skeleton inside
 * the realistic anatomy figure. Keys: S, M, B.
 */
export default function PeelControl({ layer, onLayerChange }: PeelControlProps) {
  const items: { id: Layer; label: string; available: boolean; note?: string; hint?: string }[] = [
    { id: "skin", label: "Skin", available: true, note: "S", hint: "Surface forms (S)" },
    { id: "muscle", label: "Muscle", available: true, note: "M", hint: "Muscle groups, emphasised (M)" },
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
            onClick={() => onLayerChange(item.id)}
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
