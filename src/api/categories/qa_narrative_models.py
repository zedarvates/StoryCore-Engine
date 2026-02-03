"""
Data models for QA Narrative API category.

This module defines all data structures used by QA narrative endpoints.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class CoherenceAnalysis:
    """Narrative coherence analysis results."""
    overall_score: float  # 0.0 to 1.0
    logical_consistency: float
    plot_coherence: float
    character_consistency: float
    issues: List[Dict[str, Any]] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class PacingAnalysis:
    """Story pacing analysis results."""
    overall_pace: str  # "slow", "moderate", "fast", "varied"
    pace_score: float  # 0.0 to 1.0
    act_pacing: List[Dict[str, Any]] = field(default_factory=list)
    scene_pacing: List[Dict[str, Any]] = field(default_factory=list)
    rhythm_analysis: Dict[str, Any] = field(default_factory=dict)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class CharacterQAAnalysis:
    """Character consistency and development analysis."""
    overall_score: float  # 0.0 to 1.0
    consistency_score: float
    development_score: float
    characters: List[Dict[str, Any]] = field(default_factory=list)
    issues: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class DialogueQAAnalysis:
    """Dialogue quality analysis."""
    overall_score: float  # 0.0 to 1.0
    naturalness_score: float
    character_voice_score: float
    subtext_score: float
    issues: List[Dict[str, Any]] = field(default_factory=list)
    examples: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class GrammarAnalysis:
    """Grammar, spelling, and syntax analysis."""
    overall_score: float  # 0.0 to 1.0
    grammar_errors: List[Dict[str, Any]] = field(default_factory=list)
    spelling_errors: List[Dict[str, Any]] = field(default_factory=list)
    syntax_issues: List[Dict[str, Any]] = field(default_factory=list)
    error_count: int = 0
    suggestions: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ReadabilityAnalysis:
    """Readability metrics and scores."""
    flesch_reading_ease: Optional[float] = None
    flesch_kincaid_grade: Optional[float] = None
    gunning_fog_index: Optional[float] = None
    smog_index: Optional[float] = None
    automated_readability_index: Optional[float] = None
    overall_readability: str = "moderate"  # "easy", "moderate", "difficult"
    target_audience: str = "general"
    recommendations: List[str] = field(default_factory=list)


@dataclass
class TropeAnalysis:
    """Narrative tropes and clichés analysis."""
    tropes_found: List[Dict[str, Any]] = field(default_factory=list)
    cliches: List[Dict[str, Any]] = field(default_factory=list)
    originality_score: float = 0.0  # 0.0 to 1.0
    overused_patterns: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class ThemeAnalysis:
    """Thematic elements analysis."""
    primary_themes: List[str] = field(default_factory=list)
    secondary_themes: List[str] = field(default_factory=list)
    theme_development: Dict[str, Any] = field(default_factory=dict)
    symbolic_elements: List[Dict[str, Any]] = field(default_factory=list)
    thematic_consistency: float = 0.0  # 0.0 to 1.0
    recommendations: List[str] = field(default_factory=list)


@dataclass
class QANarrativeReport:
    """Comprehensive QA narrative report."""
    overall_score: float  # 0.0 to 1.0
    coherence: Optional[CoherenceAnalysis] = None
    pacing: Optional[PacingAnalysis] = None
    character: Optional[CharacterQAAnalysis] = None
    dialogue: Optional[DialogueQAAnalysis] = None
    grammar: Optional[GrammarAnalysis] = None
    readability: Optional[ReadabilityAnalysis] = None
    tropes: Optional[TropeAnalysis] = None
    themes: Optional[ThemeAnalysis] = None
    summary: str = ""
    recommendations: List[str] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.now)
