"""
Unit tests for Feedback Configuration Manager

Tests the configuration loading, saving, and access functionality.

Requirements: 7.3
"""

import json
import tempfile
from pathlib import Path
import sys
import pytest

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent))

import feedback_config
from feedback_config import FeedbackConfig, initialize_config, get_config


@pytest.fixture(autouse=True)
def reset_global_config():
    """Reset global config instance before each test."""
    feedback_config._global_config = None
    yield
    feedback_config._global_config = None


class TestFeedbackConfig:
    """Unit tests for FeedbackConfig class."""
    
    def test_default_config_creation(self):
        """Test that default config is created when file doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            # Check that config file was created
            assert config_path.exists()
            
            # Check default values
            assert config.backend_proxy_url == "http://localhost:3000"
            assert config.default_mode == "manual"
            assert config.auto_collect_logs is True
            assert config.max_log_lines == 500
            assert config.screenshot_max_size_mb == 5
            assert config.enable_crash_reports is True
            assert config.privacy_consent_given is False
    
    def test_load_existing_config(self):
        """Test loading existing configuration file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            
            # Create a config file with custom values
            custom_config = {
                "feedback": {
                    "backend_proxy_url": "https://custom.example.com",
                    "default_mode": "automatic",
                    "auto_collect_logs": False,
                    "max_log_lines": 1000,
                    "screenshot_max_size_mb": 10,
                    "enable_crash_reports": False,
                    "privacy_consent_given": True
                }
            }
            
            with open(config_path, 'w') as f:
                json.dump(custom_config, f)
            
            # Load config
            config = FeedbackConfig(config_path)
            
            # Check custom values were loaded
            assert config.backend_proxy_url == "https://custom.example.com"
            assert config.default_mode == "automatic"
            assert config.auto_collect_logs is False
            assert config.max_log_lines == 1000
            assert config.screenshot_max_size_mb == 10
            assert config.enable_crash_reports is False
            assert config.privacy_consent_given is True
    
    def test_merge_with_defaults(self):
        """Test that partial config is merged with defaults."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            
            # Create a config file with only some values
            partial_config = {
                "feedback": {
                    "backend_proxy_url": "https://custom.example.com",
                    "default_mode": "automatic"
                }
            }
            
            with open(config_path, 'w') as f:
                json.dump(partial_config, f)
            
            # Load config
            config = FeedbackConfig(config_path)
            
            # Check custom values
            assert config.backend_proxy_url == "https://custom.example.com"
            assert config.default_mode == "automatic"
            
            # Check default values for missing keys
            assert config.auto_collect_logs is True
            assert config.max_log_lines == 500
            assert config.screenshot_max_size_mb == 5
            
            # Reload to verify merge was saved
            config2 = FeedbackConfig(config_path)
            assert config2.auto_collect_logs is True
    
    def test_get_and_set(self):
        """Test get and set methods."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            # Test get
            assert config.get("backend_proxy_url") == "http://localhost:3000"
            
            # Test set
            config.set("backend_proxy_url", "https://new.example.com")
            assert config.get("backend_proxy_url") == "https://new.example.com"
            
            # Verify it was saved to file
            with open(config_path, 'r') as f:
                saved_config = json.load(f)
            assert saved_config["feedback"]["backend_proxy_url"] == "https://new.example.com"
    
    def test_update_multiple_values(self):
        """Test updating multiple values at once."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            # Update multiple values
            updates = {
                "backend_proxy_url": "https://updated.example.com",
                "default_mode": "automatic",
                "max_log_lines": 1000
            }
            config.update(updates)
            
            # Verify updates
            assert config.backend_proxy_url == "https://updated.example.com"
            assert config.default_mode == "automatic"
            assert config.max_log_lines == 1000
    
    def test_property_setters(self):
        """Test property setters."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            # Test backend_proxy_url
            config.backend_proxy_url = "https://test.example.com"
            assert config.backend_proxy_url == "https://test.example.com"
            
            # Test default_mode
            config.default_mode = "automatic"
            assert config.default_mode == "automatic"
            
            # Test auto_collect_logs
            config.auto_collect_logs = False
            assert config.auto_collect_logs is False
            
            # Test max_log_lines
            config.max_log_lines = 1000
            assert config.max_log_lines == 1000
            
            # Test screenshot_max_size_mb
            config.screenshot_max_size_mb = 10
            assert config.screenshot_max_size_mb == 10
            
            # Test enable_crash_reports
            config.enable_crash_reports = False
            assert config.enable_crash_reports is False
            
            # Test privacy_consent_given
            config.privacy_consent_given = True
            assert config.privacy_consent_given is True
    
    def test_invalid_default_mode(self):
        """Test that invalid default_mode raises ValueError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            with pytest.raises(ValueError, match="must be 'manual' or 'automatic'"):
                config.default_mode = "invalid"
    
    def test_invalid_max_log_lines(self):
        """Test that negative max_log_lines raises ValueError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            with pytest.raises(ValueError, match="must be non-negative"):
                config.max_log_lines = -1
    
    def test_invalid_screenshot_max_size(self):
        """Test that invalid screenshot_max_size_mb raises ValueError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            with pytest.raises(ValueError, match="must be at least 1"):
                config.screenshot_max_size_mb = 0
    
    def test_reset_to_defaults(self):
        """Test resetting configuration to defaults."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            # Modify some values
            config.backend_proxy_url = "https://custom.example.com"
            config.default_mode = "automatic"
            config.privacy_consent_given = True
            
            # Reset to defaults
            config.reset_to_defaults()
            
            # Verify defaults
            assert config.backend_proxy_url == "http://localhost:3000"
            assert config.default_mode == "manual"
            assert config.privacy_consent_given is False
    
    def test_get_all(self):
        """Test getting all configuration values."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            config = FeedbackConfig(config_path)
            
            all_config = config.get_all()
            
            # Check that all keys are present
            assert "backend_proxy_url" in all_config
            assert "default_mode" in all_config
            assert "auto_collect_logs" in all_config
            assert "max_log_lines" in all_config
            assert "screenshot_max_size_mb" in all_config
            assert "enable_crash_reports" in all_config
            assert "privacy_consent_given" in all_config
    
    def test_invalid_json_fallback(self):
        """Test that invalid JSON falls back to defaults."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"
            
            # Create invalid JSON file
            with open(config_path, 'w') as f:
                f.write("{ invalid json }")
            
            # Load config - should fall back to defaults
            config = FeedbackConfig(config_path)
            
            # Check default values
            assert config.backend_proxy_url == "http://localhost:3000"
            assert config.default_mode == "manual"


class TestGlobalConfig:
    """Tests for global configuration instance."""
    
    def test_get_config_singleton(self):
        """Test that get_config returns singleton instance."""
        config1 = get_config()
        config2 = get_config()
        
        # Should be the same instance
        assert config1 is config2
    
    def test_initialize_config(self):
        """Test initialize_config with custom path."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "custom_config.json"
            
            config = initialize_config(config_path)
            
            # Check that config file was created at custom path
            assert config_path.exists()
            
            # Check that get_config returns the same instance
            assert get_config() is config


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
