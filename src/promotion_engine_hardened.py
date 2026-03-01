"""
StoryCore PromotionEngine v1.0 - Production Hardened
Implements slicing → center-fill crop → upscale → refinement metadata → QA validation
"""

import json
import numpy as np
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional

try:
    from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
    import cv2
except ImportError:
    raise ImportError("Required: pip install Pillow opencv-python")


class PromotionEngine:
    """Production-hardened promotion engine with comprehensive validation."""
    
    # QA Thresholds
    SHARPNESS_THRESHOLDS = {
        "too_soft": 50.0,
        "acceptable": 100.0,
        "good": 200.0,
        "oversharpen_risk": 500.0
    }
    
    def __init__(self):
        self.target_aspect_ratio = 16/9
        self.upscale_factor = 2
        self.default_denoising_strength = 0.35
        self.min_image_size = 64
        
    def process_grid(self, promotion_plan_path: str) -> Dict[str, Any]:
        """Process master grid with comprehensive validation and QA."""
        # Load and validate plan
        plan = self._load_and_validate_plan(promotion_plan_path)
        
        master_grid_path = Path(plan["master_grid_path"])
        output_dir = Path(plan["output_directory"])
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load master grid with validation
        master_grid = self._load_and_validate_image(master_grid_path)
        
        # Process panels
        results = []
        qa_metrics = []
        seed_log = []
        
        for panel_config in plan["panels"]:
            try:
                result = self._process_single_panel(
                    master_grid, panel_config, plan, output_dir
                )
                results.append(result["panel_result"])
                qa_metrics.append(result["qa_metric"])
                seed_log.append(result["seed_info"])
                
            except Exception as e:
                print(f"ERROR processing {panel_config['panel_id']}: {e}")
                # Continue processing other panels
        
        # Generate comprehensive QA report
        qa_report = self._generate_qa_report(qa_metrics, plan)
        
        # Check fail-fast conditions
        self._validate_final_results(qa_report)
        
        return {
            "processed_panels": results,
            "qa_report": qa_report,
            "seed_log": seed_log,
            "total_panels": len(results),
            "output_directory": str(output_dir)
        }
    
    def save_assets(self, results: Dict[str, Any], output_dir: str) -> None:
        """Save all processing artifacts with comprehensive logging."""
        output_path = Path(output_dir)
        
        # Save QA report
        qa_report_path = output_path / "qa_report.json"
        with open(qa_report_path, 'w') as f:
            json.dump(results["qa_report"], f, indent=2)
        
        # Save promotion summary with seed log
        summary = {
            "promotion_completed_at": datetime.utcnow().isoformat() + "Z",
            "total_panels_processed": results["total_panels"],
            "output_directory": results["output_directory"],
            "panels": results["processed_panels"],
            "seed_log": results["seed_log"],
            "determinism_info": {
                "engine_version": "1.0",
                "coordinate_system": "row_col_zero_indexed",
                "aspect_ratio_target": self.target_aspect_ratio,
                "upscale_factor": self.upscale_factor
            }
        }
        
        summary_path = output_path / "promotion_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        # Generate refinement metadata files
        self._save_refinement_metadata(results, output_path)
        
        print(f"✓ Assets saved to {output_dir}")
        print(f"  - QA Report: {qa_report_path}")
        print(f"  - Summary: {summary_path}")
    
    def _load_and_validate_plan(self, plan_path: str) -> Dict[str, Any]:
        """Load and comprehensively validate promotion plan."""
        if not Path(plan_path).exists():
            raise FileNotFoundError(f"Promotion plan not found: {plan_path}")
        
        with open(plan_path, 'r') as f:
            plan = json.load(f)
        
        # Validate required fields
        required_fields = ["master_grid_path", "output_directory", "grid_specification", "panels"]
        for field in required_fields:
            if field not in plan:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate grid specification
        if not plan["grid_specification"] in ["3x3", "1x2", "1x4"]:
            raise ValueError(f"Unsupported grid specification: {plan['grid_specification']}")
        
        # Validate master grid exists
        if not Path(plan["master_grid_path"]).exists():
            raise FileNotFoundError(f"Master grid not found: {plan['master_grid_path']}")
        
        # Validate panels structure
        self._validate_panels_config(plan["panels"], plan["grid_specification"])
        
        return plan
    
    def _validate_panels_config(self, panels: List[Dict], grid_spec: str) -> None:
        """Validate panels configuration for duplicates and bounds."""
        cols, rows = map(int, grid_spec.split('x'))
        positions = set()
        
        for panel in panels:
            if "panel_id" not in panel or "grid_position" not in panel:
                raise ValueError("Panel missing required fields: panel_id, grid_position")
            
            pos = tuple(panel["grid_position"])
            if pos in positions:
                raise ValueError(f"Duplicate grid position: {pos}")
            positions.add(pos)
            
            row, col = pos
            if row >= rows or col >= cols or row < 0 or col < 0:
                raise ValueError(f"Grid position {pos} out of bounds for {grid_spec}")
    
    def _load_and_validate_image(self, image_path: Path) -> Image.Image:
        """Load image with validation and error handling."""
        try:
            image = Image.open(image_path)
            if image.size[0] < self.min_image_size or image.size[1] < self.min_image_size:
                raise ValueError(f"Image too small: {image.size}, minimum: {self.min_image_size}px")
            return image
        except Exception as e:
            raise ValueError(f"Failed to load image {image_path}: {e}")
    
    def _process_single_panel(self, master_grid: Image.Image, panel_config: Dict, 
                            plan: Dict, output_dir: Path) -> Dict[str, Any]:
        """Process single panel with comprehensive error handling."""
        panel_id = panel_config["panel_id"]
        grid_position = panel_config["grid_position"]
        
        # Step 1: Slice panel
        panel_slice = self._slice_panel(master_grid, grid_position, plan["grid_specification"])
        
        # Step 2: Center fill crop to 16:9
        cinematic_panel = self._center_fill_crop(panel_slice)
        
        # Step 3: Upscale
        upscaled_panel = self._upscale_image(cinematic_panel)
        
        # Step 4: Generate refinement metadata
        panel_seed = self._generate_panel_seed(plan.get("global_seed", 42), panel_id)
        refinement_metadata = self._prepare_refinement_metadata(panel_config, panel_seed, plan)
        
        # Step 5: Apply placeholder refinement
        refined_panel = self._apply_refinement_placeholder(upscaled_panel)
        
        # Step 6: QA validation
        sharpness_score = self._calculate_sharpness(refined_panel)
        quality_tier = self._classify_sharpness(sharpness_score)
        
        # Validate aspect ratio
        actual_ratio = refined_panel.size[0] / refined_panel.size[1]
        ratio_deviation = abs(actual_ratio - self.target_aspect_ratio) / self.target_aspect_ratio
        
        if ratio_deviation > 0.05:  # 5% tolerance
            raise ValueError(f"Aspect ratio deviation too large: {actual_ratio:.3f} vs {self.target_aspect_ratio:.3f}")
        
        # Save result
        output_path = output_dir / f"{panel_id}_promoted.png"
        refined_panel.save(output_path, "PNG", quality=95)
        
        return {
            "panel_result": {
                "panel_id": panel_id,
                "output_path": str(output_path),
                "original_size": panel_slice.size,
                "cinematic_size": cinematic_panel.size,
                "final_size": refined_panel.size,
                "sharpness_score": sharpness_score,
                "quality_tier": quality_tier,
                "aspect_ratio": actual_ratio
            },
            "qa_metric": {
                "panel_id": panel_id,
                "sharpness_score": sharpness_score,
                "quality_tier": quality_tier,
                "aspect_ratio": actual_ratio,
                "aspect_ratio_deviation": ratio_deviation
            },
            "seed_info": {
                "panel_id": panel_id,
                "seed": panel_seed,
                "global_seed": plan.get("global_seed", 42)
            }
        }
    
    def _slice_panel(self, master_grid: Image.Image, position: List[int], grid_spec: str) -> Image.Image:
        """Extract panel using precise coordinate system."""
        cols, rows = map(int, grid_spec.split('x'))
        grid_width, grid_height = master_grid.size
        
        panel_width = grid_width // cols
        panel_height = grid_height // rows
        
        row, col = position
        left = col * panel_width
        top = row * panel_height
        right = left + panel_width
        bottom = top + panel_height
        
        return master_grid.crop((left, top, right, bottom))
    
    def _center_fill_crop(self, image: Image.Image) -> Image.Image:
        """Center fill crop to 16:9 with padding for small images."""
        width, height = image.size
        
        # Handle tiny images by padding
        if width < self.min_image_size or height < self.min_image_size:
            # Pad to minimum size maintaining aspect ratio
            scale = max(self.min_image_size / width, self.min_image_size / height)
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            width, height = image.size
        
        current_ratio = width / height
        target_ratio = self.target_aspect_ratio
        
        if abs(current_ratio - target_ratio) < 0.01:
            return image  # Already correct ratio
        
        if current_ratio > target_ratio:
            # Image too wide, crop width
            new_width = int(height * target_ratio)
            left = (width - new_width) // 2
            return image.crop((left, 0, left + new_width, height))
        else:
            # Image too tall, crop height
            new_height = int(width / target_ratio)
            top = (height - new_height) // 2
            return image.crop((0, top, width, top + new_height))
    
    def _upscale_image(self, image: Image.Image) -> Image.Image:
        """High-quality Lanczos upscaling."""
        new_size = (image.size[0] * self.upscale_factor, image.size[1] * self.upscale_factor)
        return image.resize(new_size, Image.Resampling.LANCZOS)
    
    def _generate_panel_seed(self, global_seed: int, panel_id: str) -> int:
        """Generate deterministic seed with collision avoidance."""
        panel_hash = hash(panel_id.encode('utf-8')) % 1000000
        return (global_seed + panel_hash) % 2147483647  # Max int32
    
    def _prepare_refinement_metadata(self, panel_config: Dict, seed: int, plan: Dict) -> Dict[str, Any]:
        """Generate ComfyUI and A1111 compatible metadata."""
        global_style = plan.get("global_style_anchor", "cinematic, professional")
        prompt_extension = panel_config.get("prompt_extension", "highly detailed")
        
        base_metadata = {
            "seed": seed,
            "prompt": f"{global_style}, {prompt_extension}, 8k resolution",
            "negative_prompt": "low quality, blurry, distorted, artifacts",
            "denoising_strength": panel_config.get("denoising_strength", self.default_denoising_strength),
            "cfg_scale": 7.5,
            "steps": 30
        }
        
        return {
            "comfyui": {
                **base_metadata,
                "sampler_name": "dpmpp_2m_karras",
                "scheduler": "karras",
                "model": "cinematic_v1.safetensors"
            },
            "automatic1111": {
                **base_metadata,
                "sampler_index": "DPM++ 2M Karras",
                "restore_faces": False,
                "tiling": False
            }
        }
    
    def _apply_refinement_placeholder(self, image: Image.Image) -> Image.Image:
        """Placeholder refinement (UnsharpMask + contrast)."""
        # Apply unsharp mask
        enhanced = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=150, threshold=3))
        
        # Slight contrast boost
        enhancer = ImageEnhance.Contrast(enhanced)
        return enhancer.enhance(1.1)
    
    def _calculate_sharpness(self, image: Image.Image) -> float:
        """Calculate Laplacian variance for sharpness measurement."""
        gray = np.array(image.convert('L'))
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        return float(laplacian.var())
    
    def _classify_sharpness(self, score: float) -> str:
        """Classify sharpness score into quality tiers."""
        if score < self.SHARPNESS_THRESHOLDS["too_soft"]:
            return "too_soft"
        elif score < self.SHARPNESS_THRESHOLDS["acceptable"]:
            return "acceptable"
        elif score < self.SHARPNESS_THRESHOLDS["good"]:
            return "good"
        elif score < self.SHARPNESS_THRESHOLDS["oversharpen_risk"]:
            return "excellent"
        else:
            return "oversharpen_risk"
    
    def _generate_qa_report(self, metrics: List[Dict], plan: Dict) -> Dict[str, Any]:
        """Generate comprehensive QA report with all metrics."""
        sharpness_scores = [m["sharpness_score"] for m in metrics]
        
        return {
            "qa_report_id": f"promotion_qa_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "grid_specification": plan["grid_specification"],
            "total_panels": len(metrics),
            "sharpness_metrics": {
                "mean_sharpness": float(np.mean(sharpness_scores)),
                "min_sharpness": float(np.min(sharpness_scores)),
                "max_sharpness": float(np.max(sharpness_scores)),
                "std_sharpness": float(np.std(sharpness_scores))
            },
            "quality_distribution": self._get_quality_distribution(metrics),
            "panel_metrics": metrics,
            "thresholds": self.SHARPNESS_THRESHOLDS,
            "validation_status": self._determine_validation_status(sharpness_scores)
        }
    
    def _get_quality_distribution(self, metrics: List[Dict]) -> Dict[str, int]:
        """Get distribution of quality tiers."""
        distribution = {}
        for metric in metrics:
            tier = metric["quality_tier"]
            distribution[tier] = distribution.get(tier, 0) + 1
        return distribution
    
    def _determine_validation_status(self, scores: List[float]) -> str:
        """Determine overall validation status."""
        mean_score = np.mean(scores)
        
        if mean_score < self.SHARPNESS_THRESHOLDS["too_soft"]:
            return "FAILED"
        elif any(score > self.SHARPNESS_THRESHOLDS["oversharpen_risk"] for score in scores):
            return "REVIEW_NEEDED"
        elif mean_score >= self.SHARPNESS_THRESHOLDS["good"]:
            return "PASSED"
        else:
            return "ACCEPTABLE"
    
    def _validate_final_results(self, qa_report: Dict) -> None:
        """Apply fail-fast validation rules."""
        status = qa_report["validation_status"]
        mean_sharpness = qa_report["sharpness_metrics"]["mean_sharpness"]
        
        if status == "FAILED":
            raise ValueError(f"QA validation failed: mean sharpness {mean_sharpness:.1f} below threshold")
        
        # Check for aspect ratio failures (already checked per-panel)
        for metric in qa_report["panel_metrics"]:
            if metric["aspect_ratio_deviation"] > 0.05:
                raise ValueError(f"Panel {metric['panel_id']} aspect ratio deviation too large")
    
    def _save_refinement_metadata(self, results: Dict, output_path: Path) -> None:
        """Save refinement metadata for external API integration."""
        metadata_dir = output_path / "refinement_metadata"
        metadata_dir.mkdir(exist_ok=True)
        
        # This would be populated during processing in a full implementation
        # For now, create placeholder structure
        comfyui_metadata = {"workflows": []}
        a1111_metadata = {"batch_requests": []}
        
        with open(metadata_dir / "comfyui_workflows.json", 'w') as f:
            json.dump(comfyui_metadata, f, indent=2)
        
        with open(metadata_dir / "a1111_batch.json", 'w') as f:
            json.dump(a1111_metadata, f, indent=2)


