"""
AI Shot Composition Engine - Intelligent shot composition suggestions.

This module provides AI-powered shot composition capabilities including
camera positioning, framing analysis, visual balance, and composition rules.
"""

import asyncio
import logging
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple, Union
from pathlib import Path
import json
import time
from datetime import datetime
import uuid

try:
    from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    from .ai_enhancement_engine import AIConfig
except ImportError:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    from ai_enhancement_engine import AIConfig


class CompositionRule(Enum):
    """Composition rules for shot framing."""
    RULE_OF_THIRDS = "rule_of_thirds"
    GOLDEN_RATIO = "golden_ratio"
    SYMMETRICAL = "symmetrical"
    LEADING_LINES = "leading_lines"
    FRAMING = "framing"
    DEPTH_OF_FIELD = "depth_of_field"
    BALANCED = "balanced"
    DYNAMIC = "dynamic"


class ShotType(Enum):
    """Types of camera shots."""
    EXTREME_CLOSE_UP = "extreme_close_up"
    CLOSE_UP = "close_up"
    MEDIUM_CLOSE_UP = "medium_close_up"
    MEDIUM_SHOT = "medium_shot"
    MEDIUM_LONG_SHOT = "medium_long_shot"
    LONG_SHOT = "long_shot"
    EXTREME_LONG_SHOT = "extreme_long_shot"
    ESTABLISHING_SHOT = "establishing_shot"
    OVER_THE_SHOULDER = "over_the_shoulder"
    POINT_OF_VIEW = "point_of_view"
    DUTCH_ANGLE = "dutch_angle"
    HIGH_ANGLE = "high_angle"
    LOW_ANGLE = "low_angle"


class CameraMovement(Enum):
    """Types of camera movements."""
    STATIC = "static"
    PAN = "pan"
    TILT = "tilt"
    DOLLY_IN = "dolly_in"
    DOLLY_OUT = "dolly_out"
    TRACKING = "tracking"
    CRANE = "crane"
    HANDHELD = "handheld"
    ZOOM = "zoom"
    RACK_FOCUS = "rack_focus"


class LightingStyle(Enum):
    """Types of lighting styles."""
    HIGH_KEY = "high_key"
    LOW_KEY = "low_key"
    THREE_POINT = "three_point"
    NATURAL = "natural"
    DRAMATIC = "dramatic"
    SOFT = "soft"
    HARSH = "harsh"
    BACKLIGHT = "backlight"
    SIDE_LIGHT = "side_light"


@dataclass
class CameraPosition:
    """Camera position and orientation."""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    rotation_x: float = 0.0
    rotation_y: float = 0.0
    rotation_z: float = 0.0
    focal_length: float = 50.0
    aperture: float = 2.8
    sensor_size: float = 36.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'x': self.x,
            'y': self.y,
            'z': self.z,
            'rotation_x': self.rotation_x,
            'rotation_y': self.rotation_y,
            'rotation_z': self.rotation_z,
            'focal_length': self.focal_length,
            'aperture': self.aperture,
            'sensor_size': self.sensor_size
        }


@dataclass
class CompositionAnalysis:
    """Analysis of shot composition."""
    composition_score: float  # 0.0 to 1.0
    rule_applied: CompositionRule
    visual_balance: float    # 0.0 to 1.0
    focal_point_clarity: float  # 0.0 to 1.0
    depth_utilization: float    # 0.0 to 1.0
    rule_violations: List[str]
    improvement_suggestions: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'composition_score': self.composition_score,
            'rule_applied': self.rule_applied.value,
            'visual_balance': self.visual_balance,
            'focal_point_clarity': self.focal_point_clarity,
            'depth_utilization': self.depth_utilization,
            'rule_violations': self.rule_violations,
            'improvement_suggestions': self.improvement_suggestions
        }


