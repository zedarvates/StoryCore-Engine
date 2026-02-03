"""
Property-based tests for BuildLogger.

Feature: storycore-llm-memory-system
Tests Properties 29-32 for build logging functionality.
"""

import pytest
from hypothesis import given, strategies as st, settings
from pathlib import Path
import tempfile
import shutil
from datetime import datetime
import json

from src.memory_system.build_logger import BuildLogger
from src.memory_system.data_models import AssetInfo, AssetType, Action


# Strategies for generating test data
@st.composite
def action_type_strategy(draw):
    """Generate valid action types."""
    action_types = [
        "FILE_CREATED", "ASSET_ADDED", "MEMORY_UPDATED", "VARIABLE_CHANGED",
        "SUMMARY_GENERATED", "LLM_DECISION", "ERROR_DETECTED", "INDEX_UPDATED"
    ]
    return draw(st.sampled_from(action_types))


@st.composite
def file_path_strategy(draw):
    """Generate valid file paths."""
    directories = ["assistant", "build_logs", "assets", "summaries"]
    filenames = ["memory.json", "variables.json", "test.txt", "image.png"]
    directory = draw(st.sampled_from(directories))
    filename = draw(st.sampled_from(filenames))
    return f"{directory}/{filename}"


@st.composite
def parameters_strategy(draw):
    """Generate valid parameter dictionaries."""
    keys = draw(st.lists(st.text(min_size=1, max_size=20, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters='_'
    )), min_size=0, max_size=5, unique=True))
    
    values = []
    for _ in keys:
        value_type = draw(st.sampled_from(['string', 'int', 'bool']))
        if value_type == 'string':
            values.append(draw(st.text(min_size=0, max_size=50)))
        elif value_type == 'int':
            values.append(draw(st.integers(min_value=0, max_value=1000000)))
        else:
            values.append(draw(st.booleans()))
    
    return dict(zip(keys, values))


@st.composite
def triggered_by_strategy(draw):
    """Generate valid triggered_by values."""
    return draw(st.sampled_from(["system", "user", "llm", "autofix", "recovery"]))


# Property 29: Comprehensive Action Logging
# Feature: storycore-llm-memory-system, Property 29: Comprehensive Action Logging
@given(
    action_type=action_type_strategy(),
    affected_files=st.lists(file_path_strategy(), min_size=0, max_size=5),
    parameters=parameters_strategy(),
    triggered_by=triggered_by_strategy()
)
@settings(max_examples=100, deadline=None)
def test_property_29_comprehensive_action_logging(action_type, affected_files, parameters, triggered_by):
    """
    Property 29: Comprehensive Action Logging
    
    For any structural action (file creation, asset addition, variable change, 
    summary generation, memory update, LLM decision), an entry SHALL be appended 
    to build_steps_raw.log.
    
    Validates: Requirements 8.1, 8.2
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Execute
        result = logger.log_action(
            action_type=action_type,
            affected_files=affected_files,
            parameters=parameters,
            triggered_by=triggered_by
        )
        
        # Verify
        assert result is True, "log_action should return True"
        assert logger.raw_log_path.exists(), "Raw log file should exist"
        
        # Verify entry was appended
        log_content = logger.get_log_content()
        assert action_type in log_content, f"Action type '{action_type}' should be in log"
        assert f"[{datetime.now().date().isoformat()}" in log_content, "Timestamp should be in log"
        
        # Verify all affected files are logged
        for file in affected_files:
            assert file in log_content, f"Affected file '{file}' should be in log"
        
        # Verify parameters are logged
        for key, value in parameters.items():
            assert key in log_content, f"Parameter key '{key}' should be in log"


# Property 30: Log Entry Structure Completeness
# Feature: storycore-llm-memory-system, Property 30: Log Entry Structure Completeness
@given(
    action_type=action_type_strategy(),
    affected_files=st.lists(file_path_strategy(), min_size=1, max_size=3),
    parameters=parameters_strategy(),
    triggered_by=triggered_by_strategy()
)
@settings(max_examples=100, deadline=None)
def test_property_30_log_entry_structure_completeness(action_type, affected_files, parameters, triggered_by):
    """
    Property 30: Log Entry Structure Completeness
    
    For any log entry, it SHALL include timestamp, action type, affected files, 
    and relevant parameters.
    
    Validates: Requirements 8.3
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Execute
        logger.log_action(
            action_type=action_type,
            affected_files=affected_files,
            parameters=parameters,
            triggered_by=triggered_by
        )
        
        # Verify
        log_content = logger.get_log_content()
        
        # Check timestamp format (ISO 8601)
        assert "[" in log_content and "]" in log_content, "Log should contain timestamp in brackets"
        
        # Check action type
        assert f"ACTION: {action_type}" in log_content, "Log should contain action type"
        
        # Check affected files section
        if affected_files:
            assert "Files:" in log_content or any(f in log_content for f in affected_files), \
                "Log should contain affected files"
        
        # Check parameters section
        if parameters:
            assert "Parameters:" in log_content or any(k in log_content for k in parameters.keys()), \
                "Log should contain parameters"
        
        # Check triggered_by
        assert f"Triggered_By: {triggered_by}" in log_content, "Log should contain triggered_by"


