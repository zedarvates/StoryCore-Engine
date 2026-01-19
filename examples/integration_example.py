#!/usr/bin/env python3
"""
Example: Integrating configuration management with advanced workflow components
"""

import asyncio
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional

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

class ConfigAwareWorkflowManager:
    """Workflow manager with integrated configuration management"""

    def __init__(self, config_path: Optional[str] = None):
        self.workflow_manager = AdvancedWorkflowManager()
        self.config_manager = ConfigurationManager()
        self.current_config = None

        # Configuration monitoring
        self.config_watch_enabled = False
        self.config_file_path = Path(config_path) if config_path else None

    async def initialize_with_config(self, config: Optional[AdvancedWorkflowConfig] = None) -> bool:
        """
        Initialize workflow manager with configuration

        Args:
            config: Configuration to use (optional, loads default if not provided)

        Returns:
            True if initialization successful
        """
        # Load configuration
        if config is None:
            if self.config_file_path and self.config_file_path.exists():
                self.current_config = self.config_manager.load_config(self.config_file_path)
            else:
                self.current_config = AdvancedWorkflowConfig()
        else:
            self.current_config = config

        # Validate configuration
        validation_errors = self.current_config.validate()
        if validation_errors:
            logger.error(f"Configuration validation failed: {validation_errors}")
            return False

        # Apply configuration to workflow manager
        success = await self.workflow_manager.initialize()
        if not success:
            logger.error("Failed to initialize workflow manager")
            return False

        # Configure workflow-specific settings
        await self._apply_workflow_configs()

        logger.info("Configuration-aware workflow manager initialized successfully")
        return True

    async def _apply_workflow_configs(self):
        """Apply workflow-specific configurations"""
        if not self.current_config:
            return

        # Configure HunyuanVideo if enabled
        if self.current_config.enable_hunyuan:
            hunyuan_config = self.current_config.hunyuan_config
            logger.info(f"Configuring HunyuanVideo: steps={hunyuan_config.steps}, cfg={hunyuan_config.cfg_scale}")

        # Configure Wan Video if enabled
        if self.current_config.enable_wan:
            wan_config = self.current_config.wan_config
            logger.info(f"Configuring Wan Video: steps={wan_config.steps}, cfg={wan_config.cfg_scale}")

        # Configure NewBie Image if enabled
        if self.current_config.enable_newbie:
            newbie_config = self.current_config.newbie_config
            logger.info(f"Configuring NewBie Image: steps={newbie_config.steps}, cfg={newbie_config.cfg_scale}")

        # Configure Qwen Image if enabled
        if self.current_config.enable_qwen:
            qwen_config = self.current_config.qwen_config
            logger.info(f"Configuring Qwen Image: steps={qwen_config.steps}, cfg={qwen_config.cfg_scale}")

    async def execute_with_config(self, request: WorkflowRequest) -> Dict[str, Any]:
        """
        Execute workflow with current configuration

        Args:
            request: Workflow execution request

        Returns:
            Execution results
        """
        if not self.workflow_manager.is_initialized:
            return {"success": False, "error": "Workflow manager not initialized"}

        try:
            # Execute the workflow
            result = await self.workflow_manager.execute_workflow(request)

            # Add configuration context to result
            result_dict = {
                "success": result.success,
                "execution_time": result.execution_time,
                "memory_used": result.memory_used,
                "config_quality_level": self.current_config.quality_level.value if self.current_config else "unknown",
                "config_batch_size": self.current_config.batch_size if self.current_config else "unknown"
            }

            if not result.success:
                result_dict["error"] = result.error_message

            if result.quality_metrics:
                result_dict["quality_metrics"] = result.quality_metrics

            return result_dict

        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            return {"success": False, "error": str(e)}

    async def reconfigure(self, new_config: AdvancedWorkflowConfig) -> Dict[str, Any]:
        """
        Reconfigure the workflow manager with new settings

        Args:
            new_config: New configuration to apply

        Returns:
            Reconfiguration results
        """
        result = {
            "success": False,
            "changes_applied": [],
            "errors": []
        }

        try:
            # Validate new configuration
            validation_errors = new_config.validate()
            if validation_errors:
                result["errors"].extend(validation_errors)
                return result

            # Detect configuration changes
            changes = self._detect_config_changes(self.current_config, new_config)
            result["changes_applied"] = changes

            # Apply new configuration
            self.current_config = new_config
            await self._apply_workflow_configs()

            result["success"] = True
            logger.info(f"Reconfiguration successful: {len(changes)} changes applied")

        except Exception as e:
            result["errors"].append(f"Reconfiguration failed: {str(e)}")
            logger.error(f"Reconfiguration error: {e}")

        return result

    def _detect_config_changes(self, old_config: AdvancedWorkflowConfig,
                              new_config: AdvancedWorkflowConfig) -> list:
        """Detect configuration changes (simplified version)"""
        if not old_config:
            return ["initial_config"]

        changes = []
        if old_config.quality_level != new_config.quality_level:
            changes.append("quality_level")
        if old_config.batch_size != new_config.batch_size:
            changes.append("batch_size")
        if old_config.enable_caching != new_config.enable_caching:
            changes.append("caching")

        return changes

    def get_config_status(self) -> Dict[str, Any]:
        """Get current configuration status"""
        if not self.current_config:
            return {"configured": False}

        return {
            "configured": True,
            "quality_level": self.current_config.quality_level.value,
            "max_memory_gb": self.current_config.max_memory_usage_gb,
            "batch_size": self.current_config.batch_size,
            "workflows_enabled": {
                "hunyuan": self.current_config.enable_hunyuan,
                "wan": self.current_config.enable_wan,
                "newbie": self.current_config.enable_newbie,
                "qwen": self.current_config.enable_qwen
            },
            "manager_initialized": self.workflow_manager.is_initialized
        }

