"""
Puppet & Layer Engine - Stage 5 of 10-Stage Multimodal Pipeline
Generates puppet rigs and layer files (L0-L8) with metadata for AI generation.

Follows DOCUMENT 24 — GLOBAL PIPELINE ARCHI V2 and DOCUMENT 4 — STYLE & COHERENCE BIBL V2
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple
import hashlib


class PuppetLayerEngine:
    """Handles puppet rig generation and layer system creation."""
    
    def __init__(self):
        self.schema_version = "1.0"
        
        # Puppet system configuration (P1, P2, M1 character system)
        self.puppet_system = {
            "P1_primary": {
                "character_type": "primary_protagonist",
                "rig_complexity": "full",
                "pose_points": 17,  # Full body pose estimation
                "facial_landmarks": 68,
                "hand_landmarks": 21,
                "priority": 1
            },
            "P2_secondary": {
                "character_type": "secondary_character", 
                "rig_complexity": "standard",
                "pose_points": 13,  # Simplified body pose
                "facial_landmarks": 5,  # Key facial points only
                "hand_landmarks": 5,   # Basic hand pose
                "priority": 2
            },
            "M1_crowd": {
                "character_type": "background_multiple",
                "rig_complexity": "minimal",
                "pose_points": 5,   # Basic silhouette
                "facial_landmarks": 0,
                "hand_landmarks": 0,
                "priority": 3
            }
        }
        
        # Layer system L0-L8 configuration
        self.layer_system = {
            "L0_background": {
                "content_type": "environment_sky",
                "generation_method": "stable_diffusion",
                "conditioning": "text_prompt",
                "resolution_priority": "high",
                "blend_mode": "normal"
            },
            "L1_far_background": {
                "content_type": "environment_distant",
                "generation_method": "stable_diffusion", 
                "conditioning": "text_prompt + depth",
                "resolution_priority": "medium",
                "blend_mode": "normal"
            },
            "L2_mid_background": {
                "content_type": "environment_midground",
                "generation_method": "stable_diffusion",
                "conditioning": "text_prompt + depth + lineart",
                "resolution_priority": "high",
                "blend_mode": "normal"
            },
            "L3_background_characters": {
                "content_type": "character_background",
                "generation_method": "stable_diffusion",
                "conditioning": "text_prompt + controlnet_pose + ip_adapter",
                "resolution_priority": "medium",
                "blend_mode": "normal"
            },
            "L4_midground": {
                "content_type": "environment_props",
                "generation_method": "stable_diffusion",
                "conditioning": "text_prompt + depth + lineart",
                "resolution_priority": "high", 
                "blend_mode": "normal"
            },
            "L5_main_characters": {
                "content_type": "character_primary",
                "generation_method": "stable_diffusion",
                "conditioning": "text_prompt + controlnet_pose + ip_adapter + face_id",
                "resolution_priority": "maximum",
                "blend_mode": "normal"
            },
            "L6_foreground_characters": {
                "content_type": "character_foreground",
                "generation_method": "stable_diffusion", 
                "conditioning": "text_prompt + controlnet_pose + ip_adapter + face_id",
                "resolution_priority": "maximum",
                "blend_mode": "normal"
            },
            "L7_foreground_props": {
                "content_type": "props_objects",
                "generation_method": "stable_diffusion",
                "conditioning": "text_prompt + depth + lineart",
                "resolution_priority": "medium",
                "blend_mode": "normal"
            },
            "L8_effects": {
                "content_type": "lighting_effects",
                "generation_method": "stable_diffusion",
                "conditioning": "text_prompt + lighting_map",
                "resolution_priority": "low",
                "blend_mode": "overlay"
            }
        }
        
        # Pose metadata templates
        self.pose_templates = {
            "standing_neutral": {
                "body_pose": "upright",
                "arm_position": "relaxed_sides",
                "leg_position": "shoulder_width",
                "head_angle": "forward",
                "energy_level": "calm"
            },
            "walking_forward": {
                "body_pose": "slight_lean_forward",
                "arm_position": "natural_swing",
                "leg_position": "mid_stride",
                "head_angle": "forward",
                "energy_level": "moderate"
            },
            "sitting_relaxed": {
                "body_pose": "seated",
                "arm_position": "resting",
                "leg_position": "bent_comfortable",
                "head_angle": "slight_down",
                "energy_level": "low"
            }
        }
    
    def process_puppet_layer_generation(self, project_path: Path) -> Dict[str, Any]:
        """
        Process storyboard into puppet rigs and layer files.
        
        Args:
            project_path: Path to project directory
            
        Returns:
            Dict with puppet and layer metadata
        """
        # Load storyboard visual metadata
        storyboard_visual = self._load_storyboard_visual(project_path)
        if not storyboard_visual:
            raise FileNotFoundError("Storyboard visual not found. Run 'storycore storyboard' first.")
        
        # Load scene breakdown for additional context
        scene_breakdown = self._load_scene_breakdown(project_path)
        
        # Extract storyboard frames
        storyboard_frames = storyboard_visual["storyboard_frames"]
        
        # Process each frame into puppet rigs and layers
        puppet_rigs = []
        layer_files = []
        
        for frame in storyboard_frames:
            # Generate puppet rigs for this frame
            frame_puppet_rigs = self._generate_frame_puppet_rigs(frame, scene_breakdown)
            puppet_rigs.extend(frame_puppet_rigs)
            
            # Generate layer files for this frame
            frame_layer_files = self._generate_frame_layer_files(frame, scene_breakdown)
            layer_files.extend(frame_layer_files)
        
        # Generate pose metadata
        pose_metadata = self._generate_pose_metadata(puppet_rigs, storyboard_frames)
        
        # Generate camera metadata for ComfyUI integration
        camera_metadata = self._generate_camera_metadata(storyboard_frames)
        
        # Generate lighting metadata
        lighting_metadata = self._generate_lighting_metadata(storyboard_frames)
        
        # Generate motion metadata
        motion_metadata = self._generate_motion_metadata(storyboard_frames)
        
        # Generate audio markers for synchronization
        audio_markers = self._generate_audio_markers(storyboard_frames)
        
        # Create puppet layer metadata
        puppet_layer_metadata = {
            "puppet_layer_id": f"puppet_layer_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "schema_version": self.schema_version,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "source_storyboard_id": storyboard_visual["storyboard_id"],
            "puppet_rigs": puppet_rigs,
            "layer_files": layer_files,
            "pose_metadata": pose_metadata,
            "camera_metadata": camera_metadata,
            "lighting_metadata": lighting_metadata,
            "motion_metadata": motion_metadata,
            "audio_markers": audio_markers,
            "generation_control_structure": self._generate_control_structure(puppet_rigs, layer_files),
            "processing_metadata": {
                "total_puppet_rigs": len(puppet_rigs),
                "total_layer_files": len(layer_files),
                "unique_characters": len(set([rig["character_id"] for rig in puppet_rigs])),
                "layer_complexity_score": self._calculate_layer_complexity(layer_files),
                "puppet_consistency_score": self._calculate_puppet_consistency(puppet_rigs)
            }
        }
        
        # Save puppet layer metadata
        puppet_layer_file = project_path / "puppet_layer_metadata.json"
        with open(puppet_layer_file, 'w') as f:
            json.dump(puppet_layer_metadata, f, indent=2)
        
        # Update project.json with puppet layer reference
        self._update_project_with_puppet_layer(project_path, puppet_layer_metadata)
        
        return puppet_layer_metadata
    
    def _load_storyboard_visual(self, project_path: Path) -> Dict[str, Any]:
        """Load storyboard visual metadata."""
        storyboard_file = project_path / "storyboard_visual.json"
        if not storyboard_file.exists():
            return None
        
        with open(storyboard_file, 'r') as f:
            return json.load(f)
    
    def _load_scene_breakdown(self, project_path: Path) -> Dict[str, Any]:
        """Load scene breakdown metadata for additional context."""
        scene_breakdown_file = project_path / "scene_breakdown.json"
        if scene_breakdown_file.exists():
            with open(scene_breakdown_file, 'r') as f:
                return json.load(f)
        return None
    
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
    
    def _generate_pose_metadata(self, puppet_rigs: List[Dict[str, Any]], storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate pose metadata for character animation."""
        
        pose_sequences = {}
        character_poses = {}
        
        # Group poses by character
        for rig in puppet_rigs:
            character_id = rig["character_id"]
            if character_id not in character_poses:
                character_poses[character_id] = []
            character_poses[character_id].append(rig["pose_data"])
        
        # Generate pose sequences for each character
        for character_id, poses in character_poses.items():
            pose_sequences[character_id] = {
                "total_poses": len(poses),
                "pose_progression": [pose["base_template"] for pose in poses],
                "energy_progression": [pose["pose_energy"] for pose in poses],
                "consistency_score": self._calculate_pose_consistency(poses),
                "animation_keyframes": self._generate_animation_keyframes(poses)
            }
        
        pose_metadata = {
            "total_characters": len(character_poses),
            "total_poses": len(puppet_rigs),
            "pose_sequences": pose_sequences,
            "global_pose_analysis": {
                "most_common_pose": self._find_most_common_pose(puppet_rigs),
                "energy_distribution": self._analyze_energy_distribution(puppet_rigs),
                "pose_variety_score": self._calculate_pose_variety(puppet_rigs)
            }
        }
        
        return pose_metadata
    
    def _generate_camera_metadata(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate camera metadata for ComfyUI integration."""
        
        camera_sequences = []
        
        for frame in storyboard_frames:
            camera_data = frame["camera_guides"]
            cinematic_data = frame["cinematic_metadata"]
            
            camera_frame = {
                "frame_id": frame["frame_id"],
                "shot_id": frame["shot_id"],
                "camera_angle": camera_data["camera_angle"],
                "camera_movement": camera_data["camera_movement"],
                "lens_specifications": camera_data["lens_specifications"],
                "shot_type": cinematic_data["shot_type"],
                "timing": cinematic_data["timing"],
                "comfyui_camera_params": {
                    "fov": self._calculate_fov_from_lens(camera_data["lens_specifications"]),
                    "camera_position": self._calculate_camera_position(camera_data["camera_angle"]),
                    "camera_rotation": self._calculate_camera_rotation(camera_data["camera_angle"]),
                    "movement_vector": self._calculate_movement_vector(camera_data["camera_movement"])
                }
            }
            
            camera_sequences.append(camera_frame)
        
        camera_metadata = {
            "total_camera_frames": len(camera_sequences),
            "camera_sequences": camera_sequences,
            "camera_analysis": {
                "movement_complexity": self._analyze_camera_complexity(camera_sequences),
                "shot_variety": self._analyze_shot_variety(camera_sequences),
                "lens_usage": self._analyze_lens_usage(camera_sequences)
            }
        }
        
        return camera_metadata
    
    def _generate_lighting_metadata(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate lighting metadata for scene illumination."""
        
        lighting_sequences = []
        
        for frame in storyboard_frames:
            lighting_data = frame["lighting_guides"]
            
            lighting_frame = {
                "frame_id": frame["frame_id"],
                "shot_id": frame["shot_id"],
                "lighting_elements": lighting_data["lighting_elements"],
                "lighting_motivation": lighting_data["lighting_motivation"],
                "cinematic_purpose": lighting_data["cinematic_purpose"],
                "shadow_information": lighting_data["shadow_information"],
                "comfyui_lighting_params": {
                    "key_light_direction": self._extract_key_light_direction(lighting_data),
                    "light_temperature": self._extract_light_temperature(lighting_data),
                    "shadow_intensity": self._extract_shadow_intensity(lighting_data),
                    "ambient_level": self._extract_ambient_level(lighting_data)
                }
            }
            
            lighting_sequences.append(lighting_frame)
        
        lighting_metadata = {
            "total_lighting_frames": len(lighting_sequences),
            "lighting_sequences": lighting_sequences,
            "lighting_analysis": {
                "consistency_score": self._calculate_lighting_consistency_score(lighting_sequences),
                "primary_setup": self._determine_primary_lighting_setup(lighting_sequences),
                "color_temperature_progression": self._analyze_temperature_progression(lighting_sequences)
            }
        }
        
        return lighting_metadata
    
    def _generate_motion_metadata(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate motion metadata for animation."""
        
        motion_sequences = []
        
        for frame in storyboard_frames:
            motion_data = frame["motion_arrows"]
            
            motion_frame = {
                "frame_id": frame["frame_id"],
                "shot_id": frame["shot_id"],
                "motion_elements": motion_data["motion_elements"],
                "overall_energy": motion_data["overall_energy"],
                "comfyui_motion_params": {
                    "motion_vectors": self._extract_motion_vectors(motion_data),
                    "energy_level": self._convert_energy_to_numeric(motion_data["overall_energy"]),
                    "motion_blur_strength": self._calculate_motion_blur(motion_data),
                    "interpolation_method": "optical_flow" if motion_data["total_motion_elements"] > 0 else "linear"
                }
            }
            
            motion_sequences.append(motion_frame)
        
        motion_metadata = {
            "total_motion_frames": len(motion_sequences),
            "motion_sequences": motion_sequences,
            "motion_analysis": {
                "average_energy": self._calculate_average_energy(motion_sequences),
                "motion_complexity": self._calculate_motion_complexity(motion_sequences),
                "temporal_flow": self._analyze_temporal_flow(motion_sequences)
            }
        }
        
        return motion_metadata
    
    def _generate_audio_markers(self, storyboard_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate audio markers for synchronization."""
        
        audio_markers = []
        cumulative_time = 0.0
        
        for frame in storyboard_frames:
            timing = frame["cinematic_metadata"]["timing"]
            
            # Create audio marker for this frame
            marker = {
                "marker_id": f"audio_{frame['frame_id']}",
                "frame_id": frame["frame_id"],
                "shot_id": frame["shot_id"],
                "start_time": cumulative_time,
                "end_time": cumulative_time + timing["duration_seconds"],
                "duration": timing["duration_seconds"],
                "audio_requirements": {
                    "dialogue": self._extract_dialogue_requirements(frame),
                    "sfx": self._extract_sfx_requirements(frame),
                    "ambience": self._extract_ambience_requirements(frame),
                    "music": self._extract_music_requirements(frame)
                },
                "sync_points": {
                    "visual_beats": self._identify_visual_beats(frame),
                    "motion_sync": self._identify_motion_sync_points(frame),
                    "emotional_beats": self._identify_emotional_beats(frame)
                }
            }
            
            audio_markers.append(marker)
            cumulative_time += timing["duration_seconds"]
        
        audio_metadata = {
            "total_markers": len(audio_markers),
            "total_duration": cumulative_time,
            "audio_markers": audio_markers,
            "synchronization_analysis": {
                "sync_complexity": self._calculate_sync_complexity(audio_markers),
                "dialogue_density": self._calculate_dialogue_density(audio_markers),
                "audio_variety": self._calculate_audio_variety(audio_markers)
            }
        }
        
        return audio_metadata
    
    def _generate_control_structure(self, puppet_rigs: List[Dict[str, Any]], layer_files: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate the control structure for AI generation."""
        
        # Group by frame for generation coordination
        frames_control = {}
        
        # Process puppet rigs
        for rig in puppet_rigs:
            frame_id = rig["frame_id"]
            if frame_id not in frames_control:
                frames_control[frame_id] = {"puppets": [], "layers": []}
            frames_control[frame_id]["puppets"].append(rig)
        
        # Process layer files
        for layer in layer_files:
            frame_id = layer["frame_id"]
            if frame_id not in frames_control:
                frames_control[frame_id] = {"puppets": [], "layers": []}
            frames_control[frame_id]["layers"].append(layer)
        
        # Generate generation order and dependencies
        generation_order = []
        
        for frame_id, frame_control in frames_control.items():
            # Sort layers by generation priority
            sorted_layers = sorted(frame_control["layers"], key=lambda x: x["generation_priority"])
            
            # Sort puppets by generation priority
            sorted_puppets = sorted(frame_control["puppets"], key=lambda x: x["generation_priority"])
            
            frame_generation = {
                "frame_id": frame_id,
                "generation_sequence": self._create_generation_sequence(sorted_layers, sorted_puppets),
                "dependencies": self._identify_generation_dependencies(sorted_layers, sorted_puppets),
                "parallel_groups": self._identify_parallel_generation_groups(sorted_layers, sorted_puppets)
            }
            
            generation_order.append(frame_generation)
        
        control_structure = {
            "total_frames": len(frames_control),
            "generation_order": generation_order,
            "global_dependencies": self._identify_global_dependencies(puppet_rigs, layer_files),
            "optimization_hints": {
                "batch_processing": self._identify_batch_opportunities(puppet_rigs, layer_files),
                "cache_reuse": self._identify_cache_opportunities(puppet_rigs, layer_files),
                "parallel_execution": self._identify_parallel_opportunities(generation_order)
            }
        }
        
        return control_structure
    
    # Helper methods for calculations and analysis
    
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
    
    # Additional helper methods for metadata generation
    
    def _calculate_pose_consistency(self, poses: List[Dict[str, Any]]) -> float:
        """Calculate pose consistency for a character."""
        if len(poses) < 2:
            return 1.0
        
        # Check template consistency
        templates = [pose["base_template"] for pose in poses]
        template_consistency = len(set(templates)) / len(templates)
        
        # Check energy consistency
        energies = [pose["pose_energy"] for pose in poses]
        energy_consistency = len(set(energies)) / len(energies)
        
        return (template_consistency + energy_consistency) / 2
    
    def _generate_animation_keyframes(self, poses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate animation keyframes from pose sequence."""
        keyframes = []
        
        for i, pose in enumerate(poses):
            keyframe = {
                "keyframe_index": i,
                "pose_template": pose["base_template"],
                "energy_level": pose["pose_energy"],
                "interpolation_method": "ease_in_out",
                "hold_duration": 0.5
            }
            keyframes.append(keyframe)
        
        return keyframes
    
    def _find_most_common_pose(self, puppet_rigs: List[Dict[str, Any]]) -> str:
        """Find the most common pose template."""
        templates = [rig["pose_data"]["base_template"] for rig in puppet_rigs]
        return max(set(templates), key=templates.count) if templates else "standing_neutral"
    
    def _analyze_energy_distribution(self, puppet_rigs: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze energy level distribution."""
        energies = [rig["pose_data"]["pose_energy"] for rig in puppet_rigs]
        energy_counts = {}
        
        for energy in energies:
            energy_counts[energy] = energy_counts.get(energy, 0) + 1
        
        return energy_counts
    
    def _calculate_pose_variety(self, puppet_rigs: List[Dict[str, Any]]) -> float:
        """Calculate pose variety score."""
        templates = [rig["pose_data"]["base_template"] for rig in puppet_rigs]
        unique_templates = len(set(templates))
        total_templates = len(templates)
        
        return (unique_templates / total_templates) * 5.0 if total_templates > 0 else 0.0
    
    def _calculate_fov_from_lens(self, lens_specs: Dict[str, Any]) -> float:
        """Calculate field of view from lens specifications."""
        lens_type = lens_specs["type"]
        
        fov_map = {
            "wide": 85.0,
            "normal": 50.0,
            "telephoto": 25.0,
            "ultra_wide": 120.0
        }
        
        return fov_map.get(lens_type, 50.0)
    
    def _calculate_camera_position(self, camera_angle: Dict[str, Any]) -> Dict[str, float]:
        """Calculate camera position from angle."""
        angle_type = camera_angle["type"]
        
        positions = {
            "eye-level": {"x": 0.0, "y": 0.0, "z": -5.0},
            "low-angle": {"x": 0.0, "y": -2.0, "z": -5.0},
            "high-angle": {"x": 0.0, "y": 2.0, "z": -5.0},
            "dutch-tilt": {"x": 0.0, "y": 0.0, "z": -5.0}
        }
        
        return positions.get(angle_type, positions["eye-level"])
    
    def _calculate_camera_rotation(self, camera_angle: Dict[str, Any]) -> Dict[str, float]:
        """Calculate camera rotation from angle."""
        angle_type = camera_angle["type"]
        
        rotations = {
            "eye-level": {"x": 0.0, "y": 0.0, "z": 0.0},
            "low-angle": {"x": 15.0, "y": 0.0, "z": 0.0},
            "high-angle": {"x": -15.0, "y": 0.0, "z": 0.0},
            "dutch-tilt": {"x": 0.0, "y": 0.0, "z": 10.0}
        }
        
        return rotations.get(angle_type, rotations["eye-level"])
    
    def _calculate_movement_vector(self, camera_movement: Dict[str, Any]) -> Dict[str, float]:
        """Calculate camera movement vector."""
        movement_type = camera_movement["type"]
        
        vectors = {
            "static": {"x": 0.0, "y": 0.0, "z": 0.0},
            "pan-right": {"x": 1.0, "y": 0.0, "z": 0.0},
            "pan-left": {"x": -1.0, "y": 0.0, "z": 0.0},
            "dolly-in": {"x": 0.0, "y": 0.0, "z": 1.0},
            "dolly-out": {"x": 0.0, "y": 0.0, "z": -1.0},
            "tilt-up": {"x": 0.0, "y": 1.0, "z": 0.0},
            "tilt-down": {"x": 0.0, "y": -1.0, "z": 0.0}
        }
        
        return vectors.get(movement_type, vectors["static"])
    
    def _analyze_camera_complexity(self, camera_sequences: List[Dict[str, Any]]) -> float:
        """Analyze camera movement complexity."""
        static_count = sum(1 for seq in camera_sequences if seq["camera_movement"]["type"] == "static")
        total_count = len(camera_sequences)
        
        dynamic_ratio = (total_count - static_count) / total_count if total_count > 0 else 0
        return dynamic_ratio * 5.0
    
    def _analyze_shot_variety(self, camera_sequences: List[Dict[str, Any]]) -> float:
        """Analyze shot type variety."""
        shot_types = [seq["shot_type"]["code"] for seq in camera_sequences]
        unique_shots = len(set(shot_types))
        total_shots = len(shot_types)
        
        return (unique_shots / total_shots) * 5.0 if total_shots > 0 else 0.0
    
    def _analyze_lens_usage(self, camera_sequences: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze lens usage distribution."""
        lens_types = [seq["lens_specifications"]["type"] for seq in camera_sequences]
        lens_counts = {}
        
        for lens_type in lens_types:
            lens_counts[lens_type] = lens_counts.get(lens_type, 0) + 1
        
        return lens_counts
    
    def _extract_key_light_direction(self, lighting_data: Dict[str, Any]) -> str:
        """Extract key light direction from lighting data."""
        for element in lighting_data["lighting_elements"]:
            if element["light_type"] == "key_light":
                return element.get("position", {}).get("direction", "front")
        return "front"
    
    def _extract_light_temperature(self, lighting_data: Dict[str, Any]) -> str:
        """Extract light color temperature."""
        for element in lighting_data["lighting_elements"]:
            if element["light_type"] == "key_light":
                return element.get("color_temperature", "neutral")
        return "neutral"
    
    def _extract_shadow_intensity(self, lighting_data: Dict[str, Any]) -> str:
        """Extract shadow intensity."""
        shadow_info = lighting_data.get("shadow_information", {})
        return shadow_info.get("intensity", "medium")
    
    def _extract_ambient_level(self, lighting_data: Dict[str, Any]) -> str:
        """Extract ambient light level."""
        for element in lighting_data["lighting_elements"]:
            if element["light_type"] == "ambient":
                return element.get("intensity", "low")
        return "low"
    
    def _calculate_lighting_consistency_score(self, lighting_sequences: List[Dict[str, Any]]) -> float:
        """Calculate lighting consistency across frames."""
        if len(lighting_sequences) < 2:
            return 5.0
        
        motivations = [seq["lighting_motivation"] for seq in lighting_sequences]
        unique_motivations = len(set(motivations))
        
        consistency = 1.0 - (unique_motivations - 1) / len(lighting_sequences)
        return max(0, consistency) * 5.0
    
    def _determine_primary_lighting_setup(self, lighting_sequences: List[Dict[str, Any]]) -> str:
        """Determine primary lighting setup."""
        setups = [seq["cinematic_purpose"] for seq in lighting_sequences]
        return max(set(setups), key=setups.count) if setups else "maintain_naturalism"
    
    def _analyze_temperature_progression(self, lighting_sequences: List[Dict[str, Any]]) -> List[str]:
        """Analyze color temperature progression."""
        temperatures = []
        for seq in lighting_sequences:
            temp = self._extract_light_temperature(seq)
            temperatures.append(temp)
        return temperatures
    
    def _extract_motion_vectors(self, motion_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract motion vectors from motion data."""
        vectors = []
        
        for element in motion_data["motion_elements"]:
            if "direction" in element:
                vectors.append({
                    "type": element["motion_type"],
                    "start": element["direction"].get("start", {"x": 0, "y": 0}),
                    "end": element["direction"].get("end", {"x": 0, "y": 0})
                })
        
        return vectors
    
    def _convert_energy_to_numeric(self, energy: str) -> float:
        """Convert energy level to numeric value."""
        energy_map = {
            "calm": 0.2,
            "low": 0.4,
            "moderate": 0.6,
            "high": 0.8,
            "intense": 1.0
        }
        return energy_map.get(energy, 0.5)
    
    def _calculate_motion_blur(self, motion_data: Dict[str, Any]) -> float:
        """Calculate motion blur strength."""
        energy = motion_data["overall_energy"]
        energy_numeric = self._convert_energy_to_numeric(energy)
        return energy_numeric * 0.5  # Scale to reasonable blur strength
    
    def _calculate_average_energy(self, motion_sequences: List[Dict[str, Any]]) -> float:
        """Calculate average energy across motion sequences."""
        energies = [self._convert_energy_to_numeric(seq["overall_energy"]) for seq in motion_sequences]
        return sum(energies) / len(energies) if energies else 0.0
    
    def _calculate_motion_complexity(self, motion_sequences: List[Dict[str, Any]]) -> float:
        """Calculate motion complexity score."""
        total_elements = sum(len(seq["motion_elements"]) for seq in motion_sequences)
        total_frames = len(motion_sequences)
        
        return min(5.0, (total_elements / total_frames) * 2.0) if total_frames > 0 else 0.0
    
    def _analyze_temporal_flow(self, motion_sequences: List[Dict[str, Any]]) -> List[float]:
        """Analyze temporal flow of motion."""
        flow = []
        for seq in motion_sequences:
            energy = self._convert_energy_to_numeric(seq["overall_energy"])
            flow.append(energy)
        return flow
    
    def _extract_dialogue_requirements(self, frame: Dict[str, Any]) -> Dict[str, Any]:
        """Extract dialogue requirements from frame."""
        # Check if frame has character dialogue needs
        characters = frame["puppet_placement"]["character_placements"]
        
        dialogue_req = {
            "has_dialogue": len(characters) > 0 and frame["cinematic_metadata"]["shot_type"]["code"] in ["MCU", "CU", "ECU"],
            "character_count": len(characters),
            "dialogue_type": "character_speech" if len(characters) == 1 else "conversation",
            "lip_sync_required": frame["cinematic_metadata"]["shot_type"]["code"] in ["CU", "ECU"]
        }
        
        return dialogue_req
    
    def _extract_sfx_requirements(self, frame: Dict[str, Any]) -> Dict[str, Any]:
        """Extract sound effects requirements."""
        motion_elements = frame["motion_arrows"]["motion_elements"]
        
        sfx_req = {
            "movement_sounds": len(motion_elements) > 0,
            "environmental_sounds": True,  # Always need some environmental audio
            "interaction_sounds": len(motion_elements) > 1,  # Multiple motion elements suggest interactions
            "intensity": frame["motion_arrows"]["overall_energy"]
        }
        
        return sfx_req
    
    def _extract_ambience_requirements(self, frame: Dict[str, Any]) -> Dict[str, Any]:
        """Extract ambience requirements."""
        lighting = frame["lighting_guides"]["lighting_motivation"]
        
        ambience_req = {
            "environment_type": "urban_street",  # Default from test data
            "time_of_day": "evening" if "evening" in lighting else "day",
            "weather": "clear",
            "atmosphere": "calm" if frame["motion_arrows"]["overall_energy"] == "calm" else "active"
        }
        
        return ambience_req
    
    def _extract_music_requirements(self, frame: Dict[str, Any]) -> Dict[str, Any]:
        """Extract music requirements."""
        emotional_function = frame["cinematic_metadata"]["narrative_function"]["emotional_function"]
        
        music_req = {
            "emotional_tone": emotional_function,
            "intensity": "subtle",
            "genre": "cinematic_ambient",
            "sync_to_motion": len(frame["motion_arrows"]["motion_elements"]) > 0
        }
        
        return music_req
    
    def _identify_visual_beats(self, frame: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify visual beats for audio sync."""
        beats = []
        
        # Motion beats
        for motion in frame["motion_arrows"]["motion_elements"]:
            beats.append({
                "beat_type": "motion_start",
                "timing": "frame_start",
                "element": motion["motion_type"]
            })
        
        # Camera beats
        if frame["camera_guides"]["camera_movement"]["type"] != "static":
            beats.append({
                "beat_type": "camera_movement",
                "timing": "frame_start",
                "element": frame["camera_guides"]["camera_movement"]["type"]
            })
        
        return beats
    
    def _identify_motion_sync_points(self, frame: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify motion synchronization points."""
        sync_points = []
        
        motion_elements = frame["motion_arrows"]["motion_elements"]
        for i, motion in enumerate(motion_elements):
            sync_points.append({
                "sync_type": "motion_peak",
                "timing_offset": i * 0.2,  # Stagger motion peaks
                "motion_type": motion["motion_type"]
            })
        
        return sync_points
    
    def _identify_emotional_beats(self, frame: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify emotional beats for music sync."""
        emotional_function = frame["cinematic_metadata"]["narrative_function"]["emotional_function"]
        
        beats = [{
            "beat_type": "emotional_tone",
            "emotion": emotional_function,
            "timing": "frame_duration",
            "intensity": "subtle"
        }]
        
        return beats
    
    def _calculate_sync_complexity(self, audio_markers: List[Dict[str, Any]]) -> float:
        """Calculate audio synchronization complexity."""
        total_sync_points = sum(len(marker["sync_points"]["visual_beats"]) + 
                               len(marker["sync_points"]["motion_sync"]) + 
                               len(marker["sync_points"]["emotional_beats"]) 
                               for marker in audio_markers)
        total_markers = len(audio_markers)
        
        return min(5.0, (total_sync_points / total_markers) * 1.5) if total_markers > 0 else 0.0
    
    def _calculate_dialogue_density(self, audio_markers: List[Dict[str, Any]]) -> float:
        """Calculate dialogue density."""
        dialogue_markers = sum(1 for marker in audio_markers 
                             if marker["audio_requirements"]["dialogue"]["has_dialogue"])
        total_markers = len(audio_markers)
        
        return (dialogue_markers / total_markers) if total_markers > 0 else 0.0
    
    def _calculate_audio_variety(self, audio_markers: List[Dict[str, Any]]) -> float:
        """Calculate audio variety score."""
        # Count different types of audio requirements
        dialogue_types = set()
        sfx_intensities = set()
        music_tones = set()
        
        for marker in audio_markers:
            audio_req = marker["audio_requirements"]
            dialogue_types.add(audio_req["dialogue"]["dialogue_type"])
            sfx_intensities.add(audio_req["sfx"]["intensity"])
            music_tones.add(audio_req["music"]["emotional_tone"])
        
        variety_score = (len(dialogue_types) + len(sfx_intensities) + len(music_tones)) / 3
        return min(5.0, variety_score * 2.0)
    
    def _create_generation_sequence(self, sorted_layers: List[Dict[str, Any]], sorted_puppets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Create generation sequence for frame."""
        sequence = []
        
        # Add layers first (background to foreground)
        for layer in sorted_layers:
            sequence.append({
                "type": "layer",
                "id": layer["layer_file_id"],
                "priority": layer["generation_priority"],
                "dependencies": []
            })
        
        # Add puppets (by priority)
        for puppet in sorted_puppets:
            sequence.append({
                "type": "puppet",
                "id": puppet["rig_id"],
                "priority": puppet["generation_priority"],
                "dependencies": [layer["layer_file_id"] for layer in sorted_layers 
                               if layer["layer_name"] == f"L{puppet['generation_priority'] + 2}_*"]
            })
        
        return sequence
    
    def _identify_generation_dependencies(self, sorted_layers: List[Dict[str, Any]], sorted_puppets: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Identify generation dependencies."""
        dependencies = {}
        
        # Layers depend on lower-priority layers
        for i, layer in enumerate(sorted_layers):
            layer_id = layer["layer_file_id"]
            dependencies[layer_id] = []
            
            # Depend on background layers
            for j, dep_layer in enumerate(sorted_layers):
                if dep_layer["generation_priority"] < layer["generation_priority"]:
                    dependencies[layer_id].append(dep_layer["layer_file_id"])
        
        # Puppets depend on their target layers
        for puppet in sorted_puppets:
            puppet_id = puppet["rig_id"]
            dependencies[puppet_id] = []
            
            # Find matching layer for puppet
            for layer in sorted_layers:
                if ("character" in layer["layer_name"] and 
                    layer["generation_priority"] <= puppet["generation_priority"]):
                    dependencies[puppet_id].append(layer["layer_file_id"])
        
        return dependencies
    
    def _identify_parallel_generation_groups(self, sorted_layers: List[Dict[str, Any]], sorted_puppets: List[Dict[str, Any]]) -> List[List[str]]:
        """Identify groups that can be generated in parallel."""
        parallel_groups = []
        
        # Group layers by priority
        layer_groups = {}
        for layer in sorted_layers:
            priority = layer["generation_priority"]
            if priority not in layer_groups:
                layer_groups[priority] = []
            layer_groups[priority].append(layer["layer_file_id"])
        
        # Add layer groups
        for priority in sorted(layer_groups.keys()):
            if len(layer_groups[priority]) > 1:
                parallel_groups.append(layer_groups[priority])
        
        # Group puppets by priority
        puppet_groups = {}
        for puppet in sorted_puppets:
            priority = puppet["generation_priority"]
            if priority not in puppet_groups:
                puppet_groups[priority] = []
            puppet_groups[priority].append(puppet["rig_id"])
        
        # Add puppet groups
        for priority in sorted(puppet_groups.keys()):
            if len(puppet_groups[priority]) > 1:
                parallel_groups.append(puppet_groups[priority])
        
        return parallel_groups
    
    def _identify_global_dependencies(self, puppet_rigs: List[Dict[str, Any]], layer_files: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Identify global dependencies across frames."""
        global_deps = {}
        
        # Character consistency dependencies
        character_rigs = {}
        for rig in puppet_rigs:
            char_id = rig["character_id"]
            if char_id not in character_rigs:
                character_rigs[char_id] = []
            character_rigs[char_id].append(rig["rig_id"])
        
        # Each character rig depends on previous rigs of same character
        for char_id, rig_ids in character_rigs.items():
            for i, rig_id in enumerate(rig_ids):
                global_deps[rig_id] = rig_ids[:i]  # Depend on previous rigs
        
        return global_deps
    
    def _identify_batch_opportunities(self, puppet_rigs: List[Dict[str, Any]], layer_files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify batch processing opportunities."""
        batches = []
        
        # Batch similar layers
        layer_types = {}
        for layer in layer_files:
            layer_type = layer["layer_configuration"]["content_type"]
            if layer_type not in layer_types:
                layer_types[layer_type] = []
            layer_types[layer_type].append(layer["layer_file_id"])
        
        for layer_type, layer_ids in layer_types.items():
            if len(layer_ids) > 1:
                batches.append({
                    "batch_type": "layer_batch",
                    "content_type": layer_type,
                    "items": layer_ids,
                    "batch_size": min(4, len(layer_ids))
                })
        
        # Batch similar puppets
        puppet_types = {}
        for puppet in puppet_rigs:
            puppet_type = puppet["puppet_type"]
            if puppet_type not in puppet_types:
                puppet_types[puppet_type] = []
            puppet_types[puppet_type].append(puppet["rig_id"])
        
        for puppet_type, puppet_ids in puppet_types.items():
            if len(puppet_ids) > 1:
                batches.append({
                    "batch_type": "puppet_batch",
                    "puppet_type": puppet_type,
                    "items": puppet_ids,
                    "batch_size": min(3, len(puppet_ids))
                })
        
        return batches
    
    def _identify_cache_opportunities(self, puppet_rigs: List[Dict[str, Any]], layer_files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify caching opportunities."""
        cache_ops = []
        
        # Cache character references
        character_refs = {}
        for rig in puppet_rigs:
            char_id = rig["character_id"]
            ref_data = rig["reference_data"]
            
            if char_id not in character_refs:
                character_refs[char_id] = ref_data
                cache_ops.append({
                    "cache_type": "character_reference",
                    "character_id": char_id,
                    "cache_key": f"char_ref_{char_id}",
                    "data": ref_data
                })
        
        # Cache environment layers
        env_layers = {}
        for layer in layer_files:
            if layer["layer_configuration"]["content_type"].startswith("environment"):
                content_hash = str(hash(str(layer["visual_content"])))
                if content_hash not in env_layers:
                    env_layers[content_hash] = layer
                    cache_ops.append({
                        "cache_type": "environment_layer",
                        "content_hash": content_hash,
                        "cache_key": f"env_{content_hash[:8]}",
                        "layer_id": layer["layer_file_id"]
                    })
        
        return cache_ops
    
    def _identify_parallel_opportunities(self, generation_order: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify parallel execution opportunities."""
        parallel_ops = []
        
        for frame_gen in generation_order:
            frame_id = frame_gen["frame_id"]
            parallel_groups = frame_gen["parallel_groups"]
            
            for group in parallel_groups:
                if len(group) > 1:
                    parallel_ops.append({
                        "frame_id": frame_id,
                        "parallel_group": group,
                        "max_parallel": min(4, len(group)),
                        "execution_type": "concurrent"
                    })
        
        return parallel_ops
    
    def _update_project_with_puppet_layer(self, project_path: Path, puppet_layer_metadata: Dict[str, Any]) -> None:
        """Update project.json with puppet layer processing results."""
        project_file = project_path / "project.json"
        
        if project_file.exists():
            with open(project_file, 'r') as f:
                project_data = json.load(f)
        else:
            project_data = {"schema_version": "1.0"}
        
        # Update project status and metadata
        project_data["generation_status"] = project_data.get("generation_status", {})
        project_data["generation_status"]["puppet_layer"] = "done"
        
        project_data["processing_results"] = project_data.get("processing_results", {})
        project_data["processing_results"]["puppet_layer"] = {
            "puppet_layer_id": puppet_layer_metadata["puppet_layer_id"],
            "total_puppet_rigs": puppet_layer_metadata["processing_metadata"]["total_puppet_rigs"],
            "total_layer_files": puppet_layer_metadata["processing_metadata"]["total_layer_files"],
            "unique_characters": puppet_layer_metadata["processing_metadata"]["unique_characters"],
            "layer_complexity_score": puppet_layer_metadata["processing_metadata"]["layer_complexity_score"],
            "puppet_consistency_score": puppet_layer_metadata["processing_metadata"]["puppet_consistency_score"],
            "processed_at": puppet_layer_metadata["created_at"]
        }
        
        # Update capabilities
        project_data["capabilities"] = project_data.get("capabilities", {})
        project_data["capabilities"]["puppet_layer_engine"] = True
        
        # Save updated project data
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)