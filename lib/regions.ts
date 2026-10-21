/**
 * Study regions. Positions are fractions of the figure's height so they
 * work for every figure: x is toward the figure's left, y is up from the
 * floor, z is toward the front. `radius` sets how tightly the camera frames
 * the region. Notes are carried over from the reference prototype.
 */

export type RegionId = "skull" | "ribcage" | "shoulder" | "hand" | "pelvis" | "knee" | "foot";

export type Region = {
  id: RegionId;
  name: string;
  note: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  azimuth?: number;
  polar?: number;
};

export const REGIONS: Region[] = [
  {
    id: "skull",
    name: "Skull",
    note: "Cranium and jaw read as two masses. Find the brow line before any feature.",
    x: 0, y: 0.925, z: 0.01, radius: 0.085, azimuth: 30, polar: 84,
  },
  {
    id: "ribcage",
    name: "Ribcage",
    note: "Twelve pairs of ribs, tilting down and forward. The near side opens in a twist.",
    x: 0, y: 0.73, z: 0.01, radius: 0.15, azimuth: 30, polar: 82,
  },
  {
    id: "shoulder",
    name: "Shoulder",
    note: "The blade slides on the ribcage. The deltoid caps the joint from three sides.",
    x: 0.11, y: 0.81, z: 0, radius: 0.1, azimuth: 55, polar: 80,
  },
  {
    id: "hand",
    name: "Hand",
    note: "Palm is one block, fingers taper in three joints. Thumb sits lower and forward.",
    x: 0.225, y: 0.47, z: 0.01, radius: 0.075, azimuth: 40, polar: 80,
  },
  {
    id: "pelvis",
    name: "Pelvis",
    note: "A bowl that tips with the weight-bearing leg. It sets the whole pose.",
    x: 0, y: 0.54, z: 0.01, radius: 0.13, azimuth: 30, polar: 84,
  },
  {
    id: "knee",
    name: "Knee",
    note: "Two condyles and the patella riding above them. Wider than the shaft above.",
    x: 0.055, y: 0.28, z: 0.01, radius: 0.09, azimuth: 35, polar: 84,
  },
  {
    id: "foot",
    name: "Foot",
    note: "A wedge, not a slab. The arch lifts on the inside edge.",
    x: 0.06, y: 0.03, z: 0.03, radius: 0.085, azimuth: 40, polar: 66,
  },
];

export function getRegion(id: RegionId): Region {
  return REGIONS.find((region) => region.id === id) ?? REGIONS[0];
}
