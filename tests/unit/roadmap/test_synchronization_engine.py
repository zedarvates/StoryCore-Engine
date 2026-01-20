"""
Unit tests for the SynchronizationEngine component.

Tests change detection, roadmap updates, and manual edit preservation.
"""

import pytest
import tempfile
import time
from pathlib import Path
from datetime import datetime

from src.roadmap.synchronization_engine import SynchronizationEngine
from src.roadmap.models import RoadmapConfig, SpecFiles


class TestSynchronizationEngine:
    """Test suite for SynchronizationEngine."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for testing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    @pytest.fixture
    def config(self, temp_dir):
        """Create a test configuration."""
        specs_dir = temp_dir / ".kiro" / "specs"
        specs_dir.mkdir(parents=True)
        
        return RoadmapConfig(
            specs_directory=specs_dir,
            output_path=temp_dir / "ROADMAP.md",
            changelog_path=temp_dir / "CHANGELOG.md"
        )
    
    @pytest.fixture
    def engine(self, config):
        """Create a SynchronizationEngine instance."""
        return SynchronizationEngine(config)
    
    def create_spec(self, specs_dir: Path, name: str) -> Path:
        """Helper to create a spec directory with files."""
        spec_dir = specs_dir / name
        spec_dir.mkdir(parents=True, exist_ok=True)
        
        # Create requirements.md
        requirements = spec_dir / "requirements.md"
        requirements.write_text(
            f"# {name.replace('-', ' ').title()}\n\n"
            f"This is a test spec for {name}.\n",
            encoding='utf-8'
        )
        
        # Create tasks.md
        tasks = spec_dir / "tasks.md"
        tasks.write_text(
            "# Tasks\n\n- [ ] Task 1\n- [ ] Task 2\n",
            encoding='utf-8'
        )
        
        return spec_dir
    
    def test_initialization(self, engine, config):
        """Test SynchronizationEngine initialization."""
        assert engine.config == config
        assert engine.scanner is not None
        assert engine.metadata_extractor is not None
        assert engine.status_tracker is not None
        assert engine.timeline_organizer is not None
        assert engine.formatter is not None
        assert isinstance(engine._modification_cache, dict)
        assert len(engine._modification_cache) == 0
    
    def test_detect_changes_empty_directory(self, engine):
        """Test change detection with no specs."""
        changes = engine.detect_changes()
        
        assert 'created' in changes
        assert 'modified' in changes
        assert 'deleted' in changes
        assert len(changes['created']) == 0
        assert len(changes['modified']) == 0
        assert len(changes['deleted']) == 0
    
    def test_detect_changes_new_spec(self, engine, config):
        """Test detection of newly created spec."""
        # Create a new spec
        self.create_spec(config.specs_directory, "test-feature")
        
        # Detect changes
        changes = engine.detect_changes()
        
        assert len(changes['created']) == 1
        assert len(changes['modified']) == 0
        assert len(changes['deleted']) == 0
        assert changes['created'][0].directory.name == "test-feature"
    
    def test_detect_changes_modified_spec(self, engine, config):
        """Test detection of modified spec."""
        # Create a spec
        spec_dir = self.create_spec(config.specs_directory, "test-feature")
        
        # First scan to populate cache
        changes1 = engine.detect_changes()
        assert len(changes1['created']) == 1
        
        # Wait a bit to ensure different mtime
        time.sleep(0.1)
        
        # Modify the spec
        requirements = spec_dir / "requirements.md"
        requirements.write_text(
            "# Modified\n\nThis has been modified.\n",
            encoding='utf-8'
        )
        
        # Detect changes again
        changes2 = engine.detect_changes()
        
        assert len(changes2['created']) == 0
        assert len(changes2['modified']) == 1
        assert len(changes2['deleted']) == 0
        assert changes2['modified'][0].directory.name == "test-feature"
    
    def test_detect_changes_deleted_spec(self, engine, config):
        """Test detection of deleted spec."""
        # Create a spec
        spec_dir = self.create_spec(config.specs_directory, "test-feature")
        
        # First scan to populate cache
        changes1 = engine.detect_changes()
        assert len(changes1['created']) == 1
        
        # Delete the spec
        import shutil
        shutil.rmtree(spec_dir)
        
        # Detect changes again
        changes2 = engine.detect_changes()
        
        assert len(changes2['created']) == 0
        assert len(changes2['modified']) == 0
        assert len(changes2['deleted']) == 1
        assert changes2['deleted'][0].directory.name == "test-feature"
    
    def test_detect_changes_multiple_specs(self, engine, config):
        """Test detection with multiple specs and mixed changes."""
        # Create initial specs
        self.create_spec(config.specs_directory, "feature-1")
        self.create_spec(config.specs_directory, "feature-2")
        
        # First scan
        changes1 = engine.detect_changes()
        assert len(changes1['created']) == 2
        
        # Wait a bit
        time.sleep(0.1)
        
        # Modify one spec
        spec1 = config.specs_directory / "feature-1"
        (spec1 / "requirements.md").write_text(
            "# Modified\n\nModified content.\n",
            encoding='utf-8'
        )
        
        # Create a new spec
        self.create_spec(config.specs_directory, "feature-3")
        
        # Delete one spec
        import shutil
        shutil.rmtree(config.specs_directory / "feature-2")
        
        # Detect changes
        changes2 = engine.detect_changes()
        
        assert len(changes2['created']) == 1
        assert len(changes2['modified']) == 1
        assert len(changes2['deleted']) == 1
        assert changes2['created'][0].directory.name == "feature-3"
        assert changes2['modified'][0].directory.name == "feature-1"
        assert changes2['deleted'][0].directory.name == "feature-2"
    
    def test_get_latest_mtime(self, engine, config):
        """Test getting latest modification time from spec files."""
        # Create a spec
        spec_dir = self.create_spec(config.specs_directory, "test-feature")
        
        # Create SpecFiles object
        spec_files = SpecFiles(
            directory=spec_dir,
            requirements=spec_dir / "requirements.md",
            design=None,
            tasks=spec_dir / "tasks.md",
            metadata={}
        )
        
        # Get mtime
        mtime = engine._get_latest_mtime(spec_files)
        
        assert mtime > 0
        assert isinstance(mtime, float)
    
    def test_get_latest_mtime_no_files(self, engine, temp_dir):
        """Test getting mtime when no files exist."""
        spec_dir = temp_dir / "empty-spec"
        spec_dir.mkdir()
        
        spec_files = SpecFiles(
            directory=spec_dir,
            requirements=None,
            design=None,
            tasks=None,
            metadata={}
        )
        
        mtime = engine._get_latest_mtime(spec_files)
        
        assert mtime == 0.0
    
    def test_preserve_manual_edits(self, engine):
        """Test marking sections for manual edit preservation."""
        content = """# StoryCore-Engine Roadmap