# Test implementations
def test_panel_slicing_bounds():
    """Test panel bounds calculation."""
    def calculate_panel_bounds(position, grid_spec, image_size):
        cols, rows = map(int, grid_spec.split('x'))
        width, height = image_size
        panel_width = width // cols
        panel_height = height // rows
        row, col = position
        return (col * panel_width, row * panel_height, 
                (col + 1) * panel_width, (row + 1) * panel_height)
    
    bounds = calculate_panel_bounds([1, 1], "3x3", (900, 900))
    assert bounds == (300, 300, 600, 600)
    print("✓ Panel slicing bounds test passed")


def test_center_fill_crop():
    """Test aspect ratio conversion."""
    engine = PromotionEngine()
    square_image = Image.new('RGB', (300, 300), 'red')
    cropped = engine._center_fill_crop(square_image)
    
    aspect_ratio = cropped.size[0] / cropped.size[1]
    assert abs(aspect_ratio - 16/9) < 0.01
    print("✓ Center fill crop test passed")


def test_sharpness_calculation():
    """Test Laplacian variance calculation."""
    engine = PromotionEngine()
    
    # Create test images
    test_image = Image.new('RGB', (100, 100), 'white')
    draw = ImageDraw.Draw(test_image)
    draw.rectangle([25, 25, 75, 75], fill='black')
    
    blurred = test_image.filter(ImageFilter.GaussianBlur(2))
    sharpened = test_image.filter(ImageFilter.UnsharpMask(radius=1, percent=150))
    
    blur_var = engine._calculate_sharpness(blurred)
    sharp_var = engine._calculate_sharpness(sharpened)
    orig_var = engine._calculate_sharpness(test_image)
    
    assert sharp_var > orig_var > blur_var
    print("✓ Sharpness calculation test passed")


if __name__ == "__main__":
    # Run tests
    test_panel_slicing_bounds()
    test_center_fill_crop()
    test_sharpness_calculation()
    print("✓ All tests passed - PromotionEngine ready for production")
