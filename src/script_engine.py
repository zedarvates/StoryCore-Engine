"""
Script Engine - Stage 1 of 10-Stage Multimodal Pipeline
Transforms raw text input into structured cinematic JSON metadata.

Follows DOCUMENT 3 — PROMPT ENGINEERING GUI V2 and DOCUMENT 4 — STYLE & COHERENCE BIBL V2
"""

import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple


class ScriptEngine:
    """Handles script processing and narrative structure extraction."""
    
    def __init__(self):
        self.schema_version = "1.0"
        
        # Style anchors from DOCUMENT 4 — STYLE & COHERENCE BIBL V2
        self.default_style_anchors = {
            "aesthetic": "cinematic_realism",
            "contrast": "soft",
            "palette_type": "controlled_cinematic",
            "lighting_type": "physically_plausible",
            "perspective_accuracy": "accurate",
            "texture_style": "subtle",
            "visual_tone": "mature_atmospheric"
        }
        
        # Camera language from DOCUMENT 3 — PROMPT ENGINEERING
        self.shot_types = ["ELS", "LS", "FS", "MCU", "CU", "ECU"]
        self.camera_angles = ["eye-level", "low-angle", "high-angle"]
        self.camera_movements = ["static", "dolly-in", "dolly-out", "pan-left", "pan-right", "tilt-up", "tilt-down"]
        
        # Lighting types from DOCUMENT 4
        self.lighting_types = ["soft", "hard", "rim light", "backlight", "overcast diffuse", "warm sunset", "cool moonlight"]
        
    def process_script(self, script_text: str, project_path: Path) -> Dict[str, Any]:
        """
        Process raw script text into structured cinematic JSON.
        
        Args:
            script_text: Raw input text/script
            project_path: Path to project directory
            
        Returns:
            Dict with structured script metadata
        """
        # Extract narrative components
        scenes = self._extract_scenes(script_text)
        characters = self._extract_characters(script_text)
        emotional_arcs = self._extract_emotional_arcs(script_text)
        key_beats = self._extract_key_beats(script_text)
        
        # Generate cinematic metadata
        cinematic_structure = self._generate_cinematic_structure(scenes, characters)
        
        # Create script metadata following Data Contract v1
        script_metadata = {
            "script_id": f"script_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "schema_version": self.schema_version,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "source_text": script_text,
            "narrative_structure": {
                "scenes": scenes,
                "characters": characters,
                "emotional_arcs": emotional_arcs,
                "key_beats": key_beats
            },
            "cinematic_structure": cinematic_structure,
            "style_anchors": self.default_style_anchors.copy(),
            "coherence_requirements": self._generate_coherence_requirements(characters),
            "processing_metadata": {
                "total_scenes": len(scenes),
                "total_characters": len(characters),
                "estimated_duration_seconds": len(scenes) * 6,  # 6 seconds per scene default
                "complexity_score": self._calculate_complexity_score(scenes, characters)
            }
        }
        
        # Save script metadata
        script_file = project_path / "script_metadata.json"
        with open(script_file, 'w') as f:
            json.dump(script_metadata, f, indent=2)
        
        # Update project.json with script reference
        self._update_project_with_script(project_path, script_metadata)
        
        return script_metadata
    
    def _extract_scenes(self, script_text: str) -> List[Dict[str, Any]]:
        """Extract scenes from script text."""
        # Simple scene detection based on common patterns
        scene_patterns = [
            r'SCENE\s+(\d+)',
            r'INT\.|EXT\.',
            r'FADE IN:',
            r'CUT TO:',
            r'\n\n[A-Z][^.]*\n'
        ]
        
        # Split text into potential scenes
        paragraphs = [p.strip() for p in script_text.split('\n\n') if p.strip()]
        
        scenes = []
        scene_number = 1
        
        for i, paragraph in enumerate(paragraphs):
            # Determine if this paragraph starts a new scene
            is_scene_start = any(re.search(pattern, paragraph, re.IGNORECASE) for pattern in scene_patterns)
            
            if is_scene_start or i == 0:  # First paragraph is always a scene
                scene = {
                    "scene_id": f"scene_{scene_number:02d}",
                    "scene_number": scene_number,
                    "title": self._extract_scene_title(paragraph),
                    "description": paragraph[:200] + "..." if len(paragraph) > 200 else paragraph,
                    "location": self._extract_location(paragraph),
                    "time_of_day": self._extract_time_of_day(paragraph),
                    "characters_present": self._extract_scene_characters(paragraph),
                    "emotional_tone": self._extract_emotional_tone(paragraph),
                    "key_actions": self._extract_key_actions(paragraph),
                    "duration_seconds": 6,  # Default duration
                    "camera_suggestions": self._suggest_camera_language(paragraph)
                }
                scenes.append(scene)
                scene_number += 1
        
        # Ensure we have at least 3 scenes for the pipeline
        while len(scenes) < 3:
            scenes.append(self._create_placeholder_scene(len(scenes) + 1))
        
        return scenes[:3]  # Limit to 3 scenes for hackathon
    
    def _extract_characters(self, script_text: str) -> List[Dict[str, Any]]:
        """Extract character information from script."""
        # Common character name patterns
        character_patterns = [
            r'\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b',  # ALL CAPS names
            r'\b(?:he|she|they)\b',  # Pronouns
            r'\b(?:man|woman|person|character)\b'  # Generic terms
        ]
        
        # Extract potential character names
        potential_names = set()
        for pattern in character_patterns:
            matches = re.findall(pattern, script_text, re.IGNORECASE)
            potential_names.update(matches)
        
        # Filter and create character objects
        characters = []
        character_id = 1
        
        # Default characters if none found
        if not potential_names or len(potential_names) < 2:
            characters = [
                self._create_default_character("PROTAGONIST", character_id),
                self._create_default_character("SUPPORTING", character_id + 1)
            ]
        else:
            for name in list(potential_names)[:3]:  # Limit to 3 characters
                if len(name) > 1 and name.upper() not in ['THE', 'AND', 'BUT', 'FOR']:
                    character = self._create_character_from_name(name, character_id)
                    characters.append(character)
                    character_id += 1
        
        return characters
    
    def _extract_emotional_arcs(self, script_text: str) -> List[Dict[str, Any]]:
        """Extract emotional progression from script."""
        # Emotional keywords mapping
        emotion_keywords = {
            "tension": ["conflict", "argument", "fight", "struggle", "tension"],
            "joy": ["happy", "celebration", "joy", "laughter", "smile"],
            "sadness": ["sad", "cry", "tears", "loss", "grief"],
            "fear": ["afraid", "scared", "terror", "panic", "fear"],
            "calm": ["peaceful", "quiet", "serene", "calm", "rest"],
            "excitement": ["excited", "thrilled", "energy", "dynamic", "action"]
        }
        
        # Analyze text for emotional content
        detected_emotions = []
        text_lower = script_text.lower()
        
        for emotion, keywords in emotion_keywords.items():
            score = sum(text_lower.count(keyword) for keyword in keywords)
            if score > 0:
                detected_emotions.append({
                    "emotion": emotion,
                    "intensity": min(5.0, score * 0.5),
                    "keywords_found": [kw for kw in keywords if kw in text_lower]
                })
        
        # Create emotional arc structure
        emotional_arcs = [
            {
                "arc_id": "primary_arc",
                "arc_type": "narrative_progression",
                "start_emotion": detected_emotions[0]["emotion"] if detected_emotions else "calm",
                "peak_emotion": detected_emotions[1]["emotion"] if len(detected_emotions) > 1 else "tension",
                "end_emotion": detected_emotions[-1]["emotion"] if detected_emotions else "calm",
                "progression": detected_emotions
            }
        ]
        
        return emotional_arcs
    
    def _extract_key_beats(self, script_text: str) -> List[Dict[str, Any]]:
        """Extract key narrative beats."""
        # Beat detection patterns
        beat_patterns = [
            (r'(?:begins?|starts?|opens?)', "opening"),
            (r'(?:meets?|encounters?|finds?)', "inciting_incident"),
            (r'(?:conflicts?|problems?|challenges?)', "rising_action"),
            (r'(?:climax|peak|confronts?)', "climax"),
            (r'(?:resolves?|ends?|concludes?)', "resolution")
        ]
        
        key_beats = []
        beat_id = 1
        
        for pattern, beat_type in beat_patterns:
            matches = re.finditer(pattern, script_text, re.IGNORECASE)
            for match in matches:
                # Extract context around the match
                start = max(0, match.start() - 50)
                end = min(len(script_text), match.end() + 50)
                context = script_text[start:end].strip()
                
                beat = {
                    "beat_id": f"beat_{beat_id:02d}",
                    "beat_type": beat_type,
                    "description": context,
                    "timestamp_estimate": beat_id * 6,  # Rough timing
                    "importance": "high" if beat_type in ["climax", "inciting_incident"] else "medium"
                }
                key_beats.append(beat)
                beat_id += 1
        
        # Ensure we have basic story structure
        if not key_beats:
            key_beats = [
                {"beat_id": "beat_01", "beat_type": "opening", "description": "Story begins", "timestamp_estimate": 0, "importance": "high"},
                {"beat_id": "beat_02", "beat_type": "development", "description": "Story develops", "timestamp_estimate": 6, "importance": "medium"},
                {"beat_id": "beat_03", "beat_type": "resolution", "description": "Story concludes", "timestamp_estimate": 12, "importance": "high"}
            ]
        
        return key_beats
    
    def _generate_cinematic_structure(self, scenes: List[Dict], characters: List[Dict]) -> Dict[str, Any]:
        """Generate cinematic metadata structure."""
        return {
            "total_scenes": len(scenes),
            "estimated_runtime_seconds": len(scenes) * 6,
            "shot_breakdown": self._generate_shot_breakdown(scenes),
            "character_screen_time": self._calculate_character_screen_time(scenes, characters),
            "visual_style_requirements": {
                "consistency_anchors": self.default_style_anchors.copy(),
                "lighting_progression": self._plan_lighting_progression(scenes),
                "color_palette_evolution": self._plan_color_evolution(scenes)
            },
            "technical_requirements": {
                "aspect_ratio": "16:9",
                "resolution": "1920x1080",
                "frame_rate": "24fps",
                "total_shots": len(scenes) * 3  # 3 shots per scene average
            }
        }
    
    def _generate_shot_breakdown(self, scenes: List[Dict]) -> List[Dict[str, Any]]:
        """Generate shot-level breakdown for scenes."""
        shots = []
        shot_id = 1
        
        for scene in scenes:
            # Generate 3 shots per scene (establishing, medium, close)
            scene_shots = [
                {
                    "shot_id": f"shot_{shot_id:02d}",
                    "scene_id": scene["scene_id"],
                    "shot_type": "LS",  # Long Shot for establishing
                    "camera_angle": "eye-level",
                    "camera_movement": "static",
                    "duration_seconds": 2,
                    "purpose": "establishing"
                },
                {
                    "shot_id": f"shot_{shot_id + 1:02d}",
                    "scene_id": scene["scene_id"],
                    "shot_type": "MCU",  # Medium Close-Up for action
                    "camera_angle": scene["camera_suggestions"]["angle"],
                    "camera_movement": scene["camera_suggestions"]["movement"],
                    "duration_seconds": 3,
                    "purpose": "action"
                },
                {
                    "shot_id": f"shot_{shot_id + 2:02d}",
                    "scene_id": scene["scene_id"],
                    "shot_type": "CU",  # Close-Up for emotion
                    "camera_angle": "eye-level",
                    "camera_movement": "static",
                    "duration_seconds": 1,
                    "purpose": "emotional"
                }
            ]
            shots.extend(scene_shots)
            shot_id += 3
        
        return shots
    
    def _create_default_character(self, character_type: str, character_id: int) -> Dict[str, Any]:
        """Create default character following DOCUMENT 4 coherence standards."""
        return {
            "character_id": f"char_{character_id:02d}",
            "name": f"{character_type}_{character_id}",
            "character_type": character_type.lower(),
            "description": f"Default {character_type.lower()} character",
            "visual_attributes": {
                "face_shape": "oval",
                "hair_style": "medium_length",
                "hair_color": "brown",
                "eye_color": "brown",
                "skin_tone": "medium",
                "height": "average",
                "build": "average"
            },
            "color_palette": {
                "primary": "#8B4513",  # Saddle brown
                "secondary": "#2F4F4F",  # Dark slate gray
                "accent": "#CD853F",  # Peru
                "neutral": "#696969"  # Dim gray
            },
            "clothing_style": "casual_contemporary",
            "personality_traits": ["determined", "thoughtful"],
            "role_in_story": character_type.lower()
        }
    
    def _create_character_from_name(self, name: str, character_id: int) -> Dict[str, Any]:
        """Create character object from extracted name."""
        character = self._create_default_character("CHARACTER", character_id)
        character["name"] = name.title()
        character["character_id"] = f"char_{name.lower()[:3]}_{character_id:02d}"
        return character
    
    def _extract_scene_title(self, paragraph: str) -> str:
        """Extract or generate scene title."""
        # Try to find a title in the first line
        first_line = paragraph.split('\n')[0].strip()
        if len(first_line) < 100:  # Reasonable title length
            return first_line
        else:
            # Generate title from first few words
            words = first_line.split()[:5]
            return " ".join(words) + "..."
    
    def _extract_location(self, paragraph: str) -> str:
        """Extract location information."""
        location_keywords = {
            "interior": ["inside", "room", "house", "building", "indoor"],
            "exterior": ["outside", "street", "park", "outdoor", "field"],
            "urban": ["city", "street", "building", "downtown"],
            "nature": ["forest", "mountain", "beach", "field", "garden"]
        }
        
        text_lower = paragraph.lower()
        for location_type, keywords in location_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return location_type
        
        return "unspecified"
    
    def _extract_time_of_day(self, paragraph: str) -> str:
        """Extract time of day information."""
        time_keywords = {
            "morning": ["morning", "dawn", "sunrise", "early"],
            "afternoon": ["afternoon", "midday", "noon"],
            "evening": ["evening", "dusk", "sunset"],
            "night": ["night", "midnight", "dark"]
        }
        
        text_lower = paragraph.lower()
        for time_period, keywords in time_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return time_period
        
        return "unspecified"
    
    def _extract_scene_characters(self, paragraph: str) -> List[str]:
        """Extract characters present in scene."""
        # Simple character detection
        character_indicators = re.findall(r'\b[A-Z]{2,}\b', paragraph)
        return list(set(character_indicators))[:3]  # Limit to 3 characters per scene
    
    def _extract_emotional_tone(self, paragraph: str) -> str:
        """Extract emotional tone of scene."""
        emotion_keywords = {
            "tense": ["conflict", "argument", "fight", "struggle"],
            "peaceful": ["calm", "quiet", "serene", "peaceful"],
            "exciting": ["action", "fast", "dynamic", "energy"],
            "melancholic": ["sad", "loss", "grief", "somber"],
            "joyful": ["happy", "celebration", "joy", "laughter"]
        }
        
        text_lower = paragraph.lower()
        for emotion, keywords in emotion_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return emotion
        
        return "neutral"
    
    def _extract_key_actions(self, paragraph: str) -> List[str]:
        """Extract key actions from scene."""
        # Simple action verb detection
        action_verbs = re.findall(r'\b(?:walks?|runs?|talks?|looks?|moves?|enters?|exits?|sits?|stands?)\b', 
                                 paragraph, re.IGNORECASE)
        return list(set(action_verbs))[:3]  # Limit to 3 key actions
    
    def _suggest_camera_language(self, paragraph: str) -> Dict[str, str]:
        """Suggest camera language based on scene content."""
        text_lower = paragraph.lower()
        
        # Determine shot type based on content
        if any(word in text_lower for word in ["wide", "landscape", "establishing", "overview"]):
            shot_type = "LS"
        elif any(word in text_lower for word in ["close", "face", "emotion", "detail"]):
            shot_type = "CU"
        else:
            shot_type = "MCU"
        
        # Determine camera angle
        if any(word in text_lower for word in ["above", "looking down", "overhead"]):
            angle = "high-angle"
        elif any(word in text_lower for word in ["below", "looking up", "towering"]):
            angle = "low-angle"
        else:
            angle = "eye-level"
        
        # Determine movement
        if any(word in text_lower for word in ["approaches", "moves closer", "zooms"]):
            movement = "dolly-in"
        elif any(word in text_lower for word in ["pans", "follows", "tracks"]):
            movement = "pan-right"
        else:
            movement = "static"
        
        return {
            "shot_type": shot_type,
            "angle": angle,
            "movement": movement
        }
    
    def _create_placeholder_scene(self, scene_number: int) -> Dict[str, Any]:
        """Create placeholder scene to ensure minimum count."""
        return {
            "scene_id": f"scene_{scene_number:02d}",
            "scene_number": scene_number,
            "title": f"Scene {scene_number} - Placeholder",
            "description": f"Placeholder scene {scene_number} for pipeline completion",
            "location": "unspecified",
            "time_of_day": "unspecified",
            "characters_present": [],
            "emotional_tone": "neutral",
            "key_actions": [],
            "duration_seconds": 6,
            "camera_suggestions": {
                "shot_type": "MCU",
                "angle": "eye-level",
                "movement": "static"
            }
        }
    
    def _generate_coherence_requirements(self, characters: List[Dict]) -> Dict[str, Any]:
        """Generate coherence requirements following DOCUMENT 4."""
        return {
            "character_consistency": {
                "face_shape_stability": True,
                "hair_color_stability": True,
                "clothing_consistency": True,
                "proportions_stability": True
            },
            "lighting_consistency": {
                "direction_stability": True,
                "temperature_consistency": True,
                "shadow_logic": True
            },
            "color_palette_consistency": {
                "character_palettes": [char["color_palette"] for char in characters],
                "scene_palette_control": True,
                "saturation_limits": True
            },
            "perspective_consistency": {
                "horizon_line_stability": True,
                "vanishing_point_accuracy": True,
                "ground_plane_consistency": True
            }
        }
    
    def _calculate_complexity_score(self, scenes: List[Dict], characters: List[Dict]) -> float:
        """Calculate script complexity score."""
        base_score = 1.0
        
        # Add complexity for multiple characters
        base_score += len(characters) * 0.2
        
        # Add complexity for scene variety
        locations = set(scene["location"] for scene in scenes)
        base_score += len(locations) * 0.1
        
        # Add complexity for emotional variety
        emotions = set(scene["emotional_tone"] for scene in scenes)
        base_score += len(emotions) * 0.1
        
        return min(5.0, base_score)
    
    def _plan_lighting_progression(self, scenes: List[Dict]) -> List[Dict[str, str]]:
        """Plan lighting progression across scenes."""
        progression = []
        
        for scene in scenes:
            time_of_day = scene["time_of_day"]
            emotional_tone = scene["emotional_tone"]
            
            # Map time and emotion to lighting
            if time_of_day == "morning":
                lighting = "soft key light"
            elif time_of_day == "evening":
                lighting = "warm sunset light"
            elif time_of_day == "night":
                lighting = "cool moonlight"
            elif emotional_tone == "tense":
                lighting = "hard key light"
            else:
                lighting = "soft key light"
            
            progression.append({
                "scene_id": scene["scene_id"],
                "lighting_type": lighting,
                "direction": "right",
                "temperature": "warm" if "warm" in lighting else "cool"
            })
        
        return progression
    
    def _plan_color_evolution(self, scenes: List[Dict]) -> List[Dict[str, str]]:
        """Plan color palette evolution across scenes."""
        evolution = []
        
        # Base palette from DOCUMENT 4
        base_palette = {
            "warm_oranges": "#FF8C42",
            "deep_blues": "#1E3A8A",
            "neutral_grays": "#6B7280",
            "soft_browns": "#8B4513",
            "muted_greens": "#6B8E23"
        }
        
        for i, scene in enumerate(scenes):
            emotional_tone = scene["emotional_tone"]
            
            # Select dominant color based on emotion
            if emotional_tone == "tense":
                dominant = base_palette["deep_blues"]
            elif emotional_tone == "peaceful":
                dominant = base_palette["muted_greens"]
            elif emotional_tone == "exciting":
                dominant = base_palette["warm_oranges"]
            else:
                dominant = base_palette["neutral_grays"]
            
            evolution.append({
                "scene_id": scene["scene_id"],
                "dominant_hue": dominant,
                "secondary_hue": base_palette["soft_browns"],
                "accent_hue": base_palette["warm_oranges"]
            })
        
        return evolution
    
    def _calculate_character_screen_time(self, scenes: List[Dict], characters: List[Dict]) -> Dict[str, int]:
        """Calculate estimated screen time per character."""
        screen_time = {}
        
        for character in characters:
            char_name = character["name"]
            total_time = 0
            
            for scene in scenes:
                if char_name in scene.get("characters_present", []):
                    total_time += scene["duration_seconds"]
            
            screen_time[char_name] = total_time
        
        return screen_time
    
    def _update_project_with_script(self, project_path: Path, script_metadata: Dict[str, Any]) -> None:
        """Update project.json with script processing results."""
        project_file = project_path / "project.json"
        
        with open(project_file, 'r') as f:
            project_data = json.load(f)
        
        # Update project with script metadata
        project_data["script_metadata"] = {
            "script_id": script_metadata["script_id"],
            "processed_at": script_metadata["created_at"],
            "total_scenes": script_metadata["processing_metadata"]["total_scenes"],
            "total_characters": script_metadata["processing_metadata"]["total_characters"],
            "estimated_duration": script_metadata["processing_metadata"]["estimated_duration_seconds"],
            "complexity_score": script_metadata["processing_metadata"]["complexity_score"]
        }
        
        # Update generation status
        project_data["generation_status"]["script"] = "done"
        project_data["status"]["current_phase"] = "script_processed"
        project_data["status"]["last_updated"] = script_metadata["created_at"]
        
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)