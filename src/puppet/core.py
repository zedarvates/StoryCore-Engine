"""
Puppet & Layer Engine - Core Configuration and Processing
Handles core functionality for puppet rig generation and layer system creation.
Part of the decomposed PuppetLayerEngine.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple
import hashlib


class PuppetLayerEngineCore:
    """Core functionality for Puppet & Layer Engine."""

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