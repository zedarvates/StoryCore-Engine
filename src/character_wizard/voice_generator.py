"""
Voice Identity Generation Module

This module handles the generation of voice identities matching personality and appearance.
"""

import random
from .models import PersonalityProfile, VoiceIdentity
from .archetypes import CharacterArchetype


class VoiceGenerator:
    """Handles voice identity generation for characters"""

    def __init__(self):
        """Initialize the voice generator"""
        self.voice_patterns = self._load_voice_patterns()

    def generate_voice_identity(self, personality: PersonalityProfile, archetype: CharacterArchetype) -> VoiceIdentity:
        """Generate voice identity matching personality and appearance"""
        voice = VoiceIdentity()

        # Get voice pattern template
        pattern_key = archetype.role.value
        if pattern_key not in self.voice_patterns:
            pattern_key = "default"

        pattern = self.voice_patterns[pattern_key]

        # Generate speech characteristics
        voice.speech_patterns = pattern["speech_patterns"]
        voice.vocabulary_level = self._determine_vocabulary_level(personality, archetype)
        voice.sentence_complexity = self._determine_sentence_complexity(personality)
        voice.speaking_pace = self._determine_speaking_pace(personality)

        # Generate linguistic features
        voice.accent = pattern.get("accent")
        voice.dialect = pattern.get("dialect")
        voice.formality_level = self._determine_formality_level(personality, archetype)

        # Generate emotional expression
        voice.humor_style = self._determine_humor_style(personality)
        voice.emotional_range = self._determine_emotional_range(personality)
        voice.vulnerability_expression = self._determine_vulnerability_expression(personality)

        # Generate unique elements
        voice.catchphrases = self._generate_catchphrases(archetype, personality)
        voice.verbal_tics = self._generate_verbal_tics(personality)
        voice.signature_expressions = self._generate_signature_expressions(archetype, personality)

        # Technical specifications
        voice.voice_type = self._determine_voice_type(personality, archetype)
        voice.emotional_variance = personality.neuroticism * 0.8 + 0.2  # 0.2 to 1.0 range

        return voice

    def _determine_vocabulary_level(self, personality: PersonalityProfile, archetype: CharacterArchetype) -> str:
        """Determine vocabulary level"""
        if archetype.role in [self._get_archetype_role("mentor"), self._get_archetype_role("villain")]:
            return "sophisticated"
        elif personality.openness > 0.7:
            return "varied"
        else:
            return "everyday"

    def _determine_sentence_complexity(self, personality: PersonalityProfile) -> str:
        """Determine sentence complexity"""
        if personality.conscientiousness > 0.7:
            return "structured and complete"
        elif personality.extraversion > 0.6:
            return "flowing and conversational"
        else:
            return "simple and direct"

    def _determine_speaking_pace(self, personality: PersonalityProfile) -> str:
        """Determine speaking pace"""
        if personality.extraversion > 0.7:
            return "quick and animated"
        elif personality.conscientiousness > 0.7:
            return "measured and deliberate"
        else:
            return "moderate and natural"

    def _determine_formality_level(self, personality: PersonalityProfile, archetype: CharacterArchetype):
        """Determine formality level"""
        from .models import FormalityLevel

        if archetype.role == self._get_archetype_role("mentor"):
            return FormalityLevel.FORMAL
        elif archetype.role == self._get_archetype_role("villain"):
            return FormalityLevel.FORMAL
        elif archetype.role == self._get_archetype_role("trickster"):
            return FormalityLevel.INFORMAL
        else:
            return FormalityLevel.NEUTRAL

    def _determine_humor_style(self, personality: PersonalityProfile):
        """Determine humor style"""
        from .models import HumorStyle

        if personality.agreeableness < 0.4:
            return HumorStyle.SARCASTIC
        elif personality.openness > 0.7:
            return HumorStyle.WITTY
        elif personality.extraversion > 0.6:
            return HumorStyle.PLAYFUL
        else:
            return HumorStyle.DRY

    def _determine_emotional_range(self, personality: PersonalityProfile) -> str:
        """Determine emotional range"""
        if personality.neuroticism > 0.6:
            return "wide and intense"
        elif personality.extraversion > 0.6:
            return "expressive and varied"
        else:
            return "controlled and subtle"

    def _determine_vulnerability_expression(self, personality: PersonalityProfile) -> str:
        """Determine how character expresses vulnerability"""
        if personality.agreeableness > 0.7:
            return "open about feelings and struggles"
        elif personality.extraversion < 0.4:
            return "keeps vulnerabilities private"
        else:
            return "selective about sharing vulnerabilities"

    def _generate_catchphrases(self, archetype: CharacterArchetype, personality: PersonalityProfile) -> list[str]:
        """Generate character catchphrases"""
        phrases_by_archetype = {
            self._get_archetype_role("hero"): ["We can do this", "Never give up", "For justice", "Together we're stronger"],
            self._get_archetype_role("villain"): ["Power is everything", "You cannot stop me", "Foolish", "Bow before me"],
            self._get_archetype_role("mentor"): ["Learn from this", "Patience, young one", "Wisdom comes with time", "Trust the process"],
            self._get_archetype_role("ally"): ["I've got your back", "Let's do this", "Count me in", "We're in this together"],
            self._get_archetype_role("trickster"): ["Expect the unexpected", "Rules are meant to be broken", "Why so serious?", "Surprise!"]
        }
        phrases = phrases_by_archetype.get(archetype.role, ["Indeed", "Interesting", "I see"])
        return random.sample(phrases, min(2, len(phrases)))

    def _generate_verbal_tics(self, personality: PersonalityProfile) -> list[str]:
        """Generate verbal tics"""
        tics = []
        if personality.neuroticism > 0.6:
            tics.extend(["um", "you know", "like"])
        if personality.conscientiousness > 0.7:
            tics.extend(["precisely", "exactly", "indeed"])
        if personality.extraversion > 0.6:
            tics.extend(["oh!", "wow", "amazing"])

        return random.sample(tics, min(2, len(tics))) if tics else []

    def _generate_signature_expressions(self, archetype: CharacterArchetype, personality: PersonalityProfile) -> list[str]:
        """Generate signature expressions"""
        expressions = []
        if archetype.role == self._get_archetype_role("hero"):
            expressions.extend(["determined nod", "encouraging smile", "firm handshake"])
        elif archetype.role == self._get_archetype_role("villain"):
            expressions.extend(["cold stare", "dismissive wave", "cruel smile"])
        elif archetype.role == self._get_archetype_role("mentor"):
            expressions.extend(["knowing look", "gentle pat on shoulder", "thoughtful pause"])

        return random.sample(expressions, min(2, len(expressions))) if expressions else []

    def _determine_voice_type(self, personality: PersonalityProfile, archetype: CharacterArchetype) -> str:
        """Determine voice type for TTS"""
        if archetype.role == self._get_archetype_role("villain"):
            return "deep and commanding"
        elif archetype.role == self._get_archetype_role("mentor"):
            return "warm and wise"
        elif personality.extraversion > 0.6:
            return "bright and energetic"
        else:
            return "clear and natural"

    def _load_voice_patterns(self) -> dict[str, dict[str, str]]:
        """Load voice pattern templates for different archetypes"""
        return {
            "hero": {
                "speech_patterns": "clear and direct",
                "accent": None,
                "dialect": None
            },
            "villain": {
                "speech_patterns": "sophisticated and calculated",
                "accent": "refined",
                "dialect": None
            },
            "mentor": {
                "speech_patterns": "measured and thoughtful",
                "accent": None,
                "dialect": "formal"
            },
            "ally": {
                "speech_patterns": "friendly and supportive",
                "accent": None,
                "dialect": "casual"
            },
            "trickster": {
                "speech_patterns": "quick and playful",
                "accent": None,
                "dialect": "colloquial"
            },
            "default": {
                "speech_patterns": "natural and conversational",
                "accent": None,
                "dialect": None
            }
        }

    def _get_archetype_role(self, role_name: str):
        """Helper to get archetype role enum"""
        from .archetypes import ArchetypeRole
        return ArchetypeRole[role_name.upper()]