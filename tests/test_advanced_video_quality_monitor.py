"""
Test Suite for Advanced Video Quality Monitor

Comprehensive tests for video quality monitoring and validation
specifically designed for advanced ComfyUI workflows.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
import numpy as np

from src.advanced_video_quality_monitor import (
    AdvancedVideoQualityMonitor,
    QualityConfig,
    QualityThresholds,
    QualityMetric,
    QualitySeverity,
    ImprovementStrategy,
    QualityIssue,
    QualityReport,
    create_quality_monitor
)


class TestAdvancedVideoQualityMonitor(unittest.TestCase):
    """Test cases for Advanced Video Quality Monitor."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = QualityConfig(
            thresholds=QualityThresholds(
                temporal_consistency=0.75,
                motion_smoothness=0.70,
                visual_quality=0.80
            ),
            enable_real_time=True,
            enable_artifact_detection=True
        )
        self.monitor = AdvancedVideoQualityMonitor(self.config)
    
    def test_monitor_initialization(self):
        """Test quality monitor initialization."""
        # Test default initialization
        default_monitor = AdvancedVideoQualityMonitor()
        self.assertIsNotNone(default_monitor.config)
        self.assertEqual(len(default_monitor.analysis_cache), 0)
        
        # Test custom config initialization
        self.assertEqual(self.monitor.config.thresholds.temporal_consistency, 0.75)
        self.assertTrue(self.monitor.config.enable_real_time)
        self.assertTrue(self.monitor.config.enable_artifact_detection)
    
    def test_factory_function(self):
        """Test factory function for creating monitor."""
        monitor = create_quality_monitor()
        self.assertIsInstance(monitor, AdvancedVideoQualityMonitor)
        
        monitor_with_config = create_quality_monitor(self.config)
        self.assertEqual(monitor_with_config.config.thresholds.temporal_consistency, 0.75)
    
    def test_synthetic_frame_generation(self):
        """Test synthetic frame generation for testing."""
        frames = self.monitor._generate_synthetic_frames()
        
        self.assertEqual(len(frames), 30)  # 1 second at 30fps
        self.assertEqual(frames[0].shape, (720, 1280, 3))  # HD resolution
        self.assertTrue(all(frame.dtype == np.uint8 for frame in frames))
    
    def test_video_analysis_synthetic(self):
        """Test video analysis with synthetic frames."""
        test_video = "nonexistent_video.mp4"
        report = self.monitor.analyze_video(test_video, "hunyuan_t2v")
        
        # Verify report structure
        self.assertIsInstance(report, QualityReport)
        self.assertEqual(report.video_path, test_video)
        self.assertEqual(report.workflow_type, "hunyuan_t2v")
        self.assertGreater(report.frame_count, 0)
        self.assertGreater(report.analysis_time, 0)
        
        # Verify metrics are calculated
        self.assertIn(QualityMetric.TEMPORAL_CONSISTENCY, report.metric_scores)
        self.assertIn(QualityMetric.MOTION_SMOOTHNESS, report.metric_scores)
        self.assertIn(QualityMetric.VISUAL_QUALITY, report.metric_scores)
        
        # Verify overall score
        self.assertGreaterEqual(report.overall_score, 0.0)
        self.assertLessEqual(report.overall_score, 1.0)
    
    def test_temporal_consistency_analysis(self):
        """Test temporal consistency analysis."""
        # Create test frames with known consistency
        frames = []
        base_frame = np.ones((100, 100, 3), dtype=np.uint8) * 128
        
        # Add frames with varying consistency
        for i in range(5):
            frame = base_frame.copy()
            if i > 0:
                # Add some noise to reduce consistency
                noise = np.random.randint(-10, 10, frame.shape, dtype=np.int16)
                frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            frames.append(frame)
        
        # Mock the frame loading
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "test")
            
            # Verify temporal consistency is calculated
            self.assertIn(QualityMetric.TEMPORAL_CONSISTENCY, report.metric_scores)
            consistency_score = report.metric_scores[QualityMetric.TEMPORAL_CONSISTENCY]
            self.assertGreaterEqual(consistency_score, 0.0)
            self.assertLessEqual(consistency_score, 1.0)
    
    def test_motion_smoothness_analysis(self):
        """Test motion smoothness analysis."""
        # Create frames with motion
        frames = []
        for i in range(5):
            frame = np.zeros((100, 100, 3), dtype=np.uint8)
            # Add a moving object
            x_pos = 10 + i * 5
            frame[40:60, x_pos:x_pos+20] = 255
            frames.append(frame)
        
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "test")
            
            # Verify motion smoothness is calculated
            self.assertIn(QualityMetric.MOTION_SMOOTHNESS, report.metric_scores)
            smoothness_score = report.metric_scores[QualityMetric.MOTION_SMOOTHNESS]
            self.assertGreaterEqual(smoothness_score, 0.0)
            self.assertLessEqual(smoothness_score, 1.0)
    
    def test_visual_quality_analysis(self):
        """Test visual quality analysis."""
        # Create frames with different quality levels
        frames = []
        
        # High quality frame (sharp, good contrast)
        high_quality = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
        frames.append(high_quality)
        
        # Low quality frame (blurred, low contrast)
        low_quality = np.ones((100, 100, 3), dtype=np.uint8) * 128
        frames.append(low_quality)
        
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "test")
            
            # Verify visual quality is calculated
            self.assertIn(QualityMetric.VISUAL_QUALITY, report.metric_scores)
            quality_score = report.metric_scores[QualityMetric.VISUAL_QUALITY]
            self.assertGreaterEqual(quality_score, 0.0)
            self.assertLessEqual(quality_score, 1.0)
    
    def test_artifact_detection(self):
        """Test artifact detection analysis."""
        # Create frame with potential artifacts
        frame_with_artifacts = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
        # Add high frequency noise (potential artifacts)
        noise = np.random.randint(-50, 50, frame_with_artifacts.shape, dtype=np.int16)
        frame_with_artifacts = np.clip(
            frame_with_artifacts.astype(np.int16) + noise, 0, 255
        ).astype(np.uint8)
        
        frames = [frame_with_artifacts] * 3
        
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "test")
            
            # Verify artifact detection is calculated
            self.assertIn(QualityMetric.ARTIFACT_DETECTION, report.metric_scores)
            artifact_score = report.metric_scores[QualityMetric.ARTIFACT_DETECTION]
            self.assertGreaterEqual(artifact_score, 0.0)
            self.assertLessEqual(artifact_score, 1.0)
    
    def test_alpha_channel_analysis(self):
        """Test alpha channel quality analysis."""
        # Enable alpha analysis
        self.monitor.config.enable_alpha_analysis = True
        
        # Create frames with alpha channel
        frames = []
        for i in range(3):
            frame = np.random.randint(0, 256, (100, 100, 4), dtype=np.uint8)
            # Set alpha channel
            frame[:, :, 3] = 255 - i * 50  # Varying alpha
            frames.append(frame)
        
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "wan_alpha_t2v")
            
            # Verify alpha channel quality is calculated
            self.assertIn(QualityMetric.ALPHA_CHANNEL_QUALITY, report.metric_scores)
            alpha_score = report.metric_scores[QualityMetric.ALPHA_CHANNEL_QUALITY]
            self.assertGreaterEqual(alpha_score, 0.0)
            self.assertLessEqual(alpha_score, 1.0)
    
    def test_frame_stability_analysis(self):
        """Test frame stability analysis."""
        # Create stable frames
        base_frame = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
        frames = [base_frame.copy() for _ in range(3)]
        
        # Add slight variations
        for i in range(1, len(frames)):
            noise = np.random.randint(-5, 5, frames[i].shape, dtype=np.int16)
            frames[i] = np.clip(frames[i].astype(np.int16) + noise, 0, 255).astype(np.uint8)
        
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "test")
            
            # Verify frame stability is calculated
            self.assertIn(QualityMetric.FRAME_STABILITY, report.metric_scores)
            stability_score = report.metric_scores[QualityMetric.FRAME_STABILITY]
            self.assertGreaterEqual(stability_score, 0.0)
            self.assertLessEqual(stability_score, 1.0)
    
    def test_color_consistency_analysis(self):
        """Test color consistency analysis."""
        # Create frames with similar colors
        frames = []
        for i in range(3):
            frame = np.full((100, 100, 3), [100 + i*10, 150, 200], dtype=np.uint8)
            frames.append(frame)
        
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "test")
            
            # Verify color consistency is calculated
            self.assertIn(QualityMetric.COLOR_CONSISTENCY, report.metric_scores)
            color_score = report.metric_scores[QualityMetric.COLOR_CONSISTENCY]
            self.assertGreaterEqual(color_score, 0.0)
            self.assertLessEqual(color_score, 1.0)
    
    def test_edge_coherence_analysis(self):
        """Test edge coherence analysis."""
        # Create frames with edges
        frames = []
        for i in range(3):
            frame = np.zeros((100, 100, 3), dtype=np.uint8)
            # Add vertical edge
            frame[:, 45:55] = 255
            # Slight variation
            if i > 0:
                frame[:, 44:56] = 128
            frames.append(frame)
        
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "test")
            
            # Verify edge coherence is calculated
            self.assertIn(QualityMetric.EDGE_COHERENCE, report.metric_scores)
            edge_score = report.metric_scores[QualityMetric.EDGE_COHERENCE]
            self.assertGreaterEqual(edge_score, 0.0)
            self.assertLessEqual(edge_score, 1.0)
    
    def test_texture_preservation_analysis(self):
        """Test texture preservation analysis."""
        # Create textured frames
        frames = []
        base_texture = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
        
        for i in range(3):
            frame = base_texture.copy()
            if i > 0:
                # Add slight texture degradation
                blur_kernel = np.ones((3, 3)) / 9
                for c in range(3):
                    frame[:, :, c] = cv2.filter2D(frame[:, :, c], -1, blur_kernel)
            frames.append(frame)
        
        with patch.object(self.monitor, '_load_video_frames', return_value=frames):
            report = self.monitor.analyze_video("test.mp4", "test")
            
            # Verify texture preservation is calculated
            self.assertIn(QualityMetric.TEXTURE_PRESERVATION, report.metric_scores)
            texture_score = report.metric_scores[QualityMetric.TEXTURE_PRESERVATION]
            self.assertGreaterEqual(texture_score, 0.0)
            self.assertLessEqual(texture_score, 1.0)
    
    def test_overall_score_calculation(self):
        """Test overall score calculation."""
        # Create mock metric scores
        metric_scores = {
            QualityMetric.TEMPORAL_CONSISTENCY: 0.8,
            QualityMetric.MOTION_SMOOTHNESS: 0.7,
            QualityMetric.VISUAL_QUALITY: 0.9,
            QualityMetric.ARTIFACT_DETECTION: 0.85
        }
        
        overall_score = self.monitor._calculate_overall_score(metric_scores)
        
        # Verify score is reasonable
        self.assertGreaterEqual(overall_score, 0.0)
        self.assertLessEqual(overall_score, 1.0)
        self.assertGreater(overall_score, 0.7)  # Should be good with these scores
    
    def test_quality_issue_detection(self):
        """Test quality issue detection and reporting."""
        # Set low thresholds to trigger issues
        low_threshold_config = QualityConfig(
            thresholds=QualityThresholds(
                temporal_consistency=0.95,  # Very high threshold
                visual_quality=0.95,
                motion_smoothness=0.95
            )
        )
        monitor = AdvancedVideoQualityMonitor(low_threshold_config)
        
        # Use synthetic frames (will likely have lower quality)
        report = monitor.analyze_video("test.mp4", "test")
        
        # Should detect some issues with high thresholds
        self.assertGreater(len(report.issues), 0)
        
        # Verify issue structure
        for issue in report.issues:
            self.assertIsInstance(issue, QualityIssue)
            self.assertIsInstance(issue.metric, QualityMetric)
            self.assertIsInstance(issue.severity, QualitySeverity)
            self.assertGreaterEqual(issue.score, 0.0)
            self.assertLessEqual(issue.score, 1.0)
            self.assertIsNotNone(issue.description)
    
    def test_improvement_suggestions(self):
        """Test improvement suggestion generation."""
        # Create report with known issues
        report = QualityReport(
            video_path="test.mp4",
            overall_score=0.5,  # Low score
            metric_scores={
                QualityMetric.TEMPORAL_CONSISTENCY: 0.6,
                QualityMetric.VISUAL_QUALITY: 0.5,
                QualityMetric.MOTION_SMOOTHNESS: 0.4
            },
            issues=[
                QualityIssue(
                    metric=QualityMetric.VISUAL_QUALITY,
                    severity=QualitySeverity.HIGH,
                    score=0.5,
                    threshold=0.8,
                    description="Low visual quality"
                )
            ],
            improvement_suggestions=[],
            analysis_time=1.0,
            frame_count=30,
            resolution=(720, 1280),
            duration=1.0,
            workflow_type="test"
        )
        
        suggestions = self.monitor._generate_improvement_suggestions(report)
        
        # Should generate suggestions for low quality
        self.assertGreater(len(suggestions), 0)
        self.assertTrue(any("quality" in suggestion.lower() for suggestion in suggestions))
    
    def test_quality_dashboard_data(self):
        """Test quality dashboard data generation."""
        # First analyze a video
        report = self.monitor.analyze_video("test.mp4", "hunyuan_t2v")
        
        # Get dashboard data
        dashboard_data = self.monitor.get_quality_dashboard_data("test.mp4")
        
        # Verify dashboard data structure
        self.assertIn("overall_score", dashboard_data)
        self.assertIn("grade", dashboard_data)
        self.assertIn("metrics", dashboard_data)
        self.assertIn("issues", dashboard_data)
        self.assertIn("suggestions", dashboard_data)
        self.assertIn("stats", dashboard_data)
        
        # Verify grade conversion
        grade = dashboard_data["grade"]
        self.assertIn(grade, ["A", "B", "C", "D", "F"])
        
        # Test with non-existent video
        no_data = self.monitor.get_quality_dashboard_data("nonexistent.mp4")
        self.assertIn("error", no_data)
    
    def test_score_to_grade_conversion(self):
        """Test score to grade conversion."""
        test_cases = [
            (0.95, "A"),
            (0.85, "B"),
            (0.75, "C"),
            (0.65, "D"),
            (0.45, "F")
        ]
        
        for score, expected_grade in test_cases:
            grade = self.monitor._score_to_grade(score)
            self.assertEqual(grade, expected_grade)
    
    def test_quality_report_export(self):
        """Test quality report export functionality."""
        # Analyze a video first
        report = self.monitor.analyze_video("test.mp4", "hunyuan_t2v")
        
        # Export to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_path = tmp_file.name
        
        try:
            # Export report
            success = self.monitor.export_quality_report("test.mp4", tmp_path)
            self.assertTrue(success)
            
            # Verify file was created and contains valid JSON
            self.assertTrue(Path(tmp_path).exists())
            
            with open(tmp_path, 'r') as f:
                exported_data = json.load(f)
            
            # Verify exported data structure
            self.assertIn("video_path", exported_data)
            self.assertIn("overall_score", exported_data)
            self.assertIn("metric_scores", exported_data)
            self.assertIn("issues", exported_data)
            self.assertEqual(exported_data["video_path"], "test.mp4")
            
        finally:
            # Clean up
            if Path(tmp_path).exists():
                Path(tmp_path).unlink()
        
        # Test export with non-existent analysis
        success = self.monitor.export_quality_report("nonexistent.mp4", "output.json")
        self.assertFalse(success)
    
    def test_analysis_caching(self):
        """Test analysis result caching."""
        video_path = "test.mp4"
        
        # First analysis
        report1 = self.monitor.analyze_video(video_path, "hunyuan_t2v")
        self.assertIn(video_path, self.monitor.analysis_cache)
        
        # Verify cached report
        cached_report = self.monitor.analysis_cache[video_path]
        self.assertEqual(cached_report.video_path, report1.video_path)
        self.assertEqual(cached_report.overall_score, report1.overall_score)
    
    def test_error_handling(self):
        """Test error handling in quality analysis."""
        # Mock frame loading to raise exception
        with patch.object(self.monitor, '_load_video_frames', side_effect=Exception("Test error")):
            report = self.monitor.analyze_video("error_video.mp4", "test")
            
            # Should return error report
            self.assertEqual(report.overall_score, 0.0)
            self.assertGreater(len(report.issues), 0)
            self.assertEqual(report.issues[0].severity, QualitySeverity.CRITICAL)
            self.assertIn("Test error", report.issues[0].description)
    
    def test_configuration_validation(self):
        """Test configuration validation and edge cases."""
        # Test with extreme thresholds
        extreme_config = QualityConfig(
            thresholds=QualityThresholds(
                temporal_consistency=1.1,  # Invalid (> 1.0)
                visual_quality=-0.1        # Invalid (< 0.0)
            )
        )
        
        # Monitor should handle invalid thresholds gracefully
        monitor = AdvancedVideoQualityMonitor(extreme_config)
        report = monitor.analyze_video("test.mp4", "test")
        
        # Should still produce a valid report
        self.assertIsInstance(report, QualityReport)
        self.assertGreaterEqual(report.overall_score, 0.0)
        self.assertLessEqual(report.overall_score, 1.0)


