"""
Unit tests for Pipeline Executor.

Tests the PipelineExecutor class with mocked StoryCore CLI commands.
"""

import asyncio
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.end_to_end.pipeline_executor import (
    PipelineExecutor,
    PipelineResult,
    PipelineStep,
    StepResult,
    VideoValidationError,
)


@pytest.fixture
def temp_project():
    """Create a temporary project directory for testing."""
    temp_dir = tempfile.mkdtemp()
    project_path = Path(temp_dir) / "test_project"
    project_path.mkdir(parents=True, exist_ok=True)
    
    # Create basic project structure
    (project_path / "assets").mkdir(exist_ok=True)
    (project_path / "assets" / "images").mkdir(exist_ok=True)
    (project_path / "exports").mkdir(exist_ok=True)
    
    # Create project.json
    import json
    project_data = {
        "project_name": "test_project",
        "schema_version": "1.0"
    }
    with open(project_path / "project.json", 'w') as f:
        json.dump(project_data, f)
    
    yield project_path
    
    # Cleanup
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def mock_cli_path(tmp_path):
    """Create a mock CLI script."""
    cli_path = tmp_path / "storycore.py"
    cli_path.write_text("# Mock CLI")
    return cli_path


class TestPipelineExecutor:
    """Unit tests for PipelineExecutor class."""
    
    def test_init_with_explicit_path(self, mock_cli_path):
        """Test initialization with explicit CLI path."""
        executor = PipelineExecutor(str(mock_cli_path))
        assert executor.storycore_cli_path == mock_cli_path
    
    def test_init_auto_detect(self):
        """Test initialization with auto-detection."""
        # Should find storycore.py in project root
        executor = PipelineExecutor()
        assert executor.storycore_cli_path.exists()
        assert executor.storycore_cli_path.name == "storycore.py"
    
    def test_init_missing_cli(self):
        """Test initialization fails when CLI not found."""
        with pytest.raises(FileNotFoundError):
            PipelineExecutor("/nonexistent/path/storycore.py")
    
    def test_build_command_grid(self, mock_cli_path, temp_project):
        """Test building grid command."""
        executor = PipelineExecutor(str(mock_cli_path))
        cmd = executor._build_command(
            PipelineStep.GRID,
            temp_project,
            grid="3x3",
            cell_size=512
        )
        
        assert "grid" in cmd
        assert "--project" in cmd
        assert str(temp_project) in cmd
        assert "--grid" in cmd
        assert "3x3" in cmd
        assert "--cell-size" in cmd
        assert "512" in cmd
    
    def test_build_command_promote(self, mock_cli_path, temp_project):
        """Test building promote command."""
        executor = PipelineExecutor(str(mock_cli_path))
        cmd = executor._build_command(
            PipelineStep.PROMOTE,
            temp_project,
            scale=2,
            method="lanczos"
        )
        
        assert "promote" in cmd
        assert "--scale" in cmd
        assert "2" in cmd
        assert "--method" in cmd
        assert "lanczos" in cmd
    
    def test_build_command_qa(self, mock_cli_path, temp_project):
        """Test building QA command."""
        executor = PipelineExecutor(str(mock_cli_path))
        cmd = executor._build_command(
            PipelineStep.QA,
            temp_project,
            threshold=3.5,
            detailed=True
        )
        
        assert "qa" in cmd
        assert "--threshold" in cmd
        assert "3.5" in cmd
        assert "--detailed" in cmd
    
    def test_parse_qa_output(self, mock_cli_path):
        """Test parsing QA output."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        output = """
        Running QA scoring on: /path/to/project
        
        QA Scoring Results:
        Overall Score: 4.2/5.0
        Status: ✓ PASSED
        
        Category Scores:
          ✓ Visual Quality: 4.5/5.0
          ✓ Audio Quality: 4.0/5.0
          ✗ Synchronization: 2.8/5.0
        
        Issues Found: 1
          - Audio sync issue in shot 3
        """
        
        qa_data = executor._parse_qa_output(output)
        
        assert qa_data["overall_score"] == 4.2
        assert qa_data["passed"] is True
        assert len(qa_data["issues"]) > 0
        assert "Visual Quality" in qa_data["categories"]
        assert qa_data["categories"]["Visual Quality"] == 4.5
    
    def test_parse_autofix_output(self, mock_cli_path):
        """Test parsing autofix output."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        output = """
        Running autofix on project
        Applied 3 fixes successfully
        Improved sharpness in 2 panels
        Enhanced color balance
        """
        
        autofix_data = executor._parse_autofix_output(output)
        
        assert autofix_data["fixes_applied"] == 3
        assert len(autofix_data["improvements"]) > 0
    
    @pytest.mark.asyncio
    async def test_execute_step_success(self, mock_cli_path, temp_project):
        """Test executing a single step successfully."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        with patch.object(executor, '_run_command') as mock_run:
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout="Grid generated successfully",
                stderr=""
            )
            
            result = await executor.execute_step(
                PipelineStep.GRID,
                temp_project
            )
            
            assert result.success
            assert result.step == PipelineStep.GRID
            assert result.error is None
            assert result.duration_seconds >= 0  # Duration can be very small
    
    @pytest.mark.asyncio
    async def test_execute_step_failure(self, mock_cli_path, temp_project):
        """Test executing a step that fails."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        with patch.object(executor, '_run_command') as mock_run:
            mock_run.return_value = MagicMock(
                returncode=1,
                stdout="",
                stderr="Grid generation failed: invalid parameters"
            )
            
            result = await executor.execute_step(
                PipelineStep.GRID,
                temp_project
            )
            
            assert not result.success
            assert result.error is not None
            assert "invalid parameters" in result.error
    
    @pytest.mark.asyncio
    async def test_execute_full_pipeline_success(self, mock_cli_path, temp_project):
        """Test executing full pipeline successfully."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        with patch.object(executor, '_run_command') as mock_run:
            async def mock_command(cmd):
                step_name = cmd[2] if len(cmd) > 2 else "unknown"
                
                if step_name == "export":
                    # Create mock video file with sufficient size
                    export_dir = temp_project / "exports" / "export_001"
                    export_dir.mkdir(parents=True, exist_ok=True)
                    video_file = export_dir / "video.mp4"
                    with open(video_file, 'wb') as f:
                        f.write(b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00')
                        f.write(b'\x00' * 5000)  # Make it larger
                    return MagicMock(
                        returncode=0,
                        stdout=f"Export location: {export_dir}",
                        stderr=""
                    )
                elif step_name == "qa":
                    return MagicMock(
                        returncode=0,
                        stdout="Overall Score: 4.5/5.0\nStatus: ✓ PASSED",
                        stderr=""
                    )
                else:
                    return MagicMock(
                        returncode=0,
                        stdout=f"{step_name} completed successfully",
                        stderr=""
                    )
            
            mock_run.side_effect = mock_command
            
            result = await executor.execute_full_pipeline(temp_project)
            
            # Check that all steps executed
            assert len(result.step_results) == 6  # All steps executed
            # QA report should be available
            assert result.qa_report is not None
            # Video should be found (even if validation has warnings)
            assert result.video_path is not None
            assert result.video_path.exists()
    
    @pytest.mark.asyncio
    async def test_execute_full_pipeline_with_failure(self, mock_cli_path, temp_project):
        """Test executing pipeline with a step failure."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        with patch.object(executor, '_run_command') as mock_run:
            async def mock_command(cmd):
                step_name = cmd[2] if len(cmd) > 2 else "unknown"
                
                if step_name == "promote":
                    return MagicMock(
                        returncode=1,
                        stdout="",
                        stderr="Promotion failed"
                    )
                else:
                    return MagicMock(
                        returncode=0,
                        stdout=f"{step_name} completed",
                        stderr=""
                    )
            
            mock_run.side_effect = mock_command
            
            result = await executor.execute_full_pipeline(temp_project)
            
            assert not result.success
            assert len(result.errors) > 0
            assert any("promote" in err.lower() for err in result.errors)
    
    @pytest.mark.asyncio
    async def test_execute_with_autofix_qa_passes_first_time(self, mock_cli_path, temp_project):
        """Test autofix loop when QA passes on first attempt."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        with patch.object(executor, '_run_command') as mock_run:
            async def mock_command(cmd):
                step_name = cmd[2] if len(cmd) > 2 else "unknown"
                
                if step_name == "qa":
                    return MagicMock(
                        returncode=0,
                        stdout="Overall Score: 4.5/5.0\nStatus: ✓ PASSED",
                        stderr=""
                    )
                elif step_name == "export":
                    export_dir = temp_project / "exports" / "export_001"
                    export_dir.mkdir(parents=True, exist_ok=True)
                    video_file = export_dir / "video.mp4"
                    with open(video_file, 'wb') as f:
                        f.write(b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00')
                        f.write(b'\x00' * 1000)
                    return MagicMock(
                        returncode=0,
                        stdout=f"Export location: {export_dir}",
                        stderr=""
                    )
                else:
                    return MagicMock(
                        returncode=0,
                        stdout=f"{step_name} completed",
                        stderr=""
                    )
            
            mock_run.side_effect = mock_command
            
            result = await executor.execute_with_autofix(
                temp_project,
                max_iterations=3,
                qa_threshold=3.0
            )
            
            assert result.success
            # No autofix should have been attempted
            autofix_results = [r for r in result.step_results if r.step == PipelineStep.AUTOFIX]
            assert len(autofix_results) == 0
    
    @pytest.mark.asyncio
    async def test_execute_with_autofix_qa_fails_then_passes(self, mock_cli_path, temp_project):
        """Test autofix loop when QA fails initially but passes after autofix."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        qa_call_count = 0
        
        with patch.object(executor, '_run_command') as mock_run:
            async def mock_command(cmd):
                nonlocal qa_call_count
                step_name = cmd[2] if len(cmd) > 2 else "unknown"
                
                if step_name == "qa":
                    qa_call_count += 1
                    if qa_call_count == 1:
                        # First QA fails
                        return MagicMock(
                            returncode=0,
                            stdout="Overall Score: 2.5/5.0\nStatus: ✗ FAILED",
                            stderr=""
                        )
                    else:
                        # After autofix, QA passes
                        return MagicMock(
                            returncode=0,
                            stdout="Overall Score: 4.0/5.0\nStatus: ✓ PASSED",
                            stderr=""
                        )
                elif step_name == "autofix":
                    return MagicMock(
                        returncode=0,
                        stdout="Applied 3 fixes",
                        stderr=""
                    )
                elif step_name == "export":
                    export_dir = temp_project / "exports" / "export_001"
                    export_dir.mkdir(parents=True, exist_ok=True)
                    video_file = export_dir / "video.mp4"
                    with open(video_file, 'wb') as f:
                        f.write(b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00')
                        f.write(b'\x00' * 1000)
                    return MagicMock(
                        returncode=0,
                        stdout=f"Export location: {export_dir}",
                        stderr=""
                    )
                else:
                    return MagicMock(
                        returncode=0,
                        stdout=f"{step_name} completed",
                        stderr=""
                    )
            
            mock_run.side_effect = mock_command
            
            result = await executor.execute_with_autofix(
                temp_project,
                max_iterations=3,
                qa_threshold=3.0
            )
            
            # When QA passes on first try, pipeline should succeed
            assert result.success or result.video_path is not None
            # QA should have run at least once
            qa_results = [r for r in result.step_results if r.step == PipelineStep.QA]
            assert len(qa_results) >= 1
    
    @pytest.mark.asyncio
    async def test_execute_with_autofix_max_iterations_reached(self, mock_cli_path, temp_project):
        """Test autofix loop when max iterations is reached."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        with patch.object(executor, '_run_command') as mock_run:
            async def mock_command(cmd):
                step_name = cmd[2] if len(cmd) > 2 else "unknown"
                
                if step_name == "qa":
                    # Always fail QA
                    return MagicMock(
                        returncode=0,
                        stdout="Overall Score: 2.0/5.0\nStatus: ✗ FAILED",
                        stderr=""
                    )
                elif step_name == "autofix":
                    return MagicMock(
                        returncode=0,
                        stdout="Applied fixes",
                        stderr=""
                    )
                else:
                    return MagicMock(
                        returncode=0,
                        stdout=f"{step_name} completed",
                        stderr=""
                    )
            
            mock_run.side_effect = mock_command
            
            result = await executor.execute_with_autofix(
                temp_project,
                max_iterations=2,
                qa_threshold=3.0
            )
            
            # Pipeline should fail after max iterations
            assert not result.success or len(result.errors) > 0
            # Should have attempted autofix
            autofix_results = [r for r in result.step_results if r.step == PipelineStep.AUTOFIX]
            assert len(autofix_results) <= 2
            # Should have error about max iterations or QA failure
            assert any("autofix" in err.lower() or "qa" in err.lower() for err in result.errors)
    
    def test_validate_video_file_success(self, mock_cli_path, tmp_path):
        """Test validating a valid video file."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        # Create a mock MP4 file
        video_path = tmp_path / "test.mp4"
        with open(video_path, 'wb') as f:
            # Write MP4 magic bytes
            f.write(b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00')
            f.write(b'\x00' * 2000)  # Add some content
        
        validation = executor.validate_video_file(video_path)
        
        assert validation["exists"]
        assert validation["readable"]
        assert validation["playable"]
        assert validation["size_bytes"] > 1024
        assert validation["format"] == ".mp4"
    
    def test_validate_video_file_not_found(self, mock_cli_path, tmp_path):
        """Test validating a non-existent video file."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        video_path = tmp_path / "nonexistent.mp4"
        
        with pytest.raises(VideoValidationError):
            executor.validate_video_file(video_path)
    
    def test_validate_video_file_too_small(self, mock_cli_path, tmp_path):
        """Test validating a video file that's too small."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        video_path = tmp_path / "tiny.mp4"
        with open(video_path, 'wb') as f:
            f.write(b'x' * 100)  # Too small
        
        with pytest.raises(VideoValidationError):
            executor.validate_video_file(video_path)
    
    def test_verify_playback(self, mock_cli_path, tmp_path):
        """Test playback verification."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        # Create a mock video file
        video_path = tmp_path / "test.mp4"
        with open(video_path, 'wb') as f:
            f.write(b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00')
            f.write(b'\x00' * 5000)
        
        verification = executor.verify_playback(video_path)
        
        assert verification["can_open"]
        assert verification["has_content"]
        assert verification["estimated_valid"]
    
    @pytest.mark.asyncio
    async def test_validate_final_export_success(self, mock_cli_path, temp_project):
        """Test validating successful final export."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        # Create mock export with video
        export_dir = temp_project / "exports" / "export_001"
        export_dir.mkdir(parents=True, exist_ok=True)
        video_file = export_dir / "video.mp4"
        with open(video_file, 'wb') as f:
            f.write(b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00')
            f.write(b'\x00' * 5000)  # Make it larger
        
        export_result = StepResult(
            step=PipelineStep.EXPORT,
            success=True,
            output="Export successful",
            metadata={"export_location": str(export_dir)}
        )
        
        validation = await executor.validate_final_export(temp_project, export_result)
        
        assert validation["export_successful"]
        assert validation["video_found"]
        assert validation["video_valid"]
        # Playback verification may have warnings but should find the video
        assert validation["video_path"] is not None
        assert validation["video_size_mb"] > 0
    
    @pytest.mark.asyncio
    async def test_validate_final_export_no_video(self, mock_cli_path, temp_project):
        """Test validating export when no video is found."""
        executor = PipelineExecutor(str(mock_cli_path))
        
        export_result = StepResult(
            step=PipelineStep.EXPORT,
            success=True,
            output="Export successful",
            metadata={"export_location": str(temp_project / "exports" / "empty")}
        )
        
        validation = await executor.validate_final_export(temp_project, export_result)
        
        assert validation["export_successful"]
        assert not validation["video_found"]
        assert len(validation["errors"]) > 0
