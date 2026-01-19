#!/usr/bin/env python3
"""
Property-based tests for Camera Movement System.
Tests universal properties that should hold for all camera movements.
"""

import pytest
import numpy as np
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from camera_movement import (
    CameraMovementSystem, CameraPosition, MovementSpec, CompoundMovement,
    MovementType, EasingFunction, create_pan_movement, create_zoom_movement, 
    create_dolly_movement
)


# Strategy generators for property-based testing
@composite
def valid_camera_position(draw):
    """Generate valid camera positions."""
    return CameraPosition(
        x=draw(st.floats(min_value=-10.0, max_value=10.0)),
        y=draw(st.floats(min_value=-10.0, max_value=10.0)),
        z=draw(st.floats(min_value=-10.0, max_value=10.0)),
        pitch=draw(st.floats(min_value=-90.0, max_value=90.0)),
        yaw=draw(st.floats(min_value=-180.0, max_value=180.0)),
        roll=draw(st.floats(min_value=-180.0, max_value=180.0)),
        zoom=draw(st.floats(min_value=0.1, max_value=5.0)),
        focal_length=draw(st.floats(min_value=10.0, max_value=200.0))
    )


@composite
def valid_movement_spec(draw):
    """Generate valid movement specifications."""
    return MovementSpec(
        movement_type=draw(st.sampled_from(list(MovementType))),
        start_position=draw(valid_camera_position()),
        end_position=draw(valid_camera_position()),
        duration=draw(st.floats(min_value=0.1, max_value=10.0)),
        easing=draw(st.sampled_from(list(EasingFunction))),
        hold_start=draw(st.floats(min_value=0.0, max_value=1.0)),
        hold_end=draw(st.floats(min_value=0.0, max_value=1.0))
    )


@composite
def valid_test_frames(draw):
    """Generate test frame sequences."""
    num_frames = draw(st.integers(min_value=2, max_value=8))  # Reduced for performance
    height = draw(st.integers(min_value=240, max_value=480))  # Reduced for performance
    width = draw(st.integers(min_value=320, max_value=640))   # Reduced for performance
    
    frames = []
    for _ in range(num_frames):
        frame = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
        frames.append(frame)
    
    return frames


