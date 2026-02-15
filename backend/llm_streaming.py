"""
StoryCore-Engine LLM Streaming Module

This module provides streaming support for LLM completions across multiple providers.
Implements SSE (Server-Sent Events) for real-time response delivery.

Requirements: Priority 2 - Streaming Completion System
"""

import asyncio
import json
import logging
import os
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional, Union

import httpx

from backend.config import settings as app_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# Data Models
# =============================================================================

class StreamingEventType(str, Enum):
    """Types of streaming events"""
    START = "start"
    CHUNK = "chunk"
    USAGE = "usage"
    DONE = "done"
    ERROR = "error"


@dataclass
class StreamingEvent:
    """
    Represents a single streaming event.
    
    Attributes:
        event_type: Type of the event (start, chunk, usage, done, error)
        data: Event payload data
        timestamp: When the event was created
    """
    event_type: StreamingEventType
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_sse(self) -> str:
        """Convert to Server-Sent Event format"""
        payload = {
            "type": self.event_type.value,
            **self.data
        }
        return f"data: {json.dumps(payload)}\n\n"


@dataclass
class StreamingRequest:
    """
    Request model for streaming LLM calls.
    
    Attributes:
        prompt: The input prompt
        model: Model to use (provider-specific)
        provider: LLM provider (openai, anthropic, ollama)
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        context: Conversation context (list of messages)
    """
    prompt: str
    model: Optional[str] = None
    provider: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    context: Optional[List[Dict[str, str]]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API calls"""
        result = {
            "prompt": self.prompt,
            "stream": True
        }
        if self.model:
            result["model"] = self.model
        if self.temperature is not None:
            result["temperature"] = self.temperature
        if self.max_tokens is not None:
            result["max_tokens"] = self.max_tokens
        if self.context:
            result["context"] = self.context
        return result


@dataclass
class StreamingStats:
    """
    Statistics for a streaming session.
    
    Attributes:
        request_id: Unique identifier for the request
        provider: Provider used
        model: Model used
        start_time: When streaming started
        end_time: When streaming ended
        total_chunks: Number of chunks received
        total_tokens: Total tokens (if available)
        prompt_tokens: Prompt tokens (if available)
        completion_tokens: Completion tokens (if available)
    """
    request_id: str
    provider: str
    model: str
    start_time: datetime = field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    total_chunks: int = 0
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    
    @property
    def latency_ms(self) -> int:
        """Calculate total latency in milliseconds"""
        if self.end_time:
            return int((self.end_time - self.start_time).total_seconds() * 1000)
        return 0


# =============================================================================
# Stream Adapter Protocol
# =============================================================================

class StreamAdapter(ABC):
    """
    Abstract base class for LLM provider streaming adapters.
    
    Each provider (OpenAI, Anthropic, Ollama) has its own streaming format.
    Adapters normalize these into a common StreamingEvent format.
    """
    
    @abstractmethod
    async def stream(
        self, 
        request: StreamingRequest,
        api_key: Optional[str] = None
    ) -> AsyncIterator[StreamingEvent]:
        """
        Stream responses from the LLM provider.
        
        Args:
            request: Streaming request parameters
            api_key: Optional API key (uses env var if not provided)
            
        Yields:
            StreamingEvent: Normalized streaming events
            
        Raises:
            StreamingError: If streaming fails
        """
        ...
    
    @abstractmethod
    def get_default_model(self) -> str:
        """Get the default model for this provider"""
        ...
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name"""
        ...


class StreamingError(Exception):
    """Exception raised during streaming operations"""
    
    def __init__(
        self, 
        message: str, 
        provider: str = "unknown",
        error_code: Optional[str] = None,
        retryable: bool = False
    ):
        super().__init__(message)
        self.provider = provider
        self.error_code = error_code
        self.retryable = retryable


# =============================================================================
# OpenAI Stream Adapter
# =============================================================================

class OpenAIStreamAdapter(StreamAdapter):
    """
    Stream adapter for OpenAI API.
    
    Handles OpenAI's SSE format and converts to normalized events.
    OpenAI streaming format:
    - data: {"id": "...", "choices": [{"delta": {"content": "..."}}]}
    - data: [DONE]
    """
    
    API_URL = "https://api.openai.com/v1/chat/completions"
    DEFAULT_MODEL = "gpt-3.5-turbo"
    
    def get_provider_name(self) -> str:
        return "openai"
    
    def get_default_model(self) -> str:
        return self.DEFAULT_MODEL
    
    async def stream(
        self, 
        request: StreamingRequest,
        api_key: Optional[str] = None
    ) -> AsyncIterator[StreamingEvent]:
        """Stream from OpenAI API"""
        key = api_key or os.environ.get("OPENAI_API_KEY")
        
        if not key:
            raise StreamingError(
                "OpenAI API key not configured",
                provider="openai",
                error_code="missing_api_key",
                retryable=False
            )
        
        model = request.model or self.DEFAULT_MODEL
        request_id = str(uuid.uuid4())
        
        # Yield start event
        yield StreamingEvent(
            event_type=StreamingEventType.START,
            data={
                "request_id": request_id,
                "model": model,
                "provider": "openai"
            }
        )
        
        # Build messages for chat completion
        messages = request.context or [{"role": "user", "content": request.prompt}]
        if not request.context:
            messages = [{"role": "user", "content": request.prompt}]
        
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream(
                    "POST",
                    self.API_URL,
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": request.temperature or 0.7,
                        "max_tokens": request.max_tokens or 4096,
                        "stream": True
                    }
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        error_msg = f"OpenAI API error: {response.status_code}"
                        try:
                            error_data = json.loads(error_text)
                            error_msg = error_data.get("error", {}).get("message", error_msg)
                        except:
                            pass
                        
                        yield StreamingEvent(
                            event_type=StreamingEventType.ERROR,
                            data={
                                "message": error_msg,
                                "code": f"http_{response.status_code}",
                                "provider": "openai"
                            }
                        )
                        return
                    
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        
                        data_str = line[6:]  # Remove "data: " prefix
                        
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                
                                if content:
                                    yield StreamingEvent(
                                        event_type=StreamingEventType.CHUNK,
                                        data={"text": content}
                                    )
                                
                                # Check for finish reason
                                finish_reason = choices[0].get("finish_reason")
                                if finish_reason:
                                    # Try to get usage info if available
                                    usage = data.get("usage", {})
                                    if usage:
                                        yield StreamingEvent(
                                            event_type=StreamingEventType.USAGE,
                                            data={
                                                "prompt_tokens": usage.get("prompt_tokens", 0),
                                                "completion_tokens": usage.get("completion_tokens", 0),
                                                "total_tokens": usage.get("total_tokens", 0)
                                            }
                                        )
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse OpenAI streaming data: {data_str}")
                            continue
            
            # Yield done event
            yield StreamingEvent(
                event_type=StreamingEventType.DONE,
                data={"request_id": request_id}
            )
            
        except httpx.TimeoutException:
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": "OpenAI API request timed out",
                    "code": "timeout",
                    "provider": "openai",
                    "retryable": True
                }
            )
        except httpx.ConnectError as e:
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": f"Connection error: {str(e)}",
                    "code": "connection_error",
                    "provider": "openai",
                    "retryable": True
                }
            )
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": str(e),
                    "code": "unknown",
                    "provider": "openai",
                    "retryable": False
                }
            )


