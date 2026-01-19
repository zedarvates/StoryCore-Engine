#!/usr/bin/env python3
"""
Property-based tests for Timeline Manager.
Tests universal properties that should hold for timeline management.
"""

import pytest
import json
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from timeline_manager import (
    TimelineManager, ShotTiming, FrameTiming, TransitionType, TimelineMetadata
)


# Strategy generators for property-based testing
@composite
def valid_frame_rate(draw):
    """Generate valid frame rates."""
    return draw(st.sampled_from([12.0, 15.0, 24.0, 25.0, 30.0, 48.0, 60.0]))


@composite
def valid_shot_data(draw):
    """Generate valid shot data."""
    shot_id = f"shot_{draw(st.integers(min_value=1, max_value=999)):03d}"
    frame_count = draw(st.integers(min_value=1, max_value=300))  # 1-12.5 seconds at 24fps
    transition_in = draw(st.one_of(st.none(), st.sampled_from(list(TransitionType))))
    transition_out = draw(st.one_of(st.none(), st.sampled_from(list(TransitionType))))
    transition_duration = draw(st.floats(min_value=0.1, max_value=2.0))
    
    return {
        "shot_id": shot_id,
        "frame_count": frame_count,
        "transition_in": transition_in,
        "transition_out": transition_out,
        "transition_duration": transition_duration
    }


@composite
def valid_shot_sequence(draw):
    """Generate a sequence of valid shots."""
    num_shots = draw(st.integers(min_value=1, max_value=8))  # Reduced for performance
    shots = []
    
    for i in range(num_shots):
        shot_data = draw(valid_shot_data())
        shot_data["shot_id"] = f"shot_{i+1:03d}"  # Ensure unique IDs
        shots.append(shot_data)
    
    return shots


