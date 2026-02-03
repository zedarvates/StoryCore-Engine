"""
Character Consistency Tracking System

This module tracks character appearance and behavior consistency across scenes,
detecting variations and generating warnings for inconsistencies.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from .consistency_types import (
    ConsistencyCategory,
    ConsistencyStatus,
    VariationType,
    AppearanceSnapshot,
    BehaviorSnapshot,
    DialogueSnapshot,
    KnowledgeSnapshot,
    Variation,
    ConsistencyScore,
    ConsistencyWarning,
    CharacterConsistencyRecord,
)

logger = logging.getLogger(__name__)


class ConsistencyTracker:
    """
    Tracks character consistency across scenes.
    
    Features:
    - Scene-by-scene character tracking
    - Variation detection and scoring
    - Automatic warning generation
    - Consistency reporting
    """
    
    def __init__(self):
        """Initialize the consistency tracker."""
        # Character records by character_id
        self._records: Dict[str, CharacterConsistencyRecord] = {}
        
        # Warning thresholds
        self._thresholds = {
            "minor": 0.05,  # 5% variation = minor warning
            "moderate": 0.15,  # 15% variation = moderate warning
            "major": 0.30,  # 30% variation = major warning
            "critical": 0.50,  # 50% variation = critical warning
        }
        
        # Statistics
        self._total_checks = 0
        self._total_variations = 0
        self._total_warnings = 0
    
    # =========================================================================
    # Scene Recording
    # =========================================================================
    
    def record_scene_appearance(
        self,
        character_id: str,
        character_name: str,
        scene_id: str,
        appearance_data: Dict[str, Any]
    ) -> Optional[AppearanceSnapshot]:
        """
        Record character appearance for a scene.
        
        Args:
            character_id: Character identifier
            character_name: Character name
            scene_id: Scene identifier
            appearance_data: Appearance data dictionary
            
        Returns:
            Created AppearanceSnapshot or None
        """
        record = self._get_or_create_record(character_id, character_name)
        
        snapshot = AppearanceSnapshot(
            scene_id=scene_id,
            timestamp=datetime.now(),
            **appearance_data
        )
        
        record.appearances.append(snapshot)
        
        # Update metadata
        if not record.first_scene:
            record.first_scene = scene_id
        record.last_scene = scene_id
        record.scene_count = len(record.appearances)
        record.updated_at = datetime.now()
        
        # Check for variations
        self._check_appearance_variations(record, snapshot)
        
        # Update score
        self._update_consistency_score(record)
        
        self._total_checks += 1
        
        return snapshot
    
    def record_scene_behavior(
        self,
        character_id: str,
        character_name: str,
        scene_id: str,
        behavior_data: Dict[str, Any]
    ) -> Optional[BehaviorSnapshot]:
        """Record character behavior for a scene."""
        record = self._get_or_create_record(character_id, character_name)
        
        snapshot = BehaviorSnapshot(
            scene_id=scene_id,
            timestamp=datetime.now(),
            **behavior_data
        )
        
        record.behaviors.append(snapshot)
        record.updated_at = datetime.now()
        
        self._check_behavior_variations(record, snapshot)
        self._update_consistency_score(record)
        
        self._total_checks += 1
        
        return snapshot
    
    def record_scene_dialogue(
        self,
        character_id: str,
        character_name: str,
        scene_id: str,
        dialogue_data: Dict[str, Any]
    ) -> Optional[DialogueSnapshot]:
        """Record character dialogue characteristics for a scene."""
        record = self._get_or_create_record(character_id, character_name)
        
        snapshot = DialogueSnapshot(
            scene_id=scene_id,
            timestamp=datetime.now(),
            **dialogue_data
        )
        
        record.dialogues.append(snapshot)
        record.updated_at = datetime.now()
        
        self._check_dialogue_variations(record, snapshot)
        self._update_consistency_score(record)
        
        self._total_checks += 1
        
        return snapshot
    
    def record_scene_knowledge(
        self,
        character_id: str,
        character_name: str,
        scene_id: str,
        knowledge_data: Dict[str, Any]
    ) -> Optional[KnowledgeSnapshot]:
        """Record character knowledge for a scene."""
        record = self._get_or_create_record(character_id, character_name)
        
        snapshot = KnowledgeSnapshot(
            scene_id=scene_id,
            timestamp=datetime.now(),
            **knowledge_data
        )
        
        record.knowledge.append(snapshot)
        record.updated_at = datetime.now()
        
        self._check_knowledge_variations(record, snapshot)
        self._update_consistency_score(record)
        
        self._total_checks += 1
        
        return snapshot
    
    # =========================================================================
    # Variation Detection
    # =========================================================================
    
    def _check_appearance_variations(
        self,
        record: CharacterConsistencyRecord,
        current: AppearanceSnapshot
    ) -> List[Variation]:
        """Check for appearance variations from previous snapshots."""
        variations = []
        
        if len(record.appearances) < 2:
            return variations
        
        previous = record.appearances[-2]  # Previous snapshot
        
        # Compare fields
        comparisons = [
            ("hair_color", previous.hair_color, current.hair_color),
            ("eye_color", previous.eye_color, current.eye_color),
            ("height", previous.height, current.height),
            ("build", previous.build, current.build),
        ]
        
        for field_name, prev_val, curr_val in comparisons:
            if prev_val and curr_val and prev_val != curr_val:
                variation = Variation(
                    category=ConsistencyCategory.APPEARANCE,
                    variation_type=VariationType.CHANGE,
                    field_name=field_name,
                    previous_value=prev_val,
                    current_value=curr_val,
                    scene_id=current.scene_id,
                    previous_scene_id=previous.scene_id,
                    severity=self._assess_severity(prev_val, curr_val),
                    impact_on_story=self._assess_impact(prev_val, curr_val),
                    suggestion=self._generate_suggestion(
                        ConsistencyCategory.APPEARANCE, field_name, prev_val, curr_val
                    )
                )
                variations.append(variation)
                record.variations.append(variation)
        
        # Check for removed/added accessories
        prev_accessories = set(previous.accessories)
        curr_accessories = set(current.accessories)
        
        removed = prev_accessories - curr_accessories
        added = curr_accessories - prev_accessories
        
        for item in removed:
            variation = Variation(
                category=ConsistencyCategory.ACCESSORIES,
                variation_type=VariationType.REMOVAL,
                field_name="accessories",
                previous_value=item,
                current_value="",
                scene_id=current.scene_id,
                previous_scene_id=previous.scene_id,
                severity="minor",
                impact_on_story="none",
                suggestion=f"Character no longer has {item}. Consider if this is intentional."
            )
            variations.append(variation)
            record.variations.append(variation)
        
        for item in added:
            variation = Variation(
                category=ConsistencyCategory.ACCESSORIES,
                variation_type=VariationType.ADDITION,
                field_name="accessories",
                previous_value="",
                current_value=item,
                scene_id=current.scene_id,
                previous_scene_id=previous.scene_id,
                severity="minor",
                impact_on_story="none",
                suggestion=f"Character now has {item}. Ensure this is explained in the story."
            )
            variations.append(variation)
            record.variations.append(variation)
        
        return variations
    
    def _check_behavior_variations(
        self,
        record: CharacterConsistencyRecord,
        current: BehaviorSnapshot
    ) -> List[Variation]:
        """Check for behavior variations."""
        variations = []
        
        if len(record.behaviors) < 2:
            return variations
        
        previous = record.behaviors[-2]
        
        # Check mood changes
        if previous.mood and current.mood and previous.mood != current.mood:
            variation = Variation(
                category=ConsistencyCategory.BEHAVIOR,
                variation_type=VariationType.CHANGE,
                field_name="mood",
                previous_value=previous.mood,
                current_value=current.mood,
                scene_id=current.scene_id,
                previous_scene_id=previous.scene_id,
                severity="minor",
                impact_on_story="minor",
                suggestion=f"Mood changed from {previous.mood} to {current.mood}. Ensure this change is justified."
            )
            variations.append(variation)
            record.variations.append(variation)
        
        # Check displayed traits
        prev_traits = set(previous.displayed_traits)
        curr_traits = set(current.displayed_traits)
        
        new_traits = curr_traits - prev_traits
        lost_traits = prev_traits - curr_traits
        
        for trait in new_traits:
            variation = Variation(
                category=ConsistencyCategory.PERSONALITY,
                variation_type=VariationType.ADDITION,
                field_name="displayed_traits",
                previous_value="",
                current_value=trait,
                scene_id=current.scene_id,
                previous_scene_id=previous.scene_id,
                severity="moderate",
                impact_on_story="significant",
                suggestion=f"New trait '{trait}' displayed. Ensure this is consistent with character profile."
            )
            variations.append(variation)
            record.variations.append(variation)
        
        return variations
    
    def _check_dialogue_variations(
        self,
        record: CharacterConsistencyRecord,
        current: DialogueSnapshot
    ) -> List[Variation]:
        """Check for dialogue variations."""
        variations = []
        
        if len(record.dialogues) < 2:
            return variations
        
        previous = record.dialogues[-2]
        
        # Check vocabulary level
        if previous.vocabulary_level and current.vocabulary_level:
            if previous.vocabulary_level != current.vocabulary_level:
                variation = Variation(
                    category=ConsistencyCategory.DIALOGUE,
                    variation_type=VariationType.CHANGE,
                    field_name="vocabulary_level",
                    previous_value=previous.vocabulary_level,
                    current_value=current.vocabulary_level,
                    scene_id=current.scene_id,
                    previous_scene_id=previous.scene_id,
                    severity="moderate",
                    impact_on_story="significant",
                    suggestion="Vocabulary level changed. Ensure this is consistent with character intelligence."
                )
                variations.append(variation)
                record.variations.append(variation)
        
        # Check catchphrases consistency
        prev_phrases = set(previous.catchphrases)
        curr_phrases = set(current.catchphrases)
        
        lost_phrases = prev_phrases - curr_phrases
        
        for phrase in lost_phrases:
            variation = Variation(
                category=ConsistencyCategory.DIALOGUE,
                variation_type=VariationType.REMOVAL,
                field_name="catchphrases",
                previous_value=phrase,
                current_value="",
                scene_id=current.scene_id,
                previous_scene_id=previous.scene_id,
                severity="minor",
                impact_on_story="none",
                suggestion=f"Catchphrase '{phrase}' not used. Ensure character still uses their signature phrases."
            )
            variations.append(variation)
            record.variations.append(variation)
        
        return variations
    
    def _check_knowledge_variations(
        self,
        record: CharacterConsistencyRecord,
        current: KnowledgeSnapshot
    ) -> List[Variation]:
        """Check for knowledge inconsistencies."""
        variations = []
        
        if len(record.knowledge) < 2:
            return variations
        
        previous = record.knowledge[-2]
        
        # Check for contradictions (knowing something they shouldn't)
        for knowledge in current.impossible_knowledge:
            variation = Variation(
                category=ConsistencyCategory.KNOWLEDGE,
                variation_type=VariationType.CONTRADICTION,
                field_name="impossible_knowledge",
                previous_value="",
                current_value=knowledge,
                scene_id=current.scene_id,
                previous_scene_id=previous.scene_id,
                severity="critical",
                impact_on_story="breaking",
                suggestion=f"CRITICAL: Character knows '{knowledge}' but shouldn't. Fix this plot hole."
            )
            variations.append(variation)
            record.variations.append(variation)
            self._generate_warning(record, variation)
        
        # Check for forgotten information
        prev_known = set(previous.known_facts)
        curr_known = set(current.known_facts)
        
        forgotten = prev_known - curr_known
        
        for fact in forgotten:
            variation = Variation(
                category=ConsistencyCategory.KNOWLEDGE,
                variation_type=VariationType.REMOVAL,
                field_name="known_facts",
                previous_value=fact,
                current_value="",
                scene_id=current.scene_id,
                previous_scene_id=previous.scene_id,
                severity="moderate",
                impact_on_story="significant",
                suggestion=f"Character forgot '{fact}'. If unintentional, fix this continuity error."
            )
            variations.append(variation)
            record.variations.append(variation)
        
        return variations
    
    # =========================================================================
    # Scoring
    # =========================================================================
    
    def _update_consistency_score(self, record: CharacterConsistencyRecord) -> None:
        """Update consistency score for a character."""
        score = record.current_score
        score.character_id = record.character_id
        score.last_updated = datetime.now()
        
        # Count scenes
        score.total_scenes = record.scene_count
        score.total_variations = len(record.variations)
        score.contradictions = sum(
            1 for v in record.variations
            if v.variation_type == VariationType.CONTRADICTION
        )
        score.warnings_issued = len(record.warnings)
        
        # Calculate category scores
        if record.appearances:
            score.appearance_score = self._calculate_category_score(
                record.appearances,
                ["hair_color", "eye_color", "height", "build"]
            )
            score.clothing_score = self._calculate_category_score(
                record.appearances,
                ["clothing_top", "clothing_bottom", "footwear"]
            )
            score.accessories_score = self._calculate_list_consistency(
                [a.accessories for a in record.appearances]
            )
        
        if record.behaviors:
            score.behavior_score = self._calculate_category_score(
                record.behaviors,
                ["mood", "posture", "movement_style"]
            )
            score.personality_score = self._calculate_list_consistency(
                [b.displayed_traits for b in record.behaviors]
            )
        
        if record.dialogues:
            score.dialogue_score = self._calculate_category_score(
                record.dialogues,
                ["vocabulary_level", "sentence_structure", "tone"]
            )
        
        if record.knowledge:
            score.knowledge_score = self._calculate_knowledge_score(record.knowledge)
        
        # Calculate overall score
        category_scores = [
            score.appearance_score,
            score.clothing_score,
            score.accessories_score,
            score.behavior_score,
            score.personality_score,
            score.dialogue_score,
            score.knowledge_score,
        ]
        
        # Weight the scores
        weights = [1.0, 0.8, 0.8, 1.0, 1.0, 0.9, 0.9]
        weighted_sum = sum(s * w for s, w in zip(category_scores, weights))
        weight_total = sum(weights)
        
        score.overall_score = weighted_sum / weight_total if weight_total > 0 else 1.0
    
    def _calculate_category_score(
        self,
        snapshots: List,
        fields: List[str]
    ) -> float:
        """Calculate consistency score for a category."""
        if not snapshots or len(snapshots) < 2:
            return 1.0
        
        consistent_count = 0
        total_comparisons = 0
        
        for i in range(1, len(snapshots)):
            current = snapshots[i]
            previous = snapshots[i - 1]
            
            for field_name in fields:
                curr_val = getattr(current, field_name, None)
                prev_val = getattr(previous, field_name, None)
                
                if curr_val and prev_val:
                    total_comparisons += 1
                    if curr_val == prev_val:
                        consistent_count += 1
        
        if total_comparisons == 0:
            return 1.0
        
        return consistent_count / total_comparisons
    
    def _calculate_list_consistency(self, lists: List[List[str]]) -> float:
        """Calculate consistency for a list field across snapshots."""
        if not lists or len(lists) < 2:
            return 1.0
        
        consistency_scores = []
        
        for i in range(1, len(lists)):
            prev_set = set(lists[i - 1])
            curr_set = set(lists[i])
            
            if not prev_set:
                continue
            
            overlap = len(prev_set & curr_set)
            union = len(prev_set | curr_set)
            
            if union > 0:
                consistency_scores.append(overlap / union)
        
        if not consistency_scores:
            return 1.0
        
        return sum(consistency_scores) / len(consistency_scores)
    
    def _calculate_knowledge_score(self, snapshots: List[KnowledgeSnapshot]) -> float:
        """Calculate knowledge consistency score."""
        if not snapshots or len(snapshots) < 2:
            return 1.0
        
        # Penalize for contradictions and impossible knowledge
        contradictions = 0
        impossible = 0
        
        for i in range(1, len(snapshots)):
            current = snapshots[i]
            
            # Check for knowledge that shouldn't exist yet
            if current.impossible_knowledge:
                impossible += len(current.impossible_knowledge)
            
            # Check for forgotten key facts
            prev = snapshots[i - 1]
            forgotten = set(prev.known_facts) - set(current.known_facts)
            
            # Some forgetting is natural, but too much is a problem
            if len(forgotten) > len(prev.known_facts) * 0.3:
                contradictions += 1
        
        # Calculate score with penalties
        base_score = 1.0
        penalty = (contradictions * 0.1) + (impossible * 0.2)
        
        return max(0.0, base_score - penalty)
    
    # =========================================================================
    # Warnings
    # =========================================================================
    
    def _generate_warning(
        self,
        record: CharacterConsistencyRecord,
        variation: Variation
    ) -> ConsistencyWarning:
        """Generate a warning for a variation."""
        warning = ConsistencyWarning(
            warning_id=str(uuid.uuid4()),
            character_id=record.character_id,
            warning_type=variation.category.value,
            category=variation.category,
            severity=variation.severity,
            title=f"{variation.category.value.title()} Inconsistency Detected",
            description=f"Changed {variation.field_name} from '{variation.previous_value}' to '{variation.current_value}'",
            scene_id=variation.scene_id,
            related_scenes=[variation.previous_scene_id],
            suggestion=variation.suggestion
        )
        
        record.warnings.append(warning)
        self._total_warnings += 1
        
        return warning
    
    def get_active_warnings(
        self,
        character_id: Optional[str] = None,
        severity: Optional[str] = None
    ) -> List[ConsistencyWarning]:
        """
        Get active warnings.
        
        Args:
            character_id: Optional character filter
            severity: Optional severity filter
            
        Returns:
            List of matching warnings
        """
        warnings = []
        
        for record in self._records.values():
            if character_id and record.character_id != character_id:
                continue
            
            for warning in record.warnings:
                if warning.is_resolved:
                    continue
                
                if severity and warning.severity != severity:
                    continue
                
                warnings.append(warning)
        
        # Sort by severity and date
        severity_order = {"critical": 0, "error": 1, "warning": 2, "info": 3}
        warnings.sort(key=lambda w: (severity_order.get(w.severity, 99), w.created_at))
        
        return warnings
    
    def acknowledge_warning(self, warning_id: str) -> bool:
        """Mark a warning as acknowledged."""
        for record in self._records.values():
            for warning in record.warnings:
                if warning.warning_id == warning_id:
                    warning.acknowledged = True
                    return True
        return False
    
    def resolve_warning(self, warning_id: str) -> bool:
        """Mark a warning as resolved."""
        for record in self._records.values():
            for warning in record.warnings:
                if warning.warning_id == warning_id:
                    warning.is_resolved = True
                    warning.resolved_at = datetime.now()
                    return True
        return False
    
    # =========================================================================
    # Reports
    # =========================================================================
    
    def get_character_report(
        self,
        character_id: str,
        include_variations: bool = True,
        include_warnings: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a consistency report for a character.
        
        Args:
            character_id: Character to report on
            include_variations: Include variation details
            include_warnings: Include warning details
            
        Returns:
            Report dictionary or None if character not found
        """
        record = self._records.get(character_id)
        if not record:
            return None
        
        report = {
            "character_id": record.character_id,
            "character_name": record.character_name,
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "overall_score": record.current_score.overall_score,
                "status": record.current_score.get_status().value,
                "total_scenes": record.scene_count,
                "total_variations": len(record.variations),
                "active_warnings": sum(1 for w in record.warnings if not w.is_resolved),
            },
            "category_scores": {
                "appearance": record.current_score.appearance_score,
                "clothing": record.current_score.clothing_score,
                "accessories": record.current_score.accessories_score,
                "behavior": record.current_score.behavior_score,
                "personality": record.current_score.personality_score,
                "dialogue": record.current_score.dialogue_score,
                "knowledge": record.current_score.knowledge_score,
            },
        }
        
        if include_variations:
            report["variations"] = [v.to_dict() for v in record.variations]
        
        if include_warnings:
            report["warnings"] = [w.to_dict() for w in record.warnings if not w.is_resolved]
        
        return report
    
    def get_library_report(self) -> Dict[str, Any]:
        """Generate a consistency report for the entire library."""
        if not self._records:
            return {
                "total_characters": 0,
                "overall_health": "no_data",
                "characters": []
            }
        
        scores = [r.current_score.overall_score for r in self._records.values()]
        avg_score = sum(scores) / len(scores)
        
        # Count warnings
        total_warnings = sum(
            len([w for w in r.warnings if not w.is_resolved])
            for r in self._records.values()
        )
        
        # Determine health status
        if avg_score >= 0.95:
            health = "excellent"
        elif avg_score >= 0.85:
            health = "good"
        elif avg_score >= 0.70:
            health = "needs_attention"
        elif avg_score >= 0.50:
            health = "problematic"
        else:
            health = "critical"
        
        return {
            "total_characters": len(self._records),
            "average_consistency_score": round(avg_score, 3),
            "overall_health": health,
            "total_active_warnings": total_warnings,
            "characters": [
                {
                    "id": r.character_id,
                    "name": r.character_name,
                    "score": r.current_score.overall_score,
                    "status": r.current_score.get_status().value,
                    "warnings": len([w for w in r.warnings if not w.is_resolved])
                }
                for r in self._records.values()
            ],
            "generated_at": datetime.now().isoformat()
        }
    
    # =========================================================================
    # Utility Methods
    # =========================================================================
    
    def _get_or_create_record(
        self,
        character_id: str,
        character_name: str
    ) -> CharacterConsistencyRecord:
        """Get or create a character record."""
        if character_id not in self._records:
            self._records[character_id] = CharacterConsistencyRecord(
                character_id=character_id,
                character_name=character_name,
                current_score=ConsistencyScore(character_id=character_id)
            )
        return self._records[character_id]
    
    def _assess_severity(self, previous_value: Any, current_value: Any) -> str:
        """Assess severity of a variation."""
        prev_str = str(previous_value).lower()
        curr_str = str(current_value).lower()
        
        # Major physical changes
        major_physical = ["height", "build", "body"]
        for trait in major_physical:
            if trait in prev_str or trait in curr_str:
                return "major"
        
        # Moderate changes
        moderate = ["color", "style", "length"]
        for trait in moderate:
            if trait in prev_str or trait in curr_str:
                return "moderate"
        
        return "minor"
    
    def _assess_impact(self, previous_value: Any, current_value: Any) -> str:
        """Assess story impact of a variation."""
        prev_str = str(previous_value).lower()
        curr_str = str(current_value).lower()
        
        # Critical impacts
        critical = ["scar", "injury", "missing_limb", "blind", "dead"]
        for trait in critical:
            if trait in prev_str or trait in curr_str:
                return "breaking"
        
        # Significant impacts
        significant = ["hair_color", "eye_color", "age"]
        for trait in significant:
            if trait in prev_str or trait in curr_str:
                return "significant"
        
        return "none"
    
    def _generate_suggestion(
        self,
        category: ConsistencyCategory,
        field_name: str,
        previous_value: Any,
        current_value: Any
    ) -> str:
        """Generate a suggestion for resolving a variation."""
        suggestions = {
            ConsistencyCategory.APPEARANCE: f"Consider whether the change from '{previous_value}' to '{current_value}' is intentional and justified.",
            ConsistencyCategory.CLOTHING: f"Clothing changed. Ensure this is explained by events in the story.",
            ConsistencyCategory.ACCESSORIES: f"Accessories changed. Verify this is consistent with character habits.",
            ConsistencyCategory.BEHAVIOR: f"Behavior changed. Make sure this fits the character's personality arc.",
            ConsistencyCategory.PERSONALITY: f"Personality trait changed. This could affect character consistency.",
            ConsistencyCategory.DIALOGUE: f"Dialogue style changed. Check if this matches the character's voice.",
            ConsistencyCategory.KNOWLEDGE: f"Knowledge state changed. Verify this doesn't create plot holes.",
        }
        
        return suggestions.get(category, "Review this change for consistency.")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get tracker statistics."""
        return {
            "total_characters_tracked": len(self._records),
            "total_checks": self._total_checks,
            "total_variations_detected": self._total_variations,
            "total_warnings_issued": self._total_warnings,
            "library_report": self.get_library_report()
        }