class TestQualityDataClasses(unittest.TestCase):
    """Test quality-related data classes."""
    
    def test_quality_issue_creation(self):
        """Test QualityIssue creation and validation."""
        issue = QualityIssue(
            metric=QualityMetric.VISUAL_QUALITY,
            severity=QualitySeverity.HIGH,
            score=0.6,
            threshold=0.8,
            description="Low visual quality detected",
            suggested_fix="Adjust generation parameters",
            improvement_strategy=ImprovementStrategy.PARAMETER_ADJUSTMENT,
            confidence=0.85
        )
        
        self.assertEqual(issue.metric, QualityMetric.VISUAL_QUALITY)
        self.assertEqual(issue.severity, QualitySeverity.HIGH)
        self.assertEqual(issue.score, 0.6)
        self.assertEqual(issue.confidence, 0.85)
    
    def test_quality_config_defaults(self):
        """Test QualityConfig default values."""
        config = QualityConfig()
        
        self.assertIsInstance(config.thresholds, QualityThresholds)
        self.assertTrue(config.enable_real_time)
        self.assertTrue(config.enable_artifact_detection)
        self.assertTrue(config.enable_temporal_analysis)
        self.assertFalse(config.enable_alpha_analysis)
        self.assertEqual(config.sample_frame_rate, 1.0)
    
    def test_quality_thresholds_defaults(self):
        """Test QualityThresholds default values."""
        thresholds = QualityThresholds()
        
        self.assertEqual(thresholds.temporal_consistency, 0.75)
        self.assertEqual(thresholds.motion_smoothness, 0.70)
        self.assertEqual(thresholds.visual_quality, 0.80)
        self.assertEqual(thresholds.artifact_detection, 0.85)
        self.assertEqual(thresholds.alpha_channel_quality, 0.85)


if __name__ == "__main__":
    # Import cv2 for testing
    try:
        import cv2
    except ImportError:
        print("OpenCV not available, using mock for testing")
        import sys
        sys.modules['cv2'] = Mock()
    
    unittest.main(verbosity=2)