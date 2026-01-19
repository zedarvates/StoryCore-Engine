"""
Unit tests for Continuity Validator.

Tests the core functionality of spatial and temporal continuity validation.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from continuity_validator import ContinuityValidator


def test_jump_cut_detection():
    """Test detection of jump cuts (camera angle < 30 degrees)."""
    validator = ContinuityValidator()
    
    shot_a = {
        "shot_id": "shot_001",
        "timestamp": 1.0,
        "camera_angle": 45.0,
        "characters": []
    }
    
    shot_b = {
        "shot_id": "shot_002",
        "timestamp": 2.0,
        "camera_angle": 60.0,  # Only 15 degree change - jump cut!
        "characters": []
    }
    
    result = validator.validate_spatial_continuity(shot_a, shot_b)
    
    assert not result.passed, "Should detect jump cut"
    assert len(result.violations) == 1
    assert result.violations[0].violation_type == "jump_cut"
    assert result.violations[0].severity == "high"
    print("✓ Jump cut detection works")


def test_no_jump_cut_with_large_angle_change():
    """Test that large camera angle changes don't trigger jump cut."""
    validator = ContinuityValidator()
    
    shot_a = {
        "shot_id": "shot_001",
        "timestamp": 1.0,
        "camera_angle": 45.0,
        "characters": []
    }
    
    shot_b = {
        "shot_id": "shot_002",
        "timestamp": 2.0,
        "camera_angle": 90.0,  # 45 degree change - OK
        "characters": []
    }
    
    result = validator.validate_spatial_continuity(shot_a, shot_b)
    
    assert result.passed, "Should not detect jump cut with large angle change"
    assert len(result.violations) == 0
    print("✓ Large angle change passes validation")


def test_180_degree_rule_violation():
    """Test detection of 180-degree rule violation."""
    validator = ContinuityValidator()
    
    shot_a = {
        "shot_id": "shot_001",
        "timestamp": 1.0,
        "camera_angle": 45.0,
        "characters": [
            {"name": "Alice", "position": {"x": 0.3, "y": 0.5}},
            {"name": "Bob", "position": {"x": 0.7, "y": 0.5}}
        ]
    }
    
    # In shot B, Alice and Bob's left/right relationship is flipped
    shot_b = {
        "shot_id": "shot_002",
        "timestamp": 2.0,
        "camera_angle": 225.0,  # Camera crossed the axis
        "characters": [
            {"name": "Alice", "position": {"x": 0.7, "y": 0.5}},  # Now on right
            {"name": "Bob", "position": {"x": 0.3, "y": 0.5}}     # Now on left
        ]
    }
    
    result = validator.validate_spatial_continuity(shot_a, shot_b)
    
    assert not result.passed, "Should detect 180-degree rule violation"
    violations_180 = [v for v in result.violations if v.violation_type == "180_rule"]
    assert len(violations_180) > 0, "Should have 180_rule violation"
    assert violations_180[0].severity == "critical"
    print("✓ 180-degree rule violation detection works")


def test_spatial_consistency():
    """Test detection of spatial inconsistencies."""
    validator = ContinuityValidator()
    
    shot_a = {
        "shot_id": "shot_001",
        "timestamp": 1.0,
        "camera_angle": 45.0,
        "characters": [
            {"name": "Alice", "position": {"x": 0.3, "y": 0.5}}
        ]
    }
    
    # Alice jumps to a very different position
    shot_b = {
        "shot_id": "shot_002",
        "timestamp": 2.0,
        "camera_angle": 90.0,
        "characters": [
            {"name": "Alice", "position": {"x": 0.8, "y": 0.5}}  # Large jump
        ]
    }
    
    result = validator.validate_spatial_continuity(shot_a, shot_b)
    
    assert not result.passed, "Should detect spatial inconsistency"
    spatial_violations = [v for v in result.violations if v.violation_type == "spatial_inconsistency"]
    assert len(spatial_violations) > 0
    print("✓ Spatial inconsistency detection works")


def test_temporal_action_continuity():
    """Test detection of incomplete actions."""
    validator = ContinuityValidator()
    
    shot_a = {
        "shot_id": "shot_001",
        "timestamp": 1.0,
        "actions": ["walking", "talking"],
        "objects": ["cup"],
        "lighting": "daylight"
    }
    
    # Walking action disappeared without completion
    shot_b = {
        "shot_id": "shot_002",
        "timestamp": 2.0,
        "actions": ["talking"],
        "objects": ["cup"],
        "lighting": "daylight"
    }
    
    result = validator.validate_temporal_continuity(shot_a, shot_b)
    
    assert not result.passed, "Should detect incomplete action"
    assert len(result.violations) > 0
    assert result.violations[0].violation_type == "temporal_break"
    print("✓ Action continuity detection works")


