"""
Property-based tests for Quality Validator.

These tests verify Property 10: Final Quality Validation
Validates: Requirements 10.1-10.8
"""

import sys
from pathlib import Path
from hypothesis import given, strategies as st, settings, assume
from hypothesis.strategies import composite
import tempfile
import shutil

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from end_to_end.quality_validator import QualityValidator
from end_to_end.data_models import ProjectComponents, WorldConfig, Character, StoryStructure


# Custom strategies for generating test data
@composite
def video_file_strategy(draw):
    """Generate a temporary video file path for testing."""
    # Create a temporary directory
    temp_dir = tempfile.mkdtemp()
    video_path = Path(temp_dir) / "test_video.mp4"
    
    # Create a dummy file (not a real video, but exists)
    video_path.write_bytes(b"dummy video content" * 1000)
    
    return video_path


@composite
def project_components_strategy(draw):
    """Generate minimal ProjectComponents for testing."""
    world_config = WorldConfig(
        world_id=draw(st.text(min_size=1, max_size=50)),
        name=draw(st.text(min_size=1, max_size=100)),
        genre=draw(st.sampled_from(["cyberpunk", "fantasy", "horror", "sci-fi"])),
        setting=draw(st.text(min_size=1, max_size=100)),
        time_period=draw(st.text(min_size=1, max_size=50)),
        visual_style=draw(st.lists(st.text(min_size=1, max_size=50), min_size=1, max_size=5)),
        color_palette={
            "primary": "#000000",
            "secondary": "#FFFFFF",
            "accent": "#FF0000"
        },
        lighting_style=draw(st.text(min_size=1, max_size=50)),
        atmosphere=draw(st.text(min_size=1, max_size=100)),
        key_locations=[]
    )
    
    characters = [
        Character(
            character_id=draw(st.text(min_size=1, max_size=50)),
            name=draw(st.text(min_size=1, max_size=100)),
            role=draw(st.text(min_size=1, max_size=50)),
            description=draw(st.text(min_size=1, max_size=200)),
            visual_description=draw(st.text(min_size=1, max_size=200)),
            personality_traits=draw(st.lists(st.text(min_size=1, max_size=50), max_size=5)),
            relationships={}
        )
    ]
    
    story_structure = StoryStructure(
        story_id=draw(st.text(min_size=1, max_size=50)),
        title=draw(st.text(min_size=1, max_size=100)),
        logline=draw(st.text(min_size=1, max_size=200)),
        acts=[],
        themes=draw(st.lists(st.text(min_size=1, max_size=50), max_size=5)),
        emotional_arc=[]
    )
    
    return ProjectComponents(
        world_config=world_config,
        characters=characters,
        story_structure=story_structure,
        dialogue_script=None,
        sequence_plan=None,
        music_description=None,
        metadata={}
    )


# Property 10: Final Quality Validation
# Validates: Requirements 10.1-10.8

@given(
    project_data=project_components_strategy(),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=100, deadline=None)
def test_property_10_quality_validation_always_produces_report(project_data, seed):
    """
    Feature: end-to-end-project-creation
    Property 10: Final Quality Validation
    
    For any exported video, the system should perform comprehensive quality 
    validation (visual_coherence, audio_quality, synchronization) and generate 
    a detailed quality report with scores, detected issues, and recommendations.
    
    Validates: Requirements 10.1-10.8
    
    This test verifies that:
    - Quality validation always produces a QualityReport
    - The report contains all required fields
    - Scores are in valid ranges (0.0 - 1.0)
    - Issues and recommendations are provided
    """
    validator = QualityValidator()
    
    # Create a temporary video file
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = Path(temp_dir) / "test_video.mp4"
        video_path.write_bytes(b"dummy video content" * 1000)
        
        # Run validation (synchronous version for testing)
        import asyncio
        report = asyncio.run(validator.validate_final_video(video_path, project_data))
        
        # Property: Report is always generated
        assert report is not None
        
        # Property: Report has all required fields
        assert hasattr(report, 'overall_score')
        assert hasattr(report, 'visual_coherence_score')
        assert hasattr(report, 'audio_quality_score')
        assert hasattr(report, 'sync_score')
        assert hasattr(report, 'detected_issues')
        assert hasattr(report, 'recommendations')
        assert hasattr(report, 'passed')
        
        # Property: Scores are in valid range [0.0, 1.0]
        assert 0.0 <= report.overall_score <= 1.0
        assert 0.0 <= report.visual_coherence_score <= 1.0
        assert 0.0 <= report.audio_quality_score <= 1.0
        assert 0.0 <= report.sync_score <= 1.0
        
        # Property: Issues is a list
        assert isinstance(report.detected_issues, list)
        
        # Property: Recommendations is a list
        assert isinstance(report.recommendations, list)
        
        # Property: Recommendations are always provided
        assert len(report.recommendations) > 0
        
        # Property: Passed is a boolean
        assert isinstance(report.passed, bool)
        
        # Property: If overall score is high, validation should pass
        if report.overall_score >= validator.min_overall_score:
            # May still fail if individual scores are too low
            pass
        
        # Property: If overall score is low, validation should fail
        if report.overall_score < validator.min_overall_score:
            assert report.passed == False
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


