#!/usr/bin/env python3
"""
Simple ComfyUI Update Script
Follows the official ComfyUI update documentation
"""

import subprocess
import sys
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def find_comfyui_path() -> Path:
    """Find the ComfyUI installation path"""
    possible_paths = [
        Path.cwd() / "comfyui_portable" / "ComfyUI",
        Path.cwd().parent / "comfyui_portable" / "ComfyUI",
        Path.home() / "ComfyUI",
    ]

    for path in possible_paths:
        if (path / "main.py").exists():
            return path

    raise FileNotFoundError("ComfyUI installation not found")

def update_comfyui():
    """Update ComfyUI using the official method"""
    logger.info("🔄 Updating ComfyUI to latest version...")
    logger.info("Following: https://docs.comfy.org/installation/update_comfyui")

    # Find ComfyUI path
    comfyui_path = find_comfyui_path()
    logger.info(f"📂 ComfyUI found at: {comfyui_path}")

    # Change to ComfyUI directory
    original_cwd = os.getcwd()
    os.chdir(comfyui_path)

    try:
        # Step 1: Stash any local changes (optional but recommended)
        logger.info("💾 Stashing local changes...")
        result = subprocess.run(["git", "stash"], capture_output=True, text=True)
        if result.returncode != 0:
            logger.warning("⚠️ Could not stash changes, continuing anyway...")

        # Step 2: Pull latest changes
        logger.info("📥 Pulling latest changes from repository...")
        result = subprocess.run(["git", "pull"], capture_output=True, text=True)

        if result.returncode == 0:
            logger.info("✅ Successfully updated ComfyUI!")
            logger.info("Output:")
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    logger.info(f"  {line}")

            # Check if there were any updates
            if "Already up to date" in result.stdout:
                logger.info("📋 ComfyUI was already up to date")
            else:
                logger.info("🎉 ComfyUI has been updated to the latest version")

        else:
            logger.error("❌ Failed to update ComfyUI")
            logger.error(f"Error: {result.stderr}")
            return False

        # Step 3: Update requirements (if requirements.txt changed)
        requirements_file = comfyui_path / "requirements.txt"
        if requirements_file.exists():
            logger.info("📦 Updating Python requirements...")
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                logger.info("✅ Requirements updated successfully")
            else:
                logger.warning("⚠️ Some requirements may have failed to update")
                logger.warning(result.stderr)

        # Step 4: Show next steps
        logger.info("")
        logger.info("🎯 Next Steps:")
        logger.info("1. Restart any running ComfyUI instances")
        logger.info("2. Test your workflows to ensure compatibility")
        logger.info("3. Update any custom nodes if needed")
        logger.info("")
        logger.info("To restart StoryCore:")
        logger.info("  python start_storycore_complete.py")

        return True

    except Exception as e:
        logger.error(f"❌ Error during update: {e}")
        return False

    finally:
        # Restore original working directory
        os.chdir(original_cwd)

def check_version():
    """Check current ComfyUI version"""
    comfyui_path = find_comfyui_path()
    os.chdir(comfyui_path)

    try:
        result = subprocess.run(
            ["git", "describe", "--tags"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            print(result.stdout.strip())
        else:
            print("unknown")

    except Exception:
        print("unknown")

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Simple ComfyUI Update Script")
    parser.add_argument("--version", action="store_true", help="Show current version only")

    args = parser.parse_args()

    if args.version:
        check_version()
    else:
        success = update_comfyui()
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()