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
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from dataclasses import dataclass
from functools import lru_cache

from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from backend.auth import verify_jwt_token
from backend.config import settings as app_settings
from backend.llm_usage_tracker import (
    get_usage_collector,
    initialize_usage_collector,
    UsageEntry,
    UsageSummary,
    UsageContext,
    CostCalculator
)

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
    default_provider: str = Field(default="openai")
    cache_enabled: bool = Field(default=True)
    cache_ttl_seconds: int = Field(default=3600)
    max_tokens: int = Field(default=4096)
    temperature: float = Field(default=0.7)
    # Security: Control mock LLM usage - set to 'true' for development only
    use_mock_llm: bool = Field(default=False)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables


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
    ),
    
    # =============================================================================
    # LOCATION LOGIC LOOP TEMPLATES
    # Ref: "Writing Blueprint That Turns Generic Settings Into Compelling Worlds"
    # Framework: Function → Constraints → Culture → Reputation → Emergent Details
    # =============================================================================
    
    PromptTemplate(
        name="location_function",
        template_type=PromptTemplateType.WORLD_BUILDING,
        template="""You are a master worldbuilder. For the following location, determine its primary function.

Location Name: {location_name}
Genre: {genre}
Tone: {tone}
Basic Description: {description}

Determine the PRIMARY FUNCTION of this location from these categories:
1. ECONOMIC - Trade hub, resource extraction, market
2. DEFENSIVE - Fortress, garrison, watchtower
3. SOCIAL - Pilgrimage site, university, sanctuary
4. LOGISTICAL - Way station, refueling depot, resupply

Also determine a more specific SUB-FUNCTION.

Then write a detailed explanation of WHY this location exists - its core purpose that justifies everything about it.

Respond in JSON format:
{{
  "function": "economic|defensive|social|logistical",
  "sub_function": "specific_sub_function",
  "function_description": "Detailed explanation of why this location exists"
}}""",
        variables=["location_name", "genre", "tone", "description"]
    ),
    
    PromptTemplate(
        name="location_constraints",
        template_type=PromptTemplateType.WORLD_BUILDING,
        template="""You are a master worldbuilder. For this location, determine what constraints and challenges it faces.

Function: {function}
Sub-Function: {sub_function}
Description: {description}
Genre: {genre}

Consider these constraint types:
1. ENVIRONMENTAL - Weather, terrain, natural disasters (cold, heat, floods, earthquakes)
2. RESOURCE SCARCITY - Missing essential resources (no timber, no water, no food)
3. EXTERNAL THREATS - Enemies, monsters, rivals (pirates, dragons, rival kingdom)

For the PRIMARY FUNCTION, identify 2-3 significant constraints that make survival/prosperity difficult.
Each constraint should IMPACT the location's function.

Respond in JSON format:
{{
  "constraints": [
    {{
      "type": "environmental|resource_scarcity|external_threat",
      "description": "Specific description of the constraint",
      "severity": "low|medium|high|critical",
      "impact_on_function": "How this affects the location's primary function"
    }}
  ]
}}""",
        variables=["function", "sub_function", "description", "genre"]
    ),
    
    PromptTemplate(
        name="location_culture",
        template_type=PromptTemplateType.WORLD_BUILDING,
        template="""You are a master worldbuilder. Based on function and constraints, determine how the culture of this location has adapted.

Function: {function}
Constraints: {constraints}

Given these circumstances, how have the people adapted?
Consider:
- Daily BEHAVIORS shaped by constraints
- TRADITIONS that emerged to cope with challenges
- LAWS that address specific threats or scarcities
- TECHNOLOGIES/innovations developed to overcome limitations
- SOCIAL STRUCTURE - how is society organized?
- What SKILLS are most valued?
- What PROFESSIONS are revered?
- What is their WORLDVIEW?
- How do they view DANGER?
- What is their relationship with the ENVIRONMENT?

Respond in JSON format:
{{
  "culture": {{
    "behaviors": ["list of daily behaviors"],
    "traditions": ["list of cultural traditions"],
    "laws": ["list of important laws"],
    "technologies": ["list of technologies/innovations"],
    "social_hierarchy": "description of social structure",
    "valued_skills": ["list of valued skills"],
    "revered_professions": ["list of respected professions"],
    "worldview": "how they see their world",
    "attitude_towards_danger": "how they view threats",
    "relationship_with_environment": "harmony, struggle, adaptation"
  }}
}}""",
        variables=["function", "constraints"]
    ),
    
    PromptTemplate(
        name="location_reputation",
        template_type=PromptTemplateType.WORLD_BUILDING,
        template="""You are a master worldbuilder. Determine how the outside world perceives this place, and how that differs from reality.

Function: {function}
Constraints: {constraints}
Culture: {culture}
Location Name: {location_name}

Consider:
- What do OUTSIDERS believe about this place? (simplified, often exaggerated)
- What RUMORS exist about wealth or danger?
- How does REALITY differ from reputation?
- What do LOCALS know that outsiders don't?
- Is the reputation a source of PRIDE or SHAME?
- How do locals HANDLE the reputation?
- Who is ATTRACTED to this place?
- Who AVOIDS this place?

Respond in JSON format:
{{
  "reputation": {{
    "external_reputation": "simplified external view",
    "rumored_wealth": "what outsiders think they can find",
    "perceived_danger": "how dangerous outsiders think it is",
    "reality_vs_rumor": "how reality differs",
    "what_locals_know": "insider knowledge",
    "pride_shame": "source of local sentiment",
    "how_locals_handle_it": "how they respond to reputation",
    "who_comes_here": ["types of people drawn here"],
    "who_avoids": ["types of people who stay away"]
  }}
}}""",
        variables=["function", "constraints", "culture", "location_name"]
    ),
    
    PromptTemplate(
        name="location_emergent_details",
        template_type=PromptTemplateType.WORLD_BUILDING,
        template="""You are a master worldbuilder. Generate names, landmarks, and geography that emerge from the location's logic.

Function: {function}
Sub-Function: {sub_function}
Constraints: {constraints}
Culture: {culture}
Reputation: {reputation}
Genre: {genre}
Location Name: {location_name}

Following the Location Logic Loop framework, details should emerge LOGICALLY from everything above.

Consider:
- NAME ETYMOLOGY - the name should be a "fossilized piece of history"
- LANDMARKS - specific places that reflect the function and constraints
- GEOGRAPHY - how the landscape serves the function and constraints
- ARCHITECTURAL STYLE - influenced by constraints and available materials
- VISUAL ELEMENTS - colors, materials, overall aesthetic

Respond in JSON format:
{{
  "emergent_details": {{
    "name_origin": "why this name exists (fossilized history)",
    "name_meaning": "what the name means in local terms",
    "historical_names": ["previous names if any"],
    "landmarks": [
      {{"name": "", "description": "", "significance": ""}}
    ],
    "notable_buildings": [
      {{"name": "", "type": "", "description": ""}}
    ],
    "layout_principle": "how geography serves function",
    "key_geographical_features": ["list of important features"],
    "defensive_features": ["if applicable"],
    "architectural_style": "style influenced by constraints",
    "color_palette": ["colors common here"],
    "common_materials": ["building materials used"]
  }}
}}""",
        variables=["function", "sub_function", "constraints", "culture", "reputation", "genre", "location_name"]
    ),
    
    PromptTemplate(
        name="location_story_hooks",
        template_type=PromptTemplateType.WORLD_BUILDING,
        template="""You are a master storyteller. Generate narrative hooks based on the Location Logic Loop analysis.

Function: {function}
Constraints: {constraints}
Culture: {culture}
Reputation: {reputation}
Emergent Details: {emergent_details}

Generate 4-6 story hooks that arise naturally from the location's logic. These should be:
- Specific to the location's unique circumstances
- Narrative opportunities for conflict and drama
- Opportunities to showcase the location's distinctiveness

Respond in JSON format:
{{
  "story_hooks": [
    "specific narrative hook 1",
    "specific narrative hook 2",
    "..."
  ]
}}""",
        variables=["function", "constraints", "culture", "reputation", "emergent_details"]
    ),
    
    PromptTemplate(
        name="location_full_generation",
        template_type=PromptTemplateType.WORLD_BUILDING,
        template="""You are a master worldbuilder using the "Location Logic Loop" framework.

Create a fully developed location using this 5-layer framework:

LAYER 1 - FUNCTION: Why does this location exist? (economic, defensive, social, logistical)
LAYER 2 - CONSTRAINTS: What pressures/challenges does it face? (environmental, scarcity, threats)
LAYER 3 - CULTURE: How do people adapt? (behaviors, traditions, laws, technologies)
LAYER 4 - REPUTATION: How do others see it? (external perception vs internal reality)
LAYER 5 - EMERGENT DETAILS: Names, landmarks, geography that emerge from the logic

INPUT:
- Location Name: {location_name}
- Genre: {genre}
- Tone: {tone}
- Brief Description: {description}
- Setting Context: {context}

OUTPUT:
Complete the location with ALL layers, ensuring each detail LOGICALLY FOLLOWS from the previous layer.
The rule: Nothing is random. Every detail should be explainable by the function+constraints.

Respond as a comprehensive JSON object with all layers populated.""",
        variables=["location_name", "genre", "tone", "description", "context"]
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


def get_available_llm_provider() -> Optional[str]:
    """
    Check which LLM provider is configured and available.
    
    Returns:
        str: Provider name ('openai', 'anthropic', 'ollama') or None if none configured
    """
    # Check for OpenAI API key
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    
    # Check for Anthropic API key
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    
    # Check for Ollama (local LLM)
    ollama_host = os.environ.get("OLLAMA_HOST", app_settings.OLLAMA_BASE_URL)
    # Note: We don't actually ping Ollama here to avoid latency
    # The presence of OLLAMA_HOST or default localhost is enough
    if os.environ.get("OLLAMA_HOST") or os.environ.get("USE_OLLAMA"):
        return "ollama"
    
    return None


async def call_llm_openai(request: LLMRequest, user_id: str) -> LLMResponse:
    """
    Make a real LLM call to OpenAI API.
    
    Args:
        request: LLM request parameters
        user_id: Authenticated user ID for logging
    
    Returns:
        LLMResponse with generated text
    
    Raises:
        HTTPException: If OpenAI API call fails
    """
    import time
    import httpx
    
    start_time = time.time()
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
        )
    
    # Check cache first
    cache_key = get_cache_key(request.prompt, request.model or "gpt-3.5-turbo", request.temperature or 0.7)
    cached = get_cached_response(cache_key)
    if cached and request.use_cache:
        return LLMResponse(**cached)
    
    model = request.model or "gpt-3.5-turbo"
    
    # Build messages for chat completion
    messages = [{"role": "user", "content": request.prompt}]
    if request.context:
        messages = request.context
    
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": request.temperature or 0.7,
                    "max_tokens": request.max_tokens or settings.max_tokens
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"OpenAI API error: {response.status_code}"
                )
            
            data = response.json()
            response_text = data["choices"][0]["message"]["content"]
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            result = {
                "text": response_text,
                "model": model,
                "provider": "openai",
                "usage": data.get("usage", {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0
                }),
                "cached": False,
                "latency_ms": latency_ms
            }
            
            # Cache the response
            cache_response(cache_key, result)
            
            return LLMResponse(**result)
            
        except httpx.TimeoutException:
            logger.error("OpenAI API timeout")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="OpenAI API request timed out"
            )
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API call failed: {str(e)}"
            )


