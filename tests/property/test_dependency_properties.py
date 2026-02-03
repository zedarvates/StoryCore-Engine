"""
Property-Based Tests for Dependency Verification

Tests Property 11: Dependency Verification
For any workflow start, the system should verify all required dependencies
and either proceed if all are satisfied or notify the user with clear instructions.

Requirements Validated: 11.1-11.8
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from pathlib import Path
import tempfile
import shutil
import sys
import os

from src.end_to_end.dependency_manager import (
    DependencyManager,
    DependencyStatus,
    DependencyType,
)


# Strategy for generating valid directory paths
@st.composite
def valid_directory_paths(draw):
    """Generate valid directory paths for testing"""
    # Use temp directory as base
    base = Path(tempfile.gettempdir())
    
    # Generate random subdirectory name
    subdir = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), min_codepoint=65, max_codepoint=122),
        min_size=5,
        max_size=20
    ))
    
    return base / f"test_storycore_{subdir}"


# Strategy for generating ComfyUI URLs
@st.composite
def comfyui_urls(draw):
    """Generate ComfyUI URLs for testing"""
    protocol = draw(st.sampled_from(["http", "https"]))
    host = draw(st.sampled_from(["localhost", "127.0.0.1", "comfyui.local"]))
    port = draw(st.integers(min_value=8000, max_value=9000))
    
    return f"{protocol}://{host}:{port}"


@given(
    projects_dir=valid_directory_paths(),
    comfyui_url=comfyui_urls(),
)
@settings(max_examples=100, deadline=5000)
def test_property_11_dependency_verification(projects_dir, comfyui_url):
    """
    Feature: end-to-end-project-creation, Property 11: Dependency Verification
    
    For any workflow start, the system should verify all required dependencies
    (Python modules, ComfyUI backend, disk space, write permissions) and either
    proceed if all are satisfied or notify the user with clear instructions if
    any are missing.
    
    Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
    """
    # Create dependency manager
    manager = DependencyManager(
        projects_dir=projects_dir,
        comfyui_url=comfyui_url
    )
    
    # Verify all dependencies
    result = manager.verify_all_dependencies()
    
    # Property 1: Result must always be returned
    assert result is not None
    assert hasattr(result, 'all_satisfied')
    assert hasattr(result, 'can_proceed')
    assert hasattr(result, 'checks')
    assert hasattr(result, 'warnings')
    assert hasattr(result, 'errors')
    
    # Property 2: Checks must cover all dependency types
    check_types = {check.dependency_type for check in result.checks}
    assert DependencyType.PYTHON_MODULE in check_types
    assert DependencyType.BACKEND_SERVICE in check_types
    assert DependencyType.DISK_SPACE in check_types
    assert DependencyType.PERMISSION in check_types
    
    # Property 3: All required modules must be checked
    module_checks = [
        check for check in result.checks
        if check.dependency_type == DependencyType.PYTHON_MODULE
    ]
    checked_modules = {check.name for check in module_checks}
    for required_module in manager.REQUIRED_MODULES:
        assert required_module in checked_modules, f"Required module {required_module} not checked"
    
    # Property 4: Each check must have a status
    for check in result.checks:
        assert check.status in [
            DependencyStatus.AVAILABLE,
            DependencyStatus.MISSING,
            DependencyStatus.INSUFFICIENT,
            DependencyStatus.UNAVAILABLE
        ]
    
    # Property 5: Missing/insufficient dependencies must have instructions
    for check in result.checks:
        if check.status in [DependencyStatus.MISSING, DependencyStatus.INSUFFICIENT]:
            assert check.instructions is not None, f"Check {check.name} missing instructions"
            assert len(check.instructions) > 0, f"Check {check.name} has empty instructions"
    
    # Property 6: If all dependencies satisfied, can_proceed must be True
    if result.all_satisfied:
        assert result.can_proceed, "If all satisfied, must be able to proceed"
    
    # Property 7: If critical dependencies missing, appropriate errors must be present
    critical_failures = [
        check for check in result.checks
        if check.status in [DependencyStatus.MISSING, DependencyStatus.INSUFFICIENT]
        and check.dependency_type != DependencyType.BACKEND_SERVICE
    ]
    
    if critical_failures:
        assert len(result.errors) > 0, "Critical failures must generate errors"
        assert not result.all_satisfied, "Cannot be all satisfied with critical failures"
    
    # Property 8: Backend unavailability should allow degraded mode
    backend_checks = [
        check for check in result.checks
        if check.dependency_type == DependencyType.BACKEND_SERVICE
    ]
    
    if backend_checks:
        backend_check = backend_checks[0]
        if backend_check.status == DependencyStatus.UNAVAILABLE:
            # Should still be able to proceed if other dependencies are OK
            other_failures = [
                check for check in result.checks
                if check.dependency_type != DependencyType.BACKEND_SERVICE
                and check.status in [DependencyStatus.MISSING, DependencyStatus.INSUFFICIENT]
            ]
            if not other_failures:
                assert result.can_proceed, "Should be able to proceed in degraded mode"
    
    # Property 9: Report formatting must work
    report = manager.format_verification_report(result)
    assert report is not None
    assert len(report) > 0
    assert "DEPENDENCY VERIFICATION REPORT" in report
    
    # Property 10: get_missing_modules must return correct list
    missing_modules = result.get_missing_modules()
    expected_missing = [
        check.name for check in result.checks
        if check.dependency_type == DependencyType.PYTHON_MODULE
        and check.status == DependencyStatus.MISSING
    ]
    assert set(missing_modules) == set(expected_missing)
    
    # Property 11: get_failed_checks must return correct list
    failed_checks = result.get_failed_checks()
    expected_failed = [
        check for check in result.checks
        if check.status in [DependencyStatus.MISSING, DependencyStatus.INSUFFICIENT, DependencyStatus.UNAVAILABLE]
    ]
    assert len(failed_checks) == len(expected_failed)
    
    # Cleanup
    if projects_dir.exists():
        try:
            shutil.rmtree(projects_dir)
        except:
            pass


@given(
    projects_dir=valid_directory_paths(),
)
@settings(max_examples=50, deadline=3000)
def test_property_disk_space_checking(projects_dir):
    """
    Test that disk space checking works correctly.
    
    Requirements: 11.5, 11.6
    """
    manager = DependencyManager(projects_dir=projects_dir)
    
    result = manager.verify_all_dependencies()
    
    # Find disk space check
    disk_checks = [
        check for check in result.checks
        if check.dependency_type == DependencyType.DISK_SPACE
    ]
    
    assert len(disk_checks) == 1, "Must have exactly one disk space check"
    
    disk_check = disk_checks[0]
    
    # Must have a status
    assert disk_check.status in [
        DependencyStatus.AVAILABLE,
        DependencyStatus.INSUFFICIENT,
        DependencyStatus.UNAVAILABLE
    ]
    
    # If insufficient, must have instructions
    if disk_check.status == DependencyStatus.INSUFFICIENT:
        assert disk_check.instructions is not None
        assert "GB" in disk_check.message or "space" in disk_check.message.lower()
    
    # Must have details about space
    if disk_check.status in [DependencyStatus.AVAILABLE, DependencyStatus.INSUFFICIENT]:
        assert disk_check.details is not None
        assert "available_bytes" in disk_check.details
        assert "required_bytes" in disk_check.details
    
    # Cleanup
    if projects_dir.exists():
        try:
            shutil.rmtree(projects_dir)
        except:
            pass


@given(
    projects_dir=valid_directory_paths(),
)
@settings(max_examples=50, deadline=3000)
def test_property_write_permission_checking(projects_dir):
    """
    Test that write permission checking works correctly.
    
    Requirements: 11.7, 11.8
    """
    manager = DependencyManager(projects_dir=projects_dir)
    
    result = manager.verify_all_dependencies()
    
    # Find permission check
    permission_checks = [
        check for check in result.checks
        if check.dependency_type == DependencyType.PERMISSION
    ]
    
    assert len(permission_checks) == 1, "Must have exactly one permission check"
    
    permission_check = permission_checks[0]
    
    # Must have a status
    assert permission_check.status in [
        DependencyStatus.AVAILABLE,
        DependencyStatus.INSUFFICIENT,
        DependencyStatus.UNAVAILABLE
    ]
    
    # If insufficient, must have instructions
    if permission_check.status == DependencyStatus.INSUFFICIENT:
        assert permission_check.instructions is not None
        assert "permission" in permission_check.message.lower()
    
    # Cleanup
    if projects_dir.exists():
        try:
            shutil.rmtree(projects_dir)
        except:
            pass


@given(
    comfyui_url=comfyui_urls(),
)
@settings(max_examples=30, deadline=10000)
def test_property_backend_checking(comfyui_url):
    """
    Test that backend checking works correctly.
    
    Requirements: 11.3, 11.4
    """
    manager = DependencyManager(comfyui_url=comfyui_url)
    
    result = manager.verify_all_dependencies()
    
    # Find backend check
    backend_checks = [
        check for check in result.checks
        if check.dependency_type == DependencyType.BACKEND_SERVICE
    ]
    
    assert len(backend_checks) == 1, "Must have exactly one backend check"
    
    backend_check = backend_checks[0]
    
    # Must have a status
    assert backend_check.status in [
        DependencyStatus.AVAILABLE,
        DependencyStatus.UNAVAILABLE
    ]
    
    # If unavailable, must have instructions about degraded mode
    if backend_check.status == DependencyStatus.UNAVAILABLE:
        assert backend_check.instructions is not None
        assert "fallback" in backend_check.instructions.lower() or "placeholder" in backend_check.instructions.lower()


@given(
    projects_dir=valid_directory_paths(),
)
@settings(max_examples=50, deadline=3000)
def test_property_module_checking(projects_dir):
    """
    Test that Python module checking works correctly.
    
    Requirements: 11.1, 11.2
    """
    manager = DependencyManager(projects_dir=projects_dir)
    
    result = manager.verify_all_dependencies()
    
    # Find module checks
    module_checks = [
        check for check in result.checks
        if check.dependency_type == DependencyType.PYTHON_MODULE
    ]
    
    assert len(module_checks) > 0, "Must have module checks"
    
    for check in module_checks:
        # Must have a status
        assert check.status in [
            DependencyStatus.AVAILABLE,
            DependencyStatus.MISSING
        ]
        
        # If missing, must have installation instructions
        if check.status == DependencyStatus.MISSING:
            assert check.instructions is not None
            assert "pip install" in check.instructions.lower() or "install" in check.instructions.lower()
    
    # Cleanup
    if projects_dir.exists():
        try:
            shutil.rmtree(projects_dir)
        except:
            pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
