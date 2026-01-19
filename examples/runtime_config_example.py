#!/usr/bin/env python3
"""
Example: Applying configuration changes to workflow managers at runtime
"""

import asyncio
import sys
import logging
from pathlib import Path
from typing import Dict, Any

# Add src directory to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

try:
    from advanced_workflow_manager import AdvancedWorkflowManager
    from advanced_workflow_config import (
        AdvancedWorkflowConfig,
        ConfigurationManager,
        QualityLevel
    )
    from advanced_workflow_base import WorkflowRequest, WorkflowType
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RuntimeConfigApplier:
    """Handles runtime configuration application to workflow managers"""

    def __init__(self):
        self.workflow_manager = AdvancedWorkflowManager()
        self.config_manager = ConfigurationManager()
        self.current_config = None

    async def initialize(self) -> bool:
        """Initialize the workflow manager"""
        return await self.workflow_manager.initialize()

    async def apply_config(self, new_config: AdvancedWorkflowConfig) -> Dict[str, Any]:
        """
        Apply new configuration to the workflow manager

        Args:
            new_config: New configuration to apply

        Returns:
            Dictionary with application results
        """
        result = {
            "success": True,
            "changes_applied": [],
            "errors": [],
            "warnings": []
        }

        try:
            # Validate new configuration
            validation_errors = new_config.validate()
            if validation_errors:
                result["success"] = False
                result["errors"].extend(validation_errors)
                return result

            # Check if this is a reconfiguration
            if self.current_config:
                changes = self._detect_config_changes(self.current_config, new_config)
                result["changes_applied"] = changes

            # Apply memory settings (requires restart of some components)
            if self._memory_settings_changed(new_config):
                result["warnings"].append("Memory settings changed - model reload recommended")

            # Apply quality settings
            if self._quality_settings_changed(new_config):
                await self._apply_quality_settings(new_config)
                result["changes_applied"].append("quality_settings")

            # Apply workflow-specific settings
            await self._apply_workflow_settings(new_config)

            # Update current configuration
            self.current_config = new_config

            logger.info(f"Configuration applied successfully: {len(result['changes_applied'])} changes")

        except Exception as e:
            result["success"] = False
            result["errors"].append(f"Configuration application failed: {str(e)}")
            logger.error(f"Failed to apply configuration: {e}")

        return result

    def _detect_config_changes(self, old_config: AdvancedWorkflowConfig,
                              new_config: AdvancedWorkflowConfig) -> list:
        """Detect what configuration aspects have changed"""
        changes = []

        # Check basic settings
        if old_config.max_memory_usage_gb != new_config.max_memory_usage_gb:
            changes.append("memory_limit")
        if old_config.batch_size != new_config.batch_size:
            changes.append("batch_size")
        if old_config.quality_level != new_config.quality_level:
            changes.append("quality_level")
        if old_config.enable_caching != new_config.enable_caching:
            changes.append("caching")

        # Check workflow enable/disable
        if old_config.enable_hunyuan != new_config.enable_hunyuan:
            changes.append("hunyuan_enabled")
        if old_config.enable_wan != new_config.enable_wan:
            changes.append("wan_enabled")
        if old_config.enable_newbie != new_config.enable_newbie:
            changes.append("newbie_enabled")
        if old_config.enable_qwen != new_config.enable_qwen:
            changes.append("qwen_enabled")

        return changes

    def _memory_settings_changed(self, new_config: AdvancedWorkflowConfig) -> bool:
        """Check if memory-related settings changed"""
        if not self.current_config:
            return True

        return (
            self.current_config.max_memory_usage_gb != new_config.max_memory_usage_gb or
            self.current_config.model_precision != new_config.model_precision
        )

    def _quality_settings_changed(self, new_config: AdvancedWorkflowConfig) -> bool:
        """Check if quality-related settings changed"""
        if not self.current_config:
            return True

        return (
            self.current_config.quality_level != new_config.quality_level or
            self.current_config.quality_threshold != new_config.quality_threshold
        )

    async def _apply_quality_settings(self, config: AdvancedWorkflowConfig):
        """Apply quality preset to workflow configurations"""
        config_manager = ConfigurationManager()
        updated_config = config_manager.apply_quality_preset(
            config, config.quality_level
        )
        # Update in-place
        config.hunyuan_config.steps = updated_config.hunyuan_config.steps
        config.wan_config.steps = updated_config.wan_config.steps
        config.newbie_config.steps = updated_config.newbie_config.steps
        config.qwen_config.steps = updated_config.qwen_config.steps

    async def _apply_workflow_settings(self, config: AdvancedWorkflowConfig):
        """Apply workflow-specific configuration settings"""
        # This would typically update loaded workflow instances
        # For demonstration, we'll just log the changes
        logger.info("Applying workflow-specific settings...")
        logger.info(f"HunyuanVideo steps: {config.hunyuan_config.steps}")
        logger.info(f"Wan Video steps: {config.wan_config.steps}")
        logger.info(f"NewBie steps: {config.newbie_config.steps}")
        logger.info(f"Qwen steps: {config.qwen_config.steps}")

    async def reload_workflows_if_needed(self, changes: list):
        """Reload workflow models if necessary based on changes"""
        reload_needed = any(change in changes for change in
                          ["memory_limit", "model_precision", "hunyuan_enabled",
                           "wan_enabled", "newbie_enabled", "qwen_enabled"])

        if reload_needed:
            logger.info("Configuration changes require workflow reload")
            # In a real implementation, this would trigger model reloading
            return True

        return False

async def main():
    """Demonstrate runtime configuration application"""
    applier = RuntimeConfigApplier()

    # Initialize
    if not await applier.initialize():
        print("❌ Failed to initialize workflow manager")
        return

    print("✅ Workflow manager initialized")

    # Load initial configuration
    config_manager = ConfigurationManager()
    initial_config = config_manager.load_config()

    print(f"Initial quality level: {initial_config.quality_level.value}")

    # Apply initial configuration
    result = await applier.apply_config(initial_config)
    if result["success"]:
        print("✅ Initial configuration applied")
    else:
        print(f"❌ Failed to apply initial config: {result['errors']}")

    # Create modified configuration (higher quality)
    high_quality_config = config_manager.apply_quality_preset(
        initial_config, QualityLevel.HIGH
    )

    print(f"\nApplying high quality preset...")
    result = await applier.apply_config(high_quality_config)

    if result["success"]:
        print("✅ High quality configuration applied")
        print(f"Changes applied: {result['changes_applied']}")
        print(f"Quality level: {high_quality_config.quality_level.value}")
        print(f"HunyuanVideo steps: {high_quality_config.hunyuan_config.steps}")
    else:
        print(f"❌ Failed to apply config: {result['errors']}")

    # Demonstrate error handling with invalid config
    print("\n--- Testing Error Handling ---")
    invalid_config = initial_config
    invalid_config.max_memory_usage_gb = -1  # Invalid value

    result = await applier.apply_config(invalid_config)
    if not result["success"]:
        print("✅ Invalid configuration correctly rejected:")
        for error in result["errors"]:
            print(f"  - {error}")

if __name__ == "__main__":
    asyncio.run(main())