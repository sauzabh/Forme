"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { ELEVATION_MAX, ELEVATION_MIN, LIGHT_PRESETS, normalizeAngle } from "./lighting";
import { eligiblePhotos } from "./photos";
import { POSES } from "./poses";

/**
 * Timed drawing drills. All drill state lives in one reducer so the timer,
 * pause, skip and "next pose" logic can't drift out of sync.
 *
 * A drill draws from one of two sources:
 *  - "figure": the posable 3D figure — a new pose every time, from a new
 *    camera angle and under a new lighting style (each optional), using the
 *    female figure, the male figure, or both
 *  - "photos": public-domain reference photos, shuffled, no repeats
 */

export const DURATIONS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "2m", seconds: 120 },
  { label: "5m", seconds: 300 },
] as const;

export type DrillSource = "figure" | "photos";

export type RandomizeKey = "camera" | "light";

export const RANDOMIZE_OPTIONS: { key: RandomizeKey; label: string; detail: string }[] = [
  { key: "camera", label: "Camera angle", detail: "Front, back, side, from above and below" },
  { key: "light", label: "Lighting", detail: "Studio, Rembrandt, side, rim and top light" },
];

/** Which figure(s) a drill uses. */
export type DrillFigures = "female" | "male" | "both";

export const FIGURE_OPTIONS: { id: DrillFigures; label: string }[] = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "both", label: "Both" },
];

/** One randomized 3D setup for a single pose in the drill. */
export type DrillPose = {
  figureId: "female" | "male";
  poseId: string;
  poseProgress: number;
  cameraAzimuth: number;
  cameraPolar: number;
  /** Lighting style (a LIGHT_PRESETS id) — never the same twice in a row. */
  lightStyle: string;
  /** Light direction relative to the camera, so the style reads as intended
     from wherever the artist is looking. */
  lightOffset: number;
  lightElevation: number;
};

export type DrillPhase = "setup" | "running" | "paused" | "done";

export type DrillState = {
  phase: DrillPhase;
  source: DrillSource;
  duration: number;
  count: number;
  randomize: Record<RandomizeKey, boolean>;
  figures: DrillFigures;
  includeNude: boolean;
  index: number;
  secondsLeft: number;
  pose: DrillPose | null;
  /** Shuffled photo ids for this session (photos source only). */
  photoOrder: string[];
};

type Action =
  | { type: "setSource"; source: DrillSource }
  | { type: "setDuration"; seconds: number }
  | { type: "changeCount"; delta: number }
  | { type: "toggle"; key: RandomizeKey }
  | { type: "setFigures"; figures: DrillFigures }
  | { type: "toggleNude" }
  | { type: "start"; pose: DrillPose; photoOrder: string[] }
  | { type: "tick"; next: DrillPose }
  | { type: "skip"; next: DrillPose }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "end" };

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const between = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const angleBetween = (a: number, b: number) => Math.abs(normalizeAngle(a - b));

/** Camera heights: mostly eye level, sometimes looking down or up. */
const CAMERA_HEIGHTS = [
  { weight: 0.55, min: 80, max: 92 }, // eye level
  { weight: 0.3, min: 58, max: 72 }, // from above
  { weight: 0.15, min: 94, max: 100 }, // from below
];

function cameraPolar() {
  let roll = Math.random();
  for (const band of CAMERA_HEIGHTS) {
    if ((roll -= band.weight) <= 0) return between(band.min, band.max);
  }
  return between(80, 92);
}

/**
 * The next drill setup, chosen to differ clearly from the last one: a pose
 * not seen in the recent past, a camera at least 60° round from the last,
 * and a different lighting style. With both figures, it mostly alternates.
 */
export function randomPose(figures: DrillFigures, previous: DrillPose | null = null, recentPoseIds: readonly string[] = []): DrillPose {
  const fresh = POSES.filter((p) => !recentPoseIds.includes(p.id));
  const pose = pick(fresh.length ? fresh : POSES);

  let figureId: DrillPose["figureId"];
  if (figures !== "both") figureId = figures;
  else if (previous && Math.random() < 0.7) figureId = previous.figureId === "female" ? "male" : "female";
  else figureId = pick(["female", "male"] as const);

  let cameraAzimuth = between(-180, 180);
  for (let tries = 0; previous && tries < 12 && angleBetween(cameraAzimuth, previous.cameraAzimuth) < 60; tries++) {
    cameraAzimuth = between(-180, 180);
  }

  const style = pick(LIGHT_PRESETS.filter((p) => p.id !== previous?.lightStyle));
  const side = Math.random() < 0.5 ? -1 : 1;

  return {
    figureId,
    poseId: pose.id,
    // Mostly near the pose's most drawable moment, sometimes anywhere in the motion.
    poseProgress: Math.random() < 0.6 ? pose.moment : Math.random(),
    cameraAzimuth,
    cameraPolar: cameraPolar(),
    lightStyle: style.id,
    lightOffset: side * (style.azimuth + between(-12, 12)),
    lightElevation: Math.min(ELEVATION_MAX, Math.max(ELEVATION_MIN, style.elevation + between(-6, 6))),
  };
}

