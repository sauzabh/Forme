"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TopBar from "./TopBar";
import FigureViewer, { type PoseState } from "./3d/FigureViewer";
import PeelControl, { type Layer } from "./PeelControl";
import CameraControl from "./CameraControl";
import LightControl from "./LightControl";
import AppearanceControl from "./AppearanceControl";
import PoseBrowser from "./PoseBrowser";
import StudyPanel from "./StudyPanel";
import DrillInterface from "./DrillInterface";
import type { Mode } from "./ModeSwitcher";
import { ANATOMY_FIGURE, POSABLE_FIGURES, getFigure, type FigureId } from "@/lib/figures";
import { DEFAULT_APPEARANCE, dressedModel, visibleParts, type Appearance, type PosableId } from "@/lib/appearance";
import { DEFAULT_POSE_ID, getPose, posesIn, type PoseCategory } from "@/lib/poses";
import { VIEWS, viewShot, type Shot, type ViewId } from "@/lib/camera";
import { DEFAULT_LIGHT, normalizeAngle, type Light } from "@/lib/lighting";
import { REGIONS, type RegionId } from "@/lib/regions";
import { DRAPERY_OUTFITS, useDrill } from "@/lib/useDrill";
import { preloadModel } from "./3d/models";
import styles from "./Studio.module.css";

const DEFAULT_VIEW: ViewId = "three-quarter";

/**
 * The whole studio. The 3D figure fills the window; every control floats
 * on top of it. All app state lives here and flows down as props.
 *
 * Pose and Drill use the posable figures. Study shows the muscular male
 * standing for its Skin and Muscle layers, and the anatomy figure (the one
 * with a fitted skeleton) for Bone.
 */
