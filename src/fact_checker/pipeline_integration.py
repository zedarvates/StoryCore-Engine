"""
StoryCore Pipeline Integration Module

This module provides integration hooks for the fact-checking system to work
seamlessly with the StoryCore-Engine pipeline. It supports:
- Hook execution at before_generate, after_generate, and on_publish stages
- Asynchronous non-blocking execution
- Data Contract v1 compliant storage
- Warning event emission for high-risk content
- Configurable automatic vs manual verification modes

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
"""

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional, Literal, Callable
from dataclasses import dataclass, asdict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from .models import Configuration, Report
from .fact_checker_command import FactCheckerCommand


logger = logging.getLogger(__name__)


# Type aliases
HookStage = Literal["before_generate", "after_generate", "on_publish"]
VerificationMode = Literal["automatic", "manual"]
HighRiskAction = Literal["warn", "block", "ignore"]


@dataclass
class HookConfig:
    """
    Configuration for a pipeline hook.
    
    Attributes:
        enabled: Whether the hook is enabled
        mode: Verification mode (text/video/auto)
        blocking: Whether hook should block pipeline execution
        on_high_risk: Action to take on high-risk detection
        confidence_threshold: Minimum confidence score
        store_results: Whether to store results in Data Contract v1
    """
    enabled: bool = True
    mode: str = "auto"
    blocking: bool = False
    on_high_risk: HighRiskAction = "warn"
    confidence_threshold: Optional[float] = None
    store_results: bool = True


@dataclass
class HookResult:
    """
    Result of hook execution.
    
    Attributes:
        status: Execution status (processing/completed/failed)
        hook_stage: Which hook was executed
        processing_time_ms: Time taken for hook execution
        verification_started: Whether verification was started
        should_block: Whether pipeline should be blocked
        warning_event: Optional warning event data
        error: Optional error message
    """
    status: str
    hook_stage: str
    processing_time_ms: int
    verification_started: bool
    should_block: bool = False
    warning_event: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class WarningEvent:
    """
    Warning event emitted for high-risk content.
    
    Attributes:
        type: Event type (always "warning")
        risk_level: Risk level detected
        summary: Summary of issues
        timestamp: Event timestamp
        hook_stage: Stage where warning was triggered
        details: Additional details
    """
    type: str = "warning"
    risk_level: str = "high"
    summary: str = ""
    timestamp: str = ""
    hook_stage: str = ""
    details: Dict[str, Any] = None


