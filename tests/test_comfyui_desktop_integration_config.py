"""
Tests for ComfyUI Desktop Integration Configuration

Tests the ComfyUIConfig dataclass and ConfigurationManager functionality.
"""

import os
import json
import pytest
import tempfile
from pathlib import Path

from src.comfyui_desktop_integration_config import (
    ComfyUIConfig,
    ConfigurationManager,
    FallbackMode
)


class TestComfyUIConfig:
    """Test ComfyUIConfig dataclass"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = ComfyUIConfig.default()
        
        assert config.host == "localhost"
        assert config.port == 8000
        assert config.timeout == 30
        assert config.max_retries == 3
        assert config.retry_backoff == 2.0
        assert config.fallback_mode == "placeholder"
        assert config.health_check_interval == 5
    
    def test_url_property(self):
        """Test URL property generation"""
        config = ComfyUIConfig(host="192.168.1.100", port=8188)
        assert config.url == "http://192.168.1.100:8188"
    
    def test_websocket_url_property(self):
        """Test WebSocket URL property generation"""
        config = ComfyUIConfig(host="localhost", port=8000)
        assert config.websocket_url == "ws://localhost:8000/ws"
    
    def test_validate_valid_config(self):
        """Test validation of valid configuration"""
        config = ComfyUIConfig.default()
        errors = config.validate()
        assert len(errors) == 0
    
    def test_validate_invalid_port(self):
        """Test validation catches invalid port"""
        config = ComfyUIConfig(port=70000)
        errors = config.validate()
        assert any("port" in error.lower() for error in errors)
    
    def test_validate_invalid_timeout(self):
        """Test validation catches invalid timeout"""
        config = ComfyUIConfig(timeout=-5)
        errors = config.validate()
        assert any("timeout" in error.lower() for error in errors)
    
    def test_validate_invalid_fallback_mode(self):
        """Test validation catches invalid fallback mode"""
        config = ComfyUIConfig(fallback_mode="invalid_mode")
        errors = config.validate()
        assert any("fallback_mode" in error.lower() for error in errors)
    
    def test_to_dict(self):
        """Test conversion to dictionary"""
        config = ComfyUIConfig(host="testhost", port=9000)
        config_dict = config.to_dict()
        
        assert isinstance(config_dict, dict)
        assert config_dict['host'] == "testhost"
        assert config_dict['port'] == 9000
    
    def test_from_file(self):
        """Test loading configuration from file"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "test_config.json"
            
            # Create test config file
            test_config = {
                "host": "testhost",
                "port": 9000,
                "timeout": 60,
                "max_retries": 5,
                "fallback_mode": "abort"
            }
            
            with open(config_path, 'w') as f:
                json.dump(test_config, f)
            
            # Load config
            config = ComfyUIConfig.from_file(config_path)
            
            assert config.host == "testhost"
            assert config.port == 9000
            assert config.timeout == 60
            assert config.max_retries == 5
            assert config.fallback_mode == "abort"
    
    def test_from_file_not_found(self):
        """Test loading from non-existent file raises error"""
        with pytest.raises(FileNotFoundError):
            ComfyUIConfig.from_file(Path("/nonexistent/config.json"))
    
    def test_from_file_malformed_json(self):
        """Test loading from file with malformed JSON raises error"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "malformed_config.json"
            
            # Create malformed JSON file
            with open(config_path, 'w') as f:
                f.write('{"host": "test", "port": 8000,}')  # Trailing comma is invalid JSON
            
            # Should raise JSONDecodeError
            with pytest.raises(json.JSONDecodeError):
                ComfyUIConfig.from_file(config_path)
    
    def test_from_file_invalid_parameters(self):
        """Test loading from file with invalid parameters raises error"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "invalid_config.json"
            
            # Create config with invalid parameter
            test_config = {
                "host": "testhost",
                "port": 9000,
                "invalid_param": "should_fail"
            }
            
            with open(config_path, 'w') as f:
                json.dump(test_config, f)
            
            # Should raise ValueError due to unexpected parameter
            with pytest.raises(ValueError):
                ComfyUIConfig.from_file(config_path)
    
    def test_save_to_file(self):
        """Test saving configuration to file"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "saved_config.json"
            
            config = ComfyUIConfig(host="savehost", port=8888)
            config.save_to_file(config_path)
            
            assert config_path.exists()
            
            # Load and verify
            with open(config_path, 'r') as f:
                saved_data = json.load(f)
            
            assert saved_data['host'] == "savehost"
            assert saved_data['port'] == 8888
    
    def test_from_env(self):
        """Test loading configuration from environment variables"""
        # Set environment variables
        os.environ['COMFYUI_HOST'] = 'envhost'
        os.environ['COMFYUI_PORT'] = '7777'
        os.environ['COMFYUI_TIMEOUT'] = '45'
        os.environ['COMFYUI_MAX_RETRIES'] = '10'
        os.environ['COMFYUI_AUTO_DOWNLOAD'] = 'false'
        os.environ['COMFYUI_FALLBACK_MODE'] = 'skip'
        
        try:
            config = ComfyUIConfig.from_env()
            
            assert config.host == 'envhost'
            assert config.port == 7777
            assert config.timeout == 45
            assert config.max_retries == 10
            assert config.auto_download_models is False
            assert config.fallback_mode == 'skip'
        finally:
            # Clean up environment variables
            for key in ['COMFYUI_HOST', 'COMFYUI_PORT', 'COMFYUI_TIMEOUT', 
                       'COMFYUI_MAX_RETRIES', 'COMFYUI_AUTO_DOWNLOAD', 'COMFYUI_FALLBACK_MODE']:
                os.environ.pop(key, None)
    
    def test_get_fallback_mode_enum(self):
        """Test conversion of fallback mode to enum"""
        config = ComfyUIConfig(fallback_mode="placeholder")
        assert config.get_fallback_mode_enum() == FallbackMode.PLACEHOLDER
        
        config = ComfyUIConfig(fallback_mode="skip")
        assert config.get_fallback_mode_enum() == FallbackMode.SKIP
        
        config = ComfyUIConfig(fallback_mode="abort")
        assert config.get_fallback_mode_enum() == FallbackMode.ABORT


class TestConfigurationManager:
    """Test ConfigurationManager class"""
    
    def test_load_config_defaults(self):
        """Test loading configuration with defaults"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir)
            manager = ConfigurationManager(config_dir=config_dir)
            
            config = manager.load_config(use_env=False)
            
            assert config.host == "localhost"
            assert config.port == 8000
    
    def test_load_config_from_file(self):
        """Test loading configuration from file"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir)
            config_file = config_dir / "comfyui.json"
            
            # Create config file
            config_dir.mkdir(parents=True, exist_ok=True)
            test_config = {
                "host": "filehost",
                "port": 8080,
                "timeout": 50
            }
            with open(config_file, 'w') as f:
                json.dump(test_config, f)
            
            manager = ConfigurationManager(config_dir=config_dir)
            config = manager.load_config(use_env=False)
            
            assert config.host == "filehost"
            assert config.port == 8080
            assert config.timeout == 50
    
    def test_load_config_with_env_override(self):
        """Test environment variable override precedence"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir)
            config_file = config_dir / "comfyui.json"
            
            # Create config file
            config_dir.mkdir(parents=True, exist_ok=True)
            test_config = {
                "host": "filehost",
                "port": 8080
            }
            with open(config_file, 'w') as f:
                json.dump(test_config, f)
            
            # Set environment variable
            os.environ['COMFYUI_PORT'] = '9999'
            
            try:
                manager = ConfigurationManager(config_dir=config_dir)
                config = manager.load_config(use_env=True)
                
                # File value should be used for host
                assert config.host == "filehost"
                # Environment variable should override port
                assert config.port == 9999
            finally:
                os.environ.pop('COMFYUI_PORT', None)
    
    def test_precedence_order(self):
        """Test complete precedence order: env > file > defaults"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir)
            config_file = config_dir / "comfyui.json"
            
            # Create config file with custom values
            config_dir.mkdir(parents=True, exist_ok=True)
            test_config = {
                "host": "filehost",
                "port": 8080,
                "timeout": 50,
                "max_retries": 5
            }
            with open(config_file, 'w') as f:
                json.dump(test_config, f)
            
            # Set some environment variables
            os.environ['COMFYUI_PORT'] = '9999'
            os.environ['COMFYUI_TIMEOUT'] = '100'
            
            try:
                manager = ConfigurationManager(config_dir=config_dir)
                config = manager.load_config(use_env=True)
                
                # host: from file (no env override)
                assert config.host == "filehost"
                
                # port: from env (overrides file)
                assert config.port == 9999
                
                # timeout: from env (overrides file)
                assert config.timeout == 100
                
                # max_retries: from file (no env override)
                assert config.max_retries == 5
                
                # retry_backoff: from defaults (not in file or env)
                assert config.retry_backoff == 2.0
            finally:
                os.environ.pop('COMFYUI_PORT', None)
                os.environ.pop('COMFYUI_TIMEOUT', None)
    
    def test_save_config(self):
        """Test saving configuration"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir)
            manager = ConfigurationManager(config_dir=config_dir)
            
            config = ComfyUIConfig(host="savedhost", port=7000)
            manager.save_config(config)
            
            # Verify file was created
            assert manager.config_file.exists()
            
            # Load and verify
            loaded_config = ComfyUIConfig.from_file(manager.config_file)
            assert loaded_config.host == "savedhost"
            assert loaded_config.port == 7000
    
    def test_create_default_config_file(self):
        """Test creating default configuration file"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir)
            manager = ConfigurationManager(config_dir=config_dir)
            
            manager.create_default_config_file()
            
            assert manager.config_file.exists()
            
            # Verify it contains default values
            config = ComfyUIConfig.from_file(manager.config_file)
            assert config.host == "localhost"
            assert config.port == 8000
    
    def test_config_property(self):
        """Test config property accessor"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir)
            manager = ConfigurationManager(config_dir=config_dir)
            
            # First access should load config
            config = manager.config
            assert config is not None
            assert config.host == "localhost"
            
            # Second access should return cached config
            config2 = manager.config
            assert config2 is config
    
    def test_ensure_config_exists(self):
        """Test ensure_config_exists creates file if missing"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir)
            manager = ConfigurationManager(config_dir=config_dir)
            
            # File should not exist initially
            assert not manager.config_file.exists()
            
            # Call ensure_config_exists
            config_path = manager.ensure_config_exists()
            
            # File should now exist
            assert manager.config_file.exists()
            assert config_path == manager.config_file
            
            # Calling again should be idempotent
            config_path2 = manager.ensure_config_exists()
            assert config_path2 == config_path


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
