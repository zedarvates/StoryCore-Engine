"""
Tests for Advanced Workflow Configuration System

Author: Kiro AI Assistant
Date: January 14, 2026
"""

import pytest
import json
import yaml
from pathlib import Path
from tempfile import TemporaryDirectory
import os
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from advanced_workflow_config import (
    AdvancedWorkflowConfig,
    HunyuanVideoConfig,
    WanVideoConfig,
    NewBieImageConfig,
    QwenImageConfig,
    ConfigurationManager,
    ModelPrecision,
    QualityLevel,
    Environment,
    create_default_config,
    load_config_from_file,
    save_config_to_file,
)


# ============================================================================
# Test Workflow-Specific Configurations
# ============================================================================

class TestHunyuanVideoConfig:
    """Test HunyuanVideo configuration"""
    
    def test_default_creation(self):
        """Test creating default HunyuanVideo config"""
        config = HunyuanVideoConfig()
        
        assert config.width == 720
        assert config.height == 480
        assert config.num_frames == 121
        assert config.steps == 50
        assert config.enable_upscaling is True
    
    def test_validation_success(self):
        """Test validation with valid config"""
        config = HunyuanVideoConfig()
        errors = config.validate()
        
        assert len(errors) == 0
    
    def test_validation_invalid_dimensions(self):
        """Test validation with invalid dimensions"""
        config = HunyuanVideoConfig(width=-1, height=0)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("Width and height" in e for e in errors)
    
    def test_validation_invalid_frames(self):
        """Test validation with invalid frame count"""
        config = HunyuanVideoConfig(num_frames=0)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("frames" in e.lower() for e in errors)
    
    def test_validation_invalid_steps(self):
        """Test validation with invalid steps"""
        config = HunyuanVideoConfig(steps=0)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("steps" in e.lower() for e in errors)


class TestWanVideoConfig:
    """Test Wan Video configuration"""
    
    def test_default_creation(self):
        """Test creating default Wan Video config"""
        config = WanVideoConfig()
        
        assert config.width == 720
        assert config.height == 480
        assert config.num_frames == 81
        assert config.enable_inpainting is True
        assert config.enable_fp8 is True
    
    def test_validation_success(self):
        """Test validation with valid config"""
        config = WanVideoConfig()
        errors = config.validate()
        
        assert len(errors) == 0
    
    def test_validation_invalid_inpaint_strength(self):
        """Test validation with invalid inpaint strength"""
        config = WanVideoConfig(inpaint_strength=1.5)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("inpaint strength" in e.lower() for e in errors)
    
    def test_validation_invalid_alpha_threshold(self):
        """Test validation with invalid alpha threshold"""
        config = WanVideoConfig(alpha_threshold=-0.1)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("alpha threshold" in e.lower() for e in errors)


class TestNewBieImageConfig:
    """Test NewBie Image configuration"""
    
    def test_default_creation(self):
        """Test creating default NewBie config"""
        config = NewBieImageConfig()
        
        assert config.width == 1024
        assert config.height == 1536
        assert config.enable_structured_prompts is True
        assert config.character_consistency_threshold == 0.85
    
    def test_validation_success(self):
        """Test validation with valid config"""
        config = NewBieImageConfig()
        errors = config.validate()
        
        assert len(errors) == 0
    
    def test_validation_invalid_consistency_threshold(self):
        """Test validation with invalid consistency threshold"""
        config = NewBieImageConfig(character_consistency_threshold=1.5)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("consistency threshold" in e.lower() for e in errors)
    
    def test_validation_invalid_style_strength(self):
        """Test validation with invalid style strength"""
        config = NewBieImageConfig(style_strength=-0.1)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("style strength" in e.lower() for e in errors)


