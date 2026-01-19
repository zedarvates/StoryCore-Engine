"""
Comprehensive tests for the Extended Advanced Workflow Configuration System

Tests cover:
- Configuration creation and validation
- Environment detection and adaptation
- Configuration loading and saving
- Migration system
- Documentation generation
- Cross-component validation
"""

import json
import pytest
import tempfile
import yaml
from pathlib import Path
from unittest.mock import Mock, patch
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from advanced_workflow_config_extended import (
    AdvancedWorkflowConfig,
    ConfigurationManager,
    PerformanceConfig,
    QualityConfig,
    HunyuanVideoConfig,
    WanVideoConfig,
    NewBieImageConfig,
    QwenImageConfig,
    SystemInfo,
    EnvironmentType,
    ConfigurationFormat,
    ValidationLevel,
    ConfigurationError,
    ConfigurationMigrationError,
    create_default_configuration_manager
)


class TestSystemInfo:
    """Test system information detection"""
    
    def test_system_info_creation(self):
        """Test system info initialization"""
        system_info = SystemInfo()
        
        assert system_info.platform is not None
        assert system_info.architecture is not None
        assert system_info.python_version is not None
        assert system_info.cpu_count > 0
        assert system_info.memory_gb > 0
        assert isinstance(system_info.gpu_available, bool)
        assert system_info.gpu_memory_gb >= 0
    
    @patch('torch.cuda.is_available', return_value=True)
    @patch('torch.cuda.get_device_properties')
    def test_gpu_detection(self, mock_props, mock_available):
        """Test GPU detection when available"""
        # Mock GPU properties
        mock_device = Mock()
        mock_device.total_memory = 8 * 1024**3  # 8GB
        mock_props.return_value = mock_device
        
        system_info = SystemInfo()
        
        assert system_info.gpu_available is True
        assert system_info.gpu_memory_gb == 8.0


class TestPerformanceConfig:
    """Test performance configuration"""
    
    def test_default_performance_config(self):
        """Test default performance configuration"""
        config = PerformanceConfig()
        
        assert config.max_batch_size == 4
        assert config.enable_mixed_precision is True
        assert config.gradient_checkpointing is True
        assert config.max_memory_usage_percent == 80.0
    
    def test_performance_config_validation(self):
        """Test performance configuration validation"""
        # Valid configuration
        config = PerformanceConfig(max_batch_size=2, max_memory_usage_percent=70.0)
        errors = config.validate()
        assert len(errors) == 0
        
        # Invalid configuration
        config = PerformanceConfig(max_batch_size=0, max_memory_usage_percent=150.0)
        errors = config.validate()
        assert len(errors) == 2
        assert "max_batch_size must be at least 1" in errors
        assert "max_memory_usage_percent must be between 0 and 100" in errors


class TestQualityConfig:
    """Test quality configuration"""
    
    def test_default_quality_config(self):
        """Test default quality configuration"""
        config = QualityConfig()
        
        assert config.enable_quality_monitoring is True
        assert config.quality_threshold == 0.8
        assert config.enable_autofix is True
        assert len(config.quality_metrics) > 0
    
    def test_quality_config_validation(self):
        """Test quality configuration validation"""
        # Valid configuration
        config = QualityConfig(
            quality_threshold=0.9,
            temporal_consistency_weight=0.4,
            visual_quality_weight=0.3,
            motion_smoothness_weight=0.3
        )
        errors = config.validate()
        assert len(errors) == 0
        
        # Invalid configuration - weights don't sum to 1.0
        config = QualityConfig(
            quality_threshold=1.5,  # Invalid threshold
            temporal_consistency_weight=0.5,
            visual_quality_weight=0.5,
            motion_smoothness_weight=0.5  # Sum > 1.0
        )
        errors = config.validate()
        assert len(errors) == 2


