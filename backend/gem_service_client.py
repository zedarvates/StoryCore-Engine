import logging
import httpx
from typing import Optional, Dict, Any
from backend.config import settings

logger = logging.getLogger(__name__)


class GemServiceClient:
    """
    Client for interacting with the standalone GemReward microservice.
    Handles P2P transfers and Escrow logic for compute sharing.
    """

    def __init__(self):
        self.base_url = settings.GEM_SERVICE_URL.rstrip("/") + "/v1/gems"
        self.app_id = settings.GEM_SERVICE_APP_ID
        self.timeout = 10.0

    async def get_balance(self, user_id: str) -> Dict[str, Any]:
        """Fetch user balance and tier."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/balance/{user_id}")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch gem balance for {user_id}: {e}")
            return {
                "user_id": user_id,
                "gem_balance": 0,
                "gem_tier": "contributor",
                "error": str(e),
            }

    async def create_escrow(
        self,
        sender_id: str,
        receiver_id: str,
        amount: int,
        reason: str,
        task_type: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Optional[str]:
        """
        Create an escrow to lock gems before starting a compute job.
        Returns the escrow_id if successful.
        """
        payload = {
            "app_id": self.app_id,
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "amount": amount,
            "reason": reason,
            "task_type": task_type,
            "metadata": metadata or {},
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/escrow/create", json=payload
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("escrow_id")
                else:
                    logger.error(f"Escrow creation failed: {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Error calling gem service create_escrow: {e}")
            return None

    async def release_escrow(self, escrow_id: str) -> bool:
        """Confirm a job is done and release gems to the worker."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/escrow/release/{escrow_id}"
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Error releasing escrow {escrow_id}: {e}")
            return False

    async def cancel_escrow(self, escrow_id: str) -> bool:
        """Refund gems to sender if a job failed."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/escrow/cancel/{escrow_id}"
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Error cancelling escrow {escrow_id}: {e}")
            return False

    async def direct_transfer(
        self, from_user: str, to_user: str, amount: int, reason: str
    ) -> bool:
        """Simple P2P transfer without escrow."""
        payload = {
            "app_id": self.app_id,
            "from_user_id": from_user,
            "to_user_id": to_user,
            "amount": amount,
            "reason": reason,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/transfer", json=payload)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Error during gem transfer: {e}")
            return False


# Global instance
gem_client = GemServiceClient()
