#!/usr/bin/env python3
"""
ComfyUI API Client for StoryCore
Handles workflow submission, image uploads, and progress tracking.
"""

import json
import uuid
import requests
import websocket
import logging
import base64
import time
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class ComfyUIClient:
    """
    Client for interacting with ComfyUI API.
    Based on standard ComfyUI API usage (http://127.0.0.1:8000).
    """
    
    def __init__(self, server_address: str = "127.0.0.1:8000", client_id: str = None):
        self.server_address = server_address
        self.client_id = client_id or str(uuid.uuid4())
        self.ws: Optional[websocket.WebSocket] = None

    def connect(self) -> bool:
        """Establishes websocket connection for progress tracking."""
        try:
            self.ws = websocket.WebSocket()
            self.ws.connect(f"ws://{self.server_address}/ws?clientId={self.client_id}")
            logger.info("Connected to ComfyUI at %s", self.server_address)
            return True
        except Exception as e:
            logger.error("Failed to connect to ComfyUI WebSocket: %s", str(e))
            return False

    def upload_image(self, base64_image: str, filename: str = "reference.png") -> Optional[str]:
        """
        Uploads a base64 encoded image to the ComfyUI input folder.
        Returns the filename on the server.
        """
        try:
            if "," in base64_image:
                base64_image = base64_image.split(",")[1]
            
            image_data = base64.b64decode(base64_image)
            
            files = {"image": (filename, image_data)}
            data = {"overwrite": "true"}
            
            response = requests.post(
                f"http://{self.server_address}/upload/image", 
                files=files, 
                data=data
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info("Uploaded reference image as %s", result.get("name"))
                return result.get("name")
            else:
                logger.error("Failed to upload image: %s", response.text)
                return None
        except Exception as e:
            logger.error("Error uploading image: %s", str(e))
            return None

    def queue_prompt(self, workflow: Dict[str, Any]) -> Optional[str]:
        """
        Submits a workflow to the ComfyUI queue.
        Returns the prompt ID.
        """
        p = {"prompt": workflow, "client_id": self.client_id}
        data = json.dumps(p).encode('utf-8')
        
        try:
            response = requests.post(f"http://{self.server_address}/prompt", data=data)
            if response.status_code == 200:
                result = response.json()
                prompt_id = result.get("prompt_id")
                logger.info("Queued ComfyUI prompt: %s", prompt_id)
                return prompt_id
            else:
                logger.error("Failed to queue prompt: %s", response.text)
                return None
        except Exception as e:
            logger.error("Error queuing prompt: %s", str(e))
            return None

    def get_history(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves history for a specific prompt ID."""
        try:
            response = requests.get(f"http://{self.server_address}/history/{prompt_id}")
            if response.status_code == 200:
                return response.json().get(prompt_id)
            return None
        except Exception as e:
            logger.error("Error getting history: %s", str(e))
            return None

    def get_image(self, filename: str, subfolder: str = "", folder_type: str = "output") -> bytes:
        """Downloads an image/video file from the server."""
        params = {"filename": filename, "subfolder": subfolder, "type": folder_type}
        response = requests.get(f"http://{self.server_address}/view", params=params)
        return response.content

    def wait_for_completion(self, prompt_id: str, timeout: int = 300) -> Optional[Dict[str, Any]]:
        """
        Blocks until the prompt is finished or timeout is reached.
        Uses WebSocket if connected, else polls history.
        """
        start_time = time.time()
        
        if self.ws and self.ws.connected:
            while time.time() - start_time < timeout:
                try:
                    out = self.ws.recv()
                    if isinstance(out, str):
                        message = json.loads(out)
                        if message['type'] == 'executing':
                            data = message['data']
                            if data['node'] is None and data['prompt_id'] == prompt_id:
                                # Execution finished
                                return self.get_history(prompt_id)
                except Exception as e:
                    logger.warning("WS receive error during wait: %s", str(e))
                    break
        
        # Polling fallback
        while time.time() - start_time < timeout:
            history = self.get_history(prompt_id)
            if history:
                return history
            time.sleep(2)
            
        return None
