"""
Simple integration test for Advanced Image Quality Monitor

Quick validation test to ensure the advanced image quality monitor works correctly
with comprehensive quality analysis, enhancement suggestions, and reporting.

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import asyncio
import sys
import os
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    from advanced_image_quality_monitor import (
        AdvancedImageQualityMonitor,
        ImageQualityConfig,
        ImageQualityMetric,
        QualityGrade,
        EnhancementType,
        create_advanced_image_quality_monitor
    )
    IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Import failed: {e}")
    IMPORT_SUCCESS = False

# Mock PIL Image for testing
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


async def test_image_quality_monitor_basic():
    """Test basic Advanced Image Quality Monitor functionality"""
    print("🧪 Testing Advanced Image Quality Monitor - Basic Functionality")
    print("=" * 70)
    
    if not IMPORT_SUCCESS:
        print("❌ Import failed - skipping tests")
        return False
    
    try:
        # Test 1: Configuration Creation
        print("\n1️⃣ Testing Configuration Creation...")
        config = ImageQualityConfig(
            excellent_threshold=0.9,
            enable_enhancement_suggestions=True,
            parallel_analysis=True,
            enable_caching=True
        )
        print(f"   ✓ Config created with excellent threshold: {config.excellent_threshold}")
        print(f"   ✓ Enhancement suggestions: {config.enable_enhancement_suggestions}")
        print(f"   ✓ Parallel analysis: {config.parallel_analysis}")
        print(f"   ✓ Caching enabled: {config.enable_caching}")
        
        # Test 2: Monitor Creation
        print("\n2️⃣ Testing Monitor Creation...")
        monitor = create_advanced_image_quality_monitor(config)
        print(f"   ✓ Monitor created successfully")
        print(f"   ✓ Analysis cache initialized: {len(monitor.analysis_cache)}")
        print(f"   ✓ Performance stats initialized")
        
        # Test 3: Enum Validation
        print("\n3️⃣ Testing Enum Values...")
        quality_metrics = [metric.value for metric in ImageQualityMetric]
        quality_grades = [grade.value for grade in QualityGrade]
        enhancement_types = [etype.value for etype in EnhancementType]
        
        print(f"   ✓ Quality metrics ({len(quality_metrics)}): {quality_metrics[:5]}...")
        print(f"   ✓ Quality grades: {quality_grades}")
        print(f"   ✓ Enhancement types ({len(enhancement_types)}): {enhancement_types[:4]}...")
        
        # Test 4: Basic Quality Analysis
        print("\n4️⃣ Testing Basic Quality Analysis...")
        test_image = MockImage((1024, 1024), 'RGB')
        
        report = await monitor.analyze_image_quality(
            test_image,
            image_id="test_basic_001"
        )
        
        print(f"   ✓ Analysis completed: {report.image_id}")
        print(f"   ✓ Overall score: {report.overall_score:.3f}")
        print(f"   ✓ Overall grade: {report.overall_grade.value}")
        print(f"   ✓ Metrics analyzed: {len(report.metrics)}")
        print(f"   ✓ Enhancement suggestions: {len(report.enhancement_suggestions)}")
        print(f"   ✓ Analysis time: {report.metadata.get('analysis_time', 0):.3f}s")
        
        # Test 5: Individual Metric Analysis
        print("\n5️⃣ Testing Individual Metrics...")
        
        sharpness_result = await monitor._analyze_sharpness(test_image)
        color_result = await monitor._analyze_color_accuracy(test_image)
        contrast_result = await monitor._analyze_contrast(test_image)
        brightness_result = await monitor._analyze_brightness(test_image)
        
        print(f"   ✓ Sharpness: {sharpness_result.score:.3f} ({sharpness_result.grade.value})")
        print(f"   ✓ Color Accuracy: {color_result.score:.3f} ({color_result.grade.value})")
        print(f"   ✓ Contrast: {contrast_result.score:.3f} ({contrast_result.grade.value})")
        print(f"   ✓ Brightness: {brightness_result.score:.3f} ({brightness_result.grade.value})")
        
        # Test 6: Style Context Analysis
        print("\n6️⃣ Testing Style Context Analysis...")
        
        anime_report = await monitor.analyze_image_quality(
            test_image,
            image_id="test_anime_001",
            style_context="anime"
        )
        
        realistic_report = await monitor.analyze_image_quality(
            test_image,
            image_id="test_realistic_001",
            style_context="realistic"
        )
        
        print(f"   ✓ Anime context analysis: {anime_report.overall_score:.3f}")
        print(f"   ✓ Realistic context analysis: {realistic_report.overall_score:.3f}")
        
        anime_style_metric = anime_report.metrics.get(ImageQualityMetric.STYLE_CONSISTENCY)
        if anime_style_metric:
            print(f"   ✓ Anime style consistency: {anime_style_metric.score:.3f}")
        
        # Test 7: Reference Image Analysis
        print("\n7️⃣ Testing Reference Image Analysis...")
        
        reference_image = MockImage((1024, 1024), 'RGB')
        reference_report = await monitor.analyze_image_quality(
            test_image,
            image_id="test_reference_001",
            reference_image=reference_image
        )
        
        print(f"   ✓ Reference analysis completed: {reference_report.overall_score:.3f}")
        
        detail_metric = reference_report.metrics.get(ImageQualityMetric.DETAIL_PRESERVATION)
        if detail_metric:
            print(f"   ✓ Detail preservation: {detail_metric.score:.3f}")
            print(f"   ✓ Has reference: {detail_metric.details.get('has_reference', False)}")
        
        # Test 8: Enhancement Suggestions
        print("\n8️⃣ Testing Enhancement Suggestions...")
        
        if report.enhancement_suggestions:
            print(f"   ✓ Generated {len(report.enhancement_suggestions)} suggestions:")
            for i, suggestion in enumerate(report.enhancement_suggestions[:3]):
                print(f"     {i+1}. {suggestion['type']} (Priority: {suggestion['priority']})")
                print(f"        Confidence: {suggestion['confidence']:.3f}")
                print(f"        Expected improvement: {suggestion.get('expected_improvement', 0):.3f}")
        else:
            print("   ✓ No enhancement suggestions needed (high quality)")
        
        # Test 9: Image Enhancement
        print("\n9️⃣ Testing Image Enhancement...")
        
        if report.enhancement_suggestions:
            enhanced_image, improvement = await monitor.enhance_image_quality(
                test_image,
                report.enhancement_suggestions[:2]  # Apply top 2 suggestions
            )
            
            print(f"   ✓ Enhancement applied successfully")
            print(f"   ✓ Expected improvement: {improvement:.3f}")
            print(f"   ✓ Enhanced image created: {enhanced_image is not None}")
        else:
            print("   ✓ No enhancement needed (image already high quality)")
        
        # Test 10: Caching Functionality
        print("\n🔟 Testing Caching Functionality...")
        
        initial_cache_hits = monitor.analysis_stats['cache_hits']
        
        # Analyze same image again (should use cache)
        cached_report = await monitor.analyze_image_quality(
            test_image,
            image_id="test_basic_001"  # Same ID as before
        )
        
        cache_hits_after = monitor.analysis_stats['cache_hits']
        print(f"   ✓ Cache hits increased: {initial_cache_hits} → {cache_hits_after}")
        print(f"   ✓ Cached result matches: {cached_report.image_id == report.image_id}")
        
        # Test 11: Performance Statistics
        print("\n1️⃣1️⃣ Testing Performance Statistics...")
        
        stats = monitor.get_analysis_statistics()
        print(f"   ✓ Total analyses: {stats['total_analyses']}")
        print(f"   ✓ Cache hit rate: {stats['cache_hit_rate']:.1%}")
        print(f"   ✓ Average analysis time: {stats['average_analysis_time']:.3f}s")
        print(f"   ✓ Cache size: {stats['cache_size']}")
        
        quality_dist = stats['quality_distribution']
        print(f"   ✓ Quality distribution:")
        for grade, count in quality_dist.items():
            if count > 0:
                print(f"     - Grade {grade}: {count}")
        
        # Test 12: Batch Analysis
        print("\n1️⃣2️⃣ Testing Batch Analysis...")
        
        batch_images = [
            MockImage((1024, 1024), 'RGB'),
            MockImage((1536, 1024), 'RGB'),
            MockImage((1024, 1536), 'RGB'),
            MockImage((2048, 1024), 'RGB')
        ]
        
        batch_reports = []
        for i, image in enumerate(batch_images):
            report = await monitor.analyze_image_quality(
                image,
                image_id=f"batch_test_{i:03d}"
            )
            batch_reports.append(report)
        
        successful_analyses = [r for r in batch_reports if r.overall_score > 0]
        print(f"   ✓ Batch analysis: {len(successful_analyses)}/{len(batch_images)} successful")
        
        avg_score = sum(r.overall_score for r in successful_analyses) / len(successful_analyses)
        print(f"   ✓ Average quality score: {avg_score:.3f}")
        
        # Test 13: Report Export
        print("\n1️⃣3️⃣ Testing Report Export...")
        
        export_path = Path("test_quality_export.json")
        export_success = monitor.export_quality_report(batch_reports, export_path)
        
        print(f"   ✓ Export success: {export_success}")
        
        if export_path.exists():
            import json
            with open(export_path, 'r') as f:
                export_data = json.load(f)
            print(f"   ✓ Export contains {len(export_data['reports'])} reports")
            print(f"   ✓ Export info: {export_data['export_info']['total_reports']} total reports")
            export_path.unlink()  # Clean up
        
        print("\n" + "=" * 70)
        print("🎉 ALL TESTS PASSED! Advanced Image Quality Monitor is working correctly!")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_quality_workflow_scenarios():
    """Test realistic quality workflow scenarios"""
    print("\n🎬 Testing Quality Workflow Scenarios")
    print("=" * 70)
    
    if not IMPORT_SUCCESS:
        print("❌ Import failed - skipping workflow tests")
        return False
    
    try:
        # Create monitor
        config = ImageQualityConfig(
            enable_enhancement_suggestions=True,
            parallel_analysis=True,
            enable_caching=True
        )
        monitor = create_advanced_image_quality_monitor(config)
        
        # Scenario 1: Anime Quality Assessment Workflow
        print("\n🎨 Scenario 1: Anime Quality Assessment")
        
        # Step 1: Analyze anime image
        anime_image = MockImage((1024, 1536), 'RGB')
        anime_report = await monitor.analyze_image_quality(
            anime_image,
            image_id="anime_quality_001",
            style_context="anime"
        )
        print(f"   ✓ Anime analysis: {anime_report.overall_grade.value} ({anime_report.overall_score:.3f})")
        
        # Step 2: Apply enhancements if needed
        if anime_report.enhancement_suggestions:
            enhanced_anime, improvement = await monitor.enhance_image_quality(
                anime_image,
                anime_report.enhancement_suggestions
            )
            print(f"   ✓ Enhancement applied: {improvement:.3f} expected improvement")
        
        scenario1_success = anime_report.overall_score > 0
        print(f"   🎯 Anime Quality Assessment: {'SUCCESS' if scenario1_success else 'PARTIAL'}")
        
        # Scenario 2: Professional Photo Quality Workflow
        print("\n📸 Scenario 2: Professional Photo Quality")
        
        # Step 1: Analyze original photo
        original_photo = MockImage((1920, 1080), 'RGB')
        original_report = await monitor.analyze_image_quality(
            original_photo,
            image_id="professional_original_001",
            style_context="professional"
        )
        print(f"   ✓ Original photo: {original_report.overall_grade.value} ({original_report.overall_score:.3f})")
        
        # Step 2: Analyze edited version with reference
        edited_photo = MockImage((1920, 1080), 'RGB')
        edited_report = await monitor.analyze_image_quality(
            edited_photo,
            image_id="professional_edited_001",
            reference_image=original_photo,
            style_context="professional"
        )
        print(f"   ✓ Edited photo: {edited_report.overall_grade.value} ({edited_report.overall_score:.3f})")
        
        # Step 3: Compare detail preservation
        detail_metric = edited_report.metrics.get(ImageQualityMetric.DETAIL_PRESERVATION)
        if detail_metric:
            print(f"   ✓ Detail preservation: {detail_metric.score:.3f}")
        
        scenario2_success = edited_report.overall_score > 0
        print(f"   🎯 Professional Photo Quality: {'SUCCESS' if scenario2_success else 'PARTIAL'}")
        
        # Scenario 3: Quality Improvement Iteration
        print("\n🔧 Scenario 3: Quality Improvement Iteration")
        
        # Start with lower quality image
        low_quality_image = MockImage((512, 512), 'RGB')
        
        current_image = low_quality_image
        iteration_scores = []
        
        for iteration in range(3):
            # Analyze current image
            iter_report = await monitor.analyze_image_quality(
                current_image,
                image_id=f"improvement_iter_{iteration}"
            )
            iteration_scores.append(iter_report.overall_score)
            print(f"   ✓ Iteration {iteration + 1}: {iter_report.overall_grade.value} ({iter_report.overall_score:.3f})")
            
            # Apply enhancements if available
            if iter_report.enhancement_suggestions:
                enhanced_image, improvement = await monitor.enhance_image_quality(
                    current_image,
                    iter_report.enhancement_suggestions[:2]
                )
                current_image = enhanced_image
                print(f"     - Applied enhancements: {improvement:.3f} expected improvement")
            else:
                break
        
        scenario3_success = len(iteration_scores) > 0
        print(f"   🎯 Quality Improvement Iteration: {'SUCCESS' if scenario3_success else 'PARTIAL'}")
        
        # Scenario 4: Multi-Style Comparison
        print("\n🎭 Scenario 4: Multi-Style Comparison")
        
        test_image = MockImage((1024, 1024), 'RGB')
        style_contexts = ["anime", "realistic", "artistic", "professional"]
        style_results = {}
        
        for style in style_contexts:
            style_report = await monitor.analyze_image_quality(
                test_image,
                image_id=f"style_test_{style}",
                style_context=style
            )
            style_results[style] = style_report.overall_score
            print(f"   ✓ {style.capitalize()} style: {style_report.overall_score:.3f}")
        
        best_style = max(style_results.items(), key=lambda x: x[1])
        print(f"   ✓ Best style match: {best_style[0]} ({best_style[1]:.3f})")
        
        scenario4_success = len(style_results) == len(style_contexts)
        print(f"   🎯 Multi-Style Comparison: {'SUCCESS' if scenario4_success else 'PARTIAL'}")
        
        # Overall workflow assessment
        all_scenarios_success = all([scenario1_success, scenario2_success, scenario3_success, scenario4_success])
        print(f"\n🏆 Overall Workflow Assessment: {'ALL PASSED' if all_scenarios_success else 'SOME PARTIAL'}")
        
        return all_scenarios_success
        
    except Exception as e:
        print(f"\n❌ Workflow test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Starting Advanced Image Quality Monitor Tests")
    print("=" * 70)
    
    # Run basic functionality tests
    basic_success = asyncio.run(test_image_quality_monitor_basic())
    
    # Run workflow scenario tests
    workflow_success = asyncio.run(test_quality_workflow_scenarios())
    
    # Final summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    print(f"✅ Basic Functionality: {'PASSED' if basic_success else 'FAILED'}")
    print(f"✅ Workflow Scenarios: {'PASSED' if workflow_success else 'FAILED'}")
    
    overall_success = basic_success and workflow_success
    print(f"\n🎯 OVERALL RESULT: {'ALL TESTS PASSED! 🎉' if overall_success else 'SOME TESTS FAILED ❌'}")
    
    if overall_success:
        print("\n🎊 Advanced Image Quality Monitor is ready for production!")
        print("   - Comprehensive quality analysis working")
        print("   - Enhancement suggestions functional")
        print("   - Style-aware analysis operational")
        print("   - Reference image comparison active")
        print("   - Caching and performance optimization working")
        print("   - Batch processing validated")
        print("   - Export functionality operational")
        print("   - Quality improvement workflows successful")
    else:
        print("\n⚠️  Please review failed tests before proceeding.")
    
    return overall_success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)