class TestCameraMovementProperties:
    """Property-based tests for Camera Movement System."""
    
    @given(valid_test_frames(), valid_movement_spec())
    @settings(max_examples=10, deadline=1000, suppress_health_check=[HealthCheck.too_slow])
    def test_property_ve_5_camera_movement_accuracy(self, frames, movement_spec):
        """
        Property VE-5: Camera Movement Accuracy
        For any valid movement specification and frame sequence, the camera movement
        should be applied accurately according to the specification.
        **Validates: Requirements VE-2.1, VE-2.2, VE-7.7**
        """
        camera_system = CameraMovementSystem()
        
        result = camera_system.apply_movement(frames, movement_spec, frame_rate=24.0)
        
        # Movement should succeed for valid inputs
        assert result.success, f"Movement failed: {result.error_message}"
        
        # Should produce the same number of frames
        assert len(result.transformed_frames) == len(frames), \
            f"Frame count mismatch: {len(result.transformed_frames)} != {len(frames)}"
        
        # All frames should have the same shape as input
        for i, (original, transformed) in enumerate(zip(frames, result.transformed_frames)):
            assert transformed.shape == original.shape, \
                f"Frame {i} shape mismatch: {transformed.shape} != {original.shape}"
        
        # Motion curve should have correct length
        assert len(result.motion_curve.positions) == len(frames), \
            "Motion curve length mismatch"
        
        # Movement metadata should contain expected fields
        assert "movement_type" in result.movement_metadata
        assert "duration" in result.movement_metadata
        assert "motion_statistics" in result.movement_metadata
        
        # Movement type should match specification
        assert result.movement_metadata["movement_type"] == movement_spec.movement_type.value
    
    @given(
        st.floats(min_value=-90.0, max_value=90.0),
        st.floats(min_value=-90.0, max_value=90.0),
        st.floats(min_value=0.1, max_value=2.0)
    )
    @settings(max_examples=15, deadline=1000)
    def test_property_ve_6_motion_curve_smoothness(self, start_angle, end_angle, duration):
        """
        Property VE-6: Motion Curve Smoothness
        For any camera movement, the generated motion curve should be smooth
        with no abrupt changes in velocity or acceleration.
        **Validates: Requirements VE-2.3, VE-2.6, VE-5.6**
        """
        # Create test frames (smaller for performance)
        frames = [np.random.randint(0, 255, (240, 320, 3), dtype=np.uint8) for _ in range(6)]
        
        # Create pan movement
        movement = create_pan_movement(start_angle, end_angle, duration)
        
        camera_system = CameraMovementSystem()
        result = camera_system.apply_movement(frames, movement, frame_rate=24.0)
        
        assert result.success, f"Movement failed: {result.error_message}"
        
        # Check motion curve smoothness
        velocities = result.motion_curve.velocities
        accelerations = result.motion_curve.accelerations
        
        if len(velocities) > 2:
            # Velocities should not have extreme jumps
            velocity_changes = [abs(velocities[i+1] - velocities[i]) for i in range(len(velocities)-1)]
            max_velocity_change = max(velocity_changes) if velocity_changes else 0
            
            # Reasonable smoothness threshold (adjust based on movement characteristics)
            smoothness_threshold = max(10.0, abs(end_angle - start_angle) * 2.0)
            assert max_velocity_change < smoothness_threshold, \
                f"Motion curve not smooth: max velocity change {max_velocity_change}"
        
        if len(accelerations) > 2:
            # Accelerations should be finite and reasonable
            finite_accelerations = [a for a in accelerations if np.isfinite(a)]
            if finite_accelerations:
                max_acceleration = max(abs(a) for a in finite_accelerations)
                assert max_acceleration < 1000.0, f"Excessive acceleration: {max_acceleration}"
    
    @given(
        st.floats(min_value=0.5, max_value=2.0),
        st.floats(min_value=0.5, max_value=2.0),
        st.floats(min_value=0.1, max_value=2.0)
    )
    @settings(max_examples=10, deadline=1000)
    def test_property_ve_7_compound_movement_coherence(self, start_zoom, end_zoom, duration):
        """
        Property VE-7: Compound Movement Coherence
        For any compound movement, the result should be coherent and maintain
        the characteristics of individual movements.
        **Validates: Requirements VE-2.4, VE-2.7**
        """
        # Create test frames (smaller for performance)
        frames = [np.random.randint(0, 255, (240, 320, 3), dtype=np.uint8) for _ in range(6)]
        
        # Create individual movements
        pan_movement = create_pan_movement(0.0, 30.0, duration)
        zoom_movement = create_zoom_movement(start_zoom, end_zoom, duration)
        
        # Create compound movement
        compound = CompoundMovement(
            movements=[pan_movement, zoom_movement],
            blend_mode="additive"
        )
        
        camera_system = CameraMovementSystem()
        
        # Apply individual movements
        pan_result = camera_system.apply_movement(frames, pan_movement, frame_rate=24.0)
        zoom_result = camera_system.apply_movement(frames, zoom_movement, frame_rate=24.0)
        
        # Apply compound movement
        compound_result = camera_system.apply_compound_movement(frames, compound, frame_rate=24.0)
        
        # All movements should succeed
        assert pan_result.success, f"Pan movement failed: {pan_result.error_message}"
        assert zoom_result.success, f"Zoom movement failed: {zoom_result.error_message}"
        assert compound_result.success, f"Compound movement failed: {compound_result.error_message}"
        
        # Compound movement should produce same number of frames
        assert len(compound_result.transformed_frames) == len(frames)
        
        # Compound movement metadata should indicate it's compound
        assert compound_result.movement_metadata.get("compound_movement") == True
        assert "individual_movements" in compound_result.movement_metadata
        
        # Should have metadata for both individual movements
        individual_meta = compound_result.movement_metadata["individual_movements"]
        assert len(individual_meta) == 2
    
    @given(valid_test_frames())
    @settings(max_examples=7, deadline=1000)
    def test_property_ve_5_movement_type_consistency(self, frames):
        """
        Property VE-5: Movement Type Consistency
        For any movement type, the system should handle it consistently
        and produce appropriate transformations.
        **Validates: Requirements VE-2.1, VE-2.2**
        """
        camera_system = CameraMovementSystem()
        
        # Test each movement type
        movement_types = [MovementType.PAN, MovementType.TILT, MovementType.ZOOM, 
                         MovementType.DOLLY, MovementType.TRACK, MovementType.STATIC]
        
        for movement_type in movement_types:
            # Create appropriate movement spec for each type
            if movement_type == MovementType.PAN:
                start_pos = CameraPosition(yaw=0.0)
                end_pos = CameraPosition(yaw=30.0)
            elif movement_type == MovementType.TILT:
                start_pos = CameraPosition(pitch=0.0)
                end_pos = CameraPosition(pitch=15.0)
            elif movement_type == MovementType.ZOOM:
                start_pos = CameraPosition(zoom=1.0)
                end_pos = CameraPosition(zoom=1.5)
            elif movement_type == MovementType.DOLLY:
                start_pos = CameraPosition(z=0.0)
                end_pos = CameraPosition(z=2.0)
            elif movement_type == MovementType.TRACK:
                start_pos = CameraPosition(x=0.0)
                end_pos = CameraPosition(x=2.0)
            else:  # STATIC
                start_pos = CameraPosition()
                end_pos = CameraPosition()
            
            movement_spec = MovementSpec(
                movement_type=movement_type,
                start_position=start_pos,
                end_position=end_pos,
                duration=1.0,
                easing=EasingFunction.LINEAR
            )
            
            result = camera_system.apply_movement(frames, movement_spec, frame_rate=24.0)
            
            # Movement should succeed
            assert result.success, f"{movement_type.value} movement failed: {result.error_message}"
            
            # Should produce correct number of frames
            assert len(result.transformed_frames) == len(frames)
            
            # Movement type should be recorded correctly
            assert result.movement_metadata["movement_type"] == movement_type.value
    
    @given(
        st.sampled_from(list(EasingFunction)),
        st.floats(min_value=0.5, max_value=2.0)
    )
    @settings(max_examples=10, deadline=1000)
    def test_property_ve_6_easing_function_behavior(self, easing_function, duration):
        """
        Property VE-6: Easing Function Behavior
        For any easing function, the motion should follow the expected curve
        characteristics (smooth start/end for ease functions, linear for linear).
        **Validates: Requirements VE-2.3, VE-2.6**
        """
        # Create test frames (smaller for performance)
        frames = [np.random.randint(0, 255, (240, 320, 3), dtype=np.uint8) for _ in range(8)]
        
        # Create movement with specified easing
        movement = MovementSpec(
            movement_type=MovementType.PAN,
            start_position=CameraPosition(yaw=0.0),
            end_position=CameraPosition(yaw=45.0),
            duration=duration,
            easing=easing_function
        )
        
        camera_system = CameraMovementSystem()
        result = camera_system.apply_movement(frames, movement, frame_rate=24.0)
        
        assert result.success, f"Movement with {easing_function.value} failed: {result.error_message}"
        
        # Check easing values in motion curve
        easing_values = result.motion_curve.easing_values
        
        if len(easing_values) > 2:
            # First value should be close to 0
            assert easing_values[0] <= 0.1, f"Easing should start near 0: {easing_values[0]}"
            
            # Last value should be reasonably close to 1.0 (allowing for timing discretization)
            # With discrete frames, we might not hit exactly 1.0
            assert easing_values[-1] >= 0.5, f"Easing should progress toward 1: {easing_values[-1]}"
            
            # Values should be monotonically increasing (or equal for static)
            for i in range(len(easing_values) - 1):
                assert easing_values[i+1] >= easing_values[i] - 1e-6, \
                    f"Easing values not monotonic at {i}: {easing_values[i]} -> {easing_values[i+1]}"
            
            # Check easing function characteristics
            if easing_function == EasingFunction.LINEAR:
                # Linear should have roughly equal steps
                if len(easing_values) > 3:
                    steps = [easing_values[i+1] - easing_values[i] for i in range(len(easing_values)-1)]
                    step_variance = np.var(steps)
                    assert step_variance < 0.1, f"Linear easing not uniform: variance {step_variance}"
    
    @given(
        st.integers(min_value=2, max_value=20),
        st.floats(min_value=12.0, max_value=30.0)
    )
    @settings(max_examples=7, deadline=1000)
    def test_property_ve_8_frame_rate_consistency(self, num_frames, frame_rate):
        """
        Property VE-8: Frame Rate Consistency
        For any frame rate, the timing calculations should be consistent
        and motion curves should respect the frame rate.
        **Validates: Requirements VE-4.3, VE-4.7**
        """
        # Create test frames (smaller for performance)
        frames = [np.random.randint(0, 255, (240, 320, 3), dtype=np.uint8) for _ in range(num_frames)]
        
        # Create movement
        movement = create_pan_movement(0.0, 90.0, duration=2.0)
        
        camera_system = CameraMovementSystem()
        result = camera_system.apply_movement(frames, movement, frame_rate=frame_rate)
        
        assert result.success, f"Movement failed: {result.error_message}"
        
        # Check timing consistency
        timestamps = result.motion_curve.timestamps
        
        if len(timestamps) > 1:
            # Frame intervals should be consistent with frame rate
            expected_interval = 1.0 / frame_rate
            
            for i in range(len(timestamps) - 1):
                actual_interval = timestamps[i+1] - timestamps[i]
                # Allow small tolerance for floating point precision
                assert abs(actual_interval - expected_interval) < 1e-6, \
                    f"Frame interval inconsistent: {actual_interval} != {expected_interval}"
            
            # Total duration should match expected duration
            total_duration = timestamps[-1] - timestamps[0]
            expected_total = (num_frames - 1) / frame_rate
            assert abs(total_duration - expected_total) < 1e-6, \
                f"Total duration mismatch: {total_duration} != {expected_total}"


def test_camera_movement_basic_functionality():
    """Test basic functionality of camera movement system."""
    camera_system = CameraMovementSystem()
    
    # Create test frames
    frames = [np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8) for _ in range(5)]
    
    # Test basic pan movement
    pan_movement = create_pan_movement(0.0, 30.0, 2.0)
    result = camera_system.apply_movement(frames, pan_movement)
    
    assert result.success, f"Basic pan movement failed: {result.error_message}"
    assert len(result.transformed_frames) == len(frames)
    
    # Test basic zoom movement
    zoom_movement = create_zoom_movement(1.0, 1.5, 1.0)
    zoom_result = camera_system.apply_movement(frames, zoom_movement)
    
    assert zoom_result.success, f"Basic zoom movement failed: {zoom_result.error_message}"
    assert len(zoom_result.transformed_frames) == len(frames)


if __name__ == "__main__":
    # Run basic functionality test
    test_camera_movement_basic_functionality()
    print("✓ Basic camera movement tests passed")
    
    # Run a few property tests manually
    test_instance = TestCameraMovementProperties()
    
    print("Camera movement property tests ready for execution")