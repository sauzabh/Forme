import Image from "next/image";
import { FIGURES, type FigureId } from "@/lib/figures";
import styles from "./PoseBrowser.module.css";

type PoseBrowserProps = {
  figureId: FigureId;
  onFigureChange: (id: FigureId) => void;
};

/**
 * The bottom strip. Today it holds the four real figures; once the figures
 * are rigged it becomes the pose library, in the same place and style.
 */
export default function PoseBrowser({ figureId, onFigureChange }: PoseBrowserProps) {
  return (
    <nav className={styles.strip} aria-label="Figure">
      {FIGURES.map((figure) => {
        const active = figure.id === figureId;
        return (
          <button
            key={figure.id}
            type="button"
            className={`${styles.tile} ${active ? styles.active : ""}`}
            aria-pressed={active}
            title={`${figure.label} · ${figure.detail}`}
            onClick={() => onFigureChange(figure.id)}
          >
            <span className={styles.thumb}>
              <Image src={figure.thumbnail} alt="" width={40} height={60} unoptimized />
            </span>
            <span className={styles.caption}>
              <span className={styles.label}>{figure.label}</span>
              <span className={styles.detail}>{figure.detail}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
