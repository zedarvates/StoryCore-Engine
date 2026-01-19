"""
Integration tests for StoryCore-Engine full pipeline with quality validation.
Tests the complete pipeline from initialization to export with integrated quality validation.
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

from src.project_manager import ProjectManager
from src.qa_engine import QAEngine
from src.assembly_export_engine import AssemblyExportEngine, ExportSettings, PackageType, QualityPreset, ExportFormat


class TestFullPipelineQualityIntegration:
    """Integration tests for complete pipeline with quality validation."""

    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.project_name = "test_quality_integration"
        self.project_path = self.temp_dir / self.project_name

    def teardown_method(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_full_pipeline_with_quality_validation(self):
        """Test complete pipeline from init to export with quality validation."""
        # Initialize project
        pm = ProjectManager()
        pm.init_project(self.project_name, str(self.temp_dir))

        assert self.project_path.exists()
        assert (self.project_path / "project.json").exists()

        # Verify quality validation fields are present
        with open(self.project_path / "project.json", 'r') as f:
            project_data = json.load(f)

        assert "quality_validation" in project_data
        qv = project_data["quality_validation"]
        assert qv["enabled"] is True
        assert "audio_quality_metrics" in qv
        assert "video_quality_metrics" in qv
        assert "autofix_enabled" in qv

        # Create mock promoted images for QA testing
        promoted_dir = self.project_path / "assets" / "images" / "promoted"
        promoted_dir.mkdir(parents=True, exist_ok=True)

        # Create mock promoted image files
        from PIL import Image, ImageDraw
        for i in range(3):
            # Create a simple test image
            img = Image.new('RGB', (512, 512), color='gray')
            draw = ImageDraw.Draw(img)
            draw.rectangle([50, 50, 462, 462], outline='white', width=5)
            img.save(promoted_dir / f"panel_{i+1:02d}_promoted.png")

        # Run QA engine with advanced validation
        qa_engine = QAEngine()
        qa_report = qa_engine.run_qa_scoring(
            str(self.project_path),
            enable_advanced_validation=True,
            enable_audio_mixing=True
        )

        # Verify QA report structure
        assert "overall_score" in qa_report
        assert "categories" in qa_report
        assert "issues" in qa_report
        assert "quality_scores" in qa_report
        assert qa_report["advanced_validation_enabled"] is True
        assert qa_report["audio_mixing_enabled"] is True

        # Check that image quality was scored
        assert "image_quality" in qa_report["categories"]
        assert qa_report["categories"]["image_quality"] > 0

        # Test export with quality reports
        export_engine = AssemblyExportEngine(mock_mode=True)
        export_settings = ExportSettings(
            package_type=PackageType.PROFESSIONAL,
            quality_preset=QualityPreset.STANDARD,
            include_qa_report=True
        )

        export_output = self.project_path / "test_export"
        manifest = export_engine.create_export_package(
            self.project_path,
            export_settings,
            export_output
        )

        # Verify quality reports were generated and included
        assert len(manifest.qa_files) > 0
        qa_files_found = [f for f in manifest.qa_files if "quality_report" in f or "quality_summary" in f]
        assert len(qa_files_found) > 0

        # Check that quality report files exist
        for qa_file in qa_files_found:
            qa_path = export_output / qa_file
            assert qa_path.exists()

            # Verify file content
            with open(qa_path, 'r') as f:
                if qa_file.endswith('.json'):
                    content = json.load(f)
                    assert "report_type" in content or "overall_score" in content

    def test_autofix_loop_integration(self):
        """Test autofix loop integration in QA workflow."""
        # Initialize project
        pm = ProjectManager()
        pm.init_project(self.project_name, str(self.temp_dir))

        # Create mock low-quality promoted images
        promoted_dir = self.project_path / "assets" / "images" / "promoted"
        promoted_dir.mkdir(parents=True, exist_ok=True)

        # Create very low-quality images (uniform color = low sharpness)
        from PIL import Image
        for i in range(3):
            img = Image.new('RGB', (256, 256), color='gray')  # Very low quality
            img.save(promoted_dir / f"panel_{i+1:02d}_promoted.png")

        # Mock autofix engine
        with patch('src.promotion_engine.autofix_engine') as mock_autofix:
            mock_instance = MagicMock()
            mock_instance.should_retry.return_value = (True, {"denoising_strength": 0.5})
            mock_instance.apply_corrections.return_value = (Image.new('RGB', (256, 256), color='lightgray'), {"applied": True})
            mock_instance.generate_autofix_log.return_value = {
                "panel_id": f"panel_{i+1:02d}",
                "corrections_applied": ["denoising"],
                "improvement_score": 15.0
            }
            mock_autofix.AutofixEngine.return_value = mock_instance

            # Run QA with autofix enabled
            qa_engine = QAEngine()
            qa_report = qa_engine.run_qa_scoring(
                str(self.project_path),
                enable_advanced_validation=True,
                enable_audio_mixing=False
            )

            # Verify autofix was attempted (mock doesn't actually improve quality)
            assert "quality_scores" in qa_report
            # Quality should still be low due to mock implementation
            assert qa_report["categories"]["image_quality"] < 3.0  # Low quality expected

    def test_report_generation_in_exports(self):
        """Test that quality reports are properly generated and included in exports."""
        # Initialize project
        pm = ProjectManager()
        pm.init_project(self.project_name, str(self.temp_dir))

        # Create test images
        promoted_dir = self.project_path / "assets" / "images" / "promoted"
        promoted_dir.mkdir(parents=True, exist_ok=True)

        from PIL import Image, ImageDraw
        for i in range(3):
            img = Image.new('RGB', (512, 512), color='gray')
            draw = ImageDraw.Draw(img)
            draw.rectangle([100, 100, 412, 412], outline='white', width=10)
            img.save(promoted_dir / f"panel_{i+1:02d}_promoted.png")

        # Test different export package types
        export_engine = AssemblyExportEngine(mock_mode=True)

        test_cases = [
            (PackageType.STANDARD, False),  # Should not include QA reports
            (PackageType.PROFESSIONAL, True),  # Should include QA reports
            (PackageType.ARCHIVE, True),  # Should include QA reports
        ]

        for package_type, should_have_qa in test_cases:
            export_settings = ExportSettings(
                package_type=package_type,
                quality_preset=QualityPreset.STANDARD,
                include_qa_report=should_have_qa
            )

            export_output = self.project_path / f"test_export_{package_type.value}"
            manifest = export_engine.create_export_package(
                self.project_path,
                export_settings,
                export_output
            )

            if should_have_qa:
                assert len(manifest.qa_files) > 0, f"Package type {package_type.value} should include QA files"
                # Check for timestamped files
                timestamped_files = [f for f in manifest.qa_files if any(keyword in f for keyword in ["quality_report", "quality_summary"])]
                assert len(timestamped_files) > 0, "Should have timestamped quality report files"
            else:
                # Standard packages shouldn't include QA reports by default
                assert len(manifest.qa_files) == 0, f"Package type {package_type.value} should not include QA files"

    def test_data_contract_compliance_with_quality_fields(self):
        """Test that data contract properly handles quality validation fields."""
        pm = ProjectManager()

        # Create project data without quality validation fields
        project_data = {
            "schema_version": "1.0",
            "project_id": "test_project",
            "capabilities": {},
            "generation_status": {},
            "config": {},
            "coherence_anchors": {},
            "shots_index": {},
            "asset_manifest": {},
            "status": {}
        }

        # Ensure schema compliance
        compliant_data = pm.ensure_schema_compliance(project_data)

        # Verify quality validation fields were added
        assert "quality_validation" in compliant_data
        qv = compliant_data["quality_validation"]

        required_fields = [
            "enabled", "last_validation_timestamp", "overall_quality_score",
            "validation_pass", "audio_mixing_status", "quality_scores",
            "detected_issues", "improvement_suggestions", "autofix_enabled",
            "autofix_logs", "quality_reports", "validation_mode", "quality_standard",
            "audio_quality_metrics", "video_quality_metrics", "report_timestamps"
        ]

        for field in required_fields:
            assert field in qv, f"Missing required quality validation field: {field}"

        # Test nested structures
        assert "voice_clarity_score" in qv["audio_quality_metrics"]
        assert "sharpness_score" in qv["video_quality_metrics"]

    def test_quality_validation_backward_compatibility(self):
        """Test that quality validation maintains backward compatibility."""
        # Create legacy project data (without quality validation fields)
        legacy_data = {
            "schema_version": "1.0",
            "project_id": "legacy_project",
            "capabilities": {"grid": True, "promote": True},
            "generation_status": {"grid": "completed"},
            "config": {"hackathon_mode": True},
            "coherence_anchors": {"style_anchor_id": "STYLE_V1"},
            "shots_index": {"shot_01": {"status": "pending"}},
            "asset_manifest": {},
            "status": {"current_phase": "grid"}
        }

        pm = ProjectManager()
        updated_data = pm.ensure_schema_compliance(legacy_data)

        # Verify legacy fields are preserved
        assert updated_data["capabilities"]["grid"] is True
        assert updated_data["generation_status"]["grid"] == "completed"

        # Verify quality validation fields were added without breaking legacy data
        assert "quality_validation" in updated_data
        assert updated_data["quality_validation"]["enabled"] is True

        # Test QA engine works with legacy project
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir) / "legacy_project"
            temp_path.mkdir()

            # Write legacy project.json
            with open(temp_path / "project.json", 'w') as f:
                json.dump(legacy_data, f, indent=2)

            # Create minimal storyboard
            storyboard = {"shots": []}
            with open(temp_path / "storyboard.json", 'w') as f:
                json.dump(storyboard, f, indent=2)

            # Run QA (should not fail)
            qa_engine = QAEngine()
            qa_report = qa_engine.run_qa_scoring(str(temp_path), enable_advanced_validation=False)

            assert "overall_score" in qa_report
            assert qa_report["passed"] is not None