async def call_llm_anthropic(request: LLMRequest, user_id: str) -> LLMResponse:
    """
    Make a real LLM call to Anthropic Claude API.
    
    Args:
        request: LLM request parameters
        user_id: Authenticated user ID for logging
    
    Returns:
        LLMResponse with generated text
    
    Raises:
        HTTPException: If Anthropic API call fails
    """
    import time
    import httpx
    
    start_time = time.time()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable."
        )
    
    # Check cache first
    cache_key = get_cache_key(request.prompt, request.model or "claude-3-haiku-20240307", request.temperature or 0.7)
    cached = get_cached_response(cache_key)
    if cached and request.use_cache:
        return LLMResponse(**cached)
    
    model = request.model or "claude-3-haiku-20240307"
    
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "max_tokens": request.max_tokens or settings.max_tokens,
                    "messages": [{"role": "user", "content": request.prompt}]
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Anthropic API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Anthropic API error: {response.status_code}"
                )
            
            data = response.json()
            response_text = data["content"][0]["text"]
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            result = {
                "text": response_text,
                "model": model,
                "provider": "anthropic",
                "usage": {
                    "prompt_tokens": data.get("usage", {}).get("input_tokens", 0),
                    "completion_tokens": data.get("usage", {}).get("output_tokens", 0),
                    "total_tokens": data.get("usage", {}).get("input_tokens", 0) + data.get("usage", {}).get("output_tokens", 0)
                },
                "cached": False,
                "latency_ms": latency_ms
            }
            
            # Cache the response
            cache_response(cache_key, result)
            
            return LLMResponse(**result)
            
        except httpx.TimeoutException:
            logger.error("Anthropic API timeout")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Anthropic API request timed out"
            )
        except Exception as e:
            logger.error(f"Anthropic API call failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Anthropic API call failed: {str(e)}"
            )


