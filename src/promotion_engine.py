"""
StoryCore Promotion Engine
Upscales panel images using Pillow with configurable scaling methods.
Integrated with quality validation and autofix engine.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

try:
    from PIL import Image
    import numpy as np
except ImportError:
    raise ImportError("Pillow and numpy are required for the promote command. Install with: pip install Pillow>=10.0.0 numpy")

# Import quality validation and autofix
from quality_validator import QualityValidator
from quality_feedback import QualityFeedback
# Import autofix_engine from root directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import autofix_engine


def promote_panels(project_path: Path, scale: int = 2, method: str = "lanczos",
                   enable_quality_validation: bool = True, enable_autofix: bool = True) -> Dict[str, Any]:
    """
    Upscale all panels from assets/images/panels/ to assets/images/promoted/
    with integrated quality validation and autofix.

    Args:
        project_path: Path to project directory
        scale: Scale factor (default: 2)
        method: Resampling method (lanczos or bicubic)
        enable_quality_validation: Enable real-time quality validation (default: True)
        enable_autofix: Enable autofix engine for low quality panels (default: True)

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

    # Initialize quality validation and autofix if enabled
    quality_validator = QualityValidator(ValidationMode.REAL_TIME) if enable_quality_validation else None
    autofix_engine_instance = autofix_engine.AutofixEngine() if enable_autofix else None

    # Find all panel PPM files
    panel_files = sorted(panels_dir.glob("panel_*.ppm"))
    
    if not panel_files:
        raise FileNotFoundError(f"No panel files found in {panels_dir}")
    
    promoted_panels = []
    resolutions = []
    quality_scores = []
    autofix_logs = []

    for panel_file in panel_files:
        # Load PPM image
        with Image.open(panel_file) as img:
            original_size = img.size

            # Apply center-fill crop to 16:9 aspect ratio
            cinematic_img = center_fill_crop(img, target_ratio=16/9)
            cinematic_size = cinematic_img.size

            # Upscale image
            new_size = (cinematic_size[0] * scale, cinematic_size[1] * scale)
            upscaled = cinematic_img.resize(new_size, resampling)

            # Real-time quality validation hook
            processed_img = upscaled
            quality_score = None
            autofix_applied = False
            autofix_log = None

            if quality_validator:
                # Convert PIL to numpy array for validation
                frame = np.array(processed_img)

                # Perform quality validation
                sharpness_score = quality_validator.calculate_sharpness(frame)
                quality_score = {
                    "panel_id": panel_file.stem,
                    "sharpness_score": sharpness_score,
                    "timestamp": datetime.utcnow().timestamp()
                }

                # Check if autofix should be triggered (quality is low)
                if autofix_engine_instance and sharpness_score < quality_validator.sharpness_threshold:
                    # Trigger autofix engine
                    needs_retry, adjustments = autofix_engine_instance.should_retry(
                        panel_file.stem, {"sharpness_score": sharpness_score}
                    )

                    if needs_retry:
                        # Apply autofix corrections
                        corrected_img, new_params = autofix_engine_instance.apply_corrections(
                            processed_img, {"denoising_strength": 0.35, "sharpen_amount": 1.0}, adjustments
                        )

                        # Validate corrected image
                        corrected_frame = np.array(corrected_img)
                        corrected_sharpness = quality_validator.calculate_sharpness(corrected_frame)

                        # Use corrected image if improved
                        if corrected_sharpness > sharpness_score:
                            processed_img = corrected_img
                            quality_score["sharpness_score"] = corrected_sharpness
                            autofix_applied = True

                            # Generate autofix log
                            autofix_log = autofix_engine_instance.generate_autofix_log(
                                panel_file.stem,
                                {"sharpness_score": sharpness_score},
                                adjustments,
                                {"sharpness_score": corrected_sharpness},
                                1
                            )

            # Generate output filename
            panel_name = panel_file.stem  # e.g., "panel_01"
            output_file = promoted_dir / f"{panel_name}_promoted.png"

            # Save final processed image
            processed_img.save(output_file, "PNG")

            panel_result = {
                "asset_id": f"{panel_name}_promoted_v1",
                "path": f"assets/images/promoted/{output_file.name}",
                "original_panel": f"assets/images/panels/{panel_file.name}",
                "original_resolution": f"{original_size[0]}x{original_size[1]}",
                "cinematic_resolution": f"{cinematic_size[0]}x{cinematic_size[1]}",
                "promoted_resolution": f"{new_size[0]}x{new_size[1]}",
                "quality_score": quality_score,
                "autofix_applied": autofix_applied
            }

            promoted_panels.append(panel_result)
            resolutions.append((original_size, new_size))

            if quality_score:
                quality_scores.append(quality_score)
            if autofix_log:
                autofix_logs.append(autofix_log)
    
    # Create promotion metadata with quality validation results
    promotion_metadata = {
        "promoted_panels": promoted_panels,
        "scale_factor": scale,
        "method": method,
        "center_fill_crop": True,
        "target_aspect_ratio": "16:9",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "total_panels": len(promoted_panels),
        "quality_validation": {
            "enabled": enable_quality_validation,
            "quality_scores": quality_scores,
            "autofix_enabled": enable_autofix,
            "autofix_logs": autofix_logs,
            "panels_with_autofix": len(autofix_logs)
        }
    }

    return {
        "metadata": promotion_metadata,
        "resolutions": resolutions,
        "output_dir": promoted_dir,
        "quality_scores": quality_scores,
        "autofix_logs": autofix_logs
    }


