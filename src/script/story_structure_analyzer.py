"""
Story Structure Analyzer

This module analyzes story structure from Story.md/Story.txt files,
detects three-act structure, identifies plot points, and generates
visualization data.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .story_structure_types import (
    StructureType, PlotPointType,
    PlotPoint, Act, CharacterArc, Theme, TensionPoint,
    StoryStructureAnalysis, VisualizationData
)

logger = logging.getLogger(__name__)


class StoryStructureAnalyzer:
    """Analyze story structure from text files."""
    
    CHAPTER_PATTERNS = [
        r'^#+\s*(chapter|part|act|section)\s*(\d+|[IVXLC]+)',
        r'^(chapter|part|act|section)\s*(\d+|[IVXLC]+)[:\.]',
        r'^(\d+)\.\s+[A-Z]',
    ]
    
    PLOT_INDICATORS = {
        PlotPointType.INCITING_INCIDENT: [
            'inciting incident', 'everything changes', 'normal world',
            'first complication', 'story begins', 'conflict emerges'
        ],
        PlotPointType.MIDPOINT: [
            'midpoint', 'turning point', 'revelation', 'major discovery',
            'point of no return', 'reversal'
        ],
        PlotPointType.ALL_IS_LOST: [
            'all is lost', 'rock bottom', 'dark night', 'lowest point',
            'major setback', 'everything falls apart'
        ],
        PlotPointType.CLIMAX: [
            'climax', 'final confrontation', 'climactic', 'peak tension',
            'final battle', 'decisive action'
        ],
        PlotPointType.RESOLUTION: [
            'resolution', 'conclusion', 'ending', 'aftermath',
            'lives on', 'new normal', 'epilogue'
        ],
    }
    
    THEME_PATTERNS = {
        'love': ['love', 'romance', 'heart', 'passion', 'relationship'],
        'death': ['death', 'die', 'loss', 'grief', 'mortality', 'sacrifice'],
        'power': ['power', 'control', 'authority', 'influence', 'dominance'],
        'identity': ['identity', 'self', 'who am i', 'discover', 'become'],
        'justice': ['justice', 'fairness', 'right', 'wrong', 'moral'],
        'freedom': ['freedom', 'liberty', 'escape', 'trap', 'bound'],
        'family': ['family', 'parent', 'child', 'mother', 'father'],
        'redemption': ['redeem', 'forgive', 'atone', 'second chance'],
    }
    
    TENSION_BUILDERS = [
        'suddenly', 'but', 'however', 'yet', 'until', 'then',
        'unfortunately', 'tragically', 'horrifying', 'shocking',
        'argument', 'fight', 'confrontation', 'threat', 'danger',
        'secret', 'revelation', 'betrayal', 'lie', 'deception'
    ]
    
    def __init__(self):
        pass
    
    def analyze_file(self, file_path: str) -> StoryStructureAnalysis:
        """Analyze story structure from a file."""
        content = self._read_file(file_path)
        if not content:
            return StoryStructureAnalysis()
        
        return self.analyze_text(content, Path(file_path).stem)
    
    def analyze_text(
        self,
        text: str,
        title: str = "Untitled Story"
    ) -> StoryStructureAnalysis:
        """Analyze story structure from text."""
        analysis = StoryStructureAnalysis()
        analysis.title = title
        
        chapters = self._parse_chapters(text)
        analysis.total_chapters = len(chapters)
        
        if not chapters:
            return analysis
        
        analysis.structure_type = self._detect_structure_type(len(chapters))
        analysis.acts = self._create_acts(chapters, analysis.structure_type)
        analysis.plot_points = self._find_plot_points(chapters)
        analysis.themes = self._extract_themes(text)
        analysis.tension_curve = self._build_tension_curve(chapters)
        analysis.character_arcs = self._extract_character_arcs(text, chapters)
        
        analysis.overall_tension_trend = self._describe_trend(analysis.tension_curve)
        analysis.complexity_score = self._calculate_complexity(chapters, analysis.plot_points)
        analysis.pacing_assessment = self._assess_pacing(analysis.tension_curve)
        
        return analysis
    
    def _read_file(self, file_path: str) -> str:
        """Read story file content."""
        try:
            path = Path(file_path)
            if path.exists():
                return path.read_text(encoding='utf-8')
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
        return ""
    
    def _parse_chapters(self, text: str) -> List[Dict[str, Any]]:
        """Parse text into chapters/sections."""
        chapters = []
        lines = text.split('\n')
        
        current_chapter = {
            'number': 1,
            'title': 'Introduction',
            'content': [],
            'start_line': 0
        }
        
        for i, line in enumerate(lines):
            chapter_match = self._detect_chapter_heading(line)
            
            if chapter_match:
                if current_chapter['content']:
                    chapters.append(current_chapter)
                
                current_chapter = {
                    'number': chapter_match[0],
                    'title': chapter_match[1] or f"Chapter {chapter_match[0]}",
                    'content': [],
                    'start_line': i
                }
            else:
                current_chapter['content'].append(line)
        
        if current_chapter['content']:
            chapters.append(current_chapter)
        
        return chapters
    
    def _detect_chapter_heading(self, line: str) -> Optional[Tuple[int, str]]:
        """Detect if line is a chapter heading."""
        line_stripped = line.strip()
        
        for pattern in self.CHAPTER_PATTERNS:
            match = re.search(pattern, line_stripped, re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    try:
                        num = int(groups[1]) if groups[1].isdigit() else self._roman_to_int(groups[1])
                        return (num, groups[0])
                    except:
                        pass
        
        if re.match(r'^(chapter|part|act)?\s*\d+\s*[:\.]?\s*$', line_stripped, re.IGNORECASE):
            match = re.match(r'^(?:chapter|part|act)?\s*(\d+)', line_stripped, re.IGNORECASE)
            if match:
                return (int(match.group(1)), None)
        
        return None
    
    def _roman_to_int(self, roman: str) -> int:
        """Convert Roman numeral to integer."""
        roman = roman.upper()
        vals = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
        result = 0
        for i in range(len(roman)):
            if i > 0 and vals[roman[i]] > vals[roman[i-1]]:
                result += vals[roman[i]] - 2 * vals[roman[i-1]]
            else:
                result += vals[roman[i]]
        return result
    
    def _detect_structure_type(self, chapter_count: int) -> StructureType:
        """Detect the story structure type based on chapter count."""
        if chapter_count <= 3:
            return StructureType.THREE_ACT
        elif chapter_count <= 7:
            return StructureType.SEVEN_POINT
        elif chapter_count <= 15:
            return StructureType.SAVE_THE_CAT
        else:
            return StructureType.HEROS_JOURNEY
    
    def _create_acts(
        self,
        chapters: List[Dict[str, Any]],
        structure_type: StructureType
    ) -> List[Act]:
        """Create act divisions based on structure type."""
        acts = []
        total = len(chapters)
        
        if structure_type == StructureType.THREE_ACT:
            act1_end = max(1, total // 3)
            act2_end = max(act1_end + 1, (total * 2) // 3)
            
            acts.append(Act(
                act_number=1, name="Setup", start_chapter=1, end_chapter=act1_end,
                description="Introduce characters, world, and inciting incident"
            ))
            acts.append(Act(
                act_number=2, name="Confrontation", start_chapter=act1_end + 1, end_chapter=act2_end,
                description="Complications arise, stakes increase"
            ))
            acts.append(Act(
                act_number=3, name="Resolution", start_chapter=act2_end + 1, end_chapter=total,
                description="Climax and resolution of conflict"
            ))
        
        else:
            act_size = max(1, total // 3)
            for i in range(3):
                acts.append(Act(
                    act_number=i + 1,
                    name=f"Part {i + 1}",
                    start_chapter=i * act_size + 1,
                    end_chapter=min((i + 1) * act_size, total),
                    description=f"Part {i + 1} of the story"
                ))
        
        return acts
    
    def _find_plot_points(self, chapters: List[Dict[str, Any]]) -> List[PlotPoint]:
        """Identify key plot points in the story."""
        plot_points = []
        
        for i, chapter in enumerate(chapters):
            content = ' '.join(chapter['content']).lower()
            chapter_num = chapter['number']
            
            for point_type, indicators in self.PLOT_INDICATORS.items():
                for indicator in indicators:
                    if indicator in content:
                        existing = [p for p in plot_points if p.point_type == point_type]
                        if not existing:
                            position_factor = i / len(chapters) if chapters else 0.5
                            
                            if point_type == PlotPointType.CLIMAX:
                                tension = 0.9
                            elif point_type == PlotPointType.ALL_IS_LOST:
                                tension = 0.85
                            elif point_type == PlotPointType.MIDPOINT:
                                tension = 0.7
                            elif point_type == PlotPointType.INCITING_INCIDENT:
                                tension = 0.5
                            else:
                                tension = 0.3 + (0.4 * position_factor)
                            
                            plot_points.append(PlotPoint(
                                name=f"{point_type.value.replace('_', ' ').title()} in Chapter {chapter_num}",
                                point_type=point_type,
                                chapter=chapter_num,
                                description=f"Key event in Chapter {chapter_num}",
                                tension_level=tension
                            ))
                            break
        
        if not plot_points:
            total = len(chapters)
            plot_points = [
                PlotPoint("Inciting Incident", PlotPointType.INCITING_INCIDENT, 1,
                         "Story begins", 0.5),
                PlotPoint("Midpoint", PlotPointType.MIDPOINT, max(1, total // 2),
                         "Turning point", 0.7),
                PlotPoint("Climax", PlotPointType.CLIMAX, total,
                         "Final confrontation", 0.9),
            ]
        
        return plot_points
    
    def _extract_themes(self, text: str) -> List[Theme]:
        """Extract major themes from the text."""
        text_lower = text.lower()
        themes = []
        
        for theme_name, keywords in self.THEME_PATTERNS.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            if count > 0:
                strength = min(1.0, count / 10)
                themes.append(Theme(
                    name=theme_name.title(),
                    strength=strength,
                    occurrences=[f"Mentioned {count} times"]
                ))
        
        themes.sort(key=lambda t: t.strength, reverse=True)
        return themes[:5]
    
    def _build_tension_curve(self, chapters: List[Dict[str, Any]]) -> List[TensionPoint]:
        """Build tension curve across chapters."""
        curve = []
        
        for chapter in chapters:
            content = ' '.join(chapter['content'])
            tension = self._calculate_chapter_tension(content)
            summary = self._extract_significant_sentence(content)
            
            curve.append(TensionPoint(
                chapter=chapter['number'],
                tension_level=tension,
                event_summary=summary or f"Chapter {chapter['number']}"
            ))
        
        return curve
    
    def _calculate_chapter_tension(self, content: str) -> float:
        """Calculate tension level for a chapter."""
        tension_score = 0.3
        content_lower = content.lower()
        
        for builder in self.TENSION_BUILDERS:
            if builder in content_lower:
                tension_score += 0.1
        
        high_tension_words = ['fight', 'battle', 'chase', 'crash', 'death', 'killed']
        for word in high_tension_words:
            if word in content_lower:
                tension_score += 0.15
        
        return min(1.0, max(0.0, tension_score))
    
    def _extract_significant_sentence(self, content: str) -> str:
        """Extract a significant sentence from content."""
        sentences = re.split(r'[.!?]+', content)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20 and len(sentence) < 200:
                if any(kw in sentence.lower() for kw in ['decides', 'discovers', 'reveals', 'confronts']):
                    return sentence
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 30:
                return sentence
        
        return ""
    
    def _extract_character_arcs(
        self,
        text: str,
        chapters: List[Dict[str, Any]]
    ) -> List[CharacterArc]:
        """Extract character arcs from the story."""
        arcs = []
        
        protagonist_patterns = [
            r'protagonist[:\s]+([A-Z][a-z]+)',
            r'main character[:\s]+([A-Z][a-z]+)',
            r'hero[:\s]+([A-Z][a-z]+)',
        ]
        
        protagonist = "Protagonist"
        for pattern in protagonist_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                protagonist = match.group(1)
                break
        
        arcs.append(CharacterArc(
            character_name=protagonist,
            role="protagonist",
            arc_type="positive",
            starting_state="faces challenge",
            ending_state="achieves goal",
            key_moments=["Beginning", "Midpoint challenge", "Final triumph"]
        ))
        
        antagonist_match = re.search(r'antagonist[:\s]+([A-Z][a-z]+)', text, re.IGNORECASE)
        if antagonist_match:
            arcs.append(CharacterArc(
                character_name=antagonist_match.group(1),
                role="antagonist",
                arc_type="negative",
                starting_state="opposes protagonist",
                ending_state="defeated",
                key_moments=["Introduction", "Major obstacle", "Final defeat"]
            ))
        
        return arcs
    
    def _describe_trend(self, curve: List[TensionPoint]) -> str:
        """Describe the overall tension trend."""
        if len(curve) < 2:
            return "Insufficient data"
        
        first = curve[0].tension_level
        last = curve[-1].tension_level
        peaks = [c.tension_level for c in curve]
        
        if last > first + 0.3:
            return "Rising tension with strong climax"
        elif last < first - 0.2:
            return "Tension release toward conclusion"
        elif max(peaks) - min(peaks) > 0.5:
            return "Dramatic ups and downs"
        else:
            return "Consistent tension throughout"
    
    def _calculate_complexity(
        self,
        chapters: List[Dict[str, Any]],
        plot_points: List[PlotPoint]
    ) -> float:
        """Calculate story complexity score."""
        chapter_count = len(chapters)
        plot_point_count = len(plot_points)
        
        complexity = min(1.0, (chapter_count / 20) * 0.5 + (plot_point_count / 10) * 0.5)
        return complexity
    
    def _assess_pacing(self, curve: List[TensionPoint]) -> str:
        """Assess story pacing."""
        if len(curve) < 3:
            return "Unable to assess"
        
        tensions = [c.tension_level for c in curve]
        rising = sum(1 for i in range(1, len(tensions)) if tensions[i] > tensions[i-1])
        falling = sum(1 for i in range(1, len(tensions)) if tensions[i] < tensions[i-1])
        
        ratio = rising / max(1, falling)
        
        if ratio > 1.5:
            return "Fast-paced with building tension"
        elif ratio < 0.7:
            return "Slower pacing with tension releases"
        else:
            return "Balanced pacing with natural rhythm"
    
    def generate_visualization_data(
        self,
        analysis: StoryStructureAnalysis
    ) -> VisualizationData:
        """Generate visualization-friendly data from analysis."""
        viz = VisualizationData()
        
        viz.tension_chart = {
            "type": "line",
            "data": {
                "labels": [f"Ch {c.chapter}" for c in analysis.tension_curve],
                "datasets": [{
                    "label": "Tension Level",
                    "data": [c.tension_level for c in analysis.tension_curve],
                    "borderColor": "rgb(255, 99, 132)",
                    "backgroundColor": "rgba(255, 99, 132, 0.2)",
                    "fill": True,
                    "tension": 0.4
                }]
            },
            "options": {"responsive": True}
        }
        
        if analysis.acts:
            viz.structure_chart = {
                "type": "bar",
                "data": {
                    "labels": [f"Act {a.act_number}" for a in analysis.acts],
                    "datasets": [{
                        "label": "Chapters",
                        "data": [a.end_chapter - a.start_chapter + 1 for a in analysis.acts],
                    }]
                }
            }
        
        return viz


def analyze_story_file(file_path: str) -> StoryStructureAnalysis:
    """Analyze story structure from a file."""
    analyzer = StoryStructureAnalyzer()
    return analyzer.analyze_file(file_path)


def analyze_story_text(text: str, title: str = "Untitled") -> StoryStructureAnalysis:
    """Analyze story structure from text."""
    analyzer = StoryStructureAnalyzer()
    return analyzer.analyze_text(text, title)


def generate_story_visualization(analysis: StoryStructureAnalysis) -> VisualizationData:
    """Generate visualization data from story analysis."""
    analyzer = StoryStructureAnalyzer()
    return analyzer.generate_visualization_data(analysis)

