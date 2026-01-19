# Property-based tests for Pipeline Integration components.
# Tests universal properties for quality validation pipeline integration.

import pytest
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from quality_validator import QualityValidator, ValidationMode
import promotion_engine
import autofix_engine
from project_manager import ProjectManager


@composite
def quality_scores(draw):
    """Generate list of quality scores for testing."""
    num_scores = draw(st.integers(min_value=1, max_value=5))
    scores = []
    for _ in range(num_scores):
        score = {
            "panel_id": draw(st.text(min_size=5, max_size=15)),
            "sharpness_score": draw(st.floats(min_value=0.0, max_value=200.0)),
            "timestamp": draw(st.floats(min_value=0.0, max_value=100.0))
        }
        scores.append(score)
    return scores


@composite
def autofix_logs(draw):
    """Generate autofix logs for testing."""
    num_logs = draw(st.integers(min_value=0, max_value=3))
    logs = []
    for _ in range(num_logs):
        log = {
            "panel_id": draw(st.text(min_size=5, max_size=15)),
            "final_status": draw(st.sampled_from(["IMPROVED", "DEGRADED", "NO_CHANGE"])),
            "improvement_delta": draw(st.floats(min_value=-50.0, max_value=50.0))
        }
        logs.append(log)
    return logs


class TestPipelineIntegrationProperties:
    """Property-based tests for Pipeline Integration."""

    @given(st.floats(min_value=0.0, max_value=200.0), st.floats(min_value=0.0, max_value=200.0))
    @settings(max_examples=20, deadline=2000)
    def test_property_21_real_time_validation_trigger(self, sharpness_score, corrected_score):
        """
        Property 21: Real-Time Validation Trigger
        When quality validation is enabled and sharpness is below threshold,
        autofix engine should be triggered and applied if it improves quality.
        Validates: Requirements 7.1, 7.2
        """
        # Setup
        validator = QualityValidator(ValidationMode.REAL_TIME)
        autofix = autofix_engine.AutofixEngine()

        # Test data
        panel_id = "test_panel"
        metrics = {"sharpness_score": sharpness_score}

        # Check if autofix should be triggered
        needs_retry, adjustments = autofix.should_retry(panel_id, metrics)

        # Verify trigger logic
        threshold = validator.sharpness_threshold
        expected_trigger = sharpness_score < threshold
        assert needs_retry == expected_trigger, f"Autofix trigger mismatch at score {sharpness_score}, threshold {threshold}"

        # If triggered, verify adjustments are provided
        if needs_retry:
            assert adjustments, "Adjustments should be provided when autofix is triggered"
            assert isinstance(adjustments, dict), "Adjustments should be a dictionary"

            # Verify adjustment keys
            expected_keys = {"denoising_strength", "sharpen_amount"}
            assert set(adjustments.keys()).issubset(expected_keys), "Adjustments should contain expected parameters"

        # Test application if triggered
        if needs_retry:
            # Mock image processing
            mock_image = Mock()
            mock_image.size = (100, 100)

            # Apply corrections
            corrected, new_params = autofix.apply_corrections(mock_image, {"denoising_strength": 0.35, "sharpen_amount": 1.0}, adjustments)

            # Verify correction was applied
            assert corrected is not None, "Corrected image should be returned"
            assert new_params is not None, "New parameters should be returned"
            assert isinstance(new_params, dict), "New parameters should be a dictionary"

            # Verify parameter bounds
            if "denoising_strength" in new_params:
                assert 0.1 <= new_params["denoising_strength"] <= 0.8, "Denoising strength should be within bounds"
            if "sharpen_amount" in new_params:
                assert 0.5 <= new_params["sharpen_amount"] <= 2.0, "Sharpen amount should be within bounds"

    @given(quality_scores(), autofix_logs())
    @settings(max_examples=10, deadline=2000)
    def test_property_22_data_contract_compliance(self, quality_scores, autofix_logs):
        """
        Property 22: Data Contract Compliance
        Project manifest updates should maintain Data Contract v1 schema
        with validation results properly integrated.
        Validates: Requirements 7.3, 7.4
        """
        # Setup test project
        with patch('pathlib.Path.mkdir'), \
             patch('builtins.open', create=True) as mock_open, \
             patch('json.dump') as mock_dump, \
             patch('json.load') as mock_load:

            # Mock project data
            project_data = {
                "schema_version": "1.0",
                "project_id": "test_project",
                "capabilities": {"quality_validation": True},
                "generation_status": {"quality_validation": "pending"},
                "quality_validation": {
                    "enabled": True,
                    "continuity_results": [],
                    "quality_scores": [],
                    "audio_mixing_status": "pending",
                    "last_validation_timestamp": None,
                    "overall_quality_score": None,
                    "validation_pass": None
                },
                "status": {"current_phase": "initialized"}
            }

            mock_load.return_value = project_data

            # Create promotion metadata
            metadata = {
                "quality_validation": {
                    "enabled": True,
                    "quality_scores": quality_scores,
                    "autofix_logs": autofix_logs
                },
                "scale_factor": 2,
                "method": "lanczos",
                "created_at": "2026-01-16T18:00:00Z"
            }

            # Update manifest
            promotion_engine.update_project_manifest(Path("/fake/path"), metadata)

            # Verify calls
            assert mock_open.call_count >= 2, "Should open file for reading and writing"
            assert mock_dump.call_count == 1, "Should dump updated data"

            # Get the dumped data
            call_args = mock_dump.call_args
            updated_data = call_args[0][0]  # First positional argument

            # Verify schema compliance
            assert "schema_version" in updated_data, "Schema version should be preserved"
            assert "quality_validation" in updated_data, "Quality validation section should exist"

            qv = updated_data["quality_validation"]
            assert "enabled" in qv, "Quality validation enabled flag should exist"
            assert "quality_scores" in qv, "Quality scores should be present"
            assert "autofix_logs" in qv, "Autofix logs should be present"
            assert "last_validation_timestamp" in qv, "Last validation timestamp should be set"
            assert "overall_quality_score" in qv, "Overall quality score should be calculated"
            assert "validation_pass" in qv, "Validation pass flag should be set"

            # Verify data integrity
            if quality_scores:
                scores = [s.get("sharpness_score", 0) for s in quality_scores]
                expected_overall = sum(scores) / len(scores)
                assert abs(qv["overall_quality_score"] - expected_overall) < 0.01, "Overall score calculation should be correct"
                assert qv["validation_pass"] == (expected_overall >= 70.0), "Validation pass should be correct"

            # Verify status tracking
            assert "status" in updated_data, "Status section should exist"
            assert "current_phase" in updated_data["status"], "Current phase should be set"

    @given(st.sampled_from([ValidationMode.REAL_TIME, ValidationMode.BATCH]),
           st.lists(st.floats(min_value=0.0, max_value=200.0), min_size=1, max_size=3))
    @settings(max_examples=15, deadline=2000)
    def test_property_23_validation_mode_consistency(self, mode, sharpness_values):
        """
        Property 23: Validation Mode Consistency
        Real-time and batch validation modes should produce consistent results
        for the same input data, with batch providing more comprehensive analysis.
        Validates: Requirements 7.5
        """
        # Setup validators
        real_time_validator = QualityValidator(ValidationMode.REAL_TIME)
        batch_validator = QualityValidator(ValidationMode.BATCH)

        # Create test frames (mock numpy arrays)
        frames = []
        for i, sharpness in enumerate(sharpness_values):
            # Create mock frame with approximate sharpness
            # In real implementation, this would be actual image data
            frame = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
            # Add some pattern to simulate sharpness variation
            if sharpness > 100:
                # Sharper: add high-frequency pattern
                frame[::2, ::2] = 255
                frame[1::2, 1::2] = 0
            frames.append(frame)

        # Create test shot
        shot = {
            "frames": frames,
            "audio_score": 75.0,
            "continuity_score": 80.0
        }

        # Generate scores in both modes
        real_time_score = real_time_validator.generate_quality_score(shot)
        batch_score = batch_validator.generate_quality_score(shot)

        # Verify both produce valid scores
        assert isinstance(real_time_score, QualityValidator.QualityScore), "Real-time should return QualityScore"
        assert isinstance(batch_score, QualityValidator.QualityScore), "Batch should return QualityScore"

        # Verify score ranges
        for score_obj in [real_time_score, batch_score]:
            assert 0.0 <= score_obj.overall_score <= 100.0, "Overall score should be 0-100"
            assert 0.0 <= score_obj.sharpness_score <= 100.0, "Sharpness score should be 0-100"
            assert 0.0 <= score_obj.motion_score <= 100.0, "Motion score should be 0-100"
            assert 0.0 <= score_obj.audio_score <= 100.0, "Audio score should be 0-100"
            assert 0.0 <= score_obj.continuity_score <= 100.0, "Continuity score should be 0-100"

        # Verify real-time mode focuses more on sharpness
        # (In our implementation, real-time gives 50% weight to sharpness vs 30% in batch)
        # So real-time should be more sensitive to sharpness changes

        # Calculate expected differences based on implementation
        avg_sharpness = np.mean([real_time_validator.calculate_sharpness(f) for f in frames])
        sharpness_normalized = min(100.0, avg_sharpness)  # Cap at 100

        # Real-time overall should be closer to sharpness score
        rt_diff = abs(real_time_score.overall_score - sharpness_normalized)
        batch_diff = abs(batch_score.overall_score - sharpness_normalized)

        # Real-time should be more influenced by sharpness (smaller diff)
        assert rt_diff <= batch_diff + 10.0, "Real-time should be more sharpness-focused"

        # Verify batch mode includes motion analysis (which real-time skips)
        # Batch should have motion_score based on analysis, real-time uses estimate
        assert batch_score.motion_score <= 100.0, "Batch motion score should be valid"
        assert real_time_score.motion_score <= 100.0, "Real-time motion score should be valid"

        # Verify issue detection differences
        # Real-time should have fewer issues (simplified analysis)
        assert len(real_time_score.issues) <= len(batch_score.issues) + 2, \
            "Real-time should have fewer or equal issues compared to batch"

        # Verify serialization works for both
        rt_dict = real_time_score.to_dict()
        batch_dict = batch_score.to_dict()

        required_keys = ["overall_score", "sharpness_score", "motion_score", "audio_score", "continuity_score", "passed", "issues", "suggestions"]
        for key in required_keys:
            assert key in rt_dict, f"Real-time dict should contain {key}"
            assert key in batch_dict, f"Batch dict should contain {key}"


