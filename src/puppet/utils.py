"""
Puppet & Layer Engine - Utility Functions
Handles calculation and analysis utilities.
Part of the decomposed PuppetLayerEngine.
"""

from typing import Dict, List, Any


class PuppetLayerUtils:
    """Utility methods for calculations and analysis."""

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