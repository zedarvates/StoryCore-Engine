"""
Unit tests for FileMover class.

Tests file movement operations, git mv execution, batch movements,
and movement verification.
"""

import pytest
import subprocess
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

from src.migration.file_mover import (
    FileMover,
    FileMovement,
    BatchResult,
    MovementError,
    MovementStatus
)


@pytest.fixture
def temp_git_repo(tmp_path):
    """Create a temporary Git repository for testing."""
    repo_path = tmp_path / "test_repo"
    repo_path.mkdir()
    
    # Initialize git repository
    subprocess.run(
        ["git", "init"],
        cwd=repo_path,
        capture_output=True,
        check=True
    )
    
    # Configure git user for commits
    subprocess.run(
        ["git", "config", "user.email", "test@example.com"],
        cwd=repo_path,
        capture_output=True,
        check=True
    )
    subprocess.run(
        ["git", "config", "user.name", "Test User"],
        cwd=repo_path,
        capture_output=True,
        check=True
    )
    
    return repo_path


@pytest.fixture
def file_mover(temp_git_repo):
    """Create a FileMover instance for testing."""
    return FileMover(temp_git_repo, dry_run=False)


@pytest.fixture
def dry_run_mover(temp_git_repo):
    """Create a FileMover instance in dry-run mode."""
    return FileMover(temp_git_repo, dry_run=True)


class TestFileMoverInitialization:
    """Test FileMover initialization and validation."""
    
    def test_init_with_valid_git_repo(self, temp_git_repo):
        """Test initialization with a valid Git repository."""
        mover = FileMover(temp_git_repo)
        assert mover.project_root == temp_git_repo.resolve()
        assert mover.dry_run is False
        assert len(mover.movement_history) == 0
    
    def test_init_with_dry_run(self, temp_git_repo):
        """Test initialization in dry-run mode."""
        mover = FileMover(temp_git_repo, dry_run=True)
        assert mover.dry_run is True
    
    def test_init_without_git_repo(self, tmp_path):
        """Test initialization fails without a Git repository."""
        non_git_dir = tmp_path / "not_a_repo"
        non_git_dir.mkdir()
        
        with pytest.raises(RuntimeError, match="not a Git repository"):
            FileMover(non_git_dir)
    
    def test_init_resolves_relative_path(self, temp_git_repo):
        """Test that relative paths are resolved to absolute."""
        # Change to parent directory and use relative path
        import os
        original_cwd = os.getcwd()
        try:
            os.chdir(temp_git_repo.parent)
            relative_path = Path(temp_git_repo.name)
            mover = FileMover(relative_path)
            assert mover.project_root.is_absolute()
            assert mover.project_root == temp_git_repo.resolve()
        finally:
            os.chdir(original_cwd)


