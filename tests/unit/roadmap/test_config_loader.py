"""
Unit tests for ConfigLoader.

Tests configuration loading from YAML files, CLI overrides, and default values.
"""

import pytest
from pathlib import Path
import tempfile
import yaml

from src.roadmap.config_loader import ConfigLoader
from src.roadmap.models import RoadmapConfig, FeatureStatus, Priority


class TestConfigLoader:
    """Test suite for ConfigLoader."""
    
    def test_load_default_config(self):
        """Test loading default configuration when no config file exists."""
        # Load config with non-existent path
        config = ConfigLoader.load_config(
            config_path=Path("/nonexistent/config.yaml")
        )
        
        # Verify default values
        assert config.specs_directory == Path(".kiro/specs")
        assert config.output_path == Path("ROADMAP.md")
        assert config.changelog_path == Path("CHANGELOG.md")
        assert config.include_future is True
        assert config.max_description_length == 300
        assert len(config.status_emoji) == 4
        assert len(config.priority_emoji) == 3
    
    def test_load_yaml_config(self):
        """Test loading configuration from YAML file."""
        # Create temporary config file
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yaml',
            delete=False
        ) as f:
            yaml_content = {
                "specs_directory": "custom/specs",
                "output_path": "docs/ROADMAP.md",
                "changelog_path": "docs/CHANGELOG.md",
                "include_future": False,
                "max_description_length": 500
            }
            yaml.dump(yaml_content, f)
            config_path = Path(f.name)
        
        try:
            # Load config
            config = ConfigLoader.load_config(config_path=config_path)
            
            # Verify custom values
            assert config.specs_directory == Path("custom/specs")
            assert config.output_path == Path("docs/ROADMAP.md")
            assert config.changelog_path == Path("docs/CHANGELOG.md")
            assert config.include_future is False
            assert config.max_description_length == 500
        finally:
            # Clean up
            config_path.unlink()
    
    def test_cli_overrides(self):
        """Test CLI flag overrides take precedence."""
        # Create temporary config file
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yaml',
            delete=False
        ) as f:
            yaml_content = {
                "specs_directory": "yaml/specs",
                "output_path": "yaml/ROADMAP.md",
                "max_description_length": 200
            }
            yaml.dump(yaml_content, f)
            config_path = Path(f.name)
        
        try:
            # Load config with CLI overrides
            cli_overrides = {
                "output_path": "cli/ROADMAP.md",
                "max_description_length": 400
            }
            config = ConfigLoader.load_config(
                config_path=config_path,
                cli_overrides=cli_overrides
            )
            
            # Verify CLI overrides take precedence
            assert config.specs_directory == Path("yaml/specs")  # From YAML
            assert config.output_path == Path("cli/ROADMAP.md")  # From CLI
            assert config.max_description_length == 400  # From CLI
        finally:
            # Clean up
            config_path.unlink()
    
    def test_custom_emoji_config(self):
        """Test loading custom emoji configuration."""
        # Create temporary config file with custom emoji
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yaml',
            delete=False
        ) as f:
            yaml_content = {
                "status_emoji": {
                    "completed": "✔️",
                    "in-progress": "⏳",
                    "planned": "📝",
                    "future": "🔮"
                },
                "priority_emoji": {
                    "High": "🚨",
                    "Medium": "⚠️",
                    "Low": "ℹ️"
                }
            }
            yaml.dump(yaml_content, f)
            config_path = Path(f.name)
        
        try:
            # Load config
            config = ConfigLoader.load_config(config_path=config_path)
            
            # Verify custom emoji
            assert config.status_emoji[FeatureStatus.COMPLETED] == "✔️"
            assert config.status_emoji[FeatureStatus.IN_PROGRESS] == "⏳"
            assert config.priority_emoji[Priority.HIGH] == "🚨"
            assert config.priority_emoji[Priority.MEDIUM] == "⚠️"
        finally:
            # Clean up
            config_path.unlink()
    
    def test_partial_emoji_config(self):
        """Test partial emoji configuration uses defaults for missing values."""
        # Create temporary config file with partial emoji
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yaml',
            delete=False
        ) as f:
            yaml_content = {
                "status_emoji": {
                    "completed": "✔️"
                    # Other statuses missing
                }
            }
            yaml.dump(yaml_content, f)
            config_path = Path(f.name)
        
        try:
            # Load config
            config = ConfigLoader.load_config(config_path=config_path)
            
            # Verify custom emoji for completed
            assert config.status_emoji[FeatureStatus.COMPLETED] == "✔️"
            
            # Verify defaults for others
            assert config.status_emoji[FeatureStatus.IN_PROGRESS] == "🚧"
            assert config.status_emoji[FeatureStatus.PLANNED] == "📋"
            assert config.status_emoji[FeatureStatus.FUTURE] == "💡"
        finally:
            # Clean up
            config_path.unlink()
    
    def test_invalid_max_description_length(self):
        """Test invalid max_description_length falls back to default."""
        # Create temporary config file with invalid value
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yaml',
            delete=False
        ) as f:
            yaml_content = {
                "max_description_length": -100  # Invalid
            }
            yaml.dump(yaml_content, f)
            config_path = Path(f.name)
        
        try:
            # Load config
            config = ConfigLoader.load_config(config_path=config_path)
            
            # Verify default value is used
            assert config.max_description_length == 300
        finally:
            # Clean up
            config_path.unlink()
    
    def test_malformed_yaml(self):
        """Test malformed YAML file falls back to defaults."""
        # Create temporary file with malformed YAML
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yaml',
            delete=False
        ) as f:
            f.write("invalid: yaml: content: [")
            config_path = Path(f.name)
        
        try:
            # Load config (should not raise exception)
            config = ConfigLoader.load_config(config_path=config_path)
            
            # Verify default values are used
            assert config.specs_directory == Path(".kiro/specs")
            assert config.output_path == Path("ROADMAP.md")
        finally:
            # Clean up
            config_path.unlink()
    
    def test_create_default_config_file(self):
        """Test creating a default configuration file."""
        # Create temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "roadmap-config.yaml"
            
            # Create default config file
            ConfigLoader.create_default_config_file(config_path)
            
            # Verify file was created
            assert config_path.exists()
            
            # Verify file contains valid YAML
            with open(config_path, 'r') as f:
                yaml_content = yaml.safe_load(f)
            
            assert isinstance(yaml_content, dict)
            assert "specs_directory" in yaml_content
            assert "output_path" in yaml_content
            assert "status_emoji" in yaml_content
            assert "priority_emoji" in yaml_content
    
    def test_merge_nested_configs(self):
        """Test merging nested configuration dictionaries."""
        base = {
            "specs_directory": "base/specs",
            "status_emoji": {
                "completed": "✅",
                "in-progress": "🚧"
            }
        }
        
        override = {
            "output_path": "override/ROADMAP.md",
            "status_emoji": {
                "completed": "✔️"  # Override one emoji
            }
        }
        
        # Merge configs
        merged = ConfigLoader._merge_configs(base, override)
        
        # Verify merge results
        assert merged["specs_directory"] == "base/specs"  # From base
        assert merged["output_path"] == "override/ROADMAP.md"  # From override
        assert merged["status_emoji"]["completed"] == "✔️"  # Overridden
        assert merged["status_emoji"]["in-progress"] == "🚧"  # From base
    
    def test_config_precedence(self):
        """Test configuration precedence: CLI > YAML > Defaults."""
        # Create temporary config file
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.yaml',
            delete=False
        ) as f:
            yaml_content = {
                "specs_directory": "yaml/specs",
                "output_path": "yaml/ROADMAP.md",
                "changelog_path": "yaml/CHANGELOG.md"
            }
            yaml.dump(yaml_content, f)
            config_path = Path(f.name)
        
        try:
            # Load config with partial CLI overrides
            cli_overrides = {
                "output_path": "cli/ROADMAP.md"
            }
            config = ConfigLoader.load_config(
                config_path=config_path,
                cli_overrides=cli_overrides
            )
            
            # Verify precedence
            assert config.specs_directory == Path("yaml/specs")  # From YAML
            assert config.output_path == Path("cli/ROADMAP.md")  # From CLI (highest)
            assert config.changelog_path == Path("yaml/CHANGELOG.md")  # From YAML
            assert config.include_future is True  # From defaults
        finally:
            # Clean up
            config_path.unlink()
