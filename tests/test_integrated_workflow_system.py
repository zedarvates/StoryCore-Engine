"""
Comprehensive tests for Integrated Workflow System

Tests the integration of security, resilience, and workflow execution.

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import asyncio
import pytest
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from src.integrated_workflow_system import (
    IntegratedWorkflowSystem,
    WorkflowRequest,
    WorkflowResult,
)
from src.security_validation_system import SecurityLevel
from src.error_handling_resilience import ErrorCategory, ErrorSeverity


class TestWorkflowRequest:
    """Test WorkflowRequest dataclass"""
    
    def test_workflow_request_creation(self):
        """Test creating a workflow request"""
        request = WorkflowRequest(
            workflow_type='test_workflow',
            user_id='user123',
            prompt='Test prompt',
            parameters={'key': 'value'}
        )
        
        assert request.workflow_type == 'test_workflow'
        assert request.user_id == 'user123'
        assert request.prompt == 'Test prompt'
        assert request.parameters == {'key': 'value'}
    
    def test_workflow_request_defaults(self):
        """Test workflow request default values"""
        request = WorkflowRequest(workflow_type='test')
        
        assert request.user_id is None
        assert request.prompt is None
        assert request.image_path is None
        assert request.video_path is None
        assert request.trajectory is None
        assert request.parameters == {}
        assert request.metadata == {}


class TestWorkflowResult:
    """Test WorkflowResult dataclass"""
    
    def test_workflow_result_success(self):
        """Test successful workflow result"""
        result = WorkflowResult(
            success=True,
            result={'output': 'test.mp4'},
            execution_time=1.5
        )
        
        assert result.success is True
        assert result.result == {'output': 'test.mp4'}
        assert result.execution_time == 1.5
        assert result.error is None
    
    def test_workflow_result_failure(self):
        """Test failed workflow result"""
        result = WorkflowResult(
            success=False,
            error='Test error',
            execution_time=0.5
        )
        
        assert result.success is False
        assert result.error == 'Test error'
        assert result.result is None


class TestIntegratedWorkflowSystem:
    """Test IntegratedWorkflowSystem"""
    
    @pytest.fixture
    def system(self):
        """Create integrated system for testing"""
        return IntegratedWorkflowSystem()
    
    def _register_workflow_with_permissions(self, system, workflow_type, handler):
        """Helper to register workflow with proper permissions"""
        system.register_workflow(workflow_type, handler)
        system.security.access_control.add_custom_permission(
            workflow_type,
            {SecurityLevel.AUTHENTICATED, SecurityLevel.ADMIN}
        )
    
    def test_system_initialization(self, system):
        """Test system initialization"""
        assert system.security is not None
        assert system.resilience is not None
        assert system.workflows == {}
        assert system.execution_stats['total_requests'] == 0
    
    def test_register_workflow(self, system):
        """Test workflow registration"""
        async def test_handler(request):
            return {'result': 'success'}
        
        system.register_workflow('test_workflow', test_handler)
        
        assert 'test_workflow' in system.workflows
        assert system.workflows['test_workflow'] == test_handler
    
    @pytest.mark.asyncio
    async def test_execute_workflow_success(self, system):
        """Test successful workflow execution"""
        # Register workflow
        async def test_handler(request):
            return {'output': 'test.mp4'}
        
        self._register_workflow_with_permissions(system, 'test_workflow', test_handler)
        
        # Set user access level
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        # Create request
        request = WorkflowRequest(
            workflow_type='test_workflow',
            user_id='user123',
            prompt='Test prompt'
        )
        
        # Execute
        result = await system.execute_workflow(request)
        
        assert result.success is True
        assert result.error is None
        assert result.execution_time >= 0  # Allow 0 for very fast execution
        assert system.execution_stats['total_requests'] == 1
        assert system.execution_stats['successful_requests'] == 1
    
    @pytest.mark.asyncio
    async def test_execute_workflow_security_blocked(self, system):
        """Test workflow blocked by security"""
        # Register workflow
        async def test_handler(request):
            return {'output': 'test.mp4'}
        
        system.register_workflow('test_workflow', test_handler)
        
        # Create request with invalid prompt (too long)
        request = WorkflowRequest(
            workflow_type='test_workflow',
            user_id='user123',
            prompt='x' * 20000  # Exceeds max length
        )
        
        # Execute
        result = await system.execute_workflow(request)
        
        assert result.success is False
        assert 'Security validation failed' in result.error
        assert system.execution_stats['security_blocked'] == 1
    
    @pytest.mark.asyncio
    async def test_execute_workflow_unknown_type(self, system):
        """Test execution with unknown workflow type"""
        request = WorkflowRequest(
            workflow_type='unknown_workflow',
            user_id='user123'
        )
        
        result = await system.execute_workflow(request)
        
        assert result.success is False
        # Should fail with security validation (unknown resource)
        assert 'Security validation failed' in result.error or 'Unknown' in result.error
    
    @pytest.mark.asyncio
    async def test_execute_workflow_with_retry(self, system):
        """Test workflow execution with retry"""
        # Create handler that fails first time with retryable error
        call_count = 0
        
        async def flaky_handler(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionError("Temporary network failure")  # Retryable error
            return {'output': 'success'}
        
        self._register_workflow_with_permissions(system, 'flaky_workflow', flaky_handler)
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        request = WorkflowRequest(
            workflow_type='flaky_workflow',
            user_id='user123',
            prompt='Test'
        )
        
        result = await system.execute_workflow(request)
        
        # Should succeed after retry
        assert result.success is True
        assert call_count >= 2
    
    @pytest.mark.asyncio
    async def test_execute_workflow_with_error(self, system):
        """Test workflow execution with error"""
        async def error_handler(request):
            raise ValueError("Test error")
        
        self._register_workflow_with_permissions(system, 'error_workflow', error_handler)
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        request = WorkflowRequest(
            workflow_type='error_workflow',
            user_id='user123',
            prompt='Test'
        )
        
        result = await system.execute_workflow(request)
        
        assert result.success is False
        assert 'Test error' in result.error
        assert system.execution_stats['failed_requests'] == 1
    
    def test_get_system_status(self, system):
        """Test getting system status"""
        status = system.get_system_status()
        
        assert 'execution_stats' in status
        assert 'security_health' in status
        assert 'resilience_health' in status
        assert 'timestamp' in status
    
    def test_generate_comprehensive_report(self, system):
        """Test generating comprehensive report"""
        report = system.generate_comprehensive_report()
        
        assert 'system_status' in report
        assert 'security_report' in report
        assert 'resilience_report' in report
        assert 'execution_summary' in report
        assert 'timestamp' in report
    
    def test_setup_video_workflow(self, system):
        """Test video workflow setup"""
        async def video_handler(request):
            return {'video': 'output.mp4'}
        
        system.setup_video_workflow(video_handler)
        
        assert 'advanced_video' in system.workflows
        assert 'fallback_advanced_video' in system.resilience.fallback_chains
    
    def test_setup_image_workflow(self, system):
        """Test image workflow setup"""
        async def image_handler(request):
            return {'image': 'output.png'}
        
        system.setup_image_workflow(image_handler)
        
        assert 'advanced_image' in system.workflows
        assert 'fallback_advanced_image' in system.resilience.fallback_chains
    
    def test_set_user_access_level(self, system):
        """Test setting user access level"""
        system.set_user_access_level('user123', SecurityLevel.ADMIN)
        
        assert system.security.access_control.user_levels['user123'] == SecurityLevel.ADMIN
    
    def test_enable_graceful_degradation(self, system):
        """Test enabling/disabling graceful degradation"""
        # Degrade system
        system.resilience.graceful_degradation.degrade("Test degradation")
        assert system.resilience.graceful_degradation.current_level != 'full'
        
        # Disable degradation (should restore to full)
        system.enable_graceful_degradation(False)
        assert system.resilience.graceful_degradation.current_level == 'full'


class TestIntegrationScenarios:
    """Test complete integration scenarios"""
    
    @pytest.fixture
    def system(self):
        """Create configured system"""
        config = {
            'security': {
                'max_prompt_length': 10000,
                'enable_audit_logging': True
            },
            'resilience': {
                'enable_retry': True,
                'enable_circuit_breaker': True
            }
        }
        return IntegratedWorkflowSystem(config)
    
    def _register_workflow_with_permissions(self, system, workflow_type, handler):
        """Helper to register workflow with proper permissions"""
        system.register_workflow(workflow_type, handler)
        system.security.access_control.add_custom_permission(
            workflow_type,
            {SecurityLevel.AUTHENTICATED, SecurityLevel.ADMIN}
        )
    
    @pytest.mark.asyncio
    async def test_complete_video_workflow(self, system):
        """Test complete video generation workflow"""
        # Setup
        async def video_generator(request):
            await asyncio.sleep(0.01)  # Simulate processing
            return {
                'video_path': 'output.mp4',
                'duration': 5,
                'resolution': request.parameters.get('resolution', '720p')
            }
        
        system.setup_video_workflow(video_generator)
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        # Execute
        request = WorkflowRequest(
            workflow_type='advanced_video',
            user_id='user123',
            prompt='A beautiful sunset over the ocean',
            parameters={'resolution': '1080p', 'duration': 5}
        )
        
        result = await system.execute_workflow(request)
        
        # Verify
        assert result.success is True
        assert result.result['video_path'] == 'output.mp4'
        assert result.result['resolution'] == '1080p'
        assert result.execution_time > 0
    
    @pytest.mark.asyncio
    async def test_multiple_concurrent_workflows(self, system):
        """Test multiple concurrent workflow executions"""
        async def test_handler(request):
            await asyncio.sleep(0.01)
            return {'result': f"processed_{request.user_id}"}
        
        self._register_workflow_with_permissions(system, 'test_workflow', test_handler)
        
        # Set up multiple users
        for i in range(5):
            system.set_user_access_level(f'user{i}', SecurityLevel.AUTHENTICATED)
        
        # Create concurrent requests
        requests = [
            WorkflowRequest(
                workflow_type='test_workflow',
                user_id=f'user{i}',
                prompt=f'Test {i}'
            )
            for i in range(5)
        ]
        
        # Execute concurrently
        results = await asyncio.gather(*[
            system.execute_workflow(req) for req in requests
        ])
        
        # Verify all succeeded
        assert all(r.success for r in results)
        assert system.execution_stats['total_requests'] == 5
        assert system.execution_stats['successful_requests'] == 5
    
    @pytest.mark.asyncio
    async def test_workflow_with_fallback(self, system):
        """Test workflow with fallback chain"""
        # Create handlers
        async def primary_handler(request):
            raise Exception("Primary failed")
        
        async def fallback_handler(request):
            return {'result': 'fallback_success'}
        
        # Setup
        self._register_workflow_with_permissions(system, 'test_workflow', primary_handler)
        fallback_chain = system.resilience.get_fallback_chain('fallback_test_workflow')
        fallback_chain.add_fallback(primary_handler)
        fallback_chain.add_fallback(fallback_handler)
        
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        # Execute
        request = WorkflowRequest(
            workflow_type='test_workflow',
            user_id='user123',
            prompt='Test'
        )
        
        result = await system.execute_workflow(request)
        
        # Should succeed with fallback
        assert result.success is True
        assert result.fallback_used is True
    
    @pytest.mark.asyncio
    async def test_security_and_resilience_integration(self, system):
        """Test security and resilience working together"""
        call_count = 0
        
        async def handler(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionError("Temporary network failure")  # Retryable error
            return {'result': 'success'}
        
        self._register_workflow_with_permissions(system, 'test_workflow', handler)
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        # Valid request that will fail first time
        request = WorkflowRequest(
            workflow_type='test_workflow',
            user_id='user123',
            prompt='Valid prompt'
        )
        
        result = await system.execute_workflow(request)
        
        # Should pass security and succeed after retry
        assert result.success is True
        assert call_count >= 2
        
        # Invalid request (too long prompt)
        invalid_request = WorkflowRequest(
            workflow_type='test_workflow',
            user_id='user123',
            prompt='x' * 20000
        )
        
        result = await system.execute_workflow(invalid_request)
        
        # Should be blocked by security (no retry attempted)
        assert result.success is False
        assert 'Security validation failed' in result.error


class TestErrorHandling:
    """Test error handling and categorization"""
    
    @pytest.fixture
    def system(self):
        """Create system for testing"""
        return IntegratedWorkflowSystem()
    
    def test_categorize_error_network(self, system):
        """Test network error categorization"""
        error = ConnectionError("Network error")
        category = system._categorize_error(error)
        assert category == ErrorCategory.NETWORK
    
    def test_categorize_error_memory(self, system):
        """Test memory error categorization"""
        error = MemoryError("Out of memory")
        category = system._categorize_error(error)
        assert category == ErrorCategory.MEMORY
    
    def test_categorize_error_validation(self, system):
        """Test validation error categorization"""
        error = ValueError("Invalid value")
        category = system._categorize_error(error)
        assert category == ErrorCategory.VALIDATION
    
    def test_assess_severity_critical(self, system):
        """Test critical severity assessment"""
        error = MemoryError("Out of memory")
        severity = system._assess_severity(error)
        assert severity == ErrorSeverity.CRITICAL
    
    def test_assess_severity_high(self, system):
        """Test high severity assessment"""
        error = ConnectionError("Connection failed")
        severity = system._assess_severity(error)
        assert severity == ErrorSeverity.HIGH
    
    def test_assess_severity_medium(self, system):
        """Test medium severity assessment"""
        error = ValueError("Invalid value")
        severity = system._assess_severity(error)
        assert severity == ErrorSeverity.MEDIUM


class TestPerformance:
    """Test system performance"""
    
    @pytest.fixture
    def system(self):
        """Create system for testing"""
        return IntegratedWorkflowSystem()
    
    def _register_workflow_with_permissions(self, system, workflow_type, handler):
        """Helper to register workflow with proper permissions"""
        system.register_workflow(workflow_type, handler)
        system.security.access_control.add_custom_permission(
            workflow_type,
            {SecurityLevel.AUTHENTICATED, SecurityLevel.ADMIN}
        )
    
    @pytest.mark.asyncio
    async def test_execution_overhead(self, system):
        """Test that integration overhead is minimal"""
        async def fast_handler(request):
            return {'result': 'success'}
        
        self._register_workflow_with_permissions(system, 'fast_workflow', fast_handler)
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        request = WorkflowRequest(
            workflow_type='fast_workflow',
            user_id='user123',
            prompt='Test'
        )
        
        result = await system.execute_workflow(request)
        
        # Overhead should be < 30ms
        assert result.execution_time < 0.03
    
    @pytest.mark.asyncio
    async def test_high_throughput(self, system):
        """Test system can handle high throughput"""
        async def handler(request):
            return {'result': 'success'}
        
        self._register_workflow_with_permissions(system, 'test_workflow', handler)
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        # Execute 100 requests
        requests = [
            WorkflowRequest(
                workflow_type='test_workflow',
                user_id='user123',
                prompt=f'Test {i}'
            )
            for i in range(100)
        ]
        
        start_time = datetime.now()
        results = await asyncio.gather(*[
            system.execute_workflow(req) for req in requests
        ])
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # All should succeed
        assert all(r.success for r in results)
        assert system.execution_stats['total_requests'] == 100
        
        # Should complete in reasonable time (< 5 seconds)
        assert execution_time < 5.0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
