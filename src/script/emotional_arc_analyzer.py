"""
Emotional Arc Analyzer

This module analyzes emotional content and tracks emotional arcs
across scenes and characters.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from .script_types import ParsedScript, ParsedScene, DialogueLine
from .emotional_arc_types import (
    EmotionType, EmotionCategory, ArcType,
    EmotionBeat, EmotionTransition,
    CharacterEmotionArc, SceneEmotionProfile,
    EmotionalArcAnalysis
)

logger = logging.getLogger(__name__)


class EmotionalArcAnalyzer:
    """
    Analyze emotional content and track emotional arcs in scripts.
    """
    
    EMOTION_WORDS = {
        EmotionType.JOY: [
            'happy', 'joy', 'delighted', 'glad', 'pleased', 'cheerful',
            'excited', 'thrilled', 'elated', 'love', 'beautiful', 'great',
            'wonderful', 'amazing', 'laugh', 'smile', 'celebrate'
        ],
        EmotionType.SADNESS: [
            'sad', 'unhappy', 'sorrowful', 'grief', 'melancholy', 'depressed',
            'cry', 'tears', 'miss', 'lost', 'alone', 'hurt', 'pain',
            'sorry', 'regret', 'wish', 'could have', 'death', 'died'
        ],
        EmotionType.ANGER: [
            'angry', 'furious', 'rage', 'mad', 'irritated', 'annoyed', 'hate',
            'outraged', 'frustrated', 'scream', 'shout', 'fight', 'attack',
            'destroy', 'never', 'how dare', 'stupid'
        ],
        EmotionType.FEAR: [
            'afraid', 'scared', 'terrified', 'frightened', 'fear', 'anxious',
            'worried', 'nervous', 'panic', 'horror', 'danger', 'threat',
            'suspense', 'creepy', 'dark', 'monster', 'escape', 'hide', 'help'
        ],
        EmotionType.SURPRISE: [
            'surprise', 'surprised', 'shocked', 'unexpected', 'suddenly',
            'wow', 'astonished', 'amazed', 'incredible', 'unbelievable',
            'wait', 'what', 'whoa', 'aha', 'realize', 'discover'
        ],
        EmotionType.TRUST: [
            'trust', 'believe', 'faith', 'confident', 'sure', 'rely',
            'support', 'help', 'friend', 'loyal', 'know', 'understand'
        ],
        EmotionType.ANTICIPATION: [
            'wait', 'expect', 'hope', 'wonder', 'looking forward', 'soon',
            'tomorrow', 'next', 'plan', 'prepare', 'ready', 'eager'
        ],
        EmotionType.LOVE: [
            'love', 'adore', 'care', 'cherish', 'beloved', 'dear', 'sweet',
            'romantic', 'kiss', 'hold', 'together', 'forever', 'always',
            'heart', 'passion', 'want', 'need', 'miss'
        ],
        EmotionType.HATE: [
            'hate', 'despise', 'loathe', 'detest', 'enemy', 'destroy', 'curse'
        ],
        EmotionType.HOPE: [
            'hope', 'wish', 'dream', 'aspire', 'possible', 'maybe',
            'believe', 'someday', 'optimistic', 'bright', 'future'
        ],
        EmotionType.DESPAIR: [
            'despair', 'hopeless', 'give up', 'no way', 'impossible',
            'end', 'over', 'finished', 'failed', 'lost cause'
        ],
        EmotionType.ANXIETY: [
            'anxious', 'nervous', 'worry', 'concerned', 'uneasy', 'tense',
            'restless', 'trouble', 'problem', 'difficult'
        ],
        EmotionType.CALM: [
            'calm', 'peaceful', 'quiet', 'still', 'serene', 'relaxed',
            'gentle', 'soft', 'slow', 'rest', 'breathe', 'easy'
        ],
    }
    
    HIGH_INTENSITY = ['very', 'extremely', 'really', 'so', 'absolutely']
    LOW_INTENSITY = ['slightly', 'a bit', 'somewhat', 'a little', 'kind of']
    
    def __init__(self):
        pass
    
    def analyze_script(self, script: ParsedScript) -> EmotionalArcAnalysis:
        """Analyze emotional arcs in a script."""
        analysis = EmotionalArcAnalysis()
        
        character_dialogue: Dict[str, List[Tuple[int, DialogueLine, float]]] = {}
        scene_profiles = []
        all_beats = []
        
        for scene_idx, scene in enumerate(script.scenes, 1):
            profile = self._analyze_scene_emotion(scene, scene_idx)
            scene_profiles.append(profile)
            
            for dialogue in scene.dialogues:
                emotion, intensity = self._detect_dialogue_emotion(dialogue.text)
                beat = EmotionBeat(
                    scene_number=scene_idx,
                    emotion=emotion,
                    intensity=intensity,
                    source="dialogue",
                    text_sample=dialogue.text[:100],
                    characters=[dialogue.speaker]
                )
                all_beats.append(beat)
                
                if dialogue.speaker not in character_dialogue:
                    character_dialogue[dialogue.speaker] = []
                character_dialogue[dialogue.speaker].append((scene_idx, dialogue, intensity))
        
        analysis.scene_profiles = scene_profiles
        analysis.total_beats = len(all_beats)
        
        if all_beats:
            analysis.avg_intensity = sum(b.intensity for b in all_beats) / len(all_beats)
        
        emotion_counts = {}
        for beat in all_beats:
            emotion_counts[beat.emotion] = emotion_counts.get(beat.emotion, 0) + 1
        if emotion_counts:
            analysis.dominant_emotion = max(emotion_counts, key=emotion_counts.get)
        
        for character, dialogues in character_dialogue.items():
            arc = self._build_character_arc(character, dialogues, all_beats)
            analysis.character_arcs[character] = arc
        
        sorted_beats = sorted(all_beats, key=lambda x: x.intensity, reverse=True)
        analysis.peak_moments = sorted_beats[:5]
        
        analysis.turning_points = self._find_turning_points(all_beats)
        analysis.story_arc_type = self._classify_story_arc(analysis, scene_profiles)
        analysis.overall_emotional_trend = self._generate_trend_description(scene_profiles)
        
        return analysis
    
    def _analyze_scene_emotion(self, scene: ParsedScene, scene_number: int) -> SceneEmotionProfile:
        profile = SceneEmotionProfile(scene_number=scene_number)
        all_emotions: List[Tuple[EmotionType, float]] = []
        
        for dialogue in scene.dialogues:
            emotion, intensity = self._detect_dialogue_emotion(dialogue.text)
            all_emotions.append((emotion, intensity))
            profile.characters_present.append(dialogue.speaker)
        
        for action in scene.actions:
            emotion, intensity = self._detect_dialogue_emotion(action.text)
            all_emotions.append((emotion, intensity))
        
        if all_emotions:
            emotion_totals: Dict[EmotionType, float] = {}
            for emotion, intensity in all_emotions:
                emotion_totals[emotion] = emotion_totals.get(emotion, 0) + intensity
            
            sorted_emotions = sorted(emotion_totals.items(), key=lambda x: x[1], reverse=True)
            if sorted_emotions:
                profile.primary_emotion = sorted_emotions[0][0]
                if len(sorted_emotions) > 1:
                    profile.secondary_emotion = sorted_emotions[1][0]
            
            profile.intensity = sum(i for _, i in all_emotions) / len(all_emotions)
        
        profile.characters_present = list(set(profile.characters_present))
        return profile
    
    def _detect_dialogue_emotion(self, text: str) -> Tuple[EmotionType, float]:
        text_lower = text.lower()
        emotion_scores: Dict[EmotionType, float] = {}
        
        for emotion, words in self.EMOTION_WORDS.items():
            score = sum(1 for word in words if word in text_lower)
            if score > 0:
                intensity = 0.5
                for modifier in self.HIGH_INTENSITY:
                    if modifier in text_lower:
                        intensity = min(1.0, intensity + 0.2)
                emotion_scores[emotion] = score * intensity
        
        if emotion_scores:
            best_emotion = max(emotion_scores, key=emotion_scores.get)
            return best_emotion, min(1.0, emotion_scores[best_emotion] * 0.3)
        
        return EmotionType.NEUTRAL, 0.3
    
    def _build_character_arc(
        self,
        character: str,
        dialogues: List[Tuple[int, DialogueLine, float]],
        all_beats: List[EmotionBeat]
    ) -> CharacterEmotionArc:
        arc = CharacterEmotionArc(character_name=character)
        
        character_beats = [b for b in all_beats if character in b.characters]
        arc.beats = character_beats
        arc.transitions = self._find_character_transitions(character_beats)
        
        if character_beats:
            intensities = [b.intensity for b in character_beats]
            arc.emotional_range = max(intensities) - min(intensities)
        
        emotion_counts = {}
        for beat in character_beats:
            emotion_counts[beat.emotion] = emotion_counts.get(beat.emotion, 0) + 1
        if emotion_counts:
            arc.dominant_emotion = max(emotion_counts, key=emotion_counts.get)
        
        arc.arc_type = self._classify_character_arc(character_beats)
        arc.arc_description = self._describe_character_arc(arc)
        
        return arc
    
    def _find_character_transitions(self, beats: List[EmotionBeat]) -> List[EmotionTransition]:
        transitions = []
        
        if len(beats) < 2:
            return transitions
        
        for i in range(len(beats) - 1):
            from_beat = beats[i]
            to_beat = beats[i + 1]
            
            if from_beat.emotion != to_beat.emotion:
                transitions.append(EmotionTransition(
                    from_emotion=from_beat.emotion,
                    to_emotion=to_beat.emotion,
                    scene_number=to_beat.scene_number,
                    transition_type="gradual"
                ))
        
        return transitions
    
    def _find_turning_points(self, beats: List[EmotionBeat]) -> List[EmotionTransition]:
        turning_points = []
        
        if len(beats) < 2:
            return turning_points
        
        opposite_pairs = [
            (EmotionType.JOY, EmotionType.SADNESS),
            (EmotionType.FEAR, EmotionType.CALM),
            (EmotionType.HATE, EmotionType.LOVE),
            (EmotionType.HOPE, EmotionType.DESPAIR),
        ]
        
        for i in range(len(beats) - 1):
            from_emotion = beats[i].emotion
            to_emotion = beats[i + 1].emotion
            
            if (from_emotion, to_emotion) in opposite_pairs:
                turning_points.append(EmotionTransition(
                    from_emotion=from_emotion,
                    to_emotion=to_emotion,
                    scene_number=beats[i + 1].scene_number,
                    transition_type="major_turning_point"
                ))
        
        return turning_points[:10]
    
    def _classify_story_arc(
        self,
        analysis: EmotionalArcAnalysis,
        scene_profiles: List[SceneEmotionProfile]
    ) -> ArcType:
        if len(scene_profiles) < 3:
            return ArcType.CUSTOM
        
        intensities = [s.intensity for s in scene_profiles]
        
        if len(intensities) < 2:
            return ArcType.CUSTOM
        
        first_half_avg = sum(intensities[:len(intensities)//2]) / (len(intensities)//2)
        second_half_avg = sum(intensities[len(intensities)//2:]) / (len(intensities) - len(intensities)//2)
        
        positive_count = sum(1 for s in scene_profiles 
                           if s.primary_emotion in [EmotionType.JOY, EmotionType.LOVE, EmotionType.HOPE])
        negative_count = sum(1 for s in scene_profiles 
                           if s.primary_emotion in [EmotionType.SADNESS, EmotionType.ANGER, EmotionType.FEAR])
        
        if positive_count > negative_count + 3 and second_half_avg > first_half_avg:
            return ArcType.RISE
        elif negative_count > positive_count + 3 and second_half_avg < first_half_avg:
            return ArcType.FALL
        elif abs(first_half_avg - second_half_avg) < 0.1:
            return ArcType.FLAT
        
        return ArcType.COMPLEX
    
    def _classify_character_arc(self, beats: List[EmotionBeat]) -> Optional[ArcType]:
        if len(beats) < 3:
            return None
        
        intensities = [b.intensity for b in beats]
        
        if intensities[-1] > intensities[0] + 0.3:
            return ArcType.RISE
        elif intensities[-1] < intensities[0] - 0.3:
            return ArcType.FALL
        elif max(intensities) - min(intensities) > 0.5:
            return ArcType.COMPLEX
        
        return ArcType.FLAT
    
    def _generate_trend_description(self, scene_profiles: List[SceneEmotionProfile]) -> str:
        if not scene_profiles:
            return "No emotional data available"
        
        avg_intensity = sum(s.intensity for s in scene_profiles) / len(scene_profiles)
        
        if avg_intensity > 0.7:
            return "High-intensity emotional journey with dramatic peaks"
        elif avg_intensity > 0.5:
            return "Moderate emotional content with balanced tone"
        elif avg_intensity > 0.3:
            return "Generally subdued emotional landscape"
        else:
            return "Low-key emotional narrative"
    
    def _describe_character_arc(self, arc: CharacterEmotionArc) -> str:
        parts = []
        
        if arc.dominant_emotion:
            parts.append(f"primarily experiences {arc.dominant_emotion.value}")
        
        if arc.arc_type:
            parts.append(f"follows a {arc.arc_type.value} emotional pattern")
        
        if arc.emotional_range > 0.6:
            parts.append("with wide emotional swings")
        
        if parts:
            return f"{arc.character_name} " + ", ".join(parts) + "."
        return f"{arc.character_name} has minimal emotional expression."


def analyze_emotional_arcs(script: ParsedScript) -> EmotionalArcAnalysis:
    """Analyze emotional arcs in a parsed script."""
    analyzer = EmotionalArcAnalyzer()
    return analyzer.analyze_script(script)


def get_character_arc(script: ParsedScript, character_name: str) -> Optional[CharacterEmotionArc]:
    """Get emotional arc for a specific character."""
    analyzer = EmotionalArcAnalyzer()
    result = analyzer.analyze_script(script)
    
    if character_name in result.character_arcs:
        return result.character_arcs[character_name]
    
    for name, arc in result.character_arcs.items():
        if name.upper() == character_name.upper():
            return arc
    
    return None

