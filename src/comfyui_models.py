"""
ComfyUI Data Models
Core data structures for ComfyUI integration system.
"""

import time
import uuid
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import hashlib


class ServiceState(Enum):
    """ComfyUI service states."""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"
    UNKNOWN = "unknown"


class HealthState(Enum):
    """Health check states."""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"


class ExecutionStatus(Enum):
    """Workflow execution status."""
    PENDING = "pending"
    QUEUED = "queued"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ServiceStatus:
    """Current status of ComfyUI service."""
    
    is_running: bool
    state: ServiceState
    process_id: Optional[int] = None
    port: int = 8188
    startup_time: Optional[datetime] = None
    last_health_check: Optional[datetime] = None
    health_status: Optional['HealthStatus'] = None
    error_message: Optional[str] = None
    
    @property
    def uptime_seconds(self) -> Optional[float]:
        """Get service uptime in seconds."""
        if self.startup_time is None:
            return None
        return (datetime.utcnow() - self.startup_time).total_seconds()


@dataclass
class HealthStatus:
    """Health check result."""
    
    is_healthy: bool
    state: HealthState
    response_time_ms: float
    system_stats: Optional['SystemStats'] = None
    error_message: Optional[str] = None
    consecutive_failures: int = 0
    last_check_time: datetime = field(default_factory=datetime.utcnow)
    
    @property
    def is_responsive(self) -> bool:
        """Check if service is responsive (healthy or degraded)."""
        return self.state in [HealthState.HEALTHY, HealthState.DEGRADED]


@dataclass
class SystemStats:
    """ComfyUI system statistics."""
    
    device_name: str
    vram_total: int
    vram_free: int
    system_stats: Dict[str, Any] = field(default_factory=dict)
    queue_remaining: int = 0
    queue_running: List[str] = field(default_factory=list)
    
    @property
    def vram_used(self) -> int:
        """Get used VRAM in bytes."""
        return self.vram_total - self.vram_free
    
    @property
    def vram_usage_percent(self) -> float:
        """Get VRAM usage as percentage."""
        if self.vram_total == 0:
            return 0.0
        return (self.vram_used / self.vram_total) * 100.0


@dataclass
class ExecutionUpdate:
    """Real-time execution update from ComfyUI."""
    
    prompt_id: str
    node_id: Optional[str] = None
    progress: Optional[float] = None
    preview_image: Optional[bytes] = None
    status: ExecutionStatus = ExecutionStatus.PENDING
    timestamp: datetime = field(default_factory=datetime.utcnow)
    message: Optional[str] = None
    
    @property
    def progress_percent(self) -> Optional[float]:
        """Get progress as percentage (0-100)."""
        if self.progress is None:
            return None
        return self.progress * 100.0


@dataclass
class WorkflowNode:
    """Single node in ComfyUI workflow."""
    
    class_type: str
    inputs: Dict[str, Any] = field(default_factory=dict)
    
    def validate(self) -> List[str]:
        """Validate node configuration."""
        errors = []
        
        if not self.class_type:
            errors.append("Node class_type cannot be empty")
        
        # Add specific validation for common node types
        if self.class_type == "KSampler":
            required_inputs = ["seed", "steps", "cfg", "sampler_name", "scheduler", "model", "positive", "negative", "latent_image"]
            for input_name in required_inputs:
                if input_name not in self.inputs:
                    errors.append(f"KSampler missing required input: {input_name}")
        
        elif self.class_type == "CheckpointLoaderSimple":
            if "ckpt_name" not in self.inputs:
                errors.append("CheckpointLoaderSimple missing required input: ckpt_name")
        
        return errors


@dataclass
class WorkflowMetadata:
    """Metadata for ComfyUI workflow."""
    
    workflow_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.utcnow)
    source_type: str = "storycore"
    complexity_score: float = 0.0
    estimated_time_seconds: float = 0.0
    tags: List[str] = field(default_factory=list)
    
    def calculate_complexity(self, nodes: Dict[str, WorkflowNode]) -> float:
        """Calculate workflow complexity score."""
        base_score = len(nodes)
        
        # Add complexity for specific node types
        complexity_weights = {
            "KSampler": 2.0,
            "ControlNetApply": 1.5,
            "IPAdapterApply": 1.5,
            "LoraLoader": 1.2,
            "VAEDecode": 1.0,
            "VAEEncode": 1.0,
        }
        
        weighted_score = 0.0
        for node in nodes.values():
            weight = complexity_weights.get(node.class_type, 1.0)
            weighted_score += weight
        
        self.complexity_score = weighted_score
        return self.complexity_score


@dataclass
class ComfyUIWorkflow:
    """Complete ComfyUI workflow definition."""
    
    nodes: Dict[str, WorkflowNode] = field(default_factory=dict)
    metadata: WorkflowMetadata = field(default_factory=WorkflowMetadata)
    
    def add_node(self, node_id: str, node: WorkflowNode) -> None:
        """Add a node to the workflow."""
        self.nodes[node_id] = node
    
    def validate(self) -> List[str]:
        """Validate entire workflow."""
        errors = []
        
        if not self.nodes:
            errors.append("Workflow must contain at least one node")
        
        # Validate each node
        for node_id, node in self.nodes.items():
            node_errors = node.validate()
            for error in node_errors:
                errors.append(f"Node {node_id}: {error}")
        
        # Update complexity score
        self.metadata.calculate_complexity(self.nodes)
        
        return errors
    
    def to_comfyui_format(self) -> Dict[str, Any]:
        """Convert to ComfyUI API format."""
        workflow_dict = {}
        
        for node_id, node in self.nodes.items():
            workflow_dict[node_id] = {
                "class_type": node.class_type,
                "inputs": node.inputs
            }
        
        return workflow_dict


