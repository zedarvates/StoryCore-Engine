"""
Unit tests for flakiness detection functionality.
"""

import pytest
from pathlib import Path
from test_cleanup.validation.flakiness_detection import (
    analyze_flakiness,
    get_flaky_test_names,
    FlakinessResult,
    FlakinessReport
)


class TestFlakinessAnalysis:
    """Tests for flakiness analysis."""
    
    def test_stable_passing_test(self):
        """Test that consistently passing tests are not marked as flaky."""
        test_results = {
            'test_stable.py::test_always_passes': [True] * 100
        }
        
        flaky = analyze_flakiness(test_results, threshold=0.95)
        assert len(flaky) == 0
    
    def test_stable_failing_test(self):
        """Test that consistently failing tests are not marked as flaky."""
        test_results = {
            'test_stable.py::test_always_fails': [False] * 100
        }
        
        flaky = analyze_flakiness(test_results, threshold=0.95)
        assert len(flaky) == 0
    
    def test_flaky_test_50_percent(self):
        """Test that intermittently failing tests are marked as flaky."""
        test_results = {
            'test_flaky.py::test_sometimes_fails': [True, False] * 50
        }
        
        flaky = analyze_flakiness(test_results, threshold=0.95)
        assert len(flaky) == 1
        assert flaky[0].test_name == 'test_flaky.py::test_sometimes_fails'
        assert flaky[0].pass_rate == 0.5
        assert flaky[0].is_flaky is True
    
    def test_flaky_test_90_percent(self):
        """Test that mostly passing but occasionally failing tests are flaky."""
        # 90 passes, 10 fails = 90% pass rate (below 95% threshold)
        test_results = {
            'test_flaky.py::test_mostly_passes': [True] * 90 + [False] * 10
        }
        
        flaky = analyze_flakiness(test_results, threshold=0.95)
        assert len(flaky) == 1
        assert flaky[0].pass_rate == 0.9
        assert flaky[0].is_flaky is True
    
    def test_borderline_stable_test(self):
        """Test that tests at exactly the threshold are not flaky."""
        # 95 passes, 5 fails = 95% pass rate (at threshold)
        test_results = {
            'test_borderline.py::test_at_threshold': [True] * 95 + [False] * 5
        }
        
        flaky = analyze_flakiness(test_results, threshold=0.95)
        # At exactly 95%, should not be considered flaky
        assert len(flaky) == 0
    
    def test_multiple_tests_mixed(self):
        """Test analysis with mix of stable and flaky tests."""
        test_results = {
            'test_stable.py::test_passes': [True] * 100,
            'test_stable.py::test_fails': [False] * 100,
            'test_flaky.py::test_flaky1': [True] * 80 + [False] * 20,
            'test_flaky.py::test_flaky2': [True, False] * 50
        }
        
        flaky = analyze_flakiness(test_results, threshold=0.95)
        assert len(flaky) == 2
        
        flaky_names = [f.test_name for f in flaky]
        assert 'test_flaky.py::test_flaky1' in flaky_names
        assert 'test_flaky.py::test_flaky2' in flaky_names
    
    def test_custom_threshold(self):
        """Test flakiness detection with custom threshold."""
        # 85% pass rate
        test_results = {
            'test_custom.py::test_85_percent': [True] * 85 + [False] * 15
        }
        
        # With 90% threshold, this should be flaky
        flaky_90 = analyze_flakiness(test_results, threshold=0.90)
        assert len(flaky_90) == 1
        
        # With 80% threshold, this should be stable
        flaky_80 = analyze_flakiness(test_results, threshold=0.80)
        assert len(flaky_80) == 0
    
    def test_empty_results(self):
        """Test handling of empty test results."""
        test_results = {}
        
        flaky = analyze_flakiness(test_results)
        assert len(flaky) == 0
    
    def test_test_with_no_runs(self):
        """Test handling of test with empty results list."""
        test_results = {
            'test_empty.py::test_no_runs': []
        }
        
        flaky = analyze_flakiness(test_results)
        assert len(flaky) == 0


class TestFlakinessReport:
    """Tests for flakiness report functionality."""
    
    def test_get_flaky_test_names(self):
        """Test extracting flaky test names from report."""
        flaky_results = [
            FlakinessResult(
                test_name='test1.py::test_flaky1',
                total_runs=100,
                passed_runs=80,
                failed_runs=20,
                pass_rate=0.8,
                is_flaky=True
            ),
            FlakinessResult(
                test_name='test2.py::test_flaky2',
                total_runs=100,
                passed_runs=50,
                failed_runs=50,
                pass_rate=0.5,
                is_flaky=True
            )
        ]
        
        report = FlakinessReport(
            total_iterations=100,
            total_tests_checked=10,
            flaky_tests=flaky_results,
            stable_tests=['test3.py::test_stable'],
            flakiness_threshold=0.95
        )
        
        flaky_names = get_flaky_test_names(report)
        assert len(flaky_names) == 2
        assert 'test1.py::test_flaky1' in flaky_names
        assert 'test2.py::test_flaky2' in flaky_names
    
    def test_empty_flakiness_report(self):
        """Test report with no flaky tests."""
        report = FlakinessReport(
            total_iterations=100,
            total_tests_checked=5,
            flaky_tests=[],
            stable_tests=['test1.py::test1', 'test2.py::test2'],
            flakiness_threshold=0.95
        )
        
        flaky_names = get_flaky_test_names(report)
        assert len(flaky_names) == 0
