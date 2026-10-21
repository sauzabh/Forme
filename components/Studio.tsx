"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TopBar from "./TopBar";
import FigureViewer, { type PoseState } from "./3d/FigureViewer";
import PeelControl, { type Layer } from "./PeelControl";
import CameraControl from "./CameraControl";
import LightControl from "./LightControl";
import PoseBrowser from "./PoseBrowser";
import StudyPanel from "./StudyPanel";
import DrillInterface from "./DrillInterface";
import type { Mode } from "./ModeSwitcher";
import { ANATOMY_FIGURE, getFigure, type FigureId } from "@/lib/figures";
import { DEFAULT_POSE_ID, getPose, posesIn, type PoseCategory } from "@/lib/poses";
import { VIEWS, viewShot, type Shot, type ViewId } from "@/lib/camera";
import { DEFAULT_LIGHT, type Light } from "@/lib/lighting";
import type { RegionId } from "@/lib/regions";
import { useDrill } from "@/lib/useDrill";
import styles from "./Studio.module.css";

const DEFAULT_VIEW: ViewId = "three-quarter";

/**
 * The whole studio. The 3D figure fills the window; every control floats
 * on top of it. All app state lives here and flows down as props.
 *
 * Pose and Drill use the posable figures; Study uses the anatomy figure,
 * which is the one with a skeleton for the Bone layer.
 */
