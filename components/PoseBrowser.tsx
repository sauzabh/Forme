"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { POSABLE_FIGURES, type FigureId } from "@/lib/figures";
import { POSE_CATEGORIES, getPose, posesIn, type PoseCategory } from "@/lib/poses";
import styles from "./PoseBrowser.module.css";

type PoseBrowserProps = {
  figureId: FigureId;
  onFigureChange: (id: FigureId) => void;
  category: PoseCategory;
  onCategoryChange: (category: PoseCategory) => void;
  poseId: string;
  onPoseChange: (id: string) => void;
  progress: number;
  onProgressChange: (progress: number) => void;
  onRandom: () => void;
};

/**
 * The pose library along the bottom: figure, category filter, pose
 * thumbnails, and a scrub slider that moves through the chosen motion.
 */
export default function PoseBrowser({
  figureId,
  onFigureChange,
  category,
  onCategoryChange,
  poseId,
  onPoseChange,
  progress,
  onProgressChange,
  onRandom,
}: PoseBrowserProps) {
  const visible = posesIn(category);
  const current = getPose(poseId);
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the selected pose in view (e.g. after Random picks one off-screen).
  useEffect(() => {
    const active = stripRef.current?.querySelector('[aria-checked="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [poseId, category]);

  return (
    <section className={styles.browser} aria-label="Pose library">
      <div className={styles.header}>
        <div className={styles.segmented} role="radiogroup" aria-label="Figure">
          {POSABLE_FIGURES.map((figure) => (
            <button
              key={figure.id}
              type="button"
              role="radio"
              aria-checked={figure.id === figureId}
              className={`${styles.segment} ${figure.id === figureId ? styles.segmentActive : ""}`}
              onClick={() => onFigureChange(figure.id)}
            >
              {figure.label}
            </button>
          ))}
        </div>

        <div className={styles.categories} role="group" aria-label="Pose category">
          {POSE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === category}
              className={`${styles.category} ${c === category ? styles.categoryActive : ""}`}
              onClick={() => onCategoryChange(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <button type="button" className={styles.random} onClick={onRandom} title="Random pose and angle (R)">
          Random
        </button>
      </div>

      <div ref={stripRef} className={styles.poses} role="radiogroup" aria-label="Pose">
        {visible.map((pose) => {
          const active = pose.id === poseId;
          return (
            <button
              key={pose.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={pose.label}
              className={`${styles.pose} ${active ? styles.poseActive : ""}`}
              onClick={() => onPoseChange(pose.id)}
            >
              <span className={styles.thumb}>
                <Image src={pose.thumbnail} alt="" width={56} height={70} unoptimized />
              </span>
              <span className={styles.poseLabel}>{pose.label}</span>
            </button>
          );
        })}
      </div>

      <label className={styles.scrub}>
        <span className={styles.scrubLabel}>Motion</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(event) => onProgressChange(Number(event.target.value) / 1000)}
          aria-label={`Scrub through ${current.label}`}
        />
        <span className={styles.scrubValue}>{current.label}</span>
      </label>
    </section>
  );
}
