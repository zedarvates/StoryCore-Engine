"""
Property-based tests for ErrorDetector.

Feature: storycore-llm-memory-system
Tests Properties 37-42 for error detection functionality.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from pathlib import Path
import tempfile
import shutil
import json
from datetime import datetime

from src.memory_system.error_detector import ErrorDetector
from src.memory_system.data_models import Error, ErrorType, ErrorSeverity
from src.memory_system.directory_manager import DirectoryManager
from src.memory_system.config_manager import ConfigManager


# Strategies for generating test data
@st.composite
def project_name_strategy(draw):
    """Generate valid project names."""
    # Windows reserved names to exclude
    reserved_names = {
        'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
        'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4',
        'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    }
    
    name = draw(st.text(
        min_size=1,
        max_size=50,
        alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),
            whitelist_characters='_-'
        )
    ))
    
    # Exclude Windows reserved names
    assume(name.upper() not in reserved_names)
    
    return name


@st.composite
def error_type_strategy(draw):
    """Generate valid error types."""
    return draw(st.sampled_from([
        ErrorType.MISSING_FILE,
        ErrorType.INVALID_JSON,
        ErrorType.INCONSISTENT_STATE,
        ErrorType.CORRUPTED_DATA
    ]))


@st.composite
def severity_strategy(draw):
    """Generate valid severity levels."""
    return draw(st.sampled_from([
        ErrorSeverity.LOW,
        ErrorSeverity.MEDIUM,
        ErrorSeverity.HIGH,
        ErrorSeverity.CRITICAL
    ]))


@st.composite
def missing_directory_strategy(draw):
    """Generate a missing directory path from required directories."""
    required_dirs = [
        "assistant",
        "assistant/discussions_raw",
        "assistant/discussions_summary",
        "build_logs",
        "assets",
        "assets/images",
        "assets/audio",
        "assets/video",
        "assets/documents",
        "summaries",
        "qa_reports",
    ]
    return draw(st.sampled_from(required_dirs))


@st.composite
def missing_file_strategy(draw):
    """Generate a missing file path from required files."""
    required_files = [
        "project_config.json",
        "assistant/memory.json",
        "assistant/variables.json",
    ]
    return draw(st.sampled_from(required_files))


@st.composite
def invalid_json_strategy(draw):
    """Generate invalid JSON strings."""
    invalid_jsons = [
        '{"key": "value",}',  # Trailing comma
        '{"key": "value"',     # Missing closing brace
        '{key: "value"}',      # Unquoted key
        '{"key": undefined}',  # Invalid value
        '{"key": "value"}}',   # Extra closing brace
        '',                     # Empty string
        'not json at all',     # Not JSON
    ]
    return draw(st.sampled_from(invalid_jsons))


@st.composite
def invalid_phase_strategy(draw):
    """Generate invalid project phases."""
    return draw(st.text(
        min_size=1,
        max_size=20,
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll'))
    ).filter(lambda x: x not in [
        'initialization', 'planning', 'development', 'testing',
        'review', 'deployment', 'completed', 'unknown'
    ]))


# Property 37: Error Logging
# Feature: storycore-llm-memory-system, Property 37: Error Logging
@given(
    project_name=project_name_strategy(),
    error_type=error_type_strategy(),
    severity=severity_strategy()
)
@settings(max_examples=100, deadline=None)
def test_property_37_error_logging(project_name, error_type, severity):
    """
    Property 37: Error Logging
    
    For any detected inconsistency or error, it SHALL be logged to 
    errors_detected.json.
    
    Validates: Requirements 10.1
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create build_logs directory
        (project_path / "build_logs").mkdir(parents=True, exist_ok=True)
        
        detector = ErrorDetector(project_path)
        
        # Create a test error
        test_error = Error(
            id="test-error-id",
            type=error_type,
            severity=severity,
            detected=datetime.now().isoformat(),
            description="Test error description",
            affected_components=["test_component"],
            diagnostic_info={"test_key": "test_value"},
            status="detected"
        )
        
        # Execute
        result = detector.log_errors([test_error])
        
        # Verify
        assert result is True, "log_errors should return True"
        assert detector.errors_path.exists(), "errors_detected.json should exist"
        
        # Verify error was logged
        with open(detector.errors_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        assert "errors" in data, "errors_detected.json should have 'errors' key"
        assert len(data["errors"]) > 0, "At least one error should be logged"
        
        logged_error = data["errors"][0]
        assert logged_error["id"] == "test-error-id"
        assert logged_error["type"] == error_type.value
        assert logged_error["severity"] == severity.value
        assert logged_error["description"] == "Test error description"


# Property 38: Error Classification
# Feature: storycore-llm-memory-system, Property 38: Error Classification
@given(
    project_name=project_name_strategy(),
    error_type=error_type_strategy(),
    severity=severity_strategy()
)
@settings(max_examples=100, deadline=None)
def test_property_38_error_classification(project_name, error_type, severity):
    """
    Property 38: Error Classification
    
    For any logged error, it SHALL be classified by type (missing_file, 
    invalid_json, inconsistent_state, corrupted_data).
    
    Validates: Requirements 10.2
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        detector = ErrorDetector(project_path)
        
        # Create a test error
        test_error = Error(
            id="test-error-id",
            type=error_type,
            severity=severity,
            detected=datetime.now().isoformat(),
            description="Test error",
            affected_components=["component"],
            diagnostic_info={},
            status="detected"
        )
        
        # Execute
        classification = detector.classify_error(test_error)
        
        # Verify
        assert classification.type == error_type, "Error type should match"
        assert classification.severity == severity, "Severity should match"
        assert classification.type in [
            ErrorType.MISSING_FILE,
            ErrorType.INVALID_JSON,
            ErrorType.INCONSISTENT_STATE,
            ErrorType.CORRUPTED_DATA
        ], "Error type should be one of the valid types"


# Property 39: Error Entry Completeness
# Feature: storycore-llm-memory-system, Property 39: Error Entry Completeness
@given(
    project_name=project_name_strategy(),
    error_type=error_type_strategy(),
    severity=severity_strategy(),
    affected_components=st.lists(st.text(min_size=1, max_size=50), min_size=1, max_size=5)
)
@settings(max_examples=100, deadline=None)
def test_property_39_error_entry_completeness(project_name, error_type, severity, affected_components):
    """
    Property 39: Error Entry Completeness
    
    For any error logged, the entry SHALL include timestamp, severity level, 
    affected components, and diagnostic information.
    
    Validates: Requirements 10.3
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        (project_path / "build_logs").mkdir(parents=True, exist_ok=True)
        
        detector = ErrorDetector(project_path)
        
        # Create a test error with diagnostic info
        diagnostic_info = {
            "test_key": "test_value",
            "error_code": 123,
            "details": "Additional details"
        }
        
        test_error = Error(
            id="test-error-id",
            type=error_type,
            severity=severity,
            detected=datetime.now().isoformat(),
            description="Test error",
            affected_components=affected_components,
            diagnostic_info=diagnostic_info,
            status="detected"
        )
        
        # Execute
        detector.log_errors([test_error])
        
        # Verify
        with open(detector.errors_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logged_error = data["errors"][0]
        
        # Check all required fields are present
        assert "detected" in logged_error, "Timestamp should be present"
        assert "severity" in logged_error, "Severity should be present"
        assert "affected_components" in logged_error, "Affected components should be present"
        assert "diagnostic_info" in logged_error, "Diagnostic info should be present"
        
        # Verify values
        assert logged_error["severity"] == severity.value
        assert logged_error["affected_components"] == affected_components
        assert logged_error["diagnostic_info"] == diagnostic_info
        
        # Verify timestamp is valid ISO 8601
        try:
            datetime.fromisoformat(logged_error["detected"])
        except ValueError:
            pytest.fail("Timestamp should be valid ISO 8601 format")


# Property 40: Missing File Detection
# Feature: storycore-llm-memory-system, Property 40: Missing File Detection
@given(
    project_name=project_name_strategy(),
    missing_item=st.one_of(missing_directory_strategy(), missing_file_strategy())
)
@settings(max_examples=100, deadline=None)
def test_property_40_missing_file_detection(project_name, missing_item):
    """
    Property 40: Missing File Detection
    
    For any required file that is missing from the directory structure, 
    the error SHALL be detected and logged.
    
    Validates: Requirements 10.4
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create a partial directory structure (missing the specified item)
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Remove the specified item
        item_path = project_path / missing_item
        if item_path.exists():
            if item_path.is_dir():
                shutil.rmtree(item_path)
            else:
                item_path.unlink()
        
        detector = ErrorDetector(project_path)
        
        # Execute
        errors = detector.check_missing_files()
        
        # Verify
        assert len(errors) > 0, "Should detect at least one missing file/directory"
        
        # Check that the missing item is in the detected errors
        missing_detected = False
        for error in errors:
            if missing_item in error.description or missing_item in error.affected_components:
                missing_detected = True
                assert error.type == ErrorType.MISSING_FILE
                assert error.severity == ErrorSeverity.HIGH
                break
        
        assert missing_detected, f"Missing item '{missing_item}' should be detected"


# Property 41: Invalid JSON Detection
# Feature: storycore-llm-memory-system, Property 41: Invalid JSON Detection
@given(
    project_name=project_name_strategy(),
    invalid_json=invalid_json_strategy(),
    json_file=st.sampled_from([
        "project_config.json",
        "assistant/memory.json",
        "assistant/variables.json"
    ])
)
@settings(max_examples=100, deadline=None)
def test_property_41_invalid_json_detection(project_name, invalid_json, json_file):
    """
    Property 41: Invalid JSON Detection
    
    For any JSON file with invalid syntax or schema violations, the error 
    SHALL be detected and logged.
    
    Validates: Requirements 10.5
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Write invalid JSON to the specified file
        json_path = project_path / json_file
        json_path.parent.mkdir(parents=True, exist_ok=True)
        with open(json_path, 'w', encoding='utf-8') as f:
            f.write(invalid_json)
        
        detector = ErrorDetector(project_path)
        
        # Execute
        errors = detector.validate_json_files()
        
        # Verify
        assert len(errors) > 0, "Should detect invalid JSON"
        
        # Check that the invalid JSON file is in the detected errors
        json_error_detected = False
        for error in errors:
            if json_file in error.description or json_file in error.affected_components:
                json_error_detected = True
                assert error.type in [ErrorType.INVALID_JSON, ErrorType.CORRUPTED_DATA]
                assert error.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]
                break
        
        assert json_error_detected, f"Invalid JSON in '{json_file}' should be detected"


# Property 42: State Inconsistency Detection
# Feature: storycore-llm-memory-system, Property 42: State Inconsistency Detection
@given(
    project_name=project_name_strategy(),
    invalid_phase=invalid_phase_strategy()
)
@settings(max_examples=100, deadline=None)
def test_property_42_state_inconsistency_detection_invalid_phase(project_name, invalid_phase):
    """
    Property 42: State Inconsistency Detection (Invalid Phase)
    
    For any inconsistency between memory.json and actual project state, 
    the error SHALL be detected and logged.
    
    Validates: Requirements 10.6
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Create memory.json with invalid phase
        memory_data = {
            "schema_version": "1.0",
            "last_updated": datetime.now().isoformat(),
            "objectives": [],
            "entities": [],
            "constraints": [],
            "decisions": [],
            "style_rules": [],
            "task_backlog": [],
            "current_state": {
                "phase": invalid_phase,
                "progress_percentage": 50,
                "active_tasks": [],
                "blockers": [],
                "last_activity": datetime.now().isoformat()
            }
        }
        
        memory_path = project_path / "assistant/memory.json"
        with open(memory_path, 'w', encoding='utf-8') as f:
            json.dump(memory_data, f, indent=2)
        
        detector = ErrorDetector(project_path)
        
        # Execute
        errors = detector.check_state_consistency()
        
        # Verify
        assert len(errors) > 0, "Should detect state inconsistency"
        
        # Check that invalid phase is detected
        phase_error_detected = False
        for error in errors:
            if "phase" in error.description.lower() or invalid_phase in error.description:
                phase_error_detected = True
                assert error.type == ErrorType.INCONSISTENT_STATE
                break
        
        assert phase_error_detected, f"Invalid phase '{invalid_phase}' should be detected"


# Property 42: State Inconsistency Detection (Invalid Progress)
# Feature: storycore-llm-memory-system, Property 42: State Inconsistency Detection
@given(
    project_name=project_name_strategy(),
    invalid_progress=st.one_of(
        st.integers(min_value=-1000, max_value=-1),
        st.integers(min_value=101, max_value=1000),
        st.text(min_size=1, max_size=10)
    )
)
@settings(max_examples=100, deadline=None)
def test_property_42_state_inconsistency_detection_invalid_progress(project_name, invalid_progress):
    """
    Property 42: State Inconsistency Detection (Invalid Progress)
    
    For any inconsistency between memory.json and actual project state, 
    the error SHALL be detected and logged.
    
    Validates: Requirements 10.6
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        # Create memory.json with invalid progress
        memory_data = {
            "schema_version": "1.0",
            "last_updated": datetime.now().isoformat(),
            "objectives": [],
            "entities": [],
            "constraints": [],
            "decisions": [],
            "style_rules": [],
            "task_backlog": [],
            "current_state": {
                "phase": "development",
                "progress_percentage": invalid_progress,
                "active_tasks": [],
                "blockers": [],
                "last_activity": datetime.now().isoformat()
            }
        }
        
        memory_path = project_path / "assistant/memory.json"
        with open(memory_path, 'w', encoding='utf-8') as f:
            json.dump(memory_data, f, indent=2)
        
        detector = ErrorDetector(project_path)
        
        # Execute
        errors = detector.check_state_consistency()
        
        # Verify
        assert len(errors) > 0, "Should detect state inconsistency"
        
        # Check that invalid progress is detected
        progress_error_detected = False
        for error in errors:
            if "progress" in error.description.lower():
                progress_error_detected = True
                assert error.type == ErrorType.INCONSISTENT_STATE
                break
        
        assert progress_error_detected, f"Invalid progress '{invalid_progress}' should be detected"


# Integration test: detect_errors should find all types of errors
# Feature: storycore-llm-memory-system, Property 37-42: Comprehensive Error Detection
@given(project_name=project_name_strategy())
@settings(max_examples=50, deadline=None)
def test_comprehensive_error_detection(project_name):
    """
    Comprehensive Error Detection
    
    The detect_errors method should find missing files, invalid JSON, 
    and state inconsistencies in a single scan.
    
    Validates: Requirements 10.1, 10.4, 10.5, 10.6
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create partial directory structure (some missing)
        (project_path / "assistant").mkdir(parents=True, exist_ok=True)
        (project_path / "build_logs").mkdir(parents=True, exist_ok=True)
        # Intentionally skip some directories
        
        # Create invalid JSON file
        config_path = project_path / "project_config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write('{"invalid": json}')
        
        # Create memory.json with invalid state
        memory_path = project_path / "assistant/memory.json"
        memory_data = {
            "schema_version": "1.0",
            "last_updated": datetime.now().isoformat(),
            "objectives": [],
            "entities": [],
            "constraints": [],
            "decisions": [],
            "style_rules": [],
            "task_backlog": [],
            "current_state": {
                "phase": "invalid_phase",
                "progress_percentage": 150,
                "active_tasks": [],
                "blockers": [],
                "last_activity": datetime.now().isoformat()
            }
        }
        with open(memory_path, 'w', encoding='utf-8') as f:
            json.dump(memory_data, f, indent=2)
        
        detector = ErrorDetector(project_path)
        
        # Execute
        errors = detector.detect_errors()
        
        # Verify
        assert len(errors) > 0, "Should detect multiple errors"
        
        # Check that different error types are detected
        error_types = {error.type for error in errors}
        
        # Should have at least missing file errors
        assert ErrorType.MISSING_FILE in error_types, "Should detect missing files"
        
        # Should have invalid JSON or state inconsistency
        assert (ErrorType.INVALID_JSON in error_types or 
                ErrorType.INCONSISTENT_STATE in error_types or
                ErrorType.CORRUPTED_DATA in error_types), \
                "Should detect JSON or state errors"
