"""
StoryCore AutofixEngine - Self-Correcting Quality Loop
Automatically adjusts refinement parameters based on QA metrics.
"""

import json
import copy
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional

try:
    from PIL import Image, ImageFilter, ImageEnhance
    import cv2
    import numpy as np
except ImportError:
    raise ImportError("Required: pip install Pillow opencv-python")


class AutofixEngine:
    """Self-correcting engine for automatic quality improvement."""
    
    def __init__(self, rules_path: Optional[str] = None):
        self.max_iterations = 1  # Hackathon constraint
        self.rules = self._load_autofix_rules(rules_path)
        
    def _load_autofix_rules(self, rules_path: Optional[str]) -> Dict[str, Any]:
        """Load autofix rules or use defaults."""
        default_rules = {
            "under_sharpened": {
                "threshold": 50.0,
                "denoising_adjustment": -0.05,
                "sharpen_adjustment": 0.15
            },
            "over_sharpened": {
                "threshold": 180.0,
                "denoising_adjustment": 0.05,
                "sharpen_adjustment": -0.2
            },
            "acceptable_range": {
                "min": 50.0,
                "max": 180.0
            }
        }
        
        if rules_path and Path(rules_path).exists():
            with open(rules_path, 'r') as f:
                return json.load(f)
        
        return default_rules
    
    def should_retry(self, panel_id: str, qa_metrics: Dict[str, Any]) -> Tuple[bool, Dict[str, float]]:
        """Determine if panel needs retry and calculate parameter adjustments."""
        sharpness = qa_metrics.get("sharpness_score", 0.0)
        
        # Check under-sharpened
        if sharpness < self.rules["under_sharpened"]["threshold"]:
            adjustments = {
                "denoising_strength": self.rules["under_sharpened"]["denoising_adjustment"],
                "sharpen_amount": self.rules["under_sharpened"]["sharpen_adjustment"]
            }
            return True, adjustments
        
        # Check over-sharpened
        if sharpness > self.rules["over_sharpened"]["threshold"]:
            adjustments = {
                "denoising_strength": self.rules["over_sharpened"]["denoising_adjustment"],
                "sharpen_amount": self.rules["over_sharpened"]["sharpen_adjustment"]
            }
            return True, adjustments
        
        return False, {}
    
    def apply_corrections(self, image: Image.Image, current_params: Dict[str, Any], 
                         adjustments: Dict[str, float]) -> Tuple[Image.Image, Dict[str, Any]]:
        """Apply parameter corrections and re-process image."""
        # Calculate new parameters
        new_params = copy.deepcopy(current_params)
        
        # Adjust denoising strength (clamp to valid range)
        if "denoising_strength" in adjustments:
            new_denoising = current_params.get("denoising_strength", 0.35) + adjustments["denoising_strength"]
            new_params["denoising_strength"] = max(0.1, min(0.8, new_denoising))
        
        # Adjust sharpen amount (clamp to valid range)
        if "sharpen_amount" in adjustments:
            new_sharpen = current_params.get("sharpen_amount", 1.0) + adjustments["sharpen_amount"]
            new_params["sharpen_amount"] = max(0.5, min(2.0, new_sharpen))
        
        # Apply refined processing
        corrected_image = self._apply_refined_processing(image, new_params)
        
        return corrected_image, new_params
    
    def _apply_refined_processing(self, image: Image.Image, params: Dict[str, Any]) -> Image.Image:
        """Apply refinement with adjusted parameters."""
        sharpen_amount = params.get("sharpen_amount", 1.0)
        
        # Apply unsharp mask with adjusted parameters
        radius = 1.0
        percent = int(150 * sharpen_amount)
        threshold = 3
        
        enhanced = image.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold))
        
        # Apply contrast adjustment based on denoising strength
        denoising = params.get("denoising_strength", 0.35)
        contrast_factor = 1.0 + (0.35 - denoising) * 0.3  # Inverse relationship
        
        enhancer = ImageEnhance.Contrast(enhanced)
        refined = enhancer.enhance(max(0.8, min(1.3, contrast_factor)))
        
        return refined
    
    def generate_autofix_log(self, panel_id: str, initial_metrics: Dict[str, Any], 
                           applied_adjustments: Dict[str, float], final_metrics: Dict[str, Any],
                           iteration_count: int) -> Dict[str, Any]:
        """Generate comprehensive autofix log entry."""
        improvement_delta = final_metrics["sharpness_score"] - initial_metrics["sharpness_score"]
        
        return {
            "panel_id": panel_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "iteration_count": iteration_count,
            "initial_metrics": {
                "sharpness_score": initial_metrics["sharpness_score"],
                "quality_tier": initial_metrics.get("quality_tier", "unknown")
            },
            "applied_adjustments": applied_adjustments,
            "final_metrics": {
                "sharpness_score": final_metrics["sharpness_score"],
                "quality_tier": final_metrics.get("quality_tier", "unknown")
            },
            "improvement_delta": improvement_delta,
            "improvement_percent": (improvement_delta / initial_metrics["sharpness_score"]) * 100 if initial_metrics["sharpness_score"] > 0 else 0,
            "final_status": "IMPROVED" if improvement_delta > 0 else "DEGRADED" if improvement_delta < 0 else "NO_CHANGE",
            "rules_applied": self._identify_applied_rules(applied_adjustments)
        }
    
    def _identify_applied_rules(self, adjustments: Dict[str, float]) -> List[str]:
        """Identify which rules were applied based on adjustments."""
        rules_applied = []
        
        if adjustments.get("denoising_strength", 0) < 0 and adjustments.get("sharpen_amount", 0) > 0:
            rules_applied.append("under_sharpened_correction")
        elif adjustments.get("denoising_strength", 0) > 0 and adjustments.get("sharpen_amount", 0) < 0:
            rules_applied.append("over_sharpened_correction")
        
        return rules_applied


