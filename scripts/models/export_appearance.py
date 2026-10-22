"""
Re-export the posable figures with optional appearance layers, all skinned
to the figure's own skeleton so they follow every pose:

  Hair_<Style>   hairstyles from the Universal Base Characters pack (CC0),
                 moved from the pack's reference head onto this figure's head
  Hair_Eyebrows  the figure's own eyebrows
  Clothes_Top / Clothes_Bottom
                 fitted sportswear cut from the body itself and pushed out a
                 few millimetres, so it keeps the body's skin weights

and, as separate figures, the Peasant and Ranger outfits from Quaternius'
Modular Character Outfits - Fantasy (CC0): the outfit's own clothed body
plus this figure's head, eyes, eyebrows and hairstyles.

  figure-<female|male>.glb
  figure-<female|male>-<peasant|ranger>.glb

The app hides every Hair_* / Clothes_* mesh until the artist turns it on.
Materials are renamed Skin / Cloth / Hair so the app can tint each one.

Usage:
  Blender -b --factory-startup --python export_appearance.py -- \
    <ubc_godot_dir> <ubc_hair_gltf_dir> <outfits_gltf_dir> <out_models_dir>
"""
import os
import sys

import bmesh
import bpy

ubc_dir, hair_dir, outfit_dir, out_dir = sys.argv[sys.argv.index("--") + 1:]

OUTFITS = ("Peasant", "Ranger")
# Outfit parts left out: the hood hides the face, which is what you draw.
OUTFIT_SKIP = ("Hood",)

HAIR = {
    "Female": ["Hair_Long", "Hair_Buns", "Hair_BuzzedFemale"],
    "Male": ["Hair_SimpleParted", "Hair_Buzzed", "Hair_Beard"],
}

# Garment push-out from the skin (metres). The top sits just outside the
# shorts so it overlaps them neatly at the waist.
OFFSET = {"Clothes_Top": 0.0055, "Clothes_Bottom": 0.004}
ARM_BONES = {"upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r", "hand_l", "hand_r"}


def material_role(name):
    if name.startswith(("MI_Peasant", "MI_Ranger")):
        return "Cloth"
    if name.startswith(("MI_Superhero", "MI_Regular", "MI_Eye", "MI_Body")):
        return "Skin"
    return None


def plain_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat


def keep_only_body_normal_map(size=1024):
    """Same as export_quaternius.py: the app paints its own clay colour, so
    only the body's normal map (muscle detail) is kept."""
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf:
            continue
        # Keep normal maps for the body (muscle) and outfits (folds, seams).
        if not mat.name.startswith(("MI_Superhero", "MI_Peasant", "MI_Ranger")):
            for n in list(nodes):
                if n.type in ("TEX_IMAGE", "NORMAL_MAP"):
                    nodes.remove(n)
        for sock_name in ("Base Color", "Roughness", "Metallic", "Alpha"):
            sock = bsdf.inputs.get(sock_name)
            if sock:
                for link in list(sock.links):
                    links.remove(link)
        bsdf.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)
        bsdf.inputs["Roughness"].default_value = 0.7
        for n in list(nodes):
            if n.type == "TEX_IMAGE" and n.image and not n.outputs[0].is_linked:
                nodes.remove(n)
        for n in nodes:
            if n.type == "TEX_IMAGE" and n.image and max(n.image.size) > size:
                n.image.scale(size, size)


def rest_head(arm):
    return arm.matrix_world @ arm.data.bones["Head"].matrix_local


def rebind(mesh, src_arm, arm):
    """Move a mesh skinned to src_arm onto arm, lining up their heads."""
    delta = rest_head(arm) @ rest_head(src_arm).inverted()
    world = mesh.matrix_world.copy()
    mesh.parent = None
    mesh.matrix_world = delta @ world
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh.parent = arm
    mesh.matrix_parent_inverse = arm.matrix_world.inverted()
    for mod in mesh.modifiers:
        if mod.type == "ARMATURE":
            mod.object = arm


def add_hair(style, arm):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(hair_dir, f"{style}.gltf"))
    new = set(bpy.context.scene.objects) - before
    hair_arm = next(o for o in new if o.type == "ARMATURE")
    mesh = next(o for o in new if o.type == "MESH" and o.name.startswith(style))
    # The pack fits hair to its own reference head; move it onto ours.
    rebind(mesh, hair_arm, arm)
    mesh.name = style
    mesh.data.materials.clear()
    mesh.data.materials.append(plain_material("Hair"))
    for o in new:
        if o is not mesh:
            bpy.data.objects.remove(o, do_unlink=True)


