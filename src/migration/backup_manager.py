"""
Backup Manager for Project Structure Reorganization

This module provides comprehensive backup and restoration capabilities for the
migration process, ensuring safe rollback in case of issues.
"""

import tarfile
import hashlib
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict
from dataclasses import dataclass, asdict


@dataclass
class BackupInfo:
    """Information about a backup archive"""
    backup_path: Path
    timestamp: str
    project_root: Path
    size_bytes: int
    checksum: str
    file_count: int
    created_at: datetime
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['backup_path'] = str(self.backup_path)
        data['project_root'] = str(self.project_root)
        data['created_at'] = self.created_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'BackupInfo':
        """Create from dictionary"""
        data['backup_path'] = Path(data['backup_path'])
        data['project_root'] = Path(data['project_root'])
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)


class BackupManager:
    """
    Manages backup creation, verification, and restoration for project migration.
    
    Provides timestamped backup archives with integrity verification using checksums.
    Supports rollback to previous project states.
    """
    
    def __init__(self, backup_dir: Optional[Path] = None):
        """
        Initialize BackupManager.
        
        Args:
            backup_dir: Directory to store backups. Defaults to ~/.storycore-backups
        """
        if backup_dir is None:
            backup_dir = Path.home() / '.storycore-backups'
        
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.backup_dir / 'backups.json'
        
    def create_backup(self, project_root: Path) -> BackupInfo:
        """
        Create a timestamped backup archive of the project.
        
        Args:
            project_root: Root directory of the project to backup
            
        Returns:
            BackupInfo object containing backup metadata
            
        Raises:
            FileNotFoundError: If project_root doesn't exist
            PermissionError: If unable to create backup
        """
        project_root = Path(project_root).resolve()
        
        if not project_root.exists():
            raise FileNotFoundError(f"Project root does not exist: {project_root}")
        
        # Generate timestamp for backup
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_name = project_root.name
        backup_filename = f"{project_name}_backup_{timestamp}.tar.gz"
        backup_path = self.backup_dir / backup_filename
        
        print(f"Creating backup: {backup_filename}")
        print(f"Source: {project_root}")
        print(f"Destination: {backup_path}")
        
        # Create tar.gz archive
        file_count = 0
        try:
            with tarfile.open(backup_path, "w:gz") as tar:
                # Add all files from project root
                for item in project_root.rglob('*'):
                    if item.is_file():
                        # Calculate relative path for archive
                        arcname = item.relative_to(project_root.parent)
                        tar.add(item, arcname=arcname)
                        file_count += 1
                        
                        if file_count % 100 == 0:
                            print(f"  Backed up {file_count} files...")
        
        except Exception as e:
            # Clean up partial backup on failure
            if backup_path.exists():
                backup_path.unlink()
            raise RuntimeError(f"Failed to create backup: {e}") from e
        
        print(f"  Total files backed up: {file_count}")
        
        # Calculate checksum
        checksum = self._calculate_checksum(backup_path)
        size_bytes = backup_path.stat().st_size
        
        # Create backup info
        backup_info = BackupInfo(
            backup_path=backup_path,
            timestamp=timestamp,
            project_root=project_root,
            size_bytes=size_bytes,
            checksum=checksum,
            file_count=file_count,
            created_at=datetime.now()
        )
        
        # Save metadata
        self._save_backup_metadata(backup_info)
        
        print(f"Backup created successfully: {backup_path}")
        print(f"Size: {size_bytes / (1024*1024):.2f} MB")
        print(f"Checksum: {checksum}")
        
        return backup_info
    
    def verify_backup(self, backup_path: Path) -> bool:
        """
        Verify the integrity of a backup archive using checksums.
        
        Args:
            backup_path: Path to the backup archive
            
        Returns:
            True if backup is valid, False otherwise
        """
        backup_path = Path(backup_path)
        
        if not backup_path.exists():
            print(f"ERROR: Backup file does not exist: {backup_path}")
            return False
        
        # Load metadata
        metadata = self._load_backup_metadata()
        backup_info = None
        
        for info_dict in metadata:
            info = BackupInfo.from_dict(info_dict)
            if info.backup_path == backup_path:
                backup_info = info
                break
        
        if backup_info is None:
            print(f"WARNING: No metadata found for backup: {backup_path}")
            print("Performing basic integrity check...")
            
            # Try to open the archive
            try:
                with tarfile.open(backup_path, "r:gz") as tar:
                    # Verify we can list members
                    members = tar.getmembers()
                    print(f"Archive contains {len(members)} entries")
                    return True
            except Exception as e:
                print(f"ERROR: Archive is corrupted: {e}")
                return False
        
        # Verify checksum
        print(f"Verifying backup: {backup_path.name}")
        current_checksum = self._calculate_checksum(backup_path)
        
        if current_checksum != backup_info.checksum:
            print(f"ERROR: Checksum mismatch!")
            print(f"  Expected: {backup_info.checksum}")
            print(f"  Actual:   {current_checksum}")
            return False
        
        # Verify archive can be opened
        try:
            with tarfile.open(backup_path, "r:gz") as tar:
                members = tar.getmembers()
                if len(members) != backup_info.file_count:
                    print(f"WARNING: File count mismatch")
                    print(f"  Expected: {backup_info.file_count}")
                    print(f"  Actual:   {len(members)}")
        except Exception as e:
            print(f"ERROR: Cannot open archive: {e}")
            return False
        
        print("Backup verification successful!")
        return True
    
    def restore_backup(self, backup_path: Path, target: Optional[Path] = None) -> bool:
        """
        Restore a project from a backup archive.
        
        Args:
            backup_path: Path to the backup archive
            target: Target directory for restoration. If None, restores to original location.
            
        Returns:
            True if restoration successful, False otherwise
        """
        backup_path = Path(backup_path)
        
        if not backup_path.exists():
            print(f"ERROR: Backup file does not exist: {backup_path}")
            return False
        
        # Verify backup before restoring
        if not self.verify_backup(backup_path):
            print("ERROR: Backup verification failed. Aborting restoration.")
            return False
        
        # Determine target directory
        if target is None:
            # Load metadata to get original location
            metadata = self._load_backup_metadata()
            for info_dict in metadata:
                info = BackupInfo.from_dict(info_dict)
                if info.backup_path == backup_path:
                    target = info.project_root
                    break
            
            if target is None:
                print("ERROR: Cannot determine original project location")
                return False
        
        target = Path(target).resolve()
        
        print(f"Restoring backup to: {target}")
        print(f"WARNING: This will overwrite existing files!")
        
        # Create target directory if it doesn't exist
        target.parent.mkdir(parents=True, exist_ok=True)
        
        # Extract archive
        try:
            with tarfile.open(backup_path, "r:gz") as tar:
                # Extract to parent directory (archive contains project folder)
                tar.extractall(target.parent)
                print(f"Restoration complete: {target}")
                return True
        
        except Exception as e:
            print(f"ERROR: Restoration failed: {e}")
            return False
    
    def list_backups(self) -> List[BackupInfo]:
        """
        List all available backups.
        
        Returns:
            List of BackupInfo objects
        """
        metadata = self._load_backup_metadata()
        backups = []
        
        for info_dict in metadata:
            try:
                info = BackupInfo.from_dict(info_dict)
                # Only include if backup file still exists
                if info.backup_path.exists():
                    backups.append(info)
            except Exception as e:
                print(f"WARNING: Failed to load backup info: {e}")
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x.created_at, reverse=True)
        
        return backups
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """
        Calculate SHA256 checksum of a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Hexadecimal checksum string
        """
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            # Read in chunks to handle large files
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()
    
    def _save_backup_metadata(self, backup_info: BackupInfo):
        """Save backup metadata to JSON file"""
        metadata = self._load_backup_metadata()
        metadata.append(backup_info.to_dict())
        
        with open(self.metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def _load_backup_metadata(self) -> List[Dict]:
        """Load backup metadata from JSON file"""
        if not self.metadata_file.exists():
            return []
        
        try:
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"WARNING: Failed to load backup metadata: {e}")
            return []
