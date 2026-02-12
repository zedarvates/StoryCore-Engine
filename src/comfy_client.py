"""
ComfyUI API Bridge - Production-ready integration client
Implements WebSocket + HTTP communication with retry logic and error handling
"""

import json
import time
import asyncio
import websocket
import requests
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from urllib.parse import urljoin
import logging

from .schemas import PROJECT_SCHEMA
from .validator import validate_against_schema

logger = logging.getLogger(__name__)

class ComfyUIClient:
    """Production-ready ComfyUI API client with connection management and error handling"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8188", timeout: int = 30):
        self.base_url = base_url
        self.timeout = timeout
        self.ws_url = base_url.replace("http://", "ws://") + "/ws"
        self.session = requests.Session()
        self.session.timeout = timeout
        self.client_id = f"storycore_{int(time.time())}"
        self._connection_health = {
            "last_check": None,
            "is_connected": False,
            "last_error": None,
            "response_time_ms": None
        }
        
    def test_connection(self) -> bool:
        """Test HTTP connection to ComfyUI server"""
        start_time = time.time()
        try:
            response = self.session.get(urljoin(self.base_url, "/system_stats"))
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            self._connection_health = {
                "last_check": datetime.utcnow().isoformat() + "Z",
                "is_connected": response.status_code == 200,
                "last_error": None,
                "response_time_ms": round(response_time, 2)
            }
            
            return response.status_code == 200
        except Exception as e:
            self._connection_health = {
                "last_check": datetime.utcnow().isoformat() + "Z",
                "is_connected": False,
                "last_error": str(e),
                "response_time_ms": None
            }
            logger.error(f"Connection test failed: {e}")
            return False
    
    def get_connection_health(self) -> Dict[str, Any]:
        """Get current connection health status"""
        return self._connection_health.copy()
    
    def queue_workflow(self, workflow: Dict[str, Any], global_seed: int, prompt: str) -> Optional[str]:
        """Queue workflow with retry logic and error handling"""
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Inject project parameters
                modified_workflow = self._inject_parameters(workflow, global_seed, prompt)
                
                # Queue the workflow
                response = self.session.post(
                    urljoin(self.base_url, "/prompt"),
                    json={
                        "prompt": modified_workflow,
                        "client_id": self.client_id
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("prompt_id")
                else:
                    logger.warning(f"Queue attempt {attempt + 1} failed: {response.status_code}")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on attempt {attempt + 1}")
                delay = base_delay * (2 ** attempt)  # Exponential backoff
                time.sleep(delay)
            except Exception as e:
                logger.error(f"Queue error on attempt {attempt + 1}: {e}")
                if self._is_vram_error(str(e)):
                    raise VRAMOverflowError("VRAM overflow detected - reduce batch size")
                delay = base_delay * (2 ** attempt)  # Exponential backoff
                time.sleep(delay)
        
        logger.error(f"Failed to queue workflow after {max_retries} attempts")
        return None
    
    def monitor_execution(self, prompt_id: str, progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Monitor workflow execution via WebSocket with progress updates"""
        try:
            ws = websocket.create_connection(f"{self.ws_url}?clientId={self.client_id}")
            
            while True:
                message = ws.recv()
                data = json.loads(message)
                
                if data["type"] == "progress":
                    if progress_callback:
                        progress = (data["data"]["value"] / data["data"]["max"]) * 100
                        progress_callback(progress, data["data"].get("node", ""))
                
                elif data["type"] == "executed":
                    node_id = data["data"]["node"]
                    outputs = data["data"]["output"]
                    
                    # Validate outputs against schema
                    if not self._validate_outputs(outputs):
                        raise ValidationError("ComfyUI outputs failed schema validation")
                    
                    return {
                        "status": "completed",
                        "node_id": node_id,
                        "outputs": outputs
                    }
                
                elif data["type"] == "execution_error":
                    error_msg = data["data"]["exception_message"]
                    if self._is_vram_error(error_msg):
                        raise VRAMOverflowError(f"VRAM overflow: {error_msg}")
                    raise ExecutionError(f"ComfyUI execution failed: {error_msg}")
                    
        except websocket.WebSocketException as e:
            logger.error(f"WebSocket error: {e}")
            raise ConnectionError(f"WebSocket connection failed: {e}")
        finally:
            if 'ws' in locals():
                ws.close()
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        try:
            response = self.session.get(urljoin(self.base_url, "/queue"))
            if response.status_code == 200:
                return response.json()
            return {"queue_running": [], "queue_pending": []}
        except Exception as e:
            logger.error(f"Queue status error: {e}")
            return {"queue_running": [], "queue_pending": []}
    
    def _inject_parameters(self, workflow: Dict[str, Any], global_seed: int, prompt: str) -> Dict[str, Any]:
        """Inject global_seed and prompt into workflow nodes"""
        modified = workflow.copy()
        
        for node_id, node_data in modified.items():
            if isinstance(node_data, dict) and "inputs" in node_data:
                # Inject seed into seed nodes
                if "seed" in node_data["inputs"]:
                    node_data["inputs"]["seed"] = global_seed
                
                # Inject prompt into text nodes
                if "text" in node_data["inputs"] and node_data["inputs"]["text"] == "":
                    node_data["inputs"]["text"] = prompt
                elif "prompt" in node_data["inputs"]:
                    node_data["inputs"]["prompt"] = prompt
        
        return modified
    
    def _validate_outputs(self, outputs: Dict[str, Any]) -> bool:
        """Validate ComfyUI outputs against our schemas"""
        try:
            # Basic validation - check for required image outputs
            for output_data in outputs.values():
                if isinstance(output_data, dict) and "images" in output_data:
                    images = output_data["images"]
                    if not isinstance(images, list) or len(images) == 0:
                        return False
                    
                    # Validate image structure
                    for img in images:
                        if not all(key in img for key in ["filename", "type"]):
                            return False
            
            return True
        except Exception as e:
            logger.error(f"Output validation error: {e}")
            return False
    
    def _is_vram_error(self, error_message: str) -> bool:
        """Detect VRAM overflow from error messages"""
        vram_indicators = [
            "out of memory",
            "cuda out of memory",
            "vram",
            "memory allocation",
            "insufficient memory"
        ]
        return any(indicator in error_message.lower() for indicator in vram_indicators)


class VRAMOverflowError(Exception):
    """Raised when VRAM overflow is detected"""
    pass


class ExecutionError(Exception):
    """Raised when ComfyUI execution fails"""
    pass


class ValidationError(Exception):
    """Raised when output validation fails"""
    pass


class ConnectionError(Exception):
    """Raised when connection to ComfyUI fails"""
    pass
