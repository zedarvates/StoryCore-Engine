#!/usr/bin/env python3
"""
Integrated ComfyUI Update and Maintenance Script
Combines update functionality with the existing ComfyUI management
"""

import subprocess
import sys
import os
import logging
from pathlib import Path
import shutil
import time

# Add src to path to import our modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from update_comfyui import ComfyUIUpdater

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IntegratedComfyUIManager:
    """
    Integrated manager for ComfyUI operations: update, backup, verify, start
    """

    def __init__(self):
        self.updater = ComfyUIUpdater()
        self.project_root = Path(__file__).parent.parent.parent

    def update_and_restart(self, backup: bool = True) -> bool:
        """
        Complete update and restart process:
        1. Backup (optional)
        2. Update ComfyUI
        3. Verify installation
        4. Restart services

        Returns:
            True if successful
        """
        logger.info("🔄 Starting integrated ComfyUI update and restart process")
        logger.info("=" * 60)

        # Step 1: Backup (if requested)
        if backup:
            logger.info("💾 Step 1: Creating backup...")
            if not self.updater.backup_comfyui():
                logger.warning("⚠️ Backup failed, but continuing with update...")

        # Step 2: Update ComfyUI
        logger.info("📥 Step 2: Updating ComfyUI...")
        if not self.updater.update_comfyui():
            logger.error("❌ Update failed")
            return False

        # Step 3: Verify installation
        logger.info("🔍 Step 3: Verifying installation...")
        if not self.updater.verify_update():
            logger.error("❌ Verification failed")
            return False

        # Step 4: Restart ComfyUI (if running)
        logger.info("🔄 Step 4: Preparing for restart...")
        logger.info("✅ Update completed successfully!")
        logger.info("")
        logger.info("📋 Next steps:")
        logger.info("  1. Restart any running ComfyUI instances")
        logger.info("  2. Test your workflows to ensure compatibility")
        logger.info("  3. Check for any new custom nodes that may need installation")
        logger.info("")
        logger.info("🎯 To restart ComfyUI with StoryCore:")
        logger.info("  python start_storycore_complete.py")
        logger.info("  # or")
        logger.info("  python tools/comfyui_installer/start_comfyui_with_models.py")

        return True

    def check_for_updates(self) -> dict:
        """
        Check if updates are available for ComfyUI

        Returns:
            Dict with update information
        """
        logger.info("🔍 Checking for ComfyUI updates...")

        try:
            # Change to ComfyUI directory
            original_cwd = os.getcwd()
            os.chdir(self.updater.comfyui_path)

            # Fetch latest changes
            result = subprocess.run(
                ["git", "fetch", "origin"],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                return {"error": "Failed to fetch from remote"}

            # Check if we're behind (try different branch names)
            commits_behind = 0
            for branch in ["origin/master", "origin/main"]:
                result = subprocess.run(
                    ["git", "rev-list", f"HEAD..{branch}", "--count"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.returncode == 0:
                    commits_behind = int(result.stdout.strip())
                    break

            os.chdir(original_cwd)  # Restore directory

            current_version = self.updater.check_comfyui_version()

            return {
                "current_version": current_version,
                "commits_behind": commits_behind,
                "update_available": commits_behind > 0
            }

        except Exception as e:
            logger.error(f"Error checking for updates: {e}")
            return {"error": str(e)}

    def maintenance_menu(self):
        """Interactive maintenance menu"""
        while True:
            print("\n" + "="*50)
            print("🔧 ComfyUI Maintenance Menu")
            print("="*50)
            print("1. Check for updates")
            print("2. Update ComfyUI (with backup)")
            print("3. Update ComfyUI (without backup)")
            print("4. Create manual backup")
            print("5. Verify ComfyUI installation")
            print("6. Check ComfyUI version")
            print("7. Restart ComfyUI")
            print("8. Exit")
            print("="*50)

            choice = input("Select option (1-8): ").strip()

            if choice == "1":
                update_info = self.check_for_updates()
                if "error" in update_info:
                    print(f"❌ Error: {update_info['error']}")
                else:
                    print(f"📋 Current version: {update_info['current_version']}")
                    if update_info['update_available']:
                        print(f"📥 Updates available: {update_info['commits_behind']} commits behind")
                    else:
                        print("✅ Up to date")

            elif choice == "2":
                if input("Create backup before updating? (y/N): ").lower().startswith('y'):
                    self.update_and_restart(backup=True)
                else:
                    self.update_and_restart(backup=False)

            elif choice == "3":
                self.update_and_restart(backup=False)

            elif choice == "4":
                if self.updater.backup_comfyui():
                    print("✅ Backup created successfully")
                else:
                    print("❌ Backup failed")

            elif choice == "5":
                if self.updater.verify_update():
                    print("✅ ComfyUI installation is healthy")
                else:
                    print("❌ ComfyUI verification failed")

            elif choice == "6":
                version = self.updater.check_comfyui_version()
                print(f"📋 ComfyUI version: {version}")

            elif choice == "7":
                print("🔄 To restart ComfyUI, run:")
                print("  python start_storycore_complete.py")
                print("  # or")
                print("  python tools/comfyui_installer/start_comfyui_with_models.py")

            elif choice == "8":
                print("👋 Goodbye!")
                break

            else:
                print("❌ Invalid option. Please select 1-8.")

            input("\nPress Enter to continue...")

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Integrated ComfyUI Update and Maintenance")
    parser.add_argument("--update", action="store_true", help="Update ComfyUI")
    parser.add_argument("--backup", action="store_true", help="Create backup before updating")
    parser.add_argument("--check", action="store_true", help="Check for updates")
    parser.add_argument("--verify", action="store_true", help="Verify ComfyUI installation")
    parser.add_argument("--version", action="store_true", help="Show ComfyUI version")
    parser.add_argument("--menu", action="store_true", help="Show interactive menu")

    args = parser.parse_args()

    manager = IntegratedComfyUIManager()

    if args.menu:
        manager.maintenance_menu()
    elif args.check:
        update_info = manager.check_for_updates()
        if "error" in update_info:
            print(f"❌ Error: {update_info['error']}")
            sys.exit(1)
        else:
            print(f"📋 Current version: {update_info['current_version']}")
            if update_info['update_available']:
                print(f"📥 Updates available: {update_info['commits_behind']} commits behind")
                sys.exit(0)  # Updates available
            else:
                print("✅ Up to date")
                sys.exit(1)  # No updates
    elif args.version:
        version = manager.updater.check_comfyui_version()
        print(version)
    elif args.verify:
        if manager.updater.verify_update():
            print("✅ ComfyUI installation is healthy")
            sys.exit(0)
        else:
            print("❌ ComfyUI verification failed")
            sys.exit(1)
    elif args.update:
        success = manager.update_and_restart(args.backup)
        sys.exit(0 if success else 1)
    else:
        # Default: show menu
        manager.maintenance_menu()

if __name__ == "__main__":
    main()