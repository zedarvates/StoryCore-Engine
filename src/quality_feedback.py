"""
Quality Feedback Module for StoryCore-Engine.

This module implements the quality feedback system providing corrective actions,
issue reporting, suggestion prioritization, and improvement tracking.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from quality_validator import QualityIssue, ImprovementSuggestion, QualityScore


@dataclass
class IssueReport:
    """Report for a specific quality issue with corrective actions."""
    
    issue: QualityIssue
    corrective_actions: List[Dict[str, Any]]  # List of actions with parameters
    timestamp: float
    frame_number: Optional[int]
    parameter_adjustments: Dict[str, Any]  # Specific adjustments
    
    def to_dict(self) -> dict:
        """Serializes report to dictionary."""
        return {
            "issue": self.issue.to_dict(),
            "corrective_actions": self.corrective_actions,
            "timestamp": self.timestamp,
            "frame_number": self.frame_number,
            "parameter_adjustments": self.parameter_adjustments
        }


@dataclass
class SuggestionWithImpact:
    """Suggestion with viewer impact score."""
    
    suggestion: ImprovementSuggestion
    viewer_impact_score: float  # 0-100, higher = more impact on viewer experience
    
    def to_dict(self) -> dict:
        """Serializes to dictionary."""
        return {
            "suggestion": self.suggestion.to_dict(),
            "viewer_impact_score": self.viewer_impact_score
        }


@dataclass
class ImprovementTracking:
    """Tracks improvements over time."""
    
    initial_score: float
    current_score: float
    delta: float
    applied_suggestions: List[str]  # IDs of applied suggestions
    tracked_at: float  # Timestamp when tracked
    
    def to_dict(self) -> dict:
        """Serializes to dictionary."""
        return {
            "initial_score": self.initial_score,
            "current_score": self.current_score,
            "delta": self.delta,
            "applied_suggestions": self.applied_suggestions,
            "tracked_at": self.tracked_at
        }


class QualityFeedback:
    """Handles quality feedback system components."""
    
    def __init__(self):
        """Initialize the quality feedback system."""
        pass
    
    def generate_issue_report(
        self,
        issue: QualityIssue,
        corrective_actions: List[Dict[str, Any]],
        parameter_adjustments: Dict[str, Any]
    ) -> IssueReport:
        """
        Generates a detailed issue report with corrective actions.
        
        Args:
            issue: The quality issue
            corrective_actions: List of corrective actions
            parameter_adjustments: Parameter adjustments
            
        Returns:
            IssueReport object
        """
        return IssueReport(
            issue=issue,
            corrective_actions=corrective_actions,
            timestamp=issue.timestamp,
            frame_number=issue.frame_number,
            parameter_adjustments=parameter_adjustments
        )
    
    def prioritize_suggestions(
        self,
        suggestions: List[ImprovementSuggestion]
    ) -> List[SuggestionWithImpact]:
        """
        Prioritizes suggestions based on viewer impact.
        
        Viewer impact is calculated based on expected improvement, priority, and issue severity.
        
        Args:
            suggestions: List of suggestions
            
        Returns:
            List of suggestions with impact scores, sorted by impact (descending)
        """
        prioritized = []
        for suggestion in suggestions:
            # Calculate viewer impact score
            # Base on expected improvement (50%), priority (inverse, 30%), related issues severity (20%)
            impact = suggestion.expected_improvement * 0.5
            
            # Priority: 1 highest, 5 lowest, so invert
            priority_score = (6 - suggestion.priority) / 5 * 100 * 0.3
            impact += priority_score
            
            # Severity bonus: assume critical issues have higher impact
            severity_bonus = 0
            # Note: This would need related issues to calculate properly,
            # but for now, use a placeholder
            impact += severity_bonus * 0.2
            
            viewer_impact_score = min(100.0, impact)
            
            prioritized.append(SuggestionWithImpact(
                suggestion=suggestion,
                viewer_impact_score=viewer_impact_score
            ))
        
        # Sort by viewer impact descending
        prioritized.sort(key=lambda x: x.viewer_impact_score, reverse=True)
        return prioritized
    
    def track_improvement(
        self,
        initial_score: QualityScore,
        current_score: QualityScore,
        applied_suggestion_ids: List[str],
        tracked_at: float
    ) -> ImprovementTracking:
        """
        Tracks improvement delta in quality scores.
        
        Args:
            initial_score: Initial quality score
            current_score: Current quality score after improvements
            applied_suggestion_ids: IDs of suggestions applied
            tracked_at: Timestamp of tracking
            
        Returns:
            ImprovementTracking object
        """
        initial_overall = initial_score.overall_score
        current_overall = current_score.overall_score
        delta = current_overall - initial_overall
        
        return ImprovementTracking(
            initial_score=initial_overall,
            current_score=current_overall,
            delta=delta,
            applied_suggestions=applied_suggestion_ids,
            tracked_at=tracked_at
        )