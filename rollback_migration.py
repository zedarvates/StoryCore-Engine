#!/usr/bin/env python3
"""
Rollback Script for Project Structure Migration

This script provides an easy way to restore a project from a backup archive
created during the migration process.

Usage:
    python rollback_migration.py                    # Interactive mode
    python rollback_migration.py --backup <path>    # Restore specific backup
    python rollback_migration.py --list             # List available backups
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from migration.backup_manager import BackupManager, BackupInfo


def format_size(size_bytes: int) -> str:
    """Format size in bytes to human-readable string"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def format_datetime(dt: datetime) -> str:
    """Format datetime for display"""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def list_backups(manager: BackupManager):
    """List all available backups"""
    backups = manager.list_backups()
    
    if not backups:
        print("No backups found.")
        return
    
    print("\nAvailable Backups:")
    print("=" * 80)
    
    for i, backup in enumerate(backups, 1):
        print(f"\n{i}. {backup.backup_path.name}")
        print(f"   Created:      {format_datetime(backup.created_at)}")
        print(f"   Project:      {backup.project_root}")
        print(f"   Size:         {format_size(backup.size_bytes)}")
        print(f"   Files:        {backup.file_count}")
        print(f"   Checksum:     {backup.checksum[:16]}...")
        print(f"   Location:     {backup.backup_path}")
    
    print("\n" + "=" * 80)


def interactive_restore(manager: BackupManager):
    """Interactive backup restoration"""
    backups = manager.list_backups()
    
    if not backups:
        print("No backups found.")
        return False
    
    # Display backups
    list_backups(manager)
    
    # Get user selection
    while True:
        try:
            choice = input("\nEnter backup number to restore (or 'q' to quit): ").strip()
            
            if choice.lower() == 'q':
                print("Rollback cancelled.")
                return False
            
            index = int(choice) - 1
            if 0 <= index < len(backups):
                selected_backup = backups[index]
                break
            else:
                print(f"Invalid selection. Please enter a number between 1 and {len(backups)}.")
        except ValueError:
            print("Invalid input. Please enter a number.")
    
    # Confirm restoration
    print(f"\nSelected backup: {selected_backup.backup_path.name}")
    print(f"Will restore to: {selected_backup.project_root}")
    print("\nWARNING: This will overwrite all files in the target directory!")
    
    confirm = input("Are you sure you want to continue? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("Rollback cancelled.")
        return False
    
    # Perform restoration
    print("\nRestoring backup...")
    success = manager.restore_backup(selected_backup.backup_path)
    
    if success:
        print("\n✓ Rollback completed successfully!")
        print(f"Project restored to: {selected_backup.project_root}")
        return True
    else:
        print("\n✗ Rollback failed. Please check the error messages above.")
        return False


def restore_specific_backup(manager: BackupManager, backup_path: Path, target: Path = None):
    """Restore a specific backup"""
    backup_path = Path(backup_path)
    
    if not backup_path.exists():
        print(f"ERROR: Backup file not found: {backup_path}")
        return False
    
    print(f"Restoring backup: {backup_path}")
    
    if target:
        print(f"Target directory: {target}")
    
    print("\nWARNING: This will overwrite existing files!")
    confirm = input("Continue? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("Rollback cancelled.")
        return False
    
    print("\nRestoring backup...")
    success = manager.restore_backup(backup_path, target)
    
    if success:
        print("\n✓ Rollback completed successfully!")
        return True
    else:
        print("\n✗ Rollback failed. Please check the error messages above.")
        return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Rollback project structure migration from backup",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode - select from available backups
  python rollback_migration.py
  
  # List all available backups
  python rollback_migration.py --list
  
  # Restore specific backup to original location
  python rollback_migration.py --backup ~/.storycore-backups/project_backup_20260119_120000.tar.gz
  
  # Restore specific backup to custom location
  python rollback_migration.py --backup backup.tar.gz --target /path/to/restore
        """
    )
    
    parser.add_argument(
        '--backup',
        type=Path,
        help='Path to backup archive to restore'
    )
    
    parser.add_argument(
        '--target',
        type=Path,
        help='Target directory for restoration (optional, defaults to original location)'
    )
    
    parser.add_argument(
        '--list',
        action='store_true',
        help='List all available backups'
    )
    
    parser.add_argument(
        '--backup-dir',
        type=Path,
        help='Custom backup directory (default: ~/.storycore-backups)'
    )
    
    args = parser.parse_args()
    
    # Initialize backup manager
    manager = BackupManager(backup_dir=args.backup_dir)
    
    print("=" * 80)
    print("StoryCore-Engine Migration Rollback Tool")
    print("=" * 80)
    
    # Handle list command
    if args.list:
        list_backups(manager)
        return 0
    
    # Handle specific backup restoration
    if args.backup:
        success = restore_specific_backup(manager, args.backup, args.target)
        return 0 if success else 1
    
    # Interactive mode
    success = interactive_restore(manager)
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
