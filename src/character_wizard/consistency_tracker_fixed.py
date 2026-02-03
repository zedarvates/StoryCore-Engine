"""
Character Consistency Tracker Module

This module tracks and maintains character consistency across scenes, ensuring that
character appearances, behaviors, and attributes remain coherent throughout a production.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path


class ConsistencyMetric(Enum):
    """Metrics for measuring character consistency."""
    APPEARANCE = "appearance"
    PERSONALITY = "personality"
    BEHAVIOR = "behavior"
    DIALOGUE = "dialogue"
    RELATIONSHIPS = "relationships"
    ABILITIES = "abilities"


class ConsistencyLevel(Enum):
    """Consistency quality levels."""
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    NEEDS_ATTENTION = "needs_attention"
    PROBLEMATIC = "problematic"


@dataclass
class CharacterSnapshot:
    """A snapshot of a character's state at a point in time."""
    snapshot_id: str
    character_id: str
    scene_number: int
    timestamp: datetime
    appearance_data: Dict[str, Any]
    personality_data: Dict[str, Any]
    behavior_observed: List[str]
    dialogue_samples: List[str]
    active_relationships: List[str]
    variations: List[str]
    notes: str = ""


@dataclass
class ConsistencyIssue:
    """A detected consistency issue."""
    issue_id: str
    character_id: str
    metric: ConsistencyMetric
    severity: str
    description: str
    scene_numbers: List[int]
    suggested_fix: str
    detected_at: datetime


@dataclass
class ConsistencyReport:
    """A comprehensive consistency report."""
    report_id: str
    character_id: str
    generated_at: datetime
    total_scenes: int
    overall_score: float
    consistency_level: ConsistencyLevel
    metric_scores: Dict[str, float]
    issues: List[ConsistencyIssue]
    recommendations: List[str]
    trend: str
    snapshot_count: int


