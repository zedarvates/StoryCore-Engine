import bpy
import json

# --- BLENDER AUTO LIP-SYNC FOR STORYCORE ---
# This script animates mouth shape keys based on viseme data from StoryCore.
# The character mesh must have standard viseme shape keys (A, E, I, O, U, etc.)

VISEME_MAP = {
    "A": "viseme_A",
    "E": "viseme_E",
    "I": "viseme_I",
    "O": "viseme_O",
    "U": "viseme_U",
    "M": "viseme_M",
    "F": "viseme_F",
    "L": "viseme_L",
}


def animate_lipsync(mesh_obj_name, viseme_data_path):
    """
    Applies viseme animation to shape keys.
    """
    obj = bpy.data.objects.get(mesh_obj_name)
    if not obj or not obj.data.shape_keys:
        print("Error: Mesh does not have shape keys.")
        return

    sk = obj.data.shape_keys

    # Load viseme data
    with open(viseme_data_path, "r") as f:
        data = json.load(f)

    fps = bpy.context.scene.render.fps

    # Reset existing animation in keyframes range
    # (Optional: Clear only the viseme shape keys)

    for entry in data:
        timestamp = entry["timestamp"]
        viseme = entry["viseme"]
        frame = int(timestamp * fps)

        # Map viseme to shape key name
        sk_name = VISEME_MAP.get(viseme)
        if sk_name and sk_name in sk.key_blocks:
            # Set keyframe for this viseme
            block = sk.key_blocks[sk_name]
            block.value = 1.0
            block.keyframe_insert(data_path="value", frame=frame)

            # Set 0.0 for others (or blend)
            # Fast simple implementation: set others to 0 at this frame
            for other_name in VISEME_MAP.values():
                if other_name != sk_name and other_name in sk.key_blocks:
                    other_block = sk.key_blocks[other_name]
                    other_block.value = 0.0
                    other_block.keyframe_insert(data_path="value", frame=frame)

            # Set recovery frame (return to neutral shortly after)
            next_frame = frame + 2
            block.value = 0.0
            block.keyframe_insert(data_path="value", frame=next_frame)

    print(f"Lip-Sync successfully applied to {len(data)} frames.")


class STORYCORE_OT_ApplyLipSync(bpy.types.Operator):
    """Apply StoryCore Viseme Data to Mesh Shape Keys"""

    bl_idname = "storycore.apply_lipsync"
    bl_label = "Apply StoryCore Lip-Sync"

    filepath: bpy.props.StringProperty(subtype="FILE_PATH")
    mesh_name: bpy.props.StringProperty(name="Mesh Name", default="")

    def execute(self, context):
        animate_lipsync(self.mesh_name, self.filepath)
        return {"FINISHED"}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {"RUNNING_MODAL"}


def register():
    bpy.utils.register_class(STORYCORE_OT_ApplyLipSync)


if __name__ == "__main__":
    register()