def center_fill_crop(image: Image.Image, target_ratio: float = 16/9) -> Image.Image:
    """
    Center fill crop to achieve target aspect ratio while preserving composition.
    
    Args:
        image: Input PIL Image
        target_ratio: Target aspect ratio (default: 16/9 for cinematic)
    
    Returns:
        Cropped PIL Image with target aspect ratio
    """
    width, height = image.size
    current_ratio = width / height
    
    if abs(current_ratio - target_ratio) < 0.01:
        return image  # Already correct ratio
    
    if current_ratio > target_ratio:
        # Image too wide, crop width (preserve composition center)
        new_width = int(height * target_ratio)
        left = (width - new_width) // 2
        return image.crop((left, 0, left + new_width, height))
    else:
        # Image too tall, crop height (preserve composition center)
        new_height = int(width / target_ratio)
        top = (height - new_height) // 2
        return image.crop((0, top, width, top + new_height))


def update_project_manifest(project_path: Path, promotion_metadata: Dict[str, Any]) -> None:
    """Update project.json with promotion metadata and Data Contract v1 validation results"""
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

    # Data Contract v1: Update quality validation results
    quality_validation = promotion_metadata.get("quality_validation", {})
    if quality_validation.get("enabled", False):
        project_data["quality_validation"]["last_validation_timestamp"] = datetime.utcnow().isoformat() + "Z"
        project_data["quality_validation"]["quality_scores"] = quality_validation.get("quality_scores", [])
        project_data["quality_validation"]["autofix_logs"] = quality_validation.get("autofix_logs", [])

        # Calculate overall quality score
        scores = [s.get("sharpness_score", 0) for s in quality_validation.get("quality_scores", [])]
        if scores:
            project_data["quality_validation"]["overall_quality_score"] = sum(scores) / len(scores)
            project_data["quality_validation"]["validation_pass"] = project_data["quality_validation"]["overall_quality_score"] >= 70.0
        else:
            project_data["quality_validation"]["overall_quality_score"] = None
            project_data["quality_validation"]["validation_pass"] = None

    # Update project status
    project_data["status"]["current_phase"] = "promoted"
    project_data["status"]["last_updated"] = promotion_metadata["created_at"]

    with open(project_file, 'w') as f:
        json.dump(project_data, f, indent=2)
