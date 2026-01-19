"""
Comprehensive Test Suite for Production Deployment Manager

This module provides extensive testing for production deployment capabilities
including deployment validation, health checking, monitoring, and backup systems.
"""

import pytest
import asyncio
import tempfile
import shutil
import json
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path

# Import the classes to test
from src.production_deployment_manager import (
    ProductionDeploymentManager,
    DeploymentConfig,
    HealthChecker,
    MonitoringSystem,
    BackupManager,
    AlertingSystem,
    HealthCheckResult,
    DeploymentStatus,
    create_deployment_scripts
)


class TestDeploymentConfig:
    """Test deployment configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = DeploymentConfig()
        
        assert config.environment == "production"
        assert config.deployment_name == "advanced-workflows"
        assert config.version == "1.0.0"
        assert config.min_vram_gb == 16.0
        assert config.min_ram_gb == 32.0
        assert config.enable_monitoring is True
        assert config.enable_health_checks is True
        assert config.max_concurrent_requests == 4
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = DeploymentConfig(
            environment="staging",
            deployment_name="test-deployment",
            version="2.0.0",
            min_vram_gb=8.0,
            enable_monitoring=False
        )
        
        assert config.environment == "staging"
        assert config.deployment_name == "test-deployment"
        assert config.version == "2.0.0"
        assert config.min_vram_gb == 8.0
        assert config.enable_monitoring is False
    
    def test_alert_thresholds(self):
        """Test alert threshold configuration"""
        config = DeploymentConfig()
        
        assert "cpu_usage" in config.alert_thresholds
        assert "memory_usage" in config.alert_thresholds
        assert "gpu_usage" in config.alert_thresholds
        assert config.alert_thresholds["cpu_usage"] == 80.0


class TestHealthCheckResult:
    """Test health check result data structure"""
    
    def test_health_check_result_creation(self):
        """Test creating health check results"""
        result = HealthCheckResult(
            component="test_component",
            status="healthy",
            message="All systems operational",
            timestamp=datetime.now(),
            metrics={"cpu_usage": 45.0}
        )
        
        assert result.component == "test_component"
        assert result.status == "healthy"
        assert result.message == "All systems operational"
        assert result.metrics["cpu_usage"] == 45.0
    
    def test_health_check_result_without_metrics(self):
        """Test health check result without metrics"""
        result = HealthCheckResult(
            component="test_component",
            status="warning",
            message="Minor issues detected",
            timestamp=datetime.now()
        )
        
        assert result.component == "test_component"
        assert result.status == "warning"
        assert result.metrics == {}


class TestProductionDeploymentManager:
    """Test production deployment manager"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return DeploymentConfig(
            environment="test",
            deployment_name="test-deployment",
            min_vram_gb=1.0,  # Lower requirements for testing
            min_ram_gb=1.0,
            min_storage_gb=1.0,
            enable_monitoring=True,
            enable_health_checks=True,
            enable_backup=False  # Disable for testing
        )
    
    @pytest.fixture
    def deployment_manager(self, config):
        """Create deployment manager for testing"""
        return ProductionDeploymentManager(config)
    
    def test_initialization(self, deployment_manager, config):
        """Test deployment manager initialization"""
        assert deployment_manager.config == config
        assert deployment_manager.deployment_id.startswith("test-deployment-")
        assert deployment_manager.status == "initializing"
        assert deployment_manager.running is False
        
        # Check component initialization
        assert deployment_manager.health_checker is not None
        assert deployment_manager.monitoring_system is not None
        assert deployment_manager.backup_manager is not None
        assert deployment_manager.alerting_system is not None
    
    def test_deployment_status_initialization(self, deployment_manager):
        """Test deployment status initialization"""
        status = deployment_manager.deployment_status
        
        assert status.deployment_id == deployment_manager.deployment_id
        assert status.status == "initializing"
        assert status.version == deployment_manager.config.version
        assert isinstance(status.start_time, datetime)
        assert status.active_workflows == []
        assert status.error_count == 0
    
    @patch('torch.cuda.is_available', return_value=True)
    @patch('torch.cuda.get_device_properties')
    @patch('psutil.virtual_memory')
    def test_check_system_resources_success(self, mock_memory, mock_gpu_props, mock_cuda, deployment_manager):
        """Test successful system resource check"""
        # Mock system resources
        mock_memory.return_value.total = 64 * (1024**3)  # 64GB RAM
        mock_gpu_props.return_value.total_memory = 24 * (1024**3)  # 24GB VRAM
        
        result = deployment_manager._check_system_resources()
        
        assert result is True
    
    @patch('torch.cuda.is_available', return_value=False)
    def test_check_system_resources_no_cuda(self, mock_cuda, deployment_manager):
        """Test system resource check without CUDA"""
        result = deployment_manager._check_system_resources()
        
        assert result is False
    
    @patch('torch.cuda.is_available', return_value=True)
    @patch('torch.version.cuda', '11.8')
    def test_check_cuda_environment_success(self, deployment_manager):
        """Test successful CUDA environment check"""
        result = deployment_manager._check_cuda_environment()
        
        assert result is True
    
    @patch('torch.cuda.is_available', return_value=False)
    def test_check_cuda_environment_failure(self, deployment_manager):
        """Test CUDA environment check failure"""
        result = deployment_manager._check_cuda_environment()
        
        assert result is False
    
    @patch('os.path.exists')
    async def test_check_model_availability_success(self, mock_exists, deployment_manager):
        """Test successful model availability check"""
        mock_exists.return_value = True
        
        result = await deployment_manager._check_model_availability()
        
        assert result is True
    
    @patch('os.path.exists')
    async def test_check_model_availability_failure(self, mock_exists, deployment_manager):
        """Test model availability check failure"""
        mock_exists.return_value = False
        
        result = await deployment_manager._check_model_availability()
        
        assert result is False
    
    @patch('urllib.request.urlopen')
    async def test_check_network_connectivity_success(self, mock_urlopen, deployment_manager):
        """Test successful network connectivity check"""
        mock_urlopen.return_value = Mock()
        
        result = await deployment_manager._check_network_connectivity()
        
        assert result is True
    
    @patch('psutil.disk_usage')
    def test_check_storage_space_success(self, mock_disk_usage, deployment_manager):
        """Test successful storage space check"""
        mock_disk_usage.return_value.free = 200 * (1024**3)  # 200GB free
        
        result = deployment_manager._check_storage_space()
        
        assert result is True
    
    @patch('psutil.disk_usage')
    def test_check_storage_space_failure(self, mock_disk_usage, deployment_manager):
        """Test storage space check failure"""
        mock_disk_usage.return_value.free = 50 * (1024**3)  # 50GB free (less than required 100GB)
        
        result = deployment_manager._check_storage_space()
        
        assert result is False
    
    def test_get_deployment_status(self, deployment_manager):
        """Test getting deployment status"""
        status = deployment_manager.get_deployment_status()
        
        assert isinstance(status, DeploymentStatus)
        assert status.deployment_id == deployment_manager.deployment_id
        assert status.status == "initializing"
    
    async def test_get_health_status(self, deployment_manager):
        """Test getting health status"""
        with patch.object(deployment_manager.health_checker, 'get_current_health_status', 
                         return_value=[]) as mock_health:
            health_status = await deployment_manager.get_health_status()
            
            assert isinstance(health_status, list)
            mock_health.assert_called_once()
    
    def test_get_performance_metrics(self, deployment_manager):
        """Test getting performance metrics"""
        with patch.object(deployment_manager.monitoring_system, 'get_current_metrics', 
                         return_value={}) as mock_metrics:
            metrics = deployment_manager.get_performance_metrics()
            
            assert isinstance(metrics, dict)
            mock_metrics.assert_called_once()


