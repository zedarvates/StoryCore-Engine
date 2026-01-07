"""
QA scoring engine for StoryCore-Engine projects.
Performs basic validation checks without external dependencies.
"""

import json
import json
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime


class QAEngine:
    """Handles QA scoring and validation for StoryCore projects."""
    
    def __init__(self):
        self.thresholds = {
            "pass_score": 4.0,
            "min_category_score": 3.0
        }
    
    def run_qa_scoring(self, project_dir: str) -> Dict[str, Any]:
        """Run complete QA scoring on a project."""
        project_path = Path(project_dir)
        
        # Load project data
        project_data = self._load_project_data(project_path)
        if not project_data:
            return self._create_error_report("Failed to load project data")
        
        # Run scoring
        scores = self._score_project(project_data, project_path)
        issues = self._detect_issues(project_data, scores)
        
        # Calculate overall results
        category_scores = {k: v for k, v in scores.items() if k != "overall"}
        overall_score = sum(category_scores.values()) / len(category_scores) if category_scores else 0.0
        passed = overall_score >= self.thresholds["pass_score"] and all(
            score >= self.thresholds["min_category_score"] for score in category_scores.values()
        )
        
        # Create QA report
        qa_report = {
            "qa_report_id": f"qa_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "project_id": project_data.get("project_id", "unknown"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_score": round(overall_score, 2),
            "passed": passed,
            "categories": {k: round(v, 2) for k, v in category_scores.items()},
            "issues": issues,
            "thresholds": self.thresholds,
            "status": "completed"
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
            
            # Load storyboard.json
            storyboard_file = project_path / "storyboard.json"
            if storyboard_file.exists():
                with open(storyboard_file, 'r') as f:
                    storyboard_data = json.load(f)
                    project_data["storyboard"] = storyboard_data
            
            return project_data
            
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    def _score_project(self, project_data: Dict[str, Any], project_path: Path) -> Dict[str, float]:
        """Score project across all QA categories."""
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
        
        except (json.JSONDecodeError, FileNotFoundError, KeyError):
            pass  # No penalty if we can't read the manifest
        
        return max(0.0, min(5.0, score))
    
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
