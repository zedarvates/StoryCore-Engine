"""
File Mover Module

This module provides the FileMover class for moving files while preserving Git history.
It handles git mv command execution, batch movements, and movement verification.

Requirements: 12.1, 12.2, 12.5
"""

import subprocess
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class MovementStatus(Enum):
    """Status of a file movement operation"""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class FileMovement:
    """Represents a single file movement"""
    source: Path
    destination: Path
    category: str = "unknown"
    preserve_history: bool = True
    dependencies: List[Path] = field(default_factory=list)
    status: MovementStatus = MovementStatus.PENDING
    error_message: Optional[str] = None


@dataclass
class BatchResult:
    """Result of a batch file movement operation"""
    total_files: int
    successful: int
    failed: int
    skipped: int
    movements: List[FileMovement]
    errors: List[str] = field(default_factory=list)
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage"""
        if self.total_files == 0:
            return 0.0
        return (self.successful / self.total_files) * 100


@dataclass
class MovementError:
    """Represents an error during file movement"""
    source: Path
    destination: Path
    error_message: str
    command: Optional[str] = None


class FileMover:
    """
    Handles file movements while preserving Git history.
    
    This class provides functionality to:
    - Move individual files using git mv
    - Execute batch file movements efficiently
    - Track all file movements for path update phase
    - Verify movements succeeded before proceeding
    
    Requirements: 12.1, 12.2, 12.5
    """
    
    def __init__(self, project_root: Path, dry_run: bool = False):
        """
        Initialize FileMover.
        
        Args:
            project_root: Root directory of the project
            dry_run: If True, simulate movements without executing them
        """
        self.project_root = Path(project_root).resolve()
        self.dry_run = dry_run
        self.movement_history: List[FileMovement] = []
        self._verify_git_repository()
    
    def _verify_git_repository(self) -> None:
        """
        Verify that the project root is a Git repository.
        
        Raises:
            RuntimeError: If not a Git repository
        """
        git_dir = self.project_root / ".git"
        if not git_dir.exists():
            raise RuntimeError(
                f"Project root {self.project_root} is not a Git repository. "
                "Git history preservation requires a Git repository."
            )
    
    def move_file(self, source: Path, destination: Path, 
                  preserve_history: bool = True) -> bool:
        """
        Move a single file using git mv to preserve history.
        
        Args:
            source: Source file path (relative to project root)
            destination: Destination file path (relative to project root)
            preserve_history: If True, use git mv; otherwise use regular move
        
        Returns:
            True if movement succeeded, False otherwise
        
        Requirements: 12.1, 12.5
        """
        # Convert to absolute paths
        source_abs = self._resolve_path(source)
        dest_abs = self._resolve_path(destination)
        
        # Validate source exists
        if not source_abs.exists():
            error_msg = f"Source file does not exist: {source_abs}"
            self._record_movement(source, destination, MovementStatus.FAILED, error_msg)
            return False
        
        # Check if destination already exists
        if dest_abs.exists():
            error_msg = f"Destination already exists: {dest_abs}"
            self._record_movement(source, destination, MovementStatus.FAILED, error_msg)
            return False
        
        # Create destination directory if needed
        dest_abs.parent.mkdir(parents=True, exist_ok=True)
        
        # Execute movement
        if self.dry_run:
            print(f"[DRY RUN] Would move: {source} -> {destination}")
            self._record_movement(source, destination, MovementStatus.SUCCESS)
            return True
        
        try:
            if preserve_history:
                # Use git mv to preserve history
                result = self._execute_git_mv(source_abs, dest_abs)
                if result:
                    self._record_movement(source, destination, MovementStatus.SUCCESS)
                    return True
                else:
                    error_msg = "git mv command failed"
                    self._record_movement(source, destination, MovementStatus.FAILED, error_msg)
                    return False
            else:
                # Use regular file move
                import shutil
                shutil.move(str(source_abs), str(dest_abs))
                self._record_movement(source, destination, MovementStatus.SUCCESS)
                return True
                
        except Exception as e:
            error_msg = f"Failed to move file: {str(e)}"
            self._record_movement(source, destination, MovementStatus.FAILED, error_msg)
            return False
    
    def _execute_git_mv(self, source: Path, destination: Path) -> bool:
        """
        Execute git mv command with error handling.
        
        Args:
            source: Absolute source path
            destination: Absolute destination path
        
        Returns:
            True if command succeeded, False otherwise
        
        Requirements: 12.1
        """
        try:
            # Make paths relative to project root for git command
            source_rel = source.relative_to(self.project_root)
            dest_rel = destination.relative_to(self.project_root)
            
            # Execute git mv command
            result = subprocess.run(
                ["git", "mv", str(source_rel), str(dest_rel)],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                return True
            else:
                print(f"git mv failed: {result.stderr}")
                return False
                
        except subprocess.SubprocessError as e:
            print(f"Error executing git mv: {str(e)}")
            return False
        except ValueError as e:
            print(f"Path error: {str(e)}")
            return False
    
    def move_batch(self, movements: List[FileMovement]) -> BatchResult:
        """
        Move multiple files in batch with error handling.
        
        Args:
            movements: List of FileMovement objects to execute
        
        Returns:
            BatchResult with statistics and status of each movement
        
        Requirements: 12.1, 12.2
        """
        total = len(movements)
        successful = 0
        failed = 0
        skipped = 0
        errors = []
        
        for movement in movements:
            # Skip if already processed
            if movement.status != MovementStatus.PENDING:
                skipped += 1
                continue
            
            # Execute movement
            success = self.move_file(
                movement.source,
                movement.destination,
                movement.preserve_history
            )
            
            if success:
                successful += 1
                movement.status = MovementStatus.SUCCESS
            else:
                failed += 1
                movement.status = MovementStatus.FAILED
                errors.append(
                    f"Failed to move {movement.source} to {movement.destination}"
                )
        
        return BatchResult(
            total_files=total,
            successful=successful,
            failed=failed,
            skipped=skipped,
            movements=movements,
            errors=errors
        )
    
    def verify_movements(self) -> List[MovementError]:
        """
        Verify that all recorded file movements succeeded.
        
        Returns:
            List of MovementError objects for failed movements
        
        Requirements: 12.5
        """
        errors = []
        
        for movement in self.movement_history:
            if movement.status == MovementStatus.FAILED:
                errors.append(MovementError(
                    source=movement.source,
                    destination=movement.destination,
                    error_message=movement.error_message or "Unknown error"
                ))
            elif movement.status == MovementStatus.SUCCESS and not self.dry_run:
                # Verify destination exists
                dest_abs = self._resolve_path(movement.destination)
                if not dest_abs.exists():
                    errors.append(MovementError(
                        source=movement.source,
                        destination=movement.destination,
                        error_message="Destination file does not exist after movement"
                    ))
        
        return errors
    
    def get_movement_history(self) -> List[FileMovement]:
        """
        Get the complete history of file movements.
        
        Returns:
            List of all FileMovement objects
        """
        return self.movement_history.copy()
    
    def get_path_mapping(self) -> Dict[Path, Path]:
        """
        Get a mapping of old paths to new paths for successful movements.
        
        Returns:
            Dictionary mapping source paths to destination paths
        """
        mapping = {}
        for movement in self.movement_history:
            if movement.status == MovementStatus.SUCCESS:
                mapping[movement.source] = movement.destination
        return mapping
    
    def _resolve_path(self, path: Path) -> Path:
        """
        Resolve a path relative to project root.
        
        Args:
            path: Path to resolve (can be relative or absolute)
        
        Returns:
            Absolute path
        """
        if path.is_absolute():
            return path
        return (self.project_root / path).resolve()
    
    def _record_movement(self, source: Path, destination: Path, 
                        status: MovementStatus, error_message: Optional[str] = None) -> None:
        """
        Record a file movement in the history.
        
        Args:
            source: Source path
            destination: Destination path
            status: Movement status
            error_message: Optional error message if failed
        """
        movement = FileMovement(
            source=source,
            destination=destination,
            status=status,
            error_message=error_message
        )
        self.movement_history.append(movement)
    
    def get_statistics(self) -> Dict[str, int]:
        """
        Get statistics about file movements.
        
        Returns:
            Dictionary with counts of successful, failed, and pending movements
        """
        stats = {
            "total": len(self.movement_history),
            "successful": 0,
            "failed": 0,
            "pending": 0,
            "skipped": 0
        }
        
        for movement in self.movement_history:
            if movement.status == MovementStatus.SUCCESS:
                stats["successful"] += 1
            elif movement.status == MovementStatus.FAILED:
                stats["failed"] += 1
            elif movement.status == MovementStatus.PENDING:
                stats["pending"] += 1
            elif movement.status == MovementStatus.SKIPPED:
                stats["skipped"] += 1
        
        return stats