class TestTimelineManagerProperties:
    """Property-based tests for Timeline Manager."""
    
    @given(valid_frame_rate(), valid_shot_sequence())
    @settings(max_examples=10, deadline=1000, suppress_health_check=[HealthCheck.too_slow])
    def test_property_ve_8_timeline_timing_accuracy(self, frame_rate, shot_sequence):
        """
        Property VE-8: Timeline Timing Accuracy
        For any valid frame rate and shot sequence, the timeline should maintain
        accurate timing relationships and frame calculations.
        **Validates: Requirements VE-4.3, VE-4.7, VE-6.3**
        """
        timeline = TimelineManager(frame_rate=frame_rate)
        
        # Add all shots to timeline
        added_shots = []
        for shot_data in shot_sequence:
            shot_timing = timeline.add_shot(**shot_data)
            added_shots.append(shot_timing)
        
        # Generate timeline metadata
        metadata = timeline.generate_timeline_metadata()
        
        # Verify timing accuracy
        expected_frame_duration = 1.0 / frame_rate
        
        # Check frame duration consistency
        for frame_timing in metadata.frame_timings:
            assert abs(frame_timing.duration - expected_frame_duration) < 1e-10, \
                f"Frame duration inconsistent: {frame_timing.duration} != {expected_frame_duration}"
        
        # Check shot timing consistency
        for i, shot in enumerate(added_shots):
            assert shot.frame_rate == frame_rate, f"Shot frame rate mismatch: {shot.frame_rate} != {frame_rate}"
            
            expected_duration = shot.frame_count * expected_frame_duration
            assert abs(shot.duration - expected_duration) < 1e-10, \
                f"Shot duration mismatch: {shot.duration} != {expected_duration}"
            
            # Check shot sequencing
            if i > 0:
                prev_shot = added_shots[i-1]
                assert shot.start_time >= prev_shot.end_time, \
                    f"Shot timing overlap: {shot.start_time} < {prev_shot.end_time}"
        
        # Check total timeline consistency
        expected_total_frames = sum(shot.frame_count for shot in added_shots)
        assert metadata.total_frames == expected_total_frames, \
            f"Total frame count mismatch: {metadata.total_frames} != {expected_total_frames}"
        
        expected_total_duration = expected_total_frames * expected_frame_duration
        assert abs(metadata.total_duration - expected_total_duration) < 1e-10, \
            f"Total duration mismatch: {metadata.total_duration} != {expected_total_duration}"
    
    @given(valid_frame_rate())
    @settings(max_examples=7, deadline=1000)
    def test_property_ve_9_frame_rate_consistency(self, frame_rate):
        """
        Property VE-9: Frame Rate Consistency
        For any valid frame rate, all timing calculations should be consistent
        with the specified frame rate throughout the timeline.
        **Validates: Requirements VE-1.4, VE-5.1**
        """
        timeline = TimelineManager(frame_rate=frame_rate)
        
        # Add test shots with different frame counts
        shot_counts = [24, 48, 72]  # 1, 2, 3 seconds at 24fps
        for i, count in enumerate(shot_counts):
            timeline.add_shot(f"test_shot_{i}", count)
        
        metadata = timeline.generate_timeline_metadata()
        
        # Verify frame rate consistency
        assert metadata.frame_rate == frame_rate, \
            f"Metadata frame rate mismatch: {metadata.frame_rate} != {frame_rate}"
        
        # Check frame timing consistency
        expected_frame_duration = 1.0 / frame_rate
        
        for i, frame_timing in enumerate(metadata.frame_timings):
            expected_timestamp = i * expected_frame_duration
            assert abs(frame_timing.timestamp - expected_timestamp) < 1e-10, \
                f"Frame {i} timestamp inconsistent: {frame_timing.timestamp} != {expected_timestamp}"
            
            assert abs(frame_timing.duration - expected_frame_duration) < 1e-10, \
                f"Frame {i} duration inconsistent: {frame_timing.duration} != {expected_frame_duration}"
        
        # Check shot frame rates
        for shot in metadata.shot_timings:
            assert shot.frame_rate == frame_rate, \
                f"Shot {shot.shot_id} frame rate inconsistent: {shot.frame_rate} != {frame_rate}"
    
    @given(valid_shot_sequence())
    @settings(max_examples=7, deadline=1000)
    def test_property_ve_10_synchronization_metadata_completeness(self, shot_sequence):
        """
        Property VE-10: Synchronization Metadata Completeness
        For any shot sequence, the timeline should generate complete synchronization
        metadata including all required fields and relationships.
        **Validates: Requirements VE-4.7, VE-6.3**
        """
        timeline = TimelineManager(frame_rate=24.0)
        
        # Add shots to timeline
        for shot_data in shot_sequence:
            timeline.add_shot(**shot_data)
        
        metadata = timeline.generate_timeline_metadata()
        
        # Verify metadata completeness
        assert hasattr(metadata, 'total_duration'), "Missing total_duration"
        assert hasattr(metadata, 'total_frames'), "Missing total_frames"
        assert hasattr(metadata, 'frame_rate'), "Missing frame_rate"
        assert hasattr(metadata, 'shot_timings'), "Missing shot_timings"
        assert hasattr(metadata, 'frame_timings'), "Missing frame_timings"
        assert hasattr(metadata, 'audio_sync_points'), "Missing audio_sync_points"
        assert hasattr(metadata, 'transition_metadata'), "Missing transition_metadata"
        
        # Verify shot timing completeness
        for shot in metadata.shot_timings:
            assert hasattr(shot, 'shot_id'), f"Shot missing shot_id"
            assert hasattr(shot, 'start_time'), f"Shot {shot.shot_id} missing start_time"
            assert hasattr(shot, 'end_time'), f"Shot {shot.shot_id} missing end_time"
            assert hasattr(shot, 'duration'), f"Shot {shot.shot_id} missing duration"
            assert hasattr(shot, 'frame_count'), f"Shot {shot.shot_id} missing frame_count"
            assert hasattr(shot, 'frame_rate'), f"Shot {shot.shot_id} missing frame_rate"
        
        # Verify frame timing completeness
        for frame in metadata.frame_timings:
            assert hasattr(frame, 'frame_number'), "Frame missing frame_number"
            assert hasattr(frame, 'timestamp'), "Frame missing timestamp"
            assert hasattr(frame, 'duration'), "Frame missing duration"
            assert hasattr(frame, 'shot_id'), "Frame missing shot_id"
            assert hasattr(frame, 'sequence_position'), "Frame missing sequence_position"
        
        # Verify audio sync points exist and are properly formatted
        assert len(metadata.audio_sync_points) > 0, "No audio sync points generated"
        
        for sync_point in metadata.audio_sync_points:
            assert 'timestamp' in sync_point, "Sync point missing timestamp"
            assert 'type' in sync_point, "Sync point missing type"
            assert 'frame_number' in sync_point, "Sync point missing frame_number"
            assert isinstance(sync_point['timestamp'], (int, float)), "Invalid timestamp type"
            assert isinstance(sync_point['frame_number'], int), "Invalid frame_number type"
    
    @given(
        st.floats(min_value=0.0, max_value=10.0),
        valid_shot_sequence()
    )
    @settings(max_examples=7, deadline=1000)
    def test_property_ve_11_time_based_queries(self, query_time, shot_sequence):
        """
        Property VE-11: Time-based Query Accuracy
        For any valid timeline and query time, time-based queries should return
        accurate and consistent results.
        **Validates: Requirements VE-4.3, VE-6.3**
        """
        timeline = TimelineManager(frame_rate=24.0)
        
        # Add shots to timeline
        for shot_data in shot_sequence:
            timeline.add_shot(**shot_data)
        
        if not timeline.shots:
            return  # Skip if no shots added
        
        metadata = timeline.generate_timeline_metadata()
        
        # Test shot query
        shot_at_time = timeline.get_shot_at_time(query_time)
        
        if query_time < metadata.total_duration:
            # Should find a shot within timeline duration
            if shot_at_time:
                assert shot_at_time.start_time <= query_time < shot_at_time.end_time, \
                    f"Shot time range incorrect: {query_time} not in [{shot_at_time.start_time}, {shot_at_time.end_time})"
        else:
            # Should not find a shot beyond timeline duration
            assert shot_at_time is None, f"Found shot beyond timeline duration: {query_time} >= {metadata.total_duration}"
        
        # Test frame query
        frame_at_time = timeline.get_frame_at_time(query_time)
        
        if query_time < metadata.total_duration:
            if frame_at_time:
                frame_end_time = frame_at_time.timestamp + frame_at_time.duration
                assert frame_at_time.timestamp <= query_time < frame_end_time, \
                    f"Frame time range incorrect: {query_time} not in [{frame_at_time.timestamp}, {frame_end_time})"
                
                # Frame should belong to the same shot (if shot found)
                if shot_at_time:
                    assert frame_at_time.shot_id == shot_at_time.shot_id, \
                        f"Frame shot mismatch: {frame_at_time.shot_id} != {shot_at_time.shot_id}"
    
    @given(valid_shot_sequence())
    @settings(max_examples=5, deadline=1000)
    def test_property_ve_12_metadata_export_roundtrip(self, shot_sequence):
        """
        Property VE-12: Metadata Export Roundtrip Integrity
        For any timeline, exported metadata should maintain data integrity
        and be properly serializable/deserializable.
        **Validates: Requirements VE-10.3, VE-10.5**
        """
        timeline = TimelineManager(frame_rate=24.0)
        
        # Add shots to timeline
        for shot_data in shot_sequence:
            timeline.add_shot(**shot_data)
        
        if not timeline.shots:
            return  # Skip if no shots
        
        # Generate and export metadata
        original_metadata = timeline.generate_timeline_metadata()
        
        # Export to temporary file
        temp_file = "test_timeline_export.json"
        success = timeline.export_timeline_metadata(temp_file)
        assert success, "Failed to export timeline metadata"
        
        try:
            # Verify file was created and is valid JSON
            temp_path = Path(temp_file)
            assert temp_path.exists(), "Export file not created"
            
            with open(temp_path, 'r') as f:
                exported_data = json.load(f)
            
            # Verify essential fields are present and correct
            assert exported_data['total_duration'] == original_metadata.total_duration
            assert exported_data['total_frames'] == original_metadata.total_frames
            assert exported_data['frame_rate'] == original_metadata.frame_rate
            assert len(exported_data['shot_timings']) == len(original_metadata.shot_timings)
            assert len(exported_data['frame_timings']) == len(original_metadata.frame_timings)
            assert len(exported_data['audio_sync_points']) == len(original_metadata.audio_sync_points)
            
            # Verify shot timing data integrity
            for i, shot_data in enumerate(exported_data['shot_timings']):
                original_shot = original_metadata.shot_timings[i]
                assert shot_data['shot_id'] == original_shot.shot_id
                assert abs(shot_data['start_time'] - original_shot.start_time) < 1e-10
                assert abs(shot_data['end_time'] - original_shot.end_time) < 1e-10
                assert shot_data['frame_count'] == original_shot.frame_count
            
        finally:
            # Clean up temporary file
            if Path(temp_file).exists():
                Path(temp_file).unlink()


