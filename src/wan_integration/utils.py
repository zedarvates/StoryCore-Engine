"""
Utility functions for Wan Video Integration
"""

from typing import Dict, Any


def inject_workflow_inputs(workflow: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inject inputs into ComfyUI workflow nodes

    Args:
        workflow: ComfyUI workflow dictionary
        inputs: Dictionary of input values to inject

    Returns:
        Modified workflow with injected inputs
    """
    modified_workflow = workflow.copy()

    for node_id, node_data in modified_workflow.get("nodes", {}).items():
        if not isinstance(node_data, dict):
            continue

        # Handle different node types
        class_type = node_data.get("class_type", "")

        # LoadImage nodes - inject image paths
        if class_type == "LoadImage":
            widgets_values = node_data.get("widgets_values", [])
            if widgets_values and len(widgets_values) > 0:
                # Map input keys to widget positions
                if "start_image" in inputs and "start_image.png" in str(widgets_values[0]):
                    widgets_values[0] = inputs["start_image"]
                elif "end_image" in inputs and "end_image.png" in str(widgets_values[0]):
                    widgets_values[0] = inputs["end_image"]
                elif "guidance_image_1" in inputs and "guidance_image_1.png" in str(widgets_values[0]):
                    widgets_values[0] = inputs["guidance_image_1"]
                elif "guidance_image_2" in inputs and "guidance_image_2.png" in str(widgets_values[0]):
                    widgets_values[0] = inputs["guidance_image_2"]
                elif "inpainting_mask" in inputs and "inpainting_mask.png" in str(widgets_values[0]):
                    widgets_values[0] = inputs["inpainting_mask"]

        # CLIPTextEncode nodes - inject prompts
        elif class_type == "CLIPTextEncode":
            widgets_values = node_data.get("widgets_values", [])
            if widgets_values and len(widgets_values) > 0:
                if "prompt" in inputs:
                    # Update positive prompts
                    if "positive" in str(widgets_values[0]).lower() or "prompt for" in str(widgets_values[0]).lower():
                        widgets_values[0] = inputs["prompt"]
                    # Update negative prompts (usually empty or generic)
                    elif len(widgets_values) > 1 and ("negative" in str(widgets_values[1]).lower() or widgets_values[1] == ""):
                        pass  # Keep negative prompt as is

        # SaveVideo nodes - inject output paths
        elif class_type == "SaveVideo":
            widgets_values = node_data.get("widgets_values", [])
            if widgets_values and len(widgets_values) > 0:
                if "output_prefix" in inputs:
                    widgets_values[0] = inputs["output_prefix"]

    return modified_workflow