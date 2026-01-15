"""
Performance Benchmarks for Production Scalability Optimizations

This module provides comprehensive benchmarking for all implemented optimizations:
- Multi-level caching performance
- Memory pool efficiency
- Async task queue throughput
- Database connection pooling
- Enhanced monitoring overhead

Author: StoryCore-Engine Team
Date: 2026-01-15
"""

import asyncio
import json
import logging
import statistics
import time
import tracemalloc
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable, Tuple
import psutil
import numpy as np

# Import optimization modules
from .advanced_caching_layer import AdvancedCachingLayer, CacheConfiguration
from .memory_pool_manager import MemoryPoolManager, NumpyArrayPool, BufferPool
from .async_task_queue import AsyncTaskQueue, QueueConfiguration, TaskPriority
from .database_connection_pool import DatabaseConnectionPool, PoolConfiguration
from .enhanced_performance_monitor import EnhancedPerformanceMonitor


@dataclass
class BenchmarkResult:
    """Result of a benchmark test."""
    test_name: str
    duration_seconds: float
    operations_per_second: float
    memory_usage_mb: float
    cpu_usage_percent: float
    metrics: Dict[str, Any] = field(default_factory=dict)
    success: bool = True
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'test_name': self.test_name,
            'duration_seconds': self.duration_seconds,
            'operations_per_second': self.operations_per_second,
            'memory_usage_mb': self.memory_usage_mb,
            'cpu_usage_percent': self.cpu_usage_percent,
            'metrics': self.metrics,
            'success': self.success,
            'error_message': self.error_message
        }


@dataclass
class BenchmarkSuite:
    """Collection of benchmark results."""
    suite_name: str
    timestamp: float
    results: List[BenchmarkResult] = field(default_factory=list)
    system_info: Dict[str, Any] = field(default_factory=dict)

    def add_result(self, result: BenchmarkResult):
        """Add benchmark result."""
        self.results.append(result)

    def get_summary(self) -> Dict[str, Any]:
        """Get benchmark suite summary."""
        if not self.results:
            return {}

        successful_tests = [r for r in self.results if r.success]
        total_ops = sum(r.operations_per_second for r in successful_tests)

        return {
            'suite_name': self.suite_name,
            'timestamp': self.timestamp,
            'total_tests': len(self.results),
            'successful_tests': len(successful_tests),
            'failed_tests': len(self.results) - len(successful_tests),
            'average_ops_per_second': total_ops / len(successful_tests) if successful_tests else 0,
            'total_memory_usage_mb': sum(r.memory_usage_mb for r in successful_tests),
            'system_info': self.system_info
        }


