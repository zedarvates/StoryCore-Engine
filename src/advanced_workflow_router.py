"""
Advanced Workflow Router for intelligent workflow selection.

This module provides intelligent routing of requests to the most appropriate
advanced ComfyUI workflows based on capabilities, performance, and requirements.
"""

from typing import Dict, List, Optional, Tuple, Any
import logging
from dataclasses import dataclass, field
from enum import Enum
import asyncio

try:
    from .advanced_workflow_base import (
        BaseAdvancedWorkflow,
        WorkflowType,
        WorkflowCapability,
        WorkflowRequest,
        WorkflowResult,
        WorkflowCapabilityScore
    )
    from .advanced_workflow_registry import AdvancedWorkflowRegistry
except ImportError:
    # Fallback for standalone usage
    from advanced_workflow_base import (
        BaseAdvancedWorkflow,
        WorkflowType,
        WorkflowCapability,
        WorkflowRequest,
        WorkflowResult,
        WorkflowCapabilityScore
    )
    from advanced_workflow_registry import AdvancedWorkflowRegistry

logger = logging.getLogger(__name__)


class RoutingStrategy(Enum):
    """Routing strategy options."""
    BEST_QUALITY = "best_quality"
    FASTEST = "fastest"
    BALANCED = "balanced"
    LEAST_MEMORY = "least_memory"
    ROUND_ROBIN = "round_robin"


@dataclass
class RoutingDecision:
    """Result of workflow routing decision."""
    selected_workflow: str
    confidence: float
    reasoning: str
    alternatives: List[Tuple[str, float]] = field(default_factory=list)
    estimated_time: Optional[float] = None
    estimated_memory: Optional[float] = None


@dataclass
class WorkflowPerformanceProfile:
    """Performance profile for a workflow."""
    workflow_name: str
    average_execution_time: float
    memory_usage: float
    success_rate: float
    quality_score: float
    last_updated: float


