/**
 * Optional hair and clothing for the posable figures. Everything is off by
 * default — the bare figure is the reference — and each layer is a mesh
 * skinned to the figure's own skeleton, so it follows every pose.
 *
 * - Hair: styles from Quaternius Universal Base Characters (CC0).
 * - Fitted: sportswear cut from the body itself (see export_appearance.py).
 * - Peasant / Ranger: outfits from Quaternius Modular Character Outfits -
 *   Fantasy (CC0). These replace the body below the neck, so they are
 *   separate model files, loaded only when chosen.
 */

export type PosableId = "female" | "male";

export type HairStyle = { id: string; label: string; meshes: string[] };

/** Eyebrows come with any hairstyle. */
const EYEBROWS = "Hair_Eyebrows";

export const HAIR_STYLES: Record<PosableId, HairStyle[]> = {
  female: [
    { id: "long", label: "Long", meshes: ["Hair_Long"] },
    { id: "buns", label: "Buns", meshes: ["Hair_Buns"] },
    { id: "short", label: "Short", meshes: ["Hair_BuzzedFemale"] },
  ],
  male: [
    { id: "parted", label: "Parted", meshes: ["Hair_SimpleParted"] },
    { id: "parted-beard", label: "Parted + beard", meshes: ["Hair_SimpleParted", "Hair_Beard"] },
    { id: "buzzed", label: "Buzzed", meshes: ["Hair_Buzzed"] },
    { id: "buzzed-beard", label: "Buzzed + beard", meshes: ["Hair_Buzzed", "Hair_Beard"] },
  ],
};

export type Clothing = "none" | "fitted" | "peasant" | "ranger";

export const CLOTHING_OPTIONS: { id: Clothing; label: string; detail: string }[] = [
  { id: "none", label: "None", detail: "The bare figure" },
  { id: "fitted", label: "Fitted", detail: "Tank top and shorts — the body still reads through" },
  { id: "peasant", label: "Peasant", detail: "Loose shirt, trousers and boots — folds to draw" },
  { id: "ranger", label: "Ranger", detail: "Layered tunic, belts and boots" },
];

export type Appearance = {
  hair: boolean;
  hairStyle: Record<PosableId, string>;
  clothing: Clothing;
};

export const DEFAULT_APPEARANCE: Appearance = {
  hair: false,
  hairStyle: { female: "long", male: "parted" },
  clothing: "none",
};

export function hairStyleFor(appearance: Appearance, figure: PosableId): HairStyle {
  const styles = HAIR_STYLES[figure];
  return styles.find((s) => s.id === appearance.hairStyle[figure]) ?? styles[0];
}

/** Names of the optional meshes to show on this figure. */
export function visibleParts(appearance: Appearance, figure: PosableId): string[] {
  const parts: string[] = [];
  if (appearance.hair) parts.push(EYEBROWS, ...hairStyleFor(appearance, figure).meshes);
  if (appearance.clothing === "fitted") parts.push("Clothes_Top", "Clothes_Bottom");
  return parts;
}

/** The model file for a figure in the chosen clothing. */
export function dressedModel(baseModel: string, clothing: Clothing): string {
  if (clothing === "peasant" || clothing === "ranger") return baseModel.replace(/\.glb$/, `-${clothing}.glb`);
  return baseModel;
}

/** True for meshes the app shows or hides as appearance layers. */
export function isOptionalPart(name: string): boolean {
  return name.startsWith("Hair_") || name.startsWith("Clothes_");
}