async def call_llm_ollama(request: LLMRequest, user_id: str) -> LLMResponse:
    """
    Make a real LLM call to local Ollama server.
    
    Args:
        request: LLM request parameters
        user_id: Authenticated user ID for logging
    
    Returns:
        LLMResponse with generated text
    
    Raises:
        HTTPException: If Ollama API call fails
    """
    import time
    import httpx
    
    start_time = time.time()
    ollama_host = os.environ.get("OLLAMA_HOST", app_settings.OLLAMA_BASE_URL)
    
    # Check cache first
    cache_key = get_cache_key(request.prompt, request.model or "llama2", request.temperature or 0.7)
    cached = get_cached_response(cache_key)
    if cached and request.use_cache:
        return LLMResponse(**cached)
    
    model = request.model or "llama2"
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(
                f"{ollama_host}/api/generate",
                json={
                    "model": model,
                    "prompt": request.prompt,
                    "stream": False,
                    "options": {
                        "temperature": request.temperature or 0.7,
                        "num_predict": request.max_tokens or settings.max_tokens
                    }
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Ollama API error: {response.status_code}"
                )
            
            data = response.json()
            response_text = data.get("response", "")
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            result = {
                "text": response_text,
                "model": model,
                "provider": "ollama",
                "usage": {
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0),
                    "total_tokens": data.get("prompt_eval_count", 0) + data.get("eval_count", 0)
                },
                "cached": False,
                "latency_ms": latency_ms
            }
            
            # Cache the response
            cache_response(cache_key, result)
            
            return LLMResponse(**result)
            
        except httpx.TimeoutException:
            logger.error("Ollama API timeout")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Ollama API request timed out"
            )
        except httpx.ConnectError:
            logger.error(f"Cannot connect to Ollama at {ollama_host}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Cannot connect to Ollama server at {ollama_host}. Ensure Ollama is running."
            )
        except Exception as e:
            logger.error(f"Ollama API call failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ollama API call failed: {str(e)}"
            )


