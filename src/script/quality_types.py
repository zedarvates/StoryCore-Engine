"""
Script Quality Scoring Types

Data structures for script quality analysis.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class QualityMetric(Enum):
    """Quality metric categories."""
    DIALOGUE_ACTION_RATIO = "dialogue_action_ratio"
    PACING = "pacing"
    CHARACTER_ARC = "character_arc"
    SCENE_BALANCE = "scene_balance"
    STRUCTURE = "structure"
    CONFLICT = "conflict"


class QualityLevel(Enum):
    """Quality levels."""
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    NEEDS_IMPROVEMENT = "needs_improvement"
    POOR = "poor"


class PacingIssue(Enum):
    """Pacing issue types."""
    TOO_FAST = "too_fast"
    TOO_SLOW = "too_slow"
    INCONSISTENT = "inconsistent"
    FRAGMENTED = "fragmented"
    MONOTONOUS = "monotonous"


@dataclass
class MetricScore:
    """Score for a single quality metric."""
    metric: QualityMetric
    score: float  # 0.0 to 1.0
    level: QualityLevel
    weight: float  # Weight in overall score
    details: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric": self.metric.value,
            "score": round(self.score, 2),
            "level": self.level.value,
            "weight": self.weight,
            "details": self.details
        }


@dataclass
class DialogueAnalysis:
    """Dialogue vs action line analysis."""
    total_lines: int = 0
    dialogue_lines: int = 0
    action_lines: int = 0
    scene_description_lines: int = 0
    dialogue_percentage: float = 0.0
    action_percentage: float = 0.0
    ideal_ratio: str = "40-50% dialogue"
    actual_ratio: str = ""
    assessment: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_lines": self.total_lines,
            "dialogue_lines": self.dialogue_lines,
            "action_lines": self.action_lines,
            "dialogue_pct": round(self.dialogue_percentage, 1),
            "action_pct": round(self.action_percentage, 1),
            "ratio": self.actual_ratio,
            "assessment": self.assessment
        }


@dataclass
class PacingAnalysis:
    """Pacing analysis results."""
    total_scenes: int = 0
    scene_lengths: List[int] = field(default_factory=list)
    avg_scene_length: float = 0.0
    median_scene_length: float = 0.0
    std_deviation: float = 0.0
    pacing_score: float = 0.0
    pacing_level: QualityLevel = QualityLevel.AVERAGE
    issues: List[PacingIssue] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_scenes": self.total_scenes,
            "avg_length": round(self.avg_scene_length, 1),
            "pacing_score": round(self.pacing_score, 2),
            "pacing_level": self.pacing_level.value,
            "issues": [i.value for i in self.issues],
            "recommendations": self.recommendations
        }


@dataclass
class CharacterArcCheck:
    """Character arc completeness check."""
    characters: List[str] = field(default_factory=list)
    characters_with_arcs: int = 0
    complete_arcs: int = 0
    incomplete_arcs: int = 0
    missing_arcs: List[str] = field(default_factory=list)
    arc_completeness_score: float = 0.0
    recommendations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_characters": len(self.characters),
            "with_arcs": self.characters_with_arcs,
            "complete": self.complete_arcs,
            "incomplete": self.incomplete_arcs,
            "missing": self.missing_arcs,
            "completeness_score": round(self.arc_completeness_score, 2),
            "recommendations": self.recommendations
        }


@dataclass
class ConflictAnalysis:
    """Conflict analysis results."""
    scenes_with_conflict: int = 0
    total_scenes: int = 0
    conflict_coverage: float = 0.0
    conflict_types: Dict[str, int] = field(default_factory=dict)
    recommendations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scenes_with_conflict": self.scenes_with_conflict,
            "total_scenes": self.total_scenes,
            "coverage": round(self.conflict_coverage, 2),
            "conflict_types": self.conflict_types,
            "recommendations": self.recommendations
        }


@dataclass
class ScriptQualityReport:
    """Complete script quality report."""
    script_title: str = ""
    analyzed_at: datetime = field(default_factory=datetime.now)
    overall_score: float = 0.0
    overall_level: QualityLevel = QualityLevel.AVERAGE
    dialogue_analysis: Optional[DialogueAnalysis] = None
    pacing_analysis: Optional[PacingAnalysis] = None
    character_arc_check: Optional[CharacterArcCheck] = None
    conflict_analysis: Optional[ConflictAnalysis] = None
    metric_scores: List[MetricScore] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.script_title,
            "overall_score": round(self.overall_score, 2),
            "overall_level": self.overall_level.value,
            "dialogue": self.dialogue_analysis.to_dict() if self.dialogue_analysis else None,
            "pacing": self.pacing_analysis.to_dict() if self.pacing_analysis else None,
            "character_arcs": self.character_arc_check.to_dict() if self.character_arc_check else None,
            "conflict": self.conflict_analysis.to_dict() if self.conflict_analysis else None,
            "strengths": self.strengths,
            "weaknesses": self.weaknesses,
            "recommendations": self.recommendations,
            "analyzed_at": self.analyzed_at.isoformat()
        }


@dataclass
class QualityVisualization:
    """Visualization data for quality metrics."""
    radar_data: Dict[str, Any] = field(default_factory=dict)
    bar_data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "radar": self.radar_data,
            "bar": self.bar_data
        }

