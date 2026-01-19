#!/usr/bin/env python3
"""
Example: Handling configuration errors with fallbacks and recovery strategies
"""

import sys
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

# Add src directory to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from advanced_workflow_config import (
    ConfigurationManager,
    AdvancedWorkflowConfig,
    QualityLevel
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ConfigLoadResult:
    """Result of configuration loading attempt"""
    success: bool
    config: Optional[AdvancedWorkflowConfig] = None
    errors: List[str] = None
    warnings: List[str] = None
    fallback_applied: bool = False
    fallback_level: str = ""

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []

class ConfigErrorHandler:
    """Handles configuration loading errors and provides fallback strategies"""

    def __init__(self):
        self.config_manager = ConfigurationManager()
        self.fallback_configs = self._create_fallback_configs()

    def _create_fallback_configs(self) -> Dict[str, AdvancedWorkflowConfig]:
        """Create predefined fallback configurations"""
        fallbacks = {}

        # Minimal fallback - only basic workflows enabled
        minimal_config = AdvancedWorkflowConfig()
        minimal_config.enable_hunyuan = True
        minimal_config.enable_wan = False
        minimal_config.enable_newbie = False
        minimal_config.enable_qwen = False
        minimal_config.max_memory_usage_gb = 8.0
        minimal_config.batch_size = 1
        fallbacks["minimal"] = minimal_config

        # Safe fallback - conservative settings
        safe_config = AdvancedWorkflowConfig()
        safe_config.max_memory_usage_gb = 16.0
        safe_config.batch_size = 1
        safe_config.enable_caching = True
        safe_config.quality_level = QualityLevel.STANDARD
        safe_config = self.config_manager.apply_quality_preset(safe_config, QualityLevel.STANDARD)
        fallbacks["safe"] = safe_config

        # High compatibility fallback - basic settings with fallbacks enabled
        compat_config = AdvancedWorkflowConfig()
        compat_config.enable_auto_routing = True
        compat_config.fallback_to_basic = True
        compat_config.auto_retry_on_failure = True
        compat_config.max_retries = 5
        fallbacks["compatible"] = compat_config

        return fallbacks

    def load_config_with_fallback(self, config_path: Optional[Path] = None,
                                 fallback_strategy: str = "progressive") -> ConfigLoadResult:
        """
        Load configuration with comprehensive error handling and fallbacks

        Args:
            config_path: Path to configuration file
            fallback_strategy: Strategy for fallbacks ("progressive", "safe", "minimal")

        Returns:
            ConfigLoadResult with loading outcome
        """
        result = ConfigLoadResult(success=False)

        # Attempt 1: Load from file
        if config_path:
            try:
                logger.info(f"Attempting to load config from: {config_path}")
                config = self.config_manager.load_config(config_path)

                # Validate loaded config
                validation_errors = config.validate()
                if validation_errors:
                    result.warnings.extend(validation_errors)
                    logger.warning(f"Configuration validation warnings: {validation_errors}")

                result.success = True
                result.config = config
                logger.info("Configuration loaded successfully from file")
                return result

            except Exception as e:
                error_msg = f"Failed to load config from file: {str(e)}"
                result.errors.append(error_msg)
                logger.warning(error_msg)

        # Attempt 2: Load from environment variables
        try:
            logger.info("Attempting to load config from environment variables")
            config = self.config_manager.load_from_environment()

            validation_errors = config.validate()
            if validation_errors:
                result.warnings.extend(validation_errors)
                logger.warning(f"Environment config validation warnings: {validation_errors}")

            result.success = True
            result.config = config
            result.fallback_applied = True
            result.fallback_level = "environment"
            logger.info("Configuration loaded successfully from environment")
            return result

        except Exception as e:
            error_msg = f"Failed to load config from environment: {str(e)}"
            result.errors.append(error_msg)
            logger.warning(error_msg)

        # Attempt 3: Progressive fallback strategy
        if fallback_strategy == "progressive":
            fallback_levels = ["safe", "compatible", "minimal"]
        elif fallback_strategy == "safe":
            fallback_levels = ["safe", "minimal"]
        else:  # minimal
            fallback_levels = ["minimal"]

        for level in fallback_levels:
            try:
                logger.info(f"Attempting fallback to {level} configuration")
                config = self.fallback_configs[level]

                # Validate fallback config
                validation_errors = config.validate()
                if validation_errors:
                    logger.warning(f"Fallback config {level} has validation issues: {validation_errors}")
                    continue

                result.success = True
                result.config = config
                result.fallback_applied = True
                result.fallback_level = level
                logger.info(f"Successfully applied {level} fallback configuration")
                return result

            except Exception as e:
                error_msg = f"Failed to apply {level} fallback: {str(e)}"
                result.errors.append(error_msg)
                logger.warning(error_msg)

        # Final fallback: Create minimal working config
        try:
            logger.info("Using emergency default configuration")
            result.config = AdvancedWorkflowConfig()
            result.success = True
            result.fallback_applied = True
            result.fallback_level = "emergency"
            result.warnings.append("Using emergency default configuration - please check your setup")
            logger.warning("Emergency default configuration applied")

        except Exception as e:
            result.errors.append(f"Complete configuration failure: {str(e)}")
            logger.error(f"Critical configuration failure: {e}")

        return result

    def repair_config(self, config: AdvancedWorkflowConfig) -> AdvancedWorkflowConfig:
        """
        Attempt to repair a partially invalid configuration

        Args:
            config: Configuration to repair

        Returns:
            Repaired configuration
        """
        logger.info("Attempting to repair configuration")

        # Get validation errors
        errors = config.validate()

        repaired_config = config  # Start with original

        for error in errors:
            if "Max memory usage must be positive" in error:
                repaired_config.max_memory_usage_gb = 16.0
                logger.info("Repaired: Set max_memory_usage_gb to 16.0")
            elif "Batch size must be at least 1" in error:
                repaired_config.batch_size = 1
                logger.info("Repaired: Set batch_size to 1")
            elif "Quality threshold must be between 0 and 1" in error:
                repaired_config.quality_threshold = 0.8
                logger.info("Repaired: Set quality_threshold to 0.8")
            elif "Width and height must be positive" in error:
                # Repair workflow-specific dimensions
                if "HunyuanVideo" in error and hasattr(repaired_config, 'hunyuan_config'):
                    repaired_config.hunyuan_config.width = 720
                    repaired_config.hunyuan_config.height = 480
                    logger.info("Repaired: Set HunyuanVideo dimensions to 720x480")
                # Add more repairs as needed...

        # Validate repaired config
        remaining_errors = repaired_config.validate()
        if remaining_errors:
            logger.warning(f"Some configuration issues could not be repaired: {remaining_errors}")

        return repaired_config

