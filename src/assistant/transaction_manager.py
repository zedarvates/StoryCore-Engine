"""
Transaction Manager for atomic project operations.

Provides transaction support for file operations to ensure data integrity
on errors. Operations can be rolled back if an error occurs during a
transaction.
"""

from pathlib import Path
from typing import List, Optional, Protocol
from abc import ABC, abstractmethod
import shutil
import json

from .logging_config import get_logger

logger = get_logger(__name__)


class Operation(ABC):
    """Base class for reversible operations."""
    
    @abstractmethod
    def undo(self) -> None:
        """Undo this operation."""
        pass


class FileWriteOperation(Operation):
    """Operation for writing a file."""
    
    def __init__(self, path: Path, backup_path: Optional[Path] = None):
        """
        Initialize file write operation.
        
        Args:
            path: Path to the file that was written
            backup_path: Path to backup of original file (if it existed)
        """
        self.path = path
        self.backup_path = backup_path
    
    def undo(self) -> None:
        """Undo file write by restoring backup or deleting file."""
        try:
            if self.backup_path and self.backup_path.exists():
                # Restore from backup
                shutil.copy2(self.backup_path, self.path)
                self.backup_path.unlink()
                logger.info(f"Restored file from backup: {self.path}")
            elif self.path.exists():
                # Delete newly created file
                self.path.unlink()
                logger.info(f"Deleted file: {self.path}")
        except Exception as e:
            logger.error(f"Failed to undo file write operation for {self.path}: {e}")


class FileDeleteOperation(Operation):
    """Operation for deleting a file."""
    
    def __init__(self, path: Path, backup_path: Path):
        """
        Initialize file delete operation.
        
        Args:
            path: Path to the file that was deleted
            backup_path: Path to backup of deleted file
        """
        self.path = path
        self.backup_path = backup_path
    
    def undo(self) -> None:
        """Undo file deletion by restoring from backup."""
        try:
            if self.backup_path.exists():
                shutil.copy2(self.backup_path, self.path)
                self.backup_path.unlink()
                logger.info(f"Restored deleted file: {self.path}")
        except Exception as e:
            logger.error(f"Failed to undo file delete operation for {self.path}: {e}")


class DirectoryCreateOperation(Operation):
    """Operation for creating a directory."""
    
    def __init__(self, path: Path):
        """
        Initialize directory create operation.
        
        Args:
            path: Path to the directory that was created
        """
        self.path = path
    
    def undo(self) -> None:
        """Undo directory creation by removing it."""
        try:
            if self.path.exists() and self.path.is_dir():
                # Only remove if empty
                if not any(self.path.iterdir()):
                    self.path.rmdir()
                    logger.info(f"Removed directory: {self.path}")
                else:
                    logger.warning(f"Cannot remove non-empty directory: {self.path}")
        except Exception as e:
            logger.error(f"Failed to undo directory create operation for {self.path}: {e}")


class TransactionManager:
    """
    Manage atomic project operations with rollback support.
    
    Provides transaction support for file operations to ensure data integrity.
    If an error occurs during a transaction, all operations can be rolled back.
    """
    
    def __init__(self, backup_dir: Optional[Path] = None):
        """
        Initialize transaction manager.
        
        Args:
            backup_dir: Directory for storing transaction backups (optional)
        """
        self.transaction_log: List[Operation] = []
        self.in_transaction = False
        self.backup_dir = backup_dir
        
        if self.backup_dir:
            self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def begin_transaction(self) -> None:
        """
        Start a new transaction.
        
        Clears any existing transaction log and marks transaction as active.
        """
        if self.in_transaction:
            logger.warning("Transaction already in progress, clearing previous log")
        
        self.transaction_log = []
        self.in_transaction = True
        logger.info("Transaction started")
    
    def record_operation(self, operation: Operation) -> None:
        """
        Record an operation for potential rollback.
        
        Args:
            operation: Operation to record
        """
        if not self.in_transaction:
            logger.warning("Recording operation outside of transaction")
        
        self.transaction_log.append(operation)
        logger.debug(f"Recorded operation: {type(operation).__name__}")
    
    def commit(self) -> None:
        """
        Commit transaction and clear log.
        
        Marks the transaction as successful and clears the operation log.
        Backup files are cleaned up.
        """
        if not self.in_transaction:
            logger.warning("No transaction to commit")
            return
        
        # Clean up backup files
        for operation in self.transaction_log:
            if isinstance(operation, (FileWriteOperation, FileDeleteOperation)):
                if hasattr(operation, 'backup_path') and operation.backup_path:
                    if operation.backup_path.exists():
                        operation.backup_path.unlink()
        
        self.transaction_log = []
        self.in_transaction = False
        logger.info("Transaction committed")
    
    def rollback(self) -> None:
        """
        Rollback all operations in reverse order.
        
        Undoes all recorded operations to restore the previous state.
        """
        if not self.in_transaction:
            logger.warning("No transaction to rollback")
            return
        
        logger.info(f"Rolling back {len(self.transaction_log)} operations")
        
        # Undo operations in reverse order
        for operation in reversed(self.transaction_log):
            try:
                operation.undo()
            except Exception as e:
                logger.error(f"Error during rollback of {type(operation).__name__}: {e}")
        
        self.transaction_log = []
        self.in_transaction = False
        logger.info("Transaction rolled back")
    
    def create_backup(self, path: Path) -> Optional[Path]:
        """
        Create a backup of a file before modifying it.
        
        Args:
            path: Path to file to backup
            
        Returns:
            Path to backup file, or None if file doesn't exist
        """
        if not path.exists():
            return None
        
        if not self.backup_dir:
            # Create temporary backup in same directory
            backup_path = path.parent / f".{path.name}.backup"
        else:
            # Create backup in backup directory
            backup_path = self.backup_dir / f"{path.name}.backup"
        
        try:
            shutil.copy2(path, backup_path)
            logger.debug(f"Created backup: {backup_path}")
            return backup_path
        except Exception as e:
            logger.error(f"Failed to create backup of {path}: {e}")
            return None
