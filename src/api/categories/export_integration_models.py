"""
Export and Integration API Data Models

This module defines data models for export and integration operations including
package export, format conversion, metadata generation, ComfyUI integration,
and webhook management.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime


@dataclass
class ExportPackageRequest:
    """Request for project package export."""
    project_path: str
    output_path: Optional[str] = None
    include_source: bool = False
    include_assets: bool = True
    include_reports: bool = True
    compression_level: int = 6  # 0-9, where 9 is maximum compression
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExportPackageResult:
    """Result of project package export."""
    export_path: str
    package_size_bytes: int
    files_included: int
    export_time_ms: float
    format: str
    checksum: Optional[str] = None
    manifest: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FormatConversionRequest:
    """Request for format conversion."""
    project_path: str
    target_format: str  # "zip", "json", "mp4", "wav", "mp3", "pdf"
    source_format: Optional[str] = None
    conversion_options: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FormatConversionResult:
    """Result of format conversion."""
    output_path: str
    source_format: str
    target_format: str
    conversion_time_ms: float
    output_size_bytes: int
    quality_metrics: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MetadataGenerationRequest:
    """Request for metadata generation."""
    project_path: str
    metadata_format: str  # "json", "xml", "yaml"
    include_technical: bool = True
    include_creative: bool = True
    include_qa_reports: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MetadataGenerationResult:
    """Result of metadata generation."""
    metadata_content: Dict[str, Any]
    metadata_format: str
    generation_time_ms: float
    metadata_size_bytes: int
    sections_included: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ComfyUIConnectionRequest:
    """Request for ComfyUI backend connection."""
    host: str = "localhost"
    port: int = 8188
    timeout_seconds: int = 30
    verify_ssl: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ComfyUIConnectionResult:
    """Result of ComfyUI connection attempt."""
    connected: bool
    host: str
    port: int
    server_version: Optional[str] = None
    available_models: List[str] = field(default_factory=list)
    connection_time_ms: float = 0.0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ComfyUIWorkflowRequest:
    """Request for ComfyUI workflow execution."""
    workflow_definition: Dict[str, Any]
    workflow_name: Optional[str] = None
    input_parameters: Dict[str, Any] = field(default_factory=dict)
    priority: str = "normal"  # "low", "normal", "high"
    timeout_seconds: int = 300
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ComfyUIWorkflowResult:
    """Result of ComfyUI workflow execution."""
    workflow_id: str
    status: str  # "pending", "running", "completed", "failed"
    output_paths: List[str] = field(default_factory=list)
    execution_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    progress: float = 0.0  # 0.0 to 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoGenerationRequest:
    """Request for video generation from reference image via ComfyUI."""
    shot_id: str
    reference_image: str  # Base64 string
    parameters: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoGenerationResult:
    """Result of video generation request."""
    task_id: str
    status: str  # "pending", "processing", "completed", "failed"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WebhookRegistrationRequest:
    """Request for webhook registration."""
    url: str
    event_types: List[str]  # e.g., ["export.completed", "qa.failed", "pipeline.finished"]
    secret: Optional[str] = None
    active: bool = True
    retry_policy: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WebhookRegistrationResult:
    """Result of webhook registration."""
    webhook_id: str
    url: str
    event_types: List[str]
    active: bool
    created_at: datetime
    registration_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WebhookTriggerRequest:
    """Request for manual webhook trigger."""
    webhook_id: str
    event_type: str
    payload: Dict[str, Any]
    test_mode: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WebhookTriggerResult:
    """Result of webhook trigger."""
    webhook_id: str
    event_type: str
    triggered_at: datetime
    response_status: int
    response_time_ms: float
    success: bool
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# Supported export formats
SUPPORTED_EXPORT_FORMATS = {
    "zip": "ZIP Archive",
    "json": "JSON Data",
    "mp4": "MP4 Video",
    "wav": "WAV Audio",
    "mp3": "MP3 Audio",
    "pdf": "PDF Document",
}


# Supported metadata formats
SUPPORTED_METADATA_FORMATS = {
    "json": "JSON",
    "xml": "XML",
    "yaml": "YAML",
}


# Webhook event types
WEBHOOK_EVENT_TYPES = [
    "export.started",
    "export.completed",
    "export.failed",
    "qa.started",
    "qa.completed",
    "qa.failed",
    "pipeline.started",
    "pipeline.completed",
    "pipeline.failed",
    "image.generated",
    "audio.generated",
    "video.rendered",
]


def validate_export_format(format_code: str) -> bool:
    """Validate if export format is supported."""
    return format_code.lower() in SUPPORTED_EXPORT_FORMATS


def validate_metadata_format(format_code: str) -> bool:
    """Validate if metadata format is supported."""
    return format_code.lower() in SUPPORTED_METADATA_FORMATS


def validate_webhook_event_type(event_type: str) -> bool:
    """Validate if webhook event type is supported."""
    return event_type in WEBHOOK_EVENT_TYPES


def validate_webhook_url(url: str) -> bool:
    """Validate webhook URL format."""
    import re
    # Simple URL validation
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return url_pattern.match(url) is not None
