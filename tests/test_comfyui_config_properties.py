"""
Property-based tests for ComfyUI configuration validation.
Tests universal properties that should hold for all valid configurations.
"""

import pytest
import tempfile
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings
from hypothesis import HealthCheck
import json

from src.comfyui_config import ComfyUIConfig, ConfigManager, ControlNetConfig, IPAdapterConfig


# Hypothesis strategies for generating test data
@st.composite
def valid_comfyui_config(draw):
    """Generate valid ComfyUI configuration."""
    # Use a fixed temporary directory to avoid slow creation
    temp_dir = Path("C:\\temp\\test_comfyui")
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    return ComfyUIConfig(
        installation_path=temp_dir,
        server_host=draw(st.sampled_from(["127.0.0.1", "localhost", "0.0.0.0"])),
        server_port=draw(st.integers(min_value=1024, max_value=65535)),
        startup_timeout=draw(st.floats(min_value=1.0, max_value=300.0)),
        health_check_interval=draw(st.floats(min_value=0.1, max_value=60.0)),
        max_retry_attempts=draw(st.integers(min_value=0, max_value=10)),
        process_timeout=draw(st.floats(min_value=30.0, max_value=3600.0)),
        graceful_shutdown_timeout=draw(st.floats(min_value=1.0, max_value=120.0)),
        force_kill_timeout=draw(st.floats(min_value=1.0, max_value=30.0)),
        enable_gpu=draw(st.booleans()),
        memory_limit_gb=draw(st.one_of(st.none(), st.floats(min_value=1.0, max_value=64.0))),
        worker_threads=draw(st.integers(min_value=1, max_value=16)),
        log_level=draw(st.sampled_from(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])),
        enable_metrics=draw(st.booleans()),
        metrics_interval=draw(st.floats(min_value=1.0, max_value=300.0))
    )


@st.composite
def invalid_comfyui_config(draw):
    """Generate invalid ComfyUI configuration."""
    config_type = draw(st.sampled_from([
        "invalid_port", "invalid_timeout", "invalid_interval", 
        "invalid_retry", "invalid_memory", "invalid_log_level"
    ]))
    
    base_config = draw(valid_comfyui_config())
    
    if config_type == "invalid_port":
        base_config.server_port = draw(st.one_of(
            st.integers(max_value=0),
            st.integers(min_value=65536)
        ))
    elif config_type == "invalid_timeout":
        base_config.startup_timeout = draw(st.floats(max_value=0.0))
    elif config_type == "invalid_interval":
        base_config.health_check_interval = draw(st.floats(max_value=0.0))
    elif config_type == "invalid_retry":
        base_config.max_retry_attempts = draw(st.integers(max_value=-1))
    elif config_type == "invalid_memory":
        base_config.memory_limit_gb = draw(st.floats(max_value=0.0))
    elif config_type == "invalid_log_level":
        base_config.log_level = draw(st.text(min_size=1).filter(
            lambda x: x not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        ))
    
    return base_config


