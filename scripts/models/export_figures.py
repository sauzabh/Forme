"""
Convert Blender Studio's Human Base Meshes into lightweight web GLBs.

Usage:
  Blender -b --disable-autoexec <bundle.blend> --python export_figures.py -- <out_dir>

Each variant is processed from a freshly reloaded file so variants don't
affect each other. Output: one .glb per variant (no materials — the app
supplies its own clay material) plus a .png clay thumbnail.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT_DIR = argv[0]
BLEND_PATH = bpy.data.filepath
os.makedirs(OUT_DIR, exist_ok=True)

# id -> (collection name, multires level, subsurf level, target triangle count)
VARIANTS = {
    "female": ("Body Female - Realistic", 2, None, 120_000),
    "male": ("Body Male - Realistic", 2, None, 120_000),
    "female-forms": ("Body Female - Primitve (Realistic)", None, 2, 60_000),
    "male-forms": ("Body Male - Primitve (Realistic)", None, 2, 60_000),
    "skeleton": ("Skeleton - Realistic", None, 1, 90_000),
}


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def process(variant_id, collection_name, multires_level, subsurf_level, target_tris):
    bpy.ops.wm.open_mainfile(filepath=BLEND_PATH, load_ui=False, use_scripts=False)
    scene = bpy.context.scene
    keep = {o for o in bpy.data.collections[collection_name].all_objects if o.type == "MESH"}

    # Make sure everything we keep is linked into the active scene and visible.
    for o in keep:
        if o.name not in scene.objects:
            scene.collection.objects.link(o)
        o.hide_set(False)
        o.hide_viewport = False
        o.hide_render = False

    for o in list(scene.objects):
        if o not in keep:
            bpy.data.objects.remove(o, do_unlink=True)

    # Drivers in the source file reference controls we didn't keep.
    for o in keep:
        if o.animation_data:
            o.animation_data_clear()

    # Tune / strip modifiers, then bake them into real geometry.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for o in keep:
        for m in list(o.modifiers):
            if m.type == "MASK":
                o.modifiers.remove(m)
            elif m.type == "MULTIRES" and multires_level is not None:
                m.levels = multires_level
                m.render_levels = multires_level
            elif m.type == "SUBSURF" and subsurf_level is not None:
                m.levels = subsurf_level
                m.render_levels = subsurf_level
        o.data = o.data.copy()

    depsgraph = bpy.context.evaluated_depsgraph_get()
    for o in keep:
        evaluated = o.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=False, depsgraph=depsgraph)
        o.modifiers.clear()
        o.data = mesh

    # Join into a single mesh (world transforms are preserved).
    bpy.ops.object.select_all(action="DESELECT")
    objs = list(keep)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = variant_id
    obj.data.materials.clear()

    # Reduce to a web-friendly triangle budget.
    tris = tri_count(obj)
    if tris > target_tris:
        dec = obj.modifiers.new("decimate", "DECIMATE")
        dec.ratio = target_tris / tris
        bpy.ops.object.modifier_apply(modifier=dec.name)

    # Apply transforms, then center: feet on the ground, body centered on X/Y.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    coords = [v.co for v in obj.data.vertices]
    lo = Vector((min(c.x for c in coords), min(c.y for c in coords), min(c.z for c in coords)))
    hi = Vector((max(c.x for c in coords), max(c.y for c in coords), max(c.z for c in coords)))
    offset = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for v in obj.data.vertices:
        v.co -= offset
    for p in obj.data.polygons:
        p.use_smooth = True

    final_tris = tri_count(obj)
    size = hi - lo
    print(f"[export] {variant_id}: tris {tris} -> {final_tris}, size {tuple(round(s, 3) for s in size)}")

    glb_path = os.path.join(OUT_DIR, f"{variant_id}.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=False,
        export_materials="NONE",
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )
    print(f"[export] wrote {glb_path} ({os.path.getsize(glb_path) / 1e6:.2f} MB)")

    render_thumbnail(obj, size, os.path.join(OUT_DIR, f"{variant_id}.png"))


def render_thumbnail(obj, size, path):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (0.78, 0.76, 0.72)
    scene.display.shading.show_cavity = True
    scene.render.film_transparent = True
    scene.render.resolution_x = 240
    scene.render.resolution_y = 360
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"

    cam_data = bpy.data.cameras.new("thumb_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = max(size.z, size.x * 1.5) * 1.08
    cam = bpy.data.objects.new("thumb_cam", cam_data)
    scene.collection.objects.link(cam)
    # Three-quarter front view; the figures face -Y in Blender.
    angle = math.radians(-25)
    dist = 6.0
    cam.location = Vector((math.sin(angle) * dist, -math.cos(angle) * dist, size.z / 2))
    cam.rotation_euler = (math.radians(90), 0, angle)
    scene.camera = cam
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"[export] wrote {path}")


for vid, (col, mr, ss, tt) in VARIANTS.items():
    process(vid, col, mr, ss, tt)
