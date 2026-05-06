#!/usr/bin/env python3
"""
Video Engine System Validation
Comprehensive validation of all Video Engine components working together seamlessly.
"""

import logging
import traceback

# Import validation modules
from .video_validation.results import SystemValidationResult
from .video_validation.environment_setup import EnvironmentSetup
from .video_validation.component_tests import ComponentTests
from .video_validation.performance_tests import PerformanceTests
from .video_validation.quality_tests import QualityTests
from .video_validation.error_handling_tests import ErrorHandlingTests
from .video_validation.scalability_tests import ScalabilityTests
from .video_validation.professional_standards_tests import ProfessionalStandardsTests
from .video_validation.report_generation import ReportGeneration

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class VideoEngineSystemValidator:
    """Comprehensive system validator for Video Engine"""

    def __init__(self):
        self.result = SystemValidationResult()
        self.temp_project_dir = None

    def run_complete_validation(self) -> SystemValidationResult:
        """Run complete system validation"""

        logger.info("🚀 Starting Video Engine System Validation")
        logger.info("=" * 60)

        try:
            # Setup validation environment
            self.temp_project_dir = EnvironmentSetup.setup_validation_environment(
                self.result
            )

            # Run validation phases
            ComponentTests.validate_component_integration(
                self.result, self.temp_project_dir
            )
            PerformanceTests.validate_performance_targets(
                self.result, self.temp_project_dir
            )
            QualityTests.validate_quality_standards(self.result, self.temp_project_dir)
            ErrorHandlingTests.validate_error_handling(
                self.result, self.temp_project_dir
            )
            ScalabilityTests.validate_scalability(self.result, self.temp_project_dir)
            ProfessionalStandardsTests.validate_professional_standards(
                self.result, self.temp_project_dir
            )

            # Generate final report
            ReportGeneration.generate_validation_report(self.result)

        except Exception as e:
            logger.error(f"💥 System validation failed: {e}")
            logger.error(traceback.format_exc())
            self.result.add_error(f"System validation failed: {e}")

        finally:
            EnvironmentSetup.cleanup_validation_environment(
                self.temp_project_dir, self.result
            )
            self.result.finalize()

        return self.result


def main():
    """Main function to run system validation"""

    print("🚀 Video Engine System Validation")
    print("=" * 50)

    # Create and run validator
    validator = VideoEngineSystemValidator()
    result = validator.run_complete_validation()

    # Print final status
    success_rate = result.get_success_rate()

    if success_rate >= 95.0:
        print(f"\n🎉 VALIDATION SUCCESSFUL: {success_rate:.1f}% success rate")
        return 0
    else:
        print(f"\n💔 VALIDATION FAILED: {success_rate:.1f}% success rate")
        return 1


if __name__ == "__main__":
    exit(main())