class CharacterConsistencyTracker:
    """
    Tracks and maintains character consistency across scenes.
    """
    
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path
        self.snapshots: Dict[str, List[CharacterSnapshot]] = {}
        self.issues: List[ConsistencyIssue] = []
        self.baselines: Dict[str, Dict[str, Any]] = {}
        
        self.thresholds = {
            ConsistencyLevel.EXCELLENT: 0.95,
            ConsistencyLevel.GOOD: 0.85,
            ConsistencyLevel.ACCEPTABLE: 0.70,
            ConsistencyLevel.NEEDS_ATTENTION: 0.50,
        }
        
        if storage_path and Path(storage_path).exists():
            self._load_data()
    
    def create_snapshot(
        self,
        character_id: str,
        scene_number: int,
        appearance_data: Dict[str, Any],
        personality_data: Dict[str, Any],
        behavior_observed: List[str] = None,
        dialogue_samples: List[str] = None,
        active_relationships: List[str] = None,
        notes: str = ""
    ) -> CharacterSnapshot:
        """Create and store a snapshot of a character at a scene."""
        snapshot = CharacterSnapshot(
            snapshot_id=str(uuid.uuid4()),
            character_id=character_id,
            scene_number=scene_number,
            timestamp=datetime.now(),
            appearance_data=appearance_data,
            personality_data=personality_data,
            behavior_observed=behavior_observed or [],
            dialogue_samples=dialogue_samples or [],
            active_relationships=active_relationships or [],
            variations=[],
            notes=notes
        )
        
        if character_id not in self.snapshots:
            self.snapshots[character_id] = []
            self.baselines[character_id] = {
                'appearance': appearance_data.copy(),
                'personality': personality_data.copy(),
                'behaviors': behavior_observed.copy() if behavior_observed else [],
            }
        
        variations = self._detect_variations(character_id, snapshot)
        snapshot.variations = variations
        
        self.snapshots[character_id].append(snapshot)
        self._check_consistency_issues(character_id)
        
        if self.storage_path:
            self._save_data()
        
        return snapshot
    
    def get_snapshots(self, character_id: str) -> List[CharacterSnapshot]:
        return self.snapshots.get(character_id, [])
    
    def get_snapshot_at_scene(self, character_id: str, scene_number: int) -> Optional[CharacterSnapshot]:
        for snapshot in self.snapshots.get(character_id, []):
            if snapshot.scene_number == scene_number:
                return snapshot
        return None
    
    def calculate_consistency_score(
        self,
        character_id: str,
        metric: Optional[ConsistencyMetric] = None
    ) -> float:
        snapshots = self.snapshots.get(character_id, [])
        if len(snapshots) < 2:
            return 1.0
        
        if metric:
            return self._calculate_metric_score(character_id, metric)
        
        scores = []
        for m in ConsistencyMetric:
            scores.append(self._calculate_metric_score(character_id, m))
        
        weights = [0.25, 0.25, 0.20, 0.15, 0.10, 0.05]
        return sum(s * w for s, w in zip(scores, weights))
    
    def _calculate_metric_score(
        self,
        character_id: str,
        metric: ConsistencyMetric
    ) -> float:
        snapshots = self.snapshots.get(character_id, [])
        baseline = self.baselines.get(character_id, {})
        
        if len(snapshots) < 2:
            return 1.0
        
        if metric == ConsistencyMetric.APPEARANCE:
            return self._score_appearance_consistency(snapshots, baseline)
        elif metric == ConsistencyMetric.PERSONALITY:
            return self._score_personality_consistency(snapshots, baseline)
        elif metric == ConsistencyMetric.BEHAVIOR:
            return self._score_behavior_consistency(snapshots, baseline)
        elif metric == ConsistencyMetric.DIALOGUE:
            return self._score_dialogue_consistency(snapshots)
        elif metric == ConsistencyMetric.RELATIONSHIPS:
            return self._score_relationship_consistency(snapshots)
        else:
            return 1.0
    
    def _score_appearance_consistency(self, snapshots, baseline):
        if not baseline or 'appearance' not in baseline:
            return 1.0
        baseline_appearance = baseline['appearance']
        total_score = 0.0
        for snapshot in snapshots:
            score = self._compare_appearance(baseline_appearance, snapshot.appearance_data)
            total_score += score
        return total_score / len(snapshots)
    
    def _compare_appearance(self, baseline, current):
        if not current:
            return 1.0
        matches = 0
        total = 0
        key_attributes = ['hair_color', 'hair_style', 'eye_color', 'skin_tone',
                         'clothing_style', 'accessories', 'build', 'height']
        for attr in key_attributes:
            if attr in baseline:
                total += 1
                if attr in current and baseline[attr] == current[attr]:
                    matches += 1
        return matches / total if total > 0 else 1.0
    
    def _score_personality_consistency(self, snapshots, baseline):
        if not baseline or 'personality' not in baseline:
            return 1.0
        baseline_personality = baseline['personality']
        total_score = 0.0
        for snapshot in snapshots:
            score = self._compare_personality(baseline_personality, snapshot.personality_data)
            total_score += score
        return total_score / len(snapshots)
    
    def _compare_personality(self, baseline, current):
        if not current:
            return 1.0
        matches = 0
        total = 0
        key_traits = ['primary_traits', 'strengths', 'weaknesses', 'core_beliefs']
        for trait in key_traits:
            if trait in baseline:
                total += 1
                if trait in current:
                    if set(baseline[trait]) == set(current[trait]):
                        matches += 1
                    elif set(baseline[trait]).intersection(set(current[trait])):
                        matches += 0.5
        return matches / total if total > 0 else 1.0
    
    def _score_behavior_consistency(self, snapshots, baseline):
        if not baseline or 'behaviors' not in baseline:
            return 1.0
        baseline_behaviors = set(baseline['behaviors'])
        total_score = 0.0
        count = 0
        for snapshot in snapshots:
            if snapshot.behavior_observed:
                current_behaviors = set(snapshot.behavior_observed)
                overlap = len(baseline_behaviors.intersection(current_behaviors))
                ratio = overlap / len(baseline_behaviors) if baseline_behaviors else 1.0
                total_score += ratio
                count += 1
        return total_score / count if count > 0 else 1.0
    
    def _score_dialogue_consistency(self, snapshots):
        if len(snapshots) < 2:
            return 1.0
        vocabularies = []
        for snapshot in snapshots:
            all_dialogue = ' '.join(snapshot.dialogue_samples)
            words = set(all_dialogue.lower().split())
            vocabularies.append(words)
        total_overlap = 0.0
        comparisons = 0
        for i in range(1, len(vocabularies)):
            overlap = len(vocabularies[i].intersection(vocabularies[i-1]))
            union = len(vocabularies[i].union(vocabularies[i-1]))
            if union > 0:
                total_overlap += overlap / union
                comparisons += 1
        return total_overlap / comparisons if comparisons > 0 else 1.0
    
    def _score_relationship_consistency(self, snapshots):
        if len(snapshots) < 2:
            return 1.0
        total_score = 0.0
        count = 0
        for i in range(1, len(snapshots)):
            prev_rels = set(snapshots[i-1].active_relationships)
            curr_rels = set(snapshots[i].active_relationships)
            if prev_rels == curr_rels:
                total_score += 1.0
            elif prev_rels.intersection(curr_rels):
                total_score += 0.7
            else:
                total_score += 0.3
            count += 1
        return total_score / count if count > 0 else 1.0
    
    def _detect_variations(self, character_id, snapshot):
        baseline = self.baselines.get(character_id, {})
        variations = []
        if not baseline:
            return variations
        if 'appearance' in baseline:
            for attr, baseline_value in baseline['appearance'].items():
                if attr in snapshot.appearance_data:
                    current_value = snapshot.appearance_data[attr]
                    if baseline_value != current_value:
                        variations.append(f"{attr} changed")
        return variations
    
    def _check_consistency_issues(self, character_id):
        current_score = self.calculate_consistency_score(character_id)
        if current_score < self.thresholds[ConsistencyLevel.NEEDS_ATTENTION]:
            issue = ConsistencyIssue(
                issue_id=str(uuid.uuid4()),
                character_id=character_id,
                metric=ConsistencyMetric.PERSONALITY,
                severity="high" if current_score < 0.3 else "medium",
                description=f"Consistency score dropped to {current_score:.2f}",
                scene_numbers=[s.scene_number for s in self.snapshots[character_id]],
                suggested_fix="Review recent character appearances",
                detected_at=datetime.now()
            )
            self.issues.append(issue)
    
    def generate_report(self, character_id: str) -> ConsistencyReport:
        snapshots = self.snapshots.get(character_id, [])
        metric_scores = {}
        for metric in ConsistencyMetric:
            score = self._calculate_metric_score(character_id, metric)
            metric_scores[metric.value] = score
        overall_score = sum(metric_scores.values()) / len(metric_scores)
        consistency_level = self._score_to_level(overall_score)
        character_issues = [i for i in self.issues if i.character_id == character_id]
        recommendations = self._generate_recommendations(character_id, metric_scores)
        trend = self._analyze_trend(character_id)
        return ConsistencyReport(
            report_id=str(uuid.uuid4()),
            character_id=character_id,
            generated_at=datetime.now(),
            total_scenes=len(set(s.scene_number for s in snapshots)),
            overall_score=overall_score,
            consistency_level=consistency_level,
            metric_scores=metric_scores,
            issues=character_issues,
            recommendations=recommendations,
            trend=trend,
            snapshot_count=len(snapshots)
        )
    
    def _score_to_level(self, score: float) -> ConsistencyLevel:
        if score >= self.thresholds[ConsistencyLevel.EXCELLENT]:
            return ConsistencyLevel.EXCELLENT
        elif score >= self.thresholds[ConsistencyLevel.GOOD]:
            return ConsistencyLevel.GOOD
        elif score >= self.thresholds[ConsistencyLevel.ACCEPTABLE]:
            return ConsistencyLevel.ACCEPTABLE
        elif score >= self.thresholds[ConsistencyLevel.NEEDS_ATTENTION]:
            return ConsistencyLevel.NEEDS_ATTENTION
        else:
            return ConsistencyLevel.PROBLEMATIC
    
    def _generate_recommendations(self, character_id, metric_scores):
        recommendations = []
        if metric_scores.get('appearance', 1.0) < 0.8:
            recommendations.append("Review character's visual appearance across scenes")
        if metric_scores.get('personality', 1.0) < 0.8:
            recommendations.append("Ensure core personality traits remain consistent")
        if metric_scores.get('behavior', 1.0) < 0.8:
            recommendations.append("Check behaviors align with established patterns")
        if metric_scores.get('dialogue', 1.0) < 0.8:
            recommendations.append("Review dialogue for consistent character voice")
        if metric_scores.get('relationships', 1.0) < 0.8:
            recommendations.append("Verify relationship dynamics remain coherent")
        if not recommendations:
            recommendations.append("Character consistency is well-maintained!")
        return recommendations
    
    def _analyze_trend(self, character_id):
        snapshots = self.snapshots.get(character_id, [])
        if len(snapshots) < 3:
            return "insufficient_data"
        midpoint = len(snapshots) // 2
        first_score = self._calculate_recent_score(snapshots[:midpoint])
        second_score = self._calculate_recent_score(snapshots[midpoint:])
        if second_score > first_score + 0.05:
            return "improving"
        elif second_score < first_score - 0.05:
            return "declining"
        else:
            return "stable"
    
    def _calculate_recent_score(self, snapshots):
        if not snapshots:
            return 1.0
        scores = []
        for snapshot in snapshots:
            variation_count = len(snapshot.variations)
            score = max(0.0, 1.0 - (variation_count * 0.1))
            scores.append(score)
        return sum(scores) / len(scores)
    
    def _save_data(self):
        if not self.storage_path:
            return
        data = {
            'snapshots': {
                char_id: [asdict(s) for s in snaps]
                for char_id, snaps in self.snapshots.items()
            },
            'issues': [asdict(i) for i in self.issues],
            'baselines': self.baselines
        }
        with open(self.storage_path, 'w') as f:
            json.dump(data, f, default=str)
    
    def _load_data(self):
        if not self.storage_path or not Path(self.storage_path).exists():
            return
        try:
            with open(self.storage_path, 'r') as f:
                data = json.load(f)
            self.snapshots = {}
            for char_id, snaps_data in data.get('snapshots', {}).items():
                snapshots = []
                for s_data in snaps_data:
                    s_data['timestamp'] = datetime.fromisoformat(s_data['timestamp'])
                    snapshots.append(CharacterSnapshot(**s_data))
                self.snapshots[char_id] = snapshots
            self.issues = []
            for i_data in data.get('issues', []):
                i_data['detected_at'] = datetime.fromisoformat(i_data['detected_at'])
                self.issues.append(ConsistencyIssue(**i_data))
            self.baselines = data.get('baselines', {})
        except Exception as e:
            print(f"Error loading consistency data: {e}")
    
    def export_report(self, character_id: str, output_path: str):
        report = self.generate_report(character_id)
        with open(output_path, 'w') as f:
            json.dump(asdict(report), f, indent=2, default=str)
    
    def get_tracker_statistics(self) -> Dict[str, Any]:
        total_characters = len(self.snapshots)
        total_snapshots = sum(len(s) for s in self.snapshots.values())
        total_issues = len(self.issues)
        avg_score = 0.0
        if total_characters > 0:
            scores = [self.calculate_consistency_score(cid) for cid in self.snapshots]
            avg_score = sum(scores) / len(scores)
        return {
            'total_characters_tracked': total_characters,
            'total_snapshots': total_snapshots,
            'total_issues_detected': total_issues,
            'average_consistency_score': avg_score
        }
