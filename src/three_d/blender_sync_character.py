import bpy
import json
import os
from pathlib import Path

# --- BLENDER SYNC SCRIPT FOR STORYCORE ENGINE ---
# This script bridges StoryCore Character Core Data (CCD v2) with Blender.
# How to use:
# 1. Export your character from StoryCore as a "3D Deployment Package".
# 2. Open this script in Blender's Text Editor.
# 3. Update the MANIFEST_PATH below or run the operator.

def import_storycore_character(manifest_path):
    """
    Imports and synchronizes a character based on StoryCore manifest.
    """
    if not os.path.exists(manifest_path):
        print(f"Error: Manifest not found at {manifest_path}")
        return
        
    with open(manifest_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    char_id = data.get("character_id", "unknown")
    name = data.get("name", "Unnamed")
    assets = data.get("assets", {})
    
    print(f"Syncing StoryCore Character: {name} ({char_id})")
    
    # 1. Determine which mesh to import (Priority: GLB > FBX > OBJ)
    import_path = None
    file_format = None
    
    if "glb" in assets:
        import_path = assets["glb"]
        file_format = "GLB"
    elif "fbx" in assets:
        import_path = assets["fbx"]
        file_format = "FBX"
    elif "obj" in assets:
        import_path = assets["obj"]
        file_format = "OBJ"
        
    if not import_path:
        print("Warning: No compatible 3D meshes found in manifest.")
        return

    # Normalize path (handle absolute/relative)
    import_path = os.path.abspath(import_path)
    if not os.path.exists(import_path):
        print(f"Error: Mesh file not found at {import_path}")
        return

    # 2. Perform Import
    print(f"Importing {file_format} from: {import_path}")
    
    # Track existing objects to identify the new one
    old_objs = set(bpy.data.objects)
    
    try:
        if file_format == "GLB":
            bpy.ops.import_scene.gltf(filepath=import_path)
        elif file_format == "FBX":
            bpy.ops.import_scene.fbx(filepath=import_path)
        elif file_format == "OBJ":
            bpy.ops.import_scene.obj(filepath=import_path)
            
        new_objs = set(bpy.data.objects) - old_objs
        
        # 3. Organize and Rename
        if new_objs:
            # Create a collection for the character
            col_name = f"CHAR_{name}"
            if col_name not in bpy.data.collections:
                char_col = bpy.data.collections.new(col_name)
                bpy.context.scene.collection.children.link(char_col)
            else:
                char_col = bpy.data.collections[col_name]
                
            for obj in new_objs:
                # Move to collection
                for old_col in obj.users_collection:
                    old_col.objects.unlink(obj)
                char_col.objects.link(obj)
                
                # Tag with metadata
                obj["storycore_id"] = char_id
                obj["storycore_name"] = name
                
            print(f"Successfully synced {len(new_objs)} objects for {name}.")
            
    except Exception as e:
        print(f"Import failed: {str(e)}")

# --- BLENDER UI OPERATOR ---

class STORYCORE_OT_SyncCharacter(bpy.types.Operator):
    """Sync a character from a StoryCore manifest file"""
    bl_idname = "storycore.sync_character"
    bl_label = "Sync StoryCore Character"
    
    filepath: bpy.props.StringProperty(subtype="FILE_PATH")
    filter_glob: bpy.props.StringProperty(default="*.json", options={'HIDDEN'})

    def execute(self, context):
        import_storycore_character(self.filepath)
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

def register():
    bpy.utils.register_class(STORYCORE_OT_SyncCharacter)
    # Add to menu (optional)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(STORYCORE_OT_SyncCharacter)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

def menu_func(self, context):
    self.layout.operator(STORYCORE_OT_SyncCharacter.bl_idname)

if __name__ == "__main__":
    # If running inside Blender, register the operator
    try:
        register()
    except Exception as e:
        print(f"Registration skipped or failed: {e}")
