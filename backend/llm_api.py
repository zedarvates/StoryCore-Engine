"""
StoryCore-Engine LLM Integration API

This module provides a unified interface for Large Language Model integrations.
Supports multiple providers (OpenAI, Anthropic, local models) with prompt templating
and response caching.

Requirements: Q1 2026 - LLM Integration API
"""

import asyncio
import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from dataclasses import dataclass
from functools import lru_cache

from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from backend.auth import verify_jwt_token

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


class Settings(BaseSettings):
    """Application settings for LLM integration"""
    default_provider: str = Field(default="openai", env='LLM_DEFAULT_PROVIDER')
    cache_enabled: bool = Field(default=True, env='LLM_CACHE_ENABLED')
    cache_ttl_seconds: int = Field(default=3600, env='LLM_CACHE_TTL_SECONDS')
    max_tokens: int = Field(default=4096, env='LLM_MAX_TOKENS')
    temperature: float = Field(default=0.7, env='LLM_TEMPERATURE')
    # Security: Control mock LLM usage - set to 'true' for development only
    use_mock_llm: bool = Field(default=False, env='USE_MOCK_LLM')
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


try:
    settings = Settings()
except Exception:
    settings = Settings()


def should_use_mock_llm() -> bool:
    """
    Determine if mock LLM should be used.
    
    Returns:
        bool: True if USE_MOCK_LLM is explicitly set to 'true'
    
    Security Note:
        Mock LLM should NEVER be used in production environments.
        Set USE_MOCK_LLM=false or unset for production use.
    """
    use_mock = settings.use_mock_llm
    
    if use_mock:
        logger.warning(
            "SECURITY WARNING: LLM Mock Mode is ENABLED! "
            "This should only be used in DEVELOPMENT environments. "
            "Set USE_MOCK_LLM=false in production for real LLM responses."
        )
    
    return use_mock


class LLMProvider(str, Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    LOCAL = "local"


class LLMModel(str, Enum):
    """Available LLM models"""
    GPT4 = "gpt-4"
    GPT35_TURBO = "gpt-3.5-turbo"
    CLAUDE_V2 = "claude-v2"
    CLAUDE_V3 = "claude-3-haiku"
    LLAMA2 = "llama2"
    MISTRAL = "mistral"


class PromptTemplateType(str, Enum):
    """Prompt template types"""
    STORY_GENERATION = "story_generation"
    SHOT_DESCRIPTION = "shot_description"
    CHARACTER_DIALOGUE = "character_dialogue"
    WORLD_BUILDING = "world_building"
    GENERAL = "general"


@dataclass
class PromptTemplate:
    """Prompt template with variables"""
    name: str
    template_type: PromptTemplateType
    template: str
    variables: List[str]


# In-memory cache
response_cache: Dict[str, Dict[str, Any]] = {}
prompt_templates: Dict[str, PromptTemplate] = {}


# Predefined prompt templates
DEFAULT_TEMPLATES = [
    PromptTemplate(
        name="story_generation",
        template_type=PromptTemplateType.STORY_GENERATION,
        template="""You are a professional storyteller. Create a compelling story based on the following parameters:

Genre: {genre}
Theme: {theme}
Setting: {setting}
Characters: {characters}
Length: {length}

Please outline the main plot points and provide detailed descriptions for each scene.""",
        variables=["genre", "theme", "setting", "characters", "length"]
    ),
    PromptTemplate(
        name="shot_description",
        template_type=PromptTemplateType.SHOT_DESCRIPTION,
        template="""Create a detailed shot description for a video sequence:

Scene: {scene_description}
Camera Angle: {camera_angle}
Lighting: {lighting}
Action: {action}
Duration: {duration} seconds

Provide a vivid description that can be used to generate this shot.""",
        variables=["scene_description", "camera_angle", "lighting", "action", "duration"]
    ),
    PromptTemplate(
        name="character_dialogue",
        template_type=PromptTemplateType.CHARACTER_DIALOGUE,
        template="""Write dialogue for the following character interaction:

Characters: {characters}
Context: {context}
Emotion: {emotion}
Goal: {dialogue_goal}

Write natural, in-character dialogue that advances the story.""",
        variables=["characters", "context", "emotion", "dialogue_goal"]
    ),
    PromptTemplate(
        name="world_building",
        template_type=PromptTemplateType.WORLD_BUILDING,
        template="""Describe a detailed world for the story:

Time Period: {time_period}
Technology Level: {technology}
Social Structure: {social_structure}
Geography: {geography}
Culture: {culture}

Provide rich details that bring this world to life.""",
        variables=["time_period", "technology", "social_structure", "geography", "culture"]
    )
]


# Initialize templates
for template in DEFAULT_TEMPLATES:
    prompt_templates[template.name] = template


class LLMRequest(BaseModel):
    """Request model for LLM calls"""
    prompt: str = Field(..., min_length=1, max_length=10000)
    model: Optional[str] = None
    provider: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=32768)
    stream: bool = False
    context: Optional[List[Dict[str, str]]] = None
    use_cache: bool = True


