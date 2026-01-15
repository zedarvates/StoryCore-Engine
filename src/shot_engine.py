"""
Shot Engine - Stage 3 of 10-Stage Multimodal Pipeline
Transforms scene breakdown into professional shot lists with cinematic grammar.

Follows DOCUMENT 24 — GLOBAL PIPELINE ARCHI V2 and DOCUMENT 3 — PROMPT ENGINEERING GUI V2
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple


class ShotEngine:
    """Handles shot planning and cinematic grammar generation."""
    
    def __init__(self):
        self.schema_version = "1.0"
        
        # Shot types from DOCUMENT 3 — PROMPT ENGINEERING
        self.shot_types = {
            "ELS": {
                "name": "Extreme Long Shot",
                "purpose": "establish_environment",
                "subject_size": "very_small",
                "context": "maximum",
                "typical_duration": 3.0
            },
            "LS": {
                "name": "Long Shot", 
                "purpose": "establish_scene",
                "subject_size": "small",
                "context": "high",
                "typical_duration": 2.5
            },
            "FS": {
                "name": "Full Shot",
                "purpose": "show_character_full",
                "subject_size": "medium",
                "context": "medium",
                "typical_duration": 2.0
            },
            "MCU": {
                "name": "Medium Close-Up",
                "purpose": "character_interaction",
                "subject_size": "large",
                "context": "low",
                "typical_duration": 1.5
            },
            "CU": {
                "name": "Close-Up",
                "purpose": "emotion_detail",
                "subject_size": "very_large",
                "context": "minimal",
                "typical_duration": 1.0
            },
            "ECU": {
                "name": "Extreme Close-Up",
                "purpose": "dramatic_detail",
                "subject_size": "extreme",
                "context": "none",
                "typical_duration": 0.5
            }
        }
        
        # Camera angles from DOCUMENT 3
        self.camera_angles = {
            "eye-level": {
                "description": "Natural perspective",
                "emotional_impact": "neutral",
                "power_dynamic": "equal",
                "usage": "standard"
            },
            "low-angle": {
                "description": "Camera below subject",
                "emotional_impact": "empowering",
                "power_dynamic": "subject_dominant",
                "usage": "heroic_dramatic"
            },
            "high-angle": {
                "description": "Camera above subject", 
                "emotional_impact": "diminishing",
                "power_dynamic": "subject_vulnerable",
                "usage": "vulnerability_overview"
            }
        }
        
        # Camera movements from DOCUMENT 3
        self.camera_movements = {
            "static": {
                "description": "No camera movement",
                "energy_level": "calm",
                "complexity": "simple",
                "usage": "contemplative_stable"
            },
            "dolly-in": {
                "description": "Camera moves toward subject",
                "energy_level": "building",
                "complexity": "medium",
                "usage": "focus_intensify"
            },
            "dolly-out": {
                "description": "Camera moves away from subject",
                "energy_level": "releasing",
                "complexity": "medium", 
                "usage": "reveal_distance"
            },
            "pan-left": {
                "description": "Camera rotates left",
                "energy_level": "moderate",
                "complexity": "simple",
                "usage": "follow_reveal"
            },
            "pan-right": {
                "description": "Camera rotates right",
                "energy_level": "moderate",
                "complexity": "simple",
                "usage": "follow_reveal"
            },
            "tilt-up": {
                "description": "Camera tilts upward",
                "energy_level": "rising",
                "complexity": "simple",
                "usage": "reveal_scale"
            },
            "tilt-down": {
                "description": "Camera tilts downward",
                "energy_level": "descending",
                "complexity": "simple",
                "usage": "focus_detail"
            }
        }
        
        # Lens choices for cinematic control
        self.lens_choices = {
            "wide": {
                "focal_length": "14-35mm",
                "perspective": "expansive",
                "distortion": "minimal_barrel",
                "usage": "environment_context"
            },
            "normal": {
                "focal_length": "35-85mm",
                "perspective": "natural",
                "distortion": "none",
                "usage": "standard_narrative"
            },
            "telephoto": {
                "focal_length": "85-200mm",
                "perspective": "compressed",
                "distortion": "none",
                "usage": "isolation_intimacy"
            }
        }
    
    def process_shot_planning(self, project_path: Path) -> Dict[str, Any]:
        """
        Process scene breakdown into detailed shot lists.
        
        Args:
            project_path: Path to project directory
            
        Returns:
            Dict with shot planning metadata
        """
        # Load scene breakdown metadata
        scene_breakdown = self._load_scene_breakdown(project_path)
        if not scene_breakdown:
            raise FileNotFoundError("Scene breakdown not found. Run 'storycore scene-breakdown' first.")
        
        # Extract detailed scenes
        detailed_scenes = scene_breakdown["detailed_scenes"]
        
        # Process each scene into shot lists
        shot_lists = []
        shot_id_counter = 1
        
        for scene in detailed_scenes:
            scene_shots = self._create_scene_shot_list(scene, shot_id_counter)
            shot_lists.extend(scene_shots)
            shot_id_counter += len(scene_shots)
        
        # Create shot planning metadata
        shot_planning_metadata = {
            "shot_planning_id": f"shots_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "schema_version": self.schema_version,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "source_breakdown_id": scene_breakdown["scene_breakdown_id"],
            "shot_lists": shot_lists,
            "cinematic_grammar": self._generate_cinematic_grammar(shot_lists),
            "camera_specifications": self._generate_camera_specifications(shot_lists),
            "shot_transitions": self._plan_shot_transitions(shot_lists),
            "technical_requirements": self._generate_technical_requirements(shot_lists),
            "processing_metadata": {
                "total_shots": len(shot_lists),
                "average_shot_duration": self._calculate_average_shot_duration(shot_lists),
                "shot_variety_score": self._calculate_shot_variety(shot_lists),
                "camera_complexity_score": self._calculate_camera_complexity(shot_lists)
            }
        }
        
        # Save shot planning metadata
        shots_file = project_path / "shot_planning.json"
        with open(shots_file, 'w') as f:
            json.dump(shot_planning_metadata, f, indent=2)
        
        # Update project.json with shot planning reference
        self._update_project_with_shots(project_path, shot_planning_metadata)
        
        return shot_planning_metadata
    
    def _load_scene_breakdown(self, project_path: Path) -> Dict[str, Any]:
        """Load scene breakdown metadata from project."""
        breakdown_file = project_path / "scene_breakdown.json"
        if not breakdown_file.exists():
            return {}
        
        with open(breakdown_file, 'r') as f:
            return json.load(f)
    
    def _create_scene_shot_list(self, scene: Dict[str, Any], start_shot_id: int) -> List[Dict[str, Any]]:
        """Create detailed shot list for a scene."""
        scene_shots = []
        scene_purpose = scene["scene_purpose"]["primary"]
        scene_duration = scene["technical_specs"]["duration_seconds"]
        scene_beats = scene.get("key_beats", [])
        
        # Determine shot strategy based on scene purpose
        shot_strategy = self._determine_shot_strategy(scene)
        
        # Generate shots based on strategy
        if shot_strategy["type"] == "three_shot_standard":
            shots = self._create_three_shot_sequence(scene, start_shot_id, shot_strategy)
        elif shot_strategy["type"] == "establishing_heavy":
            shots = self._create_establishing_sequence(scene, start_shot_id, shot_strategy)
        elif shot_strategy["type"] == "action_dynamic":
            shots = self._create_action_sequence(scene, start_shot_id, shot_strategy)
        else:
            shots = self._create_default_sequence(scene, start_shot_id, shot_strategy)
        
        # Apply timing and transitions
        shots = self._apply_shot_timing(shots, scene_duration)
        shots = self._apply_shot_transitions(shots, scene)
        
        return shots
    
    def _determine_shot_strategy(self, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Determine shot strategy based on scene analysis."""
        scene_purpose = scene["scene_purpose"]["primary"]
        emotional_tone = scene.get("emotional_arc", {}).get("target_emotion", "neutral")
        character_count = len(scene.get("characters", []))
        beat_count = len(scene.get("key_beats", []))
        
        # Determine strategy type
        if scene_purpose == "establishing":
            strategy_type = "establishing_heavy"
            shot_count = 4
        elif scene_purpose == "action" or beat_count > 2:
            strategy_type = "action_dynamic"
            shot_count = 5
        elif emotional_tone in ["tense", "exciting"]:
            strategy_type = "dynamic_coverage"
            shot_count = 4
        else:
            strategy_type = "three_shot_standard"
            shot_count = 3
        
        return {
            "type": strategy_type,
            "shot_count": shot_count,
            "pacing": self._determine_pacing_style(scene),
            "coverage_style": self._determine_coverage_style(scene),
            "movement_style": self._determine_movement_style(scene)
        }
    
    def _determine_pacing_style(self, scene: Dict[str, Any]) -> str:
        """Determine pacing style for shots."""
        pacing_req = scene["scene_purpose"].get("pacing_requirements", {})
        rhythm = pacing_req.get("rhythm", "medium")
        
        pacing_map = {
            "slow": "contemplative",
            "medium": "standard",
            "fast": "dynamic"
        }
        
        return pacing_map.get(rhythm, "standard")
    
    def _determine_coverage_style(self, scene: Dict[str, Any]) -> str:
        """Determine coverage style for shots."""
        character_count = len(scene.get("characters", []))
        scene_purpose = scene["scene_purpose"]["primary"]
        
        if character_count > 1:
            return "multi_character"
        elif scene_purpose == "establishing":
            return "environmental"
        else:
            return "single_subject"
    
    def _determine_movement_style(self, scene: Dict[str, Any]) -> str:
        """Determine camera movement style."""
        emotional_tone = scene.get("emotional_arc", {}).get("target_emotion", "neutral")
        
        movement_map = {
            "tense": "dynamic",
            "exciting": "energetic", 
            "peaceful": "gentle",
            "melancholic": "slow",
            "calm": "minimal"
        }
        
        return movement_map.get(emotional_tone, "standard")
    
    def _create_three_shot_sequence(self, scene: Dict[str, Any], start_id: int, strategy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create standard three-shot sequence: establishing, medium, close."""
        shots = []
        
        # Shot 1: Establishing
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id:03d}",
            scene_id=scene["scene_id"],
            shot_number=1,
            shot_type="LS",
            purpose="establishing",
            angle="eye-level",
            movement="static",
            lens="wide",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 2: Medium/Action
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 1:03d}",
            scene_id=scene["scene_id"],
            shot_number=2,
            shot_type="MCU",
            purpose="action",
            angle=self._select_angle_for_emotion(scene),
            movement=self._select_movement_for_beat(scene, "action"),
            lens="normal",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 3: Close/Emotional
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 2:03d}",
            scene_id=scene["scene_id"],
            shot_number=3,
            shot_type="CU",
            purpose="emotional",
            angle="eye-level",
            movement="static",
            lens="telephoto",
            scene=scene,
            strategy=strategy
        ))
        
        return shots
    
    def _create_establishing_sequence(self, scene: Dict[str, Any], start_id: int, strategy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create establishing-heavy sequence for scene setup."""
        shots = []
        
        # Shot 1: Extreme establishing
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id:03d}",
            scene_id=scene["scene_id"],
            shot_number=1,
            shot_type="ELS",
            purpose="wide_establishing",
            angle="eye-level",
            movement="static",
            lens="wide",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 2: Medium establishing
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 1:03d}",
            scene_id=scene["scene_id"],
            shot_number=2,
            shot_type="LS",
            purpose="scene_establishing",
            angle="eye-level",
            movement="pan-right",
            lens="wide",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 3: Character introduction
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 2:03d}",
            scene_id=scene["scene_id"],
            shot_number=3,
            shot_type="FS",
            purpose="character_introduction",
            angle="eye-level",
            movement="dolly-in",
            lens="normal",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 4: Emotional focus
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 3:03d}",
            scene_id=scene["scene_id"],
            shot_number=4,
            shot_type="MCU",
            purpose="emotional_focus",
            angle=self._select_angle_for_emotion(scene),
            movement="static",
            lens="normal",
            scene=scene,
            strategy=strategy
        ))
        
        return shots
    
    def _create_action_sequence(self, scene: Dict[str, Any], start_id: int, strategy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create dynamic action sequence."""
        shots = []
        
        # Shot 1: Wide action setup
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id:03d}",
            scene_id=scene["scene_id"],
            shot_number=1,
            shot_type="LS",
            purpose="action_setup",
            angle="eye-level",
            movement="static",
            lens="wide",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 2: Action initiation
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 1:03d}",
            scene_id=scene["scene_id"],
            shot_number=2,
            shot_type="MCU",
            purpose="action_initiation",
            angle="low-angle",
            movement="dolly-in",
            lens="normal",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 3: Action peak
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 2:03d}",
            scene_id=scene["scene_id"],
            shot_number=3,
            shot_type="CU",
            purpose="action_peak",
            angle="eye-level",
            movement="static",
            lens="telephoto",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 4: Action reaction
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 3:03d}",
            scene_id=scene["scene_id"],
            shot_number=4,
            shot_type="MCU",
            purpose="action_reaction",
            angle="high-angle",
            movement="dolly-out",
            lens="normal",
            scene=scene,
            strategy=strategy
        ))
        
        # Shot 5: Action resolution
        shots.append(self._create_shot(
            shot_id=f"shot_{start_id + 4:03d}",
            scene_id=scene["scene_id"],
            shot_number=5,
            shot_type="FS",
            purpose="action_resolution",
            angle="eye-level",
            movement="static",
            lens="normal",
            scene=scene,
            strategy=strategy
        ))
        
        return shots
    
    def _create_default_sequence(self, scene: Dict[str, Any], start_id: int, strategy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create default shot sequence."""
        return self._create_three_shot_sequence(scene, start_id, strategy)
    
    def _create_shot(self, shot_id: str, scene_id: str, shot_number: int, shot_type: str, 
                    purpose: str, angle: str, movement: str, lens: str, 
                    scene: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Create detailed shot specification."""
        
        # Get shot type details
        shot_type_info = self.shot_types[shot_type]
        angle_info = self.camera_angles[angle]
        movement_info = self.camera_movements[movement]
        lens_info = self.lens_choices[lens]
        
        # Calculate shot duration based on type and purpose
        base_duration = shot_type_info["typical_duration"]
        duration = self._calculate_shot_duration(base_duration, purpose, strategy)
        
        # Generate shot specification
        shot = {
            "shot_id": shot_id,
            "scene_id": scene_id,
            "shot_number": shot_number,
            "version": "v1",
            
            # Shot Classification
            "shot_type": {
                "code": shot_type,
                "name": shot_type_info["name"],
                "purpose": shot_type_info["purpose"],
                "subject_size": shot_type_info["subject_size"],
                "context_level": shot_type_info["context"]
            },
            
            # Camera Specifications
            "camera": {
                "angle": {
                    "type": angle,
                    "description": angle_info["description"],
                    "emotional_impact": angle_info["emotional_impact"],
                    "power_dynamic": angle_info["power_dynamic"]
                },
                "movement": {
                    "type": movement,
                    "description": movement_info["description"],
                    "energy_level": movement_info["energy_level"],
                    "complexity": movement_info["complexity"]
                },
                "lens": {
                    "type": lens,
                    "focal_length": lens_info["focal_length"],
                    "perspective": lens_info["perspective"],
                    "distortion": lens_info["distortion"]
                }
            },
            
            # Timing and Pacing
            "timing": {
                "duration_seconds": duration,
                "start_time": 0,  # Will be calculated later
                "end_time": duration,
                "pacing": strategy["pacing"]
            },
            
            # Shot Purpose and Function
            "narrative_function": {
                "primary_purpose": purpose,
                "story_function": self._determine_story_function(purpose, scene),
                "emotional_function": self._determine_emotional_function(purpose, scene),
                "visual_function": self._determine_visual_function(shot_type, purpose)
            },
            
            # Visual Composition
            "composition": self._generate_shot_composition(shot_type, angle, scene),
            
            # Lighting Requirements
            "lighting": self._adapt_lighting_for_shot(scene["lighting"], shot_type, angle),
            
            # Character Requirements
            "characters": self._determine_shot_characters(scene, shot_type, purpose),
            
            # Technical Specifications
            "technical_specs": {
                "aspect_ratio": "16:9",
                "resolution": "1920x1080",
                "frame_rate": "24fps",
                "depth_of_field": self._determine_depth_of_field(shot_type, lens),
                "focus_point": self._determine_focus_point(shot_type, purpose)
            },
            
            # Continuity Requirements
            "continuity": {
                "match_previous": True,
                "eyeline_match": self._requires_eyeline_match(shot_number, purpose),
                "action_match": self._requires_action_match(purpose),
                "lighting_match": True,
                "color_match": True
            }
        }
        
        return shot
    
    def _select_angle_for_emotion(self, scene: Dict[str, Any]) -> str:
        """Select camera angle based on emotional content."""
        emotional_tone = scene.get("emotional_arc", {}).get("target_emotion", "neutral")
        
        angle_map = {
            "tense": "low-angle",
            "exciting": "low-angle",
            "peaceful": "eye-level",
            "melancholic": "high-angle",
            "calm": "eye-level"
        }
        
        return angle_map.get(emotional_tone, "eye-level")
    
    def _select_movement_for_beat(self, scene: Dict[str, Any], beat_type: str) -> str:
        """Select camera movement based on beat type."""
        if beat_type == "action":
            return "dolly-in"
        elif beat_type == "establishing":
            return "pan-right"
        elif beat_type == "emotional":
            return "static"
        else:
            return "static"
    
    def _calculate_shot_duration(self, base_duration: float, purpose: str, strategy: Dict[str, Any]) -> float:
        """Calculate shot duration based on purpose and strategy."""
        # Apply purpose modifiers
        purpose_modifiers = {
            "establishing": 1.2,
            "wide_establishing": 1.5,
            "action": 1.0,
            "emotional": 0.8,
            "action_peak": 0.6,
            "action_reaction": 0.9
        }
        
        # Apply pacing modifiers
        pacing_modifiers = {
            "contemplative": 1.3,
            "standard": 1.0,
            "dynamic": 0.8
        }
        
        duration = base_duration
        duration *= purpose_modifiers.get(purpose, 1.0)
        duration *= pacing_modifiers.get(strategy["pacing"], 1.0)
        
        return round(duration, 1)
    
    def _determine_story_function(self, purpose: str, scene: Dict[str, Any]) -> str:
        """Determine story function of the shot."""
        function_map = {
            "establishing": "introduce_context",
            "wide_establishing": "establish_world",
            "action": "advance_narrative",
            "emotional": "reveal_character",
            "action_peak": "climax_moment",
            "action_reaction": "consequence_reveal"
        }
        
        return function_map.get(purpose, "support_narrative")
    
    def _determine_emotional_function(self, purpose: str, scene: Dict[str, Any]) -> str:
        """Determine emotional function of the shot."""
        emotional_tone = scene.get("emotional_arc", {}).get("target_emotion", "neutral")
        
        if purpose == "emotional":
            return f"evoke_{emotional_tone}"
        elif purpose in ["action_peak", "action"]:
            return "build_tension"
        elif purpose == "establishing":
            return "set_mood"
        else:
            return f"support_{emotional_tone}"
    
    def _determine_visual_function(self, shot_type: str, purpose: str) -> str:
        """Determine visual function of the shot."""
        if shot_type in ["ELS", "LS"]:
            return "provide_context"
        elif shot_type in ["CU", "ECU"]:
            return "focus_attention"
        else:
            return "balance_composition"
    
    def _generate_shot_composition(self, shot_type: str, angle: str, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Generate composition requirements for the shot."""
        composition = scene.get("composition", {})
        
        # Adapt composition for shot type
        if shot_type in ["ELS", "LS"]:
            rule_of_thirds = "environmental"
            focal_point = "landscape"
        elif shot_type in ["CU", "ECU"]:
            rule_of_thirds = "portrait"
            focal_point = "character_face"
        else:
            rule_of_thirds = "standard"
            focal_point = "character_body"
        
        return {
            "rule_of_thirds": rule_of_thirds,
            "focal_point": focal_point,
            "leading_lines": composition.get("leading_lines", []),
            "visual_weight": self._determine_shot_visual_weight(shot_type, angle),
            "framing": self._determine_shot_framing(shot_type),
            "headroom": self._determine_headroom(shot_type),
            "lead_room": self._determine_lead_room(shot_type)
        }
    
    def _determine_shot_visual_weight(self, shot_type: str, angle: str) -> str:
        """Determine visual weight distribution for shot."""
        if angle == "low-angle":
            return "bottom_heavy"
        elif angle == "high-angle":
            return "top_heavy"
        elif shot_type in ["CU", "ECU"]:
            return "center_weighted"
        else:
            return "balanced"
    
    def _determine_shot_framing(self, shot_type: str) -> Dict[str, str]:
        """Determine framing requirements for shot type."""
        framing_map = {
            "ELS": {"tightness": "very_loose", "breathing_room": "maximum"},
            "LS": {"tightness": "loose", "breathing_room": "high"},
            "FS": {"tightness": "medium", "breathing_room": "medium"},
            "MCU": {"tightness": "tight", "breathing_room": "low"},
            "CU": {"tightness": "very_tight", "breathing_room": "minimal"},
            "ECU": {"tightness": "extreme", "breathing_room": "none"}
        }
        
        return framing_map.get(shot_type, {"tightness": "medium", "breathing_room": "medium"})
    
    def _determine_headroom(self, shot_type: str) -> str:
        """Determine headroom requirements."""
        if shot_type in ["CU", "ECU"]:
            return "minimal"
        elif shot_type == "MCU":
            return "tight"
        else:
            return "standard"
    
    def _determine_lead_room(self, shot_type: str) -> str:
        """Determine lead room requirements."""
        if shot_type in ["ELS", "LS"]:
            return "environmental"
        else:
            return "directional"
    
    def _adapt_lighting_for_shot(self, scene_lighting: Dict[str, Any], shot_type: str, angle: str) -> Dict[str, Any]:
        """Adapt scene lighting for specific shot requirements."""
        adapted_lighting = scene_lighting.copy()
        
        # Modify lighting based on shot type
        if shot_type in ["CU", "ECU"]:
            # Close-ups need more controlled lighting
            adapted_lighting["character_specific"] = {
                "key_light_intensity": "medium",
                "fill_light_ratio": "2:1",
                "rim_light": "subtle",
                "eye_light": "present"
            }
        elif shot_type in ["ELS", "LS"]:
            # Wide shots emphasize environmental lighting
            adapted_lighting["environmental_emphasis"] = {
                "ambient_contribution": "high",
                "practical_lights": "visible",
                "atmospheric_effects": "enhanced"
            }
        
        # Modify lighting based on camera angle
        if angle == "low-angle":
            adapted_lighting["angle_compensation"] = {
                "under_lighting": "subtle",
                "shadow_fill": "increased"
            }
        elif angle == "high-angle":
            adapted_lighting["angle_compensation"] = {
                "top_lighting": "enhanced",
                "shadow_definition": "increased"
            }
        
        return adapted_lighting
    
    def _determine_shot_characters(self, scene: Dict[str, Any], shot_type: str, purpose: str) -> List[Dict[str, Any]]:
        """Determine character requirements for the shot."""
        scene_characters = scene.get("characters", [])
        shot_characters = []
        
        for char in scene_characters:
            # Determine character visibility and prominence in shot
            if shot_type in ["CU", "ECU"] and purpose == "emotional":
                visibility = "primary_focus"
                screen_time = 1.0
            elif shot_type in ["MCU", "FS"]:
                visibility = "prominent"
                screen_time = 0.8
            else:
                visibility = "present"
                screen_time = 0.6
            
            shot_character = {
                "character_id": char["character_id"],
                "visibility": visibility,
                "screen_time_ratio": screen_time,
                "positioning": self._determine_character_shot_positioning(char, shot_type),
                "performance_requirements": self._determine_performance_requirements(char, purpose),
                "visual_requirements": char.get("visual_requirements", {})
            }
            
            shot_characters.append(shot_character)
        
        return shot_characters
    
    def _determine_character_shot_positioning(self, character: Dict[str, Any], shot_type: str) -> Dict[str, str]:
        """Determine character positioning for specific shot."""
        base_positioning = character.get("positioning", {})
        
        if shot_type in ["CU", "ECU"]:
            return {
                "screen_position": "center",
                "depth_placement": "foreground",
                "movement_constraint": "minimal"
            }
        elif shot_type in ["ELS", "LS"]:
            return {
                "screen_position": base_positioning.get("screen_position", "center"),
                "depth_placement": "integrated",
                "movement_constraint": "environmental"
            }
        else:
            return base_positioning
    
    def _determine_performance_requirements(self, character: Dict[str, Any], purpose: str) -> List[str]:
        """Determine performance requirements for character in shot."""
        requirements = []
        
        if purpose == "emotional":
            requirements.extend(["facial_expression", "eye_contact", "subtle_movement"])
        elif purpose in ["action", "action_peak"]:
            requirements.extend(["body_language", "dynamic_movement", "reaction"])
        elif purpose == "establishing":
            requirements.extend(["environmental_interaction", "natural_behavior"])
        
        return requirements
    
    def _determine_depth_of_field(self, shot_type: str, lens: str) -> Dict[str, str]:
        """Determine depth of field requirements."""
        if shot_type in ["CU", "ECU"]:
            return {"type": "shallow", "f_stop": "f/2.8", "focus_falloff": "rapid"}
        elif shot_type in ["ELS", "LS"]:
            return {"type": "deep", "f_stop": "f/8", "focus_falloff": "gradual"}
        else:
            return {"type": "medium", "f_stop": "f/5.6", "focus_falloff": "moderate"}
    
    def _determine_focus_point(self, shot_type: str, purpose: str) -> str:
        """Determine primary focus point."""
        if purpose == "emotional" or shot_type in ["CU", "ECU"]:
            return "character_eyes"
        elif purpose == "establishing" or shot_type in ["ELS", "LS"]:
            return "environmental_center"
        else:
            return "character_center"
    
    def _requires_eyeline_match(self, shot_number: int, purpose: str) -> bool:
        """Determine if shot requires eyeline matching."""
        return shot_number > 1 and purpose in ["emotional", "action_reaction"]
    
    def _requires_action_match(self, purpose: str) -> bool:
        """Determine if shot requires action matching."""
        return purpose in ["action", "action_peak", "action_reaction"]
    
    def _apply_shot_timing(self, shots: List[Dict[str, Any]], total_duration: float) -> List[Dict[str, Any]]:
        """Apply precise timing to shots within scene duration."""
        total_shot_duration = sum(shot["timing"]["duration_seconds"] for shot in shots)
        
        # Scale durations if they exceed scene duration
        if total_shot_duration > total_duration:
            scale_factor = total_duration / total_shot_duration
            for shot in shots:
                shot["timing"]["duration_seconds"] *= scale_factor
        
        # Calculate start and end times
        current_time = 0
        for shot in shots:
            shot["timing"]["start_time"] = current_time
            shot["timing"]["end_time"] = current_time + shot["timing"]["duration_seconds"]
            current_time = shot["timing"]["end_time"]
        
        return shots
    
    def _apply_shot_transitions(self, shots: List[Dict[str, Any]], scene: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Apply transition specifications between shots."""
        for i, shot in enumerate(shots):
            if i == 0:
                shot["transition_in"] = {"type": "scene_start", "duration": 0}
            else:
                shot["transition_in"] = self._determine_transition_type(shots[i-1], shot, scene)
            
            if i == len(shots) - 1:
                shot["transition_out"] = {"type": "scene_end", "duration": 0}
            else:
                shot["transition_out"] = self._determine_transition_type(shot, shots[i+1], scene)
        
        return shots
    
    def _determine_transition_type(self, shot_a: Dict[str, Any], shot_b: Dict[str, Any], scene: Dict[str, Any]) -> Dict[str, str]:
        """Determine transition type between two shots."""
        shot_a_type = shot_a["shot_type"]["code"]
        shot_b_type = shot_b["shot_type"]["code"]
        pacing = scene["scene_purpose"].get("pacing_requirements", {}).get("rhythm", "medium")
        
        # Determine transition based on shot types and pacing
        if pacing == "fast":
            transition_type = "cut"
            duration = 0
        elif shot_a_type in ["ELS", "LS"] and shot_b_type in ["CU", "ECU"]:
            transition_type = "cut"  # Strong contrast
            duration = 0
        elif abs(self._get_shot_size_value(shot_a_type) - self._get_shot_size_value(shot_b_type)) <= 1:
            transition_type = "cut"  # Similar sizes
            duration = 0
        else:
            transition_type = "cut"  # Default to cut for hackathon simplicity
            duration = 0
        
        return {"type": transition_type, "duration": duration}
    
    def _get_shot_size_value(self, shot_type: str) -> int:
        """Get numeric value for shot size comparison."""
        size_values = {"ELS": 1, "LS": 2, "FS": 3, "MCU": 4, "CU": 5, "ECU": 6}
        return size_values.get(shot_type, 3)
    
    def _generate_cinematic_grammar(self, shot_lists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate cinematic grammar analysis."""
        shot_types = [shot["shot_type"]["code"] for shot in shot_lists]
        camera_angles = [shot["camera"]["angle"]["type"] for shot in shot_lists]
        camera_movements = [shot["camera"]["movement"]["type"] for shot in shot_lists]
        
        return {
            "shot_type_distribution": self._calculate_distribution(shot_types),
            "angle_distribution": self._calculate_distribution(camera_angles),
            "movement_distribution": self._calculate_distribution(camera_movements),
            "cinematic_style": self._determine_cinematic_style(shot_lists),
            "coverage_completeness": self._assess_coverage_completeness(shot_lists),
            "visual_rhythm": self._analyze_visual_rhythm(shot_lists)
        }
    
    def _calculate_distribution(self, items: List[str]) -> Dict[str, float]:
        """Calculate percentage distribution of items."""
        if not items:
            return {}
        
        counts = {}
        for item in items:
            counts[item] = counts.get(item, 0) + 1
        
        total = len(items)
        return {item: (count / total) * 100 for item, count in counts.items()}
    
    def _determine_cinematic_style(self, shot_lists: List[Dict[str, Any]]) -> str:
        """Determine overall cinematic style."""
        movement_count = sum(1 for shot in shot_lists if shot["camera"]["movement"]["type"] != "static")
        close_up_count = sum(1 for shot in shot_lists if shot["shot_type"]["code"] in ["CU", "ECU"])
        
        movement_ratio = movement_count / len(shot_lists)
        close_up_ratio = close_up_count / len(shot_lists)
        
        if movement_ratio > 0.6:
            return "dynamic"
        elif close_up_ratio > 0.4:
            return "intimate"
        else:
            return "classical"
    
    def _assess_coverage_completeness(self, shot_lists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess completeness of shot coverage."""
        shot_types = set(shot["shot_type"]["code"] for shot in shot_lists)
        
        # Essential shot types for complete coverage
        essential_types = {"LS", "MCU", "CU"}
        has_essential = essential_types.issubset(shot_types)
        
        return {
            "has_establishing": "LS" in shot_types or "ELS" in shot_types,
            "has_medium": "MCU" in shot_types or "FS" in shot_types,
            "has_close": "CU" in shot_types or "ECU" in shot_types,
            "coverage_complete": has_essential,
            "coverage_score": len(shot_types.intersection(essential_types)) / len(essential_types)
        }
    
    def _analyze_visual_rhythm(self, shot_lists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze visual rhythm of shot sequence."""
        durations = [shot["timing"]["duration_seconds"] for shot in shot_lists]
        
        if not durations:
            return {"rhythm": "undefined", "variation": 0}
        
        avg_duration = sum(durations) / len(durations)
        variation = sum(abs(d - avg_duration) for d in durations) / len(durations)
        
        if variation < 0.3:
            rhythm = "steady"
        elif variation > 0.8:
            rhythm = "varied"
        else:
            rhythm = "moderate"
        
        return {
            "rhythm": rhythm,
            "average_duration": avg_duration,
            "variation": variation,
            "tempo": "fast" if avg_duration < 1.5 else "slow" if avg_duration > 2.5 else "medium"
        }
    
    def _generate_camera_specifications(self, shot_lists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate camera specifications for the shot list."""
        return {
            "camera_package": {
                "primary_camera": "Cinema Camera",
                "lens_kit": ["14-35mm", "35-85mm", "85-200mm"],
                "support_equipment": ["tripod", "dolly", "stabilizer"],
                "recording_format": "4K ProRes"
            },
            "movement_requirements": self._analyze_movement_requirements(shot_lists),
            "lens_requirements": self._analyze_lens_requirements(shot_lists),
            "technical_constraints": {
                "minimum_crew": 2,
                "setup_time_per_shot": "5 minutes",
                "total_shooting_time": f"{len(shot_lists) * 5} minutes"
            }
        }
    
    def _analyze_movement_requirements(self, shot_lists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze camera movement requirements."""
        movements = [shot["camera"]["movement"]["type"] for shot in shot_lists]
        movement_counts = {}
        
        for movement in movements:
            movement_counts[movement] = movement_counts.get(movement, 0) + 1
        
        return {
            "movement_breakdown": movement_counts,
            "equipment_needed": self._determine_movement_equipment(movements),
            "complexity_level": self._assess_movement_complexity(movements)
        }
    
    def _determine_movement_equipment(self, movements: List[str]) -> List[str]:
        """Determine equipment needed for camera movements."""
        equipment = set()
        
        for movement in movements:
            if movement in ["dolly-in", "dolly-out"]:
                equipment.add("dolly_track")
            elif movement in ["pan-left", "pan-right", "tilt-up", "tilt-down"]:
                equipment.add("fluid_head_tripod")
            elif movement == "static":
                equipment.add("tripod")
        
        return list(equipment)
    
    def _assess_movement_complexity(self, movements: List[str]) -> str:
        """Assess complexity of camera movements."""
        complex_movements = ["dolly-in", "dolly-out"]
        complex_count = sum(1 for m in movements if m in complex_movements)
        
        if complex_count == 0:
            return "simple"
        elif complex_count <= len(movements) * 0.3:
            return "moderate"
        else:
            return "complex"
    
    def _analyze_lens_requirements(self, shot_lists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze lens requirements."""
        lenses = [shot["camera"]["lens"]["type"] for shot in shot_lists]
        lens_counts = {}
        
        for lens in lenses:
            lens_counts[lens] = lens_counts.get(lens, 0) + 1
        
        return {
            "lens_breakdown": lens_counts,
            "primary_lens": max(lens_counts.items(), key=lambda x: x[1])[0],
            "lens_changes": len(set(lenses)) - 1
        }
    
    def _plan_shot_transitions(self, shot_lists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Plan transitions between shots."""
        transitions = []
        
        for i in range(len(shot_lists) - 1):
            current_shot = shot_lists[i]
            next_shot = shot_lists[i + 1]
            
            transition = {
                "from_shot": current_shot["shot_id"],
                "to_shot": next_shot["shot_id"],
                "transition_type": current_shot.get("transition_out", {}).get("type", "cut"),
                "duration": current_shot.get("transition_out", {}).get("duration", 0),
                "motivation": self._determine_transition_motivation(current_shot, next_shot)
            }
            
            transitions.append(transition)
        
        return {
            "transitions": transitions,
            "transition_style": self._determine_overall_transition_style(transitions),
            "editing_complexity": self._assess_editing_complexity(transitions)
        }
    
    def _determine_transition_motivation(self, shot_a: Dict[str, Any], shot_b: Dict[str, Any]) -> str:
        """Determine motivation for transition."""
        purpose_a = shot_a["narrative_function"]["primary_purpose"]
        purpose_b = shot_b["narrative_function"]["primary_purpose"]
        
        if purpose_a == "establishing" and purpose_b == "action":
            return "focus_shift"
        elif purpose_a == "action" and purpose_b == "emotional":
            return "reaction_reveal"
        elif purpose_a == "emotional" and purpose_b == "establishing":
            return "context_return"
        else:
            return "narrative_flow"
    
    def _determine_overall_transition_style(self, transitions: List[Dict[str, Any]]) -> str:
        """Determine overall transition style."""
        transition_types = [t["transition_type"] for t in transitions]
        
        if all(t == "cut" for t in transition_types):
            return "classical_cutting"
        else:
            return "mixed_transitions"
    
    def _assess_editing_complexity(self, transitions: List[Dict[str, Any]]) -> str:
        """Assess editing complexity."""
        # For hackathon, keep it simple
        return "standard"
    
    def _generate_technical_requirements(self, shot_lists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate technical requirements for shot execution."""
        total_duration = sum(shot["timing"]["duration_seconds"] for shot in shot_lists)
        
        return {
            "total_runtime": total_duration,
            "total_shots": len(shot_lists),
            "average_shot_length": total_duration / len(shot_lists) if shot_lists else 0,
            "aspect_ratio": "16:9",
            "resolution": "1920x1080",
            "frame_rate": "24fps",
            "color_space": "rec709",
            "recording_format": "ProRes 422",
            "storage_requirements": f"{len(shot_lists) * 2}GB estimated"
        }
    
    def _calculate_average_shot_duration(self, shot_lists: List[Dict[str, Any]]) -> float:
        """Calculate average shot duration."""
        if not shot_lists:
            return 0.0
        
        total_duration = sum(shot["timing"]["duration_seconds"] for shot in shot_lists)
        return total_duration / len(shot_lists)
    
    def _calculate_shot_variety(self, shot_lists: List[Dict[str, Any]]) -> float:
        """Calculate shot variety score."""
        if not shot_lists:
            return 0.0
        
        shot_types = set(shot["shot_type"]["code"] for shot in shot_lists)
        angles = set(shot["camera"]["angle"]["type"] for shot in shot_lists)
        movements = set(shot["camera"]["movement"]["type"] for shot in shot_lists)
        
        # Score based on variety (max 5.0)
        type_variety = min(len(shot_types) / 3, 1.0) * 2.0  # Max 2.0 for shot types
        angle_variety = min(len(angles) / 2, 1.0) * 1.5     # Max 1.5 for angles
        movement_variety = min(len(movements) / 3, 1.0) * 1.5  # Max 1.5 for movements
        
        return type_variety + angle_variety + movement_variety
    
    def _calculate_camera_complexity(self, shot_lists: List[Dict[str, Any]]) -> float:
        """Calculate camera complexity score."""
        if not shot_lists:
            return 0.0
        
        complexity_score = 0.0
        
        for shot in shot_lists:
            # Add complexity for movement
            movement = shot["camera"]["movement"]["type"]
            if movement != "static":
                complexity_score += 1.0
            
            # Add complexity for non-standard angles
            angle = shot["camera"]["angle"]["type"]
            if angle != "eye-level":
                complexity_score += 0.5
            
            # Add complexity for extreme shot types
            shot_type = shot["shot_type"]["code"]
            if shot_type in ["ELS", "ECU"]:
                complexity_score += 0.5
        
        # Normalize to 5.0 scale
        return min(complexity_score / len(shot_lists) * 2, 5.0)
    
    def _update_project_with_shots(self, project_path: Path, shot_metadata: Dict[str, Any]) -> None:
        """Update project.json with shot planning results."""
        project_file = project_path / "project.json"
        
        with open(project_file, 'r') as f:
            project_data = json.load(f)
        
        # Update project with shot metadata
        project_data["shot_planning_metadata"] = {
            "planning_id": shot_metadata["shot_planning_id"],
            "processed_at": shot_metadata["created_at"],
            "total_shots": shot_metadata["processing_metadata"]["total_shots"],
            "average_shot_duration": shot_metadata["processing_metadata"]["average_shot_duration"],
            "shot_variety_score": shot_metadata["processing_metadata"]["shot_variety_score"],
            "camera_complexity_score": shot_metadata["processing_metadata"]["camera_complexity_score"]
        }
        
        # Update generation status
        project_data["generation_status"]["shot_planning"] = "done"
        project_data["status"]["current_phase"] = "shot_planning_processed"
        project_data["status"]["last_updated"] = shot_metadata["created_at"]
        
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)