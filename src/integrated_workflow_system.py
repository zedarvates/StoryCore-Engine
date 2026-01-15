"""
Integrated Workflow System - Combines Security and Resilience

This module provides a unified system that integrates:
- Security validation
- Error handling and resilience
- Workflow execution
- Monitoring and analytics

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union

from src.security_validation_system import (
    SecurityValidationSystem,
    SecurityLevel,
    ValidationResult,
)
from src.error_handling_resilience import (
    ErrorHandlingSystem,
    ErrorInfo,
    ErrorCategory,
    ErrorSeverity,
)


# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class WorkflowRequest:
    """Unified workflow request"""
    workflow_type: str
    user_id: Optional[str] = None
    prompt: Optional[str] = None
    image_path: Optional[str] = None
    video_path: Optional[str] = None
    trajectory: Optional[List[Dict]] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowResult:
    """Unified workflow result"""
    success: bool
    result: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0
    degradation_level: str = "full"
    retry_count: int = 0
    fallback_used: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


class IntegratedWorkflowSystem:
    """
    Integrated system combining security, resilience, and workflow execution
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        
        # Initialize subsystems
        self.security = SecurityValidationSystem(self.config.get('security', {}))
        self.resilience = ErrorHandlingSystem(self.config.get('resilience', {}))
        
        # Workflow registry
        self.workflows: Dict[str, Callable] = {}
        
        # Execution statistics
        self.execution_stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'security_blocked': 0,
            'resilience_recovered': 0
        }
        
        logger.info("Integrated Workflow System initialized")
    
    def register_workflow(self, workflow_type: str, handler: Callable):
        """Register a workflow handler"""
        self.workflows[workflow_type] = handler
        logger.info(f"Registered workflow: {workflow_type}")
    
    async def execute_workflow(self, request: WorkflowRequest) -> WorkflowResult:
        """
        Execute workflow with integrated security and resilience
        
        This is the main entry point that combines:
        1. Security validation
        2. Resilience patterns (retry, circuit breaker, fallback)
        3. Workflow execution
        4. Error handling and recovery
        5. Monitoring and analytics
        """
        start_time = datetime.now()
        self.execution_stats['total_requests'] += 1
        
        try:
            # Step 1: Security Validation
            validation_result = await self._validate_request(request)
            if not validation_result['is_valid']:
                self.execution_stats['security_blocked'] += 1
                return WorkflowResult(
                    success=False,
                    error=f"Security validation failed: {validation_result['message']}",
                    execution_time=self._calculate_execution_time(start_time)
                )
            
            # Step 2: Get workflow handler
            handler = self.workflows.get(request.workflow_type)
            if not handler:
                return WorkflowResult(
                    success=False,
                    error=f"Unknown workflow type: {request.workflow_type}",
                    execution_time=self._calculate_execution_time(start_time)
                )
            
            # Step 3: Execute with resilience
            result = await self._execute_with_resilience(handler, request)
            
            # Step 4: Record success
            self.execution_stats['successful_requests'] += 1
            
            # Step 5: Log execution
            self.security.audit_logger.log_workflow_execution(
                user_id=request.user_id,
                workflow_type=request.workflow_type,
                success=True,
                details={
                    'execution_time': result.execution_time,
                    'degradation_level': result.degradation_level,
                    'retry_count': result.retry_count
                }
            )
            
            return result
            
        except Exception as e:
            # Record failure
            self.execution_stats['failed_requests'] += 1
            
            # Log error
            self.security.audit_logger.log_workflow_execution(
                user_id=request.user_id,
                workflow_type=request.workflow_type,
                success=False,
                details={'error': str(e)}
            )
            
            # Create error info
            error_info = ErrorInfo(
                timestamp=datetime.now(),
                error_type=type(e).__name__,
                error_message=str(e),
                category=self._categorize_error(e),
                severity=self._assess_severity(e)
            )
            self.resilience.error_analytics.record_error(error_info)
            
            return WorkflowResult(
                success=False,
                error=str(e),
                execution_time=self._calculate_execution_time(start_time),
                metadata={'error_category': error_info.category.value}
            )
    
    async def _validate_request(self, request: WorkflowRequest) -> Dict[str, Any]:
        """Validate request using security system"""
        # Build validation request
        validation_request = {
            'workflow_type': request.workflow_type
        }
        
        if request.prompt:
            validation_request['prompt'] = request.prompt
        if request.image_path:
            validation_request['image_path'] = request.image_path
        if request.video_path:
            validation_request['video_path'] = request.video_path
        if request.trajectory:
            validation_request['trajectory'] = request.trajectory
        
        # Validate
        is_valid, results = self.security.validate_workflow_request(
            validation_request,
            request.user_id
        )
        
        if not is_valid:
            error_messages = [r.message for r in results if not r.is_valid]
            return {
                'is_valid': False,
                'message': '; '.join(error_messages),
                'results': results
            }
        
        return {
            'is_valid': True,
            'message': 'Validation passed',
            'results': results
        }
    
    async def _execute_with_resilience(self, handler: Callable, 
                                      request: WorkflowRequest) -> WorkflowResult:
        """Execute workflow with resilience patterns"""
        start_time = datetime.now()
        retry_count = 0
        fallback_used = False
        
        # Get circuit breaker for this workflow type
        circuit_breaker_name = f"workflow_{request.workflow_type}"
        
        # Check if we should use fallback chain
        fallback_chain_name = f"fallback_{request.workflow_type}"
        if fallback_chain_name in self.resilience.fallback_chains:
            # Execute with fallback chain
            try:
                result = await self.resilience.fallback_chains[fallback_chain_name].execute(request)
                fallback_used = True
            except Exception as e:
                # All fallbacks failed, try direct execution with retry
                result = await self._execute_with_retry(handler, request)
                retry_count = getattr(result, 'retry_count', 0)
        else:
            # Execute with retry and circuit breaker
            result = await self.resilience.execute_with_resilience(
                handler,
                request,
                circuit_breaker_name=circuit_breaker_name,
                enable_retry=True
            )
        
        # Get current degradation level
        degradation_level = self.resilience.graceful_degradation.current_level
        
        # Adjust parameters if degraded
        if degradation_level != 'full' and hasattr(result, 'parameters'):
            result.parameters = self.resilience.graceful_degradation.adjust_parameters(
                result.parameters
            )
        
        execution_time = self._calculate_execution_time(start_time)
        
        return WorkflowResult(
            success=True,
            result=result,
            execution_time=execution_time,
            degradation_level=degradation_level,
            retry_count=retry_count,
            fallback_used=fallback_used
        )
    
    async def _execute_with_retry(self, handler: Callable, 
                                  request: WorkflowRequest) -> Any:
        """Execute with retry mechanism"""
        return await self.resilience.retry_mechanism.execute_with_retry(
            handler,
            request
        )
    
    def _categorize_error(self, exception: Exception) -> ErrorCategory:
        """Categorize error"""
        if isinstance(exception, (ConnectionError, TimeoutError)):
            return ErrorCategory.NETWORK
        elif isinstance(exception, MemoryError):
            return ErrorCategory.MEMORY
        elif isinstance(exception, ValueError):
            return ErrorCategory.VALIDATION
        else:
            return ErrorCategory.UNKNOWN
    
    def _assess_severity(self, exception: Exception) -> ErrorSeverity:
        """Assess error severity"""
        if isinstance(exception, (MemoryError, SystemError)):
            return ErrorSeverity.CRITICAL
        elif isinstance(exception, (ConnectionError, TimeoutError)):
            return ErrorSeverity.HIGH
        elif isinstance(exception, ValueError):
            return ErrorSeverity.MEDIUM
        else:
            return ErrorSeverity.LOW
    
    def _calculate_execution_time(self, start_time: datetime) -> float:
        """Calculate execution time in seconds"""
        return (datetime.now() - start_time).total_seconds()
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        return {
            'execution_stats': self.execution_stats,
            'security_health': {
                'audit_log_count': len(self.security.audit_logger.get_audit_logs()),
                'access_control_users': len(self.security.access_control.user_levels)
            },
            'resilience_health': self.resilience.get_system_health(),
            'timestamp': datetime.now().isoformat()
        }
    
    def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive system report"""
        return {
            'system_status': self.get_system_status(),
            'security_report': self.security.get_security_report(),
            'resilience_report': self.resilience.generate_resilience_report(),
            'execution_summary': {
                'total_requests': self.execution_stats['total_requests'],
                'success_rate': (
                    self.execution_stats['successful_requests'] / 
                    self.execution_stats['total_requests']
                    if self.execution_stats['total_requests'] > 0 else 0
                ),
                'security_block_rate': (
                    self.execution_stats['security_blocked'] / 
                    self.execution_stats['total_requests']
                    if self.execution_stats['total_requests'] > 0 else 0
                ),
                'resilience_recovery_rate': (
                    self.execution_stats['resilience_recovered'] / 
                    self.execution_stats['failed_requests']
                    if self.execution_stats['failed_requests'] > 0 else 0
                )
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def setup_video_workflow(self, video_handler: Callable):
        """Setup video generation workflow with fallbacks"""
        # Register primary workflow
        self.register_workflow('advanced_video', video_handler)
        
        # Create fallback chain
        fallback_chain = self.resilience.get_fallback_chain('fallback_advanced_video')
        
        # Add fallbacks (to be implemented by specific engines)
        # fallback_chain.add_fallback(high_quality_video)
        # fallback_chain.add_fallback(standard_quality_video)
        # fallback_chain.add_fallback(basic_quality_video)
        
        # Create circuit breaker
        self.resilience.get_circuit_breaker('workflow_advanced_video')
        
        logger.info("Video workflow configured with security and resilience")
    
    def setup_image_workflow(self, image_handler: Callable):
        """Setup image generation workflow with fallbacks"""
        # Register primary workflow
        self.register_workflow('advanced_image', image_handler)
        
        # Create fallback chain
        fallback_chain = self.resilience.get_fallback_chain('fallback_advanced_image')
        
        # Create circuit breaker
        self.resilience.get_circuit_breaker('workflow_advanced_image')
        
        logger.info("Image workflow configured with security and resilience")
    
    def set_user_access_level(self, user_id: str, level: SecurityLevel):
        """Set user access level"""
        self.security.access_control.set_user_level(user_id, level)
    
    def enable_graceful_degradation(self, enable: bool = True):
        """Enable or disable graceful degradation"""
        if not enable:
            # Reset to full level
            while self.resilience.graceful_degradation.current_level != 'full':
                self.resilience.graceful_degradation.restore()


# Example usage
if __name__ == "__main__":
    async def example_usage():
        # Initialize integrated system
        system = IntegratedWorkflowSystem()
        
        # Set up user access
        system.set_user_access_level('user123', SecurityLevel.AUTHENTICATED)
        
        # Register a sample workflow
        async def sample_video_workflow(request: WorkflowRequest):
            # Simulate video generation
            await asyncio.sleep(0.1)
            return {'video_path': 'output.mp4', 'duration': 5}
        
        system.setup_video_workflow(sample_video_workflow)
        
        # Create request
        request = WorkflowRequest(
            workflow_type='advanced_video',
            user_id='user123',
            prompt='A beautiful sunset over the ocean',
            parameters={'resolution': '720p', 'duration': 5}
        )
        
        # Execute workflow
        result = await system.execute_workflow(request)
        
        print(f"Success: {result.success}")
        print(f"Execution time: {result.execution_time:.2f}s")
        print(f"Degradation level: {result.degradation_level}")
        
        # Get system status
        status = system.get_system_status()
        print(f"\nSystem Status:")
        print(f"  Total requests: {status['execution_stats']['total_requests']}")
        print(f"  Successful: {status['execution_stats']['successful_requests']}")
        print(f"  Failed: {status['execution_stats']['failed_requests']}")
        
        # Generate comprehensive report
        report = system.generate_comprehensive_report()
        print(f"\nSuccess rate: {report['execution_summary']['success_rate']:.1%}")
    
    asyncio.run(example_usage())