Welcome to our roadmap! This introduction is manually written.

## Q1 2026

Features for Q1 2026.
"""
        
        marked_content = engine.preserve_manual_edits(content)
        
        # Check that protection markers were added
        assert engine.PROTECTED_SECTION_START in marked_content
        assert engine.PROTECTED_SECTION_END in marked_content
        
        # Check that introduction is wrapped
        assert "manually written" in marked_content
        lines = marked_content.split('\n')
        intro_idx = next(
            i for i, line in enumerate(lines)
            if "manually written" in line
        )
        
        # Find markers around the introduction
        start_idx = next(
            i for i in range(intro_idx, -1, -1)
            if engine.PROTECTED_SECTION_START in lines[i]
        )
        end_idx = next(
            i for i in range(intro_idx, len(lines))
            if engine.PROTECTED_SECTION_END in lines[i]
        )
        
        assert start_idx < intro_idx < end_idx
    
    def test_preserve_manual_edits_already_marked(self, engine):
        """Test that already marked sections aren't double-wrapped."""
        content = f"""# StoryCore-Engine Roadmap

{engine.PROTECTED_SECTION_START}
This is already protected.
{engine.PROTECTED_SECTION_END}

## Q1 2026

Features for Q1 2026.
"""
        
        marked_content = engine.preserve_manual_edits(content)
        
        # Count occurrences of markers - should still be just 1 pair
        start_count = marked_content.count(engine.PROTECTED_SECTION_START)
        end_count = marked_content.count(engine.PROTECTED_SECTION_END)
        
        assert start_count == 1
        assert end_count == 1
    
    def test_extract_protected_sections(self, engine):
        """Test extraction of protected sections from content."""
        content = f"""# Roadmap

{engine.PROTECTED_SECTION_START}
This is protected content.
It has multiple lines.
{engine.PROTECTED_SECTION_END}

## Section 1

Regular content here.

{engine.PROTECTED_SECTION_START}
Another protected section.
{engine.PROTECTED_SECTION_END}
"""
        
        protected = engine._extract_protected_sections(content)
        
        assert len(protected) == 2
        assert 'section_0' in protected
        assert 'section_1' in protected
        assert "protected content" in protected['section_0']
        assert "Another protected" in protected['section_1']
    
    def test_extract_protected_sections_none(self, engine):
        """Test extraction when no protected sections exist."""
        content = """# Roadmap

No protected sections here.

## Section 1

Just regular content.
"""
        
        protected = engine._extract_protected_sections(content)
        
        assert len(protected) == 0
    
    def test_restore_protected_sections(self, engine):
        """Test restoration of protected sections into new content."""
        protected_sections = {
            'section_0': "This is my custom introduction.\nIt has multiple lines."
        }
        
        new_content = """# StoryCore-Engine Roadmap

This is the auto-generated introduction.

## Q1 2026

Features here.
"""
        
        restored = engine._restore_protected_sections(
            new_content,
            protected_sections
        )
        
        # Check that protected content was restored
        assert "custom introduction" in restored
        assert engine.PROTECTED_SECTION_START in restored
        assert engine.PROTECTED_SECTION_END in restored
        
        # Check that auto-generated intro was replaced
        assert "auto-generated introduction" not in restored
    
    def test_restore_protected_sections_empty(self, engine):
        """Test restoration with no protected sections."""
        new_content = """# Roadmap

Content here.
"""
        
        restored = engine._restore_protected_sections(new_content, {})
        
        # Content should be unchanged
        assert restored == new_content
    
    def test_update_roadmap_no_existing_file(self, engine, config):
        """Test update when roadmap doesn't exist yet."""
        # Create a spec
        self.create_spec(config.specs_directory, "test-feature")
        
        # Detect changes
        changes = engine.detect_changes()
        
        # Update roadmap (should trigger full generation)
        engine.update_roadmap(changes)
        
        # Check that roadmap was created
        assert config.output_path.exists()
        content = config.output_path.read_text(encoding='utf-8')
        assert "# StoryCore-Engine Development Roadmap" in content or "# Roadmap" in content
    
    def test_update_roadmap_full_regeneration(self, engine, config):
        """Test full regeneration when changes is None."""
        # Create a spec
        self.create_spec(config.specs_directory, "test-feature")
        
        # Update with None (full regeneration)
        engine.update_roadmap(None)
        
        # Check that roadmap was created
        assert config.output_path.exists()
        content = config.output_path.read_text(encoding='utf-8')
        assert len(content) > 0