def test_temporal_object_persistence():
    """Test detection of disappeared objects."""
    validator = ContinuityValidator()
    
    shot_a = {
        "shot_id": "shot_001",
        "timestamp": 1.0,
        "actions": [],
        "objects": ["cup", "book"],
        "lighting": "daylight"
    }
    
    # Book disappeared
    shot_b = {
        "shot_id": "shot_002",
        "timestamp": 2.0,
        "actions": [],
        "objects": ["cup"],
        "lighting": "daylight"
    }
    
    result = validator.validate_temporal_continuity(shot_a, shot_b)
    
    assert not result.passed, "Should detect disappeared object"
    object_violations = [v for v in result.violations if "book" in v.description.lower()]
    assert len(object_violations) > 0
    print("✓ Object persistence detection works")


def test_temporal_lighting_consistency():
    """Test detection of lighting changes."""
    validator = ContinuityValidator()
    
    shot_a = {
        "shot_id": "shot_001",
        "timestamp": 1.0,
        "actions": [],
        "objects": [],
        "lighting": "daylight"
    }
    
    # Lighting changed suddenly
    shot_b = {
        "shot_id": "shot_002",
        "timestamp": 2.0,
        "actions": [],
        "objects": [],
        "lighting": "night"
    }
    
    result = validator.validate_temporal_continuity(shot_a, shot_b)
    
    assert not result.passed, "Should detect lighting change"
    lighting_violations = [v for v in result.violations if "lighting" in v.description.lower()]
    assert len(lighting_violations) > 0
    assert lighting_violations[0].severity == "high"
    print("✓ Lighting consistency detection works")


def test_angle_delta_calculation():
    """Test angle delta calculation handles wraparound correctly."""
    validator = ContinuityValidator()
    
    # Test normal case
    delta1 = validator._calculate_angle_delta(45, 90)
    assert delta1 == 45
    
    # Test wraparound case (350 to 10 should be 20, not 340)
    delta2 = validator._calculate_angle_delta(350, 10)
    assert delta2 == 20
    
    # Test reverse wraparound
    delta3 = validator._calculate_angle_delta(10, 350)
    assert delta3 == 20
    
    print("✓ Angle delta calculation works correctly")


def test_continuity_report_generation(tmp_path):
    """Test generation of continuity report for a project."""
    validator = ContinuityValidator()
    
    # Create a test project structure
    project_path = tmp_path / "test_project"
    project_path.mkdir()
    
    # Create project.json with test shots
    project_data = {
        "project_name": "test_project",
        "shots": [
            {
                "shot_id": "shot_001",
                "timestamp": 1.0,
                "camera_angle": 45.0,
                "characters": [
                    {"name": "Alice", "position": {"x": 0.3, "y": 0.5}}
                ],
                "actions": ["walking"],
                "objects": ["cup"],
                "lighting": "daylight"
            },
            {
                "shot_id": "shot_002",
                "timestamp": 2.0,
                "camera_angle": 60.0,  # Jump cut (15 degrees)
                "characters": [
                    {"name": "Alice", "position": {"x": 0.3, "y": 0.5}}
                ],
                "actions": [],  # Walking action disappeared
                "objects": ["cup"],
                "lighting": "daylight"
            },
            {
                "shot_id": "shot_003",
                "timestamp": 3.0,
                "camera_angle": 120.0,
                "characters": [
                    {"name": "Alice", "position": {"x": 0.3, "y": 0.5}}
                ],
                "actions": [],
                "objects": [],  # Cup disappeared
                "lighting": "night"  # Lighting changed
            }
        ]
    }
    
    import json
    with open(project_path / "project.json", 'w') as f:
        json.dump(project_data, f)
    
    # Generate report
    report = validator.generate_continuity_report(project_path)
    
    assert "total_shots" in report
    assert report["total_shots"] == 3
    assert report["total_shot_pairs"] == 2
    assert report["total_violations"] > 0
    assert "violations" in report
    assert "violation_by_type" in report
    assert "violation_by_severity" in report
    
    print("✓ Continuity report generation works")
    print(f"  - Total violations: {report['total_violations']}")
    print(f"  - By type: {report['violation_by_type']}")
    print(f"  - By severity: {report['violation_by_severity']}")


if __name__ == "__main__":
    print("Testing Continuity Validator...\n")
    
    test_jump_cut_detection()
    test_no_jump_cut_with_large_angle_change()
    test_180_degree_rule_violation()
    test_spatial_consistency()
    test_temporal_action_continuity()
    test_temporal_object_persistence()
    test_temporal_lighting_consistency()
    test_angle_delta_calculation()
    
    # Test report generation with pytest's tmp_path
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        test_continuity_report_generation(Path(tmpdir))
    
    print("\n✅ All Continuity Validator tests passed!")
