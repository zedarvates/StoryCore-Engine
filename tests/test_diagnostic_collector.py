"""
Unit tests for Diagnostic Collector module.

Tests system information collection and module state collection.
"""

import sys
import platform
from src.diagnostic_collector import DiagnosticCollector


def test_diagnostic_collector_initialization():
    """Test that DiagnosticCollector initializes correctly."""
    collector = DiagnosticCollector()
    assert collector is not None
    assert collector.storycore_version is not None
    assert isinstance(collector.storycore_version, str)


def test_collect_system_info():
    """Test system information collection."""
    collector = DiagnosticCollector()
    system_info = collector.collect_system_info()
    
    # Verify all required fields are present
    assert "storycore_version" in system_info
    assert "python_version" in system_info
    assert "os_platform" in system_info
    assert "os_version" in system_info
    assert "language" in system_info
    
    # Verify field types
    assert isinstance(system_info["storycore_version"], str)
    assert isinstance(system_info["python_version"], str)
    assert isinstance(system_info["os_platform"], str)
    assert isinstance(system_info["os_version"], str)
    assert isinstance(system_info["language"], str)
    
    # Verify values are not empty
    assert len(system_info["storycore_version"]) > 0
    assert len(system_info["python_version"]) > 0
    assert len(system_info["os_platform"]) > 0
    
    # Verify Python version matches current Python
    assert system_info["python_version"] == sys.version.split()[0]
    
    # Verify OS platform is valid
    assert system_info["os_platform"] in ["Windows", "Linux", "Darwin"]


def test_collect_module_state():
    """Test module state collection."""
    collector = DiagnosticCollector()
    
    # Test with a module name
    module_context = collector.collect_module_state("grid-generator")
    
    # Verify structure
    assert "active_module" in module_context
    assert "module_state" in module_context
    
    # Verify values
    assert module_context["active_module"] == "grid-generator"
    assert isinstance(module_context["module_state"], dict)
    
    # Verify module state contains basic info
    if module_context["module_state"]:
        assert "module_name" in module_context["module_state"]
        assert "timestamp" in module_context["module_state"]
    
    # Test with unknown module
    unknown_context = collector.collect_module_state("unknown")
    assert unknown_context["active_module"] == "unknown"
    assert isinstance(unknown_context["module_state"], dict)
    
    # Test with various module names
    test_modules = ["promotion-engine", "qa-engine", "video-plan-engine"]
    for module_name in test_modules:
        context = collector.collect_module_state(module_name)
        assert context["active_module"] == module_name
        assert isinstance(context["module_state"], dict)


def test_create_report_payload():
    """Test complete report payload creation."""
    collector = DiagnosticCollector()
    
    payload = collector.create_report_payload(
        report_type="bug",
        description="Test bug description",
        reproduction_steps="Step 1\nStep 2",
        include_logs=False,
        module_name="test-module"
    )
    
    # Verify payload structure
    assert "schema_version" in payload
    assert "report_type" in payload
    assert "timestamp" in payload
    assert "system_info" in payload
    assert "module_context" in payload
    assert "user_input" in payload
    assert "diagnostics" in payload
    
    # Verify values
    assert payload["schema_version"] == "1.0"
    assert payload["report_type"] == "bug"
    assert payload["user_input"]["description"] == "Test bug description"
    assert payload["user_input"]["reproduction_steps"] == "Step 1\nStep 2"
    assert payload["module_context"]["active_module"] == "test-module"
    
    # Verify system info is populated
    assert len(payload["system_info"]) > 0
    assert "storycore_version" in payload["system_info"]


def test_version_detection():
    """Test that version detection works."""
    collector = DiagnosticCollector()
    version = collector.storycore_version
    
    # Version should be either "0.1.0" or "unknown"
    assert version in ["0.1.0", "unknown"] or version.startswith("0.")


if __name__ == "__main__":
    # Run basic tests
    test_diagnostic_collector_initialization()
    test_collect_system_info()
    test_collect_module_state()
    test_create_report_payload()
    test_version_detection()
    print("All tests passed!")