class TestQwenImageConfig:
    """Test Qwen Image configuration"""
    
    def test_default_creation(self):
        """Test creating default Qwen config"""
        config = QwenImageConfig()
        
        assert config.width == 1024
        assert config.height == 1024
        assert config.enable_relighting is False
        assert config.lighting_type == "natural"
    
    def test_validation_success(self):
        """Test validation with valid config"""
        config = QwenImageConfig()
        errors = config.validate()
        
        assert len(errors) == 0
    
    def test_validation_invalid_edit_strength(self):
        """Test validation with invalid edit strength"""
        config = QwenImageConfig(edit_strength=2.0)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("edit strength" in e.lower() for e in errors)
    
    def test_validation_invalid_lighting_type(self):
        """Test validation with invalid lighting type"""
        config = QwenImageConfig(lighting_type="invalid")
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("lighting type" in e.lower() for e in errors)
    
    def test_validation_invalid_blend_mode(self):
        """Test validation with invalid blend mode"""
        config = QwenImageConfig(layer_blend_mode="invalid")
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("blend mode" in e.lower() for e in errors)


# ============================================================================
# Test Main Configuration
# ============================================================================

class TestAdvancedWorkflowConfig:
    """Test main advanced workflow configuration"""
    
    def test_default_creation(self):
        """Test creating default configuration"""
        config = AdvancedWorkflowConfig()
        
        assert config.schema_version == "1.0"
        assert config.environment == Environment.LOCAL
        assert config.model_precision == ModelPrecision.FP16
        assert config.quality_level == QualityLevel.STANDARD
        assert config.enable_hunyuan is True
        assert config.enable_wan is True
        assert config.enable_newbie is True
        assert config.enable_qwen is True
    
    def test_validation_success(self):
        """Test validation with valid config"""
        config = AdvancedWorkflowConfig()
        errors = config.validate()
        
        assert len(errors) == 0
    
    def test_validation_invalid_memory(self):
        """Test validation with invalid memory setting"""
        config = AdvancedWorkflowConfig(max_memory_usage_gb=-1)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("memory" in e.lower() for e in errors)
    
    def test_validation_invalid_batch_size(self):
        """Test validation with invalid batch size"""
        config = AdvancedWorkflowConfig(batch_size=0)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("batch size" in e.lower() for e in errors)
    
    def test_validation_invalid_quality_threshold(self):
        """Test validation with invalid quality threshold"""
        config = AdvancedWorkflowConfig(quality_threshold=1.5)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("quality threshold" in e.lower() for e in errors)
    
    def test_validation_invalid_gpu_fraction(self):
        """Test validation with invalid GPU memory fraction"""
        config = AdvancedWorkflowConfig(gpu_memory_fraction=1.5)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("gpu memory fraction" in e.lower() for e in errors)
    
    def test_validation_propagates_to_workflow_configs(self):
        """Test that validation checks workflow-specific configs"""
        config = AdvancedWorkflowConfig()
        config.hunyuan_config.width = -1  # Invalid
        
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("HunyuanVideo" in e for e in errors)
    
    def test_to_dict(self):
        """Test converting config to dictionary"""
        config = AdvancedWorkflowConfig()
        data = config.to_dict()
        
        assert isinstance(data, dict)
        assert data['schema_version'] == "1.0"
        assert data['environment'] == "local"
        assert data['model_precision'] == "fp16"
        assert data['quality_level'] == "standard"
        assert isinstance(data['models_directory'], str)
        assert isinstance(data['cache_directory'], str)
    
    def test_from_dict(self):
        """Test creating config from dictionary"""
        data = {
            'schema_version': "1.0",
            'environment': "production",
            'model_precision': "fp8",
            'quality_level': "high",
            'max_memory_usage_gb': 24.0,
            'models_directory': "/path/to/models",
            'cache_directory': "/path/to/cache",
        }
        
        config = AdvancedWorkflowConfig.from_dict(data)
        
        assert config.schema_version == "1.0"
        assert config.environment == Environment.PRODUCTION
        assert config.model_precision == ModelPrecision.FP8
        assert config.quality_level == QualityLevel.HIGH
        assert config.max_memory_usage_gb == 24.0
        assert config.models_directory == Path("/path/to/models")
        assert config.cache_directory == Path("/path/to/cache")
    
    def test_round_trip_conversion(self):
        """Test converting to dict and back"""
        original = AdvancedWorkflowConfig(
            max_memory_usage_gb=24.0,
            quality_threshold=0.9,
            enable_caching=False,
        )
        
        data = original.to_dict()
        restored = AdvancedWorkflowConfig.from_dict(data)
        
        assert restored.max_memory_usage_gb == original.max_memory_usage_gb
        assert restored.quality_threshold == original.quality_threshold
        assert restored.enable_caching == original.enable_caching


