"""
Unit tests to verify memory system setup is complete.

This test file validates that all core data models, schemas, and basic
infrastructure are properly set up for the memory system.
"""

import pytest
from pathlib import Path
from datetime import datetime

# Test imports of all data models
from src.memory_system.data_models import (
    ProjectConfig,
    ProjectMemory,
    Conversation,
    Message,
    AssetInfo,
    AssetType,
    Error,
    ErrorType,
    ErrorSeverity,
    MemorySystemConfig,
    Objective,
    Entity,
    Constraint,
    Decision,
    StyleRule,
    Task,
    CurrentState,
    Variables,
    Variable,
    Action,
    RepairResult,
    RecoveryReport,
    ValidationResult,
    ProjectContext,
    QAIssue,
    QAReport,
    AssetMetadata,
    RecoveryType,
)

# Test imports of schemas
from src.memory_system.schemas import (
    PROJECT_CONFIG_SCHEMA,
    MEMORY_SCHEMA,
    VARIABLES_SCHEMA,
    ERRORS_SCHEMA,
    validate_schema,
    get_schema_for_file,
)

# Test imports of managers
from src.memory_system import (
    MemorySystemCore,
    ConfigManager,
)

from src.memory_system.directory_manager import DirectoryManager


class TestDataModelsSetup:
    """Test that all data models are properly defined."""
    
    def test_project_config_creation(self):
        """Test ProjectConfig can be created and converted to dict."""
        config = ProjectConfig(
            project_name="test_project",
            project_type="video",
            creation_timestamp=datetime.now().isoformat(),
            objectives=["Test objective"],
        )
        
        assert config.project_name == "test_project"
        assert config.project_type == "video"
        assert len(config.objectives) == 1
        
        # Test to_dict conversion
        config_dict = config.to_dict()
        assert isinstance(config_dict, dict)
        assert config_dict["project_name"] == "test_project"
    
    def test_project_config_from_dict(self):
        """Test ProjectConfig can be created from dictionary."""
        data = {
            "schema_version": "1.0",
            "project_name": "test_project",
            "project_type": "video",
            "creation_timestamp": datetime.now().isoformat(),
            "objectives": ["Test objective"],
            "memory_system_enabled": True,
            "memory_system_config": {
                "auto_summarize": True,
                "summarization_threshold_kb": 50,
                "auto_translate": True,
                "target_languages": ["en", "fr"],
                "error_detection_enabled": True,
                "auto_recovery_enabled": True,
                "max_recovery_attempts": 3,
            }
        }
        
        config = ProjectConfig.from_dict(data)
        assert config.project_name == "test_project"
        assert config.memory_system_config.auto_summarize is True
    
    def test_project_memory_creation(self):
        """Test ProjectMemory can be created and converted to dict."""
        memory = ProjectMemory(
            schema_version="1.0",
            last_updated=datetime.now().isoformat(),
            current_state=CurrentState(phase="initialization")
        )
        
        assert memory.schema_version == "1.0"
        assert isinstance(memory.objectives, list)
        assert isinstance(memory.entities, list)
        
        # Test to_dict conversion
        memory_dict = memory.to_dict()
        assert isinstance(memory_dict, dict)
        assert "objectives" in memory_dict
    
    def test_conversation_creation(self):
        """Test Conversation and Message models."""
        message = Message(
            role="user",
            content="Test message",
            timestamp=datetime.now()
        )
        
        conversation = Conversation(
            messages=[message],
            session_id="test_session",
            start_time=datetime.now()
        )
        
        assert len(conversation.messages) == 1
        assert conversation.messages[0].role == "user"
    
    def test_asset_info_creation(self):
        """Test AssetInfo model."""
        asset = AssetInfo(
            filename="test.png",
            path=Path("assets/images/test.png"),
            type=AssetType.IMAGE,
            size_bytes=1024,
            timestamp=datetime.now().isoformat(),
            description="Test image"
        )
        
        assert asset.filename == "test.png"
        assert asset.type == AssetType.IMAGE
    
    def test_error_creation(self):
        """Test Error model."""
        error = Error(
            id="error_001",
            type=ErrorType.MISSING_FILE,
            severity=ErrorSeverity.HIGH,
            detected=datetime.now().isoformat(),
            description="Test error",
            affected_components=["test_component"]
        )
        
        assert error.type == ErrorType.MISSING_FILE
        assert error.severity == ErrorSeverity.HIGH
        
        # Test to_dict conversion
        error_dict = error.to_dict()
        assert isinstance(error_dict, dict)
        assert error_dict["type"] == "missing_file"
    
    def test_all_enums_defined(self):
        """Test that all enum types are properly defined."""
        # AssetType
        assert AssetType.IMAGE.value == "image"
        assert AssetType.AUDIO.value == "audio"
        assert AssetType.VIDEO.value == "video"
        assert AssetType.DOCUMENT.value == "document"
        
        # ErrorType
        assert ErrorType.MISSING_FILE.value == "missing_file"
        assert ErrorType.INVALID_JSON.value == "invalid_json"
        
        # ErrorSeverity
        assert ErrorSeverity.LOW.value == "low"
        assert ErrorSeverity.CRITICAL.value == "critical"
        
        # RecoveryType
        assert RecoveryType.AUTOMATIC.value == "automatic"
        assert RecoveryType.DESPERATE.value == "desperate"


