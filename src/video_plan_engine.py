"""
StoryCore Video Plan Engine
Generates video production plans from storyboards and refined panels.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any


class VideoPlanEngine:
    """Handles video plan generation from storyboards and refined panels."""
    
    def __init__(self):
        self.camera_keywords = {
            'pan': ['pan', 'panning', 'sweep', 'horizontal movement'],
            'zoom': ['zoom', 'push in', 'pull out', 'close up', 'wide shot'],
            'dolly': ['dolly', 'track', 'tracking', 'forward', 'backward'],
            'static': ['static', 'fixed', 'still', 'stationary', 'locked']
        }
        
        self.default_duration = 3.0
    
    def generate_video_plan(self, project_path: Path) -> Dict[str, Any]:
        """Generate video production plan from storyboard and refined panels."""
        storyboard_file = project_path / "storyboard.json"
        project_file = project_path / "project.json"
        video_plan_file = project_path / "video_plan.json"
        
        if not storyboard_file.exists():
            raise FileNotFoundError("storyboard.json not found")
        
        # Load storyboard
        with open(storyboard_file, 'r') as f:
            storyboard_data = json.load(f)
        
        # Load project data for global style
        global_style = {}
        try:
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            global_style = project_data.get("asset_manifest", {}).get("narrative_metadata", {}).get("global_style", {})
        except:
            pass
        
        # Generate video plan entries
        video_entries = []
        shots = storyboard_data.get("shots", [])
        
        for i, shot in enumerate(shots):
            shot_id = shot.get("shot_id", f"shot_{i+1:02d}")
            shot_number = shot.get("shot_number", i+1)
            
            # Determine source image path
            source_image = f"assets/images/refined/panel_{shot_number:02d}_refined.png"
            
            # Check if refined image exists, fallback to promoted
            refined_path = project_path / source_image
            if not refined_path.exists():
                source_image = f"assets/images/promoted/panel_{shot_number:02d}_promoted.png"
                promoted_path = project_path / source_image
                if not promoted_path.exists():
                    source_image = f"assets/images/panels/panel_{shot_number:02d}.ppm"
            
            # Infer camera movement
            description = shot.get("description", "").lower()
            camera_movement = self._infer_camera_movement(description)
            
            # Get duration
            duration = shot.get("duration_seconds", self.default_duration)
            
            # Determine transition
            transition = "cut"
            if i == 0:  # First shot
                transition = "fade"
            elif i == len(shots) - 1:  # Last shot
                transition = "fade"
            
            video_entry = {
                "shot_id": shot_id,
                "shot_number": shot_number,
                "source_image": source_image,
                "camera_movement": camera_movement,
                "duration": duration,
                "style_anchor": global_style,
                "transition": transition,
                "description": shot.get("description", ""),
                "title": shot.get("title", f"Shot {shot_number}")
            }
            
            video_entries.append(video_entry)
        
        # Create video plan
        video_plan = {
            "video_plan_id": f"vp_{storyboard_data.get('project_id', 'unknown')}",
            "project_id": storyboard_data.get("project_id"),
            "storyboard_id": storyboard_data.get("storyboard_id"),
            "created_at": datetime.utcnow().isoformat() + "Z",
            "total_shots": len(video_entries),
            "total_duration": sum(entry["duration"] for entry in video_entries),
            "video_entries": video_entries,
            "metadata": {
                "global_style_applied": bool(global_style),
                "camera_movements": self._get_movement_summary(video_entries),
                "transitions": self._get_transition_summary(video_entries)
            }
        }
        
        # Save video plan
        with open(video_plan_file, 'w') as f:
            json.dump(video_plan, f, indent=2)
        
        # Update project manifest
        self._update_project_manifest(project_file, video_plan)
        
        return {
            "video_plan_file": str(video_plan_file),
            "total_shots": len(video_entries),
            "total_duration": video_plan["total_duration"],
            "camera_movements": video_plan["metadata"]["camera_movements"],
            "created_at": video_plan["created_at"]
        }
    
    def _infer_camera_movement(self, description: str) -> str:
        """Infer camera movement from shot description."""
        # Check for explicit camera movement keywords
        for movement, keywords in self.camera_keywords.items():
            for keyword in keywords:
                if keyword in description:
                    return movement
        
        # Default inference based on shot type
        if any(word in description for word in ['establishing', 'wide', 'overview']):
            return 'static'
        elif any(word in description for word in ['focus', 'detail', 'close']):
            return 'zoom'
        elif any(word in description for word in ['follow', 'move', 'action']):
            return 'dolly'
        
        return 'static'  # Default
    
    def _get_movement_summary(self, video_entries: List[Dict[str, Any]]) -> Dict[str, int]:
        """Get summary of camera movements used."""
        movements = {}
        for entry in video_entries:
            movement = entry["camera_movement"]
            movements[movement] = movements.get(movement, 0) + 1
        return movements
    
    def _get_transition_summary(self, video_entries: List[Dict[str, Any]]) -> Dict[str, int]:
        """Get summary of transitions used."""
        transitions = {}
        for entry in video_entries:
            transition = entry["transition"]
            transitions[transition] = transitions.get(transition, 0) + 1
        return transitions
    
    def _update_project_manifest(self, project_file: Path, video_plan: Dict[str, Any]) -> None:
        """Update project.json with video plan metadata."""
        if not project_file.exists():
            return
        
        try:
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            # Ensure schema compliance
            from project_manager import ProjectManager
            pm = ProjectManager()
            project_data = pm.ensure_schema_compliance(project_data)
            
            # Update data contract v1 fields
            project_data["capabilities"]["video_plan"] = True
            project_data["generation_status"]["video_plan"] = "done"
            
            # Update metadata
            if "asset_manifest" not in project_data:
                project_data["asset_manifest"] = {}
            
            project_data["asset_manifest"]["video_plan_metadata"] = {
                "video_plan_generated": True,
                "total_shots": video_plan["total_shots"],
                "total_duration": video_plan["total_duration"],
                "camera_movements": video_plan["metadata"]["camera_movements"],
                "generated_at": video_plan["created_at"]
            }
            
            project_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
            
            with open(project_file, 'w') as f:
                json.dump(project_data, f, indent=2)
                
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Warning: Could not update project metadata: {e}")
