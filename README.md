# Forme

A quiet, full-screen figure-drawing reference studio. A real sculpted human figure
fills the screen; the controls float lightly around it and disappear with one key.

- **Pose** — posable female/male figures with a 28-pose library (standing, motion, action,
  low, seated); scrub through each motion, orbit, set camera views, and move the key light.
- **Study** — an anatomy figure: pick a body region and the camera moves in close, and peel
  from skin to skeleton.
- **Drill** — timed gesture practice from either the 3D figure (new pose, angle and light
  each time) or public-domain reference photos.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Keyboard

| Key | Action |
|---|---|
| Space | Hide / show the interface (pauses during a drill) |
| 1 – 4 | Front, ¾, Side, Back views |
| L | Light controls |
| R | Random pose and angle (Pose mode) |
| Esc | Close / go back / end a drill |
| → | Next pose during a drill |

## Project layout

- `components/` — the interface (one file per control, each with its own `.module.css`)
- `components/3d/` — the 3D scene: lights, camera rig, model loading
- `lib/` — plain data and logic: figures, camera views, light presets, regions, drill timer
- `styles/tokens.css` — every colour, size, radius and shadow in one place
- `public/models/`, `public/thumbnails/`, `public/photos/` — 3D figures and reference photos
- `scripts/` — reproducible conversion/download scripts for those assets

## Assets and licenses

All bundled 3D models are CC0 (Quaternius, Blender Studio) and all reference photos are public
domain (Eadweard Muybridge, 1887). Sources and details: [`reference/CREDITS.md`](reference/CREDITS.md).
