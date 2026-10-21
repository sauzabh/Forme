"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import type { PerspectiveCamera } from "three";
import { shotPose, type Shot, type Subject } from "@/lib/camera";

const { ACTION } = CameraControlsImpl;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const TAU = Math.PI * 2;

type CameraRigProps = {
  shot: Shot;
  subject: Subject;
  figureHeight: number;
  onUserOrbit: () => void;
};

/**
 * Smooth orbit camera.
 * - A new `shot` (a view button, a study region, a drill pose) glides the
 *   camera to that angle.
 * - A new `subject` alone (another figure, another pose) keeps the angle the
 *   artist is looking from and only re-frames, so nothing jumps.
 * Dragging orbits, scrolling zooms toward the cursor; panning is off so the
 * figure can't be lost off-screen.
 */
export default function CameraRig({ shot, subject, figureHeight, onUserOrbit }: CameraRigProps) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const lastShot = useRef<Shot | null>(null);
  const get = useThree((state) => state.get);
  const { bottom, top, width } = subject;

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
    const keepAngle = lastShot.current === shot && !shot.focus;
    const effective: Shot = keepAngle
      ? { ...shot, azimuth: toDeg(controls.azimuthAngle), polar: toDeg(controls.polarAngle) }
      : shot;
    lastShot.current = shot;

    const { camera, size } = get();
    const pose = shotPose(
      effective,
      { bottom, top, width },
      figureHeight,
      (camera as PerspectiveCamera).fov,
      size.width / size.height,
    );

    // Turn the short way round: after free orbiting the current angle can
    // be several full turns away from -180…180, and a naive move would
    // spin all the way back.
    controls.normalizeRotations();
    const current = controls.azimuthAngle;
    const wanted = toRad(pose.azimuth);
    const delta = ((((wanted - current + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    controls.setTarget(...pose.target, true);
    controls.rotateTo(current + delta, toRad(pose.polar), true);
    controls.dollyTo(pose.distance, true);
  }, [shot, bottom, top, width, figureHeight, get]);

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