class AdvancedWorkflowRouter:
    """
    Routes requests to appropriate advanced workflows.
    
    This class implements intelligent routing algorithms to select the best
    workflow for each request based on capabilities, performance, and constraints.
    """
    
    def __init__(self, registry: AdvancedWorkflowRegistry):
        """
        Initialize the workflow router.
        
        Args:
            registry: The workflow registry to use for routing
        """
        self.registry = registry
        self.logger = logging.getLogger(f"{__name__}.AdvancedWorkflowRouter")
        
        # Performance tracking
        self.performance_profiles: Dict[str, WorkflowPerformanceProfile] = {}
        
        # Routing statistics
        self.routing_stats = {
            "total_requests": 0,
            "successful_routes": 0,
            "failed_routes": 0,
            "strategy_usage": {strategy.value: 0 for strategy in RoutingStrategy}
        }
        
        # Build capability matrix
        self.capability_matrix = self._build_capability_matrix()
    
    def _build_capability_matrix(self) -> Dict[str, Dict[str, float]]:
        """
        Build matrix of workflow capabilities and scores.
        
        Returns:
            Dictionary mapping workflow names to capability scores
        """
        matrix = {}
        
        # Get all available workflows
        available_workflows = self.registry.list_available_workflows()
        
        for category, workflow_names in available_workflows.items():
            for workflow_name in workflow_names:
                workflow_key = f"{category}/{workflow_name}"
                instance = self.registry.get_workflow_instance(category, workflow_name)
                
                if instance:
                    matrix[workflow_key] = {}
                    
                    # Score each capability
                    for capability in WorkflowCapability:
                        if capability in instance.capabilities:
                            # Base score for supported capabilities
                            matrix[workflow_key][capability.value] = 0.8
                        else:
                            matrix[workflow_key][capability.value] = 0.0
        
        return matrix
    
    async def route_request(
        self, 
        request: WorkflowRequest, 
        strategy: RoutingStrategy = RoutingStrategy.BALANCED
    ) -> RoutingDecision:
        """
        Route a request to the best available workflow.
        
        Args:
            request: The workflow request to route
            strategy: The routing strategy to use
            
        Returns:
            RoutingDecision with selected workflow and reasoning
        """
        self.routing_stats["total_requests"] += 1
        self.routing_stats["strategy_usage"][strategy.value] += 1
        
        try:
            # Get candidate workflows
            candidates = await self._get_candidate_workflows(request)
            
            if not candidates:
                self.routing_stats["failed_routes"] += 1
                return RoutingDecision(
                    selected_workflow="",
                    confidence=0.0,
                    reasoning="No workflows available for the requested capabilities"
                )
            
            # Apply routing strategy
            decision = await self._apply_routing_strategy(request, candidates, strategy)
            
            if decision.selected_workflow:
                self.routing_stats["successful_routes"] += 1
            else:
                self.routing_stats["failed_routes"] += 1
            
            return decision
            
        except Exception as e:
            self.logger.error(f"Failed to route request: {str(e)}")
            self.routing_stats["failed_routes"] += 1
            return RoutingDecision(
                selected_workflow="",
                confidence=0.0,
                reasoning=f"Routing failed: {str(e)}"
            )
    
    async def _get_candidate_workflows(self, request: WorkflowRequest) -> List[str]:
        """
        Get candidate workflows that can handle the request.
        
        Args:
            request: The workflow request
            
        Returns:
            List of workflow keys that can handle the request
        """
        candidates = []
        
        # Get workflows by type
        category = request.workflow_type.value
        available_workflows = self.registry.list_available_workflows().get(category, [])
        
        for workflow_name in available_workflows:
            workflow_key = f"{category}/{workflow_name}"
            instance = self.registry.get_workflow_instance(category, workflow_name)
            
            if instance:
                # Check if workflow can handle required capabilities
                can_handle = True
                for required_capability in request.capabilities_required:
                    if required_capability not in instance.capabilities:
                        can_handle = False
                        break
                
                if can_handle:
                    # Validate the request with the workflow
                    try:
                        is_valid, _ = await instance.validate_request(request)
                        if is_valid:
                            candidates.append(workflow_key)
                    except Exception as e:
                        self.logger.warning(f"Failed to validate request with {workflow_key}: {str(e)}")
        
        return candidates
    
    async def _apply_routing_strategy(
        self, 
        request: WorkflowRequest, 
        candidates: List[str], 
        strategy: RoutingStrategy
    ) -> RoutingDecision:
        """
        Apply the specified routing strategy to select the best workflow.
        
        Args:
            request: The workflow request
            candidates: List of candidate workflow keys
            strategy: The routing strategy to apply
            
        Returns:
            RoutingDecision with the selected workflow
        """
        if not candidates:
            return RoutingDecision(
                selected_workflow="",
                confidence=0.0,
                reasoning="No candidate workflows available"
            )
        
        if len(candidates) == 1:
            return RoutingDecision(
                selected_workflow=candidates[0],
                confidence=1.0,
                reasoning="Only one workflow available"
            )
        
        # Apply strategy-specific logic
        if strategy == RoutingStrategy.BEST_QUALITY:
            return await self._route_by_quality(request, candidates)
        elif strategy == RoutingStrategy.FASTEST:
            return await self._route_by_speed(request, candidates)
        elif strategy == RoutingStrategy.BALANCED:
            return await self._route_balanced(request, candidates)
        elif strategy == RoutingStrategy.LEAST_MEMORY:
            return await self._route_by_memory(request, candidates)
        elif strategy == RoutingStrategy.ROUND_ROBIN:
            return await self._route_round_robin(request, candidates)
        else:
            # Default to balanced
            return await self._route_balanced(request, candidates)
    
    async def _route_by_quality(self, request: WorkflowRequest, candidates: List[str]) -> RoutingDecision:
        """Route based on expected quality."""
        scores = []
        
        for workflow_key in candidates:
            category, workflow_name = workflow_key.split('/')
            instance = self.registry.get_workflow_instance(category, workflow_name)
            
            if instance:
                # Calculate quality score based on capabilities and performance
                quality_score = 0.0
                
                for capability in request.capabilities_required:
                    cap_score = instance.get_capability_score(capability, request)
                    quality_score += cap_score.score
                
                # Normalize by number of capabilities
                if request.capabilities_required:
                    quality_score /= len(request.capabilities_required)
                
                # Adjust based on performance profile
                if workflow_key in self.performance_profiles:
                    profile = self.performance_profiles[workflow_key]
                    quality_score *= profile.quality_score
                
                scores.append((workflow_key, quality_score))
        
        # Sort by quality score (descending)
        scores.sort(key=lambda x: x[1], reverse=True)
        
        if scores:
            selected = scores[0][0]
            confidence = scores[0][1]
            alternatives = scores[1:4]  # Top 3 alternatives
            
            return RoutingDecision(
                selected_workflow=selected,
                confidence=confidence,
                reasoning=f"Selected for highest quality score: {confidence:.3f}",
                alternatives=alternatives
            )
        
        return RoutingDecision(
            selected_workflow="",
            confidence=0.0,
            reasoning="Failed to calculate quality scores"
        )
    
    async def _route_by_speed(self, request: WorkflowRequest, candidates: List[str]) -> RoutingDecision:
        """Route based on expected execution speed."""
        speed_scores = []
        
        for workflow_key in candidates:
            category, workflow_name = workflow_key.split('/')
            instance = self.registry.get_workflow_instance(category, workflow_name)
            
            if instance:
                # Use performance profile if available
                if workflow_key in self.performance_profiles:
                    profile = self.performance_profiles[workflow_key]
                    execution_time = profile.average_execution_time
                else:
                    # Estimate based on workflow characteristics
                    execution_time = self._estimate_execution_time(instance, request)
                
                # Convert to speed score (inverse of time)
                speed_score = 1.0 / max(execution_time, 1.0)
                speed_scores.append((workflow_key, speed_score, execution_time))
        
        # Sort by speed score (descending)
        speed_scores.sort(key=lambda x: x[1], reverse=True)
        
        if speed_scores:
            selected = speed_scores[0][0]
            confidence = min(1.0, speed_scores[0][1])
            estimated_time = speed_scores[0][2]
            alternatives = [(key, score) for key, score, _ in speed_scores[1:4]]
            
            return RoutingDecision(
                selected_workflow=selected,
                confidence=confidence,
                reasoning=f"Selected for fastest execution: {estimated_time:.1f}s estimated",
                alternatives=alternatives,
                estimated_time=estimated_time
            )
        
        return RoutingDecision(
            selected_workflow="",
            confidence=0.0,
            reasoning="Failed to calculate speed scores"
        )
    
    async def _route_balanced(self, request: WorkflowRequest, candidates: List[str]) -> RoutingDecision:
        """Route based on balanced quality and speed."""
        balanced_scores = []
        
        for workflow_key in candidates:
            category, workflow_name = workflow_key.split('/')
            instance = self.registry.get_workflow_instance(category, workflow_name)
            
            if instance:
                # Calculate quality score
                quality_score = 0.0
                for capability in request.capabilities_required:
                    cap_score = instance.get_capability_score(capability, request)
                    quality_score += cap_score.score
                
                if request.capabilities_required:
                    quality_score /= len(request.capabilities_required)
                
                # Calculate speed score
                if workflow_key in self.performance_profiles:
                    profile = self.performance_profiles[workflow_key]
                    execution_time = profile.average_execution_time
                else:
                    execution_time = self._estimate_execution_time(instance, request)
                
                speed_score = 1.0 / max(execution_time, 1.0)
                
                # Balanced score (weighted average)
                balanced_score = (0.6 * quality_score) + (0.4 * min(1.0, speed_score))
                
                balanced_scores.append((workflow_key, balanced_score, execution_time))
        
        # Sort by balanced score (descending)
        balanced_scores.sort(key=lambda x: x[1], reverse=True)
        
        if balanced_scores:
            selected = balanced_scores[0][0]
            confidence = balanced_scores[0][1]
            estimated_time = balanced_scores[0][2]
            alternatives = [(key, score) for key, score, _ in balanced_scores[1:4]]
            
            return RoutingDecision(
                selected_workflow=selected,
                confidence=confidence,
                reasoning=f"Selected for balanced quality/speed: {confidence:.3f}",
                alternatives=alternatives,
                estimated_time=estimated_time
            )
        
        return RoutingDecision(
            selected_workflow="",
            confidence=0.0,
            reasoning="Failed to calculate balanced scores"
        )
    
    async def _route_by_memory(self, request: WorkflowRequest, candidates: List[str]) -> RoutingDecision:
        """Route based on memory usage."""
        memory_scores = []
        
        for workflow_key in candidates:
            category, workflow_name = workflow_key.split('/')
            instance = self.registry.get_workflow_instance(category, workflow_name)
            
            if instance:
                memory_req = instance.memory_requirements.get('vram_peak', 16.0)
                
                # Use performance profile if available
                if workflow_key in self.performance_profiles:
                    profile = self.performance_profiles[workflow_key]
                    memory_usage = profile.memory_usage
                else:
                    memory_usage = memory_req
                
                # Convert to score (inverse of memory usage)
                memory_score = 1.0 / max(memory_usage, 1.0)
                memory_scores.append((workflow_key, memory_score, memory_usage))
        
        # Sort by memory score (descending - less memory is better)
        memory_scores.sort(key=lambda x: x[1], reverse=True)
        
        if memory_scores:
            selected = memory_scores[0][0]
            confidence = min(1.0, memory_scores[0][1])
            estimated_memory = memory_scores[0][2]
            alternatives = [(key, score) for key, score, _ in memory_scores[1:4]]
            
            return RoutingDecision(
                selected_workflow=selected,
                confidence=confidence,
                reasoning=f"Selected for lowest memory usage: {estimated_memory:.1f}GB",
                alternatives=alternatives,
                estimated_memory=estimated_memory
            )
        
        return RoutingDecision(
            selected_workflow="",
            confidence=0.0,
            reasoning="Failed to calculate memory scores"
        )
    
    async def _route_round_robin(self, request: WorkflowRequest, candidates: List[str]) -> RoutingDecision:
        """Route using round-robin strategy."""
        # Simple round-robin based on total requests
        index = self.routing_stats["total_requests"] % len(candidates)
        selected = candidates[index]
        
        return RoutingDecision(
            selected_workflow=selected,
            confidence=0.8,
            reasoning=f"Selected using round-robin strategy (index {index})",
            alternatives=[(key, 0.8) for key in candidates if key != selected]
        )
    
    def _estimate_execution_time(self, workflow: BaseAdvancedWorkflow, request: WorkflowRequest) -> float:
        """Estimate execution time for a workflow and request."""
        # Base time estimates by workflow type
        base_times = {
            WorkflowType.VIDEO: 120.0,  # 2 minutes for video
            WorkflowType.IMAGE: 30.0    # 30 seconds for image
        }
        
        base_time = base_times.get(workflow.workflow_type, 60.0)
        
        # Adjust based on quality mode
        if request.quality_mode == "fast":
            base_time *= 0.5
        elif request.quality_mode == "quality":
            base_time *= 2.0
        
        # Adjust based on resolution
        if request.output_resolution:
            width, height = request.output_resolution
            pixel_count = width * height
            
            # Scale based on pixel count (1080p as baseline)
            baseline_pixels = 1920 * 1080
            scale_factor = pixel_count / baseline_pixels
            base_time *= max(0.5, min(3.0, scale_factor))
        
        return base_time
    
    def update_performance_profile(
        self, 
        workflow_key: str, 
        execution_time: float, 
        memory_usage: float, 
        success: bool, 
        quality_score: float = 0.8
    ):
        """Update performance profile for a workflow."""
        import time
        
        if workflow_key not in self.performance_profiles:
            self.performance_profiles[workflow_key] = WorkflowPerformanceProfile(
                workflow_name=workflow_key,
                average_execution_time=execution_time,
                memory_usage=memory_usage,
                success_rate=1.0 if success else 0.0,
                quality_score=quality_score,
                last_updated=time.time()
            )
        else:
            profile = self.performance_profiles[workflow_key]
            
            # Update with exponential moving average
            alpha = 0.2  # Learning rate
            profile.average_execution_time = (
                (1 - alpha) * profile.average_execution_time + 
                alpha * execution_time
            )
            profile.memory_usage = (
                (1 - alpha) * profile.memory_usage + 
                alpha * memory_usage
            )
            profile.quality_score = (
                (1 - alpha) * profile.quality_score + 
                alpha * quality_score
            )
            
            # Update success rate
            profile.success_rate = (
                (1 - alpha) * profile.success_rate + 
                alpha * (1.0 if success else 0.0)
            )
            
            profile.last_updated = time.time()
    
    def get_routing_stats(self) -> Dict[str, Any]:
        """Get routing statistics."""
        success_rate = 0.0
        if self.routing_stats["total_requests"] > 0:
            success_rate = (
                self.routing_stats["successful_routes"] / 
                self.routing_stats["total_requests"]
            )
        
        return {
            **self.routing_stats,
            "success_rate": success_rate,
            "performance_profiles": len(self.performance_profiles),
            "capability_matrix_size": len(self.capability_matrix)
        }
    
    def get_performance_profiles(self) -> Dict[str, Dict[str, Any]]:
        """Get all performance profiles."""
        return {
            key: {
                "workflow_name": profile.workflow_name,
                "average_execution_time": profile.average_execution_time,
                "memory_usage": profile.memory_usage,
                "success_rate": profile.success_rate,
                "quality_score": profile.quality_score,
                "last_updated": profile.last_updated
            }
            for key, profile in self.performance_profiles.items()
        }