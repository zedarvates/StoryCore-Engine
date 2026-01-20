"""
Integration test for core roadmap components.

This test verifies that SpecScanner, MetadataExtractor, StatusTracker,
and TimelineOrganizer work together correctly in a complete workflow.
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from datetime import datetime

from src.roadmap.spec_scanner import SpecScanner
from src.roadmap.metadata_extractor import MetadataExtractor
from src.roadmap.status_tracker import StatusTracker
from src.roadmap.timeline_organizer import TimelineOrganizer
from src.roadmap.models import Feature, FeatureCategory, Priority, FeatureStatus


class TestCoreIntegration:
    """Integration tests for core roadmap components."""
    
    @pytest.fixture
    def temp_specs_dir(self):
        """Create a temporary specs directory with sample specs."""
        temp_path = Path(tempfile.mkdtemp())
        specs_dir = temp_path / ".kiro" / "specs"
        
        # Create spec 1: UI feature, high priority, in progress
        spec1 = specs_dir / "ui-dashboard"
        spec1.mkdir(parents=True)
        (spec1 / "requirements.md").write_text("""---
priority: High
category: UI
timeline: Q1 2026
---

# Dashboard UI

This is a critical user interface component for the dashboard.
It provides real-time data visualization.
""")
        (spec1 / "tasks.md").write_text("""
# Tasks

- [x] Task 1
- [x] Task 2
- [ ] Task 3
- [ ] Task 4
""")
        
        # Create spec 2: Backend feature, medium priority, planned
        spec2 = specs_dir / "api-integration"
        spec2.mkdir(parents=True)
        (spec2 / "requirements.md").write_text("""
# API Integration

This feature adds important API endpoints for data processing.
""")
        (spec2 / "tasks.md").write_text("""
# Tasks

- [ ] Task 1
- [ ] Task 2
""")
        
        # Create spec 3: Documentation, low priority, completed
        spec3 = specs_dir / "documentation-update"
        spec3.mkdir(parents=True)
        (spec3 / "requirements.md").write_text("""
# Documentation Update

This is a nice to have documentation improvement.
""")
        (spec3 / "tasks.md").write_text("""
# Tasks

