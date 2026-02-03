"""
Dependency Manager for End-to-End Project Creation

This module provides dependency verification functionality to ensure all required
dependencies are available before starting the workflow.

Requirements Addressed:
- 11.1: Verify Python module availability
- 11.2: Notify user if modules are missing
- 11.3: Verify ComfyUI backend availability
- 11.4: Propose degraded mode if backend unavailable
- 11.5: Verify disk space availability
- 11.6: Notify user if disk space insufficient
- 11.7: Verify write permissions
- 11.8: Notify user if permissions insufficient
"""

import importlib
import shutil
import sys
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import os
import tempfile


class DependencyStatus(Enum):
    """Status of a dependency check"""
    AVAILABLE = "available"
    MISSING = "missing"
    INSUFFICIENT = "insufficient"
    UNAVAILABLE = "unavailable"


class DependencyType(Enum):
    """Type of dependency"""
    PYTHON_MODULE = "python_module"
    BACKEND_SERVICE = "backend_service"
    DISK_SPACE = "disk_space"
    PERMISSION = "permission"


@dataclass
class DependencyCheckResult:
    """Result of a single dependency check"""
    dependency_type: DependencyType
    name: str
    status: DependencyStatus
    message: str
    instructions: Optional[str] = None
    details: Optional[Dict] = None


@dataclass
class DependencyVerificationResult:
    """Result of complete dependency verification"""
    all_satisfied: bool
    can_proceed: bool
    checks: List[DependencyCheckResult]
    warnings: List[str]
    errors: List[str]
    
    def get_missing_modules(self) -> List[str]:
        """Get list of missing Python modules"""
        return [
            check.name for check in self.checks
            if check.dependency_type == DependencyType.PYTHON_MODULE
            and check.status == DependencyStatus.MISSING
        ]
    
    def get_failed_checks(self) -> List[DependencyCheckResult]:
        """Get list of failed checks"""
        return [
            check for check in self.checks
            if check.status in [DependencyStatus.MISSING, DependencyStatus.INSUFFICIENT, DependencyStatus.UNAVAILABLE]
        ]


