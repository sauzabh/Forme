/**
 * Camera views and the maths that turns a "shot" into a camera position.
 *
 * Angles: azimuth 0° looks at the figure's front, 90° at its left side,
 * 180° at its back. Polar 90° is eye-level; smaller looks down from above.
 */
import type { RegionId } from "./regions";
import { getRegion } from "./regions";

export type ViewId = "front" | "three-quarter" | "side" | "back";

export const VIEWS: { id: ViewId; label: string; name: string; shortcut: string; azimuth: number }[] = [
  { id: "front", label: "Front", name: "Front view", shortcut: "1", azimuth: 0 },
  { id: "three-quarter", label: "¾", name: "Three-quarter view", shortcut: "2", azimuth: 35 },
  { id: "side", label: "Side", name: "Side view", shortcut: "3", azimuth: 90 },
  { id: "back", label: "Back", name: "Back view", shortcut: "4", azimuth: 180 },
];

export const VIEW_POLAR = 86;

/** What the camera should be looking at. Studio decides; the 3D rig obeys. */
export type Shot = {
  azimuth: number;
  polar: number;
  focus: RegionId | null;
};

export function viewShot(view: ViewId): Shot {
  const found = VIEWS.find((v) => v.id === view) ?? VIEWS[1];
  return { azimuth: found.azimuth, polar: VIEW_POLAR, focus: null };
}

type Vec3 = [number, number, number];

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Where to put the camera so the shot fills the screen nicely.
 * `fovDeg` is the camera's vertical field of view; `aspect` is width/height.
 */
export function shotPose(
  shot: Shot,
  figureHeight: number,
  figureWidth: number,
  fovDeg: number,
  aspect: number,
): { position: Vec3; target: Vec3 } {
  const vHalf = Math.tan(toRad(fovDeg) / 2);
  const hHalf = vHalf * aspect;

  let target: Vec3;
  let distance: number;
  let azimuth = shot.azimuth;
  let polar = shot.polar;

  if (shot.focus) {
    const region = getRegion(shot.focus);
    target = [region.x * figureHeight, region.y * figureHeight, region.z * figureHeight];
    const radius = region.radius * figureHeight;
    distance = radius / Math.min(vHalf, hHalf);
    azimuth = region.azimuth ?? azimuth;
    polar = region.polar ?? polar;
  } else {
    // Sit the figure above centre so the pose library along the bottom
    // never covers the feet, and leave breathing room above the head.
    target = [0, figureHeight * 0.4, 0];
    const byHeight = (figureHeight * 0.5) / (vHalf * 0.68);
    const byWidth = (figureWidth * 0.5) / (hHalf * 0.6);
    distance = Math.max(byHeight, byWidth);
  }

  const a = toRad(azimuth);
  const p = toRad(polar);
  const position: Vec3 = [
    target[0] + distance * Math.sin(p) * Math.sin(a),
    target[1] + distance * Math.cos(p),
    target[2] + distance * Math.sin(p) * Math.cos(a),
  ];
  return { position, target };
}