class TestHealthChecker:
    """Test health checker functionality"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return DeploymentConfig(environment="test")
    
    @pytest.fixture
    def health_checker(self, config):
        """Create health checker for testing"""
        return HealthChecker(config)
    
    async def test_initialization(self, health_checker):
        """Test health checker initialization"""
        await health_checker.initialize()
        
        assert health_checker.health_checks is not None
        assert len(health_checker.health_checks) > 0
        assert "system_resources" in health_checker.health_checks
        assert "gpu_status" in health_checker.health_checks
    
    @patch('psutil.cpu_percent', return_value=50.0)
    @patch('psutil.virtual_memory')
    async def test_check_system_resources_healthy(self, mock_memory, mock_cpu, health_checker):
        """Test healthy system resources check"""
        mock_memory.return_value.percent = 60.0
        mock_memory.return_value.available = 32 * (1024**3)
        
        await health_checker.initialize()
        result = await health_checker._check_system_resources()
        
        assert result.component == "system_resources"
        assert result.status == "healthy"
        assert "cpu_percent" in result.metrics
        assert "memory_percent" in result.metrics
    
    @patch('psutil.cpu_percent', return_value=95.0)
    @patch('psutil.virtual_memory')
    async def test_check_system_resources_critical(self, mock_memory, mock_cpu, health_checker):
        """Test critical system resources check"""
        mock_memory.return_value.percent = 95.0
        mock_memory.return_value.available = 2 * (1024**3)
        
        await health_checker.initialize()
        result = await health_checker._check_system_resources()
        
        assert result.component == "system_resources"
        assert result.status == "critical"
    
    @patch('torch.cuda.is_available', return_value=True)
    @patch('torch.cuda.memory_allocated', return_value=8 * (1024**3))
    @patch('torch.cuda.memory_reserved', return_value=10 * (1024**3))
    @patch('torch.cuda.get_device_properties')
    async def test_check_gpu_status_healthy(self, mock_props, health_checker):
        """Test healthy GPU status check"""
        mock_props.return_value.total_memory = 24 * (1024**3)  # 24GB total
        
        await health_checker.initialize()
        result = await health_checker._check_gpu_status()
        
        assert result.component == "gpu_status"
        assert result.status == "healthy"
        assert "gpu_memory_allocated_gb" in result.metrics
    
    @patch('torch.cuda.is_available', return_value=False)
    async def test_check_gpu_status_no_cuda(self, health_checker):
        """Test GPU status check without CUDA"""
        await health_checker.initialize()
        result = await health_checker._check_gpu_status()
        
        assert result.component == "gpu_status"
        assert result.status == "critical"
        assert "CUDA not available" in result.message
    
    @patch('os.path.exists', return_value=True)
    async def test_check_model_availability_success(self, mock_exists, health_checker):
        """Test successful model availability check"""
        await health_checker.initialize()
        result = await health_checker._check_model_availability()
        
        assert result.component == "model_availability"
        assert result.status == "healthy"
        assert result.metrics["missing_models"] == 0
    
    @patch('os.path.exists', return_value=False)
    async def test_check_model_availability_failure(self, mock_exists, health_checker):
        """Test model availability check failure"""
        await health_checker.initialize()
        result = await health_checker._check_model_availability()
        
        assert result.component == "model_availability"
        assert result.status == "critical"
        assert result.metrics["missing_models"] > 0
    
    async def test_run_comprehensive_health_check(self, health_checker):
        """Test comprehensive health check"""
        await health_checker.initialize()
        
        with patch.object(health_checker, '_check_system_resources', 
                         return_value=HealthCheckResult("system", "healthy", "OK", datetime.now())):
            with patch.object(health_checker, '_check_gpu_status',
                             return_value=HealthCheckResult("gpu", "healthy", "OK", datetime.now())):
                results = await health_checker.run_comprehensive_health_check()
                
                assert isinstance(results, list)
                assert len(results) > 0
                assert all(isinstance(r, HealthCheckResult) for r in results)
    
    async def test_health_check_error_handling(self, health_checker):
        """Test health check error handling"""
        await health_checker.initialize()
        
        # Mock a health check that raises an exception
        with patch.object(health_checker, '_check_system_resources', side_effect=Exception("Test error")):
            results = await health_checker.run_comprehensive_health_check()
            
            # Should still return results, with error status
            system_result = next((r for r in results if r.component == "system_resources"), None)
            assert system_result is not None
            assert system_result.status == "critical"
            assert "Test error" in system_result.message


class TestMonitoringSystem:
    """Test monitoring system functionality"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return DeploymentConfig(
            environment="test",
            metrics_collection_interval=1  # Fast collection for testing
        )
    
    @pytest.fixture
    def monitoring_system(self, config):
        """Create monitoring system for testing"""
        return MonitoringSystem(config)
    
    async def test_initialization(self, monitoring_system):
        """Test monitoring system initialization"""
        await monitoring_system.initialize()
        
        assert monitoring_system.collectors is not None
        assert len(monitoring_system.collectors) > 0
        assert "system_metrics" in monitoring_system.collectors
        assert "gpu_metrics" in monitoring_system.collectors
    
    @patch('psutil.cpu_percent', return_value=45.0)
    @patch('psutil.cpu_count', return_value=8)
    @patch('psutil.virtual_memory')
    @patch('psutil.disk_usage')
    @patch('psutil.net_io_counters')
    async def test_collect_system_metrics(self, mock_net, mock_disk, mock_memory, monitoring_system):
        """Test system metrics collection"""
        # Setup mocks
        mock_memory.return_value.percent = 60.0
        mock_memory.return_value.available = 32 * (1024**3)
        mock_memory.return_value.total = 64 * (1024**3)
        mock_disk.return_value.free = 500 * (1024**3)
        mock_disk.return_value.total = 1000 * (1024**3)
        mock_disk.return_value.used = 500 * (1024**3)
        mock_net.return_value.bytes_sent = 1000000
        mock_net.return_value.bytes_recv = 2000000
        
        await monitoring_system.initialize()
        metrics = await monitoring_system._collect_system_metrics()
        
        assert "cpu_percent" in metrics
        assert "memory_percent" in metrics
        assert "disk_free_gb" in metrics
        assert metrics["cpu_percent"] == 45.0
        assert metrics["memory_percent"] == 60.0
    
    @patch('torch.cuda.is_available', return_value=True)
    @patch('torch.cuda.memory_allocated', return_value=8 * (1024**3))
    @patch('torch.cuda.memory_reserved', return_value=10 * (1024**3))
    @patch('torch.cuda.get_device_properties')
    @patch('torch.cuda.device_count', return_value=2)
    async def test_collect_gpu_metrics(self, mock_device_count, mock_props, monitoring_system):
        """Test GPU metrics collection"""
        mock_props.return_value.total_memory = 24 * (1024**3)
        
        await monitoring_system.initialize()
        metrics = await monitoring_system._collect_gpu_metrics()
        
        assert metrics["gpu_available"] is True
        assert "gpu_memory_allocated_gb" in metrics
        assert "gpu_memory_total_gb" in metrics
        assert "gpu_device_count" in metrics
        assert metrics["gpu_device_count"] == 2
    
    @patch('torch.cuda.is_available', return_value=False)
    async def test_collect_gpu_metrics_no_cuda(self, monitoring_system):
        """Test GPU metrics collection without CUDA"""
        await monitoring_system.initialize()
        metrics = await monitoring_system._collect_gpu_metrics()
        
        assert metrics["gpu_available"] is False
    
    async def test_collect_workflow_metrics(self, monitoring_system):
        """Test workflow metrics collection"""
        await monitoring_system.initialize()
        metrics = await monitoring_system._collect_workflow_metrics()
        
        assert "active_video_generations" in metrics
        assert "active_image_generations" in metrics
        assert "queued_requests" in metrics
        assert "workflow_success_rate" in metrics
        assert isinstance(metrics["workflow_success_rate"], float)
    
    async def test_collect_performance_metrics(self, monitoring_system):
        """Test performance metrics collection"""
        await monitoring_system.initialize()
        metrics = await monitoring_system._collect_performance_metrics()
        
        assert "requests_per_second" in metrics
        assert "avg_response_time" in metrics
        assert "error_rate_percent" in metrics
        assert "throughput_mbps" in metrics
    
    async def test_collect_quality_metrics(self, monitoring_system):
        """Test quality metrics collection"""
        await monitoring_system.initialize()
        metrics = await monitoring_system._collect_quality_metrics()
        
        assert "avg_video_quality_score" in metrics
        assert "avg_image_quality_score" in metrics
        assert "quality_threshold_pass_rate" in metrics
        assert "user_satisfaction_score" in metrics
    
    def test_get_current_metrics(self, monitoring_system):
        """Test getting current metrics"""
        test_metrics = {"test_metric": 42.0}
        monitoring_system.current_metrics = test_metrics
        
        metrics = monitoring_system.get_current_metrics()
        
        assert metrics == test_metrics
    
    def test_get_metrics_history(self, monitoring_system):
        """Test getting metrics history"""
        # Add test data to history
        test_data = [
            {
                'timestamp': datetime.now() - timedelta(minutes=30),
                'metrics': {"cpu": 50.0}
            },
            {
                'timestamp': datetime.now() - timedelta(hours=2),
                'metrics': {"cpu": 60.0}
            }
        ]
        monitoring_system.metrics_history = test_data
        
        # Get last hour of metrics
        recent_metrics = monitoring_system.get_metrics_history(hours=1)
        
        assert len(recent_metrics) == 1  # Only the 30-minute old entry
        assert recent_metrics[0]['metrics']['cpu'] == 50.0
    
    def test_generate_metrics_report(self, monitoring_system):
        """Test metrics report generation"""
        # Add test data
        monitoring_system.metrics_history = [
            {
                'timestamp': datetime.now() - timedelta(minutes=30),
                'metrics': {
                    "system_metrics": {
                        "cpu_percent": 50.0,
                        "memory_percent": 60.0
                    }
                }
            }
        ]
        
        report = monitoring_system.generate_metrics_report()
        
        assert "report_timestamp" in report
        assert "data_points" in report
        assert "summary" in report
        assert report["data_points"] == 1


