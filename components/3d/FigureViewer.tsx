"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import { preloadModel } from "./models";
import CameraRig from "./CameraRig";
import StudioLights from "./StudioLights";
import { FigureModel, SkeletonModel } from "./FigureModel";
import { PosedFigure } from "./PosedFigure";
import ModelErrorBoundary from "./ModelErrorBoundary";
import { ALL_FIGURES, type Figure } from "@/lib/figures";
import { POSE_LIBRARY_URL } from "@/lib/poses";
import type { Shot, Subject } from "@/lib/camera";
import type { Light } from "@/lib/lighting";
import styles from "./FigureViewer.module.css";

/** Which pose to show on a posable figure, and where in its motion. */
export type PoseState = { id: string; progress: number };

type FigureViewerProps = {
  figure: Figure;
  pose: PoseState;
  /** Optional hair / clothing meshes to show on a posable figure. */
  parts: string[];
  showSkeleton: boolean;
  shot: Shot;
  light: Light;
  /** Pixels the interface covers at the top and bottom; the camera frames the figure between. */
  insets: { top: number; bottom: number };
  onUserOrbit: () => void;
};

/**
 * The full-screen 3D studio: lights, a shadow-catching floor, the figure,
 * and the camera. It only renders when something changes ("demand" mode),
 * so it stays light on battery while an artist is drawing from it.
 */
export default function FigureViewer({ figure, pose, parts, showSkeleton, shot, light, insets, onUserOrbit }: FigureViewerProps) {
  // What the camera frames: a posed figure's measured extent once known,
  // otherwise the figure standing.
  const [measured, setMeasured] = useState<{ key: string; subject: Subject } | null>(null);
  const poseKey = `${figure.model}|${pose.id}`;
  const subject: Subject =
    figure.posable && measured?.key === poseKey
      ? measured.subject
      : { bottom: 0, top: figure.height, width: figure.width };
  const handleFramed = useCallback((s: Subject) => setMeasured({ key: poseKey, subject: s }), [poseKey]);

  // The pose library is needed immediately; everything else is fetched
  // quietly once the first figure is up, so switching later is instant.
  useEffect(() => {
    preloadModel(POSE_LIBRARY_URL);
    const timer = setTimeout(() => {
      for (const f of ALL_FIGURES) {
        preloadModel(f.model);
        if (f.skeleton) preloadModel(f.skeleton);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.viewer}>
      <Canvas
        shadows="soft"
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 30, near: 0.05, far: 60, position: [2.4, 1.6, 5] }}
      >
        <StudioLights light={light} figureHeight={figure.height} />

        <ModelErrorBoundary height={figure.height} resetKey={figure.model}>
          <Suspense fallback={<LoadingLabel height={figure.height} />}>
            {figure.posable ? (
              <PosedFigure url={figure.model} poseId={pose.id} progress={pose.progress} parts={parts} onFramed={handleFramed} />
            ) : (
              <FigureModel url={figure.model} xray={showSkeleton && Boolean(figure.skeleton)} />
            )}
          </Suspense>
          {!figure.posable && showSkeleton && figure.skeleton && (
            <Suspense fallback={null}>
              <SkeletonModel url={figure.skeleton} />
            </Suspense>
          )}
        </ModelErrorBoundary>

        {/* Invisible floor that only shows the key light's cast shadow. */}
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[8, 64]} />
          <shadowMaterial opacity={0.14} />
        </mesh>
        {/* Soft grounding shadow right under the feet. */}
        <ContactShadows position={[0, 0.002, 0]} scale={2.4} resolution={512} blur={2.6} far={0.8} opacity={0.32} color="#1a1a1a" />

        <CameraRig
          shot={shot}
          subject={subject}
          figureHeight={figure.height}
          insetTop={insets.top}
          insetBottom={insets.bottom}
          onUserOrbit={onUserOrbit}
        />
      </Canvas>
    </div>
  );
}

function LoadingLabel({ height }: { height: number }) {
  return (
    <Html center position={[0, height / 2, 0]}>
      <span className={styles.loading}>Loading figure…</span>
    </Html>
  );
}
