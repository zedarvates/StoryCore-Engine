#!/usr/bin/env python3
"""
ComfyUI Workflow Executor for StoryCore
Executes ComfyUI workflows for Lip Sync, Video-to-Video, and more.
"""

import asyncio
import json
import logging
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WorkflowType(Enum):
    """Types of ComfyUI workflows"""
    LIP_SYNC = "lip_sync"
    VIDEO_TO_VIDEO = "video_to_video"
    PHYSICS_SIMULATION = "physics_simulation"
    STYLE_TRANSFER = "style_transfer"


@dataclass
class WorkflowResult:
    """Result of workflow execution"""
    success: bool
    output_path: Optional[str] = None
    error_message: Optional[str] = None
    metrics: Dict[str, Any] = None


from backend.config import settings

from src.comfyui_executor import comfyui_executor, ComfyUIExecutionError
from backend.config import settings

class ComfyUIWorkflowExecutor:
    """
    Executor for StoryCore ComfyUI workflows.
    Orchestrates specialized tasks like Lip Sync using the shared ComfyUIExecutor.
    """
    
    def __init__(self):
        self.executor = comfyui_executor
        self.workflows_dir = Path(settings.COMFYUI_WORKFLOW_FOLDER)
        
    def _get_workflow_path(self, workflow_type: WorkflowType) -> Path:
        """Get the path to a workflow file based on type."""
        # Check standard locations
        if workflow_type == WorkflowType.LIP_SYNC:
            paths = [
                self.workflows_dir / "lipsync" / "wav2lip_basic.json",
                Path("backend/workflows/lipsync/wav2lip_basic.json"),
                Path("workflows/comfyui/lip_sync_workflow.json")
            ]
        elif workflow_type == WorkflowType.VIDEO_TO_VIDEO:
            paths = [
                self.workflows_dir / "v2v" / "v2v_standard.json",
                Path("workflows/comfyui/video_to_video_workflow.json")
            ]
        else:
            paths = []
            
        for p in paths:
            if p.exists():
                return p
        
        raise FileNotFoundError(f"Could not find workflow for {workflow_type}")

    async def execute_lip_sync(
        self,
        character_image: str,
        dialogue_audio: str,
        server_name: Optional[str] = "local",
        comfyui_url: Optional[str] = None,
        output_filename: str = "lipsync_result",
        project_id: Optional[str] = None
    ) -> WorkflowResult:
        """
        Execute real Lip Sync workflow on a ComfyUI server.
        """
        target = server_name if not comfyui_url else comfyui_url
        logger.info(f"Triggering Lip Sync on {target}: {character_image} + {dialogue_audio}")
        
        try:
            # 1. Load workflow template
            workflow_path = self._get_workflow_path(WorkflowType.LIP_SYNC)
            with open(workflow_path, 'r') as f:
                workflow = json.load(f)
            
            # 2. Inject parameters (standard mapping)
            # Node 1: LoadImage
            if "1" in workflow:
                workflow["1"]["inputs"]["image"] = character_image
            # Node 2: LoadAudio
            if "2" in workflow:
                workflow["2"]["inputs"]["audio"] = dialogue_audio
            # Node 5: SaveImage
            if "5" in workflow:
                workflow["5"]["inputs"]["filename_prefix"] = f"{output_filename}_{int(time.time())}"
            
            # 3. Execute via Cluster Executor
            result = await self.executor.execute_workflow(
                workflow=workflow,
                server_name=server_name,
                comfyui_url=comfyui_url,
                project_id=project_id
            )
            
            if result["success"]:
                # Extract output URL
                output_url = None
                if result.get("outputs"):
                    output_url = result["outputs"][0].get("url")
                
                return WorkflowResult(
                    success=True,
                    output_path=output_url,
                    metrics={"server": server_name, "prompt_id": result.get("prompt_id")}
                )
            else:
                return WorkflowResult(
                    success=False, 
                    error_message=result.get("error", "Unknown execution error")
                )
                
        except Exception as e:
            logger.error(f"Lip Sync execution failed: {e}")
            return WorkflowResult(success=False, error_message=str(e))

    async def execute_workflow(
        self,
        workflow_type: WorkflowType,
        parameters: Dict[str, Any],
        server_name: str = "local"
    ) -> WorkflowResult:
        """
        Hub for executing specialized workflows.
        """
        if workflow_type == WorkflowType.LIP_SYNC:
            return await self.execute_lip_sync(
                character_image=parameters["character_image"],
                dialogue_audio=parameters["dialogue_audio"],
                server_name=server_name,
                output_filename=parameters.get("output_filename", "lip_sync_result"),
                project_id=parameters.get("project_id")
            )
        # TODO: Implement other types
        return WorkflowResult(success=False, error_message=f"Workflow {workflow_type} not fully implemented")


async def main():
    """Demo execution of ComfyUI workflows"""
    
    executor = ComfyUIWorkflowExecutor()
    
    # Demo Lip Sync
    print("\n🎭 Demo: Lip Sync Workflow")
    result = await executor.execute_lip_sync(
        character_image="input/character_face.png",
        dialogue_audio="input/dialogue.wav"
    )
    print(f"  Success: {result.success}")
    if result.success:
        print(f"  Output: {result.output_path}")
        print(f"  Quality: {result.metrics.get('lip_sync_quality')}")
    
    # Demo V2V
    print("\n🎬 Demo: Video-to-Video Workflow")
    result = await executor.execute_video_to_video(
        source_video="input/scene.mp4",
        positive_prompt="cinematic lighting, dramatic atmosphere",
        negative_prompt="blurry, low quality"
    )
    print(f"  Success: {result.success}")
    if result.success:
        print(f"  Output: {result.output_path}")
        print(f"  Transformation: {result.metrics.get('transformation_strength')}")


if __name__ == "__main__":
    asyncio.run(main())

