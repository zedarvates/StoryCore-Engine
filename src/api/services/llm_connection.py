"""
LLM Connection Implementation

This module provides a connection implementation for LLM services (OpenAI, Anthropic, etc.)
with connection pooling support.
"""

import logging
import requests
from typing import Any, Dict, Optional, List
from dataclasses import dataclass
from enum import Enum

from .connection_pool import (
    Connection,
    ConnectionConfig,
    ConnectionPool,
    BackendType,
    get_pool_manager
)

logger = logging.getLogger(__name__)


class LLMProvider(Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


@dataclass
class LLMConfig:
    """LLM-specific configuration"""
    provider: LLMProvider = LLMProvider.OPENAI
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: str = "gpt-4"
    timeout: float = 60.0
    max_tokens: int = 2000
    temperature: float = 0.7


class LLMConnection(Connection):
    """Connection to LLM service"""
    
    def __init__(self, config: LLMConfig):
        self.config = config
        self.session: Optional[requests.Session] = None
        self._connected = False
        
        # Set base URL based on provider
        if config.base_url:
            self.base_url = config.base_url
        elif config.provider == LLMProvider.OPENAI:
            self.base_url = "https://api.openai.com/v1"
        elif config.provider == LLMProvider.ANTHROPIC:
            self.base_url = "https://api.anthropic.com/v1"
        elif config.provider == LLMProvider.LOCAL:
            self.base_url = "http://localhost:8000/v1"
        else:
            raise ValueError(f"Unknown provider: {config.provider}")
    
    def connect(self) -> None:
        """Establish connection to LLM service"""
        try:
            self.session = requests.Session()
            
            # Set authentication headers
            if self.config.api_key:
                if self.config.provider == LLMProvider.OPENAI:
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.config.api_key}",
                        "Content-Type": "application/json"
                    })
                elif self.config.provider == LLMProvider.ANTHROPIC:
                    self.session.headers.update({
                        "x-api-key": self.config.api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    })
            
            # Test connection
            if self.config.provider in [LLMProvider.OPENAI, LLMProvider.LOCAL]:
                response = self.session.get(
                    f"{self.base_url}/models",
                    timeout=10.0
                )
                response.raise_for_status()
            
            self._connected = True
            logger.info(f"Connected to {self.config.provider.value} LLM service")
            
        except Exception as e:
            logger.error(f"Failed to connect to LLM service: {e}")
            self._connected = False
            raise
    
    def disconnect(self) -> None:
        """Close connection to LLM service"""
        if self.session:
            self.session.close()
            self.session = None
        
        self._connected = False
        logger.info("Disconnected from LLM service")
    
    def is_healthy(self) -> bool:
        """Check if connection is healthy"""
        if not self._connected or not self.session:
            return False
        
        try:
            # Simple health check - try to list models
            if self.config.provider in [LLMProvider.OPENAI, LLMProvider.LOCAL]:
                response = self.session.get(
                    f"{self.base_url}/models",
                    timeout=5.0
                )
                return response.status_code == 200
            else:
                # For Anthropic, just check if session is valid
                return True
        except Exception:
            return False
    
    def execute(self, operation: str, **kwargs) -> Any:
        """Execute operation on LLM service"""
        if not self._connected or not self.session:
            raise RuntimeError("Not connected to LLM service")
        
        if operation == "complete":
            return self._complete(
                kwargs.get("prompt"),
                kwargs.get("max_tokens"),
                kwargs.get("temperature")
            )
        elif operation == "chat":
            return self._chat(
                kwargs.get("messages"),
                kwargs.get("max_tokens"),
                kwargs.get("temperature")
            )
        elif operation == "list_models":
            return self._list_models()
        else:
            raise ValueError(f"Unknown operation: {operation}")
    
    def _complete(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate completion"""
        max_tokens = max_tokens or self.config.max_tokens
        temperature = temperature or self.config.temperature
        
        if self.config.provider == LLMProvider.OPENAI:
            payload = {
                "model": self.config.model,
                "prompt": prompt,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            response = self.session.post(
                f"{self.base_url}/completions",
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            return response.json()
        
        elif self.config.provider == LLMProvider.ANTHROPIC:
            payload = {
                "model": self.config.model,
                "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
                "max_tokens_to_sample": max_tokens,
                "temperature": temperature
            }
            
            response = self.session.post(
                f"{self.base_url}/complete",
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            return response.json()
        
        else:
            raise ValueError(f"Unsupported provider: {self.config.provider}")
    
    def _chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate chat completion"""
        max_tokens = max_tokens or self.config.max_tokens
        temperature = temperature or self.config.temperature
        
        if self.config.provider == LLMProvider.OPENAI:
            payload = {
                "model": self.config.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            response = self.session.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            return response.json()
        
        elif self.config.provider == LLMProvider.ANTHROPIC:
            # Convert messages to Anthropic format
            prompt = self._messages_to_anthropic_prompt(messages)
            
            payload = {
                "model": self.config.model,
                "prompt": prompt,
                "max_tokens_to_sample": max_tokens,
                "temperature": temperature
            }
            
            response = self.session.post(
                f"{self.base_url}/complete",
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            return response.json()
        
        else:
            raise ValueError(f"Unsupported provider: {self.config.provider}")
    
    def _list_models(self) -> Dict[str, Any]:
        """List available models"""
        if self.config.provider in [LLMProvider.OPENAI, LLMProvider.LOCAL]:
            response = self.session.get(
                f"{self.base_url}/models",
                timeout=self.config.timeout
            )
            response.raise_for_status()
            return response.json()
        else:
            # Anthropic doesn't have a models endpoint
            return {
                "models": [
                    {"id": "claude-3-opus-20240229"},
                    {"id": "claude-3-sonnet-20240229"},
                    {"id": "claude-3-haiku-20240307"}
                ]
            }
    
    def _messages_to_anthropic_prompt(self, messages: List[Dict[str, str]]) -> str:
        """Convert OpenAI-style messages to Anthropic prompt format"""
        prompt_parts = []
        
        for message in messages:
            role = message["role"]
            content = message["content"]
            
            if role == "system":
                prompt_parts.append(f"\n\nSystem: {content}")
            elif role == "user":
                prompt_parts.append(f"\n\nHuman: {content}")
            elif role == "assistant":
                prompt_parts.append(f"\n\nAssistant: {content}")
        
        prompt_parts.append("\n\nAssistant:")
        return "".join(prompt_parts)


def create_llm_pool(
    name: str = "llm",
    llm_config: Optional[LLMConfig] = None,
    min_connections: int = 1,
    max_connections: int = 10
) -> ConnectionPool[LLMConnection]:
    """
    Create a connection pool for LLM service
    
    Args:
        name: Pool name
        llm_config: LLM configuration
        min_connections: Minimum connections to maintain
        max_connections: Maximum connections allowed
    
    Returns:
        ConnectionPool for LLM service
    """
    llm_config = llm_config or LLMConfig()
    
    pool_config = ConnectionConfig(
        backend_type=BackendType.LLM,
        host=llm_config.base_url or "api.openai.com",
        port=443,
        min_connections=min_connections,
        max_connections=max_connections,
        connection_timeout=llm_config.timeout,
        idle_timeout=600.0,  # 10 minutes
        health_check_interval=120.0,  # 2 minutes
        enable_health_check=True
    )
    
    def connection_factory() -> LLMConnection:
        return LLMConnection(llm_config)
    
    manager = get_pool_manager()
    return manager.create_pool(name, pool_config, connection_factory)


def get_llm_pool(name: str = "llm") -> ConnectionPool[LLMConnection]:
    """Get LLM connection pool"""
    manager = get_pool_manager()
    return manager.get_pool(name)
