"""
Convert Quaternius Universal Base Characters + Universal Animation Library
(both CC0) into web files for Forme:

  <out>/models/figure-female.glb, figure-male.glb  rigged clay-ready bodies
                                                   (superseded by export_appearance.py,
                                                   which adds hair and clothing)
  <out>/models/poses.glb                           shared pose/motion library
  <out>/thumbnails/poses/<id>.png                  clay thumbnail per pose
  <out>/poses.json                                 pose metadata for the app

Usage:
  Blender -b --factory-startup --python export_quaternius.py -- <ubc_godot_dir> <ual.glb> <out_dir>
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

ubc_dir, ual_path, out_dir = sys.argv[sys.argv.index("--") + 1:]
os.makedirs(os.path.join(out_dir, "models"), exist_ok=True)
os.makedirs(os.path.join(out_dir, "thumbnails", "poses"), exist_ok=True)

# Clip name in the library -> (label, category, representative moment 0..1)
POSES = {
    "Idle_Loop": ("Standing", "Standing", 0.0),
    "Idle_Talking_Loop": ("Talking", "Standing", 0.35),
    "PickUp_Table": ("Reaching down", "Standing", 0.5),
    "Interact": ("Reaching out", "Standing", 0.45),
    "Push_Loop": ("Pushing", "Standing", 0.3),
    "Walk_Loop": ("Walking", "Motion", 0.25),
    "Walk_Formal_Loop": ("Striding", "Motion", 0.25),
    "Jog_Fwd_Loop": ("Jogging", "Motion", 0.3),
    "Sprint_Loop": ("Sprinting", "Motion", 0.3),
    "Jump_Start": ("Take-off", "Motion", 0.75),
    "Jump_Loop": ("Mid-air", "Motion", 0.3),
    "Jump_Land": ("Landing", "Motion", 0.2),
    "Roll": ("Rolling", "Motion", 0.35),
    "Dance_Loop": ("Dancing", "Motion", 0.3),
    "Swim_Fwd_Loop": ("Swimming", "Motion", 0.3),
    "Death01": ("Falling", "Motion", 0.45),
    "Punch_Jab": ("Jab", "Action", 0.35),
    "Punch_Cross": ("Cross", "Action", 0.4),
    "Sword_Attack": ("Swing", "Action", 0.45),
    "Spell_Simple_Shoot": ("Casting", "Action", 0.5),
    "Hit_Chest": ("Recoil", "Action", 0.6),
    "Crouch_Idle_Loop": ("Crouching", "Low", 0.0),
    "Crouch_Fwd_Loop": ("Crouch walk", "Low", 0.3),
    "Fixing_Kneeling": ("Kneeling", "Low", 0.35),
    "Sitting_Idle_Loop": ("Seated", "Seated", 0.0),
    "Sitting_Talking_Loop": ("Seated, talking", "Seated", 0.4),
    "Sitting_Enter": ("Sitting down", "Seated", 0.55),
    "Driving_Loop": ("Seated, reaching", "Seated", 0.2),
}


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def strip_helpers(keep_eyes=True):
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and (o.name.startswith("Icosphere") or o.name.startswith("Eyebrows") or (not keep_eyes and o.name.startswith("Eyes"))):
            bpy.data.objects.remove(o, do_unlink=True)


def keep_only_normal_map(size=1024):
    """Drop colour/roughness textures (the app uses its own clay colour) and
    shrink the normal map, which carries the muscle and surface detail."""
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf:
            continue
        # Only the body keeps its normal map; small parts (eyes) go fully
        # plain. (An eye texture once lost its image in WebP conversion and
        # broke loading of the whole figure.)
        if not mat.name.startswith("MI_Superhero"):
            for n in list(nodes):
                if n.type in ("TEX_IMAGE", "NORMAL_MAP"):
                    nodes.remove(n)
        for name in ("Base Color", "Roughness", "Metallic"):
            sock = bsdf.inputs.get(name)
            if sock:
                for link in list(sock.links):
                    links.remove(link)
        bsdf.inputs["Base Color"].default_value = (0.8, 0.78, 0.74, 1)
        bsdf.inputs["Roughness"].default_value = 0.7
        for n in nodes:
            if n.type == "TEX_IMAGE" and n.image and n.outputs[0].is_linked is False:
                nodes.remove(n)
        for n in nodes:
            if n.type == "TEX_IMAGE" and n.image and max(n.image.size) > size:
                n.image.scale(size, size)


def load_actions():
    bpy.ops.import_scene.gltf(filepath=ual_path)
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    return next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")


# ---- 1. Pose library: armature + curated actions only ----
clean_scene()
arm = load_actions()
fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
for action in list(bpy.data.actions):
    if action.name not in POSES:
        bpy.data.actions.remove(action)
for action in bpy.data.actions:
    action.use_fake_user = True
arm.animation_data_create()
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
poses_path = os.path.join(out_dir, "models", "poses.glb")
bpy.ops.export_scene.gltf(
    filepath=poses_path, export_format="GLB", use_selection=True,
    export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True,
    export_frame_step=2, export_def_bones=True, export_materials="NONE",
    # Drop keyframes that never change (e.g. constant bone scale) — much smaller file.
    export_optimize_animation_size=True,
)
manifest = []
for name, (label, category, moment) in POSES.items():
    action = bpy.data.actions[name]
    start, end = action.frame_range
    manifest.append({
        "id": name, "label": label, "category": category,
        "duration": round((end - start) / fps, 3), "moment": moment,
        "thumbnail": f"/thumbnails/poses/{name}.png",
    })
print(f"[export] poses.glb {os.path.getsize(poses_path) / 1e6:.2f} MB, {len(manifest)} poses, fps {fps}")

# ---- 2. Figures ----
for tag in ("Female", "Male"):
    clean_scene()
    bpy.ops.import_scene.gltf(filepath=os.path.join(ubc_dir, f"Superhero_{tag}_FullBody.gltf"))
    strip_helpers()
    keep_only_normal_map()
    figure_arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    height = max((o.matrix_world @ Vector(c)).z for o in bpy.context.scene.objects if o.type == "MESH" for c in o.bound_box)
    bpy.ops.object.select_all(action="SELECT")
    path = os.path.join(out_dir, "models", f"figure-{tag.lower()}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_animations=False,
        export_skins=True, export_materials="EXPORT", export_texcoords=True,
        # Smaller downloads: WebP texture + Draco-compressed geometry (the app
        # self-hosts the Draco decoder from the three.js package).
        export_image_format="WEBP", export_image_quality=88,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
        export_draco_position_quantization=14, export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12, export_draco_generic_quantization=12,
    )
    print(f"[export] {path} {os.path.getsize(path) / 1e6:.2f} MB height {height:.3f}")

# ---- 3. Pose thumbnails (female figure, clay) ----
clean_scene()
lib_arm = load_actions()
actions = {a.name: a for a in bpy.data.actions}
bpy.data.objects.remove(lib_arm, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ubc_dir, "Superhero_Female_FullBody.gltf"))
strip_helpers()
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
arm.animation_data_create()
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "SINGLE"
scene.display.shading.single_color = (0.80, 0.78, 0.74)
scene.display.shading.show_cavity = True
scene.render.film_transparent = True
scene.render.resolution_x = 160
scene.render.resolution_y = 200
cd = bpy.data.cameras.new("c")
cd.type = "ORTHO"
cd.ortho_scale = 2.25
cam = bpy.data.objects.new("c", cd)
scene.collection.objects.link(cam)
scene.camera = cam
a = math.radians(-30)
cam.location = Vector((math.sin(a) * 6, -math.cos(a) * 6, 0.92))
cam.rotation_euler = (math.radians(90), 0, a)
for entry in manifest:
    action = actions[entry["id"]]
    arm.animation_data.action = action
    if getattr(action, "slots", None):
        arm.animation_data.action_slot = action.slots[0]
    start, end = action.frame_range
    scene.frame_set(int(round(start + (end - start) * entry["moment"])))
    scene.render.filepath = os.path.join(out_dir, "thumbnails", "poses", f"{entry['id']}.png")
    bpy.ops.render.render(write_still=True)

with open(os.path.join(out_dir, "poses.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("[export] done")
