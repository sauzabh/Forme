/**
 * The figures available in the studio. Models are converted from Blender
 * Studio's CC0 Human Base Meshes (see reference/CREDITS.md). Heights and
 * widths are in metres and come from the exported files.
 */

export type FigureId = "female" | "male" | "female-forms" | "male-forms";

export type Figure = {
  id: FigureId;
  label: string;
  detail: string;
  model: string;
  thumbnail: string;
  height: number;
  width: number;
  /** A skeleton fitted to this figure, if one exists. Enables the Bone layer. */
  skeleton?: string;
};

export const FIGURES: Figure[] = [
  {
    id: "female",
    label: "Female",
    detail: "Realistic",
    model: "/models/female.glb",
    thumbnail: "/thumbnails/female.png",
    height: 1.639,
    width: 0.842,
  },
  {
    id: "male",
    label: "Male",
    detail: "Realistic",
    model: "/models/male.glb",
    thumbnail: "/thumbnails/male.png",
    height: 1.69,
    width: 0.883,
    skeleton: "/models/skeleton-male.glb",
  },
  {
    id: "female-forms",
    label: "Female",
    detail: "Forms",
    model: "/models/female-forms.glb",
    thumbnail: "/thumbnails/female-forms.png",
    height: 1.636,
    width: 0.898,
  },
  {
    id: "male-forms",
    label: "Male",
    detail: "Forms",
    model: "/models/male-forms.glb",
    thumbnail: "/thumbnails/male-forms.png",
    height: 1.695,
    width: 1.117,
  },
];

export function getFigure(id: FigureId): Figure {
  return FIGURES.find((figure) => figure.id === id) ?? FIGURES[0];
}
