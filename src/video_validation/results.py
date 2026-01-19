"""
Video Engine System Validation Results
Container for system validation results and metrics.
"""

from datetime import datetime
from typing import Dict, List, Any


class SystemValidationResult:
    """Container for system validation results"""

    def __init__(self):
        self.start_time = datetime.now()
        self.end_time = None
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []
        self.performance_metrics = {}
        self.quality_metrics = {}
        self.error_log = []
        self.warnings = []

    def add_test_result(self, test_name: str, success: bool,
                       duration: float = 0.0, details: Dict = None):
        """Add a test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
        else:
            self.failed_tests += 1

        result = {
            "test_name": test_name,
            "success": success,
            "duration": duration,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)

    def add_performance_metric(self, metric_name: str, value: float, unit: str = ""):
        """Add a performance metric"""
        self.performance_metrics[metric_name] = {
            "value": value,
            "unit": unit,
            "timestamp": datetime.now().isoformat()
        }

    def add_quality_metric(self, metric_name: str, value: float, threshold: float = None):
        """Add a quality metric"""
        self.quality_metrics[metric_name] = {
            "value": value,
            "threshold": threshold,
            "passed": value >= threshold if threshold else True,
            "timestamp": datetime.now().isoformat()
        }

    def add_error(self, error_message: str, test_name: str = None):
        """Add an error"""
        self.error_log.append({
            "message": error_message,
            "test_name": test_name,
            "timestamp": datetime.now().isoformat()
        })

    def add_warning(self, warning_message: str, test_name: str = None):
        """Add a warning"""
        self.warnings.append({
            "message": warning_message,
            "test_name": test_name,
            "timestamp": datetime.now().isoformat()
        })

    def finalize(self):
        """Finalize the validation results"""
        self.end_time = datetime.now()

    def get_success_rate(self) -> float:
        """Get overall success rate"""
        if self.total_tests == 0:
            return 0.0
        return (self.passed_tests / self.total_tests) * 100

    def get_duration(self) -> float:
        """Get total validation duration in seconds"""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return (datetime.now() - self.start_time).total_seconds()