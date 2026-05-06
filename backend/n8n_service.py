import logging
import aiohttp
from typing import List, Dict, Any
from backend.config import settings

logger = logging.getLogger(__name__)


class N8nService:
    """
    Service for interacting with n8n instance on the local network.
    """

    def __init__(self):
        self.base_url = settings.N8N_BASE_URL.rstrip("/")
        self.api_key = settings.N8N_API_KEY
        self.webhook_url = settings.N8N_WEBHOOK_URL.rstrip("/")

    async def check_status(self) -> Dict[str, Any]:
        """Check if n8n is reachable."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/healthz", timeout=5
                ) as response:
                    if response.status == 200:
                        return {"status": "online", "message": "n8n is reachable"}
                    else:
                        return {
                            "status": "offline",
                            "message": f"n8n returned status {response.status}",
                        }
        except Exception as e:
            logger.error(f"Error checking n8n status: {e}")
            return {"status": "offline", "message": str(e)}

    async def list_workflows(self) -> List[Dict[str, Any]]:
        """List workflows from n8n (requires API key)."""
        if not self.api_key:
            return []

        try:
            headers = {"X-N8N-API-KEY": self.api_key}
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/v1/workflows", headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("data", [])
                    else:
                        logger.error(f"n8n API returned status {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error listing n8n workflows: {e}")
            return []

    async def trigger_workflow(
        self, webhook_id: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Trigger an n8n workflow via webhook."""
        try:
            url = f"{self.webhook_url}/{webhook_id}"
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status in [200, 201]:
                        return {"success": True, "data": await response.json()}
                    else:
                        return {"success": False, "error": f"Status {response.status}"}
        except Exception as e:
            logger.error(f"Error triggering n8n workflow {webhook_id}: {e}")
            return {"success": False, "error": str(e)}

    async def create_workflow(
        self, name: str, nodes: List[Dict[str, Any]], connections: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new workflow in n8n."""
        if not self.api_key:
            return {"success": False, "error": "API key not configured"}

        try:
            url = f"{self.base_url}/api/v1/workflows"
            headers = {
                "X-N8N-API-KEY": self.api_key,
                "Content-Type": "application/json",
            }
            payload = {
                "name": name,
                "nodes": nodes,
                "connections": connections,
                "settings": {},
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status in [200, 201]:
                        return {"success": True, "data": await response.json()}
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Status {response.status}: {error_text}",
                        }
        except Exception as e:
            logger.error(f"Error creating n8n workflow: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
n8n_service = N8nService()


def get_n8n_service():
    return n8n_service
