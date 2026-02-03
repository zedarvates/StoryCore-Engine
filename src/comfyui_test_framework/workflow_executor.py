"""
ComfyUI Workflow Executor

Loads workflow JSON files, injects test parameters, submits jobs to ComfyUI,
and monitors execution.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from .connection_manager import ComfyUIConnectionManager, ConnectionError


logger = logging.getLogger(__name__)


class ExecutionError(Exception):
    """Raised when workflow execution fails."""
    pass


class WorkflowExecutor:
    """Executes ComfyUI workflows with parameter injection."""
    
    def __init__(
        self, 
        connection_manager: ComfyUIConnectionManager,
        workflows_dir: Path
    ):
        """
        Initialize workflow executor.
        
        Args:
            connection_manager: Connection manager instance
            workflows_dir: Directory containing workflow JSON files
        """
        self.connection = connection_manager
        self.workflows_dir = Path(workflows_dir)
        
        if not self.workflows_dir.exists():
            logger.warning(f"Workflows directory does not exist: {self.workflows_dir}")
        
        logger.info(f"Initialized WorkflowExecutor with workflows_dir: {self.workflows_dir}")
    
    def load_workflow(self, workflow_name: str) -> Dict[str, Any]:
        """
        Load workflow JSON from file.
        
        Args:
            workflow_name: Name of workflow file (e.g., 'z_image_turbo_generation.json')
        
        Returns:
            Workflow dictionary
        
        Raises:
            FileNotFoundError: If workflow file doesn't exist
            json.JSONDecodeError: If workflow JSON is invalid
        """
        workflow_path = self.workflows_dir / workflow_name
        
        logger.info(f"Loading workflow from {workflow_path}")
        
        if not workflow_path.exists():
            error_msg = f"Workflow file not found: {workflow_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        try:
            with open(workflow_path, 'r', encoding='utf-8') as f:
                workflow = json.load(f)
            
            logger.info(f"Successfully loaded workflow: {workflow_name}")
            return workflow
        
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON in workflow file: {workflow_path}. Error: {str(e)}"
            logger.error(error_msg)
            raise json.JSONDecodeError(
                error_msg,
                e.doc,
                e.pos
            )
        except Exception as e:
            error_msg = f"Failed to load workflow {workflow_path}: {str(e)}"
            logger.error(error_msg)
            raise
    
    def inject_parameters(
        self, 
        workflow: Dict[str, Any], 
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Inject test parameters into workflow nodes.
        
        Args:
            workflow: Workflow dictionary
            parameters: Parameters to inject (e.g., {'prompt': 'text', 'seed': 12345})
        
        Returns:
            Modified workflow with injected parameters
        
        Note:
            This method modifies the workflow in-place and returns it for convenience.
            Parameter keys should match the node paths in the workflow.
            
            Example parameter keys:
            - 'prompt' -> injects into node 58 for Flux Turbo
            - 'image_path' -> injects into node 98 for LTX2
            - 'seed' -> injects into appropriate seed nodes
        """
        logger.info(f"Injecting parameters into workflow: {list(parameters.keys())}")
        
        # Make a copy to avoid modifying the original
        import copy
        modified_workflow = copy.deepcopy(workflow)
        
        # Parameter mapping for Flux Turbo (z_image_turbo_generation.json)
        if 'prompt' in parameters and '58' in modified_workflow:
            # Node 58 is PrimitiveStringMultiline for prompt
            if 'inputs' in modified_workflow['58']:
                modified_workflow['58']['inputs']['value'] = parameters['prompt']
                logger.debug(f"Injected prompt into node 58: {parameters['prompt'][:50]}...")
        
        if 'seed' in parameters:
            # Node 57:3 is KSampler seed for Flux Turbo
            if '57' in modified_workflow and 'inputs' in modified_workflow['57']:
                modified_workflow['57']['inputs']['seed'] = parameters['seed']
                logger.debug(f"Injected seed into node 57: {parameters['seed']}")
        
        if 'width' in parameters:
            # Node 57:13 is EmptySD3LatentImage width
            if '57' in modified_workflow and 'inputs' in modified_workflow['57']:
                modified_workflow['57']['inputs']['width'] = parameters['width']
                logger.debug(f"Injected width into node 57: {parameters['width']}")
        
        if 'height' in parameters:
            # Node 57:13 is EmptySD3LatentImage height
            if '57' in modified_workflow and 'inputs' in modified_workflow['57']:
                modified_workflow['57']['inputs']['height'] = parameters['height']
                logger.debug(f"Injected height into node 57: {parameters['height']}")
        
        if 'steps' in parameters:
            # Node 57:3 is KSampler steps
            if '57' in modified_workflow and 'inputs' in modified_workflow['57']:
                modified_workflow['57']['inputs']['steps'] = parameters['steps']
                logger.debug(f"Injected steps into node 57: {parameters['steps']}")
        
        # Parameter mapping for LTX2 (ltx2_image_to_video.json)
        if 'image_path' in parameters and '98' in modified_workflow:
            # Node 98 is LoadImage
            if 'inputs' in modified_workflow['98']:
                modified_workflow['98']['inputs']['image'] = parameters['image_path']
                logger.debug(f"Injected image_path into node 98: {parameters['image_path']}")
        
        if 'video_prompt' in parameters and '92' in modified_workflow:
            # Node 92:3 is CLIPTextEncode for video
            if 'inputs' in modified_workflow['92']:
                modified_workflow['92']['inputs']['text'] = parameters['video_prompt']
                logger.debug(f"Injected video_prompt into node 92: {parameters['video_prompt'][:50]}...")
        
        if 'video_length' in parameters and '92' in modified_workflow:
            # Node 92:62 is PrimitiveInt for frame count
            if 'inputs' in modified_workflow['92']:
                modified_workflow['92']['inputs']['value'] = parameters['video_length']
                logger.debug(f"Injected video_length into node 92: {parameters['video_length']}")
        
        if 'seed_stage1' in parameters and '92' in modified_workflow:
            # Node 92:11 is RandomNoise Stage 1
            if 'inputs' in modified_workflow['92']:
                modified_workflow['92']['inputs']['noise_seed'] = parameters['seed_stage1']
                logger.debug(f"Injected seed_stage1 into node 92: {parameters['seed_stage1']}")
        
        if 'seed_stage2' in parameters and '92' in modified_workflow:
            # Node 92:67 is RandomNoise Stage 2
            if 'inputs' in modified_workflow['92']:
                modified_workflow['92']['inputs']['noise_seed'] = parameters['seed_stage2']
                logger.debug(f"Injected seed_stage2 into node 92: {parameters['seed_stage2']}")
        
        logger.info("Parameter injection complete")
        return modified_workflow
    
    async def execute_workflow(
        self, 
        workflow: Dict[str, Any],
        client_id: str = "test_runner"
    ) -> str:
        """
        Submit workflow to ComfyUI and return prompt ID.
        
        Args:
            workflow: Workflow dictionary
            client_id: Client identifier for tracking
        
        Returns:
            Prompt ID for tracking execution
        
        Raises:
            ExecutionError: If workflow submission fails
        """
        logger.info(f"Submitting workflow to ComfyUI with client_id: {client_id}")
        
        try:
            # Prepare the prompt payload
            payload = {
                "prompt": workflow,
                "client_id": client_id
            }
            
            # Submit to ComfyUI /prompt endpoint
            response = await self.connection.post("/prompt", payload)
            
            # Extract prompt_id from response
            if 'prompt_id' in response:
                prompt_id = response['prompt_id']
                logger.info(f"Workflow submitted successfully. Prompt ID: {prompt_id}")
                return prompt_id
            else:
                error_msg = f"No prompt_id in response: {response}"
                logger.error(error_msg)
                raise ExecutionError(error_msg)
        
        except ConnectionError as e:
            error_msg = f"Failed to submit workflow to ComfyUI: {str(e)}"
            logger.error(error_msg)
            raise ExecutionError(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error during workflow submission: {str(e)}"
            logger.error(error_msg)
            raise ExecutionError(error_msg)
    
    async def wait_for_completion(
        self,
        prompt_id: str,
        timeout: int = 300,
        poll_interval: int = 5
    ) -> Dict[str, Any]:
        """
        Poll ComfyUI until workflow completes or times out.
        
        Args:
            prompt_id: Prompt ID to monitor
            timeout: Maximum wait time in seconds
            poll_interval: Seconds between status checks
        
        Returns:
            Execution result with output information
        
        Raises:
            TimeoutError: If execution exceeds timeout
            ExecutionError: If workflow execution fails
        """
        logger.info(f"Waiting for workflow completion. Prompt ID: {prompt_id}")
        logger.info(f"Timeout: {timeout}s, Poll interval: {poll_interval}s")
        
        start_time = asyncio.get_event_loop().time()
        
        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            
            if elapsed > timeout:
                error_msg = (
                    f"Workflow execution timed out after {timeout} seconds. "
                    f"Prompt ID: {prompt_id}"
                )
                logger.error(error_msg)
                raise TimeoutError(error_msg)
            
            try:
                # Poll the /history/{prompt_id} endpoint
                history = await self.connection.get(f"/history/{prompt_id}")
                
                # Check if our prompt_id is in the history
                if prompt_id in history:
                    prompt_history = history[prompt_id]
                    
                    # Check if execution is complete
                    if 'status' in prompt_history:
                        status = prompt_history['status']
                        
                        if status.get('completed', False):
                            logger.info(f"Workflow completed successfully. Prompt ID: {prompt_id}")
                            return prompt_history
                        
                        elif 'error' in status or status.get('status_str') == 'error':
                            error_details = status.get('error', 'Unknown error')
                            error_msg = f"ComfyUI generation failed: {error_details}"
                            logger.error(error_msg)
                            raise ExecutionError(error_msg)
                    
                    # Check for outputs (alternative completion indicator)
                    if 'outputs' in prompt_history and prompt_history['outputs']:
                        logger.info(f"Workflow completed (outputs detected). Prompt ID: {prompt_id}")
                        return prompt_history
                
                # Log progress
                logger.debug(f"Workflow still in progress. Elapsed: {elapsed:.1f}s")
                
                # Wait before next poll
                await asyncio.sleep(poll_interval)
            
            except ConnectionError as e:
                error_msg = f"Connection error while polling status: {str(e)}"
                logger.error(error_msg)
                raise ExecutionError(error_msg)
            except Exception as e:
                error_msg = f"Unexpected error while polling status: {str(e)}"
                logger.error(error_msg)
                raise ExecutionError(error_msg)
    
    async def download_output(
        self,
        output_info: Dict[str, Any],
        save_path: Path
    ) -> Path:
        """
        Download generated output from ComfyUI.
        
        Args:
            output_info: Output information from execution result
            save_path: Path to save downloaded file
        
        Returns:
            Path to downloaded file
        
        Raises:
            ExecutionError: If download fails
        """
        logger.info(f"Downloading output to {save_path}")
        
        try:
            # Extract output file information
            # ComfyUI output structure: outputs -> node_id -> images/videos array
            if 'outputs' not in output_info:
                error_msg = "No outputs found in execution result"
                logger.error(error_msg)
                raise ExecutionError(error_msg)
            
            outputs = output_info['outputs']
            
            # Find the first output file
            output_file = None
            output_type = None
            
            for node_id, node_outputs in outputs.items():
                if 'images' in node_outputs and node_outputs['images']:
                    output_file = node_outputs['images'][0]
                    output_type = 'image'
                    break
                elif 'videos' in node_outputs and node_outputs['videos']:
                    output_file = node_outputs['videos'][0]
                    output_type = 'video'
                    break
            
            if not output_file:
                error_msg = "No output files found in execution result"
                logger.error(error_msg)
                raise ExecutionError(error_msg)
            
            # Extract filename and subfolder
            filename = output_file.get('filename')
            subfolder = output_file.get('subfolder', '')
            file_type = output_file.get('type', 'output')
            
            if not filename:
                error_msg = "No filename in output file information"
                logger.error(error_msg)
                raise ExecutionError(error_msg)
            
            # Construct the download URL
            # ComfyUI serves files at /view?filename=...&subfolder=...&type=...
            download_url = f"/view?filename={filename}&type={file_type}"
            if subfolder:
                download_url += f"&subfolder={subfolder}"
            
            logger.info(f"Downloading {output_type} from {download_url}")
            
            # Download the file
            if self.connection.session is None:
                await self.connection.connect()
            
            async with self.connection.session.get(
                f"{self.connection.base_url}{download_url}"
            ) as response:
                if response.status != 200:
                    error_msg = f"Failed to download output: HTTP {response.status}"
                    logger.error(error_msg)
                    raise ExecutionError(error_msg)
                
                # Ensure save directory exists
                save_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write file
                with open(save_path, 'wb') as f:
                    while True:
                        chunk = await response.content.read(8192)
                        if not chunk:
                            break
                        f.write(chunk)
            
            logger.info(f"Successfully downloaded output to {save_path}")
            return save_path
        
        except ExecutionError:
            raise
        except Exception as e:
            error_msg = f"Failed to download output: {str(e)}"
            logger.error(error_msg)
            raise ExecutionError(error_msg)
