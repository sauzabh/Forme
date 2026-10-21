"use client";

import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html, useGLTF } from "@react-three/drei";
import CameraRig from "./CameraRig";
import StudioLights from "./StudioLights";
import { FigureModel, SkeletonModel } from "./FigureModel";
import ModelErrorBoundary from "./ModelErrorBoundary";
import { FIGURES, type Figure } from "@/lib/figures";
import type { Shot } from "@/lib/camera";
import type { Light } from "@/lib/lighting";
import styles from "./FigureViewer.module.css";

type FigureViewerProps = {
  figure: Figure;
  showSkeleton: boolean;
  shot: Shot;
  light: Light;
  onUserOrbit: () => void;
};

/**
 * The full-screen 3D studio: lights, a shadow-catching floor, the figure,
 * and the camera. It only renders when something changes ("demand" mode),
 * so it stays light on battery while an artist is drawing from it.
 */
export default function FigureViewer({ figure, showSkeleton, shot, light, onUserOrbit }: FigureViewerProps) {
  // Quietly fetch the other figures after the first one is up, so switching is instant.
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const f of FIGURES) {
        useGLTF.preload(f.model);
        if (f.skeleton) useGLTF.preload(f.skeleton);
      }
    }, 1500);
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
            <FigureModel url={figure.model} xray={showSkeleton && Boolean(figure.skeleton)} />
          </Suspense>
          {showSkeleton && figure.skeleton && (
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
        <ContactShadows position={[0, 0.002, 0]} scale={2.4} resolution={512} blur={2.6} far={0.8} opacity={0.32} color="#3a362f" />

        <CameraRig shot={shot} figureHeight={figure.height} figureWidth={figure.width} onUserOrbit={onUserOrbit} />
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