async def demonstrate_integration():
    """Demonstrate configuration integration with workflow components"""

    # Create config-aware workflow manager
    manager = ConfigAwareWorkflowManager()

    print("=== Configuration-Aware Workflow Manager Demo ===\n")

    # Initialize with default config
    print("1. Initializing with default configuration...")
    success = await manager.initialize_with_config()
    if success:
        print("✅ Initialization successful")
    else:
        print("❌ Initialization failed")
        return

    # Show current config status
    status = manager.get_config_status()
    print("Current configuration:")
    print(f"   Quality Level: {status['quality_level']}")
    print(f"   Max Memory: {status['max_memory_gb']} GB")
    print(f"   Batch Size: {status['batch_size']}")

    # Create a test workflow request (simplified)
    print("\n2. Testing workflow execution with current config...")

    # Note: In a real scenario, you'd create proper WorkflowRequest objects
    # For demo purposes, we'll just show the integration structure
    print("   (Workflow execution would happen here with proper request objects)")

    # Demonstrate reconfiguration
    print("\n3. Demonstrating runtime reconfiguration...")

    # Create high-quality config
    high_quality_config = AdvancedWorkflowConfig()
    high_quality_config.quality_level = QualityLevel.HIGH
    high_quality_config = ConfigurationManager().apply_quality_preset(
        high_quality_config, QualityLevel.HIGH
    )

    result = await manager.reconfigure(high_quality_config)
    if result["success"]:
        print("✅ Reconfiguration successful")
        print(f"   Changes applied: {result['changes_applied']}")
    else:
        print(f"❌ Reconfiguration failed: {result['errors']}")

    # Show updated status
    updated_status = manager.get_config_status()
    print("\nUpdated configuration:")
    print(f"   Quality Level: {updated_status['quality_level']}")
    print(f"   HunyuanVideo Steps: {high_quality_config.hunyuan_config.steps}")

if __name__ == "__main__":
    asyncio.run(demonstrate_integration())