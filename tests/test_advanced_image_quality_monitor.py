"""
Test suite for Advanced Image Quality Monitor

Comprehensive tests for image quality analysis, enhancement suggestions,
and quality reporting functionality.

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import pytest
import asyncio
import json
import tempfile
import time
from pathlib import Path
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from advanced_image_quality_monitor import (
    AdvancedImageQualityMonitor,
    ImageQualityConfig,
    ImageQualityMetric,
    QualityGrade,
    EnhancementType,
    QualityMetricResult,
    ImageQualityReport,
    EnhancementSuggestion,
    create_advanced_image_quality_monitor
)

# Mock image class for testing
class MockImage:
    def __init__(self, size=(1024, 1024), mode='RGB'):
        self.size = size
        self.mode = mode
    
    def copy(self):
        return MockImage(self.size, self.mode)
    
    def save(self, path):
        pass
    
    def convert(self, mode):
        return MockImage(self.size, mode)
    
    def filter(self, filter_type):
        return MockImage(self.size, self.mode)


class TestImageQualityConfig:
    """Test ImageQualityConfig dataclass"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = ImageQualityConfig()
        
        assert config.excellent_threshold == 0.9
        assert config.good_threshold == 0.8
        assert config.acceptable_threshold == 0.7
        assert config.poor_threshold == 0.6
        assert config.enable_enhancement_suggestions is True
        assert config.enable_automatic_enhancement is False
        assert config.max_enhancement_iterations == 3
        assert config.enable_caching is True
        assert config.parallel_analysis is True
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = ImageQualityConfig(
            excellent_threshold=0.95,
            enable_enhancement_suggestions=False,
            parallel_analysis=False,
            cache_duration=7200
        )
        
        assert config.excellent_threshold == 0.95
        assert config.enable_enhancement_suggestions is False
        assert config.parallel_analysis is False
        assert config.cache_duration == 7200
    
    def test_metric_weights(self):
        """Test metric weights configuration"""
        config = ImageQualityConfig()
        
        assert ImageQualityMetric.SHARPNESS in config.metric_weights
        assert ImageQualityMetric.COLOR_ACCURACY in config.metric_weights
        assert ImageQualityMetric.ARTIFACT_DETECTION in config.metric_weights
        
        # Check weights sum to reasonable value
        total_weight = sum(config.metric_weights.values())
        assert 0.8 <= total_weight <= 1.2  # Allow some flexibility


class TestQualityEnums:
    """Test quality-related enums"""
    
    def test_image_quality_metric_enum(self):
        """Test ImageQualityMetric enum values"""
        metrics = [metric.value for metric in ImageQualityMetric]
        
        expected_metrics = [
            'sharpness', 'color_accuracy', 'contrast', 'brightness',
            'saturation', 'noise_level', 'artifact_detection',
            'style_consistency', 'detail_preservation', 'overall_quality'
        ]
        
        for expected in expected_metrics:
            assert expected in metrics
    
    def test_quality_grade_enum(self):
        """Test QualityGrade enum values"""
        grades = [grade.value for grade in QualityGrade]
        expected_grades = ['A', 'B', 'C', 'D', 'F']
        
        for expected in expected_grades:
            assert expected in grades
    
    def test_enhancement_type_enum(self):
        """Test EnhancementType enum values"""
        types = [etype.value for etype in EnhancementType]
        
        expected_types = [
            'sharpen', 'color_correction', 'contrast_adjustment',
            'brightness_adjustment', 'noise_reduction', 'artifact_removal',
            'style_refinement', 'detail_enhancement'
        ]
        
        for expected in expected_types:
            assert expected in types