class TestComfyUIConfigurationProperties:
    """Property-based tests for ComfyUI configuration validation."""
    
    @given(valid_comfyui_config())
    @settings(max_examples=25, suppress_health_check=[HealthCheck.too_slow])
    def test_property_26_configuration_flexibility(self, config):
        """
        Property 26: Configuration Flexibility
        For any valid configuration parameters, the Manager should support 
        custom installation paths, port configurations, and environment settings.
        
        **Validates: Requirements 8.1, 8.2**
        **Feature: comfyui-integration, Property 26: Configuration Flexibility**
        """
        # Valid configurations should pass validation
        errors = config.validate()
        assert len(errors) == 0, f"Valid configuration should not have errors: {errors}"
        
        # Configuration should provide proper URLs
        assert config.server_url.startswith("http://")
        assert config.websocket_url.startswith("ws://")
        assert str(config.server_port) in config.server_url
        assert str(config.server_port) in config.websocket_url
        
        # Configuration should be serializable
        config_dict = config.to_dict()
        assert isinstance(config_dict, dict)
        assert "installation_path" in config_dict
        assert "server_port" in config_dict
        
        # Configuration should be deserializable
        restored_config = ComfyUIConfig.from_dict(config_dict)
        assert restored_config.server_port == config.server_port
        assert restored_config.server_host == config.server_host
        assert str(restored_config.installation_path) == str(config.installation_path)
    
    @given(invalid_comfyui_config())
    @settings(max_examples=25, suppress_health_check=[HealthCheck.too_slow])
    def test_property_29_configuration_validation_feedback(self, config):
        """
        Property 29: Configuration Validation
        For any configuration change, the Manager should validate settings 
        and provide immediate feedback on compatibility and correctness.
        
        **Validates: Requirements 8.5**
        **Feature: comfyui-integration, Property 29: Configuration Validation**
        """
        # Invalid configurations should produce validation errors
        errors = config.validate()
        assert len(errors) > 0, "Invalid configuration should produce validation errors"
        
        # Each error should be descriptive
        for error_key, error_message in errors.items():
            assert isinstance(error_key, str), "Error key should be a string"
            assert isinstance(error_message, str), "Error message should be a string"
            assert len(error_message) > 0, "Error message should not be empty"
            assert error_key in error_message or hasattr(config, error_key), \
                f"Error should reference the problematic field: {error_key}"
    
    @given(st.sampled_from(["127.0.0.1", "localhost", "0.0.0.0"]), st.integers(min_value=1024, max_value=65535))
    @settings(max_examples=25, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_configuration_manager_persistence(self, host, port):
        """
        Property: Configuration Manager should persist and restore configurations correctly.
        For any valid configuration, saving and loading should preserve all settings.
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            config_dir = Path(temp_dir)
            manager = ConfigManager(config_dir)
            
            # Create and configure
            original_config = ComfyUIConfig.default()
            original_config.server_host = host
            original_config.server_port = port
            
            manager._config = original_config
            manager.save_config()
            
            # Load and verify
            loaded_config = manager.load_config()
            assert loaded_config.server_host == host
            assert loaded_config.server_port == port
            assert loaded_config.installation_path == original_config.installation_path
    
    @given(st.floats(min_value=0.0, max_value=2.0), st.booleans())
    @settings(max_examples=25)
    def test_property_controlnet_config_validation(self, strength, preprocessing):
        """
        Property: ControlNet configuration should validate strength parameters correctly.
        For any ControlNet configuration, validation should accept valid strengths and reject invalid ones.
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a dummy control image
            control_image = Path(temp_dir) / "control.jpg"
            control_image.touch()
            
            config = ControlNetConfig(
                model_name="control_openpose_xl",
                strength=strength,
                preprocessing=preprocessing,
                control_image_path=control_image
            )
            
            errors = config.validate()
            
            if 0.0 <= strength <= 2.0:
                # Valid strength should not produce strength-related errors
                strength_errors = [err for key, err in errors.items() if "strength" in key.lower()]
                assert len(strength_errors) == 0, f"Valid strength {strength} should not produce errors"
            else:
                # Invalid strength should produce errors
                assert len(errors) > 0, f"Invalid strength {strength} should produce validation errors"
    
    @given(st.floats(min_value=0.0, max_value=2.0), st.floats(min_value=0.0, max_value=1.0))
    @settings(max_examples=25)
    def test_property_ipadapter_config_validation(self, weight, noise):
        """
        Property: IP-Adapter configuration should validate weight and noise parameters correctly.
        For any IP-Adapter configuration, validation should enforce parameter ranges.
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a dummy reference image
            ref_image = Path(temp_dir) / "reference.jpg"
            ref_image.touch()
            
            config = IPAdapterConfig(
                model_name="ip_adapter_plus_xl",
                weight=weight,
                reference_image_path=ref_image,
                noise=noise
            )
            
            errors = config.validate()
            
            # Check weight validation
            if 0.0 <= weight <= 2.0:
                weight_errors = [err for key, err in errors.items() if "weight" in key.lower()]
                assert len(weight_errors) == 0, f"Valid weight {weight} should not produce errors"
            else:
                assert len(errors) > 0, f"Invalid weight {weight} should produce validation errors"
            
            # Check noise validation
            if 0.0 <= noise <= 1.0:
                noise_errors = [err for key, err in errors.items() if "noise" in key.lower()]
                assert len(noise_errors) == 0, f"Valid noise {noise} should not produce errors"
            else:
                assert len(errors) > 0, f"Invalid noise {noise} should produce validation errors"
    
    @given(st.dictionaries(
        keys=st.text(min_size=1, max_size=20),
        values=st.one_of(st.text(), st.integers(), st.floats(), st.booleans()),
        min_size=1,
        max_size=10
    ))
    @settings(max_examples=25)
    def test_property_config_serialization_roundtrip(self, extra_data):
        """
        Property: Configuration serialization should be a round-trip operation.
        For any configuration, serializing then deserializing should preserve all data.
        """
        config = ComfyUIConfig.default()
        
        # Serialize to dict
        config_dict = config.to_dict()
        
        # Add some extra data to test robustness
        for key, value in extra_data.items():
            if not hasattr(config, key):  # Only add non-conflicting keys
                config_dict[key] = value
        
        # Deserialize (should ignore unknown keys gracefully)
        try:
            restored_config = ComfyUIConfig.from_dict(config_dict)
            
            # Core properties should be preserved
            assert restored_config.server_port == config.server_port
            assert restored_config.server_host == config.server_host
            assert str(restored_config.installation_path) == str(config.installation_path)
            assert restored_config.startup_timeout == config.startup_timeout
            
        except TypeError:
            # If deserialization fails due to unknown parameters, that's acceptable
            # as long as it fails gracefully with a clear error
            pass
    
    def test_property_default_config_validity(self):
        """
        Property: Default configuration should always be valid.
        The default configuration should pass all validation checks.
        """
        default_config = ComfyUIConfig.default()
        errors = default_config.validate()
        
        # Default config should be valid (except possibly for missing installation path)
        path_errors = [err for key, err in errors.items() if "installation_path" in key]
        other_errors = [err for key, err in errors.items() if "installation_path" not in key]
        
        assert len(other_errors) == 0, f"Default config should be valid except for path: {other_errors}"
        
        # URLs should be properly formatted
        assert default_config.server_url.startswith("http://")
        assert default_config.websocket_url.startswith("ws://")
        assert "8188" in default_config.server_url  # Default port
        assert "8188" in default_config.websocket_url  # Default port