class TestBackupManager:
    """Test backup manager functionality"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return DeploymentConfig(
            environment="test",
            enable_backup=True
        )
    
    @pytest.fixture
    def backup_manager(self, config):
        """Create backup manager for testing"""
        return BackupManager(config)
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for testing"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    async def test_backup_configuration(self, backup_manager, temp_dir):
        """Test configuration backup"""
        # Create test config files
        config_dir = os.path.join(temp_dir, "config")
        os.makedirs(config_dir, exist_ok=True)
        
        test_config = {"test": "value"}
        with open(os.path.join(config_dir, "test.json"), "w") as f:
            json.dump(test_config, f)
        
        # Change to temp directory
        original_cwd = os.getcwd()
        os.chdir(temp_dir)
        
        try:
            result = await backup_manager._backup_configuration()
            
            assert result["status"] == "completed"
            assert isinstance(result["files_backed_up"], int)
            
        finally:
            os.chdir(original_cwd)
    
    def test_get_model_info_existing_directory(self, backup_manager, temp_dir):
        """Test getting model info for existing directory"""
        # Create test model directory
        model_dir = os.path.join(temp_dir, "models")
        os.makedirs(model_dir, exist_ok=True)
        
        # Create test model file
        test_model_path = os.path.join(model_dir, "test_model.safetensors")
        with open(test_model_path, "wb") as f:
            f.write(b"test model data")
        
        model_info = backup_manager._get_model_info(model_dir)
        
        assert model_info["model_count"] == 1
        assert model_info["files"][0]["filename"] == "test_model.safetensors"
        assert model_info["files"][0]["size_bytes"] > 0
    
    def test_get_model_info_nonexistent_directory(self, backup_manager):
        """Test getting model info for non-existent directory"""
        model_info = backup_manager._get_model_info("/nonexistent/path")
        
        assert model_info["status"] == "directory_not_found"
    
    async def test_backup_logs(self, backup_manager, temp_dir):
        """Test log backup"""
        # Create test log directory
        log_dir = os.path.join(temp_dir, "logs")
        os.makedirs(log_dir, exist_ok=True)
        
        # Create test log file
        with open(os.path.join(log_dir, "test.log"), "w") as f:
            f.write("test log content")
        
        # Change to temp directory
        original_cwd = os.getcwd()
        os.chdir(temp_dir)
        
        try:
            result = await backup_manager._backup_logs()
            
            assert result["status"] == "completed"
            assert isinstance(result["files_backed_up"], int)
            
        finally:
            os.chdir(original_cwd)
    
    async def test_backup_metrics(self, backup_manager, temp_dir):
        """Test metrics backup"""
        # Change to temp directory
        original_cwd = os.getcwd()
        os.chdir(temp_dir)
        
        try:
            result = await backup_manager._backup_metrics()
            
            assert result["status"] == "completed"
            assert "data_points_backed_up" in result
            
            # Check if backup file was created
            backup_path = "backups/metrics/metrics_backup.json"
            assert os.path.exists(backup_path)
            
        finally:
            os.chdir(original_cwd)
    
    def test_get_backup_history(self, backup_manager):
        """Test getting backup history"""
        test_backup = {
            "backup_id": "test_backup_123",
            "timestamp": datetime.now().isoformat(),
            "status": "completed"
        }
        backup_manager.backup_history = [test_backup]
        
        history = backup_manager.get_backup_history()
        
        assert len(history) == 1
        assert history[0]["backup_id"] == "test_backup_123"


class TestAlertingSystem:
    """Test alerting system functionality"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return DeploymentConfig(
            environment="test",
            alert_email="test@example.com",
            alert_webhook="https://webhook.example.com"
        )
    
    @pytest.fixture
    def alerting_system(self, config):
        """Create alerting system for testing"""
        return AlertingSystem(config)
    
    async def test_send_alert(self, alerting_system):
        """Test sending alert"""
        with patch.object(alerting_system, '_send_email_alert') as mock_email:
            with patch.object(alerting_system, '_send_webhook_alert') as mock_webhook:
                await alerting_system.send_alert(
                    severity="critical",
                    message="Test alert message",
                    component="test_component"
                )
                
                mock_email.assert_called_once()
                mock_webhook.assert_called_once()
                
                # Check alert history
                assert len(alerting_system.alert_history) == 1
                alert = alerting_system.alert_history[0]
                assert alert["severity"] == "critical"
                assert alert["message"] == "Test alert message"
                assert alert["component"] == "test_component"
    
    def test_get_alert_history(self, alerting_system):
        """Test getting alert history"""
        # Add test alerts
        test_alerts = [
            {
                "id": "alert_1",
                "timestamp": datetime.now().isoformat(),
                "severity": "warning",
                "message": "Test warning"
            },
            {
                "id": "alert_2",
                "timestamp": (datetime.now() - timedelta(hours=25)).isoformat(),
                "severity": "critical",
                "message": "Old alert"
            }
        ]
        alerting_system.alert_history = test_alerts
        
        # Get last 24 hours
        recent_alerts = alerting_system.get_alert_history(hours=24)
        
        assert len(recent_alerts) == 1  # Only the recent alert
        assert recent_alerts[0]["id"] == "alert_1"


