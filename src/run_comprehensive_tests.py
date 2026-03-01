#!/usr/bin/env python3
"""
Comprehensive Test Runner for Advanced ComfyUI Workflows

This script runs the complete test suite including:
- Unit tests for all components
- Integration tests for workflow interactions
- Performance benchmarks
- Quality validation
- Stress testing scenarios
- Memory usage validation
- User acceptance testing
- Regression testing

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import asyncio
import json
import logging
import sys
import time
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from comprehensive_testing_framework import (
    TestExecutor,
    TestSuite,
    TestType,
    TestPriority,
    TestingConfig,
    create_comprehensive_testing_framework
)


async def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('test_execution.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )


async def create_test_suites() -> list[TestSuite]:
    """Create all test suites for comprehensive testing"""
    
    test_suites = []
    
    # Unit Test Suite
    unit_suite = TestSuite(
        suite_id="unit_tests",
        name="Unit Tests - All Components",
        test_type=TestType.UNIT,
        priority=TestPriority.CRITICAL,
        test_files=[
            "tests/test_enhanced_video_engine.py",
            "tests/test_enhanced_image_engine.py",
            "tests/test_advanced_performance_optimizer.py",
            "tests/test_advanced_video_quality_monitor.py",
            "tests/test_advanced_image_quality_monitor.py",
            "tests/test_newbie_image_integration.py",
            "tests/test_qwen_image_suite_integration.py",
            "tests/test_hunyuan_video_integration.py",
            "tests/test_wan_video_integration.py"
        ],
        test_functions=[
            "test_component_initialization",
            "test_configuration_validation",
            "test_basic_functionality",
            "test_error_handling",
            "test_edge_cases"
        ],
        timeout=600,  # 10 minutes
        parallel=True
    )
    test_suites.append(unit_suite)
    
    # Integration Test Suite
    integration_suite = TestSuite(
        suite_id="integration_tests",
        name="Integration Tests - Component Interactions",
        test_type=TestType.INTEGRATION,
        priority=TestPriority.HIGH,
        test_files=["tests/test_comprehensive_workflows.py"],
        test_functions=[
            "test_video_engine_with_quality_monitor",
            "test_image_engine_with_quality_monitor",
            "test_performance_optimizer_with_workflows",
            "test_newbie_qwen_workflow_chain",
            "test_hunyuan_wan_video_pipeline"
        ],
        timeout=900,  # 15 minutes
        parallel=False,  # Sequential for integration tests
        dependencies=["unit_tests"]
    )
    test_suites.append(integration_suite)
    
    # Performance Test Suite
    performance_suite = TestSuite(
        suite_id="performance_tests",
        name="Performance Benchmarks",
        test_type=TestType.PERFORMANCE,
        priority=TestPriority.HIGH,
        test_functions=[
            "test_video_generation_performance",
            "test_image_generation_performance",
            "test_batch_processing_performance",
            "test_quality_analysis_performance",
            "test_model_loading_performance",
            "test_memory_usage_performance"
        ],
        timeout=1200,  # 20 minutes
        parallel=True,
        dependencies=["integration_tests"]
    )
    test_suites.append(performance_suite)
    
    # Quality Validation Suite
    quality_suite = TestSuite(
        suite_id="quality_tests",
        name="Quality Validation Tests",
        test_type=TestType.QUALITY,
        priority=TestPriority.HIGH,
        test_functions=[
            "test_video_quality_standards",
            "test_image_quality_standards",
            "test_workflow_consistency",
            "test_api_compatibility",
            "test_code_coverage_analysis",
            "test_documentation_coverage"
        ],
        timeout=600,  # 10 minutes
        parallel=True,
        dependencies=["unit_tests"]
    )
    test_suites.append(quality_suite)
    
    # Stress Test Suite
    stress_suite = TestSuite(
        suite_id="stress_tests",
        name="Stress Testing Scenarios",
        test_type=TestType.STRESS,
        priority=TestPriority.MEDIUM,
        test_functions=[
            "test_concurrent_video_generation",
            "test_concurrent_image_generation",
            "test_high_load_scenarios",
            "test_resource_exhaustion",
            "test_error_recovery_stress",
            "test_long_running_operations"
        ],
        timeout=1800,  # 30 minutes
        parallel=False,  # Sequential for stress tests
        dependencies=["performance_tests"]
    )
    test_suites.append(stress_suite)
    
    # Memory Test Suite
    memory_suite = TestSuite(
        suite_id="memory_tests",
        name="Memory Usage Validation",
        test_type=TestType.MEMORY,
        priority=TestPriority.HIGH,
        test_functions=[
            "test_memory_leak_detection",
            "test_model_memory_management",
            "test_memory_threshold_enforcement",
            "test_garbage_collection_efficiency",
            "test_memory_usage_patterns"
        ],
        timeout=900,  # 15 minutes
        parallel=False,  # Sequential for memory tests
        dependencies=["integration_tests"]
    )
    test_suites.append(memory_suite)
    
    # User Acceptance Test Suite
    user_acceptance_suite = TestSuite(
        suite_id="user_acceptance_tests",
        name="User Acceptance Scenarios",
        test_type=TestType.USER_ACCEPTANCE,
        priority=TestPriority.HIGH,
        test_functions=[
            "test_end_to_end_video_workflow",
            "test_end_to_end_image_workflow",
            "test_batch_processing_workflow",
            "test_quality_enhancement_workflow",
            "test_user_experience_scenarios"
        ],
        timeout=1200,  # 20 minutes
        parallel=False,  # Sequential for user scenarios
        dependencies=["quality_tests", "memory_tests"]
    )
    test_suites.append(user_acceptance_suite)
    
    # Regression Test Suite
    regression_suite = TestSuite(
        suite_id="regression_tests",
        name="Regression Testing",
        test_type=TestType.REGRESSION,
        priority=TestPriority.CRITICAL,
        test_functions=[
            "test_video_generation_regression",
            "test_image_generation_regression",
            "test_performance_regression",
            "test_api_compatibility_regression",
            "test_configuration_compatibility",
            "test_quality_regression"
        ],
        timeout=900,  # 15 minutes
        parallel=True,
        dependencies=["user_acceptance_tests"]
    )
    test_suites.append(regression_suite)
    
    return test_suites


async def run_comprehensive_tests():
    """Run comprehensive test suite"""
    print("🚀 Starting Comprehensive Test Suite for Advanced ComfyUI Workflows")
    print("=" * 80)
    
    # Setup logging
    await setup_logging()
    logger = logging.getLogger(__name__)
    
    # Create testing configuration
    config = TestingConfig(
        test_output_dir=Path("comprehensive_test_results"),
        target_coverage=95.0,
        parallel_execution=True,
        max_parallel_tests=4,
        performance_threshold=1.2,
        quality_threshold=90.0,
        generate_html_report=True,
        generate_json_report=True,
        generate_junit_xml=True
    )
    
    # Create test executor
    executor = create_comprehensive_testing_framework(config)
    
    # Create and register test suites
    test_suites = await create_test_suites()
    
    print(f"\n📋 Registering {len(test_suites)} test suites:")
    for suite in test_suites:
        executor.register_test_suite(suite)
        print(f"   ✅ {suite.name} ({suite.test_type.value}, {suite.priority.value} priority)")
    
    print(f"\n🔧 Test Configuration:")
    print(f"   • Target Coverage: {config.target_coverage}%")
    print(f"   • Parallel Execution: {config.parallel_execution}")
    print(f"   • Max Parallel Tests: {config.max_parallel_tests}")
    print(f"   • Quality Threshold: {config.quality_threshold}%")
    print(f"   • Output Directory: {config.test_output_dir}")
    
    # Execute all tests
    print(f"\n🏃 Executing comprehensive test suite...")
    print("-" * 80)
    
    start_time = time.time()
    
    try:
        report = await executor.execute_all_tests()
        
        execution_time = time.time() - start_time
        
        # Print detailed results
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST RESULTS")
        print("=" * 80)
        
        summary = report['execution_summary']
        print(f"\n📈 Execution Summary:")
        print(f"   • Total Execution Time: {summary['total_execution_time']:.2f}s")
        print(f"   • Total Tests: {summary['total_tests']}")
        print(f"   • Tests Passed: {summary['tests_passed']} ✅")
        print(f"   • Tests Failed: {summary['tests_failed']} ❌")
        print(f"   • Tests Skipped: {summary['tests_skipped']} ⏭️")
        print(f"   • Success Rate: {summary['success_rate']:.1f}%")
        print(f"   • Test Suites Executed: {summary['test_suites_executed']}")
        
        quality = report['quality_metrics']
        print(f"\n🎯 Quality Metrics:")
        print(f"   • Test Coverage: {quality['test_coverage']:.1f}%")
        print(f"   • Code Quality Score: {quality['code_quality_score']:.1f}%")
        print(f"   • API Compatibility: {quality['api_compatibility']:.1f}%")
        print(f"   • Overall Quality Score: {quality['overall_quality_score']:.1f}%")
        
        if 'benchmark_results' in report and report['benchmark_results']:
            print(f"\n⚡ Performance Benchmarks:")
            for bench_id, result in report['benchmark_results'].items():
                print(f"   • {result['name']}: {result['execution_time']:.3f}s")
                print(f"     - Memory Peak: {result['memory_peak']}MB")
                print(f"     - Throughput: {result['throughput']:.1f} ops/sec")
                print(f"     - Success Rate: {result['success_rate']:.1f}%")
        
        if 'recommendations' in report and report['recommendations']:
            print(f"\n💡 Recommendations:")
            for i, recommendation in enumerate(report['recommendations'], 1):
                print(f"   {i}. {recommendation}")
        
        # Test result breakdown by type
        print(f"\n📋 Test Results by Type:")
        test_types = {}
        for test_id, result in report['test_results'].items():
            test_type = result['test_type']
            if test_type not in test_types:
                test_types[test_type] = {'passed': 0, 'failed': 0, 'total': 0}
            
            test_types[test_type]['total'] += 1
            if result['status'] == 'passed':
                test_types[test_type]['passed'] += 1
            else:
                test_types[test_type]['failed'] += 1
        
        for test_type, stats in test_types.items():
            success_rate = (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            status_icon = "✅" if success_rate >= 90 else "⚠️" if success_rate >= 70 else "❌"
            print(f"   {status_icon} {test_type.title()}: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)")
        
        # Overall assessment
        overall_success = summary['success_rate'] >= 90 and quality['overall_quality_score'] >= config.quality_threshold
        
        print("\n" + "=" * 80)
        if overall_success:
            print("🎉 COMPREHENSIVE TESTING COMPLETED SUCCESSFULLY!")
            print("✅ All quality thresholds met")
            print("✅ Performance benchmarks within acceptable ranges")
            print("✅ System ready for production deployment")
        else:
            print("⚠️  COMPREHENSIVE TESTING COMPLETED WITH ISSUES")
            if summary['success_rate'] < 90:
                print(f"❌ Test success rate below threshold: {summary['success_rate']:.1f}% < 90%")
            if quality['overall_quality_score'] < config.quality_threshold:
                print(f"❌ Quality score below threshold: {quality['overall_quality_score']:.1f}% < {config.quality_threshold}%")
            print("🔧 Please review recommendations and fix issues before deployment")
        
        print("=" * 80)
        
        return overall_success
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Comprehensive testing failed: {e}")
        
        print("\n" + "=" * 80)
        print("❌ COMPREHENSIVE TESTING FAILED")
        print("=" * 80)
        print(f"Error: {e}")
        print(f"Execution Time: {execution_time:.2f}s")
        print("Please check the logs for detailed error information")
        print("=" * 80)
        
        return False


async def run_quick_validation():
    """Run quick validation tests for CI/CD"""
    print("🚀 Running Quick Validation Tests")
    print("=" * 50)
    
    config = TestingConfig(
        test_output_dir=Path("quick_test_results"),
        parallel_execution=True,
        max_parallel_tests=2,
        generate_html_report=False,
        generate_json_report=True
    )
    
    executor = create_comprehensive_testing_framework(config)
    
    # Quick test suite
    quick_suite = TestSuite(
        suite_id="quick_validation",
        name="Quick Validation Tests",
        test_type=TestType.UNIT,
        priority=TestPriority.CRITICAL,
        test_functions=[
            "test_basic_initialization",
            "test_core_functionality",
            "test_api_compatibility"
        ],
        timeout=300,  # 5 minutes
        parallel=True
    )
    
    executor.register_test_suite(quick_suite)
    
    start_time = time.time()
    report = await executor.execute_all_tests()
    execution_time = time.time() - start_time
    
    summary = report['execution_summary']
    success = summary['success_rate'] >= 95
    
    print(f"\n📊 Quick Validation Results:")
    print(f"   • Tests: {summary['tests_passed']}/{summary['total_tests']}")
    print(f"   • Success Rate: {summary['success_rate']:.1f}%")
    print(f"   • Execution Time: {execution_time:.2f}s")
    
    if success:
        print("✅ Quick validation passed!")
    else:
        print("❌ Quick validation failed!")
    
    return success


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Comprehensive Test Runner for Advanced ComfyUI Workflows")
    parser.add_argument("--quick", action="store_true", help="Run quick validation tests only")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        if args.quick:
            success = asyncio.run(run_quick_validation())
        else:
            success = asyncio.run(run_comprehensive_tests())
        
        if success:
            print("\n✅ Test execution completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Test execution failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Test execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)