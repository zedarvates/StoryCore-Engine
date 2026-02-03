"""
Rollback functionality for test cleanup operations.

This module provides comprehensive rollback capabilities including
backup creation, restoration, and manual rollback options.
"""

import shutil
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class BackupManager:
    """
    Manages backups for test cleanup operations.
    
    Provides functionality to create, restore, and manage backups
    of test directories before cleanup operations.
    """
    
    def __init__(self, test_dir: Path, backup_dir: Optional[Path] = None):
        """
        Initialize the backup manager.
        
        Args:
            test_dir: Directory containing tests to backup
            backup_dir: Directory for backups (default: parent_dir/test_dir_name_cleanup_backup)
        """
        self.test_dir = Path(test_dir)
        # Place backup outside test_dir to avoid deletion during rollback
        self.backup_dir = Path(backup_dir) if backup_dir else self.test_dir.parent / f"{self.test_dir.name}_cleanup_backup"
        self.metadata_file = self.backup_dir / "backup_metadata.json"
        
    def create_backup(self, description: str = "Pre-cleanup backup") -> Dict[str, Any]:
        """
        Create a backup of the test directory.
        
        Args:
            description: Description of the backup
            
        Returns:
            Dictionary with backup information
            
        Requirements: Error Handling
        """
        try:
            logger.info(f"Creating backup at: {self.backup_dir}")
            
            # Remove old backup if exists
            if self.backup_dir.exists():
                shutil.rmtree(self.backup_dir)
            
            # Create new backup
            shutil.copytree(
                self.test_dir,
                self.backup_dir,
                ignore=shutil.ignore_patterns(
                    "__pycache__",
                    "*.pyc",
                    ".pytest_cache",
                    "node_modules",
                    ".coverage",
                    "coverage",
                    "cleanup_output",
                    "cleanup_backup",
                )
            )
            
            # Create metadata
            metadata = {
                "created_at": datetime.now().isoformat(),
                "description": description,
                "test_dir": str(self.test_dir),
                "backup_dir": str(self.backup_dir),
                "file_count": self._count_files(self.backup_dir),
            }
            
            # Save metadata
            with open(self.metadata_file, "w") as f:
                json.dump(metadata, f, indent=2)
            
            logger.info("Backup created successfully")
            
            return {
                "success": True,
                "backup_dir": str(self.backup_dir),
                "metadata": metadata,
            }
            
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    def restore_backup(self) -> Dict[str, Any]:
        """
        Restore from backup.
        
        Returns:
            Dictionary with restoration results
            
        Requirements: Error Handling
        """
        if not self.backup_dir.exists():
            return {
                "success": False,
                "error": "No backup available for restoration",
            }
        
        try:
            logger.info(f"Restoring from backup: {self.backup_dir}")
            
            # Load metadata
            metadata = self._load_metadata()
            
            # Check if backup is inside test directory
            try:
                self.backup_dir.relative_to(self.test_dir)
                backup_inside_test_dir = True
            except ValueError:
                backup_inside_test_dir = False
            
            if backup_inside_test_dir:
                # Backup is inside test dir, need to move it out first
                temp_backup = self.test_dir.parent / f"temp_backup_{self.test_dir.name}"
                if temp_backup.exists():
                    shutil.rmtree(temp_backup)
                shutil.copytree(self.backup_dir, temp_backup)
                
                # Remove test directory
                shutil.rmtree(self.test_dir)
                
                # Restore from temporary backup
                shutil.copytree(temp_backup, self.test_dir)
                
                # Clean up temporary backup
                shutil.rmtree(temp_backup)
            else:
                # Backup is outside test dir, can restore directly
                if self.test_dir.exists():
                    shutil.rmtree(self.test_dir)
                shutil.copytree(self.backup_dir, self.test_dir)
            
            logger.info("Restoration completed successfully")
            
            return {
                "success": True,
                "restored_from": str(self.backup_dir),
                "metadata": metadata,
            }
            
        except Exception as e:
            logger.error(f"Restoration failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List available backups.
        
        Returns:
            List of backup information dictionaries
        """
        backups = []
        
        if self.backup_dir.exists() and self.metadata_file.exists():
            metadata = self._load_metadata()
            if metadata:
                backups.append(metadata)
        
        return backups
    
    def delete_backup(self) -> bool:
        """
        Delete the backup directory.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if self.backup_dir.exists():
                shutil.rmtree(self.backup_dir)
                logger.info(f"Deleted backup: {self.backup_dir}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete backup: {e}")
            return False
    
    def verify_backup(self) -> Dict[str, Any]:
        """
        Verify backup integrity.
        
        Returns:
            Dictionary with verification results
        """
        if not self.backup_dir.exists():
            return {
                "valid": False,
                "error": "Backup directory does not exist",
            }
        
        try:
            metadata = self._load_metadata()
            if not metadata:
                return {
                    "valid": False,
                    "error": "Backup metadata not found or invalid",
                }
            
            # Count files in backup
            actual_count = self._count_files(self.backup_dir)
            expected_count = metadata.get("file_count", 0)
            
            # Allow some variance due to cache files
            variance = abs(actual_count - expected_count)
            is_valid = variance <= 5  # Allow up to 5 files difference
            
            return {
                "valid": is_valid,
                "metadata": metadata,
                "expected_files": expected_count,
                "actual_files": actual_count,
                "variance": variance,
            }
            
        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
            }
    
    def _load_metadata(self) -> Optional[Dict[str, Any]]:
        """Load backup metadata from file."""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load metadata: {e}")
        return None
    
    def _count_files(self, directory: Path) -> int:
        """Count files in directory recursively."""
        count = 0
        for item in directory.rglob("*"):
            if item.is_file() and item.name != "backup_metadata.json":
                count += 1
        return count


def create_backup_before_cleanup(
    test_dir: Path,
    backup_dir: Optional[Path] = None,
    description: str = "Pre-cleanup backup"
) -> Dict[str, Any]:
    """
    Create a backup before cleanup operations.
    
    Args:
        test_dir: Directory containing tests
        backup_dir: Directory for backup (optional)
        description: Backup description
        
    Returns:
        Dictionary with backup results
        
    Requirements: Error Handling
    """
    manager = BackupManager(test_dir, backup_dir)
    return manager.create_backup(description)


def restore_from_backup(
    test_dir: Path,
    backup_dir: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Restore from backup after failed cleanup.
    
    Args:
        test_dir: Directory to restore to
        backup_dir: Backup directory (optional)
        
    Returns:
        Dictionary with restoration results
        
    Requirements: Error Handling
    """
    manager = BackupManager(test_dir, backup_dir)
    return manager.restore_backup()


def manual_rollback(
    test_dir: Path,
    backup_dir: Optional[Path] = None,
    verify_first: bool = True
) -> Dict[str, Any]:
    """
    Manually trigger a rollback operation.
    
    Args:
        test_dir: Directory to restore to
        backup_dir: Backup directory (optional)
        verify_first: Verify backup before restoring
        
    Returns:
        Dictionary with rollback results
        
    Requirements: Error Handling
    """
    manager = BackupManager(test_dir, backup_dir)
    
    # Verify backup if requested
    if verify_first:
        verification = manager.verify_backup()
        if not verification["valid"]:
            return {
                "success": False,
                "error": f"Backup verification failed: {verification.get('error', 'Unknown error')}",
                "verification": verification,
            }
    
    # Perform restoration
    result = manager.restore_backup()
    
    if result["success"]:
        # Delete backup after successful restoration
        manager.delete_backup()
    
    return result
