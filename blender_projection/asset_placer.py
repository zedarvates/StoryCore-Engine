"""
asset_placer.py - Plantation procedurale d'assets 3D et sprites 2D
===================================================================
Genere du code Python Blender (mesh 3D procéduraux + sprites billboard).
"""
from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from blender_projection.asset_library import (
    AssetLibrary, AssetDef, AssetType, AssetCategory, SceneContext,
)
_LIB = AssetLibrary()


class AssetPlacer:
    """Genere du code Python Blender pour la plantation procedurale d'assets."""

    def __init__(self):
        self.lib = _LIB

    def generate_placement_code(
        self,
        asset_id: str,
        count: int,
        area_bounds: Tuple[float, float, float, float] = (-5.0, 5.0, 0.0, 8.0),
        seed: int = 42,
        camera_name: str = "Camera",
    ) -> str:
        asset = self.lib.get_by_id(asset_id)
        if asset is None:
            return f"# [AssetPlacer] Asset inconnu: {asset_id}\n"
        if asset.asset_type == AssetType.SPRITE_2D:
            return self._sprite_code(asset, count, area_bounds, seed, camera_name)
        return self._mesh3d_code(asset, count, area_bounds, seed)

    def generate_full_script(
        self,
        placements: List[Dict[str, Any]],
        camera_name: str = "Camera",
        output_path: str = "./exports/blender/placement_test.py",
    ) -> str:
        lines = [
            "#!/usr/bin/env python3",
            '"""Script de plantation procedurale - StoryCore-Engine"""',
            "import bpy, math, random",
            "",
        ]
        for i, p in enumerate(placements):
            asset_id = p.get("asset_id", "")
            count = p.get("count", 1)
            area = p.get("area", (-5.0, 5.0, 0.0, 8.0))
            seed = p.get("seed", 42 + i)
            lines.append(f"# --- {asset_id} x{count} ---")
            lines.append(self.generate_placement_code(
                asset_id=asset_id, count=count,
                area_bounds=tuple(area), seed=seed, camera_name=camera_name,
            ))
        script = "\n".join(lines)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(script)
        return output_path

    def suggest_and_place(
        self,
        narrative_tags: List[str],
        scene_context: str = "exterior",
        density: str = "medium",
        output_path: str = "./exports/blender/auto_placement.py",
    ) -> str:
        ctx = SceneContext.EXTERIOR if scene_context == "exterior" else SceneContext.INTERIOR
        suggestions = self.lib.suggest_for_scene(narrative_tags, context=ctx)
        density_map = {"light": 2, "medium": 5, "heavy": 10}
        base_count = density_map.get(density, 5)
        placements = []
        for category, assets in suggestions.items():
            for asset in assets[:2]:
                count = base_count
                if asset.asset_type == AssetType.SPRITE_2D:
                    count = base_count * 3
                if category == AssetCategory.PROPS:
                    count = max(1, base_count // 2)
                placements.append({
                    "asset_id": asset.id, "count": count,
                    "area": (-8.0, 8.0, 0.0, 12.0),
                    "seed": abs(hash(asset.id)) % 9999,
                })
        return self.generate_full_script(placements, output_path=output_path)

    # ── GENERATEURS INTERNES ─────────────────────────────────────────────────

    def _mesh3d_code(self, asset: AssetDef, count: int,
                     area_bounds: Tuple[float,float,float,float], seed: int) -> str:
        x0, x1, y0, y1 = area_bounds
        s0, s1 = asset.scale_range
        r0, r1 = asset.rot_y_range
        h = asset.height_offset
        fn = f"place_{asset.id}"
        geo = _GENERATORS.get(asset.id, _GENERATORS["_default"])(asset.id)
        return f"""
def {fn}():
    rng = random.Random({seed})
    placed = []
    for _i in range({count}):
        x = rng.uniform({x0}, {x1})
        y = rng.uniform({y0}, {y1})
        s = rng.uniform({s0}, {s1})
        rz = math.radians(rng.uniform({r0}, {r1}))
        ok = all(math.sqrt((x-px)**2+(y-py)**2) >= s*0.6 for px,py in placed)
        if not ok:
            continue
        obj = {geo}
        if obj:
            obj.location = (x, y, {h})
            obj.scale = (s, s, s * rng.uniform(0.9, 1.1))
            obj.rotation_euler = (0, 0, rz)
            obj.name = f"{asset.id}_{{_i:03d}}"
            placed.append((x, y))
{fn}()
"""

    def _sprite_code(self, asset: AssetDef, count: int,
                     area_bounds: Tuple[float,float,float,float],
                     seed: int, camera_name: str) -> str:
        x0, x1, y0, y1 = area_bounds
        s0, s1 = asset.scale_range
        r0, r1 = asset.rot_y_range
        h = asset.height_offset
        fn = f"place_sprite_{asset.id}"
        shadow = asset.cast_shadow
        return f"""
def {fn}():
    rng = random.Random({seed})
    cam = bpy.data.objects.get("{camera_name}")
    for _i in range({count}):
        x = rng.uniform({x0}, {x1})
        y = rng.uniform({y0}, {y1})
        s = rng.uniform({s0}, {s1})
        rz = math.radians(rng.uniform({r0}, {r1}))
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=(x, y, {h}))
        obj = bpy.context.active_object
        obj.name = f"{asset.id}_spr_{{_i:03d}}"
        obj.scale = (s, s, s)
        obj.rotation_euler = (math.radians(90), 0, rz)
        mat = bpy.data.materials.new(name=f"{asset.id}_m_{{_i}}")
        mat.use_nodes = True
        mat.blend_method = "CLIP"
        mat.shadow_method = "CLIP" if {shadow} else "NONE"
        obj.data.materials.append(mat)
        if cam:
            c = obj.constraints.new(type="TRACK_TO")
            c.target = cam
            c.track_axis = "TRACK_Z"
            c.up_axis = "UP_Y"
{fn}()
"""


# ── GENERATEURS DE GEOMETRIE ──────────────────────────────────────────────────
def _g_conifer(aid):
    return """_conifer()
def _conifer():
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=2.0, location=(0,0,1))
    t = bpy.context.active_object
    m = bpy.data.materials.new("bark"); m.diffuse_color=(0.25,0.15,0.08,1)
    t.data.materials.append(m)
    cones=[]
    for r,h,z in [(1.2,1.5,1.5),(0.9,1.3,2.3),(0.6,1.1,2.9)]:
        bpy.ops.mesh.primitive_cone_add(radius1=r,depth=h,location=(0,0,z))
        c=bpy.context.active_object
        lm=bpy.data.materials.new("leaf"); lm.diffuse_color=(0.1,0.4,0.15,1)
        c.data.materials.append(lm); cones.append(c)
    bpy.ops.object.select_all(action="DESELECT")
    for c in cones: c.select_set(True)
    t.select_set(True); bpy.context.view_layer.objects.active=t
    bpy.ops.object.join()
    return bpy.context.active_object"""

def _g_deciduous(aid):
    return """_deciduous()
def _deciduous():
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1,depth=2.2,location=(0,0,1.1))
    t=bpy.context.active_object
    m=bpy.data.materials.new("bark2"); m.diffuse_color=(0.3,0.18,0.1,1)
    t.data.materials.append(m)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1.4,location=(0,0,2.8))
    cr=bpy.context.active_object
    lm=bpy.data.materials.new("leaves"); lm.diffuse_color=(0.15,0.45,0.1,1)
    cr.data.materials.append(lm)
    bpy.ops.object.select_all(action="DESELECT")
    cr.select_set(True); t.select_set(True)
    bpy.context.view_layer.objects.active=t; bpy.ops.object.join()
    return bpy.context.active_object"""

def _g_palm(aid):
    return """_palm()
def _palm():
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12,depth=4.0,location=(0,0,2.0))
    t=bpy.context.active_object
    m=bpy.data.materials.new("pbark"); m.diffuse_color=(0.55,0.4,0.25,1)
    t.data.materials.append(m)
    leaves=[]
    for ang in range(0,360,45):
        import math as _m
        rad=_m.radians(ang); ex,ey=_m.cos(rad)*0.75,_m.sin(rad)*0.75
        bpy.ops.mesh.primitive_plane_add(size=0.4,location=(ex,ey,4.2))
        l=bpy.context.active_object
        l.scale=(0.3,1.5,1.0); l.rotation_euler=(0,_m.radians(-30),rad)
        lm=bpy.data.materials.new("pleaf"); lm.diffuse_color=(0.1,0.5,0.15,1)
        l.data.materials.append(lm); leaves.append(l)
    bpy.ops.object.select_all(action="DESELECT")
    for l in leaves: l.select_set(True)
    t.select_set(True); bpy.context.view_layer.objects.active=t
    bpy.ops.object.join(); return bpy.context.active_object"""

def _g_dead(aid):
    return """_dead_tree()
def _dead_tree():
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09,depth=2.5,location=(0,0,1.25))
    t=bpy.context.active_object
    m=bpy.data.materials.new("dbark"); m.diffuse_color=(0.2,0.17,0.14,1)
    t.data.materials.append(m)
    import math as _m; br=[]
    for ang,tilt,h in [(45,40,2.0),(135,35,2.3),(225,38,1.8),(315,42,2.1)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04,depth=1.2,location=(0,0,h))
        b=bpy.context.active_object
        b.rotation_euler=(_m.radians(tilt),0,_m.radians(ang))
        b.data.materials.append(m); br.append(b)
    bpy.ops.object.select_all(action="DESELECT")
    for b in br: b.select_set(True)
    t.select_set(True); bpy.context.view_layer.objects.active=t
    bpy.ops.object.join(); return bpy.context.active_object"""

def _g_rock(aid):
    return """_rock()
def _rock():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=0.6)
    r=bpy.context.active_object
    bpy.ops.object.mode_set(mode="EDIT")
    import bmesh as _bm,random as _rnd,mathutils as _mu
    bm=_bm.from_edit_mesh(r.data); _rnd.seed(99)
    for v in bm.verts:
        v.co+=_mu.Vector((_rnd.uniform(-.15,.15),_rnd.uniform(-.15,.15),_rnd.uniform(-.08,.08)))
    _bm.update_edit_mesh(r.data)
    bpy.ops.object.mode_set(mode="OBJECT")
    r.scale=(1.0,_rnd.uniform(.6,.9),_rnd.uniform(.5,.8))
    m=bpy.data.materials.new("rock")
    m.diffuse_color=(_rnd.uniform(.35,.55),_rnd.uniform(.3,.45),_rnd.uniform(.28,.4),1.0)
    m.roughness=0.9; r.data.materials.append(m); return r"""

def _g_boulder(aid):
    return """_boulder()
def _boulder():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1.2)
    r=bpy.context.active_object
    bpy.ops.object.mode_set(mode="EDIT")
    import bmesh as _bm,random as _rnd,mathutils as _mu
    bm=_bm.from_edit_mesh(r.data); _rnd.seed(77)
    for v in bm.verts:
        v.co+=_mu.Vector((_rnd.uniform(-.3,.3),_rnd.uniform(-.3,.3),_rnd.uniform(-.15,.15)))
    _bm.update_edit_mesh(r.data)
    bpy.ops.object.mode_set(mode="OBJECT")
    r.scale=(1.0,_rnd.uniform(.7,1.0),_rnd.uniform(.5,.8))
    m=bpy.data.materials.new("boulder"); m.diffuse_color=(.42,.38,.33,1.0); m.roughness=0.95
    r.data.materials.append(m); return r"""

def _g_rock_cluster(aid):
    return """_rock_cluster()
def _rock_cluster():
    import random as _rnd; _rnd.seed(55); objs=[]
    for k in range(_rnd.randint(3,6)):
        r=_rnd.uniform(0.1,0.35)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,
            location=(_rnd.uniform(-.4,.4),_rnd.uniform(-.3,.3),r*.3))
        s=bpy.context.active_object
        m=bpy.data.materials.new(f"stone_{k}")
        m.diffuse_color=(_rnd.uniform(.3,.5),_rnd.uniform(.28,.45),_rnd.uniform(.25,.4),1.0)
        s.data.materials.append(m); objs.append(s)
    if len(objs)>1:
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0]; bpy.ops.object.join()
    return bpy.context.active_object"""

def _g_bush(aid):
    return """_bush()
def _bush():
    import random as _rnd; _rnd.seed(33); spheres=[]
    for k in range(_rnd.randint(4,7)):
        r=_rnd.uniform(0.3,0.6)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,
            location=(_rnd.uniform(-.5,.5),_rnd.uniform(-.4,.4),r*.5))
        s=bpy.context.active_object
        m=bpy.data.materials.new(f"bl_{k}")
        m.diffuse_color=(0.08,_rnd.uniform(.3,.5),0.07,1.0)
        s.data.materials.append(m); spheres.append(s)
    if len(spheres)>1:
        bpy.ops.object.select_all(action="DESELECT")
        for s in spheres: s.select_set(True)
        bpy.context.view_layer.objects.active=spheres[0]; bpy.ops.object.join()
    return bpy.context.active_object"""

def _g_fern(aid):
    return """_fern()
def _fern():
    import math as _m,random as _rnd; _rnd.seed(88); fronds=[]
    for k in range(8):
        bpy.ops.mesh.primitive_plane_add(size=0.6,location=(0,0,0.3))
        f=bpy.context.active_object
        f.scale=(0.15,0.8,1.0)
        f.rotation_euler=(_m.radians(_rnd.uniform(30,60)),0,_m.radians(k*45))
        m=bpy.data.materials.new(f"fern_{k}")
        m.diffuse_color=(0.08,_rnd.uniform(.35,.5),0.08,1.0)
        f.data.materials.append(m); fronds.append(f)
    bpy.ops.object.select_all(action="DESELECT")
    for f in fronds: f.select_set(True)
    bpy.context.view_layer.objects.active=fronds[0]; bpy.ops.object.join()
    return bpy.context.active_object"""

def _g_cactus(aid):
    return """_cactus()
def _cactus():
    bpy.ops.mesh.primitive_cylinder_add(radius=0.18,depth=2.0,location=(0,0,1.0))
    b=bpy.context.active_object
    m=bpy.data.materials.new("cactus"); m.diffuse_color=(0.1,0.4,0.12,1.0)
    b.data.materials.append(m); arms=[]
    import math as _m
    for side in [1,-1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.1,depth=1.0,
            location=(side*.3,0,1.2))
        a=bpy.context.active_object
        a.rotation_euler=(0,_m.radians(side*80),0)
        a.data.materials.append(m); arms.append(a)
    bpy.ops.object.select_all(action="DESELECT")
    for a in arms: a.select_set(True)
    b.select_set(True); bpy.context.view_layer.objects.active=b
    bpy.ops.object.join(); return bpy.context.active_object"""

def _g_lamp(aid):
    return """_lamp()
def _lamp():
    m=bpy.data.materials.new("metal"); m.diffuse_color=(.2,.2,.22,1); m.metallic=.9; m.roughness=.3
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04,depth=4.0,location=(0,0,2.0))
    p=bpy.context.active_object; p.data.materials.append(m)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03,depth=0.8,location=(.4,0,4.0))
    a=bpy.context.active_object; a.rotation_euler=(0,1.5708,0); a.data.materials.append(m)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12,location=(.8,0,4.0))
    g=bpy.context.active_object
    gm=bpy.data.materials.new("glow"); gm.diffuse_color=(1.0,.9,.6,1.0)
    g.data.materials.append(gm)
    bpy.ops.object.select_all(action="DESELECT")
    g.select_set(True); a.select_set(True); p.select_set(True)
    bpy.context.view_layer.objects.active=p; bpy.ops.object.join()
    return bpy.context.active_object"""

def _g_crate(aid):
    return """_crate()
def _crate():
    bpy.ops.mesh.primitive_cube_add(size=0.7,location=(0,0,0.35))
    o=bpy.context.active_object
    m=bpy.data.materials.new("crate"); m.diffuse_color=(.55,.38,.2,1); m.roughness=.85
    o.data.materials.append(m); return o"""

def _g_barrel(aid):
    return """_barrel()
def _barrel():
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28,depth=0.7,location=(0,0,.35))
    o=bpy.context.active_object
    m=bpy.data.materials.new("barrel"); m.diffuse_color=(.25,.2,.15,1); m.metallic=.3; m.roughness=.8
    o.data.materials.append(m); return o"""

def _g_debris(aid):
    return """_debris()
def _debris():
    import random as _rnd; _rnd.seed(66); pieces=[]
    for k in range(_rnd.randint(4,8)):
        bpy.ops.mesh.primitive_cube_add(size=_rnd.uniform(.05,.25),
            location=(_rnd.uniform(-.4,.4),_rnd.uniform(-.3,.3),0))
        p=bpy.context.active_object
        p.rotation_euler=(_rnd.uniform(0,3.14),_rnd.uniform(0,3.14),_rnd.uniform(0,3.14))
        m=bpy.data.materials.new(f"deb_{k}")
        m.diffuse_color=(_rnd.uniform(.2,.5),_rnd.uniform(.18,.45),_rnd.uniform(.15,.35),1.0)
        p.data.materials.append(m); pieces.append(p)
    if len(pieces)>1:
        bpy.ops.object.select_all(action="DESELECT")
        for p in pieces: p.select_set(True)
        bpy.context.view_layer.objects.active=pieces[0]; bpy.ops.object.join()
    return bpy.context.active_object"""

def _g_default(aid):
    return """_default_asset()
def _default_asset():
    bpy.ops.mesh.primitive_cube_add(size=0.5,location=(0,0,0.25))
    o=bpy.context.active_object
    m=bpy.data.materials.new("default"); m.diffuse_color=(.5,.5,.5,1.0)
    o.data.materials.append(m); return o"""

_GENERATORS = {
    "tree_conifer": _g_conifer, "tree_deciduous": _g_deciduous,
    "tree_palm": _g_palm, "tree_dead": _g_dead, "tree_willow": _g_deciduous,
    "rock_medium": _g_rock, "rock_boulder": _g_boulder, "rock_cluster": _g_rock_cluster,
    "plant_bush": _g_bush, "plant_fern": _g_fern, "plant_tall_grass": _g_bush,
    "plant_cactus": _g_cactus, "plant_mushroom": _g_rock,
    "foliage_ivy": _g_bush, "foliage_moss": _g_rock_cluster,
    "prop_streetlamp": _g_lamp, "prop_crate": _g_crate,
    "prop_barrel": _g_barrel, "prop_debris": _g_debris,
    "_default": _g_default,
}
