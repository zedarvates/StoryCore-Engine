"""
AI Workflow Orchestrator for StoryCore-Engine

Handles complex multi-step AI production pipelines:
- Concept to Final Video
- Character-Consistent Batch Generation
- Automated Post-Production Chaining

Phase 11: Workflow Orchestration
"""

from __future__ import annotations
import asyncio
import logging
import uuid
import os
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from backend.ai_pro_service import (
    get_color_grading_service,
    get_vfx_service,
    ColorGradeConfig,
    ColorGradePreset,
)
from backend.identity_lock_service import get_identity_lock_service
from backend.cine_production_service import CineProductionService
from backend.ai_performance_service import get_progress_manager

logger = logging.getLogger(__name__)

# =============================================================================
# Workflow Models
# =============================================================================


class WorkflowStepType(str, Enum):
    # Generation
    GENERATE_IMAGE = "generate_image"
    GENERATE_VIDEO = "generate_video"
    GENERATE_AUDIO = "generate_audio"
    GENERATE_MUSIC = "generate_music"
    GENERATE_VOICEOVER = "generate_voiceover"
    GENERATE_STORY = "generate_story"

    # Identity & Consistency
    EXTRACT_IDENTITY = "extract_identity"
    APPLY_IDENTITY = "apply_identity"
    CHARACTER_SHEET = "character_sheet"

    # Video Processing
    COLOR_GRADE = "color_grade"
    APPLY_VFX = "apply_vfx"
    ADD_SUBTITLES = "add_subtitles"
    SPEED_RAMP = "speed_ramp"
    SMOOTH_CUT = "smooth_cut"

    # Audio Processing
    AUTO_DUCK = "auto_duck"
    ISOLATE_VOICE = "isolate_voice"
    BEAT_SYNC = "beat_sync"
    AUDIO_WORLDIZE = "audio_worldize"

    # AI Tools
    MAGIC_MASK = "magic_mask"
    DEPTH_MAP = "depth_map"
    SCENE_DETECT = "scene_detect"
    BACKGROUND_REPLACE = "background_replace"

    # Animation
    ANIMATION_PRESET = "animation_preset"
    POSE_INTERPOLATE = "pose_interpolate"
    THUMBNAIL_HOOK = "thumbnail_hook"

    # Post-Production
    LIP_SYNC = "lip_sync"
    BATCH_RENDER = "batch_render"
    EXPORT_FINAL = "export_final"

    # Control Flow
    PARALLEL_GROUP = "parallel_group"
    CONDITIONAL = "conditional"
    WAIT = "wait"


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkflowStep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: WorkflowStepType
    status: WorkflowStatus = WorkflowStatus.PENDING
    input_data: Dict[str, Any] = {}
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # For PARALLEL_GROUP
    parallel_steps: List[WorkflowStep] = []

    # For CONDITIONAL
    condition: Optional[str] = None  # Expression like "context.video_path exists"
    then_steps: List[WorkflowStep] = []
    else_steps: List[WorkflowStep] = []

    # For WAIT
    wait_duration: float = 0.0  # seconds
    wait_for_workflow: Optional[str] = None  # workflow_id to wait for


class WorkflowRequest(BaseModel):
    name: str
    project_id: str
    steps: List[WorkflowStepType]
    initial_context: Dict[str, Any] = {}
    priority: int = 5


class WorkflowInstance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    project_id: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    steps: List[WorkflowStep]
    current_step_index: int = 0
    context: Dict[str, Any] = {}
    progress: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


# Update forward references for self-referencing models
WorkflowStep.update_forward_refs()

# =============================================================================
# Orchestrator Service
# =============================================================================


