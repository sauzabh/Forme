"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  AnimationClip,
  AnimationMixer,
  Box3,
  Mesh,
  SkinnedMesh,
  MeshStandardMaterial,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
  type Object3D,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { POSE_LIBRARY_URL } from "@/lib/poses";
import type { Subject } from "@/lib/camera";
import { useModel } from "./models";

const SKIN_COLOR = "#d4d4d4";
const HIPS = "pelvis";

/**
 * Retarget library motions onto a figure with different proportions.
 *
 * The library stores each bone's full local transform for the *library
 * mannequin*. Its bone lengths and resting joint angles differ from our
 * figures (up to ~8 cm and ~23°), so copying values directly would warp the
 * figure. Instead each bone gets the mannequin's rotation *relative to the
 * mannequin's rest*, applied on top of the figure's own rest:
 *
 *   figureRotation = figureRest × libraryRest⁻¹ × libraryRotation
 *
 * Bone lengths stay the figure's own; only the hips move, re-based onto the
 * figure's hip position. This is what Blender does when it renders the
 * pose thumbnails, so the app and the thumbnails agree.
 */
function retargetClips(clips: AnimationClip[], libraryRoot: Object3D, figureRoot: Object3D): AnimationClip[] {
  const libraryHips = libraryRoot.getObjectByName(HIPS)?.position ?? new Vector3();
  const figureHips = figureRoot.getObjectByName(HIPS)?.position ?? new Vector3();
  const hipsOffset = figureHips.clone().sub(libraryHips);

  // Per bone: figureRest × libraryRest⁻¹, computed once.
  const correction = new Map<string, Quaternion>();
  libraryRoot.traverse((bone) => {
    const target = figureRoot.getObjectByName(bone.name);
    if (target) correction.set(bone.name, target.quaternion.clone().multiply(bone.quaternion.clone().invert()));
  });

  const q = new Quaternion();
  return clips.map((clip) => {
    const tracks = clip.tracks.flatMap((track) => {
      const dot = track.name.lastIndexOf(".");
      const bone = track.name.slice(0, dot);
      const property = track.name.slice(dot + 1);

      if (property === "quaternion") {
        const fix = correction.get(bone);
        if (!fix) return [];
        const values = Float32Array.from(track.values);
        for (let i = 0; i < values.length; i += 4) {
          q.fromArray(values, i).premultiply(fix).normalize().toArray(values, i);
        }
        return [new QuaternionKeyframeTrack(track.name, Array.from(track.times), Array.from(values))];
      }
      if (property === "position" && bone === HIPS) {
        const values = Float32Array.from(track.values);
        for (let i = 0; i < values.length; i += 3) {
          values[i] += hipsOffset.x;
          values[i + 1] += hipsOffset.y;
          values[i + 2] += hipsOffset.z;
        }
        return [new VectorKeyframeTrack(track.name, Array.from(track.times), Array.from(values))];
      }
      // Other bones' positions and all scales would impose the mannequin's proportions.
      return [];
    });
    return new AnimationClip(clip.name, clip.duration, tracks);
  });
}

type PosedFigureProps = {
  url: string;
  poseId: string;
  /** Where in the motion to freeze, 0 (start) to 1 (end). */
  progress: number;
  /** Reports the posed figure's real extent so the camera can frame it. */
  onFramed: (subject: Subject) => void;
};

/** Measure a skinned figure in its current pose. */
function measure(figure: Object3D): Subject {
  figure.updateMatrixWorld(true);
  const box = new Box3();
  figure.traverse((child) => {
    if (child instanceof SkinnedMesh) {
      child.computeBoundingBox(); // accounts for the current pose
      if (child.boundingBox) box.union(child.boundingBox.clone().applyMatrix4(child.matrixWorld));
    }
  });
  return {
    bottom: Math.max(0, box.min.y),
    top: box.max.y,
    width: Math.max(box.max.x - box.min.x, box.max.z - box.min.z),
  };
}

/**
 * A rigged figure frozen at one moment of a motion from the pose library.
 * The model is cloned so its clay material and pose never leak into the
 * shared loader cache.
 */
export function PosedFigure({ url, poseId, progress, onFramed }: PosedFigureProps) {
  const { scene } = useModel(url);
  const library = useModel(POSE_LIBRARY_URL);
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

  // `scene` is the untouched cached original, so its hips are the rest pose.
  const clips = useMemo(
    () => retargetClips(library.animations, library.scene, scene),
    [library.animations, library.scene, scene],
  );

  const mixer = useMemo(() => new AnimationMixer(figure), [figure]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(figure);
      materials.forEach((m) => m.dispose());
    },
    [mixer, figure, materials],
  );

  // Re-frame only when a different pose (or figure) is chosen — not while
  // scrubbing, or the camera would drift as the slider moves.
  const framedFor = useRef<string | null>(null);

  useLayoutEffect(() => {
    const clip = clips.find((c) => c.name === poseId) ?? clips[0];
    if (!clip) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true;
    action.time = Math.min(clip.duration * progress, Math.max(0, clip.duration - 1e-3));
    mixer.update(0);
    invalidate();

    const key = `${url}|${poseId}`;
    if (framedFor.current !== key) {
      framedFor.current = key;
      onFramed(measure(figure));
    }
  }, [mixer, clips, poseId, progress, invalidate, url, figure, onFramed]);

  return <primitive object={figure} />;
}