@dataclass
class ShotSuggestion:
    """Suggested shot composition."""
    shot_id: str
    shot_type: ShotType
    camera_movement: CameraMovement
    composition_rule: CompositionRule
    lighting_style: LightingStyle
    camera_position: CameraPosition
    composition_analysis: CompositionAnalysis
    confidence_score: float
    reasoning: str
    alternative_suggestions: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'shot_id': self.shot_id,
            'shot_type': self.shot_type.value,
            'camera_movement': self.camera_movement.value,
            'composition_rule': self.composition_rule.value,
            'lighting_style': self.lighting_style.value,
            'camera_position': self.camera_position.to_dict(),
            'composition_analysis': self.composition_analysis.to_dict(),
            'confidence_score': self.confidence_score,
            'reasoning': self.reasoning,
            'alternative_suggestions': self.alternative_suggestions
        }


@dataclass
class SceneContext:
    """Context information for shot composition."""
    scene_type: str
    emotional_tone: str
    time_of_day: str
    location_type: str
    character_emotions: List[str]
    story_significance: int  # 1-10 scale
    action_intensity: int   # 1-10 scale
    dialogue_importance: int  # 1-10 scale
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'scene_type': self.scene_type,
            'emotional_tone': self.emotional_tone,
            'time_of_day': self.time_of_day,
            'location_type': self.location_type,
            'character_emotions': self.character_emotions,
            'story_significance': self.story_significance,
            'action_intensity': self.action_intensity,
            'dialogue_importance': self.dialogue_importance
        }


@dataclass
class CharacterPosition:
    """Character position in frame."""
    character_id: str
    x: float
    y: float
    z: float
    screen_position: Tuple[float, float]  # 0.0-1.0 normalized
    size_in_frame: float  # 0.0-1.0
    facing_direction: float  # radians
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'character_id': self.character_id,
            'x': self.x,
            'y': self.y,
            'z': self.z,
            'screen_position': self.screen_position,
            'size_in_frame': self.size_in_frame,
            'facing_direction': self.facing_direction
        }


@dataclass
class ShotCompositionRequest:
    """Request for shot composition suggestions."""
    scene_context: SceneContext
    character_positions: List[CharacterPosition]
    existing_shots: List[ShotSuggestion]
    target_emotion: str
    technical_constraints: Dict[str, Any]
    artistic_preferences: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'scene_context': self.scene_context.to_dict(),
            'character_positions': [cp.to_dict() for cp in self.character_positions],
            'existing_shots': [s.to_dict() for s in self.existing_shots],
            'target_emotion': self.target_emotion,
            'technical_constraints': self.technical_constraints,
            'artistic_preferences': self.artistic_preferences
        }


@dataclass
class ShotCompositionResult:
    """Result of shot composition analysis."""
    request_id: str
    timestamp: datetime
    suggested_shots: List[ShotSuggestion]
    overall_score: float
    composition_guidelines: List[str]
    technical_recommendations: List[str]
    artistic_notes: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'request_id': self.request_id,
            'timestamp': self.timestamp.isoformat(),
            'suggested_shots': [s.to_dict() for s in self.suggested_shots],
            'overall_score': self.overall_score,
            'composition_guidelines': self.composition_guidelines,
            'technical_recommendations': self.technical_recommendations,
            'artistic_notes': self.artistic_notes
        }


@dataclass
class CompositionRuleWeights:
    """Weights for different composition rules based on context."""
    rule_of_thirds: float = 0.8
    golden_ratio: float = 0.7
    symmetrical: float = 0.6
    leading_lines: float = 0.9
    framing: float = 0.8
    depth_of_field: float = 0.7
    balanced: float = 0.8
    dynamic: float = 0.6
    
    def get_weight(self, rule: CompositionRule) -> float:
        """Get weight for a specific composition rule."""
        return getattr(self, rule.value, 0.5)


class ShotCompositionError(Exception):
    """Custom exception for shot composition errors."""
    pass