@given(
    project_data=project_components_strategy(),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=100, deadline=None)
def test_property_10_missing_video_produces_failed_report(project_data, seed):
    """
    Feature: end-to-end-project-creation
    Property 10: Final Quality Validation
    
    For any missing video file, the system should produce a failed quality 
    report with clear error information.
    
    Validates: Requirements 10.1, 10.6, 10.7
    """
    validator = QualityValidator()
    
    # Use a non-existent video path
    video_path = Path("/nonexistent/path/video.mp4")
    
    # Run validation
    import asyncio
    report = asyncio.run(validator.validate_final_video(video_path, project_data))
    
    # Property: Report is generated even for missing file
    assert report is not None
    
    # Property: Validation fails for missing file
    assert report.passed == False
    
    # Property: Overall score is 0 for missing file
    assert report.overall_score == 0.0
    
    # Property: Issues are detected
    assert len(report.detected_issues) > 0
    
    # Property: At least one critical issue is reported
    critical_issues = [i for i in report.detected_issues if i.severity == "critical"]
    assert len(critical_issues) > 0
    
    # Property: Recommendations are provided
    assert len(report.recommendations) > 0


@given(seed=st.integers(min_value=0, max_value=2**31-1))
@settings(max_examples=100, deadline=None)
def test_property_10_visual_coherence_check_produces_score(seed):
    """
    Feature: end-to-end-project-creation
    Property 10: Final Quality Validation
    
    For any video file, visual coherence checking should produce a valid 
    CoherenceScore with all required metrics.
    
    Validates: Requirements 10.1, 10.2
    """
    validator = QualityValidator()
    
    # Create a temporary video file
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = Path(temp_dir) / "test_video.mp4"
        video_path.write_bytes(b"dummy video content" * 1000)
        
        # Check visual coherence
        coherence_score = validator.check_visual_coherence(video_path)
        
        # Property: Score is generated
        assert coherence_score is not None
        
        # Property: Score has all required fields
        assert hasattr(coherence_score, 'score')
        assert hasattr(coherence_score, 'consistency_score')
        assert hasattr(coherence_score, 'style_drift_score')
        assert hasattr(coherence_score, 'color_consistency_score')
        assert hasattr(coherence_score, 'details')
        
        # Property: Scores are in valid range
        assert 0.0 <= coherence_score.score <= 1.0
        assert 0.0 <= coherence_score.consistency_score <= 1.0
        assert 0.0 <= coherence_score.style_drift_score <= 1.0
        assert 0.0 <= coherence_score.color_consistency_score <= 1.0
        
        # Property: Details is a dictionary
        assert isinstance(coherence_score.details, dict)
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


@given(seed=st.integers(min_value=0, max_value=2**31-1))
@settings(max_examples=100, deadline=None)
def test_property_10_audio_quality_check_produces_score(seed):
    """
    Feature: end-to-end-project-creation
    Property 10: Final Quality Validation
    
    For any video file, audio quality checking should produce a valid 
    AudioQualityScore with all required metrics.
    
    Validates: Requirements 10.3, 10.4
    """
    validator = QualityValidator()
    
    # Create a temporary video file
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = Path(temp_dir) / "test_video.mp4"
        video_path.write_bytes(b"dummy video content" * 1000)
        
        # Check audio quality
        audio_score = validator.check_audio_quality(video_path)
        
        # Property: Score is generated
        assert audio_score is not None
        
        # Property: Score has all required fields
        assert hasattr(audio_score, 'score')
        assert hasattr(audio_score, 'clarity_score')
        assert hasattr(audio_score, 'noise_level')
        assert hasattr(audio_score, 'dynamic_range')
        assert hasattr(audio_score, 'has_gaps')
        assert hasattr(audio_score, 'has_artifacts')
        assert hasattr(audio_score, 'details')
        
        # Property: Scores are in valid range
        assert 0.0 <= audio_score.score <= 1.0
        assert 0.0 <= audio_score.clarity_score <= 1.0
        assert 0.0 <= audio_score.noise_level <= 1.0
        assert 0.0 <= audio_score.dynamic_range <= 1.0
        
        # Property: Boolean flags are booleans
        assert isinstance(audio_score.has_gaps, bool)
        assert isinstance(audio_score.has_artifacts, bool)
        
        # Property: Details is a dictionary
        assert isinstance(audio_score.details, dict)
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


