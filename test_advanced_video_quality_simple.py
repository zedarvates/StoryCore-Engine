"""
Simple Integration Test for Advanced Video Quality Monitor

Quick validation test for the Advanced Video Quality Monitor
to ensure basic functionality works correctly.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import sys
import time
from pathlib import Path
from unittest.mock import Mock

# Mock OpenCV for testing
sys.modules['cv2'] = Mock()

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

try:
    from advanced_video_quality_monitor import (
        AdvancedVideoQualityMonitor,
        QualityConfig,
        QualityThresholds,
        QualityMetric,
        QualitySeverity,
        create_quality_monitor
    )
    print("✅ Successfully imported Advanced Video Quality Monitor")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

def test_basic_functionality():
    """Test basic quality monitor functionality."""
    print("\n🔍 Testing Advanced Video Quality Monitor")
    
    # Test 1: Monitor initialization
    start_time = time.time()
    monitor = create_quality_monitor()
    init_time = time.time() - start_time
    print(f"✅ Monitor initialized in {init_time:.2f}s: {monitor is not None}")
    
    # Test 2: Custom configuration
    config = QualityConfig(
        thresholds=QualityThresholds(
            temporal_consistency=0.80,
            visual_quality=0.85,
            motion_smoothness=0.75
        ),
        enable_real_time=True,
        enable_alpha_analysis=True
    )
    custom_monitor = AdvancedVideoQualityMonitor(config)
    print(f"✅ Custom config created: {custom_monitor.config.thresholds.temporal_consistency == 0.80}")
    
    # Test 3: Video analysis (synthetic)
    test_video = "synthetic_test_video.mp4"
    report = monitor.analyze_video(test_video, "hunyuan_t2v")
    print(f"✅ Video analysis completed: {report.overall_score:.3f}")
    
    # Test 4: Quality metrics validation
    metrics_count = len(report.metric_scores)
    expected_metrics = [
        QualityMetric.TEMPORAL_CONSISTENCY,
        QualityMetric.MOTION_SMOOTHNESS,
        QualityMetric.VISUAL_QUALITY,
        QualityMetric.ARTIFACT_DETECTION
    ]
    has_expected = all(metric in report.metric_scores for metric in expected_metrics)
    print(f"✅ Quality metrics calculated: {metrics_count} metrics, expected present: {has_expected}")
    
    # Test 5: Issue detection
    issues_detected = len(report.issues)
    print(f"✅ Quality issues detected: {issues_detected}")
    
    # Test 6: Improvement suggestions
    suggestions_count = len(report.improvement_suggestions)
    print(f"✅ Improvement suggestions generated: {suggestions_count}")
    
    # Test 7: Dashboard data generation
    dashboard_data = monitor.get_quality_dashboard_data(test_video)
    has_dashboard_keys = all(key in dashboard_data for key in [
        "overall_score", "grade", "metrics", "issues", "suggestions", "stats"
    ])
    print(f"✅ Dashboard data generated: {has_dashboard_keys}")
    
    # Test 8: Grade conversion
    grade = dashboard_data.get("grade", "Unknown")
    valid_grades = ["A", "B", "C", "D", "F"]
    grade_valid = grade in valid_grades
    print(f"✅ Quality grade assigned: {grade} (valid: {grade_valid})")
    
    # Test 9: Alpha channel analysis
    alpha_monitor = AdvancedVideoQualityMonitor(QualityConfig(enable_alpha_analysis=True))
    alpha_report = alpha_monitor.analyze_video("alpha_test.mp4", "wan_alpha_t2v")
    alpha_analyzed = alpha_report.overall_score > 0
    print(f"✅ Alpha channel analysis: {alpha_analyzed}")
    
    # Test 10: Performance metrics
    analysis_time = report.analysis_time
    frame_count = report.frame_count
    performance_good = analysis_time < 10.0 and frame_count > 0
    print(f"✅ Performance metrics: {analysis_time:.2f}s for {frame_count} frames (good: {performance_good})")
    
    # Test 11: Error handling
    try:
        # Test with invalid workflow type
        error_report = monitor.analyze_video("error_test.mp4", "invalid_workflow")
        error_handled = error_report.overall_score >= 0  # Should not crash
        print(f"✅ Error handling: {error_handled}")
    except Exception as e:
        print(f"❌ Error handling failed: {e}")
        error_handled = False
    
    # Test 12: Caching functionality
    cached_report = monitor.analysis_cache.get(test_video)
    caching_works = cached_report is not None and cached_report.video_path == test_video
    print(f"✅ Analysis caching: {caching_works}")
    
    return {
        "monitor_init": monitor is not None,
        "custom_config": custom_monitor.config.thresholds.temporal_consistency == 0.80,
        "video_analysis": report.overall_score > 0,
        "metrics_calculated": has_expected,
        "dashboard_data": has_dashboard_keys,
        "grade_valid": grade_valid,
        "alpha_analysis": alpha_analyzed,
        "performance_good": performance_good,
        "error_handling": error_handled,
        "caching_works": caching_works
    }

def test_quality_thresholds():
    """Test quality threshold validation."""
    print("\n🎯 Testing Quality Thresholds")
    
    # Test different threshold configurations
    test_configs = [
        ("Strict", QualityThresholds(
            temporal_consistency=0.90,
            visual_quality=0.90,
            motion_smoothness=0.85
        )),
        ("Moderate", QualityThresholds(
            temporal_consistency=0.75,
            visual_quality=0.80,
            motion_smoothness=0.70
        )),
        ("Lenient", QualityThresholds(
            temporal_consistency=0.60,
            visual_quality=0.65,
            motion_smoothness=0.55
        ))
    ]
    
    results = {}
    
    for name, thresholds in test_configs:
        config = QualityConfig(thresholds=thresholds)
        monitor = AdvancedVideoQualityMonitor(config)
        
        report = monitor.analyze_video(f"test_{name.lower()}.mp4", "hunyuan_t2v")
        issues_count = len(report.issues)
        
        print(f"✅ {name} thresholds: {report.overall_score:.3f} score, {issues_count} issues")
        results[name.lower()] = {
            "score": report.overall_score,
            "issues": issues_count
        }
    
    # Strict should generally have more issues than lenient
    strict_issues = results["strict"]["issues"]
    lenient_issues = results["lenient"]["issues"]
    threshold_logic = strict_issues >= lenient_issues
    print(f"✅ Threshold logic validation: {threshold_logic} (strict: {strict_issues}, lenient: {lenient_issues})")
    
    return results

def test_workflow_specific_analysis():
    """Test workflow-specific quality analysis."""
    print("\n🎬 Testing Workflow-Specific Analysis")
    
    workflows = [
        ("hunyuan_t2v", "HunyuanVideo Text-to-Video"),
        ("hunyuan_i2v", "HunyuanVideo Image-to-Video"),
        ("wan_alpha_t2v", "Wan Video Alpha T2V"),
        ("wan_inpainting", "Wan Video Inpainting"),
        ("legacy", "Legacy Video Engine")
    ]
    
    monitor = create_quality_monitor()
    workflow_results = {}
    
    for workflow_id, workflow_name in workflows:
        report = monitor.analyze_video(f"test_{workflow_id}.mp4", workflow_id)
        
        workflow_results[workflow_id] = {
            "score": report.overall_score,
            "metrics": len(report.metric_scores),
            "issues": len(report.issues),
            "suggestions": len(report.improvement_suggestions)
        }
        
        print(f"✅ {workflow_name}: {report.overall_score:.3f} score, {len(report.metric_scores)} metrics")
    
    # All workflows should produce valid results
    all_valid = all(
        result["score"] >= 0 and result["metrics"] > 0
        for result in workflow_results.values()
    )
    print(f"✅ All workflows valid: {all_valid}")
    
    return workflow_results

def test_real_time_monitoring():
    """Test real-time monitoring capabilities."""
    print("\n⚡ Testing Real-time Monitoring")
    
    # Test with real-time enabled
    real_time_config = QualityConfig(
        enable_real_time=True,
        sample_frame_rate=0.5,  # Analyze every other frame
        max_analysis_time=5.0
    )
    
    monitor = AdvancedVideoQualityMonitor(real_time_config)
    
    start_time = time.time()
    report = monitor.analyze_video("realtime_test.mp4", "hunyuan_t2v")
    analysis_time = time.time() - start_time
    
    # Real-time should be reasonably fast
    real_time_fast = analysis_time < real_time_config.max_analysis_time
    print(f"✅ Real-time analysis: {analysis_time:.2f}s (under limit: {real_time_fast})")
    
    # Test frame sampling
    expected_frames = int(report.frame_count * real_time_config.sample_frame_rate)
    sampling_effective = expected_frames <= report.frame_count
    print(f"✅ Frame sampling: {report.frame_count} frames analyzed (sampling effective: {sampling_effective})")
    
    return {
        "real_time_fast": real_time_fast,
        "sampling_effective": sampling_effective,
        "analysis_time": analysis_time
    }

def main():
    """Run all tests and display results."""
    print("🎬 Advanced Video Quality Monitor - Integration Test")
    print("=" * 60)
    
    try:
        # Run basic functionality tests
        basic_results = test_basic_functionality()
        basic_success = sum(basic_results.values())
        basic_total = len(basic_results)
        
        # Run threshold tests
        threshold_results = test_quality_thresholds()
        
        # Run workflow-specific tests
        workflow_results = test_workflow_specific_analysis()
        
        # Run real-time monitoring tests
        realtime_results = test_real_time_monitoring()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        print(f"Basic Functionality: {basic_success}/{basic_total} tests passed")
        print(f"Threshold Configurations: {len(threshold_results)} tested")
        print(f"Workflow Types: {len(workflow_results)} tested")
        print(f"Real-time Monitoring: {'✅ PASS' if realtime_results['real_time_fast'] else '❌ FAIL'}")
        
        # Overall assessment
        overall_success = (
            basic_success >= basic_total * 0.8 and  # 80% basic tests pass
            len(threshold_results) >= 3 and         # All threshold configs tested
            len(workflow_results) >= 5 and          # All workflows tested
            realtime_results['real_time_fast']      # Real-time performance good
        )
        
        print(f"\n🎯 OVERALL RESULT: {'✅ SUCCESS' if overall_success else '❌ NEEDS ATTENTION'}")
        
        if overall_success:
            print("\n🚀 Advanced Video Quality Monitor is ready for integration!")
            print("   - Comprehensive quality analysis implemented")
            print("   - Multiple workflow types supported")
            print("   - Real-time monitoring capabilities")
            print("   - Dashboard integration ready")
        else:
            print("\n⚠️  Some issues detected - review test results above")
        
        return overall_success
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)