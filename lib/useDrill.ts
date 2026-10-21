"use client";

import { useEffect, useReducer } from "react";
import { FIGURES, type FigureId } from "./figures";
import { eligiblePhotos } from "./photos";

/**
 * Timed drawing drills. All drill state lives in one reducer so the timer,
 * pause, skip and "next pose" logic can't drift out of sync.
 *
 * A drill draws from one of two sources:
 *  - "figure": the 3D figure, with a random figure / camera / light each pose
 *  - "photos": public-domain reference photos, shuffled, no repeats
 */

export const DURATIONS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "2m", seconds: 120 },
  { label: "5m", seconds: 300 },
] as const;

export type DrillSource = "figure" | "photos";

export type RandomizeKey = "figure" | "camera" | "light";

export const RANDOMIZE_OPTIONS: { key: RandomizeKey; label: string }[] = [
  { key: "figure", label: "Figure" },
  { key: "camera", label: "Camera angle" },
  { key: "light", label: "Light direction" },
];

/** One randomized 3D setup for a single pose in the drill. */
export type DrillPose = {
  figureId: FigureId;
  cameraAzimuth: number;
  cameraPolar: number;
  lightAzimuth: number;
  lightElevation: number;
};

export type DrillPhase = "setup" | "running" | "paused" | "done";

export type DrillState = {
  phase: DrillPhase;
  source: DrillSource;
  duration: number;
  count: number;
  randomize: Record<RandomizeKey, boolean>;
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

export function randomPose(): DrillPose {
  return {
    figureId: pick(FIGURES).id,
    cameraAzimuth: between(-180, 180),
    cameraPolar: between(62, 96),
    lightAzimuth: between(-160, 160),
    lightElevation: between(25, 70),
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
      return state.phase === "running" || state.phase === "paused"
        ? advance({ ...state, phase: "running" }, action.next)
        : state;
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
  randomize: { figure: true, camera: true, light: true },
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

  useEffect(() => {
    if (state.phase !== "running") return;
    const id = setInterval(() => dispatch({ type: "tick", next: randomPose() }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  const photoCount = eligiblePhotos(state.includeNude).length;

  return {
    state,
    photoCount,
    canStart: state.source === "figure" || photoCount > 0,
    setSource: (source: DrillSource) => dispatch({ type: "setSource", source }),
    setDuration: (seconds: number) => dispatch({ type: "setDuration", seconds }),
    changeCount: (delta: number) => dispatch({ type: "changeCount", delta }),
    toggle: (key: RandomizeKey) => dispatch({ type: "toggle", key }),
    toggleNude: () => dispatch({ type: "toggleNude" }),
    start: () =>
      dispatch({
        type: "start",
        pose: randomPose(),
        photoOrder: state.source === "photos" ? shuffle(eligiblePhotos(state.includeNude).map((p) => p.id)) : [],
      }),
    skip: () => dispatch({ type: "skip", next: randomPose() }),
    pause: () => dispatch({ type: "pause" }),
    resume: () => dispatch({ type: "resume" }),
    end: () => dispatch({ type: "end" }),
  };
}

export type Drill = ReturnType<typeof useDrill>;
