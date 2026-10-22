# 3D asset credits

## Posable figures and pose library — Quaternius (CC0)

- **Universal Base Characters [Standard]** — https://quaternius.itch.io/universal-base-characters
- **Universal Animation Library [Standard]** — https://quaternius.itch.io/universal-animation-library
- **Modular Character Outfits – Fantasy [Standard]** — https://quaternius.itch.io/modular-character-outfits-fantasy
  (free Peasant and Ranger outfits; downloaded 2026-10-22)
- License: **CC0 1.0** (public domain dedication). All three archives contain a CC0 license file, and
  their itch.io pages stated CC0 on the download dates (2026-10-21 / 2026-10-22). Copies of those license files and page
  snapshots are in `reference/licenses/`. (Quaternius later introduced the "Quaternius Asset License"
  for new content; per its section 7 it is not retroactive, and it allows use inside finished products
  anyway — it only forbids redistributing the raw assets as an asset pack.)

| App file | Source |
|---|---|
| `public/models/figure-female.glb` | Superhero_Female_FullBody (normal map kept at 1024px), plus optional layers hidden by default: eyebrows, the Long / Buns / BuzzedFemale hairstyles, and fitted sportswear cut from the body |
| `public/models/figure-male.glb` | Superhero_Male_FullBody, same layers with the SimpleParted / Buzzed / Beard hairstyles |
| `public/models/figure-<female\|male>-<peasant\|ranger>.glb` | The Peasant / Ranger outfit (Ranger hood left out) with the base character's head, eyes, eyebrows and hairstyles moved onto it |
| `public/models/poses.glb` | 28 curated motions from UAL1_Standard (armature + animations only) |
| `public/thumbnails/poses/*.png` | Rendered from the above in Blender |
| `lib/poses.json` | Pose names/categories written by the export script |

Regenerate with `scripts/models/export_quaternius.py` (pose library, thumbnails) and then
`scripts/models/export_appearance.py` (figures with hair and clothing). Both run in Blender's
command line; source archives are kept (git-ignored) in `reference/source-models/`.

## Human Base Meshes v1.4.1 — Blender Studio

- Source: https://www.blender.org/download/demo-files/ (Asset Bundles → Human Base Meshes)
- Direct file: https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip
- SHA-256 of the zip: `811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515`
- License: **CC0** (public domain — free for commercial use, no attribution required; credited here anyway)

Used for every file in `public/models/` and `public/thumbnails/`:

Used for the Study-mode anatomy figure:

| App file | Source collection |
|---|---|
| `male.glb` | Body Male - Realistic |
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
  excluded by the download script, and every frame was reviewed by eye (frames with the model out of
  shot or too faded were dropped). Nude and topless draped studies are flagged (`nude: true`) so the
  app can filter them.
- Regenerate with `python3 -I scripts/photos/fetch_muybridge.py <download_dir> <manifest.json>`.

### Why not other "free reference" sites?

Sites such as Line of Action, Quickposes and SenshiStock are free to *practice from*, but their
terms don't clearly allow bundling the photos inside another app. Unsplash/Pexels forbid compiling
their photos into a similar service and require API attribution. Public-domain archives avoid all of that.