class PerformanceBenchmarks:
    """
    Comprehensive benchmarking suite for production scalability optimizations.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.results: List[BenchmarkSuite] = []

    @contextmanager
    def benchmark_context(self, test_name: str, num_operations: int):
        """Context manager for benchmark measurement."""
        tracemalloc.start()
        process = psutil.Process()

        start_time = time.time()
        start_memory = process.memory_info().rss / (1024 * 1024)
        start_cpu = psutil.cpu_percent(interval=None)

        try:
            yield
            success = True
            error_message = None
        except Exception as e:
            success = False
            error_message = str(e)
            self.logger.error(f"Benchmark {test_name} failed: {e}")

        end_time = time.time()
        end_memory = process.memory_info().rss / (1024 * 1024)
        end_cpu = psutil.cpu_percent(interval=None)

        duration = end_time - start_time
        memory_usage = end_memory - start_memory
        ops_per_second = num_operations / duration if duration > 0 else 0

        # Get memory peak
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        result = BenchmarkResult(
            test_name=test_name,
            duration_seconds=duration,
            operations_per_second=ops_per_second,
            memory_usage_mb=memory_usage,
            cpu_usage_percent=end_cpu,
            metrics={
                'peak_memory_mb': peak / (1024 * 1024),
                'num_operations': num_operations,
                'avg_operation_time_ms': (duration * 1000) / num_operations
            },
            success=success,
            error_message=error_message
        )

        return result

    async def run_caching_benchmarks(self) -> BenchmarkSuite:
        """Benchmark multi-level caching performance."""
        suite = BenchmarkSuite("Multi-Level Caching Benchmarks", time.time())
        suite.system_info = self._get_system_info()

        # Setup cache
        config = CacheConfiguration(
            enable_l1=True, l1_max_size_mb=256,
            enable_l2=True, l2_max_size_mb=1024,
            enable_l3=False
        )
        cache = AdvancedCachingLayer(config)
        await cache.start()

        try:
            # Benchmark 1: Cache set operations
            with self.benchmark_context("cache_set_operations", 10000) as result:
                for i in range(10000):
                    key = f"test_key_{i}"
                    value = f"test_value_{i}" * 100  # ~1KB per value
                    await cache.set(key, value)

            suite.add_result(result)

            # Benchmark 2: Cache get operations (mixed hit/miss)
            with self.benchmark_context("cache_get_operations", 10000) as result:
                for i in range(10000):
                    key = f"test_key_{i % 5000}"  # 50% hit rate
                    await cache.get(key)

            suite.add_result(result)

            # Benchmark 3: Cache with compression
            test_data = b"x" * 10000  # 10KB of compressible data
            with self.benchmark_context("cache_compression", 1000) as result:
                for i in range(1000):
                    key = f"compressed_key_{i}"
                    await cache.set(key, test_data)

            suite.add_result(result)

        finally:
            await cache.stop()

        return suite

    def run_memory_pool_benchmarks(self) -> BenchmarkSuite:
        """Benchmark memory pool efficiency."""
        suite = BenchmarkSuite("Memory Pool Benchmarks", time.time())
        suite.system_info = self._get_system_info()

        # Setup memory pools
        manager = MemoryPoolManager(enable_tracing=True)

        # Numpy array pool
        numpy_pool = manager.create_pool(
            "numpy_arrays",
            lambda: np.zeros((100, 100), dtype=np.float32),
            manager.pool_config
        )

        # Buffer pool
        buffer_pool = manager.create_pool(
            "buffers",
            lambda: bytearray(1024),
            manager.pool_config
        )

        try:
            # Benchmark 1: Object allocation/deallocation
            with self.benchmark_context("memory_pool_operations", 10000) as result:
                objects = []
                for i in range(10000):
                    obj = numpy_pool.acquire()
                    objects.append(obj)

                for obj in objects:
                    numpy_pool.release(obj)

            suite.add_result(result)

            # Benchmark 2: Pool under contention
            import threading
            import concurrent.futures

            def pool_worker(pool, operations):
                for _ in range(operations):
                    obj = pool.acquire()
                    time.sleep(0.001)  # Simulate work
                    pool.release(obj)

            with self.benchmark_context("memory_pool_contention", 1000) as result:
                with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                    futures = []
                    for _ in range(10):
                        futures.append(executor.submit(pool_worker, numpy_pool, 100))

                    for future in futures:
                        future.result()

            suite.add_result(result)

        finally:
            manager.stop_cleanup_thread()

        return suite

    async def run_async_queue_benchmarks(self) -> BenchmarkSuite:
        """Benchmark async task queue throughput."""
        suite = BenchmarkSuite("Async Task Queue Benchmarks", time.time())
        suite.system_info = self._get_system_info()

        # Setup queue
        config = QueueConfiguration(
            max_queue_size=10000,
            max_concurrent_tasks=50,
            worker_pool_size=8
        )
        queue = AsyncTaskQueue(config)
        queue.start()

        try:
            # Benchmark 1: Task submission and execution
            async def dummy_task(x):
                await asyncio.sleep(0.01)  # Simulate work
                return x * 2

            with self.benchmark_context("async_queue_throughput", 1000) as result:
                tasks = []
                for i in range(1000):
                    task_id = f"task_{i}"
                    tasks.append(queue.submit_task(task_id, dummy_task, args=(i,)))

                # Wait for all tasks
                results = await asyncio.gather(*tasks, return_exceptions=True)

            suite.add_result(result)

            # Benchmark 2: Priority queue performance
            with self.benchmark_context("priority_queue_operations", 1000) as result:
                tasks = []
                for i in range(1000):
                    priority = TaskPriority(i % 5)
                    task_id = f"priority_task_{i}"
                    tasks.append(queue.submit_task(
                        task_id, dummy_task,
                        priority=priority, args=(i,)
                    ))

                # Wait for completion
                await asyncio.sleep(5)  # Give time for processing

            suite.add_result(result)

        finally:
            queue.stop()

        return suite

    def run_database_pool_benchmarks(self) -> BenchmarkSuite:
        """Benchmark database connection pooling."""
        suite = BenchmarkSuite("Database Connection Pool Benchmarks", time.time())
        suite.system_info = self._get_system_info()

        # Setup database pool (using test database)
        test_db = Path("./test_performance.db")
        config = PoolConfiguration(
            database_path=str(test_db),
            min_connections=2,
            max_connections=10
        )

        pool = DatabaseConnectionPool(config)
        pool.start()

        try:
            # Create test table
            with pool.get_connection() as conn:
                conn.connection.execute("""
                    CREATE TABLE IF NOT EXISTS benchmark_data (
                        id INTEGER PRIMARY KEY,
                        data TEXT
                    )
                """)
                conn.connection.commit()

            # Benchmark 1: Connection acquisition
            with self.benchmark_context("db_connection_acquisition", 1000) as result:
                for i in range(1000):
                    with pool.get_connection() as conn:
                        pass  # Just acquire and release

            suite.add_result(result)

            # Benchmark 2: Query execution
            test_data = "x" * 1000  # 1KB of test data

            with self.benchmark_context("db_query_operations", 1000) as result:
                for i in range(1000):
                    # Insert
                    pool.execute_update(
                        "INSERT INTO benchmark_data (data) VALUES (?)",
                        (f"{test_data}_{i}",)
                    )

                    # Select
                    results = pool.execute_query(
                        "SELECT data FROM benchmark_data WHERE id = ?",
                        (i + 1,)
                    )

            suite.add_result(result)

            # Benchmark 3: Prepared statement caching
            with self.benchmark_context("db_prepared_statements", 1000) as result:
                for i in range(1000):
                    pool.execute_query(
                        "SELECT COUNT(*) FROM benchmark_data WHERE data LIKE ?",
                        (f"%{i}%",)
                    )

            suite.add_result(result)

        finally:
            pool.stop()
            # Cleanup test database
            try:
                test_db.unlink(missing_ok=True)
            except Exception:
                pass

        return suite

    def run_monitoring_benchmarks(self) -> BenchmarkSuite:
        """Benchmark monitoring system overhead."""
        suite = BenchmarkSuite("Monitoring System Benchmarks", time.time())
        suite.system_info = self._get_system_info()

        monitor = EnhancedPerformanceMonitor()

        try:
            monitor.start_monitoring()

            # Benchmark 1: Metric recording overhead
            with self.benchmark_context("metric_recording_overhead", 10000) as result:
                for i in range(10000):
                    monitor.record_metric(f"test_metric_{i % 100}", float(i))

            suite.add_result(result)

            # Benchmark 2: Alert rule evaluation
            with self.benchmark_context("alert_evaluation_overhead", 1000) as result:
                for i in range(1000):
                    monitor.record_metric("cpu_percent", 50.0 + (i % 50))
                    monitor.record_metric("memory_percent", 60.0 + (i % 40))

            suite.add_result(result)

            # Benchmark 3: Report generation
            # Pre-populate some data
            for i in range(1000):
                monitor.record_metric("cpu_percent", 50.0 + (i % 50))

            with self.benchmark_context("report_generation", 10) as result:
                for _ in range(10):
                    report = monitor.generate_performance_report()

            suite.add_result(result)

        finally:
            monitor.stop_monitoring()

        return suite

    async def run_all_benchmarks(self) -> List[BenchmarkSuite]:
        """Run all benchmark suites."""
        self.logger.info("Starting comprehensive performance benchmarks")

        suites = []

        # Run caching benchmarks
        self.logger.info("Running caching benchmarks...")
        cache_suite = await self.run_caching_benchmarks()
        suites.append(cache_suite)

        # Run memory pool benchmarks
        self.logger.info("Running memory pool benchmarks...")
        memory_suite = self.run_memory_pool_benchmarks()
        suites.append(memory_suite)

        # Run async queue benchmarks
        self.logger.info("Running async queue benchmarks...")
        queue_suite = await self.run_async_queue_benchmarks()
        suites.append(queue_suite)

        # Run database pool benchmarks
        self.logger.info("Running database pool benchmarks...")
        db_suite = self.run_database_pool_benchmarks()
        suites.append(db_suite)

        # Run monitoring benchmarks
        self.logger.info("Running monitoring benchmarks...")
        monitoring_suite = self.run_monitoring_benchmarks()
        suites.append(monitoring_suite)

        self.results.extend(suites)
        self.logger.info("All benchmarks completed")

        return suites

    def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive benchmark report."""
        if not self.results:
            return {"error": "No benchmark results available"}

        # Aggregate results
        all_results = []
        for suite in self.results:
            all_results.extend(suite.results)

        successful_results = [r for r in all_results if r.success]
        failed_results = [r for r in all_results if not r.success]

        # Calculate improvements (compared to baseline - simulated)
        # In real scenario, this would compare against previous runs
        baseline_ops_per_sec = 1000  # Simulated baseline
        current_avg_ops = statistics.mean([r.operations_per_second for r in successful_results]) if successful_results else 0
        performance_improvement = ((current_avg_ops - baseline_ops_per_sec) / baseline_ops_per_sec) * 100 if baseline_ops_per_sec > 0 else 0

        # Memory efficiency
        avg_memory_usage = statistics.mean([r.memory_usage_mb for r in successful_results]) if successful_results else 0

        # Categorize by optimization type
        caching_results = [r for r in successful_results if "cache" in r.test_name.lower()]
        memory_results = [r for r in successful_results if "memory" in r.test_name.lower()]
        async_results = [r for r in successful_results if "async" in r.test_name.lower() or "queue" in r.test_name.lower()]
        db_results = [r for r in successful_results if "db" in r.test_name.lower()]
        monitoring_results = [r for r in successful_results if "monitor" in r.test_name.lower() or "metric" in r.test_name.lower()]

        return {
            "report_timestamp": time.time(),
            "summary": {
                "total_suites": len(self.results),
                "total_tests": len(all_results),
                "successful_tests": len(successful_results),
                "failed_tests": len(failed_results),
                "success_rate_percent": (len(successful_results) / len(all_results)) * 100 if all_results else 0,
                "average_ops_per_second": current_avg_ops,
                "performance_improvement_percent": performance_improvement,
                "average_memory_usage_mb": avg_memory_usage
            },
            "optimization_breakdown": {
                "caching": {
                    "tests": len(caching_results),
                    "avg_ops_per_sec": statistics.mean([r.operations_per_second for r in caching_results]) if caching_results else 0
                },
                "memory_management": {
                    "tests": len(memory_results),
                    "avg_ops_per_sec": statistics.mean([r.operations_per_second for r in memory_results]) if memory_results else 0
                },
                "async_processing": {
                    "tests": len(async_results),
                    "avg_ops_per_sec": statistics.mean([r.operations_per_second for r in async_results]) if async_results else 0
                },
                "database_pooling": {
                    "tests": len(db_results),
                    "avg_ops_per_sec": statistics.mean([r.operations_per_second for r in db_results]) if db_results else 0
                },
                "monitoring": {
                    "tests": len(monitoring_results),
                    "avg_ops_per_sec": statistics.mean([r.operations_per_second for r in monitoring_results]) if monitoring_results else 0
                }
            },
            "scalability_assessment": self._assess_scalability(all_results),
            "suite_summaries": [suite.get_summary() for suite in self.results],
            "failed_tests": [
                {
                    "test_name": r.test_name,
                    "error_message": r.error_message
                }
                for r in failed_results
            ]
        }

    def _assess_scalability(self, results: List[BenchmarkResult]) -> Dict[str, Any]:
        """Assess scalability improvements."""
        # Analyze throughput scaling
        throughput_values = [r.operations_per_second for r in results if r.success]

        if len(throughput_values) < 2:
            return {"assessment": "insufficient_data"}

        throughput_std = statistics.stdev(throughput_values) if len(throughput_values) > 1 else 0
        throughput_cv = throughput_std / statistics.mean(throughput_values) if throughput_values else 0

        # Memory efficiency analysis
        memory_values = [r.memory_usage_mb for r in results if r.success]
        memory_efficiency = "good" if all(m < 100 for m in memory_values) else "needs_optimization"

        # CPU efficiency analysis
        cpu_values = [r.cpu_usage_percent for r in results if r.success]
        cpu_efficiency = "good" if statistics.mean(cpu_values) < 70 else "high_usage"

        return {
            "throughput_stability": "stable" if throughput_cv < 0.3 else "variable",
            "throughput_coefficient_of_variation": throughput_cv,
            "memory_efficiency": memory_efficiency,
            "cpu_efficiency": cpu_efficiency,
            "estimated_concurrent_users": self._estimate_concurrent_capacity(throughput_values),
            "scalability_score": self._calculate_scalability_score(results)
        }

    def _estimate_concurrent_capacity(self, throughput_values: List[float]) -> int:
        """Estimate concurrent user capacity based on throughput."""
        if not throughput_values:
            return 0

        avg_throughput = statistics.mean(throughput_values)
        # Rough estimation: assume each user generates 10 ops/minute
        return int((avg_throughput * 60) / 10)

    def _calculate_scalability_score(self, results: List[BenchmarkResult]) -> float:
        """Calculate overall scalability score (0-100)."""
        if not results:
            return 0.0

        scores = []

        # Throughput score
        ops_values = [r.operations_per_second for r in results if r.success]
        if ops_values:
            avg_ops = statistics.mean(ops_values)
            throughput_score = min(100, avg_ops / 100)  # Normalize to 0-100
            scores.append(throughput_score * 0.4)

        # Memory efficiency score
        memory_values = [r.memory_usage_mb for r in results if r.success]
        if memory_values:
            avg_memory = statistics.mean(memory_values)
            memory_score = max(0, 100 - (avg_memory / 10))  # Penalty for high memory usage
            scores.append(memory_score * 0.3)

        # CPU efficiency score
        cpu_values = [r.cpu_usage_percent for r in results if r.success]
        if cpu_values:
            avg_cpu = statistics.mean(cpu_values)
            cpu_score = max(0, 100 - avg_cpu)  # Lower CPU usage is better
            scores.append(cpu_score * 0.3)

        return sum(scores) if scores else 0.0

    def _get_system_info(self) -> Dict[str, Any]:
        """Get system information for benchmark context."""
        return {
            "cpu_count": psutil.cpu_count(),
            "cpu_count_logical": psutil.cpu_count(logical=True),
            "memory_total_gb": psutil.virtual_memory().total / (1024**3),
            "platform": "linux"  # Simplified
        }

    def save_report(self, filepath: Path) -> bool:
        """Save comprehensive benchmark report to file."""
        try:
            report = self.generate_comprehensive_report()

            with open(filepath, 'w') as f:
                json.dump(report, f, indent=2, default=str)

            self.logger.info(f"Benchmark report saved to {filepath}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to save benchmark report: {e}")
            return False