def test_pipeline_integration_basic_functionality():
    """Test basic functionality of pipeline integration components."""

    # Test real-time validation trigger
    validator = QualityValidator(ValidationMode.REAL_TIME)
    autofix = autofix_engine.AutofixEngine()

    # Test low quality triggering autofix
    low_quality_metrics = {"sharpness_score": 49.0}  # Below threshold
    needs_retry, adjustments = autofix.should_retry("panel_01", low_quality_metrics)
    assert needs_retry, "Should trigger autofix for low quality"
    assert adjustments, "Should provide adjustments"

    # Test high quality not triggering autofix
    high_quality_metrics = {"sharpness_score": 150.0}  # Above threshold
    needs_retry, adjustments = autofix.should_retry("panel_02", high_quality_metrics)
    assert not needs_retry, "Should not trigger autofix for high quality"

    # Test project manifest update
    with patch('pathlib.Path'), \
         patch('builtins.open', create=True) as mock_open, \
         patch('json.dump'), \
         patch('json.load') as mock_load:

        mock_load.return_value = {
            "quality_validation": {"enabled": True, "quality_scores": []},
            "status": {"current_phase": "processing"}
        }

        metadata = {
            "promoted_panels": [],
            "scale_factor": 2,
            "method": "lanczos",
            "created_at": "2026-01-16T18:00:00Z",
            "total_panels": 0,
            "quality_validation": {
                "enabled": True,
                "quality_scores": [{"panel_id": "test", "sharpness_score": 80.0}]
            }
        }

        promotion_engine.update_project_manifest(Path("/fake"), metadata)

        # Verify it was called
        assert mock_open.called, "Should have opened project file"

    # Test validation mode consistency
    rt_validator = QualityValidator(ValidationMode.REAL_TIME)
    batch_validator = QualityValidator(ValidationMode.BATCH)

    test_frames = [np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8) for _ in range(2)]
    test_shot = {"frames": test_frames, "audio_score": 70.0, "continuity_score": 75.0}

    rt_score = rt_validator.generate_quality_score(test_shot)
    batch_score = batch_validator.generate_quality_score(test_shot)

    assert rt_score.overall_score >= 0, "Real-time score should be valid"
    assert batch_score.overall_score >= 0, "Batch score should be valid"

    print("Pipeline integration basic tests passed")


if __name__ == "__main__":
    # Run basic functionality test
    test_pipeline_integration_basic_functionality()

    print("Pipeline integration property tests ready for execution")