"""
Scene Breakdown Engine - Stage 2 of 10-Stage Multimodal Pipeline
Transforms script JSON into cinematically detailed scene metadata.

Follows DOCUMENT 24 — GLOBAL PIPELINE ARCHI V2 and DOCUMENT 4 — STYLE & COHERENCE BIBL V2
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple


class SceneBreakdownEngine:
    """Handles scene breakdown and cinematic analysis."""
    
    def __init__(self):
        self.schema_version = "1.0"
        
        # Cinematic environment types from DOCUMENT 4
        self.environment_types = {
            "urban": {
                "architectural_style": "contemporary",
                "atmosphere": "dynamic",
                "depth_cues": ["buildings", "streets", "skyline"],
                "lighting_sources": ["street_lights", "windows", "neon"]
            },
            "interior": {
                "architectural_style": "residential",
                "atmosphere": "intimate",
                "depth_cues": ["furniture", "walls", "ceiling"],
                "lighting_sources": ["lamps", "windows", "overhead"]
            },
            "nature": {
                "architectural_style": "organic",
                "atmosphere": "serene",
                "depth_cues": ["trees", "horizon", "terrain"],
                "lighting_sources": ["sun", "sky", "reflections"]
            },
            "exterior": {
                "architectural_style": "varied",
                "atmosphere": "open",
                "depth_cues": ["horizon", "buildings", "landscape"],
                "lighting_sources": ["sun", "sky", "ambient"]
            }
        }
        
        # Lighting setups from DOCUMENT 4 — STYLE & COHERENCE
        self.lighting_setups = {
            "morning": {
                "type": "soft key light",
                "direction": "right",
                "temperature": "warm",
                "quality": "diffuse",
                "shadows": "soft"
            },
            "afternoon": {
                "type": "hard key light",
                "direction": "overhead",
                "temperature": "neutral",
                "quality": "direct",
                "shadows": "sharp"
            },
            "evening": {
                "type": "warm sunset light",
                "direction": "right",
                "temperature": "warm",
                "quality": "directional",
                "shadows": "long"
            },
            "night": {
                "type": "cool moonlight",
                "direction": "overhead",
                "temperature": "cool",
                "quality": "ambient",
                "shadows": "soft"
            }
        }
        
        # Emotional tone to visual mapping
        self.emotional_visual_mapping = {
            "tense": {
                "lighting_modifier": "hard",
                "color_saturation": "high",
                "contrast": "high",
                "camera_angle_bias": "low-angle"
            },
            "peaceful": {
                "lighting_modifier": "soft",
                "color_saturation": "low",
                "contrast": "soft",
                "camera_angle_bias": "eye-level"
            },
            "exciting": {
                "lighting_modifier": "dynamic",
                "color_saturation": "high",
                "contrast": "high",
                "camera_angle_bias": "varied"
            },
            "melancholic": {
                "lighting_modifier": "soft",
                "color_saturation": "desaturated",
                "contrast": "low",
                "camera_angle_bias": "high-angle"
            },
            "neutral": {
                "lighting_modifier": "balanced",
                "color_saturation": "medium",
                "contrast": "medium",
                "camera_angle_bias": "eye-level"
            }
        }
    
    def process_scene_breakdown(self, project_path: Path) -> Dict[str, Any]:
        """
        Process script metadata into detailed scene breakdown.
        
        Args:
            project_path: Path to project directory
            
        Returns:
            Dict with scene breakdown metadata
        """
        # Load script metadata
        script_metadata = self._load_script_metadata(project_path)
        if not script_metadata:
            raise FileNotFoundError("Script metadata not found. Run 'storycore script' first.")
        
        # Extract scenes from script
        scenes = script_metadata["narrative_structure"]["scenes"]
        characters = script_metadata["narrative_structure"]["characters"]
        emotional_arcs = script_metadata["narrative_structure"]["emotional_arcs"]
        
        # Process each scene into detailed breakdown
        detailed_scenes = []
        for scene in scenes:
            detailed_scene = self._create_detailed_scene_breakdown(
                scene, characters, emotional_arcs, script_metadata["style_anchors"]
            )
            detailed_scenes.append(detailed_scene)
        
        # Create scene breakdown metadata
        scene_breakdown_metadata = {
            "scene_breakdown_id": f"breakdown_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "schema_version": self.schema_version,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "source_script_id": script_metadata["script_id"],
            "detailed_scenes": detailed_scenes,
            "global_cinematic_rules": self._generate_global_cinematic_rules(detailed_scenes),
            "continuity_requirements": self._generate_continuity_requirements(detailed_scenes),
            "technical_specifications": self._generate_technical_specifications(detailed_scenes),
            "processing_metadata": {
                "total_scenes_processed": len(detailed_scenes),
                "average_scene_complexity": self._calculate_average_complexity(detailed_scenes),
                "lighting_consistency_score": self._calculate_lighting_consistency(detailed_scenes),
                "color_harmony_score": self._calculate_color_harmony(detailed_scenes)
            }
        }
        
        # Save scene breakdown metadata
        breakdown_file = project_path / "scene_breakdown.json"
        with open(breakdown_file, 'w') as f:
            json.dump(scene_breakdown_metadata, f, indent=2)
        
        # Update project.json with scene breakdown reference
        self._update_project_with_breakdown(project_path, scene_breakdown_metadata)
        
        return scene_breakdown_metadata
    
    def _load_script_metadata(self, project_path: Path) -> Dict[str, Any]:
        """Load script metadata from project."""
        script_file = project_path / "script_metadata.json"
        if not script_file.exists():
            return {}
        
        with open(script_file, 'r') as f:
            return json.load(f)
    
    def _create_detailed_scene_breakdown(self, scene: Dict[str, Any], characters: List[Dict], 
                                       emotional_arcs: List[Dict], style_anchors: Dict[str, Any]) -> Dict[str, Any]:
        """Create detailed cinematic breakdown for a scene."""
        
        # Determine scene purpose based on content and position
        scene_purpose = self._determine_scene_purpose(scene)
        
        # Analyze environment requirements
        environment_analysis = self._analyze_environment(scene)
        
        # Determine lighting setup
        lighting_setup = self._determine_lighting_setup(scene)
        
        # Identify characters in scene
        scene_characters = self._identify_scene_characters(scene, characters)
        
        # Extract key beats for this scene
        scene_beats = self._extract_scene_beats(scene)
        
        # Generate visual composition requirements
        composition_requirements = self._generate_composition_requirements(scene, lighting_setup)
        
        # Create detailed scene breakdown
        detailed_scene = {
            "scene_id": scene["scene_id"],
            "scene_number": scene["scene_number"],
            "title": scene["title"],
            "description": scene["description"],
            
            # Scene Purpose Analysis
            "scene_purpose": scene_purpose,
            "narrative_function": self._determine_narrative_function(scene, scene_purpose),
            "emotional_arc": self._map_scene_to_emotional_arc(scene, emotional_arcs),
            
            # Environment Breakdown
            "environment": environment_analysis,
            "location_details": self._generate_location_details(scene, environment_analysis),
            "atmospheric_requirements": self._generate_atmospheric_requirements(scene),
            
            # Lighting Analysis
            "lighting": lighting_setup,
            "lighting_motivation": self._determine_lighting_motivation(scene, lighting_setup),
            "shadow_requirements": self._generate_shadow_requirements(lighting_setup),
            
            # Character Analysis
            "characters": scene_characters,
            "character_interactions": self._analyze_character_interactions(scene, scene_characters),
            "character_emotional_states": self._determine_character_emotions(scene, scene_characters),
            
            # Key Beats
            "key_beats": scene_beats,
            "beat_timing": self._calculate_beat_timing(scene_beats, scene["duration_seconds"]),
            "dramatic_structure": self._analyze_dramatic_structure(scene_beats),
            
            # Visual Composition
            "composition": composition_requirements,
            "color_palette": self._generate_scene_color_palette(scene, style_anchors),
            "visual_style": self._generate_visual_style_requirements(scene, style_anchors),
            
            # Technical Requirements
            "technical_specs": {
                "duration_seconds": scene["duration_seconds"],
                "aspect_ratio": "16:9",
                "resolution": "1920x1080",
                "frame_rate": "24fps"
            },
            
            # Continuity Requirements
            "continuity": {
                "previous_scene_connections": [],
                "next_scene_connections": [],
                "character_continuity": self._generate_character_continuity(scene_characters),
                "lighting_continuity": self._generate_lighting_continuity(lighting_setup),
                "color_continuity": self._generate_color_continuity(scene)
            }
        }
        
        return detailed_scene
    
    def _determine_scene_purpose(self, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Determine the cinematic purpose of the scene."""
        scene_number = scene["scene_number"]
        emotional_tone = scene["emotional_tone"]
        key_actions = scene.get("key_actions", [])
        
        # Determine primary purpose
        if scene_number == 1:
            primary_purpose = "establishing"
        elif scene_number == 3:
            primary_purpose = "resolution"
        elif emotional_tone == "tense":
            primary_purpose = "conflict"
        elif len(key_actions) > 2:
            primary_purpose = "action"
        else:
            primary_purpose = "development"
        
        return {
            "primary": primary_purpose,
            "secondary": self._determine_secondary_purpose(scene, primary_purpose),
            "cinematic_function": self._map_purpose_to_cinematic_function(primary_purpose),
            "pacing_requirements": self._determine_pacing_requirements(primary_purpose)
        }
    
    def _determine_secondary_purpose(self, scene: Dict[str, Any], primary: str) -> str:
        """Determine secondary purpose based on scene content."""
        emotional_tone = scene["emotional_tone"]
        
        if primary == "establishing" and emotional_tone != "neutral":
            return "mood_setting"
        elif primary == "conflict" and len(scene.get("characters_present", [])) > 1:
            return "character_development"
        elif primary == "action" and emotional_tone in ["peaceful", "melancholic"]:
            return "emotional_transition"
        else:
            return "narrative_progression"
    
    def _map_purpose_to_cinematic_function(self, purpose: str) -> str:
        """Map scene purpose to cinematic function."""
        mapping = {
            "establishing": "introduce_world",
            "conflict": "create_tension",
            "action": "advance_plot",
            "development": "build_character",
            "resolution": "conclude_arc"
        }
        return mapping.get(purpose, "advance_narrative")
    
    def _determine_pacing_requirements(self, purpose: str) -> Dict[str, Any]:
        """Determine pacing requirements based on purpose."""
        pacing_map = {
            "establishing": {"rhythm": "slow", "cuts": "minimal", "movement": "gradual"},
            "conflict": {"rhythm": "fast", "cuts": "dynamic", "movement": "intense"},
            "action": {"rhythm": "medium", "cuts": "rhythmic", "movement": "purposeful"},
            "development": {"rhythm": "medium", "cuts": "thoughtful", "movement": "natural"},
            "resolution": {"rhythm": "slow", "cuts": "deliberate", "movement": "conclusive"}
        }
        return pacing_map.get(purpose, {"rhythm": "medium", "cuts": "standard", "movement": "natural"})
    
    def _analyze_environment(self, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze environment requirements for the scene."""
        location = scene.get("location", "unspecified")
        time_of_day = scene.get("time_of_day", "unspecified")
        
        # Get base environment type
        env_type = self.environment_types.get(location, self.environment_types["exterior"])
        
        # Enhance with scene-specific details
        environment = {
            "type": location,
            "time_of_day": time_of_day,
            "architectural_style": env_type["architectural_style"],
            "atmosphere": env_type["atmosphere"],
            "depth_cues": env_type["depth_cues"],
            "lighting_sources": env_type["lighting_sources"],
            "weather": self._determine_weather(scene),
            "atmospheric_perspective": self._determine_atmospheric_perspective(location),
            "environmental_storytelling": self._generate_environmental_storytelling(scene)
        }
        
        return environment
    
    def _determine_weather(self, scene: Dict[str, Any]) -> Dict[str, str]:
        """Determine weather conditions based on scene content."""
        emotional_tone = scene["emotional_tone"]
        description = scene.get("description", "").lower()
        
        # Weather mapping based on emotion and content
        if "wind" in description:
            condition = "windy"
        elif emotional_tone == "melancholic":
            condition = "overcast"
        elif emotional_tone == "peaceful":
            condition = "clear"
        elif emotional_tone == "tense":
            condition = "stormy"
        else:
            condition = "clear"
        
        return {
            "condition": condition,
            "visibility": "good" if condition in ["clear", "windy"] else "reduced",
            "atmospheric_effect": self._map_weather_to_atmosphere(condition)
        }
    
    def _map_weather_to_atmosphere(self, condition: str) -> str:
        """Map weather condition to atmospheric effect."""
        mapping = {
            "clear": "crisp",
            "overcast": "soft_diffuse",
            "windy": "dynamic",
            "stormy": "dramatic"
        }
        return mapping.get(condition, "neutral")
    
    def _determine_atmospheric_perspective(self, location: str) -> Dict[str, Any]:
        """Determine atmospheric perspective requirements."""
        if location == "urban":
            return {
                "depth_layers": ["foreground_buildings", "midground_streets", "background_skyline"],
                "haze_intensity": "medium",
                "color_shift": "cool_distance"
            }
        elif location == "nature":
            return {
                "depth_layers": ["foreground_detail", "midground_trees", "background_mountains"],
                "haze_intensity": "light",
                "color_shift": "blue_distance"
            }
        else:
            return {
                "depth_layers": ["foreground", "midground", "background"],
                "haze_intensity": "minimal",
                "color_shift": "subtle"
            }
    
    def _generate_environmental_storytelling(self, scene: Dict[str, Any]) -> List[str]:
        """Generate environmental storytelling elements."""
        emotional_tone = scene["emotional_tone"]
        location = scene.get("location", "unspecified")
        
        storytelling_elements = []
        
        if emotional_tone == "tense" and location == "urban":
            storytelling_elements.extend(["harsh_shadows", "stark_contrasts", "angular_architecture"])
        elif emotional_tone == "peaceful" and location == "nature":
            storytelling_elements.extend(["soft_textures", "organic_shapes", "harmonious_colors"])
        elif emotional_tone == "melancholic":
            storytelling_elements.extend(["muted_colors", "empty_spaces", "distant_elements"])
        
        return storytelling_elements
    
    def _determine_lighting_setup(self, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Determine detailed lighting setup for the scene."""
        time_of_day = scene.get("time_of_day", "unspecified")
        emotional_tone = scene["emotional_tone"]
        location = scene.get("location", "unspecified")
        
        # Get base lighting from time of day
        base_lighting = self.lighting_setups.get(time_of_day, self.lighting_setups["afternoon"])
        
        # Apply emotional modifications
        emotional_mods = self.emotional_visual_mapping.get(emotional_tone, self.emotional_visual_mapping["neutral"])
        
        # Create comprehensive lighting setup
        lighting_setup = {
            "primary_light": {
                "type": base_lighting["type"],
                "direction": base_lighting["direction"],
                "temperature": base_lighting["temperature"],
                "quality": base_lighting["quality"],
                "intensity": self._determine_light_intensity(emotional_tone)
            },
            "secondary_lights": self._generate_secondary_lights(location, time_of_day),
            "shadows": {
                "type": base_lighting["shadows"],
                "direction": base_lighting["direction"],
                "intensity": self._determine_shadow_intensity(emotional_tone),
                "color_temperature": self._determine_shadow_temperature(base_lighting["temperature"])
            },
            "ambient_light": {
                "source": self._determine_ambient_source(location, time_of_day),
                "color": self._determine_ambient_color(time_of_day),
                "intensity": "low"
            },
            "lighting_motivation": self._determine_lighting_motivation_detailed(scene, base_lighting),
            "cinematic_purpose": self._determine_lighting_cinematic_purpose(emotional_tone)
        }
        
        return lighting_setup
    
    def _determine_light_intensity(self, emotional_tone: str) -> str:
        """Determine light intensity based on emotional tone."""
        intensity_map = {
            "tense": "high",
            "exciting": "high",
            "peaceful": "medium",
            "melancholic": "low",
            "neutral": "medium"
        }
        return intensity_map.get(emotional_tone, "medium")
    
    def _generate_secondary_lights(self, location: str, time_of_day: str) -> List[Dict[str, str]]:
        """Generate secondary lighting sources."""
        secondary_lights = []
        
        if location == "urban":
            if time_of_day == "night":
                secondary_lights.extend([
                    {"type": "street_light", "direction": "overhead", "color": "warm_white"},
                    {"type": "window_light", "direction": "varied", "color": "warm_yellow"}
                ])
            else:
                secondary_lights.append({"type": "reflected_light", "direction": "up", "color": "neutral"})
        
        elif location == "interior":
            secondary_lights.extend([
                {"type": "window_light", "direction": "side", "color": "daylight"},
                {"type": "practical_light", "direction": "local", "color": "warm"}
            ])
        
        return secondary_lights
    
    def _determine_shadow_intensity(self, emotional_tone: str) -> str:
        """Determine shadow intensity based on emotion."""
        if emotional_tone in ["tense", "exciting"]:
            return "strong"
        elif emotional_tone in ["peaceful", "melancholic"]:
            return "soft"
        else:
            return "medium"
    
    def _determine_shadow_temperature(self, light_temperature: str) -> str:
        """Determine shadow color temperature (opposite of light)."""
        if light_temperature == "warm":
            return "cool"
        elif light_temperature == "cool":
            return "warm"
        else:
            return "neutral"
    
    def _determine_ambient_source(self, location: str, time_of_day: str) -> str:
        """Determine ambient light source."""
        if location == "interior":
            return "window_bounce"
        elif time_of_day == "night":
            return "sky_glow"
        else:
            return "sky_dome"
    
    def _determine_ambient_color(self, time_of_day: str) -> str:
        """Determine ambient light color."""
        color_map = {
            "morning": "warm_white",
            "afternoon": "neutral_white",
            "evening": "warm_orange",
            "night": "cool_blue"
        }
        return color_map.get(time_of_day, "neutral_white")
    
    def _determine_lighting_motivation_detailed(self, scene: Dict[str, Any], base_lighting: Dict[str, str]) -> str:
        """Determine detailed lighting motivation."""
        time_of_day = scene.get("time_of_day", "unspecified")
        location = scene.get("location", "unspecified")
        
        if time_of_day != "unspecified":
            return f"Natural {time_of_day} light in {location} environment"
        else:
            return f"Cinematic lighting for {scene['emotional_tone']} mood"
    
    def _determine_lighting_cinematic_purpose(self, emotional_tone: str) -> str:
        """Determine cinematic purpose of lighting."""
        purpose_map = {
            "tense": "create_drama",
            "peaceful": "establish_calm",
            "exciting": "enhance_energy",
            "melancholic": "evoke_sadness",
            "neutral": "maintain_naturalism"
        }
        return purpose_map.get(emotional_tone, "support_narrative")
    
    def _identify_scene_characters(self, scene: Dict[str, Any], characters: List[Dict]) -> List[Dict[str, Any]]:
        """Identify and detail characters present in the scene."""
        scene_characters = []
        characters_present = scene.get("characters_present", [])
        
        # If no specific characters listed, use default character assignment
        if not characters_present and characters:
            # Assign first character to scene
            characters_present = [characters[0]["name"]]
        
        for char_name in characters_present:
            # Find character in character list
            character_data = None
            for char in characters:
                if char["name"] == char_name or char_name in char["name"]:
                    character_data = char
                    break
            
            if character_data:
                scene_character = {
                    "character_id": character_data["character_id"],
                    "name": character_data["name"],
                    "role_in_scene": self._determine_character_role_in_scene(scene, character_data),
                    "visual_requirements": character_data["visual_attributes"],
                    "color_palette": character_data["color_palette"],
                    "emotional_state": self._determine_character_emotional_state(scene, character_data),
                    "positioning": self._determine_character_positioning(scene, character_data),
                    "interaction_requirements": self._determine_character_interactions(scene, character_data)
                }
                scene_characters.append(scene_character)
        
        return scene_characters
    
    def _determine_character_role_in_scene(self, scene: Dict[str, Any], character: Dict[str, Any]) -> str:
        """Determine character's role in this specific scene."""
        if character["role_in_story"] == "protagonist":
            return "primary_focus"
        elif scene["emotional_tone"] == "tense":
            return "conflict_participant"
        else:
            return "supporting_presence"
    
    def _determine_character_emotional_state(self, scene: Dict[str, Any], character: Dict[str, Any]) -> str:
        """Determine character's emotional state in scene."""
        scene_emotion = scene["emotional_tone"]
        
        # Map scene emotion to character state
        emotion_map = {
            "tense": "alert",
            "peaceful": "calm",
            "exciting": "energized",
            "melancholic": "contemplative",
            "neutral": "composed"
        }
        
        return emotion_map.get(scene_emotion, "neutral")
    
    def _determine_character_positioning(self, scene: Dict[str, Any], character: Dict[str, Any]) -> Dict[str, str]:
        """Determine character positioning requirements."""
        return {
            "screen_position": "center" if character["role_in_story"] == "protagonist" else "offset",
            "depth_placement": "foreground" if character["role_in_story"] == "protagonist" else "midground",
            "movement_type": "purposeful" if scene["emotional_tone"] == "exciting" else "natural"
        }
    
    def _determine_character_interactions(self, scene: Dict[str, Any], character: Dict[str, Any]) -> List[str]:
        """Determine character interaction requirements."""
        interactions = []
        
        if "looks" in scene.get("key_actions", []):
            interactions.append("eye_contact_with_camera")
        if "moves" in scene.get("key_actions", []):
            interactions.append("environmental_interaction")
        if scene["emotional_tone"] == "tense":
            interactions.append("defensive_posture")
        
        return interactions
    
    def _extract_scene_beats(self, scene: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract key beats within the scene."""
        beats = []
        duration = scene["duration_seconds"]
        key_actions = scene.get("key_actions", [])
        
        # Generate beats based on scene content
        if len(key_actions) > 0:
            beat_duration = duration / max(len(key_actions), 1)
            
            for i, action in enumerate(key_actions):
                beat = {
                    "beat_id": f"{scene['scene_id']}_beat_{i+1:02d}",
                    "action": action,
                    "timing": i * beat_duration,
                    "duration": beat_duration,
                    "intensity": self._determine_beat_intensity(action, scene["emotional_tone"]),
                    "visual_focus": self._determine_beat_visual_focus(action)
                }
                beats.append(beat)
        else:
            # Default single beat for scene
            beats.append({
                "beat_id": f"{scene['scene_id']}_beat_01",
                "action": "scene_establishment",
                "timing": 0,
                "duration": duration,
                "intensity": "medium",
                "visual_focus": "environment"
            })
        
        return beats
    
    def _determine_beat_intensity(self, action: str, emotional_tone: str) -> str:
        """Determine intensity of a beat."""
        high_intensity_actions = ["runs", "fights", "shouts"]
        low_intensity_actions = ["sits", "looks", "thinks"]
        
        if any(intense_action in action.lower() for intense_action in high_intensity_actions):
            return "high"
        elif any(calm_action in action.lower() for calm_action in low_intensity_actions):
            return "low"
        elif emotional_tone in ["tense", "exciting"]:
            return "high"
        else:
            return "medium"
    
    def _determine_beat_visual_focus(self, action: str) -> str:
        """Determine visual focus for a beat."""
        if "looks" in action.lower():
            return "character_face"
        elif "moves" in action.lower():
            return "character_body"
        elif "environment" in action.lower():
            return "environment"
        else:
            return "character_general"
    
    def _calculate_beat_timing(self, beats: List[Dict], total_duration: int) -> Dict[str, Any]:
        """Calculate precise timing for beats."""
        if not beats:
            return {"total_duration": total_duration, "beat_count": 0}
        
        # Ensure beats fit within total duration
        total_beat_duration = sum(beat["duration"] for beat in beats)
        
        if total_beat_duration > total_duration:
            # Scale down beat durations proportionally
            scale_factor = total_duration / total_beat_duration
            for beat in beats:
                beat["duration"] *= scale_factor
                beat["timing"] *= scale_factor
        
        return {
            "total_duration": total_duration,
            "beat_count": len(beats),
            "average_beat_duration": total_duration / len(beats),
            "timing_precision": "frame_accurate"
        }
    
    def _analyze_dramatic_structure(self, beats: List[Dict]) -> Dict[str, Any]:
        """Analyze dramatic structure of scene beats."""
        if not beats:
            return {"structure_type": "static", "arc": "flat"}
        
        intensities = [beat["intensity"] for beat in beats]
        intensity_values = {"low": 1, "medium": 2, "high": 3}
        intensity_scores = [intensity_values.get(i, 2) for i in intensities]
        
        # Determine structure pattern
        if len(intensity_scores) == 1:
            structure_type = "static"
        elif intensity_scores[-1] > intensity_scores[0]:
            structure_type = "rising"
        elif intensity_scores[-1] < intensity_scores[0]:
            structure_type = "falling"
        else:
            structure_type = "varied"
        
        return {
            "structure_type": structure_type,
            "arc": self._determine_dramatic_arc(intensity_scores),
            "peak_intensity": max(intensity_scores),
            "intensity_range": max(intensity_scores) - min(intensity_scores)
        }
    
    def _determine_dramatic_arc(self, intensity_scores: List[int]) -> str:
        """Determine dramatic arc pattern."""
        if len(intensity_scores) < 2:
            return "flat"
        
        avg_first_half = sum(intensity_scores[:len(intensity_scores)//2]) / (len(intensity_scores)//2)
        avg_second_half = sum(intensity_scores[len(intensity_scores)//2:]) / (len(intensity_scores) - len(intensity_scores)//2)
        
        if avg_second_half > avg_first_half + 0.5:
            return "ascending"
        elif avg_first_half > avg_second_half + 0.5:
            return "descending"
        else:
            return "balanced"
    
    def _generate_composition_requirements(self, scene: Dict[str, Any], lighting_setup: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visual composition requirements."""
        emotional_tone = scene["emotional_tone"]
        location = scene.get("location", "unspecified")
        
        # Determine composition style based on emotion and content
        if emotional_tone == "tense":
            composition_style = "dynamic_asymmetrical"
            rule_of_thirds = "strong"
        elif emotional_tone == "peaceful":
            composition_style = "balanced_symmetrical"
            rule_of_thirds = "subtle"
        else:
            composition_style = "classical_balanced"
            rule_of_thirds = "standard"
        
        return {
            "style": composition_style,
            "rule_of_thirds": rule_of_thirds,
            "leading_lines": self._determine_leading_lines(location),
            "depth_of_field": self._determine_depth_of_field(scene),
            "framing": self._determine_framing_requirements(scene),
            "visual_weight_distribution": self._determine_visual_weight(emotional_tone),
            "focal_point": self._determine_focal_point(scene)
        }
    
    def _determine_leading_lines(self, location: str) -> List[str]:
        """Determine leading lines based on location."""
        lines_map = {
            "urban": ["building_edges", "street_lines", "horizon"],
            "interior": ["wall_lines", "furniture_edges", "ceiling_lines"],
            "nature": ["tree_lines", "horizon", "path_lines"],
            "exterior": ["horizon", "architectural_lines", "natural_lines"]
        }
        return lines_map.get(location, ["horizon", "natural_lines"])
    
    def _determine_depth_of_field(self, scene: Dict[str, Any]) -> Dict[str, str]:
        """Determine depth of field requirements."""
        emotional_tone = scene["emotional_tone"]
        
        if emotional_tone in ["tense", "exciting"]:
            return {"type": "shallow", "focus_point": "character", "background": "soft_blur"}
        elif emotional_tone == "peaceful":
            return {"type": "deep", "focus_point": "environment", "background": "sharp"}
        else:
            return {"type": "medium", "focus_point": "balanced", "background": "moderate_blur"}
    
    def _determine_framing_requirements(self, scene: Dict[str, Any]) -> Dict[str, str]:
        """Determine framing requirements."""
        return {
            "aspect_ratio": "16:9",
            "safe_area": "standard",
            "headroom": "appropriate",
            "lead_room": "directional" if "moves" in scene.get("key_actions", []) else "balanced"
        }
    
    def _determine_visual_weight(self, emotional_tone: str) -> str:
        """Determine visual weight distribution."""
        weight_map = {
            "tense": "asymmetrical_heavy",
            "peaceful": "symmetrical_balanced",
            "exciting": "dynamic_varied",
            "melancholic": "bottom_heavy",
            "neutral": "center_weighted"
        }
        return weight_map.get(emotional_tone, "center_weighted")
    
    def _determine_focal_point(self, scene: Dict[str, Any]) -> str:
        """Determine primary focal point."""
        if scene.get("characters_present"):
            return "character"
        elif "environment" in scene.get("key_actions", []):
            return "environment"
        else:
            return "center_composition"
    
    def _generate_scene_color_palette(self, scene: Dict[str, Any], style_anchors: Dict[str, Any]) -> Dict[str, Any]:
        """Generate scene-specific color palette."""
        emotional_tone = scene["emotional_tone"]
        time_of_day = scene.get("time_of_day", "unspecified")
        
        # Base palette from DOCUMENT 4 — STYLE & COHERENCE
        base_colors = {
            "warm_oranges": "#FF8C42",
            "deep_blues": "#1E3A8A", 
            "neutral_grays": "#6B7280",
            "soft_browns": "#8B4513",
            "muted_greens": "#6B8E23"
        }
        
        # Select dominant color based on emotion and time
        if emotional_tone == "tense":
            dominant = base_colors["deep_blues"]
        elif emotional_tone == "peaceful":
            dominant = base_colors["muted_greens"]
        elif time_of_day == "evening":
            dominant = base_colors["warm_oranges"]
        else:
            dominant = base_colors["neutral_grays"]
        
        return {
            "dominant_hue": dominant,
            "secondary_hue": base_colors["soft_browns"],
            "accent_hue": base_colors["warm_oranges"],
            "neutral_base": base_colors["neutral_grays"],
            "saturation_level": self._determine_saturation_level(emotional_tone),
            "contrast_level": self._determine_contrast_level(emotional_tone),
            "temperature_bias": self._determine_temperature_bias(time_of_day)
        }
    
    def _determine_saturation_level(self, emotional_tone: str) -> str:
        """Determine color saturation level."""
        saturation_map = {
            "tense": "high",
            "exciting": "high", 
            "peaceful": "medium",
            "melancholic": "low",
            "neutral": "medium"
        }
        return saturation_map.get(emotional_tone, "medium")
    
    def _determine_contrast_level(self, emotional_tone: str) -> str:
        """Determine contrast level."""
        contrast_map = {
            "tense": "high",
            "exciting": "high",
            "peaceful": "low",
            "melancholic": "low", 
            "neutral": "medium"
        }
        return contrast_map.get(emotional_tone, "medium")
    
    def _determine_temperature_bias(self, time_of_day: str) -> str:
        """Determine color temperature bias."""
        temp_map = {
            "morning": "warm",
            "afternoon": "neutral",
            "evening": "warm",
            "night": "cool"
        }
        return temp_map.get(time_of_day, "neutral")
    
    def _generate_visual_style_requirements(self, scene: Dict[str, Any], style_anchors: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visual style requirements following DOCUMENT 4."""
        return {
            "aesthetic": style_anchors["aesthetic"],
            "contrast": style_anchors["contrast"],
            "texture_style": style_anchors["texture_style"],
            "rendering_quality": "high_detail",
            "artistic_treatment": self._determine_artistic_treatment(scene),
            "post_processing": self._determine_post_processing(scene),
            "style_consistency": "strict"
        }
    
    def _determine_artistic_treatment(self, scene: Dict[str, Any]) -> str:
        """Determine artistic treatment approach."""
        emotional_tone = scene["emotional_tone"]
        
        treatment_map = {
            "tense": "dramatic_enhancement",
            "peaceful": "natural_beauty",
            "exciting": "dynamic_energy",
            "melancholic": "subtle_desaturation",
            "neutral": "balanced_realism"
        }
        return treatment_map.get(emotional_tone, "balanced_realism")
    
    def _determine_post_processing(self, scene: Dict[str, Any]) -> List[str]:
        """Determine post-processing requirements."""
        emotional_tone = scene["emotional_tone"]
        processing = ["color_grading", "contrast_adjustment"]
        
        if emotional_tone == "tense":
            processing.extend(["shadow_enhancement", "highlight_control"])
        elif emotional_tone == "peaceful":
            processing.extend(["soft_glow", "gentle_vignette"])
        elif emotional_tone == "melancholic":
            processing.extend(["desaturation", "soft_contrast"])
        
        return processing
    
    def _generate_character_continuity(self, scene_characters: List[Dict]) -> Dict[str, Any]:
        """Generate character continuity requirements."""
        return {
            "visual_consistency": "strict",
            "clothing_continuity": "maintained",
            "lighting_on_characters": "consistent",
            "character_positioning": "logical_progression"
        }
    
    def _generate_lighting_continuity(self, lighting_setup: Dict[str, Any]) -> Dict[str, Any]:
        """Generate lighting continuity requirements."""
        return {
            "direction_consistency": lighting_setup["primary_light"]["direction"],
            "temperature_consistency": lighting_setup["primary_light"]["temperature"],
            "quality_consistency": lighting_setup["primary_light"]["quality"],
            "shadow_consistency": lighting_setup["shadows"]["type"]
        }
    
    def _generate_color_continuity(self, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Generate color continuity requirements."""
        return {
            "palette_stability": "maintained",
            "saturation_consistency": "controlled",
            "temperature_progression": "logical",
            "contrast_stability": "maintained"
        }
    
    def _generate_global_cinematic_rules(self, detailed_scenes: List[Dict]) -> Dict[str, Any]:
        """Generate global cinematic rules across all scenes."""
        return {
            "visual_consistency": {
                "style_anchor": "cinematic_realism",
                "color_harmony": "controlled_palette",
                "lighting_logic": "physically_motivated",
                "perspective_accuracy": "maintained"
            },
            "narrative_flow": {
                "scene_transitions": "motivated",
                "emotional_progression": "logical",
                "character_arcs": "consistent",
                "pacing_rhythm": "cinematic"
            },
            "technical_standards": {
                "aspect_ratio": "16:9",
                "resolution": "1920x1080",
                "frame_rate": "24fps",
                "color_space": "rec709"
            }
        }
    
    def _generate_continuity_requirements(self, detailed_scenes: List[Dict]) -> Dict[str, Any]:
        """Generate continuity requirements across scenes."""
        return {
            "lighting_continuity": self._analyze_lighting_continuity(detailed_scenes),
            "color_continuity": self._analyze_color_continuity(detailed_scenes),
            "character_continuity": self._analyze_character_continuity(detailed_scenes),
            "environmental_continuity": self._analyze_environmental_continuity(detailed_scenes)
        }
    
    def _analyze_lighting_continuity(self, scenes: List[Dict]) -> Dict[str, Any]:
        """Analyze lighting continuity across scenes."""
        lighting_directions = [scene["lighting"]["primary_light"]["direction"] for scene in scenes]
        lighting_temperatures = [scene["lighting"]["primary_light"]["temperature"] for scene in scenes]
        
        return {
            "direction_consistency": len(set(lighting_directions)) == 1,
            "temperature_progression": lighting_temperatures,
            "continuity_score": self._calculate_lighting_consistency(scenes)
        }
    
    def _analyze_color_continuity(self, scenes: List[Dict]) -> Dict[str, Any]:
        """Analyze color continuity across scenes."""
        dominant_hues = [scene["color_palette"]["dominant_hue"] for scene in scenes]
        
        return {
            "palette_consistency": len(set(dominant_hues)) <= 2,  # Allow some variation
            "color_progression": dominant_hues,
            "harmony_score": self._calculate_color_harmony(scenes)
        }
    
    def _analyze_character_continuity(self, scenes: List[Dict]) -> Dict[str, Any]:
        """Analyze character continuity across scenes."""
        all_characters = set()
        for scene in scenes:
            for char in scene.get("characters", []):
                all_characters.add(char["character_id"])
        
        return {
            "total_unique_characters": len(all_characters),
            "character_consistency": "maintained",
            "visual_stability": "required"
        }
    
    def _analyze_environmental_continuity(self, scenes: List[Dict]) -> Dict[str, Any]:
        """Analyze environmental continuity across scenes."""
        locations = [scene["environment"]["type"] for scene in scenes]
        times = [scene["environment"]["time_of_day"] for scene in scenes]
        
        return {
            "location_variety": len(set(locations)),
            "time_progression": times,
            "environmental_logic": "maintained"
        }
    
    def _generate_technical_specifications(self, detailed_scenes: List[Dict]) -> Dict[str, Any]:
        """Generate technical specifications for the breakdown."""
        total_duration = sum(scene["technical_specs"]["duration_seconds"] for scene in detailed_scenes)
        
        return {
            "total_runtime_seconds": total_duration,
            "total_scenes": len(detailed_scenes),
            "average_scene_duration": total_duration / len(detailed_scenes),
            "aspect_ratio": "16:9",
            "resolution": "1920x1080",
            "frame_rate": "24fps",
            "color_depth": "10-bit",
            "color_space": "rec709"
        }
    
    def _calculate_average_complexity(self, scenes: List[Dict]) -> float:
        """Calculate average scene complexity."""
        complexity_scores = []
        
        for scene in scenes:
            score = 1.0
            score += len(scene.get("characters", [])) * 0.3
            score += len(scene.get("key_beats", [])) * 0.2
            score += 0.5 if scene["environment"]["type"] != "unspecified" else 0
            score += 0.3 if scene["scene_purpose"]["primary"] in ["conflict", "action"] else 0
            
            complexity_scores.append(min(5.0, score))
        
        return sum(complexity_scores) / len(complexity_scores) if complexity_scores else 1.0
    
    def _calculate_lighting_consistency(self, scenes: List[Dict]) -> float:
        """Calculate lighting consistency score."""
        if len(scenes) <= 1:
            return 5.0
        
        directions = [scene["lighting"]["primary_light"]["direction"] for scene in scenes]
        temperatures = [scene["lighting"]["primary_light"]["temperature"] for scene in scenes]
        
        direction_consistency = 5.0 if len(set(directions)) == 1 else 3.0
        temperature_consistency = 5.0 if len(set(temperatures)) <= 2 else 3.0
        
        return (direction_consistency + temperature_consistency) / 2
    
    def _calculate_color_harmony(self, scenes: List[Dict]) -> float:
        """Calculate color harmony score."""
        if len(scenes) <= 1:
            return 5.0
        
        dominant_hues = [scene["color_palette"]["dominant_hue"] for scene in scenes]
        unique_hues = len(set(dominant_hues))
        
        # Score based on color variety (some variety is good, too much is bad)
        if unique_hues == 1:
            return 4.0  # Consistent but potentially monotonous
        elif unique_hues <= 3:
            return 5.0  # Good variety with harmony
        else:
            return 3.0  # Too much variety
    
    def _map_scene_to_emotional_arc(self, scene: Dict[str, Any], emotional_arcs: List[Dict]) -> Dict[str, Any]:
        """Map scene to emotional arc progression."""
        if not emotional_arcs:
            return {"arc_id": "none", "position": "neutral"}
        
        primary_arc = emotional_arcs[0]
        scene_number = scene["scene_number"]
        
        # Map scene position to arc progression
        if scene_number == 1:
            position = "start"
            emotion = primary_arc["start_emotion"]
        elif scene_number == 2:
            position = "middle"
            emotion = primary_arc["peak_emotion"]
        else:
            position = "end"
            emotion = primary_arc["end_emotion"]
        
        return {
            "arc_id": primary_arc["arc_id"],
            "position": position,
            "target_emotion": emotion,
            "progression_stage": f"{position}_{emotion}"
        }
    
    def _determine_narrative_function(self, scene: Dict[str, Any], scene_purpose: Dict[str, Any]) -> str:
        """Determine narrative function of the scene."""
        primary_purpose = scene_purpose["primary"]
        scene_number = scene["scene_number"]
        
        if scene_number == 1:
            return "exposition_establishment"
        elif scene_number == 2:
            return "development_complication"
        elif scene_number == 3:
            return "resolution_conclusion"
        else:
            return f"narrative_{primary_purpose}"
    
    def _analyze_character_interactions(self, scene: Dict[str, Any], scene_characters: List[Dict]) -> List[Dict[str, Any]]:
        """Analyze character interactions within the scene."""
        interactions = []
        
        if len(scene_characters) > 1:
            # Multi-character scene
            for i, char1 in enumerate(scene_characters):
                for char2 in scene_characters[i+1:]:
                    interaction = {
                        "characters": [char1["character_id"], char2["character_id"]],
                        "interaction_type": self._determine_interaction_type(scene, char1, char2),
                        "visual_relationship": self._determine_visual_relationship(char1, char2),
                        "emotional_dynamic": self._determine_emotional_dynamic(scene, char1, char2)
                    }
                    interactions.append(interaction)
        elif len(scene_characters) == 1:
            # Single character scene
            char = scene_characters[0]
            interaction = {
                "characters": [char["character_id"]],
                "interaction_type": "environmental",
                "visual_relationship": "character_to_environment",
                "emotional_dynamic": char["emotional_state"]
            }
            interactions.append(interaction)
        
        return interactions
    
    def _determine_interaction_type(self, scene: Dict[str, Any], char1: Dict, char2: Dict) -> str:
        """Determine type of interaction between characters."""
        if scene["emotional_tone"] == "tense":
            return "confrontational"
        elif scene["emotional_tone"] == "peaceful":
            return "collaborative"
        else:
            return "conversational"
    
    def _determine_visual_relationship(self, char1: Dict, char2: Dict) -> str:
        """Determine visual relationship between characters."""
        if char1.get("role_in_scene") == "primary_focus":
            return "foreground_background"
        else:
            return "balanced_composition"
    
    def _determine_emotional_dynamic(self, scene: Dict[str, Any], char1: Dict, char2: Dict) -> str:
        """Determine emotional dynamic between characters."""
        return f"shared_{scene['emotional_tone']}"
    
    def _determine_character_emotions(self, scene: Dict[str, Any], scene_characters: List[Dict]) -> Dict[str, str]:
        """Determine emotional states of characters in scene."""
        emotions = {}
        
        for char in scene_characters:
            emotions[char["character_id"]] = char["emotional_state"]
        
        return emotions
    
    def _update_project_with_breakdown(self, project_path: Path, breakdown_metadata: Dict[str, Any]) -> None:
        """Update project.json with scene breakdown results."""
        project_file = project_path / "project.json"
        
        with open(project_file, 'r') as f:
            project_data = json.load(f)
        
        # Update project with breakdown metadata
        project_data["scene_breakdown_metadata"] = {
            "breakdown_id": breakdown_metadata["scene_breakdown_id"],
            "processed_at": breakdown_metadata["created_at"],
            "total_scenes_processed": breakdown_metadata["processing_metadata"]["total_scenes_processed"],
            "average_complexity": breakdown_metadata["processing_metadata"]["average_scene_complexity"],
            "lighting_consistency": breakdown_metadata["processing_metadata"]["lighting_consistency_score"],
            "color_harmony": breakdown_metadata["processing_metadata"]["color_harmony_score"]
        }
        
        # Update generation status
        project_data["generation_status"]["scene_breakdown"] = "done"
        project_data["status"]["current_phase"] = "scene_breakdown_processed"
        project_data["status"]["last_updated"] = breakdown_metadata["created_at"]
        
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)
    
    def _generate_location_details(self, scene: Dict[str, Any], environment_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate detailed location information."""
        location_type = environment_analysis["type"]
        time_of_day = environment_analysis["time_of_day"]
        
        # Generate location-specific details
        if location_type == "urban":
            details = {
                "setting": "city_environment",
                "architecture": "modern_buildings",
                "scale": "metropolitan",
                "density": "high",
                "key_elements": ["buildings", "streets", "skyline", "urban_lighting"]
            }
        elif location_type == "interior":
            details = {
                "setting": "indoor_space",
                "architecture": "residential_commercial",
                "scale": "intimate",
                "density": "controlled",
                "key_elements": ["walls", "furniture", "windows", "interior_lighting"]
            }
        elif location_type == "nature":
            details = {
                "setting": "natural_environment",
                "architecture": "organic_forms",
                "scale": "expansive",
                "density": "varied",
                "key_elements": ["vegetation", "terrain", "sky", "natural_lighting"]
            }
        else:
            details = {
                "setting": "exterior_space",
                "architecture": "mixed",
                "scale": "medium",
                "density": "moderate",
                "key_elements": ["horizon", "structures", "open_space", "ambient_lighting"]
            }
        
        # Add time-specific modifications
        if time_of_day == "night":
            details["visibility"] = "limited"
            details["lighting_sources"] = ["artificial", "ambient"]
        elif time_of_day == "evening":
            details["visibility"] = "golden_hour"
            details["lighting_sources"] = ["natural", "warm"]
        else:
            details["visibility"] = "clear"
            details["lighting_sources"] = ["natural", "daylight"]
        
        return details
    
    def _generate_atmospheric_requirements(self, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Generate atmospheric requirements for the scene."""
        emotional_tone = scene["emotional_tone"]
        location = scene.get("location", "unspecified")
        time_of_day = scene.get("time_of_day", "unspecified")
        
        # Base atmospheric requirements
        atmosphere = {
            "mood": emotional_tone,
            "visibility": "clear",
            "air_quality": "clean",
            "atmospheric_effects": []
        }
        
        # Add emotional atmosphere effects
        if emotional_tone == "tense":
            atmosphere["atmospheric_effects"].extend(["dramatic_shadows", "high_contrast"])
        elif emotional_tone == "peaceful":
            atmosphere["atmospheric_effects"].extend(["soft_light", "gentle_haze"])
        elif emotional_tone == "melancholic":
            atmosphere["atmospheric_effects"].extend(["muted_tones", "soft_focus"])
        
        # Add location-specific effects
        if location == "urban":
            atmosphere["atmospheric_effects"].append("urban_haze")
        elif location == "nature":
            atmosphere["atmospheric_effects"].append("natural_depth")
        
        # Add time-specific effects
        if time_of_day == "evening":
            atmosphere["atmospheric_effects"].append("golden_hour_glow")
        elif time_of_day == "night":
            atmosphere["atmospheric_effects"].append("night_atmosphere")
        
        return atmosphere
    
    def _determine_lighting_motivation(self, scene: Dict[str, Any], lighting_setup: Dict[str, Any]) -> str:
        """Determine lighting motivation for the scene."""
        time_of_day = scene.get("time_of_day", "unspecified")
        location = scene.get("location", "unspecified")
        emotional_tone = scene["emotional_tone"]
        
        if time_of_day != "unspecified":
            return f"Natural {time_of_day} light in {location} environment"
        elif emotional_tone != "neutral":
            return f"Cinematic lighting to enhance {emotional_tone} mood"
        else:
            return "Standard cinematic lighting setup"
    
    def _generate_shadow_requirements(self, lighting_setup: Dict[str, Any]) -> Dict[str, Any]:
        """Generate shadow requirements based on lighting setup."""
        primary_light = lighting_setup["primary_light"]
        shadows = lighting_setup["shadows"]
        
        return {
            "shadow_type": shadows["type"],
            "shadow_direction": shadows["direction"],
            "shadow_intensity": shadows["intensity"],
            "shadow_color": shadows["color_temperature"],
            "shadow_softness": "soft" if shadows["type"] == "soft" else "sharp",
            "cast_shadows": True,
            "ambient_occlusion": "subtle"
        }