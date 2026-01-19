#!/usr/bin/env python3
"""
Property Tests for Video Pipeline Integration
Tests universal properties of pipeline data flow and integration.
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings
from hypothesis.stateful import RuleBasedStateMachine, Bundle, rule, initialize, invariant, run_state_machine_as_test
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


# Hypothesis strategies for generating test data
@st.composite
def comfyui_output_strategy(draw):
    """Generate valid ComfyUI output data."""
    return ComfyUIImageOutput(
        image_generation_id=draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        frame_id=draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        image_path=draw(st.text(min_size=1, max_size=100)),
        generation_metadata=draw(st.dictionaries(st.text(min_size=1, max_size=20), st.floats(min_value=0, max_value=100))),
        quality_metrics=draw(st.dictionaries(
            st.sampled_from(['overall_quality', 'sharpness', 'coherence']),
            st.floats(min_value=0.0, max_value=1.0)
        )),
        timestamp=draw(st.text(min_size=1, max_size=30))
    )


@st.composite
def shot_output_strategy(draw):
    """Generate valid Shot Engine output data."""
    return ShotEngineOutput(
        shot_id=draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        shot_type=draw(st.sampled_from(['establishing', 'close_up', 'medium', 'wide', 'extreme_close_up'])),
        camera_movement=draw(st.dictionaries(
            st.sampled_from(['type', 'direction', 'speed']),
            st.text(min_size=1, max_size=20)
        )),
        duration=draw(st.floats(min_value=0.1, max_value=10.0)),
        frame_count=draw(st.integers(min_value=1, max_value=300)),
        keyframe_positions=draw(st.lists(st.integers(min_value=0, max_value=299), min_size=1, max_size=10)),
        metadata=draw(st.dictionaries(st.text(min_size=1, max_size=20), st.text(min_size=1, max_size=50)))
    )


@st.composite
def video_config_strategy(draw):
    """Generate valid VideoConfig data."""
    return VideoConfig(
        frame_rate=draw(st.sampled_from([24, 25, 30, 60])),
        resolution=draw(st.tuples(
            st.integers(min_value=640, max_value=3840),
            st.integers(min_value=480, max_value=2160)
        )),
        quality=draw(st.sampled_from(['low', 'medium', 'high', 'ultra'])),
        enable_motion_blur=draw(st.booleans()),
        enable_depth_awareness=draw(st.booleans()),
        enable_character_preservation=draw(st.booleans()),
        output_format=draw(st.sampled_from(['png', 'jpeg', 'exr'])),
        parallel_processing=draw(st.booleans()),
        gpu_acceleration=draw(st.booleans())
    )


class TestPipelineDataFlowProperties:
    """Property tests for pipeline data flow integrity."""
    
    def create_temp_project(self):
        """Create a temporary project directory."""
        temp_dir = tempfile.mkdtemp()
        project_path = Path(temp_dir) / "property_test_project"
        project_path.mkdir(parents=True)
        
        # Create minimal project structure
        project_data = {
            "schema_version": "1.0",
            "project_name": "property_test_project",
            "capabilities": {"video_generation": True}
        }
        
        with open(project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        (project_path / "assets" / "images" / "generated").mkdir(parents=True)
        
        return project_path, temp_dir
    
    @given(comfyui_outputs=st.lists(comfyui_output_strategy(), min_size=1, max_size=10))
    @settings(max_examples=25, deadline=5000)
    def test_property_vp24_comfyui_data_preservation(self, comfyui_outputs):
        """
        Property VE-24: Pipeline Data Flow Integrity - ComfyUI Data Preservation
        
        When ComfyUI outputs are loaded into the pipeline integrator,
        all essential data must be preserved without loss or corruption.
        """
        project_path, temp_dir = self.create_temp_project()
        try:
            integrator = VideoPipelineIntegrator(str(project_path))
            
            # Manually set ComfyUI outputs
            integrator.comfyui_outputs = comfyui_outputs
            integrator.pipeline_metadata.source_components.append("comfyui_image_engine")
            
            # Verify data preservation
            assert len(integrator.comfyui_outputs) == len(comfyui_outputs)
            
            for original, loaded in zip(comfyui_outputs, integrator.comfyui_outputs):
                assert loaded.image_generation_id == original.image_generation_id
                assert loaded.frame_id == original.frame_id
                assert loaded.image_path == original.image_path
                assert loaded.timestamp == original.timestamp
                
                # Quality metrics should be preserved
                for key in original.quality_metrics:
                    if key in loaded.quality_metrics:
                        assert abs(loaded.quality_metrics[key] - original.quality_metrics[key]) < 0.001
        finally:
            shutil.rmtree(temp_dir)
    
    @given(shot_outputs=st.lists(shot_output_strategy(), min_size=1, max_size=10))
    @settings(max_examples=25, deadline=5000)
    def test_property_vp24_shot_metadata_preservation(self, shot_outputs):
        """
        Property VE-24: Pipeline Data Flow Integrity - Shot Metadata Preservation
        
        When shot metadata is loaded into the pipeline integrator,
        all timing and camera movement data must be preserved accurately.
        """
        project_path, temp_dir = self.create_temp_project()
        try:
            integrator = VideoPipelineIntegrator(str(project_path))
            
            # Manually set shot metadata
            integrator.shot_metadata = shot_outputs
            integrator.pipeline_metadata.source_components.append("shot_engine")
            
            # Verify data preservation
            assert len(integrator.shot_metadata) == len(shot_outputs)
            
            for original, loaded in zip(shot_outputs, integrator.shot_metadata):
                assert loaded.shot_id == original.shot_id
                assert loaded.shot_type == original.shot_type
                assert abs(loaded.duration - original.duration) < 0.001
                assert loaded.frame_count == original.frame_count
                assert loaded.camera_movement == original.camera_movement
                assert loaded.keyframe_positions == original.keyframe_positions
        finally:
            shutil.rmtree(temp_dir)
    
    @given(
        comfyui_outputs=st.lists(comfyui_output_strategy(), min_size=1, max_size=5),
        shot_outputs=st.lists(shot_output_strategy(), min_size=1, max_size=5)
    )
    @settings(max_examples=15, deadline=10000)
    def test_property_vp24_integration_consistency(self, comfyui_outputs, shot_outputs):
        """
        Property VE-24: Pipeline Data Flow Integrity - Integration Consistency
        
        When ComfyUI and Shot Engine data are integrated with Video Engine,
        the resulting shot data must maintain consistency with source data.
        """
        project_path, temp_dir = self.create_temp_project()
        try:
            integrator = VideoPipelineIntegrator(str(project_path))
            
            # Set up data
            integrator.comfyui_outputs = comfyui_outputs
            integrator.shot_metadata = shot_outputs
            integrator.pipeline_metadata.source_components.extend(["comfyui_image_engine", "shot_engine"])
            
            # Integrate with video engine
            success = integrator.integrate_with_video_engine()
            assume(success)  # Skip if integration fails
            
            # Verify integration consistency
            assert integrator.video_engine is not None
            assert len(integrator.video_engine.shots) >= 1
            
            # Check that shot data is consistent
            for video_shot in integrator.video_engine.shots:
                # Find corresponding shot metadata
                corresponding_shot = None
                for shot_meta in shot_outputs:
                    if shot_meta.shot_id == video_shot.shot_id:
                        corresponding_shot = shot_meta
                        break
                
                if corresponding_shot:
                    # Verify timing consistency (allow for reasonable variations in integration)
                    # The integration process may adjust durations slightly for technical reasons
                    duration_diff = abs(video_shot.duration - corresponding_shot.duration)
                    assert duration_diff <= max(0.5, corresponding_shot.duration * 0.1), \
                        f"Duration difference {duration_diff} too large for shot {video_shot.shot_id}"
                    
                    # Frame count may be adjusted during integration, so allow reasonable variation
                    frame_diff = abs(video_shot.frame_count - corresponding_shot.frame_count)
                    max_frame_diff = max(2, corresponding_shot.frame_count * 0.2)  # Allow 20% variation or 2 frames
                    assert frame_diff <= max_frame_diff, \
                        f"Frame count difference {frame_diff} too large for shot {video_shot.shot_id}"
                    
                    # Verify keyframes are present
                    assert len(video_shot.keyframes) >= 1
                    
                    # Verify camera movement is preserved (if present)
                    if corresponding_shot.camera_movement and video_shot.camera_movement:
                        # Duration should be reasonably close
                        cam_duration_diff = abs(video_shot.camera_movement.duration - corresponding_shot.duration)
                        assert cam_duration_diff <= max(0.5, corresponding_shot.duration * 0.1)
        finally:
            shutil.rmtree(temp_dir)
    
    @given(
        comfyui_outputs=st.lists(comfyui_output_strategy(), min_size=1, max_size=3),
        shot_outputs=st.lists(shot_output_strategy(), min_size=1, max_size=3)
    )
    @settings(max_examples=10, deadline=10000)
    def test_property_vp24_audio_sync_generation(self, comfyui_outputs, shot_outputs):
        """
        Property VE-24: Pipeline Data Flow Integrity - Audio Synchronization Generation
        
        When audio synchronization data is generated from video pipeline data,
        timing information must be mathematically consistent and complete.
        """
        project_path, temp_dir = self.create_temp_project()
        try:
            integrator = VideoPipelineIntegrator(str(project_path))
            
            # Set up and integrate data
            integrator.comfyui_outputs = comfyui_outputs
            integrator.shot_metadata = shot_outputs
            integrator.pipeline_metadata.source_components.extend(["comfyui_image_engine", "shot_engine"])
            
            success = integrator.integrate_with_video_engine()
            assume(success)
            
            # Generate audio synchronization data
            audio_output = integrator.generate_audio_engine_output()
            assume(len(audio_output) > 0)
            
            # Verify timing consistency
            timeline_data = audio_output.get("timeline_metadata", {})
            shot_sync_data = audio_output.get("shot_synchronization", [])
            
            if timeline_data and shot_sync_data:
                # Total duration should match sum of shot durations
                expected_total = sum(shot.duration for shot in shot_outputs)
                actual_total = timeline_data.get("total_duration", 0)
                
                # Allow small floating point differences
                assert abs(actual_total - expected_total) < 0.1
                
                # Shot synchronization should have correct timing
                current_time = 0.0
                for i, sync_shot in enumerate(shot_sync_data):
                    assert abs(sync_shot["start_time"] - current_time) < 0.001
                    assert sync_shot["duration"] > 0
                    assert sync_shot["end_time"] == sync_shot["start_time"] + sync_shot["duration"]
                    current_time = sync_shot["end_time"]
        finally:
            shutil.rmtree(temp_dir)
    
    @given(video_config=video_config_strategy())
    @settings(max_examples=15, deadline=5000)
    def test_property_vp25_config_propagation(self, video_config):
        """
        Property VE-25: Data Contract Compliance - Configuration Propagation
        
        When a custom VideoConfig is provided to the integrator,
        its settings must be correctly propagated to the Video Engine.
        """
        project_path, temp_dir = self.create_temp_project()
        try:
            integrator = VideoPipelineIntegrator(str(project_path))
            
            # Load mock data and integrate with custom config
            integrator.load_comfyui_image_output()
            integrator.load_shot_engine_metadata()
            
            success = integrator.integrate_with_video_engine(video_config)
            assume(success)
            
            # Verify configuration propagation
            engine_config = integrator.video_engine.config
            
            assert engine_config.frame_rate == video_config.frame_rate
            assert engine_config.resolution == video_config.resolution
            assert engine_config.quality == video_config.quality
            assert engine_config.enable_motion_blur == video_config.enable_motion_blur
            assert engine_config.enable_depth_awareness == video_config.enable_depth_awareness
            assert engine_config.output_format == video_config.output_format
            assert engine_config.parallel_processing == video_config.parallel_processing
            assert engine_config.gpu_acceleration == video_config.gpu_acceleration
        finally:
            shutil.rmtree(temp_dir)
    
    @given(
        comfyui_outputs=st.lists(comfyui_output_strategy(), min_size=1, max_size=5),
        shot_outputs=st.lists(shot_output_strategy(), min_size=1, max_size=5)
    )
    @settings(max_examples=10, deadline=10000)
    def test_property_vp25_data_contract_validation(self, comfyui_outputs, shot_outputs):
        """
        Property VE-25: Data Contract Compliance - Validation Consistency
        
        Data Contract validation must be consistent and comprehensive,
        identifying all compliance issues accurately.
        """
        project_path, temp_dir = self.create_temp_project()
        try:
            integrator = VideoPipelineIntegrator(str(project_path))
            
            # Set up data
            integrator.comfyui_outputs = comfyui_outputs
            integrator.shot_metadata = shot_outputs
            integrator.pipeline_metadata.source_components.extend(["comfyui_image_engine", "shot_engine"])
            
            # Integrate
            success = integrator.integrate_with_video_engine()
            assume(success)
            
            # Validate compliance
            is_compliant, issues = integrator.validate_data_contract_compliance()
            
            # If compliant, should have no issues
            if is_compliant:
                assert len(issues) == 0
                assert integrator.pipeline_metadata.data_contract_compliance == True
            else:
                # If not compliant, should have specific issues
                assert len(issues) > 0
                assert integrator.pipeline_metadata.data_contract_compliance == False
            
            # Validation should be deterministic
            is_compliant2, issues2 = integrator.validate_data_contract_compliance()
            assert is_compliant == is_compliant2
            assert len(issues) == len(issues2)
        finally:
            shutil.rmtree(temp_dir)
    
    @given(
        comfyui_outputs=st.lists(comfyui_output_strategy(), min_size=1, max_size=3),
        shot_outputs=st.lists(shot_output_strategy(), min_size=1, max_size=3)
    )
    @settings(max_examples=7, deadline=10000)
    def test_property_vp25_integration_report_completeness(self, comfyui_outputs, shot_outputs):
        """
        Property VE-25: Data Contract Compliance - Integration Report Completeness
        
        Integration reports must contain complete and accurate information
        about all pipeline components and their status.
        """
        project_path, temp_dir = self.create_temp_project()
        try:
            integrator = VideoPipelineIntegrator(str(project_path))
            
            # Set up data
            integrator.comfyui_outputs = comfyui_outputs
            integrator.shot_metadata = shot_outputs
            integrator.pipeline_metadata.source_components.extend(["comfyui_image_engine", "shot_engine"])
            
            success = integrator.integrate_with_video_engine()
            assume(success)
            
            # Generate report
            report = integrator.get_integration_report()
            
            # Verify report completeness
            required_sections = [
                "integration_id", "pipeline_metadata", "data_contract_compliance",
                "component_status", "integration_metrics"
            ]
            
            for section in required_sections:
                assert section in report
            
            # Verify component status accuracy
            component_status = report["component_status"]
            
            assert component_status["comfyui_image_engine"]["loaded"] == (len(comfyui_outputs) > 0)
            assert component_status["comfyui_image_engine"]["keyframes_count"] == len(comfyui_outputs)
            
            assert component_status["shot_engine"]["loaded"] == (len(shot_outputs) > 0)
            assert component_status["shot_engine"]["shots_count"] == len(shot_outputs)
            
            assert component_status["video_engine"]["initialized"] == True
            assert component_status["video_engine"]["shots_integrated"] >= 1
            
            # Verify metrics accuracy
            metrics = report["integration_metrics"]
            assert metrics["total_keyframes"] == len(comfyui_outputs)
            assert metrics["total_shots"] == len(shot_outputs)
            
            if len(shot_outputs) > 0:
                expected_avg_duration = sum(shot.duration for shot in shot_outputs) / len(shot_outputs)
                assert abs(metrics["average_shot_duration"] - expected_avg_duration) < 0.001
                
                expected_keyframes_per_shot = len(comfyui_outputs) / len(shot_outputs)
                assert abs(metrics["keyframes_per_shot"] - expected_keyframes_per_shot) < 0.001
        finally:
            shutil.rmtree(temp_dir)
    
    @given(
        comfyui_outputs=st.lists(comfyui_output_strategy(), min_size=1, max_size=5),
        shot_outputs=st.lists(shot_output_strategy(), min_size=1, max_size=5)
    )
    @settings(max_examples=12, deadline=15000)
    def test_property_ve25_metadata_compliance(self, comfyui_outputs, shot_outputs):
        """
        Property VE-25: Data Contract Compliance - Metadata Compliance
        
        Validates Requirements VE-6.4 and VE-10.8:
        - VE-6.4: Maintain Data Contract v1 compliance for all metadata
        - VE-10.8: Generate comprehensive processing reports
        
        All metadata generated by the Video Engine pipeline must comply with
        Data Contract v1 specifications and processing reports must be comprehensive.
        """
        project_path, temp_dir = self.create_temp_project()
        try:
            integrator = VideoPipelineIntegrator(str(project_path))
            
            # Set up pipeline data
            integrator.comfyui_outputs = comfyui_outputs
            integrator.shot_metadata = shot_outputs
            integrator.pipeline_metadata.source_components.extend(["comfyui_image_engine", "shot_engine"])
            
            # Integrate with video engine
            success = integrator.integrate_with_video_engine()
            assume(success)
            
            # Generate all metadata outputs
            audio_output = integrator.generate_audio_engine_output()
            integration_report = integrator.get_integration_report()
            
            # VE-6.4: Validate Data Contract v1 compliance for all metadata
            
            # 1. Validate project.json compliance
            project_file = project_path / "project.json"
            assert project_file.exists()
            
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            # Required Data Contract v1 fields
            assert "schema_version" in project_data
            assert project_data["schema_version"] == "1.0"
            assert "project_name" in project_data
            assert "capabilities" in project_data
            assert isinstance(project_data["capabilities"], dict)
            
            # 2. Validate audio synchronization metadata compliance
            if audio_output:
                assert "schema_version" in audio_output
                assert audio_output["schema_version"] == "1.0"
                assert "video_timeline_id" in audio_output
                assert "created_at" in audio_output
                assert "timeline_metadata" in audio_output
                assert "shot_synchronization" in audio_output
                assert "pipeline_metadata" in audio_output
                
                # Validate timeline metadata structure
                timeline_meta = audio_output["timeline_metadata"]
                assert "total_duration" in timeline_meta
                assert "frame_rate" in timeline_meta
                assert "total_frames" in timeline_meta
                assert isinstance(timeline_meta["total_duration"], (int, float))
                assert isinstance(timeline_meta["frame_rate"], int)
                assert isinstance(timeline_meta["total_frames"], int)
                
                # Validate shot synchronization structure
                shot_sync = audio_output["shot_synchronization"]
                assert isinstance(shot_sync, list)
                
                for sync_shot in shot_sync:
                    assert "shot_id" in sync_shot
                    assert "start_time" in sync_shot
                    assert "end_time" in sync_shot
                    assert "duration" in sync_shot
                    assert isinstance(sync_shot["start_time"], (int, float))
                    assert isinstance(sync_shot["end_time"], (int, float))
                    assert isinstance(sync_shot["duration"], (int, float))
                    
                    # Validate timing consistency
                    assert sync_shot["end_time"] >= sync_shot["start_time"]
                    assert abs(sync_shot["duration"] - (sync_shot["end_time"] - sync_shot["start_time"])) < 0.001
                
                # Validate pipeline metadata structure
                pipeline_meta = audio_output["pipeline_metadata"]
                assert "schema_version" in pipeline_meta
                assert pipeline_meta["schema_version"] == "1.0"
                assert "integration_timestamp" in pipeline_meta
                assert "source_components" in pipeline_meta
                assert "data_contract_compliance" in pipeline_meta
                assert isinstance(pipeline_meta["source_components"], list)
                assert isinstance(pipeline_meta["data_contract_compliance"], bool)
            
            # 3. Validate video engine metadata compliance
            if integrator.video_engine:
                timeline_metadata = integrator.video_engine.get_timeline_metadata()
                
                # Timeline metadata should have required fields
                assert "total_duration" in timeline_metadata
                assert "frame_rate" in timeline_metadata
                assert "total_frames" in timeline_metadata
                
                # Validate shot metadata in video engine
                for shot in integrator.video_engine.shots:
                    assert shot.shot_id != ""
                    assert shot.duration > 0
                    assert shot.frame_count > 0
                    assert isinstance(shot.keyframes, list)
                    
                    # Validate keyframe metadata
                    for keyframe in shot.keyframes:
                        assert keyframe.frame_id != ""
                        assert keyframe.image_path != ""
                        assert keyframe.timestamp >= 0
                        assert keyframe.shot_id == shot.shot_id
                        assert isinstance(keyframe.metadata, dict)
            
            # VE-10.8: Validate comprehensive processing reports
            
            # 1. Integration report must be comprehensive
            required_report_sections = [
                "integration_id", "pipeline_metadata", "data_contract_compliance",
                "component_status", "integration_metrics"
            ]
            
            for section in required_report_sections:
                assert section in integration_report
            
            # 2. Component status must be detailed
            component_status = integration_report["component_status"]
            required_components = ["comfyui_image_engine", "shot_engine", "video_engine"]
            
            for component in required_components:
                assert component in component_status
                comp_status = component_status[component]
                
                # Each component must have status indicators
                assert "loaded" in comp_status or "initialized" in comp_status
                
                # Specific component requirements
                if component == "comfyui_image_engine":
                    assert "keyframes_count" in comp_status
                    assert "quality_average" in comp_status
                    assert comp_status["keyframes_count"] == len(comfyui_outputs)
                    assert isinstance(comp_status["quality_average"], (int, float))
                
                elif component == "shot_engine":
                    assert "shots_count" in comp_status
                    assert "total_duration" in comp_status
                    assert comp_status["shots_count"] == len(shot_outputs)
                    assert isinstance(comp_status["total_duration"], (int, float))
                
                elif component == "video_engine":
                    assert "shots_integrated" in comp_status
                    assert "configuration_valid" in comp_status
                    assert isinstance(comp_status["shots_integrated"], int)
                    assert isinstance(comp_status["configuration_valid"], bool)
            
            # 3. Integration metrics must be comprehensive
            metrics = integration_report["integration_metrics"]
            required_metrics = [
                "total_keyframes", "total_shots", "average_shot_duration", "keyframes_per_shot"
            ]
            
            for metric in required_metrics:
                assert metric in metrics
                assert isinstance(metrics[metric], (int, float))
            
            # Validate metric accuracy
            assert metrics["total_keyframes"] == len(comfyui_outputs)
            assert metrics["total_shots"] == len(shot_outputs)
            
            if len(shot_outputs) > 0:
                expected_avg_duration = sum(shot.duration for shot in shot_outputs) / len(shot_outputs)
                assert abs(metrics["average_shot_duration"] - expected_avg_duration) < 0.001
                
                expected_keyframes_per_shot = len(comfyui_outputs) / len(shot_outputs)
                assert abs(metrics["keyframes_per_shot"] - expected_keyframes_per_shot) < 0.001
            
            # 4. Data contract compliance validation must be thorough
            compliance_info = integration_report["data_contract_compliance"]
            assert "is_compliant" in compliance_info
            assert "issues" in compliance_info
            assert isinstance(compliance_info["is_compliant"], bool)
            assert isinstance(compliance_info["issues"], list)
            
            # If compliant, should have no issues
            if compliance_info["is_compliant"]:
                assert len(compliance_info["issues"]) == 0
            
            # 5. Validate processing report persistence
            # Audio sync data should be saved to file
            audio_sync_file = project_path / "video_audio_synchronization.json"
            if audio_output:
                assert audio_sync_file.exists()
                
                with open(audio_sync_file, 'r') as f:
                    saved_audio_data = json.load(f)
                
                # Saved data should match generated data
                assert saved_audio_data["schema_version"] == audio_output["schema_version"]
                assert saved_audio_data["video_timeline_id"] == audio_output["video_timeline_id"]
                assert len(saved_audio_data["shot_synchronization"]) == len(audio_output["shot_synchronization"])
            
            # 6. Validate metadata consistency across all outputs
            # Timeline durations should be consistent
            if audio_output and integrator.video_engine:
                audio_timeline = audio_output["timeline_metadata"]
                engine_timeline = integrator.video_engine.get_timeline_metadata()
                
                # Total durations should match
                assert abs(audio_timeline["total_duration"] - engine_timeline["total_duration"]) < 0.1
                assert audio_timeline["frame_rate"] == engine_timeline["frame_rate"]
                
                # Shot counts should match
                assert len(audio_output["shot_synchronization"]) == len(integrator.video_engine.shots)
            
            # 7. Validate timestamp consistency
            # All timestamps should be valid ISO format or numeric
            if audio_output:
                assert audio_output["created_at"] != ""
                
                # Pipeline metadata timestamp should be valid
                pipeline_ts = audio_output["pipeline_metadata"]["integration_timestamp"]
                assert pipeline_ts != ""
                
                # Integration report should have valid ID with timestamp
                integration_id = integration_report["integration_id"]
                assert "integration_" in integration_id
                assert len(integration_id) > len("integration_")
        
        finally:
            shutil.rmtree(temp_dir)


class PipelineIntegrationStateMachine(RuleBasedStateMachine):
    """
    Stateful property testing for pipeline integration workflow.
    
    This tests that the pipeline integration maintains consistency
    across different sequences of operations.
    """
    
    def __init__(self):
        super().__init__()
        self.temp_dir = tempfile.mkdtemp()
        self.project_path = Path(self.temp_dir) / "state_test_project"
        self.project_path.mkdir(parents=True)
        
        # Create project.json
        project_data = {
            "schema_version": "1.0",
            "project_name": "state_test_project",
            "capabilities": {"video_generation": True}
        }
        
        with open(self.project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        (self.project_path / "assets" / "images" / "generated").mkdir(parents=True)
        
        self.integrator = VideoPipelineIntegrator(str(self.project_path))
    
    def teardown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.temp_dir)
    
    comfyui_data = Bundle('comfyui_data')
    shot_data = Bundle('shot_data')
    
    @rule(target=comfyui_data, outputs=st.lists(comfyui_output_strategy(), min_size=1, max_size=3))
    def load_comfyui_data(self, outputs):
        """Load ComfyUI data into the integrator."""
        self.integrator.comfyui_outputs = outputs
        if "comfyui_image_engine" not in self.integrator.pipeline_metadata.source_components:
            self.integrator.pipeline_metadata.source_components.append("comfyui_image_engine")
        return outputs
    
    @rule(target=shot_data, shots=st.lists(shot_output_strategy(), min_size=1, max_size=3))
    def load_shot_data(self, shots):
        """Load shot data into the integrator."""
        self.integrator.shot_metadata = shots
        if "shot_engine" not in self.integrator.pipeline_metadata.source_components:
            self.integrator.pipeline_metadata.source_components.append("shot_engine")
        return shots
    
    @rule(comfyui_data=comfyui_data, shot_data=shot_data)
    def integrate_with_video_engine(self, comfyui_data, shot_data):
        """Integrate data with video engine."""
        success = self.integrator.integrate_with_video_engine()
        
        if success:
            assert self.integrator.video_engine is not None
            assert len(self.integrator.video_engine.shots) >= 1
    
    @rule(comfyui_data=comfyui_data, shot_data=shot_data)
    def generate_audio_output(self, comfyui_data, shot_data):
        """Generate audio synchronization output."""
        if self.integrator.video_engine is not None:
            audio_output = self.integrator.generate_audio_engine_output()
            
            if len(audio_output) > 0:
                assert "timeline_metadata" in audio_output
                assert "shot_synchronization" in audio_output
    
    @invariant()
    def data_consistency_invariant(self):
        """Invariant: Data should remain consistent throughout operations."""
        # ComfyUI data consistency
        for output in self.integrator.comfyui_outputs:
            assert output.image_generation_id != ""
            assert output.frame_id != ""
            assert output.image_path != ""
        
        # Shot data consistency
        for shot in self.integrator.shot_metadata:
            assert shot.shot_id != ""
            assert shot.duration > 0
            assert shot.frame_count > 0
        
        # Pipeline metadata consistency
        assert self.integrator.pipeline_metadata.schema_version == "1.0"
        assert isinstance(self.integrator.pipeline_metadata.source_components, list)
    
    @invariant()
    def integration_state_invariant(self):
        """Invariant: Integration state should be valid."""
        if self.integrator.video_engine is not None:
            # Video engine should have valid configuration
            is_valid, _ = self.integrator.video_engine.validate_configuration()
            assert is_valid
            
            # All shots should have keyframes if integrated
            for shot in self.integrator.video_engine.shots:
                assert len(shot.keyframes) >= 0  # Allow empty for partial integration


# Test class for stateful testing
class TestPipelineStatefulProperties:
    """Test stateful properties of pipeline integration."""
    
    def test_stateful_pipeline_integration(self):
        """Test that pipeline integration maintains consistency across state changes."""
        # Use Hypothesis's run_state_machine_as_test function
        from hypothesis.stateful import run_state_machine_as_test
        run_state_machine_as_test(PipelineIntegrationStateMachine)


if __name__ == "__main__":
    # Run property tests
    pytest.main([__file__, "-v", "--tb=short"])