"""
Unit tests for memory system integration with CLI handlers.
"""

import unittest
import tempfile
import shutil
import json
from pathlib import Path

from src.cli.memory_integration import (
    is_memory_system_enabled,
    log_pipeline_action,
    log_grid_generation,
    log_panel_promotion,
    log_qa_scoring,
    log_project_export,
    index_generated_assets
)


class TestMemoryIntegration(unittest.TestCase):
    """Test memory system integration helpers."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.test_dir = tempfile.mkdtemp()
        self.project_path = Path(self.test_dir)
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def _create_project_config(self, memory_enabled: bool = True):
        """Create a project config file."""
        config = {
            "schema_version": "1.0",
            "project_name": "test_project",
            "project_type": "video",
            "creation_timestamp": "2025-01-26T00:00:00Z",
            "objectives": [],
            "memory_system_enabled": memory_enabled,
            "memory_system_config": {
                "auto_summarize": True,
                "summarization_threshold_kb": 50,
                "auto_translate": True,
                "target_languages": ["en", "fr"],
                "error_detection_enabled": True,
                "auto_recovery_enabled": True,
                "max_recovery_attempts": 3
            }
        }
        
        config_path = self.project_path / "project_config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
    
    def _create_memory_structure(self):
        """Create memory system directory structure."""
        build_logs_dir = self.project_path / "build_logs"
        build_logs_dir.mkdir(parents=True, exist_ok=True)
    
    def test_is_memory_system_enabled_true(self):
        """Test detecting enabled memory system."""
        self._create_project_config(memory_enabled=True)
        
        result = is_memory_system_enabled(self.project_path)
        
        self.assertTrue(result)
    
    def test_is_memory_system_enabled_false(self):
        """Test detecting disabled memory system."""
        self._create_project_config(memory_enabled=False)
        
        result = is_memory_system_enabled(self.project_path)
        
        self.assertFalse(result)
    
    def test_is_memory_system_enabled_no_config(self):
        """Test handling missing config file."""
        result = is_memory_system_enabled(self.project_path)
        
        self.assertFalse(result)
    
    def test_log_pipeline_action_disabled(self):
        """Test logging when memory system is disabled."""
        self._create_project_config(memory_enabled=False)
        
        result = log_pipeline_action(
            project_path=self.project_path,
            action_type="TEST_ACTION",
            affected_files=["test.txt"],
            parameters={"key": "value"}
        )
        
        # Should return False when disabled
        self.assertFalse(result)
    
    def test_log_pipeline_action_enabled(self):
        """Test logging when memory system is enabled."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        result = log_pipeline_action(
            project_path=self.project_path,
            action_type="TEST_ACTION",
            affected_files=["test.txt"],
            parameters={"key": "value"},
            triggered_by="test"
        )
        
        # Should succeed
        self.assertTrue(result)
        
        # Verify log file was created
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        self.assertTrue(log_file.exists())
        
        # Verify log content
        with open(log_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("TEST_ACTION", content)
        self.assertIn("test.txt", content)
        self.assertIn("key: value", content)
        self.assertIn("Triggered_By: test", content)
    
    def test_log_grid_generation(self):
        """Test logging grid generation."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        result = log_grid_generation(
            project_path=self.project_path,
            grid_spec="3x3",
            grid_path="assets/grid.png",
            panel_count=9,
            cell_size=512
        )
        
        self.assertTrue(result)
        
        # Verify log content
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        with open(log_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("GRID_GENERATED", content)
        self.assertIn("grid_spec: 3x3", content)
        self.assertIn("panel_count: 9", content)
        self.assertIn("cell_size: 512", content)
    
    def test_log_panel_promotion(self):
        """Test logging panel promotion."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        result = log_panel_promotion(
            project_path=self.project_path,
            panel_count=9,
            scale_factor=2,
            method="lanczos",
            output_dir="assets/promoted"
        )
        
        self.assertTrue(result)
        
        # Verify log content
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        with open(log_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("PANELS_PROMOTED", content)
        self.assertIn("panel_count: 9", content)
        self.assertIn("scale_factor: 2", content)
        self.assertIn("method: lanczos", content)
    
    def test_log_qa_scoring(self):
        """Test logging QA scoring."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        result = log_qa_scoring(
            project_path=self.project_path,
            overall_score=4.5,
            threshold=3.0,
            passed=True,
            issues_count=2
        )
        
        self.assertTrue(result)
        
        # Verify log content
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        with open(log_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("QA_SCORING_COMPLETED", content)
        self.assertIn("overall_score: 4.5", content)
        self.assertIn("threshold: 3.0", content)
        self.assertIn("passed: True", content)
        self.assertIn("issues_count: 2", content)
    
    def test_log_project_export(self):
        """Test logging project export."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        result = log_project_export(
            project_path=self.project_path,
            export_format="zip",
            export_location="exports/project.zip",
            file_count=15
        )
        
        self.assertTrue(result)
        
        # Verify log content
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        with open(log_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("PROJECT_EXPORTED", content)
        self.assertIn("format: zip", content)
        self.assertIn("file_count: 15", content)
    
    def test_non_interference_with_missing_memory_system(self):
        """Test that logging fails gracefully when memory system is not available."""
        # Don't create config or structure
        
        # All logging functions should return False but not raise exceptions
        result1 = log_grid_generation(self.project_path, "3x3", "grid.png", 9, 512)
        result2 = log_panel_promotion(self.project_path, 9, 2, "lanczos", "promoted")
        result3 = log_qa_scoring(self.project_path, 4.5, 3.0, True, 2)
        result4 = log_project_export(self.project_path, "zip", "export.zip", 15)
        
        self.assertFalse(result1)
        self.assertFalse(result2)
        self.assertFalse(result3)
        self.assertFalse(result4)
    
    def test_multiple_actions_logged(self):
        """Test that multiple actions are logged sequentially."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        # Log multiple actions
        log_grid_generation(self.project_path, "3x3", "grid.png", 9, 512)
        log_panel_promotion(self.project_path, 9, 2, "lanczos", "promoted")
        log_qa_scoring(self.project_path, 4.5, 3.0, True, 2)
        
        # Verify all actions are in log
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        with open(log_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("GRID_GENERATED", content)
        self.assertIn("PANELS_PROMOTED", content)
        self.assertIn("QA_SCORING_COMPLETED", content)
    
    def test_index_generated_assets_disabled(self):
        """Test asset indexing when memory system is disabled."""
        self._create_project_config(memory_enabled=False)
        
        # Create a test asset
        test_asset = self.project_path / "test_image.png"
        test_asset.write_text("fake image data")
        
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=[str(test_asset)],
            asset_type="image"
        )
        
        # Should return False when disabled
        self.assertFalse(result)
    
    def test_index_generated_assets_images(self):
        """Test indexing generated images."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        # Create assets directory structure
        assets_dir = self.project_path / "assets"
        images_dir = assets_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        # Create test images
        test_images = []
        for i in range(3):
            img_path = images_dir / f"generated_{i}.png"
            img_path.write_text(f"fake image {i}")
            test_images.append(str(img_path))
        
        # Index the assets
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=test_images,
            asset_type="image",
            generation_context={
                "workflow": "test_workflow",
                "shot_id": "shot_001"
            }
        )
        
        # Should succeed
        self.assertTrue(result)
        
        # Verify index file was created
        index_file = assets_dir / "attachments_index.txt"
        self.assertTrue(index_file.exists())
        
        # Verify index content
        with open(index_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("IMAGE:", content)
        self.assertIn("generated_0.png", content)
        
        # Verify summary file was created
        summary_file = assets_dir / "assets_summary.txt"
        self.assertTrue(summary_file.exists())
        
        # Verify action was logged
        log_file = self.project_path / "build_logs" / "build_steps_raw.log"
        self.assertTrue(log_file.exists())
        
        with open(log_file, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        self.assertIn("ASSETS_INDEXED", log_content)
        self.assertIn("asset_type: image", log_content)
        self.assertIn("count: 3", log_content)
    
    def test_index_generated_assets_audio(self):
        """Test indexing generated audio files."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        # Create assets directory structure
        assets_dir = self.project_path / "assets"
        audio_dir = assets_dir / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        
        # Create test audio files
        test_audio = []
        for i in range(2):
            audio_path = audio_dir / f"dialogue_{i}.mp3"
            audio_path.write_text(f"fake audio {i}")
            test_audio.append(str(audio_path))
        
        # Index the assets
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=test_audio,
            asset_type="audio",
            generation_context={
                "audio_type": "dialogue",
                "voice": "narrator"
            }
        )
        
        # Should succeed
        self.assertTrue(result)
        
        # Verify index file contains audio entries
        index_file = assets_dir / "attachments_index.txt"
        with open(index_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("AUDIO:", content)
        self.assertIn("dialogue_0.mp3", content)
    
    def test_index_generated_assets_video(self):
        """Test indexing generated video files."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        # Create assets directory structure
        assets_dir = self.project_path / "assets"
        video_dir = assets_dir / "video"
        video_dir.mkdir(parents=True, exist_ok=True)
        
        # Create test video files
        test_videos = []
        for i in range(2):
            video_path = video_dir / f"shot_{i}.mp4"
            video_path.write_text(f"fake video {i}")
            test_videos.append(str(video_path))
        
        # Index the assets
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=test_videos,
            asset_type="video",
            generation_context={
                "fps": 24,
                "duration": 5.0
            }
        )
        
        # Should succeed
        self.assertTrue(result)
        
        # Verify index file contains video entries
        index_file = assets_dir / "attachments_index.txt"
        with open(index_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("VIDEO:", content)
        self.assertIn("shot_0.mp4", content)
    
    def test_index_generated_assets_empty_list(self):
        """Test indexing with empty asset list."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=[],
            asset_type="image"
        )
        
        # Should return False for empty list
        self.assertFalse(result)
    
    def test_index_generated_assets_nonexistent_files(self):
        """Test indexing with nonexistent files."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        # Try to index files that don't exist
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=[
                str(self.project_path / "nonexistent1.png"),
                str(self.project_path / "nonexistent2.png")
            ],
            asset_type="image"
        )
        
        # Should return False when no files exist
        self.assertFalse(result)
    
    def test_index_generated_assets_mixed_existence(self):
        """Test indexing with mix of existing and nonexistent files."""
        self._create_project_config(memory_enabled=True)
        self._create_memory_structure()
        
        # Create assets directory
        assets_dir = self.project_path / "assets"
        images_dir = assets_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        # Create one real file
        real_file = images_dir / "real.png"
        real_file.write_text("real image")
        
        # Mix real and fake paths
        result = index_generated_assets(
            project_path=self.project_path,
            asset_paths=[
                str(real_file),
                str(self.project_path / "fake.png")
            ],
            asset_type="image"
        )
        
        # Should succeed because at least one file exists
        self.assertTrue(result)
        
        # Verify only real file is indexed
        index_file = assets_dir / "attachments_index.txt"
        with open(index_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn("real.png", content)
        self.assertNotIn("fake.png", content)


if __name__ == '__main__':
    unittest.main()