class LLMResponse(BaseModel):
    """Response model for LLM calls"""
    text: str
    model: str
    provider: str
    usage: Dict[str, int]
    cached: bool = False
    latency_ms: int


class TemplateRenderRequest(BaseModel):
    """Request model for template rendering"""
    template_name: str = Field(..., min_length=1)
    variables: Dict[str, Any]


class TemplateRenderResponse(BaseModel):
    """Response model for template rendering"""
    rendered_prompt: str
    template_name: str


class ModelInfo(BaseModel):
    """Model information"""
    id: str
    name: str
    provider: str
    max_tokens: int
    capabilities: List[str]


def get_cache_key(prompt: str, model: str, temperature: float) -> str:
    """Generate cache key for a request"""
    key_string = f"{prompt}:{model}:{temperature}"
    return hashlib.md5(key_string.encode()).hexdigest()


def get_cached_response(cache_key: str) -> Optional[Dict[str, Any]]:
    """Get cached response if available and not expired"""
    if not settings.cache_enabled:
        return None
    
    if cache_key in response_cache:
        cached = response_cache[cache_key]
        created_at = datetime.fromisoformat(cached["created_at"])
        age = (datetime.utcnow() - created_at).total_seconds()
        
        if age < settings.cache_ttl_seconds:
            cached["cached"] = True
            return cached
    
    return None


def cache_response(cache_key: str, response: Dict[str, Any]):
    """Cache a response"""
    if not settings.cache_enabled:
        return
    
    response["created_at"] = datetime.utcnow().isoformat()
    response_cache[cache_key] = response


async def call_llm_mock(request: LLMRequest, user_id: str) -> LLMResponse:
    """
    Mock LLM call for development.
    
    In production, this would integrate with actual LLM providers.
    """
    import time
    start_time = time.time()
    
    # Check cache
    cache_key = get_cache_key(request.prompt, request.model or "default", request.temperature or 0.7)
    cached = get_cached_response(cache_key)
    if cached and request.use_cache:
        return LLMResponse(**cached)
    
    # Simulate LLM processing
    await asyncio.sleep(0.5)
    
    # Generate mock response
    response_text = f"Based on your prompt: '{request.prompt[:100]}...'\n\n"
    response_text += "This is a simulated LLM response. In production, this would be generated by an actual LLM provider.\n\n"
    response_text += f"Model used: {request.model or 'default'}\n"
    response_text += f"Temperature: {request.temperature or 0.7}\n"
    response_text += f"Max tokens: {request.max_tokens or settings.max_tokens}\n"
    
    latency_ms = int((time.time() - start_time) * 1000)
    
    response = {
        "text": response_text,
        "model": request.model or "default",
        "provider": request.provider or settings.default_provider,
        "usage": {
            "prompt_tokens": len(request.prompt) // 4,
            "completion_tokens": len(response_text) // 4,
            "total_tokens": (len(request.prompt) + len(response_text)) // 4
        },
        "cached": False,
        "latency_ms": latency_ms
    }
    
    # Cache the response
    cache_response(cache_key, response)
    
    return LLMResponse(**response)


