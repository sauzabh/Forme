/**
 * Public-domain reference photos for Drill mode: single frames from
 * Eadweard Muybridge's "Animal Locomotion" (1887), University of
 * Pennsylvania scans on Wikimedia Commons. Regenerate with
 * scripts/photos/fetch_muybridge.py — see reference/CREDITS.md.
 */
import manifest from "./photos.json";

export type Photo = {
  id: string;
  file: string;
  /** What the model is doing, e.g. "Woman walking". */
  action: string;
  plate: number;
  nude: boolean;
  width: number;
  height: number;
  /** Wikimedia Commons page for the original file. */
  source: string;
  license: string;
};

export const PHOTOS: Photo[] = manifest;

export const PHOTO_CREDIT = "Eadweard Muybridge, Animal Locomotion (1887) · Public domain";

export function eligiblePhotos(includeNude: boolean): Photo[] {
  return includeNude ? PHOTOS : PHOTOS.filter((photo) => !photo.nude);
}

export function getPhoto(id: string): Photo | undefined {
  return PHOTOS.find((photo) => photo.id === id);
}
