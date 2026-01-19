#!/usr/bin/env python3
"""
Example: Loading and validating advanced workflow configuration files
"""

import sys
import json
import logging
from pathlib import Path
from typing import Optional

# Add src directory to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

try:
    from advanced_workflow_config import (
        ConfigurationManager,
        AdvancedWorkflowConfig,
        QualityLevel,
        Environment
    )
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running from the project root directory")
    sys.exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_and_validate_config(config_path: Optional[str] = None) -> AdvancedWorkflowConfig:
    """
    Load and validate configuration from file or use defaults

    Args:
        config_path: Path to configuration file (optional)

    Returns:
        Validated AdvancedWorkflowConfig instance

    Raises:
        ValueError: If configuration is invalid
        FileNotFoundError: If config file doesn't exist
    """
    # Initialize configuration manager
    config_manager = ConfigurationManager()

    # Load configuration
    if config_path:
        config_file = Path(config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")

        logger.info(f"Loading configuration from: {config_path}")
        config = config_manager.load_config(config_file)
    else:
        logger.info("Using default configuration")
        config = AdvancedWorkflowConfig()

    # Validate configuration
    validation_errors = config.validate()
    if validation_errors:
        error_msg = f"Configuration validation failed:\n" + "\n".join(f"  - {error}" for error in validation_errors)
        raise ValueError(error_msg)

    logger.info("Configuration loaded and validated successfully")
    return config

def print_config_summary(config: AdvancedWorkflowConfig):
    """Print a summary of the configuration"""
    print("\n=== Configuration Summary ===")
    print(f"Environment: {config.environment.value}")
    print(f"Model Precision: {config.model_precision.value}")
    print(f"Max Memory Usage: {config.max_memory_usage_gb} GB")
    print(f"Quality Level: {config.quality_level.value}")
    print(f"Quality Threshold: {config.quality_threshold}")
    print(f"Batch Size: {config.batch_size}")
    print(f"Enable Caching: {config.enable_caching}")
    print(f"Parallel Execution: {config.parallel_execution}")

    print("\n=== Workflow Status ===")
    print(f"HunyuanVideo: {'Enabled' if config.enable_hunyuan else 'Disabled'}")
    print(f"Wan Video: {'Enabled' if config.enable_wan else 'Disabled'}")
    print(f"NewBie Image: {'Enabled' if config.enable_newbie else 'Disabled'}")
    print(f"Qwen Image: {'Enabled' if config.enable_qwen else 'Disabled'}")

    print("\n=== Workflow Configurations ===")
    if config.enable_hunyuan:
        hunyuan = config.hunyuan_config
        print(f"HunyuanVideo - Steps: {hunyuan.steps}, CFG Scale: {hunyuan.cfg_scale}")

    if config.enable_wan:
        wan = config.wan_config
        print(f"Wan Video - Steps: {wan.steps}, CFG Scale: {wan.cfg_scale}")

    if config.enable_newbie:
        newbie = config.newbie_config
        print(f"NewBie Image - Steps: {newbie.steps}, CFG Scale: {newbie.cfg_scale}")

    if config.enable_qwen:
        qwen = config.qwen_config
        print(f"Qwen Image - Steps: {qwen.steps}, CFG Scale: {qwen.cfg_scale}")

def main():
    """Main function demonstrating configuration loading and validation"""
    import argparse

    parser = argparse.ArgumentParser(description="Load and validate advanced workflow configuration")
    parser.add_argument("--config", "-c", help="Path to configuration file")
    parser.add_argument("--validate-only", action="store_true", help="Only validate, don't print summary")

    args = parser.parse_args()

    try:
        # Load and validate configuration
        config = load_and_validate_config(args.config)

        if not args.validate_only:
            print_config_summary(config)

        print("\n✅ Configuration is valid and ready for use")

    except Exception as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()