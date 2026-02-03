"""
Composition Rule Engine Types

Defines composition rules, analysis structures, and rule weights for visual composition.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional


class CompositionRule(Enum):
    """Visual composition rules following cinematic principles."""
    RULE_OF_THIRDS = "rule_of_thirds"
    GOLDEN_RATIO = "golden_ratio"
    GOLDEN_SPIRAL = "golden_spiral"
    SYMMETRICAL = "symmetrical"
    ASYMMETRICAL = "asymmetrical"
    LEADING_LINES = "leading_lines"
    FRAMING = "framing"
    NEGATIVE_SPACE = "negative_space"
    DEPTH_LAYERING = "depth_layering"
    CENTER_COMPOSITION = "center"
    DIAGONAL = "diagonal"
    TRIANGULAR = "triangular"


class FocalPointType(Enum):
    """Types of focal points in composition."""
    CHARACTER = "character"
    OBJECT = "object"
    ACTION = "action"
    LIGHT = "light"
    COLOR = "color"
    TEXTURE = "texture"


@dataclass
class FocalPoint:
    """A focal point within the composition."""
    x: float  # Normalized 0-1
    y: float  # Normalized 0-1
    type: FocalPointType
    weight: float = 1.0
    description: str = ""


@dataclass
class GridPoint:
    """A point on a composition grid."""
    x: float
    y: float
    power: float  # Visual power of this point (0-1)
    description: str = ""


@dataclass
class CompositionAnalysis:
    """Complete composition analysis result."""
    # Overall scores
    composition_score: float = 0.0
    rule_of_thirds_score: float = 0.0
    golden_ratio_score: float = 0.0
    symmetry_score: float = 0.0
    leading_lines_score: float = 0.0
    depth_score: float = 0.0
    
    # Focal points
    focal_points: List[FocalPoint] = field(default_factory=list)
    primary_focal_point: Optional[FocalPoint] = None
    
    # Grid points
    thirds_points: List[GridPoint] = field(default_factory=list)
    golden_points: List[GridPoint] = field(default_factory=list)
    
    # Composition details
    dominant_rule: CompositionRule = CompositionRule.RULE_OF_THIRDS
    secondary_rules: List[CompositionRule] = field(default_factory=list)
    
    # Balance metrics
    visual_balance: float = 0.5  # 0=left, 0.5=balanced, 1=right
    horizontal_balance: float = 0.5
    vertical_balance: float = 0.5
    
    # Depth information
    foreground_elements: int = 0
    midground_elements: int = 0
    background_elements: int = 0
    
    # Suggestions
    suggestions: List[str] = field(default_factory=list)
    improvements: List[str] = field(default_factory=list)
    
    # Metadata
    aspect_ratio: Tuple[int, int] = (16, 9)
    frame_width: int = 1920
    frame_height: int = 1080


@dataclass
class RuleWeights:
    """Weights for different composition rules."""
    rule_of_thirds: float = 1.0
    golden_ratio: float = 1.2
    symmetry: float = 0.8
    leading_lines: float = 1.0
    depth: float = 0.9
    negative_space: float = 0.7
    framing: float = 0.8
    
    # Mood modifiers
    dramatic_weight: float = 1.0
    balanced_weight: float = 1.0
    dynamic_weight: float = 1.1


@dataclass
class CompositionSuggestion:
    """A composition suggestion based on analysis."""
    rule: CompositionRule
    confidence: float
    description: str
    implementation: str
    focal_point_adjustment: Optional[Tuple[float, float]] = None
    camera_adjustment: Optional[Dict] = None


@dataclass
class DepthLayer:
    """A depth layer in the composition."""
    layer_id: int
    depth_score: float  # 0=foreground, 1=background
    elements: List[str] = field(default_factory=list)
    focus_quality: str = ""  # "sharp", "soft", "bokeh"
    description: str = ""


@dataclass 
class LineElement:
    """A detected or suggested line in the composition."""
    start_point: Tuple[float, float]
    end_point: Tuple[float, float]
    line_type: str = "leading"
    strength: float = 0.5
    direction: str = ""  # "horizontal", "vertical", "diagonal"
    convergence_point: Optional[Tuple[float, float]] = None
    description: str = ""


@dataclass
class SymmetryAnalysis:
    """Symmetry analysis result."""
    is_symmetrical: bool = False
    symmetry_axis: str = ""  # "horizontal", "vertical", "radial"
    symmetry_score: float = 0.0
    asymmetry_elements: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


@dataclass
class GoldenRatioPoints:
    """Golden ratio key points."""
    # Phi points (0.618, 0.382)
    phi_points: List[Tuple[float, float]] = field(default_factory=list)
    # Golden spiral origin
    spiral_origin: Tuple[float, float] = (0.0, 0.0)
    # Golden triangle points
    golden_triangles: List[Tuple[Tuple[float, float], Tuple[float, float], Tuple[float, float]]] = field(default_factory=list)
    # Suggested focus positions
    suggested_focus: List[Tuple[float, float]] = field(default_factory=list)

