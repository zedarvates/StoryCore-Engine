"""
Scene Timing Analyzer

Estimates scene and script runtime from script analysis.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import re
import statistics
from typing import Any, Dict, List, Optional

from .timing_types import (
    TimingUnit, ComplexityLevel, ActionIntensity, DialogueSpeed,
    DialogueTiming, ActionTiming, SceneComplexity,
    SceneTiming, ScriptTimingReport, TimingVisualization
)


class SceneTimingAnalyzer:
    """Estimates scene and script timing from script text."""
    
    DIALOGUE_PATTERN = re.compile(r'^[A-Z][A-Z\s]+\s*\(\d+\)?\s*$')
    
    ACTION_KEYWORDS = {
        'walks': 1.0, 'sits': 1.0, 'stands': 1.0, 'looks': 1.0,
        'watches': 1.0, 'thinks': 1.0, 'says': 1.0,
        'runs': 1.5, 'drives': 1.5, 'enters': 1.5, 'exits': 1.5,
        'opens': 1.5, 'closes': 1.5, 'takes': 1.5, 'grabs': 1.5,
        'fighting': 2.0, 'chasing': 2.0, 'jumping': 2.0,
        'falling': 2.0, 'climbing': 2.0, 'shooting': 2.0,
        'explosion': 3.0, 'crash': 3.0, 'battle': 3.0, 'fight': 2.5
    }
    
    MOVEMENT_PATTERNS = [
        'walking', 'running', 'driving', 'flying', 'riding',
        'entering', 'exiting', 'approaching', 'leaving',
        'standing', 'sitting', 'lying', 'kneeling'
    ]
    
    COMPLEXITY_INDICATORS = {
        'multiple characters': 0.15, 'crowd': 0.2,
        'fight scene': 0.2, 'chase scene': 0.15, 'battle': 0.2,
        'emotional': 0.1, 'intense': 0.15, 'dramatic': 0.1,
        'special effects': 0.15, 'stunt': 0.15, 'visual effects': 0.15,
        'montage': 0.1, 'flashback': 0.1
    }
    
    WORDS_PER_PAGE = 250
    SECONDS_PER_PAGE = 60
    BASE_ACTION_SECONDS = 3.0
    TRANSITION_SECONDS = 5.0
    
    def __init__(self):
        pass
    
    def analyze(
        self,
        script_text: str,
        title: str = "Untitled Script",
        dialogue_speed: DialogueSpeed = DialogueSpeed.NORMAL
    ) -> ScriptTimingReport:
        """Analyze script and estimate timing."""
        report = ScriptTimingReport()
        report.script_title = title
        
        scenes = self._parse_scenes(script_text)
        
        scene_timings = []
        total_dialogue = 0.0
        total_action = 0.0
        complexity_dist = {'simple': 0, 'moderate': 0, 'complex': 0, 'very_complex': 0}
        
        for scene in scenes:
            timing = self._analyze_scene_timing(scene, dialogue_speed)
            scene_timings.append(timing)
            
            total_dialogue += timing.dialogue_seconds
            total_action += timing.action_seconds
            
            level = timing.complexity.level.value
            if level in complexity_dist:
                complexity_dist[level] += 1
        
        report.scene_timings = scene_timings
        report.total_scenes = len(scene_timings)
        
        transition_time = report.total_scenes * self.TRANSITION_SECONDS
        report.total_duration_seconds = total_dialogue + total_action + transition_time
        report.total_duration_minutes = report.total_duration_seconds / 60
        report.estimated_pages = len(script_text.split()) / self.WORDS_PER_PAGE
        
        if scene_timings:
            durations = [s.estimated_duration_seconds for s in scene_timings]
            report.avg_scene_duration = statistics.mean(durations)
            report.longest_scene = max(scene_timings, key=lambda s: s.estimated_duration_seconds)
            report.shortest_scene = min(scene_timings, key=lambda s: s.estimated_duration_seconds)
        
        report.total_dialogue_seconds = total_dialogue
        report.total_action_seconds = total_action
        
        if report.total_duration_seconds > 0:
            report.dialogue_percentage = (total_dialogue / report.total_duration_seconds) * 100
            report.action_percentage = (total_action / report.total_duration_seconds) * 100
        
        report.complexity_distribution = complexity_dist
        
        return report
    
    def _parse_scenes(self, script_text: str) -> List[Dict[str, Any]]:
        """Parse script into scenes with content."""
        scenes = []
        lines = script_text.split('\n')
        
        current_scene = {'heading': 'Introduction', 'content': [], 'scene_number': 1}
        
        scene_pattern = re.compile(r'^(?:INT\.|EXT\.|I\/E\.)\s*(.+?)(?:\s+-\s+(.+))?$', re.IGNORECASE)
        
        for line in lines:
            line = line.strip()
            scene_match = scene_pattern.match(line)
            
            if scene_match:
                if current_scene['content']:
                    scenes.append(current_scene)
                current_scene = {'heading': line, 'content': [], 'scene_number': len(scenes) + 1}
            else:
                if line:
                    current_scene['content'].append(line)
        
        if current_scene['content']:
            scenes.append(current_scene)
        
        return scenes
    
    def _analyze_scene_timing(
        self,
        scene: Dict[str, Any],
        dialogue_speed: DialogueSpeed
    ) -> SceneTiming:
        """Analyze timing for a single scene."""
        timing = SceneTiming()
        timing.scene_number = scene['scene_number']
        timing.scene_heading = scene['heading']
        
        content = ' '.join(scene['content'])
        lines = [l for l in scene['content'] if l.strip()]
        
        timing.total_lines = len(lines)
        timing.word_count = len(content.split())
        
        dialogue_timing = self._analyze_dialogue(lines, dialogue_speed)
        timing.dialogue_timing = dialogue_timing
        timing.dialogue_seconds = dialogue_timing.estimated_seconds
        
        action_timing = self._analyze_action(lines, content)
        timing.action_timing = action_timing
        timing.action_seconds = action_timing.estimated_seconds
        
        complexity = self._analyze_complexity(content, lines)
        timing.complexity = complexity
        
        base_duration = timing.dialogue_seconds + timing.action_seconds
        timing.estimated_duration_seconds = base_duration * complexity.adjustment_factor
        timing.transition_seconds = self.TRANSITION_SECONDS
        timing.estimated_duration_seconds += timing.transition_seconds
        
        timing.estimated_pages = timing.word_count / self.WORDS_PER_PAGE
        
        return timing
    
    def _analyze_dialogue(
        self,
        lines: List[str],
        speed: DialogueSpeed
    ) -> DialogueTiming:
        """Analyze dialogue timing."""
        timing = DialogueTiming()
        timing.speed_setting = speed
        
        dialogue_words = 0
        dialogue_lines = 0
        speakers = set()
        
        for line in lines:
            line = line.strip()
            
            if self.DIALOGUE_PATTERN.match(line):
                dialogue_lines += 1
                
                speaker_match = re.match(r'^([A-Z][A-Z\s]+)', line)
                if speaker_match:
                    speaker = speaker_match.group(1).strip()
                    if speaker and len(speaker) < 20:
                        speakers.add(speaker)
                
                content = re.sub(r'\([^)]*\)', '', line)
                dialogue_words += len(content.split())
            
            elif line.startswith('"') or '"' in line:
                dialogue_lines += 1
                dialogue_words += len(line.split())
        
        timing.word_count = dialogue_words
        timing.dialogue_lines = dialogue_lines
        timing.speakers = sorted(list(speakers))
        
        words_per_second = speed.value
        timing.estimated_seconds = dialogue_words / words_per_second
        
        return timing
    
    def _analyze_action(
        self,
        lines: List[str],
        content: str
    ) -> ActionTiming:
        """Analyze action timing."""
        timing = ActionTiming()
        
        action_lines = 0
        intensity_scores = []
        movements = []
        
        content_lower = content.lower()
        
        for line in lines:
            line = line.strip()
            
            if self.DIALOGUE_PATTERN.match(line):
                continue
            
            has_action_kw = any(kw in line.lower() for kw in self.ACTION_KEYWORDS.keys())
            
            if has_action_kw or (len(line) > 10 and not line.startswith('(')):
                action_lines += 1
                
                line_lower = line.lower()
                intensity = 1.0
                for kw, mult in self.ACTION_KEYWORDS.items():
                    if kw in line_lower:
                        intensity = max(intensity, mult)
                        break
                
                intensity_scores.append(intensity)
                
                for movement in self.MOVEMENT_PATTERNS:
                    if movement in line_lower:
                        if movement not in movements:
                            movements.append(movement)
                        break
        
        timing.line_count = action_lines
        
        if intensity_scores:
            avg_intensity = statistics.mean(intensity_scores)
        else:
            avg_intensity = 1.0
        
        if avg_intensity >= 2.5:
            timing.intensity = ActionIntensity.VERY_HIGH
        elif avg_intensity >= 1.75:
            timing.intensity = ActionIntensity.HIGH
        elif avg_intensity >= 1.25:
            timing.intensity = ActionIntensity.MEDIUM
        else:
            timing.intensity = ActionIntensity.LOW
        
        timing.movements = movements[:5]
        timing.estimated_seconds = action_lines * self.BASE_ACTION_SECONDS * avg_intensity
        
        return timing
    
    def _analyze_complexity(
        self,
        content: str,
        lines: List[str]
    ) -> SceneComplexity:
        """Analyze scene complexity."""
        complexity = SceneComplexity()
        
        content_lower = content.lower()
        factors = []
        complexity_score = 0.0
        
        for indicator, score in self.COMPLEXITY_INDICATORS.items():
            if indicator in content_lower:
                complexity_score += score
                factors.append(indicator.title())
        
        complexity_score = min(1.0, complexity_score)
        complexity.score = complexity_score
        
        if complexity_score >= 0.6:
            complexity.level = ComplexityLevel.VERY_COMPLEX
        elif complexity_score >= 0.35:
            complexity.level = ComplexityLevel.COMPLEX
        elif complexity_score >= 0.15:
            complexity.level = ComplexityLevel.MODERATE
        else:
            complexity.level = ComplexityLevel.SIMPLE
        
        complexity.adjustment_factor = 1.0 + (complexity_score * 0.5)
        complexity.factors = factors[:5]
        
        return complexity
    
    def generate_visualization(self, report: ScriptTimingReport) -> TimingVisualization:
        """Generate visualization data from timing report."""
        viz = TimingVisualization()
        
        viz.timeline_data = {
            "type": "bar",
            "data": {
                "labels": [f"S{s.scene_number}" for s in report.scene_timings],
                "datasets": [
                    {"label": "Dialogue", "data": [s.dialogue_seconds for s in report.scene_timings]},
                    {"label": "Action", "data": [s.action_seconds for s in report.scene_timings]},
                    {"label": "Transition", "data": [s.transition_seconds for s in report.scene_timings]}
                ]
            }
        }
        
        viz.breakdown_data = {
            "type": "pie",
            "data": {
                "labels": ["Dialogue", "Action", "Transitions"],
                "datasets": [{
                    "data": [
                        report.total_dialogue_seconds,
                        report.total_action_seconds,
                        report.total_scenes * self.TRANSITION_SECONDS
                    ]
                }]
            }
        }
        
        return viz


def estimate_script_timing(
    script_text: str,
    title: str = "Untitled Script",
    dialogue_speed: DialogueSpeed = DialogueSpeed.NORMAL
) -> ScriptTimingReport:
    """Estimate script timing."""
    analyzer = SceneTimingAnalyzer()
    return analyzer.analyze(script_text, title, dialogue_speed)


def generate_timing_visualization(report: ScriptTimingReport) -> TimingVisualization:
    """Generate visualization data from timing report."""
    analyzer = SceneTimingAnalyzer()
    return analyzer.generate_visualization(report)

