"""
Advanced Workflow Registry for managing ComfyUI workflows.

This module provides the registry system for discovering, registering,
and managing advanced ComfyUI workflows.
"""

from typing import Dict, List, Type, Optional, Any
import logging
from pathlib import Path
import importlib
import importlib.util
import inspect

try:
    from .advanced_workflow_base import (
        BaseAdvancedWorkflow, 
        WorkflowType, 
        WorkflowCapability,
        WorkflowRequest,
        WorkflowCapabilityScore
    )
except ImportError:
    # Fallback for standalone usage
    from advanced_workflow_base import (
        BaseAdvancedWorkflow, 
        WorkflowType, 
        WorkflowCapability,
        WorkflowRequest,
        WorkflowCapabilityScore
    )

logger = logging.getLogger(__name__)


class AdvancedWorkflowRegistry:
    """
    Registry for managing advanced ComfyUI workflows.
    
    This class handles workflow discovery, registration, and retrieval,
    providing a centralized way to manage all available workflows.
    """
    
    def __init__(self):
        """Initialize the workflow registry."""
        self.workflows: Dict[str, Dict[str, Type[BaseAdvancedWorkflow]]] = {
            'video': {},
            'image': {}
        }
        self.workflow_instances: Dict[str, BaseAdvancedWorkflow] = {}
        self.capability_matrix: Dict[WorkflowCapability, List[str]] = {}
        self.logger = logging.getLogger(f"{__name__}.AdvancedWorkflowRegistry")
        
        # Initialize capability matrix
        self._initialize_capability_matrix()
    
    def _initialize_capability_matrix(self):
        """Initialize the capability matrix."""
        for capability in WorkflowCapability:
            self.capability_matrix[capability] = []
    
    def register_workflow(
        self, 
        category: str, 
        name: str, 
        workflow_class: Type[BaseAdvancedWorkflow]
    ) -> bool:
        """
        Register a new workflow type.
        
        Args:
            category: Workflow category ('video' or 'image')
            name: Unique name for the workflow
            workflow_class: The workflow class to register
            
        Returns:
            True if registration successful, False otherwise
        """
        try:
            # Validate category
            if category not in ['video', 'image']:
                self.logger.error(f"Invalid workflow category: {category}")
                return False
            
            # Validate workflow class
            if not issubclass(workflow_class, BaseAdvancedWorkflow):
                self.logger.error(f"Workflow class {workflow_class} must inherit from BaseAdvancedWorkflow")
                return False
            
            # Check for duplicate names
            if name in self.workflows[category]:
                self.logger.warning(f"Workflow {name} already registered in category {category}, overwriting")
            
            # Register the workflow
            self.workflows[category][name] = workflow_class
            
            # Update capability matrix (we'll need to instantiate to get capabilities)
            # For now, we'll update this when workflows are instantiated
            
            self.logger.info(f"Successfully registered workflow: {category}/{name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to register workflow {category}/{name}: {str(e)}")
            return False
    
    def get_workflow_class(self, category: str, workflow_type: str) -> Optional[Type[BaseAdvancedWorkflow]]:
        """
        Get workflow class by category and type.
        
        Args:
            category: Workflow category ('video' or 'image')
            workflow_type: Workflow type name
            
        Returns:
            Workflow class if found, None otherwise
        """
        if category not in self.workflows:
            return None
        
        return self.workflows[category].get(workflow_type)
    
    def get_workflow_instance(
        self, 
        category: str, 
        workflow_type: str, 
        config: Optional[Dict[str, Any]] = None
    ) -> Optional[BaseAdvancedWorkflow]:
        """
        Get or create workflow instance.
        
        Args:
            category: Workflow category ('video' or 'image')
            workflow_type: Workflow type name
            config: Configuration for the workflow
            
        Returns:
            Workflow instance if found/created, None otherwise
        """
        workflow_key = f"{category}/{workflow_type}"
        
        # Return existing instance if available
        if workflow_key in self.workflow_instances:
            return self.workflow_instances[workflow_key]
        
        # Get workflow class
        workflow_class = self.get_workflow_class(category, workflow_type)
        if not workflow_class:
            self.logger.error(f"Workflow class not found: {workflow_key}")
            return None
        
        try:
            # Create new instance
            workflow_type_enum = WorkflowType.VIDEO if category == 'video' else WorkflowType.IMAGE
            instance = workflow_class(
                name=workflow_type,
                workflow_type=workflow_type_enum,
                config=config or {}
            )
            
            # Cache the instance
            self.workflow_instances[workflow_key] = instance
            
            # Update capability matrix
            self._update_capability_matrix(workflow_key, instance)
            
            self.logger.info(f"Created workflow instance: {workflow_key}")
            return instance
            
        except Exception as e:
            self.logger.error(f"Failed to create workflow instance {workflow_key}: {str(e)}")
            return None
    
    def _update_capability_matrix(self, workflow_key: str, instance: BaseAdvancedWorkflow):
        """Update the capability matrix with workflow capabilities."""
        for capability in instance.capabilities:
            if workflow_key not in self.capability_matrix[capability]:
                self.capability_matrix[capability].append(workflow_key)
    
    def list_available_workflows(self) -> Dict[str, List[str]]:
        """
        List all available workflows by category.
        
        Returns:
            Dictionary mapping categories to workflow names
        """
        return {
            category: list(workflows.keys())
            for category, workflows in self.workflows.items()
        }
    
    def get_workflows_by_capability(self, capability: WorkflowCapability) -> List[str]:
        """
        Get workflows that support a specific capability.
        
        Args:
            capability: The capability to search for
            
        Returns:
            List of workflow keys that support the capability
        """
        return self.capability_matrix.get(capability, [])
    
    def discover_workflows(self, search_paths: List[str]) -> int:
        """
        Discover and register workflows from specified paths.
        
        Args:
            search_paths: List of paths to search for workflow modules
            
        Returns:
            Number of workflows discovered and registered
        """
        discovered_count = 0
        
        for search_path in search_paths:
            path = Path(search_path)
            if not path.exists():
                self.logger.warning(f"Search path does not exist: {search_path}")
                continue
            
            # Search for Python files
            for py_file in path.glob("**/*_workflow.py"):
                try:
                    # Import the module
                    module_name = py_file.stem
                    spec = importlib.util.spec_from_file_location(module_name, py_file)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Find workflow classes
                    for name, obj in inspect.getmembers(module, inspect.isclass):
                        if (issubclass(obj, BaseAdvancedWorkflow) and 
                            obj != BaseAdvancedWorkflow):
                            
                            # Determine category from workflow type
                            try:
                                temp_instance = obj("temp", WorkflowType.VIDEO, {})
                                category = temp_instance.workflow_type.value
                                
                                # Register the workflow
                                if self.register_workflow(category, name.lower(), obj):
                                    discovered_count += 1
                                    
                            except Exception as e:
                                self.logger.error(f"Failed to instantiate {name} for discovery: {str(e)}")
                
                except Exception as e:
                    self.logger.error(f"Failed to import workflow module {py_file}: {str(e)}")
        
        self.logger.info(f"Discovered and registered {discovered_count} workflows")
        return discovered_count
    
    def get_registry_status(self) -> Dict[str, Any]:
        """
        Get current registry status.
        
        Returns:
            Dictionary containing registry statistics and status
        """
        total_workflows = sum(len(workflows) for workflows in self.workflows.values())
        active_instances = len(self.workflow_instances)
        
        capability_stats = {
            capability.value: len(workflow_keys)
            for capability, workflow_keys in self.capability_matrix.items()
        }
        
        return {
            "total_registered_workflows": total_workflows,
            "active_instances": active_instances,
            "workflows_by_category": {
                category: len(workflows)
                for category, workflows in self.workflows.items()
            },
            "capability_coverage": capability_stats,
            "available_workflows": self.list_available_workflows()
        }
    
    def validate_registry(self) -> Dict[str, Any]:
        """
        Validate the registry and all registered workflows.
        
        Returns:
            Validation report with any issues found
        """
        issues = []
        warnings = []
        
        # Check for empty categories
        for category, workflows in self.workflows.items():
            if not workflows:
                warnings.append(f"No workflows registered in category: {category}")
        
        # Check capability coverage
        uncovered_capabilities = [
            capability.value for capability, workflows in self.capability_matrix.items()
            if not workflows
        ]
        
        if uncovered_capabilities:
            warnings.append(f"No workflows available for capabilities: {uncovered_capabilities}")
        
        # Validate workflow instances
        for workflow_key, instance in self.workflow_instances.items():
            try:
                status = instance.get_status()
                if not status.get("capabilities"):
                    issues.append(f"Workflow {workflow_key} has no capabilities defined")
            except Exception as e:
                issues.append(f"Failed to get status for workflow {workflow_key}: {str(e)}")
        
        return {
            "is_valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "total_workflows": sum(len(workflows) for workflows in self.workflows.values()),
            "total_instances": len(self.workflow_instances)
        }
    
    def cleanup_instances(self):
        """Clean up workflow instances to free memory."""
        for workflow_key, instance in list(self.workflow_instances.items()):
            try:
                if hasattr(instance, 'unload_models'):
                    asyncio.create_task(instance.unload_models())
            except Exception as e:
                self.logger.error(f"Failed to unload models for {workflow_key}: {str(e)}")
        
        self.workflow_instances.clear()
        self.logger.info("Cleaned up all workflow instances")


# Global registry instance
_global_registry: Optional[AdvancedWorkflowRegistry] = None


def get_global_registry() -> AdvancedWorkflowRegistry:
    """Get the global workflow registry instance."""
    global _global_registry
    if _global_registry is None:
        _global_registry = AdvancedWorkflowRegistry()
    return _global_registry


def register_workflow(category: str, name: str, workflow_class: Type[BaseAdvancedWorkflow]) -> bool:
    """Convenience function to register a workflow with the global registry."""
    return get_global_registry().register_workflow(category, name, workflow_class)


def get_workflow(category: str, workflow_type: str, config: Optional[Dict[str, Any]] = None) -> Optional[BaseAdvancedWorkflow]:
    """Convenience function to get a workflow from the global registry."""
    return get_global_registry().get_workflow_instance(category, workflow_type, config)