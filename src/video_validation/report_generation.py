"""
Video Engine System Validation Report Generation
Handles generation and display of validation reports.
"""

import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ReportGeneration:
    """Handles validation report generation"""

    @staticmethod
    def generate_validation_report(result):
        """Generate comprehensive validation report"""
        logger.info("📋 Generating validation report...")

        try:
            # Calculate overall metrics
            success_rate = result.get_success_rate()
            duration = result.get_duration()

            # Create report
            report = {
                "validation_summary": {
                    "start_time": result.start_time.isoformat(),
                    "end_time": result.end_time.isoformat() if result.end_time else None,
                    "duration_seconds": duration,
                    "total_tests": result.total_tests,
                    "passed_tests": result.passed_tests,
                    "failed_tests": result.failed_tests,
                    "success_rate": success_rate,
                    "validation_passed": success_rate >= 95.0  # 95% threshold for overall validation
                },
                "test_results": result.test_results,
                "performance_metrics": result.performance_metrics,
                "quality_metrics": result.quality_metrics,
                "errors": result.error_log,
                "warnings": result.warnings,
                "system_info": ReportGeneration._get_system_info()
            }

            # Save report
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_filename = f"video_engine_system_validation_report_{timestamp}.json"

            with open(report_filename, 'w') as f:
                json.dump(report, f, indent=2)

            logger.info(f"📊 Validation report saved: {report_filename}")

            # Print summary
            ReportGeneration._print_validation_summary(report)

            return report_filename

        except Exception as e:
            logger.error(f"❌ Failed to generate validation report: {e}")
            result.add_error(f"Report generation failed: {e}")
            return None

    @staticmethod
    def _get_system_info():
        """Get system information for the report"""

        try:
            import psutil
            import platform

            memory = psutil.virtual_memory()

            system_info = {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": memory.total / 1024**3,
                "memory_available_gb": memory.available / 1024**3,
                "timestamp": datetime.now().isoformat()
            }

            # Try to get GPU info
            try:
                import torch
                if torch.cuda.is_available():
                    system_info["gpu_available"] = True
                    system_info["gpu_name"] = torch.cuda.get_device_name(0)
                    system_info["gpu_memory_gb"] = torch.cuda.get_device_properties(0).total_memory / 1024**3
                else:
                    system_info["gpu_available"] = False
            except ImportError:
                system_info["gpu_available"] = "unknown"

            return system_info

        except Exception as e:
            logger.warning(f"Failed to get system info: {e}")
            return {"error": str(e)}

    @staticmethod
    def _print_validation_summary(report):
        """Print validation summary to console"""

        summary = report["validation_summary"]

        logger.info("\n" + "=" * 60)
        logger.info("🎯 VIDEO ENGINE SYSTEM VALIDATION SUMMARY")
        logger.info("=" * 60)

        # Overall results
        logger.info(f"📊 Overall Results:")
        logger.info(f"   Tests Passed: {summary['passed_tests']}/{summary['total_tests']}")
        logger.info(f"   Success Rate: {summary['success_rate']:.1f}%")
        logger.info(f"   Duration: {summary['duration_seconds']:.1f} seconds")

        # Validation status
        if summary["validation_passed"]:
            logger.info("✅ SYSTEM VALIDATION PASSED")
        else:
            logger.info("❌ SYSTEM VALIDATION FAILED")

        # Performance highlights
        if report["performance_metrics"]:
            logger.info(f"\n⚡ Performance Highlights:")
            for metric_name, metric_data in report["performance_metrics"].items():
                if "fps" in metric_name.lower():
                    logger.info(f"   {metric_name}: {metric_data['value']:.3f} {metric_data['unit']}")

        # Quality highlights
        if report["quality_metrics"]:
            logger.info(f"\n🎨 Quality Highlights:")
            for metric_name, metric_data in report["quality_metrics"].items():
                status = "✅" if metric_data["passed"] else "❌"
                logger.info(f"   {status} {metric_name}: {metric_data['value']:.3f}")

        # Errors and warnings
        if report["errors"]:
            logger.info(f"\n❌ Errors ({len(report['errors'])}):")
            for error in report["errors"][-3:]:  # Show last 3 errors
                logger.info(f"   - {error['message']}")

        if report["warnings"]:
            logger.info(f"\n⚠️  Warnings ({len(report['warnings'])}):")
            for warning in report["warnings"][-3:]:  # Show last 3 warnings
                logger.info(f"   - {warning['message']}")

        logger.info("=" * 60)