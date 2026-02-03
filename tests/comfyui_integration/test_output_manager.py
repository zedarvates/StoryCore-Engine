"""
Unit tests for OutputManager

Tests the output organization, report generation, and file management
functionality of the OutputManager class.

Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
"""

import json
import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from src.comfyui_test_framework.output_manager import OutputManager


@pytest.fixture
def temp_output_dir():
    """Create a temporary output directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)


@pytest.fixture
def output_manager(temp_output_dir):
    """Create an OutputManager instance for testing."""
    return OutputManager(temp_output_dir)


@pytest.fixture
def sample_test_file(temp_output_dir):
    """Create a sample test file."""
    test_file = temp_output_dir / "test_image.png"
    test_file.write_text("fake image data")
    return test_file


class TestOutputManagerInit:
    """Test OutputManager initialization."""
    
    def test_init_creates_output_directory(self, temp_output_dir):
        """Test that initialization creates the output directory."""
        # Requirements: 9.1
        output_dir = temp_output_dir / "new_output"
        manager = OutputManager(output_dir)
        
        assert output_dir.exists()
        assert output_dir.is_dir()
        assert manager.output_dir == output_dir
    
    def test_init_with_existing_directory(self, temp_output_dir):
        """Test initialization with an existing directory."""
        # Requirements: 9.1
        manager = OutputManager(temp_output_dir)
        
        assert temp_output_dir.exists()
        assert manager.output_dir == temp_output_dir


class TestTimestampedDirectory:
    """Test timestamped directory creation."""
    
    def test_create_timestamped_directory(self, output_manager):
        """Test creating a timestamped directory."""
        # Requirements: 9.1
        timestamped_dir = output_manager.create_timestamped_directory()
        
        assert timestamped_dir.exists()
        assert timestamped_dir.is_dir()
        assert timestamped_dir.parent == output_manager.output_dir
        
        # Check timestamp format (YYYYMMDD_HHMMSS)
        dir_name = timestamped_dir.name
        assert len(dir_name) == 15  # YYYYMMDD_HHMMSS
        assert dir_name[8] == '_'
    
    def test_current_run_dir_is_set(self, output_manager):
        """Test that current_run_dir is set after creation."""
        # Requirements: 9.1
        timestamped_dir = output_manager.create_timestamped_directory()
        
        assert output_manager.current_run_dir == timestamped_dir
    
    def test_multiple_timestamped_directories(self, output_manager):
        """Test creating multiple timestamped directories."""
        # Requirements: 9.1
        dir1 = output_manager.create_timestamped_directory()
        dir2 = output_manager.create_timestamped_directory()
        
        assert dir1.exists()
        assert dir2.exists()
        # They should have different names (different timestamps)
        # Note: May be same if created in same second


class TestFilenameGeneration:
    """Test filename generation."""
    
    def test_generate_filename_with_timestamp(self, output_manager):
        """Test generating filename with provided timestamp."""
        # Requirements: 9.2
        filename = output_manager.generate_filename(
            "flux_turbo_test", 
            "png", 
            "20260124_143022"
        )
        
        assert filename == "flux_turbo_test_20260124_143022.png"
    
    def test_generate_filename_without_timestamp(self, output_manager):
        """Test generating filename with auto-generated timestamp."""
        # Requirements: 9.2
        filename = output_manager.generate_filename("video_test", "mp4")
        
        assert filename.startswith("video_test_")
        assert filename.endswith(".mp4")
        assert len(filename) == len("video_test_20260124_143022.mp4")
    
    def test_generate_filename_different_extensions(self, output_manager):
        """Test generating filenames with different extensions."""
        # Requirements: 9.2
        png_file = output_manager.generate_filename("test", "png", "20260124_143022")
        mp4_file = output_manager.generate_filename("test", "mp4", "20260124_143022")
        json_file = output_manager.generate_filename("test", "json", "20260124_143022")
        
        assert png_file.endswith(".png")
        assert mp4_file.endswith(".mp4")
        assert json_file.endswith(".json")


class TestSaveOutput:
    """Test saving output files."""
    
    def test_save_output_creates_type_directory(self, output_manager, sample_test_file):
        """Test that save_output creates type-specific directory."""
        # Requirements: 9.1, 9.4
        saved_path = output_manager.save_output(
            sample_test_file,
            "image_test",
            "image"
        )
        
        assert saved_path.exists()
        assert saved_path.parent.name == "image"
    
    def test_save_output_copies_file(self, output_manager, sample_test_file):
        """Test that save_output copies the file correctly."""
        # Requirements: 9.2
        saved_path = output_manager.save_output(
            sample_test_file,
            "image_test",
            "image"
        )
        
        assert saved_path.exists()
        assert saved_path.read_text() == "fake image data"
        # Original file should still exist
        assert sample_test_file.exists()
    
    def test_save_output_generates_descriptive_filename(self, output_manager, sample_test_file):
        """Test that save_output generates descriptive filename."""
        # Requirements: 9.2
        saved_path = output_manager.save_output(
            sample_test_file,
            "flux_turbo_generation",
            "image"
        )
        
        filename = saved_path.name
        assert filename.startswith("flux_turbo_generation_")
        assert filename.endswith(".png")
    
    def test_save_output_different_test_types(self, output_manager, sample_test_file):
        """Test saving outputs for different test types."""
        # Requirements: 9.4
        image_path = output_manager.save_output(
            sample_test_file,
            "image_test",
            "image"
        )
        video_path = output_manager.save_output(
            sample_test_file,
            "video_test",
            "video"
        )
        pipeline_path = output_manager.save_output(
            sample_test_file,
            "pipeline_test",
            "pipeline"
        )
        
        assert image_path.parent.name == "image"
        assert video_path.parent.name == "video"
        assert pipeline_path.parent.name == "pipeline"
    
    def test_save_output_creates_run_dir_if_needed(self, output_manager, sample_test_file):
        """Test that save_output creates run directory if not exists."""
        # Requirements: 9.1
        assert output_manager.current_run_dir is None
        
        saved_path = output_manager.save_output(
            sample_test_file,
            "test",
            "image"
        )
        
        assert output_manager.current_run_dir is not None
        assert saved_path.exists()


class TestGenerateReport:
    """Test report generation."""
    
    def test_generate_report_creates_json_file(self, output_manager):
        """Test that generate_report creates a JSON file."""
        # Requirements: 9.3
        test_results = [
            {
                "test_name": "test1",
                "success": True,
                "duration": 10.5
            }
        ]
        config = {"comfyui_url": "http://localhost:8188"}
        
        report_path = output_manager.generate_report(test_results, config)
        
        assert report_path.exists()
        assert report_path.name == "test_report.json"
    
    def test_generate_report_contains_metadata(self, output_manager):
        """Test that report contains required metadata."""
        # Requirements: 9.3
        test_results = [
            {
                "test_name": "test1",
                "success": True,
                "duration": 10.5
            }
        ]
        config = {"comfyui_url": "http://localhost:8188"}
        
        report_path = output_manager.generate_report(test_results, config)
        
        with open(report_path, 'r') as f:
            report = json.load(f)
        
        assert "test_run_id" in report
        assert "timestamp" in report
        assert "config" in report
        assert "tests" in report
        assert "summary" in report
    
    def test_generate_report_calculates_summary(self, output_manager):
        """Test that report calculates summary statistics correctly."""
        # Requirements: 9.3
        test_results = [
            {"test_name": "test1", "success": True, "duration": 10.5},
            {"test_name": "test2", "success": False, "duration": 5.2},
            {"test_name": "test3", "success": True, "duration": 8.3},
        ]
        config = {"comfyui_url": "http://localhost:8188"}
        
        report_path = output_manager.generate_report(test_results, config)
        
        with open(report_path, 'r') as f:
            report = json.load(f)
        
        summary = report["summary"]
        assert summary["total_tests"] == 3
        assert summary["passed"] == 2
        assert summary["failed"] == 1
        assert summary["total_duration"] == 24.0
    
    def test_generate_report_includes_config(self, output_manager):
        """Test that report includes configuration."""
        # Requirements: 9.3
        test_results = []
        config = {
            "comfyui_url": "http://localhost:8188",
            "timeout": 300,
            "workflows_dir": "assets/workflows"
        }
        
        report_path = output_manager.generate_report(test_results, config)
        
        with open(report_path, 'r') as f:
            report = json.load(f)
        
        assert report["config"] == config


class TestOrganizeByType:
    """Test organizing files by type."""
    
    def test_organize_by_type_single_file(self, output_manager, temp_output_dir):
        """Test organizing a single file by type."""
        # Requirements: 9.4
        test_file = temp_output_dir / "test.png"
        test_file.write_text("test data")
        
        files = {"image_test": test_file}
        test_types = {"image_test": "image"}
        
        organized = output_manager.organize_by_type(files, test_types)
        
        assert "image_test" in organized
        assert organized["image_test"].exists()
        assert organized["image_test"].parent.name == "image"
    
    def test_organize_by_type_multiple_files(self, output_manager, temp_output_dir):
        """Test organizing multiple files by type."""
        # Requirements: 9.4
        image_file = temp_output_dir / "image.png"
        video_file = temp_output_dir / "video.mp4"
        image_file.write_text("image data")
        video_file.write_text("video data")
        
        files = {
            "image_test": image_file,
            "video_test": video_file
        }
        test_types = {
            "image_test": "image",
            "video_test": "video"
        }
        
        organized = output_manager.organize_by_type(files, test_types)
        
        assert len(organized) == 2
        assert organized["image_test"].parent.name == "image"
        assert organized["video_test"].parent.name == "video"
    
    def test_organize_by_type_skips_missing_files(self, output_manager, temp_output_dir):
        """Test that organize_by_type skips non-existent files."""
        # Requirements: 9.4
        existing_file = temp_output_dir / "exists.png"
        existing_file.write_text("data")
        missing_file = temp_output_dir / "missing.png"
        
        files = {
            "test1": existing_file,
            "test2": missing_file
        }
        test_types = {
            "test1": "image",
            "test2": "image"
        }
        
        organized = output_manager.organize_by_type(files, test_types)
        
        assert "test1" in organized
        assert "test2" not in organized


class TestLogOutputPath:
    """Test output path logging."""
    
    def test_log_output_path_with_description(self, output_manager, temp_output_dir, capsys):
        """Test logging output path with description."""
        # Requirements: 9.5
        test_file = temp_output_dir / "test.png"
        test_file.write_text("data")
        
        output_manager.log_output_path(test_file, "Generated image")
        
        captured = capsys.readouterr()
        assert "[OUTPUT]" in captured.out
        assert "Generated image" in captured.out
        assert str(test_file.absolute()) in captured.out
    
    def test_log_output_path_without_description(self, output_manager, temp_output_dir, capsys):
        """Test logging output path without description."""
        # Requirements: 9.5
        test_file = temp_output_dir / "test.png"
        test_file.write_text("data")
        
        output_manager.log_output_path(test_file)
        
        captured = capsys.readouterr()
        assert "[OUTPUT]" in captured.out
        assert str(test_file.absolute()) in captured.out


class TestCleanupOldRuns:
    """Test cleanup of old run directories."""
    
    def test_cleanup_old_runs_keeps_recent(self, output_manager):
        """Test that cleanup keeps the most recent runs."""
        # Create multiple run directories with distinct timestamps
        dir1 = output_manager.output_dir / "20260101_120000"
        dir2 = output_manager.output_dir / "20260102_120000"
        dir3 = output_manager.output_dir / "20260103_120000"
        dir4 = output_manager.output_dir / "20260104_120000"
        dir5 = output_manager.output_dir / "20260105_120000"
        
        for d in [dir1, dir2, dir3, dir4, dir5]:
            d.mkdir()
        
        # Cleanup, keeping only 3
        output_manager.cleanup_old_runs(keep_last_n=3)
        
        remaining_dirs = [d for d in output_manager.output_dir.iterdir() if d.is_dir()]
        assert len(remaining_dirs) == 3
    
    def test_cleanup_old_runs_removes_oldest(self, output_manager):
        """Test that cleanup removes the oldest directories."""
        # Create directories with known names
        dir1 = output_manager.output_dir / "20260101_120000"
        dir2 = output_manager.output_dir / "20260102_120000"
        dir3 = output_manager.output_dir / "20260103_120000"
        
        dir1.mkdir()
        dir2.mkdir()
        dir3.mkdir()
        
        output_manager.cleanup_old_runs(keep_last_n=2)
        
        assert not dir1.exists()  # Oldest should be removed
        assert dir2.exists()
        assert dir3.exists()


class TestGetCurrentRunDir:
    """Test getting current run directory."""
    
    def test_get_current_run_dir_before_creation(self, output_manager):
        """Test getting current run dir before it's created."""
        assert output_manager.get_current_run_dir() is None
    
    def test_get_current_run_dir_after_creation(self, output_manager):
        """Test getting current run dir after creation."""
        timestamped_dir = output_manager.create_timestamped_directory()
        
        current_dir = output_manager.get_current_run_dir()
        assert current_dir == timestamped_dir