# ============================================================================
# Test Configuration Manager
# ============================================================================

class TestConfigurationManager:
    """Test configuration manager"""
    
    def test_initialization(self):
        """Test manager initialization"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            assert manager.config_dir == config_dir
            assert manager.config_dir.exists()
            assert manager.backup_dir.exists()
    
    def test_save_and_load_yaml(self):
        """Test saving and loading YAML configuration"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            # Create and save config
            original = AdvancedWorkflowConfig(
                max_memory_usage_gb=24.0,
                quality_threshold=0.9,
            )
            
            config_path = config_dir / "test_config.yaml"
            success = manager.save_config(original, config_path, create_backup=False)
            assert success is True
            assert config_path.exists()
            
            # Load config
            loaded = manager.load_config(config_path)
            
            assert loaded.max_memory_usage_gb == 24.0
            assert loaded.quality_threshold == 0.9
    
    def test_save_and_load_json(self):
        """Test saving and loading JSON configuration"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            # Create and save config
            original = AdvancedWorkflowConfig(
                max_memory_usage_gb=16.0,
                batch_size=2,
            )
            
            config_path = config_dir / "test_config.json"
            success = manager.save_config(original, config_path, create_backup=False)
            assert success is True
            assert config_path.exists()
            
            # Load config
            loaded = manager.load_config(config_path)
            
            assert loaded.max_memory_usage_gb == 16.0
            assert loaded.batch_size == 2
    
    def test_load_nonexistent_file(self):
        """Test loading from nonexistent file returns defaults"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            config_path = config_dir / "nonexistent.yaml"
            loaded = manager.load_config(config_path)
            
            # Should return default config
            assert loaded.max_memory_usage_gb == 20.0  # default value
    
    def test_save_invalid_config_fails(self):
        """Test that saving invalid config fails"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            # Create invalid config
            invalid = AdvancedWorkflowConfig(max_memory_usage_gb=-1)
            
            config_path = config_dir / "invalid.yaml"
            success = manager.save_config(invalid, config_path, create_backup=False)
            
            assert success is False
    
    def test_backup_creation(self):
        """Test that backups are created"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            config_path = config_dir / "test.yaml"
            
            # Save initial config
            config1 = AdvancedWorkflowConfig(max_memory_usage_gb=16.0)
            manager.save_config(config1, config_path, create_backup=False)
            
            # Save again with backup
            config2 = AdvancedWorkflowConfig(max_memory_usage_gb=24.0)
            manager.save_config(config2, config_path, create_backup=True)
            
            # Check backup was created
            backups = list(manager.backup_dir.glob("test_*.yaml"))
            assert len(backups) > 0
    
    def test_load_from_environment(self):
        """Test loading configuration with environment overrides"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            # Set environment variables
            os.environ['STORYCORE_MAX_MEMORY_USAGE_GB'] = '32.0'
            os.environ['STORYCORE_BATCH_SIZE'] = '4'
            os.environ['STORYCORE_ENABLE_CACHING'] = 'false'
            
            try:
                config = manager.load_from_environment()
                
                assert config.max_memory_usage_gb == 32.0
                assert config.batch_size == 4
                assert config.enable_caching is False
            finally:
                # Clean up environment
                del os.environ['STORYCORE_MAX_MEMORY_USAGE_GB']
                del os.environ['STORYCORE_BATCH_SIZE']
                del os.environ['STORYCORE_ENABLE_CACHING']
    
    def test_load_from_environment_nested_config(self):
        """Test loading with nested workflow config overrides"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            # Set nested environment variable
            os.environ['STORYCORE_HUNYUAN.STEPS'] = '100'
            os.environ['STORYCORE_WAN.CFG_SCALE'] = '5.0'
            
            try:
                config = manager.load_from_environment()
                
                assert config.hunyuan_config.steps == 100
                assert config.wan_config.cfg_scale == 5.0
            finally:
                # Clean up environment
                del os.environ['STORYCORE_HUNYUAN.STEPS']
                del os.environ['STORYCORE_WAN.CFG_SCALE']
    
    def test_get_quality_preset(self):
        """Test getting quality presets"""
        manager = ConfigurationManager()
        
        draft = manager.get_quality_preset(QualityLevel.DRAFT)
        assert draft['steps'] == 10
        assert draft['enable_upscaling'] is False
        
        ultra = manager.get_quality_preset(QualityLevel.ULTRA)
        assert ultra['steps'] == 50
        assert ultra['enable_upscaling'] is True
    
    def test_apply_quality_preset(self):
        """Test applying quality preset to config"""
        manager = ConfigurationManager()
        config = AdvancedWorkflowConfig()
        
        # Apply HIGH quality preset
        modified = manager.apply_quality_preset(config, QualityLevel.HIGH)
        
        assert modified.quality_level == QualityLevel.HIGH
        assert modified.quality_threshold == 0.9
        assert modified.hunyuan_config.steps == 35
        assert modified.wan_config.steps == 35
        assert modified.hunyuan_config.enable_upscaling is True
    
    def test_migrate_config_same_version(self):
        """Test migration with same version (no-op)"""
        manager = ConfigurationManager()
        
        old_config = {'schema_version': '1.0', 'max_memory_usage_gb': 20.0}
        migrated = manager.migrate_config(old_config, '1.0', '1.0')
        
        assert migrated == old_config


