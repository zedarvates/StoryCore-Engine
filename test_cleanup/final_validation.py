#!/usr/bin/env python3
"""
Final Validation Script for Test Suite Cleanup

This script runs the complete cleanup pipeline on the actual StoryCore-Engine
test suite and validates all success criteria:
- All tests pass after cleanup
- Coverage is maintained or improved
- Execution time improvement meets 50% target
- Generates comprehensive final report
"""

import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass, asdict
import shutil


@dataclass
class ValidationMetrics:
    """Metrics collected during validation"""
    # Before cleanup
    initial_test_count: int
    initial_passing_tests: int
    initial_failing_tests: int
    initial_execution_time: float
    initial_coverage_percentage: float
    
    # After cleanup
    final_test_count: int
    final_passing_tests: int
    final_failing_tests: int
    final_execution_time: float
    final_coverage_percentage: float
    
    # Improvements
    tests_removed: int
    tests_rewritten: int
    tests_consolidated: int
    execution_time_improvement_percentage: float
    coverage_delta: float
    
    # Validation results
    all_tests_passing: bool
    coverage_maintained: bool
    performance_target_met: bool
    overall_success: bool


@dataclass
class FinalReport:
    """Final cleanup report"""
    validation_metrics: ValidationMetrics
    cleanup_summary: Dict[str, Any]
    issues_found: List[str]
    recommendations: List[str]
    timestamp: str


