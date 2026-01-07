"""
Project initialization and management logic for StoryCore-Engine.
"""

from pathlib import Path
import json
from datetime import datetime
import hashlib


class ProjectManager:
    """Handles project initialization and management operations."""
    
    def __init__(self):
        self.schema_version = "1.0"
    
    def init_project(self, project_name: str, base_path: str = ".") -> None:
        """Initialize a new StoryCore-Engine project with proper structure."""
        project_path = Path(base_path) / project_name
        
        # Create project directory
        project_path.mkdir(exist_ok=True)
        
        # Create folder structure
        (project_path / "assets" / "images").mkdir(parents=True, exist_ok=True)
        (project_path / "assets" / "audio").mkdir(parents=True, exist_ok=True)
        
        # Generate deterministic seed from project name
        seed = self._generate_seed(project_name)
        
        # Create project.json
        self._create_project_json(project_path, project_name, seed)
        
        # Create storyboard.json with 1 scene, 3 shots
        self._create_storyboard_json(project_path, project_name)
    
    def _generate_seed(self, project_name: str) -> int:
        """Generate deterministic seed from project name."""
        hash_obj = hashlib.md5(project_name.encode())
        return int(hash_obj.hexdigest()[:8], 16) % (2**31)
    
    def _create_project_json(self, project_path: Path, project_name: str, seed: int) -> None:
        """Create project.json with all required fields."""
        now = datetime.utcnow().isoformat() + "Z"
        
        project_data = {
            "schema_version": self.schema_version,
            "project_id": f"storycore_{project_name}",
            "created_at": now,
            "updated_at": now,
            "config": {
                "hackathon_mode": True,
                "global_seed": seed,
                "target_aspect_ratio": "16:9",
                "target_resolution": "1920x1080",
                "target_duration_seconds": 18,
                "time_budget_seconds": 300
            },
            "coherence_anchors": {
                "style_anchor_id": "STYLE_CINE_REALISM_V1",
                "palette_id": "PALETTE_SUNSET_01",
                "character_sheet_ids": ["CHAR_DEFAULT_V1"],
                "lighting_direction": "right",
                "lighting_temperature": "warm",
                "perspective_type": "2-point",
                "horizon_line": "mid"
            },
            "shots_index": {
                "shot_01": {"active_version": "v1", "status": "placeholder"},
                "shot_02": {"active_version": "v1", "status": "placeholder"},
                "shot_03": {"active_version": "v1", "status": "placeholder"}
            },
            "asset_manifest": {},
            "status": {
                "current_phase": "initialization",
                "qa_passed": False
            }
        }
        
        with open(project_path / "project.json", "w") as f:
            json.dump(project_data, f, indent=2)
    
    def _create_storyboard_json(self, project_path: Path, project_name: str) -> None:
        """Create storyboard.json with 1 scene and 3 shot placeholders."""
        storyboard_data = {
            "storyboard_id": f"sb_{project_name}",
            "project_id": f"storycore_{project_name}",
            "shots": [
                self._create_shot_placeholder("shot_01", "scene_01", 1, "Opening shot", "Establishing shot to set the scene", 6),
                self._create_shot_placeholder("shot_02", "scene_01", 2, "Medium shot", "Focus on main subject or action", 6),
                self._create_shot_placeholder("shot_03", "scene_01", 3, "Closing shot", "Concluding shot to wrap the scene", 6)
            ]
        }
        
        with open(project_path / "storyboard.json", "w") as f:
            json.dump(storyboard_data, f, indent=2)
    
    def _create_shot_placeholder(self, shot_id: str, scene_id: str, shot_number: int, 
                                title: str, description: str, duration: int) -> dict:
        """Create a placeholder shot with all required fields."""
        return {
            "shot_id": shot_id,
            "scene_id": scene_id,
            "shot_number": shot_number,
            "version": "v1",
            "title": title,
            "description": description,
            "duration_seconds": duration,
            "prompt_modules": {
                "subject": f"Placeholder subject for {shot_id}",
                "camera": "Medium shot, eye level, static",
                "lighting": "Natural lighting, soft shadows",
                "color": "Neutral palette, balanced colors",
                "style": "Cinematic realism, professional quality",
                "technical": {
                    "seed": 42,
                    "aspect_ratio": "16:9",
                    "resolution": "1920x1080",
                    "cfg_scale": 7.5,
                    "steps": 30,
                    "negative_prompt": "low quality, blurry, distorted"
                }
            }
        }
