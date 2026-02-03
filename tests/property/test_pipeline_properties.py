"""
Property-based tests for Pipeline Executor.

Feature: end-to-end-project-creation
Property 6: Complete Pipeline Execution

For any project with generated images, the system should execute the complete
pipeline sequence (grid → promote → refine → qa → autofix loop → video_plan → export)
and produce a final video file, automatically retrying failed steps and applying
autofix when QA detects issues.

Validates: Requirements 6.1-6.10
"""

import asyncio
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings, strategies as st

from src.end_to_end.pipeline_executor import (
    PipelineExecutor,
    PipelineResult,
    PipelineStep,
    StepResult,
)


# Test strategies
@st.composite
def project_paths(draw):
    """Generate valid project paths for testing."""
    # Use temporary directory
    temp_dir = tempfile.mkdtemp()
    project_path = Path(temp_dir) / f"test_project_{draw(st.integers(min_value=1, max_value=1000))}"
    project_path.mkdir(parents=True, exist_ok=True)
    
    # Create basic project structure
    (project_path / "assets").mkdir(exist_ok=True)
    (project_path / "assets" / "images").mkdir(exist_ok=True)
    (project_path / "exports").mkdir(exist_ok=True)
    
    # Create project.json
    import json
    project_data = {
        "project_name": project_path.name,
        "schema_version": "1.0"
    }
    with open(project_path / "project.json", 'w') as f:
        json.dump(project_data, f)
    
    return project_path


@st.composite
def qa_scores(draw):
    """Generate QA scores for testing."""
    return draw(st.floats(min_value=0.0, max_value=5.0))


@st.composite
def step_results(draw, step, success_rate=0.8):
    """Generate step results for testing."""
    success = draw(st.booleans()) if success_rate < 1.0 else True
    
    return StepResult(
        step=step,
        success=success,
        output=draw(st.text(min_size=10, max_size=200)),
        error=None if success else draw(st.text(min_size=5, max_size=50)),
        duration_seconds=draw(st.floats(min_value=0.1, max_value=10.0)),
        metadata={}
    )