# =============================================================================
# Anthropic Stream Adapter
# =============================================================================

class AnthropicStreamAdapter(StreamAdapter):
    """
    Stream adapter for Anthropic Claude API.
    
    Handles Anthropic's SSE format and converts to normalized events.
    Anthropic streaming format:
    - event: message_start
    - event: content_block_delta
    - event: message_delta
    - event: message_stop
    """
    
    API_URL = "https://api.anthropic.com/v1/messages"
    DEFAULT_MODEL = "claude-3-haiku-20240307"
    
    def get_provider_name(self) -> str:
        return "anthropic"
    
    def get_default_model(self) -> str:
        return self.DEFAULT_MODEL
    
    async def stream(
        self, 
        request: StreamingRequest,
        api_key: Optional[str] = None
    ) -> AsyncIterator[StreamingEvent]:
        """Stream from Anthropic API"""
        key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        
        if not key:
            raise StreamingError(
                "Anthropic API key not configured",
                provider="anthropic",
                error_code="missing_api_key",
                retryable=False
            )
        
        model = request.model or self.DEFAULT_MODEL
        request_id = str(uuid.uuid4())
        
        # Yield start event
        yield StreamingEvent(
            event_type=StreamingEventType.START,
            data={
                "request_id": request_id,
                "model": model,
                "provider": "anthropic"
            }
        )
        
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream(
                    "POST",
                    self.API_URL,
                    headers={
                        "x-api-key": key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "max_tokens": request.max_tokens or 4096,
                        "messages": [{"role": "user", "content": request.prompt}],
                        "stream": True
                    }
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        error_msg = f"Anthropic API error: {response.status_code}"
                        try:
                            error_data = json.loads(error_text)
                            error_msg = error_data.get("error", {}).get("message", error_msg)
                        except:
                            pass
                        
                        yield StreamingEvent(
                            event_type=StreamingEventType.ERROR,
                            data={
                                "message": error_msg,
                                "code": f"http_{response.status_code}",
                                "provider": "anthropic"
                            }
                        )
                        return
                    
                    current_event_type = None
                    accumulated_usage = {"input_tokens": 0, "output_tokens": 0}
                    
                    async for line in response.aiter_lines():
                        line = line.strip()
                        
                        if line.startswith("event: "):
                            current_event_type = line[7:]
                            continue
                        
                        if line.startswith("data: "):
                            data_str = line[6:]
                            
                            try:
                                data = json.loads(data_str)
                                
                                if current_event_type == "content_block_delta":
                                    delta = data.get("delta", {})
                                    if delta.get("type") == "text_delta":
                                        text = delta.get("text", "")
                                        if text:
                                            yield StreamingEvent(
                                                event_type=StreamingEventType.CHUNK,
                                                data={"text": text}
                                            )
                                
                                elif current_event_type == "message_delta":
                                    # Get usage info
                                    usage = data.get("usage", {})
                                    if usage:
                                        accumulated_usage["output_tokens"] = usage.get("output_tokens", 0)
                                
                                elif current_event_type == "message_start":
                                    # Get initial usage info
                                    message = data.get("message", {})
                                    usage = message.get("usage", {})
                                    if usage:
                                        accumulated_usage["input_tokens"] = usage.get("input_tokens", 0)
                                
                                elif current_event_type == "message_stop":
                                    # Send final usage
                                    yield StreamingEvent(
                                        event_type=StreamingEventType.USAGE,
                                        data={
                                            "prompt_tokens": accumulated_usage["input_tokens"],
                                            "completion_tokens": accumulated_usage["output_tokens"],
                                            "total_tokens": accumulated_usage["input_tokens"] + accumulated_usage["output_tokens"]
                                        }
                                    )
                                    
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse Anthropic streaming data: {data_str}")
                                continue
            
            # Yield done event
            yield StreamingEvent(
                event_type=StreamingEventType.DONE,
                data={"request_id": request_id}
            )
            
        except httpx.TimeoutException:
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": "Anthropic API request timed out",
                    "code": "timeout",
                    "provider": "anthropic",
                    "retryable": True
                }
            )
        except httpx.ConnectError as e:
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": f"Connection error: {str(e)}",
                    "code": "connection_error",
                    "provider": "anthropic",
                    "retryable": True
                }
            )
        except Exception as e:
            logger.error(f"Anthropic streaming error: {e}")
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": str(e),
                    "code": "unknown",
                    "provider": "anthropic",
                    "retryable": False
                }
            )


