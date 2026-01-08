"""
StoryCore Narrative Engine
Processes storyboards for style consistency and prompt augmentation.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
from collections import Counter
import re


class NarrativeEngine:
    """Handles narrative processing and style consistency for storyboards."""
    
    def __init__(self):
        self.style_keywords = {
            'lighting': ['bright', 'dark', 'sunny', 'shadowy', 'dim', 'glowing', 'harsh', 'soft', 'dramatic'],
            'mood': ['happy', 'sad', 'tense', 'calm', 'mysterious', 'cheerful', 'gloomy', 'peaceful'],
            'weather': ['rainy', 'sunny', 'cloudy', 'stormy', 'foggy', 'clear', 'overcast'],
            'time': ['morning', 'afternoon', 'evening', 'night', 'dawn', 'dusk', 'midnight'],
            'camera': ['close-up', 'wide shot', 'medium shot', 'aerial', 'low angle', 'high angle']
        }
        
        self.cinematic_keywords = [
            "8k resolution", "highly detailed", "cinematic lighting", "professional photography",
            "depth of field", "dramatic composition", "film grain", "color grading"
        ]
    
    def process_storyboard(self, project_path: Path) -> Dict[str, Any]:
        """Process storyboard for style consistency and prompt augmentation."""
        storyboard_file = project_path / "storyboard.json"
        project_file = project_path / "project.json"
        
        if not storyboard_file.exists():
            raise FileNotFoundError("storyboard.json not found")
        
        # Load storyboard
        with open(storyboard_file, 'r') as f:
            storyboard_data = json.load(f)
        
        # Extract global style anchor
        global_style = self._extract_global_style(storyboard_data)
        
        # Process each shot
        consistency_issues = []
        for shot in storyboard_data.get("shots", []):
            # Generate augmented prompt
            shot["augmented_prompt"] = self._generate_augmented_prompt(
                shot.get("description", ""), global_style
            )
            
            # Check consistency
            issues = self._check_shot_consistency(shot, global_style)
            if issues:
                consistency_issues.extend(issues)
        
        # Update storyboard
        with open(storyboard_file, 'w') as f:
            json.dump(storyboard_data, f, indent=2)
        
        # Update project metadata
        self._update_project_metadata(project_file, global_style, consistency_issues)
        
        return {
            "global_style": global_style,
            "consistency_issues": consistency_issues,
            "shots_processed": len(storyboard_data.get("shots", [])),
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
    
    def _extract_global_style(self, storyboard_data: Dict[str, Any]) -> Dict[str, str]:
        """Extract global style anchor from all shot descriptions."""
        all_descriptions = []
        for shot in storyboard_data.get("shots", []):
            desc = shot.get("description", "").lower()
            all_descriptions.append(desc)
        
        combined_text = " ".join(all_descriptions)
        
        # Extract most common style elements
        global_style = {}
        for category, keywords in self.style_keywords.items():
            found_keywords = []
            for keyword in keywords:
                if keyword in combined_text:
                    count = combined_text.count(keyword)
                    found_keywords.extend([keyword] * count)
            
            if found_keywords:
                most_common = Counter(found_keywords).most_common(1)[0][0]
                global_style[category] = most_common
        
        return global_style
    
    def _generate_augmented_prompt(self, description: str, global_style: Dict[str, str]) -> str:
        """Generate augmented prompt combining description, style, and cinematic keywords."""
        # Start with original description
        augmented = description.strip()
        
        # Add global style elements
        style_additions = []
        for category, style_value in global_style.items():
            if style_value not in description.lower():
                style_additions.append(style_value)
        
        if style_additions:
            augmented += f", {', '.join(style_additions)}"
        
        # Add cinematic keywords
        cinematic_addition = ", ".join(self.cinematic_keywords[:3])  # Use first 3
        augmented += f", {cinematic_addition}"
        
        return augmented
    
    def _check_shot_consistency(self, shot: Dict[str, Any], global_style: Dict[str, str]) -> List[Dict[str, str]]:
        """Check if shot is consistent with global style."""
        issues = []
        description = shot.get("description", "").lower()
        shot_id = shot.get("shot_id", "unknown")
        
        # Check for conflicting styles
        for category, global_value in global_style.items():
            conflicting_keywords = [kw for kw in self.style_keywords[category] 
                                  if kw != global_value and kw in description]
            
            for conflict in conflicting_keywords:
                # Only flag significant conflicts
                if self._is_significant_conflict(global_value, conflict, category):
                    issues.append({
                        "shot_id": shot_id,
                        "category": category,
                        "global_style": global_value,
                        "conflicting_element": conflict,
                        "description": f"Shot has '{conflict}' but global style is '{global_value}'"
                    })
        
        return issues
    
    def _is_significant_conflict(self, global_value: str, conflict: str, category: str) -> bool:
        """Determine if a style conflict is significant enough to flag."""
        # Define significant conflicts
        significant_conflicts = {
            'lighting': [('bright', 'dark'), ('sunny', 'shadowy'), ('bright', 'dim')],
            'mood': [('happy', 'sad'), ('cheerful', 'gloomy'), ('calm', 'tense')],
            'weather': [('sunny', 'rainy'), ('clear', 'stormy'), ('sunny', 'cloudy')],
            'time': [('morning', 'night'), ('dawn', 'midnight'), ('afternoon', 'night')]
        }
        
        if category in significant_conflicts:
            for pair in significant_conflicts[category]:
                if (global_value, conflict) == pair or (conflict, global_value) == pair:
                    return True
        
        return False
    
    def _update_project_metadata(self, project_file: Path, global_style: Dict[str, str], 
                                consistency_issues: List[Dict[str, str]]) -> None:
        """Update project.json with narrative processing metadata."""
        if not project_file.exists():
            return
        
        try:
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            # Update metadata
            if "asset_manifest" not in project_data:
                project_data["asset_manifest"] = {}
            
            project_data["asset_manifest"]["narrative_metadata"] = {
                "global_style": global_style,
                "consistency_issues": len(consistency_issues),
                "processed_at": datetime.utcnow().isoformat() + "Z"
            }
            
            project_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
            
            with open(project_file, 'w') as f:
                json.dump(project_data, f, indent=2)
                
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Warning: Could not update project metadata: {e}")
