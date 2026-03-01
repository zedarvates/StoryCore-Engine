"""
StoryCore Promotion Engine
Handles slicing, upscaling, and refinement of master grid into cinematic keyframes.
"""

import json
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional

try:
    from PIL import Image, ImageFilter, ImageEnhance
    import cv2
except ImportError:
    raise ImportError("Required: pip install Pillow opencv-python")


class PromotionEngine:
    """Handles promotion of grid panels to high-quality cinematic keyframes."""
    
    def __init__(self):
        self.target_aspect_ratio = 16/9
        self.upscale_factor = 2
        self.denoising_strength = 0.35
        
    def process_grid(self, promotion_plan_path: str) -> Dict[str, Any]:
        """Process master grid according to promotion plan."""
        # Load promotion plan
        with open(promotion_plan_path, 'r') as f:
            plan = json.load(f)
        
        # Validate inputs
        self._validate_plan(plan)
        
        master_grid_path = Path(plan["master_grid_path"])
        output_dir = Path(plan["output_directory"])
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load master grid
        master_grid = Image.open(master_grid_path)
        grid_spec = plan["grid_specification"]  # e.g., "3x3"
        
        # Process each panel
        results = []
        qa_metrics = []
        
        for panel_config in plan["panels"]:
            panel_id = panel_config["panel_id"]
            grid_position = panel_config["grid_position"]  # [row, col]
            
            print(f"Processing {panel_id}...")
            
            # Step 1: Slice and reframe
            panel_slice = self._slice_panel(master_grid, grid_position, grid_spec)
            cinematic_panel = self._center_fill_crop(panel_slice, self.target_aspect_ratio)
            
            # Step 2: Upscale
            upscaled_panel = self._upscale_image(cinematic_panel, self.upscale_factor)
            
            # Step 3: Refinement (prepare metadata)
            refinement_metadata = self._prepare_refinement_metadata(
                panel_config, plan.get("global_seed", 42)
            )
            
            # Step 4: Apply refinement (placeholder for external API)
            refined_panel = self._apply_refinement(upscaled_panel, refinement_metadata)
            
            # Step 5: QA validation
            sharpness_score = self._calculate_sharpness(refined_panel)
            
            # Save result
            output_path = output_dir / f"{panel_id}_promoted.png"
            refined_panel.save(output_path, "PNG")
            
            results.append({
                "panel_id": panel_id,
                "output_path": str(output_path),
                "original_size": panel_slice.size,
                "final_size": refined_panel.size,
                "sharpness_score": sharpness_score
            })
            
            qa_metrics.append({
                "panel_id": panel_id,
                "sharpness_score": sharpness_score,
                "upscale_factor": self.upscale_factor,
                "aspect_ratio": refined_panel.size[0] / refined_panel.size[1]
            })
        
        # Generate QA report
        qa_report = self._generate_qa_report(qa_metrics, plan)
        
        return {
            "processed_panels": results,
            "qa_report": qa_report,
            "total_panels": len(results),
            "output_directory": str(output_dir)
        }
    
    def save_assets(self, results: Dict[str, Any], output_dir: str) -> None:
        """Save processing results and QA report."""
        output_path = Path(output_dir)
        
        # Save QA report
        qa_report_path = output_path / "qa_report.json"
        with open(qa_report_path, 'w') as f:
            json.dump(results["qa_report"], f, indent=2)
        
        # Save processing summary
        summary = {
            "promotion_completed_at": datetime.utcnow().isoformat() + "Z",
            "total_panels_processed": results["total_panels"],
            "output_directory": results["output_directory"],
            "panels": results["processed_panels"]
        }
        
        summary_path = output_path / "promotion_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"✓ Assets saved to {output_dir}")
        print(f"  - QA Report: {qa_report_path}")
        print(f"  - Summary: {summary_path}")
    
    def _validate_plan(self, plan: Dict[str, Any]) -> None:
        """Validate promotion plan structure and files."""
        required_fields = ["master_grid_path", "output_directory", "grid_specification", "panels"]
        for field in required_fields:
            if field not in plan:
                raise ValueError(f"Missing required field: {field}")
        
        # Check master grid exists
        master_grid_path = Path(plan["master_grid_path"])
        if not master_grid_path.exists():
            raise FileNotFoundError(f"Master grid not found: {master_grid_path}")
        
        # Validate grid specification
        if not plan["grid_specification"] in ["3x3", "1x2", "1x4"]:
            raise ValueError(f"Unsupported grid specification: {plan['grid_specification']}")
    
    def _slice_panel(self, master_grid: Image.Image, position: List[int], grid_spec: str) -> Image.Image:
        """Extract individual panel from master grid."""
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
    
    def _center_fill_crop(self, image: Image.Image, target_ratio: float) -> Image.Image:
        """Convert square panel to cinematic aspect ratio using center fill crop."""
        width, height = image.size
        current_ratio = width / height
        
        if abs(current_ratio - target_ratio) < 0.01:
            return image  # Already correct ratio
        
        if current_ratio > target_ratio:
            # Image is wider, crop width
            new_width = int(height * target_ratio)
            left = (width - new_width) // 2
            return image.crop((left, 0, left + new_width, height))
        else:
            # Image is taller, crop height
            new_height = int(width / target_ratio)
            top = (height - new_height) // 2
            return image.crop((0, top, width, top + new_height))
    
    def _upscale_image(self, image: Image.Image, factor: int) -> Image.Image:
        """Upscale image using high-quality Lanczos filter."""
        new_size = (image.size[0] * factor, image.size[1] * factor)
        return image.resize(new_size, Image.Resampling.LANCZOS)
    
    def _prepare_refinement_metadata(self, panel_config: Dict[str, Any], global_seed: int) -> Dict[str, Any]:
        """Prepare metadata for ComfyUI/Automatic1111 API call."""
        return {
            "denoising_strength": self.denoising_strength,
            "prompt_extension": panel_config.get("prompt_extension", "highly detailed, cinematic lighting"),
            "seed": global_seed + hash(panel_config["panel_id"]) % 1000000,
            "cfg_scale": 7.5,
            "steps": 30,
            "sampler": "DPM++ 2M Karras",
            "model": "cinematic_v1",
            "negative_prompt": "low quality, blurry, distorted, artifacts"
        }
    
    def _apply_refinement(self, image: Image.Image, metadata: Dict[str, Any]) -> Image.Image:
        """Apply refinement pass (placeholder for external API integration)."""
        # For hackathon: Apply sharpening filter as placeholder
        # In production: This would call ComfyUI/Automatic1111 API
        
        # Apply unsharp mask for detail enhancement
        enhanced = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=150, threshold=3))
        
        # Slight contrast boost
        enhancer = ImageEnhance.Contrast(enhanced)
        refined = enhancer.enhance(1.1)
        
        return refined
    
    def _calculate_sharpness(self, image: Image.Image) -> float:
        """Calculate Laplacian variance for sharpness measurement."""
        # Convert to grayscale numpy array
        gray = np.array(image.convert('L'))
        
        # Apply Laplacian operator
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        
        # Calculate variance (higher = sharper)
        variance = laplacian.var()
        
        return float(variance)
    
    def _generate_qa_report(self, metrics: List[Dict[str, Any]], plan: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive QA report."""
        sharpness_scores = [m["sharpness_score"] for m in metrics]
        
        return {
            "qa_report_id": f"promotion_qa_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "grid_specification": plan["grid_specification"],
            "total_panels": len(metrics),
            "sharpness_metrics": {
                "mean_sharpness": np.mean(sharpness_scores),
                "min_sharpness": np.min(sharpness_scores),
                "max_sharpness": np.max(sharpness_scores),
                "std_sharpness": np.std(sharpness_scores)
            },
            "panel_metrics": metrics,
            "quality_thresholds": {
                "min_acceptable_sharpness": 100.0,
                "target_aspect_ratio": self.target_aspect_ratio,
                "upscale_factor": self.upscale_factor
            },
            "validation_status": "PASSED" if np.mean(sharpness_scores) > 100.0 else "REVIEW_NEEDED"
        }


# Example promotion plan structure
EXAMPLE_PROMOTION_PLAN = {
    "master_grid_path": "assets/images/master_grid_3x3.png",
    "output_directory": "assets/images/promoted",
    "grid_specification": "3x3",
    "global_seed": 42,
    "panels": [
        {
            "panel_id": "panel_01",
            "grid_position": [0, 0],
            "prompt_extension": "establishing shot, wide angle, cinematic lighting"
        },
        {
            "panel_id": "panel_02", 
            "grid_position": [0, 1],
            "prompt_extension": "medium shot, dramatic lighting, high detail"
        },
        {
            "panel_id": "panel_03",
            "grid_position": [0, 2],
            "prompt_extension": "close-up, soft lighting, emotional depth"
        }
        # ... continue for all 9 panels
    ]
}


if __name__ == "__main__":
    # Example usage
    engine = PromotionEngine()
    
    # Create example promotion plan
    with open("promotion_plan.json", "w") as f:
        json.dump(EXAMPLE_PROMOTION_PLAN, f, indent=2)
    
    # Process grid
    results = engine.process_grid("promotion_plan.json")
    
    # Save assets
    engine.save_assets(results, results["output_directory"])
    
    print(f"✓ Promotion completed: {results['total_panels']} panels processed")
    print(f"  Mean sharpness: {results['qa_report']['sharpness_metrics']['mean_sharpness']:.1f}")
    print(f"  Status: {results['qa_report']['validation_status']}")
