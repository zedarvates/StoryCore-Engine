"""
StoryCore Promotion Engine
Upscales panel images using Pillow with configurable scaling methods.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple

try:
    from PIL import Image
except ImportError:
    raise ImportError("Pillow is required for the promote command. Install with: pip install Pillow>=10.0.0")


def promote_panels(project_path: Path, scale: int = 2, method: str = "lanczos") -> Dict[str, Any]:
    """
    Upscale all panels from assets/images/panels/ to assets/images/promoted/
    
    Args:
        project_path: Path to project directory
        scale: Scale factor (default: 2)
        method: Resampling method (lanczos or bicubic)
    
    Returns:
        Dict with promotion results and metadata
    """
    panels_dir = project_path / "assets" / "images" / "panels"
    promoted_dir = project_path / "assets" / "images" / "promoted"
    
    if not panels_dir.exists():
        raise FileNotFoundError(f"Panels directory not found: {panels_dir}")
    
    # Create promoted directory
    promoted_dir.mkdir(parents=True, exist_ok=True)
    
    # Get resampling method
    resampling_map = {
        "lanczos": Image.Resampling.LANCZOS,
        "bicubic": Image.Resampling.BICUBIC
    }
    
    if method not in resampling_map:
        raise ValueError(f"Unsupported method: {method}. Use 'lanczos' or 'bicubic'")
    
    resampling = resampling_map[method]
    
    # Find all panel PPM files
    panel_files = sorted(panels_dir.glob("panel_*.ppm"))
    
    if not panel_files:
        raise FileNotFoundError(f"No panel files found in {panels_dir}")
    
    promoted_panels = []
    resolutions = []
    
    for panel_file in panel_files:
        # Load PPM image
        with Image.open(panel_file) as img:
            original_size = img.size
            new_size = (original_size[0] * scale, original_size[1] * scale)
            
            # Upscale image
            upscaled = img.resize(new_size, resampling)
            
            # Generate output filename
            panel_name = panel_file.stem  # e.g., "panel_01"
            output_file = promoted_dir / f"{panel_name}_promoted.png"
            
            # Save as PNG for better quality
            upscaled.save(output_file, "PNG")
            
            promoted_panels.append({
                "asset_id": f"{panel_name}_promoted_v1",
                "path": f"assets/images/promoted/{output_file.name}",
                "original_panel": f"assets/images/panels/{panel_file.name}",
                "original_resolution": f"{original_size[0]}x{original_size[1]}",
                "promoted_resolution": f"{new_size[0]}x{new_size[1]}"
            })
            
            resolutions.append((original_size, new_size))
    
    # Create promotion metadata
    promotion_metadata = {
        "promoted_panels": promoted_panels,
        "scale_factor": scale,
        "method": method,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "total_panels": len(promoted_panels)
    }
    
    return {
        "metadata": promotion_metadata,
        "resolutions": resolutions,
        "output_dir": promoted_dir
    }


def update_project_manifest(project_path: Path, promotion_metadata: Dict[str, Any]) -> None:
    """Update project.json with promotion metadata"""
    project_file = project_path / "project.json"
    
    with open(project_file, 'r') as f:
        project_data = json.load(f)
    
    # Update asset manifest
    if "asset_manifest" not in project_data:
        project_data["asset_manifest"] = {}
    
    project_data["asset_manifest"]["promoted_panels"] = promotion_metadata["promoted_panels"]
    project_data["asset_manifest"]["promotion_metadata"] = {
        "scale_factor": promotion_metadata["scale_factor"],
        "method": promotion_metadata["method"],
        "created_at": promotion_metadata["created_at"],
        "total_panels": promotion_metadata["total_panels"]
    }
    
    # Update project status
    project_data["status"]["current_phase"] = "promoted"
    project_data["status"]["last_updated"] = promotion_metadata["created_at"]
    
    with open(project_file, 'w') as f:
        json.dump(project_data, f, indent=2)