@dataclass
class AssetInfo:
    """Information about an asset file."""
    
    filename: str
    subfolder: Optional[str] = None
    folder_type: str = "output"
    local_path: Optional[Path] = None
    size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    download_time: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionResult:
    """Result of workflow execution."""
    
    prompt_id: str
    workflow_id: str
    status: ExecutionStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    output_images: List[AssetInfo] = field(default_factory=list)  # Changed from output_files
    error_message: Optional[str] = None
    execution_time_seconds: Optional[float] = None
    
    @property
    def is_successful(self) -> bool:
        """Check if execution was successful."""
        return self.status == ExecutionStatus.COMPLETED
    
    @property
    def duration_seconds(self) -> Optional[float]:
        """Get execution duration in seconds."""
        if self.completed_at is None:
            return None
        return (self.completed_at - self.started_at).total_seconds()


@dataclass
class GeneratedAsset:
    """Information about a generated asset."""
    
    filename: str
    subfolder: str
    folder_type: str
    file_size: Optional[int] = None
    checksum: Optional[str] = None
    downloaded_path: Optional[Path] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA-256 checksum of file."""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        
        self.checksum = sha256_hash.hexdigest()
        return self.checksum
    
    def verify_integrity(self, file_path: Path) -> bool:
        """Verify file integrity against stored checksum."""
        if self.checksum is None:
            return True  # No checksum to verify against
        
        current_checksum = self.calculate_checksum(file_path)
        return current_checksum == self.checksum


@dataclass
class RetrievedAsset:
    """Asset that has been retrieved from ComfyUI."""
    
    filename: str
    file_path: Path
    file_size: int
    checksum: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    retrieved_at: datetime = field(default_factory=datetime.utcnow)
    
    @classmethod
    def from_generated_asset(cls, asset: GeneratedAsset, local_path: Path) -> 'RetrievedAsset':
        """Create RetrievedAsset from GeneratedAsset."""
        file_size = local_path.stat().st_size if local_path.exists() else 0
        checksum = asset.checksum or asset.calculate_checksum(local_path)
        
        return cls(
            filename=asset.filename,
            file_path=local_path,
            file_size=file_size,
            checksum=checksum,
            metadata=asset.metadata
        )


@dataclass
class PerformanceMetrics:
    """Performance metrics for ComfyUI operations."""
    
    operation_type: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    success: bool = True
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def complete(self, success: bool = True, error_message: Optional[str] = None) -> None:
        """Mark operation as complete."""
        self.end_time = datetime.utcnow()
        self.duration_seconds = (self.end_time - self.start_time).total_seconds()
        self.success = success
        self.error_message = error_message
    
    @classmethod
    def start_operation(cls, operation_type: str, **metadata) -> 'PerformanceMetrics':
        """Start tracking a new operation."""
        return cls(
            operation_type=operation_type,
            start_time=datetime.utcnow(),
            metadata=metadata
        )


@dataclass
class ServiceStartResult:
    """Result of service start operation."""
    
    success: bool
    process_id: Optional[int] = None
    startup_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    service_url: Optional[str] = None


@dataclass
class ServiceStopResult:
    """Result of service stop operation."""
    
    success: bool
    shutdown_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    forced_termination: bool = False


@dataclass
class ServiceRestartResult:
    """Result of service restart operation."""
    
    success: bool
    stop_result: ServiceStopResult
    start_result: ServiceStartResult
    total_time_seconds: Optional[float] = None


@dataclass
class ValidationResult:
    """Result of workflow validation."""
    
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    complexity_score: float = 0.0
    estimated_time_seconds: float = 0.0
    
    @property
    def has_errors(self) -> bool:
        """Check if validation found errors."""
        return len(self.errors) > 0
    
    @property
    def has_warnings(self) -> bool:
        """Check if validation found warnings."""
        return len(self.warnings) > 0


@dataclass
class OrganizationResult:
    """Result of asset organization operation."""
    
    success: bool
    organized_files: List[Path] = field(default_factory=list)
    failed_files: List[str] = field(default_factory=list)
    total_files: int = 0
    error_message: Optional[str] = None


@dataclass
class CleanupResult:
    """Result of cleanup operation."""
    
    success: bool
    files_deleted: List[Path] = field(default_factory=list)
    space_freed_bytes: int = 0
    failed_deletions: List[str] = field(default_factory=list)
    error_message: Optional[str] = None


@dataclass
class IntegrityResult:
    """Result of file integrity check."""
    
    is_valid: bool
    expected_checksum: Optional[str] = None
    actual_checksum: Optional[str] = None
    file_size: Optional[int] = None
    error_message: Optional[str] = None