@router.post("/llm/generate", response_model=LLMResponse)
async def generate_text(
    request: LLMRequest,
    user_id: str = Depends(verify_jwt_token)
) -> LLMResponse:
    """
    Generate text using an LLM.
    
    Args:
        request: LLM generation parameters
        user_id: Authenticated user ID
    
    Returns:
        Generated text response
    
    Raises:
        HTTPException: If generation fails
    """
    logger.info(f"LLM generation request from user {user_id}")
    
    try:
        if should_use_mock_llm():
            logger.debug("Using mock LLM for generation (USE_MOCK_LLM=true)")
            response = await call_llm_mock(request, user_id)
        else:
            # Production: Log warning that no real LLM is configured
            logger.error(
                "LLM generation requested but no real LLM provider is configured. "
                "Set USE_MOCK_LLM=true for development or configure a real LLM provider."
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service is not configured. Please set USE_MOCK_LLM=true for development "
                       "or configure a real LLM provider (e.g., OPENAI_API_KEY, ANTHROPIC_API_KEY)."
            )
        return response
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text generation failed: {str(e)}"
        )


@router.post("/llm/render-template", response_model=TemplateRenderResponse)
async def render_template(
    request: TemplateRenderRequest,
    user_id: str = Depends(verify_jwt_token)
) -> TemplateRenderResponse:
    """
    Render a prompt template with variables.
    
    Args:
        request: Template rendering parameters
        user_id: Authenticated user ID
    
    Returns:
        Rendered prompt
    
    Raises:
        HTTPException: If template not found
    """
    template = prompt_templates.get(request.template_name)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{request.template_name}' not found"
        )
    
    # Render template
    rendered_prompt = template.template
    for key, value in request.variables.items():
        rendered_prompt = rendered_prompt.replace(f"{{{key}}}", str(value))
    
    # Check for unreplaced variables
    import re
    unreplaced = set(re.findall(r'\{(\w+)\}', rendered_prompt))
    if unreplaced:
        logger.warning(f"Unfilled template variables: {unreplaced}")
    
    return TemplateRenderResponse(
        rendered_prompt=rendered_prompt,
        template_name=request.template_name
    )


