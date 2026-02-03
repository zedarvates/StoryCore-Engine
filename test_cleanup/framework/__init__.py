"""
Framework-specific optimization modules.

This package contains modules for enforcing best practices
for different testing frameworks (pytest, vitest).
"""

from .pytest_best_practices import (
    PytestBestPracticesEnforcer,
    PytestViolation,
    PytestAnalysisReport
)
from .vitest_best_practices import (
    VitestBestPracticesEnforcer,
    VitestViolation,
    VitestAnalysisReport
)

__all__ = [
    'PytestBestPracticesEnforcer',
    'PytestViolation',
    'PytestAnalysisReport',
    'VitestBestPracticesEnforcer',
    'VitestViolation',
    'VitestAnalysisReport',
]