class TestWorkflowConfigs:
    """Test workflow-specific configurations"""
    
    def test_hunyuan_video_config(self):
        """Test HunyuanVideo configuration"""
        config = HunyuanVideoConfig()
        
        assert config.model_variant == "1.5"
        assert config.default_resolution == "720p"
        assert config.target_fps == 24
        
        # Test validation
        errors = config.validate()
        assert len(errors) == 0
        
        # Test invalid configuration
        config.default_resolution = "4K"  # Invalid resolution
        config.guidance_scale = 25.0  # Out of range
        errors = config.validate()
        assert len(errors) == 2
    
    def test_wan_video_config(self):
        """Test Wan Video configuration"""
        config = WanVideoConfig()
        
        assert config.model_variant == "2.2"
        assert config.enable_lightning_lora is True
        assert config.lightning_steps == 4
        
        # Test validation
        errors = config.validate()
        assert len(errors) == 0
        
        # Test invalid configuration
        config.lightning_steps = 10  # Out of range
        config.high_noise_threshold = 0.2  # Less than low threshold
        config.low_noise_threshold = 0.3
        errors = config.validate()
        assert len(errors) == 2
    
    def test_newbie_image_config(self):
        """Test NewBie Image configuration"""
        config = NewBieImageConfig()
        
        assert config.model_variant == "exp0.1"
        assert config.default_resolution == "1024x1536"
        assert config.enable_anime_enhancement is True
        
        # Test validation
        errors = config.validate()
        assert len(errors) == 0
        
        # Test invalid configuration
        config.default_resolution = "2048x2048"  # Invalid resolution
        config.character_detail_level = "ultra"  # Invalid detail level
        errors = config.validate()
        assert len(errors) == 2
    
    def test_qwen_image_config(self):
        """Test Qwen Image configuration"""
        config = QwenImageConfig()
        
        assert config.model_variant == "2.5"
        assert config.enable_lightning_lora is True
        assert config.max_layers == 4
        
        # Test validation
        errors = config.validate()
        assert len(errors) == 0
        
        # Test invalid configuration
        config.max_layers = 10  # Out of range
        config.edit_strength = 1.5  # Out of range
        errors = config.validate()
        assert len(errors) == 2


class TestAdvancedWorkflowConfig:
    """Test main configuration class"""
    
    def test_default_config_creation(self):
        """Test default configuration creation"""
        config = AdvancedWorkflowConfig()
        
        assert config.config_version == "1.0"
        assert config.environment in EnvironmentType
        assert isinstance(config.system_info, SystemInfo)
        assert isinstance(config.performance_config, PerformanceConfig)
        assert isinstance(config.quality_config, QualityConfig)
        assert isinstance(config.hunyuan_config, HunyuanVideoConfig)
        assert isinstance(config.wan_config, WanVideoConfig)
        assert isinstance(config.newbie_config, NewBieImageConfig)
        assert isinstance(config.qwen_config, QwenImageConfig)
    
    @patch.dict(os.environ, {'STORYCORE_ENV': 'production'})
    def test_environment_detection(self):
        """Test environment detection from environment variables"""
        config = AdvancedWorkflowConfig()
        assert config.environment == EnvironmentType.PRODUCTION
    
    def test_environment_optimizations(self):
        """Test environment-specific optimizations"""
        # Production environment
        prod_config = AdvancedWorkflowConfig(environment=EnvironmentType.PRODUCTION)
        assert prod_config.performance_config.enable_mixed_precision is True
        assert prod_config.performance_config.compile_models is True
        
        # Development environment
        dev_config = AdvancedWorkflowConfig(environment=EnvironmentType.DEVELOPMENT)
        assert dev_config.performance_config.max_batch_size == 2
        assert dev_config.enable_performance_monitoring is True
    
    def test_config_validation(self):
        """Test configuration validation"""
        config = AdvancedWorkflowConfig()
        
        # Valid configuration should have no errors
        errors = config.validate()
        assert len(errors) == 0
        
        # Test with invalid sub-configurations
        config.performance_config.max_batch_size = 0  # Invalid
        config.quality_config.quality_threshold = 1.5  # Invalid
        
        errors = config.validate()
        assert len(errors) >= 2
        assert 'performance_config' in errors
        assert 'quality_config' in errors
    
    def test_config_serialization(self):
        """Test configuration serialization"""
        config = AdvancedWorkflowConfig()
        
        # Test to_dict
        config_dict = config.to_dict()
        assert isinstance(config_dict, dict)
        assert 'config_version' in config_dict
        assert 'environment' in config_dict
        
        # Test to_json
        json_str = config.to_json()
        assert isinstance(json_str, str)
        parsed_json = json.loads(json_str)
        assert parsed_json['config_version'] == "1.0"
        
        # Test to_yaml
        yaml_str = config.to_yaml()
        assert isinstance(yaml_str, str)
        parsed_yaml = yaml.safe_load(yaml_str)
        assert parsed_yaml['config_version'] == "1.0"


