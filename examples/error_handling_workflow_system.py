#!/usr/bin/env python3
"""
Example: Error handling in complex multi-step workflows with proper error propagation
and recovery across interdependent steps.
"""

import sys
import logging
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum

# Add src directory to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from advanced_error_handling import (
    ResilienceManager,
    ErrorRecoveryManager,
    CircuitBreaker,
    RetryManager,
    CircuitBreakerConfig,
    RetryConfig,
    RetryStrategy,
    ErrorCategory,
    ErrorSeverity,
    ErrorInfo
)
from ai_error_handler import (
    AIErrorHandler,
    ErrorHandlerConfig,
    AIError,
    ErrorRecoveryResult
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkflowStep(Enum):
    """Workflow steps in a video generation pipeline"""
    VALIDATE_INPUT = "validate_input"
    PREPROCESS_VIDEO = "preprocess_video"
    GENERATE_AUDIO = "generate_audio"
    ENHANCE_VIDEO = "enhance_video"
    SYNCHRONIZE_AV = "synchronize_av"
    RENDER_OUTPUT = "render_output"
    QUALITY_CHECK = "quality_check"

class WorkflowStatus(Enum):
    """Status of workflow execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RECOVERING = "recovering"
    ROLLED_BACK = "rolled_back"

@dataclass
class StepResult:
    """Result of a workflow step execution"""
    step: WorkflowStep
    success: bool
    output_data: Optional[Any] = None
    execution_time_seconds: float = 0.0
    errors: List[str] = field(default_factory=list)
    retry_count: int = 0
    recovery_attempts: int = 0

@dataclass
class WorkflowContext:
    """Context shared across workflow steps"""
    input_video: Path
    output_video: Path
    temp_files: List[Path] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    step_results: Dict[WorkflowStep, StepResult] = field(default_factory=dict)

@dataclass
class WorkflowResult:
    """Overall result of workflow execution"""
    success: bool
    final_output: Optional[Path] = None
    total_execution_time: float = 0.0
    completed_steps: List[WorkflowStep] = field(default_factory=list)
    failed_steps: List[WorkflowStep] = field(default_factory=list)
    recovery_actions_taken: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    rollback_performed: bool = False

class WorkflowErrorHandler:
    """Handles complex multi-step workflow errors with recovery and rollback"""

    def __init__(self):
        self.resilience_manager = ResilienceManager()
        self.recovery_manager = ErrorRecoveryManager()
        self.ai_error_handler = AIErrorHandler(ErrorHandlerConfig(
            max_retries=3,
            enable_cpu_fallback=True,
            enable_quality_degradation=True
        ))

        # Circuit breakers for different workflow components
        self.circuit_breakers = self._setup_circuit_breakers()

        # Step dependencies and recovery procedures
        self.step_dependencies = self._setup_step_dependencies()
        self._setup_recovery_procedures()

        # Rollback procedures
        self.rollback_procedures: Dict[WorkflowStep, Callable] = {}

    def _setup_circuit_breakers(self) -> Dict[str, CircuitBreaker]:
        """Setup circuit breakers for workflow components"""
        breakers = {}

        breakers["video_processing"] = self.resilience_manager.create_circuit_breaker(
            "video_processing",
            CircuitBreakerConfig(failure_threshold=3, recovery_timeout=120)
        )

        breakers["audio_generation"] = self.resilience_manager.create_circuit_breaker(
            "audio_generation",
            CircuitBreakerConfig(failure_threshold=2, recovery_timeout=60)
        )

        breakers["ai_enhancement"] = self.resilience_manager.create_circuit_breaker(
            "ai_enhancement",
            CircuitBreakerConfig(failure_threshold=4, recovery_timeout=180)
        )

        return breakers

    def _setup_step_dependencies(self) -> Dict[WorkflowStep, List[WorkflowStep]]:
        """Define step dependencies for proper execution order and rollback"""
        return {
            WorkflowStep.VALIDATE_INPUT: [],
            WorkflowStep.PREPROCESS_VIDEO: [WorkflowStep.VALIDATE_INPUT],
            WorkflowStep.GENERATE_AUDIO: [WorkflowStep.VALIDATE_INPUT],
            WorkflowStep.ENHANCE_VIDEO: [WorkflowStep.PREPROCESS_VIDEO],
            WorkflowStep.SYNCHRONIZE_AV: [WorkflowStep.ENHANCE_VIDEO, WorkflowStep.GENERATE_AUDIO],
            WorkflowStep.RENDER_OUTPUT: [WorkflowStep.SYNCHRONIZE_AV],
            WorkflowStep.QUALITY_CHECK: [WorkflowStep.RENDER_OUTPUT]
        }

    def _setup_recovery_procedures(self):
        """Setup recovery procedures for different error types"""

        # Video processing recovery
        async def video_processing_recovery(error_info: ErrorInfo) -> bool:
            logger.info("Attempting video processing recovery...")
            # Clear temp files, reset video buffers
            await asyncio.sleep(0.2)
            return True

        # Audio generation recovery
        async def audio_generation_recovery(error_info: ErrorInfo) -> bool:
            logger.info("Attempting audio generation recovery...")
            # Clear audio cache, reset TTS engine
            await asyncio.sleep(0.1)
            return True

        # AI enhancement recovery
        async def ai_enhancement_recovery(error_info: ErrorInfo) -> bool:
            logger.info("Attempting AI enhancement recovery...")
            # Clear GPU cache, switch to CPU mode if needed
            await asyncio.sleep(0.3)
            return True

        # Network recovery
        async def network_recovery(error_info: ErrorInfo) -> bool:
            logger.info("Attempting network recovery...")
            # Retry connection, switch endpoints
            await asyncio.sleep(0.5)
            return True

        self.recovery_manager.register_recovery_procedure(ErrorCategory.VIDEO, video_processing_recovery)
        self.recovery_manager.register_recovery_procedure(ErrorCategory.AUDIO, audio_generation_recovery)
        self.recovery_manager.register_recovery_procedure(ErrorCategory.AI, ai_enhancement_recovery)
        self.recovery_manager.register_recovery_procedure(ErrorCategory.NETWORK, network_recovery)

    def register_rollback_procedure(self, step: WorkflowStep, rollback_func: Callable):
        """Register a rollback procedure for a workflow step"""
        self.rollback_procedures[step] = rollback_func

    async def execute_step_with_resilience(self, step: WorkflowStep, context: WorkflowContext) -> StepResult:
        """
        Execute a workflow step with comprehensive error handling

        Args:
            step: The workflow step to execute
            context: Shared workflow context

        Returns:
            StepResult with execution outcome
        """
        logger.info(f"Executing step: {step.value}")

        start_time = asyncio.get_event_loop().time()

        try:
            # Get appropriate circuit breaker
            breaker_key = self._get_circuit_breaker_for_step(step)
            breaker = self.circuit_breakers.get(breaker_key)

            # Execute step with circuit breaker if available
            if breaker:
                @breaker
                async def execute_with_breaker():
                    return await self._execute_step_logic(step, context)
                result_data = await execute_with_breaker()
            else:
                result_data = await self._execute_step_logic(step, context)

            execution_time = asyncio.get_event_loop().time() - start_time

            return StepResult(
                step=step,
                success=True,
                output_data=result_data,
                execution_time_seconds=execution_time
            )

        except Exception as e:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.warning(f"Step {step.value} failed: {e}")

            # Handle error with recovery attempts
            error_info = await self.resilience_manager.handle_error(e, {
                "component": "WorkflowSystem",
                "step": step.value,
                "context": context.metadata
            })

            # Attempt recovery
            recovery_success = await self.recovery_manager.attempt_recovery(error_info)

            if recovery_success:
                logger.info(f"Recovery successful for step {step.value}, retrying...")
                try:
                    # Retry the step once after recovery
                    result_data = await self._execute_step_logic(step, context)
                    return StepResult(
                        step=step,
                        success=True,
                        output_data=result_data,
                        execution_time_seconds=asyncio.get_event_loop().time() - start_time,
                        recovery_attempts=1
                    )
                except Exception as e2:
                    logger.error(f"Step {step.value} failed even after recovery: {e2}")

            return StepResult(
                step=step,
                success=False,
                execution_time_seconds=execution_time,
                errors=[str(e)],
                recovery_attempts=1 if recovery_success else 0
            )

    async def _execute_step_logic(self, step: WorkflowStep, context: WorkflowContext) -> Any:
        """Execute the actual logic for a workflow step"""
        # Simulate different step implementations with potential failures

        if step == WorkflowStep.VALIDATE_INPUT:
            if context.input_video.name == "invalid_video.mp4":
                raise ValueError("Invalid video format")
            await asyncio.sleep(0.1)
            return {"format": "mp4", "duration": 10.0}

        elif step == WorkflowStep.PREPROCESS_VIDEO:
            if "preprocess_fail" in str(context.input_video):
                raise AIError("Video preprocessing failed", category=ErrorCategory.VIDEO)
            await asyncio.sleep(0.5)
            temp_file = Path(f"temp/preprocessed_{context.input_video.name}")
            context.temp_files.append(temp_file)
            return {"preprocessed_path": temp_file}

        elif step == WorkflowStep.GENERATE_AUDIO:
            if "audio_fail" in str(context.input_video):
                raise AIError("Audio generation failed", category=ErrorCategory.AUDIO)
            await asyncio.sleep(0.8)
            temp_file = Path(f"temp/audio_{context.input_video.name}.wav")
            context.temp_files.append(temp_file)
            return {"audio_path": temp_file}

        elif step == WorkflowStep.ENHANCE_VIDEO:
            breaker = self.circuit_breakers["ai_enhancement"]
            @breaker
            async def enhance():
                if "enhance_fail" in str(context.input_video):
                    raise ResourceExhaustionError("GPU memory exhausted during enhancement", resource="VRAM")
                await asyncio.sleep(1.2)
                return {"enhanced": True}
            return await enhance()

        elif step == WorkflowStep.SYNCHRONIZE_AV:
            if "sync_fail" in str(context.input_video):
                raise AIError("A/V synchronization failed", category=ErrorCategory.AI)
            await asyncio.sleep(0.3)
            return {"synced": True}

        elif step == WorkflowStep.RENDER_OUTPUT:
            await asyncio.sleep(0.7)
            return {"rendered_path": context.output_video}

        elif step == WorkflowStep.QUALITY_CHECK:
            if "quality_fail" in str(context.input_video):
                raise ValueError("Quality check failed: output corrupted")
            await asyncio.sleep(0.2)
            return {"quality_score": 0.95}

        else:
            raise ValueError(f"Unknown step: {step}")

    def _get_circuit_breaker_for_step(self, step: WorkflowStep) -> Optional[str]:
        """Get appropriate circuit breaker key for a step"""
        mapping = {
            WorkflowStep.PREPROCESS_VIDEO: "video_processing",
            WorkflowStep.GENERATE_AUDIO: "audio_generation",
            WorkflowStep.ENHANCE_VIDEO: "ai_enhancement",
            WorkflowStep.SYNCHRONIZE_AV: "video_processing"
        }
        return mapping.get(step)

    async def execute_workflow_with_resilience(self, context: WorkflowContext) -> WorkflowResult:
        """
        Execute complete workflow with error handling, recovery, and rollback

        Args:
            context: Workflow context

        Returns:
            WorkflowResult with overall execution outcome
        """
        logger.info("Starting resilient workflow execution")
        start_time = asyncio.get_event_loop().time()

        result = WorkflowResult(success=False)
        executed_steps = []

        try:
            # Execute steps in dependency order
            for step in WorkflowStep:
                # Check if dependencies are satisfied
                dependencies = self.step_dependencies[step]
                failed_deps = [dep for dep in dependencies if dep not in result.completed_steps]

                if failed_deps:
                    error_msg = f"Cannot execute {step.value}: dependencies failed: {[d.value for d in failed_deps]}"
                    result.errors.append(error_msg)
                    result.failed_steps.append(step)
                    break

                # Execute step
                step_result = await self.execute_step_with_resilience(step, context)
                context.step_results[step] = step_result
                executed_steps.append(step)

                if step_result.success:
                    result.completed_steps.append(step)
                    logger.info(f"Step {step.value} completed successfully")
                else:
                    result.failed_steps.append(step)
                    result.errors.extend(step_result.errors)
                    logger.error(f"Step {step.value} failed: {step_result.errors}")

                    # Attempt step-level recovery before workflow rollback
                    if step_result.recovery_attempts < 2:
                        logger.info(f"Attempting additional recovery for {step.value}")
                        retry_result = await self.execute_step_with_resilience(step, context)
                        if retry_result.success:
                            result.completed_steps.append(step)
                            result.failed_steps.remove(step)
                            result.errors.clear()  # Clear previous errors
                            continue

                    # Step failed, trigger rollback
                    await self._perform_rollback(executed_steps, context)
                    result.rollback_performed = True
                    break

            # Check if workflow completed successfully
            if len(result.completed_steps) == len(WorkflowStep):
                result.success = True
                result.final_output = context.output_video
                logger.info("Workflow completed successfully")

        except Exception as e:
            result.errors.append(f"Workflow execution failed: {str(e)}")
            logger.error(f"Workflow execution failed: {e}")

            # Perform emergency rollback
            await self._perform_rollback(executed_steps, context)
            result.rollback_performed = True

        result.total_execution_time = asyncio.get_event_loop().time() - start_time
        return result

    async def _perform_rollback(self, executed_steps: List[WorkflowStep], context: WorkflowContext):
        """Perform rollback of completed steps"""
        logger.info("Performing workflow rollback")

        # Rollback in reverse order
        for step in reversed(executed_steps):
            if step in self.rollback_procedures:
                try:
                    await self.rollback_procedures[step](context)
                    logger.info(f"Rolled back step: {step.value}")
                except Exception as e:
                    logger.error(f"Rollback failed for {step.value}: {e}")
            else:
                logger.warning(f"No rollback procedure for {step.value}")

        # Clean up temp files
        for temp_file in context.temp_files:
            try:
                if temp_file.exists():
                    temp_file.unlink()
                    logger.info(f"Cleaned up temp file: {temp_file}")
            except Exception as e:
                logger.warning(f"Failed to clean up {temp_file}: {e}")

    def get_workflow_stats(self) -> Dict[str, Any]:
        """Get comprehensive workflow statistics"""
        return {
            "circuit_breakers": {name: cb.get_state() for name, cb in self.circuit_breakers.items()},
            "recovery_stats": self.recovery_manager.get_recovery_stats(),
            "resilience_status": self.resilience_manager.get_resilience_status()
        }

async def main():
    """Demonstrate workflow system error handling patterns"""
    print("=== Workflow System Error Handling Demo ===\n")

    handler = WorkflowErrorHandler()

    # Setup rollback procedures
    async def rollback_preprocessing(context):
        # Remove preprocessed files
        pass

    async def rollback_audio_generation(context):
        # Remove generated audio files
        pass

    handler.register_rollback_procedure(WorkflowStep.PREPROCESS_VIDEO, rollback_preprocessing)
    handler.register_rollback_procedure(WorkflowStep.GENERATE_AUDIO, rollback_audio_generation)

    # Test scenarios
    test_cases = [
        ("normal_video.mp4", "Normal workflow execution"),
        ("preprocess_fail.mp4", "Preprocessing failure"),
        ("enhance_fail.mp4", "AI enhancement failure"),
        ("quality_fail.mp4", "Quality check failure"),
    ]

    for video_file, description in test_cases:
        print(f"Testing: {description}")

        context = WorkflowContext(
            input_video=Path(f"input/{video_file}"),
            output_video=Path(f"output/{video_file}")
        )

        try:
            result = await handler.execute_workflow_with_resilience(context)

            if result.success:
                print("✅ Success")
                print(f"   Completed steps: {len(result.completed_steps)}/{len(WorkflowStep)}")
                print(f"   Total time: {result.total_execution_time:.1f}s")
            else:
                print("❌ Failed")
                print(f"   Completed steps: {len(result.completed_steps)}")
                print(f"   Failed steps: {[s.value for s in result.failed_steps]}")
                print(f"   Rollback performed: {result.rollback_performed}")
                print(f"   Errors: {result.errors[:2]}")  # Show first 2 errors

        except Exception as e:
            print(f"❌ Unexpected error: {e}")

        print()

    # Display final statistics
    print("=== Workflow Statistics ===")
    stats = handler.get_workflow_stats()

    print("Circuit Breaker States:")
    for name, state in stats["circuit_breakers"].items():
        print(f"  {name}: {state['state']} (failures: {state['failure_count']})")

    print(f"Recovery Attempts: {sum(sum(counts.values()) for counts in stats['recovery_stats'].values())}")

if __name__ == "__main__":
    asyncio.run(main())