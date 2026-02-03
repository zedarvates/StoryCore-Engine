"""
Script Parsing Types

Data structures for script parsing and scene detection.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class SceneType(Enum):
    """Types of scenes in a script."""
    INT = "interior"
    EXT = "exterior"
    I_E = "interior/exterior"
    OTHER = "other"


class TimeOfDay(Enum):
    """Time of day for a scene."""
    DAY = "day"
    NIGHT = "night"
    DAWN = "dawn"
    DUSK = "dusk"
    CONTINUOUS = "continuous"
    UNKNOWN = "unknown"


class SceneMood(Enum):
    """Emotional mood of a scene."""
    NEUTRAL = "neutral"
    TENSE = "tense"
    HAPPY = "happy"
    SAD = "sad"
    ROMANTIC = "romantic"
    ACTION = "action"
    HORROR = "horror"
    COMEDY = "comedy"
    DRAMATIC = "dramatic"
    MYSTERIOUS = "mysterious"


class TransitionType(Enum):
    """Types of transitions between scenes."""
    CUT = "cut"
    DISSOLVE = "dissolve"
    FADE = "fade"
    WIPE = "wipe"
    SMASH = "smash_cut"
    JUMP = "jump_cut"
    MATCH = "match_cut"
    UNKNOWN = "unknown"


class ElementType(Enum):
    """Types of script elements."""
    SCENE_HEADER = "scene_header"
    ACTION = "action"
    DIALOGUE = "dialogue"
    PARENTHETICAL = "parenthetical"
    CHARACTER = "character"
    TRANSITION = "transition"
    SHOT = "shot"
    COMMENT = "comment"
    PAGE_BREAK = "page_break"


@dataclass
class SceneHeader:
    """Represents a scene header (e.g., INT. HOUSE - DAY)."""
    scene_number: str
    scene_type: SceneType
    location: str
    time_of_day: TimeOfDay
    raw_text: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_number": self.scene_number,
            "scene_type": self.scene_type.value,
            "location": self.location,
            "time_of_day": self.time_of_day.value,
            "raw_text": self.raw_text
        }


@dataclass
class DialogueLine:
    """Represents a line of dialogue."""
    speaker: str
    text: str
    parenthetical: Optional[str] = None
    character_id: Optional[str] = None
    is_off_screen: bool = False
    is_v_o: bool = False
    is_cont: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "speaker": self.speaker,
            "text": self.text,
            "parenthetical": self.parenthetical,
            "character_id": self.character_id,
            "is_off_screen": self.is_off_screen,
            "is_v_o": self.is_v_o,
            "is_cont": self.is_cont
        }


@dataclass
class ActionBlock:
    """Represents a block of action/description text."""
    text: str
    is_movement: bool = False
    is_sound: bool = False
    is_visual: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "is_movement": self.is_movement,
            "is_sound": self.is_sound,
            "is_visual": self.is_visual
        }


@dataclass
class ScriptElement:
    """A single element in a parsed script."""
    element_type: ElementType
    line_number: int
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "element_type": self.element_type.value,
            "line_number": self.line_number,
            "content": self.content,
            "metadata": self.metadata
        }


@dataclass
class ParsedScene:
    """A complete parsed scene with all its elements."""
    scene_id: str
    scene_header: SceneHeader
    elements: List[ScriptElement] = field(default_factory=list)
    characters: List[str] = field(default_factory=list)
    dialogues: List[DialogueLine] = field(default_factory=list)
    action_blocks: List[ActionBlock] = field(default_factory=list)
    mood: SceneMood = SceneMood.NEUTRAL
    mood_confidence: float = 0.0
    scene_type: str = "standard"
    complexity_score: float = 0.5
    word_count: int = 0
    line_count: int = 0
    dialogue_count: int = 0
    page_number: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "scene_header": self.scene_header.to_dict(),
            "elements": [e.to_dict() for e in self.elements],
            "characters": self.characters,
            "mood": self.mood.value,
            "complexity_score": self.complexity_score,
            "word_count": self.word_count,
            "line_count": self.line_count
        }


@dataclass
class ScriptStatistics:
    """Statistics for a parsed script."""
    total_scenes: int = 0
    total_pages: int = 0
    total_lines: int = 0
    total_words: int = 0
    interior_scenes: int = 0
    exterior_scenes: int = 0
    day_scenes: int = 0
    night_scenes: int = 0
    total_characters: int = 0
    character_lines: Dict[str, int] = field(default_factory=dict)
    total_dialogue_lines: int = 0
    average_dialogue_length: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_scenes": self.total_scenes,
            "total_pages": self.total_pages,
            "total_lines": self.total_lines,
            "total_words": self.total_words,
            "interior_scenes": self.interior_scenes,
            "exterior_scenes": self.exterior_scenes,
            "day_scenes": self.day_scenes,
            "night_scenes": self.night_scenes,
            "total_characters": self.total_characters,
            "total_dialogue_lines": self.total_dialogue_lines
        }


@dataclass
class ParsedScript:
    """A completely parsed script."""
    title: str
    scenes: List[ParsedScene] = field(default_factory=list)
    statistics: ScriptStatistics = field(default_factory=ScriptStatistics)
    characters: List[str] = field(default_factory=list)
    format: str = "standard"
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "scenes": [s.to_dict() for s in self.scenes],
            "statistics": self.statistics.to_dict(),
            "characters": self.characters,
            "format": self.format,
            "created_at": self.created_at.isoformat()
        }

