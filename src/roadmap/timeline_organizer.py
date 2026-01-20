"""
Timeline Organizer component for the Public Roadmap System.

This module organizes features by timeline quarters, handling date-to-quarter
mapping, feature grouping, and priority-based sorting within quarters.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from .models import Feature, FeatureStatus, Priority


# Configure logging
logger = logging.getLogger(__name__)


class TimelineOrganizer:
    """
    Organizes features by timeline quarters and sorts by priority.
    
    This class handles:
    - Mapping dates to quarter designations (Q1 2026, Q2 2026, etc.)
    - Grouping features by their timeline quarters
    - Sorting features within quarters by priority
    - Placing undated features in "Future Considerations"
    """
    
    # Quarter boundaries (month, day)
    QUARTER_BOUNDARIES = {
        1: (1, 1, 3, 31),    # Q1: Jan 1 - Mar 31
        2: (4, 1, 6, 30),    # Q2: Apr 1 - Jun 30
        3: (7, 1, 9, 30),    # Q3: Jul 1 - Sep 30
        4: (10, 1, 12, 31),  # Q4: Oct 1 - Dec 31
    }
    
    def assign_quarter(
        self,
        target_date: Optional[datetime],
        status: FeatureStatus
    ) -> str:
        """
        Assign a feature to a timeline quarter.
        
        For completed features, uses completion_date if available.
        For planned/in-progress features, uses target_date.
        Features without dates are assigned to "Future Considerations".
        
        Args:
            target_date: The date to map to a quarter (can be target or completion date)
            status: Current feature status
            
        Returns:
            Quarter string in format "Q1 2026", "Q2 2027", etc.
            Returns "Future Considerations" if no date provided.
        """
        if target_date is None:
            return "Future Considerations"
        
        # Determine which quarter the date falls into
        month = target_date.month
        year = target_date.year
        
        if 1 <= month <= 3:
            quarter = 1
        elif 4 <= month <= 6:
            quarter = 2
        elif 7 <= month <= 9:
            quarter = 3
        else:  # 10 <= month <= 12
            quarter = 4
        
        return f"Q{quarter} {year}"
    
    def organize_by_timeline(self, features: List[Feature]) -> Dict[str, List[Feature]]:
        """
        Group features by their timeline quarters.
        
        Creates a dictionary mapping quarter strings to lists of features.
        Completed features use their completion_date, while planned/in-progress
        features use their target_date. Features without dates go to
        "Future Considerations".
        
        Args:
            features: List of Feature objects to organize
            
        Returns:
            Dictionary mapping quarter strings to feature lists.
            Keys are sorted chronologically, with "Future Considerations" last.
        """
        timeline_groups: Dict[str, List[Feature]] = {}
        
        for feature in features:
            # Determine which date to use based on status
            if feature.status == FeatureStatus.COMPLETED:
                # Use completion date for completed features
                date_to_use = feature.completion_date or feature.target_date
            else:
                # Use target date for planned/in-progress features
                date_to_use = feature.target_date
            
            # Assign to quarter
            quarter = self.assign_quarter(date_to_use, feature.status)
            
            # Add to appropriate group
            if quarter not in timeline_groups:
                timeline_groups[quarter] = []
            
            timeline_groups[quarter].append(feature)
        
        # Sort the dictionary by quarter chronologically
        sorted_groups = self._sort_quarters(timeline_groups)
        
        return sorted_groups
    
    def sort_within_quarter(self, features: List[Feature]) -> List[Feature]:
        """
        Sort features within a quarter by priority.
        
        Orders features with High priority first, then Medium, then Low.
        Within the same priority level, features are sorted alphabetically
        by title for consistency.
        
        Args:
            features: List of features to sort
            
        Returns:
            Sorted list with High priority features first
        """
        # Define priority order (lower number = higher priority)
        priority_order = {
            Priority.HIGH: 1,
            Priority.MEDIUM: 2,
            Priority.LOW: 3,
        }
        
        # Sort by priority first, then by title alphabetically
        sorted_features = sorted(
            features,
            key=lambda f: (priority_order.get(f.priority, 999), f.title.lower())
        )
        
        return sorted_features
    
    def _sort_quarters(self, timeline_groups: Dict[str, List[Feature]]) -> Dict[str, List[Feature]]:
        """
        Sort quarter keys chronologically.
        
        Parses quarter strings (e.g., "Q1 2026") and sorts them in
        chronological order. "Future Considerations" is always placed last.
        
        Args:
            timeline_groups: Dictionary with quarter keys
            
        Returns:
            New dictionary with keys in chronological order
        """
        # Separate "Future Considerations" from dated quarters
        future_key = "Future Considerations"
        future_features = timeline_groups.pop(future_key, None)
        
        # Parse and sort quarter keys
        def parse_quarter(quarter_str: str) -> tuple:
            """Parse 'Q1 2026' into (2026, 1) for sorting."""
            try:
                parts = quarter_str.split()
                if len(parts) == 2 and parts[0].startswith('Q'):
                    quarter_num = int(parts[0][1:])
                    year = int(parts[1])
                    return (year, quarter_num)
            except (ValueError, IndexError):
                pass
            # Return a very large tuple for unparseable strings
            return (9999, 99)
        
        # Sort quarters chronologically
        sorted_keys = sorted(timeline_groups.keys(), key=parse_quarter)
        
        # Rebuild dictionary in sorted order
        sorted_groups = {key: timeline_groups[key] for key in sorted_keys}
        
        # Add "Future Considerations" at the end if it exists
        if future_features is not None:
            sorted_groups[future_key] = future_features
        
        return sorted_groups
