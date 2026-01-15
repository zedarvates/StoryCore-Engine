"""
Storyboard Engine - Stage 4 of 10-Stage Multimodal Pipeline
Transforms shot lists into visual compositions with puppet placement and guides.

Follows DOCUMENT 24 — GLOBAL PIPELINE ARCHI V2 and DOCUMENT 4 — STYLE & COHERENCE BIBL V2
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple


class StoryboardEngine:
    """Handles storyboard generation and visual composition planning."""
    
    def __init__(self):
        self.schema_version = "1.0"
        
        # Composition grid system for visual placement
        self.composition_grid = {
            "rule_of_thirds": {
                "horizontal_lines": [0.33, 0.67],
                "vertical_lines": [0.33, 0.67],
                "intersection_points": [
                    (0.33, 0.33), (0.67, 0.33),
                    (0.33, 0.67), (0.67, 0.67)
                ]
            },
            "golden_ratio": {
                "horizontal_lines": [0.382, 0.618],
                "vertical_lines": [0.382, 0.618],
                "intersection_points": [
                    (0.382, 0.382), (0.618, 0.382),
                    (0.382, 0.618), (0.618, 0.618)
                ]
            }
        }
        
        # Puppet positioning system
        self.puppet_positions = {
            "foreground": {"depth": 0.1, "scale": 1.0, "prominence": "primary"},
            "midground": {"depth": 0.5, "scale": 0.8, "prominence": "secondary"},
            "background": {"depth": 0.9, "scale": 0.6, "prominence": "tertiary"}
        }
        
        # Camera guide types
        self.camera_guides = {
            "framing_box": {"color": "#FF0000", "opacity": 0.7, "style": "dashed"},
            "safe_area": {"color": "#00FF00", "opacity": 0.5, "style": "solid"},
            "rule_of_thirds": {"color": "#0000FF", "opacity": 0.3, "style": "dotted"},
            "center_cross": {"color": "#FFFF00", "opacity": 0.6, "style": "solid"}
        }
        
        # Lighting guide system
        self.lighting_guides = {
            "key_light": {"color": "#FFD700", "size": "large", "intensity": 1.0},
            "fill_light": {"color": "#87CEEB", "size": "medium", "intensity": 0.6},
            "rim_light": {"color": "#FFA500", "size": "small", "intensity": 0.8},
            "ambient": {"color": "#E6E6FA", "size": "diffuse", "intensity": 0.3}
        }
        
        # Motion arrow types
        self.motion_arrows = {
            "camera_movement": {"color": "#FF4500", "style": "thick", "head": "large"},
            "character_movement": {"color": "#32CD32", "style": "medium", "head": "medium"},
            "object_movement": {"color": "#1E90FF", "style": "thin", "head": "small"},
            "eye_direction": {"color": "#FF69B4", "style": "dashed", "head": "arrow"}
        }
    
    def process_storyboard_generation(self, project_path: Path) -> Dict[str, Any]:
        """
        Process shot planning into visual storyboard compositions.
        
        Args:
            project_path: Path to project directory
            
        Returns:
            Dict with storyboard metadata
        """
        # Load shot planning metadata
        shot_planning = self._load_shot_planning(project_path)
        if not shot_planning:
            raise FileNotFoundError("Shot planning not found. Run 'storycore shot-planning' first.")
        
        # Load scene breakdown for additional context
        scene_breakdown = self._load_scene_breakdown(project_path)
        
        # Extract shot lists
        shot_lists = shot_planning["shot_lists"]
        
        # Process each shot into storyboard frame
        storyboard_frames = []
        
        for shot in shot_lists:
            frame = self._create_storyboard_frame(shot, scene_breakdown)
            storyboard_frames.append(frame)
        
        # Create storyboard metadata
        storyboard_metadata = {
            "storyboard_id": f"storyboard_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "schema_version": self.schema_version,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "source_shot_planning_id": shot_planning["shot_planning_id"],
            "storyboard_frames": storyboard_frames,
            "visual_composition_rules": self._generate_visual_composition_rules(storyboard_frames),
            "puppet_placement_system": self._generate_puppet_placement_system(storyboard_frames),
            "camera_guide_system": self._generate_camera_guide_system(storyboard_frames),
            "lighting_guide_system": self._generate_lighting_guide_system(storyboard_frames),
            "motion_system": self._generate_motion_system(storyboard_frames),
            "annotation_system": self._generate_annotation_system(storyboard_frames),
            "layer_placeholders": self._generate_layer_placeholders(storyboard_frames),
            "processing_metadata": {
                "total_frames": len(storyboard_frames),
                "composition_complexity": self._calculate_composition_complexity(storyboard_frames),
                "puppet_count": self._count_total_puppets(storyboard_frames),
                "visual_consistency_score": self._calculate_visual_consistency(storyboard_frames)
            }
        }
        
        # Save storyboard metadata
        storyboard_file = project_path / "storyboard_visual.json"
        with open(storyboard_file, 'w') as f:
            json.dump(storyboard_metadata, f, indent=2)
        
        # Update project.json with storyboard reference
        self._update_project_with_storyboard(project_path, storyboard_metadata)
        
        return storyboard_metadata
    
    def _load_shot_planning(self, project_path: Path) -> Dict[str, Any]:
        """Load shot planning metadata."""
        shot_planning_file = project_path / "shot_planning.json"
        if not shot_planning_file.exists():
            return None
        
        with open(shot_planning_file, 'r') as f:
            return json.load(f)
    
    def _load_scene_breakdown(self, project_path: Path) -> Dict[str, Any]:
        """Load scene breakdown metadata for additional context."""
        scene_breakdown_file = project_path / "scene_breakdown.json"
        if scene_breakdown_file.exists():
            with open(scene_breakdown_file, 'r') as f:
                return json.load(f)
        return None
    
    def _create_storyboard_frame(self, shot: Dict[str, Any], scene_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a storyboard frame from shot metadata.
        
        Args:
            shot: Shot metadata from shot planning
            scene_breakdown: Scene breakdown for additional context
            
        Returns:
            Dict with storyboard frame metadata
        """
        # Extract shot information
        shot_id = shot["shot_id"]
        shot_type = shot["shot_type"]
        camera = shot["camera"]
        composition = shot["composition"]
        lighting = shot["lighting"]
        characters = shot["characters"]
        
        # Generate visual composition based on shot type and composition rules
        visual_composition = self._generate_visual_composition(shot_type, composition, camera)
        
        # Generate puppet placement based on characters and shot framing
        puppet_placement = self._generate_puppet_placement(characters, shot_type, composition)
        
        # Generate camera guides based on shot type and camera settings
        camera_guides = self._generate_camera_guides(shot_type, camera, composition)
        
        # Generate lighting guides based on lighting setup
        lighting_guides = self._generate_lighting_guides(lighting, shot_type)
        
        # Generate motion arrows based on camera movement and character actions
        motion_arrows = self._generate_motion_arrows(camera, characters, shot)
        
        # Generate annotations for technical and creative notes
        annotations = self._generate_annotations(shot, scene_breakdown)
        
        # Generate layer placeholders (L0-L8 system)
        layer_placeholders = self._generate_frame_layer_placeholders(shot, characters)
        
        # Create storyboard frame
        storyboard_frame = {
            "frame_id": f"frame_{shot_id}",
            "shot_id": shot_id,
            "scene_id": shot["scene_id"],
            "shot_number": shot["shot_number"],
            "frame_type": "storyboard_composition",
            "visual_composition": visual_composition,
            "puppet_placement": puppet_placement,
            "camera_guides": camera_guides,
            "lighting_guides": lighting_guides,
            "motion_arrows": motion_arrows,
            "annotations": annotations,
            "layer_placeholders": layer_placeholders,
            "technical_specs": {
                "aspect_ratio": shot["technical_specs"]["aspect_ratio"],
                "resolution": shot["technical_specs"]["resolution"],
                "composition_grid": self._determine_composition_grid(composition),
                "focal_point": composition["focal_point"],
                "visual_weight": composition["visual_weight"]
            },
            "cinematic_metadata": {
                "shot_type": shot_type,
                "camera_angle": camera["angle"],
                "camera_movement": camera["movement"],
                "lens_type": camera["lens"],
                "narrative_function": shot["narrative_function"],
                "timing": shot["timing"]
            }
        }
        
        return storyboard_frame
    
    def _generate_visual_composition(self, shot_type: Dict[str, Any], composition: Dict[str, Any], camera: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visual composition guidelines for the frame."""
        
        # Determine composition grid based on shot type and framing
        grid_type = "rule_of_thirds"
        if shot_type["code"] in ["CU", "ECU"]:
            grid_type = "golden_ratio"  # More precise for close-ups
        
        # Calculate frame boundaries based on shot type
        frame_boundaries = self._calculate_frame_boundaries(shot_type, composition)
        
        # Determine focal areas based on composition rules
        focal_areas = self._calculate_focal_areas(composition, grid_type)
        
        return {
            "composition_type": grid_type,
            "frame_boundaries": frame_boundaries,
            "focal_areas": focal_areas,
            "leading_lines": composition.get("leading_lines", []),
            "visual_balance": composition["visual_weight"],
            "framing_tightness": composition["framing"]["tightness"],
            "breathing_room": composition["framing"]["breathing_room"],
            "headroom": composition.get("headroom", "standard"),
            "lead_room": composition.get("lead_room", "standard")
        }
    
    def _generate_puppet_placement(self, characters: List[Dict[str, Any]], shot_type: Dict[str, Any], composition: Dict[str, Any]) -> Dict[str, Any]:
        """Generate puppet placement instructions for characters."""
        
        puppet_placements = []
        
        for character in characters:
            # Determine depth placement based on shot type and visibility
            depth_layer = self._determine_character_depth(character, shot_type)
            
            # Calculate screen position based on composition rules
            screen_position = self._calculate_character_screen_position(character, composition, shot_type)
            
            # Determine scale based on shot type and depth
            character_scale = self._calculate_character_scale(shot_type, depth_layer)
            
            # Generate pose requirements based on shot and performance needs
            pose_requirements = self._generate_pose_requirements(character, shot_type)
            
            puppet_placement = {
                "character_id": character["character_id"],
                "visibility_level": character["visibility"],
                "depth_layer": depth_layer,
                "screen_position": screen_position,
                "character_scale": character_scale,
                "pose_requirements": pose_requirements,
                "visual_requirements": character["visual_requirements"],
                "performance_requirements": character.get("performance_requirements", []),
                "screen_time_ratio": character["screen_time_ratio"]
            }
            
            puppet_placements.append(puppet_placement)
        
        return {
            "total_characters": len(characters),
            "character_placements": puppet_placements,
            "depth_sorting": sorted([p["depth_layer"] for p in puppet_placements]),
            "interaction_zones": self._calculate_interaction_zones(puppet_placements)
        }
    
    def _generate_camera_guides(self, shot_type: Dict[str, Any], camera: Dict[str, Any], composition: Dict[str, Any]) -> Dict[str, Any]:
        """Generate camera guide overlays for the frame."""
        
        guides = []
        
        # Add framing box guide
        guides.append({
            "guide_type": "framing_box",
            "properties": self.camera_guides["framing_box"],
            "coordinates": self._calculate_framing_box(shot_type, composition),
            "purpose": "Define shot boundaries"
        })
        
        # Add safe area guide for broadcast standards
        guides.append({
            "guide_type": "safe_area",
            "properties": self.camera_guides["safe_area"],
            "coordinates": self._calculate_safe_area(),
            "purpose": "Ensure broadcast compatibility"
        })
        
        # Add rule of thirds grid
        guides.append({
            "guide_type": "rule_of_thirds",
            "properties": self.camera_guides["rule_of_thirds"],
            "coordinates": self._calculate_rule_of_thirds_grid(),
            "purpose": "Composition reference"
        })
        
        # Add center cross for precise alignment
        guides.append({
            "guide_type": "center_cross",
            "properties": self.camera_guides["center_cross"],
            "coordinates": self._calculate_center_cross(),
            "purpose": "Center alignment reference"
        })
        
        # Add camera movement indicators if applicable
        movement_guides = self._generate_camera_movement_guides(camera["movement"])
        guides.extend(movement_guides)
        
        return {
            "total_guides": len(guides),
            "guide_elements": guides,
            "camera_angle": camera["angle"],
            "camera_movement": camera["movement"],
            "lens_specifications": camera["lens"]
        }
    
    def _generate_lighting_guides(self, lighting: Dict[str, Any], shot_type: Dict[str, Any]) -> Dict[str, Any]:
        """Generate lighting guide overlays for the frame."""
        
        lighting_elements = []
        
        # Add key light indicator
        key_light = lighting["primary_light"]
        lighting_elements.append({
            "light_type": "key_light",
            "properties": self.lighting_guides["key_light"],
            "position": self._calculate_light_position(key_light["direction"]),
            "intensity": key_light["intensity"],
            "color_temperature": key_light["temperature"],
            "quality": key_light["quality"],
            "purpose": "Primary illumination"
        })
        
        # Add secondary lights
        for secondary_light in lighting.get("secondary_lights", []):
            lighting_elements.append({
                "light_type": "fill_light",
                "properties": self.lighting_guides["fill_light"],
                "position": self._calculate_light_position(secondary_light["direction"]),
                "color": secondary_light.get("color", "neutral"),
                "purpose": "Fill illumination"
            })
        
        # Add rim light if character-focused shot
        if shot_type["code"] in ["MCU", "CU", "ECU"] and lighting.get("character_specific"):
            lighting_elements.append({
                "light_type": "rim_light",
                "properties": self.lighting_guides["rim_light"],
                "position": self._calculate_rim_light_position(),
                "intensity": lighting["character_specific"].get("rim_light", "subtle"),
                "purpose": "Character separation"
            })
        
        # Add ambient light indicator
        ambient = lighting["ambient_light"]
        lighting_elements.append({
            "light_type": "ambient",
            "properties": self.lighting_guides["ambient"],
            "source": ambient["source"],
            "color": ambient["color"],
            "intensity": ambient["intensity"],
            "purpose": "Environmental illumination"
        })
        
        return {
            "total_lighting_elements": len(lighting_elements),
            "lighting_elements": lighting_elements,
            "lighting_motivation": lighting["lighting_motivation"],
            "cinematic_purpose": lighting["cinematic_purpose"],
            "shadow_information": lighting["shadows"]
        }
    
    def _generate_motion_arrows(self, camera: Dict[str, Any], characters: List[Dict[str, Any]], shot: Dict[str, Any]) -> Dict[str, Any]:
        """Generate motion arrow indicators for camera and character movement."""
        
        motion_elements = []
        
        # Add camera movement arrow if applicable
        camera_movement = camera["movement"]
        if camera_movement["type"] != "static":
            motion_elements.append({
                "motion_type": "camera_movement",
                "properties": self.motion_arrows["camera_movement"],
                "movement_type": camera_movement["type"],
                "direction": self._calculate_camera_movement_direction(camera_movement),
                "energy_level": camera_movement["energy_level"],
                "complexity": camera_movement["complexity"],
                "purpose": "Camera motion indicator"
            })
        
        # Add character movement arrows
        for character in characters:
            if character.get("positioning", {}).get("movement_type") == "dynamic":
                motion_elements.append({
                    "motion_type": "character_movement",
                    "properties": self.motion_arrows["character_movement"],
                    "character_id": character["character_id"],
                    "movement_direction": self._calculate_character_movement_direction(character),
                    "purpose": f"Character {character['character_id']} movement"
                })
            
            # Add eye direction arrows for close-ups
            if shot["shot_type"]["code"] in ["CU", "ECU"]:
                motion_elements.append({
                    "motion_type": "eye_direction",
                    "properties": self.motion_arrows["eye_direction"],
                    "character_id": character["character_id"],
                    "gaze_direction": self._calculate_gaze_direction(character, shot),
                    "purpose": f"Character {character['character_id']} gaze"
                })
        
        return {
            "total_motion_elements": len(motion_elements),
            "motion_elements": motion_elements,
            "overall_energy": camera_movement["energy_level"]
        }
    
    def _generate_annotations(self, shot: Dict[str, Any], scene_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """Generate technical and creative annotations for the frame."""
        
        annotations = []
        
        # Technical annotations
        annotations.append({
            "annotation_type": "technical",
            "category": "camera_specs",
            "content": f"{shot['camera']['lens']['focal_length']} lens, {shot['technical_specs']['depth_of_field']['f_stop']}",
            "position": "top_left"
        })
        
        annotations.append({
            "annotation_type": "technical",
            "category": "timing",
            "content": f"Duration: {shot['timing']['duration_seconds']:.1f}s",
            "position": "top_right"
        })
        
        # Creative annotations
        annotations.append({
            "annotation_type": "creative",
            "category": "narrative_function",
            "content": shot["narrative_function"]["primary_purpose"].replace("_", " ").title(),
            "position": "bottom_left"
        })
        
        annotations.append({
            "annotation_type": "creative",
            "category": "emotional_function",
            "content": shot["narrative_function"]["emotional_function"].replace("_", " ").title(),
            "position": "bottom_right"
        })
        
        # Lighting annotations
        lighting_note = f"{shot['lighting']['primary_light']['type']} from {shot['lighting']['primary_light']['direction']}"
        annotations.append({
            "annotation_type": "lighting",
            "category": "primary_light",
            "content": lighting_note,
            "position": "center_bottom"
        })
        
        # Character annotations
        if shot["characters"]:
            char_count = len(shot["characters"])
            char_note = f"{char_count} character{'s' if char_count > 1 else ''}"
            annotations.append({
                "annotation_type": "character",
                "category": "character_count",
                "content": char_note,
                "position": "center_top"
            })
        
        return {
            "total_annotations": len(annotations),
            "annotation_elements": annotations
        }
    
    def _generate_frame_layer_placeholders(self, shot: Dict[str, Any], characters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate layer placeholder system (L0-L8) for the frame."""
        
        # Layer system based on DOCUMENT 24
        layers = {
            "L0_background": {
                "layer_type": "environment",
                "content": "Background environment and sky",
                "depth": 1.0,
                "opacity": 1.0,
                "blend_mode": "normal"
            },
            "L1_far_background": {
                "layer_type": "environment",
                "content": "Distant objects and horizon",
                "depth": 0.9,
                "opacity": 1.0,
                "blend_mode": "normal"
            },
            "L2_mid_background": {
                "layer_type": "environment",
                "content": "Mid-distance environment elements",
                "depth": 0.7,
                "opacity": 1.0,
                "blend_mode": "normal"
            },
            "L3_background_characters": {
                "layer_type": "character",
                "content": "Background characters and extras",
                "depth": 0.6,
                "opacity": 1.0,
                "blend_mode": "normal",
                "characters": [c for c in characters if c.get("positioning", {}).get("depth_placement") == "background"]
            },
            "L4_midground": {
                "layer_type": "environment",
                "content": "Midground props and set pieces",
                "depth": 0.5,
                "opacity": 1.0,
                "blend_mode": "normal"
            },
            "L5_main_characters": {
                "layer_type": "character",
                "content": "Primary characters in scene",
                "depth": 0.4,
                "opacity": 1.0,
                "blend_mode": "normal",
                "characters": [c for c in characters if c.get("positioning", {}).get("depth_placement") == "midground"]
            },
            "L6_foreground_characters": {
                "layer_type": "character",
                "content": "Foreground characters and close subjects",
                "depth": 0.2,
                "opacity": 1.0,
                "blend_mode": "normal",
                "characters": [c for c in characters if c.get("positioning", {}).get("depth_placement") == "foreground"]
            },
            "L7_foreground_props": {
                "layer_type": "props",
                "content": "Foreground objects and props",
                "depth": 0.1,
                "opacity": 1.0,
                "blend_mode": "normal"
            },
            "L8_effects": {
                "layer_type": "effects",
                "content": "Lighting effects, particles, overlays",
                "depth": 0.05,
                "opacity": 0.8,
                "blend_mode": "overlay"
            }
        }
        
        # Add shot-specific layer information
        for layer_name, layer_info in layers.items():
            layer_info["shot_relevance"] = self._calculate_layer_relevance(layer_name, shot)
            layer_info["generation_priority"] = self._calculate_generation_priority(layer_name, shot)
        
        return {
            "layer_system": "L0_to_L8",
            "total_layers": 9,
            "layers": layers,
            "depth_sorting": sorted(layers.keys(), key=lambda x: layers[x]["depth"], reverse=True),
            "character_distribution": self._analyze_character_layer_distribution(layers, characters)
        }
    
    # Helper methods for calculations
    
    def _determine_composition_grid(self, composition: Dict[str, Any]) -> str:
        """Determine which composition grid to use."""
        rule_type = composition.get("rule_of_thirds", "standard")
        if rule_type == "portrait":
            return "golden_ratio"
        return "rule_of_thirds"
    
    def _calculate_frame_boundaries(self, shot_type: Dict[str, Any], composition: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate frame boundaries based on shot type."""
        tightness = composition["framing"]["tightness"]
        
        boundaries = {
            "very_loose": {"margin": 0.1, "crop_factor": 0.8},
            "loose": {"margin": 0.08, "crop_factor": 0.85},
            "medium": {"margin": 0.05, "crop_factor": 0.9},
            "tight": {"margin": 0.03, "crop_factor": 0.95},
            "very_tight": {"margin": 0.01, "crop_factor": 0.98}
        }
        
        return boundaries.get(tightness, boundaries["medium"])
    
    def _calculate_focal_areas(self, composition: Dict[str, Any], grid_type: str) -> List[Dict[str, Any]]:
        """Calculate focal areas based on composition grid."""
        grid = self.composition_grid[grid_type]
        focal_point = composition["focal_point"]
        
        focal_areas = []
        
        # Primary focal area
        if focal_point == "character_face":
            focal_areas.append({
                "area_type": "primary",
                "coordinates": grid["intersection_points"][0],  # Upper left intersection
                "size": "medium",
                "importance": "high"
            })
        elif focal_point == "character_body":
            focal_areas.append({
                "area_type": "primary",
                "coordinates": (0.5, 0.6),  # Center-lower
                "size": "large",
                "importance": "high"
            })
        else:  # Environmental or landscape
            focal_areas.append({
                "area_type": "primary",
                "coordinates": (0.5, 0.5),  # Center
                "size": "large",
                "importance": "medium"
            })
        
        return focal_areas
    
    def _determine_character_depth(self, character: Dict[str, Any], shot_type: Dict[str, Any]) -> str:
        """Determine character depth layer based on visibility and shot type."""
        visibility = character["visibility"]
        positioning = character.get("positioning", {})
        
        if visibility == "primary_focus":
            return "foreground"
        elif visibility == "prominent":
            return "midground"
        elif visibility == "present":
            depth_placement = positioning.get("depth_placement", "background")
            # Handle the 'integrated' case from the test data
            if depth_placement == "integrated":
                return "background"
            return depth_placement
        else:
            return "background"
    
    def _calculate_character_screen_position(self, character: Dict[str, Any], composition: Dict[str, Any], shot_type: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate character screen position."""
        positioning = character.get("positioning", {})
        screen_pos = positioning.get("screen_position", "center")
        
        positions = {
            "center": {"x": 0.5, "y": 0.5},
            "offset": {"x": 0.6, "y": 0.4},
            "left": {"x": 0.3, "y": 0.5},
            "right": {"x": 0.7, "y": 0.5}
        }
        
        return positions.get(screen_pos, positions["center"])
    
    def _calculate_character_scale(self, shot_type: Dict[str, Any], depth_layer: str) -> float:
        """Calculate character scale based on shot type and depth."""
        shot_code = shot_type["code"]
        depth_scales = self.puppet_positions[depth_layer]["scale"]
        
        # Adjust scale based on shot type
        shot_scale_modifiers = {
            "ELS": 0.3,
            "LS": 0.6,
            "FS": 0.8,
            "MCU": 1.2,
            "CU": 1.5,
            "ECU": 2.0
        }
        
        base_scale = depth_scales
        shot_modifier = shot_scale_modifiers.get(shot_code, 1.0)
        
        return base_scale * shot_modifier
    
    def _generate_pose_requirements(self, character: Dict[str, Any], shot_type: Dict[str, Any]) -> Dict[str, Any]:
        """Generate pose requirements for character."""
        performance_reqs = character.get("performance_requirements", [])
        shot_code = shot_type["code"]
        
        pose_requirements = {
            "body_visibility": self._determine_body_visibility(shot_code),
            "face_visibility": self._determine_face_visibility(shot_code),
            "hand_visibility": self._determine_hand_visibility(shot_code),
            "performance_actions": performance_reqs,
            "pose_energy": self._determine_pose_energy(performance_reqs),
            "eye_contact": "direct" if shot_code in ["CU", "ECU"] else "natural"
        }
        
        return pose_requirements
    
    def _calculate_interaction_zones(self, puppet_placements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate interaction zones between characters."""
        zones = []
        
        for i, char1 in enumerate(puppet_placements):
            for j, char2 in enumerate(puppet_placements[i+1:], i+1):
                # Calculate interaction zone between two characters
                pos1 = char1["screen_position"]
                pos2 = char2["screen_position"]
                
                # Calculate midpoint
                mid_x = (pos1["x"] + pos2["x"]) / 2
                mid_y = (pos1["y"] + pos2["y"]) / 2
                
                zones.append({
                    "zone_type": "character_interaction",
                    "characters": [char1["character_id"], char2["character_id"]],
                    "center_point": {"x": mid_x, "y": mid_y},
                    "interaction_strength": self._calculate_interaction_strength(char1, char2)
                })
        
        return zones
    
    def _calculate_framing_box(self, shot_type: Dict[str, Any], composition: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate framing box coordinates."""
        boundaries = self._calculate_frame_boundaries(shot_type, composition)
        margin = boundaries["margin"]
        
        return {
            "top_left": {"x": margin, "y": margin},
            "bottom_right": {"x": 1.0 - margin, "y": 1.0 - margin},
            "width": 1.0 - (2 * margin),
            "height": 1.0 - (2 * margin)
        }
    
    def _calculate_safe_area(self) -> Dict[str, Any]:
        """Calculate broadcast safe area (90% of frame)."""
        margin = 0.05
        return {
            "top_left": {"x": margin, "y": margin},
            "bottom_right": {"x": 1.0 - margin, "y": 1.0 - margin},
            "width": 0.9,
            "height": 0.9
        }
    
    def _calculate_rule_of_thirds_grid(self) -> Dict[str, Any]:
        """Calculate rule of thirds grid lines."""
        grid = self.composition_grid["rule_of_thirds"]
        return {
            "horizontal_lines": [
                {"y": grid["horizontal_lines"][0], "x1": 0, "x2": 1},
                {"y": grid["horizontal_lines"][1], "x1": 0, "x2": 1}
            ],
            "vertical_lines": [
                {"x": grid["vertical_lines"][0], "y1": 0, "y2": 1},
                {"x": grid["vertical_lines"][1], "y1": 0, "y2": 1}
            ],
            "intersection_points": grid["intersection_points"]
        }
    
    def _calculate_center_cross(self) -> Dict[str, Any]:
        """Calculate center cross coordinates."""
        return {
            "horizontal_line": {"y": 0.5, "x1": 0.4, "x2": 0.6},
            "vertical_line": {"x": 0.5, "y1": 0.4, "y2": 0.6}
        }
    
    def _generate_camera_movement_guides(self, movement: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate camera movement guide elements."""
        guides = []
        
        if movement["type"] != "static":
            guides.append({
                "guide_type": "movement_path",
                "properties": {"color": "#FF4500", "style": "arrow", "opacity": 0.8},
                "movement_type": movement["type"],
                "path": self._calculate_movement_path(movement),
                "purpose": f"Camera {movement['type']} indicator"
            })
        
        return guides
    
    def _calculate_light_position(self, direction: str) -> Dict[str, Any]:
        """Calculate light position based on direction."""
        positions = {
            "right": {"x": 0.8, "y": 0.3},
            "left": {"x": 0.2, "y": 0.3},
            "overhead": {"x": 0.5, "y": 0.1},
            "up": {"x": 0.5, "y": 0.8},
            "front": {"x": 0.5, "y": 0.5}
        }
        
        return positions.get(direction, positions["front"])
    
    def _calculate_rim_light_position(self) -> Dict[str, Any]:
        """Calculate rim light position (typically behind subject)."""
        return {"x": 0.8, "y": 0.2}
    
    def _calculate_camera_movement_direction(self, movement: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate camera movement direction vector."""
        movement_type = movement["type"]
        
        directions = {
            "pan-right": {"start": {"x": 0.3, "y": 0.5}, "end": {"x": 0.7, "y": 0.5}},
            "pan-left": {"start": {"x": 0.7, "y": 0.5}, "end": {"x": 0.3, "y": 0.5}},
            "dolly-in": {"start": {"x": 0.5, "y": 0.8}, "end": {"x": 0.5, "y": 0.2}},
            "dolly-out": {"start": {"x": 0.5, "y": 0.2}, "end": {"x": 0.5, "y": 0.8}},
            "tilt-up": {"start": {"x": 0.5, "y": 0.7}, "end": {"x": 0.5, "y": 0.3}},
            "tilt-down": {"start": {"x": 0.5, "y": 0.3}, "end": {"x": 0.5, "y": 0.7}}
        }
        
        return directions.get(movement_type, {"start": {"x": 0.5, "y": 0.5}, "end": {"x": 0.5, "y": 0.5}})
    
    def _calculate_character_movement_direction(self, character: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate character movement direction."""
        # Default to minimal movement for storyboard
        return {"start": {"x": 0.5, "y": 0.5}, "end": {"x": 0.52, "y": 0.48}}
    
    def _calculate_gaze_direction(self, character: Dict[str, Any], shot: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate character gaze direction."""
        # Default gaze toward camera for close-ups
        char_pos = character.get("positioning", {}).get("screen_position", "center")
        
        if char_pos == "left":
            return {"from": {"x": 0.3, "y": 0.5}, "to": {"x": 0.6, "y": 0.4}}
        elif char_pos == "right":
            return {"from": {"x": 0.7, "y": 0.5}, "to": {"x": 0.4, "y": 0.4}}
        else:
            return {"from": {"x": 0.5, "y": 0.5}, "to": {"x": 0.5, "y": 0.3}}
    
    def _calculate_layer_relevance(self, layer_name: str, shot: Dict[str, Any]) -> float:
        """Calculate how relevant each layer is for this shot."""
        shot_code = shot["shot_type"]["code"]
        
        # Layer relevance based on shot type
        relevance_map = {
            "ELS": {"L0_background": 1.0, "L1_far_background": 0.9, "L2_mid_background": 0.8, "L3_background_characters": 0.6, "L4_midground": 0.7, "L5_main_characters": 0.5, "L6_foreground_characters": 0.3, "L7_foreground_props": 0.2, "L8_effects": 0.4},
            "LS": {"L0_background": 0.8, "L1_far_background": 0.7, "L2_mid_background": 0.9, "L3_background_characters": 0.7, "L4_midground": 0.9, "L5_main_characters": 0.8, "L6_foreground_characters": 0.4, "L7_foreground_props": 0.3, "L8_effects": 0.5},
            "FS": {"L0_background": 0.6, "L1_far_background": 0.5, "L2_mid_background": 0.7, "L3_background_characters": 0.6, "L4_midground": 0.8, "L5_main_characters": 1.0, "L6_foreground_characters": 0.5, "L7_foreground_props": 0.4, "L8_effects": 0.6},
            "MCU": {"L0_background": 0.4, "L1_far_background": 0.3, "L2_mid_background": 0.4, "L3_background_characters": 0.3, "L4_midground": 0.5, "L5_main_characters": 1.0, "L6_foreground_characters": 0.8, "L7_foreground_props": 0.6, "L8_effects": 0.7},
            "CU": {"L0_background": 0.2, "L1_far_background": 0.1, "L2_mid_background": 0.2, "L3_background_characters": 0.1, "L4_midground": 0.3, "L5_main_characters": 0.8, "L6_foreground_characters": 1.0, "L7_foreground_props": 0.8, "L8_effects": 0.9},
            "ECU": {"L0_background": 0.1, "L1_far_background": 0.05, "L2_mid_background": 0.1, "L3_background_characters": 0.05, "L4_midground": 0.2, "L5_main_characters": 0.6, "L6_foreground_characters": 1.0, "L7_foreground_props": 0.9, "L8_effects": 1.0}
        }
        
        return relevance_map.get(shot_code, {}).get(layer_name, 0.5)
    
    def _calculate_generation_priority(self, layer_name: str, shot: Dict[str, Any]) -> int:
        """Calculate generation priority for each layer (1=highest, 9=lowest)."""
        relevance = self._calculate_layer_relevance(layer_name, shot)
        
        # Convert relevance to priority (inverse relationship)
        if relevance >= 0.9:
            return 1
        elif relevance >= 0.7:
            return 2
        elif relevance >= 0.5:
            return 3
        elif relevance >= 0.3:
            return 4
        else:
            return 5
    
    def _analyze_character_layer_distribution(self, layers: Dict[str, Any], characters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze how characters are distributed across layers."""
        distribution = {}
        
        for layer_name, layer_info in layers.items():
            if layer_info["layer_type"] == "character":
                char_count = len(layer_info.get("characters", []))
                distribution[layer_name] = char_count
        
        return {
            "layer_distribution": distribution,
            "total_characters": len(characters),
            "primary_character_layer": max(distribution.keys(), key=lambda k: distribution[k]) if distribution else None
        }
    
    # Additional helper methods
    
    def _determine_body_visibility(self, shot_code: str) -> str:
        """Determine body visibility based on shot type."""
        visibility_map = {
            "ELS": "full_body",
            "LS": "full_body", 
            "FS": "full_body",
            "MCU": "torso_up",
            "CU": "shoulders_up",
            "ECU": "face_only"
        }
        return visibility_map.get(shot_code, "full_body")
    
    def _determine_face_visibility(self, shot_code: str) -> str:
        """Determine face visibility based on shot type."""
        visibility_map = {
            "ELS": "distant",
            "LS": "small",
            "FS": "clear",
            "MCU": "prominent",
            "CU": "detailed",
            "ECU": "extreme_detail"
        }
        return visibility_map.get(shot_code, "clear")
    
    def _determine_hand_visibility(self, shot_code: str) -> str:
        """Determine hand visibility based on shot type."""
        visibility_map = {
            "ELS": "not_visible",
            "LS": "small",
            "FS": "visible",
            "MCU": "prominent",
            "CU": "detailed",
            "ECU": "not_in_frame"
        }
        return visibility_map.get(shot_code, "visible")
    
    def _determine_pose_energy(self, performance_reqs: List[str]) -> str:
        """Determine pose energy level based on performance requirements."""
        if any("dynamic" in req for req in performance_reqs):
            return "high"
        elif any("movement" in req for req in performance_reqs):
            return "medium"
        else:
            return "low"
    
    def _calculate_interaction_strength(self, char1: Dict[str, Any], char2: Dict[str, Any]) -> float:
        """Calculate interaction strength between two characters."""
        # Base interaction on screen time and positioning
        screen_time_factor = (char1["screen_time_ratio"] + char2["screen_time_ratio"]) / 2
        
        # Distance factor (closer = stronger interaction)
        pos1 = char1["screen_position"]
        pos2 = char2["screen_position"]
        distance = ((pos1["x"] - pos2["x"])**2 + (pos1["y"] - pos2["y"])**2)**0.5
        distance_factor = max(0, 1.0 - distance)
        
        return (screen_time_factor + distance_factor) / 2
    
    def _calculate_movement_path(self, movement: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate movement path for camera movement guides."""
        movement_type = movement["type"]
        
        paths = {
            "pan-right": {"type": "horizontal", "direction": "right", "length": 0.4},
            "pan-left": {"type": "horizontal", "direction": "left", "length": 0.4},
            "dolly-in": {"type": "vertical", "direction": "forward", "length": 0.6},
            "dolly-out": {"type": "vertical", "direction": "backward", "length": 0.6},
            "tilt-up": {"type": "vertical", "direction": "up", "length": 0.4},
            "tilt-down": {"type": "vertical", "direction": "down", "length": 0.4}
        }
        
        return paths.get(movement_type, {"type": "static", "direction": "none", "length": 0})
    
    def _generate_visual_composition_rules(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate global visual composition rules from all frames."""
        
        # Analyze composition patterns across frames
        composition_types = [frame["visual_composition"]["composition_type"] for frame in storyboard_frames]
        focal_points = [frame["visual_composition"]["focal_areas"] for frame in storyboard_frames]
        
        # Calculate composition consistency
        most_common_composition = max(set(composition_types), key=composition_types.count)
        composition_consistency = composition_types.count(most_common_composition) / len(composition_types)
        
        return {
            "primary_composition_system": most_common_composition,
            "composition_consistency_score": composition_consistency,
            "total_frames_analyzed": len(storyboard_frames),
            "composition_distribution": {comp: composition_types.count(comp) for comp in set(composition_types)},
            "visual_rhythm": self._analyze_visual_rhythm(storyboard_frames),
            "framing_progression": self._analyze_framing_progression(storyboard_frames)
        }
    
    def _generate_puppet_placement_system(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate global puppet placement system from all frames."""
        
        all_placements = []
        character_consistency = {}
        
        for frame in storyboard_frames:
            puppet_placement = frame["puppet_placement"]
            all_placements.extend(puppet_placement["character_placements"])
            
            # Track character consistency
            for placement in puppet_placement["character_placements"]:
                char_id = placement["character_id"]
                if char_id not in character_consistency:
                    character_consistency[char_id] = []
                character_consistency[char_id].append(placement)
        
        return {
            "total_character_placements": len(all_placements),
            "unique_characters": len(character_consistency),
            "character_consistency_analysis": self._analyze_character_consistency(character_consistency),
            "depth_layer_usage": self._analyze_depth_layer_usage(all_placements),
            "puppet_scale_progression": self._analyze_puppet_scale_progression(all_placements)
        }
    
    def _generate_camera_guide_system(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate global camera guide system from all frames."""
        
        all_guides = []
        camera_movements = []
        
        for frame in storyboard_frames:
            camera_guides = frame["camera_guides"]
            all_guides.extend(camera_guides["guide_elements"])
            camera_movements.append(camera_guides["camera_movement"])
        
        return {
            "total_guide_elements": len(all_guides),
            "guide_type_distribution": self._analyze_guide_distribution(all_guides),
            "camera_movement_analysis": self._analyze_camera_movements(camera_movements),
            "lens_usage_pattern": self._analyze_lens_usage(storyboard_frames)
        }
    
    def _generate_lighting_guide_system(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate global lighting guide system from all frames."""
        
        all_lighting = []
        lighting_consistency = []
        
        for frame in storyboard_frames:
            lighting_guides = frame["lighting_guides"]
            all_lighting.extend(lighting_guides["lighting_elements"])
            lighting_consistency.append(lighting_guides["lighting_motivation"])
        
        return {
            "total_lighting_elements": len(all_lighting),
            "lighting_consistency_score": self._calculate_lighting_consistency(lighting_consistency),
            "primary_lighting_setup": self._determine_primary_lighting_setup(all_lighting),
            "lighting_progression": self._analyze_lighting_progression(storyboard_frames)
        }
    
    def _generate_motion_system(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate global motion system from all frames."""
        
        all_motion = []
        energy_levels = []
        
        for frame in storyboard_frames:
            motion_arrows = frame["motion_arrows"]
            all_motion.extend(motion_arrows["motion_elements"])
            energy_levels.append(motion_arrows["overall_energy"])
        
        return {
            "total_motion_elements": len(all_motion),
            "motion_type_distribution": self._analyze_motion_distribution(all_motion),
            "energy_progression": energy_levels,
            "average_energy_level": sum([self._energy_to_numeric(e) for e in energy_levels]) / len(energy_levels) if energy_levels else 0
        }
    
    def _generate_annotation_system(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate global annotation system from all frames."""
        
        all_annotations = []
        
        for frame in storyboard_frames:
            annotations = frame["annotations"]
            all_annotations.extend(annotations["annotation_elements"])
        
        return {
            "total_annotations": len(all_annotations),
            "annotation_type_distribution": self._analyze_annotation_distribution(all_annotations),
            "annotation_density": len(all_annotations) / len(storyboard_frames) if storyboard_frames else 0
        }
    
    def _generate_layer_placeholders(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate global layer placeholder system from all frames."""
        
        layer_usage = {}
        character_layer_distribution = {}
        
        for frame in storyboard_frames:
            layer_placeholders = frame["layer_placeholders"]
            layers = layer_placeholders["layers"]
            
            for layer_name, layer_info in layers.items():
                if layer_name not in layer_usage:
                    layer_usage[layer_name] = 0
                layer_usage[layer_name] += layer_info["shot_relevance"]
                
                # Track character distribution
                if layer_info["layer_type"] == "character" and "characters" in layer_info:
                    for char in layer_info["characters"]:
                        char_id = char["character_id"]
                        if char_id not in character_layer_distribution:
                            character_layer_distribution[char_id] = {}
                        if layer_name not in character_layer_distribution[char_id]:
                            character_layer_distribution[char_id][layer_name] = 0
                        character_layer_distribution[char_id][layer_name] += 1
        
        return {
            "layer_system": "L0_to_L8",
            "total_layers": 9,
            "layer_usage_analysis": layer_usage,
            "character_layer_distribution": character_layer_distribution,
            "most_used_layers": sorted(layer_usage.keys(), key=lambda x: layer_usage[x], reverse=True)[:5],
            "generation_priority_order": self._calculate_global_generation_priority(layer_usage)
        }
    
    def _calculate_composition_complexity(self, storyboard_frames: List[Dict[str, Any]]) -> float:
        """Calculate overall composition complexity score."""
        complexity_scores = []
        
        for frame in storyboard_frames:
            # Factors that increase complexity
            puppet_count = frame["puppet_placement"]["total_characters"]
            guide_count = frame["camera_guides"]["total_guides"]
            lighting_count = frame["lighting_guides"]["total_lighting_elements"]
            motion_count = frame["motion_arrows"]["total_motion_elements"]
            
            # Calculate complexity (normalized to 0-5 scale)
            frame_complexity = min(5.0, (puppet_count * 0.5 + guide_count * 0.2 + lighting_count * 0.2 + motion_count * 0.3))
            complexity_scores.append(frame_complexity)
        
        return sum(complexity_scores) / len(complexity_scores) if complexity_scores else 0.0
    
    def _count_total_puppets(self, storyboard_frames: List[Dict[str, Any]]) -> int:
        """Count total unique puppets across all frames."""
        all_characters = set()
        
        for frame in storyboard_frames:
            for placement in frame["puppet_placement"]["character_placements"]:
                all_characters.add(placement["character_id"])
        
        return len(all_characters)
    
    def _calculate_visual_consistency(self, storyboard_frames: List[Dict[str, Any]]) -> float:
        """Calculate visual consistency score across frames."""
        if len(storyboard_frames) < 2:
            return 5.0
        
        consistency_factors = []
        
        # Check composition consistency
        composition_types = [frame["visual_composition"]["composition_type"] for frame in storyboard_frames]
        most_common = max(set(composition_types), key=composition_types.count)
        composition_consistency = composition_types.count(most_common) / len(composition_types)
        consistency_factors.append(composition_consistency)
        
        # Check lighting consistency
        lighting_motivations = [frame["lighting_guides"]["lighting_motivation"] for frame in storyboard_frames]
        unique_motivations = len(set(lighting_motivations))
        lighting_consistency = 1.0 - (unique_motivations - 1) / len(storyboard_frames)
        consistency_factors.append(max(0, lighting_consistency))
        
        # Check character consistency (same characters appearing in similar positions)
        character_consistency = self._calculate_character_position_consistency(storyboard_frames)
        consistency_factors.append(character_consistency)
        
        # Average all consistency factors and scale to 5.0
        average_consistency = sum(consistency_factors) / len(consistency_factors)
        return average_consistency * 5.0
    
    def _update_project_with_storyboard(self, project_path: Path, storyboard_metadata: Dict[str, Any]) -> None:
        """Update project.json with storyboard processing results."""
        project_file = project_path / "project.json"
        
        if project_file.exists():
            with open(project_file, 'r') as f:
                project_data = json.load(f)
        else:
            project_data = {"schema_version": "1.0"}
        
        # Update project status and metadata
        project_data["generation_status"] = project_data.get("generation_status", {})
        project_data["generation_status"]["storyboard"] = "done"
        
        project_data["processing_results"] = project_data.get("processing_results", {})
        project_data["processing_results"]["storyboard_visual"] = {
            "storyboard_id": storyboard_metadata["storyboard_id"],
            "total_frames": storyboard_metadata["processing_metadata"]["total_frames"],
            "composition_complexity": storyboard_metadata["processing_metadata"]["composition_complexity"],
            "puppet_count": storyboard_metadata["processing_metadata"]["puppet_count"],
            "visual_consistency_score": storyboard_metadata["processing_metadata"]["visual_consistency_score"],
            "processed_at": storyboard_metadata["created_at"]
        }
        
        # Update capabilities
        project_data["capabilities"] = project_data.get("capabilities", {})
        project_data["capabilities"]["storyboard_engine"] = True
        
        # Save updated project data
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)
    
    # Additional analysis helper methods
    
    def _analyze_visual_rhythm(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze visual rhythm across frames."""
        shot_durations = []
        energy_levels = []
        
        for frame in storyboard_frames:
            timing = frame["cinematic_metadata"]["timing"]
            shot_durations.append(timing["duration_seconds"])
            
            motion = frame["motion_arrows"]
            energy_levels.append(self._energy_to_numeric(motion["overall_energy"]))
        
        return {
            "average_shot_duration": sum(shot_durations) / len(shot_durations) if shot_durations else 0,
            "duration_variation": self._calculate_variation(shot_durations),
            "energy_progression": energy_levels,
            "rhythm_type": self._determine_rhythm_type(shot_durations)
        }
    
    def _analyze_framing_progression(self, storyboard_frames: List[Dict[str, Any]]) -> List[str]:
        """Analyze framing progression across frames."""
        shot_types = []
        
        for frame in storyboard_frames:
            shot_type = frame["cinematic_metadata"]["shot_type"]["code"]
            shot_types.append(shot_type)
        
        return shot_types
    
    def _analyze_character_consistency(self, character_consistency: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Analyze character consistency across frames."""
        consistency_scores = {}
        
        for char_id, placements in character_consistency.items():
            if len(placements) > 1:
                # Check scale consistency
                scales = [p["character_scale"] for p in placements]
                scale_variation = self._calculate_variation(scales)
                
                # Check position consistency
                positions = [p["screen_position"] for p in placements]
                position_variation = self._calculate_position_variation(positions)
                
                consistency_scores[char_id] = {
                    "scale_consistency": 1.0 - min(1.0, scale_variation),
                    "position_consistency": 1.0 - min(1.0, position_variation),
                    "appearance_count": len(placements)
                }
        
        return consistency_scores
    
    def _analyze_depth_layer_usage(self, all_placements: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze depth layer usage across all placements."""
        layer_counts = {}
        
        for placement in all_placements:
            layer = placement["depth_layer"]
            layer_counts[layer] = layer_counts.get(layer, 0) + 1
        
        return layer_counts
    
    def _analyze_puppet_scale_progression(self, all_placements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze puppet scale progression."""
        scales = [p["character_scale"] for p in all_placements]
        
        return {
            "min_scale": min(scales) if scales else 0,
            "max_scale": max(scales) if scales else 0,
            "average_scale": sum(scales) / len(scales) if scales else 0,
            "scale_variation": self._calculate_variation(scales)
        }
    
    def _analyze_guide_distribution(self, all_guides: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze guide type distribution."""
        guide_counts = {}
        
        for guide in all_guides:
            guide_type = guide["guide_type"]
            guide_counts[guide_type] = guide_counts.get(guide_type, 0) + 1
        
        return guide_counts
    
    def _analyze_camera_movements(self, camera_movements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze camera movement patterns."""
        movement_types = [m["type"] for m in camera_movements]
        movement_counts = {}
        
        for movement in movement_types:
            movement_counts[movement] = movement_counts.get(movement, 0) + 1
        
        return {
            "movement_distribution": movement_counts,
            "static_ratio": movement_counts.get("static", 0) / len(movement_types) if movement_types else 0,
            "dynamic_ratio": 1.0 - (movement_counts.get("static", 0) / len(movement_types) if movement_types else 0)
        }
    
    def _analyze_lens_usage(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze lens usage patterns."""
        lens_counts = {}
        
        for frame in storyboard_frames:
            lens_type = frame["cinematic_metadata"]["lens_type"]["type"]
            lens_counts[lens_type] = lens_counts.get(lens_type, 0) + 1
        
        return lens_counts
    
    def _calculate_lighting_consistency(self, lighting_motivations: List[str]) -> float:
        """Calculate lighting consistency score."""
        unique_motivations = len(set(lighting_motivations))
        total_motivations = len(lighting_motivations)
        
        if total_motivations == 0:
            return 1.0
        
        # Higher consistency when fewer unique motivations
        consistency = 1.0 - (unique_motivations - 1) / total_motivations
        return max(0.0, consistency)
    
    def _determine_primary_lighting_setup(self, all_lighting: List[Dict[str, Any]]) -> str:
        """Determine primary lighting setup."""
        light_types = [light["light_type"] for light in all_lighting]
        
        if not light_types:
            return "natural"
        
        most_common = max(set(light_types), key=light_types.count)
        return most_common
    
    def _analyze_lighting_progression(self, storyboard_frames: List[Dict[str, Any]]) -> List[str]:
        """Analyze lighting progression across frames."""
        lighting_progression = []
        
        for frame in storyboard_frames:
            lighting = frame["lighting_guides"]
            primary_light = next((l for l in lighting["lighting_elements"] if l["light_type"] == "key_light"), None)
            if primary_light:
                lighting_progression.append(primary_light["color_temperature"])
            else:
                lighting_progression.append("neutral")
        
        return lighting_progression
    
    def _analyze_motion_distribution(self, all_motion: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze motion type distribution."""
        motion_counts = {}
        
        for motion in all_motion:
            motion_type = motion["motion_type"]
            motion_counts[motion_type] = motion_counts.get(motion_type, 0) + 1
        
        return motion_counts
    
    def _energy_to_numeric(self, energy_level: str) -> float:
        """Convert energy level string to numeric value."""
        energy_map = {
            "calm": 1.0,
            "low": 1.5,
            "moderate": 2.5,
            "medium": 3.0,
            "building": 3.5,
            "high": 4.0,
            "intense": 5.0
        }
        return energy_map.get(energy_level, 2.5)
    
    def _analyze_annotation_distribution(self, all_annotations: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze annotation type distribution."""
        annotation_counts = {}
        
        for annotation in all_annotations:
            annotation_type = annotation["annotation_type"]
            annotation_counts[annotation_type] = annotation_counts.get(annotation_type, 0) + 1
        
        return annotation_counts
    
    def _calculate_global_generation_priority(self, layer_usage: Dict[str, float]) -> List[str]:
        """Calculate global generation priority order for layers."""
        # Sort layers by usage (highest usage = highest priority)
        sorted_layers = sorted(layer_usage.keys(), key=lambda x: layer_usage[x], reverse=True)
        return sorted_layers
    
    def _calculate_variation(self, values: List[float]) -> float:
        """Calculate variation coefficient for a list of values."""
        if len(values) < 2:
            return 0.0
        
        mean_val = sum(values) / len(values)
        if mean_val == 0:
            return 0.0
        
        variance = sum((x - mean_val) ** 2 for x in values) / len(values)
        std_dev = variance ** 0.5
        
        return std_dev / mean_val
    
    def _calculate_position_variation(self, positions: List[Dict[str, float]]) -> float:
        """Calculate position variation for character placements."""
        if len(positions) < 2:
            return 0.0
        
        x_values = [pos["x"] for pos in positions]
        y_values = [pos["y"] for pos in positions]
        
        x_variation = self._calculate_variation(x_values)
        y_variation = self._calculate_variation(y_values)
        
        return (x_variation + y_variation) / 2
    
    def _determine_rhythm_type(self, shot_durations: List[float]) -> str:
        """Determine rhythm type based on shot durations."""
        if not shot_durations:
            return "static"
        
        variation = self._calculate_variation(shot_durations)
        
        if variation < 0.2:
            return "steady"
        elif variation < 0.5:
            return "moderate"
        else:
            return "dynamic"
    
    def _calculate_character_position_consistency(self, storyboard_frames: List[Dict[str, Any]]) -> float:
        """Calculate character position consistency across frames."""
        character_positions = {}
        
        # Collect all character positions
        for frame in storyboard_frames:
            for placement in frame["puppet_placement"]["character_placements"]:
                char_id = placement["character_id"]
                if char_id not in character_positions:
                    character_positions[char_id] = []
                character_positions[char_id].append(placement["screen_position"])
        
        # Calculate consistency for each character
        consistency_scores = []
        for char_id, positions in character_positions.items():
            if len(positions) > 1:
                variation = self._calculate_position_variation(positions)
                consistency = 1.0 - min(1.0, variation)
                consistency_scores.append(consistency)
        
        return sum(consistency_scores) / len(consistency_scores) if consistency_scores else 1.0