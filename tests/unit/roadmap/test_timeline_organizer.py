"""
Unit tests for TimelineOrganizer component.

Tests quarter assignment, feature grouping, and priority-based sorting.
"""

import pytest
from datetime import datetime
from pathlib import Path

from src.roadmap.timeline_organizer import TimelineOrganizer
from src.roadmap.models import (
    Feature,
    FeatureCategory,
    Priority,
    FeatureStatus,
)


class TestTimelineOrganizer:
    """Test suite for TimelineOrganizer class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.organizer = TimelineOrganizer()
    
    def test_assign_quarter_q1(self):
        """Test quarter assignment for Q1 dates."""
        # January
        date = datetime(2026, 1, 15)
        quarter = self.organizer.assign_quarter(date, FeatureStatus.PLANNED)
        assert quarter == "Q1 2026"
        
        # March (boundary)
        date = datetime(2026, 3, 31)
        quarter = self.organizer.assign_quarter(date, FeatureStatus.PLANNED)
        assert quarter == "Q1 2026"
    
    def test_assign_quarter_q2(self):
        """Test quarter assignment for Q2 dates."""
        # April (boundary)
        date = datetime(2026, 4, 1)
        quarter = self.organizer.assign_quarter(date, FeatureStatus.PLANNED)
        assert quarter == "Q2 2026"
        
        # June
        date = datetime(2026, 6, 30)
        quarter = self.organizer.assign_quarter(date, FeatureStatus.PLANNED)
        assert quarter == "Q2 2026"
    
    def test_assign_quarter_q3(self):
        """Test quarter assignment for Q3 dates."""
        # July
        date = datetime(2026, 7, 1)
        quarter = self.organizer.assign_quarter(date, FeatureStatus.PLANNED)
        assert quarter == "Q3 2026"
        
        # September
        date = datetime(2026, 9, 30)
        quarter = self.organizer.assign_quarter(date, FeatureStatus.PLANNED)
        assert quarter == "Q3 2026"
    
    def test_assign_quarter_q4(self):
        """Test quarter assignment for Q4 dates."""
        # October
        date = datetime(2026, 10, 1)
        quarter = self.organizer.assign_quarter(date, FeatureStatus.PLANNED)
        assert quarter == "Q4 2026"
        
        # December
        date = datetime(2026, 12, 31)
        quarter = self.organizer.assign_quarter(date, FeatureStatus.PLANNED)
        assert quarter == "Q4 2026"
    
    def test_assign_quarter_no_date(self):
        """Test quarter assignment when no date provided."""
        quarter = self.organizer.assign_quarter(None, FeatureStatus.FUTURE)
        assert quarter == "Future Considerations"
    
    def test_assign_quarter_different_years(self):
        """Test quarter assignment across different years."""
        date_2026 = datetime(2026, 3, 15)
        quarter_2026 = self.organizer.assign_quarter(date_2026, FeatureStatus.PLANNED)
        assert quarter_2026 == "Q1 2026"
        
        date_2027 = datetime(2027, 3, 15)
        quarter_2027 = self.organizer.assign_quarter(date_2027, FeatureStatus.PLANNED)
        assert quarter_2027 == "Q1 2027"
    
    def test_organize_by_timeline_single_quarter(self):
        """Test organizing features in a single quarter."""
        features = [
            Feature(
                name="feature-1",
                title="Feature 1",
                description="Description 1",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 2, 15),
                spec_path=Path(".kiro/specs/feature-1")
            ),
            Feature(
                name="feature-2",
                title="Feature 2",
                description="Description 2",
                category=FeatureCategory.BACKEND,
                priority=Priority.MEDIUM,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 3, 20),
                spec_path=Path(".kiro/specs/feature-2")
            ),
        ]
        
        result = self.organizer.organize_by_timeline(features)
        
        assert "Q1 2026" in result
        assert len(result["Q1 2026"]) == 2
        assert features[0] in result["Q1 2026"]
        assert features[1] in result["Q1 2026"]
    
    def test_organize_by_timeline_multiple_quarters(self):
        """Test organizing features across multiple quarters."""
        features = [
            Feature(
                name="feature-q1",
                title="Q1 Feature",
                description="Q1 Description",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 2, 15),
                spec_path=Path(".kiro/specs/feature-q1")
            ),
            Feature(
                name="feature-q2",
                title="Q2 Feature",
                description="Q2 Description",
                category=FeatureCategory.BACKEND,
                priority=Priority.MEDIUM,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 5, 10),
                spec_path=Path(".kiro/specs/feature-q2")
            ),
            Feature(
                name="feature-q3",
                title="Q3 Feature",
                description="Q3 Description",
                category=FeatureCategory.TESTING,
                priority=Priority.LOW,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 8, 20),
                spec_path=Path(".kiro/specs/feature-q3")
            ),
        ]
        
        result = self.organizer.organize_by_timeline(features)
        
        assert "Q1 2026" in result
        assert "Q2 2026" in result
        assert "Q3 2026" in result
        assert len(result["Q1 2026"]) == 1
        assert len(result["Q2 2026"]) == 1
        assert len(result["Q3 2026"]) == 1
    
    def test_organize_by_timeline_future_considerations(self):
        """Test organizing features without dates."""
        features = [
            Feature(
                name="feature-dated",
                title="Dated Feature",
                description="Has a date",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 2, 15),
                spec_path=Path(".kiro/specs/feature-dated")
            ),
            Feature(
                name="feature-undated",
                title="Undated Feature",
                description="No date",
                category=FeatureCategory.BACKEND,
                priority=Priority.MEDIUM,
                status=FeatureStatus.FUTURE,
                target_date=None,
                spec_path=Path(".kiro/specs/feature-undated")
            ),
        ]
        
        result = self.organizer.organize_by_timeline(features)
        
        assert "Q1 2026" in result
        assert "Future Considerations" in result
        assert len(result["Q1 2026"]) == 1
        assert len(result["Future Considerations"]) == 1
        assert features[1] in result["Future Considerations"]
    
    def test_organize_by_timeline_completed_uses_completion_date(self):
        """Test that completed features use completion_date."""
        features = [
            Feature(
                name="completed-feature",
                title="Completed Feature",
                description="Already done",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.COMPLETED,
                target_date=datetime(2026, 6, 15),  # Q2
                completion_date=datetime(2026, 3, 20),  # Q1
                spec_path=Path(".kiro/specs/completed-feature")
            ),
        ]
        
        result = self.organizer.organize_by_timeline(features)
        
        # Should be in Q1 based on completion_date, not Q2 based on target_date
        assert "Q1 2026" in result
        assert "Q2 2026" not in result
        assert len(result["Q1 2026"]) == 1
    
    def test_organize_by_timeline_chronological_order(self):
        """Test that quarters are ordered chronologically."""
        features = [
            Feature(
                name="feature-q3",
                title="Q3 Feature",
                description="Q3",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 8, 15),
                spec_path=Path(".kiro/specs/feature-q3")
            ),
            Feature(
                name="feature-q1",
                title="Q1 Feature",
                description="Q1",
                category=FeatureCategory.BACKEND,
                priority=Priority.MEDIUM,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 2, 15),
                spec_path=Path(".kiro/specs/feature-q1")
            ),
            Feature(
                name="feature-future",
                title="Future Feature",
                description="Future",
                category=FeatureCategory.TESTING,
                priority=Priority.LOW,
                status=FeatureStatus.FUTURE,
                target_date=None,
                spec_path=Path(".kiro/specs/feature-future")
            ),
        ]
        
        result = self.organizer.organize_by_timeline(features)
        
        # Check that keys are in chronological order
        keys = list(result.keys())
        assert keys == ["Q1 2026", "Q3 2026", "Future Considerations"]
    
    def test_sort_within_quarter_by_priority(self):
        """Test sorting features by priority within a quarter."""
        features = [
            Feature(
                name="low-priority",
                title="Low Priority Feature",
                description="Low",
                category=FeatureCategory.UI,
                priority=Priority.LOW,
                status=FeatureStatus.PLANNED,
                spec_path=Path(".kiro/specs/low-priority")
            ),
            Feature(
                name="high-priority",
                title="High Priority Feature",
                description="High",
                category=FeatureCategory.BACKEND,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                spec_path=Path(".kiro/specs/high-priority")
            ),
            Feature(
                name="medium-priority",
                title="Medium Priority Feature",
                description="Medium",
                category=FeatureCategory.TESTING,
                priority=Priority.MEDIUM,
                status=FeatureStatus.PLANNED,
                spec_path=Path(".kiro/specs/medium-priority")
            ),
        ]
        
        sorted_features = self.organizer.sort_within_quarter(features)
        
        # Should be ordered: High, Medium, Low
        assert sorted_features[0].priority == Priority.HIGH
        assert sorted_features[1].priority == Priority.MEDIUM
        assert sorted_features[2].priority == Priority.LOW
    
    def test_sort_within_quarter_alphabetically_within_priority(self):
        """Test alphabetical sorting within same priority level."""
        features = [
            Feature(
                name="feature-z",
                title="Zebra Feature",
                description="Z",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                spec_path=Path(".kiro/specs/feature-z")
            ),
            Feature(
                name="feature-a",
                title="Apple Feature",
                description="A",
                category=FeatureCategory.BACKEND,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                spec_path=Path(".kiro/specs/feature-a")
            ),
            Feature(
                name="feature-m",
                title="Mango Feature",
                description="M",
                category=FeatureCategory.TESTING,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                spec_path=Path(".kiro/specs/feature-m")
            ),
        ]
        
        sorted_features = self.organizer.sort_within_quarter(features)
        
        # All have same priority, should be alphabetical by title
        assert sorted_features[0].title == "Apple Feature"
        assert sorted_features[1].title == "Mango Feature"
        assert sorted_features[2].title == "Zebra Feature"
    
    def test_sort_within_quarter_empty_list(self):
        """Test sorting an empty list."""
        features = []
        sorted_features = self.organizer.sort_within_quarter(features)
        assert sorted_features == []
    
    def test_organize_by_timeline_empty_list(self):
        """Test organizing an empty list."""
        features = []
        result = self.organizer.organize_by_timeline(features)
        assert result == {}
    
    def test_organize_by_timeline_cross_year_ordering(self):
        """Test chronological ordering across different years."""
        features = [
            Feature(
                name="feature-2027-q1",
                title="2027 Q1 Feature",
                description="2027 Q1",
                category=FeatureCategory.UI,
                priority=Priority.HIGH,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2027, 2, 15),
                spec_path=Path(".kiro/specs/feature-2027-q1")
            ),
            Feature(
                name="feature-2026-q4",
                title="2026 Q4 Feature",
                description="2026 Q4",
                category=FeatureCategory.BACKEND,
                priority=Priority.MEDIUM,
                status=FeatureStatus.PLANNED,
                target_date=datetime(2026, 11, 15),
                spec_path=Path(".kiro/specs/feature-2026-q4")
            ),
        ]
        
        result = self.organizer.organize_by_timeline(features)
        
        # Check chronological order: 2026 Q4 before 2027 Q1
        keys = list(result.keys())
        assert keys == ["Q4 2026", "Q1 2027"]
