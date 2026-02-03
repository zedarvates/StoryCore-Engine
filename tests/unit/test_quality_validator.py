"""
Unit tests for Quality Validator.

Tests visual coherence checking, audio quality checking, synchronization checking,
and report generation.
"""

import sys
from pathlib import Path
import tempfile
import shutil
import pytest
import asyncio

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from end_to_end.quality_validator import QualityValidator, CoherenceScore, AudioQualityScore, SyncScore
from end_to_end.data_models import (
    ProjectComponents,
    WorldConfig,
    Character,
    StoryStructure,
    QualityReport
)


@pytest.fixture
def validator():
    """Create a QualityValidator instance"""
    return QualityValidator()


@pytest.fixture
def temp_video_file():
    """Create a temporary video file for testing"""
    temp_dir = tempfile.mkdtemp()
    video_path = Path(temp_dir) / "test_video.mp4"
    video_path.write_bytes(b"dummy video content" * 1000)
    
    yield video_path
    
    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def project_components():
    """Create minimal ProjectComponents for testing"""
    world_config = WorldConfig(
        world_id="test_world",
        name="Test World",
        genre="cyberpunk",
        setting="Futuristic city",
        time_period="2048",
        visual_style=["neon", "dark", "gritty"],
        color_palette={"primary": "#000000", "secondary": "#FFFFFF", "accent": "#FF0000"},
        lighting_style="dramatic",
        atmosphere="tense",
        key_locations=[]
    )
    
    characters = [
        Character(
            character_id="char1",
            name="Test Character",
            role="protagonist",
            description="A test character",
            visual_description="Tall and mysterious",
            personality_traits=["brave", "intelligent"],
            relationships={}
        )
    ]
    
    story_structure = StoryStructure(
        story_id="story1",
        title="Test Story",
        logline="A test story for validation",
        acts=[],
        themes=["technology", "humanity"],
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


class TestQualityValidator:
    """Test suite for QualityValidator"""
    
    def test_validator_initialization(self, validator):
        """Test that validator initializes with correct default thresholds"""
        assert validator.min_visual_coherence == 0.7
        assert validator.min_audio_quality == 0.6
        assert validator.min_sync_score == 0.8
        assert validator.min_overall_score == 0.7
        assert validator.max_sync_offset == 100
        assert validator.max_sync_drift == 50
    
    def test_validate_final_video_with_existing_file(self, validator, temp_video_file, project_components):
        """Test validation with an existing video file"""
        report = asyncio.run(validator.validate_final_video(temp_video_file, project_components))
        
        assert isinstance(report, QualityReport)
        assert 0.0 <= report.overall_score <= 1.0
        assert 0.0 <= report.visual_coherence_score <= 1.0
        assert 0.0 <= report.audio_quality_score <= 1.0
        assert 0.0 <= report.sync_score <= 1.0
        assert isinstance(report.detected_issues, list)
        assert isinstance(report.recommendations, list)
        assert len(report.recommendations) > 0
        assert isinstance(report.passed, bool)
    
    def test_validate_final_video_with_missing_file(self, validator, project_components):
        """Test validation with a missing video file"""
        missing_path = Path("/nonexistent/video.mp4")
        report = asyncio.run(validator.validate_final_video(missing_path, project_components))
        
        assert isinstance(report, QualityReport)
        assert report.overall_score == 0.0
        assert report.passed == False
        assert len(report.detected_issues) > 0
        
        # Check for critical issue
        critical_issues = [i for i in report.detected_issues if i.severity == "critical"]
        assert len(critical_issues) > 0
        assert "not found" in critical_issues[0].description.lower()
    
    def test_check_visual_coherence(self, validator, temp_video_file):
        """Test visual coherence checking"""
        coherence_score = validator.check_visual_coherence(temp_video_file)
        
        assert isinstance(coherence_score, CoherenceScore)
        assert 0.0 <= coherence_score.score <= 1.0
        assert 0.0 <= coherence_score.consistency_score <= 1.0
        assert 0.0 <= coherence_score.style_drift_score <= 1.0
        assert 0.0 <= coherence_score.color_consistency_score <= 1.0
        assert isinstance(coherence_score.details, dict)
    
    def test_check_visual_coherence_with_missing_file(self, validator):
        """Test visual coherence checking with missing file"""
        missing_path = Path("/nonexistent/video.mp4")
        coherence_score = validator.check_visual_coherence(missing_path)
        
        # Should return a score even for missing file (fallback mode)
        assert isinstance(coherence_score, CoherenceScore)
        assert 0.0 <= coherence_score.score <= 1.0
    
    def test_check_audio_quality(self, validator, temp_video_file):
        """Test audio quality checking"""
        audio_score = validator.check_audio_quality(temp_video_file)
        
        assert isinstance(audio_score, AudioQualityScore)
        assert 0.0 <= audio_score.score <= 1.0
        assert 0.0 <= audio_score.clarity_score <= 1.0
        assert 0.0 <= audio_score.noise_level <= 1.0
        assert 0.0 <= audio_score.dynamic_range <= 1.0
        assert isinstance(audio_score.has_gaps, bool)
        assert isinstance(audio_score.has_artifacts, bool)
        assert isinstance(audio_score.details, dict)
    
    def test_check_audio_quality_with_missing_file(self, validator):
        """Test audio quality checking with missing file"""
        missing_path = Path("/nonexistent/video.mp4")
        audio_score = validator.check_audio_quality(missing_path)
        
        # Should return a score even for missing file (fallback mode)
        assert isinstance(audio_score, AudioQualityScore)
        assert 0.0 <= audio_score.score <= 1.0
    
    def test_check_synchronization(self, validator, temp_video_file):
        """Test synchronization checking"""
        sync_score = validator.check_synchronization(temp_video_file)
        
        assert isinstance(sync_score, SyncScore)
        assert 0.0 <= sync_score.score <= 1.0
        assert isinstance(sync_score.offset_ms, (int, float))
        assert isinstance(sync_score.drift_ms, (int, float))
        assert isinstance(sync_score.is_synchronized, bool)
        assert isinstance(sync_score.details, dict)
    
    def test_check_synchronization_with_missing_file(self, validator):
        """Test synchronization checking with missing file"""
        missing_path = Path("/nonexistent/video.mp4")
        sync_score = validator.check_synchronization(missing_path)
        
        # Should return a score even for missing file (fallback mode)
        assert isinstance(sync_score, SyncScore)
        assert 0.0 <= sync_score.score <= 1.0
    
    def test_overall_score_calculation(self, validator, temp_video_file, project_components):
        """Test that overall score is calculated correctly"""
        report = asyncio.run(validator.validate_final_video(temp_video_file, project_components))
        
        # Overall score should be weighted average
        expected_score = (
            report.visual_coherence_score * 0.4 +
            report.audio_quality_score * 0.3 +
            report.sync_score * 0.3
        )
        
        assert abs(report.overall_score - expected_score) < 0.01
    
    def test_passed_status_with_high_scores(self, validator, temp_video_file, project_components):
        """Test that validation passes with high scores"""
        # Adjust thresholds to ensure passing
        validator.min_overall_score = 0.5
        validator.min_visual_coherence = 0.5
        validator.min_audio_quality = 0.5
        validator.min_sync_score = 0.5
        
        report = asyncio.run(validator.validate_final_video(temp_video_file, project_components))
        
        # With relaxed thresholds, should pass
        if (report.overall_score >= 0.5 and 
            report.visual_coherence_score >= 0.5 and
            report.audio_quality_score >= 0.5 and
            report.sync_score >= 0.5):
            assert report.passed == True
    
    def test_passed_status_with_low_overall_score(self, validator, temp_video_file, project_components):
        """Test that validation fails with low overall score"""
        # Set very high threshold
        validator.min_overall_score = 0.99
        
        report = asyncio.run(validator.validate_final_video(temp_video_file, project_components))
        
        # Should fail with high threshold
        if report.overall_score < 0.99:
            assert report.passed == False
    
    def test_issue_detection_for_low_visual_coherence(self, validator):
        """Test that issues are detected for low visual coherence"""
        # Create low scores
        visual_score = CoherenceScore(
            score=0.4,
            consistency_score=0.4,
            style_drift_score=0.4,
            color_consistency_score=0.4,
            details={}
        )
        audio_score = AudioQualityScore(
            score=0.8,
            clarity_score=0.8,
            noise_level=0.2,
            dynamic_range=0.7,
            has_gaps=False,
            has_artifacts=False,
            details={}
        )
        sync_score = SyncScore(
            score=0.9,
            offset_ms=0.0,
            drift_ms=0.0,
            is_synchronized=True,
            details={}
        )
        
        issues = validator._detect_issues(visual_score, audio_score, sync_score)
        
        # Should detect visual coherence issue
        visual_issues = [i for i in issues if i.category == "visual_coherence"]
        assert len(visual_issues) > 0
    
    def test_issue_detection_for_audio_gaps(self, validator):
        """Test that issues are detected for audio gaps"""
        visual_score = CoherenceScore(
            score=0.8,
            consistency_score=0.8,
            style_drift_score=0.8,
            color_consistency_score=0.8,
            details={}
        )
        audio_score = AudioQualityScore(
            score=0.7,
            clarity_score=0.7,
            noise_level=0.2,
            dynamic_range=0.7,
            has_gaps=True,  # Audio gaps detected
            has_artifacts=False,
            details={}
        )
        sync_score = SyncScore(
            score=0.9,
            offset_ms=0.0,
            drift_ms=0.0,
            is_synchronized=True,
            details={}
        )
        
        issues = validator._detect_issues(visual_score, audio_score, sync_score)
        
        # Should detect audio gap issue
        audio_issues = [i for i in issues if "gap" in i.description.lower()]
        assert len(audio_issues) > 0
    
    def test_issue_detection_for_sync_offset(self, validator):
        """Test that issues are detected for sync offset"""
        visual_score = CoherenceScore(
            score=0.8,
            consistency_score=0.8,
            style_drift_score=0.8,
            color_consistency_score=0.8,
            details={}
        )
        audio_score = AudioQualityScore(
            score=0.8,
            clarity_score=0.8,
            noise_level=0.2,
            dynamic_range=0.7,
            has_gaps=False,
            has_artifacts=False,
            details={}
        )
        sync_score = SyncScore(
            score=0.5,
            offset_ms=150.0,  # Large offset
            drift_ms=0.0,
            is_synchronized=False,
            details={}
        )
        
        issues = validator._detect_issues(visual_score, audio_score, sync_score)
        
        # Should detect sync issues
        sync_issues = [i for i in issues if i.category == "synchronization"]
        assert len(sync_issues) > 0
    
    def test_recommendations_generation(self, validator):
        """Test that recommendations are generated appropriately"""
        # Create scores with various issues
        visual_score = CoherenceScore(
            score=0.5,
            consistency_score=0.5,
            style_drift_score=0.5,
            color_consistency_score=0.5,
            details={}
        )
        audio_score = AudioQualityScore(
            score=0.5,
            clarity_score=0.5,
            noise_level=0.4,
            dynamic_range=0.5,
            has_gaps=True,
            has_artifacts=True,
            details={}
        )
        sync_score = SyncScore(
            score=0.7,
            offset_ms=80.0,
            drift_ms=30.0,
            is_synchronized=True,
            details={}
        )
        
        issues = validator._detect_issues(visual_score, audio_score, sync_score)
        recommendations = validator._generate_recommendations(
            visual_score,
            audio_score,
            sync_score,
            issues
        )
        
        # Should generate multiple recommendations
        assert len(recommendations) > 0
        
        # Should have recommendations for visual issues
        visual_recs = [r for r in recommendations if "visual" in r.lower() or "style" in r.lower()]
        assert len(visual_recs) > 0
        
        # Should have recommendations for audio issues
        audio_recs = [r for r in recommendations if "audio" in r.lower() or "gap" in r.lower()]
        assert len(audio_recs) > 0
    
    def test_recommendations_for_good_quality(self, validator):
        """Test that positive recommendations are given for good quality"""
        # Create high scores
        visual_score = CoherenceScore(
            score=0.9,
            consistency_score=0.9,
            style_drift_score=0.9,
            color_consistency_score=0.9,
            details={}
        )
        audio_score = AudioQualityScore(
            score=0.9,
            clarity_score=0.9,
            noise_level=0.1,
            dynamic_range=0.8,
            has_gaps=False,
            has_artifacts=False,
            details={}
        )
        sync_score = SyncScore(
            score=0.95,
            offset_ms=0.0,
            drift_ms=0.0,
            is_synchronized=True,
            details={}
        )
        
        issues = validator._detect_issues(visual_score, audio_score, sync_score)
        recommendations = validator._generate_recommendations(
            visual_score,
            audio_score,
            sync_score,
            issues
        )
        
        # Should have at least one recommendation (positive feedback)
        assert len(recommendations) > 0
        
        # Should mention quality is good
        positive_recs = [r for r in recommendations if "good" in r.lower() or "no" in r.lower()]
        assert len(positive_recs) > 0
    
    def test_custom_thresholds(self, validator, temp_video_file, project_components):
        """Test that custom thresholds are respected"""
        # Set custom thresholds
        validator.min_visual_coherence = 0.9
        validator.min_audio_quality = 0.9
        validator.min_sync_score = 0.95
        validator.min_overall_score = 0.9
        
        report = asyncio.run(validator.validate_final_video(temp_video_file, project_components))
        
        # With strict thresholds, likely to fail
        if (report.visual_coherence_score < 0.9 or
            report.audio_quality_score < 0.9 or
            report.sync_score < 0.95 or
            report.overall_score < 0.9):
            assert report.passed == False
    
    def test_report_structure(self, validator, temp_video_file, project_components):
        """Test that report has correct structure"""
        report = asyncio.run(validator.validate_final_video(temp_video_file, project_components))
        
        # Check all required fields
        assert hasattr(report, 'overall_score')
        assert hasattr(report, 'visual_coherence_score')
        assert hasattr(report, 'audio_quality_score')
        assert hasattr(report, 'sync_score')
        assert hasattr(report, 'detected_issues')
        assert hasattr(report, 'recommendations')
        assert hasattr(report, 'passed')
        
        # Check types
        assert isinstance(report.overall_score, float)
        assert isinstance(report.visual_coherence_score, float)
        assert isinstance(report.audio_quality_score, float)
        assert isinstance(report.sync_score, float)
        assert isinstance(report.detected_issues, list)
        assert isinstance(report.recommendations, list)
        assert isinstance(report.passed, bool)
    
    def test_issue_structure(self, validator, temp_video_file, project_components):
        """Test that issues have correct structure"""
        # Set strict thresholds to ensure issues are detected
        validator.min_visual_coherence = 0.99
        validator.min_audio_quality = 0.99
        validator.min_sync_score = 0.99
        
        report = asyncio.run(validator.validate_final_video(temp_video_file, project_components))
        
        # Check issues if any
        for issue in report.detected_issues:
            assert hasattr(issue, 'issue_id')
            assert hasattr(issue, 'severity')
            assert hasattr(issue, 'category')
            assert hasattr(issue, 'description')
            assert hasattr(issue, 'location')
            
            assert len(issue.issue_id) > 0
            assert issue.severity in ["low", "medium", "high", "critical"]
            assert len(issue.category) > 0
            assert len(issue.description) > 0
            assert len(issue.location) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
