"""
Dynamic Shot Suggestions Engine

Provides context-aware shot suggestions with emotional tone mapping
for dynamic cinematography decisions.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from .dynamic_types import (
    EmotionalTone, NarrativeBeat, ShotVariation,
    ShotSuggestion, ShotSequence, NarrativeContext, DynamicSuggestions, ContextIndicators,
    TONE_SHOT_MAP, BEAT_SHOT_MAP
)


class DynamicShotEngine:
    """
    Dynamic Shot Suggestions Engine
    
    Analyzes script content and context to provide:
    - Emotional tone detection
    - Context-aware shot suggestions
    - Shot sequence generation
    - Narrative beat mapping
    """
    
    # Keyword mappings for tone detection
    TONE_KEYWORDS = {
        EmotionalTone.TENSE: [
            "tense", "nervous", "anxious", "suspense", "fear", "worry",
            "wait", "silence", "quiet", "creep", "danger", "threat",
            "heartbeat", "breath", "whisper", "shadows"
        ],
        EmotionalTone.ROMANTIC: [
            "love", "kiss", "embrace", "tender", "affection", "romance",
            "heart", "together", "hold", "care", "beautiful", "moonlight"
        ],
        EmotionalTone.ACTION: [
            "fight", "chase", "run", "explosion", "fast", "quick",
            "battle", "attack", "dash", "sprint", "punch", "kick", "jump"
        ],
        EmotionalTone.MYSTERIOUS: [
            "shadow", "dark", "hidden", "secret", "mystery", "unknown",
            "whisper", "strange", "unusual", "curious", "discover", "reveal"
        ],
        EmotionalTone.HAPPY: [
            "laugh", "smile", "celebrate", "joy", "happy", "excited",
            "wonderful", "great", "amazing", "fun", "play", "cheer"
        ],
        EmotionalTone.SAD: [
            "cry", "tears", "grief", "loss", "sad", "alone", "goodbye",
            "death", "farewell", "miss", "remember", "memories", "pain"
        ],
        EmotionalTone.HORROR: [
            "blood", "scream", "terror", "horror", "monster", "death",
            "kill", "murder", "fear", "terrify", "nightmare", "demon"
        ],
        EmotionalTone.COMEDIC: [
            "funny", "joke", "laugh", "humor", "comedy", "ridiculous",
            "silly", "absurd", "mistake", "confusion", "mix-up"
        ],
        EmotionalTone.NOSTALGIC: [
            "remember", "memory", "past", "childhood", "old", "memory",
            "once", "before", "years ago", "long ago", " flashback"
        ],
        EmotionalTone.DRAMATIC: [
            "finally", "must", "never", "always", "truth", "realize",
            "understand", "reveal", "confront", "choice", "decision"
        ],
    }
    
    # Action keywords for context detection
    ACTION_KEYWORDS = [
        "walks", "runs", "stands", "sits", "looks", "sees", "hears",
        "enters", "exits", "moves", "gestures", "reacts", "notices"
    ]
    
    # Dialogue markers
    DIALOGUE_MARKERS = [
        "says", "says:", "says", "asks", "answers", "replies",
        "shouts", "whispers", "murmurs", "exclaims"
    ]
    
    def __init__(self):
        """Initialize the dynamic shot engine."""
        pass
    
    def analyze_context(self, scene_content: str, scene_heading: str) -> ContextIndicators:
        """
        Analyze scene content to extract context indicators.
        
        Args:
            scene_content: The scene's content text
            scene_heading: Scene heading (INT./EXT. etc.)
            
        Returns:
            ContextIndicators with detected elements
        """
        content = (scene_content + " " + scene_heading).lower()
        indicators = ContextIndicators()
        
        # Extract action words
        for keyword in self.ACTION_KEYWORDS:
            if keyword in content:
                indicators.action_words.append(keyword)
        
        # Extract emotional words for each tone
        for tone, keywords in self.TONE_KEYWORDS.items():
            matched = [k for k in keywords if k in content]
            if matched:
                indicators.emotional_words.extend(matched)
        
        # Extract dialogue markers
        for marker in self.DIALOGUE_MARKERS:
            if marker in content:
                indicators.dialogue_markers.append(marker)
        
        # Location indicators
        location_words = ["forest", "city", "office", "house", "beach", "mountain", 
                        "room", "street", "kitchen", "bedroom", "outdoors"]
        for loc in location_words:
            if loc in content:
                indicators.location_indicators.append(loc)
        
        # Time indicators
        time_words = ["night", "day", "morning", "evening", "sunset", "sunrise", "dark"]
        for time in time_words:
            if time in content:
                indicators.time_indicators.append(time)
        
        return indicators
    
    def detect_emotional_tones(
        self,
        scene_content: str,
        scene_heading: str,
        indicators: Optional[ContextIndicators] = None
    ) -> Tuple[EmotionalTone, List[EmotionalTone], Dict[str, float]]:
        """
        Detect emotional tones from scene content.
        
        Args:
            scene_content: Scene text content
            scene_heading: Scene heading
            indicators: Optional pre-analyzed context indicators
            
        Returns:
            Tuple of (primary_tone, secondary_tones, confidence_scores)
        """
        if indicators is None:
            indicators = self.analyze_context(scene_content, scene_heading)
        
        content = (scene_content + " " + scene_heading).lower()
        
        # Score each tone based on keyword matches
        tone_scores = {}
        for tone, keywords in self.TONE_KEYWORDS.items():
            score = 0.0
            for keyword in keywords:
                if keyword in content:
                    # Weight exact phrase matches higher
                    if " " + keyword + " " in content:
                        score += 2.0
                    else:
                        score += 1.0
            tone_scores[tone] = score
        
        # Normalize scores
        max_score = max(tone_scores.values()) if max(tone_scores.values()) > 0 else 1
        normalized_scores = {tone: score / max_score for tone, score in tone_scores.items()}
        
        # Sort by score
        sorted_tones = sorted(normalized_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Get primary and secondary tones
        primary = sorted_tones[0][0] if sorted_tones[0][1] > 0 else EmotionalTone.DRAMATIC
        secondary = [t for t, s in sorted_tones[1:4] if s > 0.2]
        
        return primary, secondary, normalized_scores
    
    def detect_narrative_beat(
        self,
        scene_content: str,
        scene_heading: str,
        is_first_scene: bool = False,
        is_last_scene: bool = False
    ) -> NarrativeContext:
        """
        Detect narrative beat based on scene content.
        
        Args:
            scene_content: Scene text content
            scene_heading: Scene heading
            is_first_scene: Whether this is the first scene
            is_last_scene: Whether this is the last scene
            
        Returns:
            NarrativeContext with beat information
        """
        content = scene_content.lower()
        
        # Check for specific beat indicators
        beat_indicators = {
            NarrativeBeat.SETUP: ["establishes", "introduces", "meets", "arrives", "begins"],
            NarrativeBeat.INCITING_INCIDENT: ["suddenly", "unexpected", "discovers", "learns", "receives"],
            NarrativeBeat.RISING_ACTION: ["but", "however", "meanwhile", "continues", "attempts"],
            NarrativeBeat.MIDPOINT: ["meanwhile", "at the same time", "turning point", "realizes"],
            NarrativeBeat.CLIMAX: ["finally", "confronts", "faces", "must", "decides"],
            NarrativeBeat.FALLING_ACTION: ["after", "consequently", "result", "escapes", "survives"],
            NarrativeBeat.RESOLUTION: ["eventually", "finally", "lives", "ends", "concludes"],
        }
        
        beat_scores = {beat: 0 for beat in NarrativeBeat}
        
        for beat, keywords in beat_indicators.items():
            for keyword in keywords:
                if keyword in content:
                    beat_scores[beat] += 1
        
        # Context adjustments
        if is_first_scene:
            beat_scores[NarrativeBeat.SETUP] += 3
            beat_scores[NarrativeBeat.INCITING_INCIDENT] += 2
        
        if is_last_scene:
            beat_scores[NarrativeBeat.RESOLUTION] += 3
            beat_scores[NarrativeBeat.CLIMAX] += 2
        
        # Detect intensity from action content
        action_words = sum(1 for w in ["fight", "chase", "explosion", "battle"] if w in content)
        intensity = min(1.0, 0.3 + action_words * 0.15)
        
        # Determine best matching beat
        best_beat = max(beat_scores.items(), key=lambda x: x[1])[0]
        
        # Generate beat description
        beat_descriptions = {
            NarrativeBeat.SETUP: "Introduce characters and setting",
            NarrativeBeat.INCITING_INCIDENT: "Introduce the central conflict or goal",
            NarrativeBeat.RISING_ACTION: "Build tension and develop story",
            NarrativeBeat.MIDPOINT: "Major revelation or turning point",
            NarrativeBeat.CLIMAX: "Peak confrontation or decision",
            NarrativeBeat.FALLING_ACTION: "Show consequences of climax",
            NarrativeBeat.RESOLUTION: "Conclude the story threads",
        }
        
        return NarrativeContext(
            beat_type=best_beat,
            beat_description=beat_descriptions.get(best_beat, "Standard scene"),
            intensity=intensity
        )
    
    def generate_shot_suggestion(
        self,
        tone: EmotionalTone,
        shot_class: str,
        position: str = "general",  # "opening", "closing", "key_moment"
        context: Optional[NarrativeContext] = None
    ) -> ShotSuggestion:
        """
        Generate a shot suggestion for a given tone and shot class.
        
        Args:
            tone: Emotional tone
            shot_class: Desired shot class
            position: Position in scene (opening, closing, key_moment)
            context: Optional narrative context
            
        Returns:
            ShotSuggestion with full details
        """
        tone_config = TONE_SHOT_MAP.get(tone, TONE_SHOT_MAP[EmotionalTone.DRAMATIC])
        
        # Select variation based on position and tone
        variations = tone_config.get("variations", [])
        if position == "opening":
            variation = variations[0] if variations else None
        elif position == "closing":
            variation = variations[-1] if len(variations) > 1 else variations[0] if variations else None
        else:
            variation = variations[0] if variations else None
        
        # Get camera movement
        movements = tone_config.get("camera_movements", ["static"])
        camera_movement = movements[0]
        
        # Get duration range
        duration_range = tone_config.get("duration_range", (3.0, 5.0))
        duration = sum(duration_range) / 2
        
        # Generate reason
        tone_reasons = {
            EmotionalTone.TENSE: "Close framing creates claustrophobic tension",
            EmotionalTone.ROMANTIC: "Soft framing emphasizes intimacy and emotion",
            EmotionalTone.ACTION: "Wide framing captures movement and scope",
            EmotionalTone.MYSTERIOUS: "Restricted framing adds mystery and uncertainty",
            EmotionalTone.HAPPY: "Open framing conveys freedom and joy",
            EmotionalTone.SAD: "Close framing emphasizes emotional depth",
            EmotionalTone.HORROR: "Extreme close-ups maximize fear and discomfort",
            EmotionalTone.COMEDIC: "Unusual angles enhance comedic effect",
        }
        reason = tone_reasons.get(tone, f"Appropriate for {tone.value} tone")
        
        # Generate notes
        notes = self._generate_shot_notes(tone, shot_class, position)
        
        # Generate alternatives
        alternatives = [v for v in variations if v != variation][:2]
        
        return ShotSuggestion(
            shot_class=shot_class,
            emotional_tone=tone,
            confidence=0.85,
            reason=reason,
            variation=variation,
            camera_movement=camera_movement,
            duration_estimate=duration,
            notes=notes,
            alternatives=alternatives
        )
    
    def _generate_shot_notes(
        self,
        tone: EmotionalTone,
        shot_class: str,
        position: str
    ) -> List[str]:
        """Generate technical notes for the shot."""
        notes = []
        
        # Position-specific notes
        if position == "opening":
            notes.append("Consider establishing shot with environment")
            notes.append("Set the visual tone for the scene")
        elif position == "closing":
            notes.append("Leave audience with lasting impression")
            notes.append("Consider character state at scene end")
        else:
            notes.append("Match energy of the moment")
        
        # Tone-specific notes
        tone_notes = {
            EmotionalTone.TENSE: ["Use tight framing", "Minimize headroom", "Consider off-center composition"],
            EmotionalTone.ROMANTIC: ["Soft focus possible", "Consider lens flare", "Warm color grading"],
            EmotionalTone.ACTION: ["Use motion blur", "Follow camera movement", "Wide dynamic range"],
            EmotionalTone.MYSTERIOUS: ["Deep shadows", "Low key lighting", "Limited visibility"],
        }
        notes.extend(tone_notes.get(tone, []))
        
        return notes
    
    def generate_shot_sequence(
        self,
        scene_content: str,
        scene_heading: str,
        num_characters: int,
        duration_estimate: float = 60.0,
        previous_shot: Optional[str] = None
    ) -> ShotSequence:
        """
        Generate a complete shot sequence for a scene.
        
        Args:
            scene_content: Scene text content
            scene_heading: Scene heading
            num_characters: Number of characters
            duration_estimate: Estimated scene duration
            previous_shot: Previous scene's closing shot
            
        Returns:
            ShotSequence with complete shot list
        """
        # Analyze context
        indicators = self.analyze_context(scene_content, scene_heading)
        primary_tone, secondary_tones, tone_scores = self.detect_emotional_tones(
            scene_content, scene_heading, indicators
        )
        narrative_context = self.detect_narrative_beat(scene_content, scene_heading)
        
        # Determine number of shots based on duration and action
        action_density = len(indicators.action_words) / max(len(scene_content.split()), 1)
        num_shots = max(3, min(8, int(duration_estimate / 8) + action_density * 5))
        
        # Generate shots
        shots = []
        
        # Opening shot
        opening_shot_class = self._select_shot_class(num_characters, "opening", indicators)
        opening = self.generate_shot_suggestion(
            primary_tone, opening_shot_class, "opening", narrative_context
        )
        shots.append(opening)
        
        # Middle shots
        for i in range(num_shots - 2):
            position = "key_moment"
            shot_class = self._select_shot_class(num_characters, "middle", indicators)
            
            # Vary tone for middle shots
            if i % 2 == 0 and secondary_tones:
                tone = secondary_tones[i % len(secondary_tones)]
            else:
                tone = primary_tone
            
            shot = self.generate_shot_suggestion(
                tone, shot_class, position, narrative_context
            )
            shots.append(shot)
        
        # Closing shot
        closing_shot_class = self._select_shot_class(num_characters, "closing", indicators)
        closing = self.generate_shot_suggestion(
            primary_tone, closing_shot_class, "closing", narrative_context
        )
        shots.append(closing)
        
        # Calculate scores
        total_duration = sum(s.duration_estimate for s in shots)
        rhythm_score = self._calculate_rhythm_score(shots)
        variety_score = self._calculate_variety_score(shots)
        
        # Generate transitions
        transitions = self._generate_transitions(shots)
        
        return ShotSequence(
            sequence_id=f"seq_{hash(scene_heading) % 10000}",
            scene_id=scene_heading,
            shots=shots,
            total_duration=total_duration,
            rhythm_score=rhythm_score,
            variety_score=variety_score,
            transitions=transitions
        )
    
    def _select_shot_class(
        self,
        num_characters: int,
        position: str,
        indicators: ContextIndicators
    ) -> str:
        """Select appropriate shot class based on context."""
        # Base shot on position
        if position == "opening":
            return "wide"
        elif position == "closing":
            return "medium"
        
        # Adjust based on character count
        if num_characters == 1:
            return "medium_close"
        elif num_characters == 2:
            return "medium"
        elif num_characters > 3:
            return "full"
        
        # Adjust based on dialogue markers
        if len(indicators.dialogue_markers) > 2:
            return "medium_close"
        
        return "medium"
    
    def _calculate_rhythm_score(self, shots: List[ShotSuggestion]) -> float:
        """Calculate rhythm score based on shot duration variation."""
        if len(shots) < 2:
            return 1.0
        
        durations = [s.duration_estimate for s in shots]
        avg_duration = sum(durations) / len(durations)
        
        # Score based on appropriate variation
        variation = sum(abs(d - avg_duration) for d in durations) / len(durations)
        normalized_variation = min(1.0, variation / 2.0)
        
        return 0.5 + normalized_variation * 0.5
    
    def _calculate_variety_score(self, shots: List[ShotSuggestion]) -> float:
        """Calculate variety score based on shot and variation diversity."""
        if len(shots) < 2:
            return 1.0
        
        shot_types = set(s.shot_class for s in shots)
        variations = set(v for s in shots if s.variation for v in [s.variation])
        movements = set(s.camera_movement for s in shots)
        
        diversity = (
            len(shot_types) / len(shots) * 0.4 +
            len(variations) / max(len(shots), 1) * 0.3 +
            len(movements) / len(shots) * 0.3
        )
        
        return diversity
    
    def _generate_transitions(self, shots: List[ShotSuggestion]) -> List[str]:
        """Generate transition suggestions between shots."""
        transitions = []
        
        for i in range(len(shots) - 1):
            current = shots[i]
            next_shot = shots[i + 1]
            
            # Determine transition type based on tone change
            if current.emotional_tone != next_shot.emotional_tone:
                transitions.append("cross_dissolve")
            elif current.duration_estimate < 2.0 and next_shot.duration_estimate > 3.0:
                transitions.append("match_cut")
            else:
                transitions.append("cut")
        
        return transitions
    
    def get_dynamic_suggestions(
        self,
        scene_content: str,
        scene_heading: str,
        num_characters: int,
        duration_estimate: float = 60.0,
        previous_shot: Optional[str] = None,
        is_first_scene: bool = False,
        is_last_scene: bool = False
    ) -> DynamicSuggestions:
        """
        Get complete dynamic suggestions for a scene.
        
        Args:
            scene_content: Scene text content
            scene_heading: Scene heading
            num_characters: Number of characters
            duration_estimate: Estimated duration
            previous_shot: Previous scene's closing shot
            is_first_scene: Whether this is the first scene
            is_last_scene: Whether this is the last scene
            
        Returns:
            Complete DynamicSuggestions object
        """
        # Analyze context
        indicators = self.analyze_context(scene_content, scene_heading)
        primary_tone, secondary_tones, tone_scores = self.detect_emotional_tones(
            scene_content, scene_heading, indicators
        )
        narrative_context = self.detect_narrative_beat(
            scene_content, scene_heading, is_first_scene, is_last_scene
        )
        
        # Generate sequence
        sequence = self.generate_shot_sequence(
            scene_content, scene_heading, num_characters, duration_estimate, previous_shot
        )
        
        # Generate opening and closing shots
        opening_shot = self.generate_shot_suggestion(
            primary_tone, "wide", "opening", narrative_context
        )
        closing_shot = self.generate_shot_suggestion(
            primary_tone, "medium_close", "closing", narrative_context
        )
        
        # Key moments
        key_moments = [s for s in sequence.shots if s.position == "key_moment"]
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            primary_tone, sequence, narrative_context
        )
        
        return DynamicSuggestions(
            scene_id=scene_heading,
            primary_tone=primary_tone,
            secondary_tones=secondary_tones,
            narrative_context=narrative_context,
            opening_shot=opening_shot,
            closing_shot=closing_shot,
            key_moments=key_moments,
            suggested_sequence=sequence,
            tone_confidence=tone_scores.get(primary_tone, 0.0),
            variety_notes=self._generate_variety_notes(sequence),
            recommendations=recommendations
        )
    
    def _generate_recommendations(
        self,
        tone: EmotionalTone,
        sequence: ShotSequence,
        context: NarrativeContext
    ) -> List[str]:
        """Generate overall recommendations."""
        recommendations = []
        
        # Tone-specific recommendations
        tone_recs = {
            EmotionalTone.TENSE: [
                "Consider longer takes to build anticipation",
                "Use tight framing throughout"
            ],
            EmotionalTone.ROMANTIC: [
                "Soft lighting enhances romantic mood",
                "Consider slow camera movements"
            ],
            EmotionalTone.ACTION: [
                "Quick cuts heighten energy",
                "Use dynamic camera movements"
            ],
        }
        recommendations.extend(tone_recs.get(tone, []))
        
        # Sequence-specific recommendations
        if sequence.rhythm_score < 0.6:
            recommendations.append("Consider varying shot durations for better rhythm")
        if sequence.variety_score < 0.5:
            recommendations.append("Add more visual variety with different angles and movements")
        
        return recommendations
    
    def _generate_variety_notes(self, sequence: ShotSequence) -> List[str]:
        """Generate notes about shot variety."""
        notes = []
        
        shot_classes = set(s.shot_class for s in sequence.shots)
        if len(shot_classes) < 3:
            notes.append("Limited shot variety - consider adding different shot sizes")
        
        variations = set(s.variation for s in sequence.shots if s.variation)
        if len(variations) < 2:
            notes.append("Camera angles could be more varied")
        
        movements = set(s.camera_movement for s in sequence.shots)
        if len(movements) < 2:
            notes.append("Consider adding camera movement for dynamism")
        
        return notes


def get_dynamic_suggestions(
    scene_content: str,
    scene_heading: str,
    num_characters: int,
    duration_estimate: float = 60.0,
    previous_shot: Optional[str] = None
) -> DynamicSuggestions:
    """Convenience function to get dynamic suggestions."""
    engine = DynamicShotEngine()
    return engine.get_dynamic_suggestions(
        scene_content=scene_content,
        scene_heading=scene_heading,
        num_characters=num_characters,
        duration_estimate=duration_estimate,
        previous_shot=previous_shot
    )

