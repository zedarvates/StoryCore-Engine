"""
Property-based tests for TimelineGenerator.

These tests verify universal properties that should hold across all valid inputs.
Uses hypothesis for property-based testing with minimum 100 iterations per test.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from hypothesis import given, strategies as st, settings

from src.memory_system.timeline_generator import TimelineGenerator


# Strategy for generating event types
def event_type_strategy():
    """Generate valid event types."""
    return st.sampled_from([
        'project_creation',
        'major_decision',
        'asset_addition',
        'error_occurrence',
        'recovery_event',
        'milestone',
        'discussion',
        'configuration_change',
    ])


# Strategy for generating project context
def project_context_strategy():
    """Generate valid project context structures."""
    return st.fixed_dictionaries({
        "config": st.fixed_dictionaries({
            "project_name": st.text(min_size=1, max_size=50),
            "project_type": st.sampled_from(["video", "script", "creative", "technical"]),
        }),
        "memory": st.fixed_dictionaries({
            "objectives": st.lists(
                st.fixed_dictionaries({
                    "id": st.text(min_size=1, max_size=20),
                    "description": st.text(min_size=10, max_size=200),
                    "status": st.sampled_from(["active", "completed", "abandoned"]),
                    "added": st.datetimes(
                        min_value=datetime(2020, 1, 1),
                        max_value=datetime(2030, 12, 31)
                    ).map(lambda dt: dt.isoformat())
                }),
                min_size=0,
                max_size=10
            ),
            "entities": st.lists(
                st.fixed_dictionaries({
                    "id": st.text(min_size=1, max_size=20),
                    "name": st.text(min_size=1, max_size=50),
                    "type": st.sampled_from(["character", "module", "component", "concept"]),
                    "description": st.text(min_size=10, max_size=200),
                    "attributes": st.dictionaries(
                        st.text(min_size=1, max_size=20),
                        st.text(min_size=1, max_size=100),
                        min_size=0,
                        max_size=5
                    ),
                    "added": st.datetimes(
                        min_value=datetime(2020, 1, 1),
                        max_value=datetime(2030, 12, 31)
                    ).map(lambda dt: dt.isoformat())
                }),
                min_size=0,
                max_size=10
            ),
            "decisions": st.lists(
                st.fixed_dictionaries({
                    "id": st.text(min_size=1, max_size=20),
                    "description": st.text(min_size=10, max_size=200),
                    "rationale": st.text(min_size=10, max_size=200),
                    "alternatives_considered": st.lists(
                        st.text(min_size=5, max_size=100),
                        min_size=0,
                        max_size=5
                    ),
                    "timestamp": st.datetimes(
                        min_value=datetime(2020, 1, 1),
                        max_value=datetime(2030, 12, 31)
                    ).map(lambda dt: dt.isoformat())
                }),
                min_size=0,
                max_size=10
            ),
            "task_backlog": st.lists(
                st.fixed_dictionaries({
                    "id": st.text(min_size=1, max_size=20),
                    "description": st.text(min_size=10, max_size=200),
                    "priority": st.sampled_from(["low", "medium", "high", "critical"]),
                    "status": st.sampled_from(["pending", "in_progress", "completed"]),
                    "added": st.datetimes(
                        min_value=datetime(2020, 1, 1),
                        max_value=datetime(2030, 12, 31)
                    ).map(lambda dt: dt.isoformat())
                }),
                min_size=0,
                max_size=10
            ),
            "current_state": st.fixed_dictionaries({
                "phase": st.text(min_size=1, max_size=50),
                "progress_percentage": st.integers(min_value=0, max_value=100),
                "active_tasks": st.lists(
                    st.text(min_size=1, max_size=50),
                    min_size=0,
                    max_size=5
                ),
                "blockers": st.lists(
                    st.text(min_size=10, max_size=100),
                    min_size=0,
                    max_size=5
                ),
                "last_activity": st.datetimes(
                    min_value=datetime(2020, 1, 1),
                    max_value=datetime(2030, 12, 31)
                ).map(lambda dt: dt.isoformat())
            })
        })
    })


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory for testing."""
    temp_path = Path(tempfile.mkdtemp())
    # Create summaries directory
    (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
    yield temp_path
    # Cleanup
    shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 57: Session-Based Overview Updates
@settings(max_examples=100, deadline=None)
@given(context=project_context_strategy())
def test_property_session_based_overview_updates(context):
    """
    Property 57: Session-Based Overview Updates
    
    For any session, project_overview.txt SHALL be updated at least once.
    
    Validates: Requirements 13.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Update overview (simulating session activity)
        result = generator.update_overview(context, force=True)
        
        # Verify: Update was successful
        assert result is True, "Overview update should succeed"
        
        # Verify: Overview file was created
        overview_path = temp_path / "summaries" / "project_overview.txt"
        assert overview_path.exists(), "Overview file should be created"
        
        # Verify: Overview contains content
        with open(overview_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        assert len(content) > 0, "Overview should not be empty"
        assert "PROJECT OVERVIEW" in content, "Overview should have header"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 58: Timeline Event Recording
@settings(max_examples=100, deadline=None)
@given(
    event_type=event_type_strategy(),
    description=st.text(min_size=10, max_size=200)
)
def test_property_timeline_event_recording(event_type, description):
    """
    Property 58: Timeline Event Recording
    
    For any significant event (project creation, major decision, asset addition,
    error occurrence, recovery event), timeline.txt SHALL be updated.
    
    Validates: Requirements 14.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Record event
        result = generator.record_event(event_type, description)
        
        # Verify: Recording was successful
        assert result is True, "Event recording should succeed"
        
        # Verify: Timeline file was created
        timeline_path = temp_path / "summaries" / "timeline.txt"
        assert timeline_path.exists(), "Timeline file should be created"
        
        # Verify: Event was recorded
        with open(timeline_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        assert len(content) > 0, "Timeline should not be empty"
        assert event_type.upper() in content, f"Timeline should contain event type {event_type}"
        
        # Sanitize description for comparison (same as what's done in record_event)
        clean_description = description.replace('\r', ' ').replace('\n', ' ').strip()
        if clean_description:  # Only check if there's content after sanitization
            assert clean_description in content, "Timeline should contain sanitized event description"
        
        # Verify: Event has timestamp
        assert '[' in content and ']' in content, "Timeline entry should have timestamp"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 59: Timeline Chronological Ordering
@settings(max_examples=100, deadline=None)
@given(
    num_events=st.integers(min_value=2, max_value=20)
)
def test_property_timeline_chronological_ordering(num_events):
    """
    Property 59: Timeline Chronological Ordering
    
    For any timeline.txt, events SHALL be listed in chronological order with timestamps.
    
    Validates: Requirements 14.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Record multiple events
        for i in range(num_events):
            generator.record_event(
                "milestone",
                f"Event {i}",
                details={"sequence": str(i)}
            )
        
        # Verify: Get timeline events
        events = generator.get_timeline(limit=num_events)
        
        # Verify: Events are returned
        assert len(events) > 0, "Timeline should contain events"
        assert len(events) <= num_events, "Timeline should not exceed requested limit"
        
        # Verify: Events are in chronological order (most recent first)
        timestamps = [event['timestamp'] for event in events]
        
        # Check that timestamps are in descending order (most recent first)
        for i in range(len(timestamps) - 1):
            # Compare ISO 8601 timestamps as strings (they sort correctly)
            assert timestamps[i] >= timestamps[i + 1], \
                f"Timeline events should be in reverse chronological order: {timestamps[i]} should be >= {timestamps[i + 1]}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 60: Timeline Event Coverage
@settings(max_examples=100, deadline=None)
@given(
    project_name=st.text(min_size=1, max_size=50),
    project_type=st.sampled_from(["video", "script", "creative", "technical"]),
    asset_name=st.text(min_size=1, max_size=50),
    asset_type=st.sampled_from(["image", "audio", "video", "document"]),
    error_type=st.text(min_size=5, max_size=50),
    error_severity=st.sampled_from(["low", "medium", "high", "critical"]),
    recovery_type=st.text(min_size=5, max_size=50)
)
def test_property_timeline_event_coverage(
    project_name, project_type, asset_name, asset_type,
    error_type, error_severity, recovery_type
):
    """
    Property 60: Timeline Event Coverage
    
    For any timeline.txt, it SHALL include all major event types (project creation,
    decisions, asset additions, errors, recovery events).
    
    Validates: Requirements 14.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Record all major event types
        events_recorded = []
        
        # Project creation
        result1 = generator.record_project_creation(project_name, project_type, ["objective1"])
        events_recorded.append(("project_creation", result1))
        
        # Major decision
        result2 = generator.record_decision("Test decision", "Test rationale")
        events_recorded.append(("major_decision", result2))
        
        # Asset addition
        result3 = generator.record_asset_addition(asset_name, asset_type)
        events_recorded.append(("asset_addition", result3))
        
        # Error occurrence
        result4 = generator.record_error(error_type, "Test error description", error_severity)
        events_recorded.append(("error_occurrence", result4))
        
        # Recovery event
        result5 = generator.record_recovery(recovery_type, "success")
        events_recorded.append(("recovery_event", result5))
        
        # Verify: All events were recorded successfully
        for event_type, result in events_recorded:
            assert result is True, f"Event type {event_type} should be recorded successfully"
        
        # Verify: Timeline contains all event types
        timeline_path = temp_path / "summaries" / "timeline.txt"
        assert timeline_path.exists(), "Timeline file should exist"
        
        with open(timeline_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for each event type
        assert "PROJECT_CREATION" in content, "Timeline should contain project creation event"
        assert "MAJOR_DECISION" in content, "Timeline should contain decision event"
        assert "ASSET_ADDITION" in content, "Timeline should contain asset addition event"
        assert "ERROR_OCCURRENCE" in content, "Timeline should contain error event"
        assert "RECOVERY_EVENT" in content, "Timeline should contain recovery event"
        
        # Verify: Get timeline returns all events
        events = generator.get_timeline(limit=100)
        assert len(events) >= 5, "Timeline should contain at least 5 events"
        
        # Verify: Each event has required fields
        for event in events:
            assert 'timestamp' in event, "Event should have timestamp"
            assert 'event_type' in event, "Event should have event_type"
            assert 'description' in event, "Event should have description"
            assert 'details' in event, "Event should have details"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 61: Timeline Format Consistency
@settings(max_examples=100, deadline=None)
@given(
    events=st.lists(
        st.tuples(
            event_type_strategy(),
            st.text(min_size=10, max_size=200)
        ),
        min_size=1,
        max_size=10
    )
)
def test_property_timeline_format_consistency(events):
    """
    Property 61: Timeline Format Consistency
    
    For any timeline entries, they SHALL use consistent formatting for easy parsing.
    
    Validates: Requirements 14.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Record multiple events
        for event_type, description in events:
            generator.record_event(event_type, description)
        
        # Verify: Timeline file exists
        timeline_path = temp_path / "summaries" / "timeline.txt"
        assert timeline_path.exists(), "Timeline file should exist"
        
        # Verify: Read and parse timeline
        with open(timeline_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        
        # Verify: Consistent format
        event_headers = []
        for line in lines:
            if line.strip().startswith('[') and ']' in line:
                event_headers.append(line)
        
        # Should have at least as many headers as events
        assert len(event_headers) >= len(events), \
            f"Timeline should have at least {len(events)} event headers, found {len(event_headers)}"
        
        # Verify: Each header follows format: [timestamp] EVENT_TYPE
        for header in event_headers:
            # Check for timestamp in brackets
            assert header.strip().startswith('['), "Event header should start with ["
            assert ']' in header, "Event header should contain ]"
            
            # Extract timestamp
            timestamp_end = header.index(']')
            timestamp = header[1:timestamp_end]
            
            # Verify timestamp is ISO 8601 format (basic check)
            assert 'T' in timestamp or '-' in timestamp, \
                f"Timestamp should be in ISO 8601 format: {timestamp}"
            
            # Verify event type is uppercase
            event_type_part = header[timestamp_end + 2:].strip()
            assert event_type_part.isupper(), \
                f"Event type should be uppercase: {event_type_part}"
        
        # Verify: Events are separated by empty lines
        # Count empty lines
        empty_lines = [i for i, line in enumerate(lines) if not line.strip()]
        
        # Should have empty lines separating events
        assert len(empty_lines) > 0, "Timeline should have empty lines separating events"
        
        # Verify: Get timeline returns properly structured events
        retrieved_events = generator.get_timeline(limit=len(events))
        
        for event in retrieved_events:
            # Check required fields
            assert 'timestamp' in event, "Event should have timestamp field"
            assert 'event_type' in event, "Event should have event_type field"
            assert 'description' in event, "Event should have description field"
            assert 'details' in event, "Event should have details field"
            
            # Check field types
            assert isinstance(event['timestamp'], str), "Timestamp should be string"
            assert isinstance(event['event_type'], str), "Event type should be string"
            assert isinstance(event['description'], str), "Description should be string"
            assert isinstance(event['details'], dict), "Details should be dictionary"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 57: Session-Based Overview Updates (Multiple Sessions)
@settings(max_examples=100, deadline=None)
@given(
    context=project_context_strategy(),
    num_updates=st.integers(min_value=1, max_value=5)
)
def test_property_overview_multiple_updates(context, num_updates):
    """
    Property 57 (Multiple Updates): Session-Based Overview Updates
    
    For any session with multiple significant changes, project_overview.txt
    can be updated multiple times and should reflect the latest state.
    
    Validates: Requirements 13.5
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Update overview multiple times
        for i in range(num_updates):
            # Modify context slightly for each update
            modified_context = context.copy()
            modified_context['memory'] = context['memory'].copy()
            modified_context['memory']['current_state'] = context['memory']['current_state'].copy()
            modified_context['memory']['current_state']['progress_percentage'] = \
                min(100, context['memory']['current_state']['progress_percentage'] + i * 10)
            
            result = generator.update_overview(modified_context, force=True)
            assert result is True, f"Overview update {i+1} should succeed"
        
        # Verify: Overview file exists
        overview_path = temp_path / "summaries" / "project_overview.txt"
        assert overview_path.exists(), "Overview file should exist after updates"
        
        # Verify: Overview contains latest content
        with open(overview_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        assert len(content) > 0, "Overview should not be empty"
        assert "PROJECT OVERVIEW" in content, "Overview should have header"
        
        # Verify: Timeline records the updates
        events = generator.get_timeline(limit=100)
        config_changes = [e for e in events if e['event_type'] == 'CONFIGURATION_CHANGE']
        
        # Should have at least one configuration change event
        assert len(config_changes) >= 1, \
            "Timeline should record overview updates as configuration changes"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 58: Timeline Event Recording (Persistence)
@settings(max_examples=100, deadline=None)
@given(
    events=st.lists(
        st.tuples(
            event_type_strategy(),
            st.text(min_size=10, max_size=200)
        ),
        min_size=1,
        max_size=10
    )
)
def test_property_timeline_event_persistence(events):
    """
    Property 58 (Persistence): Timeline Event Recording
    
    For any recorded events, they should persist across TimelineGenerator
    instances (file-based persistence).
    
    Validates: Requirements 14.1
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        
        # Execute: Record events with first generator instance
        generator1 = TimelineGenerator(temp_path)
        for event_type, description in events:
            result = generator1.record_event(event_type, description)
            assert result is True, "Event recording should succeed"
        
        # Get event count from first instance
        events1 = generator1.get_timeline(limit=100)
        count1 = len(events1)
        
        # Create new generator instance (simulating new session)
        generator2 = TimelineGenerator(temp_path)
        
        # Verify: Events are still accessible
        events2 = generator2.get_timeline(limit=100)
        count2 = len(events2)
        
        assert count2 == count1, \
            f"Event count should persist across instances: {count1} vs {count2}"
        
        # Verify: Event content matches
        for i in range(min(len(events1), len(events2))):
            assert events1[i]['event_type'] == events2[i]['event_type'], \
                "Event types should match across instances"
            assert events1[i]['description'] == events2[i]['description'], \
                "Event descriptions should match across instances"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 59: Timeline Chronological Ordering (Empty Timeline)
def test_property_timeline_empty():
    """
    Property 59 (Empty): Timeline Chronological Ordering
    
    For an empty timeline, get_timeline should return an empty list.
    
    Validates: Requirements 14.2
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Get timeline without recording any events
        events = generator.get_timeline()
        
        # Verify: Returns empty list
        assert events == [], "Empty timeline should return empty list"
        assert isinstance(events, list), "Should return a list"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 60: Timeline Event Coverage (Event Count)
@settings(max_examples=100, deadline=None)
@given(num_events=st.integers(min_value=1, max_value=50))
def test_property_timeline_event_count(num_events):
    """
    Property 60 (Count): Timeline Event Coverage
    
    For any number of recorded events, get_event_count should return
    the correct count.
    
    Validates: Requirements 14.3
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Record events
        for i in range(num_events):
            generator.record_event("milestone", f"Event {i}")
        
        # Verify: Event count is correct
        count = generator.get_event_count()
        
        assert count == num_events, \
            f"Event count should be {num_events}, got {count}"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)


# Feature: storycore-llm-memory-system, Property 61: Timeline Format Consistency (Details Handling)
@settings(max_examples=100, deadline=None)
@given(
    event_type=event_type_strategy(),
    description=st.text(min_size=10, max_size=200),
    details=st.one_of(
        st.none(),
        st.dictionaries(
            st.text(min_size=1, max_size=20),
            st.text(min_size=1, max_size=100),
            min_size=0,
            max_size=5
        )
    )
)
def test_property_timeline_details_handling(event_type, description, details):
    """
    Property 61 (Details): Timeline Format Consistency
    
    For any event with or without details, the timeline should handle
    both cases consistently.
    
    Validates: Requirements 14.4
    """
    # Setup
    temp_path = Path(tempfile.mkdtemp())
    try:
        (temp_path / "summaries").mkdir(parents=True, exist_ok=True)
        generator = TimelineGenerator(temp_path)
        
        # Execute: Record event with or without details
        result = generator.record_event(event_type, description, details=details)
        
        # Verify: Recording succeeded
        assert result is True, "Event recording should succeed"
        
        # Verify: Event can be retrieved
        events = generator.get_timeline(limit=1)
        
        assert len(events) == 1, "Should retrieve one event"
        
        event = events[0]
        assert event['event_type'] == event_type.upper(), "Event type should match"
        
        # Sanitize description for comparison (same as what's done in record_event)
        clean_description = description.replace('\r', ' ').replace('\n', ' ').strip()
        assert event['description'] == clean_description, "Description should match (sanitized)"
        assert 'details' in event, "Event should have details field"
        
        # Verify: Details are properly stored (with sanitization)
        if details:
            for key, value in details.items():
                # Sanitize both key and value
                clean_key = str(key).replace('\r', ' ').replace('\n', ' ').strip()
                clean_value = str(value).replace('\r', ' ').replace('\n', ' ').strip()
                
                # Only check if both key and value are non-empty after sanitization
                if clean_key and clean_value:
                    assert clean_key in event['details'], \
                        f"Detail key '{clean_key}' should be in event details"
                    assert event['details'][clean_key] == clean_value, \
                        f"Detail value for '{clean_key}' should match (sanitized)"
        else:
            # Details should be empty dict if None was provided
            assert isinstance(event['details'], dict), "Details should be a dictionary"
        
    finally:
        # Cleanup
        shutil.rmtree(temp_path, ignore_errors=True)
