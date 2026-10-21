"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Mesh, MeshStandardMaterial } from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { POSE_LIBRARY_URL } from "@/lib/poses";

const SKIN_COLOR = "#dcd5c9";

type PosedFigureProps = {
  url: string;
  poseId: string;
  /** Where in the motion to freeze, 0 (start) to 1 (end). */
  progress: number;
};

/**
 * A rigged figure frozen at one moment of a motion from the pose library.
 * The model is cloned so its clay material and pose never leak into the
 * shared loader cache.
 */
export function PosedFigure({ url, poseId, progress }: PosedFigureProps) {
  const { scene } = useGLTF(url);
  const { animations } = useGLTF(POSE_LIBRARY_URL);
  const invalidate = useThree((state) => state.invalidate);

  const { figure, materials } = useMemo(() => {
    const copy = cloneSkinned(scene);
    const created: MeshStandardMaterial[] = [];
    copy.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const original = child.material as MeshStandardMaterial;
      const clay = new MeshStandardMaterial({
        color: SKIN_COLOR,
        roughness: 0.68,
        metalness: 0,
        // Keep the sculpted surface detail (muscle definition) from the model.
        normalMap: original.normalMap ?? null,
      });
      created.push(clay);
      child.material = clay;
      child.castShadow = true;
      child.receiveShadow = true;
      // Posed limbs can leave the rest-pose bounds; never cull the figure.
      child.frustumCulled = false;
    });
    return { figure: copy, materials: created };
  }, [scene]);

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const mixer = useMemo(() => new AnimationMixer(figure), [figure]);

  useLayoutEffect(() => {
    const clip = animations.find((a) => a.name === poseId) ?? animations[0];
    if (!clip) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true;
    action.time = Math.min(clip.duration * progress, Math.max(0, clip.duration - 1e-3));
    mixer.update(0);
    invalidate();
  }, [mixer, animations, poseId, progress, invalidate]);

  return <primitive object={figure} />;
}