class DependencyManager:
    """
    Manages dependency verification for the end-to-end workflow.
    
    Verifies:
    - Python modules
    - ComfyUI backend availability
    - Disk space
    - Write permissions
    """
    
    # Required Python modules
    REQUIRED_MODULES = [
        "PIL",
        "numpy",
        "pathlib",
        "json",
        "dataclasses",
    ]
    
    # Optional Python modules
    OPTIONAL_MODULES = [
        "hypothesis",
        "pytest",
        "aiohttp",
    ]
    
    # Minimum disk space required (in bytes) - 2GB
    MIN_DISK_SPACE = 2 * 1024 * 1024 * 1024
    
    def __init__(self, projects_dir: Optional[Path] = None, comfyui_url: Optional[str] = None):
        """
        Initialize dependency manager.
        
        Args:
            projects_dir: Directory where projects will be created
            comfyui_url: URL of ComfyUI backend (optional)
        """
        self.projects_dir = projects_dir or Path.home() / "Documents" / "StoryCore Projects"
        self.comfyui_url = comfyui_url or "http://localhost:8188"
    
    def verify_all_dependencies(self) -> DependencyVerificationResult:
        """
        Verify all required dependencies.
        
        Returns:
            DependencyVerificationResult with all check results
            
        Requirements: 11.1-11.8
        """
        checks = []
        warnings = []
        errors = []
        
        # Check Python modules
        module_checks = self._check_python_modules()
        checks.extend(module_checks)
        
        # Check ComfyUI backend
        backend_check = self._check_comfyui_backend()
        checks.append(backend_check)
        
        # Check disk space
        disk_check = self._check_disk_space()
        checks.append(disk_check)
        
        # Check write permissions
        permission_check = self._check_write_permissions()
        checks.append(permission_check)
        
        # Analyze results
        critical_failures = []
        for check in checks:
            if check.status == DependencyStatus.MISSING:
                if check.dependency_type == DependencyType.PYTHON_MODULE:
                    if check.name in self.REQUIRED_MODULES:
                        errors.append(f"Required module '{check.name}' is missing")
                        critical_failures.append(check)
                    else:
                        warnings.append(f"Optional module '{check.name}' is missing")
                else:
                    errors.append(check.message)
                    critical_failures.append(check)
            elif check.status == DependencyStatus.INSUFFICIENT:
                errors.append(check.message)
                critical_failures.append(check)
            elif check.status == DependencyStatus.UNAVAILABLE:
                if check.dependency_type == DependencyType.BACKEND_SERVICE:
                    warnings.append(check.message)
                else:
                    errors.append(check.message)
                    critical_failures.append(check)
        
        all_satisfied = len(critical_failures) == 0
        can_proceed = all_satisfied or self._can_proceed_with_degraded_mode(checks)
        
        return DependencyVerificationResult(
            all_satisfied=all_satisfied,
            can_proceed=can_proceed,
            checks=checks,
            warnings=warnings,
            errors=errors
        )
    
    def _check_python_modules(self) -> List[DependencyCheckResult]:
        """
        Check if required Python modules are available.
        
        Returns:
            List of DependencyCheckResult for each module
            
        Requirements: 11.1, 11.2
        """
        results = []
        
        all_modules = self.REQUIRED_MODULES + self.OPTIONAL_MODULES
        
        for module_name in all_modules:
            try:
                importlib.import_module(module_name)
                results.append(DependencyCheckResult(
                    dependency_type=DependencyType.PYTHON_MODULE,
                    name=module_name,
                    status=DependencyStatus.AVAILABLE,
                    message=f"Module '{module_name}' is available",
                    instructions=None
                ))
            except ImportError:
                is_required = module_name in self.REQUIRED_MODULES
                install_cmd = self._get_install_command(module_name)
                
                results.append(DependencyCheckResult(
                    dependency_type=DependencyType.PYTHON_MODULE,
                    name=module_name,
                    status=DependencyStatus.MISSING,
                    message=f"{'Required' if is_required else 'Optional'} module '{module_name}' is not installed",
                    instructions=f"Install with: {install_cmd}"
                ))
        
        return results
    
    def _check_comfyui_backend(self) -> DependencyCheckResult:
        """
        Check if ComfyUI backend is available.
        
        Returns:
            DependencyCheckResult for backend availability
            
        Requirements: 11.3, 11.4
        """
        try:
            # Try to import aiohttp for async HTTP requests
            import aiohttp
            import asyncio
            
            async def check_backend():
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(f"{self.comfyui_url}/system_stats", timeout=aiohttp.ClientTimeout(total=5)) as response:
                            return response.status == 200
                except Exception:
                    return False
            
            # Run async check
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            is_available = loop.run_until_complete(check_backend())
            loop.close()
            
            if is_available:
                return DependencyCheckResult(
                    dependency_type=DependencyType.BACKEND_SERVICE,
                    name="ComfyUI",
                    status=DependencyStatus.AVAILABLE,
                    message=f"ComfyUI backend is available at {self.comfyui_url}",
                    instructions=None
                )
            else:
                return DependencyCheckResult(
                    dependency_type=DependencyType.BACKEND_SERVICE,
                    name="ComfyUI",
                    status=DependencyStatus.UNAVAILABLE,
                    message=f"ComfyUI backend is not available at {self.comfyui_url}",
                    instructions="The workflow will continue in fallback mode with placeholder images. To use real image generation, start ComfyUI backend."
                )
        except ImportError:
            # aiohttp not available, assume backend unavailable
            return DependencyCheckResult(
                dependency_type=DependencyType.BACKEND_SERVICE,
                name="ComfyUI",
                status=DependencyStatus.UNAVAILABLE,
                message=f"Cannot check ComfyUI backend (aiohttp not installed)",
                instructions="Install aiohttp to enable backend checking: pip install aiohttp"
            )
    
    def _check_disk_space(self) -> DependencyCheckResult:
        """
        Check if sufficient disk space is available.
        
        Returns:
            DependencyCheckResult for disk space
            
        Requirements: 11.5, 11.6
        """
        try:
            # Get disk usage for projects directory
            if self.projects_dir.exists():
                stat = shutil.disk_usage(self.projects_dir)
            else:
                # Check parent directory if projects dir doesn't exist yet
                parent = self.projects_dir.parent
                while not parent.exists() and parent != parent.parent:
                    parent = parent.parent
                stat = shutil.disk_usage(parent)
            
            available_space = stat.free
            available_gb = available_space / (1024 ** 3)
            required_gb = self.MIN_DISK_SPACE / (1024 ** 3)
            
            if available_space >= self.MIN_DISK_SPACE:
                return DependencyCheckResult(
                    dependency_type=DependencyType.DISK_SPACE,
                    name="disk_space",
                    status=DependencyStatus.AVAILABLE,
                    message=f"Sufficient disk space available: {available_gb:.2f} GB",
                    instructions=None,
                    details={"available_bytes": available_space, "required_bytes": self.MIN_DISK_SPACE}
                )
            else:
                return DependencyCheckResult(
                    dependency_type=DependencyType.DISK_SPACE,
                    name="disk_space",
                    status=DependencyStatus.INSUFFICIENT,
                    message=f"Insufficient disk space: {available_gb:.2f} GB available, {required_gb:.2f} GB required",
                    instructions=f"Free up at least {required_gb - available_gb:.2f} GB of disk space or choose a different location",
                    details={"available_bytes": available_space, "required_bytes": self.MIN_DISK_SPACE}
                )
        except Exception as e:
            return DependencyCheckResult(
                dependency_type=DependencyType.DISK_SPACE,
                name="disk_space",
                status=DependencyStatus.UNAVAILABLE,
                message=f"Could not check disk space: {str(e)}",
                instructions="Verify that the projects directory path is valid"
            )
    
    def _check_write_permissions(self) -> DependencyCheckResult:
        """
        Check if write permissions are available for projects directory.
        
        Returns:
            DependencyCheckResult for write permissions
            
        Requirements: 11.7, 11.8
        """
        try:
            # Ensure projects directory exists
            self.projects_dir.mkdir(parents=True, exist_ok=True)
            
            # Try to create a temporary file
            test_file = self.projects_dir / f".write_test_{os.getpid()}.tmp"
            try:
                test_file.write_text("test")
                test_file.unlink()
                
                return DependencyCheckResult(
                    dependency_type=DependencyType.PERMISSION,
                    name="write_permission",
                    status=DependencyStatus.AVAILABLE,
                    message=f"Write permissions available for {self.projects_dir}",
                    instructions=None
                )
            except PermissionError:
                return DependencyCheckResult(
                    dependency_type=DependencyType.PERMISSION,
                    name="write_permission",
                    status=DependencyStatus.INSUFFICIENT,
                    message=f"No write permission for {self.projects_dir}",
                    instructions=f"Grant write permissions to {self.projects_dir} or choose a different location"
                )
        except PermissionError:
            return DependencyCheckResult(
                dependency_type=DependencyType.PERMISSION,
                name="write_permission",
                status=DependencyStatus.INSUFFICIENT,
                message=f"Cannot create projects directory at {self.projects_dir}",
                instructions=f"Grant permissions to create directory at {self.projects_dir} or choose a different location"
            )
        except Exception as e:
            return DependencyCheckResult(
                dependency_type=DependencyType.PERMISSION,
                name="write_permission",
                status=DependencyStatus.UNAVAILABLE,
                message=f"Could not check write permissions: {str(e)}",
                instructions="Verify that the projects directory path is valid"
            )
    
    def _can_proceed_with_degraded_mode(self, checks: List[DependencyCheckResult]) -> bool:
        """
        Determine if workflow can proceed in degraded mode.
        
        Args:
            checks: List of all dependency checks
            
        Returns:
            True if workflow can proceed with some features disabled
        """
        # Can proceed if only ComfyUI backend is unavailable
        critical_failures = [
            check for check in checks
            if check.status in [DependencyStatus.MISSING, DependencyStatus.INSUFFICIENT, DependencyStatus.UNAVAILABLE]
            and check.dependency_type != DependencyType.BACKEND_SERVICE
        ]
        
        return len(critical_failures) == 0
    
    def _get_install_command(self, module_name: str) -> str:
        """
        Get installation command for a Python module.
        
        Args:
            module_name: Name of the module
            
        Returns:
            Installation command string
        """
        # Map module names to pip package names
        package_map = {
            "PIL": "Pillow",
            "numpy": "numpy",
            "hypothesis": "hypothesis",
            "pytest": "pytest",
            "aiohttp": "aiohttp",
        }
        
        package_name = package_map.get(module_name, module_name)
        return f"pip install {package_name}"
    
    def format_verification_report(self, result: DependencyVerificationResult) -> str:
        """
        Format verification result as a human-readable report.
        
        Args:
            result: Verification result to format
            
        Returns:
            Formatted report string
        """
        lines = []
        lines.append("=" * 60)
        lines.append("DEPENDENCY VERIFICATION REPORT")
        lines.append("=" * 60)
        lines.append("")
        
        if result.all_satisfied:
            lines.append("✓ All dependencies satisfied")
        elif result.can_proceed:
            lines.append("⚠ Some dependencies missing, but can proceed in degraded mode")
        else:
            lines.append("✗ Critical dependencies missing, cannot proceed")
        
        lines.append("")
        
        # Group checks by type
        by_type = {}
        for check in result.checks:
            type_name = check.dependency_type.value
            if type_name not in by_type:
                by_type[type_name] = []
            by_type[type_name].append(check)
        
        # Report each type
        for type_name, checks in by_type.items():
            lines.append(f"{type_name.upper().replace('_', ' ')}:")
            for check in checks:
                status_symbol = "✓" if check.status == DependencyStatus.AVAILABLE else "✗"
                lines.append(f"  {status_symbol} {check.name}: {check.message}")
                if check.instructions:
                    lines.append(f"     → {check.instructions}")
            lines.append("")
        
        if result.warnings:
            lines.append("WARNINGS:")
            for warning in result.warnings:
                lines.append(f"  ⚠ {warning}")
            lines.append("")
        
        if result.errors:
            lines.append("ERRORS:")
            for error in result.errors:
                lines.append(f"  ✗ {error}")
            lines.append("")
        
        lines.append("=" * 60)
        
        return "\n".join(lines)
