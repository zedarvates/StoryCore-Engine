"""
Cleanup Summary Report Generator

This module generates comprehensive cleanup summary reports that document
all changes made during cleanup with justifications and metrics.

Requirements: 10.5
"""

from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime
from test_cleanup.models import CleanupLog, AnalysisReport, ValidationReport


class CleanupReportGenerator:
    """Generates cleanup summary reports"""
    
    def __init__(
        self,
        output_dir: Path,
        cleanup_log: CleanupLog,
        analysis_report: AnalysisReport,
        validation_report: ValidationReport
    ):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cleanup_log = cleanup_log
        self.analysis_report = analysis_report
        self.validation_report = validation_report
    
    def generate_cleanup_report(self) -> Path:
        """
        Generate comprehensive cleanup summary report
        
        Returns:
            Path to generated cleanup report
        """
        content = self._build_report_content()
        output_path = self.output_dir / "CLEANUP_SUMMARY_REPORT.md"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return output_path
    
    def _build_report_content(self) -> str:
        """Build the complete report content"""
        sections = [
            self._header_section(),
            self._executive_summary_section(),
            self._initial_state_section(),
            self._cleanup_actions_section(),
            self._final_state_section(),
            self._improvements_section(),
            self._detailed_changes_section(),
            self._recommendations_section()
        ]
        
        return "\n\n".join(sections)
    
    def _header_section(self) -> str:
        """Generate report header"""
        duration = (self.cleanup_log.end_time - self.cleanup_log.start_time).total_seconds()
        
        return f"""# Test Suite Cleanup Summary Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Cleanup Duration:** {duration:.2f} seconds
**Cleanup Period:** {self.cleanup_log.start_time.strftime('%Y-%m-%d %H:%M:%S')} to {self.cleanup_log.end_time.strftime('%Y-%m-%d %H:%M:%S')}

---

This report documents all changes made during the test suite cleanup process, including justifications for each change and measurable improvements achieved."""
    
    def _executive_summary_section(self) -> str:
        """Generate executive summary"""
        total_actions = len(self.cleanup_log.actions)
        
        # Calculate improvement percentages
        time_improvement = 0.0
        if self.validation_report.performance.before_time > 0:
            time_improvement = self.validation_report.performance.improvement_percentage
        
        coverage_delta = self.validation_report.coverage.delta
        
        return f"""## Executive Summary

### Overview
The test suite cleanup process analyzed {self.analysis_report.total_tests} tests and performed {total_actions} actions to improve test quality, reliability, and performance.

### Key Achievements
- **Tests Removed:** {self.cleanup_log.total_removed} obsolete tests
- **Tests Rewritten:** {self.cleanup_log.total_rewritten} fragile tests improved
- **Tests Merged:** {self.cleanup_log.total_merged} duplicate tests consolidated
- **Execution Time:** Improved by {time_improvement:.1f}%
- **Code Coverage:** Changed by {coverage_delta:+.2f}%
- **Test Reliability:** {len(self.validation_report.flaky_tests)} flaky tests remaining

### Quality Status
- **All Tests Passing:** {'✅ Yes' if self.validation_report.all_tests_passing else '❌ No'}
- **Coverage Maintained:** {'✅ Yes' if coverage_delta >= 0 else '❌ No'}
- **Performance Improved:** {'✅ Yes' if time_improvement > 0 else '❌ No'}"""
    
    def _initial_state_section(self) -> str:
        """Generate initial state analysis"""
        return f"""## Initial State Analysis

### Test Suite Composition
- **Total Tests:** {self.analysis_report.total_tests}
- **Obsolete Tests:** {len(self.analysis_report.obsolete_tests)}
- **Fragile Tests:** {len(self.analysis_report.fragile_tests)}
- **Duplicate Groups:** {len(self.analysis_report.duplicate_groups)}
- **Valuable Tests:** {len(self.analysis_report.valuable_tests)}

### Performance Metrics (Before)
- **Total Execution Time:** {self.validation_report.performance.before_time:.2f} seconds
- **Code Coverage:** {self.validation_report.coverage.before_percentage:.2f}%

### Identified Issues
1. **Obsolete Tests:** {len(self.analysis_report.obsolete_tests)} tests for non-existent functionality
2. **Fragile Tests:** {len(self.analysis_report.fragile_tests)} tests with reliability issues
3. **Duplicate Tests:** {len(self.analysis_report.duplicate_groups)} groups of redundant tests
4. **Performance:** Slow execution time impacting developer productivity"""
    
    def _cleanup_actions_section(self) -> str:
        """Generate cleanup actions summary"""
        # Group actions by type
        removed = [a for a in self.cleanup_log.actions if a.action_type == "remove"]
        rewritten = [a for a in self.cleanup_log.actions if a.action_type == "rewrite"]
        merged = [a for a in self.cleanup_log.actions if a.action_type == "merge"]
        kept = [a for a in self.cleanup_log.actions if a.action_type == "keep"]
        
        sections = [
            "## Cleanup Actions Performed",
            "",
            f"### Summary",
            f"- **Total Actions:** {len(self.cleanup_log.actions)}",
            f"- **Tests Removed:** {len(removed)}",
            f"- **Tests Rewritten:** {len(rewritten)}",
            f"- **Tests Merged:** {len(merged)}",
            f"- **Tests Kept:** {len(kept)}"
        ]
        
        if removed:
            sections.append("\n### Removed Tests")
            sections.append("Tests removed because they were obsolete or provided no value:")
            for action in removed[:10]:  # Limit to first 10
                sections.append(f"- `{action.test_name}`: {action.reason}")
            if len(removed) > 10:
                sections.append(f"- ... and {len(removed) - 10} more")
        
        if rewritten:
            sections.append("\n### Rewritten Tests")
            sections.append("Tests rewritten to improve reliability:")
            for action in rewritten[:10]:
                sections.append(f"- `{action.test_name}`: {action.reason}")
            if len(rewritten) > 10:
                sections.append(f"- ... and {len(rewritten) - 10} more")
        
        if merged:
            sections.append("\n### Merged Tests")
            sections.append("Duplicate tests consolidated:")
            for action in merged[:10]:
                sections.append(f"- `{action.test_name}`: {action.reason}")
            if len(merged) > 10:
                sections.append(f"- ... and {len(merged) - 10} more")
        
        return "\n".join(sections)
    
    def _final_state_section(self) -> str:
        """Generate final state summary"""
        final_test_count = self.validation_report.total_tests
        
        return f"""## Final State

### Test Suite Composition
- **Total Tests:** {final_test_count}
- **Tests Removed:** {self.cleanup_log.total_removed}
- **Net Change:** {final_test_count - self.analysis_report.total_tests:+d} tests

### Performance Metrics (After)
- **Total Execution Time:** {self.validation_report.performance.after_time:.2f} seconds
- **Code Coverage:** {self.validation_report.coverage.after_percentage:.2f}%
- **Flaky Tests:** {len(self.validation_report.flaky_tests)}

### Quality Validation
- **All Tests Passing:** {'✅ Yes' if self.validation_report.all_tests_passing else '❌ No'}
- **Coverage Delta:** {self.validation_report.coverage.delta:+.2f}%
- **Execution Time Delta:** {self.validation_report.performance.after_time - self.validation_report.performance.before_time:+.2f} seconds"""
    
    def _improvements_section(self) -> str:
        """Generate improvements summary"""
        time_saved = self.validation_report.performance.before_time - self.validation_report.performance.after_time
        improvement_pct = self.validation_report.performance.improvement_percentage
        
        # Calculate daily/weekly/yearly savings
        daily_runs = 10  # Assume 10 test runs per developer per day
        daily_savings = time_saved * daily_runs
        weekly_savings = daily_savings * 5
        yearly_savings = weekly_savings * 50
        
        return f"""## Measurable Improvements

### Performance Improvements
- **Execution Time Reduction:** {time_saved:.2f} seconds ({improvement_pct:.1f}% faster)
- **Time Saved Per Run:** {time_saved:.2f} seconds
- **Estimated Daily Savings:** {daily_savings:.1f} seconds ({daily_savings/60:.1f} minutes)
- **Estimated Weekly Savings:** {weekly_savings:.1f} seconds ({weekly_savings/60:.1f} minutes)
- **Estimated Yearly Savings:** {yearly_savings:.1f} seconds ({yearly_savings/3600:.1f} hours)

### Quality Improvements
- **Obsolete Tests Removed:** {self.cleanup_log.total_removed}
- **Fragile Tests Fixed:** {self.cleanup_log.total_rewritten}
- **Duplicate Tests Eliminated:** {self.cleanup_log.total_merged}
- **Coverage Change:** {self.validation_report.coverage.delta:+.2f}%

### Reliability Improvements
- **Flaky Tests:** {len(self.validation_report.flaky_tests)} remaining
- **Test Stability:** {'Improved' if len(self.validation_report.flaky_tests) == 0 else 'Needs attention'}

### Maintainability Improvements
- **Reduced Test Count:** {self.cleanup_log.total_removed + self.cleanup_log.total_merged} fewer tests to maintain
- **Improved Test Quality:** {self.cleanup_log.total_rewritten} tests now more reliable
- **Better Organization:** Duplicate tests consolidated"""
    
    def _detailed_changes_section(self) -> str:
        """Generate detailed changes breakdown"""
        sections = ["## Detailed Changes"]
        
        # Group actions by type and provide details
        for action_type in ["remove", "rewrite", "merge"]:
            actions = [a for a in self.cleanup_log.actions if a.action_type == action_type]
            
            if not actions:
                continue
            
            type_name = action_type.capitalize() + "d"
            sections.append(f"\n### {type_name} Tests ({len(actions)})")
            sections.append("")
            sections.append("| Test Name | Reason | Timestamp |")
            sections.append("|-----------|--------|-----------|")
            
            for action in actions[:20]:  # Limit to 20 per type
                timestamp = action.timestamp.strftime('%Y-%m-%d %H:%M')
                test_name = action.test_name[:50] + "..." if len(action.test_name) > 50 else action.test_name
                reason = action.reason[:80] + "..." if len(action.reason) > 80 else action.reason
                sections.append(f"| `{test_name}` | {reason} | {timestamp} |")
            
            if len(actions) > 20:
                sections.append(f"| ... | *{len(actions) - 20} more actions* | ... |")
        
        return "\n".join(sections)
    
    def _recommendations_section(self) -> str:
        """Generate recommendations for future"""
        recommendations = [
            "## Recommendations for Future",
            "",
            "### Immediate Actions"
        ]
        
        # Add recommendations based on validation results
        if not self.validation_report.all_tests_passing:
            recommendations.append("- ⚠️ **Fix failing tests** before merging changes")
        
        if self.validation_report.coverage.delta < 0:
            recommendations.append(f"- ⚠️ **Restore coverage** - {abs(self.validation_report.coverage.delta):.2f}% coverage was lost")
        
        if len(self.validation_report.flaky_tests) > 0:
            recommendations.append(f"- ⚠️ **Fix {len(self.validation_report.flaky_tests)} flaky tests** to improve reliability")
        
        if not recommendations[-1].startswith("-"):
            recommendations.append("- ✅ All validation checks passed - ready to merge")
        
        recommendations.extend([
            "",
            "### Long-Term Improvements",
            "1. **Establish Testing Standards:** Use the generated TESTING_STANDARDS.md document",
            "2. **Review Test Examples:** Study TEST_EXAMPLES_AND_ANTIPATTERNS.md for best practices",
            "3. **Prevent Technical Debt:** Follow standards for all new tests",
            "4. **Regular Cleanup:** Schedule quarterly test suite reviews",
            "5. **Monitor Metrics:** Track test execution time and coverage trends",
            "6. **Property-Based Testing:** Add property tests for critical functionality",
            "",
            "### Testing Best Practices",
            "- Write tests that test behavior, not implementation",
            "- Keep tests independent and deterministic",
            "- Use fixtures for common setup",
            "- Test edge cases and error conditions",
            "- Maintain test-to-code ratio of 1:1 to 2:1",
            "- Run tests frequently during development",
            "",
            "---",
            "",
            "*This cleanup report was generated automatically. For questions or issues, refer to the documentation or contact the development team.*"
        ])
        
        return "\n".join(recommendations)
    
    def generate_summary(self) -> Dict[str, Any]:
        """Generate summary of report generation"""
        return {
            "report_generated": True,
            "output_path": str(self.output_dir / "CLEANUP_SUMMARY_REPORT.md"),
            "sections_included": [
                "Executive Summary",
                "Initial State Analysis",
                "Cleanup Actions Performed",
                "Final State",
                "Measurable Improvements",
                "Detailed Changes",
                "Recommendations"
            ],
            "requirements_addressed": ["10.5"],
            "total_actions_documented": len(self.cleanup_log.actions),
            "tests_removed": self.cleanup_log.total_removed,
            "tests_rewritten": self.cleanup_log.total_rewritten,
            "tests_merged": self.cleanup_log.total_merged,
            "performance_improvement": self.validation_report.performance.improvement_percentage,
            "coverage_delta": self.validation_report.coverage.delta
        }