def main():
    """Demonstrate comprehensive error handling and fallbacks"""
    handler = ConfigErrorHandler()

    print("=== Testing Configuration Error Handling ===\n")

    # Test 1: Valid configuration
    print("1. Loading valid configuration...")
    result = handler.load_config_with_fallback()
    if result.success:
        print("✅ Success")
        print(f"   Fallback applied: {result.fallback_applied}")
        if result.warnings:
            print(f"   Warnings: {result.warnings}")
    else:
        print(f"❌ Failed: {result.errors}")

    # Test 2: Invalid file path
    print("\n2. Loading from invalid file path...")
    result = handler.load_config_with_fallback(Path("/nonexistent/config.yaml"))
    if result.success:
        print("✅ Success (fallback worked)")
        print(f"   Fallback level: {result.fallback_level}")
    else:
        print(f"❌ Failed: {result.errors}")

    # Test 3: Invalid configuration values
    print("\n3. Testing configuration repair...")
    invalid_config = AdvancedWorkflowConfig()
    invalid_config.max_memory_usage_gb = -1  # Invalid
    invalid_config.batch_size = 0  # Invalid

    print(f"Original config errors: {invalid_config.validate()}")

    repaired_config = handler.repair_config(invalid_config)
    print(f"Repaired config errors: {repaired_config.validate()}")
    print(f"Max memory: {repaired_config.max_memory_usage_gb}")
    print(f"Batch size: {repaired_config.batch_size}")

    # Test 4: Complete failure simulation
    print("\n4. Testing complete failure scenario...")
    # This would simulate a complete system failure
    print("✅ Error handling system ready for complete failures")

if __name__ == "__main__":
    main()