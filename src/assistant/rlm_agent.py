"""
StoryCoreRLMAgent - Real implementation of RLMAgentCore for StoryCore-Engine.
Integrates LLM capability with n8n automation and Messaging Services.
"""

import logging
from typing import Any, Dict, List, Optional
from src.assistant.rlm_engine import RLMAgentCore
from backend.n8n_service import n8n_service
from backend.messaging_service import messaging_service
from backend.llm_api import call_llm_openai, call_llm_anthropic, LLMRequest

logger = logging.getLogger(__name__)


class StoryCoreRLMAgent(RLMAgentCore):
    """
    The production-ready RLMAgent that connects to real services.
    """

    def __init__(self, provider: str = "openai", model: str = "gpt-4"):
        self.provider = provider
        self.model = model
        self.user_id = "default_internal_user"

    async def call_llm(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Calls the configured LLM provider."""
        request = LLMRequest(
            prompt=prompt,
            model=self.model,
            provider=self.provider,
            context=[{"role": "system", "content": system_prompt}]
            if system_prompt
            else None,
        )

        if self.provider == "openai":
            response = await call_llm_openai(request, self.user_id)
        elif self.provider == "anthropic":
            response = await call_llm_anthropic(request, self.user_id)
        else:
            # Fallback to OpenAI if provider is unknown
            response = await call_llm_openai(request, self.user_id)

        return response.text

    async def query_database(self, query: str) -> str:
        """
        Search project database and vector memory.
        Implementation would connect to RAG system.
        """
        # Placeholder for RAG integration
        logger.info(f"RLM Query DB: {query}")
        return f"Database results for '{query}' (Feature in development)"

    async def query_graph(self, entities: List[str], max_depth: int = 1) -> str:
        """
        Query the Story Knowledge Graph (StoryGraph).
        """
        # Logic to be integrated with KnowledgeGraph in storycore_assistant.py
        logger.info(f"RLM Query Graph: {entities}")
        return f"Graph lore for {entities} (Feature in development)"

    # =========================================================================
    # n8n Automation Tools
    # ==================== =====================================================

    async def trigger_n8n(
        self, webhook_id: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Trigger an n8n workflow via its webhook."""
        logger.info(f"RLM triggering n8n: {webhook_id}")
        return await n8n_service.trigger_workflow(webhook_id, payload)

    async def list_n8n(self) -> List[Dict[str, Any]]:
        """List available active workflows in n8n."""
        logger.info("RLM listing n8n workflows")
        return await n8n_service.list_workflows()

    async def create_n8n(
        self, name: str, nodes: List[Dict[str, Any]], connections: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Dynamically create a new n8n workflow."""
        logger.info(f"RLM creating n8n workflow: {name}")
        return await n8n_service.create_workflow(name, nodes, connections)

    # =========================================================================
    # Messaging Tools (Telegram & Discord)
    # =========================================================================

    async def send_message(
        self, platform: str, text: str, target_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Unified messaging tool for the AI.
        platform: 'telegram' or 'discord'
        """
        logger.info(f"RLM sending {platform} message")

        if platform.lower() == "telegram":
            success = await messaging_service.send_telegram_message(text, target_id)
            return {"success": success, "platform": "telegram"}

        elif platform.lower() == "discord":
            success = await messaging_service.send_discord_message(text, target_id)
            return {"success": success, "platform": "discord"}

        else:
            return {"success": False, "error": f"Unknown platform: {platform}"}

    async def get_messaging_status(self) -> Dict[str, Any]:
        """Check status of messaging services."""
        return messaging_service.get_status()
