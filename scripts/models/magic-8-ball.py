"""Builds public/models/magic-8-ball.glb.

Run from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scripts/models/magic-8-ball.py

The ball is modelled with the window on +Z and "up" on +Y. Before export the
whole model is baked into Blender's Z-up space so the glTF (Y-up) result has
the window facing +Z, toward the page's camera at rest.

The page reads the file with src/tools/magic-8-ball/lib/glb.ts, which handles
only what this export produces: nodes that only move, and triangle meshes with
float attributes and 16-bit indices. Its tests read the exported file.
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUTPUT_PATH = os.path.join(REPO_ROOT, "public", "models", "magic-8-ball.glb")

SHELL_RADIUS = 1.0
WINDOW_RADIUS = 0.42
POCKET_FLOOR_Z = 0.1
RIM_RADIUS = 0.47
GLASS_FRONT_Z = 0.84
LIQUID_FLOOR_Z = 0.12
DIE_RADIUS = 0.36
DIE_CENTER_Z = 0.5
DISC_RADIUS = 0.5
DISC_LIFT = 0.004
ANSWER_FACE_LIFT = 0.003


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for datablock in list(collection):
            collection.remove(datablock)


def make_material(name, color, roughness, alpha=1.0, emission=None, clearcoat=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["Clearcoat"].default_value = clearcoat
    if emission:
        bsdf.inputs["Emission"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.0
    if alpha < 1.0:
        material.blend_method = "BLEND"
    return material


MATERIALS = {}


def build_materials():
    MATERIALS["shell"] = make_material("ShellBlack", (0.008, 0.008, 0.01), 0.06, clearcoat=1.0)
    MATERIALS["rim"] = make_material("ShellRim", (0.012, 0.012, 0.015), 0.3)
    MATERIALS["white"] = make_material("DiscWhite", (0.9, 0.9, 0.88), 0.35)
    MATERIALS["ink"] = make_material("DiscInk", (0.01, 0.01, 0.012), 0.4)
    MATERIALS["glass"] = make_material("WindowGlass", (0.02, 0.025, 0.05), 0.02, alpha=0.3)
    MATERIALS["liquid"] = make_material("LiquidIndigo", (0.015, 0.012, 0.1), 0.9)
    MATERIALS["die"] = make_material("DieBlue", (0.03, 0.07, 0.45), 0.35)
    MATERIALS["answer"] = make_material(
        "AnswerBlue", (0.06, 0.12, 0.95), 0.5, emission=(0.04, 0.08, 0.8)
    )


def object_from_bmesh(name, builder, material, location=(0, 0, 0)):
    mesh_data = bpy.data.meshes.new(name)
    mesh = bmesh.new()
    builder(mesh)
    mesh.to_mesh(mesh_data)
    mesh.free()
    mesh_data.materials.append(material)
    obj = bpy.data.objects.new(name, mesh_data)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    return obj


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj, modifier):
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def smooth_shade(obj, angle_degrees=35):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.use_auto_smooth = True
    obj.data.auto_smooth_angle = math.radians(angle_degrees)


def build_shell():
    shell = object_from_bmesh(
        "Shell",
        lambda mesh: bmesh.ops.create_uvsphere(
            mesh, u_segments=56, v_segments=28, radius=SHELL_RADIUS
        ),
        MATERIALS["shell"],
    )
    pocket_height = 1.5 - POCKET_FLOOR_Z
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64,
        radius=WINDOW_RADIUS,
        depth=pocket_height,
        location=(0, 0, POCKET_FLOOR_Z + pocket_height / 2),
    )
    pocket_cutter = bpy.context.active_object
    cut = shell.modifiers.new("WindowPocket", "BOOLEAN")
    cut.operation = "DIFFERENCE"
    cut.solver = "EXACT"
    cut.object = pocket_cutter
    apply_modifier(shell, cut)
    bpy.data.objects.remove(pocket_cutter)
    for polygon in shell.data.polygons:
        polygon.material_index = 0

    rim = shell.modifiers.new("RimBevel", "BEVEL")
    rim.width = 0.045
    rim.segments = 4
    rim.limit_method = "ANGLE"
    rim.angle_limit = math.radians(30)
    apply_modifier(shell, rim)
    paint_window_rim(shell)
    smooth_shade(shell)
    return shell


def paint_window_rim(shell):
    shell.data.materials.clear()
    shell.data.materials.append(MATERIALS["shell"])
    shell.data.materials.append(MATERIALS["rim"])
    for polygon in shell.data.polygons:
        center = polygon.center
        if center.z > POCKET_FLOOR_Z / 2 and math.hypot(center.x, center.y) < RIM_RADIUS:
            polygon.material_index = 1


def chamfered_rectangle(center_x, bottom, top, width, chamfer):
    half = width / 2
    return [
        (center_x - half + chamfer, bottom),
        (center_x + half - chamfer, bottom),
        (center_x + half, bottom + chamfer),
        (center_x + half, top - chamfer),
        (center_x + half - chamfer, top),
        (center_x - half + chamfer, top),
        (center_x - half, top - chamfer),
        (center_x - half, bottom + chamfer),
    ]


def resample_closed(points, step):
    resampled = []
    for start, end in zip(points, points[1:] + points[:1]):
        length = math.dist(start, end)
        count = max(1, round(length / step))
        for index in range(count):
            t = index / count
            resampled.append(
                (start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t)
            )
    return resampled


def onto_back_surface(point, radius):
    x, y = point
    return (x, y, -math.sqrt(radius**2 - x**2 - y**2))


def build_disc_cap(mesh):
    radius = SHELL_RADIUS + DISC_LIFT
    max_angle = math.asin(DISC_RADIUS / SHELL_RADIUS)
    rings, segments = 8, 64
    center = mesh.verts.new((0, 0, -radius))
    previous = [center] * segments
    for ring in range(1, rings + 1):
        angle = max_angle * ring / rings
        current = [
            mesh.verts.new(
                (
                    radius * math.sin(angle) * math.cos(2 * math.pi * s / segments),
                    radius * math.sin(angle) * math.sin(2 * math.pi * s / segments),
                    -radius * math.cos(angle),
                )
            )
            for s in range(segments)
        ]
        for s in range(segments):
            n = (s + 1) % segments
            corners = [previous[s], previous[n], current[n], current[s]]
            mesh.faces.new(dict.fromkeys(corners))
        previous = current


def build_eight_stroke():
    loops = [
        chamfered_rectangle(0, 0.0, 0.23, 0.27, 0.06),
        chamfered_rectangle(0, -0.27, 0.0, 0.32, 0.07),
    ]
    curve = bpy.data.curves.new("EightStroke", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.017
    curve.bevel_resolution = 1
    curve.materials.append(MATERIALS["ink"])
    surface_radius = SHELL_RADIUS + DISC_LIFT + 0.004
    for loop in loops:
        points = [onto_back_surface(p, surface_radius) for p in resample_closed(loop, 0.02)]
        spline = curve.splines.new("POLY")
        spline.points.add(len(points) - 1)
        for spline_point, (x, y, z) in zip(spline.points, points):
            spline_point.co = (x, y, z, 1.0)
        spline.use_cyclic_u = True
    holder = bpy.data.objects.new("EightStroke", curve)
    bpy.context.collection.objects.link(holder)
    stroke_mesh = bpy.data.meshes.new_from_object(holder)
    bpy.data.objects.remove(holder)
    bpy.data.curves.remove(curve)
    return stroke_mesh


def build_eight_disc():
    disc = object_from_bmesh("EightDisc", build_disc_cap, MATERIALS["white"])
    stroke = bpy.data.objects.new("EightStroke", build_eight_stroke())
    bpy.context.collection.objects.link(stroke)
    activate(disc)
    stroke.select_set(True)
    bpy.ops.object.join()
    smooth_shade(disc, 60)
    return disc


def build_window():
    thickness = 0.02

    def build(mesh):
        bmesh.ops.create_cone(
            mesh,
            cap_ends=True,
            segments=64,
            radius1=WINDOW_RADIUS,
            radius2=WINDOW_RADIUS,
            depth=thickness,
        )

    window = object_from_bmesh(
        "Window", build, MATERIALS["glass"], (0, 0, GLASS_FRONT_Z - thickness / 2)
    )
    smooth_shade(window, 30)
    return window


def build_liquid():
    radius = WINDOW_RADIUS - 0.008
    depth = GLASS_FRONT_Z - LIQUID_FLOOR_Z

    def build(mesh):
        result = bmesh.ops.create_cone(
            mesh, cap_ends=False, segments=48, radius1=radius, radius2=radius, depth=depth
        )
        floor = [vert for vert in result["verts"] if vert.co.z < 0]
        mesh.faces.new(floor)
        bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces[:])
        bmesh.ops.reverse_faces(mesh, faces=mesh.faces[:])

    liquid = object_from_bmesh(
        "Liquid", build, MATERIALS["liquid"], (0, 0, LIQUID_FLOOR_Z + depth / 2)
    )
    smooth_shade(liquid, 30)
    return liquid


def front_face_alignment(die_mesh):
    face = die_mesh.faces[0]
    to_front = face.normal.rotation_difference(Vector((0, 0, 1)))
    rotated = [to_front @ vert.co for vert in face.verts]
    apex = max(rotated, key=lambda co: co.xy.length * 1.0 if co.y > 0 else -1)
    apex_angle = math.atan2(apex.y, apex.x)
    spin = Quaternion((0, 0, 1), math.pi / 2 - apex_angle)
    return spin @ to_front, face


def build_die():
    die_mesh = bmesh.new()
    bmesh.ops.create_icosphere(die_mesh, subdivisions=1, radius=DIE_RADIUS)
    die_mesh.faces.ensure_lookup_table()
    rotation, front_face = front_face_alignment(die_mesh)
    bmesh.ops.rotate(
        die_mesh,
        verts=die_mesh.verts[:],
        cent=(0, 0, 0),
        matrix=rotation.to_matrix(),
    )
    die_mesh.normal_update()
    front_corners = [vert.co.copy() for vert in front_face.verts]
    front_normal = front_face.normal.copy()

    die_data = bpy.data.meshes.new("Die")
    die_mesh.to_mesh(die_data)
    die_mesh.free()
    die_data.materials.append(MATERIALS["die"])
    die = bpy.data.objects.new("Die", die_data)
    die.location = (0, 0, DIE_CENTER_Z)
    bpy.context.collection.objects.link(die)
    return die, front_corners, front_normal


def build_answer_face(die, corners, normal):
    lifted = [corner + normal * ANSWER_FACE_LIFT for corner in corners]
    min_x, max_x = min(c.x for c in lifted), max(c.x for c in lifted)
    min_y, max_y = min(c.y for c in lifted), max(c.y for c in lifted)

    def build(mesh):
        verts = [mesh.verts.new(co) for co in lifted]
        face = mesh.faces.new(verts)
        uv_layer = mesh.loops.layers.uv.new("UVMap")
        for loop in face.loops:
            co = loop.vert.co
            loop[uv_layer].uv = (
                (co.x - min_x) / (max_x - min_x),
                (co.y - min_y) / (max_y - min_y),
            )
        bmesh.ops.recalc_face_normals(mesh, faces=[face])

    face = object_from_bmesh("AnswerFace", build, MATERIALS["answer"])
    face.parent = die
    return face


def bake_into_export_space(objects):
    """Rotate +Z (window) to Blender -Y so glTF's Y-up export puts it on +Z."""
    rotation = Matrix.Rotation(math.radians(90), 4, "X")
    for obj in objects:
        obj.data.transform(rotation)
        obj.location = rotation @ obj.location
        obj.data.update()


def export_glb(objects):
    activate(objects[0])
    for obj in objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_PATH,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_image_format="NONE",
        export_draco_mesh_compression_enable=False,
        use_selection=True,
    )


def main():
    clear_scene()
    build_materials()
    shell = build_shell()
    eight_disc = build_eight_disc()
    window = build_window()
    liquid = build_liquid()
    die, corners, normal = build_die()
    answer_face = build_answer_face(die, corners, normal)
    smooth_shade(die, 1)
    objects = [shell, eight_disc, window, liquid, die, answer_face]
    bake_into_export_space(objects)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    export_glb(objects)


main()