export default function Studio() {
  const [mode, setMode] = useState<Mode>("pose");
  const [figureId, setFigureId] = useState<FigureId>("female");
  const [poseCategory, setPoseCategory] = useState<PoseCategory>("All");
  const [poseId, setPoseId] = useState(DEFAULT_POSE_ID);
  const [poseProgress, setPoseProgress] = useState(() => getPose(DEFAULT_POSE_ID).moment);
  const [layer, setLayer] = useState<Layer>("skin");
  const [light, setLight] = useState<Light>(DEFAULT_LIGHT);
  const [lightOpen, setLightOpen] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [hasOrbited, setHasOrbited] = useState(false);

  // `shot` only changes on purpose (a button, a region, a drill pose), so
  // free orbiting never makes the camera jump back. `activeView` is just
  // for highlighting the matching view button.
  const [shot, setShot] = useState<Shot>(() => viewShot(DEFAULT_VIEW));
  const [activeView, setActiveView] = useState<ViewId | null>(DEFAULT_VIEW);
  const [studyRegion, setStudyRegion] = useState<RegionId | null>(null);

  const drill = useDrill();
  const drillActive = drill.state.phase === "running" || drill.state.phase === "paused";
  const drillPose = drillActive && drill.state.source === "figure" ? drill.state.pose : null;
  const randomize = drill.state.randomize;

  // During a drill, randomized settings temporarily override the user's.
  const figure =
    mode === "study" ? ANATOMY_FIGURE : getFigure(drillPose && randomize.figure ? drillPose.figureId : figureId);
  const pose = useMemo<PoseState>(
    () => (drillPose ? { id: drillPose.poseId, progress: drillPose.poseProgress } : { id: poseId, progress: poseProgress }),
    [drillPose, poseId, poseProgress],
  );
  const effectiveLight =
    drillPose && randomize.light ? { azimuth: drillPose.lightAzimuth, elevation: drillPose.lightElevation } : light;
  const drillShot = useMemo<Shot | null>(
    () => (drillPose && randomize.camera ? { azimuth: drillPose.cameraAzimuth, polar: drillPose.cameraPolar, focus: null } : null),
    [drillPose, randomize.camera],
  );
  const effectiveShot = drillShot ?? shot;
  const showSkeleton = mode === "study" && layer === "bone" && Boolean(figure.skeleton);

  const selectView = useCallback((view: ViewId) => {
    setActiveView(view);
    setStudyRegion(null);
    setShot(viewShot(view));
  }, []);

  const selectRegion = useCallback((region: RegionId | null) => {
    setStudyRegion(region);
    if (region) {
      setActiveView(null);
      setShot((current) => ({ ...current, focus: region }));
    } else {
      setActiveView(DEFAULT_VIEW);
      setShot(viewShot(DEFAULT_VIEW));
    }
  }, []);

  const selectPose = useCallback((id: string) => {
    setPoseId(id);
    setPoseProgress(getPose(id).moment);
  }, []);

  const randomizePose = useCallback(() => {
    // Stay within the category the artist is browsing.
    const candidates = posesIn(poseCategory);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    setPoseId(next.id);
    setPoseProgress(next.moment);
    setActiveView(null);
    setShot({ azimuth: Math.round(Math.random() * 360 - 180), polar: Math.round(70 + Math.random() * 22), focus: null });
  }, [poseCategory]);

  const changeMode = useCallback(
    (next: Mode) => {
      setMode(next);
      // Leaving Study pulls the camera back out to the full figure.
      if (next !== "study" && studyRegion) selectRegion(null);
    },
    [studyRegion, selectRegion],
  );

  const handleUserOrbit = useCallback(() => {
    setActiveView(null);
    setHasOrbited(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;

      if (drillActive) {
        if (event.key === " ") {
          event.preventDefault();
          if (drill.state.phase === "running") drill.pause();
          else drill.resume();
        } else if (event.key === "Escape") {
          drill.end();
        } else if (event.key === "ArrowRight") {
          drill.skip();
        }
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        setChromeHidden((hidden) => !hidden);
      } else if (event.key === "Escape") {
        if (chromeHidden) setChromeHidden(false);
        else if (lightOpen) setLightOpen(false);
        else if (studyRegion) selectRegion(null);
      } else if (mode !== "drill" && ["1", "2", "3", "4"].includes(event.key)) {
        selectView(VIEWS[Number(event.key) - 1].id);
      } else if (mode !== "drill" && event.key.toLowerCase() === "l") {
        setLightOpen((open) => !open);
      } else if (mode === "pose" && event.key.toLowerCase() === "r") {
        randomizePose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drill, drillActive, chromeHidden, lightOpen, studyRegion, mode, selectRegion, selectView, randomizePose]);

  const chromeVisible = !chromeHidden && !drillActive;
  const showStudioControls = mode !== "drill";

  return (
    <div className={styles.app}>
      <FigureViewer
        figure={figure}
        pose={pose}
        showSkeleton={showSkeleton}
        shot={effectiveShot}
        light={effectiveLight}
        onUserOrbit={handleUserOrbit}
      />

      <div className={`${styles.chrome} ${chromeVisible ? "" : styles.chromeHidden}`}>
        <TopBar mode={mode} onModeChange={changeMode} onHideInterface={() => setChromeHidden(true)} />

        {showStudioControls && (
          <>
            <CameraControl
              view={activeView}
              onViewChange={selectView}
              lightOpen={lightOpen}
              onToggleLight={() => setLightOpen((open) => !open)}
            />
            {lightOpen && <LightControl light={light} onChange={setLight} onClose={() => setLightOpen(false)} />}
          </>
        )}

        {mode === "pose" && (
          <PoseBrowser
            figureId={figureId}
            onFigureChange={setFigureId}
            category={poseCategory}
            onCategoryChange={setPoseCategory}
            poseId={poseId}
            onPoseChange={selectPose}
            progress={poseProgress}
            onProgressChange={setPoseProgress}
            onRandom={randomizePose}
          />
        )}
        {mode === "study" && (
          <>
            <PeelControl layer={layer} onLayerChange={setLayer} boneAvailable={Boolean(figure.skeleton)} />
            <StudyPanel region={studyRegion} onRegionChange={selectRegion} />
          </>
        )}

        {mode === "pose" && !hasOrbited && (
          <p className={styles.hint}>Drag to orbit · Scroll to zoom · R for a random pose · Space hides the interface</p>
        )}
      </div>

      {mode === "drill" && <DrillInterface drill={drill} cardsHidden={chromeHidden} />}

      {chromeHidden && !drillActive && (
        <button type="button" className={styles.reveal} onClick={() => setChromeHidden(false)} title="Show interface (Space)">
          Show interface
        </button>
      )}
    </div>
  );
}