# Property 31: Log Format Consistency
# Feature: storycore-llm-memory-system, Property 31: Log Format Consistency
@given(
    num_actions=st.integers(min_value=2, max_value=10)
)
@settings(max_examples=50, deadline=None)
def test_property_31_log_format_consistency(num_actions):
    """
    Property 31: Log Format Consistency
    
    For any set of log entries, they SHALL use a consistent structured format.
    
    Validates: Requirements 8.4
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Execute - log multiple actions
        for i in range(num_actions):
            logger.log_action(
                action_type=f"TEST_ACTION_{i}",
                affected_files=[f"test_file_{i}.txt"],
                parameters={"index": i, "test": "value"},
                triggered_by="system"
            )
        
        # Verify
        log_content = logger.get_log_content()
        
        # Count action entries
        action_count = log_content.count("] ACTION:")
        assert action_count == num_actions, f"Should have {num_actions} action entries"
        
        # Verify consistent format - each action should have:
        # 1. Timestamp in brackets
        # 2. ACTION: keyword
        # 3. Triggered_By field
        
        lines = log_content.split('\n')
        action_lines = [line for line in lines if "] ACTION:" in line]
        
        # All action lines should start with timestamp
        for line in action_lines:
            assert line.startswith('['), "Action line should start with timestamp bracket"
            assert '] ACTION:' in line, "Action line should contain '] ACTION:'"
        
        # All entries should have Triggered_By
        triggered_by_count = log_content.count("Triggered_By:")
        assert triggered_by_count == num_actions, "Each action should have Triggered_By field"


# Property 32: Log Immutability
# Feature: storycore-llm-memory-system, Property 32: Log Immutability
@given(
    initial_actions=st.integers(min_value=1, max_value=5),
    additional_actions=st.integers(min_value=1, max_value=5)
)
@settings(max_examples=50, deadline=None)
def test_property_32_log_immutability(initial_actions, additional_actions):
    """
    Property 32: Log Immutability
    
    For any existing log entry in build_steps_raw.log, it SHALL never be 
    modified (append-only).
    
    Validates: Requirements 8.5
    """
    # Setup
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Execute - log initial actions
        for i in range(initial_actions):
            logger.log_action(
                action_type=f"INITIAL_ACTION_{i}",
                affected_files=[f"initial_{i}.txt"],
                parameters={"phase": "initial", "index": i},
                triggered_by="system"
            )
        
        # Capture initial log content
        initial_content = logger.get_log_content()
        initial_length = len(initial_content)
        
        # Execute - log additional actions
        for i in range(additional_actions):
            logger.log_action(
                action_type=f"ADDITIONAL_ACTION_{i}",
                affected_files=[f"additional_{i}.txt"],
                parameters={"phase": "additional", "index": i},
                triggered_by="system"
            )
        
        # Verify
        final_content = logger.get_log_content()
        
        # Initial content should be preserved at the beginning
        assert final_content.startswith(initial_content), \
            "Initial log content should be preserved (append-only)"
        
        # Final content should be longer
        assert len(final_content) > initial_length, \
            "Log should grow with new entries"
        
        # All initial actions should still be present
        for i in range(initial_actions):
            assert f"INITIAL_ACTION_{i}" in final_content, \
                f"Initial action {i} should still be in log"
        
        # All additional actions should be present
        for i in range(additional_actions):
            assert f"ADDITIONAL_ACTION_{i}" in final_content, \
                f"Additional action {i} should be in log"
        
        # Verify order is preserved (initial actions come before additional)
        initial_pos = final_content.find("INITIAL_ACTION_0")
        additional_pos = final_content.find("ADDITIONAL_ACTION_0")
        assert initial_pos < additional_pos, \
            "Initial actions should appear before additional actions"


# Additional unit tests for specialized logging methods

def test_log_file_creation():
    """Test specialized file creation logging."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Create a test file
        test_file = project_path / "test.txt"
        test_file.write_text("test content")
        
        # Log file creation
        result = logger.log_file_creation(test_file, triggered_by="user")
        
        assert result is True
        log_content = logger.get_log_content()
        assert "FILE_CREATED" in log_content
        assert str(test_file) in log_content
        assert "file_size" in log_content