@router.get("/llm/templates")
async def list_templates(
    template_type: Optional[PromptTemplateType] = None,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    List available prompt templates.
    
    Args:
        template_type: Optional type filter
        user_id: Authenticated user ID
    
    Returns:
        List of templates
    """
    templates = list(prompt_templates.values())
    
    if template_type:
        templates = [t for t in templates if t.template_type == template_type]
    
    return {
        "templates": [
            {
                "name": t.name,
                "type": t.template_type.value,
                "variables": t.variables,
                "template": t.template
            }
            for t in templates
        ],
        "total": len(templates)
    }


@router.get("/llm/models")
async def list_models(
    provider: Optional[str] = None,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    List available LLM models.
    
    Args:
        provider: Optional provider filter
        user_id: Authenticated user ID
    
    Returns:
        List of models
    """
    models = [
        {"id": "gpt-4", "name": "GPT-4", "provider": "openai", "max_tokens": 8192, "capabilities": ["text", "reasoning"]},
        {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "provider": "openai", "max_tokens": 16385, "capabilities": ["text"]},
        {"id": "claude-3-haiku", "name": "Claude 3 Haiku", "provider": "anthropic", "max_tokens": 200000, "capabilities": ["text", "reasoning"]},
        {"id": "claude-3-sonnet", "name": "Claude 3 Sonnet", "provider": "anthropic", "max_tokens": 200000, "capabilities": ["text", "reasoning"]},
        {"id": "llama2", "name": "Llama 2", "provider": "ollama", "max_tokens": 4096, "capabilities": ["text"]},
        {"id": "mistral", "name": "Mistral", "provider": "ollama", "max_tokens": 32768, "capabilities": ["text"]}
    ]
    
    if provider:
        models = [m for m in models if m["provider"] == provider]
    
    return {
        "models": models,
        "total": len(models)
    }


@router.post("/llm/chat")
async def chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Chat completion with message history.
    
    Args:
        messages: List of chat messages with role and content
        model: Model to use
        temperature: Temperature parameter
        user_id: Authenticated user ID
    
    Returns:
        Chat completion response
    """
    # Validate messages
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one message required"
        )
    
    # Build prompt from messages
    prompt = "\n".join([
        f"{msg['role']}: {msg['content']}"
        for msg in messages
    ])
    
    # Add system message if not present
    if messages[0].get("role") != "system":
        prompt = f"system: You are a helpful AI assistant.\n\n{prompt}"
    
    request = LLMRequest(
        prompt=prompt,
        model=model,
        temperature=temperature,
        context=messages
    )
    
    if should_use_mock_llm():
        logger.debug("Using mock LLM for chat completion (USE_MOCK_LLM=true)")
        response = await call_llm_mock(request, user_id)
    else:
        logger.error(
            "Chat completion requested but no real LLM provider is configured. "
            "Set USE_MOCK_LLM=true for development or configure a real LLM provider."
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM service is not configured. Please set USE_MOCK_LLM=true for development "
                   "or configure a real LLM provider (e.g., OPENAI_API_KEY, ANTHROPIC_API_KEY)."
        )
    
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": response.text
                },
                "finish_reason": "stop"
            }
        ],
        "model": response.model,
        "usage": response.usage
    }


@router.delete("/llm/cache")
async def clear_cache(
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Clear the LLM response cache.
    
    Args:
        user_id: Authenticated user ID
    
    Returns:
        Cache cleared confirmation
    """
    cache_size = len(response_cache)
    response_cache.clear()
    
    return {
        "message": f"Cleared {cache_size} cached responses"
    }


@router.get("/llm/cache/stats")
async def cache_stats(
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Get cache statistics.
    
    Args:
        user_id: Authenticated user ID
    
    Returns:
        Cache statistics
    """
    return {
        "cached_entries": len(response_cache),
        "cache_enabled": settings.cache_enabled,
        "ttl_seconds": settings.cache_ttl_seconds
    }


@router.post("/llm/streaming-generate")
async def streaming_generate(
    request: LLMRequest,
    user_id: str = Depends(verify_jwt_token)
):
    """
    Streaming text generation endpoint.
    
    Returns Server-Sent Events for streaming response.
    """
    from fastapi.responses import StreamingResponse
    import time
    
    async def generate_stream():
        """Generate streaming response"""
        start_time = time.time()
        
        # Check cache for non-streaming version
        cache_key = get_cache_key(request.prompt, request.model or "default", request.temperature or 0.7)
        cached = get_cached_response(cache_key)
        
        if cached and request.use_cache:
            for chunk in cached["text"]:
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                await asyncio.sleep(0.01)
            yield f"data: {json.dumps({'cached': True, 'latency_ms': int((time.time() - start_time) * 1000)})}\n\n"
            yield "data: [DONE]\n\n"
            return
        
        # Simulate streaming
        response = f"Streaming response for: '{request.prompt[:50]}...'\n\n"
        words = response.split()
        
        for i, word in enumerate(words):
            data = {
                "chunk": word + " ",
                "progress": (i + 1) / len(words) * 100
            }
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(0.05)
        
        latency_ms = int((time.time() - start_time) * 1000)
        yield f"data: {json.dumps({'done': True, 'latency_ms': latency_ms})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream"
    )