class TestSynchronizationEngineEdgeCases:
    """Test edge cases and error conditions."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for testing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    @pytest.fixture
    def config(self, temp_dir):
        """Create a test configuration."""
        specs_dir = temp_dir / ".kiro" / "specs"
        specs_dir.mkdir(parents=True)
        
        return RoadmapConfig(
            specs_directory=specs_dir,
            output_path=temp_dir / "ROADMAP.md",
            changelog_path=temp_dir / "CHANGELOG.md"
        )
    
    @pytest.fixture
    def engine(self, config):
        """Create a SynchronizationEngine instance."""
        return SynchronizationEngine(config)
    
    def test_detect_changes_nonexistent_directory(self, temp_dir):
        """Test change detection when specs directory doesn't exist."""
        config = RoadmapConfig(
            specs_directory=temp_dir / "nonexistent",
            output_path=temp_dir / "ROADMAP.md"
        )
        engine = SynchronizationEngine(config)
        
        changes = engine.detect_changes()
        
        assert len(changes['created']) == 0
        assert len(changes['modified']) == 0
        assert len(changes['deleted']) == 0
    
    def test_get_latest_mtime_deleted_file(self, engine, temp_dir):
        """Test getting mtime when file is deleted between check and stat."""
        spec_dir = temp_dir / "test-spec"
        spec_dir.mkdir()
        
        # Create a file
        req_file = spec_dir / "requirements.md"
        req_file.write_text("# Test\n", encoding='utf-8')
        
        spec_files = SpecFiles(
            directory=spec_dir,
            requirements=req_file,
            design=None,
            tasks=None,
            metadata={}
        )
        
        # Delete the file
        req_file.unlink()
        
        # Should handle gracefully
        mtime = engine._get_latest_mtime(spec_files)
        assert mtime == 0.0
