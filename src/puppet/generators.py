"""
Puppet & Layer Engine - Generation Methods
Handles puppet rig and layer file generation.
Part of the decomposed PuppetLayerEngine.
"""

from typing import Dict, List, Any
import hashlib


class PuppetLayerGenerators:
    """Generation methods for puppets and layers."""

    def _generate_frame_puppet_rigs(self, frame: Dict[str, Any], scene_breakdown: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate puppet rigs for all characters in a frame.

        Args:
            frame: Storyboard frame metadata
            scene_breakdown: Scene breakdown for character context

        Returns:
            List of puppet rig metadata
        """
        puppet_rigs = []

        # Extract character placements from frame
        character_placements = frame["puppet_placement"]["character_placements"]

        for placement in character_placements:
            character_id = placement["character_id"]

            # Determine puppet type based on character visibility and importance
            puppet_type = self._determine_puppet_type(placement, frame)

            # Generate puppet rig based on type
            puppet_rig = self._create_puppet_rig(character_id, puppet_type, placement, frame)

            puppet_rigs.append(puppet_rig)

        return puppet_rigs

    def _generate_frame_layer_files(self, frame: Dict[str, Any], scene_breakdown: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate layer files (L0-L8) for a frame.

        Args:
            frame: Storyboard frame metadata
            scene_breakdown: Scene breakdown for environment context

        Returns:
            List of layer file metadata
        """
        layer_files = []

        # Extract layer placeholders from frame
        layer_placeholders = frame["layer_placeholders"]["layers"]

        for layer_name, layer_info in layer_placeholders.items():
            # Generate layer file based on layer type and content
            layer_file = self._create_layer_file(layer_name, layer_info, frame, scene_breakdown)

            layer_files.append(layer_file)

        return layer_files

    def _determine_puppet_type(self, placement: Dict[str, Any], frame: Dict[str, Any]) -> str:
        """Determine puppet type (P1, P2, M1) based on character placement."""
        visibility = placement["visibility_level"]
        shot_type = frame["cinematic_metadata"]["shot_type"]["code"]

        # Primary characters in close shots get P1 (full rig)
        if visibility == "primary_focus" and shot_type in ["MCU", "CU", "ECU"]:
            return "P1_primary"

        # Prominent characters or primary in wide shots get P2 (standard rig)
        elif visibility in ["primary_focus", "prominent"] or shot_type in ["FS", "MCU"]:
            return "P2_secondary"

        # Background characters get M1 (minimal rig)
        else:
            return "M1_crowd"

    def _create_puppet_rig(self, character_id: str, puppet_type: str, placement: Dict[str, Any], frame: Dict[str, Any]) -> Dict[str, Any]:
        """Create a puppet rig with pose and control data."""

        puppet_config = self.puppet_system[puppet_type]

        # Generate unique rig ID
        rig_id = f"rig_{character_id}_{frame['frame_id']}_{puppet_type}"

        # Extract pose requirements
        pose_requirements = placement["pose_requirements"]

        # Generate pose data based on requirements
        pose_data = self._generate_pose_data(pose_requirements, puppet_config)

        # Generate control points for AI generation
        control_points = self._generate_control_points(pose_data, puppet_config, placement)

        # Generate reference data for character consistency
        reference_data = self._generate_character_reference_data(character_id, placement)

        puppet_rig = {
            "rig_id": rig_id,
            "character_id": character_id,
            "puppet_type": puppet_type,
            "frame_id": frame["frame_id"],
            "shot_id": frame["shot_id"],
            "puppet_configuration": puppet_config,
            "pose_data": pose_data,
            "control_points": control_points,
            "reference_data": reference_data,
            "screen_position": placement["screen_position"],
            "character_scale": placement["character_scale"],
            "depth_layer": placement["depth_layer"],
            "generation_priority": puppet_config["priority"],
            "comfyui_integration": {
                "controlnet_type": "openpose" if puppet_type != "M1_crowd" else "canny",
                "ip_adapter_weight": 0.8 if puppet_type == "P1_primary" else 0.6,
                "face_id_weight": 0.9 if puppet_type == "P1_primary" else 0.0,
                "pose_strength": 1.0 if puppet_type != "M1_crowd" else 0.5
            }
        }

        return puppet_rig

    def _create_layer_file(self, layer_name: str, layer_info: Dict[str, Any], frame: Dict[str, Any], scene_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """Create a layer file with visual content specifications."""

        layer_config = self.layer_system.get(layer_name, {})

        # Generate unique layer file ID
        layer_file_id = f"layer_{layer_name}_{frame['frame_id']}"

        # Generate visual content based on layer type
        visual_content = self._generate_layer_visual_content(layer_name, layer_info, frame, scene_breakdown)

        # Generate generation parameters for ComfyUI
        generation_params = self._generate_layer_generation_params(layer_name, layer_config, visual_content, frame)

        layer_file = {
            "layer_file_id": layer_file_id,
            "layer_name": layer_name,
            "frame_id": frame["frame_id"],
            "shot_id": frame["shot_id"],
            "layer_configuration": layer_config,
            "visual_content": visual_content,
            "generation_parameters": generation_params,
            "depth": layer_info["depth"],
            "opacity": layer_info["opacity"],
            "blend_mode": layer_info["blend_mode"],
            "shot_relevance": layer_info["shot_relevance"],
            "generation_priority": layer_info["generation_priority"],
            "comfyui_integration": {
                "conditioning_method": layer_config.get("conditioning", "text_prompt"),
                "resolution_priority": layer_config.get("resolution_priority", "medium"),
                "generation_method": layer_config.get("generation_method", "stable_diffusion"),
                "blend_mode": layer_config.get("blend_mode", "normal")
            }
        }

        return layer_file

    def _generate_pose_data(self, pose_requirements: Dict[str, Any], puppet_config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate pose data based on requirements and puppet configuration."""

        # Determine base pose template
        performance_actions = pose_requirements.get("performance_actions", [])

        if any("walking" in action for action in performance_actions):
            base_template = "walking_forward"
        elif any("sitting" in action for action in performance_actions):
            base_template = "sitting_relaxed"
        else:
            base_template = "standing_neutral"

        # Get base pose from template
        base_pose = self.pose_templates[base_template].copy()

        # Adjust pose based on requirements
        pose_energy = pose_requirements.get("pose_energy", "low")
        eye_contact = pose_requirements.get("eye_contact", "natural")

        # Generate pose points based on puppet complexity
        pose_points = self._generate_pose_points(base_pose, puppet_config, pose_requirements)

        pose_data = {
            "base_template": base_template,
            "pose_energy": pose_energy,
            "eye_contact": eye_contact,
            "body_visibility": pose_requirements.get("body_visibility", "full_body"),
            "face_visibility": pose_requirements.get("face_visibility", "clear"),
            "hand_visibility": pose_requirements.get("hand_visibility", "visible"),
            "pose_points": pose_points,
            "facial_landmarks": self._generate_facial_landmarks(puppet_config, pose_requirements),
            "hand_landmarks": self._generate_hand_landmarks(puppet_config, pose_requirements)
        }

        return pose_data

    def _generate_control_points(self, pose_data: Dict[str, Any], puppet_config: Dict[str, Any], placement: Dict[str, Any]) -> Dict[str, Any]:
        """Generate control points for AI generation."""

        control_points = {
            "pose_control": {
                "method": "controlnet_openpose",
                "strength": 1.0 if puppet_config["rig_complexity"] != "minimal" else 0.5,
                "pose_points": pose_data["pose_points"],
                "preprocessing": "openpose_full" if puppet_config["rig_complexity"] == "full" else "openpose_basic"
            },
            "face_control": {
                "method": "ip_adapter_face",
                "strength": 0.9 if puppet_config["rig_complexity"] == "full" else 0.0,
                "facial_landmarks": pose_data["facial_landmarks"],
                "face_id_embedding": f"face_embedding_{placement['character_id']}"
            },
            "depth_control": {
                "method": "controlnet_depth",
                "strength": 0.6,
                "depth_layer": placement["depth_layer"],
                "depth_map": f"depth_map_{placement['depth_layer']}"
            },
            "composition_control": {
                "method": "regional_prompting",
                "screen_position": placement["screen_position"],
                "character_scale": placement["character_scale"],
                "attention_mask": f"mask_{placement['character_id']}"
            }
        }

        return control_points

    def _generate_character_reference_data(self, character_id: str, placement: Dict[str, Any]) -> Dict[str, Any]:
        """Generate character reference data for consistency."""

        visual_requirements = placement.get("visual_requirements", {})

        reference_data = {
            "character_id": character_id,
            "reference_sheet_id": f"ref_sheet_{character_id}",
            "visual_consistency": {
                "face_shape": visual_requirements.get("face_shape", "oval"),
                "hair_style": visual_requirements.get("hair_style", "medium_length"),
                "hair_color": visual_requirements.get("hair_color", "brown"),
                "eye_color": visual_requirements.get("eye_color", "brown"),
                "skin_tone": visual_requirements.get("skin_tone", "medium"),
                "height": visual_requirements.get("height", "average"),
                "build": visual_requirements.get("build", "average")
            },
            "style_consistency": {
                "clothing_style": "casual_modern",
                "color_palette": ["#8B4513", "#F5DEB3", "#4682B4"],  # Brown, beige, blue
                "texture_preference": "natural_fabric"
            },
            "embedding_references": {
                "face_embedding": f"embeddings/face_{character_id}.pt",
                "style_embedding": f"embeddings/style_{character_id}.pt",
                "lora_reference": f"loras/character_{character_id}.safetensors"
            }
        }

        return reference_data

    def _generate_layer_visual_content(self, layer_name: str, layer_info: Dict[str, Any], frame: Dict[str, Any], scene_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visual content specifications for layer."""

        layer_type = layer_info["layer_type"]

        if layer_type == "environment":
            return self._generate_environment_content(layer_name, frame, scene_breakdown)
        elif layer_type == "character":
            return self._generate_character_layer_content(layer_name, layer_info, frame)
        elif layer_type == "props":
            return self._generate_props_content(layer_name, frame, scene_breakdown)
        elif layer_type == "effects":
            return self._generate_effects_content(layer_name, frame)
        else:
            return {"content_type": "generic", "description": layer_info["content"]}

    def _generate_environment_content(self, layer_name: str, frame: Dict[str, Any], scene_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """Generate environment layer content."""

        # Extract environment information from scene breakdown if available
        environment_type = "urban_street"  # Default
        time_of_day = "evening"  # Default

        if scene_breakdown and "detailed_scenes" in scene_breakdown:
            for scene in scene_breakdown["detailed_scenes"]:
                if scene["scene_id"] == frame["scene_id"]:
                    environment_type = scene["environment"]["type"]
                    time_of_day = scene["environment"]["time_of_day"]
                    break

        # Generate content based on layer depth
        if layer_name == "L0_background":
            content = {
                "content_type": "sky_background",
                "description": f"{time_of_day} sky with appropriate lighting and atmosphere",
                "elements": ["sky", "clouds", "atmospheric_perspective"],
                "lighting_conditions": time_of_day,
                "color_palette": ["#FF6B35", "#F7931E", "#FFD23F"] if time_of_day == "evening" else ["#87CEEB", "#E0F6FF", "#98D8E8"]
            }
        elif layer_name == "L1_far_background":
            content = {
                "content_type": "distant_environment",
                "description": f"Distant {environment_type} elements on horizon",
                "elements": ["distant_buildings", "horizon_line", "atmospheric_haze"],
                "depth_cues": ["atmospheric_perspective", "color_desaturation"],
                "detail_level": "low"
            }
        elif layer_name == "L2_mid_background":
            content = {
                "content_type": "midground_environment",
                "description": f"Mid-distance {environment_type} structures and elements",
                "elements": ["buildings", "street_elements", "environmental_details"],
                "depth_cues": ["size_perspective", "detail_reduction"],
                "detail_level": "medium"
            }
        elif layer_name == "L4_midground":
            content = {
                "content_type": "midground_props",
                "description": f"Midground props and set pieces in {environment_type}",
                "elements": ["street_furniture", "vehicles", "signage"],
                "interaction_potential": "medium",
                "detail_level": "high"
            }
        else:
            content = {
                "content_type": "generic_environment",
                "description": f"Environmental elements for {layer_name}",
                "elements": ["environmental_details"],
                "detail_level": "medium"
            }

        return content

    def _generate_character_layer_content(self, layer_name: str, layer_info: Dict[str, Any], frame: Dict[str, Any]) -> Dict[str, Any]:
        """Generate character layer content."""

        characters = layer_info.get("characters", [])

        content = {
            "content_type": "character_layer",
            "description": f"Character layer for {layer_name}",
            "character_count": len(characters),
            "characters": characters,
            "rendering_requirements": {
                "pose_accuracy": "high" if layer_name == "L6_foreground_characters" else "medium",
                "facial_detail": "high" if layer_name in ["L5_main_characters", "L6_foreground_characters"] else "low",
                "clothing_detail": "high" if layer_name != "L3_background_characters" else "low"
            },
            "interaction_level": "primary" if layer_name == "L5_main_characters" else "secondary"
        }

        return content

    def _generate_props_content(self, layer_name: str, frame: Dict[str, Any], scene_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """Generate props layer content."""

        content = {
            "content_type": "props_objects",
            "description": f"Foreground props and objects for {layer_name}",
            "elements": ["street_props", "interactive_objects", "environmental_details"],
            "interaction_potential": "high",
            "detail_level": "very_high",
            "depth_sorting": "foreground"
        }

        return content

    def _generate_effects_content(self, layer_name: str, frame: Dict[str, Any]) -> Dict[str, Any]:
        """Generate effects layer content."""

        lighting_guides = frame.get("lighting_guides", {})

        content = {
            "content_type": "lighting_effects",
            "description": "Lighting effects, particles, and atmospheric overlays",
            "elements": ["light_rays", "atmospheric_particles", "lens_effects"],
            "lighting_setup": lighting_guides.get("lighting_motivation", "natural_lighting"),
            "effect_intensity": "subtle",
            "blend_requirements": "overlay_multiply"
        }

        return content

    def _generate_layer_generation_params(self, layer_name: str, layer_config: Dict[str, Any], visual_content: Dict[str, Any], frame: Dict[str, Any]) -> Dict[str, Any]:
        """Generate ComfyUI generation parameters for layer."""

        # Base generation parameters
        generation_params = {
            "model": "stable_diffusion_xl",
            "steps": 30,
            "cfg_scale": 7.0,
            "sampler": "dpmpp_2m_karras",
            "scheduler": "karras",
            "seed": self._generate_layer_seed(layer_name, frame),
            "width": 1024,
            "height": 576,  # 16:9 aspect ratio
            "batch_size": 1
        }

        # Adjust parameters based on layer type and priority
        resolution_priority = layer_config.get("resolution_priority", "medium")

        if resolution_priority == "maximum":
            generation_params.update({
                "width": 1536,
                "height": 864,
                "steps": 40,
                "cfg_scale": 8.0
            })
        elif resolution_priority == "high":
            generation_params.update({
                "width": 1280,
                "height": 720,
                "steps": 35
            })
        elif resolution_priority == "low":
            generation_params.update({
                "width": 768,
                "height": 432,
                "steps": 25,
                "cfg_scale": 6.0
            })

        # Add conditioning parameters based on layer configuration
        conditioning = layer_config.get("conditioning", "text_prompt")

        if "controlnet" in conditioning:
            generation_params["controlnet"] = {
                "enabled": True,
                "type": "depth" if "depth" in conditioning else "lineart",
                "strength": 0.8,
                "preprocessing": True
            }

        if "ip_adapter" in conditioning:
            generation_params["ip_adapter"] = {
                "enabled": True,
                "weight": 0.7,
                "reference_image": f"reference_{layer_name}.jpg"
            }

        # Add prompt based on visual content
        generation_params["prompt"] = self._generate_layer_prompt(visual_content, frame)
        generation_params["negative_prompt"] = self._generate_negative_prompt(layer_name)

        return generation_params

    def _generate_pose_points(self, base_pose: Dict[str, Any], puppet_config: Dict[str, Any], pose_requirements: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate pose points based on puppet configuration."""

        pose_points = []
        num_points = puppet_config["pose_points"]

        # Generate basic pose points based on complexity
        if num_points >= 17:  # Full body pose (P1)
            pose_points = [
                {"joint": "nose", "x": 0.5, "y": 0.3, "confidence": 0.9},
                {"joint": "left_eye", "x": 0.48, "y": 0.28, "confidence": 0.9},
                {"joint": "right_eye", "x": 0.52, "y": 0.28, "confidence": 0.9},
                {"joint": "left_ear", "x": 0.46, "y": 0.3, "confidence": 0.8},
                {"joint": "right_ear", "x": 0.54, "y": 0.3, "confidence": 0.8},
                {"joint": "left_shoulder", "x": 0.4, "y": 0.45, "confidence": 0.9},
                {"joint": "right_shoulder", "x": 0.6, "y": 0.45, "confidence": 0.9},
                {"joint": "left_elbow", "x": 0.35, "y": 0.6, "confidence": 0.8},
                {"joint": "right_elbow", "x": 0.65, "y": 0.6, "confidence": 0.8},
                {"joint": "left_wrist", "x": 0.3, "y": 0.75, "confidence": 0.7},
                {"joint": "right_wrist", "x": 0.7, "y": 0.75, "confidence": 0.7},
                {"joint": "left_hip", "x": 0.45, "y": 0.8, "confidence": 0.9},
                {"joint": "right_hip", "x": 0.55, "y": 0.8, "confidence": 0.9},
                {"joint": "left_knee", "x": 0.43, "y": 1.1, "confidence": 0.8},
                {"joint": "right_knee", "x": 0.57, "y": 1.1, "confidence": 0.8},
                {"joint": "left_ankle", "x": 0.41, "y": 1.4, "confidence": 0.7},
                {"joint": "right_ankle", "x": 0.59, "y": 1.4, "confidence": 0.7}
            ]
        elif num_points >= 13:  # Standard pose (P2)
            pose_points = [
                {"joint": "head", "x": 0.5, "y": 0.3, "confidence": 0.9},
                {"joint": "neck", "x": 0.5, "y": 0.4, "confidence": 0.9},
                {"joint": "left_shoulder", "x": 0.4, "y": 0.45, "confidence": 0.9},
                {"joint": "right_shoulder", "x": 0.6, "y": 0.45, "confidence": 0.9},
                {"joint": "left_elbow", "x": 0.35, "y": 0.6, "confidence": 0.8},
                {"joint": "right_elbow", "x": 0.65, "y": 0.6, "confidence": 0.8},
                {"joint": "left_wrist", "x": 0.3, "y": 0.75, "confidence": 0.7},
                {"joint": "right_wrist", "x": 0.7, "y": 0.75, "confidence": 0.7},
                {"joint": "torso", "x": 0.5, "y": 0.65, "confidence": 0.9},
                {"joint": "left_hip", "x": 0.45, "y": 0.8, "confidence": 0.9},
                {"joint": "right_hip", "x": 0.55, "y": 0.8, "confidence": 0.9},
                {"joint": "left_knee", "x": 0.43, "y": 1.1, "confidence": 0.8},
                {"joint": "right_knee", "x": 0.57, "y": 1.1, "confidence": 0.8}
            ]
        else:  # Minimal pose (M1)
            pose_points = [
                {"joint": "head", "x": 0.5, "y": 0.3, "confidence": 0.7},
                {"joint": "torso", "x": 0.5, "y": 0.65, "confidence": 0.8},
                {"joint": "left_arm", "x": 0.4, "y": 0.6, "confidence": 0.6},
                {"joint": "right_arm", "x": 0.6, "y": 0.6, "confidence": 0.6},
                {"joint": "legs", "x": 0.5, "y": 1.0, "confidence": 0.7}
            ]

        return pose_points

    def _generate_facial_landmarks(self, puppet_config: Dict[str, Any], pose_requirements: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate facial landmarks based on puppet configuration."""

        facial_landmarks = []
        num_landmarks = puppet_config["facial_landmarks"]

        if num_landmarks >= 68:  # Full facial landmarks (P1)
            # Generate key facial landmarks for full face control
            facial_landmarks = [
                {"landmark": "left_eyebrow_outer", "x": 0.45, "y": 0.25, "confidence": 0.8},
                {"landmark": "left_eyebrow_inner", "x": 0.48, "y": 0.24, "confidence": 0.8},
                {"landmark": "right_eyebrow_inner", "x": 0.52, "y": 0.24, "confidence": 0.8},
                {"landmark": "right_eyebrow_outer", "x": 0.55, "y": 0.25, "confidence": 0.8},
                {"landmark": "left_eye_outer", "x": 0.46, "y": 0.28, "confidence": 0.9},
                {"landmark": "left_eye_inner", "x": 0.49, "y": 0.28, "confidence": 0.9},
                {"landmark": "right_eye_inner", "x": 0.51, "y": 0.28, "confidence": 0.9},
                {"landmark": "right_eye_outer", "x": 0.54, "y": 0.28, "confidence": 0.9},
                {"landmark": "nose_tip", "x": 0.5, "y": 0.32, "confidence": 0.9},
                {"landmark": "mouth_left", "x": 0.47, "y": 0.36, "confidence": 0.8},
                {"landmark": "mouth_right", "x": 0.53, "y": 0.36, "confidence": 0.8},
                {"landmark": "chin", "x": 0.5, "y": 0.4, "confidence": 0.8}
            ]
        elif num_landmarks >= 5:  # Basic facial landmarks (P2)
            facial_landmarks = [
                {"landmark": "left_eye", "x": 0.48, "y": 0.28, "confidence": 0.8},
                {"landmark": "right_eye", "x": 0.52, "y": 0.28, "confidence": 0.8},
                {"landmark": "nose", "x": 0.5, "y": 0.32, "confidence": 0.8},
                {"landmark": "mouth_left", "x": 0.47, "y": 0.36, "confidence": 0.7},
                {"landmark": "mouth_right", "x": 0.53, "y": 0.36, "confidence": 0.7}
            ]
        # M1 has no facial landmarks (num_landmarks = 0)

        return facial_landmarks

    def _generate_hand_landmarks(self, puppet_config: Dict[str, Any], pose_requirements: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate hand landmarks based on puppet configuration."""

        hand_landmarks = []
        num_landmarks = puppet_config["hand_landmarks"]

        if num_landmarks >= 21:  # Full hand landmarks (P1)
            # Generate basic hand landmarks for gesture control
            hand_landmarks = [
                {"landmark": "left_wrist", "x": 0.3, "y": 0.75, "confidence": 0.8},
                {"landmark": "left_thumb", "x": 0.28, "y": 0.73, "confidence": 0.7},
                {"landmark": "left_index", "x": 0.27, "y": 0.72, "confidence": 0.7},
                {"landmark": "right_wrist", "x": 0.7, "y": 0.75, "confidence": 0.8},
                {"landmark": "right_thumb", "x": 0.72, "y": 0.73, "confidence": 0.7},
                {"landmark": "right_index", "x": 0.73, "y": 0.72, "confidence": 0.7}
            ]
        elif num_landmarks >= 5:  # Basic hand landmarks (P2)
            hand_landmarks = [
                {"landmark": "left_hand", "x": 0.3, "y": 0.75, "confidence": 0.7},
                {"landmark": "right_hand", "x": 0.7, "y": 0.75, "confidence": 0.7}
            ]
        # M1 has no hand landmarks (num_landmarks = 0)

        return hand_landmarks

    def _generate_layer_seed(self, layer_name: str, frame: Dict[str, Any]) -> int:
        """Generate deterministic seed for layer generation."""

        # Create seed based on layer name and frame ID for reproducibility
        seed_string = f"{layer_name}_{frame['frame_id']}"
        seed_hash = hashlib.md5(seed_string.encode()).hexdigest()
        return int(seed_hash[:8], 16) % (2**31)

    def _generate_layer_prompt(self, visual_content: Dict[str, Any], frame: Dict[str, Any]) -> str:
        """Generate text prompt for layer generation."""

        content_type = visual_content["content_type"]
        description = visual_content["description"]

        # Base prompt from content
        prompt_parts = [description]

        # Add style and quality modifiers
        prompt_parts.extend([
            "cinematic lighting",
            "professional photography",
            "high detail",
            "sharp focus",
            "realistic"
        ])

        # Add specific modifiers based on content type
        if content_type == "character_layer":
            prompt_parts.extend([
                "detailed character",
                "consistent appearance",
                "natural pose"
            ])
        elif "environment" in content_type:
            prompt_parts.extend([
                "atmospheric perspective",
                "environmental detail",
                "natural lighting"
            ])
        elif content_type == "lighting_effects":
            prompt_parts.extend([
                "volumetric lighting",
                "atmospheric effects",
                "subtle particles"
            ])

        return ", ".join(prompt_parts)

    def _generate_negative_prompt(self, layer_name: str) -> str:
        """Generate negative prompt for layer generation."""

        negative_elements = [
            "blurry",
            "low quality",
            "distorted",
            "artifacts",
            "oversaturated",
            "cartoon",
            "anime",
            "unrealistic proportions"
        ]

        # Add layer-specific negative elements
        if "character" in layer_name:
            negative_elements.extend([
                "deformed hands",
                "extra limbs",
                "facial distortion",
                "inconsistent appearance"
            ])
        elif "background" in layer_name:
            negative_elements.extend([
                "cluttered",
                "distracting elements",
                "inconsistent perspective"
            ])

        return ", ".join(negative_elements)

    def _calculate_layer_complexity(self, layer_files: List[Dict[str, Any]]) -> float:
        """Calculate overall layer complexity score."""

        complexity_scores = []

        for layer_file in layer_files:
            # Factors that increase complexity
            resolution_priority = layer_file["comfyui_integration"]["resolution_priority"]
            conditioning_method = layer_file["comfyui_integration"]["conditioning_method"]

            # Calculate complexity score
            complexity = 1.0

            if resolution_priority == "maximum":
                complexity += 2.0
            elif resolution_priority == "high":
                complexity += 1.5
            elif resolution_priority == "medium":
                complexity += 1.0

            if "controlnet" in conditioning_method:
                complexity += 1.0
            if "ip_adapter" in conditioning_method:
                complexity += 0.5
            if "face_id" in conditioning_method:
                complexity += 0.5

            complexity_scores.append(min(5.0, complexity))

        return sum(complexity_scores) / len(complexity_scores) if complexity_scores else 0.0

    def _calculate_puppet_consistency(self, puppet_rigs: List[Dict[str, Any]]) -> float:
        """Calculate puppet consistency score across frames."""

        if len(puppet_rigs) < 2:
            return 5.0

        # Group by character
        character_rigs = {}
        for rig in puppet_rigs:
            char_id = rig["character_id"]
            if char_id not in character_rigs:
                character_rigs[char_id] = []
            character_rigs[char_id].append(rig)

        consistency_scores = []

        for char_id, rigs in character_rigs.items():
            if len(rigs) > 1:
                # Check reference data consistency
                ref_data_list = [rig["reference_data"]["visual_consistency"] for rig in rigs]

                # Calculate consistency based on visual requirements
                face_shapes = [ref["face_shape"] for ref in ref_data_list]
                hair_colors = [ref["hair_color"] for ref in ref_data_list]

                face_consistency = len(set(face_shapes)) == 1
                hair_consistency = len(set(hair_colors)) == 1

                char_consistency = (face_consistency + hair_consistency) / 2
                consistency_scores.append(char_consistency)

        average_consistency = sum(consistency_scores) / len(consistency_scores) if consistency_scores else 1.0
        return average_consistency * 5.0