class TestSchemasSetup:
    """Test that all JSON schemas are properly defined."""
    
    def test_project_config_schema_exists(self):
        """Test PROJECT_CONFIG_SCHEMA is defined."""
        assert isinstance(PROJECT_CONFIG_SCHEMA, dict)
        assert "type" in PROJECT_CONFIG_SCHEMA
        assert "required" in PROJECT_CONFIG_SCHEMA
    
    def test_memory_schema_exists(self):
        """Test MEMORY_SCHEMA is defined."""
        assert isinstance(MEMORY_SCHEMA, dict)
        assert "type" in MEMORY_SCHEMA
        assert "required" in MEMORY_SCHEMA
    
    def test_variables_schema_exists(self):
        """Test VARIABLES_SCHEMA is defined."""
        assert isinstance(VARIABLES_SCHEMA, dict)
        assert "type" in VARIABLES_SCHEMA
    
    def test_errors_schema_exists(self):
        """Test ERRORS_SCHEMA is defined."""
        assert isinstance(ERRORS_SCHEMA, dict)
        assert "type" in ERRORS_SCHEMA
    
    def test_validate_schema_function(self):
        """Test validate_schema function works."""
        # Valid data
        valid_data = {
            "schema_version": "1.0",
            "errors": []
        }
        is_valid, errors = validate_schema(valid_data, ERRORS_SCHEMA)
        assert is_valid is True
        assert len(errors) == 0
    
    def test_get_schema_for_file(self):
        """Test get_schema_for_file function."""
        schema = get_schema_for_file("project_config.json")
        assert schema == PROJECT_CONFIG_SCHEMA
        
        schema = get_schema_for_file("memory.json")
        assert schema == MEMORY_SCHEMA
        
        schema = get_schema_for_file("variables.json")
        assert schema == VARIABLES_SCHEMA
        
        schema = get_schema_for_file("errors_detected.json")
        assert schema == ERRORS_SCHEMA
        
        # Unknown file
        schema = get_schema_for_file("unknown.json")
        assert schema == {}


class TestManagersSetup:
    """Test that all manager classes are properly defined."""
    
    def test_directory_manager_exists(self):
        """Test DirectoryManager class exists and can be instantiated."""
        manager = DirectoryManager()
        assert manager is not None
        assert hasattr(manager, 'create_structure')
        assert hasattr(manager, 'initialize_files')
        assert hasattr(manager, 'validate_structure')
        assert hasattr(manager, 'get_directory_tree')
    
    def test_config_manager_exists(self):
        """Test ConfigManager class exists and can be instantiated."""
        test_path = Path("/tmp/test_project")
        manager = ConfigManager(test_path)
        assert manager is not None
        assert hasattr(manager, 'load_config')
        assert hasattr(manager, 'save_config')
        assert hasattr(manager, 'update_config')
    
    def test_memory_system_core_exists(self):
        """Test MemorySystemCore class exists and can be instantiated."""
        test_path = Path("/tmp/test_project")
        config = ProjectConfig(
            project_name="test",
            project_type="video",
            creation_timestamp=datetime.now().isoformat(),
        )
        core = MemorySystemCore(test_path, config)
        assert core is not None
        assert hasattr(core, 'initialize_project')
        assert hasattr(core, 'record_discussion')
        assert hasattr(core, 'add_asset')
        assert hasattr(core, 'update_memory')


class TestTestingFramework:
    """Test that pytest and hypothesis are properly configured."""
    
    def test_pytest_available(self):
        """Test that pytest is available."""
        import pytest
        assert pytest is not None
    
    def test_hypothesis_available(self):
        """Test that hypothesis is available."""
        import hypothesis
        assert hypothesis is not None
    
    def test_jsonschema_available(self):
        """Test that jsonschema is available."""
        import jsonschema
        assert jsonschema is not None


class TestModuleStructure:
    """Test that the module structure is correct."""
    
    def test_memory_system_package_imports(self):
        """Test that all expected exports are available from memory_system package."""
        import src.memory_system as ms
        
        # Check main classes
        assert hasattr(ms, 'MemorySystemCore')
        assert hasattr(ms, 'ConfigManager')
        assert hasattr(ms, 'ProjectConfig')
        assert hasattr(ms, 'ProjectMemory')
        assert hasattr(ms, 'Conversation')
        assert hasattr(ms, 'Message')
        assert hasattr(ms, 'AssetInfo')
        assert hasattr(ms, 'AssetType')
        assert hasattr(ms, 'Error')
        assert hasattr(ms, 'ErrorType')
        assert hasattr(ms, 'ErrorSeverity')
    
    def test_version_defined(self):
        """Test that package version is defined."""
        import src.memory_system as ms
        assert hasattr(ms, '__version__')
        assert ms.__version__ == "1.0.0"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
