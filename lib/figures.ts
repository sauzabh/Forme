/**
 * The figures in the studio. See reference/CREDITS.md for sources.
 *
 * - Posable figures (Pose and Drill modes): Quaternius Universal Base
 *   Characters, CC0, rigged — posed with the shared pose library.
 * - Anatomy figure (Study mode): Blender Studio realistic male, CC0, with a
 *   skeleton fitted inside it for the Bone layer.
 */

export type FigureId = "female" | "male" | "anatomy";

export type Figure = {
  id: FigureId;
  label: string;
  model: string;
  /** Standing height in metres, used for camera framing. */
  height: number;
  width: number;
  /** Rigged figures take poses from the pose library. */
  posable: boolean;
  /** A skeleton fitted to this figure, if one exists. Enables the Bone layer. */
  skeleton?: string;
};

export const POSABLE_FIGURES: Figure[] = [
  { id: "female", label: "Female", model: "/models/figure-female.glb", height: 1.767, width: 0.9, posable: true },
  { id: "male", label: "Male", model: "/models/figure-male.glb", height: 1.81, width: 0.95, posable: true },
];

export const ANATOMY_FIGURE: Figure = {
  id: "anatomy",
  label: "Anatomy",
  model: "/models/male.glb",
  height: 1.69,
  width: 0.883,
  posable: false,
  skeleton: "/models/skeleton-male.glb",
};

export const ALL_FIGURES: Figure[] = [...POSABLE_FIGURES, ANATOMY_FIGURE];

export function getFigure(id: FigureId): Figure {
  return ALL_FIGURES.find((figure) => figure.id === id) ?? POSABLE_FIGURES[0];
}
