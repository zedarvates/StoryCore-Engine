"""
Script Parser Module

This module handles parsing screenplay scripts, detecting scenes,
extracting dialogue, and classifying content.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from .script_types import (
    SceneType, TimeOfDay, SceneMood, TransitionType, ElementType,
    SceneHeader, DialogueLine, ActionBlock, ScriptElement,
    ParsedScene, ParsedScript, ScriptStatistics
)

logger = logging.getLogger(__name__)


class ScriptParser:
    """
    Parse screenplay scripts and extract structured data.
    
    Features:
    - Scene header detection and parsing
    - Dialogue extraction with speaker attribution
    - Action line parsing
    - Scene classification by type and mood
    - Metadata extraction
    """
    
    # Scene header patterns
    SCENE_HEADER_PATTERN = re.compile(
        r'^(?:INT\.?|EXT\.?|I\/E\.?|INT\/EXT\.?)\s+.+?(?:\s+-\s+.+)?$',
        re.IGNORECASE | re.MULTILINE
    )
    
    # Scene number pattern
    SCENE_NUMBER_PATTERN = re.compile(r'^(\d+[A-Z]?)')
    
    # Extended scene header pattern
    EXTENDED_SCENE_PATTERN = re.compile(
        r'^(INT\.?|EXT\.?|I\/E\.?|INT\/EXT\.?)\s+(.+?)(?:\s+-\s+(.+))?$',
        re.IGNORECASE
    )
    
    # Character name pattern
    CHARACTER_PATTERN = re.compile(r'^[A-Z][A-Z\s\'\-]{2,40}$')
    
    # Parenthetical pattern
    PARENTHETICAL_PATTERN = re.compile(r'^\([a-z][^)]*\)$')
    
    # Transition pattern
    TRANSITION_PATTERN = re.compile(
        r'^(?:FADE\s+(?:IN|OUT)|DISSOLVE\.?|CUT\s+TO|SMASH\s+CUT|'
        r'JUMP\s+CUT|MATCH\s+CUT|WIPE\s+TO|CONTINUOUS\.?|'
        r'TO:\s*|ANGLE\s+ON:?.+)$',
        re.IGNORECASE
    )
    
    # Shot marker pattern
    SHOT_PATTERN = re.compile(r'^(?:ANGLE|CU|MS|WS|LS|OTS|POV|OVER|UNDER|SHOW)\s*', re.IGNORECASE)
    
    # Time of day keywords
    TIME_KEYWORDS = {
        TimeOfDay.DAY: ['DAY', 'MORNING', 'AFTERNOON'],
        TimeOfDay.NIGHT: ['NIGHT', 'EVENING', 'MIDNIGHT'],
        TimeOfDay.DAWN: ['DAWN', 'SUNRISE'],
        TimeOfDay.DUSK: ['DUSK', 'SUNSET', 'TWILIGHT'],
        TimeOfDay.CONTINUOUS: ['CONTINUOUS', 'LATER', 'MOMENTS LATER']
    }
    
    # Mood keywords
    MOOD_KEYWORDS = {
        SceneMood.TENSE: ['tense', 'nervous', 'anxious', 'suspense', 'danger'],
        SceneMood.HAPPY: ['happy', 'joy', 'celebration', 'laughing', 'smile'],
        SceneMood.SAD: ['sad', 'crying', 'tears', 'grief', 'mourning'],
        SceneMood.ROMANTIC: ['kiss', 'love', 'romantic', 'embrace', 'affection'],
        SceneMood.ACTION: ['explosion', 'gun', 'chase', 'fight', 'run'],
        SceneMood.HORROR: ['scary', 'horror', 'fear', 'monster', 'ghost'],
        SceneMood.COMEDY: ['funny', 'joke', 'laugh', 'humor', 'silly'],
        SceneMood.DRAMATIC: ['dramatic', 'reveal', 'confrontation', 'argument'],
        SceneMood.MYSTERIOUS: ['mystery', 'secret', 'hidden', 'strange', 'clue']
    }
    
    def __init__(self):
        """Initialize the script parser."""
        pass
        
    def parse_script(self, script_text: str, title: str = "Untitled Script") -> ParsedScript:
        """Parse a complete script and return structured data."""
        script = ParsedScript(title=title)
        
        lines = script_text.split('\n')
        current_scene = None
        current_character = None
        dialogue_buffer = []
        
        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            if not stripped:
                continue
            
            # Scene header detection
            if self._is_scene_header(stripped):
                if current_scene:
                    self._finalize_scene(current_scene)
                    script.scenes.append(current_scene)
                
                current_scene = self._parse_scene_header(stripped, line_num)
                current_character = None
                dialogue_buffer = []
                continue
            
            if current_scene is None:
                continue
            
            # Character line detection
            if self._is_character_line(stripped):
                if current_character and dialogue_buffer:
                    self._add_dialogue(current_scene, current_character, dialogue_buffer, line_num)
                    dialogue_buffer = []
                
                current_character = stripped.upper()
                if current_character not in current_scene.characters:
                    current_scene.characters.append(current_character)
                continue
            
            # Parenthetical
            if self.PARENTHETICAL_PATTERN.match(stripped):
                dialogue_buffer.append(f"({stripped[1:-1]})")
                continue
            
            # Transition
            if self.TRANSITION_PATTERN.match(stripped):
                element = ScriptElement(
                    element_type=ElementType.TRANSITION,
                    line_number=line_num,
                    content=stripped
                )
                current_scene.elements.append(element)
                continue
            
            # Shot marker
            if self.SHOT_PATTERN.match(stripped):
                element = ScriptElement(
                    element_type=ElementType.SHOT,
                    line_number=line_num,
                    content=stripped
                )
                current_scene.elements.append(element)
                continue
            
            # Action or dialogue
            if current_character:
                dialogue_buffer.append(stripped)
            else:
                action = self._parse_action_block(stripped)
                current_scene.action_blocks.append(action)
                
                element = ScriptElement(
                    element_type=ElementType.ACTION,
                    line_number=line_num,
                    content=stripped
                )
                current_scene.elements.append(element)
        
        # Save final scene
        if current_scene:
            self._finalize_scene(current_scene)
            script.scenes.append(current_scene)
        
        self._calculate_statistics(script)
        return script
    
    def _is_scene_header(self, line: str) -> bool:
        """Check if a line is a scene header."""
        if not line:
            return False
        
        prefixes = ['INT.', 'EXT.', 'I/E.', 'INT/EXT.', 'INT ', 'EXT ']
        for prefix in prefixes:
            if line.upper().startswith(prefix):
                return True
        return False
    
    def _parse_scene_header(self, line: str, line_num: int) -> ParsedScene:
        """Parse a scene header."""
        scene_match = self.SCENE_NUMBER_PATTERN.match(line)
        scene_number = scene_match.group(1) if scene_match else f"SCENE_{len([])+1}"
        
        match = self.EXTENDED_SCENE_PATTERN.match(line)
        
        if match:
            scene_type_str = match.group(1).upper().replace('.', '').replace('/', '/')
            location = match.group(2).strip()
            time_str = match.group(3).strip() if match.group(3) else ""
            
            if 'INT' in scene_type_str and 'EXT' in scene_type_str:
                scene_type = SceneType.I_E
            elif 'INT' in scene_type_str:
                scene_type = SceneType.INT
            elif 'EXT' in scene_type_str:
                scene_type = SceneType.EXT
            else:
                scene_type = SceneType.OTHER
            
            time_of_day = TimeOfDay.UNKNOWN
            for time, keywords in self.TIME_KEYWORDS.items():
                for keyword in keywords:
                    if keyword in time_str.upper():
                        time_of_day = time
                        break
        else:
            scene_type = SceneType.OTHER
            location = line
            time_of_day = TimeOfDay.UNKNOWN
        
        header = SceneHeader(
            scene_number=scene_number,
            scene_type=scene_type,
            location=location,
            time_of_day=time_of_day,
            raw_text=line
        )
        
        scene_id = f"scene_{scene_number.lower().replace(' ', '_')}"
        
        return ParsedScene(
            scene_id=scene_id,
            scene_header=header,
            elements=[
                ScriptElement(
                    element_type=ElementType.SCENE_HEADER,
                    line_number=line_num,
                    content=line
                )
            ]
        )
    
    def _is_character_line(self, line: str) -> bool:
        """Check if a line is a character name."""
        if not line.isupper():
            return False
        if len(line) < 3 or len(line) > 50:
            return False
        if not self.CHARACTER_PATTERN.match(line):
            return False
        
        skip_patterns = ['FADE IN:', 'FADE OUT:', 'DISSOLVE TO:', 'CUT TO:',
                         'SUPER:', 'TITLE:', 'CONTINUED:', 'MORE', 'END',
                         'ACT ONE', 'ACT TWO', 'ACT THREE']
        
        for pattern in skip_patterns:
            if line.startswith(pattern):
                return False
        return True
    
    def _add_dialogue(self, scene: ParsedScene, character: str, lines: List[str], line_num: int):
        """Add dialogue to a scene."""
        text = ' '.join(lines)
        dialogue = DialogueLine(speaker=character, text=text)
        scene.dialogues.append(dialogue)
        scene.dialogue_count += 1
        
        element = ScriptElement(
            element_type=ElementType.DIALOGUE,
            line_number=line_num,
            content=text,
            metadata={"speaker": character}
        )
        scene.elements.append(element)
    
    def _parse_action_block(self, text: str) -> ActionBlock:
        """Parse an action block."""
        text_lower = text.lower()
        sound_keywords = ['sound', 'hear', 'music', 'sfx']
        movement_keywords = ['walks', 'runs', 'enters', 'exits', 'moves']
        
        return ActionBlock(
            text=text,
            is_movement=any(kw in text_lower for kw in movement_keywords),
            is_sound=any(kw in text_lower for kw in sound_keywords),
            is_visual=not any(kw in text_lower for kw in sound_keywords)
        )
    
    def _finalize_scene(self, scene: ParsedScene):
        """Finalize a scene after parsing."""
        word_count = sum(len(e.content.split()) for e in scene.elements)
        scene.word_count = word_count
        scene.line_count = len(scene.elements)
        
        mood, confidence = self._classify_scene_mood(scene)
        scene.mood = mood
        scene.mood_confidence = confidence
        
        scene.complexity_score = self._calculate_complexity(scene)
    
    def _classify_scene_mood(self, scene: ParsedScene) -> Tuple[SceneMood, float]:
        """Classify scene mood."""
        all_text = ' '.join(e.content for e in scene.elements).lower()
        
        mood_scores = {}
        for mood, keywords in self.MOOD_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw.lower() in all_text)
            if score > 0:
                mood_scores[mood] = score / len(keywords)
        
        if not mood_scores:
            return SceneMood.NEUTRAL, 0.0
        
        best_mood = max(mood_scores, key=mood_scores.get)
        confidence = min(mood_scores[best_mood], 1.0)
        return best_mood, confidence
    
    def _calculate_complexity(self, scene: ParsedScene) -> float:
        """Calculate complexity score."""
        if not scene.elements:
            return 0.0
        
        dialogue_ratio = len(scene.dialogues) / len(scene.elements)
        character_count = len(scene.characters)
        action_density = len([a for a in scene.action_blocks if a.is_movement]) / max(1, len(scene.action_blocks))
        
        score = (dialogue_ratio * 0.3) + (character_count * 0.1) + (action_density * 0.2)
        return min(1.0, score)
    
    def _calculate_statistics(self, script: ParsedScript):
        """Calculate script statistics."""
        stats = script.statistics
        
        for scene in script.scenes:
            stats.total_scenes += 1
            stats.total_words += scene.word_count
            stats.total_lines += scene.line_count
            stats.total_dialogue_lines += scene.dialogue_count
            
            if scene.scene_header.scene_type == SceneType.INT:
                stats.interior_scenes += 1
            elif scene.scene_header.scene_type == SceneType.EXT:
                stats.exterior_scenes += 1
            
            if scene.scene_header.time_of_day == TimeOfDay.DAY:
                stats.day_scenes += 1
            elif scene.scene_header.time_of_day == TimeOfDay.NIGHT:
                stats.night_scenes += 1
        
        all_chars = set()
        for scene in script.scenes:
            all_chars.update(scene.characters)
        stats.total_characters = len(all_chars)
        script.characters = list(all_chars)
        
        if stats.total_dialogue_lines > 0:
            total_words = sum(len(d.text.split()) for s in script.scenes for d in s.dialogues)
            stats.average_dialogue_length = total_words / stats.total_dialogue_lines
        
        stats.total_pages = max(1, stats.total_words // 250)


def parse_script_file(filepath: str) -> Optional[ParsedScript]:
    """Parse a script file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
        
        import os
        title = os.path.splitext(os.path.basename(filepath))[0]
        
        parser = ScriptParser()
        return parser.parse_script(text, title)
        
    except Exception as e:
        logger.error(f"Failed to parse script file {filepath}: {e}")
        return None


def parse_script_text(text: str, title: str = "Untitled") -> ParsedScript:
    """Parse script text."""
    parser = ScriptParser()
    return parser.parse_script(text, title)

