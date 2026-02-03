"""
Flakiness detection functionality for identifying unreliable tests.

This module provides functions to run tests multiple times and detect
tests with inconsistent results (flaky tests).
"""

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict


@dataclass
class FlakinessResult:
    """Result of flakiness detection for a single test."""
    test_name: str
    total_runs: int
    passed_runs: int
    failed_runs: int
    pass_rate: float
    is_flaky: bool


@dataclass
class FlakinessReport:
    """Complete flakiness detection report."""
    total_iterations: int
    total_tests_checked: int
    flaky_tests: List[FlakinessResult]
    stable_tests: List[str]
    flakiness_threshold: float


def run_pytest_multiple_times(
    test_dir: Path,
    iterations: int = 100,
    test_pattern: str = None
) -> Dict[str, List[bool]]:
    """
    Run pytest multiple times and track pass/fail for each test.
    
    Args:
        test_dir: Directory containing Python tests
        iterations: Number of times to run tests
        test_pattern: Optional pattern to filter specific tests
        
    Returns:
        Dictionary mapping test names to list of pass/fail results
        
    Requirements: 3.4, 10.3
    """
    if not test_dir.exists():
        return {}
    
    test_results = defaultdict(list)
    
    for i in range(iterations):
        try:
            # Run pytest with verbose output
            cmd = ['pytest', str(test_dir), '-v', '--tb=no', '-q']
            if test_pattern:
                cmd.extend(['-k', test_pattern])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60  # 1 minute timeout per iteration
            )
            
            # Parse output to extract test results
            output_lines = result.stdout.split('\n')
            
            for line in output_lines:
                # Look for test result lines (format: "test_file.py::test_name PASSED")
                if '::' in line and ('PASSED' in line or 'FAILED' in line):
                    parts = line.split()
                    if len(parts) >= 2:
                        test_name = parts[0]
                        status = parts[1]
                        test_results[test_name].append(status == 'PASSED')
        
        except subprocess.TimeoutExpired:
            # If a run times out, mark all tests as failed for this iteration
            for test_name in test_results.keys():
                if len(test_results[test_name]) < i + 1:
                    test_results[test_name].append(False)
        except Exception:
            # On any error, skip this iteration
            continue
    
    return dict(test_results)


def run_vitest_multiple_times(
    test_dir: Path,
    iterations: int = 100,
    test_pattern: str = None
) -> Dict[str, List[bool]]:
    """
    Run vitest multiple times and track pass/fail for each test.
    
    Args:
        test_dir: Directory containing TypeScript tests
        iterations: Number of times to run tests
        test_pattern: Optional pattern to filter specific tests
        
    Returns:
        Dictionary mapping test names to list of pass/fail results
        
    Requirements: 3.4, 10.3
    """
    if not test_dir.exists():
        return {}
    
    test_results = defaultdict(list)
    
    for i in range(iterations):
        try:
            # Run vitest with verbose output
            cmd = ['npm', 'run', 'test', '--', '--run', '--reporter=verbose']
            if test_pattern:
                cmd.extend(['-t', test_pattern])
            
            result = subprocess.run(
                cmd,
                cwd=test_dir,
                capture_output=True,
                text=True,
                timeout=60  # 1 minute timeout per iteration
            )
            
            # Parse output to extract test results
            output_lines = result.stdout.split('\n')
            
            for line in output_lines:
                # Look for test result lines
                if '✓' in line or '✗' in line or 'PASS' in line or 'FAIL' in line:
                    # Extract test name and status
                    is_passed = '✓' in line or 'PASS' in line
                    # Simple heuristic: use the line as test identifier
                    test_name = line.strip()
                    if test_name:
                        test_results[test_name].append(is_passed)
        
        except subprocess.TimeoutExpired:
            # If a run times out, mark all tests as failed for this iteration
            for test_name in test_results.keys():
                if len(test_results[test_name]) < i + 1:
                    test_results[test_name].append(False)
        except Exception:
            # On any error, skip this iteration
            continue
    
    return dict(test_results)


def analyze_flakiness(
    test_results: Dict[str, List[bool]],
    threshold: float = 0.95
) -> List[FlakinessResult]:
    """
    Analyze test results to identify flaky tests.
    
    A test is considered flaky if its pass rate is below the threshold
    but above 0% (i.e., it sometimes passes and sometimes fails).
    
    Args:
        test_results: Dictionary mapping test names to pass/fail results
        threshold: Pass rate threshold for considering a test stable (default: 95%)
        
    Returns:
        List of FlakinessResult objects for flaky tests
        
    Requirements: 3.4, 10.3
    """
    flaky_tests = []
    
    for test_name, results in test_results.items():
        if not results:
            continue
        
        total_runs = len(results)
        passed_runs = sum(results)
        failed_runs = total_runs - passed_runs
        pass_rate = passed_runs / total_runs if total_runs > 0 else 0.0
        
        # A test is flaky if it's not consistently passing or failing
        # (pass rate between 0% and threshold)
        is_flaky = 0 < pass_rate < threshold
        
        if is_flaky:
            flaky_tests.append(FlakinessResult(
                test_name=test_name,
                total_runs=total_runs,
                passed_runs=passed_runs,
                failed_runs=failed_runs,
                pass_rate=pass_rate,
                is_flaky=True
            ))
    
    return flaky_tests


def detect_flaky_tests(
    test_dir: Path,
    framework: str = 'pytest',
    iterations: int = 100,
    threshold: float = 0.95,
    test_pattern: str = None
) -> FlakinessReport:
    """
    Detect flaky tests by running them multiple times.
    
    Args:
        test_dir: Directory containing tests
        framework: Testing framework ('pytest' or 'vitest')
        iterations: Number of times to run tests (default: 100)
        threshold: Pass rate threshold for stability (default: 95%)
        test_pattern: Optional pattern to filter specific tests
        
    Returns:
        FlakinessReport with detected flaky tests
        
    Requirements: 3.4, 10.3
    """
    # Run tests multiple times
    if framework == 'pytest':
        test_results = run_pytest_multiple_times(test_dir, iterations, test_pattern)
    elif framework == 'vitest':
        test_results = run_vitest_multiple_times(test_dir, iterations, test_pattern)
    else:
        raise ValueError(f"Unsupported framework: {framework}")
    
    # Analyze results for flakiness
    flaky_results = analyze_flakiness(test_results, threshold)
    
    # Identify stable tests (pass rate >= threshold)
    stable_tests = []
    for test_name, results in test_results.items():
        if results:
            pass_rate = sum(results) / len(results)
            if pass_rate >= threshold:
                stable_tests.append(test_name)
    
    return FlakinessReport(
        total_iterations=iterations,
        total_tests_checked=len(test_results),
        flaky_tests=flaky_results,
        stable_tests=stable_tests,
        flakiness_threshold=threshold
    )


def get_flaky_test_names(flakiness_report: FlakinessReport) -> List[str]:
    """
    Extract list of flaky test names from report.
    
    Args:
        flakiness_report: FlakinessReport object
        
    Returns:
        List of test names that are flaky
        
    Requirements: 3.4, 10.3
    """
    return [result.test_name for result in flakiness_report.flaky_tests]
