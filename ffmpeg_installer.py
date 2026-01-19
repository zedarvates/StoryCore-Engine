#!/usr/bin/env python3
"""
FFmpeg Installer and Validator for Video Engine
Provides automated installation and validation of FFmpeg across platforms.
"""

import os
import sys
import platform
import subprocess
import urllib.request
import zipfile
import shutil
import logging
from pathlib import Path
from typing import Tuple, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class FFmpegInstaller:
    """
    Automated FFmpeg installer and validator for cross-platform compatibility.
    
    Handles detection, installation, and validation of FFmpeg across Windows, Linux, and macOS.
    Provides fallback mechanisms when FFmpeg is not available.
    """
    
    def __init__(self):
        """Initialize FFmpeg installer."""
        self.platform_type = self._detect_platform()
        self.ffmpeg_path = None
        self.is_available = False
        
        logger.info(f"FFmpeg installer initialized for {self.platform_type}")
    
    def _detect_platform(self) -> str:
        """Detect current platform."""
        system = platform.system().lower()
        if system == "windows":
            return "windows"
        elif system == "linux":
            return "linux"
        elif system == "darwin":
            return "macos"
        else:
            return "unknown"
    
    def check_ffmpeg_availability(self) -> Tuple[bool, Optional[str]]:
        """Check if FFmpeg is available and get version info."""
        try:
            # Try common FFmpeg locations
            ffmpeg_commands = ["ffmpeg", "ffmpeg.exe"]
            
            for cmd in ffmpeg_commands:
                try:
                    result = subprocess.run(
                        [cmd, "-version"],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if result.returncode == 0:
                        version_line = result.stdout.split('\n')[0]
                        self.ffmpeg_path = cmd
                        self.is_available = True
                        return True, version_line
                        
                except (subprocess.TimeoutExpired, FileNotFoundError):
                    continue
            
            # Check in common installation directories
            common_paths = self._get_common_ffmpeg_paths()
            for path in common_paths:
                if path.exists():
                    try:
                        result = subprocess.run(
                            [str(path), "-version"],
                            capture_output=True,
                            text=True,
                            timeout=10
                        )
                        
                        if result.returncode == 0:
                            version_line = result.stdout.split('\n')[0]
                            self.ffmpeg_path = str(path)
                            self.is_available = True
                            return True, version_line
                            
                    except (subprocess.TimeoutExpired, FileNotFoundError):
                        continue
            
            return False, "FFmpeg not found in PATH or common locations"
            
        except Exception as e:
            return False, f"Error checking FFmpeg: {e}"
    
    def _get_common_ffmpeg_paths(self) -> list[Path]:
        """Get common FFmpeg installation paths for current platform."""
        paths = []
        
        if self.platform_type == "windows":
            paths.extend([
                Path("C:/ffmpeg/bin/ffmpeg.exe"),
                Path("C:/Program Files/ffmpeg/bin/ffmpeg.exe"),
                Path("C:/Program Files (x86)/ffmpeg/bin/ffmpeg.exe"),
                Path(os.path.expanduser("~/ffmpeg/bin/ffmpeg.exe")),
                Path("./ffmpeg/bin/ffmpeg.exe"),
            ])
        elif self.platform_type == "linux":
            paths.extend([
                Path("/usr/bin/ffmpeg"),
                Path("/usr/local/bin/ffmpeg"),
                Path("/opt/ffmpeg/bin/ffmpeg"),
                Path(os.path.expanduser("~/bin/ffmpeg")),
                Path("./ffmpeg/bin/ffmpeg"),
            ])
        elif self.platform_type == "macos":
            paths.extend([
                Path("/usr/local/bin/ffmpeg"),
                Path("/opt/homebrew/bin/ffmpeg"),
                Path("/usr/bin/ffmpeg"),
                Path(os.path.expanduser("~/bin/ffmpeg")),
                Path("./ffmpeg/bin/ffmpeg"),
            ])
        
        return paths
    
    def install_ffmpeg_portable(self) -> Tuple[bool, str]:
        """Install portable FFmpeg for current platform."""
        try:
            if self.platform_type == "windows":
                return self._install_ffmpeg_windows()
            elif self.platform_type == "linux":
                return self._install_ffmpeg_linux()
            elif self.platform_type == "macos":
                return self._install_ffmpeg_macos()
            else:
                return False, f"Automatic installation not supported for {self.platform_type}"
                
        except Exception as e:
            logger.error(f"FFmpeg installation failed: {e}")
            return False, f"Installation failed: {e}"
    
    def _install_ffmpeg_windows(self) -> Tuple[bool, str]:
        """Install FFmpeg on Windows."""
        try:
            # Create ffmpeg directory
            ffmpeg_dir = Path("./ffmpeg")
            ffmpeg_dir.mkdir(exist_ok=True)
            
            # Download URL for Windows FFmpeg (static build)
            download_url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
            zip_path = ffmpeg_dir / "ffmpeg.zip"
            
            logger.info("Downloading FFmpeg for Windows...")
            urllib.request.urlretrieve(download_url, zip_path)
            
            # Extract archive
            logger.info("Extracting FFmpeg...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(ffmpeg_dir)
            
            # Find extracted directory and move contents
            extracted_dirs = [d for d in ffmpeg_dir.iterdir() if d.is_dir() and d.name.startswith("ffmpeg")]
            if extracted_dirs:
                extracted_dir = extracted_dirs[0]
                bin_dir = extracted_dir / "bin"
                if bin_dir.exists():
                    # Move bin directory contents to ffmpeg/bin
                    target_bin = ffmpeg_dir / "bin"
                    if target_bin.exists():
                        shutil.rmtree(target_bin)
                    shutil.move(str(bin_dir), str(target_bin))
                    
                    # Clean up
                    shutil.rmtree(extracted_dir)
            
            # Clean up zip file
            zip_path.unlink()
            
            # Verify installation
            ffmpeg_exe = ffmpeg_dir / "bin" / "ffmpeg.exe"
            if ffmpeg_exe.exists():
                self.ffmpeg_path = str(ffmpeg_exe)
                self.is_available = True
                return True, f"FFmpeg installed successfully at {ffmpeg_exe}"
            else:
                return False, "FFmpeg installation completed but executable not found"
                
        except Exception as e:
            return False, f"Windows installation failed: {e}"
    
    def _install_ffmpeg_linux(self) -> Tuple[bool, str]:
        """Install FFmpeg on Linux."""
        try:
            # Try package manager first
            package_managers = [
                ("apt-get", ["sudo", "apt-get", "update", "&&", "sudo", "apt-get", "install", "-y", "ffmpeg"]),
                ("yum", ["sudo", "yum", "install", "-y", "ffmpeg"]),
                ("dnf", ["sudo", "dnf", "install", "-y", "ffmpeg"]),
                ("pacman", ["sudo", "pacman", "-S", "--noconfirm", "ffmpeg"]),
            ]
            
            for pm_name, install_cmd in package_managers:
                if shutil.which(pm_name.split()[0] if ' ' not in pm_name else pm_name):
                    logger.info(f"Attempting installation with {pm_name}...")
                    try:
                        result = subprocess.run(
                            " ".join(install_cmd),
                            shell=True,
                            capture_output=True,
                            text=True,
                            timeout=300  # 5 minutes
                        )
                        
                        if result.returncode == 0:
                            # Verify installation
                            if shutil.which("ffmpeg"):
                                self.ffmpeg_path = "ffmpeg"
                                self.is_available = True
                                return True, f"FFmpeg installed successfully using {pm_name}"
                        
                    except subprocess.TimeoutExpired:
                        logger.warning(f"Installation with {pm_name} timed out")
                        continue
                    except Exception as e:
                        logger.warning(f"Installation with {pm_name} failed: {e}")
                        continue
            
            # Fallback to static build
            return self._install_ffmpeg_static_linux()
            
        except Exception as e:
            return False, f"Linux installation failed: {e}"
    
    def _install_ffmpeg_static_linux(self) -> Tuple[bool, str]:
        """Install static FFmpeg build on Linux."""
        try:
            # Create ffmpeg directory
            ffmpeg_dir = Path("./ffmpeg")
            ffmpeg_dir.mkdir(exist_ok=True)
            
            # Download static build
            download_url = "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
            tar_path = ffmpeg_dir / "ffmpeg.tar.xz"
            
            logger.info("Downloading static FFmpeg for Linux...")
            urllib.request.urlretrieve(download_url, tar_path)
            
            # Extract archive
            logger.info("Extracting FFmpeg...")
            result = subprocess.run(
                ["tar", "-xf", str(tar_path), "-C", str(ffmpeg_dir)],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return False, f"Failed to extract FFmpeg: {result.stderr}"
            
            # Find extracted directory and move ffmpeg binary
            extracted_dirs = [d for d in ffmpeg_dir.iterdir() if d.is_dir() and d.name.startswith("ffmpeg")]
            if extracted_dirs:
                extracted_dir = extracted_dirs[0]
                ffmpeg_binary = extracted_dir / "ffmpeg"
                if ffmpeg_binary.exists():
                    # Create bin directory and move binary
                    bin_dir = ffmpeg_dir / "bin"
                    bin_dir.mkdir(exist_ok=True)
                    target_binary = bin_dir / "ffmpeg"
                    shutil.move(str(ffmpeg_binary), str(target_binary))
                    target_binary.chmod(0o755)  # Make executable
                    
                    # Clean up
                    shutil.rmtree(extracted_dir)
                    tar_path.unlink()
                    
                    self.ffmpeg_path = str(target_binary)
                    self.is_available = True
                    return True, f"Static FFmpeg installed at {target_binary}"
            
            return False, "FFmpeg binary not found in extracted archive"
            
        except Exception as e:
            return False, f"Static Linux installation failed: {e}"
    
    def _install_ffmpeg_macos(self) -> Tuple[bool, str]:
        """Install FFmpeg on macOS."""
        try:
            # Try Homebrew first
            if shutil.which("brew"):
                logger.info("Attempting installation with Homebrew...")
                result = subprocess.run(
                    ["brew", "install", "ffmpeg"],
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minutes
                )
                
                if result.returncode == 0:
                    if shutil.which("ffmpeg"):
                        self.ffmpeg_path = "ffmpeg"
                        self.is_available = True
                        return True, "FFmpeg installed successfully using Homebrew"
            
            # Try MacPorts
            if shutil.which("port"):
                logger.info("Attempting installation with MacPorts...")
                result = subprocess.run(
                    ["sudo", "port", "install", "ffmpeg"],
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                
                if result.returncode == 0:
                    if shutil.which("ffmpeg"):
                        self.ffmpeg_path = "ffmpeg"
                        self.is_available = True
                        return True, "FFmpeg installed successfully using MacPorts"
            
            return False, "No package manager found. Please install Homebrew or MacPorts first."
            
        except Exception as e:
            return False, f"macOS installation failed: {e}"
    
    def get_installation_instructions(self) -> str:
        """Get manual installation instructions for current platform."""
        instructions = []
        instructions.append("FFmpeg Installation Instructions")
        instructions.append("=" * 40)
        instructions.append(f"Platform: {self.platform_type.title()}")
        instructions.append("")
        
        if self.platform_type == "windows":
            instructions.extend([
                "Option 1: Automatic Installation",
                "  Run: python ffmpeg_installer.py --install",
                "",
                "Option 2: Manual Installation",
                "  1. Download FFmpeg from: https://ffmpeg.org/download.html#build-windows",
                "  2. Extract to C:\\ffmpeg\\",
                "  3. Add C:\\ffmpeg\\bin to your PATH environment variable",
                "",
                "Option 3: Package Manager",
                "  winget install FFmpeg",
                "  or",
                "  choco install ffmpeg",
            ])
        elif self.platform_type == "linux":
            instructions.extend([
                "Option 1: Automatic Installation",
                "  Run: python ffmpeg_installer.py --install",
                "",
                "Option 2: Package Manager",
                "  Ubuntu/Debian: sudo apt-get install ffmpeg",
                "  CentOS/RHEL: sudo yum install ffmpeg",
                "  Fedora: sudo dnf install ffmpeg",
                "  Arch: sudo pacman -S ffmpeg",
                "",
                "Option 3: Static Build",
                "  Download from: https://johnvansickle.com/ffmpeg/",
            ])
        elif self.platform_type == "macos":
            instructions.extend([
                "Option 1: Homebrew (Recommended)",
                "  brew install ffmpeg",
                "",
                "Option 2: MacPorts",
                "  sudo port install ffmpeg",
                "",
                "Option 3: Manual Installation",
                "  Download from: https://ffmpeg.org/download.html#build-mac",
            ])
        else:
            instructions.extend([
                "Please visit https://ffmpeg.org/download.html",
                "for platform-specific installation instructions.",
            ])
        
        return "\n".join(instructions)
    
    def create_fallback_config(self) -> dict:
        """Create configuration for video processing without FFmpeg."""
        return {
            "ffmpeg_available": False,
            "supported_formats": ["png", "jpg", "jpeg", "bmp"],  # PIL-supported formats only
            "export_formats": ["image_sequence"],  # No video container formats
            "fallback_mode": True,
            "recommendations": [
                "Install FFmpeg for full video format support",
                "Current mode supports image sequence export only",
                "Use external tools to convert image sequences to video"
            ]
        }


def main():
    """Main function for FFmpeg installer."""
    import argparse
    
    parser = argparse.ArgumentParser(description="FFmpeg Installer and Validator")
    parser.add_argument("--install", action="store_true", help="Attempt automatic installation")
    parser.add_argument("--check", action="store_true", help="Check FFmpeg availability")
    parser.add_argument("--instructions", action="store_true", help="Show installation instructions")
    
    args = parser.parse_args()
    
    installer = FFmpegInstaller()
    
    if args.check or not any([args.install, args.instructions]):
        # Check availability
        is_available, message = installer.check_ffmpeg_availability()
        print(f"FFmpeg Status: {'✓ Available' if is_available else '✗ Not Available'}")
        print(f"Details: {message}")
        
        if not is_available:
            print("\nTo install FFmpeg, run:")
            print("  python ffmpeg_installer.py --install")
            print("  python ffmpeg_installer.py --instructions")
    
    if args.install:
        print("Attempting automatic FFmpeg installation...")
        success, message = installer.install_ffmpeg_portable()
        print(f"Installation: {'✓ Success' if success else '✗ Failed'}")
        print(f"Details: {message}")
        
        if success:
            # Verify installation
            is_available, version_info = installer.check_ffmpeg_availability()
            if is_available:
                print(f"Verification: ✓ {version_info}")
            else:
                print("Verification: ✗ Installation completed but FFmpeg not accessible")
    
    if args.instructions:
        print(installer.get_installation_instructions())


if __name__ == "__main__":
    main()