"""
LLM Client Wrapper for StoryCore-Engine

This module provides a unified interface for LLM integration,
supporting Ollama and other local LLM providers.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, AsyncIterator
from time import time

logger = logging.getLogger(__name__)


class LLMProvider(Enum):
    """Supported LLM providers."""
    OLLAMA = "ollama"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    MOCK = "mock"


class MessageRole(Enum):
    """Message roles for chat completion."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class Message:
    """Chat message."""
    role: MessageRole
    content: str
    timestamp: float = field(default_factory=time)

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary for API calls."""
        return {
            "role": self.role.value,
            "content": self.content
        }


@dataclass
class GenerationConfig:
    """Configuration for text generation."""
    max_tokens: int = 1024
    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 40
    repeat_penalty: float = 1.1
    num_predict: int = 1024  # Ollama specific


@dataclass
class GenerationResult:
    """Result from text generation."""
    text: str
    model: str
    provider: LLMProvider
    tokens_generated: int
    generation_time: float
    finish_reason: str = "complete"
    raw_response: Optional[Dict] = None

    @property
    def success(self) -> bool:
        """Check if generation was successful."""
        return len(self.text) > 0 and self.finish_reason in ["complete", "stop"]


class LLMClient(ABC):
    """Abstract base class for LLM clients."""

    def __init__(self, model: str = "llama3.2", config: Optional[GenerationConfig] = None):
        """
        Initialize the LLM client.
        
        Args:
            model: Model name to use
            config: Generation configuration
        """
        self.model = model
        self.config = config or GenerationConfig()
        self._is_connected = False

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the LLM service."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the LLM service."""
        pass

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> GenerationResult:
        """Generate text from a prompt."""
        pass

    @abstractmethod
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> AsyncIterator[str]:
        """Stream generated text token by token."""
        pass

    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        config: Optional[GenerationConfig] = None
    ) -> GenerationResult:
        """Generate response in a chat context."""
        pass

    @property
    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._is_connected


class OllamaClient(LLMClient):
    """Client for Ollama local LLM service."""

    def __init__(
        self,
        model: str = "llama3.2",
        base_url: str = "http://localhost:11434",
        config: Optional[GenerationConfig] = None
    ):
        """
        Initialize Ollama client.
        
        Args:
            model: Model name (llama3.2, qwen2.5, etc.)
            base_url: Ollama server URL
            config: Generation configuration
        """
        super().__init__(model, config)
        self.base_url = base_url.rstrip('/')
        self._session_id: Optional[str] = None

    async def connect(self) -> bool:
        """Check connection to Ollama service."""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    self._is_connected = True
                    logger.info(f"Connected to Ollama at {self.base_url}")
                    return True
                return False
        except Exception as e:
            logger.error(f"Failed to connect to Ollama: {e}")
            return False

    async def disconnect(self) -> None:
        """Close Ollama session if active."""
        self._is_connected = False
        self._session_id = None
        logger.info("Disconnected from Ollama")

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> GenerationResult:
        """Generate text using Ollama."""
        cfg = config or self.config
        start_time = time()

        try:
            import httpx

            # Build the request payload
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": cfg.max_tokens,
                    "temperature": cfg.temperature,
                    "top_p": cfg.top_p,
                    "top_k": cfg.top_k,
                    "repeat_penalty": cfg.repeat_penalty,
                }
            }

            if system_prompt:
                payload["system"] = system_prompt

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                )

                if response.status_code == 200:
                    data = response.json()
                    return GenerationResult(
                        text=data.get("response", ""),
                        model=self.model,
                        provider=LLMProvider.OLLAMA,
                        tokens_generated=data.get("eval_count", 0),
                        generation_time=time() - start_time,
                        finish_reason="complete",
                        raw_response=data
                    )
                else:
                    raise Exception(f"Ollama API error: {response.status_code}")

        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            return GenerationResult(
                text=f"[Error: {str(e)}]",
                model=self.model,
                provider=LLMProvider.OLLAMA,
                tokens_generated=0,
                generation_time=time() - start_time,
                finish_reason="error"
            )

    async def stream_generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> AsyncIterator[str]:
        """Stream generated text from Ollama."""
        cfg = config or self.config

        try:
            import httpx

            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "num_predict": cfg.max_tokens,
                    "temperature": cfg.temperature,
                    "top_p": cfg.top_p,
                }
            }

            if system_prompt:
                payload["system"] = system_prompt

            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/generate",
                    json=payload
                ) as response:
                    async for line in response.aiter_lines():
                        if line:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]

        except Exception as e:
            logger.error(f"Ollama streaming failed: {e}")
            yield f"[Error: {str(e)}]"

    async def chat(
        self,
        messages: List[Message],
        config: Optional[GenerationConfig] = None
    ) -> GenerationResult:
        """Generate response using chat endpoint."""
        cfg = config or self.config
        start_time = time()

        try:
            import httpx

            payload = {
                "model": self.model,
                "messages": [m.to_dict() for m in messages],
                "stream": False,
                "options": {
                    "num_predict": cfg.max_tokens,
                    "temperature": cfg.temperature,
                }
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                )

                if response.status_code == 200:
                    data = response.json()
                    return GenerationResult(
                        text=data.get("message", {}).get("content", ""),
                        model=self.model,
                        provider=LLMProvider.OLLAMA,
                        tokens_generated=data.get("eval_count", 0),
                        generation_time=time() - start_time,
                        finish_reason="complete",
                        raw_response=data
                    )
                else:
                    raise Exception(f"Ollama chat error: {response.status_code}")

        except Exception as e:
            logger.error(f"Ollama chat failed: {e}")
            return GenerationResult(
                text=f"[Error: {str(e)}]",
                model=self.model,
                provider=LLMProvider.OLLAMA,
                tokens_generated=0,
                generation_time=time() - start_time,
                finish_reason="error"
            )