class PipelineIntegration:
    """
    Manages integration between fact-checking system and StoryCore pipeline.
    
    This class provides:
    - Hook handlers for pipeline stages
    - Asynchronous execution management
    - Data Contract v1 storage
    - Warning event emission
    - Configuration management for hooks
    """
    
    def __init__(
        self,
        config: Optional[Configuration] = None,
        project_path: Optional[Path] = None
    ):
        """
        Initialize pipeline integration.
        
        Args:
            config: Fact-checking configuration
            project_path: Path to StoryCore project directory
        """
        self.config = config or Configuration()
        self.project_path = project_path
        self.fact_checker = FactCheckerCommand(self.config)
        
        # Hook configurations
        self.hook_configs: Dict[HookStage, HookConfig] = {
            "before_generate": HookConfig(),
            "after_generate": HookConfig(),
            "on_publish": HookConfig(blocking=True, on_high_risk="block")
        }
        
        # Thread pool for async execution
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        # Event callbacks
        self.event_callbacks: Dict[str, Callable] = {}
        
        logger.info("Pipeline integration initialized")
    
    def configure_hook(
        self,
        hook_stage: HookStage,
        config: HookConfig
    ) -> None:
        """
        Configure a specific pipeline hook.
        
        Args:
            hook_stage: Stage to configure
            config: Hook configuration
        """
        self.hook_configs[hook_stage] = config
        logger.info(f"Configured {hook_stage} hook: {config}")
    
    def register_event_callback(
        self,
        event_type: str,
        callback: Callable[[Dict[str, Any]], None]
    ) -> None:
        """
        Register a callback for pipeline events.
        
        Args:
            event_type: Type of event (e.g., "warning")
            callback: Callback function to invoke
        """
        self.event_callbacks[event_type] = callback
        logger.info(f"Registered callback for {event_type} events")
    
    async def execute_hook(
        self,
        hook_stage: HookStage,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> HookResult:
        """
        Execute a pipeline hook asynchronously.
        
        This method:
        1. Returns immediately (within 100ms) for non-blocking hooks
        2. Starts verification in background
        3. Stores results when complete
        4. Emits warning events for high-risk content
        
        Args:
            hook_stage: Which hook to execute
            content: Content to verify
            metadata: Optional metadata about the content
            
        Returns:
            HookResult with execution status
        """
        start_time = time.time()
        
        # Get hook configuration
        hook_config = self.hook_configs.get(hook_stage)
        if not hook_config or not hook_config.enabled:
            logger.debug(f"{hook_stage} hook is disabled")
            return HookResult(
                status="skipped",
                hook_stage=hook_stage,
                processing_time_ms=0,
                verification_started=False
            )
        
        try:
            # For non-blocking hooks, start async verification
            if not hook_config.blocking:
                # Start verification in background
                asyncio.create_task(
                    self._verify_content_async(
                        content=content,
                        hook_stage=hook_stage,
                        hook_config=hook_config,
                        metadata=metadata
                    )
                )
                
                processing_time_ms = int((time.time() - start_time) * 1000)
                
                logger.info(
                    f"{hook_stage} hook executed (non-blocking) in {processing_time_ms}ms"
                )
                
                return HookResult(
                    status="processing",
                    hook_stage=hook_stage,
                    processing_time_ms=processing_time_ms,
                    verification_started=True,
                    should_block=False
                )
            
            # For blocking hooks, execute synchronously
            else:
                result = await self._verify_content_async(
                    content=content,
                    hook_stage=hook_stage,
                    hook_config=hook_config,
                    metadata=metadata
                )
                
                processing_time_ms = int((time.time() - start_time) * 1000)
                
                # Check if we should block based on risk level
                should_block = self._should_block_pipeline(result, hook_config)
                
                warning_event = None
                if should_block:
                    warning_event = self._create_warning_event(
                        result=result,
                        hook_stage=hook_stage
                    )
                    self._emit_event(warning_event)
                
                logger.info(
                    f"{hook_stage} hook executed (blocking) in {processing_time_ms}ms, "
                    f"block={should_block}"
                )
                
                return HookResult(
                    status="completed",
                    hook_stage=hook_stage,
                    processing_time_ms=processing_time_ms,
                    verification_started=True,
                    should_block=should_block,
                    warning_event=asdict(warning_event) if warning_event else None
                )
        
        except Exception as e:
            processing_time_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Hook execution failed: {e}", exc_info=True)
            
            return HookResult(
                status="failed",
                hook_stage=hook_stage,
                processing_time_ms=processing_time_ms,
                verification_started=False,
                error=str(e)
            )
    
    async def _verify_content_async(
        self,
        content: str,
        hook_stage: HookStage,
        hook_config: HookConfig,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Verify content asynchronously.
        
        Args:
            content: Content to verify
            hook_stage: Hook stage
            hook_config: Hook configuration
            metadata: Optional metadata
            
        Returns:
            Verification result
        """
        try:
            # Run fact-checking in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._run_fact_checking,
                content,
                hook_config
            )
            
            # Store results if configured
            if hook_config.store_results and self.project_path:
                await self._store_results(
                    result=result,
                    hook_stage=hook_stage,
                    metadata=metadata
                )
            
            # Check for high-risk content and emit warning
            if self._is_high_risk(result):
                warning_event = self._create_warning_event(
                    result=result,
                    hook_stage=hook_stage
                )
                self._emit_event(warning_event)
            
            return result
            
        except Exception as e:
            logger.error(f"Async verification failed: {e}", exc_info=True)
            raise
    
    def _run_fact_checking(
        self,
        content: str,
        hook_config: HookConfig
    ) -> Dict[str, Any]:
        """
        Run fact-checking synchronously (called in thread pool).
        
        Args:
            content: Content to verify
            hook_config: Hook configuration
            
        Returns:
            Verification result
        """
        return self.fact_checker.execute(
            input_data=content,
            mode=hook_config.mode,
            confidence_threshold=hook_config.confidence_threshold,
            cache=True
        )
    
    async def _store_results(
        self,
        result: Dict[str, Any],
        hook_stage: HookStage,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Store verification results in Data Contract v1 format.
        
        Args:
            result: Verification result
            hook_stage: Hook stage
            metadata: Optional metadata
        """
        if not self.project_path:
            logger.warning("No project path configured, skipping result storage")
            return
        
        try:
            # Create fact_checking directory in project
            fact_check_dir = self.project_path / "fact_checking"
            fact_check_dir.mkdir(exist_ok=True)
            
            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{hook_stage}_{timestamp}.json"
            filepath = fact_check_dir / filename
            
            # Prepare Data Contract v1 compliant structure
            data_contract = {
                "schema_version": "1.0",
                "hook_stage": hook_stage,
                "timestamp": datetime.now().isoformat(),
                "metadata": metadata or {},
                "verification_result": result
            }
            
            # Write to file
            with open(filepath, 'w') as f:
                json.dump(data_contract, f, indent=2)
            
            logger.info(f"Stored verification results to {filepath}")
            
            # Update project.json with fact-checking status
            await self._update_project_json(hook_stage, filepath)
            
        except Exception as e:
            logger.error(f"Failed to store results: {e}", exc_info=True)
    
    async def _update_project_json(
        self,
        hook_stage: HookStage,
        result_filepath: Path
    ) -> None:
        """
        Update project.json with fact-checking status.
        
        Args:
            hook_stage: Hook stage
            result_filepath: Path to stored results
        """
        if not self.project_path:
            return
        
        try:
            project_json_path = self.project_path / "project.json"
            
            # Load existing project.json
            if project_json_path.exists():
                with open(project_json_path, 'r') as f:
                    project_data = json.load(f)
            else:
                project_data = {
                    "schema_version": "1.0",
                    "project_name": self.project_path.name
                }
            
            # Add fact_checking section if not present
            if "fact_checking" not in project_data:
                project_data["fact_checking"] = {
                    "enabled": True,
                    "hooks": {}
                }
            
            # Update hook status
            project_data["fact_checking"]["hooks"][hook_stage] = {
                "last_run": datetime.now().isoformat(),
                "result_file": str(result_filepath.relative_to(self.project_path))
            }
            
            # Write back to project.json
            with open(project_json_path, 'w') as f:
                json.dump(project_data, f, indent=2)
            
            logger.debug(f"Updated project.json with {hook_stage} status")
            
        except Exception as e:
            logger.error(f"Failed to update project.json: {e}", exc_info=True)
    
    def _is_high_risk(self, result: Dict[str, Any]) -> bool:
        """
        Check if verification result indicates high risk.
        
        Args:
            result: Verification result
            
        Returns:
            True if high or critical risk detected
        """
        if result.get("status") != "success":
            return False
        
        report = result.get("report", {})
        summary_stats = report.get("summary_statistics", {})
        
        # Check for high-risk claims
        high_risk_count = summary_stats.get("high_risk_count", 0)
        if high_risk_count > 0:
            return True
        
        # Check individual claims for high/critical risk
        claims = report.get("claims", [])
        for claim in claims:
            risk_level = claim.get("risk_level", "low")
            if risk_level in ["high", "critical"]:
                return True
        
        # Check manipulation signals for high severity
        signals = report.get("manipulation_signals", [])
        for signal in signals:
            severity = signal.get("severity", "low")
            if severity == "high":
                return True
        
        return False
    
    def _should_block_pipeline(
        self,
        result: Dict[str, Any],
        hook_config: HookConfig
    ) -> bool:
        """
        Determine if pipeline should be blocked based on result and config.
        
        Args:
            result: Verification result
            hook_config: Hook configuration
            
        Returns:
            True if pipeline should be blocked
        """
        if hook_config.on_high_risk == "ignore":
            return False
        
        if not self._is_high_risk(result):
            return False
        
        # Block if configured to block on high risk
        return hook_config.on_high_risk == "block"
    
    def _create_warning_event(
        self,
        result: Dict[str, Any],
        hook_stage: HookStage
    ) -> WarningEvent:
        """
        Create warning event for high-risk content.
        
        Args:
            result: Verification result
            hook_stage: Hook stage
            
        Returns:
            WarningEvent object
        """
        report = result.get("report", {})
        summary_stats = report.get("summary_statistics", {})
        
        # Determine highest risk level
        risk_level = "high"
        claims = report.get("claims", [])
        for claim in claims:
            if claim.get("risk_level") == "critical":
                risk_level = "critical"
                break
        
        # Create summary
        high_risk_count = summary_stats.get("high_risk_count", 0)
        summary = f"Detected {high_risk_count} high-risk claim(s) in content"
        
        return WarningEvent(
            type="warning",
            risk_level=risk_level,
            summary=summary,
            timestamp=datetime.now().isoformat(),
            hook_stage=hook_stage,
            details={
                "high_risk_count": high_risk_count,
                "average_confidence": summary_stats.get("average_confidence", 0),
                "total_claims": summary_stats.get("total_claims", 0)
            }
        )
    
    def _emit_event(self, event: WarningEvent) -> None:
        """
        Emit warning event to registered callbacks.
        
        Args:
            event: Warning event to emit
        """
        event_dict = asdict(event)
        
        # Call registered callback if exists
        callback = self.event_callbacks.get(event.type)
        if callback:
            try:
                callback(event_dict)
                logger.info(f"Emitted {event.type} event: {event.summary}")
            except Exception as e:
                logger.error(f"Event callback failed: {e}", exc_info=True)
        else:
            # Log event if no callback registered
            logger.warning(f"Warning event: {event.summary} (no callback registered)")
    
    def load_hook_configuration(self, config_path: Path) -> None:
        """
        Load hook configuration from file.
        
        Args:
            config_path: Path to configuration file
        """
        try:
            with open(config_path, 'r') as f:
                config_data = json.load(f)
            
            # Load hook configurations
            hooks_config = config_data.get("fact_checker", {}).get("hooks", {})
            
            for hook_stage, hook_data in hooks_config.items():
                if hook_stage in self.hook_configs:
                    self.hook_configs[hook_stage] = HookConfig(
                        enabled=hook_data.get("enabled", True),
                        mode=hook_data.get("mode", "auto"),
                        blocking=hook_data.get("blocking", False),
                        on_high_risk=hook_data.get("on_high_risk", "warn"),
                        confidence_threshold=hook_data.get("confidence_threshold"),
                        store_results=hook_data.get("store_results", True)
                    )
            
            logger.info(f"Loaded hook configuration from {config_path}")
            
        except Exception as e:
            logger.error(f"Failed to load hook configuration: {e}", exc_info=True)
    
    def get_hook_status(self) -> Dict[str, Any]:
        """
        Get status of all configured hooks.
        
        Returns:
            Dictionary with hook status information
        """
        return {
            hook_stage: {
                "enabled": config.enabled,
                "mode": config.mode,
                "blocking": config.blocking,
                "on_high_risk": config.on_high_risk
            }
            for hook_stage, config in self.hook_configs.items()
        }
    
    def shutdown(self) -> None:
        """Shutdown the pipeline integration and cleanup resources."""
        logger.info("Shutting down pipeline integration")
        self.executor.shutdown(wait=True)


# Convenience functions for direct hook execution

async def execute_before_generate_hook(
    content: str,
    project_path: Optional[Path] = None,
    config: Optional[Configuration] = None
) -> HookResult:
    """
    Execute before_generate hook.
    
    Args:
        content: Content to verify
        project_path: Optional project path
        config: Optional configuration
        
    Returns:
        HookResult
    """
    integration = PipelineIntegration(config=config, project_path=project_path)
    return await integration.execute_hook("before_generate", content)


async def execute_after_generate_hook(
    content: str,
    project_path: Optional[Path] = None,
    config: Optional[Configuration] = None
) -> HookResult:
    """
    Execute after_generate hook.
    
    Args:
        content: Content to verify
        project_path: Optional project path
        config: Optional configuration
        
    Returns:
        HookResult
    """
    integration = PipelineIntegration(config=config, project_path=project_path)
    return await integration.execute_hook("after_generate", content)


async def execute_on_publish_hook(
    content: str,
    project_path: Optional[Path] = None,
    config: Optional[Configuration] = None
) -> HookResult:
    """
    Execute on_publish hook.
    
    Args:
        content: Content to verify
        project_path: Optional project path
        config: Optional configuration
        
    Returns:
        HookResult
    """
    integration = PipelineIntegration(config=config, project_path=project_path)
    return await integration.execute_hook("on_publish", content)
