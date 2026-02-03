"""
Dialogue Analysis Types

Data structures for character dialogue analysis.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class FormalityLevel(Enum):
    """Formality level of dialogue."""
    VERY_FORMAL = "very_formal"
    FORMAL = "formal"
    NEUTRAL = "neutral"
    CASUAL = "casual"
    VERY_CASUAL = "very_casual"


class DialogueStyle(Enum):
    """Dialogue style characteristics."""
    DIRECT = "direct"
    INDIRECT = "indirect"
    QUESTIONING = "questioning"
    EXCLAMATORY = "exclamatory"
    HESITANT = "hesitant"
    ASSERTIVE = "assertive"
    HUMOROUS = "humorous"
    SERIOUS = "serious"


@dataclass
class DialogueStats:
    """Statistics for a character's dialogue."""
    character_name: str
    total_lines: int = 0
    total_words: int = 0
    total_sentences: int = 0
    avg_words_per_line: float = 0.0
    avg_sentences_per_line: float = 0.0
    scene_appearances: int = 0
    first_scene: int = 0
    last_scene: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_name": self.character_name,
            "total_lines": self.total_lines,
            "total_words": self.total_words,
            "total_sentences": self.total_sentences,
            "avg_words_per_line": round(self.avg_words_per_line, 2),
            "scene_appearances": self.scene_appearances,
        }


@dataclass
class VocabularyProfile:
    """Vocabulary profile for a character."""
    character_name: str
    total_unique_words: int = 0
    total_words: int = 0
    top_words: List[tuple] = field(default_factory=list)
    unique_words: List[str] = field(default_factory=list)
    rare_words: List[str] = field(default_factory=list)
    specialized_terms: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_name": self.character_name,
            "total_unique_words": self.total_unique_words,
            "total_words": self.total_words,
            "top_words": self.top_words[:20],
            "unique_words": self.unique_words[:50],
        }


@dataclass
class StyleProfile:
    """Speaking style profile for a character."""
    character_name: str
    formality_score: float = 0.5
    formality_level: FormalityLevel = FormalityLevel.NEUTRAL
    avg_sentence_length: float = 0.0
    question_ratio: float = 0.0
    exclamation_ratio: float = 0.0
    dominant_styles: List[DialogueStyle] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_name": self.character_name,
            "formality_score": round(self.formality_score, 2),
            "formality_level": self.formality_level.value,
            "avg_sentence_length": round(self.avg_sentence_length, 2),
            "question_ratio": round(self.question_ratio, 2),
            "dominant_styles": [s.value for s in self.dominant_styles]
        }


@dataclass
class Catchphrase:
    """A catchphrase or signature expression."""
    phrase: str
    count: int
    scene_first: int
    scene_last: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "phrase": self.phrase,
            "count": self.count,
        }


@dataclass
class VoiceSignature:
    """Complete voice signature for a character."""
    character_name: str
    dialogue_stats: Optional[DialogueStats] = None
    vocabulary: Optional[VocabularyProfile] = None
    style: Optional[StyleProfile] = None
    catchphrases: List[Catchphrase] = field(default_factory=list)
    voice_description: str = ""
    signature_words: List[str] = field(default_factory=list)
    speech_patterns: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_name": self.character_name,
            "dialogue_stats": self.dialogue_stats.to_dict() if self.dialogue_stats else None,
            "vocabulary": self.vocabulary.to_dict() if self.vocabulary else None,
            "style": self.style.to_dict() if self.style else None,
            "catchphrases": [c.to_dict() for c in self.catchphrases],
            "voice_description": self.voice_description,
        }


@dataclass
class DialogueAnalysisResult:
    """Complete dialogue analysis for all characters."""
    characters: Dict[str, VoiceSignature] = field(default_factory=dict)
    total_dialogue_lines: int = 0
    total_words: int = 0
    most_speaking_character: str = ""
    least_speaking_character: str = ""
    analyzed_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "characters": {k: v.to_dict() for k, v in self.characters.items()},
            "total_dialogue_lines": self.total_dialogue_lines,
            "total_words": self.total_words,
            "most_speaking_character": self.most_speaking_character,
            "analyzed_at": self.analyzed_at.isoformat()
        }

