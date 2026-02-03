"""
Data models for Narration API category.

This module defines all data structures used by narration endpoints.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class NarrativeContent:
    """Generated narrative content."""
    text: str
    structure: Optional[Dict[str, Any]] = None  # Acts, scenes, beats
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NarrativeAnalysis:
    """Analysis of narrative structure."""
    acts: List[Dict[str, Any]] = field(default_factory=list)
    beats: List[str] = field(default_factory=list)
    pacing: Dict[str, Any] = field(default_factory=dict)
    themes: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CharacterProfile:
    """Character profile information."""
    name: str
    description: str
    traits: List[str] = field(default_factory=list)
    arc: Optional[str] = None
    relationships: Dict[str, str] = field(default_factory=dict)
    backstory: Optional[str] = None
    goals: List[str] = field(default_factory=list)
    conflicts: List[str] = field(default_factory=list)


@dataclass
class CharacterArc:
    """Character development arc."""
    character_name: str
    starting_state: str
    ending_state: str
    key_moments: List[Dict[str, Any]] = field(default_factory=list)
    transformation: str = ""
    arc_type: str = ""  # e.g., "positive", "negative", "flat"


@dataclass
class DialogueGeneration:
    """Generated dialogue."""
    character: str
    lines: List[str] = field(default_factory=list)
    context: Optional[str] = None
    tone: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SceneBreakdown:
    """Scene breakdown structure."""
    scenes: List[Dict[str, Any]] = field(default_factory=list)
    total_duration: Optional[float] = None
    scene_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SceneEnhancement:
    """Enhanced scene with sensory details."""
    original_scene: str
    enhanced_scene: str
    sensory_details: Dict[str, List[str]] = field(default_factory=dict)  # visual, auditory, etc.
    atmosphere: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToneAnalysis:
    """Analysis of emotional tone."""
    primary_tone: str
    secondary_tones: List[str] = field(default_factory=list)
    emotional_arc: List[Dict[str, Any]] = field(default_factory=list)
    mood_descriptors: List[str] = field(default_factory=list)
    confidence: float = 0.0


@dataclass
class StyleTransfer:
    """Style-transferred content."""
    original_text: str
    transferred_text: str
    source_style: str
    target_style: str
    style_elements: List[str] = field(default_factory=list)


@dataclass
class ContinuityCheck:
    """Continuity analysis results."""
    issues: List[Dict[str, Any]] = field(default_factory=list)
    inconsistencies: List[str] = field(default_factory=list)
    plot_holes: List[str] = field(default_factory=list)
    timeline_conflicts: List[str] = field(default_factory=list)
    overall_score: float = 0.0


@dataclass
class WorldExpansion:
    """World-building expansion."""
    original_world: str
    expanded_elements: Dict[str, Any] = field(default_factory=dict)
    locations: List[Dict[str, Any]] = field(default_factory=list)
    cultures: List[Dict[str, Any]] = field(default_factory=list)
    history: Optional[str] = None
    rules: List[str] = field(default_factory=list)


@dataclass
class PromptOptimization:
    """Optimized prompt."""
    original_prompt: str
    optimized_prompt: str
    improvements: List[str] = field(default_factory=list)
    expected_quality_gain: Optional[float] = None
    reasoning: Optional[str] = None


@dataclass
class NarrativeFeedback:
    """Constructive feedback on narrative."""
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    overall_assessment: str = ""
    score: Optional[float] = None


@dataclass
class NarrativeAlternatives:
    """Alternative narrative directions."""
    original_direction: str
    alternatives: List[Dict[str, Any]] = field(default_factory=list)
    reasoning: Dict[str, str] = field(default_factory=dict)


# LLM Service Configuration
@dataclass
class LLMConfig:
    """Configuration for LLM service."""
    provider: str = "mock"  # "openai", "anthropic", "mock"
    model: Optional[str] = None
    api_key: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    timeout: int = 30
