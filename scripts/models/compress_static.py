"""Re-export static (unrigged) .glb files with Draco geometry compression.
Usage: Blender -b --factory-startup --python compress_static.py -- <in.glb> <out.glb> [<in.glb> <out.glb> ...]
"""
import os
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
for src, dst in zip(args[0::2], args[1::2]):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=dst, export_format="GLB", use_selection=True, export_yup=True,
        export_normals=True, export_texcoords=False, export_materials="NONE",
        export_animations=False, export_skins=False, export_morph=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
        export_draco_position_quantization=14, export_draco_normal_quantization=10,
    )
    print(f"[compress] {os.path.basename(src)}: {os.path.getsize(src) / 1e6:.2f} MB -> {os.path.getsize(dst) / 1e6:.2f} MB")