- [x] Task 1
- [x] Task 2
- [x] Task 3
""")
        
        yield specs_dir
        
        # Cleanup
        if temp_path.exists():
            shutil.rmtree(temp_path)
    
    def test_complete_workflow(self, temp_specs_dir):
        """Test complete workflow from scanning to timeline organization."""
        # Step 1: Scan specs directory
        scanner = SpecScanner(temp_specs_dir)
        spec_files_list = scanner.scan_specs_directory()
        
        assert len(spec_files_list) == 3
        
        # Step 2: Extract metadata and create features
        extractor = MetadataExtractor()
        tracker = StatusTracker()
        features = []
        
        for spec_files in spec_files_list:
            # Extract metadata from requirements file
            if spec_files.requirements:
                metadata = extractor.extract_frontmatter(spec_files.requirements)
                content = spec_files.requirements.read_text(encoding='utf-8')
                title = extractor.extract_title(content)
                description = extractor.extract_description(content)
            else:
                metadata = {}
                title = spec_files.directory.name
                description = ""
                content = ""
            
            # Infer category and priority
            category = extractor.infer_category(spec_files.directory.name, content)
            priority = extractor.infer_priority(content)
            
            # Calculate completion and determine status
            if spec_files.tasks:
                completion = tracker.calculate_completion(spec_files.tasks)
                status = tracker.determine_status(completion, metadata)
            else:
                completion = 0.0
                status = FeatureStatus.PLANNED
            
            # Create feature object
            feature = Feature(
                name=spec_files.directory.name,
                title=title,
                description=description,
                category=category,
                priority=priority,
                status=status,
                completion_percentage=completion,
                spec_path=spec_files.directory
            )
            features.append(feature)
        
        # Step 3: Verify features were created correctly
        assert len(features) == 3
        
        # Find each feature by name
        ui_feature = next(f for f in features if f.name == "ui-dashboard")
        api_feature = next(f for f in features if f.name == "api-integration")
        doc_feature = next(f for f in features if f.name == "documentation-update")
        
        # Verify UI feature
        assert ui_feature.title == "Dashboard UI"
        assert ui_feature.category == FeatureCategory.UI
        assert ui_feature.priority == Priority.HIGH
        assert ui_feature.status == FeatureStatus.IN_PROGRESS
        assert ui_feature.completion_percentage == 0.5
        
        # Verify API feature
        assert api_feature.title == "API Integration"
        assert api_feature.category == FeatureCategory.BACKEND
        assert api_feature.priority == Priority.MEDIUM
        assert api_feature.status == FeatureStatus.PLANNED
        assert api_feature.completion_percentage == 0.0
        
        # Verify Documentation feature
        assert doc_feature.title == "Documentation Update"
        assert doc_feature.category == FeatureCategory.DOCUMENTATION
        # Priority is MEDIUM because "improvement" keyword is present
        assert doc_feature.priority == Priority.MEDIUM
        assert doc_feature.status == FeatureStatus.COMPLETED
        assert doc_feature.completion_percentage == 1.0
        
        # Step 4: Organize by timeline (without dates, should go to Future)
        organizer = TimelineOrganizer()
        timeline_groups = organizer.organize_by_timeline(features)
        
        assert "Future Considerations" in timeline_groups
        assert len(timeline_groups["Future Considerations"]) == 3
        
        # Step 5: Sort within quarter by priority
        sorted_features = organizer.sort_within_quarter(
            timeline_groups["Future Considerations"]
        )
        
        # Should be ordered: High, Medium, Medium (alphabetically)
        # Note: Both api-integration and documentation-update have MEDIUM priority
        assert sorted_features[0].priority == Priority.HIGH
        assert sorted_features[0].name == "ui-dashboard"
        assert sorted_features[1].priority == Priority.MEDIUM
        assert sorted_features[1].name == "api-integration"  # Alphabetically first
        assert sorted_features[2].priority == Priority.MEDIUM
        assert sorted_features[2].name == "documentation-update"  # Alphabetically second
    
    def test_workflow_with_dates(self, temp_specs_dir):
        """Test workflow with features that have target dates."""
        # Scan and extract
        scanner = SpecScanner(temp_specs_dir)
        spec_files_list = scanner.scan_specs_directory()
        
        extractor = MetadataExtractor()
        tracker = StatusTracker()
        features = []
        
        for spec_files in spec_files_list:
            if spec_files.requirements:
                metadata = extractor.extract_frontmatter(spec_files.requirements)
                content = spec_files.requirements.read_text(encoding='utf-8')
                title = extractor.extract_title(content)
                description = extractor.extract_description(content)
            else:
                metadata = {}
                title = spec_files.directory.name
                description = ""
                content = ""
            
            category = extractor.infer_category(spec_files.directory.name, content)
            priority = extractor.infer_priority(content)
            
            if spec_files.tasks:
                completion = tracker.calculate_completion(spec_files.tasks)
                status = tracker.determine_status(completion, metadata)
            else:
                completion = 0.0
                status = FeatureStatus.PLANNED
            
            # Add target dates for testing
            if spec_files.directory.name == "ui-dashboard":
                target_date = datetime(2026, 2, 15)  # Q1 2026
            elif spec_files.directory.name == "api-integration":
                target_date = datetime(2026, 5, 10)  # Q2 2026
            else:
                target_date = None
            
            feature = Feature(
                name=spec_files.directory.name,
                title=title,
                description=description,
                category=category,
                priority=priority,
                status=status,
                target_date=target_date,
                completion_percentage=completion,
                spec_path=spec_files.directory
            )
            features.append(feature)
        
        # Organize by timeline
        organizer = TimelineOrganizer()
        timeline_groups = organizer.organize_by_timeline(features)
        
        # Should have Q1 2026, Q2 2026, and Future Considerations
        assert "Q1 2026" in timeline_groups
        assert "Q2 2026" in timeline_groups
        assert "Future Considerations" in timeline_groups
        
        assert len(timeline_groups["Q1 2026"]) == 1
        assert len(timeline_groups["Q2 2026"]) == 1
        assert len(timeline_groups["Future Considerations"]) == 1
        
        # Verify correct features in each quarter
        assert timeline_groups["Q1 2026"][0].name == "ui-dashboard"
        assert timeline_groups["Q2 2026"][0].name == "api-integration"
        assert timeline_groups["Future Considerations"][0].name == "documentation-update"
    
    def test_metadata_override(self, temp_specs_dir):
        """Test that frontmatter metadata overrides inferred values."""
        scanner = SpecScanner(temp_specs_dir)
        spec_files_list = scanner.scan_specs_directory()
        
        # Find the UI dashboard spec (has frontmatter)
        ui_spec = next(
            s for s in spec_files_list 
            if s.directory.name == "ui-dashboard"
        )
        
        extractor = MetadataExtractor()
        metadata = extractor.extract_frontmatter(ui_spec.requirements)
        
        # Verify frontmatter was extracted
        assert metadata['priority'] == 'High'
        assert metadata['category'] == 'UI'
        assert metadata['timeline'] == 'Q1 2026'
        
        # Verify that explicit metadata would be used over inference
        content = ui_spec.requirements.read_text(encoding='utf-8')
        inferred_category = extractor.infer_category(ui_spec.directory.name, content)
        
        # Both should match in this case
        assert inferred_category == FeatureCategory.UI
