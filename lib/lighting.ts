/**
 * Key-light presets. The light is fixed to the room, like a real studio
 * lamp: azimuth 0° lights the figure's front, 90° its left side, 180° its
 * back. Elevation is how high the lamp sits above the horizon.
 */

export type Light = { azimuth: number; elevation: number };

export type LightPreset = Light & { id: string; label: string; description: string };

export const LIGHT_PRESETS: LightPreset[] = [
  { id: "studio", label: "Studio", azimuth: 40, elevation: 42, description: "Soft three-quarter key" },
  { id: "rembrandt", label: "Rembrandt", azimuth: 55, elevation: 55, description: "High and to the side" },
  { id: "side", label: "Side", azimuth: 90, elevation: 30, description: "Splits the form in half" },
  { id: "rim", label: "Rim", azimuth: 150, elevation: 35, description: "Backlit edges" },
  { id: "top", label: "Top", azimuth: 10, elevation: 80, description: "Overhead, deep shadows" },
];

export const DEFAULT_LIGHT: Light = { azimuth: LIGHT_PRESETS[0].azimuth, elevation: LIGHT_PRESETS[0].elevation };

export const ELEVATION_MIN = 20;
export const ELEVATION_MAX = 85;

export function matchingPreset(light: Light): LightPreset | undefined {
  return LIGHT_PRESETS.find((p) => p.azimuth === light.azimuth && p.elevation === light.elevation);
}

/** Wrap any angle into the -180…180 range. */
export function normalizeAngle(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}
