"""
Unit tests for performance comparison functionality.
"""

import pytest
from test_cleanup.validation.performance_comparison import (
    calculate_improvement_percentage,
    compare_performance,
    generate_performance_report,
    meets_performance_target,
    format_execution_time,
    generate_performance_summary
)
from test_cleanup.models import PerformanceComparison


class TestImprovementCalculation:
    """Tests for improvement percentage calculation."""
    
    def test_50_percent_improvement(self):
        """Test 50% improvement calculation."""
        before = 100.0
        after = 50.0
        
        improvement = calculate_improvement_percentage(before, after)
        assert improvement == 50.0
    
    def test_75_percent_improvement(self):
        """Test 75% improvement calculation."""
        before = 100.0
        after = 25.0
        
        improvement = calculate_improvement_percentage(before, after)
        assert improvement == 75.0
    
    def test_no_improvement(self):
        """Test when execution time is unchanged."""
        before = 100.0
        after = 100.0
        
        improvement = calculate_improvement_percentage(before, after)
        assert improvement == 0.0
    
    def test_regression(self):
        """Test when execution time increases (regression)."""
        before = 100.0
        after = 150.0
        
        improvement = calculate_improvement_percentage(before, after)
        assert improvement == -50.0  # Negative means slower
    
    def test_zero_before_time(self):
        """Test handling of zero before time."""
        before = 0.0
        after = 50.0
        
        improvement = calculate_improvement_percentage(before, after)
        assert improvement == 0.0
    
    def test_small_improvement(self):
        """Test small improvement calculation."""
        before = 100.0
        after = 95.0
        
        improvement = calculate_improvement_percentage(before, after)
        assert improvement == 5.0


class TestPerformanceComparison:
    """Tests for performance comparison."""
    
    def test_compare_with_improvement(self):
        """Test comparison with performance improvement."""
        comparison = compare_performance(100.0, 50.0)
        
        assert comparison.before_time == 100.0
        assert comparison.after_time == 50.0
        assert comparison.improvement_percentage == 50.0
    
    def test_compare_with_regression(self):
        """Test comparison with performance regression."""
        comparison = compare_performance(50.0, 100.0)
        
        assert comparison.before_time == 50.0
        assert comparison.after_time == 100.0
        assert comparison.improvement_percentage == -100.0


class TestPerformanceReportGeneration:
    """Tests for performance report generation."""
    
    def test_generate_full_report(self):
        """Test generating complete performance report."""
        report = generate_performance_report(
            python_before=60.0,
            python_after=30.0,
            typescript_before=80.0,
            typescript_after=40.0
        )
        
        assert 'python' in report
        assert 'typescript' in report
        assert 'total' in report
        
        # Python: 60 -> 30 = 50% improvement
        assert report['python'].improvement_percentage == 50.0
        
        # TypeScript: 80 -> 40 = 50% improvement
        assert report['typescript'].improvement_percentage == 50.0
        
        # Total: 140 -> 70 = 50% improvement
        assert report['total'].improvement_percentage == 50.0
    
    def test_report_with_mixed_results(self):
        """Test report with improvement and regression."""
        report = generate_performance_report(
            python_before=100.0,
            python_after=50.0,   # 50% improvement
            typescript_before=50.0,
            typescript_after=75.0  # 50% regression
        )
        
        assert report['python'].improvement_percentage == 50.0
        assert report['typescript'].improvement_percentage == -50.0
        
        # Total: 150 -> 125 = 16.67% improvement
        assert abs(report['total'].improvement_percentage - 16.67) < 0.1


class TestPerformanceTarget:
    """Tests for performance target checking."""
    
    def test_meets_target_exactly(self):
        """Test when improvement exactly meets target."""
        assert meets_performance_target(50.0, 50.0) is True
    
    def test_exceeds_target(self):
        """Test when improvement exceeds target."""
        assert meets_performance_target(75.0, 50.0) is True
    
    def test_below_target(self):
        """Test when improvement is below target."""
        assert meets_performance_target(25.0, 50.0) is False
    
    def test_regression_vs_target(self):
        """Test when there's regression instead of improvement."""
        assert meets_performance_target(-10.0, 50.0) is False
    
    def test_custom_target(self):
        """Test with custom target percentage."""
        assert meets_performance_target(30.0, 25.0) is True
        assert meets_performance_target(20.0, 25.0) is False


class TestTimeFormatting:
    """Tests for execution time formatting."""
    
    def test_format_seconds(self):
        """Test formatting times under 60 seconds."""
        assert format_execution_time(45.2) == "45.2s"
        assert format_execution_time(10.0) == "10.0s"
    
    def test_format_minutes(self):
        """Test formatting times over 60 seconds."""
        assert format_execution_time(90.0) == "1m 30.0s"
        assert format_execution_time(125.5) == "2m 5.5s"
    
    def test_format_exact_minutes(self):
        """Test formatting exact minute values."""
        assert format_execution_time(120.0) == "2m 0.0s"
        assert format_execution_time(60.0) == "1m 0.0s"


class TestPerformanceSummary:
    """Tests for performance summary generation."""
    
    def test_summary_with_improvements(self):
        """Test summary generation with improvements."""
        report = {
            'python': PerformanceComparison(
                before_time=100.0,
                after_time=50.0,
                improvement_percentage=50.0
            ),
            'typescript': PerformanceComparison(
                before_time=80.0,
                after_time=40.0,
                improvement_percentage=50.0
            ),
            'total': PerformanceComparison(
                before_time=180.0,
                after_time=90.0,
                improvement_percentage=50.0
            )
        }
        
        summary = generate_performance_summary(report)
        
        assert 'Performance Comparison Summary' in summary
        assert 'PYTHON Test Suite' in summary
        assert 'TYPESCRIPT Test Suite' in summary
        assert '50.0% faster' in summary
        assert 'Target met' in summary
    
    def test_summary_with_regression(self):
        """Test summary generation with regression."""
        report = {
            'python': PerformanceComparison(
                before_time=50.0,
                after_time=100.0,
                improvement_percentage=-100.0
            ),
            'total': PerformanceComparison(
                before_time=50.0,
                after_time=100.0,
                improvement_percentage=-100.0
            )
        }
        
        summary = generate_performance_summary(report)
        
        assert 'Regression' in summary
        assert '100.0% slower' in summary
        assert 'Target not met' in summary