export default function Studio() {
  const [mode, setMode] = useState<Mode>("pose");
  // Where closing Drill should take the artist back to.
  const [returnMode, setReturnMode] = useState<Exclude<Mode, "drill">>("pose");
  const [figureId, setFigureId] = useState<FigureId>("female");
  const [poseCategory, setPoseCategory] = useState<PoseCategory>("All");
  const [poseId, setPoseId] = useState(DEFAULT_POSE_ID);
  const [poseProgress, setPoseProgress] = useState(() => getPose(DEFAULT_POSE_ID).moment);
  const [layer, setLayer] = useState<Layer>("skin");
  const [light, setLight] = useState<Light>(DEFAULT_LIGHT);
  // One side panel at a time: Light or Appearance.
  const [panel, setPanel] = useState<"light" | "appearance" | null>(null);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [chromeHidden, setChromeHidden] = useState(false);
  // The pose library's height, so the camera frames the figure above it.
  const [browserHeight, setBrowserHeight] = useState(0);
  const browserRef = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(() => setBrowserHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [hasOrbited, setHasOrbited] = useState(false);

  // `shot` only changes on purpose (a button, a region, a drill pose), so
  // free orbiting never makes the camera jump back. `activeView` is just
  // for highlighting the matching view button.
  const [shot, setShot] = useState<Shot>(() => viewShot(DEFAULT_VIEW));
  const [activeView, setActiveView] = useState<ViewId | null>(DEFAULT_VIEW);
  const [studyRegion, setStudyRegion] = useState<RegionId | null>(null);
  const [returnShot, setReturnShot] = useState<{ shot: Shot; view: ViewId | null } | null>(null);

  const drill = useDrill();
  const { end: endDrill } = drill;
  const drillActive = drill.state.phase === "running" || drill.state.phase === "paused";
  const drillPose = drillActive && drill.state.source === "figure" ? drill.state.pose : null;
  const randomize = drill.state.randomize;

  // During a drill, randomized settings temporarily override the user's.
  const posableId: PosableId = drillPose ? drillPose.figureId : figureId === "male" ? "male" : "female";
  const studying = mode === "study";
  const baseFigure = studying ? (layer === "bone" ? ANATOMY_FIGURE : getFigure("male")) : getFigure(posableId);
  // Hair and clothing: the artist's own choice in Pose; in a drill, the
  // drill's settings (hair on/off, nude or drapery — the outfit varying pose
  // to pose) with the artist's chosen hairstyles.
  const drillHair = drill.state.hair;
  const shownAppearance = useMemo<Appearance>(
    () =>
      drillPose
        ? { ...appearance, hair: drillHair, clothing: drillPose.outfit ?? "none" }
        : appearance,
    [drillPose, drillHair, appearance],
  );
  const figure = useMemo(
    () =>
      baseFigure.posable && !studying
        ? { ...baseFigure, model: dressedModel(baseFigure.model, shownAppearance.clothing) }
        : baseFigure,
    [baseFigure, studying, shownAppearance.clothing],
  );
  const parts = useMemo(
    // Study shows the bare figure: no hair or clothing over the anatomy.
    () => (baseFigure.posable && !studying ? visibleParts(shownAppearance, posableId) : []),
    [baseFigure.posable, studying, shownAppearance, posableId],
  );

  // Drapery drills switch outfits pose to pose: fetch them up front so a
  // new pose never waits on a download.
  const drapery = mode === "drill" && drill.state.source === "figure" && drill.state.dress === "drapery";
  useEffect(() => {
    if (!drapery) return;
    for (const f of POSABLE_FIGURES) {
      for (const outfit of DRAPERY_OUTFITS) preloadModel(dressedModel(f.model, outfit));
    }
  }, [drapery]);
  const pose = useMemo<PoseState>(
    () =>
      drillPose
        ? { id: drillPose.poseId, progress: drillPose.poseProgress }
        : studying
          ? { id: DEFAULT_POSE_ID, progress: 0 } // a relaxed stand, every region in view
          : { id: poseId, progress: poseProgress },
    [drillPose, studying, poseId, poseProgress],
  );
  const drillShot = useMemo<Shot | null>(
    () => (drillPose && randomize.camera ? { azimuth: drillPose.cameraAzimuth, polar: drillPose.cameraPolar, focus: null } : null),
    [drillPose, randomize.camera],
  );
  const effectiveShot = drillShot ?? shot;
  // Drill lighting is placed relative to the camera, so a "side" or "rim"
  // light always reads that way from the artist's point of view.
  const effectiveLight =
    drillPose && randomize.light
      ? { azimuth: normalizeAngle(effectiveShot.azimuth + drillPose.lightOffset), elevation: drillPose.lightElevation }
      : light;
  const showSkeleton = mode === "study" && layer === "bone" && Boolean(figure.skeleton);
  // Screen space the interface covers (px): the top bar, and along the
  // bottom the pose library (Pose), the region bar (Study) or the drill
  // controls. Stays put when the interface is hidden, so Space doesn't
  // undo the artist's zoom.
  const insets = useMemo(
    () => ({
      top: 72,
      bottom: mode === "pose" ? browserHeight + 32 : mode === "study" ? 84 : 72,
    }),
    [mode, browserHeight],
  );

  const selectView = useCallback((view: ViewId) => {
    setActiveView(view);
    setStudyRegion(null);
    setShot(viewShot(view));
  }, []);

  const selectRegion = useCallback(
    (region: RegionId | null) => {
      if (region) {
        // Remember the view from before zooming in, to return to it later.
        if (!studyRegion) setReturnShot({ shot, view: activeView });
        setActiveView(null);
        setShot({ ...shot, focus: region });
      } else {
        const back = returnShot ?? { shot: viewShot(DEFAULT_VIEW), view: DEFAULT_VIEW };
        setActiveView(back.view);
        setShot({ ...back.shot, focus: null }); // a new object, so the camera moves
        setReturnShot(null);
      }
      setStudyRegion(region);
    },
    [studyRegion, shot, activeView, returnShot],
  );

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
      if (next === "drill" && mode !== "drill") setReturnMode(mode);
      // Leaving Drill any way (top bar, ×, Esc) resets it, so it reopens on setup.
      if (mode === "drill" && next !== "drill") endDrill();
      setMode(next);
      // Leaving Study pulls the camera back out to the full figure.
      if (next !== "study" && studyRegion) selectRegion(null);
    },
    [mode, studyRegion, selectRegion, endDrill],
  );

  const closeDrill = useCallback(() => changeMode(returnMode), [changeMode, returnMode]);

  const handleUserOrbit = useCallback(() => {
    setActiveView(null);
    setHasOrbited(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      // Typing in a text field: leave every key alone. (Sliders are fine —
      // after dragging one, shortcuts should still work.)
      if (target?.closest("textarea, select, input:not([type=range])")) return;
      // A control focused from the keyboard keeps its normal Space behaviour
      // (press the button); a control merely clicked with the mouse doesn't.
      const keyboardControl =
        target?.matches(":focus-visible") && target.closest('button, [role="switch"], [role="radio"], [role="slider"]');
      if (event.key === " " && keyboardControl) return;

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
        // Nothing to hide on the Drill setup card; Space only matters mid-drill.
        if (mode !== "drill") setChromeHidden((hidden) => !hidden);
      } else if (event.key === "Escape") {
        if (chromeHidden) setChromeHidden(false);
        else if (mode === "drill") closeDrill();
        else if (panel) setPanel(null);
        else if (studyRegion) selectRegion(null);
      } else if (mode !== "drill" && ["1", "2", "3", "4"].includes(event.key)) {
        selectView(VIEWS[Number(event.key) - 1].id);
      } else if (mode !== "drill" && event.key.toLowerCase() === "l") {
        setPanel((open) => (open === "light" ? null : "light"));
      } else if (mode === "pose" && event.key.toLowerCase() === "a") {
        setPanel((open) => (open === "appearance" ? null : "appearance"));
      } else if (mode === "pose" && event.key.toLowerCase() === "r") {
        randomizePose();
      } else if (mode === "study" && ["s", "m", "b"].includes(event.key.toLowerCase())) {
        setLayer(({ s: "skin", m: "muscle", b: "bone" } as const)[event.key.toLowerCase() as "s" | "m" | "b"]);
      } else if (mode === "study" && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        // Step through the regions; "Full figure" sits before the first.
        const ids: (RegionId | null)[] = [null, ...REGIONS.map((r) => r.id)];
        const step = event.key === "ArrowRight" ? 1 : -1;
        const next = (ids.indexOf(studyRegion) + step + ids.length) % ids.length;
        selectRegion(ids[next]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drill, drillActive, chromeHidden, panel, studyRegion, mode, selectRegion, selectView, randomizePose, closeDrill]);

  const chromeVisible = !chromeHidden && !drillActive;
  const showStudioControls = mode !== "drill";

  return (
    <div className={styles.app}>
      <FigureViewer
        figure={figure}
        pose={pose}
        parts={parts}
        muscle={studying && layer === "muscle"}
        showSkeleton={showSkeleton}
        shot={effectiveShot}
        light={effectiveLight}
        insets={insets}
        onUserOrbit={handleUserOrbit}
      />

      <div className={`${styles.chrome} ${chromeVisible ? "" : styles.chromeHidden}`}>
        <TopBar
          mode={mode}
          onModeChange={changeMode}
          onHideInterface={mode === "drill" ? undefined : () => setChromeHidden(true)}
        />

        {showStudioControls && (
          <>
            <CameraControl
              view={activeView}
              onViewChange={selectView}
              lightOpen={panel === "light"}
              onToggleLight={() => setPanel((open) => (open === "light" ? null : "light"))}
              appearanceOpen={panel === "appearance"}
              onToggleAppearance={
                mode === "pose" ? () => setPanel((open) => (open === "appearance" ? null : "appearance")) : undefined
              }
            />
            {panel === "light" && <LightControl light={light} onChange={setLight} onClose={() => setPanel(null)} />}
            {panel === "appearance" && mode === "pose" && (
              <AppearanceControl
                figure={posableId}
                appearance={appearance}
                onChange={(change) => setAppearance((current) => ({ ...current, ...change }))}
                onClose={() => setPanel(null)}
              />
            )}
          </>
        )}

        {mode === "pose" && (
          <PoseBrowser
            ref={browserRef}
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
            <PeelControl layer={layer} onLayerChange={setLayer} />
            <StudyPanel region={studyRegion} onRegionChange={selectRegion} />
          </>
        )}

        {mode === "pose" && !hasOrbited && (
          <p className={styles.hint}>Drag to orbit · Scroll to zoom · R for a random pose · Space hides the interface</p>
        )}
      </div>

      {mode === "drill" && <DrillInterface drill={drill} cardsHidden={chromeHidden} onClose={closeDrill} />}

      {chromeHidden && !drillActive && (
        // Same spot as the Hide button, so the toggle is always found in one place.
        <button type="button" className={styles.reveal} onClick={() => setChromeHidden(false)} title="Show interface (Space)">
          Show interface
        </button>
      )}
    </div>
  );
}
