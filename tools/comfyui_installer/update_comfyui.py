#!/usr/bin/env python3
"""
ComfyUI Update Script
Updates ComfyUI to the latest version according to official documentation
"""

import subprocess
import sys
import os
import logging
from pathlib import Path
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComfyUIUpdater:
    """
    Updates ComfyUI following the official documentation
    https://docs.comfy.org/installation/update_comfyui
    """

    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.comfyui_path = self._find_comfyui_path()

    def _find_comfyui_path(self) -> Path:
        """Find the ComfyUI installation path"""
        possible_paths = [
            self.project_root / "comfyui_portable" / "ComfyUI",
            self.project_root.parent / "comfyui_portable" / "ComfyUI",
            Path.home() / "ComfyUI",
        ]

        for path in possible_paths:
            if (path / "main.py").exists():
                return path

        raise FileNotFoundError("ComfyUI installation not found. Please run the installer first.")

    def check_comfyui_version(self) -> str:
        """Check current ComfyUI version"""
        try:
            # Try to get version from git
            result = subprocess.run(
                ["git", "describe", "--tags"],
                cwd=self.comfyui_path,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                version = result.stdout.strip()
                logger.info(f"Current ComfyUI version: {version}")
                return version
            else:
                logger.warning("Could not determine ComfyUI version from git")
                return "unknown"

        except Exception as e:
            logger.warning(f"Error checking version: {e}")
            return "unknown"

    def update_comfyui(self, method: str = "auto") -> bool:
        """
        Update ComfyUI using the official method

        Args:
            method: Update method - "auto", "git_pull", or "git_reset"
        """
        logger.info("🔄 Starting ComfyUI update process...")
        logger.info("=" * 50)

        # Change to ComfyUI directory
        original_cwd = os.getcwd()
        os.chdir(self.comfyui_path)

        try:
            if method == "auto":
                # Try the recommended update method
                success = self._update_via_git_pull()
                if not success:
                    logger.info("Git pull failed, trying alternative method...")
                    success = self._update_via_git_reset()
            elif method == "git_pull":
                success = self._update_via_git_pull()
            elif method == "git_reset":
                success = self._update_via_git_reset()
            else:
                logger.error(f"Unknown update method: {method}")
                return False

            if success:
                # Update requirements if needed
                self._update_requirements()

                # Verify update
                new_version = self.check_comfyui_version()
                logger.info(f"✅ ComfyUI updated successfully to version: {new_version}")

                # Update custom nodes
                self._update_custom_nodes()

                return True
            else:
                logger.error("❌ ComfyUI update failed")
                return False

        finally:
            # Restore original working directory
            os.chdir(original_cwd)

    def _update_via_git_pull(self) -> bool:
        """Update ComfyUI using git pull (recommended method)"""
        logger.info("📥 Updating ComfyUI via git pull...")

        try:
            # First, check if we're in a git repository
            result = subprocess.run(
                ["git", "status"],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                logger.error("ComfyUI is not a git repository")
                return False

            # Stash any local changes
            logger.info("💾 Stashing local changes...")
            subprocess.run(
                ["git", "stash"],
                capture_output=True,
                timeout=60
            )

            # Pull latest changes
            logger.info("⬇️ Pulling latest changes...")
            result = subprocess.run(
                ["git", "pull"],
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )

            if result.returncode == 0:
                logger.info("✅ Git pull successful")
                return True
            else:
                logger.error(f"❌ Git pull failed: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            logger.error("Git pull timed out")
            return False
        except Exception as e:
            logger.error(f"Error during git pull: {e}")
            return False

    def _update_via_git_reset(self) -> bool:
        """Update ComfyUI using git reset (alternative method)"""
        logger.info("🔄 Updating ComfyUI via git reset...")

        try:
            # Reset to latest origin/master
            logger.info("🔄 Resetting to origin/master...")
            result = subprocess.run(
                ["git", "fetch", "origin"],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode != 0:
                logger.error(f"Git fetch failed: {result.stderr}")
                return False

            result = subprocess.run(
                ["git", "reset", "--hard", "origin/master"],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                logger.info("✅ Git reset successful")
                return True
            else:
                logger.error(f"❌ Git reset failed: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            logger.error("Git reset timed out")
            return False
        except Exception as e:
            logger.error(f"Error during git reset: {e}")
            return False

    def _update_requirements(self):
        """Update Python requirements if requirements.txt changed"""
        logger.info("📦 Checking for updated requirements...")

        requirements_file = self.comfyui_path / "requirements.txt"

        if requirements_file.exists():
            try:
                # Install/update requirements
                logger.info("🔄 Installing updated requirements...")
                result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
                    capture_output=True,
                    text=True,
                    timeout=300
                )

                if result.returncode == 0:
                    logger.info("✅ Requirements updated successfully")
                else:
                    logger.warning(f"⚠️ Some requirements may have failed: {result.stderr}")

            except subprocess.TimeoutExpired:
                logger.warning("Requirements installation timed out")
            except Exception as e:
                logger.warning(f"Error updating requirements: {e}")
        else:
            logger.info("No requirements.txt found, skipping requirements update")

    def _update_custom_nodes(self):
        """Update custom nodes if any exist"""
        logger.info("🔧 Checking for custom nodes updates...")

        custom_nodes_dir = self.comfyui_path / "custom_nodes"

        if custom_nodes_dir.exists():
            for item in custom_nodes_dir.iterdir():
                if item.is_dir() and (item / ".git").exists():
                    logger.info(f"📥 Updating custom node: {item.name}")
                    try:
                        # Change to custom node directory
                        original_cwd = os.getcwd()
                        os.chdir(item)

                        # Update the custom node
                        result = subprocess.run(
                            ["git", "pull"],
                            capture_output=True,
                            text=True,
                            timeout=120
                        )

                        if result.returncode == 0:
                            logger.info(f"✅ Updated {item.name}")
                        else:
                            logger.warning(f"⚠️ Failed to update {item.name}: {result.stderr}")

                        # Restore directory
                        os.chdir(original_cwd)

                    except Exception as e:
                        logger.warning(f"Error updating custom node {item.name}: {e}")
        else:
            logger.info("No custom nodes directory found")

    def backup_comfyui(self, backup_path: Path = None) -> bool:
        """Create a backup of ComfyUI before updating"""
        if backup_path is None:
            backup_path = self.project_root / "backups" / f"comfyui_backup_{self.check_comfyui_version()}"

        logger.info(f"💾 Creating backup at: {backup_path}")

        try:
            backup_path.parent.mkdir(parents=True, exist_ok=True)

            # Create backup (exclude large model files)
            ignore_patterns = shutil.ignore_patterns(
                "*.safetensors", "*.ckpt", "*.pth", "*.bin",
                "__pycache__", "*.pyc", ".git"
            )

            shutil.copytree(
                self.comfyui_path,
                backup_path,
                ignore=ignore_patterns,
                dirs_exist_ok=True
            )

            logger.info("✅ Backup created successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Backup failed: {e}")
            return False

    def verify_update(self) -> bool:
        """Verify that ComfyUI is working after update"""
        logger.info("🔍 Verifying ComfyUI update...")

        try:
            # Try to run ComfyUI with --version or --help
            result = subprocess.run(
                [sys.executable, "main.py", "--help"],
                cwd=self.comfyui_path,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                logger.info("✅ ComfyUI verification successful")
                return True
            else:
                logger.error(f"❌ ComfyUI verification failed: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            logger.error("ComfyUI verification timed out")
            return False
        except Exception as e:
            logger.error(f"Error during verification: {e}")
            return False

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="ComfyUI Update Script")
    parser.add_argument("--method", choices=["auto", "git_pull", "git_reset"],
                       default="auto", help="Update method to use")
    parser.add_argument("--backup", action="store_true",
                       help="Create backup before updating")
    parser.add_argument("--verify", action="store_true",
                       help="Verify ComfyUI works after update")
    parser.add_argument("--check-version", action="store_true",
                       help="Only check current version")

    args = parser.parse_args()

    updater = ComfyUIUpdater()

    if args.check_version:
        version = updater.check_comfyui_version()
        print(f"Current ComfyUI version: {version}")
        return

    # Create backup if requested
    if args.backup:
        updater.backup_comfyui()

    # Update ComfyUI
    success = updater.update_comfyui(args.method)

    if success and args.verify:
        success = updater.verify_update()

    if success:
        logger.info("🎉 ComfyUI update completed successfully!")
        logger.info("You can now restart ComfyUI with the updated version.")
    else:
        logger.error("❌ ComfyUI update failed. Please check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()