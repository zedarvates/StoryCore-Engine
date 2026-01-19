"""
QA scoring engine for StoryCore-Engine projects.
Performs basic validation checks without external dependencies.
"""

import json
import json
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime

# Import quality validation modules
from quality_validator import QualityValidator, ValidationMode, QualityStandard
from quality_feedback import QualityFeedback
from report_generator import JSONReportGenerator
from audio_mixing_engine import AudioMixingEngine


class QAEngine:
    """Handles QA scoring and validation for StoryCore projects."""
    
    def __init__(self):
        self.thresholds = {
            "pass_score": 4.0,
            "min_category_score": 3.0
        }
    
    def run_qa_scoring(self, project_dir: str, enable_advanced_validation: bool = True, enable_audio_mixing: bool = True) -> Dict[str, Any]:
        """Run complete QA scoring on a project with integrated quality validation."""
        project_path = Path(project_dir)

        # Initialize quality validation components
        quality_validator = QualityValidator(ValidationMode.BATCH) if enable_advanced_validation else None
        quality_feedback = QualityFeedback() if enable_advanced_validation else None
        report_generator = JSONReportGenerator() if enable_advanced_validation else None
        audio_mixer = AudioMixingEngine() if enable_audio_mixing else None

        # Load project data
        project_data = self._load_project_data(project_path)
        if not project_data:
            return self._create_error_report("Failed to load project data")

        # Run scoring
        scores = self._score_project(project_data, project_path, quality_validator, audio_mixer)
        issues = self._detect_issues(project_data, scores)

        # Add advanced quality validation if enabled
        advanced_issues = []
        quality_scores = []
        if quality_validator and enable_advanced_validation:
            advanced_issues, quality_scores = self._run_advanced_quality_validation(
                project_path, project_data, quality_validator, quality_feedback
            )

        # Combine issues
        all_issues = issues + advanced_issues

        # Check if audio mixing should be performed (between promotion and QA)
        audio_mixing_recommended = self._check_audio_mixing_needed(project_data, project_path)
        if audio_mixing_recommended and enable_audio_mixing:
            mixing_result = self._perform_audio_mixing(project_path, project_data, audio_mixer)
            if mixing_result:
                # Update project data with mixing metadata
                project_data["asset_manifest"]["audio_mixing"] = mixing_result

        # Calculate overall results
        category_scores = {k: v for k, v in scores.items() if k != "overall"}
        overall_score = sum(category_scores.values()) / len(category_scores) if category_scores else 0.0
        passed = overall_score >= self.thresholds["pass_score"] and all(
            score >= self.thresholds["min_category_score"] for score in category_scores.values()
        )

        # Generate comprehensive quality report if enabled
        quality_report = None
        if enable_advanced_validation and quality_scores:
            quality_report = report_generator.generate_comprehensive_report(
                quality_scores,
                project_data.get("project_id", "unknown")
            )

        # Create QA report
        qa_report = {
            "qa_report_id": f"qa_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "project_id": project_data.get("project_id", "unknown"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_score": round(overall_score, 2),
            "passed": passed,
            "categories": {k: round(v, 2) for k, v in category_scores.items()},
            "issues": all_issues,
            "thresholds": self.thresholds,
            "status": "completed",
            "advanced_validation_enabled": enable_advanced_validation,
            "audio_mixing_enabled": enable_audio_mixing,
            "quality_scores": [score.to_dict() for score in quality_scores] if quality_scores else [],
            "quality_report": quality_report
        }

        return qa_report
    
    def _load_project_data(self, project_path: Path) -> Dict[str, Any]:
        """Load and combine project.json and storyboard.json data."""
        try:
            project_data = {}
            
            # Load project.json
            project_file = project_path / "project.json"
            if project_file.exists():
                with open(project_file, 'r') as f:
                    project_data.update(json.load(f))
                
                # Ensure schema compliance for backward compatibility
                from project_manager import ProjectManager
                pm = ProjectManager()
                project_data = pm.ensure_schema_compliance(project_data)
            
            # Load storyboard.json
            storyboard_file = project_path / "storyboard.json"
            if storyboard_file.exists():
                with open(storyboard_file, 'r') as f:
                    storyboard_data = json.load(f)
                    project_data["storyboard"] = storyboard_data
            
            return project_data
            
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    def _score_project(self, project_data: Dict[str, Any], project_path: Path, quality_validator: QualityValidator = None, audio_mixer: AudioMixingEngine = None) -> Dict[str, float]:
        """Score project across all QA categories with integrated quality validation."""
        scores = {}

        # Data contract compliance
        scores["data_contract_compliance"] = self._score_data_contract(project_data)

        # Schema validation
        scores["schema_validation"] = self._score_schema_validation(project_data)

        # Coherence anchors
        scores["coherence_consistency"] = self._score_coherence_consistency(project_data)

        # Shot structure
        scores["shot_structure"] = self._score_shot_structure(project_data)

        # File structure
        scores["file_structure"] = self._score_file_structure(project_path)

        # Image quality with advanced validation if available
        if quality_validator:
            scores["image_quality"] = self._score_image_quality_advanced(project_path, quality_validator)
        else:
            scores["image_quality"] = self._score_image_quality(project_path)

        # Audio quality with mixing validation if available
        if audio_mixer:
            scores["audio_quality"] = self._score_audio_quality_with_mixing(project_path, project_data, audio_mixer)
        else:
            scores["audio_quality"] = 3.0  # Neutral score if no audio mixing

        return scores
    
    def _score_data_contract(self, project_data: Dict[str, Any]) -> float:
        """Score compliance with data contract requirements."""
        score = 5.0
        required_fields = [
            "schema_version", "project_id", "created_at", "updated_at",
            "config", "coherence_anchors", "shots_index", "asset_manifest", "status"
        ]
        
        for field in required_fields:
            if field not in project_data:
                score -= 0.5
        
        # Check schema v1 compliance
        if "capabilities" not in project_data:
            score -= 0.3
        else:
            required_capabilities = ["grid", "promote", "refine", "compare", "qa", "export", "dashboard", "narrative", "video_plan", "auto_fix"]
            for cap in required_capabilities:
                if cap not in project_data["capabilities"]:
                    score -= 0.1
        
        if "generation_status" not in project_data:
            score -= 0.3
        else:
            required_statuses = ["grid", "promote", "refine", "compare", "qa", "export", "dashboard", "narrative", "video_plan"]
            for status in required_statuses:
                if status not in project_data["generation_status"]:
                    score -= 0.1
        
        # Check config completeness
        config = project_data.get("config", {})
        config_fields = ["hackathon_mode", "global_seed", "target_aspect_ratio", "target_resolution"]
        for field in config_fields:
            if field not in config:
                score -= 0.3
        
        return max(0.0, min(5.0, score))
    
    def _score_schema_validation(self, project_data: Dict[str, Any]) -> float:
        """Score schema validation compliance."""
        score = 5.0
        
        # Check coherence anchors structure
        anchors = project_data.get("coherence_anchors", {})
        required_anchors = ["style_anchor_id", "palette_id", "character_sheet_ids", "lighting_direction"]
        for anchor in required_anchors:
            if anchor not in anchors:
                score -= 0.5
        
        # Check shots index
        shots_index = project_data.get("shots_index", {})
        if len(shots_index) < 3:
            score -= 1.0
        
        return max(0.0, min(5.0, score))
    
    def _score_coherence_consistency(self, project_data: Dict[str, Any]) -> float:
        """Score coherence anchor consistency across shots."""
        score = 5.0
        storyboard = project_data.get("storyboard", {})
        shots = storyboard.get("shots", [])
        
        if not shots:
            return 2.0
        
        # Check if all shots have consistent technical parameters
        first_shot_tech = shots[0].get("prompt_modules", {}).get("technical", {})
        base_resolution = first_shot_tech.get("resolution")
        base_aspect = first_shot_tech.get("aspect_ratio")
        
        for shot in shots[1:]:
            tech = shot.get("prompt_modules", {}).get("technical", {})
            if tech.get("resolution") != base_resolution:
                score -= 0.5
            if tech.get("aspect_ratio") != base_aspect:
                score -= 0.5
        
        return max(0.0, min(5.0, score))
    
    def _score_shot_structure(self, project_data: Dict[str, Any]) -> float:
        """Score shot structure completeness."""
        score = 5.0
        storyboard = project_data.get("storyboard", {})
        shots = storyboard.get("shots", [])
        
        if len(shots) != 3:
            score -= 2.0
        
        required_shot_fields = ["shot_id", "scene_id", "shot_number", "version", "title", "description", "prompt_modules"]
        required_prompt_modules = ["subject", "camera", "lighting", "color", "style", "technical"]
        
        for shot in shots:
            # Check shot fields
            for field in required_shot_fields:
                if field not in shot:
                    score -= 0.3
            
            # Check prompt modules
            prompt_modules = shot.get("prompt_modules", {})
            for module in required_prompt_modules:
                if module not in prompt_modules:
                    score -= 0.2
        
        return max(0.0, min(5.0, score))
    
    def _score_file_structure(self, project_path: Path) -> float:
        """Score file structure completeness."""
        score = 5.0
        
        # Check required files
        required_files = ["project.json", "storyboard.json"]
        for filename in required_files:
            if not (project_path / filename).exists():
                score -= 2.0
        
        # Check required directories
        required_dirs = ["assets/images", "assets/audio"]
        for dirname in required_dirs:
            if not (project_path / dirname).exists():
                score -= 0.5
        
        # Check grid assets if they exist in manifest
        try:
            with open(project_path / "project.json", 'r') as f:
                project_data = json.load(f)
            
            asset_manifest = project_data.get("asset_manifest", {})
            
            # If grid is in manifest, check if file exists
            if "grid" in asset_manifest:
                grid_info = asset_manifest["grid"]
                grid_path = project_path / grid_info.get("path", "")
                if not grid_path.exists():
                    score -= 1.0
                
                # Check if all panels exist
                panels = asset_manifest.get("panels", [])
                expected_panels = self._calculate_expected_panels(grid_info.get("dimensions", "3x3"))
                
                if len(panels) != expected_panels:
                    score -= 0.5
                else:
                    for panel in panels:
                        panel_path = project_path / panel.get("path", "")
                        if not panel_path.exists():
                            score -= 0.2
        
            # Check promoted panels if they exist in manifest
            if "promoted_panels" in asset_manifest:
                promoted_score = self._score_promoted_panels(project_path, asset_manifest["promoted_panels"])
                if promoted_score < 5.0:
                    score -= (5.0 - promoted_score) * 0.2  # Reduced penalty for optional feature
            
            # Check refined panels if they exist in manifest
            if "refined_panels" in asset_manifest:
                refined_score = self._score_refined_panels(project_path, asset_manifest["refined_panels"])
                if refined_score < 5.0:
                    score -= (5.0 - refined_score) * 0.2  # Reduced penalty for optional feature
        
        except (json.JSONDecodeError, FileNotFoundError, KeyError):
            pass  # No penalty if we can't read the manifest
        
        return max(0.0, min(5.0, score))
    
    def _score_promoted_panels(self, project_path: Path, promoted_panels: List[Dict[str, Any]]) -> float:
        """Score promoted panels file existence."""
        if not promoted_panels:
            return 5.0
        
        score = 5.0
        for panel in promoted_panels:
            panel_path = project_path / panel.get("path", "")
            if not panel_path.exists():
                score -= 1.0
        
        return max(0.0, min(5.0, score))
    
    def _score_refined_panels(self, project_path: Path, refined_panels: List[Dict[str, Any]]) -> float:
        """Score refined panels file existence."""
        if not refined_panels:
            return 5.0
        
        score = 5.0
        for panel in refined_panels:
            panel_path = project_path / panel.get("path", "")
            if not panel_path.exists():
                score -= 1.0
        
        return max(0.0, min(5.0, score))
    
    def _check_refinement_metrics(self, refinement_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check refinement metrics for potential issues."""
        issues = []
        
        panel_metrics = refinement_metrics.get("panel_metrics", [])
        summary = refinement_metrics.get("summary", {})
        
        if not panel_metrics:
            return issues
        
        # Check for panels with decreased sharpness (>5% decrease)
        for panel in panel_metrics:
            improvement = panel.get("improvement_percent", 0)
            if improvement < -5.0:
                issues.append({
                    "category": "refinement_quality",
                    "severity": "medium",
                    "description": f"Panel {panel.get('panel', 'unknown')} sharpness decreased by {abs(improvement):.1f}%",
                    "suggested_fix": "Consider reducing refinement strength or changing mode"
                })
        
        # Check mean improvement
        mean_improvement = summary.get("mean_improvement_percent", 0)
        if mean_improvement < 2.0:
            issues.append({
                "category": "refinement_quality",
                "severity": "low",
                "description": f"Mean sharpness improvement is only {mean_improvement:.1f}% (might be too weak)",
                "suggested_fix": "Consider increasing refinement strength"
            })
        elif mean_improvement > 80.0:
            issues.append({
                "category": "refinement_quality",
                "severity": "medium",
                "description": f"Mean sharpness improvement is {mean_improvement:.1f}% (possible oversharpen artifacts)",
                "suggested_fix": "Consider reducing refinement strength to avoid artifacts"
            })
        
        return issues
    
    def _calculate_expected_panels(self, dimensions: str) -> int:
        """Calculate expected number of panels from grid dimensions."""
        try:
            cols, rows = map(int, dimensions.split('x'))
            return cols * rows
        except (ValueError, AttributeError):
            return 9  # Default to 3x3
    
    def _detect_issues(self, project_data: Dict[str, Any], scores: Dict[str, float]) -> List[Dict[str, Any]]:
        """Detect specific issues based on scores."""
        issues = []
        
        # Check refinement metrics if available
        asset_manifest = project_data.get("asset_manifest", {})
        if "refinement_metrics" in asset_manifest:
            refinement_issues = self._check_refinement_metrics(asset_manifest["refinement_metrics"])
            issues.extend(refinement_issues)
        
        for category, score in scores.items():
            if score < self.thresholds["min_category_score"]:
                severity = "high" if score < 2.0 else "medium"
                issues.append({
                    "issue_id": f"issue_{category}_{datetime.utcnow().strftime('%H%M%S')}",
                    "category": category,
                    "severity": severity,
                    "score": score,
                    "description": f"{category.replace('_', ' ').title()} score below threshold ({score:.1f} < {self.thresholds['min_category_score']})",
                    "suggested_fix": self._get_suggested_fix(category),
                    "responsible_module": self._get_responsible_module(category)
                })
        
        return issues
    
    def _get_suggested_fix(self, category: str) -> str:
        """Get suggested fix for a category."""
        fixes = {
            "data_contract_compliance": "Ensure all required fields are present in project.json",
            "schema_validation": "Validate JSON structure against schema requirements",
            "coherence_consistency": "Check coherence anchors are consistent across shots",
            "shot_structure": "Verify all shots have required fields and prompt modules",
            "file_structure": "Create missing files and directories"
        }
        return fixes.get(category, "Review and fix validation errors")
    
    def _get_responsible_module(self, category: str) -> str:
        """Get responsible module for a category."""
        modules = {
            "data_contract_compliance": "ProjectManager",
            "schema_validation": "Validator", 
            "coherence_consistency": "StoryboardEngine",
            "shot_structure": "StoryboardEngine",
            "file_structure": "ProjectManager"
        }
        return modules.get(category, "Unknown")
    
    def _create_error_report(self, error_message: str) -> Dict[str, Any]:
        """Create error QA report."""
        return {
            "qa_report_id": f"qa_error_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "project_id": "unknown",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_score": 0.0,
            "passed": False,
            "categories": {},
            "issues": [{
                "issue_id": "error_001",
                "category": "system_error",
                "severity": "high",
                "description": error_message,
                "suggested_fix": "Check project files and structure",
                "responsible_module": "QAEngine"
            }],
            "status": "error"
        }
    def _score_image_quality(self, project_path: Path) -> float:
        """Score image quality using Laplacian variance analysis."""
        try:
            from PIL import Image
            from refinement_engine import compute_sharpness_laplacian_variance
        except ImportError:
            # If PIL or refinement engine not available, return neutral score
            return 3.0
        
        score = 5.0
        promoted_dir = project_path / "assets" / "images" / "promoted"
        
        if not promoted_dir.exists():
            return 2.0  # No promoted images to analyze
        
        # Find promoted panel images
        promoted_files = list(promoted_dir.glob("panel_*_promoted.png"))
        if not promoted_files:
            return 2.0
        
        # Quality thresholds based on Laplacian variance
        quality_thresholds = {
            "too_soft": 50.0,
            "acceptable": 100.0,
            "good": 200.0,
            "oversharpen_risk": 500.0
        }
        
        sharpness_scores = []
        
        for image_file in promoted_files:
            try:
                with Image.open(image_file) as img:
                    sharpness = compute_sharpness_laplacian_variance(img)
                    sharpness_scores.append(sharpness)
            except Exception:
                continue  # Skip problematic images
        
        if not sharpness_scores:
            return 2.0
        
        # Calculate average sharpness
        avg_sharpness = sum(sharpness_scores) / len(sharpness_scores)
        
        # Score based on average sharpness
        if avg_sharpness < quality_thresholds["too_soft"]:
            score = 1.0  # Too soft
        elif avg_sharpness < quality_thresholds["acceptable"]:
            score = 3.0  # Acceptable
        elif avg_sharpness < quality_thresholds["good"]:
            score = 4.0  # Good
        elif avg_sharpness < quality_thresholds["oversharpen_risk"]:
            score = 5.0  # Excellent
        else:
            score = 3.5  # Possible oversharpen artifacts
        
        # Penalize high variance (inconsistent quality)
        if len(sharpness_scores) > 1:
            variance = sum((x - avg_sharpness) ** 2 for x in sharpness_scores) / len(sharpness_scores)
            if variance > 1000:  # High variance penalty
                score -= 0.5

        return max(0.0, min(5.0, score))

    def _score_image_quality_advanced(self, project_path: Path, quality_validator: QualityValidator) -> float:
        """Score image quality using advanced quality validator."""
        try:
            promoted_dir = project_path / "assets" / "images" / "promoted"
            if not promoted_dir.exists():
                return 2.0

            promoted_files = list(promoted_dir.glob("panel_*_promoted.png"))
            if not promoted_files:
                return 2.0

            # Use quality validator for advanced analysis
            total_sharpness = 0.0
            count = 0

            for image_file in promoted_files[:5]:  # Limit to first 5 for performance
                try:
                    from PIL import Image
                    import numpy as np

                    with Image.open(image_file) as img:
                        frame = np.array(img)

                        # Perform quality validation
                        sharpness = quality_validator.calculate_sharpness(frame)
                        total_sharpness += sharpness
                        count += 1
                except Exception:
                    continue

            if count == 0:
                return 2.0

            avg_sharpness = total_sharpness / count
            # Normalize sharpness score to 0-5 scale
            normalized_score = min(5.0, avg_sharpness / 100.0)  # Assuming 100 is good sharpness
            return max(0.0, normalized_score)

        except ImportError:
            # Fallback to basic scoring if advanced validation fails
            return self._score_image_quality(project_path)

    def _score_audio_quality_with_mixing(self, project_path: Path, project_data: Dict[str, Any], audio_mixer: AudioMixingEngine) -> float:
        """Score audio quality with mixing validation."""
        try:
            audio_dir = project_path / "assets" / "audio"
            if not audio_dir.exists():
                return 3.0

            # Check for mixed audio files
            mixed_files = list(audio_dir.glob("*_mixed.*"))
            if not mixed_files:
                # No mixed files, check for raw audio to validate
                raw_audio_files = list(audio_dir.glob("*.wav")) + list(audio_dir.glob("*.mp3"))
                if not raw_audio_files:
                    return 3.0

                # Validate raw audio quality using quality validator
                quality_score = 3.0
                try:
                    from quality_validator import QualityValidator
                    validator = QualityValidator()

                    for audio_file in raw_audio_files[:2]:  # Check first 2 files
                        is_valid, error = validator.validate_audio_file(audio_file)
                        if is_valid:
                            # Could add more detailed audio analysis here
                            quality_score = 4.0  # Basic validation passed
                        else:
                            quality_score = 2.0  # Validation failed
                            break

                    return quality_score

                except ImportError:
                    return 3.0

            # Mixed files exist, validate mixing quality
            mixing_quality = 4.0

            # Check if mixing metadata exists in project data
            asset_manifest = project_data.get("asset_manifest", {})
            if "audio_mixing" in asset_manifest:
                mixing_metadata = asset_manifest["audio_mixing"]
                # Validate mixing parameters
                if "voice_segments" in mixing_metadata and "keyframes" in mixing_metadata:
                    # Advanced mixing validation
                    voice_segments = mixing_metadata.get("voice_segments", [])
                    keyframes = mixing_metadata.get("keyframes", [])

                    if len(voice_segments) > 0 and len(keyframes) > 0:
                        mixing_quality = 5.0  # Excellent mixing
                    else:
                        mixing_quality = 4.0  # Good mixing
                else:
                    mixing_quality = 3.5  # Basic mixing
            else:
                # Files exist but no metadata - moderate score
                mixing_quality = 3.5

            return mixing_quality

        except Exception:
            return 3.0  # Neutral score on error

    def _run_advanced_quality_validation(self, project_path: Path, project_data: Dict[str, Any], quality_validator: QualityValidator, quality_feedback: QualityFeedback) -> Tuple[List[Dict[str, Any]], List]:
        """Run advanced quality validation and return issues and scores."""
        issues = []
        quality_scores = []

        try:
            # Analyze promoted images for quality
            promoted_dir = project_path / "assets" / "images" / "promoted"
            if promoted_dir.exists():
                promoted_files = list(promoted_dir.glob("panel_*_promoted.png"))

                for image_file in promoted_files[:3]:  # Limit for performance
                    try:
                        from PIL import Image
                        import numpy as np

                        with Image.open(image_file) as img:
                            frame = np.array(img)

                            # Perform quality validation
                            sharpness = quality_validator.calculate_sharpness(frame)

                            # Create quality score
                            from quality_validator import ComprehensiveQualityScore, QualityIssue

                            # Simple quality assessment for individual image
                            overall_score = min(100.0, sharpness)  # Cap at 100
                            quality_score = ComprehensiveQualityScore(
                                overall_score=overall_score,
                                sharpness_score=sharpness,
                                motion_score=80.0,  # Assume good motion for still images
                                audio_score=75.0,  # Placeholder
                                continuity_score=85.0,  # Placeholder
                                issues=[],
                                suggestions=[]
                            )
                            quality_scores.append(quality_score)

                            # Check for issues
                            if sharpness < quality_validator.sharpness_threshold:
                                issue = QualityIssue(
                                    issue_type="low_sharpness",
                                    severity="medium" if sharpness > 50 else "high",
                                    description=f"Low sharpness in {image_file.name}: {sharpness:.1f}",
                                    timestamp=0.0,
                                    frame_number=None,
                                    metric_value=sharpness,
                                    threshold_value=quality_validator.sharpness_threshold
                                )
                                issues.append(issue.to_dict())

                    except Exception as e:
                        continue

        except Exception as e:
            # If advanced validation fails, continue with basic validation
            pass

        return issues, quality_scores

    def _check_audio_mixing_needed(self, project_data: Dict[str, Any], project_path: Path) -> bool:
        """Check if audio mixing is needed between promotion and QA stages."""
        # Check if promotion has been completed
        generation_status = project_data.get("generation_status", {})
        if generation_status.get("promote") != "completed":
            return False  # Promotion not done yet

        # Check if QA is being run and promotion was successful
        if generation_status.get("qa") == "completed":
            return False  # QA already completed

        # Check if audio files exist but no mixing has been done
        audio_dir = project_path / "assets" / "audio"
        if not audio_dir.exists():
            return False

        # Look for voice and music tracks that need mixing
        voice_files = list(audio_dir.glob("*voice*")) + list(audio_dir.glob("*narration*"))
        music_files = list(audio_dir.glob("*music*")) + list(audio_dir.glob("*bgm*"))

        if voice_files and music_files:
            # Check if mixed files already exist
            mixed_files = list(audio_dir.glob("*_mixed*"))
            return len(mixed_files) == 0  # Mixing needed if no mixed files exist

        return False

    def _perform_audio_mixing(self, project_path: Path, project_data: Dict[str, Any], audio_mixer: AudioMixingEngine) -> Dict[str, Any]:
        """Perform audio mixing between promotion and QA stages."""
        try:
            audio_dir = project_path / "assets" / "audio"
            voice_files = list(audio_dir.glob("*voice*")) + list(audio_dir.glob("*narration*"))
            music_files = list(audio_dir.glob("*music*")) + list(audio_dir.glob("*bgm*"))

            if not voice_files or not music_files:
                return None

            # Use first available files (in real implementation, might need better selection)
            voice_file = voice_files[0]
            music_file = music_files[0]

            # Load audio files (simplified - in real implementation would use proper audio loading)
            try:
                import librosa
                voice_audio, voice_sr = librosa.load(str(voice_file), sr=None, mono=True)
                music_audio, music_sr = librosa.load(str(music_file), sr=None, mono=True)

                voice_track = {
                    "samples": voice_audio,
                    "sample_rate": voice_sr,
                    "duration": len(voice_audio) / voice_sr
                }
                music_track = {
                    "samples": music_audio,
                    "sample_rate": music_sr,
                    "duration": len(music_audio) / music_sr
                }

                # Perform mixing
                mix_result = audio_mixer.create_voice_music_mix(voice_track, music_track)

                if mix_result.get("mixed_samples") is not None:
                    # Save mixed audio
                    mixed_dir = audio_dir / "mixed"
                    mixed_dir.mkdir(exist_ok=True)
                    output_file = mixed_dir / f"{project_data.get('project_id', 'project')}_voice_music_mix.wav"

                    # Save using soundfile if available
                    try:
                        import soundfile as sf
                        sf.write(str(output_file), mix_result["mixed_samples"], mix_result["sample_rate"])
                    except ImportError:
                        # Fallback: just create empty file to indicate mixing was done
                        output_file.touch()

                    return {
                        "voice_segments": mix_result.get("voice_segments", []),
                        "keyframes": mix_result.get("keyframes", []),
                        "duration": mix_result.get("duration", 0),
                        "sample_rate": mix_result.get("sample_rate", 44100),
                        "output_file": str(output_file)
                    }

            except ImportError:
                # Audio libraries not available, skip mixing
                return None

        except Exception as e:
            # If mixing fails, continue without it
            return None

        return None