class FinalValidator:
    """Orchestrates final validation of test suite cleanup"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.test_cleanup_dir = project_root / "test_cleanup"
        self.backup_dir = self.test_cleanup_dir / "backups" / "final_validation"
        self.report_dir = self.test_cleanup_dir / "reports"
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
    def run_validation(self) -> FinalReport:
        """Run complete validation pipeline"""
        print("=" * 80)
        print("FINAL VALIDATION: Test Suite Cleanup")
        print("=" * 80)
        print()
        
        # Step 1: Create backup
        print("Step 1: Creating backup...")
        self._create_backup()
        print("✓ Backup created\n")
        
        # Step 2: Measure baseline metrics
        print("Step 2: Measuring baseline metrics...")
        baseline_metrics = self._measure_baseline()
        print(f"✓ Baseline: {baseline_metrics['test_count']} tests, "
              f"{baseline_metrics['execution_time']:.2f}s, "
              f"{baseline_metrics['coverage']:.1f}% coverage\n")
        
        # Step 3: Run cleanup pipeline
        print("Step 3: Running cleanup pipeline...")
        cleanup_summary = self._run_cleanup_pipeline()
        print(f"✓ Cleanup complete: {cleanup_summary['actions_taken']} actions\n")
        
        # Step 4: Measure final metrics
        print("Step 4: Measuring final metrics...")
        final_metrics = self._measure_final()
        print(f"✓ Final: {final_metrics['test_count']} tests, "
              f"{final_metrics['execution_time']:.2f}s, "
              f"{final_metrics['coverage']:.1f}% coverage\n")
        
        # Step 5: Validate success criteria
        print("Step 5: Validating success criteria...")
        validation_results = self._validate_criteria(baseline_metrics, final_metrics)
        print(f"✓ Validation complete\n")
        
        # Step 6: Generate final report
        print("Step 6: Generating final report...")
        report = self._generate_report(
            baseline_metrics, 
            final_metrics, 
            cleanup_summary, 
            validation_results
        )
        print(f"✓ Report generated\n")
        
        # Step 7: Display summary
        self._display_summary(report)
        
        return report
    
    def _create_backup(self) -> None:
        """Create backup of test directories"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup Python tests
        python_tests = self.project_root / "tests"
        if python_tests.exists():
            shutil.copytree(
                python_tests, 
                self.backup_dir / "tests_python",
                dirs_exist_ok=True
            )
        
        # Backup TypeScript tests
        ts_tests = self.project_root / "creative-studio-ui" / "src"
        if ts_tests.exists():
            # Only backup test files to save space
            for test_file in ts_tests.rglob("*.test.ts*"):
                rel_path = test_file.relative_to(ts_tests)
                backup_path = self.backup_dir / "tests_typescript" / rel_path
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(test_file, backup_path)
    
    def _measure_baseline(self) -> Dict[str, Any]:
        """Measure baseline metrics before cleanup"""
        metrics = {
            "test_count": 0,
            "passing_tests": 0,
            "failing_tests": 0,
            "execution_time": 0.0,
            "coverage": 0.0
        }
        
        # Measure Python tests
        python_metrics = self._run_python_tests()
        
        # Measure TypeScript tests
        ts_metrics = self._run_typescript_tests()
        
        # Combine metrics
        metrics["test_count"] = python_metrics["count"] + ts_metrics["count"]
        metrics["passing_tests"] = python_metrics["passing"] + ts_metrics["passing"]
        metrics["failing_tests"] = python_metrics["failing"] + ts_metrics["failing"]
        metrics["execution_time"] = python_metrics["time"] + ts_metrics["time"]
        
        # Average coverage (weighted by test count)
        total_tests = metrics["test_count"]
        if total_tests > 0:
            metrics["coverage"] = (
                (python_metrics["coverage"] * python_metrics["count"] +
                 ts_metrics["coverage"] * ts_metrics["count"]) / total_tests
            )
        
        return metrics
    
    def _run_python_tests(self) -> Dict[str, Any]:
        """Run Python test suite and collect metrics"""
        metrics = {
            "count": 0,
            "passing": 0,
            "failing": 0,
            "time": 0.0,
            "coverage": 0.0
        }
        
        tests_dir = self.project_root / "tests"
        if not tests_dir.exists():
            return metrics
        
        try:
            start_time = time.time()
            
            # Run pytest with coverage
            result = subprocess.run(
                ["pytest", "tests/", "-v", "--cov=src", "--cov-report=json", 
                 "--json-report", "--json-report-file=test_results.json"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            metrics["time"] = time.time() - start_time
            
            # Parse results
            results_file = self.project_root / "test_results.json"
            if results_file.exists():
                with open(results_file) as f:
                    data = json.load(f)
                    metrics["count"] = data.get("summary", {}).get("total", 0)
                    metrics["passing"] = data.get("summary", {}).get("passed", 0)
                    metrics["failing"] = data.get("summary", {}).get("failed", 0)
            
            # Parse coverage
            coverage_file = self.project_root / "coverage.json"
            if coverage_file.exists():
                with open(coverage_file) as f:
                    data = json.load(f)
                    metrics["coverage"] = data.get("totals", {}).get("percent_covered", 0.0)
        
        except Exception as e:
            print(f"Warning: Error running Python tests: {e}")
        
        return metrics
    
    def _run_typescript_tests(self) -> Dict[str, Any]:
        """Run TypeScript test suite and collect metrics"""
        metrics = {
            "count": 0,
            "passing": 0,
            "failing": 0,
            "time": 0.0,
            "coverage": 0.0
        }
        
        ui_dir = self.project_root / "creative-studio-ui"
        if not ui_dir.exists():
            return metrics
        
        try:
            start_time = time.time()
            
            # Run vitest with coverage
            result = subprocess.run(
                ["npm", "run", "test", "--", "--run", "--reporter=json", 
                 "--coverage", "--coverage.reporter=json"],
                cwd=ui_dir,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            metrics["time"] = time.time() - start_time
            
            # Parse results from output
            if result.stdout:
                try:
                    data = json.loads(result.stdout)
                    metrics["count"] = data.get("numTotalTests", 0)
                    metrics["passing"] = data.get("numPassedTests", 0)
                    metrics["failing"] = data.get("numFailedTests", 0)
                except json.JSONDecodeError:
                    pass
            
            # Parse coverage
            coverage_file = ui_dir / "coverage" / "coverage-summary.json"
            if coverage_file.exists():
                with open(coverage_file) as f:
                    data = json.load(f)
                    total = data.get("total", {})
                    metrics["coverage"] = total.get("lines", {}).get("pct", 0.0)
        
        except Exception as e:
            print(f"Warning: Error running TypeScript tests: {e}")
        
        return metrics
    
    def _run_cleanup_pipeline(self) -> Dict[str, Any]:
        """Run the complete cleanup pipeline"""
        summary = {
            "actions_taken": 0,
            "tests_removed": 0,
            "tests_rewritten": 0,
            "tests_consolidated": 0,
            "errors": []
        }
        
        try:
            # Run orchestrator
            result = subprocess.run(
                ["python", "test_cleanup/orchestrator.py", 
                 "--project-root", str(self.project_root),
                 "--auto-approve"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=600
            )
            
            # Parse cleanup log
            cleanup_log = self.test_cleanup_dir / "cleanup_log.json"
            if cleanup_log.exists():
                with open(cleanup_log) as f:
                    data = json.load(f)
                    summary["tests_removed"] = data.get("total_removed", 0)
                    summary["tests_rewritten"] = data.get("total_rewritten", 0)
                    summary["tests_consolidated"] = data.get("total_merged", 0)
                    summary["actions_taken"] = (
                        summary["tests_removed"] + 
                        summary["tests_rewritten"] + 
                        summary["tests_consolidated"]
                    )
        
        except Exception as e:
            summary["errors"].append(f"Cleanup pipeline error: {e}")
        
        return summary
    
    def _measure_final(self) -> Dict[str, Any]:
        """Measure final metrics after cleanup"""
        return self._measure_baseline()  # Same measurement process
    
    def _validate_criteria(
        self, 
        baseline: Dict[str, Any], 
        final: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate success criteria"""
        results = {
            "all_tests_passing": final["failing_tests"] == 0,
            "coverage_maintained": final["coverage"] >= baseline["coverage"],
            "performance_target_met": False,
            "issues": []
        }
        
        # Calculate performance improvement
        if baseline["execution_time"] > 0:
            improvement = (
                (baseline["execution_time"] - final["execution_time"]) / 
                baseline["execution_time"] * 100
            )
            results["performance_improvement"] = improvement
            results["performance_target_met"] = improvement >= 50.0
        
        # Check for issues
        if not results["all_tests_passing"]:
            results["issues"].append(
                f"{final['failing_tests']} tests still failing after cleanup"
            )
        
        if not results["coverage_maintained"]:
            delta = final["coverage"] - baseline["coverage"]
            results["issues"].append(
                f"Coverage decreased by {abs(delta):.1f}%"
            )
        
        if not results["performance_target_met"]:
            results["issues"].append(
                f"Performance improvement ({results.get('performance_improvement', 0):.1f}%) "
                f"did not meet 50% target"
            )
        
        results["overall_success"] = (
            results["all_tests_passing"] and
            results["coverage_maintained"] and
            results["performance_target_met"]
        )
        
        return results
    
    def _generate_report(
        self,
        baseline: Dict[str, Any],
        final: Dict[str, Any],
        cleanup_summary: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> FinalReport:
        """Generate comprehensive final report"""
        
        # Calculate metrics
        metrics = ValidationMetrics(
            initial_test_count=baseline["test_count"],
            initial_passing_tests=baseline["passing_tests"],
            initial_failing_tests=baseline["failing_tests"],
            initial_execution_time=baseline["execution_time"],
            initial_coverage_percentage=baseline["coverage"],
            final_test_count=final["test_count"],
            final_passing_tests=final["passing_tests"],
            final_failing_tests=final["failing_tests"],
            final_execution_time=final["execution_time"],
            final_coverage_percentage=final["coverage"],
            tests_removed=cleanup_summary["tests_removed"],
            tests_rewritten=cleanup_summary["tests_rewritten"],
            tests_consolidated=cleanup_summary["tests_consolidated"],
            execution_time_improvement_percentage=validation.get("performance_improvement", 0.0),
            coverage_delta=final["coverage"] - baseline["coverage"],
            all_tests_passing=validation["all_tests_passing"],
            coverage_maintained=validation["coverage_maintained"],
            performance_target_met=validation["performance_target_met"],
            overall_success=validation["overall_success"]
        )
        
        # Generate recommendations
        recommendations = []
        if not validation["all_tests_passing"]:
            recommendations.append(
                "Review and fix failing tests before deploying cleanup changes"
            )
        if not validation["coverage_maintained"]:
            recommendations.append(
                "Investigate coverage loss and add tests for uncovered code paths"
            )
        if not validation["performance_target_met"]:
            recommendations.append(
                "Consider additional optimizations: parallel execution, fixture caching"
            )
        
        if validation["overall_success"]:
            recommendations.append(
                "Cleanup successful! Consider deploying changes to main branch"
            )
            recommendations.append(
                "Document cleanup process and results for team reference"
            )
            recommendations.append(
                "Set up CI/CD checks to prevent test suite degradation"
            )
        
        report = FinalReport(
            validation_metrics=metrics,
            cleanup_summary=cleanup_summary,
            issues_found=validation["issues"],
            recommendations=recommendations,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
        )
        
        # Save report
        report_file = self.report_dir / "final_validation_report.json"
        with open(report_file, "w") as f:
            json.dump(asdict(report), f, indent=2)
        
        # Generate markdown report
        self._generate_markdown_report(report)
        
        return report
    
    def _generate_markdown_report(self, report: FinalReport) -> None:
        """Generate human-readable markdown report"""
        m = report.validation_metrics
        
        markdown = f"""# Final Validation Report: Test Suite Cleanup

**Generated:** {report.timestamp}

## Executive Summary

{'✅ **VALIDATION SUCCESSFUL**' if m.overall_success else '❌ **VALIDATION FAILED**'}

The test suite cleanup has been completed and validated. This report summarizes
the changes made and validates that all success criteria have been met.

## Metrics Comparison

### Test Count
- **Before:** {m.initial_test_count} tests
- **After:** {m.final_test_count} tests
- **Change:** {m.initial_test_count - m.final_test_count} tests removed

### Test Results
- **Before:** {m.initial_passing_tests} passing, {m.initial_failing_tests} failing
- **After:** {m.final_passing_tests} passing, {m.final_failing_tests} failing
- **Status:** {'✅ All tests passing' if m.all_tests_passing else f'❌ {m.final_failing_tests} tests failing'}

### Execution Time
- **Before:** {m.initial_execution_time:.2f}s
- **After:** {m.final_execution_time:.2f}s
- **Improvement:** {m.execution_time_improvement_percentage:.1f}%
- **Target:** {'✅ Met (≥50%)' if m.performance_target_met else f'❌ Not met (<50%)'}

### Code Coverage
- **Before:** {m.initial_coverage_percentage:.1f}%
- **After:** {m.final_coverage_percentage:.1f}%
- **Change:** {m.coverage_delta:+.1f}%
- **Status:** {'✅ Maintained or improved' if m.coverage_maintained else '❌ Decreased'}

## Cleanup Actions

- **Tests Removed:** {m.tests_removed} (obsolete tests)
- **Tests Rewritten:** {m.tests_rewritten} (fragile tests made deterministic)
- **Tests Consolidated:** {m.tests_consolidated} (duplicate tests merged)
- **Total Actions:** {m.tests_removed + m.tests_rewritten + m.tests_consolidated}

## Validation Results

### Success Criteria

| Criterion | Status | Details |
|-----------|--------|---------|
| All tests passing | {'✅ Pass' if m.all_tests_passing else '❌ Fail'} | {m.final_failing_tests} failing tests |
| Coverage maintained | {'✅ Pass' if m.coverage_maintained else '❌ Fail'} | {m.coverage_delta:+.1f}% change |
| 50% performance improvement | {'✅ Pass' if m.performance_target_met else '❌ Fail'} | {m.execution_time_improvement_percentage:.1f}% improvement |

### Overall Result

{'✅ **ALL CRITERIA MET** - Cleanup is ready for deployment' if m.overall_success else '❌ **SOME CRITERIA NOT MET** - Review issues before deployment'}

## Issues Found

"""
        
        if report.issues_found:
            for issue in report.issues_found:
                markdown += f"- ⚠️ {issue}\n"
        else:
            markdown += "No issues found. All validation criteria passed.\n"
        
        markdown += f"""
## Recommendations

"""
        
        for rec in report.recommendations:
            markdown += f"- {rec}\n"
        
        markdown += f"""
## Next Steps

"""
        
        if m.overall_success:
            markdown += """1. Review the cleanup changes in detail
2. Run additional manual testing if needed
3. Merge cleanup changes to main branch
4. Update team documentation with new testing standards
5. Set up CI/CD monitoring to maintain test quality
"""
        else:
            markdown += """1. Review and address the issues listed above
2. Re-run validation after fixes
3. Consider adjusting cleanup strategy if needed
4. Consult with team on acceptable trade-offs
"""
        
        markdown += f"""
## Backup Information

A complete backup of the test suite before cleanup has been saved to:
`{self.backup_dir}`

To restore the original test suite if needed:
```bash
python test_cleanup/rollback.py --backup-id final_validation
```

## Detailed Logs

- Cleanup log: `test_cleanup/cleanup_log.json`
- Analysis report: `test_cleanup/reports/analysis_report.json`
- Validation report: `test_cleanup/reports/validation_report.json`

---

*Generated by StoryCore-Engine Test Suite Cleanup Tool*
"""
        
        report_file = self.report_dir / "FINAL_VALIDATION_REPORT.md"
        with open(report_file, "w", encoding="utf-8") as f:
            f.write(markdown)
    
    def _display_summary(self, report: FinalReport) -> None:
        """Display validation summary to console"""
        m = report.validation_metrics
        
        print("=" * 80)
        print("VALIDATION SUMMARY")
        print("=" * 80)
        print()
        
        if m.overall_success:
            print("✅ VALIDATION SUCCESSFUL - All criteria met!")
        else:
            print("❌ VALIDATION FAILED - Some criteria not met")
        
        print()
        print("Metrics:")
        print(f"  Tests: {m.initial_test_count} → {m.final_test_count} "
              f"({m.initial_test_count - m.final_test_count} removed)")
        print(f"  Time: {m.initial_execution_time:.2f}s → {m.final_execution_time:.2f}s "
              f"({m.execution_time_improvement_percentage:.1f}% improvement)")
        print(f"  Coverage: {m.initial_coverage_percentage:.1f}% → {m.final_coverage_percentage:.1f}% "
              f"({m.coverage_delta:+.1f}%)")
        print()
        
        print("Success Criteria:")
        print(f"  {'✅' if m.all_tests_passing else '❌'} All tests passing")
        print(f"  {'✅' if m.coverage_maintained else '❌'} Coverage maintained")
        print(f"  {'✅' if m.performance_target_met else '❌'} 50% performance improvement")
        print()
        
        if report.issues_found:
            print("Issues:")
            for issue in report.issues_found:
                print(f"  ⚠️  {issue}")
            print()
        
        print(f"Full report: {self.report_dir / 'FINAL_VALIDATION_REPORT.md'}")
        print("=" * 80)


def main():
    """Main entry point"""
    project_root = Path.cwd()
    
    validator = FinalValidator(project_root)
    report = validator.run_validation()
    
    # Exit with appropriate code
    sys.exit(0 if report.validation_metrics.overall_success else 1)


if __name__ == "__main__":
    main()
