"""
Unit tests for configuration utilities.
Tests configuration management, environment overrides, and profiles.
"""

import json
import os
import sys
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.utils.config import (
    get_config_path,
    load_config,
    save_config,
    merge_configs,
    get_merged_config,
    validate_config,
    get_active_profile,
    load_profile_config,
    save_profile_config,
    list_profiles,
    get_environment_overrides,
    inspect_config,
    create_default_config,
    initialize_config
)
from cli.errors import ConfigurationError, SystemError


class TestConfigPath:
    """Test configuration path resolution."""
    
    def test_global_config_path(self):
        """Test global configuration path."""
        path = get_config_path(global_config=True)
        assert path.name == "config.json"
        assert ".storycore" in str(path)
    
    def test_project_config_path(self):
        """Test project configuration path."""
        path = get_config_path(project_path="/test/project")
        assert path.name == "config.json"
        assert ".storycore" in str(path)
        assert "test" in str(path)
    
    def test_current_directory_config_path(self):
        """Test current directory configuration path."""
        path = get_config_path()
        assert path.name == "config.json"
        assert ".storycore" in str(path)


class TestConfigMerging:
    """Test configuration merging."""
    
    def test_merge_simple_configs(self):
        """Test merging simple configurations."""
        global_config = {"key1": "value1", "key2": "value2"}
        project_config = {"key2": "override", "key3": "value3"}
        
        merged = merge_configs(project_config, global_config)
        
        assert merged["key1"] == "value1"
        assert merged["key2"] == "override"  # Project overrides global
        assert merged["key3"] == "value3"
    
    def test_merge_nested_configs(self):
        """Test merging nested configurations."""
        global_config = {
            "section1": {"key1": "value1", "key2": "value2"},
            "section2": {"key3": "value3"}
        }
        project_config = {
            "section1": {"key2": "override"},
            "section3": {"key4": "value4"}
        }
        
        merged = merge_configs(project_config, global_config)
        
        assert merged["section1"]["key1"] == "value1"
        assert merged["section1"]["key2"] == "override"
        assert merged["section2"]["key3"] == "value3"
        assert merged["section3"]["key4"] == "value4"


class TestConfigValidation:
    """Test configuration validation."""
    
    def test_validate_valid_config(self):
        """Test validation of valid configuration."""
        config = {
            "comfyui": {"url": "http://localhost:8188"},
            "logging": {"level": "INFO"},
            "general": {"mock_mode": False}
        }
        
        is_valid, errors = validate_config(config)
        assert is_valid
        assert len(errors) == 0
    
    def test_validate_invalid_comfyui_url(self):
        """Test validation of invalid ComfyUI URL."""
        config = {
            "comfyui": {"url": "invalid-url"}
        }
        
        is_valid, errors = validate_config(config)
        assert not is_valid
        assert any("http://" in error or "https://" in error for error in errors)
    
    def test_validate_invalid_log_level(self):
        """Test validation of invalid log level."""
        config = {
            "logging": {"level": "INVALID"}
        }
        
        is_valid, errors = validate_config(config)
        assert not is_valid
        assert any("level" in error for error in errors)
    
    def test_validate_invalid_mock_mode(self):
        """Test validation of invalid mock mode."""
        config = {
            "general": {"mock_mode": "not-a-boolean"}
        }
        
        is_valid, errors = validate_config(config)
        assert not is_valid
        assert any("mock_mode" in error for error in errors)


class TestEnvironmentOverrides:
    """Test environment variable overrides."""
    
    def test_get_environment_overrides_empty(self):
        """Test getting environment overrides when none are set."""
        with patch.dict(os.environ, {}, clear=True):
            overrides = get_environment_overrides()
            assert overrides == {}
    
    def test_get_environment_overrides_comfyui_url(self):
        """Test ComfyUI URL environment override."""
        with patch.dict(os.environ, {"STORYCORE_COMFYUI_URL": "http://test:8188"}):
            overrides = get_environment_overrides()
            assert overrides["comfyui"]["url"] == "http://test:8188"
    
    def test_get_environment_overrides_log_level(self):
        """Test log level environment override."""
        with patch.dict(os.environ, {"STORYCORE_LOG_LEVEL": "DEBUG"}):
            overrides = get_environment_overrides()
            assert overrides["logging"]["level"] == "DEBUG"
    
    def test_get_environment_overrides_boolean(self):
        """Test boolean environment override."""
        with patch.dict(os.environ, {"STORYCORE_MOCK_MODE": "true"}):
            overrides = get_environment_overrides()
            assert overrides["general"]["mock_mode"] is True
        
        with patch.dict(os.environ, {"STORYCORE_MOCK_MODE": "false"}):
            overrides = get_environment_overrides()
            assert overrides["general"]["mock_mode"] is False
    
    def test_get_environment_overrides_integer(self):
        """Test integer environment override."""
        with patch.dict(os.environ, {"STORYCORE_MAX_WORKERS": "8"}):
            overrides = get_environment_overrides()
            assert overrides["general"]["max_workers"] == 8


class TestProfiles:
    """Test configuration profiles."""
    
    def test_get_active_profile_default(self):
        """Test getting active profile when none is set."""
        with patch.dict(os.environ, {}, clear=True):
            profile = get_active_profile()
            assert profile == "default"
    
    def test_get_active_profile_from_env(self):
        """Test getting active profile from environment."""
        with patch.dict(os.environ, {"STORYCORE_PROFILE": "production"}):
            profile = get_active_profile()
            assert profile == "production"
    
    def test_list_profiles_empty(self):
        """Test listing profiles when none exist."""
        with patch('cli.utils.config.get_merged_config', return_value={}):
            profiles = list_profiles()
            assert profiles == []
    
    def test_list_profiles_with_profiles(self):
        """Test listing profiles when they exist."""
        config = {
            "profiles": {
                "default": {},
                "development": {},
                "production": {}
            }
        }
        with patch('cli.utils.config.get_merged_config', return_value=config):
            profiles = list_profiles()
            assert len(profiles) == 3
            assert "default" in profiles
            assert "development" in profiles
            assert "production" in profiles


class TestDefaultConfig:
    """Test default configuration creation."""
    
    def test_create_default_config(self):
        """Test creating default configuration."""
        config = create_default_config()
        
        assert "comfyui" in config
        assert "logging" in config
        assert "general" in config
        assert "profiles" in config
        
        assert config["comfyui"]["url"] == "http://127.0.0.1:8188"
        assert config["logging"]["level"] == "INFO"
        assert config["general"]["mock_mode"] is False
        
        assert "default" in config["profiles"]
        assert "development" in config["profiles"]
        assert "production" in config["profiles"]


class TestConfigInspection:
    """Test configuration inspection."""
    
    def test_inspect_config(self):
        """Test inspecting configuration."""
        with patch('cli.utils.config.load_config') as mock_load:
            with patch('cli.utils.config.get_environment_overrides') as mock_env:
                mock_load.return_value = {"test": "value"}
                mock_env.return_value = {"env": "override"}
                
                inspection = inspect_config()
                
                assert "sources" in inspection
                assert "merged" in inspection
                assert "active_profile" in inspection
                assert "profiles_available" in inspection
                assert "config_paths" in inspection
                
                assert "global" in inspection["sources"]
                assert "project" in inspection["sources"]
                assert "environment" in inspection["sources"]