def cut_garment(body, name, z_min, z_max, arm_x=None):
    """Copy the body and keep the faces whose centre lies between two heights
    (and, for a top, inside the armholes), then push the copy out along its
    normals. Straight, horizontal cut lines read as a hem rather than a jagged
    edge. Skin weights come along with the copy, so it follows every pose."""
    garment = body.copy()
    garment.data = body.data.copy()
    garment.name = name
    bpy.context.scene.collection.objects.link(garment)
    arm_ids = {g.index for g in garment.vertex_groups if g.name in ARM_BONES}
    bm = bmesh.new()
    bm.from_mesh(garment.data)
    deform = bm.verts.layers.deform.verify()
    world = garment.matrix_world

    def keep(face):
        centre = world @ face.calc_center_median()
        if not (z_min <= centre.z <= z_max):
            return False
        if arm_x is not None:
            if abs(centre.x) > arm_x:
                return False
            if any(sum(w for gi, w in v[deform].items() if gi in arm_ids) > 0.5 for v in face.verts):
                return False
        return True

    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * OFFSET[name]
    bm.to_mesh(garment.data)
    bm.free()
    garment.data.materials.clear()
    garment.data.materials.append(plain_material("Cloth"))
    return garment


def remove_icospheres():
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and o.name.startswith("Icosphere"):
            bpy.data.objects.remove(o, do_unlink=True)


def import_base(tag):
    """Import the base character; return (armature, body, eyes, eyebrows)."""
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ubc_dir, f"Superhero_{tag}_FullBody.gltf"))
    remove_icospheres()
    new = set(bpy.context.scene.objects) - before
    arm = next(o for o in new if o.type == "ARMATURE")
    meshes = [o for o in new if o.type == "MESH" and o.name in bpy.data.objects]
    body = max(meshes, key=lambda o: len(o.data.polygons))
    eyes = next(o for o in meshes if o.name.lower().startswith("eyes"))
    eyebrows = next(o for o in meshes if "eyebrow" in o.name.lower())
    eyebrows.name = "Hair_Eyebrows"
    eyebrows.data.materials.clear()
    eyebrows.data.materials.append(plain_material("Hair"))
    return arm, body, eyes, eyebrows


def name_materials():
    """Rename materials to the role the app tints them as."""
    for mat in list(bpy.data.materials):
        role = material_role(mat.name)
        if role:
            mat.name = role


def export(path):
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            print(f"[appearance]   {o.name}: {len(o.data.polygons)} faces, {[m.name for m in o.data.materials]}")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_animations=False,
        export_skins=True, export_materials="EXPORT", export_texcoords=True,
        export_image_format="WEBP", export_image_quality=88,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
        export_draco_position_quantization=14, export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12, export_draco_generic_quantization=12,
    )
    print(f"[appearance] {path} {os.path.getsize(path) / 1e6:.2f} MB")


def build_base(tag):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    arm, body, _eyes, _eyebrows = import_base(tag)
    keep_only_body_normal_map()
    for style in HAIR[tag]:
        add_hair(style, arm)

    # Cut lines from the skeleton, so they land in the same place on both bodies.
    def joint(bone):
        return arm.matrix_world @ arm.data.bones[bone].head_local

    waist = joint("pelvis").z + (joint("spine_02").z - joint("pelvis").z) * 0.55
    neckline = joint("neck_01").z - 0.035
    hem = joint("thigh_l").z + (joint("calf_l").z - joint("thigh_l").z) * 0.38
    armhole = abs(joint("upperarm_l").x) * 0.92
    cut_garment(body, "Clothes_Top", waist - 0.03, neckline, arm_x=armhole)
    cut_garment(body, "Clothes_Bottom", hem, waist)
    name_materials()
    export(os.path.join(out_dir, f"figure-{tag.lower()}.glb"))


def keep_head_only(body, arm):
    """Trim the base body down to the head and upper neck — the outfit
    supplies everything below the collar."""
    neck = (arm.matrix_world @ arm.data.bones["neck_01"].head_local).z
    ids = {g.index for g in body.vertex_groups if g.name in ("Head", "neck_01")}
    bm = bmesh.new()
    bm.from_mesh(body.data)
    deform = bm.verts.layers.deform.verify()

    def keep(face):
        centre = body.matrix_world @ face.calc_center_median()
        driven = all(sum(w for gi, w in v[deform].items() if gi in ids) >= 0.5 for v in face.verts)
        return driven and centre.z >= neck - 0.03

    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(body.data)
    bm.free()
    body.name = "Head"


def build_outfit(tag, outfit):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(outfit_dir, f"{tag}_{outfit}.gltf"))
    remove_icospheres()
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and any(part in o.name for part in OUTFIT_SKIP):
            bpy.data.objects.remove(o, do_unlink=True)
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            o.name = f"Outfit_{o.name}"

    base_arm, body, eyes, eyebrows = import_base(tag)
    keep_head_only(body, base_arm)
    for mesh in (body, eyes, eyebrows):
        rebind(mesh, base_arm, arm)
    bpy.data.objects.remove(base_arm, do_unlink=True)
    keep_only_body_normal_map()
    for style in HAIR[tag]:
        add_hair(style, arm)
    name_materials()
    export(os.path.join(out_dir, f"figure-{tag.lower()}-{outfit.lower()}.glb"))


for tag in ("Female", "Male"):
    build_base(tag)
    for outfit in OUTFITS:
        build_outfit(tag, outfit)
