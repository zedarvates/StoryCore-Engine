#!/usr/bin/env python3
"""
Simple Integration Test for Advanced Performance Optimizer

This test validates the core functionality of the Advanced Performance Optimizer
with realistic workflow scenarios and performance validation.

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import asyncio
import json
import time
from pathlib import Path

# Add src to path for imports
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from advanced_performance_optimizer import (
    AdvancedPerformanceOptimizer,
    PerformanceConfig,
    OptimizationStrategy,
    create_advanced_performance_optimizer
)


async def test_basic_workflow_optimization():
    """Test basic workflow optimization functionality"""
    print("🔧 Testing Basic Workflow Optimization...")
    
    # Create optimizer with balanced configuration
    config = PerformanceConfig(
        max_models_in_memory=3,
        max_batch_size=4,
        enable_profiling=True,
        default_strategy=OptimizationStrategy.BALANCED
    )
    optimizer = create_advanced_performance_optimizer(config)
    
    # Test workflow execution
    parameters = {
        'quality_level': 3,
        'steps': 20,
        'resolution': (1024, 1024),
        'batch_size': 4
    }
    
    result = await optimizer.optimize_workflow_execution(
        workflow_id="test_image_generation",
        workflow_type="image_generation",
        parameters=parameters
    )
    
    # Validate results
    assert result['success'] is True, "Workflow optimization should succeed"
    assert result['execution_time'] > 0, "Execution time should be positive"
    assert 'optimizations_applied' in result, "Should include optimization info"
    assert 'resource_usage' in result, "Should include resource usage info"
    
    print(f"   ✅ Workflow executed in {result['execution_time']:.3f}s")
    print(f"   ✅ Optimizations applied: {result['optimizations_applied']}")
    
    return True


async def test_optimization_strategies():
    """Test different optimization strategies"""
    print("🎯 Testing Optimization Strategies...")
    
    optimizer = create_advanced_performance_optimizer()
    base_params = {
        'quality_level': 3,
        'steps': 20,
        'resolution': (1024, 1024)
    }
    
    strategy_results = {}
    
    # Test each optimization strategy
    for strategy in OptimizationStrategy:
        optimizer.set_optimization_strategy(strategy)
        
        result = await optimizer.optimize_workflow_execution(
            workflow_id=f"strategy_test_{strategy.value}",
            workflow_type="image_generation",
            parameters=base_params.copy()
        )
        
        assert result['success'] is True, f"Strategy {strategy.value} should succeed"
        strategy_results[strategy.value] = result['execution_time']
        
        print(f"   ✅ {strategy.value}: {result['execution_time']:.3f}s")
    
    # Validate that different strategies produce different results
    execution_times = list(strategy_results.values())
    assert len(set(execution_times)) > 1, "Different strategies should produce different execution times"
    
    return True


async def test_model_management():
    """Test model management functionality"""
    print("🧠 Testing Model Management...")
    
    config = PerformanceConfig(
        max_models_in_memory=2,
        model_cache_size_mb=4096,
        enable_model_sharing=True
    )
    optimizer = create_advanced_performance_optimizer(config)
    
    # Load multiple models
    model1 = await optimizer.model_manager.load_model("test_model_1", "diffusion", 1024)
    model2 = await optimizer.model_manager.load_model("test_model_2", "diffusion", 1024)
    
    # Test model sharing (load same model again)
    model1_shared = await optimizer.model_manager.load_model("test_model_1", "diffusion", 1024)
    
    assert model1 == model1_shared, "Model sharing should return same instance"
    assert optimizer.model_manager.models["test_model_1"].usage_count == 2, "Usage count should increment"
    
    # Get model statistics
    stats = optimizer.model_manager.get_model_stats()
    assert stats['total_models'] == 2, "Should have 2 models loaded"
    assert stats['loaded_models'] == 2, "Both models should be loaded"
    assert stats['cache_hit_rate'] > 0, "Should have cache hits from model sharing"
    
    print(f"   ✅ Models loaded: {stats['loaded_models']}")
    print(f"   ✅ Memory usage: {stats['memory_usage_mb']}MB")
    print(f"   ✅ Cache hit rate: {stats['cache_hit_rate']:.2%}")
    
    return True


async def test_batch_processing():
    """Test batch processing functionality"""
    print("📦 Testing Batch Processing...")
    
    config = PerformanceConfig(
        max_batch_size=3,
        enable_batch_optimization=True
    )
    optimizer = create_advanced_performance_optimizer(config)
    
    # Create batch items
    items = [
        {'prompt': f'Generate image {i}', 'quality': 3, 'seed': 1000 + i}
        for i in range(8)
    ]
    
    # Submit batch job
    job_id = await optimizer.optimize_batch_processing(
        workflow_type="image_generation",
        items=items,
        priority=7
    )
    
    assert isinstance(job_id, str), "Job ID should be string"
    assert job_id.startswith("batch_"), "Job ID should have batch prefix"
    
    # Check initial job status
    status = optimizer.batch_processor.get_job_status(job_id)
    assert status is not None, "Job status should be available"
    assert status['total_items'] == 8, "Should have 8 items"
    assert status['workflow_type'] == "image_generation", "Workflow type should match"
    
    print(f"   ✅ Batch job submitted: {job_id}")
    print(f"   ✅ Total items: {status['total_items']}")
    print(f"   ✅ Job status: {status['status']}")
    
    # Wait for some processing
    await asyncio.sleep(2)
    
    # Check updated status
    updated_status = optimizer.batch_processor.get_job_status(job_id)
    print(f"   ✅ Updated status: {updated_status['status']}")
    print(f"   ✅ Completed items: {updated_status['completed_items']}")
    
    return True


async def test_resource_monitoring():
    """Test resource monitoring functionality"""
    print("📊 Testing Resource Monitoring...")
    
    optimizer = create_advanced_performance_optimizer()
    
    # Get current metrics
    metrics = optimizer.resource_monitor.get_current_metrics()
    
    assert 0 <= metrics.cpu_percent <= 100, "CPU percentage should be valid"
    assert 0 <= metrics.memory_percent <= 100, "Memory percentage should be valid"
    assert 0 <= metrics.gpu_percent <= 100, "GPU percentage should be valid"
    assert metrics.memory_available >= 0, "Available memory should be non-negative"
    
    print(f"   ✅ CPU usage: {metrics.cpu_percent:.1f}%")
    print(f"   ✅ Memory usage: {metrics.memory_percent:.1f}%")
    print(f"   ✅ GPU usage: {metrics.gpu_percent:.1f}%")
    print(f"   ✅ Available memory: {metrics.memory_available}MB")
    
    # Wait for metrics collection
    await asyncio.sleep(2)
    
    # Get resource statistics
    stats = optimizer.resource_monitor.get_resource_stats()
    if stats:  # Only test if stats are available
        assert 'current' in stats, "Should have current metrics"
        assert 'averages' in stats, "Should have average metrics"
        assert 'peaks' in stats, "Should have peak metrics"
        
        print(f"   ✅ Resource monitoring active with {len(stats)} metric categories")
    
    return True


async def test_performance_profiling():
    """Test performance profiling and statistics"""
    print("📈 Testing Performance Profiling...")
    
    optimizer = create_advanced_performance_optimizer()
    
    # Execute multiple workflows to build profile
    workflow_id = "profiling_test"
    for i in range(5):
        result = await optimizer.optimize_workflow_execution(
            workflow_id=workflow_id,
            workflow_type="image_generation",
            parameters={'quality_level': 3, 'iteration': i}
        )
        assert result['success'] is True, f"Iteration {i} should succeed"
    
    # Check workflow profile was created
    assert workflow_id in optimizer.workflow_profiles, "Workflow profile should be created"
    profile = optimizer.workflow_profiles[workflow_id]
    
    assert profile.execution_count == 5, "Should have 5 executions"
    assert profile.total_time > 0, "Total time should be positive"
    assert profile.average_time > 0, "Average time should be positive"
    assert profile.last_execution > 0, "Last execution timestamp should be set"
    
    print(f"   ✅ Executions: {profile.execution_count}")
    print(f"   ✅ Average time: {profile.average_time:.3f}s")
    print(f"   ✅ Total time: {profile.total_time:.3f}s")
    
    # Get comprehensive statistics
    stats = optimizer.get_optimization_stats()
    assert 'model_management' in stats, "Should include model management stats"
    assert 'workflow_profiles' in stats, "Should include workflow profiles"
    assert 'current_strategy' in stats, "Should include current strategy"
    assert 'total_executions' in stats, "Should include total executions"
    
    print(f"   ✅ Total workflow profiles: {len(stats['workflow_profiles'])}")
    print(f"   ✅ Total executions: {stats['total_executions']}")
    
    return True


async def test_performance_report_export():
    """Test performance report export functionality"""
    print("📄 Testing Performance Report Export...")
    
    optimizer = create_advanced_performance_optimizer()
    
    # Execute some workflows to generate data
    for i in range(3):
        await optimizer.optimize_workflow_execution(
            workflow_id=f"export_test_{i}",
            workflow_type="image_generation",
            parameters={'quality_level': 3}
        )
    
    # Export performance report
    report_path = Path("test_performance_report.json")
    try:
        success = optimizer.export_performance_report(report_path)
        assert success is True, "Report export should succeed"
        assert report_path.exists(), "Report file should be created"
        
        # Validate report content
        with open(report_path, 'r') as f:
            report_data = json.load(f)
        
        assert 'export_info' in report_data, "Should have export info"
        assert 'optimization_stats' in report_data, "Should have optimization stats"
        assert 'workflow_profiles' in report_data, "Should have workflow profiles"
        assert 'recent_executions' in report_data, "Should have recent executions"
        
        export_info = report_data['export_info']
        assert 'timestamp' in export_info, "Should have export timestamp"
        assert 'optimizer_config' in export_info, "Should have optimizer config"
        
        print(f"   ✅ Report exported to {report_path}")
        print(f"   ✅ Report size: {report_path.stat().st_size} bytes")
        print(f"   ✅ Workflow profiles: {len(report_data['workflow_profiles'])}")
        
    finally:
        # Clean up
        if report_path.exists():
            report_path.unlink()
    
    return True


async def test_high_load_scenario():
    """Test performance under high load scenario"""
    print("🔥 Testing High Load Scenario...")
    
    config = PerformanceConfig(
        max_models_in_memory=2,
        memory_threshold_percent=70.0,
        default_strategy=OptimizationStrategy.ADAPTIVE
    )
    optimizer = create_advanced_performance_optimizer(config)
    
    # Simulate high-load parameters
    high_load_params = {
        'quality_level': 5,
        'steps': 50,
        'resolution': (2048, 2048),
        'batch_size': 8
    }
    
    result = await optimizer.optimize_workflow_execution(
        workflow_id="high_load_test",
        workflow_type="image_generation",
        parameters=high_load_params
    )
    
    assert result['success'] is True, "High load scenario should succeed"
    assert len(result['optimizations_applied']) > 0, "Should apply optimizations under high load"
    
    # Check that parameters were optimized
    optimized_params = result['result']['parameters']
    assert '_optimizations' in optimized_params, "Should include optimization metadata"
    
    print(f"   ✅ High load execution: {result['execution_time']:.3f}s")
    print(f"   ✅ Optimizations: {result['optimizations_applied']}")
    
    return True


async def run_integration_tests():
    """Run all integration tests"""
    print("🚀 Starting Advanced Performance Optimizer Integration Tests")
    print("=" * 60)
    
    tests = [
        ("Basic Workflow Optimization", test_basic_workflow_optimization),
        ("Optimization Strategies", test_optimization_strategies),
        ("Model Management", test_model_management),
        ("Batch Processing", test_batch_processing),
        ("Resource Monitoring", test_resource_monitoring),
        ("Performance Profiling", test_performance_profiling),
        ("Performance Report Export", test_performance_report_export),
        ("High Load Scenario", test_high_load_scenario),
    ]
    
    results = []
    start_time = time.time()
    
    for test_name, test_func in tests:
        try:
            print(f"\n{test_name}")
            print("-" * 40)
            
            test_start = time.time()
            success = await test_func()
            test_time = time.time() - test_start
            
            if success:
                print(f"   ✅ PASSED ({test_time:.2f}s)")
                results.append((test_name, "PASSED", test_time, None))
            else:
                print(f"   ❌ FAILED ({test_time:.2f}s)")
                results.append((test_name, "FAILED", test_time, "Test returned False"))
                
        except Exception as e:
            test_time = time.time() - test_start
            print(f"   ❌ ERROR ({test_time:.2f}s): {e}")
            results.append((test_name, "ERROR", test_time, str(e)))
    
    # Print summary
    total_time = time.time() - start_time
    passed = sum(1 for _, status, _, _ in results if status == "PASSED")
    failed = sum(1 for _, status, _, _ in results if status in ["FAILED", "ERROR"])
    
    print("\n" + "=" * 60)
    print("🏁 INTEGRATION TEST SUMMARY")
    print("=" * 60)
    
    for test_name, status, test_time, error in results:
        status_icon = "✅" if status == "PASSED" else "❌"
        print(f"{status_icon} {test_name:<35} {status:<8} ({test_time:.2f}s)")
        if error:
            print(f"   Error: {error}")
    
    print("-" * 60)
    print(f"Total Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {passed/len(results)*100:.1f}%")
    print(f"Total Time: {total_time:.2f}s")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! Advanced Performance Optimizer is working correctly.")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the errors above.")
        return False


if __name__ == "__main__":
    # Run integration tests
    success = asyncio.run(run_integration_tests())
    
    if success:
        print("\n✅ Advanced Performance Optimizer integration test completed successfully!")
        exit(0)
    else:
        print("\n❌ Advanced Performance Optimizer integration test failed!")
        exit(1)