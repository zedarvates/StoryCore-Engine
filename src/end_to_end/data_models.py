"""
Core data models for end-to-end project creation.

All data structures used throughout the workflow are defined here.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path


# Enums
class WorkflowStep(Enum):
    """Workflow execution steps"""
    PARSING = "parsing"
    NAME_GENERATION = "name_generation"
    COMPONENT_GENERATION = "component_generation"
    PROJECT_STRUCTURE = "project_structure"
    IMAGE_GENERATION = "image_generation"
    PIPELINE_EXECUTION = "pipeline_execution"
    QUALITY_VALIDATION = "quality_validation"
    COMPLETE = "complete"


class RecoveryStrategy(Enum):
    """Error recovery strategies"""
    RETRY = "retry"
    RETRY_ADJUSTED = "retry_adjusted"
    SKIP = "skip"
    FALLBACK = "fallback"
    CHECKPOINT = "checkpoint"
    ABORT = "abort"


class PipelineStep(Enum):
    """StoryCore pipeline steps"""
    GRID = "grid"
    PROMOTE = "promote"
    REFINE = "refine"
    QA = "qa"
    AUTOFIX = "autofix"
    VIDEO_PLAN = "video_plan"
    EXPORT = "export"


# Core Data Structures
@dataclass
class CharacterInfo:
    """Basic character information from prompt"""
    name: str
    role: str
    description: str


@dataclass
class ParsedPrompt:
    """Parsed user prompt with extracted information"""
    project_title: str
    genre: str
    video_type: str
    mood: List[str]
    setting: str
    time_period: str
    characters: List[CharacterInfo]
    key_elements: List[str]
    visual_style: List[str]
    aspect_ratio: str
    duration_seconds: int
    raw_prompt: str
    confidence_scores: Dict[str, float] = field(default_factory=dict)


@dataclass
class ColorPalette:
    """Color palette definition"""
    primary: str
    secondary: str
    accent: str
    background: str
    additional: List[str] = field(default_factory=list)


@dataclass
class Location:
    """Location/setting definition"""
    location_id: str
    name: str
    description: str
    visual_description: str
    significance: str = ""
    atmosphere: str = ""


@dataclass
class WorldConfig:
    """World/universe configuration"""
    world_id: str
    name: str
    genre: str
    setting: str
    time_period: str
    visual_style: List[str]
    color_palette: ColorPalette
    lighting_style: str
    atmosphere: str
    key_locations: List[Location]


@dataclass
class Character:
    """Complete character sheet"""
    character_id: str
    name: str
    role: str
    description: str
    visual_description: str
    personality_traits: List[str]
    relationships: Dict[str, str]


@dataclass
class EmotionalBeat:
    """Emotional beat in story"""
    beat_id: str
    emotion: str
    intensity: float
    timestamp: float


@dataclass
class Act:
    """Story act"""
    act_number: int
    name: str
    description: str
    duration: int
    scenes: List[str]


@dataclass
class StoryStructure:
    """Complete story structure"""
    story_id: str
    title: str
    logline: str
    acts: List[Act]
    themes: List[str]
    emotional_arc: List[EmotionalBeat]


@dataclass
class DialogueLine:
    """Single line of dialogue"""
    line_id: str
    character_id: str
    character_name: str
    text: str
    emotion: str
    delivery_notes: str
    timestamp: Optional[float] = None


@dataclass
class DialogueScene:
    """Dialogue for a single scene"""
    scene_id: str
    scene_name: str
    location: str
    time: str
    characters_present: List[str]
    dialogue_lines: List[DialogueLine]
    action_notes: List[str]


@dataclass
class DialogueScript:
    """Complete dialogue script"""
    script_id: str
    scenes: List[DialogueScene]
    total_lines: int
    estimated_duration: int


@dataclass
class PromptModules:
    """Prompt modules for shot generation"""
    base: str
    style: str
    lighting: str
    composition: str
    camera: str


@dataclass
class Shot:
    """Single shot definition"""
    shot_id: str
    shot_number: int
    duration: int
    description: str
    camera_angle: str
    camera_movement: str
    lighting: str
    composition: str
    prompt_modules: PromptModules


@dataclass
class Sequence:
    """Single sequence"""
    sequence_id: str
    name: str
    duration: int
    shots: List[Shot]
    mood: str
    visual_direction: str


@dataclass
class SequencePlan:
    """Complete sequence and shot plan"""
    sequence_id: str
    total_duration: int
    sequences: List[Sequence]
    total_shots: int


@dataclass
class SoundEffect:
    """Sound effect definition"""
    effect_id: str
    name: str
    description: str
    timestamp: float


@dataclass
class MusicCue:
    """Music cue in timeline"""
    cue_id: str
    timestamp: float
    description: str
    intensity: float


@dataclass
class MusicDescription:
    """Music and sound description"""
    music_id: str
    genre: str
    mood: List[str]
    tempo: str
    instruments: List[str]
    sound_effects: List[SoundEffect]
    timeline: List[MusicCue]


@dataclass
class ProjectMetadata:
    """Project metadata"""
    project_id: str
    project_name: str
    created_at: datetime
    updated_at: datetime
    version: str
    video_type: str
    duration_seconds: int
    aspect_ratio: str
    resolution: str
    author: str = "StoryCore AI"


@dataclass
class ProjectComponents:
    """All generated project components"""
    world_config: WorldConfig
    characters: List[Character]
    story_structure: StoryStructure
    dialogue_script: DialogueScript
    sequence_plan: SequencePlan
    music_description: MusicDescription
    metadata: ProjectMetadata


# Workflow State
@dataclass
class WorkflowState:
    """Current workflow state"""
    current_step: WorkflowStep
    completed_steps: List[WorkflowStep]
    failed_steps: List[tuple]  # (WorkflowStep, error_message)
    project_data: Dict[str, Any]
    start_time: datetime
    estimated_completion: Optional[datetime] = None


# Results and Reports
@dataclass
class Issue:
    """Quality issue"""
    issue_id: str
    severity: str
    category: str
    description: str
    location: str


@dataclass
class QualityReport:
    """Quality validation report"""
    overall_score: float
    visual_coherence_score: float
    audio_quality_score: float
    sync_score: float
    detected_issues: List[Issue]
    recommendations: List[str]
    passed: bool


@dataclass
class ProjectCreationResult:
    """Result of project creation"""
    success: bool
    project_path: Path
    video_path: Optional[Path]
    qa_report: Optional[QualityReport]
    duration: timedelta
    errors: List[str]
    warnings: List[str]


# Configuration
@dataclass
class OrchestratorConfig:
    """Orchestrator configuration"""
    projects_directory: str
    comfyui_backend_url: str
    storycore_cli_path: str
    default_quality_tier: str = "preview"
    max_retry_attempts: int = 3
    checkpoint_enabled: bool = True
    auto_cleanup_enabled: bool = True
    parallel_generation: bool = True
    max_concurrent_shots: int = 4


@dataclass
class SystemCapabilities:
    """System capabilities detection"""
    cpu_cores: int
    ram_gb: float
    gpu_available: bool
    disk_space_gb: float


@dataclass
class OptimalConfig:
    """Optimal configuration for project"""
    aspect_ratio: str
    resolution: tuple
    quality_tier: str
    generation_parameters: Dict[str, Any]
    shot_count: int
    shot_duration_distribution: List[int]
    seeds: Dict[str, int]


# Error Handling
@dataclass
class ErrorContext:
    """Error context for recovery"""
    error_type: str
    error_message: str
    stack_trace: str
    workflow_step: WorkflowStep
    project_path: Optional[Path]
    timestamp: datetime
    system_state: Dict[str, Any]
    recovery_attempts: int = 0


@dataclass
class RecoveryAction:
    """Recovery action to take"""
    strategy: RecoveryStrategy
    parameters: Dict[str, Any]
    max_attempts: int = 3


# Progress Tracking
@dataclass
class ProgressReport:
    """Progress report"""
    current_step: str
    progress_percent: float
    elapsed_time: timedelta
    estimated_remaining: timedelta
    completed_steps: List[str]
    current_message: str


# ComfyUI Integration Models
@dataclass
class StyleConfig:
    """Style configuration for image generation"""
    style_type: str
    style_strength: float
    color_palette: ColorPalette
    visual_elements: List[str]
    reference_images: List[str] = field(default_factory=list)


@dataclass
class ShotConfig:
    """Configuration for shot generation"""
    shot_id: str
    prompt: str
    negative_prompt: str
    width: int
    height: int
    steps: int
    cfg_scale: float
    seed: int
    style_config: StyleConfig


@dataclass
class GeneratedImage:
    """Generated image result"""
    image_id: str
    shot_id: str
    file_path: Path
    width: int
    height: int
    generation_time: float
    quality_score: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GeneratedVideo:
    """
    Generated video result from LTX-2 image-to-video workflow.
    
    Validates: Requirements 14.7, 14.15
    """
    path: Path
    duration_seconds: float
    frame_count: int
    frame_rate: int
    resolution: Tuple[int, int]  # (width, height)
    has_audio: bool
    generation_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MasterCoherenceSheet:
    """Master coherence sheet (3x3 grid)"""
    sheet_id: str
    grid_images: List[GeneratedImage]  # 9 images
    style_config: StyleConfig
    generation_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class FallbackMode(Enum):
    """Fallback mode when ComfyUI unavailable"""
    PLACEHOLDER = "placeholder"
    SKIP = "skip"
    ABORT = "abort"


@dataclass
class ComfyUIStatus:
    """ComfyUI backend status"""
    available: bool
    url: str
    version: Optional[str] = None
    queue_size: int = 0
    error_message: Optional[str] = None
    last_check: datetime = field(default_factory=datetime.now)
    cors_enabled: bool = False
    models_ready: bool = False
    workflows_ready: bool = False
    
    @property
    def fully_ready(self) -> bool:
        """Check if backend is fully ready for generation"""
        return self.available and self.cors_enabled and self.models_ready and self.workflows_ready
