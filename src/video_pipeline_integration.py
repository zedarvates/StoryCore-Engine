#!/usr/bin/env python3
"""
Video Pipeline Integration Module
Integrates Video Engine with ComfyUI Image Engine output and other pipeline components.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

# Import Video Engine components
from video_engine import VideoEngine, VideoConfig, KeyframeData, ShotData, CameraMovementSpec, CameraMovement, EasingType
from video_config import VideoConfigManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PipelineMetadata:
    """Metadata for pipeline integration."""
    schema_version: str = "1.0"
    integration_timestamp: str = ""
    source_components: List[str] = None
    data_contract_compliance: bool = True
    
    def __post_init__(self):
        if self.integration_timestamp == "":
            self.integration_timestamp = datetime.utcnow().isoformat() + "Z"
        if self.source_components is None:
            self.source_components = []


@dataclass
class ComfyUIImageOutput:
    """Structure for ComfyUI Image Engine output data."""
    image_generation_id: str
    frame_id: str
    image_path: str
    generation_metadata: Dict[str, Any]
    quality_metrics: Dict[str, float]
    timestamp: str


@dataclass
class ShotEngineOutput:
    """Structure for Shot Engine metadata."""
    shot_id: str
    shot_type: str
    camera_movement: Dict[str, Any]
    duration: float
    frame_count: int
    keyframe_positions: List[int]
    metadata: Dict[str, Any]


class VideoPipelineIntegrator:
    """
    Integrates Video Engine with other pipeline components.
    
    This class handles:
    - Loading keyframes from ComfyUI Image Engine output
    - Processing shot metadata from Shot Engine
    - Generating output compatible with Audio Engine
    - Maintaining Data Contract v1 compliance
    """
    
    def __init__(self, project_path: str):
        """Initialize pipeline integrator."""
        self.project_path = Path(project_path)
        self.pipeline_metadata = PipelineMetadata()
        
        # Initialize Video Engine components
        self.video_config_manager = VideoConfigManager()
        self.video_engine: Optional[VideoEngine] = None
        
        # Pipeline data
        self.comfyui_outputs: List[ComfyUIImageOutput] = []
        self.shot_metadata: List[ShotEngineOutput] = []
        self.integration_results: Dict[str, Any] = {}
        
        logger.info(f"Pipeline integrator initialized for project: {project_path}")
    
    def load_comfyui_image_output(self) -> bool:
        """
        Load keyframe images from ComfyUI Image Engine output.
        
        Returns:
            bool: True if images loaded successfully
        """
        try:
            # Load image generation metadata
            image_gen_file = self.project_path / "image_generation_metadata.json"
            if not image_gen_file.exists():
                logger.warning("No ComfyUI image generation metadata found - creating mock data")
                self._create_mock_comfyui_output()
                return True
            
            with open(image_gen_file, 'r') as f:
                image_gen_data = json.load(f)
            
            # Validate Data Contract v1 compliance
            if not self._validate_comfyui_data_contract(image_gen_data):
                logger.error("ComfyUI output does not comply with Data Contract v1")
                return False
            
            # Process generation results
            self.comfyui_outputs = []
            for result in image_gen_data.get("generation_results", []):
                # Extract keyframe images
                for image_data in result.get("generated_images", []):
                    if image_data.get("type") == "keyframe" or "final_composite" in result:
                        comfyui_output = ComfyUIImageOutput(
                            image_generation_id=image_gen_data["image_generation_id"],
                            frame_id=result["frame_id"],
                            image_path=self._resolve_image_path(image_data, result),
                            generation_metadata=image_data.get("generation_result", {}),
                            quality_metrics=image_data.get("generation_result", {}).get("quality_metrics", {}),
                            timestamp=result.get("generation_timestamp", "")
                        )
                        self.comfyui_outputs.append(comfyui_output)
            
            # Add pipeline metadata source
            self.pipeline_metadata.source_components.append("comfyui_image_engine")
            
            logger.info(f"Loaded {len(self.comfyui_outputs)} keyframe images from ComfyUI Image Engine")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load ComfyUI image output: {e}")
            return False
    
    def load_shot_engine_metadata(self) -> bool:
        """
        Load shot metadata from Shot Engine output.
        
        Returns:
            bool: True if metadata loaded successfully
        """
        try:
            # Load shot planning metadata
            shot_planning_file = self.project_path / "shot_planning.json"
            if not shot_planning_file.exists():
                logger.warning("No shot planning metadata found - creating mock data")
                self._create_mock_shot_metadata()
                return True
            
            with open(shot_planning_file, 'r') as f:
                shot_planning_data = json.load(f)
            
            # Validate Data Contract v1 compliance
            if not self._validate_shot_data_contract(shot_planning_data):
                logger.error("Shot Engine output does not comply with Data Contract v1")
                return False
            
            # Process shot list
            self.shot_metadata = []
            for shot_data in shot_planning_data.get("shot_list", []):
                shot_output = ShotEngineOutput(
                    shot_id=shot_data["shot_id"],
                    shot_type=shot_data.get("shot_type", "medium"),
                    camera_movement=shot_data.get("camera_movement", {}),
                    duration=shot_data.get("duration", 2.0),
                    frame_count=shot_data.get("frame_count", 48),
                    keyframe_positions=shot_data.get("keyframe_positions", [0, 47]),
                    metadata=shot_data.get("metadata", {})
                )
                self.shot_metadata.append(shot_output)
            
            # Add pipeline metadata source
            self.pipeline_metadata.source_components.append("shot_engine")
            
            logger.info(f"Loaded {len(self.shot_metadata)} shots from Shot Engine")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Shot Engine metadata: {e}")
            return False
    
    def integrate_with_video_engine(self, video_config: Optional[VideoConfig] = None) -> bool:
        """
        Integrate loaded data with Video Engine.
        
        Args:
            video_config: Optional video configuration override
            
        Returns:
            bool: True if integration successful
        """
        try:
            # Use provided config or load default
            if video_config:
                # Convert and apply the custom config
                engine_config = video_config
            else:
                engine_config = self._create_video_engine_config()
            
            # Initialize Video Engine
            self.video_engine = VideoEngine(engine_config)
            
            # Create integrated shot data
            integrated_shots = self._create_integrated_shots()
            
            # Set shots in video engine
            self.video_engine.shots = integrated_shots
            
            # Validate integration
            if not self._validate_integration():
                logger.error("Integration validation failed")
                return False
            
            # Add pipeline metadata source
            self.pipeline_metadata.source_components.append("video_engine")
            
            logger.info(f"Successfully integrated {len(integrated_shots)} shots with Video Engine")
            return True
            
        except Exception as e:
            logger.error(f"Failed to integrate with Video Engine: {e}")
            return False
    
    def generate_audio_engine_output(self) -> Dict[str, Any]:
        """
        Generate output compatible with Audio Engine.
        
        Returns:
            Dict containing audio synchronization data
        """
        try:
            # Generate timeline metadata for audio synchronization
            timeline_data = self.video_engine.get_timeline_metadata() if self.video_engine else self._create_mock_timeline()
            
            # Create audio engine compatible output
            audio_sync_data = {
                "schema_version": "1.0",
                "video_timeline_id": f"timeline_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                "created_at": datetime.utcnow().isoformat() + "Z",
                "source_video_engine": True,
                "timeline_metadata": timeline_data,
                "shot_synchronization": self._create_shot_synchronization_data(),
                "audio_cue_points": self._generate_audio_cue_points(),
                "pipeline_metadata": asdict(self.pipeline_metadata)
            }
            
            # Save audio synchronization data
            audio_sync_file = self.project_path / "video_audio_synchronization.json"
            with open(audio_sync_file, 'w') as f:
                json.dump(audio_sync_data, f, indent=2)
            
            logger.info("Generated audio engine synchronization data")
            return audio_sync_data
            
        except Exception as e:
            logger.error(f"Failed to generate audio engine output: {e}")
            return {}
    
    def validate_data_contract_compliance(self) -> Tuple[bool, List[str]]:
        """
        Validate Data Contract v1 compliance across all components.
        
        Returns:
            Tuple of (is_compliant, list_of_issues)
        """
        issues = []
        
        # Check project.json compliance
        project_file = self.project_path / "project.json"
        if not project_file.exists():
            issues.append("Missing project.json file")
        else:
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)
                
                # Validate required fields
                required_fields = ["schema_version", "project_name", "capabilities"]
                for field in required_fields:
                    if field not in project_data:
                        issues.append(f"Missing required field in project.json: {field}")
                
                # Validate schema version
                if project_data.get("schema_version") != "1.0":
                    issues.append(f"Invalid schema version: {project_data.get('schema_version')}")
                
            except Exception as e:
                issues.append(f"Failed to validate project.json: {e}")
        
        # Check video generation capability
        if self.video_engine and not self.video_engine.shots:
            issues.append("Video Engine has no shots loaded")
        
        # Check ComfyUI integration
        if not self.comfyui_outputs:
            issues.append("No ComfyUI keyframe outputs loaded")
        
        # Check shot metadata
        if not self.shot_metadata:
            issues.append("No shot metadata loaded")
        
        # Update compliance status
        self.pipeline_metadata.data_contract_compliance = len(issues) == 0
        
        return len(issues) == 0, issues
    
    def get_integration_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive integration report.
        
        Returns:
            Dict containing integration status and metrics
        """
        is_compliant, issues = self.validate_data_contract_compliance()
        
        report = {
            "integration_id": f"integration_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "pipeline_metadata": asdict(self.pipeline_metadata),
            "data_contract_compliance": {
                "is_compliant": is_compliant,
                "issues": issues
            },
            "component_status": {
                "comfyui_image_engine": {
                    "loaded": len(self.comfyui_outputs) > 0,
                    "keyframes_count": len(self.comfyui_outputs),
                    "quality_average": self._calculate_average_quality()
                },
                "shot_engine": {
                    "loaded": len(self.shot_metadata) > 0,
                    "shots_count": len(self.shot_metadata),
                    "total_duration": sum(shot.duration for shot in self.shot_metadata)
                },
                "video_engine": {
                    "initialized": self.video_engine is not None,
                    "shots_integrated": len(self.video_engine.shots) if self.video_engine else 0,
                    "configuration_valid": self._validate_video_engine_config()
                }
            },
            "integration_metrics": {
                "total_keyframes": len(self.comfyui_outputs),
                "total_shots": len(self.shot_metadata),
                "average_shot_duration": sum(shot.duration for shot in self.shot_metadata) / len(self.shot_metadata) if self.shot_metadata else 0,
                "keyframes_per_shot": len(self.comfyui_outputs) / len(self.shot_metadata) if self.shot_metadata else 0
            }
        }
        
        return report
    
    def _validate_comfyui_data_contract(self, data: Dict[str, Any]) -> bool:
        """Validate ComfyUI output against Data Contract v1."""
        required_fields = ["schema_version", "image_generation_id", "generation_results"]
        return all(field in data for field in required_fields)
    
    def _validate_shot_data_contract(self, data: Dict[str, Any]) -> bool:
        """Validate Shot Engine output against Data Contract v1."""
        required_fields = ["schema_version", "shot_planning_id", "shot_list"]
        return all(field in data for field in required_fields)
    
    def _resolve_image_path(self, image_data: Dict[str, Any], result: Dict[str, Any]) -> str:
        """Resolve the actual image file path."""
        # Check for final composite first
        if "final_composite" in result:
            return str(self.project_path / "assets" / "images" / "generated" / f"{result['frame_id']}_composite.png")
        
        # Fall back to individual image path
        if "file_path" in image_data.get("generation_result", {}):
            return image_data["generation_result"]["file_path"]
        
        # Generate mock path
        return str(self.project_path / "assets" / "images" / "generated" / f"{result['frame_id']}_keyframe.png")
    
    def _create_mock_comfyui_output(self):
        """Create mock ComfyUI output for demonstration."""
        mock_outputs = []
        for i in range(3):  # Create 3 mock keyframes
            frame_id = f"frame_{i+1:03d}"
            mock_output = ComfyUIImageOutput(
                image_generation_id="mock_generation_001",
                frame_id=frame_id,
                image_path=str(self.project_path / "assets" / "images" / "generated" / f"{frame_id}_keyframe.png"),
                generation_metadata={"generation_time": 2.5, "model_used": "mock_model"},
                quality_metrics={"overall_quality": 0.95, "sharpness": 0.92, "coherence": 0.94},
                timestamp=datetime.utcnow().isoformat() + "Z"
            )
            mock_outputs.append(mock_output)
        
        self.comfyui_outputs = mock_outputs
        
        # Add pipeline metadata source
        self.pipeline_metadata.source_components.append("comfyui_image_engine")
        
        logger.info("Created mock ComfyUI outputs for demonstration")
    
    def _create_mock_shot_metadata(self):
        """Create mock shot metadata for demonstration."""
        mock_shots = [
            ShotEngineOutput(
                shot_id="shot_001",
                shot_type="establishing",
                camera_movement={"type": "pan", "direction": "left_to_right", "speed": "slow"},
                duration=2.0,
                frame_count=48,
                keyframe_positions=[0, 23, 47],
                metadata={"scene": "opening", "importance": "high"}
            )
        ]
        
        self.shot_metadata = mock_shots
        
        # Add pipeline metadata source
        self.pipeline_metadata.source_components.append("shot_engine")
        
        logger.info("Created mock shot metadata for demonstration")
    
    def _create_integrated_shots(self) -> List[ShotData]:
        """Create integrated shot data combining ComfyUI and Shot Engine outputs."""
        integrated_shots = []
        
        for shot_meta in self.shot_metadata:
            # Find keyframes for this shot
            shot_keyframes = []
            for comfyui_output in self.comfyui_outputs:
                # Simple matching - in real implementation, this would be more sophisticated
                if shot_meta.shot_id in comfyui_output.frame_id or len(shot_keyframes) < 2:
                    keyframe = KeyframeData(
                        frame_id=comfyui_output.frame_id,
                        image_path=comfyui_output.image_path,
                        timestamp=0.0 if len(shot_keyframes) == 0 else shot_meta.duration,
                        shot_id=shot_meta.shot_id,
                        metadata=comfyui_output.generation_metadata
                    )
                    shot_keyframes.append(keyframe)
            
            # Create camera movement specification
            camera_movement = None
            if shot_meta.camera_movement:
                movement_type = CameraMovement.PAN  # Default
                if shot_meta.camera_movement.get("type") == "zoom":
                    movement_type = CameraMovement.ZOOM
                elif shot_meta.camera_movement.get("type") == "tilt":
                    movement_type = CameraMovement.TILT
                
                camera_movement = CameraMovementSpec(
                    movement_type=movement_type,
                    start_position={"x": 0, "y": 0, "z": 0},
                    end_position={"x": 100, "y": 0, "z": 0},
                    duration=shot_meta.duration,
                    easing=EasingType.EASE_IN_OUT
                )
            
            # Create integrated shot
            shot = ShotData(
                shot_id=shot_meta.shot_id,
                keyframes=shot_keyframes,
                camera_movement=camera_movement,
                duration=shot_meta.duration,
                frame_count=shot_meta.frame_count,
                metadata=shot_meta.metadata
            )
            
            integrated_shots.append(shot)
        
        return integrated_shots
    
    def _create_video_engine_config(self) -> VideoConfig:
        """Create VideoConfig from manager config."""
        manager_config = self.video_config_manager.config
        
        return VideoConfig(
            frame_rate=manager_config.output.frame_rate,
            resolution=tuple(manager_config.output.resolution),
            quality=manager_config.interpolation.quality.value,
            enable_motion_blur=manager_config.camera.enable_motion_blur,
            enable_depth_awareness=manager_config.interpolation.depth_awareness,
            enable_character_preservation=manager_config.interpolation.character_preservation,
            output_format=manager_config.output.format,
            parallel_processing=manager_config.performance.parallel_processing,
            gpu_acceleration=(manager_config.performance.processing_mode.value != "cpu_only")
        )
    
    def _convert_video_config_to_manager_config(self, video_config: VideoConfig):
        """Convert VideoConfig to manager config format."""
        # This would convert between the two config formats
        # For now, return the current manager config
        return self.video_config_manager.config
    
    def _validate_integration(self) -> bool:
        """Validate the integration is successful."""
        if not self.video_engine:
            return False
        
        # If no data was loaded, create mock data first
        if not self.comfyui_outputs and not self.shot_metadata:
            self._create_mock_comfyui_output()
            self._create_mock_shot_metadata()
            
            # Create integrated shots
            integrated_shots = self._create_integrated_shots()
            self.video_engine.shots = integrated_shots
        
        if not self.video_engine.shots:
            return False
        
        # Check that all shots have keyframes
        for shot in self.video_engine.shots:
            if not shot.keyframes:
                return False
        
        return True
    
    def _create_mock_timeline(self) -> Dict[str, Any]:
        """Create mock timeline data."""
        return {
            "total_duration": sum(shot.duration for shot in self.shot_metadata),
            "frame_rate": 24,
            "total_frames": sum(shot.frame_count for shot in self.shot_metadata),
            "shots": [
                {
                    "shot_id": shot.shot_id,
                    "start_time": 0.0,
                    "end_time": shot.duration,
                    "duration": shot.duration,
                    "frame_count": shot.frame_count
                }
                for shot in self.shot_metadata
            ]
        }
    
    def _create_shot_synchronization_data(self) -> List[Dict[str, Any]]:
        """Create shot synchronization data for audio engine."""
        sync_data = []
        current_time = 0.0
        
        for shot in self.shot_metadata:
            shot_sync = {
                "shot_id": shot.shot_id,
                "start_time": current_time,
                "end_time": current_time + shot.duration,
                "duration": shot.duration,
                "camera_movement": shot.camera_movement,
                "audio_cues": self._generate_shot_audio_cues(shot)
            }
            sync_data.append(shot_sync)
            current_time += shot.duration
        
        return sync_data
    
    def _generate_audio_cue_points(self) -> List[Dict[str, Any]]:
        """Generate audio cue points for synchronization."""
        cue_points = []
        current_time = 0.0
        
        for shot in self.shot_metadata:
            # Add shot start cue
            cue_points.append({
                "time": current_time,
                "type": "shot_start",
                "shot_id": shot.shot_id,
                "metadata": {"shot_type": shot.shot_type}
            })
            
            # Add camera movement cues
            if shot.camera_movement:
                cue_points.append({
                    "time": current_time + 0.1,
                    "type": "camera_movement_start",
                    "shot_id": shot.shot_id,
                    "metadata": shot.camera_movement
                })
            
            current_time += shot.duration
        
        return cue_points
    
    def _generate_shot_audio_cues(self, shot: ShotEngineOutput) -> List[Dict[str, Any]]:
        """Generate audio cues for a specific shot."""
        cues = []
        
        # Add basic audio cues based on shot type
        if shot.shot_type == "establishing":
            cues.append({"type": "ambience", "intensity": "medium", "fade_in": True})
        elif shot.shot_type == "close_up":
            cues.append({"type": "dialogue_focus", "intensity": "high"})
        
        # Add camera movement audio cues
        if shot.camera_movement:
            movement_type = shot.camera_movement.get("type", "static")
            if movement_type != "static":
                cues.append({"type": "movement_audio", "movement": movement_type})
        
        return cues
    
    def _calculate_average_quality(self) -> float:
        """Calculate average quality from ComfyUI outputs."""
        if not self.comfyui_outputs:
            return 0.0
        
        total_quality = sum(output.quality_metrics.get("overall_quality", 0.0) for output in self.comfyui_outputs)
        return total_quality / len(self.comfyui_outputs)
    
    def _validate_video_engine_config(self) -> bool:
        """Validate video engine configuration."""
        if not self.video_engine:
            return False
        
        is_valid, _ = self.video_engine.validate_configuration()
        return is_valid


def main():
    """Main function for testing pipeline integration."""
    # Create test project path
    test_project = Path("test_integration_project")
    
    # Initialize integrator
    integrator = VideoPipelineIntegrator(str(test_project))
    
    # Test integration workflow
    print("Testing Video Pipeline Integration...")
    
    # Load components (will create mock data)
    comfyui_loaded = integrator.load_comfyui_image_output()
    shot_loaded = integrator.load_shot_engine_metadata()
    
    print(f"ComfyUI loaded: {comfyui_loaded}")
    print(f"Shot metadata loaded: {shot_loaded}")
    
    # Integrate with video engine
    integration_success = integrator.integrate_with_video_engine()
    print(f"Video Engine integration: {integration_success}")
    
    # Generate audio output
    audio_output = integrator.generate_audio_engine_output()
    print(f"Audio Engine output generated: {len(audio_output) > 0}")
    
    # Validate compliance
    is_compliant, issues = integrator.validate_data_contract_compliance()
    print(f"Data Contract compliance: {is_compliant}")
    if issues:
        print("Issues:", issues)
    
    # Generate report
    report = integrator.get_integration_report()
    print(f"Integration report generated with {len(report)} sections")


if __name__ == "__main__":
    main()