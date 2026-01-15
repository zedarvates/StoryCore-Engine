#!/usr/bin/env python3
"""
Platform Dependencies Manager for Video Engine
Handles installation and validation of platform-specific dependencies.
"""

import os
import sys
import platform
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DependencyStatus(Enum):
    """Status of a dependency."""
    AVAILABLE = "available"
    MISSING = "missing"
    OUTDATED = "outdated"
    INCOMPATIBLE = "incompatible"


@dataclass
class Dependency:
    """Information about a software dependency."""
    name: str
    required: bool
    platforms: List[str]  # ['windows', 'linux', 'macos', 'all']
    install_command: Optional[str]
    check_command: Optional[str]
    min_version: Optional[str]
    description: str


class PlatformDependencyManager:
    """
    Manages platform-specific dependencies for Video Engine.
    
    Handles validation, installation guidance, and compatibility checking
    for required and optional dependencies across different platforms.
    """
    
    def __init__(self):
        """Initialize dependency manager."""
        self.platform_type = self._detect_platform()
        self.dependencies = self._define_dependencies()
        
        logger.info(f"Platform dependency manager initialized for {self.platform_type}")
    
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
    
    def _define_dependencies(self) -> List[Dependency]:
        """Define all dependencies for video processing."""
        return [
            # Core Python dependencies
            Dependency(
                name="opencv-python",
                required=True,
                platforms=["all"],
                install_command="pip install opencv-python",
                check_command="python -c \"import cv2; print(cv2.__version__)\"",
                min_version="4.5.0",
                description="OpenCV for image processing and computer vision"
            ),
            
            Dependency(
                name="numpy",
                required=True,
                platforms=["all"],
                install_command="pip install numpy",
                check_command="python -c \"import numpy; print(numpy.__version__)\"",
                min_version="1.20.0",
                description="NumPy for numerical computations"
            ),
            
            Dependency(
                name="pillow",
                required=True,
                platforms=["all"],
                install_command="pip install Pillow",
                check_command="python -c \"import PIL; print(PIL.__version__)\"",
                min_version="8.0.0",
                description="PIL for image manipulation"
            ),
            
            # Video processing dependencies
            Dependency(
                name="ffmpeg",
                required=False,
                platforms=["all"],
                install_command=self._get_ffmpeg_install_command(),
                check_command="ffmpeg -version",
                min_version="4.0.0",
                description="FFmpeg for video format support and encoding"
            ),
            
            # GPU acceleration dependencies
            Dependency(
                name="nvidia-cuda",
                required=False,
                platforms=["windows", "linux"],
                install_command=self._get_cuda_install_command(),
                check_command="nvidia-smi",
                min_version="11.0",
                description="NVIDIA CUDA for GPU acceleration"
            ),
            
            Dependency(
                name="opencl",
                required=False,
                platforms=["all"],
                install_command=self._get_opencl_install_command(),
                check_command=None,  # Complex to check
                min_version=None,
                description="OpenCL for cross-platform GPU acceleration"
            ),
            
            # Performance monitoring dependencies
            Dependency(
                name="psutil",
                required=False,
                platforms=["all"],
                install_command="pip install psutil",
                check_command="python -c \"import psutil; print(psutil.__version__)\"",
                min_version="5.8.0",
                description="System and process monitoring"
            ),
            
            Dependency(
                name="gputil",
                required=False,
                platforms=["all"],
                install_command="pip install GPUtil",
                check_command="python -c \"import GPUtil; print('Available')\"",
                min_version=None,
                description="GPU monitoring and management"
            ),
        ]
    
    def _get_ffmpeg_install_command(self) -> str:
        """Get platform-specific FFmpeg installation command."""
        if self.platform_type == "windows":
            return "Download from https://ffmpeg.org/download.html or use 'winget install FFmpeg'"
        elif self.platform_type == "linux":
            return "sudo apt-get install ffmpeg  # Ubuntu/Debian\nsudo yum install ffmpeg  # CentOS/RHEL"
        elif self.platform_type == "macos":
            return "brew install ffmpeg"
        else:
            return "See https://ffmpeg.org/download.html for installation instructions"
    
    def _get_cuda_install_command(self) -> str:
        """Get platform-specific CUDA installation command."""
        if self.platform_type == "windows":
            return "Download CUDA Toolkit from https://developer.nvidia.com/cuda-downloads"
        elif self.platform_type == "linux":
            return "Download CUDA Toolkit from https://developer.nvidia.com/cuda-downloads"
        else:
            return "CUDA not supported on this platform"
    
    def _get_opencl_install_command(self) -> str:
        """Get platform-specific OpenCL installation command."""
        if self.platform_type == "windows":
            return "Install GPU drivers (NVIDIA/AMD/Intel) which include OpenCL support"
        elif self.platform_type == "linux":
            return "sudo apt-get install opencl-headers ocl-icd-opencl-dev  # Ubuntu/Debian"
        elif self.platform_type == "macos":
            return "OpenCL included with macOS (use Metal instead for better performance)"
        else:
            return "Install appropriate GPU drivers for OpenCL support"
    
    def check_dependency(self, dependency: Dependency) -> Tuple[DependencyStatus, Optional[str]]:
        """Check the status of a specific dependency."""
        # Skip if not for this platform
        if "all" not in dependency.platforms and self.platform_type not in dependency.platforms:
            return DependencyStatus.AVAILABLE, "Not required for this platform"
        
        if not dependency.check_command:
            # Can't check automatically
            return DependencyStatus.MISSING, "Cannot verify automatically"
        
        try:
            result = subprocess.run(
                dependency.check_command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                version_output = result.stdout.strip()
                
                # Try to extract version if min_version is specified
                if dependency.min_version and version_output:
                    detected_version = self._extract_version(version_output)
                    if detected_version and self._compare_versions(detected_version, dependency.min_version) < 0:
                        return DependencyStatus.OUTDATED, f"Found {detected_version}, need {dependency.min_version}+"
                
                return DependencyStatus.AVAILABLE, version_output
            else:
                return DependencyStatus.MISSING, result.stderr.strip() or "Command failed"
        
        except subprocess.TimeoutExpired:
            return DependencyStatus.MISSING, "Check command timed out"
        except Exception as e:
            return DependencyStatus.MISSING, str(e)
    
    def _extract_version(self, output: str) -> Optional[str]:
        """Extract version number from command output."""
        import re
        
        # Common version patterns
        patterns = [
            r'(\d+\.\d+\.\d+)',  # x.y.z
            r'(\d+\.\d+)',       # x.y
            r'version\s+(\d+\.\d+\.\d+)',  # "version x.y.z"
            r'v(\d+\.\d+\.\d+)',           # "vx.y.z"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, output, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _compare_versions(self, version1: str, version2: str) -> int:
        """Compare two version strings. Returns -1, 0, or 1."""
        def version_tuple(v):
            return tuple(map(int, v.split('.')))
        
        try:
            v1 = version_tuple(version1)
            v2 = version_tuple(version2)
            
            if v1 < v2:
                return -1
            elif v1 > v2:
                return 1
            else:
                return 0
        except ValueError:
            # If version parsing fails, assume they're equal
            return 0
    
    def check_all_dependencies(self) -> Dict[str, Tuple[DependencyStatus, Optional[str]]]:
        """Check status of all dependencies."""
        results = {}
        
        for dependency in self.dependencies:
            status, message = self.check_dependency(dependency)
            results[dependency.name] = (status, message)
        
        return results
    
    def get_missing_required_dependencies(self) -> List[Dependency]:
        """Get list of missing required dependencies."""
        missing = []
        
        for dependency in self.dependencies:
            if not dependency.required:
                continue
            
            # Skip if not for this platform
            if "all" not in dependency.platforms and self.platform_type not in dependency.platforms:
                continue
            
            status, _ = self.check_dependency(dependency)
            if status in [DependencyStatus.MISSING, DependencyStatus.INCOMPATIBLE]:
                missing.append(dependency)
        
        return missing
    
    def generate_installation_guide(self) -> str:
        """Generate installation guide for missing dependencies."""
        missing_required = self.get_missing_required_dependencies()
        all_results = self.check_all_dependencies()
        
        guide = []
        guide.append("Video Engine Dependency Installation Guide")
        guide.append("=" * 50)
        guide.append(f"Platform: {self.platform_type.title()}")
        guide.append("")
        
        # Required dependencies
        if missing_required:
            guide.append("REQUIRED DEPENDENCIES (Missing):")
            guide.append("")
            for dep in missing_required:
                guide.append(f"• {dep.name}")
                guide.append(f"  Description: {dep.description}")
                guide.append(f"  Install: {dep.install_command}")
                guide.append("")
        
        # Optional dependencies
        guide.append("OPTIONAL DEPENDENCIES:")
        guide.append("")
        for dependency in self.dependencies:
            if dependency.required:
                continue
            
            # Skip if not for this platform
            if "all" not in dependency.platforms and self.platform_type not in dependency.platforms:
                continue
            
            status, message = all_results.get(dependency.name, (DependencyStatus.MISSING, ""))
            status_symbol = "✓" if status == DependencyStatus.AVAILABLE else "✗"
            
            guide.append(f"{status_symbol} {dependency.name}")
            guide.append(f"  Description: {dependency.description}")
            if status != DependencyStatus.AVAILABLE:
                guide.append(f"  Install: {dependency.install_command}")
            guide.append("")
        
        # Platform-specific notes
        guide.append("PLATFORM-SPECIFIC NOTES:")
        guide.append("")
        if self.platform_type == "windows":
            guide.append("• For GPU acceleration, install NVIDIA drivers and CUDA Toolkit")
            guide.append("• FFmpeg can be installed via winget or downloaded manually")
            guide.append("• Consider using Windows Subsystem for Linux (WSL) for better compatibility")
        elif self.platform_type == "linux":
            guide.append("• Use your distribution's package manager for system dependencies")
            guide.append("• For GPU acceleration, install appropriate drivers (nvidia-driver, mesa)")
            guide.append("• Consider using virtual environments for Python dependencies")
        elif self.platform_type == "macos":
            guide.append("• Use Homebrew for system dependencies: brew install ffmpeg")
            guide.append("• For GPU acceleration, use Metal instead of CUDA")
            guide.append("• Consider using pyenv for Python version management")
        
        return "\n".join(guide)
    
    def validate_environment(self) -> Tuple[bool, List[str]]:
        """Validate that the environment is ready for video processing."""
        issues = []
        
        # Check required dependencies
        missing_required = self.get_missing_required_dependencies()
        if missing_required:
            issues.append(f"Missing required dependencies: {', '.join(dep.name for dep in missing_required)}")
        
        # Check Python version
        python_version = tuple(map(int, platform.python_version().split('.')))
        if python_version < (3, 9):
            issues.append(f"Python 3.9+ required, found {platform.python_version()}")
        
        # Check available memory
        try:
            import psutil
            memory_gb = psutil.virtual_memory().total / (1024**3)
            if memory_gb < 4.0:
                issues.append(f"Low memory: {memory_gb:.1f}GB (4GB+ recommended)")
        except ImportError:
            issues.append("Cannot check memory - psutil not available")
        
        # Platform-specific checks
        if self.platform_type == "unknown":
            issues.append("Unknown platform - compatibility not guaranteed")
        
        return len(issues) == 0, issues


def main():
    """Main function for testing dependency management."""
    print("Platform Dependencies Check")
    print("=" * 50)
    
    # Initialize manager
    manager = PlatformDependencyManager()
    
    # Check all dependencies
    results = manager.check_all_dependencies()
    
    print(f"Platform: {manager.platform_type.title()}")
    print("")
    
    # Display results
    required_missing = 0
    optional_missing = 0
    
    for dependency in manager.dependencies:
        status, message = results.get(dependency.name, (DependencyStatus.MISSING, ""))
        
        status_symbol = "✓" if status == DependencyStatus.AVAILABLE else "✗"
        req_label = "REQUIRED" if dependency.required else "optional"
        
        print(f"{status_symbol} {dependency.name} ({req_label})")
        if message:
            print(f"    {message}")
        
        if status != DependencyStatus.AVAILABLE:
            if dependency.required:
                required_missing += 1
            else:
                optional_missing += 1
    
    print("")
    print(f"Summary: {required_missing} required missing, {optional_missing} optional missing")
    
    # Validate environment
    is_valid, issues = manager.validate_environment()
    print(f"Environment: {'✓ Ready' if is_valid else '✗ Issues Found'}")
    
    if issues:
        print("Issues:")
        for issue in issues:
            print(f"  - {issue}")
    
    # Generate installation guide if needed
    if required_missing > 0 or optional_missing > 0:
        print("\n" + manager.generate_installation_guide())


if __name__ == "__main__":
    main()