# =============================================================================
# Ollama Stream Adapter
# =============================================================================

class OllamaStreamAdapter(StreamAdapter):
    """
    Stream adapter for Ollama local LLM.
    
    Handles Ollama's streaming format and converts to normalized events.
    Ollama streaming format:
    - JSON lines with {"response": "...", "done": false}
    - Final: {"response": "", "done": true, "context": [...], ...}
    """
    
    DEFAULT_MODEL = "llama2"
    
    def get_provider_name(self) -> str:
        return "ollama"
    
    def get_default_model(self) -> str:
        return self.DEFAULT_MODEL
    
    def _get_ollama_host(self) -> str:
        """Get Ollama host URL"""
        return os.environ.get("OLLAMA_HOST", app_settings.OLLAMA_BASE_URL)
    
    async def stream(
        self, 
        request: StreamingRequest,
        api_key: Optional[str] = None
    ) -> AsyncIterator[StreamingEvent]:
        """Stream from Ollama API"""
        ollama_host = self._get_ollama_host()
        model = request.model or self.DEFAULT_MODEL
        request_id = str(uuid.uuid4())
        
        # Yield start event
        yield StreamingEvent(
            event_type=StreamingEventType.START,
            data={
                "request_id": request_id,
                "model": model,
                "provider": "ollama"
            }
        )
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "POST",
                    f"{ollama_host}/api/generate",
                    json={
                        "model": model,
                        "prompt": request.prompt,
                        "stream": True,
                        "options": {
                            "temperature": request.temperature or 0.7,
                            "num_predict": request.max_tokens or 4096
                        }
                    }
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        error_msg = f"Ollama API error: {response.status_code}"
                        
                        yield StreamingEvent(
                            event_type=StreamingEventType.ERROR,
                            data={
                                "message": error_msg,
                                "code": f"http_{response.status_code}",
                                "provider": "ollama"
                            }
                        )
                        return
                    
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        
                        try:
                            data = json.loads(line)
                            
                            # Get response text
                            text = data.get("response", "")
                            if text:
                                yield StreamingEvent(
                                    event_type=StreamingEventType.CHUNK,
                                    data={"text": text}
                                )
                            
                            # Check if done
                            if data.get("done", False):
                                # Send usage info
                                prompt_eval = data.get("prompt_eval_count", 0)
                                eval_count = data.get("eval_count", 0)
                                
                                if prompt_eval or eval_count:
                                    yield StreamingEvent(
                                        event_type=StreamingEventType.USAGE,
                                        data={
                                            "prompt_tokens": prompt_eval,
                                            "completion_tokens": eval_count,
                                            "total_tokens": prompt_eval + eval_count
                                        }
                                    )
                                break
                                
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse Ollama streaming data: {line}")
                            continue
            
            # Yield done event
            yield StreamingEvent(
                event_type=StreamingEventType.DONE,
                data={"request_id": request_id}
            )
            
        except httpx.TimeoutException:
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": "Ollama API request timed out",
                    "code": "timeout",
                    "provider": "ollama",
                    "retryable": True
                }
            )
        except httpx.ConnectError as e:
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": f"Cannot connect to Ollama at {ollama_host}. Ensure Ollama is running.",
                    "code": "connection_error",
                    "provider": "ollama",
                    "retryable": True
                }
            )
        except Exception as e:
            logger.error(f"Ollama streaming error: {e}")
            yield StreamingEvent(
                event_type=StreamingEventType.ERROR,
                data={
                    "message": str(e),
                    "code": "unknown",
                    "provider": "ollama",
                    "retryable": False
                }
            )


