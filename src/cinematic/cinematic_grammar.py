"""
Cinematic Grammar Engine

Implements cinematic language including shot type recommendations,
camera movements, scene transitions, and emotional pacing.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from .cinematic_types import (
    ShotClass, CameraMovement, TransitionType, PacingType, RhythmPattern, SceneContext,
    ShotRecommendation, CameraMoveTemplate, TransitionRecommendation, PacingRecommendation,
    CinematicPlan, EmotionalBeat, SceneRhythmAnalysis,
    MOOD_VISUAL_MAP, CONTEXT_KEYWORDS
)


class CinematicGrammarEngine:
    """
    Cinematic Grammar Engine
    
    Provides cinematic language recommendations including:
    - Shot type selection based on scene context
    - Camera movement suggestions
    - Transition recommendations
    - Emotional pacing and rhythm
    """
    
    # Shot hierarchy for different scene contexts
    CONTEXT_SHOT_PREFERENCES = {
        SceneContext.ESTABLISHING: [
            (ShotClass.EXTREME_WIDE, 0.9),
            (ShotClass.WIDE, 0.7),
            (ShotClass.FULL, 0.3),
        ],
        SceneContext.ACTION: [
            (ShotClass.WIDE, 0.8),
            (ShotClass.FULL, 0.6),
            (ShotClass.MEDIUM, 0.4),
            (ShotClass.CLOSE_UP, 0.5),
        ],
        SceneContext.DIALOGUE: [
            (ShotClass.MEDIUM, 0.7),
            (ShotClass.MEDIUM_CLOSE, 0.8),
            (ShotClass.CLOSE_UP, 0.6),
            (ShotClass.OVER_SHOULDER, 0.5),
        ],
        SceneContext.REFLECTION: [
            (ShotClass.CLOSE_UP, 0.8),
            (ShotClass.MEDIUM_CLOSE, 0.6),
            (ShotClass.EXTREME_CLOSE_UP, 0.5),
        ],
        SceneContext.TRANSITION: [
            (ShotClass.CUTAWAY, 0.7),
            (ShotClass.INSERT, 0.5),
            (ShotClass.WIDE, 0.4),
        ],
        SceneContext.MONTAGE: [
            (ShotClass.INSERT, 0.7),
            (ShotClass.EXTREME_CLOSE_UP, 0.6),
            (ShotClass.WIDE, 0.5),
        ],
        SceneContext.CLIMAX: [
            (ShotClass.WIDE, 0.7),
            (ShotClass.CLOSE_UP, 0.8),
            (ShotClass.EXTREME_WIDE, 0.5),
            (ShotClass.FULL, 0.6),
        ],
        SceneContext.RESOLUTION: [
            (ShotClass.MEDIUM, 0.7),
            (ShotClass.FULL, 0.6),
            (ShotClass.WIDE, 0.5),
        ],
    }
    
    # Camera movement preferences by context
    CONTEXT_CAMERA_MOVEMENTS = {
        SceneContext.ESTABLISHING: [CameraMovement.DOLLY_OUT, CameraMovement.CRANE_DOWN],
        SceneContext.ACTION: [CameraMovement.STEADICAM, CameraMovement.DOLLY_IN, CameraMovement.HANDHELD],
        SceneContext.DIALOGUE: [CameraMovement.STATIC, CameraMovement.TILT_DOWN, CameraMovement.PAN_LEFT],
        SceneContext.REFLECTION: [CameraMovement.STATIC, CameraMovement.DOLLY_IN, CameraMovement.TILT_UP],
        SceneContext.TRANSITION: [CameraMovement.ZOOM_IN, CameraMovement.WHIP_PAN],
        SceneContext.MONTAGE: [CameraMovement.ZOOM_IN, CameraMovement.ZOOM_OUT],
        SceneContext.CLIMAX: [CameraMovement.DOLLY_IN, CameraMovement.CRANE_UP, CameraMovement.HANDHELD],
        SceneContext.RESOLUTION: [CameraMovement.DOLLY_OUT, CameraMovement.STATIC],
    }
    
    # Transition preferences between contexts
    TRANSITION_MAP = {
        (SceneContext.ESTABLISHING, SceneContext.ACTION): TransitionType.CUT,
        (SceneContext.ACTION, SceneContext.DIALOGUE): TransitionType.L_CUT,
        (SceneContext.DIALOGUE, SceneContext.REFLECTION): TransitionType.DISSOLVE,
        (SceneContext.REFLECTION, SceneContext.ACTION): TransitionType.SMASH_CUT,
        (SceneContext.ACTION, SceneContext.CLIMAX): TransitionType.MATCH_CUT,
        (SceneContext.CLIMAX, SceneContext.RESOLUTION): TransitionType.FADE_TO_BLACK,
    }
    
    # Pacing by context
    CONTEXT_PACING = {
        SceneContext.ESTABLISHING: PacingType.MEDIUM,
        SceneContext.ACTION: PacingType.FAST,
        SceneContext.DIALOGUE: PacingType.MEDIUM,
        SceneContext.REFLECTION: PacingType.SLOW,
        SceneContext.TRANSITION: PacingType.MEDIUM_FAST,
        SceneContext.MONTAGE: PacingType.FAST,
        SceneContext.CLIMAX: PacingType.FRANTIC,
        SceneContext.RESOLUTION: PacingType.SLOW,
    }
    
    # Rhythm patterns by context
    CONTEXT_RHYTHM = {
        SceneContext.ESTABLISHING: RhythmPattern.LEGATO,
        SceneContext.ACTION: RhythmPattern.STACCATO,
        SceneContext.DIALOGUE: RhythmPattern.STEADY,
        SceneContext.REFLECTION: RhythmPattern.LEGATO,
        SceneContext.MONTAGE: RhythmPattern.STACCATO,
        SceneContext.CLIMAX: RhythmPattern.CRESCENDO,
        SceneContext.RESOLUTION: RhythmPattern.LEGATO,
    }
    
    def __init__(self):
        """Initialize the cinematic grammar engine."""
        pass
    
    def analyze_context(
        self,
        scene_content: str,
        scene_heading: str,
        mood_keywords: List[str] = None
    ) -> SceneContext:
        """
        Analyze scene to determine its context type.
        
        Args:
            scene_content: The scene's content text
            scene_heading: Scene heading (INT./EXT. etc.)
            mood_keywords: Optional mood keywords
            
        Returns:
            SceneContext classification
        """
        content_lower = (scene_content + " " + scene_heading).lower()
        
        context_scores = {ctx: 0.0 for ctx in SceneContext}
        
        # Score based on keywords
        for ctx, keywords in CONTEXT_KEYWORDS.items():
            for keyword in keywords:
                if keyword in content_lower:
                    context_scores[ctx] += 1.0
        
        # Context-specific adjustments
        if "INT." in scene_heading:
            context_scores[SceneContext.DIALOGUE] += 0.5
            context_scores[SceneContext.REFLECTION] += 0.3
        elif "EXT." in scene_heading:
            context_scores[SceneContext.ESTABLISHING] += 0.5
            context_scores[SceneContext.ACTION] += 0.3
        
        # Dialogue-heavy scenes
        dialogue_lines = content_lower.count(" says ") + content_lower.count(" speaks ")
        if dialogue_lines > 2:
            context_scores[SceneContext.DIALOGUE] += 1.0
        
        # Action detection
        action_words = ["fight", "chase", "run", "battle", "explosion"]
        action_count = sum(1 for w in action_words if w in content_lower)
        if action_count > 1:
            context_scores[SceneContext.ACTION] += action_count * 0.5
        
        # Return highest scoring context
        max_score = max(context_scores.values())
        if max_score == 0:
            return SceneContext.DIALOGUE  # Default
        
        for ctx, score in context_scores.items():
            if score == max_score:
                return ctx
        
        return SceneContext.DIALOGUE
    
    def recommend_shots(
        self,
        scene_context: SceneContext,
        num_characters: int,
        content: str,
        mood: str = "neutral"
    ) -> List[ShotRecommendation]:
        """
        Recommend shots for a scene based on context.
        
        Args:
            scene_context: Identified scene context
            num_characters: Number of characters in scene
            content: Scene content text
            mood: Emotional mood
            
        Returns:
            List of shot recommendations
        """
        recommendations = []
        preferences = self.CONTEXT_SHOT_PREFERENCES.get(scene_context, [])
        
        # Add contextual preferences
        for shot_class, base_score in preferences:
            mood_modifier = self._get_mood_modifier(shot_class, mood)
            confidence = min(1.0, base_score * mood_modifier)
            
            reason = self._generate_shot_reason(shot_class, scene_context, mood)
            movement = self._get_recommended_movement(scene_context, shot_class)
            
            notes = self._generate_shot_notes(shot_class, num_characters)
            
            recommendations.append(ShotRecommendation(
                shot_class=shot_class,
                confidence=confidence,
                reason=reason,
                camera_movement=movement,
                notes=notes
            ))
        
        # Add character-based recommendations
        if num_characters == 1:
            recommendations.append(ShotRecommendation(
                shot_class=ShotClass.MEDIUM_CLOSE,
                confidence=0.7,
                reason="Single character focus - intimate framing",
                notes=["Center the character"]
            ))
        elif num_characters == 2:
            recommendations.append(ShotRecommendation(
                shot_class=ShotClass.MEDIUM,
                confidence=0.8,
                reason="Two characters - standard dialogue framing",
                camera_movement=CameraMovement.STATIC,
                notes=["Frame both characters", "Consider OTS angles"]
            ))
        elif num_characters > 3:
            recommendations.append(ShotRecommendation(
                shot_class=ShotClass.FULL,
                confidence=0.7,
                reason="Multiple characters - group composition",
                notes=["Wide enough to include all", "Arrange by importance"]
            ))
        
        return recommendations
    
    def _get_mood_modifier(self, shot_class: ShotClass, mood: str) -> float:
        """Get confidence modifier based on mood."""
        if mood in MOOD_VISUAL_MAP:
            mood_shot = MOOD_VISUAL_MAP[mood]["shot_class"]
            if shot_class == mood_shot:
                return 1.3
            elif mood in ["tense", "mysterious"] and shot_class in [ShotClass.CLOSE_UP, ShotClass.EXTREME_CLOSE_UP]:
                return 1.2
            elif mood in ["happy"] and shot_class == ShotClass.FULL:
                return 1.2
        return 1.0
    
    def _generate_shot_reason(
        self,
        shot_class: ShotClass,
        context: SceneContext,
        mood: str
    ) -> str:
        """Generate a reason for the shot recommendation."""
        reasons = {
            ShotClass.EXTREME_WIDE: "Establish scope and scale of environment",
            ShotClass.WIDE: "Show character in environment context",
            ShotClass.FULL: "Full body presentation showing action",
            ShotClass.MEDIUM: "Standard dialogue and interaction framing",
            ShotClass.MEDIUM_CLOSE: "Focus on character emotion and delivery",
            ShotClass.CLOSE_UP: "Emphasize emotional reaction or detail",
            ShotClass.EXTREME_CLOSE_UP: "Highlight critical detail or moment",
            ShotClass.INSERT: "Show important object or action detail",
            ShotClass.CUTAWAY: "Provide visual variety and context",
        }
        return reasons.get(shot_class, f"Appropriate for {context.value} scene")
    
    def _get_recommended_movement(
        self,
        context: SceneContext,
        shot_class: ShotClass
    ) -> Optional[CameraMovement]:
        """Get recommended camera movement for context and shot."""
        movements = self.CONTEXT_CAMERA_MOVEMENTS.get(context, [CameraMovement.STATIC])
        
        # Adjust based on shot type
        if shot_class == ShotClass.EXTREME_WIDE:
            return CameraMovement.DOLLY_OUT
        elif shot_class == ShotClass.CLOSE_UP:
            return CameraMovement.STATIC
        elif shot_class == ShotClass.MEDIUM_CLOSE:
            return CameraMovement.TILT_DOWN
        
        return movements[0] if movements else CameraMovement.STATIC
    
    def _generate_shot_notes(
        self,
        shot_class: ShotClass,
        num_characters: int
    ) -> List[str]:
        """Generate technical notes for shot."""
        notes = []
        
        if shot_class == ShotClass.EXTREME_WIDE:
            notes.append("Use wide angle lens (14-24mm)")
            notes.append("Establish spatial relationships")
        elif shot_class == ShotClass.WIDE:
            notes.append("Standard wide shot setup")
        elif shot_class == ShotClass.MEDIUM:
            notes.append("50-85mm lens range")
            notes.append("Framing from waist up")
        elif shot_class == ShotClass.CLOSE_UP:
            notes.append("85-135mm lens")
            notes.append("Fill frame with face")
        elif shot_class == ShotClass.EXTREME_CLOSE_UP:
            notes.append("Macro or long telephoto (200mm+)")
            notes.append("Critical focus on detail")
        
        return notes
    
    def recommend_transition(
        self,
        current_context: SceneContext,
        next_context: SceneContext,
        content_connection: str = "linear"
    ) -> TransitionRecommendation:
        """
        Recommend transition between scenes.
        
        Args:
            current_context: Current scene context
            next_context: Next scene context
            content_connection: How scenes connect ("linear", "temporal", "contrast")
            
        Returns:
            Transition recommendation
        """
        # Check for specific mapping
        transition_key = (current_context, next_context)
        if transition_key in self.TRANSITION_MAP:
            trans_type = self.TRANSITION_MAP[transition_key]
        else:
            # Default transitions based on connection type
            if content_connection == "temporal":
                trans_type = TransitionType.DISSOLVE
            elif content_connection == "contrast":
                trans_type = TransitionType.SMASH_CUT
            else:
                trans_type = TransitionType.CUT
        
        # Duration based on transition type
        duration_map = {
            TransitionType.CUT: 0.0,
            TransitionType.DISSOLVE: 1.5,
            TransitionType.FADE_TO_BLACK: 2.0,
            TransitionType.FADE_TO_WHITE: 2.0,
            TransitionType.MATCH_CUT: 0.0,
            TransitionType.SMASH_CUT: 0.0,
            TransitionType.WIPE: 0.5,
            TransitionType.CROSS_DISSOLVE: 1.5,
        }
        duration = duration_map.get(trans_type, 1.0)
        
        # Reason
        reason_map = {
            TransitionType.CUT: "Standard cut for immediate scene change",
            TransitionType.DISSOLVE: "Time passage or memory transition",
            TransitionType.FADE_TO_BLACK: "Scene ending or significant time jump",
            TransitionType.MATCH_CUT: "Visual or thematic connection between scenes",
            TransitionType.SMASH_CUT: "Abrupt contrast between scenes",
            TransitionType.WIPE: "Directional scene progression",
        }
        reason = reason_map.get(trans_type, "Appropriate for scene transition")
        
        return TransitionRecommendation(
            transition_type=trans_type,
            duration_seconds=duration,
            reason=reason,
            next_scene_context=next_context
        )
    
    def recommend_pacing(
        self,
        scene_context: SceneContext,
        mood: str = "neutral",
        duration_estimate: float = 60.0
    ) -> PacingRecommendation:
        """
        Recommend pacing for a scene.
        
        Args:
            scene_context: Scene context type
            mood: Emotional mood
            duration_estimate: Estimated scene duration in seconds
            
        Returns:
            Pacing recommendation
        """
        pacing_type = self.CONTEXT_PACING.get(scene_context, PacingType.MEDIUM)
        rhythm = self.CONTEXT_RHYTHM.get(scene_context, RhythmPattern.STEADY)
        
        # Calculate shot duration range based on pacing
        pacing_ranges = {
            PacingType.SLOW: (5.0, 10.0),
            PacingType.MEDIUM_SLOW: (4.0, 8.0),
            PacingType.MEDIUM: (3.0, 6.0),
            PacingType.MEDIUM_FAST: (2.0, 4.0),
            PacingType.FAST: (1.5, 3.0),
            PacingType.FRANTIC: (1.0, 2.0),
        }
        shot_duration_range = pacing_ranges.get(pacing_type, (3.0, 6.0))
        
        # Calculate movement intensity
        intensity_map = {
            SceneContext.ACTION: 0.9,
            SceneContext.CLIMAX: 0.95,
            SceneContext.MONTAGE: 0.8,
            SceneContext.DIALOGUE: 0.3,
            SceneContext.REFLECTION: 0.2,
            SceneContext.ESTABLISHING: 0.4,
            SceneContext.RESOLUTION: 0.3,
        }
        movement_intensity = intensity_map.get(scene_context, 0.5)
        
        # Generate notes
        notes = self._generate_pacing_notes(pacing_type, rhythm, mood)
        
        return PacingRecommendation(
            pacing=pacing_type,
            rhythm=rhythm,
            shot_duration_range=shot_duration_range,
            movement_intensity=movement_intensity,
            notes=notes
        )
    
    def _generate_pacing_notes(
        self,
        pacing: PacingType,
        rhythm: RhythmPattern,
        mood: str
    ) -> List[str]:
        """Generate pacing notes."""
        notes = []
        
        if pacing == PacingType.FRANTIC:
            notes.append("Rapid cuts - 1-2 seconds per shot")
            notes.append("Camera movement should be dynamic")
        elif pacing == PacingType.FAST:
            notes.append("Quick pacing - maintain energy")
            notes.append("Steady camera work")
        elif pacing == PacingType.SLOW:
            notes.append("Extended shots - allow contemplation")
            notes.append("Static or slow camera movement")
        
        if rhythm == RhythmPattern.CRESCENDO:
            notes.append("Build intensity toward climax")
            notes.append("Gradually decrease shot duration")
        elif rhythm == RhythmPattern.STACCATO:
            notes.append("Choppy, dynamic rhythm")
            notes.append("Varied shot lengths")
        elif rhythm == RhythmPattern.LEGATO:
            notes.append("Smooth, flowing rhythm")
            notes.append("Consistent shot duration")
        
        return notes
    
    def create_cinematic_plan(
        self,
        scene_content: str,
        scene_heading: str,
        num_characters: int,
        mood_keywords: List[str] = None,
        duration_estimate: float = 60.0
    ) -> CinematicPlan:
        """
        Create complete cinematic plan for a scene.
        
        Args:
            scene_content: Scene text content
            scene_heading: Scene heading
            num_characters: Number of characters
            mood_keywords: Mood keywords
            duration_estimate: Estimated duration
            
        Returns:
            Complete CinematicPlan
        """
        mood = mood_keywords[0] if mood_keywords else "neutral"
        
        # Analyze context
        context = self.analyze_context(scene_content, scene_heading, mood_keywords)
        
        # Get recommendations
        shot_recs = self.recommend_shots(context, num_characters, scene_content, mood)
        pacing_rec = self.recommend_pacing(context, mood, duration_estimate)
        
        # Create emotional arc
        emotional_arc = self._create_emotional_arc(mood, context)
        
        # Calculate tension
        tension = self._calculate_tension(context, mood)
        
        # Generate technical notes
        tech_notes = self._generate_technical_notes(context, shot_recs)
        
        # Generate suggestions
        suggestions = self._generate_suggestions(context, mood, shot_recs)
        
        return CinematicPlan(
            scene_context=context,
            shot_sequence=shot_recs,
            transitions=[],
            pacing=pacing_rec,
            emotional_arc=emotional_arc,
            tension_level=tension,
            technical_notes=tech_notes,
            suggestions=suggestions
        )
    
    def _create_emotional_arc(self, mood: str, context: SceneContext) -> List[str]:
        """Create emotional arc description."""
        arc_templates = {
            "tense": ["Tension builds", "Critical moment", "Release or escalation"],
            "romantic": ["Initial connection", "Growing intimacy", "Emotional peak"],
            "action": ["Set tension", "Action escalation", "Climactic confrontation"],
            "mysterious": ["Reveal introduction", "Puzzle deepens", "Partial revelation"],
            "happy": ["Positive setup", "Joyful moment", "Celebration"],
            "sad": ["Loss or longing", "Emotional depth", "Resolution or acceptance"],
            "neutral": ["Scene setup", "Key development", "Clear outcome"],
        }
        
        return arc_templates.get(mood, ["Setup", "Development", "Resolution"])
    
    def _calculate_tension(self, context: SceneContext, mood: str) -> float:
        """Calculate tension level (0-1)."""
        base_tension = {
            SceneContext.ACTION: 0.9,
            SceneContext.CLIMAX: 0.95,
            SceneContext.DIALOGUE: 0.4,
            SceneContext.REFLECTION: 0.2,
            SceneContext.ESTABLISHING: 0.3,
            SceneContext.MONTAGE: 0.5,
            SceneContext.RESOLUTION: 0.3,
        }
        
        tension = base_tension.get(context, 0.5)
        
        # Mood modifier
        mood_tension = {"tense": 1.2, "action": 1.1, "romantic": 0.8, "happy": 0.7}
        tension *= mood_tension.get(mood, 1.0)
        
        return min(1.0, tension)
    
    def _generate_technical_notes(
        self,
        context: SceneContext,
        shot_recs: List[ShotRecommendation]
    ) -> List[str]:
        """Generate technical notes for the scene."""
        notes = []
        
        # Lens recommendations
        if context == SceneContext.ESTABLISHING:
            notes.append("Wide angle lens (14-24mm) for establishing shots")
        elif context == SceneContext.REFLECTION:
            notes.append("85mm+ for compressed, intimate feel")
        
        # Movement notes
        movements = self.CONTEXT_CAMERA_MOVEMENTS.get(context, [])
        if movements:
            notes.append(f"Recommended movements: {', '.join(m.value for m in movements[:2])}")
        
        return notes
    
    def _generate_suggestions(
        self,
        context: SceneContext,
        mood: str,
        shot_recs: List[ShotRecommendation]
    ) -> List[str]:
        """Generate creative suggestions."""
        suggestions = []
        
        # Context-specific suggestions
        if context == SceneContext.ACTION:
            suggestions.append("Consider coverage shots from multiple angles")
            suggestions.append("Use handheld for visceral impact")
        elif context == SceneContext.DIALOGUE:
            suggestions.append("Use the 180-degree rule consistently")
            suggestions.append("Consider POV inserts for variety")
        elif context == SceneContext.REFLECTION:
            suggestions.append("Use negative space effectively")
            suggestions.append("Consider longer takes for reflection")
        
        return suggestions
    
    def analyze_rhythm(
        self,
        shot_sequence: List[Dict],
        total_duration: float
    ) -> SceneRhythmAnalysis:
        """
        Analyze the rhythm of a shot sequence.
        
        Args:
            shot_sequence: List of shot dictionaries
            total_duration: Total sequence duration in seconds
            
        Returns:
            SceneRhythmAnalysis
        """
        shot_count = len(shot_sequence)
        avg_duration = total_duration / shot_count if shot_count > 0 else 0
        
        # Determine pacing from average duration
        if avg_duration < 1.5:
            pacing = PacingType.FRANTIC
        elif avg_duration < 2.5:
            pacing = PacingType.FAST
        elif avg_duration < 4.0:
            pacing = PacingType.MEDIUM_FAST
        elif avg_duration < 6.0:
            pacing = PacingType.MEDIUM
        elif avg_duration < 8.0:
            pacing = PacingType.MEDIUM_SLOW
        else:
            pacing = PacingType.SLOW
        
        # Count shot types
        shot_dist = {}
        for shot in shot_sequence:
            shot_class = shot.get("shot_class", "medium")
            shot_dist[shot_class] = shot_dist.get(shot_class, 0) + 1
        
        # Simple rhythm pattern detection
        if shot_count > 3:
            rhythm = RhythmPattern.VARIED
        else:
            rhythm = RhythmPattern.STEADY
        
        return SceneRhythmAnalysis(
            total_duration_seconds=total_duration,
            pacing_type=pacing,
            rhythm_pattern=rhythm,
            beat_count=shot_count,
            intensity_peaks=[],  # Would need more complex analysis
            intensity_valleys=[],
            shot_distribution=shot_dist,
            avg_shot_duration=avg_duration,
            pacing_suggestions=["Consider varied shot lengths for dynamic rhythm"],
            shot_selection_notes=["Review shot distribution for variety"]
        )


def analyze_cinematic_context(
    scene_content: str,
    scene_heading: str,
    mood_keywords: List[str] = None
) -> SceneContext:
    """Convenience function to analyze scene context."""
    engine = CinematicGrammarEngine()
    return engine.analyze_context(scene_content, scene_heading, mood_keywords)


def create_cinematic_plan(
    scene_content: str,
    scene_heading: str,
    num_characters: int,
    mood_keywords: List[str] = None,
    duration_estimate: float = 60.0
) -> CinematicPlan:
    """Convenience function to create cinematic plan."""
    engine = CinematicGrammarEngine()
    return engine.create_cinematic_plan(
        scene_content=scene_content,
        scene_heading=scene_heading,
        num_characters=num_characters,
        mood_keywords=mood_keywords,
        duration_estimate=duration_estimate
    )