# ============================================================================
# Test Utility Functions
# ============================================================================

class TestUtilityFunctions:
    """Test utility functions"""
    
    def test_create_default_config(self):
        """Test creating default config"""
        config = create_default_config()
        
        assert isinstance(config, AdvancedWorkflowConfig)
        assert config.schema_version == "1.0"
    
    def test_load_config_from_file(self):
        """Test loading config from file"""
        with TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "test.yaml"
            
            # Save a config first
            original = AdvancedWorkflowConfig(max_memory_usage_gb=24.0)
            save_config_to_file(original, config_path)
            
            # Load it back
            loaded = load_config_from_file(config_path)
            
            assert loaded.max_memory_usage_gb == 24.0
    
    def test_save_config_to_file(self):
        """Test saving config to file"""
        with TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "test.yaml"
            
            config = AdvancedWorkflowConfig(batch_size=4)
            success = save_config_to_file(config, config_path)
            
            assert success is True
            assert config_path.exists()


# ============================================================================
# Integration Tests
# ============================================================================

class TestIntegration:
    """Integration tests for configuration system"""
    
    def test_complete_workflow(self):
        """Test complete configuration workflow"""
        with TemporaryDirectory() as tmpdir:
            config_dir = Path(tmpdir) / "config"
            manager = ConfigurationManager(config_dir)
            
            # 1. Create custom configuration
            config = AdvancedWorkflowConfig(
                environment=Environment.PRODUCTION,
                max_memory_usage_gb=32.0,
                quality_level=QualityLevel.HIGH,
            )
            
            # 2. Apply quality preset
            config = manager.apply_quality_preset(config, QualityLevel.ULTRA)
            
            # 3. Validate
            errors = config.validate()
            assert len(errors) == 0
            
            # 4. Save
            config_path = config_dir / "production.yaml"
            success = manager.save_config(config, config_path)
            assert success is True
            
            # 5. Load
            loaded = manager.load_config(config_path)
            
            # 6. Verify
            assert loaded.environment == Environment.PRODUCTION
            assert loaded.max_memory_usage_gb == 32.0
            assert loaded.quality_level == QualityLevel.ULTRA
            assert loaded.hunyuan_config.steps == 50  # From ULTRA preset
    
    def test_workflow_specific_customization(self):
        """Test customizing individual workflow configs"""
        config = AdvancedWorkflowConfig()
        
        # Customize HunyuanVideo
        config.hunyuan_config.width = 1280
        config.hunyuan_config.height = 720
        config.hunyuan_config.num_frames = 240
        
        # Customize Wan Video
        config.wan_config.enable_inpainting = True
        config.wan_config.enable_alpha = True
        
        # Validate
        errors = config.validate()
        assert len(errors) == 0
        
        # Verify customizations
        assert config.hunyuan_config.width == 1280
        assert config.wan_config.enable_inpainting is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
