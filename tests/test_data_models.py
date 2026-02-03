"""
Unit tests for data models.

Tests the basic functionality of all data model classes.
"""

import pytest
from datetime import datetime

from src.memory_system.data_models import (
    ProjectConfig,
    MemorySystemConfig,
    ProjectMemory,
    Objective,
    Entity,
    Decision,
    Constraint,
    StyleRule,
    Task,
    CurrentState,
    Message,
    Conversation,
    AssetInfo,
    AssetType,
    Error,
    ErrorType,
    ErrorSeverity,
    Variable,
    Variables,
)


def test_project_config_to_dict():
    """Test ProjectConfig serialization to dictionary."""
    config = ProjectConfig(
        schema_version="1.0",
        project_name="test_project",
        project_type="video",
        creation_timestamp="2025-01-24T10:00:00Z",
        objectives=["Objective 1", "Objective 2"],
    )
    
    result = config.to_dict()
    
    assert result["schema_version"] == "1.0"
    assert result["project_name"] == "test_project"
    assert result["project_type"] == "video"
    assert result["creation_timestamp"] == "2025-01-24T10:00:00Z"
    assert len(result["objectives"]) == 2
    assert "memory_system_config" in result


def test_project_config_from_dict():
    """Test ProjectConfig deserialization from dictionary."""
    data = {
        "schema_version": "1.0",
        "project_name": "test_project",
        "project_type": "creative",
        "creation_timestamp": "2025-01-24T10:00:00Z",
        "objectives": ["Test objective"],
        "memory_system_enabled": True,
        "memory_system_config": {
            "auto_summarize": False,
            "summarization_threshold_kb": 100,
        }
    }
    
    config = ProjectConfig.from_dict(data)
    
    assert config.project_name == "test_project"
    assert config.project_type == "creative"
    assert config.memory_system_config.auto_summarize is False
    assert config.memory_system_config.summarization_threshold_kb == 100


def test_project_memory_to_dict():
    """Test ProjectMemory serialization to dictionary."""
    memory = ProjectMemory(
        schema_version="1.0",
        last_updated="2025-01-24T10:00:00Z",
        objectives=[
            Objective(
                id="obj_1",
                description="Test objective",
                status="active",
                added="2025-01-24T10:00:00Z"
            )
        ],
        entities=[
            Entity(
                id="ent_1",
                name="Test Entity",
                type="module",
                description="A test entity",
                added="2025-01-24T10:00:00Z"
            )
        ],
    )
    
    result = memory.to_dict()
    
    assert result["schema_version"] == "1.0"
    assert len(result["objectives"]) == 1
    assert result["objectives"][0]["id"] == "obj_1"
    assert len(result["entities"]) == 1
    assert result["entities"][0]["name"] == "Test Entity"


def test_conversation_creation():
    """Test Conversation object creation."""
    now = datetime.now()
    messages = [
        Message(role="user", content="Hello", timestamp=now),
        Message(role="assistant", content="Hi there", timestamp=now),
    ]
    
    conversation = Conversation(
        messages=messages,
        session_id="session_123",
        start_time=now
    )
    
    assert len(conversation.messages) == 2
    assert conversation.session_id == "session_123"
    assert conversation.messages[0].role == "user"
    assert conversation.messages[1].role == "assistant"


def test_asset_info_creation():
    """Test AssetInfo object creation."""
    from pathlib import Path
    
    asset = AssetInfo(
        filename="test.png",
        path=Path("assets/images/test.png"),
        type=AssetType.IMAGE,
        size_bytes=1024,
        timestamp="2025-01-24T10:00:00Z",
        description="Test image"
    )
    
    assert asset.filename == "test.png"
    assert asset.type == AssetType.IMAGE
    assert asset.size_bytes == 1024


def test_error_to_dict():
    """Test Error serialization to dictionary."""
    error = Error(
        id="err_1",
        type=ErrorType.MISSING_FILE,
        severity=ErrorSeverity.HIGH,
        detected="2025-01-24T10:00:00Z",
        description="File not found",
        affected_components=["memory.json"],
        status="detected",
        recovery_attempts=0
    )
    
    result = error.to_dict()
    
    assert result["id"] == "err_1"
    assert result["type"] == "missing_file"
    assert result["severity"] == "high"
    assert result["description"] == "File not found"
    assert len(result["affected_components"]) == 1


def test_variables_to_dict():
    """Test Variables serialization to dictionary."""
    variables = Variables(
        schema_version="1.0",
        last_updated="2025-01-24T10:00:00Z",
        variables={
            "test_var": Variable(
                value="test_value",
                type="string",
                description="A test variable",
                last_modified="2025-01-24T10:00:00Z"
            )
        }
    )
    
    result = variables.to_dict()
    
    assert result["schema_version"] == "1.0"
    assert "test_var" in result["variables"]
    assert result["variables"]["test_var"]["value"] == "test_value"
    assert result["variables"]["test_var"]["type"] == "string"


def test_asset_type_enum():
    """Test AssetType enum values."""
    assert AssetType.IMAGE.value == "image"
    assert AssetType.AUDIO.value == "audio"
    assert AssetType.VIDEO.value == "video"
    assert AssetType.DOCUMENT.value == "document"


def test_error_type_enum():
    """Test ErrorType enum values."""
    assert ErrorType.MISSING_FILE.value == "missing_file"
    assert ErrorType.INVALID_JSON.value == "invalid_json"
    assert ErrorType.INCONSISTENT_STATE.value == "inconsistent_state"
    assert ErrorType.CORRUPTED_DATA.value == "corrupted_data"


def test_error_severity_enum():
    """Test ErrorSeverity enum values."""
    assert ErrorSeverity.LOW.value == "low"
    assert ErrorSeverity.MEDIUM.value == "medium"
    assert ErrorSeverity.HIGH.value == "high"
    assert ErrorSeverity.CRITICAL.value == "critical"
