"""
Advanced Workflow Manager - Main orchestration class.

This module provides the main manager class that orchestrates all advanced
ComfyUI workflows, handling registration, routing, execution, and monitoring.
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
import asyncio
import time
from pathlib import Path

try:
    from .advanced_workflow_base import (
        BaseAdvancedWorkflow,
        WorkflowType,
        WorkflowCapability,
        WorkflowRequest,
        WorkflowResult,
        WorkflowExecutionError,
    )
except ImportError:
    # Fallback for standalone usage
    from advanced_workflow_base import (
        BaseAdvancedWorkflow,
        WorkflowType,
        WorkflowCapability,
        WorkflowRequest,
        WorkflowResult,
        WorkflowExecutionError,
    WorkflowValidationError
)

try:
    from .advanced_workflow_registry import AdvancedWorkflowRegistry
    from .advanced_workflow_router import AdvancedWorkflowRouter, RoutingStrategy
    from .advanced_workflow_config import AdvancedWorkflowConfigManager, get_global_config
except ImportError:
    # Fallback for standalone usage
    from advanced_workflow_registry import AdvancedWorkflowRegistry
    from advanced_workflow_router import AdvancedWorkflowRouter, RoutingStrategy
    from advanced_workflow_config import AdvancedWorkflowConfigManager, get_global_config

logger = logging.getLogger(__name__)


class AdvancedWorkflowManager:
    """
    Main manager for advanced ComfyUI workflows.
    
    This class provides the primary interface for managing and executing
    advanced workflows, handling all aspects from registration to execution.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the advanced workflow manager.
        
        Args:
            config_path: Optional path to configuration file
        """
        # Initialize components
        self.config_manager = AdvancedWorkflowConfigManager(config_path) if config_path else get_global_config()
        self.registry = AdvancedWorkflowRegistry()
        self.router = AdvancedWorkflowRouter(self.registry)
        
        self.logger = logging.getLogger(f"{__name__}.AdvancedWorkflowManager")
        
        # Manager state
        self.is_initialized = False
        self.active_executions: Dict[str, asyncio.Task] = {}
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "total_execution_time": 0.0,
            "average_execution_time": 0.0
        }
        
        # Performance monitoring
        self.performance_history: List[Dict[str, Any]] = []
        self.max_history_size = 1000
    
    async def initialize(self, workflow_search_paths: Optional[List[str]] = None) -> bool:
        """
        Initialize the workflow manager.
        
        Args:
            workflow_search_paths: Optional paths to search for workflow implementations
            
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            self.logger.info("Initializing Advanced Workflow Manager...")
            
            # Discover and register workflows
            if workflow_search_paths:
                discovered_count = self.registry.discover_workflows(workflow_search_paths)
                self.logger.info(f"Discovered {discovered_count} workflows")
            
            # Validate configuration
            config_validation = self.config_manager.validate_config()
            if not config_validation["is_valid"]:
                self.logger.warning(f"Configuration issues found: {config_validation['issues']}")
            
            # Validate registry
            registry_validation = self.registry.validate_registry()
            if not registry_validation["is_valid"]:
                self.logger.warning(f"Registry issues found: {registry_validation['issues']}")
            
            self.is_initialized = True
            self.logger.info("Advanced Workflow Manager initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Advanced Workflow Manager: {str(e)}")
            return False
    
    async def execute_workflow(
        self, 
        request: WorkflowRequest, 
        routing_strategy: RoutingStrategy = RoutingStrategy.BALANCED
    ) -> WorkflowResult:
        """
        Execute a workflow request.
        
        Args:
            request: The workflow request to execute
            routing_strategy: Strategy for selecting the workflow
            
        Returns:
            WorkflowResult with execution results
        """
        if not self.is_initialized:
            raise RuntimeError("Workflow manager not initialized")
        
        execution_id = f"exec_{int(time.time() * 1000)}"
        start_time = time.time()
        
        self.stats["total_requests"] += 1
        
        try:
            self.logger.info(f"Executing workflow request {execution_id}")
            
            # Route the request
            routing_decision = await self.router.route_request(request, routing_strategy)
            
            if not routing_decision.selected_workflow:
                raise WorkflowExecutionError(
                    "routing",
                    f"No suitable workflow found: {routing_decision.reasoning}"
                )
            
            self.logger.info(
                f"Routed to workflow: {routing_decision.selected_workflow} "
                f"(confidence: {routing_decision.confidence:.3f})"
            )
            
            # Get workflow instance
            category, workflow_name = routing_decision.selected_workflow.split('/')
            workflow_config = self.config_manager.get_workflow_config(workflow_name)
            workflow = self.registry.get_workflow_instance(
                category, 
                workflow_name, 
                workflow_config.__dict__ if workflow_config else None
            )
            
            if not workflow:
                raise WorkflowExecutionError(
                    routing_decision.selected_workflow,
                    "Failed to get workflow instance"
                )
            
            # Validate request with selected workflow
            is_valid, validation_error = await workflow.validate_request(request)
            if not is_valid:
                raise WorkflowValidationError(
                    routing_decision.selected_workflow,
                    validation_error,
                    request
                )
            
            # Load models if needed
            if not workflow.is_loaded:
                self.logger.info(f"Loading models for {routing_decision.selected_workflow}")
                load_success = await workflow.load_models()
                if not load_success:
                    raise WorkflowExecutionError(
                        routing_decision.selected_workflow,
                        "Failed to load required models"
                    )
            
            # Execute the workflow
            self.logger.info(f"Executing workflow {routing_decision.selected_workflow}")
            execution_task = asyncio.create_task(workflow.execute(request))
            self.active_executions[execution_id] = execution_task
            
            try:
                result = await execution_task
            finally:
                # Clean up active execution
                if execution_id in self.active_executions:
                    del self.active_executions[execution_id]
            
            # Calculate execution time
            execution_time = time.time() - start_time
            result.execution_time = execution_time
            
            # Update statistics
            if result.success:
                self.stats["successful_executions"] += 1
            else:
                self.stats["failed_executions"] += 1
            
            self.stats["total_execution_time"] += execution_time
            self.stats["average_execution_time"] = (
                self.stats["total_execution_time"] / self.stats["total_requests"]
            )
            
            # Update performance profiles
            self.router.update_performance_profile(
                routing_decision.selected_workflow,
                execution_time,
                result.memory_used,
                result.success,
                self._calculate_quality_score(result)
            )
            
            # Update workflow performance stats
            workflow.update_performance_stats(execution_time)
            
            # Record performance history
            self._record_performance(
                execution_id,
                routing_decision.selected_workflow,
                execution_time,
                result.success,
                result.memory_used
            )
            
            self.logger.info(
                f"Workflow execution completed: {execution_id} "
                f"(success: {result.success}, time: {execution_time:.2f}s)"
            )
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            self.stats["failed_executions"] += 1
            self.stats["total_execution_time"] += execution_time
            self.stats["average_execution_time"] = (
                self.stats["total_execution_time"] / self.stats["total_requests"]
            )
            
            self.logger.error(f"Workflow execution failed: {execution_id} - {str(e)}")
            
            return WorkflowResult(
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
    
    def _calculate_quality_score(self, result: WorkflowResult) -> float:
        """Calculate quality score from workflow result."""
        if not result.success:
            return 0.0
        
        # Use quality metrics if available
        if result.quality_metrics:
            # Average of available quality metrics
            scores = [score for score in result.quality_metrics.values() if isinstance(score, (int, float))]
            if scores:
                return sum(scores) / len(scores)
        
        # Default quality score for successful executions
        return 0.8
    
    def _record_performance(
        self, 
        execution_id: str, 
        workflow_name: str, 
        execution_time: float, 
        success: bool, 
        memory_used: float
    ):
        """Record performance data for analysis."""
        performance_record = {
            "execution_id": execution_id,
            "workflow_name": workflow_name,
            "execution_time": execution_time,
            "success": success,
            "memory_used": memory_used,
            "timestamp": time.time()
        }
        
        self.performance_history.append(performance_record)
        
        # Limit history size
        if len(self.performance_history) > self.max_history_size:
            self.performance_history = self.performance_history[-self.max_history_size:]
    
    async def cancel_execution(self, execution_id: str) -> bool:
        """
        Cancel an active execution.
        
        Args:
            execution_id: ID of the execution to cancel
            
        Returns:
            True if cancellation successful, False otherwise
        """
        if execution_id not in self.active_executions:
            return False
        
        try:
            task = self.active_executions[execution_id]
            task.cancel()
            
            try:
                await task
            except asyncio.CancelledError:
                pass
            
            del self.active_executions[execution_id]
            self.logger.info(f"Cancelled execution: {execution_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to cancel execution {execution_id}: {str(e)}")
            return False
    
    def get_available_workflows(self) -> Dict[str, List[str]]:
        """Get list of available workflows."""
        return self.registry.list_available_workflows()
    
    def get_workflow_capabilities(self, category: str, workflow_name: str) -> List[WorkflowCapability]:
        """
        Get capabilities of a specific workflow.
        
        Args:
            category: Workflow category
            workflow_name: Workflow name
            
        Returns:
            List of capabilities
        """
        workflow = self.registry.get_workflow_instance(category, workflow_name)
        return workflow.capabilities if workflow else []
    
    def get_workflows_by_capability(self, capability: WorkflowCapability) -> List[str]:
        """Get workflows that support a specific capability."""
        return self.registry.get_workflows_by_capability(capability)
    
    def get_manager_status(self) -> Dict[str, Any]:
        """Get comprehensive manager status."""
        registry_status = self.registry.get_registry_status()
        routing_stats = self.router.get_routing_stats()
        
        return {
            "is_initialized": self.is_initialized,
            "active_executions": len(self.active_executions),
            "execution_stats": self.stats,
            "registry_status": registry_status,
            "routing_stats": routing_stats,
            "performance_history_size": len(self.performance_history),
            "config_validation": self.config_manager.validate_config()
        }
    
    def get_performance_analytics(self) -> Dict[str, Any]:
        """Get performance analytics and insights."""
        if not self.performance_history:
            return {"message": "No performance data available"}
        
        # Calculate analytics
        total_executions = len(self.performance_history)
        successful_executions = sum(1 for record in self.performance_history if record["success"])
        success_rate = successful_executions / total_executions if total_executions > 0 else 0.0
        
        execution_times = [record["execution_time"] for record in self.performance_history]
        avg_execution_time = sum(execution_times) / len(execution_times)
        
        memory_usage = [record["memory_used"] for record in self.performance_history if record["memory_used"] > 0]
        avg_memory_usage = sum(memory_usage) / len(memory_usage) if memory_usage else 0.0
        
        # Workflow performance breakdown
        workflow_stats = {}
        for record in self.performance_history:
            workflow_name = record["workflow_name"]
            if workflow_name not in workflow_stats:
                workflow_stats[workflow_name] = {
                    "executions": 0,
                    "successes": 0,
                    "total_time": 0.0,
                    "total_memory": 0.0
                }
            
            stats = workflow_stats[workflow_name]
            stats["executions"] += 1
            if record["success"]:
                stats["successes"] += 1
            stats["total_time"] += record["execution_time"]
            if record["memory_used"] > 0:
                stats["total_memory"] += record["memory_used"]
        
        # Calculate averages for each workflow
        for workflow_name, stats in workflow_stats.items():
            stats["success_rate"] = stats["successes"] / stats["executions"]
            stats["avg_execution_time"] = stats["total_time"] / stats["executions"]
            stats["avg_memory_usage"] = stats["total_memory"] / stats["executions"] if stats["executions"] > 0 else 0.0
        
        return {
            "total_executions": total_executions,
            "success_rate": success_rate,
            "average_execution_time": avg_execution_time,
            "average_memory_usage": avg_memory_usage,
            "workflow_performance": workflow_stats,
            "recent_performance": self.performance_history[-10:] if len(self.performance_history) >= 10 else self.performance_history
        }
    
    async def cleanup(self):
        """Clean up resources and active executions."""
        self.logger.info("Cleaning up Advanced Workflow Manager...")
        
        # Cancel active executions
        for execution_id in list(self.active_executions.keys()):
            await self.cancel_execution(execution_id)
        
        # Clean up registry instances
        self.registry.cleanup_instances()
        
        self.logger.info("Advanced Workflow Manager cleanup completed")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on the workflow manager."""
        health_status = {
            "status": "healthy",
            "issues": [],
            "warnings": []
        }
        
        try:
            # Check initialization
            if not self.is_initialized:
                health_status["issues"].append("Manager not initialized")
                health_status["status"] = "unhealthy"
            
            # Check registry
            registry_validation = self.registry.validate_registry()
            if not registry_validation["is_valid"]:
                health_status["issues"].extend(registry_validation["issues"])
                health_status["status"] = "unhealthy"
            
            if registry_validation["warnings"]:
                health_status["warnings"].extend(registry_validation["warnings"])
            
            # Check configuration
            config_validation = self.config_manager.validate_config()
            if not config_validation["is_valid"]:
                health_status["issues"].extend(config_validation["issues"])
                health_status["status"] = "unhealthy"
            
            if config_validation["warnings"]:
                health_status["warnings"].extend(config_validation["warnings"])
            
            # Check active executions
            if len(self.active_executions) > 10:  # Arbitrary threshold
                health_status["warnings"].append(f"High number of active executions: {len(self.active_executions)}")
            
            # Check success rate
            if self.stats["total_requests"] > 10:  # Only check if we have enough data
                success_rate = self.stats["successful_executions"] / self.stats["total_requests"]
                if success_rate < 0.8:
                    health_status["warnings"].append(f"Low success rate: {success_rate:.2%}")
            
            # Set status based on issues
            if health_status["issues"]:
                health_status["status"] = "unhealthy"
            elif health_status["warnings"]:
                health_status["status"] = "degraded"
            
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["issues"].append(f"Health check failed: {str(e)}")
        
        return health_status


# Global manager instance
_global_manager: Optional[AdvancedWorkflowManager] = None


def get_global_manager() -> AdvancedWorkflowManager:
    """Get the global workflow manager instance."""
    global _global_manager
    if _global_manager is None:
        _global_manager = AdvancedWorkflowManager()
    return _global_manager


async def execute_workflow(
    request: WorkflowRequest, 
    routing_strategy: RoutingStrategy = RoutingStrategy.BALANCED
) -> WorkflowResult:
    """Convenience function to execute a workflow using the global manager."""
    manager = get_global_manager()
    if not manager.is_initialized:
        await manager.initialize()
    return await manager.execute_workflow(request, routing_strategy)