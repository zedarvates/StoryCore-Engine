"""
Unit tests for the StatusTracker component.

Tests cover completion calculation, status determination, and completion date
retrieval with various task patterns and edge cases.
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from datetime import datetime

from src.roadmap.status_tracker import StatusTracker
from src.roadmap.models import FeatureStatus


class TestStatusTracker:
    """Test suite for StatusTracker class."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for testing."""
        temp_path = Path(tempfile.mkdtemp())
        yield temp_path
        # Cleanup after test
        if temp_path.exists():
            shutil.rmtree(temp_path)
    
    @pytest.fixture
    def tracker(self):
        """Create a StatusTracker instance."""
        return StatusTracker()
    
    def test_calculate_completion_all_completed(self, temp_dir, tracker):
        """Test completion calculation when all tasks are completed."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task 1
- [x] Task 2
- [x] Task 3
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        assert completion == 1.0
    
    def test_calculate_completion_none_completed(self, temp_dir, tracker):
        """Test completion calculation when no tasks are completed."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        assert completion == 0.0
    
    def test_calculate_completion_partial(self, temp_dir, tracker):
        """Test completion calculation with partial completion."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task 1
- [ ] Task 2
- [x] Task 3
- [ ] Task 4
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        assert completion == 0.5
    
    def test_calculate_completion_with_in_progress(self, temp_dir, tracker):
        """Test completion calculation with in-progress tasks."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task 1
- [-] Task 2
- [ ] Task 3
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # In-progress tasks count as not completed
        assert completion == pytest.approx(1/3)
    
    def test_calculate_completion_with_queued(self, temp_dir, tracker):
        """Test completion calculation with queued tasks."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task 1
- [~] Task 2
- [ ] Task 3
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # Queued tasks count as not completed
        assert completion == pytest.approx(1/3)
    
    def test_calculate_completion_excludes_optional_tasks(self, temp_dir, tracker):
        """Test that optional tasks are excluded from completion calculation."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task 1
- [ ] Task 2
- [ ]* Optional Task 3
- [ ]\\* Optional Task 4
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # Only 2 required tasks, 1 completed
        assert completion == 0.5
    
    def test_calculate_completion_all_optional(self, temp_dir, tracker):
        """Test completion when all tasks are optional."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [ ]* Optional Task 1
- [ ]* Optional Task 2
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # All tasks optional, consider 100% complete
        assert completion == 1.0
    
    def test_calculate_completion_no_tasks(self, temp_dir, tracker):
        """Test completion calculation when file has no tasks."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

This file has no task checkboxes.
Just some text.
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        assert completion == 0.0
    
    def test_calculate_completion_empty_file(self, temp_dir, tracker):
        """Test completion calculation with empty file."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("")
        
        completion = tracker.calculate_completion(tasks_file)
        
        assert completion == 0.0
    
    def test_calculate_completion_nested_tasks(self, temp_dir, tracker):
        """Test completion calculation with nested/indented tasks."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task 1
  - [x] Subtask 1.1
  - [ ] Subtask 1.2
