"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import type { PerspectiveCamera } from "three";
import { shotPose, type Shot } from "@/lib/camera";

const { ACTION } = CameraControlsImpl;

type CameraRigProps = {
  shot: Shot;
  figureHeight: number;
  figureWidth: number;
  onUserOrbit: () => void;
};

/**
 * Smooth orbit camera. Whenever `shot` changes (a view button, a study
 * region, a new drill pose) the camera glides there. Dragging orbits,
 * scrolling zooms toward the cursor; panning is off so the figure can't
 * be lost off-screen.
 */
export default function CameraRig({ shot, figureHeight, figureWidth, onUserOrbit }: CameraRigProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const get = useThree((state) => state.get);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.mouseButtons.right = ACTION.NONE;
    controls.mouseButtons.middle = ACTION.DOLLY;
    controls.touches.two = ACTION.TOUCH_DOLLY;
    controls.touches.three = ACTION.NONE;
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const { camera, size } = get();
    const { position, target } = shotPose(
      shot,
      figureHeight,
      figureWidth,
      (camera as PerspectiveCamera).fov,
      size.width / size.height,
    );
    controls.setLookAt(...position, ...target, true);
  }, [shot, figureHeight, figureWidth, get]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.4}
      draggingSmoothTime={0.1}
      minDistance={0.3}
      maxDistance={9}
      minPolarAngle={Math.PI * 0.06}
      maxPolarAngle={Math.PI * 0.56}
      dollyToCursor
      onControlStart={onUserOrbit}
    />
  );
}