class TestSingleFileMovement:
    """Test moving individual files."""
    
    def test_move_file_success(self, file_mover, temp_git_repo):
        """Test successful file movement with git mv."""
        # Create source file and add to git
        source = temp_git_repo / "test_file.txt"
        source.write_text("test content")
        subprocess.run(
            ["git", "add", "test_file.txt"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add test file"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        # Move file
        dest = Path("subdir") / "test_file.txt"
        result = file_mover.move_file(Path("test_file.txt"), dest)
        
        assert result is True
        assert (temp_git_repo / dest).exists()
        assert not source.exists()
        assert len(file_mover.movement_history) == 1
        assert file_mover.movement_history[0].status == MovementStatus.SUCCESS
    
    def test_move_file_creates_destination_directory(self, file_mover, temp_git_repo):
        """Test that destination directory is created if it doesn't exist."""
        # Create source file and add to git
        source = temp_git_repo / "test_file.txt"
        source.write_text("test content")
        subprocess.run(
            ["git", "add", "test_file.txt"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add test file"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        # Move to nested directory that doesn't exist
        dest = Path("level1") / "level2" / "level3" / "test_file.txt"
        result = file_mover.move_file(Path("test_file.txt"), dest)
        
        assert result is True
        assert (temp_git_repo / dest).exists()
        assert (temp_git_repo / "level1" / "level2" / "level3").is_dir()
    
    def test_move_file_source_not_exists(self, file_mover, temp_git_repo):
        """Test moving a file that doesn't exist."""
        result = file_mover.move_file(
            Path("nonexistent.txt"),
            Path("dest.txt")
        )
        
        assert result is False
        assert len(file_mover.movement_history) == 1
        assert file_mover.movement_history[0].status == MovementStatus.FAILED
        assert "does not exist" in file_mover.movement_history[0].error_message
    
    def test_move_file_destination_exists(self, file_mover, temp_git_repo):
        """Test moving to a destination that already exists."""
        # Create source and destination files
        source = temp_git_repo / "source.txt"
        dest = temp_git_repo / "dest.txt"
        source.write_text("source content")
        dest.write_text("dest content")
        
        subprocess.run(
            ["git", "add", "source.txt", "dest.txt"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add files"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        result = file_mover.move_file(Path("source.txt"), Path("dest.txt"))
        
        assert result is False
        assert len(file_mover.movement_history) == 1
        assert file_mover.movement_history[0].status == MovementStatus.FAILED
        assert "already exists" in file_mover.movement_history[0].error_message
    
    def test_move_file_without_git_history(self, file_mover, temp_git_repo):
        """Test moving a file without preserving Git history."""
        # Create source file (not in git)
        source = temp_git_repo / "test_file.txt"
        source.write_text("test content")
        
        # Move without preserving history
        dest = Path("moved_file.txt")
        result = file_mover.move_file(
            Path("test_file.txt"),
            dest,
            preserve_history=False
        )
        
        assert result is True
        assert (temp_git_repo / dest).exists()
        assert not source.exists()


class TestDryRunMode:
    """Test dry-run mode functionality."""
    
    def test_dry_run_does_not_move_files(self, dry_run_mover, temp_git_repo):
        """Test that dry-run mode doesn't actually move files."""
        # Create source file
        source = temp_git_repo / "test_file.txt"
        source.write_text("test content")
        
        # Attempt move in dry-run mode
        dest = Path("moved_file.txt")
        result = dry_run_mover.move_file(Path("test_file.txt"), dest)
        
        assert result is True
        assert source.exists()  # Source still exists
        assert not (temp_git_repo / dest).exists()  # Destination not created
        assert len(dry_run_mover.movement_history) == 1
        assert dry_run_mover.movement_history[0].status == MovementStatus.SUCCESS
    
    def test_dry_run_records_movements(self, dry_run_mover, temp_git_repo):
        """Test that dry-run mode records movements in history."""
        # Create source file
        source = temp_git_repo / "test_file.txt"
        source.write_text("test content")
        
        # Perform multiple dry-run moves
        dry_run_mover.move_file(Path("test_file.txt"), Path("dest1.txt"))
        
        # Create another file for second move
        source2 = temp_git_repo / "test_file2.txt"
        source2.write_text("test content 2")
        dry_run_mover.move_file(Path("test_file2.txt"), Path("dest2.txt"))
        
        assert len(dry_run_mover.movement_history) == 2
        assert all(m.status == MovementStatus.SUCCESS for m in dry_run_mover.movement_history)


class TestBatchMovement:
    """Test batch file movement operations."""
    
    def test_move_batch_success(self, file_mover, temp_git_repo):
        """Test successful batch movement of multiple files."""
        # Create multiple source files
        files = []
        for i in range(3):
            source = temp_git_repo / f"file{i}.txt"
            source.write_text(f"content {i}")
            files.append(source)
        
        # Add to git
        subprocess.run(
            ["git", "add", "."],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add test files"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        # Create batch movements
        movements = [
            FileMovement(
                source=Path(f"file{i}.txt"),
                destination=Path("moved") / f"file{i}.txt"
            )
            for i in range(3)
        ]
        
        # Execute batch
        result = file_mover.move_batch(movements)
        
        assert result.total_files == 3
        assert result.successful == 3
        assert result.failed == 0
        assert result.skipped == 0
        assert result.success_rate == 100.0
        assert len(result.errors) == 0
        
        # Verify all files moved
        for i in range(3):
            assert (temp_git_repo / "moved" / f"file{i}.txt").exists()
            assert not (temp_git_repo / f"file{i}.txt").exists()
    
    def test_move_batch_partial_failure(self, file_mover, temp_git_repo):
        """Test batch movement with some failures."""
        # Create some source files (not all)
        file1 = temp_git_repo / "file1.txt"
        file1.write_text("content 1")
        file3 = temp_git_repo / "file3.txt"
        file3.write_text("content 3")
        
        # Add to git
        subprocess.run(
            ["git", "add", "."],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add test files"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        # Create batch movements (file2.txt doesn't exist)
        movements = [
            FileMovement(source=Path("file1.txt"), destination=Path("moved/file1.txt")),
            FileMovement(source=Path("file2.txt"), destination=Path("moved/file2.txt")),
            FileMovement(source=Path("file3.txt"), destination=Path("moved/file3.txt")),
        ]
        
        # Execute batch
        result = file_mover.move_batch(movements)
        
        assert result.total_files == 3
        assert result.successful == 2
        assert result.failed == 1
        assert result.skipped == 0
        assert 0 < result.success_rate < 100
        assert len(result.errors) == 1
    
    def test_move_batch_skips_already_processed(self, file_mover, temp_git_repo):
        """Test that batch movement skips already processed files."""
        # Create source file
        source = temp_git_repo / "file.txt"
        source.write_text("content")
        
        # Create movement with non-pending status
        movements = [
            FileMovement(
                source=Path("file.txt"),
                destination=Path("moved/file.txt"),
                status=MovementStatus.SUCCESS  # Already processed
            )
        ]
        
        # Execute batch
        result = file_mover.move_batch(movements)
        
        assert result.total_files == 1
        assert result.successful == 0
        assert result.failed == 0
        assert result.skipped == 1
    
    def test_move_batch_empty_list(self, file_mover):
        """Test batch movement with empty list."""
        result = file_mover.move_batch([])
        
        assert result.total_files == 0
        assert result.successful == 0
        assert result.failed == 0
        assert result.skipped == 0
        assert result.success_rate == 0.0


class TestMovementVerification:
    """Test movement verification functionality."""
    
    def test_verify_movements_all_success(self, file_mover, temp_git_repo):
        """Test verification with all successful movements."""
        # Create and move files
        for i in range(3):
            source = temp_git_repo / f"file{i}.txt"
            source.write_text(f"content {i}")
        
        subprocess.run(
            ["git", "add", "."],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add files"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        for i in range(3):
            file_mover.move_file(
                Path(f"file{i}.txt"),
                Path("moved") / f"file{i}.txt"
            )
        
        # Verify movements
        errors = file_mover.verify_movements()
        
        assert len(errors) == 0
    
    def test_verify_movements_with_failures(self, file_mover, temp_git_repo):
        """Test verification detects failed movements."""
        # Try to move non-existent file
        file_mover.move_file(Path("nonexistent.txt"), Path("dest.txt"))
        
        # Verify movements
        errors = file_mover.verify_movements()
        
        assert len(errors) == 1
        assert errors[0].source == Path("nonexistent.txt")
        assert errors[0].destination == Path("dest.txt")
        assert "does not exist" in errors[0].error_message
    
    def test_verify_movements_detects_missing_destination(self, file_mover, temp_git_repo):
        """Test verification detects when destination doesn't exist after move."""
        # Create source file
        source = temp_git_repo / "file.txt"
        source.write_text("content")
        
        subprocess.run(
            ["git", "add", "."],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add file"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        # Move file
        dest = Path("moved/file.txt")
        file_mover.move_file(Path("file.txt"), dest)
        
        # Manually delete destination to simulate corruption
        (temp_git_repo / dest).unlink()
        
        # Verify movements
        errors = file_mover.verify_movements()
        
        assert len(errors) == 1
        assert "does not exist after movement" in errors[0].error_message


class TestMovementHistory:
    """Test movement history tracking."""
    
    def test_get_movement_history(self, file_mover, temp_git_repo):
        """Test retrieving movement history."""
        # Create and move files
        for i in range(3):
            source = temp_git_repo / f"file{i}.txt"
            source.write_text(f"content {i}")
        
        subprocess.run(
            ["git", "add", "."],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add files"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        for i in range(3):
            file_mover.move_file(
                Path(f"file{i}.txt"),
                Path("moved") / f"file{i}.txt"
            )
        
        history = file_mover.get_movement_history()
        
        assert len(history) == 3
        assert all(isinstance(m, FileMovement) for m in history)
        assert all(m.status == MovementStatus.SUCCESS for m in history)
    
    def test_get_path_mapping(self, file_mover, temp_git_repo):
        """Test getting path mapping for successful movements."""
        # Create and move files
        for i in range(2):
            source = temp_git_repo / f"file{i}.txt"
            source.write_text(f"content {i}")
        
        subprocess.run(
            ["git", "add", "."],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add files"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        file_mover.move_file(Path("file0.txt"), Path("moved/file0.txt"))
        file_mover.move_file(Path("nonexistent.txt"), Path("moved/file1.txt"))  # This will fail
        
        mapping = file_mover.get_path_mapping()
        
        # Only successful movement should be in mapping
        assert len(mapping) == 1
        assert Path("file0.txt") in mapping
        assert mapping[Path("file0.txt")] == Path("moved/file0.txt")
    
    def test_get_statistics(self, file_mover, temp_git_repo):
        """Test getting movement statistics."""
        # Create some files
        for i in range(2):
            source = temp_git_repo / f"file{i}.txt"
            source.write_text(f"content {i}")
        
        subprocess.run(
            ["git", "add", "."],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Add files"],
            cwd=temp_git_repo,
            capture_output=True,
            check=True
        )
        
        # One successful, one failed
        file_mover.move_file(Path("file0.txt"), Path("moved/file0.txt"))
        file_mover.move_file(Path("nonexistent.txt"), Path("moved/file1.txt"))
        
        stats = file_mover.get_statistics()
        
        assert stats["total"] == 2
        assert stats["successful"] == 1
        assert stats["failed"] == 1
        assert stats["pending"] == 0
        assert stats["skipped"] == 0


class TestPathResolution:
    """Test path resolution functionality."""
    
    def test_resolve_relative_path(self, file_mover, temp_git_repo):
        """Test resolving relative paths."""
        relative = Path("subdir/file.txt")
        resolved = file_mover._resolve_path(relative)
        
        assert resolved.is_absolute()
        assert resolved == (temp_git_repo / relative).resolve()
    
    def test_resolve_absolute_path(self, file_mover, temp_git_repo):
        """Test resolving absolute paths."""
        absolute = temp_git_repo / "file.txt"
        resolved = file_mover._resolve_path(absolute)
        
        assert resolved.is_absolute()
        assert resolved == absolute


class TestBatchResultProperties:
    """Test BatchResult properties and calculations."""
    
    def test_success_rate_calculation(self):
        """Test success rate calculation."""
        result = BatchResult(
            total_files=10,
            successful=8,
            failed=2,
            skipped=0,
            movements=[]
        )
        
        assert result.success_rate == 80.0
    
    def test_success_rate_zero_files(self):
        """Test success rate with zero files."""
        result = BatchResult(
            total_files=0,
            successful=0,
            failed=0,
            skipped=0,
            movements=[]
        )
        
        assert result.success_rate == 0.0
    
    def test_success_rate_all_failed(self):
        """Test success rate with all failures."""
        result = BatchResult(
            total_files=5,
            successful=0,
            failed=5,
            skipped=0,
            movements=[]
        )
        
        assert result.success_rate == 0.0
    
    def test_success_rate_all_success(self):
        """Test success rate with all successes."""
        result = BatchResult(
            total_files=5,
            successful=5,
            failed=0,
            skipped=0,
            movements=[]
        )
        
        assert result.success_rate == 100.0
