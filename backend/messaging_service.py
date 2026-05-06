import logging
import aiohttp
from typing import Dict, Any, Optional
from backend.config import settings

logger = logging.getLogger(__name__)


class MessagingService:
    """
    Service for sending messages via Telegram and Discord.
    Provides unified interface for multi-platform notifications.
    """

    def __init__(self):
        self.telegram_token = settings.TELEGRAM_BOT_TOKEN
        self.telegram_chat_id = settings.TELEGRAM_CHAT_ID
        self.discord_token = settings.DISCORD_BOT_TOKEN
        self.discord_webhook_url = settings.DISCORD_WEBHOOK_URL

    async def send_telegram_message(
        self, message: str, chat_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a message via Telegram Bot API.

        Args:
            message: The text content to send (supports HTML tags if parse_mode is HTML)
            chat_id: Optional specific chat ID, falls back to settings.TELEGRAM_CHAT_ID
        """
        if not self.telegram_token:
            return {"success": False, "error": "Telegram Bot Token not configured"}

        target_chat_id = chat_id or self.telegram_chat_id
        if not target_chat_id:
            return {
                "success": False,
                "error": "Telegram Chat ID not provided or configured",
            }

        url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
        payload = {"chat_id": target_chat_id, "text": message, "parse_mode": "HTML"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {"success": True, "data": data}
                    else:
                        error_text = await response.text()
                        logger.error(
                            f"Telegram API error: {response.status} - {error_text}"
                        )
                        return {
                            "success": False,
                            "error": f"Status {response.status}: {error_text}",
                        }
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return {"success": False, "error": str(e)}

    async def send_discord_message(
        self, message: str, webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a message via Discord Webhook.

        Args:
            message: The content to send
            webhook_url: Optional specific webhook URL, falls back to settings.DISCORD_WEBHOOK_URL
        """
        target_url = webhook_url or self.discord_webhook_url
        if not target_url:
            return {
                "success": False,
                "error": "Discord Webhook URL not provided or configured",
            }

        payload = {"content": message}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(target_url, json=payload) as response:
                    if response.status in [200, 204]:
                        return {"success": True}
                    else:
                        error_text = await response.text()
                        logger.error(
                            f"Discord Webhook error: {response.status} - {error_text}"
                        )
                        return {
                            "success": False,
                            "error": f"Status {response.status}: {error_text}",
                        }
        except Exception as e:
            logger.error(f"Error sending Discord message: {e}")
            return {"success": False, "error": str(e)}

    async def get_status(self) -> Dict[str, Any]:
        """Check connection status for both services."""
        status = {
            "telegram": "configured" if self.telegram_token else "missing_token",
            "discord": "configured" if self.discord_webhook_url else "missing_webhook",
        }
        return status


# Singleton instance
messaging_service = MessagingService()


def get_messaging_service():
    return messaging_service
