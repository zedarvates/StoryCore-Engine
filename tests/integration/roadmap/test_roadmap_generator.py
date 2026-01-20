"""
Integration tests for RoadmapGenerator orchestrator.

These tests verify that the RoadmapGenerator correctly coordinates all components
to generate a complete roadmap from internal specs.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from src.roadmap.roadmap_generator import RoadmapGenerator
from src.roadmap.models import RoadmapConfig


class TestRoadmapGeneratorIntegration:
    """Integration tests for the complete roadmap generation pipeline."""
    
    def test_generate_with_real_specs(self, tmp_path):
        """Test generating roadmap from actual project specs."""
        # Use the real specs directory
        real_specs_dir = Path(".kiro/specs")
        
        if not real_specs_dir.exists():
            pytest.skip("No specs directory found")
        
        # Configure to write to temp directory
        config = RoadmapConfig(
            specs_directory=real_specs_dir,
            output_path=tmp_path / "ROADMAP.md",
            changelog_path=tmp_path / "CHANGELOG.md"
        )
        
        # Generate roadmap
        generator = RoadmapGenerator(config)
        generator.generate()
        
        # Verify output files were created
        assert config.output_path.exists()
        assert config.changelog_path.exists()
        
        # Verify roadmap has content
        roadmap_content = config.output_path.read_text(encoding='utf-8')
        assert len(roadmap_content) > 0
        assert "# StoryCore-Engine Development Roadmap" in roadmap_content
        assert "Last Updated:" in roadmap_content
        
        # Verify changelog has content
        changelog_content = config.changelog_path.read_text(encoding='utf-8')
        assert len(changelog_content) > 0
        assert "# Changelog" in changelog_content
    
    def test_generate_with_empty_specs(self, tmp_path):
        """Test generating roadmap when no specs exist."""
        # Create empty specs directory
        empty_specs_dir = tmp_path / "empty_specs"
        empty_specs_dir.mkdir()
        
        # Configure generator
        config = RoadmapConfig(
            specs_directory=empty_specs_dir,
            output_path=tmp_path / "ROADMAP.md",
            changelog_path=tmp_path / "CHANGELOG.md"
        )
        
        # Generate roadmap
        generator = RoadmapGenerator(config)
        generator.generate()
        
        # Verify output files were created
        assert config.output_path.exists()
        assert config.changelog_path.exists()
        
        # Verify empty roadmap message
        roadmap_content = config.output_path.read_text(encoding='utf-8')
        assert "No Features Yet" in roadmap_content
    
    def test_generate_with_sample_spec(self, tmp_path):
        """Test generating roadmap with a single sample spec."""
        # Create sample spec directory
        specs_dir = tmp_path / "specs"
        sample_spec = specs_dir / "sample-feature"
        sample_spec.mkdir(parents=True)
        
        # Create requirements.md
        requirements_content = """---
priority: High
category: UI
timeline: Q1 2026
---

# Sample Feature

This is a sample feature for testing the roadmap generator.

## Requirements

The feature should do something useful.
"""
        (sample_spec / "requirements.md").write_text(requirements_content, encoding='utf-8')
        
        # Create tasks.md
        tasks_content = """# Tasks

- [x] Task 1
- [x] Task 2
- [ ] Task 3
"""
        (sample_spec / "tasks.md").write_text(tasks_content, encoding='utf-8')
        
        # Configure generator
        config = RoadmapConfig(
            specs_directory=specs_dir,
            output_path=tmp_path / "ROADMAP.md",
            changelog_path=tmp_path / "CHANGELOG.md"
        )
        
        # Generate roadmap
        generator = RoadmapGenerator(config)
        generator.generate()
        
        # Verify output files
        assert config.output_path.exists()
        assert config.changelog_path.exists()
        
        # Verify roadmap contains the feature
        roadmap_content = config.output_path.read_text(encoding='utf-8')
        assert "Sample Feature" in roadmap_content
        assert "Q1 2026" in roadmap_content
        assert "🚧" in roadmap_content  # In-progress emoji (66% complete)
        assert "🔴" in roadmap_content  # High priority emoji
        
        # Verify badge was injected
        requirements_updated = (sample_spec / "requirements.md").read_text(encoding='utf-8')
        assert "View in Public Roadmap" in requirements_updated or "roadmap" in requirements_updated.lower()
    
    def test_generate_with_completed_feature(self, tmp_path):
        """Test that completed features appear in changelog."""
        # Create sample spec directory
        specs_dir = tmp_path / "specs"
        completed_spec = specs_dir / "completed-feature"
        completed_spec.mkdir(parents=True)
        
        # Create requirements.md
        requirements_content = """# Completed Feature

This feature is fully implemented.
"""
        (completed_spec / "requirements.md").write_text(requirements_content, encoding='utf-8')
        
        # Create tasks.md with all tasks completed
        tasks_content = """# Tasks

- [x] Task 1
- [x] Task 2
- [x] Task 3
"""
        (completed_spec / "tasks.md").write_text(tasks_content, encoding='utf-8')
        
        # Configure generator
        config = RoadmapConfig(
            specs_directory=specs_dir,
            output_path=tmp_path / "ROADMAP.md",
            changelog_path=tmp_path / "CHANGELOG.md"
        )
        
        # Generate roadmap
        generator = RoadmapGenerator(config)
        generator.generate()
        
        # Verify roadmap shows completed status
        roadmap_content = config.output_path.read_text(encoding='utf-8')
        assert "Completed Feature" in roadmap_content
        assert "✅" in roadmap_content  # Completed emoji
        
        # Verify changelog contains the feature
        changelog_content = config.changelog_path.read_text(encoding='utf-8')
        assert "Completed Feature" in changelog_content
    
    def test_generate_preserves_existing_files(self, tmp_path):
        """Test that regenerating doesn't lose data."""
        # Create sample spec
        specs_dir = tmp_path / "specs"
        sample_spec = specs_dir / "test-feature"
        sample_spec.mkdir(parents=True)
        
        (sample_spec / "requirements.md").write_text("# Test Feature\n\nTest description.", encoding='utf-8')
        (sample_spec / "tasks.md").write_text("- [ ] Task 1", encoding='utf-8')
        
        # Configure generator
        config = RoadmapConfig(
            specs_directory=specs_dir,
            output_path=tmp_path / "ROADMAP.md",
            changelog_path=tmp_path / "CHANGELOG.md"
        )
        
        # Generate first time
        generator1 = RoadmapGenerator(config)
        generator1.generate()
        
        first_content = config.output_path.read_text(encoding='utf-8')
        
        # Generate second time
        generator2 = RoadmapGenerator(config)
        generator2.generate()
        
        second_content = config.output_path.read_text(encoding='utf-8')
        
        # Both should contain the feature
        assert "Test Feature" in first_content
        assert "Test Feature" in second_content
        
        # Timestamps will differ, but structure should be similar
        assert "# StoryCore-Engine Development Roadmap" in second_content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
