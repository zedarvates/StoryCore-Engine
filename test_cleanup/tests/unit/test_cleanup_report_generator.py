"""
Unit tests for Cleanup Report Generator

Tests the generation of cleanup summary reports.
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from datetime import datetime, timedelta
from test_cleanup.documentation.cleanup_report_generator import CleanupReportGenerator
from test_cleanup.models import (
    CleanupLog, CleanupAction, AnalysisReport, ValidationReport,
    TestMetrics, TestGroup, CoverageComparison, PerformanceComparison
)


class TestCleanupReportGenerator:
    """Test suite for CleanupReportGenerator"""
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary output directory"""
        temp_dir = Path(tempfile.mkdtemp())
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def sample_cleanup_log(self):
        """Create sample cleanup log"""
        start_time = datetime.now()
        end_time = start_time + timedelta(seconds=120)
        
        actions = [
            CleanupAction(
                action_type="remove",
                test_name="test_obsolete_feature",
                reason="Tests non-existent functionality",
                timestamp=start_time,
                before_metrics=None,
                after_metrics=None
            ),
            CleanupAction(
                action_type="rewrite",
                test_name="test_fragile_timing",
                reason="Removed sleep() and timing dependencies",
                timestamp=start_time + timedelta(seconds=30),
                before_metrics=TestMetrics(
                    name="test_fragile_timing",
                    file_path=Path("tests/test_old.py"),
                    failure_rate=0.15,
                    execution_time=5.0,
                    last_modified=datetime.now(),
                    lines_of_code=20
                ),
                after_metrics=TestMetrics(
                    name="test_fragile_timing",
                    file_path=Path("tests/test_old.py"),
                    failure_rate=0.0,
                    execution_time=0.5,
                    last_modified=datetime.now(),
                    lines_of_code=15
                )
            ),
            CleanupAction(
                action_type="merge",
                test_name="test_consolidated",
                reason="Merged 3 duplicate tests",
                timestamp=start_time + timedelta(seconds=60),
                before_metrics=None,
                after_metrics=None
            )
        ]
        
        return CleanupLog(
            actions=actions,
            total_removed=1,
            total_rewritten=1,
            total_merged=1,
            start_time=start_time,
            end_time=end_time
        )
    
    @pytest.fixture
    def sample_analysis_report(self):
        """Create sample analysis report"""
        return AnalysisReport(
            total_tests=100,
            obsolete_tests=["test_obsolete_feature"],
            fragile_tests=[
                TestMetrics(
                    name="test_fragile_timing",
                    file_path=Path("tests/test_old.py"),
                    failure_rate=0.15,
                    execution_time=5.0,
                    last_modified=datetime.now(),
                    lines_of_code=20
                )
            ],
            duplicate_groups=[
                TestGroup(
                    tests=["test_dup1", "test_dup2", "test_dup3"],
                    similarity_score=0.95,
                    shared_assertions=["assert x == 1"]
                )
            ],
            valuable_tests=["test_critical_feature"],
            total_execution_time=300.0,
            coverage_percentage=85.0
        )
    
    @pytest.fixture
    def sample_validation_report(self):
        """Create sample validation report"""
        return ValidationReport(
            all_tests_passing=True,
            coverage=CoverageComparison(
                before_percentage=85.0,
                after_percentage=86.5,
                delta=1.5,
                uncovered_lines=[]
            ),
            performance=PerformanceComparison(
                before_time=300.0,
                after_time=150.0,
                improvement_percentage=50.0
            ),
            flaky_tests=[],
            total_tests=99
        )
    
    @pytest.fixture
    def generator(self, temp_output_dir, sample_cleanup_log, sample_analysis_report, sample_validation_report):
        """Create cleanup report generator instance"""
        return CleanupReportGenerator(
            temp_output_dir,
            sample_cleanup_log,
            sample_analysis_report,
            sample_validation_report
        )
    
    def test_generator_creates_output_directory(self, temp_output_dir, sample_cleanup_log, sample_analysis_report, sample_validation_report):
        """Test that generator creates output directory if it doesn't exist"""
        output_dir = temp_output_dir / "new_dir"
        assert not output_dir.exists()
        
        generator = CleanupReportGenerator(
            output_dir,
            sample_cleanup_log,
            sample_analysis_report,
            sample_validation_report
        )
        assert output_dir.exists()
    
    def test_generate_cleanup_report_creates_file(self, generator, temp_output_dir):
        """Test that cleanup report is created"""
        output_path = generator.generate_cleanup_report()
        
        assert output_path.exists()
        assert output_path.name == "CLEANUP_SUMMARY_REPORT.md"
        assert output_path.parent == temp_output_dir
    
    def test_report_contains_required_sections(self, generator):
        """Test that generated report contains all required sections (Requirement 10.5)"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Check for main sections
        required_sections = [
            "# Test Suite Cleanup Summary Report",
            "## Executive Summary",
            "## Initial State Analysis",
            "## Cleanup Actions Performed",
            "## Final State",
            "## Measurable Improvements",
            "## Detailed Changes",
            "## Recommendations for Future"
        ]
        
        for section in required_sections:
            assert section in content, f"Missing section: {section}"
    
    def test_executive_summary_includes_key_metrics(self, generator):
        """Test that executive summary includes key achievements"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should include key metrics
        assert "Tests Removed:" in content
        assert "Tests Rewritten:" in content
        assert "Tests Merged:" in content
        assert "Execution Time:" in content
        assert "Code Coverage:" in content
    
    def test_initial_state_documents_starting_point(self, generator):
        """Test that initial state section documents starting conditions"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should document initial state
        assert "**Total Tests:** 100" in content
        assert "Obsolete Tests:" in content
        assert "Fragile Tests:" in content
        assert "Duplicate Groups:" in content
    
    def test_cleanup_actions_documents_all_changes(self, generator):
        """Test that cleanup actions section documents all changes (Requirement 10.5)"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should document all action types
        assert "Removed Tests" in content
        assert "Rewritten Tests" in content
        assert "Merged Tests" in content
        
        # Should include specific test names
        assert "test_obsolete_feature" in content
        assert "test_fragile_timing" in content
        assert "test_consolidated" in content
    
    def test_cleanup_actions_includes_justifications(self, generator):
        """Test that each action includes justification (Requirement 10.5)"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should include reasons for actions
        assert "Tests non-existent functionality" in content
        assert "Removed sleep() and timing dependencies" in content
        assert "Merged 3 duplicate tests" in content
    
    def test_final_state_documents_results(self, generator):
        """Test that final state section documents results"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should document final state
        assert "**Total Tests:** 99" in content
        assert "All Tests Passing:" in content
        assert "Coverage Delta:" in content
    
    def test_improvements_section_provides_metrics(self, generator):
        """Test that improvements section provides measurable metrics (Requirement 10.5)"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should provide improvement metrics
        assert "Performance Improvements" in content
        assert "Quality Improvements" in content
        assert "Reliability Improvements" in content
        assert "Maintainability Improvements" in content
        
        # Should include time savings calculations
        assert "Time Saved Per Run:" in content
        assert "Estimated Daily Savings:" in content
        assert "Estimated Yearly Savings:" in content
    
    def test_detailed_changes_uses_table_format(self, generator):
        """Test that detailed changes section uses table format"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have markdown tables
        assert "| Test Name | Reason | Timestamp |" in content
        assert "|-----------|--------|-----------|" in content
    
    def test_recommendations_section_provides_guidance(self, generator):
        """Test that recommendations section provides future guidance"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should provide recommendations
        assert "Immediate Actions" in content
        assert "Long-Term Improvements" in content
        assert "Testing Best Practices" in content
    
    def test_report_includes_timestamps(self, generator):
        """Test that report includes generation and cleanup timestamps"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        assert "**Generated:**" in content
        assert "**Cleanup Duration:**" in content
        assert "**Cleanup Period:**" in content
    
    def test_generate_summary_returns_metadata(self, generator):
        """Test that generate_summary returns correct metadata"""
        generator.generate_cleanup_report()
        summary = generator.generate_summary()
        
        assert summary["report_generated"] is True
        assert "CLEANUP_SUMMARY_REPORT.md" in summary["output_path"]
        assert len(summary["sections_included"]) == 7
        assert summary["requirements_addressed"] == ["10.5"]
        assert summary["total_actions_documented"] == 3
        assert summary["tests_removed"] == 1
        assert summary["tests_rewritten"] == 1
        assert summary["tests_merged"] == 1
    
    def test_report_handles_no_flaky_tests(self, generator):
        """Test that report correctly handles zero flaky tests"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should indicate no flaky tests
        assert "0 flaky tests remaining" in content or "Flaky Tests: 0" in content
    
    def test_report_warns_about_failing_tests(self, temp_output_dir, sample_cleanup_log, sample_analysis_report):
        """Test that report warns when tests are failing"""
        # Create validation report with failing tests
        validation_report = ValidationReport(
            all_tests_passing=False,
            coverage=CoverageComparison(
                before_percentage=85.0,
                after_percentage=86.5,
                delta=1.5,
                uncovered_lines=[]
            ),
            performance=PerformanceComparison(
                before_time=300.0,
                after_time=150.0,
                improvement_percentage=50.0
            ),
            flaky_tests=[],
            total_tests=99
        )
        
        generator = CleanupReportGenerator(
            temp_output_dir,
            sample_cleanup_log,
            sample_analysis_report,
            validation_report
        )
        
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should warn about failing tests
        assert "Fix failing tests" in content or "❌ No" in content
    
    def test_report_warns_about_coverage_loss(self, temp_output_dir, sample_cleanup_log, sample_analysis_report):
        """Test that report warns when coverage decreases"""
        # Create validation report with coverage loss
        validation_report = ValidationReport(
            all_tests_passing=True,
            coverage=CoverageComparison(
                before_percentage=85.0,
                after_percentage=82.0,
                delta=-3.0,
                uncovered_lines=["file.py:10", "file.py:20"]
            ),
            performance=PerformanceComparison(
                before_time=300.0,
                after_time=150.0,
                improvement_percentage=50.0
            ),
            flaky_tests=[],
            total_tests=99
        )
        
        generator = CleanupReportGenerator(
            temp_output_dir,
            sample_cleanup_log,
            sample_analysis_report,
            validation_report
        )
        
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should warn about coverage loss
        assert "Restore coverage" in content or "-3.0%" in content
    
    def test_report_is_valid_markdown(self, generator):
        """Test that generated report is valid markdown"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should have markdown headers
        assert content.startswith("# Test Suite Cleanup Summary Report")
        
        # Should have proper markdown formatting
        assert "##" in content  # Section headers
        assert "**" in content  # Bold text
        assert "|" in content   # Tables
        assert "-" in content   # Lists
    
    def test_report_calculates_time_savings(self, generator):
        """Test that report calculates and displays time savings"""
        output_path = generator.generate_cleanup_report()
        content = output_path.read_text(encoding='utf-8')
        
        # Should calculate time savings
        # Before: 300s, After: 150s, Savings: 150s
        assert "150.00 seconds" in content or "150 seconds" in content
        
        # Should show improvement percentage
        assert "50.0%" in content or "50%" in content