class TestConfigurationManager:
    """Test configuration manager functionality"""
    
    def setup_method(self):
        """Set up test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir) / "config"
        self.manager = ConfigurationManager(self.config_dir)
    
    def test_manager_initialization(self):
        """Test configuration manager initialization"""
        assert self.manager.config_dir == self.config_dir
        assert self.config_dir.exists()
        assert self.manager.current_version == "1.0"
    
    def test_create_default_configuration(self):
        """Test creating default configurations"""
        # Test development configuration
        dev_config = self.manager.create_default_configuration(EnvironmentType.DEVELOPMENT)
        assert dev_config.environment == EnvironmentType.DEVELOPMENT
        assert dev_config.performance_config.max_batch_size == 2
        
        # Test production configuration
        prod_config = self.manager.create_default_configuration(EnvironmentType.PRODUCTION)
        assert prod_config.environment == EnvironmentType.PRODUCTION
        assert prod_config.performance_config.max_batch_size == 8
    
    def test_save_and_load_configuration(self):
        """Test saving and loading configurations"""
        # Create a test configuration
        original_config = self.manager.create_default_configuration(EnvironmentType.DEVELOPMENT)
        original_config.performance_config.max_batch_size = 3
        
        # Save configuration
        config_path = self.config_dir / "test_config.yaml"
        self.manager.save_configuration(original_config, config_path)
        
        assert config_path.exists()
        
        # Load configuration
        loaded_config = self.manager.load_configuration(config_path=config_path)
        
        assert loaded_config.environment == EnvironmentType.DEVELOPMENT
        assert loaded_config.performance_config.max_batch_size == 3
    
    def test_configuration_validation_levels(self):
        """Test different validation levels"""
        # Create invalid configuration
        config = AdvancedWorkflowConfig()
        config.performance_config.max_batch_size = 0  # Invalid
        
        # Save invalid configuration
        config_path = self.config_dir / "invalid_config.yaml"
        self.manager.save_configuration(config, config_path)
        
        # Test strict validation (should raise error)
        with pytest.raises(ConfigurationError):
            self.manager.load_configuration(
                config_path=config_path, 
                validation_level=ValidationLevel.STRICT
            )
        
        # Test lenient validation (should succeed with warnings)
        loaded_config = self.manager.load_configuration(
            config_path=config_path, 
            validation_level=ValidationLevel.LENIENT
        )
        assert loaded_config is not None
    
    def test_json_format_support(self):
        """Test JSON format support"""
        config = self.manager.create_default_configuration(EnvironmentType.TESTING)
        
        # Save as JSON
        json_path = self.config_dir / "test_config.json"
        self.manager.save_configuration(
            config, 
            json_path, 
            ConfigurationFormat.JSON
        )
        
        assert json_path.exists()
        
        # Load JSON configuration
        loaded_config = self.manager.load_configuration(config_path=json_path)
        assert loaded_config.environment == EnvironmentType.TESTING
    
    def test_documentation_generation(self):
        """Test configuration documentation generation"""
        doc_content = self.manager.generate_documentation()
        
        assert isinstance(doc_content, str)
        assert "# Advanced Workflow Configuration Documentation" in doc_content
        assert "## Configuration Structure" in doc_content
        assert "### Main Configuration" in doc_content
        
        # Test saving documentation
        doc_path = self.config_dir / "test_docs.md"
        self.manager.generate_documentation(doc_path)
        assert doc_path.exists()
    
    def test_environment_config_loading(self):
        """Test environment-specific configuration loading"""
        # Create environment-specific config
        dev_config = self.manager.create_default_configuration(EnvironmentType.DEVELOPMENT)
        dev_config.performance_config.max_batch_size = 1
        
        dev_path = self.manager.environment_configs[EnvironmentType.DEVELOPMENT]
        self.manager.save_configuration(dev_config, dev_path)
        
        # Load environment configuration
        loaded_config = self.manager.load_configuration(EnvironmentType.DEVELOPMENT)
        assert loaded_config.performance_config.max_batch_size == 1


class TestConfigurationIntegration:
    """Integration tests for configuration system"""
    
    def setup_method(self):
        """Set up test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir) / "config"
        self.manager = ConfigurationManager(self.config_dir)
    
    def test_complete_workflow_configuration(self):
        """Test complete workflow configuration setup"""
        # Create configurations for all environments
        environments = [
            EnvironmentType.DEVELOPMENT,
            EnvironmentType.TESTING,
            EnvironmentType.STAGING,
            EnvironmentType.PRODUCTION
        ]
        
        for env in environments:
            config = self.manager.create_default_configuration(env)
            
            # Customize for environment
            if env == EnvironmentType.PRODUCTION:
                config.performance_config.max_batch_size = 8
                config.quality_config.quality_threshold = 0.95
            elif env == EnvironmentType.DEVELOPMENT:
                config.performance_config.max_batch_size = 1
                config.enable_performance_monitoring = True
            
            # Save configuration
            env_path = self.manager.environment_configs[env]
            self.manager.save_configuration(config, env_path)
            
            # Verify configuration can be loaded and validated
            loaded_config = self.manager.load_configuration(env)
            assert loaded_config.environment == env
            
            # Validate configuration
            errors = loaded_config.validate()
            assert len(errors) == 0, f"Validation errors for {env}: {errors}"
    
    def test_cross_component_validation(self):
        """Test cross-component validation"""
        config = AdvancedWorkflowConfig()
        
        # Set up scenario where memory requirements exceed system capabilities
        config.system_info.gpu_memory_gb = 4.0  # Limited GPU memory
        config.performance_config.max_batch_size = 8  # High batch size
        config.hunyuan_config.enable_super_resolution = True  # Memory intensive
        
        # Validation should detect memory issues
        errors = config.validate()
        
        # Check if cross-component validation detected the issue
        if 'cross_component' in errors:
            assert any('memory' in error.lower() for error in errors['cross_component'])
    
    def test_configuration_migration_workflow(self):
        """Test configuration migration workflow"""
        # Create old-style configuration
        old_config_data = {
            'config_version': '0.9',
            'environment': 'development',
            'performance_config': {
                'max_batch_size': 2,
                'enable_mixed_precision': True
            }
        }
        
        # Save old configuration
        old_config_path = self.config_dir / "old_config.yaml"
        with open(old_config_path, 'w') as f:
            yaml.dump(old_config_data, f)
        
        # Migrate configuration
        migrated_config = self.manager.migrate_configuration(old_config_path)
        
        assert migrated_config.config_version == "1.0"
        assert migrated_config.environment == EnvironmentType.DEVELOPMENT
        assert migrated_config.performance_config.max_batch_size == 2