class MockLLMClient(LLMClient):
    """Mock client for testing without an LLM service."""

    def __init__(self, model: str = "mock", config: Optional[GenerationConfig] = None):
        super().__init__(model, config)
        self._is_connected = True

    async def connect(self) -> bool:
        self._is_connected = True
        return True

    async def disconnect(self) -> None:
        self._is_connected = False

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> GenerationResult:
        """Return mock generated text."""
        start_time = time()
        
        # Generate contextually relevant mock response
        mock_response = self._generate_mock_response(prompt, system_prompt)
        
        return GenerationResult(
            text=mock_response,
            model=self.model,
            provider=LLMProvider.MOCK,
            tokens_generated=len(mock_response.split()),
            generation_time=time() - start_time,
            finish_reason="complete"
        )

    async def stream_generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> AsyncIterator[str]:
        """Yield mock response token by token."""
        mock_response = self._generate_mock_response(prompt, system_prompt)
        words = mock_response.split()
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")

    async def chat(
        self,
        messages: List[Message],
        config: Optional[GenerationConfig] = None
    ) -> GenerationResult:
        """Return mock chat response."""
        start_time = time()
        
        # Get the last user message
        user_messages = [m for m in messages if m.role == MessageRole.USER]
        last_prompt = user_messages[-1].content if user_messages else ""
        
        mock_response = self._generate_mock_response(last_prompt, None)
        
        return GenerationResult(
            text=mock_response,
            model=self.model,
            provider=LLMProvider.MOCK,
            tokens_generated=len(mock_response.split()),
            generation_time=time() - start_time,
            finish_reason="complete"
        )

    def _generate_mock_response(self, prompt: str, system_prompt: Optional[str]) -> str:
        """Generate a mock response based on the prompt context."""
        prompt_lower = prompt.lower()
        
        # Character description generation
        if "character" in prompt_lower and "describe" in prompt_lower:
            return (
                "This character is a complex individual with a rich inner life. "
                "They carry themselves with quiet confidence, their eyes reflecting "
                "a depth of experience. Their appearance suggests someone who pays "
                "attention to detail, yet isn't overly concerned with appearances. "
                "There's a warmth in their presence that draws others in, balanced "
                "by an air of mystery that hints at hidden depths."
            )
        
        # Backstory generation
        elif "backstory" in prompt_lower or "origin" in prompt_lower:
            return (
                "Born in a small coastal village, they grew up surrounded by the rhythms "
                "of the sea. Their childhood was marked by both joy and hardship, as "
                "they learned early that life doesn't always follow our plans. These "
                "experiences shaped their worldview, giving them both resilience and "
                "compassion for others facing their own struggles."
            )
        
        # Dialogue generation
        elif "dialogue" in prompt_lower or "speak" in prompt_lower:
            return (
                '"You know," they said softly, "sometimes the hardest choices are the ones '
                'that matter most." They paused, looking out at the horizon where sky met sea. '
                '"But I believe we find our way, one step at a time."'
            )
        
        # Default response
        else:
            return (
                "Based on the context provided, this character demonstrates a nuanced "
                "personality shaped by their experiences. Their actions and thoughts "
                "reflect a careful balance between intuition and reason, with deep "
                "concerns for both personal growth and the welfare of those around them."
            )


