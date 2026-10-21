# 3D asset credits

## Human Base Meshes v1.4.1 — Blender Studio

- Source: https://www.blender.org/download/demo-files/ (Asset Bundles → Human Base Meshes)
- Direct file: https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip
- SHA-256 of the zip: `811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515`
- License: **CC0** (public domain — free for commercial use, no attribution required; credited here anyway)

Used for every file in `public/models/` and `public/thumbnails/`:

| App file | Source collection |
|---|---|
| `female.glb` | Body Female - Realistic |
| `male.glb` | Body Male - Realistic |
| `female-forms.glb` | Body Female - Primitive (Realistic) |
| `male-forms.glb` | Body Male - Primitive (Realistic) |
| `skeleton-male.glb` | Skeleton - Realistic, scaled ×0.962 and shifted 2 cm forward to sit inside `male.glb` |

The original zip is kept (git-ignored) in `reference/source-models/`. To regenerate the
web files, see the scripts in `scripts/models/` (they run in Blender's command line).

## Reference photos — Eadweard Muybridge, *Animal Locomotion* (1887)

- Source: University of Pennsylvania scans on Wikimedia Commons (files named `rbm-QP301M8-1887-…`)
- License: **Public domain** (published 1887; each file's Commons license was checked to be
  "Public domain" when downloaded)
- Used for every file in `public/photos/`. The per-photo Commons page, title and license are
  recorded in `lib/photos.json` and linked from the Drill screen.
- Only single frames of adult figures are included; anything involving children or animals is
  excluded by the download script. Nude studies are flagged (`nude: true`) so the app can filter them.
- Regenerate with `python3 -I scripts/photos/fetch_muybridge.py <download_dir> <manifest.json>`.

### Why not other "free reference" sites?

Sites such as Line of Action, Quickposes and SenshiStock are free to *practice from*, but their
terms don't clearly allow bundling the photos inside another app. Unsplash/Pexels forbid compiling
their photos into a similar service and require API attribution. Public-domain archives avoid all of that.
