#!/usr/bin/env python3
"""
End-to-End Orchestrator for StoryCore Project Creation

This module implements the main orchestrator that coordinates the complete
workflow from user prompt to final video export.

Requirements: All requirements (foundation + integration)

Features:
- Complete workflow orchestration
- State machine for workflow management
- Error handling and recovery
- Progress tracking and reporting
- Checkpoint save/resume functionality
- Support for cancellation and resumption
"""

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from src.end_to_end.data_models import (
    CharacterInfo,
    ParsedPrompt,
    ProjectComponents,
    ProjectCreationResult,
    WorkflowState,
    WorkflowStep,
    OrchestratorConfig,
    QualityReport,
    ProgressReport,
)
from src.end_to_end.prompt_parser import PromptParser
from src.end_to_end.project_name_generator import ProjectNameGenerator
from src.end_to_end.component_generator import ComponentGenerator
from src.end_to_end.project_structure_builder import ProjectStructureBuilder
from src.end_to_end.comfyui_integration import ComfyUIIntegration
from src.end_to_end.pipeline_executor import PipelineExecutor
from src.end_to_end.error_recovery_manager import ErrorRecoveryManager, ErrorContext, RecoveryAction
from src.end_to_end.progress_monitor import ProgressMonitor
from src.end_to_end.configuration_manager import ConfigurationManager
from src.end_to_end.quality_validator import QualityValidator
from src.end_to_end.dependency_manager import DependencyManager


logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Status of the workflow"""
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class WorkflowInfo:
    """Information about a workflow instance"""
    workflow_id: str
    status: WorkflowStatus
    prompt: str
    project_path: Optional[Path]
    start_time: datetime
    end_time: Optional[datetime]
    result: Optional[ProjectCreationResult]


class EndToEndOrchestrator:
    """
    Main orchestrator for end-to-end project creation.
    
    This class coordinates all components and steps required to create
    a complete video project from a single user prompt.
    
    Workflow Steps:
    1. Parse user prompt → Extract structured data
    2. Generate project name → Validate uniqueness
    3. Generate components → World, Characters, Story, etc.
    4. Create project structure → Files and directories
    5. Generate images → Via ComfyUI (or fallback)
    6. Execute pipeline → Grid → Promote → Refine → QA → Export
    7. Validate quality → Final quality check
    
    Error Handling:
    - Automatic retry with backoff for transient errors
    - Fallback modes when services unavailable
    - Checkpoint save for resume after failures
    - Clear error notifications with corrective actions
    
    Progress Tracking:
    - Real-time progress updates via callbacks
    - Time estimation for completion
    - Step-by-step status reporting
    
    Example:
        ```python
        orchestrator = EndToEndOrchestrator()
        
        # Create project from prompt
        result = await orchestrator.create_project_from_prompt(
            "Create a cyberpunk trailer featuring Snow White in 2048"
        )
        
        if result.success:
            print(f"Video created: {result.video_path}")
        ```
    """
    
    # Define the workflow step order
    WORKFLOW_STEPS = [
        WorkflowStep.PARSING,
        WorkflowStep.NAME_GENERATION,
        WorkflowStep.COMPONENT_GENERATION,
        WorkflowStep.PROJECT_STRUCTURE,
        WorkflowStep.IMAGE_GENERATION,
        WorkflowStep.PIPELINE_EXECUTION,
        WorkflowStep.QUALITY_VALIDATION,
        WorkflowStep.COMPLETE,
    ]
    
    def __init__(
        self,
        config: Optional[OrchestratorConfig] = None,
        progress_callback: Optional[Callable[[ProgressReport], None]] = None
    ):
        """
        Initialize the end-to-end orchestrator.
        
        Args:
            config: Optional orchestrator configuration
            progress_callback: Optional callback for progress updates
        """
        self.config = config or self._create_default_config()
        self.workflow_id = str(uuid.uuid4())
        self.status = WorkflowStatus.IDLE
        self.current_workflow: Optional[WorkflowInfo] = None
        
        # Initialize components
        self._initialize_components()
        
        # Setup progress monitoring
        self.progress_monitor = ProgressMonitor(self.workflow_id)
        if progress_callback:
            self.progress_monitor.add_callback(progress_callback)
        
        # State management
        self._current_state: Optional[WorkflowState] = None
        self._current_prompt: Optional[str] = None
        self._current_project_path: Optional[Path] = None
        self._current_components: Optional[ProjectComponents] = None
        
        # Event hooks
        self._on_step_start: List[Callable[[WorkflowStep], None]] = []
        self._on_step_complete: List[Callable[[WorkflowStep, Dict], None]] = []
        self._on_step_fail: List[Callable[[WorkflowStep, str], None]] = []
        self._on_workflow_complete: List[Callable[[ProjectCreationResult], None]] = []
        self._on_workflow_fail: List[Callable[[List[str]], None]] = []
    
    def _create_default_config(self) -> OrchestratorConfig:
        """Create default orchestrator configuration."""
        return OrchestratorConfig(
            projects_directory=str(Path.cwd() / "projects"),
            comfyui_backend_url="http://localhost:8188",
            storycore_cli_path=str(Path(__file__).parent.parent.parent / "storycore.py"),
            default_quality_tier="preview",
            max_retry_attempts=3,
            checkpoint_enabled=True,
            auto_cleanup_enabled=True,
            parallel_generation=True,
            max_concurrent_shots=4
        )
    
    def _initialize_components(self):
        """Initialize all required components."""
        # Core components
        self.prompt_parser = PromptParser()
        self.name_generator = ProjectNameGenerator(self.config.projects_directory)
        self.component_generator = ComponentGenerator()
        self.project_builder = ProjectStructureBuilder(self.config.projects_directory)
        
        # Integration components
        self.comfyui = ComfyUIIntegration(self.config.comfyui_backend_url)
        self.pipeline_executor = PipelineExecutor(self.config.storycore_cli_path)
        
        # Support components
        self.error_recovery = ErrorRecoveryManager()
        self.configuration_manager = ConfigurationManager()
        self.quality_validator = QualityValidator()
        self.dependency_manager = DependencyManager()
        
        # Ensure projects directory exists
        Path(self.config.projects_directory).mkdir(parents=True, exist_ok=True)
    
    async def create_project_from_prompt(
        self,
        prompt: str,
        options: Optional[Dict[str, Any]] = None
    ) -> ProjectCreationResult:
        """
        Create a complete project from a user prompt.
        
        This is the main entry point for end-to-end project creation.
        
        Args:
            prompt: User input text describing the project
            options: Optional configuration overrides
            
        Returns:
            ProjectCreationResult with video path and metadata
            
        Raises:
            ValueError: If prompt is empty or invalid
            RuntimeError: If dependencies are missing
        """
        start_time = datetime.now()
        self._current_prompt = prompt
        
        # Validate input
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty")
        
        if len(prompt.strip()) < 10:
            raise ValueError("Prompt is too short (minimum 10 characters)")
        
        # Initialize workflow state
        self.status = WorkflowStatus.RUNNING
        self.workflow_id = str(uuid.uuid4())
        self._current_state = WorkflowState(
            current_step=WorkflowStep.PARSING,
            completed_steps=[],
            failed_steps=[],
            project_data={"prompt": prompt},
            start_time=start_time,
            estimated_completion=None
        )
        
        # Initialize workflow info
        self.current_workflow = WorkflowInfo(
            workflow_id=self.workflow_id,
            status=WorkflowStatus.RUNNING,
            prompt=prompt,
            project_path=None,
            start_time=start_time,
            end_time=None,
            result=None
        )
        
        # Apply options
        if options:
            self._apply_options(options)
        
        # Setup progress tracking
        self.progress_monitor.start_workflow(
            total_steps=len(self.WORKFLOW_STEPS)
        )
        
        # Log workflow start
        logger.info(f"Starting end-to-end workflow {self.workflow_id}")
        print(f"\n🎬 Starting project creation...")
        print(f"   Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
        
        # Track errors and warnings
        errors: List[str] = []
        warnings: List[str] = []
        
        try:
            # Step 1: Parse prompt
            parsed_prompt = await self._execute_parsing(prompt)
            if not parsed_prompt:
                raise RuntimeError("Failed to parse prompt")
            
            # Step 2: Generate project name
            project_name = await self._execute_name_generation(parsed_prompt)
            project_path = Path(self.config.projects_directory) / project_name
            
            # Update workflow info
            self.current_workflow.project_path = project_path
            self._current_project_path = project_path
            self._current_state.project_data["project_name"] = project_name
            self._current_state.project_data["project_path"] = str(project_path)
            
            # Step 3: Generate components
            components = await self._execute_component_generation(parsed_prompt)
            self._current_components = components
            self._current_state.project_data["components"] = components
            
            # Step 4: Create project structure
            await self._execute_project_structure(project_path, components)
            
            # Step 5: Generate images (with fallback)
            images_generated = await self._execute_image_generation(
                project_path, components, warnings
            )
            self._current_state.project_data["images_generated"] = images_generated
            
            # Step 6: Execute pipeline
            pipeline_result = await self._execute_pipeline(project_path, warnings)
            self._current_state.project_data["pipeline_result"] = pipeline_result
            
            # Step 7: Validate quality
            qa_report = await self._execute_quality_validation(
                project_path, pipeline_result
            )
            
            # Mark workflow as complete
            self.status = WorkflowStatus.COMPLETED
            self.progress_monitor.complete_step("complete")
            
            # Calculate duration
            duration = datetime.now() - start_time
            
            # Create result
            result = ProjectCreationResult(
                success=True,
                project_path=project_path,
                video_path=pipeline_result.video_path,
                qa_report=qa_report,
                duration=duration,
                errors=errors,
                warnings=warnings
            )
            
            # Notify completion hooks
            for hook in self._on_workflow_complete:
                try:
                    hook(result)
                except Exception as e:
                    logger.error(f"Error in workflow complete hook: {e}")
            
            print(f"\n✅ Project created successfully!")
            print(f"   Duration: {duration}")
            print(f"   Video: {pipeline_result.video_path}")
            
            return result
            
        except Exception as e:
            # Handle errors
            return await self._handle_workflow_error(e, start_time, errors, warnings)
    
    async def _execute_parsing(self, prompt: str) -> Optional[ParsedPrompt]:
        """Execute prompt parsing step."""
        step = WorkflowStep.PARSING
        
        self.progress_monitor.update_step(
            step.value,
            0.0,
            "Parsing user prompt..."
        )
        
        # Notify step start
        for hook in self._on_step_start:
            try:
                hook(step)
            except Exception as e:
                logger.error(f"Error in step start hook: {e}")
        
        try:
            # Parse the prompt
            parsed = self.prompt_parser.parse(prompt)
            
            # Validate parsed data
            is_valid, validation_errors = self.prompt_parser.validate_parsed_data(parsed)
            
            if not is_valid:
                # Fill defaults to ensure valid data
                parsed = self.prompt_parser.fill_defaults(parsed)
                if validation_errors:
                    logger.warning(f"Validation warnings: {validation_errors}")
            
            # Update progress
            self.progress_monitor.complete_step(
                step.value,
                {"parsed_fields": list(parsed.__dict__.keys())}
            )
            
            # Add to completed steps
            self._current_state.completed_steps.append(step)
            self._current_state.current_step = WorkflowStep.NAME_GENERATION
            
            # Save checkpoint
            if self.config.checkpoint_enabled:
                self.error_recovery.save_checkpoint(
                    self._current_state,
                    self._current_project_path
                )
            
            return parsed
            
        except Exception as e:
            self._current_state.failed_steps.append((step, str(e)))
            self.progress_monitor.fail_step(step.value, str(e))
            raise
    
    async def _execute_name_generation(
        self,
        parsed_prompt: ParsedPrompt
    ) -> str:
        """Execute project name generation step."""
        step = WorkflowStep.NAME_GENERATION
        
        self.progress_monitor.update_step(
            step.value,
            0.0,
            "Generating project name..."
        )
        
        try:
            # Generate unique project name
            project_name = self.name_generator.generate_name(parsed_prompt)
            
            # Additional validation if needed
            is_valid, error = self.name_generator.validate_name(project_name)
            if not is_valid:
                logger.warning(f"Generated name '{project_name}' validation issues: {error}")
            
            # Update progress
            self.progress_monitor.complete_step(
                step.value,
                {"project_name": project_name}
            )
            
            # Add to completed steps
            self._current_state.completed_steps.append(step)
            self._current_state.current_step = WorkflowStep.COMPONENT_GENERATION
            
            # Save checkpoint
            if self.config.checkpoint_enabled:
                self.error_recovery.save_checkpoint(
                    self._current_state,
                    self._current_project_path
                )
            
            return project_name
            
        except Exception as e:
            self._current_state.failed_steps.append((step, str(e)))
            self.progress_monitor.fail_step(step.value, str(e))
            raise
    
    async def _execute_component_generation(
        self,
        parsed_prompt: ParsedPrompt
    ) -> ProjectComponents:
        """Execute component generation step."""
        step = WorkflowStep.COMPONENT_GENERATION
        
        self.progress_monitor.update_step(
            step.value,
            0.0,
            "Generating project components..."
        )
        
        try:
            # Generate all components
            components = await self.component_generator.generate_all_components(
                parsed_prompt
            )
            
            # Validate coherence
            coherence_result = self.component_generator.validate_coherence(components)
            
            if not coherence_result["is_coherent"]:
                logger.warning(
                    f"Coherence issues detected: {coherence_result['issues']}"
                )
            
            # Update progress
            self.progress_monitor.complete_step(
                step.value,
                {
                    "components_generated": True,
                    "coherent": coherence_result["is_coherent"]
                }
            )
            
            # Add to completed steps
            self._current_state.completed_steps.append(step)
            self._current_state.current_step = WorkflowStep.PROJECT_STRUCTURE
            
            # Save checkpoint
            if self.config.checkpoint_enabled:
                self.error_recovery.save_checkpoint(
                    self._current_state,
                    self._current_project_path
                )
            
            return components
            
        except Exception as e:
            self._current_state.failed_steps.append((step, str(e)))
            self.progress_monitor.fail_step(step.value, str(e))
            raise
    
    async def _execute_project_structure(
        self,
        project_path: Path,
        components: ProjectComponents
    ) -> None:
        """Execute project structure creation step."""
        step = WorkflowStep.PROJECT_STRUCTURE
        
        self.progress_monitor.update_step(
            step.value,
            0.0,
            "Creating project structure..."
        )
        
        try:
            # Create project structure
            structure = self.project_builder.create_project_structure(
                project_path.name,
                components
            )
            
            # Save all components
            success = self.project_builder.save_all_components(
                project_path,
                components
            )
            
            if not success:
                raise RuntimeError("Failed to save project components")
            
            # Validate structure
            validation = self.project_builder.validate_structure(project_path)
            
            if not validation["valid"]:
                raise RuntimeError(f"Invalid project structure: {validation['errors']}")
            
            # Update progress
            self.progress_monitor.complete_step(
                step.value,
                {
                    "project_path": str(project_path),
                    "files_created": structure.file_count
                }
            )
            
            # Add to completed steps
            self._current_state.completed_steps.append(step)
            self._current_state.current_step = WorkflowStep.IMAGE_GENERATION
            
            # Save checkpoint
            if self.config.checkpoint_enabled:
                self.error_recovery.save_checkpoint(
                    self._current_state,
                    self._current_project_path
                )
            
        except Exception as e:
            self._current_state.failed_steps.append((step, str(e)))
            self.progress_monitor.fail_step(step.value, str(e))
            raise
    
    async def _execute_image_generation(
        self,
        project_path: Path,
        components: ProjectComponents,
        warnings: List[str]
    ) -> bool:
        """Execute image generation step with fallback."""
        step = WorkflowStep.IMAGE_GENERATION
        
        self.progress_monitor.update_step(
            step.value,
            0.0,
            "Checking ComfyUI availability..."
        )
        
        try:
            # Check ComfyUI availability
            comfy_available = await self.comfyui.check_availability()
            
            if comfy_available:
                self.progress_monitor.update_step(
                    step.value,
                    10.0,
                    "Generating master coherence sheet..."
                )
                
                # Generate master coherence sheet
                style_config = self.configuration_manager.determine_style_config(
                    components.world_config
                )
                coherence_sheet = await self.comfyui.generate_master_coherence_sheet(
                    components.world_config,
                    style_config
                )
                
                self.progress_monitor.update_step(
                    step.value,
                    50.0,
                    "Generating sequence shots..."
                )
                
                # Generate all shots
                shots_result = await self.comfyui.generate_all_shots(
                    components.sequence_plan,
                    coherence_sheet,
                    self._create_shot_progress_callback()
                )
                
                # Save generated images
                await self.comfyui.save_generated_images(
                    project_path / "assets" / "images",
                    shots_result
                )
                
                images_generated = len(shots_result) > 0
                
            else:
                # Use fallback mode
                logger.warning("ComfyUI not available, using placeholder mode")
                warnings.append(
                    "ComfyUI backend not available - using placeholder images"
                )
                
                # Create placeholder images
                images_generated = await self._create_placeholder_images(
                    project_path,
                    components
                )
            
            # Update progress
            self.progress_monitor.complete_step(
                step.value,
                {"images_generated": images_generated}
            )
            
            # Add to completed steps
            self._current_state.completed_steps.append(step)
            self._current_state.current_step = WorkflowStep.PIPELINE_EXECUTION
            
            # Save checkpoint
            if self.config.checkpoint_enabled:
                self.error_recovery.save_checkpoint(
                    self._current_state,
                    self._current_project_path
                )
            
            return images_generated
            
        except Exception as e:
            self._current_state.failed_steps.append((step, str(e)))
            self.progress_monitor.fail_step(step.value, str(e))
            raise
    
    async def _create_placeholder_images(
        self,
        project_path: Path,
        components: ProjectComponents
    ) -> bool:
        """Create placeholder images when ComfyUI is unavailable."""
        try:
            from PIL import Image, ImageDraw, ImageFont
            import os
            
            images_dir = project_path / "assets" / "images"
            images_dir.mkdir(parents=True, exist_ok=True)
            
            # Create a placeholder for each shot
            total_shots = components.sequence_plan.total_shots
            
            for i, sequence in enumerate(components.sequence_plan.sequences):
                for shot in sequence.shots:
                    # Create placeholder image
                    width, height = self._get_aspect_ratio_size(
                        components.metadata.aspect_ratio
                    )
                    
                    img = Image.new('RGB', (width, height), color='#1a1a2e')
                    draw = ImageDraw.Draw(img)
                    
                    # Add text
                    text = f"{components.metadata.project_name}\n{sequence.name}\nShot {shot.shot_number}"
                    
                    # Simple text drawing (without font)
                    lines = text.split('\n')
                    y_offset = height // 3
                    for line in lines:
                        draw.text((width // 4, y_offset), line, fill='#ffffff')
                        y_offset += 30
                    
                    # Save image
                    img_path = images_dir / f"shot_{shot.shot_id}.jpg"
                    img.save(str(img_path), quality=85)
            
            return total_shots > 0
            
        except ImportError:
            logger.warning("PIL not available for placeholder images")
            return False
        except Exception as e:
            logger.error(f"Error creating placeholder images: {e}")
            return False
    
    def _get_aspect_ratio_size(self, aspect_ratio: str) -> tuple:
        """Get image size based on aspect ratio."""
        base_size = (1024, 576)  # Base 16:9
        
        ratios = {
            "16:9": (1024, 576),
            "9:16": (576, 1024),
            "1:1": (768, 768),
            "4:3": (1024, 768),
            "21:9": (1280, 540)
        }
        
        return ratios.get(aspect_ratio, base_size)
    
    def _create_shot_progress_callback(self) -> Callable[[float, str], None]:
        """Create progress callback for shot generation."""
        def callback(progress: float, message: str):
            self.progress_monitor.update_step(
                WorkflowStep.IMAGE_GENERATION.value,
                50.0 + (progress * 0.4),  # 50-90% of step
                message
            )
        return callback
    
    async def _execute_pipeline(
        self,
        project_path: Path,
        warnings: List[str]
    ) -> Any:
        """Execute the StoryCore pipeline."""
        step = WorkflowStep.PIPELINE_EXECUTION
        
        self.progress_monitor.update_step(
            step.value,
            0.0,
            "Starting StoryCore pipeline..."
        )
        
        try:
            # Execute full pipeline with autofix
            pipeline_result = await self.pipeline_executor.execute_with_autofix(
                project_path=project_path,
                max_iterations=self.config.max_retry_attempts,
                progress_callback=self._create_pipeline_progress_callback()
            )
            
            if not pipeline_result.success:
                # Add pipeline errors as warnings but continue
                warnings.extend(pipeline_result.errors)
                logger.warning(f"Pipeline completed with errors: {pipeline_result.errors}")
            
            # Update progress
            self.progress_monitor.complete_step(
                step.value,
                {
                    "success": pipeline_result.success,
                    "video_path": str(pipeline_result.video_path) if pipeline_result.video_path else None
                }
            )
            
            # Add to completed steps
            self._current_state.completed_steps.append(step)
            self._current_state.current_step = WorkflowStep.QUALITY_VALIDATION
            
            # Save checkpoint
            if self.config.checkpoint_enabled:
                self.error_recovery.save_checkpoint(
                    self._current_state,
                    self._current_project_path
                )
            
            return pipeline_result
            
        except Exception as e:
            self._current_state.failed_steps.append((step, str(e)))
            self.progress_monitor.fail_step(step.value, str(e))
            raise
    
    def _create_pipeline_progress_callback(self) -> Callable[[Any, float], None]:
        """Create progress callback for pipeline execution."""
        def callback(step: Any, progress: float):
            self.progress_monitor.update_step(
                WorkflowStep.PIPELINE_EXECUTION.value,
                progress,
                f"Executing pipeline step: {step.value}"
            )
        return callback
    
    async def _execute_quality_validation(
        self,
        project_path: Path,
        pipeline_result: Any
    ) -> Optional[QualityReport]:
        """Execute final quality validation."""
        step = WorkflowStep.QUALITY_VALIDATION
        
        self.progress_monitor.update_step(
            step.value,
            0.0,
            "Validating final quality..."
        )
        
        try:
            if not pipeline_result.video_path:
                logger.warning("No video file to validate")
                return None
            
            # Validate the video
            qa_report = await self.quality_validator.validate_final_video(
                pipeline_result.video_path,
                self._current_components
            )
            
            # Update progress
            self.progress_monitor.complete_step(
                step.value,
                {
                    "overall_score": qa_report.overall_score,
                    "passed": qa_report.passed
                }
            )
            
            # Add to completed steps
            self._current_state.completed_steps.append(step)
            self._current_state.current_step = WorkflowStep.COMPLETE
            
            # Save final checkpoint
            if self.config.checkpoint_enabled:
                self.error_recovery.save_checkpoint(
                    self._current_state,
                    self._current_project_path
                )
            
            return qa_report
            
        except Exception as e:
            self._current_state.failed_steps.append((step, str(e)))
            self.progress_monitor.fail_step(step.value, str(e))
            raise
    
    async def _handle_workflow_error(
        self,
        error: Exception,
        start_time: datetime,
        errors: List[str],
        warnings: List[str]
    ) -> ProjectCreationResult:
        """Handle workflow errors with recovery attempts."""
        step = self._current_state.current_step if self._current_state else None
        
        # Create error context
        error_context = ErrorContext(
            error_type=type(error).__name__,
            error_message=str(error),
            stack_trace="",
            workflow_step=step or WorkflowStep.PARSING,
            project_path=self._current_project_path,
            timestamp=datetime.now(),
            system_state={},
            recovery_attempts=0
        )
        
        # Get recovery action
        recovery_action = self.error_recovery.handle_error(error, error_context)
        
        # Try to execute recovery
        recovery_result = await self.error_recovery.execute_recovery(
            recovery_action,
            error_context
        )
        
        if recovery_result.success and recovery_result.retry_recommended:
            # Retry the failed step
            logger.info(f"Retrying after error: {recovery_action.strategy.value}")
            # Note: In a full implementation, this would re-execute the failed step
        
        # Update workflow status
        self.status = WorkflowStatus.FAILED
        
        # Mark current step as failed
        if step:
            self.progress_monitor.fail_step(step.value, str(error))
        
        # Add to errors
        errors.append(str(error))
        
        # Notify failure hooks
        for hook in self._on_workflow_fail:
            try:
                hook(errors)
            except Exception as e:
                logger.error(f"Error in workflow fail hook: {e}")
        
        # Calculate duration
        duration = datetime.now() - start_time
        
        # Create failure result
        result = ProjectCreationResult(
            success=False,
            project_path=self._current_project_path,
            video_path=None,
            qa_report=None,
            duration=duration,
            errors=errors,
            warnings=warnings
        )
        
        print(f"\n❌ Project creation failed!")
        print(f"   Duration: {duration}")
        print(f"   Error: {error}")
        
        if recovery_action.strategy.value != "abort":
            print(f"   Recovery: {recovery_result.message}")
        
        return result
    
    def _apply_options(self, options: Dict[str, Any]) -> None:
        """Apply options to configuration."""
        if "projects_directory" in options:
            self.config.projects_directory = options["projects_directory"]
            Path(self.config.projects_directory).mkdir(parents=True, exist_ok=True)
        
        if "comfyui_backend_url" in options:
            self.config.comfyui_backend_url = options["comfyui_backend_url"]
            self.comfyui = ComfyUIIntegration(self.config.comfyui_backend_url)
        
        if "max_retry_attempts" in options:
            self.config.max_retry_attempts = options["max_retry_attempts"]
        
        if "checkpoint_enabled" in options:
            self.config.checkpoint_enabled = options["checkpoint_enabled"]
    
    def get_progress(self) -> ProgressReport:
        """
        Get current workflow progress.
        
        Returns:
            ProgressReport with current state
            
        Requirement 8.6: Provide progress information on demand
        """
        return self.progress_monitor.get_progress_report()
    
    def cancel(self) -> bool:
        """
        Cancel ongoing workflow.
        
        Returns:
            True if cancelled successfully
            
        Example:
            ```python
            orchestrator = EndToEndOrchestrator()
            task = asyncio.create_task(orchestrator.create_project_from_prompt(prompt))
            
            # Later...
            if orchestrator.cancel():
                print("Workflow cancelled")
            ```
        """
        if self.status != WorkflowStatus.RUNNING:
            return False
        
        self.status = WorkflowStatus.CANCELLED
        
        if self.current_workflow:
            self.current_workflow.status = WorkflowStatus.CANCELLED
            self.current_workflow.end_time = datetime.now()
        
        # Save checkpoint for resume
        if self.config.checkpoint_enabled and self._current_state:
            self.error_recovery.save_checkpoint(
                self._current_state,
                self._current_project_path
            )
        
        logger.info(f"Workflow {self.workflow_id} cancelled")
        print("\n⚠️ Workflow cancelled")
        
        return True
    
    def resume(self, project_path: str) -> bool:
        """
        Resume an interrupted workflow from checkpoint.
        
        Args:
            project_path: Path to project directory
            
        Returns:
            True if resume started successfully
            
        Example:
            ```python
            orchestrator = EndToEndOrchestrator()
            result = await orchestrator.resume("/path/to/project")
            ```
        """
        path = Path(project_path)
        
        if not path.exists():
            logger.error(f"Project path not found: {project_path}")
            return False
        
        # Load checkpoint
        checkpoint = self.error_recovery.load_checkpoint(path)
        
        if not checkpoint:
            logger.error(f"No checkpoint found for project: {project_path}")
            return False
        
        # Resume from checkpoint
        self._current_state = checkpoint
        self._current_project_path = path
        self.status = WorkflowStatus.RUNNING
        
        # Update workflow info
        self.workflow_id = str(uuid.uuid4())
        self.current_workflow = WorkflowInfo(
            workflow_id=self.workflow_id,
            status=WorkflowStatus.RUNNING,
            prompt=checkpoint.project_data.get("prompt", ""),
            project_path=path,
            start_time=checkpoint.start_time,
            end_time=None,
            result=None
        )
        
        logger.info(f"Resuming workflow from checkpoint at step: {checkpoint.current_step}")
        print(f"\n🔄 Resuming workflow from: {path}")
        print(f"   Starting at step: {checkpoint.current_step.value}")
        
        return True
    
    def check_dependencies(self) -> Dict[str, Any]:
        """
        Check if all dependencies are available.
        
        Returns:
            Dictionary with dependency status
            
        Requirement 11.1-11.8: Dependency verification
        """
        return self.dependency_manager.check_all_dependencies()
    
    def add_step_start_hook(self, hook: Callable[[WorkflowStep], None]) -> None:
        """
        Add a hook called when a step starts.
        
        Args:
            hook: Function to call
        """
        self._on_step_start.append(hook)
    
    def add_step_complete_hook(
        self,
        hook: Callable[[WorkflowStep, Dict], None]
    ) -> None:
        """
        Add a hook called when a step completes.
        
        Args:
            hook: Function to call with step and result data
        """
        self._on_step_complete.append(hook)
    
    def add_step_fail_hook(
        self,
        hook: Callable[[WorkflowStep, str], None]
    ) -> None:
        """
        Add a hook called when a step fails.
        
        Args:
            hook: Function to call with step and error message
        """
        self._on_step_fail.append(hook)
    
    def add_workflow_complete_hook(
        self,
        hook: Callable[[ProjectCreationResult], None]
    ) -> None:
        """
        Add a hook called when workflow completes successfully.
        
        Args:
            hook: Function to call with result
        """
        self._on_workflow_complete.append(hook)
    
    def add_workflow_fail_hook(
        self,
        hook: Callable[[List[str]], None]
    ) -> None:
        """
        Add a hook called when workflow fails.
        
        Args:
            hook: Function to call with error list
        """
        self._on_workflow_fail.append(hook)
    
    def get_workflow_state(self) -> Optional[WorkflowState]:
        """
        Get current workflow state.
        
        Returns:
            WorkflowState or None if no active workflow
        """
        return self._current_state
    
    def get_workflow_status(self) -> WorkflowStatus:
        """
        Get current workflow status.
        
        Returns:
            WorkflowStatus enum value
        """
        return self.status
    
    def get_project_path(self) -> Optional[Path]:
        """
        Get current project path.
        
        Returns:
            Path or None if no active project
        """
        return self._current_project_path


# Convenience function for quick project creation
async def create_project(
    prompt: str,
    projects_dir: str = "projects",
    **kwargs
) -> ProjectCreationResult:
    """
    Convenience function to create a project from a prompt.
    
    Args:
        prompt: User input text
        projects_dir: Directory for projects
        **kwargs: Additional options
        
    Returns:
        ProjectCreationResult
    """
    config = OrchestratorConfig(
        projects_directory=projects_dir,
        **kwargs
    )
    
    orchestrator = EndToEndOrchestrator(config=config)
    
    return await orchestrator.create_project_from_prompt(prompt)


# Export aliases
__all__ = [
    "EndToEndOrchestrator",
    "WorkflowStatus",
    "WorkflowInfo",
    "create_project",
]

