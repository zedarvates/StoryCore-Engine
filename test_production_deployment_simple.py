"""
Simple Integration Test for Production Deployment Manager

This module provides basic integration testing for production deployment
capabilities with realistic scenarios and validation.
"""

import asyncio
import tempfile
import shutil
import json
import os
from datetime import datetime
from pathlib import Path

# Import the classes to test
from src.production_deployment_manager import (
    ProductionDeploymentManager,
    DeploymentConfig,
    HealthChecker,
    MonitoringSystem,
    BackupManager,
    AlertingSystem,
    create_deployment_scripts
)


class ProductionDeploymentIntegrationTest:
    """Integration test for production deployment manager"""
    
    def __init__(self):
        self.test_results = []
        self.temp_dir = None
        
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        status = "PASS" if success else "FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"[{status}] {test_name}: {message}")
    
    def setup_test_environment(self):
        """Setup test environment"""
        try:
            self.temp_dir = tempfile.mkdtemp()
            
            # Create test directories
            os.makedirs(os.path.join(self.temp_dir, "models", "hunyuan"), exist_ok=True)
            os.makedirs(os.path.join(self.temp_dir, "models", "newbie"), exist_ok=True)
            os.makedirs(os.path.join(self.temp_dir, "config"), exist_ok=True)
            os.makedirs(os.path.join(self.temp_dir, "logs"), exist_ok=True)
            
            # Create mock model files
            model_files = [
                "models/hunyuan/hunyuanvideo1.5_720p_t2v_fp16.safetensors",
                "models/newbie/NewBie-Image-Exp0.1-bf16.safetensors"
            ]
            
            for model_file in model_files:
                model_path = os.path.join(self.temp_dir, model_file)
                os.makedirs(os.path.dirname(model_path), exist_ok=True)
                with open(model_path, "wb") as f:
                    f.write(b"mock model data" * 1000)  # Create some file content
            
            # Create test config file
            test_config = {
                "environment": "test",
                "deployment_name": "integration-test",
                "version": "1.0.0"
            }
            
            with open(os.path.join(self.temp_dir, "config", "test.json"), "w") as f:
                json.dump(test_config, f)
            
            # Change to test directory
            self.original_cwd = os.getcwd()
            os.chdir(self.temp_dir)
            
            self.log_result("setup_test_environment", True, "Test environment created successfully")
            return True
            
        except Exception as e:
            self.log_result("setup_test_environment", False, f"Setup failed: {e}")
            return False
    
    def cleanup_test_environment(self):
        """Cleanup test environment"""
        try:
            if hasattr(self, 'original_cwd'):
                os.chdir(self.original_cwd)
            
            if self.temp_dir and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
            
            self.log_result("cleanup_test_environment", True, "Test environment cleaned up")
            
        except Exception as e:
            self.log_result("cleanup_test_environment", False, f"Cleanup failed: {e}")
    
    def test_deployment_config_creation(self):
        """Test deployment configuration creation"""
        try:
            # Test default configuration
            config = DeploymentConfig()
            
            assert config.environment == "production"
            assert config.deployment_name == "advanced-workflows"
            assert config.version == "1.0.0"
            assert config.enable_monitoring is True
            
            # Test custom configuration
            custom_config = DeploymentConfig(
                environment="test",
                deployment_name="test-deployment",
                min_vram_gb=8.0,
                enable_backup=False
            )
            
            assert custom_config.environment == "test"
            assert custom_config.deployment_name == "test-deployment"
            assert custom_config.min_vram_gb == 8.0
            assert custom_config.enable_backup is False
            
            self.log_result("test_deployment_config_creation", True, "Configuration creation successful")
            return True
            
        except Exception as e:
            self.log_result("test_deployment_config_creation", False, f"Configuration test failed: {e}")
            return False
    
    async def test_deployment_manager_initialization(self):
        """Test deployment manager initialization"""
        try:
            config = DeploymentConfig(
                environment="test",
                deployment_name="integration-test",
                min_vram_gb=1.0,  # Lower requirements for testing
                min_ram_gb=1.0,
                min_storage_gb=1.0,
                enable_monitoring=True,
                enable_health_checks=True,
                enable_backup=True
            )
            
            deployment_manager = ProductionDeploymentManager(config)
            
            # Check initialization
            assert deployment_manager.config == config
            assert deployment_manager.deployment_id.startswith("integration-test-")
            assert deployment_manager.status == "initializing"
            assert deployment_manager.running is False
            
            # Check component initialization
            assert deployment_manager.health_checker is not None
            assert deployment_manager.monitoring_system is not None
            assert deployment_manager.backup_manager is not None
            assert deployment_manager.alerting_system is not None
            
            # Check deployment status
            status = deployment_manager.get_deployment_status()
            assert status.deployment_id == deployment_manager.deployment_id
            assert status.status == "initializing"
            assert status.version == config.version
            
            self.log_result("test_deployment_manager_initialization", True, "Deployment manager initialized successfully")
            return True
            
        except Exception as e:
            self.log_result("test_deployment_manager_initialization", False, f"Initialization failed: {e}")
            return False
    
    async def test_health_checker_functionality(self):
        """Test health checker functionality"""
        try:
            config = DeploymentConfig(environment="test")
            health_checker = HealthChecker(config)
            
            # Initialize health checker
            await health_checker.initialize()
            
            # Check that health checks are registered
            assert health_checker.health_checks is not None
            assert len(health_checker.health_checks) > 0
            
            expected_checks = [
                "system_resources", "gpu_status", "model_availability",
                "workflow_engines", "storage_space", "network_connectivity",
                "memory_usage", "performance_metrics"
            ]
            
            for check_name in expected_checks:
                assert check_name in health_checker.health_checks
            
            # Run comprehensive health check
            health_results = await health_checker.run_comprehensive_health_check()
            
            assert isinstance(health_results, list)
            assert len(health_results) == len(expected_checks)
            
            # Check result structure
            for result in health_results:
                assert hasattr(result, 'component')
                assert hasattr(result, 'status')
                assert hasattr(result, 'message')
                assert hasattr(result, 'timestamp')
                assert result.status in ['healthy', 'warning', 'critical']
            
            self.log_result("test_health_checker_functionality", True, f"Health checker completed {len(health_results)} checks")
            return True
            
        except Exception as e:
            self.log_result("test_health_checker_functionality", False, f"Health checker test failed: {e}")
            return False
    
    async def test_monitoring_system_functionality(self):
        """Test monitoring system functionality"""
        try:
            config = DeploymentConfig(
                environment="test",
                metrics_collection_interval=1
            )
            monitoring_system = MonitoringSystem(config)
            
            # Initialize monitoring system
            await monitoring_system.initialize()
            
            # Check collectors are registered
            assert monitoring_system.collectors is not None
            assert len(monitoring_system.collectors) > 0
            
            expected_collectors = [
                "system_metrics", "gpu_metrics", "workflow_metrics",
                "performance_metrics", "quality_metrics"
            ]
            
            for collector_name in expected_collectors:
                assert collector_name in monitoring_system.collectors
            
            # Test individual metric collection
            system_metrics = await monitoring_system._collect_system_metrics()
            assert isinstance(system_metrics, dict)
            assert "cpu_percent" in system_metrics or "error" in system_metrics
            
            gpu_metrics = await monitoring_system._collect_gpu_metrics()
            assert isinstance(gpu_metrics, dict)
            assert "gpu_available" in gpu_metrics or "error" in gpu_metrics
            
            workflow_metrics = await monitoring_system._collect_workflow_metrics()
            assert isinstance(workflow_metrics, dict)
            assert "active_video_generations" in workflow_metrics or "error" in workflow_metrics
            
            # Test metrics report generation
            monitoring_system.metrics_history = [
                {
                    'timestamp': datetime.now(),
                    'metrics': {
                        "system_metrics": {"cpu_percent": 50.0, "memory_percent": 60.0}
                    }
                }
            ]
            
            report = monitoring_system.generate_metrics_report()
            assert isinstance(report, dict)
            assert "report_timestamp" in report
            
            self.log_result("test_monitoring_system_functionality", True, "Monitoring system functional")
            return True
            
        except Exception as e:
            self.log_result("test_monitoring_system_functionality", False, f"Monitoring test failed: {e}")
            return False
    
    async def test_backup_manager_functionality(self):
        """Test backup manager functionality"""
        try:
            config = DeploymentConfig(
                environment="test",
                enable_backup=True
            )
            backup_manager = BackupManager(config)
            
            # Test configuration backup
            config_result = await backup_manager._backup_configuration()
            assert isinstance(config_result, dict)
            assert "status" in config_result
            
            # Test model info collection
            model_info = backup_manager._get_model_info("models/hunyuan/")
            assert isinstance(model_info, dict)
            
            if "model_count" in model_info:
                # Directory exists and has models
                assert model_info["model_count"] >= 0
                assert "files" in model_info
            else:
                # Directory doesn't exist
                assert model_info["status"] == "directory_not_found"
            
            # Test logs backup
            logs_result = await backup_manager._backup_logs()
            assert isinstance(logs_result, dict)
            assert "status" in logs_result
            
            # Test metrics backup
            metrics_result = await backup_manager._backup_metrics()
            assert isinstance(metrics_result, dict)
            assert "status" in metrics_result
            
            # Test backup history
            history = backup_manager.get_backup_history()
            assert isinstance(history, list)
            
            self.log_result("test_backup_manager_functionality", True, "Backup manager functional")
            return True
            
        except Exception as e:
            self.log_result("test_backup_manager_functionality", False, f"Backup manager test failed: {e}")
            return False
    
    async def test_alerting_system_functionality(self):
        """Test alerting system functionality"""
        try:
            config = DeploymentConfig(
                environment="test",
                alert_email="test@example.com",
                alert_webhook="https://webhook.example.com"
            )
            alerting_system = AlertingSystem(config)
            
            # Test sending alert
            await alerting_system.send_alert(
                severity="warning",
                message="Test alert message",
                component="test_component"
            )
            
            # Check alert history
            assert len(alerting_system.alert_history) == 1
            alert = alerting_system.alert_history[0]
            
            assert alert["severity"] == "warning"
            assert alert["message"] == "Test alert message"
            assert alert["component"] == "test_component"
            assert "timestamp" in alert
            assert "id" in alert
            
            # Test getting alert history
            recent_alerts = alerting_system.get_alert_history(hours=24)
            assert len(recent_alerts) == 1
            assert recent_alerts[0]["id"] == alert["id"]
            
            self.log_result("test_alerting_system_functionality", True, "Alerting system functional")
            return True
            
        except Exception as e:
            self.log_result("test_alerting_system_functionality", False, f"Alerting system test failed: {e}")
            return False
    
    def test_deployment_scripts_generation(self):
        """Test deployment scripts generation"""
        try:
            # Generate deployment scripts
            create_deployment_scripts()
            
            # Check if scripts were created
            assert os.path.exists("deployment/docker-deploy.sh")
            assert os.path.exists("deployment/k8s-deployment.yaml")
            
            # Check Docker script content
            with open("deployment/docker-deploy.sh", "r") as f:
                docker_content = f.read()
                assert "docker build" in docker_content
                assert "advanced-comfyui-workflows" in docker_content
                assert "#!/bin/bash" in docker_content
            
            # Check Kubernetes deployment content
            with open("deployment/k8s-deployment.yaml", "r") as f:
                k8s_content = f.read()
                assert "apiVersion: apps/v1" in k8s_content
                assert "kind: Deployment" in k8s_content
                assert "advanced-comfyui-workflows" in k8s_content
            
            # Check script permissions
            docker_script_path = "deployment/docker-deploy.sh"
            assert os.access(docker_script_path, os.R_OK)
            
            self.log_result("test_deployment_scripts_generation", True, "Deployment scripts generated successfully")
            return True
            
        except Exception as e:
            self.log_result("test_deployment_scripts_generation", False, f"Script generation failed: {e}")
            return False
    
    async def test_integration_workflow(self):
        """Test complete integration workflow"""
        try:
            # Create deployment configuration
            config = DeploymentConfig(
                environment="test",
                deployment_name="integration-workflow-test",
                min_vram_gb=1.0,
                min_ram_gb=1.0,
                min_storage_gb=1.0,
                enable_monitoring=True,
                enable_health_checks=True,
                enable_backup=False,  # Disable for integration test
                metrics_collection_interval=1,
                health_check_interval=2
            )
            
            # Initialize deployment manager
            deployment_manager = ProductionDeploymentManager(config)
            
            # Test initialization
            assert deployment_manager.deployment_status.status == "initializing"
            
            # Initialize components
            await deployment_manager.health_checker.initialize()
            await deployment_manager.monitoring_system.initialize()
            
            # Test health checking
            health_results = await deployment_manager.get_health_status()
            assert isinstance(health_results, list)
            assert len(health_results) > 0
            
            # Test metrics collection
            metrics = deployment_manager.get_performance_metrics()
            assert isinstance(metrics, dict)
            
            # Test alerting
            await deployment_manager.alerting_system.send_alert(
                severity="info",
                message="Integration test alert",
                component="integration_test"
            )
            
            alert_history = deployment_manager.alerting_system.get_alert_history()
            assert len(alert_history) == 1
            
            # Test deployment status tracking
            status = deployment_manager.get_deployment_status()
            assert status.deployment_id == deployment_manager.deployment_id
            assert status.version == config.version
            
            self.log_result("test_integration_workflow", True, "Integration workflow completed successfully")
            return True
            
        except Exception as e:
            self.log_result("test_integration_workflow", False, f"Integration workflow failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all integration tests"""
        print("Starting Production Deployment Integration Tests...")
        print("=" * 60)
        
        # Setup test environment
        if not self.setup_test_environment():
            return False
        
        try:
            # Run all tests
            tests = [
                ("Configuration Creation", self.test_deployment_config_creation()),
                ("Deployment Manager Init", self.test_deployment_manager_initialization()),
                ("Health Checker", self.test_health_checker_functionality()),
                ("Monitoring System", self.test_monitoring_system_functionality()),
                ("Backup Manager", self.test_backup_manager_functionality()),
                ("Alerting System", self.test_alerting_system_functionality()),
                ("Deployment Scripts", self.test_deployment_scripts_generation()),
                ("Integration Workflow", self.test_integration_workflow())
            ]
            
            results = []
            for test_name, test_coro in tests:
                print(f"\nRunning: {test_name}")
                if asyncio.iscoroutine(test_coro):
                    result = await test_coro
                else:
                    result = test_coro
                results.append(result)
            
            # Summary
            print("\n" + "=" * 60)
            print("TEST SUMMARY")
            print("=" * 60)
            
            passed = sum(1 for r in self.test_results if r["status"] == "PASS")
            failed = sum(1 for r in self.test_results if r["status"] == "FAIL")
            
            print(f"Total Tests: {len(self.test_results)}")
            print(f"Passed: {passed}")
            print(f"Failed: {failed}")
            print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
            
            if failed > 0:
                print("\nFailed Tests:")
                for result in self.test_results:
                    if result["status"] == "FAIL":
                        print(f"  - {result['test']}: {result['message']}")
            
            # Export results
            self.export_test_results()
            
            return failed == 0
            
        finally:
            self.cleanup_test_environment()
    
    def export_test_results(self):
        """Export test results to JSON file"""
        try:
            results_file = "production_deployment_integration_results.json"
            
            test_summary = {
                "test_run_timestamp": datetime.now().isoformat(),
                "test_environment": "integration",
                "total_tests": len(self.test_results),
                "passed_tests": sum(1 for r in self.test_results if r["status"] == "PASS"),
                "failed_tests": sum(1 for r in self.test_results if r["status"] == "FAIL"),
                "success_rate": (sum(1 for r in self.test_results if r["status"] == "PASS") / len(self.test_results)) * 100,
                "test_results": self.test_results
            }
            
            with open(results_file, "w") as f:
                json.dump(test_summary, f, indent=2)
            
            print(f"\nTest results exported to: {results_file}")
            
        except Exception as e:
            print(f"Failed to export test results: {e}")


async def main():
    """Main test execution"""
    test_runner = ProductionDeploymentIntegrationTest()
    success = await test_runner.run_all_tests()
    
    if success:
        print("\n🎉 All integration tests passed!")
        return 0
    else:
        print("\n❌ Some integration tests failed!")
        return 1


if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)