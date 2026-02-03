"""
Data models for test cleanup and analysis.

This module defines the core data structures used throughout the test cleanup
process, including analysis reports, cleanup logs, and validation reports.
"""

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import List, Literal, Optional


@dataclass
class TestMetrics:
    """Metrics for a single test."""
    name: str
    file_path: Path
    failure_rate: float
    execution_time: float
    last_modified: datetime
    lines_of_code: int


@dataclass
class TestGroup:
    """Group of similar/duplicate tests."""
    tests: List[str]
    similarity_score: float
    shared_assertions: List[str]


@dataclass
class AnalysisReport:
    """Complete analysis report for a test suite."""
    total_tests: int
    obsolete_tests: List[str]
    fragile_tests: List[TestMetrics]
    duplicate_groups: List[TestGroup]
    valuable_tests: List[str]
    total_execution_time: float
    coverage_percentage: float


@dataclass
class CleanupAction:
    """Record of a single cleanup action."""
    action_type: Literal["remove", "rewrite", "merge", "keep"]
    test_name: str
    reason: str
    timestamp: datetime
    before_metrics: Optional[TestMetrics] = None
    after_metrics: Optional[TestMetrics] = None


@dataclass
class CleanupLog:
    """Log of all cleanup actions performed."""
    actions: List[CleanupAction] = field(default_factory=list)
    total_removed: int = 0
    total_rewritten: int = 0
    total_merged: int = 0
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None


@dataclass
class CoverageComparison:
    """Comparison of coverage before and after cleanup."""
    before_percentage: float
    after_percentage: float
    delta: float
    uncovered_lines: List[str] = field(default_factory=list)


@dataclass
class PerformanceComparison:
    """Comparison of performance before and after cleanup."""
    before_time: float
    after_time: float
    improvement_percentage: float


@dataclass
class ValidationReport:
    """Validation report after cleanup."""
    all_tests_passing: bool
    coverage: CoverageComparison
    performance: PerformanceComparison
    flaky_tests: List[str]
    total_tests: int
