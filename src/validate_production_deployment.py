"""
Production Deployment Validation Script

Simple validation script to verify production deployment components
without requiring full dependencies.
"""

import os
import json
import sys
from pathlib import Path
from datetime import datetime


def validate_file_exists(file_path: str, description: str) -> bool:
    """Validate that a file exists"""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} (NOT FOUND)")
        return False


def validate_directory_structure() -> bool:
    """Validate directory structure"""
    print("Validating Directory Structure...")
    
    required_dirs = [
        ("src", "Source code directory"),
        ("tests", "Test directory"),
        ("deployment", "Deployment configuration directory"),
        ("deployment/monitoring", "Monitoring configuration directory")
    ]
    
    all_valid = True
    for dir_path, description in required_dirs:
        if os.path.exists(dir_path) and os.path.isdir(dir_path):
            print(f"✅ {description}: {dir_path}")
        else:
            print(f"❌ {description}: {dir_path} (NOT FOUND)")
            all_valid = False
    
    return all_valid


def validate_core_files() -> bool:
    """Validate core implementation files"""
    print("\nValidating Core Implementation Files...")
    
    core_files = [
        ("src/production_deployment_manager.py", "Production Deployment Manager"),
        ("tests/test_production_deployment_manager.py", "Comprehensive Test Suite"),
        ("test_production_deployment_simple.py", "Simple Integration Test"),
        ("TASK_4_4_COMPLETION_SUMMARY.md", "Task Completion Summary")
    ]
    
    all_valid = True
    for file_path, description in core_files:
        if not validate_file_exists(file_path, description):
            all_valid = False
    
    return all_valid


def validate_deployment_files() -> bool:
    """Validate deployment configuration files"""
    print("\nValidating Deployment Configuration Files...")
    
    deployment_files = [
        ("deployment/Dockerfile", "Docker Container Configuration"),
        ("deployment/docker-compose.yml", "Docker Compose Configuration"),
        ("deployment/production-config.yaml", "Production Configuration"),
        ("deployment/monitoring/prometheus.yml", "Prometheus Configuration"),
        ("deployment/monitoring/alert_rules.yml", "Alert Rules Configuration")
    ]
    
    all_valid = True
    for file_path, description in deployment_files:
        if not validate_file_exists(file_path, description):
            all_valid = False
    
    return all_valid


def validate_file_content() -> bool:
    """Validate file content and structure"""
    print("\nValidating File Content...")
    
    all_valid = True
    
    # Check production deployment manager
    try:
        with open("src/production_deployment_manager.py", "r") as f:
            content = f.read()
            
        required_classes = [
            "ProductionDeploymentManager",
            "HealthChecker", 
            "MonitoringSystem",
            "BackupManager",
            "AlertingSystem"
        ]
        
        for class_name in required_classes:
            if f"class {class_name}" in content:
                print(f"✅ Class found: {class_name}")
            else:
                print(f"❌ Class missing: {class_name}")
                all_valid = False
                
    except Exception as e:
        print(f"❌ Error reading production deployment manager: {e}")
        all_valid = False
    
    # Check Docker configuration
    try:
        with open("deployment/Dockerfile", "r") as f:
            dockerfile_content = f.read()
            
        if "FROM nvidia/cuda" in dockerfile_content:
            print("✅ Docker: NVIDIA CUDA base image configured")
        else:
            print("❌ Docker: NVIDIA CUDA base image not found")
            all_valid = False
            
        if "EXPOSE 8080" in dockerfile_content:
            print("✅ Docker: Port 8080 exposed")
        else:
            print("❌ Docker: Port 8080 not exposed")
            all_valid = False
            
    except Exception as e:
        print(f"❌ Error reading Dockerfile: {e}")
        all_valid = False
    
    # Check production configuration
    try:
        with open("deployment/production-config.yaml", "r") as f:
            config_content = f.read()
            
        required_sections = [
            "deployment:",
            "workflows:",
            "models:",
            "quality:",
            "optimization:",
            "security:",
            "logging:",
            "backup:",
            "network:"
        ]
        
        for section in required_sections:
            if section in config_content:
                print(f"✅ Config section found: {section}")
            else:
                print(f"❌ Config section missing: {section}")
                all_valid = False
                
    except Exception as e:
        print(f"❌ Error reading production config: {e}")
        all_valid = False
    
    return all_valid