async def call_llm_real(request: LLMRequest, user_id: str) -> LLMResponse:
    """
    Make a real LLM call using the configured provider.
    
    This function routes to the appropriate LLM provider based on
    available API keys and configuration.
    
    Args:
        request: LLM request parameters
        user_id: Authenticated user ID for logging
    
    Returns:
        LLMResponse with generated text
    
    Raises:
        HTTPException: If no provider is configured or API call fails
    """
    # Determine which provider to use
    provider = request.provider or get_available_llm_provider()
    
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No LLM provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or USE_OLLAMA environment variable."
        )
    
    logger.info(f"Using LLM provider: {provider} for user {user_id}")
    
    if provider == "openai":
        return await call_llm_openai(request, user_id)
    elif provider == "anthropic":
        return await call_llm_anthropic(request, user_id)
    elif provider == "ollama":
        return await call_llm_ollama(request, user_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unknown LLM provider: {provider}"
        )


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
        # Security: Only use mock LLM when explicitly enabled for development/testing
        # In production, USE_MOCK_LLM should be false (default) and a real provider should be configured
        if should_use_mock_llm():
            logger.debug("Using mock LLM for generation (USE_MOCK_LLM=true) - DEVELOPMENT MODE ONLY")
            response = await call_llm_mock(request, user_id)
        else:
            # Production: Use real LLM provider (OpenAI, Anthropic, or Ollama)
            logger.info(f"Using real LLM provider for generation (production mode)")
            response = await call_llm_real(request, user_id)
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
    
    # Security: Only use mock LLM when explicitly enabled for development/testing
    # In production, USE_MOCK_LLM should be false (default) and a real provider should be configured
    if should_use_mock_llm():
        logger.debug("Using mock LLM for chat completion (USE_MOCK_LLM=true) - DEVELOPMENT MODE ONLY")
        response = await call_llm_mock(request, user_id)
    else:
        # Production: Use real LLM provider (OpenAI, Anthropic, or Ollama)
        logger.info(f"Using real LLM provider for chat completion (production mode)")
        response = await call_llm_real(request, user_id)
    
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
    user_id: str = Depends(verify_jwt_token),
    accept: str = Header(default="application/json")
):
    """
    Streaming text generation endpoint.
    
    Returns Server-Sent Events for streaming response when Accept header
    is set to 'text/event-stream', otherwise returns standard JSON response.
    
    Event Types:
    - start: Generation started with request_id, model, provider
    - chunk: Text chunk received
    - usage: Token usage information (when available)
    - done: Generation complete with stats
    - error: Error occurred with message and code
    
    Args:
        request: LLM generation parameters
        user_id: Authenticated user ID
        accept: Accept header to determine response format
        
    Returns:
        StreamingResponse for SSE or LLMResponse for JSON
    """
    from fastapi.responses import StreamingResponse
    from backend.llm_streaming import (
        StreamingRequest,
        stream_llm_response,
        get_stream_manager
    )
    
    # If client doesn't accept SSE, fall back to standard generation
    if accept != "text/event-stream":
        return await generate_text(request, user_id)
    
    logger.info(f"Streaming LLM generation request from user {user_id}")
    
    # Create streaming request
    stream_request = StreamingRequest(
        prompt=request.prompt,
        model=request.model,
        provider=request.provider,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        context=request.context
    )
    
    # Security: Check if mock LLM should be used
    if should_use_mock_llm():
        # Use mock streaming for development
        async def mock_stream():
            import time
            start_time = time.time()
            request_id = str(uuid.uuid4())
            
            # Send start event
            yield f'data: {json.dumps({"type": "start", "request_id": request_id, "model": "mock", "provider": "mock"})}\n\n'
            
            # Simulate streaming response
            mock_response = f"Mock streaming response for: '{request.prompt[:50]}...'\n\n"
            mock_response += "This is a simulated streaming response for development.\n"
            
            words = mock_response.split()
            for i, word in enumerate(words):
                yield f'data: {json.dumps({"type": "chunk", "text": word + " "})}\n\n'
                await asyncio.sleep(0.05)
            
            # Send usage event
            yield f'data: {json.dumps({"type": "usage", "prompt_tokens": len(request.prompt) // 4, "completion_tokens": len(mock_response) // 4, "total_tokens": (len(request.prompt) + len(mock_response)) // 4})}\n\n'
            
            # Send done event
            latency_ms = int((time.time() - start_time) * 1000)
            yield f'data: {json.dumps({"type": "done", "request_id": request_id, "stats": {"latency_ms": latency_ms, "total_chunks": len(words)}})}\n\n'
        
        return StreamingResponse(
            mock_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    
    # Production: Use real streaming
    return StreamingResponse(
        stream_llm_response(stream_request, request.provider),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# =============================================================================
# TOKEN USAGE TRACKING ENDPOINTS
# =============================================================================

# Initialize usage collector on module load
_usage_collector = None


def get_or_initialize_usage_collector():
    """Get or initialize the usage collector singleton."""
    global _usage_collector
    if _usage_collector is None:
        _usage_collector = initialize_usage_collector()
    return _usage_collector


class UsageQueryParams(BaseModel):
    """Query parameters for usage statistics"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    provider: Optional[str] = None
    feature: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class CostEstimateRequest(BaseModel):
    """Request model for cost estimation"""
    provider: str = Field(..., description="LLM provider (openai, anthropic, ollama)")
    model: str = Field(..., description="Model name")
    prompt_tokens: int = Field(..., ge=0, description="Estimated prompt tokens")
    completion_tokens: int = Field(..., ge=0, description="Estimated completion tokens")


class CostEstimateResponse(BaseModel):
    """Response model for cost estimation"""
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    currency: str = "USD"
    pricing_source: str


@router.get("/llm/usage", response_model=UsageSummary)
async def get_usage_statistics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    provider: Optional[str] = None,
    feature: Optional[str] = None,
    user_id: Optional[str] = Depends(verify_jwt_token)
) -> UsageSummary:
    """
    Get current usage statistics.
    
    Args:
        start_date: Optional start date for the query period
        end_date: Optional end date for the query period
        provider: Optional filter by provider
        feature: Optional filter by feature
        user_id: Authenticated user ID
    
    Returns:
        UsageSummary: Aggregated usage statistics
    """
    collector = get_or_initialize_usage_collector()
    
    # Default to last 30 days if no dates provided
    if not start_date:
        start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        from datetime import timedelta
        start_date = start_date - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Get usage summary from aggregator
    summary = collector.aggregator.get_summary(
        start_date=start_date,
        end_date=end_date,
        provider=provider,
        feature=feature,
        user_id=user_id
    )
    
    return summary


@router.get("/llm/usage/project/{project_id}", response_model=UsageSummary)
async def get_project_usage(
    project_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: str = Depends(verify_jwt_token)
) -> UsageSummary:
    """
    Get project-specific usage statistics.
    
    Args:
        project_id: Project ID to get usage for
        start_date: Optional start date for the query period
        end_date: Optional end date for the query period
        user_id: Authenticated user ID
    
    Returns:
        UsageSummary: Aggregated usage statistics for the project
    """
    collector = get_or_initialize_usage_collector()
    
    # Default to last 30 days if no dates provided
    if not start_date:
        start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        from datetime import timedelta
        start_date = start_date - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Get usage summary for specific project
    summary = collector.aggregator.get_summary(
        start_date=start_date,
        end_date=end_date,
        project_id=project_id,
        user_id=user_id
    )
    
    return summary


@router.post("/llm/usage/cost-estimate", response_model=CostEstimateResponse)
async def estimate_cost(
    request: CostEstimateRequest,
    user_id: str = Depends(verify_jwt_token)
) -> CostEstimateResponse:
    """
    Estimate cost for a request.
    
    Args:
        request: Cost estimation request with provider, model, and token counts
        user_id: Authenticated user ID
    
    Returns:
        CostEstimateResponse: Estimated cost breakdown
    
    Raises:
        HTTPException: If provider or model is not supported
    """
    calculator = CostCalculator()
    
    try:
        cost = calculator.calculate_cost(
            provider=request.provider,
            model=request.model,
            prompt_tokens=request.prompt_tokens,
            completion_tokens=request.completion_tokens
        )
        
        return CostEstimateResponse(
            provider=request.provider,
            model=request.model,
            prompt_tokens=request.prompt_tokens,
            completion_tokens=request.completion_tokens,
            total_tokens=request.prompt_tokens + request.completion_tokens,
            estimated_cost=cost,
            currency="USD",
            pricing_source="internal_pricing_table"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/llm/usage/history")
async def get_usage_history(
    limit: int = 100,
    offset: int = 0,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Get usage history entries.
    
    Args:
        limit: Maximum number of entries to return
        offset: Offset for pagination
        user_id: Authenticated user ID
    
    Returns:
        Dict with usage entries and pagination info
    """
    collector = get_or_initialize_usage_collector()
    
    entries = collector.store.get_entries(
        user_id=user_id,
        limit=limit,
        offset=offset
    )
    
    total_count = collector.store.count_entries(user_id=user_id)
    
    return {
        "entries": [e.to_dict() for e in entries],
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total_count,
            "has_more": (offset + limit) < total_count
        }
    }


@router.get("/llm/usage/providers")
async def get_provider_pricing(
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Get pricing information for all supported providers.
    
    Args:
        user_id: Authenticated user ID
    
    Returns:
        Dict with pricing information per provider and model
    """
    calculator = CostCalculator()
    
    return {
        "providers": calculator.get_all_pricing(),
        "currency": "USD",
        "unit": "per 1K tokens",
        "note": "Prices are estimates based on standard pricing. Actual costs may vary."
    }
