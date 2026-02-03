"""
Enhanced Composition Rule Engine

Implements composition analysis including Rule of Thirds, Golden Ratio,
Symmetrical composition, Leading Lines detection, and Depth of Field optimization.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from .composition_types import (
    CompositionRule, CompositionAnalysis, RuleWeights, FocalPoint, FocalPointType,
    GridPoint, CompositionSuggestion, DepthLayer, LineElement, SymmetryAnalysis,
    GoldenRatioPoints
)


# Golden ratio constant (phi)
PHI = 1.618033988749895
PHI_INVERSE = 0.618033988749895


class CompositionEngine:
    """
    Enhanced Composition Rule Engine
    
    Analyzes and generates composition suggestions based on:
    - Rule of Thirds
    - Golden Ratio / Golden Spiral
    - Symmetry Detection
    - Leading Lines
    - Depth of Field
    """
    
    # Power points for rule of thirds (higher power = more visually compelling)
    THIRDS_POWER_POINTS = [
        (0.333, 0.333, 0.95, "upper-left intersection"),
        (0.667, 0.333, 0.95, "upper-right intersection"),
        (0.333, 0.667, 0.95, "lower-left intersection"),
        (0.667, 0.667, 0.95, "lower-right intersection"),
        (0.5, 0.333, 0.7, "upper-center"),
        (0.5, 0.667, 0.7, "lower-center"),
        (0.333, 0.5, 0.7, "left-center"),
        (0.667, 0.5, 0.7, "right-center"),
        (0.5, 0.5, 0.5, "center"),
    ]
    
    # Golden ratio points (phi and 1-phi)
    GOLDEN_POWER_POINTS = [
        (PHI_INVERSE, PHI_INVERSE, 1.0, "golden point 1"),
        (1 - PHI_INVERSE, PHI_INVERSE, 1.0, "golden point 2"),
        (PHI_INVERSE, 1 - PHI_INVERSE, 1.0, "golden point 3"),
        (1 - PHI_INVERSE, 1 - PHI_INVERSE, 1.0, "golden point 4"),
    ]
    
    def __init__(self, weights: Optional[RuleWeights] = None):
        """Initialize the composition engine with optional custom weights."""
        self.weights = weights or RuleWeights()
        
    def analyze_composition(
        self,
        focal_points: List[Tuple[float, float]],
        aspect_width: int = 1920,
        aspect_height: int = 1080,
        scene_mood: str = "neutral",
        num_characters: int = 0
    ) -> CompositionAnalysis:
        """
        Analyze composition based on focal points and scene context.
        
        Args:
            focal_points: List of (x, y) normalized coordinates for focal elements
            aspect_width: Frame width in pixels
            aspect_height: Frame height in pixels
            scene_mood: Emotional tone of the scene
            num_characters: Number of characters in the scene
            
        Returns:
            Complete CompositionAnalysis
        """
        analysis = CompositionAnalysis()
        
        # Set metadata
        analysis.aspect_ratio = (aspect_width, aspect_height)
        analysis.frame_width = aspect_width
        analysis.frame_height = aspect_height
        
        # Convert focal points
        analysis.focal_points = self._create_focal_points(focal_points)
        
        if analysis.focal_points:
            analysis.primary_focal_point = max(analysis.focal_points, key=lambda fp: fp.weight)
        
        # Generate grid points
        analysis.thirds_points = self._generate_thirds_grid()
        analysis.golden_points = self._generate_golden_grid()
        
        # Calculate individual rule scores
        analysis.rule_of_thirds_score = self._calculate_thirds_score(
            analysis.focal_points, analysis.thirds_points
        )
        analysis.golden_ratio_score = self._calculate_golden_score(
            analysis.focal_points, analysis.golden_points
        )
        analysis.symmetry_score = self._calculate_symmetry_score(
            analysis.focal_points, num_characters
        )
        analysis.leading_lines_score = self._calculate_leading_lines_score(
            analysis.focal_points, aspect_width, aspect_height
        )
        analysis.depth_score = self._calculate_depth_score(
            analysis.focal_points, num_characters
        )
        
        # Calculate visual balance
        h_balance, v_balance = self._calculate_balance(analysis.focal_points)
        analysis.horizontal_balance = h_balance
        analysis.vertical_balance = v_balance
        analysis.visual_balance = (h_balance + v_balance) / 2
        
        # Determine dominant rule
        analysis.dominant_rule = self._determine_dominant_rule(analysis)
        
        # Calculate overall composition score
        analysis.composition_score = self._calculate_overall_score(analysis, scene_mood)
        
        # Generate suggestions and improvements
        analysis.suggestions = self._generate_suggestions(analysis, scene_mood)
        analysis.improvements = self._generate_improvements(analysis)
        
        return analysis
    
    def _create_focal_points(self, points: List[Tuple[float, float]]) -> List[FocalPoint]:
        """Create FocalPoint objects from coordinate tuples."""
        focal_points = []
        for i, (x, y) in enumerate(points):
            # Clamp to valid range
            x = max(0.0, min(1.0, x))
            y = max(0.0, min(1.0, y))
            
            # Determine type based on position (simplified)
            point_type = FocalPointType.CHARACTER
            
            focal_points.append(FocalPoint(
                x=x,
                y=y,
                type=point_type,
                weight=self._calculate_point_weight(x, y),
                description=f"focal point {i+1}"
            ))
        
        return focal_points
    
    def _calculate_point_weight(self, x: float, y: float) -> float:
        """Calculate visual weight based on position."""
        weight = 0.5
        
        # Points near power points have higher weight
        for px, py, power, _ in self.THIRDS_POWER_POINTS:
            distance = math.sqrt((x - px) ** 2 + (y - py) ** 2)
            if distance < 0.15:
                weight += power * (1 - distance / 0.15) * 0.5
        
        return min(1.0, weight)
    
    def _generate_thirds_grid(self) -> List[GridPoint]:
        """Generate rule of thirds grid points."""
        points = []
        for x, y, power, desc in self.THIRDS_POWER_POINTS:
            points.append(GridPoint(x=x, y=y, power=power, description=desc))
        return points
    
    def _generate_golden_grid(self) -> List[GridPoint]:
        """Generate golden ratio grid points."""
        points = []
        for x, y, power, desc in self.GOLDEN_POWER_POINTS:
            points.append(GridPoint(x=x, y=y, power=power, description=desc))
        return points
    
    def _calculate_thirds_score(
        self,
        focal_points: List[FocalPoint],
        thirds_points: List[GridPoint]
    ) -> float:
        """Calculate how well focal points align with rule of thirds."""
        if not focal_points:
            return 0.0
        
        total_score = 0.0
        for fp in focal_points:
            best_score = 0.0
            for tp in thirds_points:
                distance = math.sqrt((fp.x - tp.x) ** 2 + (fp.y - tp.y) ** 2)
                # Closer to power point = higher score
                score = tp.power * max(0, 1 - distance * 3)
                if score > best_score:
                    best_score = score
            total_score += best_score
        
        return min(1.0, total_score / len(focal_points))
    
    def _calculate_golden_score(
        self,
        focal_points: List[FocalPoint],
        golden_points: List[GridPoint]
    ) -> float:
        """Calculate how well focal points align with golden ratio."""
        if not focal_points:
            return 0.0
        
        total_score = 0.0
        for fp in focal_points:
            best_score = 0.0
            for gp in golden_points:
                distance = math.sqrt((fp.x - gp.x) ** 2 + (fp.y - gp.y) ** 2)
                score = gp.power * max(0, 1 - distance * 2)
                if score > best_score:
                    best_score = score
            total_score += best_score
        
        return min(1.0, total_score / len(focal_points))
    
    def _calculate_symmetry_score(
        self,
        focal_points: List[FocalPoint],
        num_characters: int
    ) -> float:
        """Calculate symmetry score based on point distribution."""
        if len(focal_points) < 2:
            # Single point can't be symmetrical
            return 0.3 if num_characters == 1 else 0.0
        
        # Calculate center of mass
        center_x = sum(fp.x for fp in focal_points) / len(focal_points)
        center_y = sum(fp.y for fp in focal_points) / len(focal_points)
        
        # Check horizontal symmetry
        h_deviation = sum(abs(fp.x - center_x) for fp in focal_points) / len(focal_points)
        h_symmetry = max(0, 1 - h_deviation * 4)
        
        # Check vertical symmetry
        v_deviation = sum(abs(fp.y - center_y) for fp in focal_points) / len(focal_points)
        v_symmetry = max(0, 1 - v_deviation * 4)
        
        # Prefer bilateral symmetry
        return max(h_symmetry, v_symmetry)
    
    def _calculate_leading_lines_score(
        self,
        focal_points: List[FocalPoint],
        width: int,
        height: int
    ) -> float:
        """Calculate effectiveness of leading lines toward focal points."""
        if len(focal_points) < 2:
            return 0.5
        
        # Calculate if points form converging lines toward primary focal point
        primary = focal_points[0]
        total_convergence = 0.0
        
        for fp in focal_points[1:]:
            # Calculate direction from secondary to primary
            dx = primary.x - fp.x
            dy = primary.y - fp.y
            
            # Stronger diagonal movement = better leading lines
            diagonal_strength = abs(dx) * abs(dy) * 4
            total_convergence += diagonal_strength
        
        return min(1.0, total_convergence / (len(focal_points) - 1))
    
    def _calculate_depth_score(
        self,
        focal_points: List[FocalPoint],
        num_characters: int
    ) -> float:
        """Calculate depth layering score."""
        if num_characters <= 1:
            return 0.5
        
        # More characters = potential for depth layering
        optimal_depth = min(3, num_characters)
        return min(1.0, optimal_depth / 3)
    
    def _calculate_balance(
        self,
        focal_points: List[FocalPoint]
    ) -> Tuple[float, float]:
        """Calculate horizontal and vertical balance."""
        if not focal_points:
            return 0.5, 0.5
        
        # Horizontal balance (0 = left, 1 = right)
        total_weight = sum(fp.weight for fp in focal_points)
        if total_weight == 0:
            h_balance = 0.5
        else:
            h_balance = sum(fp.x * fp.weight for fp in focal_points) / total_weight
        
        # Vertical balance (0 = top, 1 = bottom)
        if total_weight == 0:
            v_balance = 0.5
        else:
            v_balance = sum(fp.y * fp.weight for fp in focal_points) / total_weight
        
        return h_balance, v_balance
    
    def _determine_dominant_rule(self, analysis: CompositionAnalysis) -> CompositionRule:
        """Determine the dominant composition rule for this scene."""
        scores = {
            CompositionRule.RULE_OF_THIRDS: analysis.rule_of_thirds_score * self.weights.rule_of_thirds,
            CompositionRule.GOLDEN_RATIO: analysis.golden_ratio_score * self.weights.golden_ratio,
            CompositionRule.SYMMETRICAL: analysis.symmetry_score * self.weights.symmetry,
            CompositionRule.LEADING_LINES: analysis.leading_lines_score * self.weights.leading_lines,
        }
        
        return max(scores.items(), key=lambda x: x[1])[0]
    
    def _calculate_overall_score(
        self,
        analysis: CompositionAnalysis,
        mood: str
    ) -> float:
        """Calculate overall composition score."""
        # Apply mood modifiers
        if mood in ["dramatic", "intense"]:
            weight = self.weights.dramatic_weight
        elif mood in ["balanced", "peaceful"]:
            weight = self.weights.balanced_weight
        elif mood in ["dynamic", "action"]:
            weight = self.weights.dynamic_weight
        else:
            weight = 1.0
        
        # Weighted average of all scores
        base_score = (
            analysis.rule_of_thirds_score * 0.25 +
            analysis.golden_ratio_score * 0.25 +
            analysis.symmetry_score * 0.2 +
            analysis.leading_lines_score * 0.15 +
            analysis.depth_score * 0.15
        )
        
        return min(1.0, base_score * weight)
    
    def _generate_suggestions(
        self,
        analysis: CompositionAnalysis,
        mood: str
    ) -> List[str]:
        """Generate composition suggestions based on analysis."""
        suggestions = []
        
        # Rule of thirds suggestions
        if analysis.rule_of_thirds_score < 0.5:
            suggestions.append(
                "Consider aligning focal elements with rule of thirds power points "
                f"({analysis.thirds_points[0].description}, etc.)"
            )
        
        # Golden ratio suggestions
        if analysis.golden_ratio_score < 0.4:
            suggestions.append(
                "Golden ratio placement could improve visual appeal. "
                f"Try positioning key elements at {analysis.golden_points[0].description}"
            )
        
        # Symmetry suggestions
        if analysis.symmetry_score < 0.3 and mood in ["formal", "balanced"]:
            suggestions.append(
                "For a more balanced composition, consider symmetrical arrangement "
                "or centering the primary subject"
            )
        
        # Balance suggestions
        if abs(analysis.visual_balance - 0.5) > 0.3:
            direction = "right" if analysis.visual_balance > 0.5 else "left"
            suggestions.append(
                f"Frame feels weighted toward the {direction}. "
                "Consider adding visual weight to the opposite side"
            )
        
        # Leading lines suggestions
        if analysis.leading_lines_score < 0.4:
            suggestions.append(
                "Incorporate leading lines (roads, fences, architecture) "
                "to guide the viewer's eye toward the subject"
            )
        
        # Depth suggestions
        if analysis.depth_score < 0.4 and analysis.midground_elements == 0:
            suggestions.append(
                "Add foreground or midground elements to create depth and dimension"
            )
        
        return suggestions
    
    def _generate_improvements(self, analysis: CompositionAnalysis) -> List[str]:
        """Generate specific improvement recommendations."""
        improvements = []
        
        # Primary focal point adjustments
        if analysis.primary_focal_point:
            fp = analysis.primary_focal_point
            # Find closest power point
            closest = min(
                analysis.thirds_points,
                key=lambda tp: math.sqrt((fp.x - tp.x) ** 2 + (fp.y - tp.y) ** 2)
            )
            improvements.append(
                f"Move primary subject toward {closest.description} "
                f"(from {fp.x:.2f}, {fp.y:.2f} to {closest.x:.2f}, {closest.y:.2f})"
            )
        
        # Camera adjustments
        if analysis.dominant_rule == CompositionRule.GOLDEN_RATIO:
            improvements.append(
                "Use golden spiral composition - position key subject at spiral origin"
            )
        elif analysis.dominant_rule == CompositionRule.LEADING_LINES:
            improvements.append(
                "Frame shot to incorporate natural leading lines toward subject"
            )
        
        return improvements
    
    def generate_composition_suggestion(
        self,
        analysis: CompositionAnalysis,
        preferred_rule: Optional[CompositionRule] = None
    ) -> CompositionSuggestion:
        """Generate a specific composition suggestion."""
        rule = preferred_rule or analysis.dominant_rule
        
        if rule == CompositionRule.RULE_OF_THIRDS:
            return self._suggest_thirds_composition(analysis)
        elif rule == CompositionRule.GOLDEN_RATIO:
            return self._suggest_golden_composition(analysis)
        elif rule == CompositionRule.SYMMETRICAL:
            return self._suggest_symmetrical_composition(analysis)
        elif rule == CompositionRule.LEADING_LINES:
            return self._suggest_leading_lines_composition(analysis)
        else:
            return self._suggest_center_composition(analysis)
    
    def _suggest_thirds_composition(self, analysis: CompositionAnalysis) -> CompositionSuggestion:
        """Generate rule of thirds composition suggestion."""
        if analysis.thirds_points:
            target = analysis.thirds_points[0]
            return CompositionSuggestion(
                rule=CompositionRule.RULE_OF_THIRDS,
                confidence=0.9,
                description="Position subject at rule of thirds power point",
                implementation=f"Place primary subject at ({target.x:.2f}, {target.y:.2f})",
                focal_point_adjustment=(target.x, target.y)
            )
        return CompositionSuggestion(
            rule=CompositionRule.RULE_OF_THIRDS,
            confidence=0.5,
            description="Rule of thirds composition",
            implementation="Divide frame into thirds horizontally and vertically"
        )
    
    def _suggest_golden_composition(self, analysis: CompositionAnalysis) -> CompositionSuggestion:
        """Generate golden ratio composition suggestion."""
        if analysis.golden_points:
            target = analysis.golden_points[0]
            return CompositionSuggestion(
                rule=CompositionRule.GOLDEN_RATIO,
                confidence=0.95,
                description="Golden ratio placement for optimal visual flow",
                implementation=f"Position subject at golden point ({target.x:.2f}, {target.y:.2f})",
                focal_point_adjustment=(target.x, target.y)
            )
        return CompositionSuggestion(
            rule=CompositionRule.GOLDEN_RATIO,
            confidence=0.5,
            description="Golden ratio composition",
            implementation="Apply golden spiral - eye flows from corner toward center"
        )
    
    def _suggest_symmetrical_composition(self, analysis: CompositionAnalysis) -> CompositionSuggestion:
        """Generate symmetrical composition suggestion."""
        return CompositionSuggestion(
            rule=CompositionRule.SYMMETRICAL,
            confidence=0.85,
            description="Symmetrical composition for balance and formality",
            implementation="Center subject and ensure bilateral symmetry"
        )
    
    def _suggest_leading_lines_composition(self, analysis: CompositionSuggestion) -> CompositionSuggestion:
        """Generate leading lines composition suggestion."""
        return CompositionSuggestion(
            rule=CompositionRule.LEADING_LINES,
            confidence=0.8,
            description="Leading lines to guide viewer attention",
            implementation="Frame shot to include natural lines converging toward subject"
        )
    
    def _suggest_center_composition(self, analysis: CompositionAnalysis) -> CompositionSuggestion:
        """Generate center composition suggestion."""
        return CompositionSuggestion(
            rule=CompositionRule.CENTER_COMPOSITION,
            confidence=0.7,
            description="Center composition for direct impact",
            implementation="Place subject at frame center (0.5, 0.5)",
            focal_point_adjustment=(0.5, 0.5)
        )
    
    def calculate_depth_of_field(
        self,
        subject_distance: float,
        focal_length: float,
        sensor_size: float = 36.0,  # Full frame default
        subject_size_ratio: float = 0.1  # Subject occupies 10% of frame
    ) -> Dict:
        """
        Calculate depth of field parameters.
        
        Args:
            subject_distance: Distance to subject in meters
            focal_length: Lens focal length in mm
            sensor_size: Sensor size in mm (default: 36 for full frame)
            subject_size_ratio: Desired subject size ratio
            
        Returns:
            Dictionary with DOF calculations
        """
        # Calculate required aperture for desired subject size
        # f = (subject_distance * sensor_size) / (subject_size * magnification)
        required_focus_distance = subject_distance
        
        # Calculate circle of confusion
        coc = sensor_size / 15000  # Approximate
        
        # Hyperfocal distance
        hyperfocal = (focal_length ** 2) / (focal_length * coc)
        
        # Near limit (closest acceptably sharp point)
        near_limit = (hyperfocal * required_focus_distance) / (hyperfocal + (required_focus_distance - focal_length))
        
        # Far limit (farthest acceptably sharp point)
        far_limit = (hyperfocal * required_focus_distance) / (hyperfocal - (required_focus_distance - focal_length))
        
        # Depth of field
        dof = far_limit - near_limit if far_limit > near_limit else 0
        
        # Calculate optimal aperture for bokeh if desired
        optimal_aperture = min(focal_length / 50, 2.8)  # f/2.8 minimum recommendation
        
        return {
            "focus_distance_meters": round(required_focus_distance, 2),
            "hyperfocal_distance_meters": round(hyperfocal / 1000, 1),
            "near_limit_meters": round(max(0, near_limit) / 1000, 2),
            "far_limit_meters": round(far_limit / 1000, 2),
            "depth_of_field_meters": round(max(0, dof) / 1000, 2),
            "recommended_aperture": f"f/{optimal_aperture:.1f}",
            "bokeh_quality": "smooth" if focal_length > 85 else "moderate"
        }
    
    def get_golden_spiral_points(
        self,
        width: int,
        height: int,
        origin: str = "top_left"
    ) -> List[Tuple[float, float]]:
        """Generate golden spiral key points for composition."""
        points = []
        
        # Golden spiral origin positions
        origins = {
            "top_left": (0, 0),
            "top_right": (1, 0),
            "bottom_left": (0, 1),
            "bottom_right": (1, 1),
        }
        
        ox, oy = origins.get(origin, (0, 0))
        
        # Generate spiral points (simplified)
        for i in range(8):
            t = i / 7
            # Logarithmic spiral approximation
            angle = t * math.pi * 2 * 2  # Two turns
            radius = PHI ** (-t * 4)  # Golden spiral decay
            
            # Convert to Cartesian
            x = ox + radius * math.cos(angle) * (1 if ox == 0 else -1)
            y = oy + radius * math.sin(angle) * (1 if oy == 0 else -1)
            
            # Clamp to frame
            x = max(0.0, min(1.0, x))
            y = max(0.0, min(1.0, y))
            
            points.append((x, y))
        
        return points


def analyze_composition(
    focal_points: List[Tuple[float, float]],
    aspect_width: int = 1920,
    aspect_height: int = 1080,
    scene_mood: str = "neutral",
    num_characters: int = 0
) -> CompositionAnalysis:
    """Convenience function to analyze composition."""
    engine = CompositionEngine()
    return engine.analyze_composition(
        focal_points=focal_points,
        aspect_width=aspect_width,
        aspect_height=aspect_height,
        scene_mood=scene_mood,
        num_characters=num_characters
    )


def generate_composition_suggestion(
    analysis: CompositionAnalysis,
    preferred_rule: Optional[str] = None
) -> CompositionSuggestion:
    """Generate composition suggestion from analysis."""
    engine = CompositionEngine()
    rule = CompositionRule(preferred_rule) if preferred_rule else None
    return engine.generate_composition_suggestion(analysis, preferred_rule=rule)


def calculate_dof(
    subject_distance: float,
    focal_length: float,
    sensor_size: float = 36.0
) -> Dict:
    """Calculate depth of field parameters."""
    engine = CompositionEngine()
    return engine.calculate_depth_of_field(subject_distance, focal_length, sensor_size)

