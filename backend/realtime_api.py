"""
StoryCore Real-time WebSocket API
=================================

Handles real-time notifications for clients, including GemReward updates.
Implements connection management and message broadcasting.

Author: StoryCore Team
Version: 1.0.0
"""

import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.auth import decode_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# WebSocket Connection Manager
# =============================================================================


class RealtimeConnectionManager:
    """
    Manages active WebSocket connections mapped to user IDs.
    Supports targeted messaging and global broadcasting.
    """

    def __init__(self):
        # user_id -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a new connection and map it to a user ID."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(
            f"WebSocket connected: user {user_id} (connections: {len(self.active_connections[user_id])})"
        )

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a connection."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected: user {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to all active connections for a specific user."""
        if user_id in self.active_connections:
            connections = self.active_connections[user_id]
            # Create a copy to avoid 'Set size changed during iteration'
            for connection in list(connections):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send WS message to {user_id}: {e}")
                    # Auto-cleanup if sending fails
                    self.disconnect(connection, user_id)

    async def broadcast(self, message: dict):
        """Broadcast a message to everyone connected."""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)


# Global manager instance
manager = RealtimeConnectionManager()

# =============================================================================
# WebSocket Endpoint
# =============================================================================


@router.websocket("/ws/gem-updates")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for real-time gem updates.
    Requires a valid JWT token for authentication.
    """
    # Use token from query param if not in header (WS often uses query params)
    if not token:
        token = websocket.query_params.get("token")

    if not token:
        logger.warning("WebSocket connection attempt without token")
        await websocket.close(code=4001, reason="Authentication required")
        return

    try:
        payload = decode_jwt_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("No 'sub' in token")
    except Exception as e:
        logger.warning(f"WebSocket authentication failed: {e}")
        await websocket.close(code=4002, reason="Invalid token")
        return

    await manager.connect(websocket, user_id)

    try:
        while True:
            # Keep the connection alive and listen for any client-side messages
            data = await websocket.receive_text()
            # Handle potential pings or commands here if needed
            logger.debug(f"Received from user {user_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)


# =============================================================================
# Helper function for other services (like GemEngine)
# =============================================================================


async def notify_user_gem_update(user_id: str, event_data: dict):
    """Helper to send gem update events to a user via WebSocket."""
    # Ensure correct event structure for GemWallet.tsx
    if "type" not in event_data:
        event_data["type"] = "gem_awarded"
    await manager.send_personal_message(event_data, user_id)