- [ ] Task 2
  - [x] Subtask 2.1
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # All tasks count equally (5 total, 3 completed)
        assert completion == 0.6
    
    def test_calculate_completion_various_spacing(self, temp_dir, tracker):
        """Test completion calculation with various spacing patterns."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

-   [x]   Task 1
-  [ ]  Task 2
- [x] Task 3
-\t[x]\tTask 4
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        assert completion == 0.75
    
    def test_calculate_completion_file_not_found(self, temp_dir, tracker):
        """Test that FileNotFoundError is raised for nonexistent file."""
        nonexistent = temp_dir / "nonexistent.md"
        
        with pytest.raises(FileNotFoundError):
            tracker.calculate_completion(nonexistent)
    
    def test_calculate_completion_unreadable_file(self, temp_dir, tracker):
        """Test that ValueError is raised for unreadable file."""
        # Create a directory instead of a file
        tasks_dir = temp_dir / "tasks.md"
        tasks_dir.mkdir()
        
        with pytest.raises(ValueError):
            tracker.calculate_completion(tasks_dir)
    
    def test_determine_status_planned(self, tracker):
        """Test status determination for 0% completion."""
        status = tracker.determine_status(0.0)
        
        assert status == FeatureStatus.PLANNED
    
    def test_determine_status_in_progress(self, tracker):
        """Test status determination for partial completion."""
        status = tracker.determine_status(0.5)
        
        assert status == FeatureStatus.IN_PROGRESS
    
    def test_determine_status_completed(self, tracker):
        """Test status determination for 100% completion."""
        status = tracker.determine_status(1.0)
        
        assert status == FeatureStatus.COMPLETED
    
    def test_determine_status_various_percentages(self, tracker):
        """Test status determination for various completion percentages."""
        # Test edge cases
        assert tracker.determine_status(0.01) == FeatureStatus.IN_PROGRESS
        assert tracker.determine_status(0.99) == FeatureStatus.IN_PROGRESS
        
        # Test middle values
        assert tracker.determine_status(0.25) == FeatureStatus.IN_PROGRESS
        assert tracker.determine_status(0.75) == FeatureStatus.IN_PROGRESS
    
    def test_determine_status_with_metadata_override(self, tracker):
        """Test that metadata status override is respected."""
        metadata = {'status': 'future'}
        
        status = tracker.determine_status(0.5, metadata)
        
        assert status == FeatureStatus.FUTURE
    
    def test_determine_status_metadata_override_completed(self, tracker):
        """Test metadata override for completed status."""
        metadata = {'status': 'completed'}
        
        status = tracker.determine_status(0.0, metadata)
        
        assert status == FeatureStatus.COMPLETED
    
    def test_determine_status_invalid_metadata_ignored(self, tracker):
        """Test that invalid metadata status is ignored."""
        metadata = {'status': 'invalid-status'}
        
        status = tracker.determine_status(0.5)
        
        # Should fall back to automatic determination
        assert status == FeatureStatus.IN_PROGRESS
    
    def test_determine_status_invalid_completion_raises(self, tracker):
        """Test that invalid completion percentage raises ValueError."""
        with pytest.raises(ValueError):
            tracker.determine_status(-0.1)
        
        with pytest.raises(ValueError):
            tracker.determine_status(1.1)
    
    def test_determine_status_no_metadata(self, tracker):
        """Test status determination with None metadata."""
        status = tracker.determine_status(0.5, None)
        
        assert status == FeatureStatus.IN_PROGRESS
    
    def test_determine_status_empty_metadata(self, tracker):
        """Test status determination with empty metadata dict."""
        status = tracker.determine_status(0.5, {})
        
        assert status == FeatureStatus.IN_PROGRESS
    
    def test_get_completion_date_no_tasks_file(self, temp_dir, tracker):
        """Test get_completion_date when tasks.md doesn't exist."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir()
        
        completion_date = tracker.get_completion_date(spec_dir)
        
        assert completion_date is None
    
    def test_get_completion_date_not_git_repo(self, temp_dir, tracker):
        """Test get_completion_date when not in a git repository."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir()
        tasks_file = spec_dir / "tasks.md"
        tasks_file.write_text("- [x] Task 1")
        
        completion_date = tracker.get_completion_date(spec_dir)
        
        # Should return None when git is not available
        assert completion_date is None
    
    def test_calculate_completion_with_subtasks(self, temp_dir, tracker):
        """Test completion calculation with parent and subtasks."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] 1. Parent Task 1
  - [x] 1.1 Subtask 1
  - [x] 1.2 Subtask 2
- [ ] 2. Parent Task 2
  - [x] 2.1 Subtask 1
  - [ ] 2.2 Subtask 2
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # 6 total tasks, 4 completed
        assert completion == pytest.approx(4/6)
    
    def test_calculate_completion_mixed_optional_required(self, temp_dir, tracker):
        """Test completion with mix of optional and required tasks."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Required Task 1
- [ ] Required Task 2
- [x]* Optional Task 1
- [ ]* Optional Task 2
- [x] Required Task 3
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # 3 required tasks, 2 completed
        assert completion == pytest.approx(2/3)
    
    def test_calculate_completion_case_sensitivity(self, temp_dir, tracker):
        """Test that checkbox parsing is case-sensitive."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Completed (lowercase x)
- [X] Not recognized (uppercase X)
- [ ] Not completed
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # Only lowercase 'x' is recognized as completed
        # 2 tasks recognized (lowercase x and space), 1 completed
        assert completion == 0.5
    
    def test_calculate_completion_with_extra_text(self, temp_dir, tracker):
        """Test completion calculation with extra text after checkbox."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task 1 with description
- [ ] Task 2 - more details here
- [x]* Optional task with lots of text
- [-] In progress task
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # 3 required tasks (x, space, dash), 1 completed
        assert completion == pytest.approx(1/3)
    
    def test_determine_status_boundary_values(self, tracker):
        """Test status determination at exact boundary values."""
        assert tracker.determine_status(0.0) == FeatureStatus.PLANNED
        assert tracker.determine_status(1.0) == FeatureStatus.COMPLETED
        
        # Just above 0 and just below 1
        assert tracker.determine_status(0.0001) == FeatureStatus.IN_PROGRESS
        assert tracker.determine_status(0.9999) == FeatureStatus.IN_PROGRESS
    
    def test_calculate_completion_unicode_content(self, temp_dir, tracker):
        """Test completion calculation with unicode characters."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task with émojis 🎉
- [ ] Task with 中文
- [x] Task with العربية
""", encoding='utf-8')
        
        completion = tracker.calculate_completion(tasks_file)
        
        assert completion == pytest.approx(2/3)
    
    def test_calculate_completion_multiline_tasks(self, temp_dir, tracker):
        """Test that only task lines with checkboxes are counted."""
        tasks_file = temp_dir / "tasks.md"
        tasks_file.write_text("""
# Tasks

- [x] Task 1
  This is a continuation of task 1
  on multiple lines
- [ ] Task 2
  Also has multiple lines
  of description
""")
        
        completion = tracker.calculate_completion(tasks_file)
        
        # Only 2 tasks (lines with checkboxes)
        assert completion == 0.5
