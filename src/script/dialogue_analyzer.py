"""
Dialogue Analyzer Module

This module analyzes character dialogue patterns, builds voice signatures,
and generates insights about speaking styles.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import logging
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Set

from .script_types import ParsedScript, ParsedScene, DialogueLine
from .dialogue_types import (
    FormalityLevel, DialogueStyle,
    DialogueStats, VocabularyProfile, StyleProfile,
    Catchphrase, VoiceSignature, DialogueAnalysisResult
)

logger = logging.getLogger(__name__)


class DialogueAnalyzer:
    """
    Analyze character dialogue patterns and create voice signatures.
    """
    
    STOP_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'between', 'under', 'again',
        'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
        'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
        'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
        'can', 'will', 'just', 'should', 'now', 'i', 'me', 'my', 'myself',
        'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
        'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
        'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
        'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
        'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would',
        'could', 'ought', 'because', 'as', 'until', 'while', 'if', 'else',
    }
    
    FORMAL_INDICATORS = {
        'therefore', 'hence', 'thus', 'however', 'nevertheless', 'moreover',
        'furthermore', 'consequently', 'accordingly', 'indeed', 'rather',
        'utilize', 'commence', 'terminate', 'inquire', 'assist', 'regarding',
    }
    
    CASUAL_INDICATORS = {
        'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'dunno', 'lemme',
        'gimme', 'yeah', 'nope', 'cool', 'awesome', 'stuff', 'thing',
    }
    
    def __init__(self):
        pass
    
    def analyze_script(self, script: ParsedScript) -> DialogueAnalysisResult:
        result = DialogueAnalysisResult()
        character_dialogue: Dict[str, List[DialogueLine]] = {}
        character_scenes: Dict[str, Set[int]] = {}
        
        for scene_idx, scene in enumerate(script.scenes, 1):
            for dialogue in scene.dialogues:
                speaker = dialogue.speaker
                if speaker not in character_dialogue:
                    character_dialogue[speaker] = []
                    character_scenes[speaker] = set()
                character_dialogue[speaker].append(dialogue)
                character_scenes[speaker].add(scene_idx)
        
        for character, dialogues in character_dialogue.items():
            voice = self._analyze_character(character, dialogues, list(character_scenes[character]))
            result.characters[character] = voice
            result.total_dialogue_lines += len(dialogues)
            result.total_words += sum(len(d.text.split()) for d in dialogues)
        
        if character_dialogue:
            sorted_chars = sorted(character_dialogue.items(), key=lambda x: len(x[1]), reverse=True)
            result.most_speaking_character = sorted_chars[0][0]
        
        return result
    
    def _analyze_character(self, character: str, dialogues: List[DialogueLine], scene_numbers: List[int]) -> VoiceSignature:
        voice = VoiceSignature(character_name=character)
        voice.dialogue_stats = self._calc_dialogue_stats(character, dialogues, scene_numbers)
        voice.vocabulary = self._analyze_vocabulary(character, dialogues)
        voice.style = self._analyze_style(character, dialogues)
        voice.catchphrases = self._detect_catchphrases(dialogues, scene_numbers)
        voice.voice_description = self._generate_voice_description(voice)
        return voice
    
    def _calc_dialogue_stats(self, character: str, dialogues: List[DialogueLine], scene_numbers: List[int]) -> DialogueStats:
        stats = DialogueStats(character_name=character)
        stats.total_lines = len(dialogues)
        stats.total_words = sum(len(d.text.split()) for d in dialogues)
        stats.total_sentences = sum(self._count_sentences(d.text) for d in dialogues)
        if stats.total_lines > 0:
            stats.avg_words_per_line = stats.total_words / stats.total_lines
        stats.scene_appearances = len(set(scene_numbers))
        return stats
    
    def _count_sentences(self, text: str) -> int:
        sentences = re.split(r'[.!?]+', text)
        return len([s for s in sentences if s.strip()])
    
    def _analyze_vocabulary(self, character: str, dialogues: List[DialogueLine]) -> VocabularyProfile:
        profile = VocabularyProfile(character_name=character)
        all_words = []
        word_count = Counter()
        for dialogue in dialogues:
            words = self._extract_words(dialogue.text)
            all_words.extend(words)
            word_count.update(words)
        profile.total_words = len(all_words)
        profile.total_unique_words = len(word_count)
        profile.top_words = word_count.most_common(50)
        return profile
    
    def _extract_words(self, text: str) -> List[str]:
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        return [w for w in words if w not in self.STOP_WORDS and len(w) > 2]
    
    def _analyze_style(self, character: str, dialogues: List[DialogueLine]) -> StyleProfile:
        profile = StyleProfile(character_name=character)
        if not dialogues:
            return profile
        all_text = ' '.join(d.text for d in dialogues)
        all_words = all_text.lower().split()
        formal_count = sum(1 for w in all_words if w in self.FORMAL_INDICATORS)
        casual_count = sum(1 for w in all_words if w in self.CASUAL_INDICATORS)
        if formal_count + casual_count > 0:
            profile.formality_score = formal_count / (formal_count + casual_count)
        if profile.formality_score > 0.7:
            profile.formality_level = FormalityLevel.FORMAL
        elif profile.formality_score < 0.3:
            profile.formality_level = FormalityLevel.CASUAL
        questions = sum(1 for d in dialogues if '?' in d.text)
        profile.question_ratio = questions / len(dialogues) if dialogues else 0
        exclamations = sum(1 for d in dialogues if '!' in d.text)
        profile.exclamation_ratio = exclamations / len(dialogues) if dialogues else 0
        return profile
    
    def _detect_catchphrases(self, dialogues: List[DialogueLine], scene_numbers: List[int]) -> List[Catchphrase]:
        catchphrases = []
        phrase_count = Counter()
        for dialogue in dialogues:
            words = dialogue.text.split()
            if len(words) >= 3:
                for i in range(len(words) - 2):
                    phrase = ' '.join(words[i:i+3]).lower()
                    phrase_count[phrase] += 1
        for phrase, count in phrase_count.items():
            if count >= 2:
                catchphrases.append(Catchphrase(phrase=phrase, count=count, scene_first=1, scene_last=1))
        catchphrases.sort(key=lambda x: x.count, reverse=True)
        return catchphrases[:10]
    
    def _generate_voice_description(self, voice: VoiceSignature) -> str:
        parts = []
        if voice.style:
            if voice.style.formality_level == FormalityLevel.FORMAL:
                parts.append("speaks formally")
            elif voice.style.formality_level == FormalityLevel.CASUAL:
                parts.append("speaks casually")
        if voice.dialogue_stats:
            if voice.dialogue_stats.scene_appearances > 10:
                parts.append("appears throughout the story")
        if parts:
            return f"{voice.character_name} {parts[0]}."
        return f"{voice.character_name} has minimal dialogue."


def analyze_script_dialogue(script: ParsedScript) -> DialogueAnalysisResult:
    analyzer = DialogueAnalyzer()
    return analyzer.analyze_script(script)


def get_character_voice(script: ParsedScript, character_name: str) -> Optional[VoiceSignature]:
    analyzer = DialogueAnalyzer()
    result = analyzer.analyze_script(script)
    for name, voice in result.characters.items():
        if name.upper() == character_name.upper():
            return voice
    return None