def test_timeline_manager_basic_functionality():
    """Test basic functionality of timeline manager."""
    timeline = TimelineManager(frame_rate=24.0)
    
    # Add test shots
    shot1 = timeline.add_shot("test_001", 48)  # 2 seconds
    shot2 = timeline.add_shot("test_002", 72)  # 3 seconds
    
    assert len(timeline.shots) == 2
    assert shot1.duration == 2.0
    assert shot2.duration == 3.0
    assert shot2.start_time == shot1.end_time
    
    # Generate metadata
    metadata = timeline.generate_timeline_metadata()
    
    assert metadata.total_duration == 5.0
    assert metadata.total_frames == 120
    assert len(metadata.shot_timings) == 2
    assert len(metadata.frame_timings) == 120
    
    # Test time queries
    shot_at_1s = timeline.get_shot_at_time(1.0)
    assert shot_at_1s.shot_id == "test_001"
    
    shot_at_3s = timeline.get_shot_at_time(3.0)
    assert shot_at_3s.shot_id == "test_002"


if __name__ == "__main__":
    # Run basic functionality test
    test_timeline_manager_basic_functionality()
    print("✓ Basic timeline manager tests passed")
    
    # Run a few property tests manually
    test_instance = TestTimelineManagerProperties()
    
    print("Timeline manager property tests ready for execution")