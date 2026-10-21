"""Bake the skeleton's fit to the male body into its own GLB, then render a
side-view check. Usage:
  Blender -b --factory-startup --python bake_skeleton_fit.py -- <export_dir> <check_png>
"""
import math
import os
import sys

import bpy
from mathutils import Vector

export_dir, check_png = sys.argv[sys.argv.index("--") + 1:]
SCALE = 0.962  # male height / skeleton height
FORWARD = -0.02  # metres along Blender -Y (the figures face -Y)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(export_dir, "skeleton.glb"))
skel = [o for o in bpy.context.selected_objects if o.type == "MESH"][0]
bpy.context.view_layer.objects.active = skel
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for v in skel.data.vertices:
    v.co = v.co * SCALE + Vector((0, FORWARD, 0))
skel.name = "skeleton-male"

bpy.ops.object.select_all(action="DESELECT")
skel.select_set(True)
out = os.path.join(export_dir, "skeleton-male.glb")
bpy.ops.export_scene.gltf(
    filepath=out, export_format="GLB", use_selection=True, export_yup=True,
    export_normals=True, export_texcoords=False, export_materials="NONE",
    export_animations=False, export_skins=False, export_morph=False,
)
print(f"[bake] wrote {out} ({os.path.getsize(out) / 1e6:.2f} MB)")

# Side-view check with the male body.
bpy.ops.import_scene.gltf(filepath=os.path.join(export_dir, "male.glb"))
body = [o for o in bpy.context.selected_objects if o.type == "MESH"][0]
mb = bpy.data.materials.new("b"); mb.diffuse_color = (0.6, 0.6, 0.6, 1)
ms = bpy.data.materials.new("s"); ms.diffuse_color = (0.8, 0.3, 0.2, 1)
body.data.materials.append(mb); skel.data.materials.append(ms)
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_xray = True
scene.display.shading.xray_alpha = 0.35
scene.render.resolution_x = 360
scene.render.resolution_y = 480
cd = bpy.data.cameras.new("c"); cd.type = "ORTHO"; cd.ortho_scale = 1.9
cam = bpy.data.objects.new("c", cd); scene.collection.objects.link(cam); scene.camera = cam
cam.location = Vector((6, 0, 0.85)); cam.rotation_euler = (math.radians(90), 0, math.radians(90))
scene.render.filepath = check_png
bpy.ops.render.render(write_still=True)
