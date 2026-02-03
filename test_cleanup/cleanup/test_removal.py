"""
Test removal functionality.

This module provides functions to safely remove obsolete tests with proper
logging and error handling.
"""

from pathlib import Path
from typing import List, Optional
from datetime import datetime
import os
import shutil
from test_cleanup.models import CleanupAction, CleanupLog, TestMetrics


def safe_remove_test_file(test_file: Path, reason: str) -> tuple[bool, Optional[str]]:
    """
    Safely remove a test file with error handling.
    
    Args:
        test_file: Path to the test file to remove
        reason: Reason for removal
        
    Returns:
        Tuple of (success: bool, error_message: Optional[str])
        
    Requirements: 2.3
    """
    try:
        if not test_file.exists():
            return False, f"File does not exist: {test_file}"
        
        # Check if we have permission to delete
        if not os.access(test_file, os.W_OK):
            return False, f"No write permission for file: {test_file}"
        
        # Remove the file
        test_file.unlink()
        return True, None
        
    except PermissionError as e:
        return False, f"Permission denied: {str(e)}"
    except OSError as e:
        return False, f"OS error: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"


def create_removal_log_entry(
    test_name: str,
    reason: str,
    before_metrics: Optional[TestMetrics] = None
) -> CleanupAction:
    """
    Create a log entry for a test removal action.
    
    Args:
        test_name: Name of the test being removed
        reason: Reason for removal
        before_metrics: Optional metrics before removal
        
    Returns:
        CleanupAction object documenting the removal
        
    Requirements: 2.3, 2.5
    """
    return CleanupAction(
        action_type="remove",
        test_name=test_name,
        reason=reason,
        timestamp=datetime.now(),
        before_metrics=before_metrics,
        after_metrics=None
    )


def remove_obsolete_test(
    test_file: Path,
    reason: str,
    cleanup_log: CleanupLog,
    before_metrics: Optional[TestMetrics] = None,
    dry_run: bool = False
) -> bool:
    """
    Remove an obsolete test and log the action.
    
    Args:
        test_file: Path to the test file to remove
        reason: Reason for removal
        cleanup_log: CleanupLog to record the action
        before_metrics: Optional metrics before removal
        dry_run: If True, don't actually remove the file
        
    Returns:
        True if removal was successful (or would be in dry run), False otherwise
        
    Requirements: 2.3, 2.5
    """
    test_name = test_file.name
    
    if dry_run:
        # In dry run mode, just log what would happen
        action = create_removal_log_entry(test_name, f"[DRY RUN] {reason}", before_metrics)
        cleanup_log.actions.append(action)
        return True
    
    # Attempt to remove the file
    success, error_msg = safe_remove_test_file(test_file, reason)
    
    if success:
        # Log successful removal
        action = create_removal_log_entry(test_name, reason, before_metrics)
        cleanup_log.actions.append(action)
        cleanup_log.total_removed += 1
        return True
    else:
        # Log failed removal attempt
        action = create_removal_log_entry(
            test_name,
            f"FAILED: {reason}. Error: {error_msg}",
            before_metrics
        )
        cleanup_log.actions.append(action)
        return False


def remove_obsolete_tests_batch(
    test_files: List[Path],
    reasons: dict,
    cleanup_log: CleanupLog,
    test_metrics: Optional[dict] = None,
    dry_run: bool = False
) -> dict:
    """
    Remove multiple obsolete tests in batch.
    
    Args:
        test_files: List of test file paths to remove
        reasons: Dictionary mapping test file paths to removal reasons
        cleanup_log: CleanupLog to record actions
        test_metrics: Optional dictionary of test metrics
        dry_run: If True, don't actually remove files
        
    Returns:
        Dictionary with success/failure counts and details
        
    Requirements: 2.3, 2.5
    """
    results = {
        'successful': [],
        'failed': [],
        'total_attempted': len(test_files),
        'success_count': 0,
        'failure_count': 0
    }
    
    for test_file in test_files:
        test_name = test_file.name
        reason = reasons.get(str(test_file), "Obsolete test")
        
        # Get metrics if available
        before_metrics = None
        if test_metrics and test_name in test_metrics:
            before_metrics = test_metrics[test_name]
        
        # Attempt removal
        success = remove_obsolete_test(
            test_file,
            reason,
            cleanup_log,
            before_metrics,
            dry_run
        )
        
        if success:
            results['successful'].append(str(test_file))
            results['success_count'] += 1
        else:
            results['failed'].append(str(test_file))
            results['failure_count'] += 1
    
    return results


def create_backup(test_file: Path, backup_dir: Path) -> Optional[Path]:
    """
    Create a backup of a test file before removal.
    
    Args:
        test_file: Path to the test file to backup
        backup_dir: Directory to store backups
        
    Returns:
        Path to the backup file, or None if backup failed
    """
    try:
        # Create backup directory if it doesn't exist
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{test_file.stem}_{timestamp}{test_file.suffix}"
        backup_path = backup_dir / backup_name
        
        # Copy the file
        shutil.copy2(test_file, backup_path)
        return backup_path
        
    except Exception as e:
        print(f"Warning: Failed to create backup for {test_file}: {e}")
        return None


def remove_with_backup(
    test_file: Path,
    reason: str,
    cleanup_log: CleanupLog,
    backup_dir: Path,
    before_metrics: Optional[TestMetrics] = None
) -> bool:
    """
    Remove a test file after creating a backup.
    
    Args:
        test_file: Path to the test file to remove
        reason: Reason for removal
        cleanup_log: CleanupLog to record the action
        backup_dir: Directory to store backups
        before_metrics: Optional metrics before removal
        
    Returns:
        True if removal was successful, False otherwise
        
    Requirements: 2.3, 2.5
    """
    # Create backup first
    backup_path = create_backup(test_file, backup_dir)
    
    if backup_path:
        reason_with_backup = f"{reason} (Backup: {backup_path})"
    else:
        reason_with_backup = f"{reason} (Warning: Backup failed)"
    
    # Proceed with removal
    return remove_obsolete_test(
        test_file,
        reason_with_backup,
        cleanup_log,
        before_metrics,
        dry_run=False
    )
