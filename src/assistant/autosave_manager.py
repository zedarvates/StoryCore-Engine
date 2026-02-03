"""
Auto-save manager for StoryCore AI Assistant.

Manages automatic project saving with rolling backups and event-triggered saves.
"""

import threading
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .project_manager import ProjectManager

from .logging_config import get_logger

logger = get_logger(__name__)


class AutoSaveManager:
    """
    Manage automatic project saving.
    
    Provides background auto-save with configurable intervals, rolling backups,
    and event-triggered saves for significant changes.
    """
    
    def __init__(self, save_interval_seconds: int = 300, backup_count: int = 3):
        """
        Initialize auto-save manager.
        
        Args:
            save_interval_seconds: Interval between auto-saves (default: 300 = 5 minutes)
            backup_count: Number of backups to keep (default: 3)
        """
        self.save_interval = save_interval_seconds
        self.backup_count = backup_count
        self.last_save_time: Optional[float] = None
        self.save_thread: Optional[threading.Thread] = None
        self.running = False
        self.project_manager: Optional['ProjectManager'] = None
        self._lock = threading.Lock()
        
        logger.info(f"AutoSaveManager initialized (interval: {save_interval_seconds}s, backups: {backup_count})")
    
    def start(self, project_manager: 'ProjectManager') -> None:
        """
        Start auto-save background thread.
        
        Args:
            project_manager: ProjectManager instance to auto-save
        """
        with self._lock:
            if self.running:
                logger.warning("Auto-save already running")
                return
            
            self.project_manager = project_manager
            self.running = True
            self.save_thread = threading.Thread(
                target=self._auto_save_loop,
                daemon=True,
                name="AutoSaveThread"
            )
            self.save_thread.start()
            
            logger.info("Auto-save started")
    
    def stop(self) -> None:
        """Stop auto-save background thread."""
        with self._lock:
            if not self.running:
                logger.warning("Auto-save not running")
                return
            
            self.running = False
        
        # Wait for thread to finish (with timeout)
        if self.save_thread and self.save_thread.is_alive():
            self.save_thread.join(timeout=5)
            
            if self.save_thread.is_alive():
                logger.warning("Auto-save thread did not stop cleanly")
            else:
                logger.info("Auto-save stopped")
        
        self.project_manager = None
        self.save_thread = None
    
    def trigger_save(self) -> bool:
        """
        Trigger an immediate auto-save.
        
        This can be called when significant changes occur (scene added, character modified, etc.)
        
        Returns:
            True if save was successful, False otherwise
        """
        if not self.running or not self.project_manager:
            logger.warning("Cannot trigger save: auto-save not running")
            return False
        
        try:
            return self._perform_auto_save()
        except Exception as e:
            logger.error(f"Triggered auto-save failed: {e}")
            return False
    
    def _auto_save_loop(self) -> None:
        """Background loop for auto-saving."""
        logger.debug("Auto-save loop started")
        
        while self.running:
            try:
                # Sleep in small increments to allow quick shutdown
                for _ in range(self.save_interval):
                    if not self.running:
                        break
                    time.sleep(1)
                
                if not self.running:
                    break
                
                # Perform auto-save
                if self.project_manager and self.project_manager.has_active_project():
                    self._perform_auto_save()
            
            except Exception as e:
                logger.error(f"Auto-save loop error: {e}")
                # Wait 1 minute before retrying after error
                time.sleep(60)
        
        logger.debug("Auto-save loop stopped")
    
    def _perform_auto_save(self) -> bool:
        """
        Perform auto-save with backup rotation.
        
        Returns:
            True if save was successful, False otherwise
        """
        if not self.project_manager:
            return False
        
        project = self.project_manager.get_active_project()
        if not project:
            logger.debug("No active project to auto-save")
            return False
        
        try:
            logger.info(f"Auto-saving project: {project.name}")
            
            # Update modified timestamp
            project.modified_at = datetime.now()
            
            # Create backup before saving
            self._create_backup(project)
            
            # Save project
            self.project_manager.save_project(project)
            
            # Rotate backups
            self._rotate_backups(project)
            
            # Update last save time
            self.last_save_time = time.time()
            
            logger.info(f"Auto-save completed for project: {project.name}")
            return True
        
        except Exception as e:
            logger.error(f"Auto-save failed for project {project.name}: {e}")
            return False
    
    def _create_backup(self, project) -> Optional[Path]:
        """
        Create timestamped backup.
        
        Args:
            project: Project to backup
            
        Returns:
            Path to backup file, or None if backup failed
        """
        try:
            # Create backups directory
            backup_dir = project.path / ".backups"
            backup_dir.mkdir(exist_ok=True)
            
            # Create timestamped backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"backup_{timestamp}.json"
            backup_path = backup_dir / backup_filename
            
            # Convert project to dict and save
            project_data = self.project_manager._project_to_dict(project)
            self.project_manager.file_ops.write_json(backup_path, project_data)
            
            logger.debug(f"Created backup: {backup_path}")
            return backup_path
        
        except Exception as e:
            logger.error(f"Failed to create backup for {project.name}: {e}")
            return None
    
    def _rotate_backups(self, project) -> None:
        """
        Keep only the most recent N backups.
        
        Args:
            project: Project whose backups to rotate
        """
        try:
            backup_dir = project.path / ".backups"
            if not backup_dir.exists():
                return
            
            # Get all backup files sorted by modification time (newest first)
            backups = sorted(
                backup_dir.glob("backup_*.json"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            
            # Delete old backups beyond the limit
            deleted_count = 0
            for backup in backups[self.backup_count:]:
                try:
                    backup.unlink()
                    deleted_count += 1
                    logger.debug(f"Deleted old backup: {backup}")
                except Exception as e:
                    logger.error(f"Failed to delete backup {backup}: {e}")
            
            if deleted_count > 0:
                logger.info(f"Rotated backups: kept {self.backup_count}, deleted {deleted_count}")
        
        except Exception as e:
            logger.error(f"Failed to rotate backups for {project.name}: {e}")
    
    def get_last_save_time(self) -> Optional[datetime]:
        """
        Get the timestamp of the last auto-save.
        
        Returns:
            Datetime of last save, or None if no save has occurred
        """
        if self.last_save_time is None:
            return None
        return datetime.fromtimestamp(self.last_save_time)
    
    def is_running(self) -> bool:
        """
        Check if auto-save is currently running.
        
        Returns:
            True if auto-save is active
        """
        return self.running
    
    def get_backup_count(self, project) -> int:
        """
        Get the number of backups for a project.
        
        Args:
            project: Project to check
            
        Returns:
            Number of backup files
        """
        try:
            backup_dir = project.path / ".backups"
            if not backup_dir.exists():
                return 0
            
            backups = list(backup_dir.glob("backup_*.json"))
            return len(backups)
        
        except Exception as e:
            logger.error(f"Failed to count backups for {project.name}: {e}")
            return 0
