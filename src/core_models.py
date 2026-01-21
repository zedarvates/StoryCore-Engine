"""
Pydantic models for StoryCore-Engine data validation.
Derived from JSON schemas in schemas.py and architectural design.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union


# Authentication-related models
class User(BaseModel):
    user_id: str
    username: str = Field(..., min_length=1, max_length=50)
    email: str = Field(..., pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    password_hash: str
    created_at: str
    updated_at: str
    is_active: bool = True


class APIKey(BaseModel):
    key_id: str
    user_id: str
    api_key: str = Field(..., min_length=32, max_length=128)
    created_at: str
    expires_at: Optional[str] = None
    is_active: bool = True


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., gt=0)


# Project-related models
class ProjectConfig(BaseModel):
    hackathon_mode: bool
    global_seed: int = Field(..., ge=0)
    target_aspect_ratio: str
    target_resolution: str
    target_duration_seconds: int = Field(..., gt=0)
    time_budget_seconds: Optional[int] = Field(None, ge=0)


class CoherenceAnchors(BaseModel):
    style_anchor_id: str
    palette_id: str
    character_sheet_ids: List[str]
    lighting_direction: str
    lighting_temperature: str
    perspective_type: str
    horizon_line: str


class AssetGrid(BaseModel):
    asset_id: str
    path: str
    type: str
    dimensions: str
    created_at: str


class AssetPanel(BaseModel):
    asset_id: str
    path: str
    panel_index: int = Field(..., ge=0)


class AssetPromotedPanel(BaseModel):
    asset_id: str
    path: str
    original_panel: str
    original_resolution: str
    promoted_resolution: str


class AssetPromotionMetadata(BaseModel):
    scale_factor: int = Field(..., gt=0)
    method: str
    created_at: str
    total_panels: int = Field(..., ge=0)


class AssetRefinedPanel(BaseModel):
    asset_id: str
    path: str
    original_source: str
    resolution: str


class AssetRefinementMetadata(BaseModel):
    input: str
    mode: str
    strength: float = Field(..., ge=0.0, le=1.0)
    created_at: str
    total_panels: int = Field(..., ge=0)


class AssetRefinementPanelMetrics(BaseModel):
    panel: str
    sharpness_before: float
    sharpness_after: float
    improvement_percent: float


class AssetRefinementSummary(BaseModel):
    min_improvement_percent: float
    mean_improvement_percent: float
    max_improvement_percent: float
    computed_at: str


class AssetRefinementMetrics(BaseModel):
    panel_metrics: List[AssetRefinementPanelMetrics]
    summary: AssetRefinementSummary


class AssetComparisonAsset(BaseModel):
    asset_id: str
    path: str
    type: str
    mode: str
    panel: str
    panels: Optional[List[str]] = None


class AssetComparisonMetadata(BaseModel):
    created_at: str
    total_comparisons: int = Field(..., ge=0)


class AssetManifest(BaseModel):
    grid: Optional[AssetGrid] = None
    panels: List[AssetPanel] = Field(default_factory=list)
    promoted_panels: List[AssetPromotedPanel] = Field(default_factory=list)
    promotion_metadata: Optional[AssetPromotionMetadata] = None
    refined_panels: List[AssetRefinedPanel] = Field(default_factory=list)
    refinement_metadata: Optional[AssetRefinementMetadata] = None
    refinement_metrics: Optional[AssetRefinementMetrics] = None
    comparison_assets: List[AssetComparisonAsset] = Field(default_factory=list)
    comparison_metadata: Optional[AssetComparisonMetadata] = None
    panel_to_shot_map: Dict[str, str] = Field(default_factory=dict)


class ProjectStatus(BaseModel):
    current_phase: str
    qa_passed: bool
    last_qa_report_id: Optional[str] = None


class Project(BaseModel):
    schema_version: str
    project_id: str
    user_id: str
    created_at: str
    updated_at: str
    config: ProjectConfig
    coherence_anchors: CoherenceAnchors
    shots_index: Dict[str, Any] = Field(default_factory=dict)
    asset_manifest: AssetManifest
    status: ProjectStatus


# Storyboard-related models
class PromptModules(BaseModel):
    subject: str
    camera: str
    lighting: str
    color: str
    style: str
    technical: Dict[str, Any]


class Shot(BaseModel):
    shot_id: str
    scene_id: str
    shot_number: int = Field(..., ge=0)
    version: str
    title: str
    description: str
    duration_seconds: float = Field(..., gt=0.0)
    prompt_modules: PromptModules


class Storyboard(BaseModel):
    storyboard_id: str
    project_id: str
    user_id: str
    shots: List[Shot]


# QA Report model
class QAReport(BaseModel):
    qa_report_id: str
    project_id: str
    user_id: str
    timestamp: str
    overall_score: float = Field(..., ge=0.0, le=1.0)
    passed: bool
    issues: Optional[List[Dict[str, Any]]] = None