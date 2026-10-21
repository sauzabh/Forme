"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh, type BufferGeometry, type Object3D } from "three";

// Matte clay tones — close to a plaster cast, so light and shadow read clearly.
const SKIN_COLOR = "#dcd5c9";
const BONE_COLOR = "#ece4d2";
const XRAY_OPACITY = 0.13;

function firstGeometry(scene: Object3D): BufferGeometry {
  let found: BufferGeometry | null = null;
  scene.traverse((child) => {
    if (!found && child instanceof Mesh) found = child.geometry;
  });
  if (!found) throw new Error("Model has no mesh");
  return found;
}

type FigureModelProps = {
  url: string;
  /** When true the skin fades to a faint shell so the skeleton shows through. */
  xray: boolean;
};

/**
 * Renders one figure file with the studio's clay material. Works with any
 * single-mesh .glb — nothing here depends on the model's internals.
 */
export function FigureModel({ url, xray }: FigureModelProps) {
  const { scene } = useGLTF(url);
  const geometry = useMemo(() => firstGeometry(scene), [scene]);
  const invalidate = useThree((state) => state.invalidate);

  // The canvas only redraws on demand, so ask for a frame once the model appears.
  useEffect(() => invalidate(), [geometry, invalidate]);

  return (
    <mesh geometry={geometry} castShadow={!xray} receiveShadow>
      <meshStandardMaterial
        // A new material when x-ray toggles, so three.js rebuilds its blending state.
        key={xray ? "xray" : "solid"}
        color={SKIN_COLOR}
        roughness={0.72}
        metalness={0}
        transparent={xray}
        opacity={xray ? XRAY_OPACITY : 1}
        depthWrite={!xray}
      />
    </mesh>
  );
}

export function SkeletonModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const geometry = useMemo(() => firstGeometry(scene), [scene]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => invalidate(), [geometry, invalidate]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={BONE_COLOR} roughness={0.6} metalness={0} />
    </mesh>
  );
}
