"""
Base classes for advanced ComfyUI workflow integration.

This module provides the foundation classes for managing and executing
advanced ComfyUI workflows in the StoryCore-Engine pipeline.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Union, Tuple
from enum import Enum
import logging
import asyncio
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)


class WorkflowType(Enum):
    """Enumeration of workflow types."""
    VIDEO = "video"
    IMAGE = "image"


class WorkflowCapability(Enum):
    """Enumeration of workflow capabilities."""
    TEXT_TO_VIDEO = "text_to_video"
    IMAGE_TO_VIDEO = "image_to_video"
    VIDEO_INPAINTING = "video_inpainting"
    ALPHA_VIDEO = "alpha_video"
    TEXT_TO_IMAGE = "text_to_image"
    IMAGE_EDITING = "image_editing"
    IMAGE_RELIGHTING = "image_relighting"
    LAYERED_GENERATION = "layered_generation"
    ANIME_GENERATION = "anime_generation"
    SUPER_RESOLUTION = "super_resolution"


@dataclass
class WorkflowRequest:
    """Base class for workflow requests."""
    prompt: str
    workflow_type: WorkflowType
    capabilities_required: List[WorkflowCapability] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    priority: int = 5  # 1-10 scale, 10 being highest
    
    # Optional inputs
    input_image: Optional[str] = None
    reference_images: List[str] = field(default_factory=list)
    mask: Optional[str] = None
    
    # Quality vs Speed preferences
    quality_mode: str = "balanced"  # "fast", "balanced", "quality"
    max_inference_time: Optional[int] = None  # seconds
    
    # Output specifications
    output_resolution: Optional[Tuple[int, int]] = None
    output_format: str = "default"


@dataclass
class WorkflowResult:
    """Base class for workflow results."""
    success: bool
    output_path: Optional[str] = None
    output_paths: List[str] = field(default_factory=list)  # For multi-output workflows
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    execution_time: float = 0.0
    memory_used: float = 0.0  # GB
    quality_metrics: Dict[str, float] = field(default_factory=dict)


@dataclass
class WorkflowCapabilityScore:
    """Scoring for workflow capabilities."""
    workflow_name: str
    capability: WorkflowCapability
    score: float  # 0.0 to 1.0
    confidence: float  # 0.0 to 1.0
    reasoning: str = ""


class BaseAdvancedWorkflow(ABC):
    """
    Abstract base class for all advanced ComfyUI workflows.
    
    This class defines the interface that all advanced workflows must implement,
    providing a consistent way to execute different types of AI generation tasks.
    """
    
    def __init__(self, name: str, workflow_type: WorkflowType, config: Dict[str, Any]):
        """
        Initialize the workflow.
        
        Args:
            name: Unique name for this workflow
            workflow_type: Type of workflow (video or image)
            config: Configuration dictionary for this workflow
        """
        self.name = name
        self.workflow_type = workflow_type
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{name}")
        
        # Workflow state
        self.is_loaded = False
        self.is_busy = False
        self.last_used = None
        
        # Performance tracking
        self.execution_count = 0
        self.total_execution_time = 0.0
        self.average_execution_time = 0.0
    
    @property
    @abstractmethod
    def capabilities(self) -> List[WorkflowCapability]:
        """Return list of capabilities this workflow supports."""
        pass
    
    @property
    @abstractmethod
    def required_models(self) -> List[str]:
        """Return list of model files required by this workflow."""
        pass
    
    @property
    @abstractmethod
    def memory_requirements(self) -> Dict[str, float]:
        """Return memory requirements in GB."""
        pass
    
    @property
    @abstractmethod
    def supported_resolutions(self) -> List[Tuple[int, int]]:
        """Return list of supported output resolutions."""
        pass
    
    @abstractmethod
    async def validate_request(self, request: WorkflowRequest) -> Tuple[bool, str]:
        """
        Validate if this workflow can handle the given request.
        
        Args:
            request: The workflow request to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        pass
    
    @abstractmethod
    async def execute(self, request: WorkflowRequest) -> WorkflowResult:
        """
        Execute the workflow with the given request.
        
        Args:
            request: The workflow request to execute
            
        Returns:
            WorkflowResult containing the output and metadata
        """
        pass
    
    @abstractmethod
    async def load_models(self) -> bool:
        """
        Load all required models for this workflow.
        
        Returns:
            True if models loaded successfully, False otherwise
        """
        pass
    
    @abstractmethod
    async def unload_models(self) -> bool:
        """
        Unload models to free memory.
        
        Returns:
            True if models unloaded successfully, False otherwise
        """
        pass
    
    def get_capability_score(self, capability: WorkflowCapability, request: WorkflowRequest) -> WorkflowCapabilityScore:
        """
        Get a score for how well this workflow handles a specific capability.
        
        Args:
            capability: The capability to score
            request: The request context for scoring
            
        Returns:
            WorkflowCapabilityScore with score and reasoning
        """
        if capability not in self.capabilities:
            return WorkflowCapabilityScore(
                workflow_name=self.name,
                capability=capability,
                score=0.0,
                confidence=1.0,
                reasoning=f"Workflow {self.name} does not support {capability.value}"
            )
        
        # Base score for supported capabilities
        base_score = 0.7
        
        # Adjust score based on request parameters
        score_adjustments = self._calculate_score_adjustments(capability, request)
        final_score = min(1.0, max(0.0, base_score + score_adjustments))
        
        return WorkflowCapabilityScore(
            workflow_name=self.name,
            capability=capability,
            score=final_score,
            confidence=0.8,
            reasoning=f"Base score {base_score} with adjustments {score_adjustments}"
        )
    
    def _calculate_score_adjustments(self, capability: WorkflowCapability, request: WorkflowRequest) -> float:
        """Calculate score adjustments based on request parameters."""
        adjustments = 0.0
        
        # Quality mode preferences
        if request.quality_mode == "fast" and hasattr(self, 'supports_fast_inference'):
            adjustments += 0.2
        elif request.quality_mode == "quality" and hasattr(self, 'supports_high_quality'):
            adjustments += 0.2
        
        # Resolution preferences
        if request.output_resolution and request.output_resolution in self.supported_resolutions:
            adjustments += 0.1
        
        # Input type compatibility
        if capability in [WorkflowCapability.IMAGE_TO_VIDEO, WorkflowCapability.IMAGE_EDITING]:
            if request.input_image:
                adjustments += 0.1
        
        return adjustments
    
    def update_performance_stats(self, execution_time: float):
        """Update performance statistics after execution."""
        self.execution_count += 1
        self.total_execution_time += execution_time
        self.average_execution_time = self.total_execution_time / self.execution_count
    
    def get_status(self) -> Dict[str, Any]:
        """Get current workflow status."""
        return {
            "name": self.name,
            "type": self.workflow_type.value,
            "is_loaded": self.is_loaded,
            "is_busy": self.is_busy,
            "execution_count": self.execution_count,
            "average_execution_time": self.average_execution_time,
            "capabilities": [cap.value for cap in self.capabilities],
            "memory_requirements": self.memory_requirements
        }


class WorkflowExecutionError(Exception):
    """Exception raised during workflow execution."""
    
    def __init__(self, workflow_name: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.workflow_name = workflow_name
        self.message = message
        self.details = details or {}
        super().__init__(f"Workflow {workflow_name}: {message}")


class WorkflowValidationError(Exception):
    """Exception raised during workflow validation."""
    
    def __init__(self, workflow_name: str, message: str, request: Optional[WorkflowRequest] = None):
        self.workflow_name = workflow_name
        self.message = message
        self.request = request
        super().__init__(f"Workflow {workflow_name} validation failed: {message}")