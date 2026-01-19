"""
Puppet & Layer Engine - Metadata Generation
Handles generation of pose, camera, lighting, motion, and audio metadata.
Part of the decomposed PuppetLayerEngine.
"""

from typing import Dict, List, Any


class PuppetLayerMetadata:
    """Metadata generation methods for puppets and layers."""

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