function advance(state: DrillState, next: DrillPose): DrillState {
  if (state.index >= state.count) return { ...state, phase: "done", secondsLeft: 0 };
  return { ...state, index: state.index + 1, secondsLeft: state.duration, pose: next };
}

function reducer(state: DrillState, action: Action): DrillState {
  switch (action.type) {
    case "setSource":
      return { ...state, source: action.source };
    case "setDuration":
      return { ...state, duration: action.seconds };
    case "changeCount":
      return { ...state, count: Math.min(60, Math.max(5, state.count + action.delta)) };
    case "toggle":
      return { ...state, randomize: { ...state.randomize, [action.key]: !state.randomize[action.key] } };
    case "setFigures":
      return { ...state, figures: action.figures };
    case "toggleNude":
      return { ...state, includeNude: !state.includeNude };
    case "start":
      return {
        ...state,
        phase: "running",
        index: 1,
        secondsLeft: state.duration,
        pose: action.pose,
        photoOrder: action.photoOrder,
      };
    case "tick":
      if (state.phase !== "running") return state;
      if (state.secondsLeft > 1) return { ...state, secondsLeft: state.secondsLeft - 1 };
      return advance(state, action.next);
    case "skip":
      // Skipping while paused moves on but stays paused.
      return state.phase === "running" || state.phase === "paused" ? advance(state, action.next) : state;
    case "pause":
      return state.phase === "running" ? { ...state, phase: "paused" } : state;
    case "resume":
      return state.phase === "paused" ? { ...state, phase: "running" } : state;
    case "end":
      return { ...state, phase: "setup", index: 0, secondsLeft: 0, pose: null, photoOrder: [] };
  }
}

const INITIAL: DrillState = {
  phase: "setup",
  source: "figure",
  duration: 60,
  count: 20,
  randomize: { camera: true, light: true },
  figures: "both",
  includeNude: true,
  index: 0,
  secondsLeft: 0,
  pose: null,
  photoOrder: [],
};

/** The photo for the current pose, cycling if the session is longer than the set. */
export function currentPhotoId(state: DrillState): string | null {
  if (state.source !== "photos" || state.photoOrder.length === 0 || state.index === 0) return null;
  return state.photoOrder[(state.index - 1) % state.photoOrder.length];
}

export function nextPhotoId(state: DrillState): string | null {
  if (state.source !== "photos" || state.photoOrder.length === 0 || state.index >= state.count) return null;
  return state.photoOrder[state.index % state.photoOrder.length];
}

export function useDrill() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { source, includeNude, figures } = state;

  // What the session has shown so far, so the next pose can avoid it.
  const previousRef = useRef<DrillPose | null>(null);
  const recentRef = useRef<string[]>([]);

  useEffect(() => {
    if (!state.pose) return;
    previousRef.current = state.pose;
    recentRef.current = [...recentRef.current, state.pose.poseId].slice(-14);
  }, [state.pose]);

  const nextPose = useCallback(() => randomPose(figures, previousRef.current, recentRef.current), [figures]);

  // Restart the one-second tick for every new pose, so each pose gets its
  // full time (not whatever was left of the previous second).
  useEffect(() => {
    if (state.phase !== "running") return;
    const id = setInterval(() => dispatch({ type: "tick", next: nextPose() }), 1000);
    return () => clearInterval(id);
  }, [state.phase, state.index, nextPose]);

  // Stable action functions: they only change when what they read changes,
  // so components using them don't re-subscribe on every render.
  const actions = useMemo(
    () => ({
      setSource: (next: DrillSource) => dispatch({ type: "setSource", source: next }),
      setDuration: (seconds: number) => dispatch({ type: "setDuration", seconds }),
      changeCount: (delta: number) => dispatch({ type: "changeCount", delta }),
      toggle: (key: RandomizeKey) => dispatch({ type: "toggle", key }),
      setFigures: (next: DrillFigures) => dispatch({ type: "setFigures", figures: next }),
      toggleNude: () => dispatch({ type: "toggleNude" }),
      start: () => {
        previousRef.current = null;
        recentRef.current = [];
        dispatch({
          type: "start",
          pose: nextPose(),
          photoOrder: source === "photos" ? shuffle(eligiblePhotos(includeNude).map((p) => p.id)) : [],
        });
      },
      skip: () => dispatch({ type: "skip", next: nextPose() }),
      pause: () => dispatch({ type: "pause" }),
      resume: () => dispatch({ type: "resume" }),
      end: () => dispatch({ type: "end" }),
    }),
    [source, includeNude, nextPose],
  );

  const photoCount = eligiblePhotos(includeNude).length;

  return useMemo(
    () => ({ state, photoCount, canStart: source === "figure" || photoCount > 0, ...actions }),
    [state, photoCount, source, actions],
  );
}

export type Drill = ReturnType<typeof useDrill>;
