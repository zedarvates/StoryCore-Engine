"""
Data models for the StoryCore LLM Memory System.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional


class AssetType(Enum):
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"


class ErrorType(Enum):
    MISSING_FILE = "missing_file"
    INVALID_JSON = "invalid_json"
    INCONSISTENT_STATE = "inconsistent_state"
    CORRUPTED_DATA = "corrupted_data"
    PERMISSION_ERROR = "permission_error"


class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecoveryType(Enum):
    AUTOMATIC = "automatic"
    GUIDED = "guided"
    DESPERATE = "desperate"


@dataclass
class MemorySystemConfig:
    auto_summarize: bool = True
    summarization_threshold_kb: int = 50
    auto_translate: bool = True
    target_languages: List[str] = field(default_factory=lambda: ["en", "fr"])
    error_detection_enabled: bool = True
    auto_recovery_enabled: bool = True
    max_recovery_attempts: int = 3


@dataclass
class ProjectConfig:
    schema_version: str = "1.0"
    project_name: str = ""
    project_type: str = "video"
    creation_timestamp: str = ""
    objectives: List[str] = field(default_factory=list)
    memory_system_enabled: bool = True
    memory_system_config: MemorySystemConfig = field(default_factory=MemorySystemConfig)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "project_name": self.project_name,
            "project_type": self.project_type,
            "creation_timestamp": self.creation_timestamp,
            "objectives": self.objectives,
            "memory_system_enabled": self.memory_system_enabled,
            "memory_system_config": {
                "auto_summarize": self.memory_system_config.auto_summarize,
                "summarization_threshold_kb": self.memory_system_config.summarization_threshold_kb,
                "auto_translate": self.memory_system_config.auto_translate,
                "target_languages": self.memory_system_config.target_languages,
                "error_detection_enabled": self.memory_system_config.error_detection_enabled,
                "auto_recovery_enabled": self.memory_system_config.auto_recovery_enabled,
                "max_recovery_attempts": self.memory_system_config.max_recovery_attempts,
            }
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProjectConfig":
        config_data = data.get("memory_system_config", {})
        memory_config = MemorySystemConfig(
            auto_summarize=config_data.get("auto_summarize", True),
            summarization_threshold_kb=config_data.get("summarization_threshold_kb", 50),
            auto_translate=config_data.get("auto_translate", True),
            target_languages=config_data.get("target_languages", ["en", "fr"]),
            error_detection_enabled=config_data.get("error_detection_enabled", True),
            auto_recovery_enabled=config_data.get("auto_recovery_enabled", True),
            max_recovery_attempts=config_data.get("max_recovery_attempts", 3),
        )
        
        return cls(
            schema_version=data.get("schema_version", "1.0"),
            project_name=data.get("project_name", ""),
            project_type=data.get("project_type", "video"),
            creation_timestamp=data.get("creation_timestamp", ""),
            objectives=data.get("objectives", []),
            memory_system_enabled=data.get("memory_system_enabled", True),
            memory_system_config=memory_config,
        )


@dataclass
class Objective:
    id: str
    description: str
    status: str = "active"
    added: str = ""


@dataclass
class Entity:
    id: str
    name: str
    type: str
    description: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    added: str = ""


@dataclass
class Constraint:
    id: str
    description: str
    type: str = "technical"
    added: str = ""


@dataclass
class Decision:
    id: str
    description: str
    rationale: str
    alternatives_considered: List[str] = field(default_factory=list)
    timestamp: str = ""


@dataclass
class StyleRule:
    category: str
    rule: str
    added: str = ""


@dataclass
class Task:
    id: str
    description: str
    priority: str = "medium"
    status: str = "pending"
    added: str = ""


@dataclass
class CurrentState:
    phase: str = "unknown"
    progress_percentage: int = 0
    active_tasks: List[str] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)
    last_activity: str = ""


@dataclass
class ProjectMemory:
    schema_version: str = "1.0"
    last_updated: str = ""
    objectives: List[Objective] = field(default_factory=list)
    entities: List[Entity] = field(default_factory=list)
    constraints: List[Constraint] = field(default_factory=list)
    decisions: List[Decision] = field(default_factory=list)
    style_rules: List[StyleRule] = field(default_factory=list)
    task_backlog: List[Task] = field(default_factory=list)
    current_state: CurrentState = field(default_factory=CurrentState)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "last_updated": self.last_updated,
            "objectives": [{"id": o.id, "description": o.description, "status": o.status, "added": o.added} for o in self.objectives],
            "entities": [{"id": e.id, "name": e.name, "type": e.type, "description": e.description, "attributes": e.attributes, "added": e.added} for e in self.entities],
            "constraints": [{"id": c.id, "description": c.description, "type": c.type, "added": c.added} for c in self.constraints],
            "decisions": [{"id": d.id, "description": d.description, "rationale": d.rationale, "alternatives_considered": d.alternatives_considered, "timestamp": d.timestamp} for d in self.decisions],
            "style_rules": [{"category": s.category, "rule": s.rule, "added": s.added} for s in self.style_rules],
            "task_backlog": [{"id": t.id, "description": t.description, "priority": t.priority, "status": t.status, "added": t.added} for t in self.task_backlog],
            "current_state": {"phase": self.current_state.phase, "progress_percentage": self.current_state.progress_percentage, "active_tasks": self.current_state.active_tasks, "blockers": self.current_state.blockers, "last_activity": self.current_state.last_activity}
        }


@dataclass
class Message:
    role: str
    content: str
    timestamp: datetime


@dataclass
class Conversation:
    messages: List[Message]
    session_id: str
    start_time: datetime


@dataclass
class AssetMetadata:
    dimensions: Optional[tuple] = None
    format: str = ""
    size_bytes: int = 0
    duration: Optional[float] = None
    pages: Optional[int] = None


@dataclass
class AssetInfo:
    filename: str
    path: Path
    type: AssetType
    size_bytes: int
    timestamp: str = ""
    description: str = ""
    metadata: Optional[AssetMetadata] = None


@dataclass
class Error:
    id: str
    type: ErrorType
    severity: ErrorSeverity
    detected: str
    description: str
    affected_components: List[str] = field(default_factory=list)
    diagnostic_info: Dict[str, Any] = field(default_factory=dict)
    status: str = "detected"
    recovery_attempts: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {"id": self.id, "type": self.type.value, "severity": self.severity.value, "detected": self.detected, "description": self.description, "affected_components": self.affected_components, "diagnostic_info": self.diagnostic_info, "status": self.status, "recovery_attempts": self.recovery_attempts}


@dataclass
class Variable:
    value: Any
    type: str
    description: str
    last_modified: str = ""


@dataclass
class Variables:
    schema_version: str = "1.0"
    last_updated: str = ""
    variables: Dict[str, Variable] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {"schema_version": self.schema_version, "last_updated": self.last_updated, "variables": {name: {"value": v.value, "type": v.type, "description": v.description, "last_modified": v.last_modified} for name, v in self.variables.items()}}


@dataclass
class Action:
    timestamp: str
    action_type: str
    affected_files: List[str] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    triggered_by: str = ""


@dataclass
class RepairResult:
    success: bool
    reason: str
    actions_taken: List[str] = field(default_factory=list)


@dataclass
class RecoveryReport:
    success: bool
    restored_files: List[Path] = field(default_factory=list)
    lost_files: List[Path] = field(default_factory=list)
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    timestamp: str = ""


@dataclass
class ValidationResult:
    valid: bool
    errors: List[Error] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class ProjectContext:
    config: ProjectConfig
    memory: ProjectMemory
    recent_discussions: List[str] = field(default_factory=list)
    asset_summary: str = ""
    project_overview: str = ""
    timeline: str = ""


@dataclass
class QAIssue:
    type: str
    severity: str
    description: str
    affected_component: str
    auto_fixable: bool = False


@dataclass
class QAReport:
    timestamp: str
    overall_score: float
    checks_performed: int
    checks_passed: int
    checks_failed: int
    issues: List[QAIssue] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    auto_fixed: List[str] = field(default_factory=list)
    requires_attention: List[str] = field(default_factory=list)