class LLMManager:
    """
    Manager class for LLM clients.
    
    Handles client selection, connection management, and provides a unified
    interface for text generation across different providers.
    """

    def __init__(self):
        """Initialize the LLM manager."""
        self._clients: Dict[LLMProvider, LLMClient] = {}
        self._default_provider = LLMProvider.OLLAMA
        self._default_model = "llama3.2"

    def register_client(self, provider: LLMProvider, client: LLMClient) -> None:
        """Register an LLM client for a provider."""
        self._clients[provider] = client
        logger.info(f"Registered LLM client for {provider.value}")

    def get_client(
        self,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None
    ) -> LLMClient:
        """
        Get an LLM client.
        
        Args:
            provider: LLM provider to use
            model: Model name (overrides client's model)
            
        Returns:
            Configured LLM client
        """
        prov = provider or self._default_provider
        
        # Return registered client or create default
        if prov in self._clients:
            client = self._clients[prov]
        else:
            # Create default client for provider
            if prov == LLMProvider.OLLAMA:
                client = OllamaClient(model=model or self._default_model)
            else:
                client = MockLLMClient()
            self._clients[prov] = client
        
        # Apply model override
        if model:
            client.model = model
        
        return client

    async def connect_all(self) -> Dict[LLMProvider, bool]:
        """Connect to all registered clients."""
        results = {}
        for provider, client in self._clients.items():
            results[provider] = await client.connect()
        return results

    async def disconnect_all(self) -> None:
        """Disconnect all clients."""
        for client in self._clients.values():
            if client.is_connected:
                await client.disconnect()

    async def generate(
        self,
        prompt: str,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> GenerationResult:
        """
        Generate text using the default or specified provider.
        
        Falls back to mock client if primary provider fails.
        """
        client = self.get_client(provider, model)
        
        # Try primary client
        try:
            if not client.is_connected:
                await client.connect()
            return await client.generate(prompt, system_prompt, config)
        except Exception as e:
            logger.warning(f"Primary provider failed: {e}, falling back to mock")
        
        # Fall back to mock
        mock_client = self.get_client(LLMProvider.MOCK)
        return await mock_client.generate(prompt, system_prompt, config)

    async def chat(
        self,
        messages: List[Message],
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None,
        config: Optional[GenerationConfig] = None
    ) -> GenerationResult:
        """Generate chat response."""
        client = self.get_client(provider, model)
        
        try:
            if not client.is_connected:
                await client.connect()
            return await client.chat(messages, config)
        except Exception as e:
            logger.warning(f"Chat failed: {e}, using mock")
            mock_client = self.get_client(LLMProvider.MOCK)
            return await mock_client.chat(messages, config)


# Global LLM manager instance
llm_manager = LLMManager()


async def get_llm_client(
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None
) -> LLMClient:
    """Get a configured LLM client."""
    return llm_manager.get_client(provider, model)


async def generate_text(
    prompt: str,
    system_prompt: Optional[str] = None,
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None
) -> str:
    """
    Convenience function for text generation.
    
    Args:
        prompt: User prompt
        system_prompt: System instructions
        provider: LLM provider
        model: Model name
        
    Returns:
        Generated text
    """
    result = await llm_manager.generate(
        prompt=prompt,
        system_prompt=system_prompt,
        provider=provider,
        model=model
    )
    return result.text

