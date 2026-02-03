"""
Script Quality Analyzer

Analyzes script quality with multiple metrics.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import re
import statistics
from typing import Any, Dict, List, Optional

from .quality_types import (
    QualityMetric, QualityLevel, PacingIssue,
    MetricScore, DialogueAnalysis, PacingAnalysis,
    CharacterArcCheck, ConflictAnalysis,
    ScriptQualityReport, QualityVisualization
)


class ScriptQualityAnalyzer:
    """Analyzes script quality with multiple metrics."""
    
    DIALOGUE_PATTERN = re.compile(r'^[A-Z][A-Z\s]+\s*\(\d+\)?\s*$')
    
    ACTION_KEYWORDS = [
        'walks', 'runs', 'drives', 'sits', 'stands', 'enters', 'exits',
        'opens', 'closes', 'takes', 'grabs', 'throws', 'hits', 'kicks',
        'shoots', 'fights', 'chases', 'falls', 'jumps', 'climbs',
        'looks', 'watches', 'sees', 'hears', 'notices', 'discovers'
    ]
    
    CONFLICT_KEYWORDS = [
        'argues', 'fights', 'confronts', 'threatens', 'denies',
        'refuses', 'opposes', 'challenges', 'attacks', 'defends',
        'argues', 'debates', 'disagrees', 'conflicts', 'struggles'
    ]
    
    NAME_PATTERN = re.compile(r'\b([A-Z][a-z]+)\b')
    
    IDEAL_DIALOGUE_PCT = 0.45
    IDEAL_SCENE_LENGTH = 150
    
    def __init__(self):
        pass
    
    def analyze(self, script_text: str, title: str = "Untitled Script") -> ScriptQualityReport:
        """Analyze script quality."""
        report = ScriptQualityReport()
        report.script_title = title
        
        scenes = self._parse_scenes(script_text)
        lines = script_text.split('\n')
        
        report.dialogue_analysis = self._analyze_dialogue(lines)
        report.pacing_analysis = self._analyze_pacing(scenes)
        report.character_arc_check = self._check_character_arcs(script_text, scenes)
        report.conflict_analysis = self._analyze_conflict(scenes)
        
        report.metric_scores = self._calculate_metric_scores(report)
        report.overall_score = self._calculate_overall_score(report.metric_scores)
        report.overall_level = self._get_quality_level(report.overall_score)
        
        report.strengths = self._identify_strengths(report)
        report.weaknesses = self._identify_weaknesses(report)
        report.recommendations = self._generate_recommendations(report)
        
        return report
    
    def _parse_scenes(self, script_text: str) -> List[Dict[str, Any]]:
        """Parse script into scenes."""
        scenes = []
        lines = script_text.split('\n')
        
        current_scene = {'heading': 'Introduction', 'content': [], 'word_count': 0}
        
        scene_pattern = re.compile(r'^(?:INT\.|EXT\.|I\/E\.)\s*(.+?)(?:\s+-\s+(.+))?$', re.IGNORECASE)
        
        for line in lines:
            line = line.strip()
            scene_match = scene_pattern.match(line)
            
            if scene_match:
                if current_scene['content']:
                    current_scene['word_count'] = len(' '.join(current_scene['content']).split())
                    scenes.append(current_scene)
                current_scene = {'heading': line, 'content': [], 'word_count': 0}
            else:
                if line:
                    current_scene['content'].append(line)
        
        if current_scene['content']:
            current_scene['word_count'] = len(' '.join(current_scene['content']).split())
            scenes.append(current_scene)
        
        return scenes
    
    def _analyze_dialogue(self, lines: List[str]) -> DialogueAnalysis:
        """Analyze dialogue vs action ratio."""
        analysis = DialogueAnalysis()
        
        dialogue_count = 0
        action_count = 0
        description_count = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            analysis.total_lines += 1
            
            if self.DIALOGUE_PATTERN.match(line):
                dialogue_count += 1
            elif line.startswith('(') and line.endswith(')'):
                description_count += 1
            else:
                if any(kw in line.lower() for kw in self.ACTION_KEYWORDS):
                    action_count += 1
                else:
                    description_count += 1
        
        analysis.dialogue_lines = dialogue_count
        analysis.action_lines = action_count
        analysis.scene_description_lines = description_count
        
        if analysis.total_lines > 0:
            analysis.dialogue_percentage = dialogue_count / analysis.total_lines
            analysis.action_percentage = (action_count + description_count) / analysis.total_lines
        
        dialogue_pct = analysis.dialogue_percentage * 100
        
        if 35 <= dialogue_pct <= 55:
            analysis.assessment = "Good balance of dialogue and action"
            analysis.actual_ratio = f"{dialogue_pct:.0f}% dialogue - Balanced"
        elif dialogue_pct < 35:
            analysis.assessment = "Consider adding more dialogue for character development"
            analysis.actual_ratio = f"{dialogue_pct:.0f}% dialogue - Heavy on action"
        else:
            analysis.assessment = "Consider adding more action to maintain visual interest"
            analysis.actual_ratio = f"{dialogue_pct:.0f}% dialogue - Dialogue heavy"
        
        return analysis
    
    def _analyze_pacing(self, scenes: List[Dict[str, Any]]) -> PacingAnalysis:
        """Analyze story pacing."""
        analysis = PacingAnalysis()
        
        analysis.total_scenes = len(scenes)
        scene_lengths = [s['word_count'] for s in scenes if s['word_count'] > 0]
        analysis.scene_lengths = scene_lengths
        
        if not scene_lengths:
            return analysis
        
        analysis.avg_scene_length = statistics.mean(scene_lengths)
        
        if len(scene_lengths) > 1:
            analysis.median_scene_length = statistics.median(scene_lengths)
            analysis.std_deviation = statistics.stdev(scene_lengths)
        
        ideal = self.IDEAL_SCENE_LENGTH
        length_deviation = abs(analysis.avg_scene_length - ideal) / ideal
        
        if analysis.std_deviation > 0:
            consistency_score = 1.0 - min(analysis.std_deviation / ideal, 1.0)
        else:
            consistency_score = 1.0
        
        analysis.pacing_score = (1.0 - length_deviation * 0.5) * consistency_score
        analysis.pacing_score = max(0.0, min(1.0, analysis.pacing_score))
        analysis.pacing_level = self._get_quality_level(analysis.pacing_score)
        
        if analysis.avg_scene_length < ideal * 0.5:
            analysis.issues.append(PacingIssue.TOO_FAST)
            analysis.recommendations.append("Scenes may be too short. Consider adding more detail.")
        elif analysis.avg_scene_length > ideal * 2:
            analysis.issues.append(PacingIssue.TOO_SLOW)
            analysis.recommendations.append("Scenes may be too long. Consider trimming.")
        
        if analysis.std_deviation > ideal * 1.5:
            analysis.issues.append(PacingIssue.INCONSISTENT)
            analysis.recommendations.append("Scene lengths vary significantly. Consider balancing.")
        
        if not analysis.issues:
            analysis.recommendations.append("Pacing looks good overall.")
        
        return analysis
    
    def _check_character_arcs(self, script_text: str, scenes: List[Dict[str, Any]]) -> CharacterArcCheck:
        """Check character arc completeness."""
        check = CharacterArcCheck()
        
        names = set()
        for match in self.NAME_PATTERN.finditer(script_text):
            name = match.group(1)
            if name.lower() not in ['the', 'this', 'that', 'what', 'when', 'where', 'who', 'why', 'how']:
                names.add(name)
        
        check.characters = sorted(list(names))[:20]
        
        text_lower = script_text.lower()
        
        for name in check.characters[:10]:
            has_intro = any(kw in text_lower for kw in ['introduces', 'meets', 'discovers', 'begins'])
            has_resolution = any(kw in text_lower for kw in ['realizes', 'finally', 'concludes', 'achieves'])
            
            if has_intro and has_resolution:
                check.complete_arcs += 1
            elif has_intro:
                check.incomplete_arcs += 1
            else:
                check.missing_arcs.append(name)
        
        check.characters_with_arcs = check.complete_arcs + check.incomplete_arcs
        
        if check.characters:
            check.arc_completeness_score = (check.complete_arcs / len(check.characters)) * 0.7 + \
                                           (check.characters_with_arcs / len(check.characters)) * 0.3
        else:
            check.arc_completeness_score = 0.5
        
        if check.incomplete_arcs > 0:
            check.recommendations.append(f"{check.incomplete_arcs} character(s) have beginnings but incomplete arcs.")
        
        if check.missing_arcs:
            check.recommendations.append(f"Consider developing arcs for: {', '.join(check.missing_arcs[:3])}")
        
        return check
    
    def _analyze_conflict(self, scenes: List[Dict[str, Any]]) -> ConflictAnalysis:
        """Analyze conflict coverage."""
        analysis = ConflictAnalysis()
        
        analysis.total_scenes = len(scenes)
        
        conflict_types = {'internal': 0, 'interpersonal': 0, 'environmental': 0, 'dramatic': 0}
        scenes_with_conflict = 0
        
        for scene in scenes:
            content = ' '.join(scene['content']).lower()
            
            if any(kw in content for kw in self.CONFLICT_KEYWORDS):
                scenes_with_conflict += 1
                
                if any(w in content for w in ['thinks', 'feels', 'struggles']):
                    conflict_types['internal'] += 1
                if any(w in content for w in ['argues', 'fights', 'with']):
                    conflict_types['interpersonal'] += 1
                if any(w in content for w in ['weather', 'environment']):
                    conflict_types['environmental'] += 1
                if any(w in content for w in ['tension', 'stakes', 'danger']):
                    conflict_types['dramatic'] += 1
        
        analysis.scenes_with_conflict = scenes_with_conflict
        analysis.conflict_types = conflict_types
        
        if analysis.total_scenes > 0:
            analysis.conflict_coverage = scenes_with_conflict / analysis.total_scenes
        
        coverage = analysis.conflict_coverage
        
        if coverage < 0.5:
            analysis.recommendations.append("Consider adding more conflict to engage the audience.")
        elif coverage > 0.9:
            analysis.recommendations.append("High conflict coverage - ensure variety in conflict types.")
        else:
            analysis.recommendations.append("Good conflict coverage.")
        
        return analysis
    
    def _calculate_metric_scores(self, report: ScriptQualityReport) -> List[MetricScore]:
        """Calculate individual metric scores."""
        scores = []
        
        dialogue_pct = report.dialogue_analysis.dialogue_percentage if report.dialogue_analysis else 0
        dialogue_score = 1.0 - abs(dialogue_pct - self.IDEAL_DIALOGUE_PCT) * 2
        dialogue_score = max(0.0, min(1.0, dialogue_score))
        scores.append(MetricScore(
            metric=QualityMetric.DIALOGUE_ACTION_RATIO,
            score=dialogue_score,
            level=self._get_quality_level(dialogue_score),
            weight=0.25,
            details=f"Dialogue: {dialogue_pct*100:.0f}%"
        ))
        
        pacing_score = report.pacing_analysis.pacing_score if report.pacing_analysis else 0.5
        scores.append(MetricScore(
            metric=QualityMetric.PACING,
            score=pacing_score,
            level=self._get_quality_level(pacing_score),
            weight=0.25,
            details=f"Avg: {report.pacing_analysis.avg_scene_length:.0f} words"
        ))
        
        arc_score = report.character_arc_check.arc_completeness_score if report.character_arc_check else 0.5
        scores.append(MetricScore(
            metric=QualityMetric.CHARACTER_ARC,
            score=arc_score,
            level=self._get_quality_level(arc_score),
            weight=0.25,
            details=f"Complete: {report.character_arc_check.complete_arcs}"
        ))
        
        conflict_score = report.conflict_analysis.conflict_coverage if report.conflict_analysis else 0.5
        conflict_score = 1.0 - abs(conflict_score - 0.7) * 2
        conflict_score = max(0.0, min(1.0, conflict_score))
        scores.append(MetricScore(
            metric=QualityMetric.CONFLICT,
            score=conflict_score,
            level=self._get_quality_level(conflict_score),
            weight=0.25,
            details=f"Coverage: {report.conflict_analysis.conflict_coverage*100:.0f}%"
        ))
        
        return scores
    
    def _calculate_overall_score(self, metric_scores: List[MetricScore]) -> float:
        """Calculate weighted overall score."""
        if not metric_scores:
            return 0.5
        
        total_weight = sum(s.weight for s in metric_scores)
        weighted_sum = sum(s.score * s.weight for s in metric_scores)
        
        return weighted_sum / total_weight if total_weight > 0 else 0.5
    
    def _get_quality_level(self, score: float) -> QualityLevel:
        """Convert score to quality level."""
        if score >= 0.85:
            return QualityLevel.EXCELLENT
        elif score >= 0.70:
            return QualityLevel.GOOD
        elif score >= 0.50:
            return QualityLevel.AVERAGE
        elif score >= 0.30:
            return QualityLevel.NEEDS_IMPROVEMENT
        else:
            return QualityLevel.POOR
    
    def _identify_strengths(self, report: ScriptQualityReport) -> List[str]:
        """Identify script strengths."""
        strengths = []
        
        for score in report.metric_scores:
            if score.score >= 0.75:
                if score.metric == QualityMetric.DIALOGUE_ACTION_RATIO:
                    strengths.append("Good dialogue-to-action balance")
                elif score.metric == QualityMetric.PACING:
                    strengths.append("Consistent story pacing")
                elif score.metric == QualityMetric.CHARACTER_ARC:
                    strengths.append("Strong character development")
                elif score.metric == QualityMetric.CONFLICT:
                    strengths.append("Effective use of conflict")
        
        if not strengths:
            strengths.append("Script shows potential for further development")
        
        return strengths
    
    def _identify_weaknesses(self, report: ScriptQualityReport) -> List[str]:
        """Identify script weaknesses."""
        weaknesses = []
        
        for score in report.metric_scores:
            if score.score < 0.50:
                if score.metric == QualityMetric.DIALOGUE_ACTION_RATIO:
                    weaknesses.append("Dialogue-to-action ratio needs adjustment")
                elif score.metric == QualityMetric.PACING:
                    weaknesses.append("Pacing issues detected")
                elif score.metric == QualityMetric.CHARACTER_ARC:
                    weaknesses.append("Character arcs may be incomplete")
                elif score.metric == QualityMetric.CONFLICT:
                    weaknesses.append("Conflict coverage could be improved")
        
        return weaknesses
    
    def _generate_recommendations(self, report: ScriptQualityReport) -> List[str]:
        """Generate specific recommendations."""
        recommendations = []
        
        if report.dialogue_analysis:
            dialogue_pct = report.dialogue_analysis.dialogue_percentage * 100
            if dialogue_pct < 35:
                recommendations.append("Add more dialogue to develop characters.")
            elif dialogue_pct > 55:
                recommendations.append("Consider converting some dialogue to action.")
        
        if report.pacing_analysis and report.pacing_analysis.recommendations:
            recommendations.extend(report.pacing_analysis.recommendations)
        
        if report.character_arc_check and report.character_arc_check.recommendations:
            recommendations.extend(report.character_arc_check.recommendations)
        
        if report.conflict_analysis and report.conflict_analysis.recommendations:
            recommendations.extend(report.conflict_analysis.recommendations)
        
        return recommendations
    
    def generate_visualization(self, report: ScriptQualityReport) -> QualityVisualization:
        """Generate visualization data."""
        viz = QualityVisualization()
        
        viz.radar_data = {
            "type": "radar",
            "data": {
                "labels": ["Dialogue/Action", "Pacing", "Character Arcs", "Conflict"],
                "datasets": [{
                    "label": "Quality Scores",
                    "data": [s.score for s in report.metric_scores],
                    "backgroundColor": "rgba(54, 162, 235, 0.2)",
                    "borderColor": "rgb(54, 162, 235)"
                }]
            }
        }
        
        viz.bar_data = {
            "type": "bar",
            "data": {
                "labels": ["Dialogue", "Pacing", "Arcs", "Conflict"],
                "datasets": [{
                    "label": "Score",
                    "data": [s.score for s in report.metric_scores],
                    "backgroundColor": ["rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(255, 99, 132)"]
                }]
            }
        }
        
        return viz


def analyze_script_quality(script_text: str, title: str = "Untitled Script") -> ScriptQualityReport:
    """Analyze script quality."""
    analyzer = ScriptQualityAnalyzer()
    return analyzer.analyze(script_text, title)


def generate_quality_visualization(report: ScriptQualityReport) -> QualityVisualization:
    """Generate visualization data from quality report."""
    analyzer = ScriptQualityAnalyzer()
    return analyzer.generate_visualization(report)

