"""
box_scene_generator.py — Générateur de scènes "Box" primitives
==============================================================

Génère des environnements simples composés de boînes (cuboids) pour le prototypage rapide.
Utile pour la mise en scène avant d'ajouter des assets complexes.
"""

# import bpy (removed from global scope for non-Blender environments)
import math

class BoxSceneGenerator:
    """
    Crée des scènes de base en 'boîtes' pour Blender.
    """

    @staticmethod
    def create_simple_room(width=10, depth=10, height=4, wall_thickness=0.2):
        """
        Crée une pièce rectangulaire simple.
        """
        # Sol
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
        floor = bpy.context.active_object
        floor.name = "Box_Floor"
        floor.scale = (width/2, depth/2, 1)
        
        # Murs
        def add_wall(name, loc, scale, rot=(0,0,0)):
            bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
            w = bpy.context.active_object
            w.name = name
            w.scale = scale
            w.rotation_euler = [math.radians(r) for r in rot]
            return w

        add_wall("Wall_Back", (0, depth/2, height/2), (width, wall_thickness, height))
        add_wall("Wall_Front", (0, -depth/2, height/2), (width, wall_thickness, height))
        add_wall("Wall_Left", (-width/2, 0, height/2), (wall_thickness, depth, height))
        add_wall("Wall_Right", (width/2, 0, height/2), (wall_thickness, depth, height))
        
        return floor

    @staticmethod
    def create_corridor(length=20, width=3, height=3):
        """
        Crée un long couloir.
        """
        # Sol
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, length/2, 0))
        floor = bpy.context.active_object
        floor.scale = (width/2, length/2, 1)
        
        # Murs latéraux
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-width/2, length/2, height/2))
        wall_l = bpy.context.active_object
        wall_l.scale = (0.15, length, height)
        
        bpy.ops.mesh.primitive_cube_add(size=1, location=(width/2, length/2, height/2))
        wall_r = bpy.context.active_object
        wall_r.scale = (0.15, length, height)
        
        return floor

    @staticmethod
    def get_blender_script(scene_type="room", **kwargs):
        """
        Retourne le code Python Blender correspondant pour l'injecter dans un rendu.
        """
        if scene_type == "room":
            w = kwargs.get("width", 10)
            d = kwargs.get("depth", 10)
            h = kwargs.get("height", 4)
            return f"from blender_bridge.box_scene_generator import BoxSceneGenerator; BoxSceneGenerator.create_simple_room({w}, {d}, {h})"
        elif scene_type == "corridor":
            l = kwargs.get("depth", 20)
            w = kwargs.get("width", 3)
            h = kwargs.get("height", 3)
            return f"from blender_bridge.box_scene_generator import BoxSceneGenerator; BoxSceneGenerator.create_corridor({l}, {w}, {h})"
        return ""
