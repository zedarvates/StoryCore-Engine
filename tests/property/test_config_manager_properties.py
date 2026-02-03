"""
Property-based tests for ConfigManager.

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

from src.memory_system.config_manager import ConfigManager
from src.memory_system.data_models import ProjectConfig, MemorySystemConfig
from src.memory_system.directory_manager import DirectoryManager


# Strategy for generating valid project names
# Exclude characters that are invalid in file paths and trim whitespace
project_name_strategy = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(
        blacklist_characters='/\\:*?"<>|\x00 ',  # Also exclude spaces
        blacklist_categories=('Cc', 'Cs')
    )
).filter(lambda x: x.strip() and not x.startswith('.') and len(x.strip()) > 0)


# Strategy for generating valid project types
project_type_strategy = st.sampled_from(["video", "script", "creative", "technical"])


# Strategy for generating objectives
objectives_strategy = st.lists(
    st.text(min_size=1, max_size=100),
    min_size=0,
    max_size=10
)


# Strategy for generating boolean values
bool_strategy = st.booleans()


# Strategy for generating positive integers
positive_int_strategy = st.integers(min_value=1, max_value=100)


# Strategy for generating language codes
language_strategy = st.lists(
    st.sampled_from(["en", "fr", "es", "de", "it", "pt", "ja", "zh"]),
    min_size=1,
    max_size=5
)


@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    # Cleanup
    shutil.rmtree(temp_path, ignore_errors=True)


def create_test_project(project_path: Path, config: ProjectConfig) -> None:
    """Helper function to create a test project with configuration."""
    director_manager = DirectoryManager()
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, config)


# Feature: storycore-llm-memory-system, Property 3: Project Configuration Completeness
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
    objectives=objectives_strategy
)
def test_property_config_completeness(project_name, project_type, objectives):
    """
    Property 3: Project Configuration Completeness
    
    For any project initialization, project_config.json SHALL contain all required
    fields (project_name, creation_timestamp, project_type, objectives) with
    correct data types.
    
    Validates: Requirements 2.1, 2.4, 2.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        
        # Create configuration
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=objectives,
            memory_system_enabled=True,
            memory_system_config=MemorySystemConfig(),
        )
        
        # Create project structure
        create_test_project(project_path, config)
        
        # Execute: Load configuration
        config_manager = ConfigManager(project_path)
        loaded_config = config_manager.load_config()
        
        # Verify: Configuration loaded successfully
        assert loaded_config is not None, "Configuration should load successfully"
        
        # Verify: All required fields present with correct types
        assert isinstance(loaded_config.schema_version, str), "schema_version should be string"
        assert isinstance(loaded_config.project_name, str), "project_name should be string"
        assert len(loaded_config.project_name) > 0, "project_name should not be empty"
        
        assert isinstance(loaded_config.project_type, str), "project_type should be string"
        assert loaded_config.project_type in ["video", "script", "creative", "technical"], \
            "project_type should be valid enum value"
        
        assert isinstance(loaded_config.creation_timestamp, str), "creation_timestamp should be string"
        assert len(loaded_config.creation_timestamp) > 0, "creation_timestamp should not be empty"
        
        assert isinstance(loaded_config.objectives, list), "objectives should be list"
        for obj in loaded_config.objectives:
            assert isinstance(obj, str), "Each objective should be string"
        
        assert isinstance(loaded_config.memory_system_enabled, bool), \
            "memory_system_enabled should be boolean"
        
        assert isinstance(loaded_config.memory_system_config, MemorySystemConfig), \
            "memory_system_config should be MemorySystemConfig object"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 3: Project Configuration Completeness (Dictionary Access)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
)
def test_property_config_dict_access(project_name, project_type):
    """
    Property 3 (Dictionary Access): Project Configuration Completeness
    
    For any valid project_config.json, reading the configuration SHALL return
    a structured object with all metadata fields accessible.
    
    Validates: Requirements 2.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test objective"],
        )
        
        create_test_project(project_path, config)
        
        # Execute: Get configuration as dictionary
        config_manager = ConfigManager(project_path)
        config_dict = config_manager.get_config_dict()
        
        # Verify: Dictionary access works
        assert config_dict is not None, "Configuration dictionary should be accessible"
        assert isinstance(config_dict, dict), "Should return dictionary"
        
        # Verify: All required fields accessible
        assert "schema_version" in config_dict, "schema_version should be accessible"
        assert "project_name" in config_dict, "project_name should be accessible"
        assert "project_type" in config_dict, "project_type should be accessible"
        assert "creation_timestamp" in config_dict, "creation_timestamp should be accessible"
        assert "objectives" in config_dict, "objectives should be accessible"
        assert "memory_system_enabled" in config_dict, "memory_system_enabled should be accessible"
        assert "memory_system_config" in config_dict, "memory_system_config should be accessible"
        
        # Verify: Values match expected types
        assert isinstance(config_dict["schema_version"], str)
        assert isinstance(config_dict["project_name"], str)
        assert isinstance(config_dict["project_type"], str)
        assert isinstance(config_dict["creation_timestamp"], str)
        assert isinstance(config_dict["objectives"], list)
        assert isinstance(config_dict["memory_system_enabled"], bool)
        assert isinstance(config_dict["memory_system_config"], dict)
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 4: Configuration Schema Validation
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
)
def test_property_config_schema_validation_rejects_invalid(project_name, project_type):
    """
    Property 4: Configuration Schema Validation
    
    For any attempted update to project_config.json, invalid JSON or schema
    violations SHALL be rejected before writing.
    
    Validates: Requirements 2.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test"],
        )
        
        create_test_project(project_path, config)
        config_manager = ConfigManager(project_path)
        
        # Test 1: Invalid project_type should be rejected
        result = config_manager.update_config({"project_type": "invalid_type"})
        assert result is False, "Invalid project_type should be rejected"
        
        # Verify: Original config unchanged
        loaded_config = config_manager.load_config()
        assert loaded_config.project_type == project_type, "Original project_type should be unchanged"
        
        # Test 2: Invalid objectives type should be rejected
        result = config_manager.update_config({"objectives": "not a list"})
        assert result is False, "Invalid objectives type should be rejected"
        
        # Test 3: Invalid memory_system_enabled type should be rejected
        result = config_manager.update_config({"memory_system_enabled": "not a boolean"})
        assert result is False, "Invalid memory_system_enabled type should be rejected"
        
        # Test 4: Invalid memory_system_config type should be rejected
        result = config_manager.update_config({"memory_system_config": "not a dict"})
        assert result is False, "Invalid memory_system_config type should be rejected"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 4: Configuration Schema Validation (Valid Updates)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
    new_project_type=project_type_strategy,
    new_objectives=objectives_strategy,
)
def test_property_config_schema_validation_accepts_valid(
    project_name, 
    project_type, 
    new_project_type,
    new_objectives
):
    """
    Property 4 (Valid Updates): Configuration Schema Validation
    
    For any valid update to project_config.json, the update SHALL be accepted
    and persisted correctly.
    
    Validates: Requirements 2.2, 2.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Original objective"],
        )
        
        create_test_project(project_path, config)
        config_manager = ConfigManager(project_path)
        
        # Execute: Update with valid values
        result = config_manager.update_config({
            "project_type": new_project_type,
            "objectives": new_objectives,
        })
        
        # Verify: Update succeeded
        assert result is True, "Valid update should succeed"
        
        # Verify: Changes persisted
        loaded_config = config_manager.load_config()
        assert loaded_config.project_type == new_project_type, "project_type should be updated"
        assert loaded_config.objectives == new_objectives, "objectives should be updated"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 5: Configuration Read Structure
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
    objectives=objectives_strategy,
)
def test_property_config_read_structure(project_name, project_type, objectives):
    """
    Property 5: Configuration Read Structure
    
    For any valid project_config.json, reading the configuration SHALL return
    a structured object with all metadata fields accessible.
    
    Validates: Requirements 2.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=objectives,
            memory_system_enabled=True,
            memory_system_config=MemorySystemConfig(),
        )
        
        create_test_project(project_path, config)
        
        # Execute: Load configuration
        config_manager = ConfigManager(project_path)
        loaded_config = config_manager.load_config()
        
        # Verify: Structured object returned
        assert loaded_config is not None, "Configuration should load"
        assert isinstance(loaded_config, ProjectConfig), "Should return ProjectConfig object"
        
        # Verify: All fields accessible via object attributes
        assert hasattr(loaded_config, 'schema_version'), "Should have schema_version attribute"
        assert hasattr(loaded_config, 'project_name'), "Should have project_name attribute"
        assert hasattr(loaded_config, 'project_type'), "Should have project_type attribute"
        assert hasattr(loaded_config, 'creation_timestamp'), "Should have creation_timestamp attribute"
        assert hasattr(loaded_config, 'objectives'), "Should have objectives attribute"
        assert hasattr(loaded_config, 'memory_system_enabled'), "Should have memory_system_enabled attribute"
        assert hasattr(loaded_config, 'memory_system_config'), "Should have memory_system_config attribute"
        
        # Verify: Values match what was saved
        assert loaded_config.project_name == project_name
        assert loaded_config.project_type == project_type
        assert loaded_config.objectives == objectives
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 5: Configuration Read Structure (Round-Trip)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
    objectives=objectives_strategy,
    auto_summarize=bool_strategy,
    threshold=positive_int_strategy,
    auto_translate=bool_strategy,
    languages=language_strategy,
)
def test_property_config_round_trip_integrity(
    project_name,
    project_type,
    objectives,
    auto_summarize,
    threshold,
    auto_translate,
    languages,
):
    """
    Property 5 (Round-Trip): Configuration Read Structure
    
    For any configuration, saving and loading should preserve all data
    (round-trip integrity).
    
    Validates: Requirements 2.2, 2.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        
        # Create configuration with specific memory system settings
        memory_config = MemorySystemConfig(
            auto_summarize=auto_summarize,
            summarization_threshold_kb=threshold,
            auto_translate=auto_translate,
            target_languages=languages,
            error_detection_enabled=True,
            auto_recovery_enabled=True,
            max_recovery_attempts=3,
        )
        
        original_config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=objectives,
            memory_system_enabled=True,
            memory_system_config=memory_config,
        )
        
        # Execute: Save and load configuration
        create_test_project(project_path, original_config)
        config_manager = ConfigManager(project_path)
        loaded_config = config_manager.load_config()
        
        # Verify: All fields preserved
        assert loaded_config.project_name == original_config.project_name
        assert loaded_config.project_type == original_config.project_type
        assert loaded_config.objectives == original_config.objectives
        assert loaded_config.memory_system_enabled == original_config.memory_system_enabled
        
        # Verify: Memory system config preserved
        assert loaded_config.memory_system_config.auto_summarize == auto_summarize
        assert loaded_config.memory_system_config.summarization_threshold_kb == threshold
        assert loaded_config.memory_system_config.auto_translate == auto_translate
        assert loaded_config.memory_system_config.target_languages == languages
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 4: Configuration Schema Validation (Memory System Config)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
)
def test_property_memory_system_config_validation(project_name, project_type):
    """
    Property 4 (Memory System Config): Configuration Schema Validation
    
    For any attempted update to memory_system_config, invalid values SHALL
    be rejected before writing.
    
    Validates: Requirements 2.2, 16.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test"],
        )
        
        create_test_project(project_path, config)
        config_manager = ConfigManager(project_path)
        
        # Test 1: Invalid auto_summarize type should be rejected
        result = config_manager.update_config({
            "memory_system_config": {"auto_summarize": "not a boolean"}
        })
        assert result is False, "Invalid auto_summarize type should be rejected"
        
        # Test 2: Invalid threshold (negative) should be rejected
        result = config_manager.update_config({
            "memory_system_config": {"summarization_threshold_kb": -1}
        })
        assert result is False, "Negative threshold should be rejected"
        
        # Test 3: Invalid threshold (zero) should be rejected
        result = config_manager.update_config({
            "memory_system_config": {"summarization_threshold_kb": 0}
        })
        assert result is False, "Zero threshold should be rejected"
        
        # Test 4: Invalid max_recovery_attempts (too high) should be rejected
        result = config_manager.update_config({
            "memory_system_config": {"max_recovery_attempts": 100}
        })
        assert result is False, "max_recovery_attempts > 10 should be rejected"
        
        # Test 5: Invalid target_languages type should be rejected
        result = config_manager.update_config({
            "memory_system_config": {"target_languages": "not a list"}
        })
        assert result is False, "Invalid target_languages type should be rejected"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 4: Configuration Schema Validation (Memory System Config Valid)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
    auto_summarize=bool_strategy,
    threshold=st.integers(min_value=1, max_value=1000),
    auto_translate=bool_strategy,
    languages=language_strategy,
    max_attempts=st.integers(min_value=1, max_value=10),
)
def test_property_memory_system_config_valid_updates(
    project_name,
    project_type,
    auto_summarize,
    threshold,
    auto_translate,
    languages,
    max_attempts,
):
    """
    Property 4 (Memory System Config Valid): Configuration Schema Validation
    
    For any valid update to memory_system_config, the update SHALL be accepted
    and persisted correctly.
    
    Validates: Requirements 2.2, 16.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        
        config = ProjectConfig(
            schema_version="1.0",
            project_name=project_name,
            project_type=project_type,
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test"],
        )
        
        create_test_project(project_path, config)
        config_manager = ConfigManager(project_path)
        
        # Execute: Update memory system config with valid values
        result = config_manager.update_config({
            "memory_system_config": {
                "auto_summarize": auto_summarize,
                "summarization_threshold_kb": threshold,
                "auto_translate": auto_translate,
                "target_languages": languages,
                "max_recovery_attempts": max_attempts,
            }
        })
        
        # Verify: Update succeeded
        assert result is True, "Valid memory_system_config update should succeed"
        
        # Verify: Changes persisted
        loaded_config = config_manager.load_config()
        assert loaded_config.memory_system_config.auto_summarize == auto_summarize
        assert loaded_config.memory_system_config.summarization_threshold_kb == threshold
        assert loaded_config.memory_system_config.auto_translate == auto_translate
        assert loaded_config.memory_system_config.target_languages == languages
        assert loaded_config.memory_system_config.max_recovery_attempts == max_attempts
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 3: Project Configuration Completeness (Default Config)
@settings(max_examples=100, deadline=None)
@given(
    project_name=project_name_strategy,
    project_type=project_type_strategy,
    objectives=objectives_strategy,
)
def test_property_default_config_creation(project_name, project_type, objectives):
    """
    Property 3 (Default Config): Project Configuration Completeness
    
    For any project parameters, create_default_config() SHALL generate a valid
    configuration with all required fields.
    
    Validates: Requirements 2.1, 16.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        project_path = temp_path / project_name
        project_path.mkdir(parents=True, exist_ok=True)
        
        config_manager = ConfigManager(project_path)
        
        # Execute: Create default configuration
        default_config = config_manager.create_default_config(
            project_name=project_name,
            project_type=project_type,
            objectives=objectives,
        )
        
        # Verify: All required fields present
        assert default_config.schema_version == "1.0"
        assert default_config.project_name == project_name
        assert default_config.project_type == project_type
        assert len(default_config.creation_timestamp) > 0
        assert default_config.objectives == objectives
        assert default_config.memory_system_enabled is True
        assert isinstance(default_config.memory_system_config, MemorySystemConfig)
        
        # Verify: Can be saved successfully
        result = config_manager.save_config(default_config)
        assert result is True, "Default config should be saveable"
        
        # Verify: Can be loaded back
        loaded_config = config_manager.load_config()
        assert loaded_config is not None, "Saved default config should be loadable"
        assert loaded_config.project_name == project_name
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)