class TestQualityDataClasses:
    """Test quality-related data classes"""
    
    def test_quality_metric_result(self):
        """Test QualityMetricResult dataclass"""
        result = QualityMetricResult(
            metric=ImageQualityMetric.SHARPNESS,
            score=0.85,
            grade=QualityGrade.GOOD,
            details={'variance': 75.0},
            suggestions=['Apply sharpening'],
            confidence=0.9
        )
        
        assert result.metric == ImageQualityMetric.SHARPNESS
        assert result.score == 0.85
        assert result.grade == QualityGrade.GOOD
        assert result.details['variance'] == 75.0
        assert 'Apply sharpening' in result.suggestions
        assert result.confidence == 0.9
    
    def test_image_quality_report(self):
        """Test ImageQualityReport dataclass"""
        report = ImageQualityReport(
            image_id="test_001",
            timestamp=1234567890.0,
            overall_score=0.82,
            overall_grade=QualityGrade.GOOD
        )
        
        assert report.image_id == "test_001"
        assert report.timestamp == 1234567890.0
        assert report.overall_score == 0.82
        assert report.overall_grade == QualityGrade.GOOD
        assert isinstance(report.metrics, dict)
        assert isinstance(report.enhancement_suggestions, list)
    
    def test_image_quality_report_to_dict(self):
        """Test ImageQualityReport to_dict method"""
        metric_result = QualityMetricResult(
            metric=ImageQualityMetric.SHARPNESS,
            score=0.85,
            grade=QualityGrade.GOOD
        )
        
        report = ImageQualityReport(
            image_id="test_001",
            timestamp=1234567890.0,
            overall_score=0.82,
            overall_grade=QualityGrade.GOOD,
            metrics={ImageQualityMetric.SHARPNESS: metric_result}
        )
        
        report_dict = report.to_dict()
        
        assert report_dict['image_id'] == "test_001"
        assert report_dict['overall_score'] == 0.82
        assert report_dict['overall_grade'] == 'B'
        assert 'sharpness' in report_dict['metrics']
        assert report_dict['metrics']['sharpness']['score'] == 0.85
    
    def test_enhancement_suggestion(self):
        """Test EnhancementSuggestion dataclass"""
        suggestion = EnhancementSuggestion(
            enhancement_type=EnhancementType.SHARPEN,
            priority=4,
            confidence=0.9,
            parameters={'strength': 1.2},
            description="Apply sharpening filter",
            expected_improvement=0.15
        )
        
        assert suggestion.enhancement_type == EnhancementType.SHARPEN
        assert suggestion.priority == 4
        assert suggestion.confidence == 0.9
        assert suggestion.parameters['strength'] == 1.2
        assert suggestion.expected_improvement == 0.15