def validate_test_structure() -> bool:
    """Validate test file structure"""
    print("\nValidating Test Structure...")
    
    all_valid = True
    
    try:
        with open("tests/test_production_deployment_manager.py", "r") as f:
            test_content = f.read()
            
        required_test_classes = [
            "TestDeploymentConfig",
            "TestProductionDeploymentManager",
            "TestHealthChecker",
            "TestMonitoringSystem",
            "TestBackupManager",
            "TestAlertingSystem"
        ]
        
        for test_class in required_test_classes:
            if f"class {test_class}" in test_content:
                print(f"✅ Test class found: {test_class}")
            else:
                print(f"❌ Test class missing: {test_class}")
                all_valid = False
                
    except Exception as e:
        print(f"❌ Error reading test file: {e}")
        all_valid = False
    
    return all_valid


def count_lines_of_code() -> dict:
    """Count lines of code in implementation files"""
    print("\nCounting Lines of Code...")
    
    files_to_count = [
        "src/production_deployment_manager.py",
        "tests/test_production_deployment_manager.py", 
        "test_production_deployment_simple.py"
    ]
    
    line_counts = {}
    total_lines = 0
    
    for file_path in files_to_count:
        try:
            with open(file_path, "r") as f:
                lines = len(f.readlines())
                line_counts[file_path] = lines
                total_lines += lines
                print(f"📊 {file_path}: {lines:,} lines")
        except Exception as e:
            print(f"❌ Error counting lines in {file_path}: {e}")
            line_counts[file_path] = 0
    
    print(f"📊 Total Implementation: {total_lines:,} lines")
    return line_counts


def generate_validation_report(results: dict) -> None:
    """Generate validation report"""
    print("\n" + "=" * 60)
    print("PRODUCTION DEPLOYMENT VALIDATION REPORT")
    print("=" * 60)
    
    # Calculate overall success
    all_passed = all(results.values())
    
    print(f"Validation Date: {datetime.now().isoformat()}")
    print(f"Overall Status: {'✅ PASSED' if all_passed else '❌ FAILED'}")
    print()
    
    # Individual results
    for check_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{check_name}: {status}")
    
    # Summary statistics
    passed_count = sum(1 for result in results.values() if result)
    total_count = len(results)
    success_rate = (passed_count / total_count) * 100
    
    print(f"\nValidation Summary:")
    print(f"  Total Checks: {total_count}")
    print(f"  Passed: {passed_count}")
    print(f"  Failed: {total_count - passed_count}")
    print(f"  Success Rate: {success_rate:.1f}%")
    
    if all_passed:
        print("\n🎉 Production deployment system is ready!")
        print("All components validated successfully.")
    else:
        print("\n⚠️  Production deployment system needs attention.")
        print("Some components failed validation.")
    
    # Export report
    report_data = {
        "validation_timestamp": datetime.now().isoformat(),
        "overall_status": "PASSED" if all_passed else "FAILED",
        "success_rate": success_rate,
        "total_checks": total_count,
        "passed_checks": passed_count,
        "failed_checks": total_count - passed_count,
        "detailed_results": results
    }
    
    try:
        with open("production_deployment_validation_report.json", "w") as f:
            json.dump(report_data, f, indent=2)
        print(f"\n📄 Validation report exported to: production_deployment_validation_report.json")
    except Exception as e:
        print(f"❌ Failed to export validation report: {e}")


def main():
    """Main validation function"""
    print("Production Deployment System Validation")
    print("=" * 60)
    
    # Run all validation checks
    validation_results = {
        "Directory Structure": validate_directory_structure(),
        "Core Implementation Files": validate_core_files(),
        "Deployment Configuration": validate_deployment_files(),
        "File Content Validation": validate_file_content(),
        "Test Structure": validate_test_structure()
    }
    
    # Count lines of code
    line_counts = count_lines_of_code()
    
    # Generate report
    generate_validation_report(validation_results)
    
    # Return exit code
    return 0 if all(validation_results.values()) else 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)