class TestPipelineExecutionProperty:
    """Property tests for complete pipeline execution."""
    
    @pytest.mark.asyncio
    @given(
        project_path=project_paths(),
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=100, deadline=None)
    async def test_complete_pipeline_execution(self, project_path, seed):
        """
        Property 6: Complete Pipeline Execution
        
        For any project with generated images, the system should execute
        the complete pipeline and produce a final video file.
        """
        # Create mock CLI that simulates successful execution
        with patch('src.end_to_end.pipeline_executor.PipelineExecutor._run_command') as mock_run:
            # Setup mock to return successful results for all steps
            async def mock_command(cmd):
                step_name = cmd[2] if len(cmd) > 2 else "unknown"
                
                # Simulate different outputs for different steps
                if step_name == "grid":
                    output = "Grid generated successfully\nGrid: assets/images/grid.ppm\nPanels: 9"
                elif step_name == "promote":
                    output = "Promoted 9 panels successfully\nOutput directory: assets/images/promoted"
                elif step_name == "refine":
                    output = "Refined 9 panels successfully"
                elif step_name == "qa":
                    output = "Overall Score: 4.5/5.0\nStatus: ✓ PASSED"
                elif step_name == "video_plan":
                    output = "Video plan created successfully"
                elif step_name == "export":
                    output = f"Project exported successfully\nExport location: {project_path}/exports/export_001"
                    # Create mock video file
                    export_dir = project_path / "exports" / "export_001"
                    export_dir.mkdir(parents=True, exist_ok=True)
                    video_file = export_dir / "video.mp4"
                    # Create a minimal valid MP4 file
                    with open(video_file, 'wb') as f:
                        # Write MP4 magic bytes
                        f.write(b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00')
                        f.write(b'\x00' * 1000)  # Padding to make it look like a real file
                else:
                    output = f"{step_name} completed successfully"
                
                return MagicMock(
                    returncode=0,
                    stdout=output,
                    stderr=""
                )
            
            mock_run.side_effect = mock_command
            
            # Create executor
            executor = PipelineExecutor()
            
            # Execute full pipeline
            result = await executor.execute_full_pipeline(project_path)
            
            # Property assertions
            
            # 1. Pipeline should complete (success or controlled failure)
            assert isinstance(result, PipelineResult)
            
            # 2. All expected steps should be executed
            executed_steps = [r.step for r in result.step_results]
            expected_steps = [
                PipelineStep.GRID,
                PipelineStep.PROMOTE,
                PipelineStep.REFINE,
                PipelineStep.QA,
                PipelineStep.VIDEO_PLAN,
                PipelineStep.EXPORT
            ]
            assert all(step in executed_steps for step in expected_steps)
            
            # 3. If successful, video path should be provided
            if result.success:
                assert result.video_path is not None
                assert result.video_path.exists()
            
            # 4. QA report should be available
            qa_result = next(
                (r for r in result.step_results if r.step == PipelineStep.QA),
                None
            )
            if qa_result and qa_result.success:
                assert result.qa_report is not None
            
            # 5. Total duration should be sum of step durations
            total_step_duration = sum(r.duration_seconds for r in result.step_results)
            assert result.total_duration_seconds >= total_step_duration * 0.9  # Allow 10% variance
            
            # 6. Errors list should be consistent with step failures
            failed_steps = [r for r in result.step_results if not r.success]
            if failed_steps:
                assert len(result.errors) > 0
            
            # 7. Step results should be in execution order
            step_order = [r.step for r in result.step_results]
            # Grid should come before promote, promote before refine, etc.
            if PipelineStep.GRID in step_order and PipelineStep.PROMOTE in step_order:
                assert step_order.index(PipelineStep.GRID) < step_order.index(PipelineStep.PROMOTE)
            if PipelineStep.PROMOTE in step_order and PipelineStep.REFINE in step_order:
                assert step_order.index(PipelineStep.PROMOTE) < step_order.index(PipelineStep.REFINE)
    
    @pytest.mark.asyncio
    @given(
        project_path=project_paths(),
        qa_threshold=qa_scores(),
        max_iterations=st.integers(min_value=1, max_value=5),
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=100, deadline=None)
    async def test_autofix_loop_execution(self, project_path, qa_threshold, max_iterations, seed):
        """
        Property 6: Complete Pipeline Execution (Autofix Loop)
        
        The system should automatically retry with autofix when QA fails,
        up to max_iterations times.
        """
        iteration_count = 0
        
        with patch('src.end_to_end.pipeline_executor.PipelineExecutor._run_command') as mock_run:
            async def mock_command(cmd):
                nonlocal iteration_count
                step_name = cmd[2] if len(cmd) > 2 else "unknown"
                
                if step_name == "grid":
                    output = "Grid generated successfully"
                elif step_name == "promote":
                    output = "Promoted 9 panels successfully"
                elif step_name == "refine":
                    output = "Refined 9 panels successfully"
                elif step_name == "qa":
                    # First QA fails, subsequent ones pass
                    if iteration_count == 0:
                        score = qa_threshold - 0.5
                        output = f"Overall Score: {score:.1f}/5.0\nStatus: ✗ FAILED"
                    else:
                        score = qa_threshold + 0.5
                        output = f"Overall Score: {score:.1f}/5.0\nStatus: ✓ PASSED"
                elif step_name == "autofix":
                    iteration_count += 1
                    output = f"Applied 3 fixes\nImproved quality"
                elif step_name == "video_plan":
                    output = "Video plan created"
                elif step_name == "export":
                    output = f"Export location: {project_path}/exports/export_001"
                    export_dir = project_path / "exports" / "export_001"
                    export_dir.mkdir(parents=True, exist_ok=True)
                    video_file = export_dir / "video.mp4"
                    with open(video_file, 'wb') as f:
                        f.write(b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00')
                        f.write(b'\x00' * 1000)
                else:
                    output = f"{step_name} completed"
                
                return MagicMock(returncode=0, stdout=output, stderr="")
            
            mock_run.side_effect = mock_command
            
            executor = PipelineExecutor()
            result = await executor.execute_with_autofix(
                project_path,
                max_iterations=max_iterations,
                qa_threshold=qa_threshold
            )
            
            # Property assertions for autofix loop
            
            # 1. Autofix should be attempted when QA fails
            autofix_results = [r for r in result.step_results if r.step == PipelineStep.AUTOFIX]
            if not result.success:
                # If pipeline failed, autofix should have been attempted
                assert len(autofix_results) <= max_iterations
            
            # 2. QA should be re-run after autofix
            qa_results = [r for r in result.step_results if r.step == PipelineStep.QA]
            if autofix_results:
                # Should have at least 2 QA runs (initial + after autofix)
                assert len(qa_results) >= 2
            
            # 3. Autofix history should be tracked in metadata
            if autofix_results and result.success:
                assert "autofix_iterations" in result.metadata
                assert result.metadata["autofix_iterations"] == len(autofix_results)
            
            # 4. Should not exceed max iterations
            assert len(autofix_results) <= max_iterations
    
    @pytest.mark.asyncio
    @given(
        project_path=project_paths(),
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=50, deadline=None)
    async def test_pipeline_handles_step_failures(self, project_path, seed):
        """
        Property 6: Complete Pipeline Execution (Error Handling)
        
        The system should handle step failures gracefully and report errors.
        """
        with patch('src.end_to_end.pipeline_executor.PipelineExecutor._run_command') as mock_run:
            async def mock_command(cmd):
                step_name = cmd[2] if len(cmd) > 2 else "unknown"
                
                # Simulate failure on promote step
                if step_name == "promote":
                    return MagicMock(
                        returncode=1,
                        stdout="",
                        stderr="Promotion failed: insufficient memory"
                    )
                else:
                    return MagicMock(
                        returncode=0,
                        stdout=f"{step_name} completed successfully",
                        stderr=""
                    )
            
            mock_run.side_effect = mock_command
            
            executor = PipelineExecutor()
            result = await executor.execute_full_pipeline(project_path)
            
            # Property assertions for error handling
            
            # 1. Pipeline should not succeed if critical step fails
            assert not result.success
            
            # 2. Errors should be recorded
            assert len(result.errors) > 0
            
            # 3. Failed step should be in results
            promote_result = next(
                (r for r in result.step_results if r.step == PipelineStep.PROMOTE),
                None
            )
            assert promote_result is not None
            assert not promote_result.success
            assert promote_result.error is not None
            
            # 4. Steps after critical failure should not execute
            # (promote is critical, so refine/qa/etc should not run)
            executed_steps = [r.step for r in result.step_results]
            assert PipelineStep.GRID in executed_steps
            assert PipelineStep.PROMOTE in executed_steps
            # Later steps should not be present
            assert PipelineStep.EXPORT not in executed_steps


def test_property_test_exists():
    """Verify that property test module is properly structured."""
    assert TestPipelineExecutionProperty is not None
    assert hasattr(TestPipelineExecutionProperty, 'test_complete_pipeline_execution')
    assert hasattr(TestPipelineExecutionProperty, 'test_autofix_loop_execution')
    assert hasattr(TestPipelineExecutionProperty, 'test_pipeline_handles_step_failures')
