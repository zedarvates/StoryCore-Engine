"""
ComfyUI Workflow Executor

This module provides integration with ComfyUI API for executing workflows.
Supports workflow submission, execution monitoring via WebSocket, and output retrieval.
"""

import asyncio
import json
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass

try:
    import aiohttp
    import websockets
    COMFYUI_AVAILABLE = True
except ImportError:
    COMFYUI_AVAILABLE = False
    logging.warning(
        "aiohttp and/or websockets not available. "
        "Install with: pip install aiohttp websockets"
    )

logger = logging.getLogger(__name__)


@dataclass
class ComfyUIConfig:
    """Configuration for ComfyUI connection"""
    host: str = "localhost"
    port: int = 8188
    timeout: int = 300  # 5 minutes
    check_interval: float = 1.0  # Check status every second


class ComfyUIWorkflowExecutor:
    """Execute ComfyUI workflows via API"""
    
    def __init__(self, config: ComfyUIConfig):
        """
        Initialize ComfyUI workflow executor
        
        Args:
            config: ComfyUI configuration
            
        Raises:
            ImportError: If aiohttp or websockets not available
        """
        if not COMFYUI_AVAILABLE:
            raise ImportError(
                "ComfyUI integration requires aiohttp and websockets. "
                "Install with: pip install aiohttp websockets"
            )
        
        self.config = config
        self.base_url = f"http://{config.host}:{config.port}"
        self.ws_url = f"ws://{config.host}:{config.port}/ws"
        self.client_id = str(uuid.uuid4())
        
        logger.info(f"ComfyUI Workflow Executor initialized")
        logger.info(f"Base URL: {self.base_url}")
        logger.info(f"Client ID: {self.client_id}")
    
    async def execute_workflow(
        self,
        workflow: Dict[str, Any],
        progress_callback: Optional[Callable[[str, float], None]] = None
    ) -> Dict[str, Any]:
        """
        Execute a ComfyUI workflow
        
        Args:
            workflow: Workflow JSON structure
            progress_callback: Optional callback for progress updates (message, progress)
            
        Returns:
            Dictionary with execution results:
                - prompt_id: Unique ID for this execution
                - outputs: Dictionary of node outputs
                - status: Execution status
                
        Raises:
            RuntimeError: If workflow execution fails
            TimeoutError: If execution exceeds timeout
        """
        logger.info("Starting workflow execution")
        
        # 1. Submit workflow
        prompt_id = await self._submit_workflow(workflow)
        logger.info(f"Workflow submitted: {prompt_id}")
        
        # 2. Monitor execution via WebSocket
        history = await self._monitor_execution(
            prompt_id,
            progress_callback
        )
        
        # 3. Retrieve generated outputs
        outputs = await self._retrieve_outputs(prompt_id, history)
        
        logger.info(f"Workflow execution complete: {len(outputs)} outputs")
        
        return {
            "prompt_id": prompt_id,
            "outputs": outputs,
            "status": "success",
            "history": history
        }
    
    async def _submit_workflow(self, workflow: Dict[str, Any]) -> str:
        """
        Submit workflow to ComfyUI API
        
        Args:
            workflow: Workflow JSON structure
            
        Returns:
            Prompt ID for tracking execution
            
        Raises:
            RuntimeError: If submission fails
        """
        prompt = {
            "prompt": workflow,
            "client_id": self.client_id
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.base_url}/prompt",
                    json=prompt,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise RuntimeError(
                            f"Failed to submit workflow: {response.status}\n{error_text}"
                        )
                    
                    data = await response.json()
                    return data["prompt_id"]
            
            except aiohttp.ClientError as e:
                raise RuntimeError(f"Failed to connect to ComfyUI: {e}")
    
    async def _monitor_execution(
        self,
        prompt_id: str,
        progress_callback: Optional[Callable[[str, float], None]]
    ) -> Dict[str, Any]:
        """
        Monitor workflow execution via WebSocket
        
        Args:
            prompt_id: Prompt ID to monitor
            progress_callback: Optional callback for progress updates
            
        Returns:
            Execution history
            
        Raises:
            TimeoutError: If execution exceeds timeout
            RuntimeError: If execution fails
        """
        try:
            async with websockets.connect(
                f"{self.ws_url}?clientId={self.client_id}",
                ping_interval=20,
                ping_timeout=10
            ) as websocket:
                start_time = asyncio.get_event_loop().time()
                
                while True:
                    # Check timeout
                    elapsed = asyncio.get_event_loop().time() - start_time
                    if elapsed > self.config.timeout:
                        raise TimeoutError(
                            f"Workflow execution timeout after {self.config.timeout}s"
                        )
                    
                    # Receive message with timeout
                    try:
                        message = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=self.config.check_interval
                        )
                    except asyncio.TimeoutError:
                        # No message received, continue waiting
                        continue
                    
                    data = json.loads(message)
                    
                    # Handle different message types
                    if data["type"] == "executing":
                        node_data = data["data"]
                        node_id = node_data.get("node")
                        
                        if node_id is None:
                            # Execution complete
                            logger.info("Workflow execution complete")
                            break
                        else:
                            logger.info(f"Executing node: {node_id}")
                            if progress_callback:
                                progress_callback(f"Executing node {node_id}", 0.5)
                    
                    elif data["type"] == "progress":
                        # Progress update
                        progress_data = data["data"]
                        value = progress_data["value"]
                        max_value = progress_data["max"]
                        progress = value / max_value if max_value > 0 else 0
                        
                        logger.debug(f"Progress: {value}/{max_value} ({progress:.1%})")
                        
                        if progress_callback:
                            progress_callback(
                                f"Processing: {value}/{max_value}",
                                progress
                            )
                    
                    elif data["type"] == "execution_error":
                        # Execution error
                        error_data = data["data"]
                        error_msg = json.dumps(error_data, indent=2)
                        raise RuntimeError(f"Workflow execution error:\n{error_msg}")
                    
                    elif data["type"] == "execution_cached":
                        # Some nodes were cached
                        logger.info("Some nodes were cached")
                
                # Get final result
                return await self._get_history(prompt_id)
        
        except websockets.exceptions.WebSocketException as e:
            raise RuntimeError(f"WebSocket connection error: {e}")
    
    async def _get_history(self, prompt_id: str) -> Dict[str, Any]:
        """
        Get execution history
        
        Args:
            prompt_id: Prompt ID to get history for
            
        Returns:
            Execution history
            
        Raises:
            RuntimeError: If history retrieval fails
        """
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    f"{self.base_url}/history/{prompt_id}",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise RuntimeError(
                            f"Failed to get history: {response.status}\n{error_text}"
                        )
                    
                    data = await response.json()
                    return data[prompt_id]
            
            except aiohttp.ClientError as e:
                raise RuntimeError(f"Failed to get history: {e}")
    
    async def _retrieve_outputs(
        self,
        prompt_id: str,
        history: Dict[str, Any]
    ) -> Dict[str, List[bytes]]:
        """
        Retrieve output files from ComfyUI
        
        Args:
            prompt_id: Prompt ID
            history: Execution history
            
        Returns:
            Dictionary mapping node IDs to output data
        """
        outputs = {}
        
        if "outputs" not in history:
            logger.warning("No outputs in history")
            return outputs
        
        for node_id, node_output in history["outputs"].items():
            node_outputs = []
            
            # Handle images
            if "images" in node_output:
                for image_info in node_output["images"]:
                    filename = image_info["filename"]
                    subfolder = image_info.get("subfolder", "")
                    file_type = image_info.get("type", "output")
                    
                    logger.info(f"Downloading image: {filename}")
                    
                    # Download image
                    image_data = await self._download_file(
                        filename,
                        subfolder,
                        file_type
                    )
                    node_outputs.append(image_data)
            
            # Handle videos
            if "videos" in node_output:
                for video_info in node_output["videos"]:
                    filename = video_info["filename"]
                    subfolder = video_info.get("subfolder", "")
                    file_type = video_info.get("type", "output")
                    
                    logger.info(f"Downloading video: {filename}")
                    
                    # Download video
                    video_data = await self._download_file(
                        filename,
                        subfolder,
                        file_type
                    )
                    node_outputs.append(video_data)
            
            if node_outputs:
                outputs[node_id] = node_outputs
        
        return outputs
    
    async def _download_file(
        self,
        filename: str,
        subfolder: str,
        file_type: str
    ) -> bytes:
        """
        Download a file from ComfyUI
        
        Args:
            filename: File name
            subfolder: Subfolder path
            file_type: File type (output, input, temp)
            
        Returns:
            File data as bytes
            
        Raises:
            RuntimeError: If download fails
        """
        params = {
            "filename": filename,
            "subfolder": subfolder,
            "type": file_type
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    f"{self.base_url}/view",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise RuntimeError(
                            f"Failed to download file {filename}: "
                            f"{response.status}\n{error_text}"
                        )
                    
                    return await response.read()
            
            except aiohttp.ClientError as e:
                raise RuntimeError(f"Failed to download file {filename}: {e}")
    
    async def check_connection(self) -> bool:
        """
        Check if ComfyUI is accessible
        
        Returns:
            True if ComfyUI is accessible, False otherwise
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/system_stats",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    is_connected = response.status == 200
                    
                    if is_connected:
                        logger.info("ComfyUI connection successful")
                    else:
                        logger.warning(f"ComfyUI returned status {response.status}")
                    
                    return is_connected
        
        except Exception as e:
            logger.error(f"ComfyUI connection check failed: {e}")
            return False
    
    async def upload_image(
        self,
        image_path: Path,
        subfolder: str = "",
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """
        Upload an image to ComfyUI
        
        Args:
            image_path: Path to image file
            subfolder: Optional subfolder in ComfyUI input directory
            overwrite: Whether to overwrite existing file
            
        Returns:
            Upload response data
            
        Raises:
            RuntimeError: If upload fails
        """
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        # Prepare form data
        data = aiohttp.FormData()
        data.add_field(
            'image',
            open(image_path, 'rb'),
            filename=image_path.name,
            content_type='image/png'
        )
        
        if subfolder:
            data.add_field('subfolder', subfolder)
        
        if overwrite:
            data.add_field('overwrite', 'true')
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.base_url}/upload/image",
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise RuntimeError(
                            f"Failed to upload image: {response.status}\n{error_text}"
                        )
                    
                    result = await response.json()
                    logger.info(f"Image uploaded: {result}")
                    return result
            
            except aiohttp.ClientError as e:
                raise RuntimeError(f"Failed to upload image: {e}")


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test_connection():
        """Test ComfyUI connection"""
        config = ComfyUIConfig()
        executor = ComfyUIWorkflowExecutor(config)
        
        is_connected = await executor.check_connection()
        print(f"ComfyUI connected: {is_connected}")
        
        if is_connected:
            print("✓ ComfyUI is accessible")
        else:
            print("✗ ComfyUI is not accessible")
            print(f"  Make sure ComfyUI is running at {config.host}:{config.port}")
    
    # Run test
    asyncio.run(test_connection())
