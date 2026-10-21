"use client";

import { useMemo } from "react";
import { Object3D } from "three";
import type { Light } from "@/lib/lighting";

type StudioLightsProps = {
  light: Light;
  figureHeight: number;
};

const KEY_DISTANCE = 5;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * A soft ambient "room" light plus one key light that casts real shadows.
 * The key light orbits the figure according to `light` (azimuth/elevation),
 * always aimed at the figure's centre.
 */
export default function StudioLights({ light, figureHeight }: StudioLightsProps) {
  const target = useMemo(() => new Object3D(), []);
  const centre = figureHeight / 2;
  const a = toRad(light.azimuth);
  const e = toRad(light.elevation);
  const x = KEY_DISTANCE * Math.cos(e) * Math.sin(a);
  const y = centre + KEY_DISTANCE * Math.sin(e);
  const z = KEY_DISTANCE * Math.cos(e) * Math.cos(a);

  return (
    <>
      <hemisphereLight args={["#fbf8f2", "#b9b1a3", 0.55]} />
      <primitive object={target} position={[0, centre, 0]} />
      <directionalLight
        position={[x, y, z]}
        target={target}
        intensity={3.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.025}
      >
        <orthographicCamera attach="shadow-camera" args={[-1.7, 1.7, 1.7, -1.7, 0.5, 14]} />
      </directionalLight>
      {/* A faint fill from the opposite side so shadow sides never go black. */}
      <directionalLight position={[-x * 0.6, centre + 1, -z * 0.6]} intensity={0.3} />
    </>
  );
}
