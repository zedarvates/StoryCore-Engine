import bpy
import os
import json
from pathlib import Path

# --- BLENDER AUTOMATIC GRID RENDERER FOR STORYCORE ---
# This script renders a character mesh from multiple angles (Front, Side, Back)
# to generate a precise 3D Character Sheet for StoryCore.

def render_character_sheet(character_name, output_dir, mesh_object_name):
    """
    Renders 3 views of a mesh and saves them as a sheet.
    """
    scene = bpy.context.scene
    obj = bpy.data.objects.get(mesh_object_name)
    
    if not obj:
        print(f"Error: Object '{mesh_object_name}' not found.")
        return
        
    # Setup rendering settings
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = True
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    
    # Store camera list
    views = [
        {"name": "Front", "rot": (0, 0, 0), "dist": 5.0},
        {"name": "Side", "rot": (0, 0, 1.5708), "dist": 5.0}, # 90 degrees
        {"name": "Back", "rot": (0, 0, 3.1415), "dist": 5.0}  # 180 degrees
    ]
    
    # Create temporary camera
    cam_data = bpy.data.cameras.new("Temp_Grid_Cam")
    cam_obj = bpy.data.objects.new("Temp_Grid_Cam", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    
    output_files = []
    
    for view in views:
        # Position camera
        import math
        angle = view["rot"][2]
        cam_obj.location.x = math.sin(angle) * view["dist"]
        cam_obj.location.y = -math.cos(angle) * view["dist"]
        cam_obj.location.z = 1.0 # Eye level
        
        # Look at center
        cam_obj.rotation_euler[0] = 1.5708 # 90 degrees X
        cam_obj.rotation_euler[1] = 0
        cam_obj.rotation_euler[2] = angle
        
        # Render
        render_path = os.path.join(output_dir, f"{character_name}_{view['name']}.png")
        scene.render.filepath = render_path
        bpy.ops.render.render(write_still=True)
        output_files.append(render_path)
        
    print(f"Rendered {len(output_files)} views to {output_dir}")
    
    # (Optional) Integration with StoryCore: Update the CCD manifest
    # TODO: Combine images into a single grid strip using PIL if needed
    
    # Cleanup
    bpy.data.objects.remove(cam_obj, do_unlink=True)
    bpy.data.cameras.remove(cam_data, do_unlink=True)

class STORYCORE_OT_RenderSheet(bpy.types.Operator):
    """Render a 3-view Character Sheet for StoryCore"""
    bl_idname = "storycore.render_sheet"
    bl_label = "Render 3D Character Sheet"
    
    character_name: bpy.props.StringProperty(name="Character Name", default="Unnamed")
    mesh_name: bpy.props.StringProperty(name="Mesh Name", default="")

    def execute(self, context):
        output_dir = os.path.abspath("./exports/sheets")
        os.makedirs(output_dir, exist_ok=True)
        render_character_sheet(self.character_name, output_dir, self.mesh_name)
        return {'FINISHED'}

def register():
    bpy.utils.register_class(STORYCORE_OT_RenderSheet)

def unregister():
    bpy.utils.unregister_class(STORYCORE_OT_RenderSheet)

if __name__ == "__main__":
    # Example usage:
    # render_character_sheet("Anya", "/tmp", "Anya_Mesh")
    register()