class AIShotCompositionEngine:
    """
    AI Shot Composition Engine for intelligent shot composition suggestions.
    
    This engine provides:
    - Camera positioning and framing analysis
    - Composition rule application
    - Visual balance assessment
    - Shot type recommendations
    - Lighting style suggestions
    """
    
    def __init__(self, ai_config: AIConfig):
        """Initialize AI Shot Composition Engine."""
        self.ai_config = ai_config
        self.logger = logging.getLogger(__name__)
        
        # Initialize circuit breaker for fault tolerance
        self.circuit_breaker = CircuitBreaker(ai_config.circuit_breaker_config)
        
        # Composition state
        self.is_initialized = False
        self.composition_cache = {}
        self.composition_history = []
        
        # Composition rule templates and weights
        self.rule_templates = self._load_rule_templates()
        self.rule_weights = self._load_rule_weights()
        
        self.logger.info("AI Shot Composition Engine initialized")
    
    async def initialize(self) -> bool:
        """Initialize shot composition engine components."""
        try:
            self.logger.info("Initializing AI Shot Composition Engine...")
            
            # Validate configuration
            if not self._validate_config():
                raise ValueError("Invalid shot composition configuration")
            
            self.is_initialized = True
            self.logger.info("AI Shot Composition Engine initialization complete")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize AI Shot Composition Engine: {e}")
            return False
    
    def _validate_config(self) -> bool:
        """Validate shot composition configuration."""
        try:
            # Basic validation - more detailed validation can be added
            return True
        except Exception as e:
            self.logger.error(f"Configuration validation failed: {e}")
            return False
    
    def _load_rule_templates(self) -> Dict[CompositionRule, Dict[str, Any]]:
        """Load composition rule templates."""
        return {
            CompositionRule.RULE_OF_THIRDS: {
                'description': 'Divide frame into thirds, place subjects at intersections',
                'ideal_positions': [(0.33, 0.33), (0.66, 0.33), (0.33, 0.66), (0.66, 0.66)],
                'weight': 0.8
            },
            CompositionRule.GOLDEN_RATIO: {
                'description': 'Use golden ratio for aesthetically pleasing composition',
                'ideal_positions': [(0.38, 0.38), (0.62, 0.38), (0.38, 0.62), (0.62, 0.62)],
                'weight': 0.7
            },
            CompositionRule.SYMMETRICAL: {
                'description': 'Center subjects for balanced, formal composition',
                'ideal_positions': [(0.5, 0.5)],
                'weight': 0.6
            },
            CompositionRule.LEADING_LINES: {
                'description': 'Use lines to guide viewer\'s eye to focal point',
                'ideal_positions': [(0.5, 0.5)],
                'weight': 0.9
            },
            CompositionRule.FRAME: {
                'description': 'Use elements to frame the main subject',
                'ideal_positions': [(0.5, 0.5)],
                'weight': 0.8
            }
        }
    
    def _load_rule_weights(self) -> CompositionRuleWeights:
        """Load composition rule weights based on context."""
        return CompositionRuleWeights()
    
    async def suggest_shot_composition(self, request: ShotCompositionRequest) -> Optional[ShotCompositionResult]:
        """
        Suggest optimal shot composition based on scene context.
        
        Args:
            request: Shot composition request with context and constraints
            
        Returns:
            Shot composition suggestions or None if analysis fails
        """
        if not self.is_initialized:
            self.logger.error("AI Shot Composition Engine not initialized")
            return None
        
        # Use circuit breaker for fault tolerance
        async def _compose_operation():
            try:
                # Generate request ID
                request_id = str(uuid.uuid4())
                
                # Analyze scene context
                context_analysis = await self._analyze_scene_context(request.scene_context)
                
                # Generate shot suggestions
                suggested_shots = await self._generate_shot_suggestions(
                    request, context_analysis
                )
                
                # Calculate overall score
                overall_score = await self._calculate_overall_score(suggested_shots)
                
                # Generate guidelines and recommendations
                guidelines = await self._generate_composition_guidelines(request.scene_context)
                technical_rec = await self._generate_technical_recommendations(request)
                artistic_notes = await self._generate_artistic_notes(request, suggested_shots)
                
                # Create complete result
                result = ShotCompositionResult(
                    request_id=request_id,
                    timestamp=datetime.now(),
                    suggested_shots=suggested_shots,
                    overall_score=overall_score,
                    composition_guidelines=guidelines,
                    technical_recommendations=technical_rec,
                    artistic_notes=artistic_notes
                )
                
                # Cache the result
                self.composition_cache[request_id] = result
                self.composition_history.append(request_id)
                
                self.logger.info(f"Generated shot composition suggestions: {request_id}")
                return result
                
            except Exception as e:
                self.logger.error(f"Shot composition analysis failed: {e}")
                raise
        
        try:
            return await self.circuit_breaker.call(_compose_operation)
        except Exception as e:
            self.logger.error(f"Circuit breaker blocked shot composition: {e}")
            return None
    
    async def _analyze_scene_context(self, scene_context: SceneContext) -> Dict[str, Any]:
        """Analyze scene context for composition decisions."""
        # Mock context analysis
        context_analysis = {
            'recommended_shot_types': self._get_recommended_shot_types(scene_context),
            'preferred_composition_rules': self._get_preferred_rules(scene_context),
            'ideal_lighting_styles': self._get_ideal_lighting(scene_context),
            'emotional_alignment': self._calculate_emotional_alignment(scene_context)
        }
        
        return context_analysis
    
    def _get_recommended_shot_types(self, scene_context: SceneContext) -> List[ShotType]:
        """Get recommended shot types based on scene context."""
        if scene_context.story_significance >= 8:
            return [ShotType.CLOSE_UP, ShotType.MEDIUM_SHOT, ShotType.LONG_SHOT]
        elif scene_context.action_intensity >= 7:
            return [ShotType.MEDIUM_LONG_SHOT, ShotType.TRACKING, ShotType.DOLLY_IN]
        elif scene_context.dialogue_importance >= 7:
            return [ShotType.MEDIUM_CLOSE_UP, ShotType.OVER_THE_SHOULDER, ShotType.CLOSE_UP]
        else:
            return [ShotType.MEDIUM_SHOT, ShotType.LONG_SHOT, ShotType.ESTABLISHING_SHOT]
    
    def _get_preferred_rules(self, scene_context: SceneContext) -> List[CompositionRule]:
        """Get preferred composition rules based on scene context."""
        if scene_context.emotional_tone == "dramatic":
            return [CompositionRule.DUTCH_ANGLE, CompositionRule.LOW_ANGLE, CompositionRule.FRAME]
        elif scene_context.emotional_tone == "peaceful":
            return [CompositionRule.SYMMETRICAL, CompositionRule.GOLDEN_RATIO, CompositionRule.BALANCED]
        elif scene_context.action_intensity >= 7:
            return [CompositionRule.DYNAMIC, CompositionRule.LEADING_LINES, CompositionRule.RULE_OF_THIRDS]
        else:
            return [CompositionRule.RULE_OF_THIRDS, CompositionRule.BALANCED, CompositionRule.DEPTH_OF_FIELD]
    
    def _get_ideal_lighting(self, scene_context: SceneContext) -> List[LightingStyle]:
        """Get ideal lighting styles based on scene context."""
        if scene_context.time_of_day == "night":
            return [LightingStyle.LOW_KEY, LightingStyle.BACKLIGHT, LightingStyle.DRAMATIC]
        elif scene_context.emotional_tone == "happy":
            return [LightingStyle.HIGH_KEY, LightingStyle.NATURAL, LightingStyle.SOFT]
        elif scene_context.story_significance >= 8:
            return [LightingStyle.THREE_POINT, LightingStyle.DRAMATIC, LightingStyle.SIDE_LIGHT]
        else:
            return [LightingStyle.NATURAL, LightingStyle.THREE_POINT, LightingStyle.SOFT]
    
    def _calculate_emotional_alignment(self, scene_context: SceneContext) -> float:
        """Calculate how well composition choices align with emotional tone."""
        # Mock emotional alignment calculation
        base_score = 0.5
        
        if scene_context.emotional_tone in ["dramatic", "intense"]:
            base_score += 0.2
        elif scene_context.emotional_tone in ["peaceful", "calm"]:
            base_score += 0.1
        
        if scene_context.story_significance >= 8:
            base_score += 0.2
        
        return min(1.0, base_score)
    
    async def _generate_shot_suggestions(self, request: ShotCompositionRequest, 
                                       context_analysis: Dict[str, Any]) -> List[ShotSuggestion]:
        """Generate shot composition suggestions."""
        suggestions = []
        
        # Generate multiple shot suggestions
        for i, shot_type in enumerate(context_analysis['recommended_shot_types'][:3]):
            # Determine camera movement based on shot type
            camera_movement = self._get_recommended_movement(shot_type, request.scene_context)
            
            # Determine composition rule
            composition_rule = context_analysis['preferred_composition_rules'][i % len(context_analysis['preferred_composition_rules'])]
            
            # Determine lighting style
            lighting_style = context_analysis['ideal_lighting_styles'][i % len(context_analysis['ideal_lighting_styles'])]
            
            # Generate camera position
            camera_position = self._generate_camera_position(shot_type, request.character_positions)
            
            # Analyze composition
            composition_analysis = await self._analyze_composition(
                camera_position, composition_rule, request.character_positions
            )
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence_score(
                shot_type, composition_rule, lighting_style, context_analysis
            )
            
            # Generate reasoning
            reasoning = self._generate_reasoning(shot_type, composition_rule, lighting_style, request.scene_context)
            
            # Create shot suggestion
            suggestion = ShotSuggestion(
                shot_id=f"shot_{i+1:02d}",
                shot_type=shot_type,
                camera_movement=camera_movement,
                composition_rule=composition_rule,
                lighting_style=lighting_style,
                camera_position=camera_position,
                composition_analysis=composition_analysis,
                confidence_score=confidence_score,
                reasoning=reasoning,
                alternative_suggestions=self._generate_alternatives(shot_type, i)
            )
            
            suggestions.append(suggestion)
        
        return suggestions
    
    def _get_recommended_movement(self, shot_type: ShotType, scene_context: SceneContext) -> CameraMovement:
        """Get recommended camera movement for shot type."""
        if shot_type in [ShotType.CLOSE_UP, ShotType.MEDIUM_CLOSE_UP]:
            return CameraMovement.STATIC
        elif shot_type == ShotType.TRACKING:
            return CameraMovement.TRACKING
        elif scene_context.action_intensity >= 7:
            return CameraMovement.HANDHELD
        else:
            return CameraMovement.STATIC
    
    def _generate_camera_position(self, shot_type: ShotType, 
                                character_positions: List[CharacterPosition]) -> CameraPosition:
        """Generate optimal camera position for shot type."""
        # Mock camera position generation
        base_positions = {
            ShotType.CLOSE_UP: (0, 0, 1),
            ShotType.MEDIUM_SHOT: (0, 0, 3),
            ShotType.LONG_SHOT: (0, 0, 10),
            ShotType.ESTABLISHING_SHOT: (0, 10, 20)
        }
        
        x, y, z = base_positions.get(shot_type, (0, 0, 5))
        
        # Adjust based on character positions
        if character_positions:
            avg_x = sum(cp.x for cp in character_positions) / len(character_positions)
            avg_z = sum(cp.z for cp in character_positions) / len(character_positions)
            x = avg_x
            z = avg_z + 5
        
        return CameraPosition(x=x, y=y, z=z)
    
    async def _analyze_composition(self, camera_position: CameraPosition, 
                                 composition_rule: CompositionRule,
                                 character_positions: List[CharacterPosition]) -> CompositionAnalysis:
        """Analyze composition quality."""
        # Mock composition analysis
        composition_score = 0.7
        visual_balance = 0.8
        focal_point_clarity = 0.9
        depth_utilization = 0.6
        
        # Adjust scores based on rule
        rule_weight = self.rule_weights.get_weight(composition_rule)
        composition_score *= rule_weight
        
        # Generate rule violations and suggestions
        rule_violations = []
        improvement_suggestions = []
        
        if visual_balance < 0.7:
            rule_violations.append("Poor visual balance")
            improvement_suggestions.append("Adjust character positioning")
        
        if focal_point_clarity < 0.8:
            rule_violations.append("Unclear focal point")
            improvement_suggestions.append("Use depth of field to isolate subject")
        
        return CompositionAnalysis(
            composition_score=composition_score,
            rule_applied=composition_rule,
            visual_balance=visual_balance,
            focal_point_clarity=focal_point_clarity,
            depth_utilization=depth_utilization,
            rule_violations=rule_violations,
            improvement_suggestions=improvement_suggestions
        )
    
    def _calculate_confidence_score(self, shot_type: ShotType, composition_rule: CompositionRule,
                                  lighting_style: LightingStyle, context_analysis: Dict[str, Any]) -> float:
        """Calculate confidence score for shot suggestion."""
        base_score = 0.5
        
        # Add scores based on context alignment
        if shot_type in context_analysis['recommended_shot_types']:
            base_score += 0.2
        
        if composition_rule in context_analysis['preferred_composition_rules']:
            base_score += 0.15
        
        if lighting_style in context_analysis['ideal_lighting_styles']:
            base_score += 0.1
        
        # Add emotional alignment bonus
        base_score += context_analysis['emotional_alignment'] * 0.1
        
        return min(1.0, base_score)
    
    def _generate_reasoning(self, shot_type: ShotType, composition_rule: CompositionRule,
                          lighting_style: LightingStyle, scene_context: SceneContext) -> str:
        """Generate reasoning for shot suggestion."""
        reasoning_parts = []
        
        if shot_type in [ShotType.CLOSE_UP, ShotType.MEDIUM_CLOSE_UP]:
            reasoning_parts.append("Focuses on character emotions")
        
        if composition_rule == CompositionRule.RULE_OF_THIRDS:
            reasoning_parts.append("Creates dynamic, engaging composition")
        
        if lighting_style == LightingStyle.THREE_POINT:
            reasoning_parts.append("Provides professional, balanced illumination")
        
        if scene_context.story_significance >= 8:
            reasoning_parts.append("Emphasizes narrative importance")
        
        return " ".join(reasoning_parts) if reasoning_parts else "Optimal composition choice"
    
    def _generate_alternatives(self, shot_type: ShotType, index: int) -> List[str]:
        """Generate alternative shot suggestions."""
        alternatives = []
        
        if shot_type == ShotType.CLOSE_UP:
            alternatives.extend(["Medium shot for context", "Over-the-shoulder for perspective"])
        elif shot_type == ShotType.MEDIUM_SHOT:
            alternatives.extend(["Close-up for emotion", "Long shot for environment"])
        elif shot_type == ShotType.LONG_SHOT:
            alternatives.extend(["Medium shot for detail", "Establishing shot for context"])
        
        return alternatives
    
    async def _calculate_overall_score(self, suggested_shots: List[ShotSuggestion]) -> float:
        """Calculate overall composition score."""
        if not suggested_shots:
            return 0.0
        
        total_score = sum(s.confidence_score for s in suggested_shots)
        return total_score / len(suggested_shots)
    
    async def _generate_composition_guidelines(self, scene_context: SceneContext) -> List[str]:
        """Generate composition guidelines based on scene context."""
        guidelines = []
        
        if scene_context.emotional_tone == "dramatic":
            guidelines.append("Use strong contrasts and dynamic angles")
        elif scene_context.emotional_tone == "peaceful":
            guidelines.append("Use balanced compositions and soft lighting")
        
        if scene_context.action_intensity >= 7:
            guidelines.append("Use dynamic camera movements and tight framing")
        
        if scene_context.dialogue_importance >= 7:
            guidelines.append("Focus on character faces and eye contact")
        
        return guidelines
    
    async def _generate_technical_recommendations(self, request: ShotCompositionRequest) -> List[str]:
        """Generate technical recommendations."""
        recommendations = []
        
        # Based on technical constraints
        constraints = request.technical_constraints
        if constraints.get('low_light', False):
            recommendations.append("Use wider aperture and higher ISO")
        
        if constraints.get('limited_space', False):
            recommendations.append("Use longer focal length to compress space")
        
        # Based on artistic preferences
        preferences = request.artistic_preferences
        if preferences.get('cinematic', False):
            recommendations.append("Use anamorphic lenses for cinematic look")
        
        return recommendations
    
    async def _generate_artistic_notes(self, request: ShotCompositionRequest, 
                                     suggested_shots: List[ShotSuggestion]) -> List[str]:
        """Generate artistic notes and observations."""
        notes = []
        
        # Analyze suggested shots for artistic coherence
        shot_types = [s.shot_type for s in suggested_shots]
        if len(set(shot_types)) == 1:
            notes.append("Consider varying shot types for visual interest")
        
        # Check composition rule diversity
        rules = [s.composition_rule for s in suggested_shots]
        if len(set(rules)) == 1:
            notes.append("Mix composition rules for dynamic variety")
        
        return notes
    
    def get_composition_by_id(self, composition_id: str) -> Optional[ShotCompositionResult]:
        """Get composition result by ID from cache."""
        return self.composition_cache.get(composition_id)
    
    def get_composition_statistics(self) -> Dict[str, Any]:
        """Get composition statistics."""
        return {
            'total_compositions': len(self.composition_history),
            'cached_compositions': len(self.composition_cache),
            'average_score': self._get_average_score(),
            'most_used_rules': self._get_most_used_rules()
        }
    
    def _get_average_score(self) -> float:
        """Get average composition score."""
        if not self.composition_cache:
            return 0.0
        
        total_score = sum(result.overall_score for result in self.composition_cache.values())
        return total_score / len(self.composition_cache)
    
    def _get_most_used_rules(self) -> List[str]:
        """Get most commonly used composition rules."""
        rule_counts = {}
        for result in self.composition_cache.values():
            for shot in result.suggested_shots:
                rule = shot.composition_rule.value
                rule_counts[rule] = rule_counts.get(rule, 0) + 1
        
        return sorted(rule_counts.keys(), key=lambda x: rule_counts[x], reverse=True)[:3]
    
    async def export_composition(self, composition_id: str, format: str = "json") -> Optional[Dict[str, Any]]:
        """Export composition result in specified format."""
        composition = self.get_composition_by_id(composition_id)
        if not composition:
            return None
        
        if format == "json":
            return composition.to_dict()
        else:
            self.logger.error(f"Unsupported export format: {format}")
            return None
    
    async def shutdown(self):
        """Shutdown shot composition engine and cleanup resources."""
        self.logger.info("Shutting down AI Shot Composition Engine...")
        
        # Clear cache and history
        self.composition_cache.clear()
        self.composition_history.clear()
        
        self.is_initialized = False
        self.logger.info("AI Shot Composition Engine shutdown complete")


# Factory function for easy initialization
def create_ai_shot_composition_engine(ai_config: AIConfig) -> AIShotCompositionEngine:
    """
    Create and configure AI Shot Composition Engine.
    
    Args:
        ai_config: AI configuration from main engine
        
    Returns:
        Configured AI Shot Composition Engine
    """
    return AIShotCompositionEngine(ai_config)