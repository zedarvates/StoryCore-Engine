#!/usr/bin/env python3
"""
Tests for Video Pipeline Integration
Validates integration with ComfyUI Image Engine, Shot Engine, and Audio Engine.
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from video_pipeline_integration import (
    VideoPipelineIntegrator, 
    ComfyUIImageOutput, 
    ShotEngineOutput, 
    PipelineMetadata
)
from video_engine import VideoConfig


class TestVideoPipelineIntegration:
    """Test suite for video pipeline integration."""
    
    @pytest.fixture
    def temp_project(self):
        """Create a temporary project directory with required structure."""
        temp_dir = tempfile.mkdtemp()
        project_path = Path(temp_dir) / "test_project"
        project_path.mkdir(parents=True)
        
        # Create project.json
        project_data = {
            "schema_version": "1.0",
            "project_name": "test_project",
            "capabilities": {
                "video_generation": True,
                "image_generation": True,
                "audio_generation": True
            },
            "generation_status": {
                "images": "done",
                "video": "pending",
                "audio": "pending"
            }
        }
        
        with open(project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        # Create directory structure
        (project_path / "assets" / "images" / "generated").mkdir(parents=True)
        (project_path / "assets" / "video" / "sequences").mkdir(parents=True)
        (project_path / "assets" / "audio").mkdir(parents=True)
        
        yield project_path
        
        # Cleanup
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def comfyui_metadata(self, temp_project):
        """Create ComfyUI image generation metadata."""
        metadata = {
            "schema_version": "1.0",
            "image_generation_id": "test_generation_001",
            "created_at": "2024-01-01T12:00:00Z",
            "generation_results": [
                {
                    "frame_id": "frame_001",
                    "generation_timestamp": "2024-01-01T12:00:00Z",
                    "generated_images": [
                        {
                            "type": "keyframe",
                            "generation_result": {
                                "file_path": "assets/images/generated/frame_001_keyframe.png",
                                "generation_time": 2.5,
                                "quality_metrics": {
                                    "overall_quality": 0.95,
                                    "sharpness": 0.92,
                                    "coherence": 0.94
                                }
                            }
                        }
                    ],
                    "final_composite": {
                        "file_path": "assets/images/generated/frame_001_composite.png",
                        "quality_score": 0.96
                    }
                },
                {
                    "frame_id": "frame_002",
                    "generation_timestamp": "2024-01-01T12:00:05Z",
                    "generated_images": [
                        {
                            "type": "keyframe",
                            "generation_result": {
                                "file_path": "assets/images/generated/frame_002_keyframe.png",
                                "generation_time": 2.3,
                                "quality_metrics": {
                                    "overall_quality": 0.93,
                                    "sharpness": 0.90,
                                    "coherence": 0.92
                                }
                            }
                        }
                    ],
                    "final_composite": {
                        "file_path": "assets/images/generated/frame_002_composite.png",
                        "quality_score": 0.94
                    }
                }
            ]
        }
        
        metadata_file = temp_project / "image_generation_metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return metadata
    
    @pytest.fixture
    def shot_metadata(self, temp_project):
        """Create Shot Engine metadata."""
        metadata = {
            "schema_version": "1.0",
            "shot_planning_id": "test_shots_001",
            "created_at": "2024-01-01T11:00:00Z",
            "shot_list": [
                {
                    "shot_id": "shot_001",
                    "shot_type": "establishing",
                    "camera_movement": {
                        "type": "pan",
                        "direction": "left_to_right",
                        "speed": "slow"
                    },
                    "duration": 2.0,
                    "frame_count": 48,
                    "keyframe_positions": [0, 23, 47],
                    "metadata": {
                        "scene": "opening",
                        "importance": "high"
                    }
                },
                {
                    "shot_id": "shot_002",
                    "shot_type": "close_up",
                    "camera_movement": {
                        "type": "zoom",
                        "direction": "in",
                        "speed": "medium"
                    },
                    "duration": 1.5,
                    "frame_count": 36,
                    "keyframe_positions": [0, 35],
                    "metadata": {
                        "scene": "dialogue",
                        "importance": "medium"
                    }
                }
            ]
        }
        
        metadata_file = temp_project / "shot_planning.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return metadata
    
    def test_integrator_initialization(self, temp_project):
        """Test pipeline integrator initialization."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        assert integrator.project_path == temp_project
        assert integrator.pipeline_metadata.schema_version == "1.0"
        assert integrator.pipeline_metadata.data_contract_compliance == True
        assert len(integrator.comfyui_outputs) == 0
        assert len(integrator.shot_metadata) == 0
    
    def test_load_comfyui_image_output(self, temp_project, comfyui_metadata):
        """Test loading ComfyUI image output."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        success = integrator.load_comfyui_image_output()
        
        assert success == True
        assert len(integrator.comfyui_outputs) == 2
        assert "comfyui_image_engine" in integrator.pipeline_metadata.source_components
        
        # Verify first output
        output1 = integrator.comfyui_outputs[0]
        assert output1.image_generation_id == "test_generation_001"
        assert output1.frame_id == "frame_001"
        assert "frame_001_composite.png" in output1.image_path
        assert output1.quality_metrics["overall_quality"] == 0.95
    
    def test_load_comfyui_missing_metadata(self, temp_project):
        """Test loading ComfyUI output when metadata is missing."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        success = integrator.load_comfyui_image_output()
        
        # Should succeed with mock data
        assert success == True
        assert len(integrator.comfyui_outputs) == 3  # Mock creates 3 outputs
        assert "comfyui_image_engine" in integrator.pipeline_metadata.source_components
    
    def test_load_shot_engine_metadata(self, temp_project, shot_metadata):
        """Test loading Shot Engine metadata."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        success = integrator.load_shot_engine_metadata()
        
        assert success == True
        assert len(integrator.shot_metadata) == 2
        assert "shot_engine" in integrator.pipeline_metadata.source_components
        
        # Verify first shot
        shot1 = integrator.shot_metadata[0]
        assert shot1.shot_id == "shot_001"
        assert shot1.shot_type == "establishing"
        assert shot1.duration == 2.0
        assert shot1.camera_movement["type"] == "pan"
    
    def test_load_shot_missing_metadata(self, temp_project):
        """Test loading shot metadata when file is missing."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        success = integrator.load_shot_engine_metadata()
        
        # Should succeed with mock data
        assert success == True
        assert len(integrator.shot_metadata) == 1  # Mock creates 1 shot
        assert "shot_engine" in integrator.pipeline_metadata.source_components
    
    def test_integrate_with_video_engine(self, temp_project, comfyui_metadata, shot_metadata):
        """Test integration with Video Engine."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Load data first
        integrator.load_comfyui_image_output()
        integrator.load_shot_engine_metadata()
        
        # Integrate with video engine
        success = integrator.integrate_with_video_engine()
        
        assert success == True
        assert integrator.video_engine is not None
        assert len(integrator.video_engine.shots) == 2
        assert "video_engine" in integrator.pipeline_metadata.source_components
        
        # Verify shot integration
        shot1 = integrator.video_engine.shots[0]
        assert shot1.shot_id == "shot_001"
        assert len(shot1.keyframes) >= 1
        assert shot1.camera_movement is not None
    
    def test_integrate_with_custom_config(self, temp_project):
        """Test integration with custom video configuration."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Load mock data
        integrator.load_comfyui_image_output()
        integrator.load_shot_engine_metadata()
        
        # Create custom config
        custom_config = VideoConfig(
            frame_rate=30,
            resolution=(1280, 720),
            quality="medium"
        )
        
        success = integrator.integrate_with_video_engine(custom_config)
        
        assert success == True
        assert integrator.video_engine.config.frame_rate == 30
        assert integrator.video_engine.config.resolution == (1280, 720)
    
    def test_generate_audio_engine_output(self, temp_project, comfyui_metadata, shot_metadata):
        """Test generating audio engine compatible output."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Load and integrate data
        integrator.load_comfyui_image_output()
        integrator.load_shot_engine_metadata()
        integrator.integrate_with_video_engine()
        
        # Generate audio output
        audio_output = integrator.generate_audio_engine_output()
        
        assert len(audio_output) > 0
        assert "schema_version" in audio_output
        assert "video_timeline_id" in audio_output
        assert "timeline_metadata" in audio_output
        assert "shot_synchronization" in audio_output
        assert "audio_cue_points" in audio_output
        
        # Verify synchronization data
        sync_data = audio_output["shot_synchronization"]
        assert len(sync_data) == 2
        assert sync_data[0]["shot_id"] == "shot_001"
        assert sync_data[0]["start_time"] == 0.0
        assert sync_data[0]["end_time"] == 2.0
        
        # Verify audio cue points
        cue_points = audio_output["audio_cue_points"]
        assert len(cue_points) >= 2  # At least shot start cues
        
        # Verify file was saved
        sync_file = temp_project / "video_audio_synchronization.json"
        assert sync_file.exists()
    
    def test_validate_data_contract_compliance(self, temp_project, comfyui_metadata, shot_metadata):
        """Test Data Contract v1 compliance validation."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Load data
        integrator.load_comfyui_image_output()
        integrator.load_shot_engine_metadata()
        integrator.integrate_with_video_engine()
        
        # Validate compliance
        is_compliant, issues = integrator.validate_data_contract_compliance()
        
        assert is_compliant == True
        assert len(issues) == 0
        assert integrator.pipeline_metadata.data_contract_compliance == True
    
    def test_validate_data_contract_missing_project(self, temp_project):
        """Test compliance validation with missing project.json."""
        # Remove project.json
        (temp_project / "project.json").unlink()
        
        integrator = VideoPipelineIntegrator(str(temp_project))
        integrator.load_comfyui_image_output()  # Creates mock data
        integrator.load_shot_engine_metadata()  # Creates mock data
        
        is_compliant, issues = integrator.validate_data_contract_compliance()
        
        assert is_compliant == False
        assert "Missing project.json file" in issues
    
    def test_validate_data_contract_invalid_schema(self, temp_project):
        """Test compliance validation with invalid schema version."""
        # Update project.json with invalid schema
        project_data = {
            "schema_version": "2.0",  # Invalid version
            "project_name": "test_project",
            "capabilities": {"video_generation": True}
        }
        
        with open(temp_project / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        integrator = VideoPipelineIntegrator(str(temp_project))
        integrator.load_comfyui_image_output()
        integrator.load_shot_engine_metadata()
        
        is_compliant, issues = integrator.validate_data_contract_compliance()
        
        assert is_compliant == False
        assert any("Invalid schema version" in issue for issue in issues)
    
    def test_get_integration_report(self, temp_project, comfyui_metadata, shot_metadata):
        """Test generating comprehensive integration report."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Load and integrate data
        integrator.load_comfyui_image_output()
        integrator.load_shot_engine_metadata()
        integrator.integrate_with_video_engine()
        
        # Generate report
        report = integrator.get_integration_report()
        
        assert "integration_id" in report
        assert "pipeline_metadata" in report
        assert "data_contract_compliance" in report
        assert "component_status" in report
        assert "integration_metrics" in report
        
        # Verify component status
        component_status = report["component_status"]
        assert component_status["comfyui_image_engine"]["loaded"] == True
        assert component_status["comfyui_image_engine"]["keyframes_count"] == 2
        assert component_status["shot_engine"]["loaded"] == True
        assert component_status["shot_engine"]["shots_count"] == 2
        assert component_status["video_engine"]["initialized"] == True
        assert component_status["video_engine"]["shots_integrated"] == 2
        
        # Verify integration metrics
        metrics = report["integration_metrics"]
        assert metrics["total_keyframes"] == 2
        assert metrics["total_shots"] == 2
        assert metrics["average_shot_duration"] == 1.75  # (2.0 + 1.5) / 2
        assert metrics["keyframes_per_shot"] == 1.0  # 2 keyframes / 2 shots
    
    def test_comfyui_data_contract_validation(self, temp_project):
        """Test ComfyUI data contract validation."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Valid data
        valid_data = {
            "schema_version": "1.0",
            "image_generation_id": "test_001",
            "generation_results": []
        }
        assert integrator._validate_comfyui_data_contract(valid_data) == True
        
        # Invalid data - missing required field
        invalid_data = {
            "schema_version": "1.0",
            "image_generation_id": "test_001"
            # Missing generation_results
        }
        assert integrator._validate_comfyui_data_contract(invalid_data) == False
    
    def test_shot_data_contract_validation(self, temp_project):
        """Test Shot Engine data contract validation."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Valid data
        valid_data = {
            "schema_version": "1.0",
            "shot_planning_id": "test_001",
            "shot_list": []
        }
        assert integrator._validate_shot_data_contract(valid_data) == True
        
        # Invalid data - missing required field
        invalid_data = {
            "schema_version": "1.0",
            "shot_planning_id": "test_001"
            # Missing shot_list
        }
        assert integrator._validate_shot_data_contract(invalid_data) == False
    
    def test_audio_cue_generation(self, temp_project, shot_metadata):
        """Test audio cue point generation."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        integrator.load_shot_engine_metadata()
        
        # Generate cue points
        cue_points = integrator._generate_audio_cue_points()
        
        assert len(cue_points) >= 4  # At least 2 shot starts + 2 camera movements
        
        # Verify shot start cues
        shot_start_cues = [cue for cue in cue_points if cue["type"] == "shot_start"]
        assert len(shot_start_cues) == 2
        assert shot_start_cues[0]["time"] == 0.0
        assert shot_start_cues[0]["shot_id"] == "shot_001"
        
        # Verify camera movement cues
        camera_cues = [cue for cue in cue_points if cue["type"] == "camera_movement_start"]
        assert len(camera_cues) == 2
    
    def test_shot_audio_cue_generation(self, temp_project):
        """Test shot-specific audio cue generation."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Test establishing shot
        establishing_shot = ShotEngineOutput(
            shot_id="shot_001",
            shot_type="establishing",
            camera_movement={"type": "pan"},
            duration=2.0,
            frame_count=48,
            keyframe_positions=[0, 47],
            metadata={}
        )
        
        cues = integrator._generate_shot_audio_cues(establishing_shot)
        
        assert len(cues) >= 1
        assert any(cue["type"] == "ambience" for cue in cues)
        assert any(cue["type"] == "movement_audio" for cue in cues)
        
        # Test close-up shot
        closeup_shot = ShotEngineOutput(
            shot_id="shot_002",
            shot_type="close_up",
            camera_movement={"type": "static"},
            duration=1.5,
            frame_count=36,
            keyframe_positions=[0, 35],
            metadata={}
        )
        
        cues = integrator._generate_shot_audio_cues(closeup_shot)
        
        assert any(cue["type"] == "dialogue_focus" for cue in cues)
    
    def test_quality_calculation(self, temp_project, comfyui_metadata):
        """Test average quality calculation."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        integrator.load_comfyui_image_output()
        
        avg_quality = integrator._calculate_average_quality()
        
        # Should be average of 0.95 and 0.93
        expected_avg = (0.95 + 0.93) / 2
        assert abs(avg_quality - expected_avg) < 0.01
    
    def test_integration_without_data(self, temp_project):
        """Test integration behavior when no data is available."""
        integrator = VideoPipelineIntegrator(str(temp_project))
        
        # Try to integrate without loading data
        success = integrator.integrate_with_video_engine()
        
        # Should succeed with mock data
        assert success == True
        assert integrator.video_engine is not None
        assert len(integrator.video_engine.shots) >= 1


class TestPipelineDataStructures:
    """Test pipeline data structures."""
    
    def test_pipeline_metadata_initialization(self):
        """Test PipelineMetadata initialization."""
        metadata = PipelineMetadata()
        
        assert metadata.schema_version == "1.0"
        assert metadata.integration_timestamp != ""
        assert metadata.source_components == []
        assert metadata.data_contract_compliance == True
    
    def test_comfyui_image_output_structure(self):
        """Test ComfyUIImageOutput data structure."""
        output = ComfyUIImageOutput(
            image_generation_id="test_001",
            frame_id="frame_001",
            image_path="/path/to/image.png",
            generation_metadata={"time": 2.5},
            quality_metrics={"quality": 0.95},
            timestamp="2024-01-01T12:00:00Z"
        )
        
        assert output.image_generation_id == "test_001"
        assert output.frame_id == "frame_001"
        assert output.image_path == "/path/to/image.png"
        assert output.generation_metadata["time"] == 2.5
        assert output.quality_metrics["quality"] == 0.95
    
    def test_shot_engine_output_structure(self):
        """Test ShotEngineOutput data structure."""
        output = ShotEngineOutput(
            shot_id="shot_001",
            shot_type="establishing",
            camera_movement={"type": "pan"},
            duration=2.0,
            frame_count=48,
            keyframe_positions=[0, 23, 47],
            metadata={"scene": "opening"}
        )
        
        assert output.shot_id == "shot_001"
        assert output.shot_type == "establishing"
        assert output.camera_movement["type"] == "pan"
        assert output.duration == 2.0
        assert output.frame_count == 48
        assert len(output.keyframe_positions) == 3


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])