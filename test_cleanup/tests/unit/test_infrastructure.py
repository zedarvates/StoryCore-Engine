"""
Unit tests for infrastructure setup.

Verifies that the test cleanup infrastructure is properly configured.
"""

import sys
from pathlib import Path

import pytest


class TestInfrastructure:
    """Tests for infrastructure setup."""

    def test_package_importable(self):
        """Test that the test_cleanup package can be imported."""
        import test_cleanup
        assert test_cleanup.__version__ == "1.0.0"

    def test_models_importable(self):
        """Test that data models can be imported."""
        from test_cleanup.models import (
            AnalysisReport,
            CleanupAction,
            CleanupLog,
            CoverageComparison,
            PerformanceComparison,
            TestGroup,
            TestMetrics,
            ValidationReport,
        )
        
        # Verify all models are classes
        assert isinstance(AnalysisReport, type)
        assert isinstance(CleanupAction, type)
        assert isinstance(CleanupLog, type)
        assert isinstance(CoverageComparison, type)
        assert isinstance(PerformanceComparison, type)
        assert isinstance(TestGroup, type)
        assert isinstance(TestMetrics, type)
        assert isinstance(ValidationReport, type)

    def test_submodules_importable(self):
        """Test that all submodules can be imported."""
        import test_cleanup.analysis
        import test_cleanup.cleanup
        import test_cleanup.documentation
        import test_cleanup.validation
        
        # Verify modules exist
        assert test_cleanup.analysis is not None
        assert test_cleanup.cleanup is not None
        assert test_cleanup.documentation is not None
        assert test_cleanup.validation is not None

    def test_directory_structure(self):
        """Test that the directory structure is correct."""
        base_path = Path(__file__).parent.parent.parent
        
        # Check main directories exist
        assert (base_path / "analysis").exists()
        assert (base_path / "cleanup").exists()
        assert (base_path / "validation").exists()
        assert (base_path / "documentation").exists()
        assert (base_path / "tests").exists()
        
        # Check test subdirectories exist
        assert (base_path / "tests" / "unit").exists()
        assert (base_path / "tests" / "property").exists()
        assert (base_path / "tests" / "integration").exists()
        assert (base_path / "tests" / "fixtures").exists()

    def test_configuration_files_exist(self):
        """Test that configuration files exist."""
        base_path = Path(__file__).parent.parent.parent
        
        assert (base_path / "pytest.ini").exists()
        assert (base_path / "requirements.txt").exists()
        assert (base_path / "README.md").exists()
        assert (base_path / ".coveragerc").exists()

    def test_pytest_available(self):
        """Test that pytest is available."""
        import pytest
        assert pytest is not None

    def test_hypothesis_available(self):
        """Test that hypothesis is available for property-based testing."""
        import hypothesis
        assert hypothesis is not None

    def test_coverage_available(self):
        """Test that coverage is available."""
        import coverage
        assert coverage is not None