class AIWorkflowOrchestrator:
    """
    Orchestrates complex AI pipelines by chaining specialized services.
    """

    def __init__(self):
        self._instances: Dict[str, WorkflowInstance] = {}
        self._color_service = get_color_grading_service()
        self._vfx_service = get_vfx_service()
        self._identity_service = get_identity_lock_service()
        self._cine_service = CineProductionService()
        self._progress = get_progress_manager()

        # Story Generation Bridge
        from backend.story_generation_service import StoryGenerationService

        self._story_service = StoryGenerationService()

    async def create_workflow(self, request: WorkflowRequest) -> WorkflowInstance:
        """Initialize a new workflow sequence."""
        steps = [WorkflowStep(type=t) for t in request.steps]

        instance = WorkflowInstance(
            name=request.name,
            project_id=request.project_id,
            steps=steps,
            context=request.initial_context,
        )

        self._instances[instance.id] = instance
        logger.info(f"Created workflow {instance.id}: {instance.name}")
        return instance

    async def execute_workflow(self, workflow_id: str):
        """Main execution engine for the workflow chain."""
        instance = self._instances.get(workflow_id)
        if not instance:
            logger.error(f"Workflow {workflow_id} not found")
            return

        instance.status = WorkflowStatus.RUNNING
        instance.started_at = datetime.utcnow()

        # Create a progress tracking job
        self._progress.create_job(workflow_id, f"Starting workflow: {instance.name}")

        try:
            for i, step in enumerate(instance.steps):
                instance.current_step_index = i
                step.status = WorkflowStatus.RUNNING
                step.started_at = datetime.utcnow()

                progress_val = (i / len(instance.steps)) * 100
                self._progress.update_progress(
                    workflow_id, progress_val, f"Executing step: {step.type.value}"
                )

                logger.info(
                    f"Executing step {i + 1}/{len(instance.steps)}: {step.type}"
                )

                try:
                    await self._execute_step(instance, step)
                    step.status = WorkflowStatus.COMPLETED
                    step.completed_at = datetime.utcnow()
                except Exception as e:
                    logger.error(
                        f"Step {step.type} failed in workflow {workflow_id}: {e}"
                    )
                    step.status = WorkflowStatus.FAILED
                    step.error = str(e)
                    instance.status = WorkflowStatus.FAILED
                    instance.error = f"Step {step.type} failed: {str(e)}"
                    self._progress.complete_job(workflow_id, error=instance.error)
                    return

            # Workflow successful
            instance.status = WorkflowStatus.COMPLETED
            instance.progress = 100.0
            instance.completed_at = datetime.utcnow()
            self._progress.complete_job(
                workflow_id, result={"output": instance.context.get("last_output")}
            )
            logger.info(f"Workflow {workflow_id} completed successfully")

        except Exception as e:
            logger.error(f"Unexpected error in workflow {workflow_id}: {e}")
            instance.status = WorkflowStatus.FAILED
            instance.error = str(e)
            self._progress.complete_job(workflow_id, error=str(e))

    async def _execute_step(self, instance: WorkflowInstance, step: WorkflowStep):
        """Dispatcher for specific step logic."""

        if step.type == WorkflowStepType.GENERATE_IMAGE:
            # Context: prompt, width, height
            prompt = instance.context.get("prompt")
            # Call CineProduction or ComfyUI
            # Placeholder for real generation
            await asyncio.sleep(2)
            instance.context["image_path"] = "output/generated_image.png"
            step.output_data = {"path": instance.context["image_path"]}

        elif step.type == WorkflowStepType.GENERATE_STORY:
            # Context: prompt, genre, structure, mode, length
            prompt = instance.context.get("prompt")
            from backend.story_generation_service import (
                StoryGenre,
                StoryStructure,
                ProductionMode,
            )

            genre_name = str(instance.context.get("genre", "fiction")).upper()
            structure_name = str(instance.context.get("structure", "three_act")).upper()
            mode_name = str(instance.context.get("mode", "fiction")).upper()
            length = instance.context.get("length", "medium")

            genre = getattr(StoryGenre, genre_name, StoryGenre.DRAMA)
            structure = getattr(
                StoryStructure, structure_name, StoryStructure.THREE_ACT
            )
            mode = getattr(ProductionMode, mode_name, ProductionMode.FICTION)

            # Generate the story using the new async engine
            story = await self._story_service.generate_story(
                prompt=prompt,
                genre=genre,
                structure=structure,
                mode=mode,
                length=length,
            )

            instance.context["story_id"] = story.id
            instance.context["story_title"] = story.title

            step.output_data = {
                "story_id": story.id,
                "title": story.title,
                "scenes_count": len(story.scenes),
                "characters": [c["nom"] for c in story.characters],
            }

        elif step.type == WorkflowStepType.EXTRACT_IDENTITY:
            # Context: image_path, character_name
            image_path = instance.context.get("image_path")
            name = instance.context.get("character_name", "Unknown")

            if not image_path:
                raise Exception("Missing input image for identity extraction")

            profile = await self._identity_service.create_identity(name, image_path)
            instance.context["identity_id"] = profile.id
            step.output_data = {"identity_id": profile.id}

        elif step.type == WorkflowStepType.GENERATE_VIDEO:
            # Context: image_path or prompt + identity_id
            # This would call CineProductionService._run_scene_generation_chain
            await asyncio.sleep(5)  # Simulating long gen
            instance.context["video_path"] = "output/generated_video.mp4"
            step.output_data = {"path": instance.context["video_path"]}

        elif step.type == WorkflowStepType.COLOR_GRADE:
            # Context: video_path, preset
            video_path = instance.context.get("video_path")
            preset_name = instance.context.get("color_preset", "cinematic")

            try:
                preset = ColorGradePreset(preset_name)
            except ValueError:
                preset = ColorGradePreset.CINEMATIC

            if not video_path:
                raise Exception("Missing input video for color grading")

            filename = os.path.basename(video_path)
            output_path = os.path.join("output/pro", f"graded_{filename}")

            config = ColorGradeConfig(
                input_path=video_path, output_path=output_path, preset=preset
            )

            success, message = self._color_service.apply_color_grade(config)
            if not success:
                raise Exception(f"Color grade failed: {message}")

            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path}

        elif step.type == WorkflowStepType.APPLY_VFX:
            video_path = instance.context.get("video_path")
            vfx_type = instance.context.get("vfx_type", "bloom")

            if not video_path:
                raise Exception("Missing input video for VFX")

            success, message, output = await self._vfx_service.apply_vfx_preset(
                video_path, vfx_type=vfx_type
            )
            if not success:
                raise Exception(f"VFX failed: {message}")

            instance.context["video_path"] = output
            step.output_data = {"path": output}

        elif step.type == WorkflowStepType.ADD_SUBTITLES:
            video_path = instance.context.get("video_path")
            instance.context.get("subtitle_style", "netflix")
            await asyncio.sleep(2)
            output_path = os.path.join(
                "output/pro", f"subtitled_{os.path.basename(video_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path}

        elif step.type == WorkflowStepType.SPEED_RAMP:
            video_path = instance.context.get("video_path")
            instance.context.get("speed_multiplier", 1.0)
            await asyncio.sleep(1)
            output_path = os.path.join(
                "output/pro", f"ramped_{os.path.basename(video_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path}

        elif step.type == WorkflowStepType.AUTO_DUCK:
            video_path = instance.context.get("video_path")
            await asyncio.sleep(1)
            output_path = os.path.join(
                "output/pro", f"ducked_{os.path.basename(video_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path}

        elif step.type == WorkflowStepType.BEAT_SYNC:
            video_path = instance.context.get("video_path")
            instance.context.get("music_path")
            await asyncio.sleep(2)
            output_path = os.path.join(
                "output/pro", f"beatsync_{os.path.basename(video_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path}

        elif step.type == WorkflowStepType.MAGIC_MASK:
            video_path = instance.context.get("video_path")
            mask_type = instance.context.get("mask_type", "person")
            await asyncio.sleep(3)
            output_path = os.path.join(
                "output/pro", f"masked_{os.path.basename(video_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path, "mask_type": mask_type}

        elif step.type == WorkflowStepType.SCENE_DETECT:
            video_path = instance.context.get("video_path")
            await asyncio.sleep(2)
            scenes_json = os.path.join("output/pro", "scenes.json")
            instance.context["scenes_json"] = scenes_json
            step.output_data = {"scenes_json": scenes_json}

        elif step.type == WorkflowStepType.BACKGROUND_REPLACE:
            video_path = instance.context.get("video_path")
            instance.context.get("background_path")
            await asyncio.sleep(3)
            output_path = os.path.join(
                "output/pro", f"bgreplaced_{os.path.basename(video_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path}

        elif step.type == WorkflowStepType.ANIMATION_PRESET:
            media_path = instance.context.get("video_path") or instance.context.get(
                "image_path"
            )
            preset = instance.context.get("animation_preset", "ken_burns")
            await asyncio.sleep(1)
            output_path = os.path.join(
                "output/pro", f"animated_{os.path.basename(media_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path, "preset": preset}

        elif step.type == WorkflowStepType.THUMBNAIL_HOOK:
            video_path = instance.context.get("video_path")
            await asyncio.sleep(1)
            output_path = os.path.join(
                "output/pro", f"hook_{os.path.basename(video_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path}

        elif step.type == WorkflowStepType.LIP_SYNC:
            video_path = instance.context.get("video_path")
            instance.context.get("voiceover_path")
            await asyncio.sleep(4)
            output_path = os.path.join(
                "output/pro", f"lipsynced_{os.path.basename(video_path)}"
            )
            instance.context["video_path"] = output_path
            step.output_data = {"path": output_path}

        elif step.type == WorkflowStepType.BATCH_RENDER:
            # Render multiple videos from context
            videos = instance.context.get("batch_videos", [])
            outputs = []
            for v in videos:
                await asyncio.sleep(1)
                outputs.append(
                    os.path.join("output/pro", f"rendered_{os.path.basename(v)}")
                )
            instance.context["batch_outputs"] = outputs
            step.output_data = {"outputs": outputs}

        elif step.type == WorkflowStepType.EXPORT_FINAL:
            video_path = instance.context.get("video_path")
            format = instance.context.get("export_format", "mp4")
            instance.context.get("export_quality", "high")
            output_path = os.path.join(
                "output/exports", f"final_{os.path.basename(video_path)}"
            )
            await asyncio.sleep(2)
            instance.context["final_output"] = output_path
            step.output_data = {"path": output_path, "format": format}

        # ============ Control Flow Steps ============

        elif step.type == WorkflowStepType.PARALLEL_GROUP:
            # Execute multiple steps in parallel
            if not step.parallel_steps:
                step.output_data = {"message": "No parallel steps to execute"}
                return

            async def execute_parallel_step(pstep: WorkflowStep):
                try:
                    await self._execute_step(instance, pstep)
                    pstep.status = WorkflowStatus.COMPLETED
                    pstep.completed_at = datetime.utcnow()
                    return True, pstep
                except Exception as e:
                    pstep.status = WorkflowStatus.FAILED
                    pstep.error = str(e)
                    return False, pstep

            # Run all parallel steps concurrently
            tasks = [execute_parallel_step(ps) for ps in step.parallel_steps]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Check for failures
            failures = [r for r in results if isinstance(r, tuple) and not r[0]]
            if failures:
                failed_steps = [f[1].type.value for f in failures]
                raise Exception(f"Parallel steps failed: {failed_steps}")

            step.output_data = {
                "completed": len(results),
                "results": [r[1].output_data for r in results if isinstance(r, tuple)],
            }

        elif step.type == WorkflowStepType.CONDITIONAL:
            # Evaluate condition and branch
            condition_met = self._evaluate_condition(step.condition, instance.context)

            steps_to_execute = step.then_steps if condition_met else step.else_steps

            for substep in steps_to_execute:
                try:
                    await self._execute_step(instance, substep)
                    substep.status = WorkflowStatus.COMPLETED
                    substep.completed_at = datetime.utcnow()
                except Exception as e:
                    substep.status = WorkflowStatus.FAILED
                    substep.error = str(e)
                    raise

            step.output_data = {
                "condition_met": condition_met,
                "executed_steps": [s.type.value for s in steps_to_execute],
            }

        elif step.type == WorkflowStepType.WAIT:
            # Wait for duration or another workflow
            if step.wait_duration > 0:
                await asyncio.sleep(step.wait_duration)

            if step.wait_for_workflow:
                # Poll for workflow completion
                max_wait = 300  # 5 minutes max
                waited = 0
                while waited < max_wait:
                    other = self._instances.get(step.wait_for_workflow)
                    if not other or other.status in [
                        WorkflowStatus.COMPLETED,
                        WorkflowStatus.FAILED,
                    ]:
                        break
                    await asyncio.sleep(1)
                    waited += 1

            step.output_data = {"waited": True}

        else:
            raise Exception(f"Step type {step.type} not implemented in Orchestrator")

        # Track last output for final result
        instance.context["last_output"] = step.output_data

    def _evaluate_condition(
        self, condition: Optional[str], context: Dict[str, Any]
    ) -> bool:
        """
        Evaluate a condition expression against the workflow context.
        """
        if not condition:
            return True

        try:
            # Simple evaluation for demo purposes
            # In a real environment, use a safe expression parser
            if "exists" in condition:
                key = condition.split(" ")[0].replace("context.", "")
                return key in context and context[key] is not None

            if "==" in condition:
                parts = condition.split("==")
                key = parts[0].strip().replace("context.", "")
                val = parts[1].strip().strip("'").strip('"')
                return str(context.get(key)) == val

            return True
        except Exception as e:
            logger.error(f"Condition evaluation failed: {e}")
            return False

    def get_workflow_status(self, workflow_id: str) -> Optional[WorkflowInstance]:
        return self._instances.get(workflow_id)


# Global singleton
_orchestrator = None


def get_workflow_orchestrator() -> AIWorkflowOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AIWorkflowOrchestrator()
    return _orchestrator