class TestAdvancedImageQualityMonitor:
    """Test AdvancedImageQualityMonitor class"""
    
    @pytest.fixture
    def monitor(self):
        """Create monitor instance for testing"""
        config = ImageQualityConfig(
            enable_enhancement_suggestions=True,
            enable_caching=True,
            parallel_analysis=True
        )
        return AdvancedImageQualityMonitor(config)
    
    @pytest.fixture
    def mock_image(self):
        """Create mock image for testing"""
        return MockImage((1024, 1024), 'RGB')
    
    def test_monitor_initialization(self, monitor):
        """Test monitor initialization"""
        assert monitor.config is not None
        assert monitor.logger is not None
        assert isinstance(monitor.analysis_cache, dict)
        assert isinstance(monitor.analysis_stats, dict)
        assert monitor.analysis_stats['total_analyses'] == 0
    
    @pytest.mark.asyncio
    async def test_analyze_image_quality_basic(self, monitor, mock_image):
        """Test basic image quality analysis"""
        report = await monitor.analyze_image_quality(
            mock_image,
            image_id="test_basic_001"
        )
        
        assert isinstance(report, ImageQualityReport)
        assert report.image_id == "test_basic_001"
        assert 0.0 <= report.overall_score <= 1.0
        assert isinstance(report.overall_grade, QualityGrade)
        assert len(report.metrics) > 0
        assert report.timestamp > 0
    
    @pytest.mark.asyncio
    async def test_analyze_image_quality_with_context(self, monitor, mock_image):
        """Test image quality analysis with style context"""
        report = await monitor.analyze_image_quality(
            mock_image,
            image_id="test_context_001",
            style_context="anime"
        )
        
        assert report.metadata.get('style_context') == "anime"
        assert ImageQualityMetric.STYLE_CONSISTENCY in report.metrics
        
        style_result = report.metrics[ImageQualityMetric.STYLE_CONSISTENCY]
        assert style_result.confidence > 0.5  # Should have higher confidence with context
    
    @pytest.mark.asyncio
    async def test_analyze_image_quality_with_reference(self, monitor, mock_image):
        """Test image quality analysis with reference image"""
        reference_image = MockImage((1024, 1024), 'RGB')
        
        report = await monitor.analyze_image_quality(
            mock_image,
            image_id="test_reference_001",
            reference_image=reference_image
        )
        
        assert ImageQualityMetric.COLOR_ACCURACY in report.metrics
        assert ImageQualityMetric.DETAIL_PRESERVATION in report.metrics
        
        detail_result = report.metrics[ImageQualityMetric.DETAIL_PRESERVATION]
        assert detail_result.details.get('has_reference') is True
    
    @pytest.mark.asyncio
    async def test_sharpness_analysis(self, monitor, mock_image):
        """Test sharpness analysis"""
        result = await monitor._analyze_sharpness(mock_image)
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.SHARPNESS
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert result.confidence > 0.0
        assert 'variance' in result.details
    
    @pytest.mark.asyncio
    async def test_color_accuracy_analysis(self, monitor, mock_image):
        """Test color accuracy analysis"""
        result = await monitor._analyze_color_accuracy(mock_image)
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.COLOR_ACCURACY
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert result.confidence > 0.0
    
    @pytest.mark.asyncio
    async def test_contrast_analysis(self, monitor, mock_image):
        """Test contrast analysis"""
        result = await monitor._analyze_contrast(mock_image)
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.CONTRAST
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert 'contrast_value' in result.details
    
    @pytest.mark.asyncio
    async def test_brightness_analysis(self, monitor, mock_image):
        """Test brightness analysis"""
        result = await monitor._analyze_brightness(mock_image)
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.BRIGHTNESS
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert 'brightness_value' in result.details
    
    @pytest.mark.asyncio
    async def test_saturation_analysis(self, monitor, mock_image):
        """Test saturation analysis"""
        result = await monitor._analyze_saturation(mock_image)
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.SATURATION
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert 'saturation_value' in result.details
    
    @pytest.mark.asyncio
    async def test_noise_analysis(self, monitor, mock_image):
        """Test noise level analysis"""
        result = await monitor._analyze_noise_level(mock_image)
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.NOISE_LEVEL
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert 'noise_level' in result.details
    
    @pytest.mark.asyncio
    async def test_artifact_analysis(self, monitor, mock_image):
        """Test artifact detection"""
        result = await monitor._analyze_artifacts(mock_image)
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.ARTIFACT_DETECTION
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert 'artifact_level' in result.details
    
    @pytest.mark.asyncio
    async def test_style_consistency_analysis(self, monitor, mock_image):
        """Test style consistency analysis"""
        result = await monitor._analyze_style_consistency(mock_image, "anime")
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.STYLE_CONSISTENCY
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert result.details.get('style_context') == "anime"
        assert result.confidence > 0.5  # Should have higher confidence with context
    
    @pytest.mark.asyncio
    async def test_detail_preservation_analysis(self, monitor, mock_image):
        """Test detail preservation analysis"""
        reference_image = MockImage((1024, 1024), 'RGB')
        result = await monitor._analyze_detail_preservation(mock_image, reference_image)
        
        assert isinstance(result, QualityMetricResult)
        assert result.metric == ImageQualityMetric.DETAIL_PRESERVATION
        assert 0.0 <= result.score <= 1.0
        assert isinstance(result.grade, QualityGrade)
        assert result.details.get('has_reference') is True
    
    def test_calculate_overall_score(self, monitor):
        """Test overall score calculation"""
        metrics = {
            ImageQualityMetric.SHARPNESS: QualityMetricResult(
                ImageQualityMetric.SHARPNESS, 0.8, QualityGrade.GOOD, confidence=0.9
            ),
            ImageQualityMetric.COLOR_ACCURACY: QualityMetricResult(
                ImageQualityMetric.COLOR_ACCURACY, 0.7, QualityGrade.ACCEPTABLE, confidence=0.8
            ),
            ImageQualityMetric.CONTRAST: QualityMetricResult(
                ImageQualityMetric.CONTRAST, 0.9, QualityGrade.EXCELLENT, confidence=0.95
            )
        }
        
        overall_score = monitor._calculate_overall_score(metrics)
        
        assert 0.0 <= overall_score <= 1.0
        assert isinstance(overall_score, float)
    
    def test_score_to_grade(self, monitor):
        """Test score to grade conversion"""
        assert monitor._score_to_grade(0.95) == QualityGrade.EXCELLENT
        assert monitor._score_to_grade(0.85) == QualityGrade.GOOD
        assert monitor._score_to_grade(0.75) == QualityGrade.ACCEPTABLE
        assert monitor._score_to_grade(0.65) == QualityGrade.POOR
        assert monitor._score_to_grade(0.55) == QualityGrade.FAILED
    
    def test_generate_image_id(self, monitor, mock_image):
        """Test image ID generation"""
        image_id = monitor._generate_image_id(mock_image)
        
        assert isinstance(image_id, str)
        assert len(image_id) == 12  # MD5 hash truncated to 12 chars
        
        # Should be consistent for same image
        image_id2 = monitor._generate_image_id(mock_image)
        # Note: Due to timestamp, IDs will be different
        assert isinstance(image_id2, str)
    
    @pytest.mark.asyncio
    async def test_generate_enhancement_suggestions(self, monitor, mock_image):
        """Test enhancement suggestion generation"""
        # Create metrics with low scores to trigger suggestions
        metrics = {
            ImageQualityMetric.SHARPNESS: QualityMetricResult(
                ImageQualityMetric.SHARPNESS, 0.6, QualityGrade.POOR, confidence=0.9
            ),
            ImageQualityMetric.COLOR_ACCURACY: QualityMetricResult(
                ImageQualityMetric.COLOR_ACCURACY, 0.65, QualityGrade.POOR, confidence=0.8
            ),
            ImageQualityMetric.CONTRAST: QualityMetricResult(
                ImageQualityMetric.CONTRAST, 0.6, QualityGrade.POOR, confidence=0.85
            )
        }
        
        suggestions = await monitor._generate_enhancement_suggestions(metrics, mock_image)
        
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0
        assert len(suggestions) <= 5  # Should return max 5 suggestions
        
        for suggestion in suggestions:
            assert 'type' in suggestion
            assert 'priority' in suggestion
            assert 'confidence' in suggestion
            assert 'description' in suggestion
            assert 1 <= suggestion['priority'] <= 5
            assert 0.0 <= suggestion['confidence'] <= 1.0
    
    @pytest.mark.asyncio
    async def test_enhance_image_quality(self, monitor, mock_image):
        """Test image quality enhancement"""
        suggestions = [
            {
                'type': EnhancementType.SHARPEN.value,
                'priority': 4,
                'confidence': 0.9,
                'parameters': {'strength': 1.2},
                'expected_improvement': 0.15
            },
            {
                'type': EnhancementType.COLOR_CORRECTION.value,
                'priority': 3,
                'confidence': 0.8,
                'parameters': {'auto_balance': True},
                'expected_improvement': 0.12
            }
        ]
        
        enhanced_image, improvement = await monitor.enhance_image_quality(mock_image, suggestions)
        
        assert enhanced_image is not None
        assert isinstance(improvement, float)
        assert improvement >= 0.0
    
    def test_update_analysis_stats(self, monitor):
        """Test analysis statistics update"""
        initial_total = monitor.analysis_stats['total_analyses']
        
        report = ImageQualityReport(
            image_id="test_stats",
            timestamp=time.time(),
            overall_score=0.85,
            overall_grade=QualityGrade.GOOD
        )
        
        monitor._update_analysis_stats(report, 1.5)
        
        assert monitor.analysis_stats['total_analyses'] == initial_total + 1
        assert monitor.analysis_stats['quality_distribution']['B'] == 1
        assert monitor.analysis_stats['average_analysis_time'] > 0
    
    def test_get_analysis_statistics(self, monitor):
        """Test analysis statistics retrieval"""
        stats = monitor.get_analysis_statistics()
        
        assert isinstance(stats, dict)
        assert 'total_analyses' in stats
        assert 'cache_hits' in stats
        assert 'cache_hit_rate' in stats
        assert 'average_analysis_time' in stats
        assert 'quality_distribution' in stats
        assert 'cache_size' in stats
        
        assert isinstance(stats['quality_distribution'], dict)
        assert all(grade in stats['quality_distribution'] for grade in ['A', 'B', 'C', 'D', 'F'])
    
    @pytest.mark.asyncio
    async def test_caching_functionality(self, monitor, mock_image):
        """Test analysis result caching"""
        image_id = "test_cache_001"
        
        # First analysis
        report1 = await monitor.analyze_image_quality(mock_image, image_id=image_id)
        initial_cache_hits = monitor.analysis_stats['cache_hits']
        
        # Second analysis (should use cache)
        report2 = await monitor.analyze_image_quality(mock_image, image_id=image_id)
        
        assert report1.image_id == report2.image_id
        assert monitor.analysis_stats['cache_hits'] == initial_cache_hits + 1
    
    def test_export_quality_report(self, monitor):
        """Test quality report export"""
        reports = [
            ImageQualityReport(
                image_id="test_export_001",
                timestamp=time.time(),
                overall_score=0.85,
                overall_grade=QualityGrade.GOOD
            ),
            ImageQualityReport(
                image_id="test_export_002",
                timestamp=time.time(),
                overall_score=0.92,
                overall_grade=QualityGrade.EXCELLENT
            )
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = Path(f.name)
        
        try:
            success = monitor.export_quality_report(reports, temp_path)
            
            assert success is True
            assert temp_path.exists()
            
            # Verify exported content
            with open(temp_path, 'r') as f:
                exported_data = json.load(f)
            
            assert 'export_info' in exported_data
            assert 'reports' in exported_data
            assert exported_data['export_info']['total_reports'] == 2
            assert len(exported_data['reports']) == 2
            
        finally:
            if temp_path.exists():
                temp_path.unlink()


class TestFactoryFunction:
    """Test factory function"""
    
    def test_create_advanced_image_quality_monitor_default(self):
        """Test factory function with default config"""
        monitor = create_advanced_image_quality_monitor()
        
        assert isinstance(monitor, AdvancedImageQualityMonitor)
        assert monitor.config is not None
        assert isinstance(monitor.config, ImageQualityConfig)
    
    def test_create_advanced_image_quality_monitor_custom_config(self):
        """Test factory function with custom config"""
        config = ImageQualityConfig(
            excellent_threshold=0.95,
            enable_enhancement_suggestions=False
        )
        monitor = create_advanced_image_quality_monitor(config)
        
        assert isinstance(monitor, AdvancedImageQualityMonitor)
        assert monitor.config.excellent_threshold == 0.95
        assert monitor.config.enable_enhancement_suggestions is False


class TestIntegrationScenarios:
    """Test realistic integration scenarios"""
    
    @pytest.mark.asyncio
    async def test_anime_image_quality_workflow(self):
        """Test complete anime image quality workflow"""
        config = ImageQualityConfig(
            enable_enhancement_suggestions=True,
            parallel_analysis=True
        )
        monitor = create_advanced_image_quality_monitor(config)
        
        # Simulate anime image analysis
        anime_image = MockImage((1024, 1536), 'RGB')
        
        report = await monitor.analyze_image_quality(
            anime_image,
            image_id="anime_test_001",
            style_context="anime"
        )
        
        assert report.success
        assert report.overall_score > 0.0
        assert ImageQualityMetric.STYLE_CONSISTENCY in report.metrics
        
        # Test enhancement if suggestions available
        if report.enhancement_suggestions:
            enhanced_image, improvement = await monitor.enhance_image_quality(
                anime_image,
                report.enhancement_suggestions
            )
            assert enhanced_image is not None
            assert improvement >= 0.0
    
    @pytest.mark.asyncio
    async def test_professional_editing_quality_workflow(self):
        """Test professional editing quality workflow"""
        config = ImageQualityConfig(
            enable_enhancement_suggestions=True,
            enable_automatic_enhancement=False
        )
        monitor = create_advanced_image_quality_monitor(config)
        
        # Simulate professional editing scenario
        original_image = MockImage((1920, 1080), 'RGB')
        edited_image = MockImage((1920, 1080), 'RGB')
        
        report = await monitor.analyze_image_quality(
            edited_image,
            image_id="professional_edit_001",
            reference_image=original_image,
            style_context="professional"
        )
        
        assert report.success
        assert ImageQualityMetric.DETAIL_PRESERVATION in report.metrics
        assert ImageQualityMetric.COLOR_ACCURACY in report.metrics
        
        detail_result = report.metrics[ImageQualityMetric.DETAIL_PRESERVATION]
        assert detail_result.details.get('has_reference') is True
    
    @pytest.mark.asyncio
    async def test_batch_quality_analysis(self):
        """Test batch quality analysis"""
        config = ImageQualityConfig(parallel_analysis=True)
        monitor = create_advanced_image_quality_monitor(config)
        
        # Create multiple test images
        images = [
            MockImage((1024, 1024), 'RGB'),
            MockImage((1536, 1024), 'RGB'),
            MockImage((1024, 1536), 'RGB')
        ]
        
        # Analyze all images
        reports = []
        for i, image in enumerate(images):
            report = await monitor.analyze_image_quality(
                image,
                image_id=f"batch_test_{i:03d}"
            )
            reports.append(report)
        
        assert len(reports) == 3
        assert all(report.success for report in reports)
        
        # Test batch export
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = Path(f.name)
        
        try:
            success = monitor.export_quality_report(reports, temp_path)
            assert success is True
            
        finally:
            if temp_path.exists():
                temp_path.unlink()
    
    @pytest.mark.asyncio
    async def test_quality_improvement_workflow(self):
        """Test complete quality improvement workflow"""
        config = ImageQualityConfig(
            enable_enhancement_suggestions=True,
            max_enhancement_iterations=2
        )
        monitor = create_advanced_image_quality_monitor(config)
        
        # Start with low-quality image simulation
        low_quality_image = MockImage((512, 512), 'RGB')
        
        # Initial analysis
        initial_report = await monitor.analyze_image_quality(
            low_quality_image,
            image_id="improvement_test_001"
        )
        
        current_image = low_quality_image
        current_score = initial_report.overall_score
        
        # Iterative improvement
        for iteration in range(config.max_enhancement_iterations):
            # Get current report for this iteration
            current_report = await monitor.analyze_image_quality(
                current_image,
                image_id=f"improvement_test_001_iter_{iteration}"
            )
            
            if current_report.enhancement_suggestions:
                enhanced_image, improvement = await monitor.enhance_image_quality(
                    current_image,
                    current_report.enhancement_suggestions[:2]  # Apply top 2 suggestions
                )
                
                # Verify improvement (in mock mode, this is simulated)
                assert improvement >= 0.0
                current_image = enhanced_image
                current_score = current_report.overall_score
        
        # Verify statistics (should have initial + iterations analyses)
        stats = monitor.get_analysis_statistics()
        expected_analyses = 1 + config.max_enhancement_iterations  # initial + iterations
        assert stats['total_analyses'] >= expected_analyses


if __name__ == "__main__":
    pytest.main([__file__, "-v"])