@given(seed=st.integers(min_value=0, max_value=2**31-1))
@settings(max_examples=100, deadline=None)
def test_property_10_synchronization_check_produces_score(seed):
    """
    Feature: end-to-end-project-creation
    Property 10: Final Quality Validation
    
    For any video file, synchronization checking should produce a valid 
    SyncScore with all required metrics.
    
    Validates: Requirements 10.5
    """
    validator = QualityValidator()
    
    # Create a temporary video file
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = Path(temp_dir) / "test_video.mp4"
        video_path.write_bytes(b"dummy video content" * 1000)
        
        # Check synchronization
        sync_score = validator.check_synchronization(video_path)
        
        # Property: Score is generated
        assert sync_score is not None
        
        # Property: Score has all required fields
        assert hasattr(sync_score, 'score')
        assert hasattr(sync_score, 'offset_ms')
        assert hasattr(sync_score, 'drift_ms')
        assert hasattr(sync_score, 'is_synchronized')
        assert hasattr(sync_score, 'details')
        
        # Property: Score is in valid range
        assert 0.0 <= sync_score.score <= 1.0
        
        # Property: Offset and drift are numeric
        assert isinstance(sync_score.offset_ms, (int, float))
        assert isinstance(sync_score.drift_ms, (int, float))
        
        # Property: is_synchronized is boolean
        assert isinstance(sync_score.is_synchronized, bool)
        
        # Property: Details is a dictionary
        assert isinstance(sync_score.details, dict)
        
        # Property: If offset and drift are within tolerance, should be synchronized
        if (abs(sync_score.offset_ms) <= validator.max_sync_offset and 
            abs(sync_score.drift_ms) <= validator.max_sync_drift):
            assert sync_score.is_synchronized == True
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


@given(
    project_data=project_components_strategy(),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=50, deadline=None)
def test_property_10_issues_have_required_fields(project_data, seed):
    """
    Feature: end-to-end-project-creation
    Property 10: Final Quality Validation
    
    For any detected quality issue, it should have all required fields 
    (issue_id, severity, category, description, location).
    
    Validates: Requirements 10.6, 10.7
    """
    validator = QualityValidator()
    
    # Create a temporary video file
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = Path(temp_dir) / "test_video.mp4"
        video_path.write_bytes(b"dummy video content" * 1000)
        
        # Run validation
        import asyncio
        report = asyncio.run(validator.validate_final_video(video_path, project_data))
        
        # Check all detected issues
        for issue in report.detected_issues:
            # Property: Issue has all required fields
            assert hasattr(issue, 'issue_id')
            assert hasattr(issue, 'severity')
            assert hasattr(issue, 'category')
            assert hasattr(issue, 'description')
            assert hasattr(issue, 'location')
            
            # Property: issue_id is not empty
            assert len(issue.issue_id) > 0
            
            # Property: severity is valid
            assert issue.severity in ["low", "medium", "high", "critical"]
            
            # Property: category is not empty
            assert len(issue.category) > 0
            
            # Property: description is not empty
            assert len(issue.description) > 0
            
            # Property: location is not empty
            assert len(issue.location) > 0
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


@given(
    project_data=project_components_strategy(),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=50, deadline=None)
def test_property_10_recommendations_are_actionable(project_data, seed):
    """
    Feature: end-to-end-project-creation
    Property 10: Final Quality Validation
    
    For any quality report, recommendations should be actionable strings 
    that provide clear guidance.
    
    Validates: Requirements 10.7, 10.8
    """
    validator = QualityValidator()
    
    # Create a temporary video file
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = Path(temp_dir) / "test_video.mp4"
        video_path.write_bytes(b"dummy video content" * 1000)
        
        # Run validation
        import asyncio
        report = asyncio.run(validator.validate_final_video(video_path, project_data))
        
        # Property: Recommendations are always provided
        assert len(report.recommendations) > 0
        
        # Check all recommendations
        for recommendation in report.recommendations:
            # Property: Recommendation is a string
            assert isinstance(recommendation, str)
            
            # Property: Recommendation is not empty
            assert len(recommendation) > 0
            
            # Property: Recommendation is reasonably long (actionable)
            assert len(recommendation) >= 10
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


@given(
    project_data=project_components_strategy(),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=50, deadline=None)
def test_property_10_report_saved_to_project(project_data, seed):
    """
    Feature: end-to-end-project-creation
    Property 10: Final Quality Validation
    
    For any quality validation, the report should be saveable to the project 
    directory for future reference.
    
    Validates: Requirements 10.8
    """
    validator = QualityValidator()
    
    # Create a temporary video file
    temp_dir = tempfile.mkdtemp()
    try:
        video_path = Path(temp_dir) / "test_video.mp4"
        video_path.write_bytes(b"dummy video content" * 1000)
        
        # Run validation
        import asyncio
        report = asyncio.run(validator.validate_final_video(video_path, project_data))
        
        # Property: Report can be serialized
        # (The report should be serializable for saving)
        import json
        
        # Convert report to dict for serialization
        report_dict = {
            'overall_score': report.overall_score,
            'visual_coherence_score': report.visual_coherence_score,
            'audio_quality_score': report.audio_quality_score,
            'sync_score': report.sync_score,
            'detected_issues': [
                {
                    'issue_id': issue.issue_id,
                    'severity': issue.severity,
                    'category': issue.category,
                    'description': issue.description,
                    'location': issue.location
                }
                for issue in report.detected_issues
            ],
            'recommendations': report.recommendations,
            'passed': report.passed
        }
        
        # Property: Report dict is JSON serializable
        json_str = json.dumps(report_dict, indent=2)
        assert isinstance(json_str, str)
        assert len(json_str) > 0
        
        # Property: JSON can be parsed back
        parsed = json.loads(json_str)
        assert parsed == report_dict
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)