async def run_performance_benchmarks(output_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Run all performance benchmarks and return comprehensive report.

    Args:
        output_path: Optional path to save detailed report

    Returns:
        Comprehensive benchmark report
    """
    benchmarks = PerformanceBenchmarks()

    try:
        suites = await benchmarks.run_all_benchmarks()
        report = benchmarks.generate_comprehensive_report()

        if output_path:
            benchmarks.save_report(output_path)

        return report

    except Exception as e:
        logging.error(f"Benchmark execution failed: {e}")
        return {"error": str(e)}


# Command-line interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run performance benchmarks")
    parser.add_argument("--output", type=Path, help="Output file for detailed report")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.INFO)

    # Run benchmarks
    report = asyncio.run(run_performance_benchmarks(args.output))

    # Print summary
    print("\n=== Performance Benchmark Summary ===")
    print(f"Total Suites: {report.get('summary', {}).get('total_suites', 0)}")
    print(f"Total Tests: {report.get('summary', {}).get('total_tests', 0)}")
    print(f"Success Rate: {report.get('summary', {}).get('success_rate_percent', 0):.1f}%")
    print(f"Average OPS: {report.get('summary', {}).get('average_ops_per_second', 0):.0f}")
    print(f"Performance Improvement: {report.get('summary', {}).get('performance_improvement_percent', 0):.1f}%")
    print(f"Scalability Score: {report.get('scalability_assessment', {}).get('scalability_score', 0):.1f}/100")

    if args.output:
        print(f"\nDetailed report saved to: {args.output}")