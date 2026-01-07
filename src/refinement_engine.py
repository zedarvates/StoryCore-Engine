"""
StoryCore Refinement Engine
Applies image enhancement filters using Pillow with quality metrics.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple

try:
    from PIL import Image, ImageFilter
except ImportError:
    raise ImportError("Pillow is required for the refine command. Install with: pip install Pillow>=10.0.0")

# Optional numpy acceleration
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def compute_sharpness_laplacian_variance(image: Image.Image) -> float:
    """
    Compute sharpness metric using Laplacian variance.
    Higher values indicate sharper images.
    """
    # Convert to grayscale
    if image.mode != 'L':
        gray = image.convert('L')
    else:
        gray = image
    
    width, height = gray.size
    
    if HAS_NUMPY:
        # Numpy acceleration if available
        img_array = np.array(gray)
        laplacian = np.zeros_like(img_array, dtype=np.float64)
        
        # 3x3 Laplacian kernel: [[0,-1,0],[-1,4,-1],[0,-1,0]]
        for y in range(1, height - 1):
            for x in range(1, width - 1):
                laplacian[y, x] = (4 * img_array[y, x] - 
                                 img_array[y-1, x] - img_array[y+1, x] - 
                                 img_array[y, x-1] - img_array[y, x+1])
        
        return float(np.var(laplacian))
    else:
        # Pure Python implementation
        pixels = list(gray.getdata())
        laplacian_values = []
        
        # 3x3 Laplacian convolution
        for y in range(1, height - 1):
            for x in range(1, width - 1):
                center = pixels[y * width + x]
                top = pixels[(y-1) * width + x]
                bottom = pixels[(y+1) * width + x]
                left = pixels[y * width + (x-1)]
                right = pixels[y * width + (x+1)]
                
                laplacian_val = 4 * center - top - bottom - left - right
                laplacian_values.append(laplacian_val)
        
        # Compute variance
        if not laplacian_values:
            return 0.0
        
        mean_val = sum(laplacian_values) / len(laplacian_values)
        variance = sum((x - mean_val) ** 2 for x in laplacian_values) / len(laplacian_values)
        return variance


def refine_images(project_path: Path, input_source: str = "promoted", mode: str = "unsharp", 
                 strength: float = 1.0, compute_metrics: bool = False) -> Dict[str, Any]:
    """
    Apply refinement filters to panel images with optional quality metrics
    
    Args:
        project_path: Path to project directory
        input_source: "promoted" or "panels"
        mode: "unsharp" or "sharpen"
        strength: Filter strength multiplier
        compute_metrics: Whether to compute sharpness metrics
    
    Returns:
        Dict with refinement results and metadata
    """
    # Determine input directory and file pattern
    if input_source == "promoted":
        input_dir = project_path / "assets" / "images" / "promoted"
        pattern = "panel_*_promoted.png"
        fallback_dir = project_path / "assets" / "images" / "panels"
        fallback_pattern = "panel_*.ppm"
    else:
        input_dir = project_path / "assets" / "images" / "panels"
        pattern = "panel_*.ppm"
        fallback_dir = None
        fallback_pattern = None
    
    # Find input files
    input_files = list(input_dir.glob(pattern)) if input_dir.exists() else []
    
    # Fallback logic for promoted input
    if not input_files and input_source == "promoted" and fallback_dir and fallback_dir.exists():
        input_files = list(fallback_dir.glob(fallback_pattern))
        input_source = "panels"  # Update source for metadata
        input_dir = fallback_dir
    
    if not input_files:
        raise FileNotFoundError(f"No input files found in {input_dir}")
    
    # Create refined directory
    refined_dir = project_path / "assets" / "images" / "refined"
    refined_dir.mkdir(parents=True, exist_ok=True)
    
    # Prepare filter
    if mode == "unsharp":
        filter_obj = ImageFilter.UnsharpMask(
            radius=2, 
            percent=int(150 * strength), 
            threshold=3
        )
    elif mode == "sharpen":
        filter_obj = ImageFilter.SHARPEN
        # For sharpen, we'll apply multiple times based on strength (capped)
        sharpen_iterations = max(1, min(3, int(strength)))
    else:
        raise ValueError(f"Unsupported mode: {mode}. Use 'unsharp' or 'sharpen'")
    
    refined_panels = []
    resolutions = []
    panel_metrics = []
    
    for input_file in sorted(input_files):
        # Load image
        with Image.open(input_file) as img:
            original_size = img.size
            
            # Compute sharpness before refinement
            sharpness_before = compute_sharpness_laplacian_variance(img) if compute_metrics else None
            
            # Apply refinement
            if mode == "unsharp":
                refined_img = img.filter(filter_obj)
            else:  # sharpen
                refined_img = img
                for _ in range(sharpen_iterations):
                    refined_img = refined_img.filter(filter_obj)
            
            # Compute sharpness after refinement
            sharpness_after = compute_sharpness_laplacian_variance(refined_img) if compute_metrics else None
            
            # Generate output filename
            if input_source == "promoted":
                # panel_01_promoted.png -> panel_01_refined.png
                base_name = input_file.stem.replace("_promoted", "")
            else:
                # panel_01.ppm -> panel_01_refined.png
                base_name = input_file.stem
            
            output_file = refined_dir / f"{base_name}_refined.png"
            
            # Save as PNG
            refined_img.save(output_file, "PNG")
            
            panel_info = {
                "asset_id": f"{base_name}_refined_v1",
                "path": f"assets/images/refined/{output_file.name}",
                "original_source": f"assets/images/{input_dir.name}/{input_file.name}",
                "resolution": f"{original_size[0]}x{original_size[1]}"
            }
            
            if compute_metrics and sharpness_before is not None and sharpness_after is not None:
                improvement_pct = ((sharpness_after - sharpness_before) / sharpness_before * 100) if sharpness_before > 0 else 0
                panel_info["sharpness_before"] = round(sharpness_before, 2)
                panel_info["sharpness_after"] = round(sharpness_after, 2)
                panel_info["improvement_percent"] = round(improvement_pct, 2)
                
                panel_metrics.append({
                    "panel": base_name,
                    "sharpness_before": sharpness_before,
                    "sharpness_after": sharpness_after,
                    "improvement_percent": improvement_pct
                })
            
            refined_panels.append(panel_info)
            resolutions.append(original_size)
    
    # Create refinement metadata
    refinement_metadata = {
        "refined_panels": refined_panels,
        "input": input_source,
        "mode": mode,
        "strength": strength,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "total_panels": len(refined_panels)
    }
    
    # Add metrics summary if computed
    if compute_metrics and panel_metrics:
        improvements = [m["improvement_percent"] for m in panel_metrics]
        refinement_metadata["refinement_metrics"] = {
            "panel_metrics": panel_metrics,
            "summary": {
                "min_improvement_percent": round(min(improvements), 2),
                "mean_improvement_percent": round(sum(improvements) / len(improvements), 2),
                "max_improvement_percent": round(max(improvements), 2),
                "computed_at": datetime.utcnow().isoformat() + "Z"
            }
        }
    
    return {
        "metadata": refinement_metadata,
        "resolutions": resolutions,
        "output_dir": refined_dir,
        "input_source": input_source,
        "panel_metrics": panel_metrics if compute_metrics else None
    }


def update_project_manifest_refined(project_path: Path, refinement_metadata: Dict[str, Any]) -> None:
    """Update project.json with refinement metadata"""
    project_file = project_path / "project.json"
    
    with open(project_file, 'r') as f:
        project_data = json.load(f)
    
    # Update asset manifest
    if "asset_manifest" not in project_data:
        project_data["asset_manifest"] = {}
    
    project_data["asset_manifest"]["refined_panels"] = refinement_metadata["refined_panels"]
    project_data["asset_manifest"]["refinement_metadata"] = {
        "input": refinement_metadata["input"],
        "mode": refinement_metadata["mode"],
        "strength": refinement_metadata["strength"],
        "created_at": refinement_metadata["created_at"],
        "total_panels": refinement_metadata["total_panels"]
    }
    
    # Add metrics if present
    if "refinement_metrics" in refinement_metadata:
        project_data["asset_manifest"]["refinement_metrics"] = refinement_metadata["refinement_metrics"]
    
    # Update project status
    project_data["status"]["current_phase"] = "refined"
    project_data["status"]["last_updated"] = refinement_metadata["created_at"]
    
    with open(project_file, 'w') as f:
        json.dump(project_data, f, indent=2)