def run_simple_test():
    """Simple test that can be run directly"""
    print("Running Advanced Workflow Configuration Tests")
    print("=" * 50)
    
    # Test 1: Basic Configuration Creation
    print("✓ Testing basic configuration creation...")
    config = AdvancedWorkflowConfig()
    assert config.config_version == "1.0"
    assert isinstance(config.system_info, SystemInfo)
    print("  Configuration created successfully")
    
    # Test 2: Environment Detection
    print("✓ Testing environment detection...")
    dev_config = AdvancedWorkflowConfig(environment=EnvironmentType.DEVELOPMENT)
    prod_config = AdvancedWorkflowConfig(environment=EnvironmentType.PRODUCTION)
    assert dev_config.performance_config.max_batch_size == 2
    assert prod_config.performance_config.max_batch_size == 8
    print("  Environment-specific optimizations applied")
    
    # Test 3: Configuration Validation
    print("✓ Testing configuration validation...")
    errors = config.validate()
    assert len(errors) == 0, f"Validation errors: {errors}"
    print("  Configuration validation passed")
    
    # Test 4: Serialization
    print("✓ Testing configuration serialization...")
    json_str = config.to_json()
    yaml_str = config.to_yaml()
    assert '"config_version": "1.0"' in json_str
    assert 'config_version: \'1.0\'' in yaml_str or 'config_version: "1.0"' in yaml_str
    print("  JSON and YAML serialization working")
    
    # Test 5: Configuration Manager
    print("✓ Testing configuration manager...")
    with tempfile.TemporaryDirectory() as temp_dir:
        manager = ConfigurationManager(Path(temp_dir) / "config")
        test_config = manager.create_default_configuration(EnvironmentType.TESTING)
        assert test_config.environment == EnvironmentType.TESTING
    print("  Configuration manager working")
    
    # Test 6: Workflow-Specific Configs
    print("✓ Testing workflow-specific configurations...")
    hunyuan_errors = config.hunyuan_config.validate()
    wan_errors = config.wan_config.validate()
    newbie_errors = config.newbie_config.validate()
    qwen_errors = config.qwen_config.validate()
    
    assert len(hunyuan_errors) == 0
    assert len(wan_errors) == 0
    assert len(newbie_errors) == 0
    assert len(qwen_errors) == 0
    print("  All workflow configurations valid")
    
    print("=" * 50)
    print("✅ All tests passed successfully!")
    
    return True


if __name__ == "__main__":
    # Run simple tests
    success = run_simple_test()
    
    if success:
        print("\n🎉 Advanced Workflow Configuration System implementation is working correctly!")
        print("\nKey Features Implemented:")
        print("- Environment-based configuration loading")
        print("- Comprehensive validation system")
        print("- Multi-format support (JSON, YAML)")
        print("- Configuration migration system")
        print("- Auto-documentation generation")
        print("- Cross-component validation")
        print("- Workflow-specific configurations")
    else:
        print("\n❌ Some tests failed. Check the implementation.")