# =============================================================================
# Stream Manager
# =============================================================================

class StreamManager:
    """
    Unified streaming interface for all LLM providers.
    
    Manages provider adapters and provides a single interface for streaming
    completions regardless of the underlying provider.
    """
    
    def __init__(self):
        """Initialize stream manager with provider adapters"""
        self._adapters: Dict[str, StreamAdapter] = {
            "openai": OpenAIStreamAdapter(),
            "anthropic": AnthropicStreamAdapter(),
            "ollama": OllamaStreamAdapter()
        }
        self._default_provider = self._detect_default_provider()
    
    def _detect_default_provider(self) -> str:
        """Detect the default provider based on available API keys"""
        if os.environ.get("OPENAI_API_KEY"):
            return "openai"
        if os.environ.get("ANTHROPIC_API_KEY"):
            return "anthropic"
        if os.environ.get("OLLAMA_HOST") or os.environ.get("USE_OLLAMA"):
            return "ollama"
        return "openai"  # Fallback
    
    def get_available_providers(self) -> List[str]:
        """Get list of available providers"""
        available = []
        
        if os.environ.get("OPENAI_API_KEY"):
            available.append("openai")
        if os.environ.get("ANTHROPIC_API_KEY"):
            available.append("anthropic")
        # Ollama is always potentially available (local)
        available.append("ollama")
        
        return available
    
    def get_adapter(self, provider: str) -> StreamAdapter:
        """
        Get adapter for a specific provider.
        
        Args:
            provider: Provider name (openai, anthropic, ollama)
            
        Returns:
            StreamAdapter for the provider
            
        Raises:
            ValueError: If provider is not supported
        """
        if provider not in self._adapters:
            raise ValueError(f"Unknown provider: {provider}")
        return self._adapters[provider]
    
    async def stream(
        self,
        request: StreamingRequest,
        provider: Optional[str] = None
    ) -> AsyncIterator[StreamingEvent]:
        """
        Stream from the specified or default provider.
        
        Args:
            request: Streaming request parameters
            provider: Optional provider override
            
        Yields:
            StreamingEvent: Normalized streaming events
        """
        selected_provider = provider or request.provider or self._default_provider
        adapter = self.get_adapter(selected_provider)
        
        logger.info(f"Starting stream with provider: {selected_provider}")
        
        async for event in adapter.stream(request):
            yield event
    
    async def stream_with_stats(
        self,
        request: StreamingRequest,
        provider: Optional[str] = None
    ) -> AsyncIterator[StreamingEvent]:
        """
        Stream with automatic statistics tracking.
        
        Args:
            request: Streaming request parameters
            provider: Optional provider override
            
        Yields:
            StreamingEvent: Normalized streaming events
        """
        selected_provider = provider or request.provider or self._default_provider
        adapter = self.get_adapter(selected_provider)
        model = request.model or adapter.get_default_model()
        
        stats = StreamingStats(
            request_id=str(uuid.uuid4()),
            provider=selected_provider,
            model=model
        )
        
        async for event in adapter.stream(request):
            if event.event_type == StreamingEventType.CHUNK:
                stats.total_chunks += 1
            elif event.event_type == StreamingEventType.USAGE:
                stats.prompt_tokens = event.data.get("prompt_tokens", 0)
                stats.completion_tokens = event.data.get("completion_tokens", 0)
                stats.total_tokens = event.data.get("total_tokens", 0)
            elif event.event_type == StreamingEventType.DONE:
                stats.end_time = datetime.utcnow()
                # Include stats in done event
                yield StreamingEvent(
                    event_type=StreamingEventType.DONE,
                    data={
                        **event.data,
                        "stats": {
                            "request_id": stats.request_id,
                            "provider": stats.provider,
                            "model": stats.model,
                            "latency_ms": stats.latency_ms,
                            "total_chunks": stats.total_chunks,
                            "prompt_tokens": stats.prompt_tokens,
                            "completion_tokens": stats.completion_tokens,
                            "total_tokens": stats.total_tokens
                        }
                    }
                )
                return
            elif event.event_type == StreamingEventType.ERROR:
                stats.end_time = datetime.utcnow()
            
            yield event


# =============================================================================
# Module-level singleton
# =============================================================================

_stream_manager: Optional[StreamManager] = None


def get_stream_manager() -> StreamManager:
    """Get or create the stream manager singleton"""
    global _stream_manager
    if _stream_manager is None:
        _stream_manager = StreamManager()
    return _stream_manager


async def stream_llm_response(
    request: StreamingRequest,
    provider: Optional[str] = None
) -> AsyncIterator[str]:
    """
    Convenience function to stream LLM response as SSE strings.
    
    Args:
        request: Streaming request parameters
        provider: Optional provider override
        
    Yields:
        str: SSE formatted strings ready to send to client
    """
    manager = get_stream_manager()
    
    async for event in manager.stream_with_stats(request, provider):
        yield event.to_sse()