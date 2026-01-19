"""
Quality and Consistency Scoring Module

This module handles calculation of character quality and consistency scores.
"""

from .models import CharacterProfile, PersonalityProfile, VisualIdentity, VoiceIdentity, BackstoryProfile
from .archetypes import CharacterArchetype


class QualityScorer:
    """Handles quality and consistency scoring for characters"""

    def calculate_quality_score(self, character: CharacterProfile) -> float:
        """Calculate character quality score"""
        # Base score
        score = 3.0

        # Add points for completeness
        if character.name and len(character.name) > 2:
            score += 0.3
        if len(character.personality_profile.primary_traits) >= 3:
            score += 0.3
        if character.backstory_profile.origin_story:
            score += 0.3
        if len(character.voice_identity.catchphrases) > 0:
            score += 0.2
        if len(character.visual_identity.distinctive_features) > 0:
            score += 0.2

        # Add points for consistency
        if self._check_personality_consistency(character.personality_profile):
            score += 0.3
        if self._check_visual_consistency(character.visual_identity):
            score += 0.2
        if self._check_voice_personality_match(character.voice_identity, character.personality_profile):
            score += 0.2

        return min(5.0, score)

    def calculate_consistency_score(self, character: CharacterProfile) -> float:
        """Calculate character consistency score"""
        consistency_checks = [
            self._check_personality_consistency(character.personality_profile),
            self._check_visual_consistency(character.visual_identity),
            self._check_voice_personality_match(character.voice_identity, character.personality_profile),
            self._check_backstory_personality_match(character.backstory_profile, character.personality_profile),
            self._check_archetype_consistency(character)
        ]

        return sum(consistency_checks) / len(consistency_checks) * 5.0

    def _check_personality_consistency(self, personality: PersonalityProfile) -> bool:
        """Check personality trait consistency"""
        # Simple consistency check - ensure traits don't contradict
        if "brave" in personality.primary_traits and "cowardly" in personality.flaws:
            return False
        if "loyal" in personality.strengths and "betrayer" in personality.flaws:
            return False
        return True

    def _check_visual_consistency(self, visual_identity: VisualIdentity) -> bool:
        """Check visual identity consistency"""
        # Basic consistency check
        return bool(visual_identity.hair_color and visual_identity.eye_color and visual_identity.skin_tone)

    def _check_voice_personality_match(self, voice: VoiceIdentity, personality: PersonalityProfile) -> bool:
        """Check if voice matches personality"""
        # Simple check - extraverted characters should have more expressive voices
        if personality.extraversion > 0.6 and "expressive" not in voice.emotional_range:
            return False
        return True

    def _check_backstory_personality_match(self, backstory: BackstoryProfile, personality: PersonalityProfile) -> bool:
        """Check if backstory matches personality"""
        # Simple consistency check
        return bool(backstory.origin_story and len(backstory.key_life_events) > 0)

    def _check_archetype_consistency(self, character: CharacterProfile) -> bool:
        """Check overall archetype consistency"""
        # Basic check that character has all required elements
        return bool(
            character.name and
            character.personality_profile.primary_traits and
            character.visual_identity.hair_color and
            character.voice_identity.speech_patterns
        )