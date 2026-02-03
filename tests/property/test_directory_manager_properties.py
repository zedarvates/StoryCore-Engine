"""
Property-based tests for DirectoryManager.

These tests verify universal properties that should hold across all valid inputs.
Uses hypothesis for property-based testing with minimum 100 iterations per test.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime
from hypothesis import given, strategies as st, settings

from src.memory_system.directory_manager import DirectoryManager
from src.memory_system.data_models import ProjectConfig, MemorySystemConfig


# Windows reserved names that cannot be used as filenames
WINDOWS_RESERVED_NAMES = {
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
}

def is_valid_project_name(name):
    """Check if a project name is valid for filesystem use."""
    if not name or not name.strip():
        return False
    if name.startswith('.'):
        return False
    # Check for trailing spaces or dots (invalid on Windows)
    if name != name.rstrip(' .'):
        return False
    # Check for Windows reserved names (case-insensitive)
    if name.upper() in WINDOWS_RESERVED_NAMES:
        return False
    # Check for reserved names with extensions (e.g., "NUL.txt")
    base_name = name.split('.')[0].upper()
    if base_name in WINDOWS_RESERVED_NAMES:
        return False
    return True

# Strategy for generating valid project names
# Exclude characters that are invalid in file paths
project_name_strategy = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(
        blacklist_characters='/\\:*?"<>|\x00',
        blacklist_categories=('Cc', 'Cs')
    )
).filter(is_valid_project_name)


# Strategy for generating valid project types
project_type_strategy = st.sampled_from(["video", "script", "creative", "technical"])


# Strategy for generating objectives
objectives_strategy = st.lists(
    st.text(min_size=1, max_size=100),
    min_size=0,
    max_size=10
)


@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    # Cleanup
    shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 1: Complete Directory Structure Creation
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
    objectives=objectives_strategy
)
def test_property_complete_directory_creation(project_name, project_type, objectives):
    """
    Property 1: Complete Directory Structure Creation
    
    For any valid project name and configuration, when initializing a project,
    all required directories (assistant/, build_logs/, assets/, summaries/ and
    their subdirectories) and files (memory.json, variables.json, project_config.json,
    index files) SHALL be created in a single atomic operation.
    
    Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        director_manager = DirectoryManager()
        
        # Sanitize project name for file system safety
        sanitized_name = director_manager._sanitize_project_name(project_name)
        project_path = temp_path / sanitized_name
        
        # Create configuration
        config = ProjectConfig(
            schema_version="1.0",
            project_name=sanitized_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=objectives,
            memory_system_enabled=True,
            memory_system_config=MemorySystemConfig(),
        )
        
        # Execute: Create structure and initialize files
        structure_created = director_manager.create_structure(project_path)
        files_initialized = director_manager.initialize_files(project_path, config)
        
        # Verify: Structure creation succeeded
        assert structure_created is True, "Directory structure creation should succeed"
        assert files_initialized is True, "File initialization should succeed"
        
        # Verify: All required directories exist
        assert (project_path / "assistant").exists(), "assistant/ directory should exist"
        assert (project_path / "assistant" / "discussions_raw").exists(), "discussions_raw/ should exist"
        assert (project_path / "assistant" / "discussions_summary").exists(), "discussions_summary/ should exist"
        assert (project_path / "build_logs").exists(), "build_logs/ directory should exist"
        assert (project_path / "assets").exists(), "assets/ directory should exist"
        assert (project_path / "assets" / "images").exists(), "assets/images/ should exist"
        assert (project_path / "assets" / "audio").exists(), "assets/audio/ should exist"
        assert (project_path / "assets" / "video").exists(), "assets/video/ should exist"
        assert (project_path / "assets" / "documents").exists(), "assets/documents/ should exist"
        assert (project_path / "summaries").exists(), "summaries/ directory should exist"
        assert (project_path / "qa_reports").exists(), "qa_reports/ directory should exist"
        
        # Verify: All required files exist
        assert (project_path / "project_config.json").exists(), "project_config.json should exist"
        assert (project_path / "assistant" / "memory.json").exists(), "memory.json should exist"
        assert (project_path / "assistant" / "variables.json").exists(), "variables.json should exist"
        assert (project_path / "build_logs" / "errors_detected.json").exists(), "errors_detected.json should exist"
        assert (project_path / "assets" / "attachments_index.txt").exists(), "attachments_index.txt should exist"
        assert (project_path / "summaries" / "assets_summary.txt").exists(), "assets_summary.txt should exist"
        assert (project_path / "summaries" / "project_overview.txt").exists(), "project_overview.txt should exist"
        assert (project_path / "summaries" / "timeline.txt").exists(), "timeline.txt should exist"
        assert (project_path / "build_logs" / "build_steps_raw.log").exists(), "build_steps_raw.log should exist"
        assert (project_path / "build_logs" / "build_steps_clean.txt").exists(), "build_steps_clean.txt should exist"
        assert (project_path / "build_logs" / "build_steps_translated.txt").exists(), "build_steps_translated.txt should exist"
        assert (project_path / "build_logs" / "recovery_attempts.log").exists(), "recovery_attempts.log should exist"
        
        # Verify: No missing items
        missing_items = director_manager.validate_structure(project_path)
        assert len(missing_items) == 0, f"No items should be missing, but found: {missing_items}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 1: Complete Directory Structure Creation (Idempotency)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
)
def test_property_directory_creation_idempotent(project_name, project_type):
    """
    Property 1 (Idempotency): Complete Directory Structure Creation
    
    For any valid project, creating the directory structure multiple times
    should be idempotent (safe to call multiple times without errors).
    
    Validates: Requirements 1.1, 1.2, 1.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        director_manager = DirectoryManager()
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test objective"],
        )
        
        # Execute: Create structure multiple times
        result1 = director_manager.create_structure(project_path)
        result2 = director_manager.create_structure(project_path)
        result3 = director_manager.create_structure(project_path)
        
        # Verify: All calls succeed
        assert result1 is True, "First creation should succeed"
        assert result2 is True, "Second creation should succeed (idempotent)"
        assert result3 is True, "Third creation should succeed (idempotent)"
        
        # Initialize files once (after structure creation)
        file_result = director_manager.initialize_files(project_path, config)
        assert file_result is True, "File initialization should succeed"
        
        # Verify: Structure is still valid
        missing_items = director_manager.validate_structure(project_path)
        assert len(missing_items) == 0, "Structure should remain valid after multiple creations"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 1: Complete Directory Structure Creation (Validation)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
)
def test_property_validate_structure_detects_complete(project_name, project_type):
    """
    Property 1 (Validation): Complete Directory Structure Creation
    
    For any valid project with complete structure, validate_structure()
    should return an empty list (no missing items).
    
    Validates: Requirements 1.1, 10.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        director_manager = DirectoryManager()
        
        # Sanitize project name for file system safety
        sanitized_name = director_manager._sanitize_project_name(project_name)
        project_path = temp_path / sanitized_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=sanitized_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test"],
        )
        
        # Execute: Create complete structure
        director_manager.create_structure(project_path)
        director_manager.initialize_files(project_path, config)
        
        # Verify: Validation returns no missing items
        missing_items = director_manager.validate_structure(project_path)
        assert isinstance(missing_items, list), "validate_structure should return a list"
        assert len(missing_items) == 0, f"Complete structure should have no missing items, found: {missing_items}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 1: Complete Directory Structure Creation (Tree Inspection)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
)
def test_property_directory_tree_inspection(project_name, project_type):
    """
    Property 1 (Tree Inspection): Complete Directory Structure Creation
    
    For any valid project, get_directory_tree() should return a structured
    representation of the complete directory hierarchy.
    
    Validates: Requirements 1.1, 10.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        director_manager = DirectoryManager()
        
        # Sanitize project name for file system safety
        sanitized_name = director_manager._sanitize_project_name(project_name)
        project_path = temp_path / sanitized_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=sanitized_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test"],
        )
        
        # Execute: Create structure and get tree
        director_manager.create_structure(project_path)
        director_manager.initialize_files(project_path, config)
        tree = director_manager.get_directory_tree(project_path)
        
        # Verify: Tree structure is valid
        assert isinstance(tree, dict), "Tree should be a dictionary"
        assert tree["type"] == "directory", "Root should be a directory"
        assert tree["name"] == sanitized_name, f"Root name should be {sanitized_name}"
        assert "children" in tree, "Tree should have children"
        assert len(tree["children"]) > 0, "Tree should have child directories"
        
        # Verify: Key directories are present in tree
        child_names = [child["name"] for child in tree["children"]]
        assert "assistant" in child_names, "assistant should be in tree"
        assert "build_logs" in child_names, "build_logs should be in tree"
        assert "assets" in child_names, "assets should be in tree"
        assert "summaries" in child_names, "summaries should be in tree"
        assert "qa_reports" in child_names, "qa_reports should be in tree"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 2: JSON File Initialization Validity
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
    objectives=objectives_strategy
)
def test_property_json_file_validity(project_name, project_type, objectives):
    """
    Property 2: JSON File Initialization Validity
    
    For any newly created project, all JSON files (memory.json, variables.json,
    project_config.json) SHALL be valid JSON and conform to their respective schemas.
    
    Validates: Requirements 1.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        director_manager = DirectoryManager()
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=objectives,
            memory_system_enabled=True,
            memory_system_config=MemorySystemConfig(),
        )
        
        # Execute: Create structure and initialize files
        director_manager.create_structure(project_path)
        director_manager.initialize_files(project_path, config)
        
        # Verify: project_config.json is valid JSON
        config_path = project_path / "project_config.json"
        assert config_path.exists(), "project_config.json should exist"
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)  # Should not raise exception
            assert isinstance(config_data, dict), "Config should be a dictionary"
            assert "schema_version" in config_data, "Config should have schema_version"
            assert "project_name" in config_data, "Config should have project_name"
            assert "project_type" in config_data, "Config should have project_type"
            assert "creation_timestamp" in config_data, "Config should have creation_timestamp"
            assert "objectives" in config_data, "Config should have objectives"
        
        # Verify: memory.json is valid JSON
        memory_path = project_path / "assistant" / "memory.json"
        assert memory_path.exists(), "memory.json should exist"
        with open(memory_path, 'r', encoding='utf-8') as f:
            memory_data = json.load(f)  # Should not raise exception
            assert isinstance(memory_data, dict), "Memory should be a dictionary"
            assert "schema_version" in memory_data, "Memory should have schema_version"
            assert "last_updated" in memory_data, "Memory should have last_updated"
            assert "objectives" in memory_data, "Memory should have objectives"
            assert "entities" in memory_data, "Memory should have entities"
            assert "constraints" in memory_data, "Memory should have constraints"
            assert "decisions" in memory_data, "Memory should have decisions"
            assert "style_rules" in memory_data, "Memory should have style_rules"
            assert "task_backlog" in memory_data, "Memory should have task_backlog"
            assert "current_state" in memory_data, "Memory should have current_state"
        
        # Verify: variables.json is valid JSON
        variables_path = project_path / "assistant" / "variables.json"
        assert variables_path.exists(), "variables.json should exist"
        with open(variables_path, 'r', encoding='utf-8') as f:
            variables_data = json.load(f)  # Should not raise exception
            assert isinstance(variables_data, dict), "Variables should be a dictionary"
            assert "schema_version" in variables_data, "Variables should have schema_version"
            assert "last_updated" in variables_data, "Variables should have last_updated"
            assert "variables" in variables_data, "Variables should have variables"
        
        # Verify: errors_detected.json is valid JSON
        errors_path = project_path / "build_logs" / "errors_detected.json"
        assert errors_path.exists(), "errors_detected.json should exist"
        with open(errors_path, 'r', encoding='utf-8') as f:
            errors_data = json.load(f)  # Should not raise exception
            assert isinstance(errors_data, dict), "Errors should be a dictionary"
            assert "schema_version" in errors_data, "Errors should have schema_version"
            assert "errors" in errors_data, "Errors should have errors array"
            assert isinstance(errors_data["errors"], list), "Errors should be a list"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 2: JSON File Initialization Validity (Schema Conformance)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
)
def test_property_json_schema_conformance(project_name, project_type):
    """
    Property 2 (Schema Conformance): JSON File Initialization Validity
    
    For any newly created project, all JSON files SHALL conform to their
    respective JSON schemas.
    
    Validates: Requirements 1.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        director_manager = DirectoryManager()
        
        # Sanitize project name for file system safety
        sanitized_name = director_manager._sanitize_project_name(project_name)
        project_path = temp_path / sanitized_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=sanitized_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test objective"],
        )
        
        # Execute: Create structure and initialize files
        director_manager.create_structure(project_path)
        director_manager.initialize_files(project_path, config)
        
        # Import schemas for validation
        from src.memory_system.schemas import (
            PROJECT_CONFIG_SCHEMA,
            MEMORY_SCHEMA,
            VARIABLES_SCHEMA,
            ERRORS_SCHEMA,
            validate_schema,
        )
        
        # Verify: project_config.json conforms to schema
        with open(project_path / "project_config.json", 'r', encoding='utf-8') as f:
            config_data = json.load(f)
            is_valid, errors = validate_schema(config_data, PROJECT_CONFIG_SCHEMA)
            assert is_valid, f"project_config.json should conform to schema, errors: {errors}"
        
        # Verify: memory.json conforms to schema
        with open(project_path / "assistant" / "memory.json", 'r', encoding='utf-8') as f:
            memory_data = json.load(f)
            is_valid, errors = validate_schema(memory_data, MEMORY_SCHEMA)
            assert is_valid, f"memory.json should conform to schema, errors: {errors}"
        
        # Verify: variables.json conforms to schema
        with open(project_path / "assistant" / "variables.json", 'r', encoding='utf-8') as f:
            variables_data = json.load(f)
            is_valid, errors = validate_schema(variables_data, VARIABLES_SCHEMA)
            assert is_valid, f"variables.json should conform to schema, errors: {errors}"
        
        # Verify: errors_detected.json conforms to schema
        with open(project_path / "build_logs" / "errors_detected.json", 'r', encoding='utf-8') as f:
            errors_data = json.load(f)
            is_valid, errors = validate_schema(errors_data, ERRORS_SCHEMA)
            assert is_valid, f"errors_detected.json should conform to schema, errors: {errors}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 2: JSON File Initialization Validity (Round-Trip)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
)
def test_property_json_round_trip_integrity(project_name, project_type):
    """
    Property 2 (Round-Trip): JSON File Initialization Validity
    
    For any newly created project, JSON files should be readable and
    re-writable without data loss (round-trip integrity).
    
    Validates: Requirements 1.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        director_manager = DirectoryManager()
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test objective"],
        )
        
        # Execute: Create structure and initialize files
        director_manager.create_structure(project_path)
        director_manager.initialize_files(project_path, config)
        
        # Test round-trip for project_config.json
        config_path = project_path / "project_config.json"
        with open(config_path, 'r', encoding='utf-8') as f:
            original_config = json.load(f)
        
        # Write it back
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(original_config, f, indent=2, ensure_ascii=False)
        
        # Read again and verify
        with open(config_path, 'r', encoding='utf-8') as f:
            reloaded_config = json.load(f)
        
        assert reloaded_config == original_config, "Config should survive round-trip"
        
        # Test round-trip for memory.json
        memory_path = project_path / "assistant" / "memory.json"
        with open(memory_path, 'r', encoding='utf-8') as f:
            original_memory = json.load(f)
        
        with open(memory_path, 'w', encoding='utf-8') as f:
            json.dump(original_memory, f, indent=2, ensure_ascii=False)
        
        with open(memory_path, 'r', encoding='utf-8') as f:
            reloaded_memory = json.load(f)
        
        assert reloaded_memory == original_memory, "Memory should survive round-trip"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)