class TestDeploymentScripts:
    """Test deployment script generation"""
    
    def test_create_deployment_scripts(self, temp_dir):
        """Test creating deployment scripts"""
        # Change to temp directory
        original_cwd = os.getcwd()
        os.chdir(temp_dir)
        
        try:
            create_deployment_scripts()
            
            # Check if scripts were created
            assert os.path.exists("deployment/docker-deploy.sh")
            assert os.path.exists("deployment/k8s-deployment.yaml")
            
            # Check script permissions
            docker_script_path = "deployment/docker-deploy.sh"
            assert os.access(docker_script_path, os.X_OK)
            
            # Check script content
            with open(docker_script_path, "r") as f:
                content = f.read()
                assert "docker build" in content
                assert "advanced-comfyui-workflows" in content
            
            # Check Kubernetes deployment
            with open("deployment/k8s-deployment.yaml", "r") as f:
                content = f.read()
                assert "apiVersion: apps/v1" in content
                assert "kind: Deployment" in content
                
        finally:
            os.chdir(original_cwd)


class TestIntegrationScenarios:
    """Test integration scenarios"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return DeploymentConfig(
            environment="test",
            min_vram_gb=1.0,
            min_ram_gb=1.0,
            min_storage_gb=1.0,
            enable_monitoring=True,
            enable_health_checks=True,
            enable_backup=False,
            metrics_collection_interval=1,
            health_check_interval=2
        )
    
    @pytest.fixture
    def deployment_manager(self, config):
        """Create deployment manager for integration testing"""
        return ProductionDeploymentManager(config)
    
    async def test_full_deployment_lifecycle(self, deployment_manager):
        """Test complete deployment lifecycle"""
        # Mock all validation methods to pass
        with patch.object(deployment_manager, '_validate_environment', return_value=True):
            with patch.object(deployment_manager, '_deploy_workflow_components'):
                with patch.object(deployment_manager, '_start_background_services'):
                    with patch.object(deployment_manager, '_validate_deployment', return_value=True):
                        with patch.object(deployment_manager, '_enable_production_traffic'):
                            
                            # Test deployment
                            success = await deployment_manager.deploy()
                            
                            assert success is True
                            assert deployment_manager.deployment_status.status == "healthy"
                            assert deployment_manager.running is True
                            
                            # Test shutdown
                            await deployment_manager.shutdown()
                            
                            assert deployment_manager.deployment_status.status == "shutdown"
                            assert deployment_manager.running is False
    
    async def test_deployment_failure_and_rollback(self, deployment_manager):
        """Test deployment failure and rollback"""
        # Mock validation to fail
        with patch.object(deployment_manager, '_validate_environment', return_value=False):
            with patch.object(deployment_manager, '_rollback_deployment') as mock_rollback:
                
                # Test deployment failure
                success = await deployment_manager.deploy()
                
                assert success is False
                assert deployment_manager.deployment_status.status == "failed"
                mock_rollback.assert_called_once()
    
    async def test_health_monitoring_integration(self, deployment_manager):
        """Test health monitoring integration"""
        await deployment_manager.health_checker.initialize()
        
        # Test health check execution
        health_results = await deployment_manager.get_health_status()
        
        assert isinstance(health_results, list)
        assert len(health_results) > 0
        
        # Check that all health check components are covered
        component_names = [r.component for r in health_results]
        expected_components = [
            "system_resources", "gpu_status", "model_availability",
            "workflow_engines", "storage_space", "network_connectivity",
            "memory_usage", "performance_metrics"
        ]
        
        for component in expected_components:
            assert component in component_names
    
    async def test_monitoring_metrics_integration(self, deployment_manager):
        """Test monitoring metrics integration"""
        await deployment_manager.monitoring_system.initialize()
        
        # Collect metrics
        with patch('psutil.cpu_percent', return_value=50.0):
            with patch('psutil.virtual_memory') as mock_memory:
                mock_memory.return_value.percent = 60.0
                mock_memory.return_value.available = 32 * (1024**3)
                mock_memory.return_value.total = 64 * (1024**3)
                
                # Test metrics collection
                metrics = deployment_manager.get_performance_metrics()
                
                # Should return current metrics (empty initially)
                assert isinstance(metrics, dict)
    
    async def test_error_handling_resilience(self, deployment_manager):
        """Test error handling and system resilience"""
        await deployment_manager.health_checker.initialize()
        
        # Test health check with simulated errors
        with patch.object(deployment_manager.health_checker, '_check_system_resources', 
                         side_effect=Exception("Simulated error")):
            
            health_results = await deployment_manager.health_checker.run_comprehensive_health_check()
            
            # Should still return results despite errors
            assert len(health_results) > 0
            
            # Find the system resources result
            system_result = next((r for r in health_results if r.component == "system_resources"), None)
            assert system_result is not None
            assert system_result.status == "critical"
            assert "Simulated error" in system_result.message


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "--tb=short"])