def test_log_asset_addition():
    """Test specialized asset addition logging."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Create asset info
        asset_info = AssetInfo(
            filename="test_image.png",
            path=Path("assets/images/test_image.png"),
            type=AssetType.IMAGE,
            size_bytes=1024,
            timestamp=datetime.now().isoformat(),
            description="Test image"
        )
        
        # Log asset addition
        result = logger.log_asset_addition(asset_info, triggered_by="system")
        
        assert result is True
        log_content = logger.get_log_content()
        assert "ASSET_ADDED" in log_content
        assert "test_image.png" in log_content
        assert "image" in log_content


def test_log_memory_update():
    """Test specialized memory update logging."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Log memory update
        result = logger.log_memory_update(
            update_type="add_entity",
            details={"entity_name": "TestEntity", "entity_type": "character"},
            triggered_by="llm"
        )
        
        assert result is True
        log_content = logger.get_log_content()
        assert "MEMORY_UPDATED" in log_content
        assert "memory.json" in log_content
        assert "add_entity" in log_content


def test_log_variable_change():
    """Test specialized variable change logging."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Log variable change
        result = logger.log_variable_change(
            variable_name="test_var",
            old_value="old",
            new_value="new",
            triggered_by="user"
        )
        
        assert result is True
        log_content = logger.get_log_content()
        assert "VARIABLE_CHANGED" in log_content
        assert "variables.json" in log_content
        assert "test_var" in log_content


def test_log_summary_generation():
    """Test specialized summary generation logging."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Log summary generation
        result = logger.log_summary_generation(
            summary_type="discussion",
            source_file="discussions_raw/2025-01-15.txt",
            output_file="discussions_summary/2025-01-15.txt",
            triggered_by="system"
        )
        
        assert result is True
        log_content = logger.get_log_content()
        assert "SUMMARY_GENERATED" in log_content
        assert "discussion" in log_content


def test_log_decision():
    """Test specialized LLM decision logging."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Log decision
        result = logger.log_decision(
            decision="Use React for frontend",
            details={"rationale": "Better component model", "alternatives": ["Vue", "Angular"]},
            triggered_by="llm"
        )
        
        assert result is True
        log_content = logger.get_log_content()
        assert "LLM_DECISION" in log_content
        assert "Use React for frontend" in log_content


def test_log_error():
    """Test specialized error logging."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Log error
        result = logger.log_error(
            error_type="missing_file",
            description="Required file not found",
            affected_components=["memory.json"],
            triggered_by="system"
        )
        
        assert result is True
        log_content = logger.get_log_content()
        assert "ERROR_DETECTED" in log_content
        assert "missing_file" in log_content


def test_log_recovery_attempt():
    """Test recovery attempt logging."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Log recovery attempt
        result = logger.log_recovery_attempt(
            error_id="error_001",
            action_taken="Recreated missing file from template",
            success=True,
            triggered_by="autofix"
        )
        
        assert result is True
        assert logger.recovery_log_path.exists()
        
        with open(logger.recovery_log_path, 'r') as f:
            recovery_content = f.read()
        
        assert "error_001" in recovery_content
        assert "Recreated missing file from template" in recovery_content
        assert "Success: True" in recovery_content


def test_get_recent_actions():
    """Test retrieving recent actions."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Log multiple actions
        for i in range(10):
            logger.log_action(
                action_type=f"TEST_ACTION_{i}",
                affected_files=[f"file_{i}.txt"],
                parameters={"index": i},
                triggered_by="system"
            )
        
        # Get recent actions
        recent = logger.get_recent_actions(limit=5)
        
        assert len(recent) == 5
        assert all(isinstance(action, Action) for action in recent)
        
        # Should get the most recent ones
        assert recent[-1].action_type.strip() == "TEST_ACTION_9"


def test_get_action_count():
    """Test getting action count."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Initially should be 0
        assert logger.get_action_count() == 0
        
        # Log some actions
        for i in range(7):
            logger.log_action(
                action_type=f"TEST_{i}",
                affected_files=[],
                parameters={},
                triggered_by="system"
            )
        
        # Should now be 7
        assert logger.get_action_count() == 7


def test_search_logs():
    """Test searching log entries."""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        logger = BuildLogger(project_path)
        
        # Log various actions
        logger.log_action("FILE_CREATED", ["test.txt"], {}, "system")
        logger.log_action("ASSET_ADDED", ["image.png"], {"type": "image"}, "user")
        logger.log_action("MEMORY_UPDATED", ["memory.json"], {}, "llm")
        
        # Search by action type
        results = logger.search_logs("FILE_CREATED")
        assert len(results) >= 1
        assert any("FILE_CREATED" in r.action_type for r in results)
        
        # Search by file
        results = logger.search_logs("image.png")
        assert len(results) >= 1
        
        # Search by parameter
        results = logger.search_logs("image")
        assert len(results) >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