class EnhancedPromotionEngine:
    """Enhanced PromotionEngine with AutofixEngine integration."""
    
    # QA Thresholds
    SHARPNESS_THRESHOLDS = {
        "too_soft": 50.0,
        "acceptable": 100.0,
        "good": 200.0,
        "oversharpen_risk": 500.0
    }
    
    def __init__(self, autofix_rules_path: Optional[str] = None):
        self.target_aspect_ratio = 16/9
        self.upscale_factor = 2
        self.default_denoising_strength = 0.35
        self.min_image_size = 64
        self.autofix_engine = AutofixEngine(autofix_rules_path)
        
    def process_grid(self, promotion_plan_path: str) -> Dict[str, Any]:
        """Enhanced process_grid with autofix integration."""
        # Load and validate plan
        plan = self._load_and_validate_plan(promotion_plan_path)
        
        master_grid_path = Path(plan["master_grid_path"])
        output_dir = Path(plan["output_directory"])
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load master grid
        master_grid = self._load_and_validate_image(master_grid_path)
        
        # Process panels with autofix
        results = []
        qa_metrics = []
        autofix_logs = []
        seed_log = []
        
        for panel_config in plan["panels"]:
            try:
                result = self._process_panel_with_autofix(
                    master_grid, panel_config, plan, output_dir
                )
                results.append(result["panel_result"])
                qa_metrics.append(result["qa_metric"])
                seed_log.append(result["seed_info"])
                
                if result.get("autofix_log"):
                    autofix_logs.append(result["autofix_log"])
                    
            except Exception as e:
                print(f"ERROR processing {panel_config['panel_id']}: {e}")
                continue
        
        # Generate enhanced QA report with autofix logs
        qa_report = self._generate_enhanced_qa_report(qa_metrics, autofix_logs, plan)
        
        return {
            "processed_panels": results,
            "qa_report": qa_report,
            "autofix_logs": autofix_logs,
            "seed_log": seed_log,
            "total_panels": len(results),
            "output_directory": str(output_dir)
        }
    
    def _process_panel_with_autofix(self, master_grid: Image.Image, panel_config: Dict, 
                                  plan: Dict, output_dir: Path) -> Dict[str, Any]:
        """Process single panel with autofix loop."""
        panel_id = panel_config["panel_id"]
        grid_position = panel_config["grid_position"]
        
        # Initial processing steps
        panel_slice = self._slice_panel(master_grid, grid_position, plan["grid_specification"])
        cinematic_panel = self._center_fill_crop(panel_slice)
        upscaled_panel = self._upscale_image(cinematic_panel)
        
        # Generate seed and initial parameters
        panel_seed = self._generate_panel_seed(plan.get("global_seed", 42), panel_id)
        initial_params = {
            "denoising_strength": panel_config.get("denoising_strength", self.default_denoising_strength),
            "sharpen_amount": 1.0
        }
        
        # Initial refinement pass
        refined_panel = self._apply_refinement_with_params(upscaled_panel, initial_params)
        initial_sharpness = self._calculate_sharpness(refined_panel)
        initial_quality_tier = self._classify_sharpness(initial_sharpness)
        
        initial_metrics = {
            "sharpness_score": initial_sharpness,
            "quality_tier": initial_quality_tier
        }
        
        # Check if autofix is needed
        needs_retry, adjustments = self.autofix_engine.should_retry(panel_id, initial_metrics)
        
        final_panel = refined_panel
        final_metrics = initial_metrics
        autofix_log = None
        iteration_count = 0
        
        if needs_retry and iteration_count < self.autofix_engine.max_iterations:
            print(f"Applying autofix to {panel_id}: {adjustments}")
            iteration_count += 1
            
            # Apply corrections
            corrected_panel, corrected_params = self.autofix_engine.apply_corrections(
                upscaled_panel, initial_params, adjustments
            )
            
            # Calculate new metrics
            corrected_sharpness = self._calculate_sharpness(corrected_panel)
            corrected_quality_tier = self._classify_sharpness(corrected_sharpness)
            
            corrected_metrics = {
                "sharpness_score": corrected_sharpness,
                "quality_tier": corrected_quality_tier
            }
            
            # Fail-fast: Use better result or flag for review
            if corrected_sharpness > initial_sharpness or self._is_in_acceptable_range(corrected_sharpness):
                final_panel = corrected_panel
                final_metrics = corrected_metrics
                print(f"✓ Autofix improved {panel_id}: {initial_sharpness:.1f} → {corrected_sharpness:.1f}")
            else:
                print(f"⚠ Autofix degraded {panel_id}: reverting to original")
                # Keep original result
            
            # Generate autofix log
            autofix_log = self.autofix_engine.generate_autofix_log(
                panel_id, initial_metrics, adjustments, final_metrics, iteration_count
            )
        
        # Validate final aspect ratio
        actual_ratio = final_panel.size[0] / final_panel.size[1]
        ratio_deviation = abs(actual_ratio - self.target_aspect_ratio) / self.target_aspect_ratio
        
        if ratio_deviation > 0.05:
            raise ValueError(f"Aspect ratio deviation too large: {actual_ratio:.3f}")
        
        # Save final result
        output_path = output_dir / f"{panel_id}_promoted.png"
        final_panel.save(output_path, "PNG", quality=95)
        
        return {
            "panel_result": {
                "panel_id": panel_id,
                "output_path": str(output_path),
                "original_size": panel_slice.size,
                "final_size": final_panel.size,
                "sharpness_score": final_metrics["sharpness_score"],
                "quality_tier": final_metrics["quality_tier"],
                "aspect_ratio": actual_ratio,
                "autofix_applied": needs_retry,
                "iteration_count": iteration_count
            },
            "qa_metric": {
                "panel_id": panel_id,
                "sharpness_score": final_metrics["sharpness_score"],
                "quality_tier": final_metrics["quality_tier"],
                "aspect_ratio": actual_ratio,
                "autofix_applied": needs_retry
            },
            "seed_info": {
                "panel_id": panel_id,
                "seed": panel_seed,
                "global_seed": plan.get("global_seed", 42)
            },
            "autofix_log": autofix_log
        }
    
    def _is_in_acceptable_range(self, sharpness: float) -> bool:
        """Check if sharpness is in acceptable range."""
        return (self.autofix_engine.rules["acceptable_range"]["min"] <= 
                sharpness <= 
                self.autofix_engine.rules["acceptable_range"]["max"])
    
    def _apply_refinement_with_params(self, image: Image.Image, params: Dict[str, Any]) -> Image.Image:
        """Apply refinement with specific parameters."""
        return self.autofix_engine._apply_refined_processing(image, params)
    
    def _generate_enhanced_qa_report(self, metrics: List[Dict], autofix_logs: List[Dict], 
                                   plan: Dict) -> Dict[str, Any]:
        """Generate QA report with autofix information."""
        sharpness_scores = [m["sharpness_score"] for m in metrics]
        autofix_applied_count = sum(1 for m in metrics if m.get("autofix_applied", False))
        
        base_report = {
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
            "panel_metrics": metrics,
            "validation_status": self._determine_validation_status(sharpness_scores)
        }
        
        # Add autofix section
        base_report["autofix_summary"] = {
            "autofix_enabled": True,
            "panels_processed_with_autofix": autofix_applied_count,
            "autofix_success_rate": self._calculate_autofix_success_rate(autofix_logs),
            "autofix_logs": autofix_logs
        }
        
        return base_report
    
    def _calculate_autofix_success_rate(self, autofix_logs: List[Dict]) -> float:
        """Calculate autofix success rate."""
        if not autofix_logs:
            return 0.0
        
        improved_count = sum(1 for log in autofix_logs if log["final_status"] == "IMPROVED")
        return (improved_count / len(autofix_logs)) * 100
    
    # Include other necessary methods from original PromotionEngine
    def _load_and_validate_plan(self, plan_path: str) -> Dict[str, Any]:
        """Load and validate promotion plan."""
        with open(plan_path, 'r') as f:
            plan = json.load(f)
        
        required_fields = ["master_grid_path", "output_directory", "grid_specification", "panels"]
        for field in required_fields:
            if field not in plan:
                raise ValueError(f"Missing required field: {field}")
        
        return plan
    
    def _load_and_validate_image(self, image_path: Path) -> Image.Image:
        """Load and validate image."""
        return Image.open(image_path)
    
    def _slice_panel(self, master_grid: Image.Image, position: List[int], grid_spec: str) -> Image.Image:
        """Extract panel from grid."""
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
        """Center fill crop to 16:9."""
        width, height = image.size
        current_ratio = width / height
        target_ratio = self.target_aspect_ratio
        
        if abs(current_ratio - target_ratio) < 0.01:
            return image
        
        if current_ratio > target_ratio:
            new_width = int(height * target_ratio)
            left = (width - new_width) // 2
            return image.crop((left, 0, left + new_width, height))
        else:
            new_height = int(width / target_ratio)
            top = (height - new_height) // 2
            return image.crop((0, top, width, top + new_height))
    
    def _upscale_image(self, image: Image.Image) -> Image.Image:
        """Upscale image using Lanczos."""
        new_size = (image.size[0] * self.upscale_factor, image.size[1] * self.upscale_factor)
        return image.resize(new_size, Image.Resampling.LANCZOS)
    
    def _generate_panel_seed(self, global_seed: int, panel_id: str) -> int:
        """Generate deterministic panel seed."""
        panel_hash = hash(panel_id.encode('utf-8')) % 1000000
        return (global_seed + panel_hash) % 2147483647
    
    def _calculate_sharpness(self, image: Image.Image) -> float:
        """Calculate Laplacian variance."""
        gray = np.array(image.convert('L'))
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        return float(laplacian.var())
    
    def _classify_sharpness(self, score: float) -> str:
        """Classify sharpness score."""
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
    
    def _determine_validation_status(self, scores: List[float]) -> str:
        """Determine validation status."""
        mean_score = np.mean(scores)
        
        if mean_score < self.SHARPNESS_THRESHOLDS["too_soft"]:
            return "FAILED"
        elif mean_score >= self.SHARPNESS_THRESHOLDS["good"]:
            return "PASSED"
        else:
            return "ACCEPTABLE"


# Example autofix rules JSON
EXAMPLE_AUTOFIX_RULES = {
    "under_sharpened": {
        "threshold": 50.0,
        "denoising_adjustment": -0.05,
        "sharpen_adjustment": 0.15
    },
    "over_sharpened": {
        "threshold": 180.0,
        "denoising_adjustment": 0.05,
        "sharpen_adjustment": -0.2
    },
    "acceptable_range": {
        "min": 50.0,
        "max": 180.0
    }
}


if __name__ == "__main__":
    # Create example autofix rules
    with open("autofix_rules.json", "w") as f:
        json.dump(EXAMPLE_AUTOFIX_RULES, f, indent=2)
    
    print("✓ AutofixEngine ready for integration")
    print("✓ Enhanced PromotionEngine with self-correcting loop implemented")
    print("✓ Autofix rules saved to autofix_rules.json")
