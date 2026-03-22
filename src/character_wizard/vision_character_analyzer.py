"""
Vision Character Analyzer for Character Creation from Images.

This module provides:
- Image analysis using vision models (LLaVA, GPT-4 Vision, etc.)
- Character description generation from images
- Physical attribute extraction
- Style integration with project genre

Requirements: Character Creation Enhancement from User Images
"""

import base64
import io
import json
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

# Try to import image processing libraries
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logging.warning("PIL not available - image processing limited")

# Try to import requests for API calls
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# Try to import aiohttp for async API calls
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)


class VisionProvider(Enum):
    """Available vision model providers"""
    OLLAMA = "ollama"  # Local LLaVA via Ollama
    OPENAI = "openai"  # GPT-4 Vision
    ANTHROPIC = "anthropic"  # Claude Vision
    LOCAL = "local"  # Local model
    AUTO = "auto"  # Auto-detect


@dataclass
class PhysicalAttributes:
    """Extracted physical attributes from image"""
    # Basic appearance
    gender: Optional[str] = None
    age_range: Optional[str] = None
    ethnicity_hint: Optional[str] = None
    
    # Face features
    face_shape: Optional[str] = None
    eye_color: Optional[str] = None
    eye_shape: Optional[str] = None
    eyebrow_style: Optional[str] = None
    
    # Hair
    hair_color: Optional[str] = None
    hair_style: Optional[str] = None
    hair_length: Optional[str] = None
    
    # Skin
    skin_tone: Optional[str] = None
    skin_texture: Optional[str] = None
    
    # Body
    body_type: Optional[str] = None
    height_hint: Optional[str] = None
    
    # Distinctive features
    facial_hair: Optional[str] = None
    glasses: Optional[str] = None
    accessories: List[str] = field(default_factory=list)
    distinctive_features: List[str] = field(default_factory=list)
    
    # Clothing
    clothing_style: Optional[str] = None
    clothing_colors: List[str] = field(default_factory=list)
    
    # Expression and mood
    expression: Optional[str] = None
    mood_hint: Optional[str] = None


@dataclass
class CharacterAnalysisResult:
    """Result of character analysis from image"""
    success: bool
    description: Optional[str] = None
    short_description: Optional[str] = None
    physical_attributes: Optional[PhysicalAttributes] = None
    suggested_name: Optional[str] = None
    suggested_personality: List[str] = field(default_factory=list)
    suggested_role: Optional[str] = None
    style_adaptations: Dict[str, str] = field(default_factory=dict)
    raw_response: Optional[str] = None
    error_message: Optional[str] = None
    confidence: float = 0.0


@dataclass
class VisionAnalyzerConfig:
    """Configuration for vision analyzer"""
    provider: VisionProvider = VisionProvider.AUTO
    ollama_base_url: str = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.environ.get("OLLAMA_MODEL", "llava:13b")  # default to env or llava
    openai_api_key: Optional[str] = os.environ.get("OPENAI_API_KEY")
    openai_model: str = os.environ.get("OPENAI_MODEL", "gpt-4-vision-preview")
    anthropic_api_key: Optional[str] = os.environ.get("ANTHROPIC_API_KEY")
    anthropic_model: str = os.environ.get("ANTHROPIC_MODEL", "claude-3-opus-20240229")
    
    # Analysis settings
    max_tokens: int = 1024
    temperature: float = 0.3
    detail_level: str = "high"  # low, medium, high
    
    # Timeout settings
    timeout_seconds: int = 60


class VisionCharacterAnalyzer:
    """
    Analyzes images to extract character information using vision models.
    
    Supports multiple vision providers:
    - Ollama (local LLaVA)
    - OpenAI (GPT-4 Vision)
    - Anthropic (Claude Vision)
    """
    
    def __init__(self, config: Optional[VisionAnalyzerConfig] = None):
        """Initialize the vision character analyzer"""
        self.config = config or VisionAnalyzerConfig()
        self._provider_instance = None
        self._initialized = False
        
        # Auto-detect provider if needed
        if self.config.provider == VisionProvider.AUTO:
            self.config.provider = self._auto_detect_provider()
        
        self._initialized = True
        logger.info(f"Vision character analyzer initialized with provider: {self.config.provider.value}")
    
    def _auto_detect_provider(self) -> VisionProvider:
        """Auto-detect the best available vision provider"""
        # Check Ollama first (local, free)
        if self._check_ollama_available():
            return VisionProvider.OLLAMA
        
        # Check OpenAI
        if self.config.openai_api_key or os.environ.get("OPENAI_API_KEY"):
            return VisionProvider.OPENAI
        
        # Check Anthropic
        if self.config.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY"):
            return VisionProvider.ANTHROPIC
        
        # Default to Ollama
        logger.warning("No vision provider detected, defaulting to Ollama")
        return VisionProvider.OLLAMA
    
    def _check_ollama_available(self) -> bool:
        """Check if Ollama is available and has vision-capable models"""
        if not REQUESTS_AVAILABLE:
            return False
        
        try:
            response = requests.get(
                f"{self.config.ollama_base_url}/api/tags",
                timeout=5
            )
            if response.status_code == 200:
                # Check if configured model or any vision-capable model is available
                models = response.json().get("models", [])
                
                # Check if the configured model is present
                configured_model = self.config.ollama_model.lower()
                for model in models:
                    model_name = model.get("name", "").lower()
                    if model_name == configured_model or model_name.startswith(configured_model + ":"):
                        return True
                
                # Fallback: Check if any known vision model is available
                vision_keywords = ["llava", "bakllava", "moondream", "gemma3", "qwen-vl", "qwen3-vl"]
                for model in models:
                    model_name = model.get("name", "").lower()
                    if any(kw in model_name for kw in vision_keywords):
                        return True
        except Exception as e:
            logger.debug(f"Ollama availability check failed: {e}")
            pass
        return False
    
    async def analyze_image(
        self,
        image: Union[np.ndarray, str, Path, Image.Image],
        genre: Optional[str] = None,
        style: Optional[str] = None,
        additional_context: Optional[str] = None,
        target_gender: Optional[str] = None,
        target_age: Optional[str] = None
    ) -> CharacterAnalysisResult:
        """
        Analyze an image and extract character information.
        
        Args:
            image: Input image (numpy array, file path, or PIL Image)
            genre: Project genre for style adaptation
            style: Visual style for description adaptation
            additional_context: Additional context for analysis
            target_gender: Optional gender hint (user-provided)
            target_age: Optional age range hint (user-provided)
            
        Returns:
            CharacterAnalysisResult with extracted information
        """
        if not self._initialized:
            return CharacterAnalysisResult(
                success=False,
                error_message="Vision analyzer not initialized"
            )
        
        try:
            # Convert image to base64
            image_base64 = self._image_to_base64(image)
            if not image_base64:
                return CharacterAnalysisResult(
                    success=False,
                    error_message="Failed to convert image to base64"
                )
            
            # Build the analysis prompt
            prompt = self._build_analysis_prompt(
                genre, 
                style, 
                additional_context, 
                target_gender, 
                target_age
            )
            
            # Call the appropriate vision provider
            if self.config.provider == VisionProvider.OLLAMA:
                response = await self._call_ollama_vision(image_base64, prompt)
            elif self.config.provider == VisionProvider.OPENAI:
                response = await self._call_openai_vision(image_base64, prompt)
            elif self.config.provider == VisionProvider.ANTHROPIC:
                response = await self._call_anthropic_vision(image_base64, prompt)
            else:
                return CharacterAnalysisResult(
                    success=False,
                    error_message=f"Unsupported provider: {self.config.provider}"
                )
            
            if not response:
                return CharacterAnalysisResult(
                    success=False,
                    error_message="No response from vision model"
                )
            
            # Parse the response
            return self._parse_analysis_response(response, genre, style)
            
        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            return CharacterAnalysisResult(
                success=False,
                error_message=str(e)
            )
    
    def _image_to_base64(
        self, 
        image: Union[np.ndarray, str, Path, Image.Image]
    ) -> Optional[str]:
        """Convert image to base64 string"""
        try:
            if isinstance(image, str) and os.path.isfile(image):
                with open(image, "rb") as f:
                    return base64.b64encode(f.read()).decode("utf-8")
            
            elif isinstance(image, Path):
                with open(image, "rb") as f:
                    return base64.b64encode(f.read()).decode("utf-8")
            
            elif isinstance(image, np.ndarray):
                if PIL_AVAILABLE:
                    img = Image.fromarray(image)
                    buffer = io.BytesIO()
                    img.save(buffer, format="PNG")
                    return base64.b64encode(buffer.getvalue()).decode("utf-8")
                else:
                    import cv2
                    _, buffer = cv2.imencode('.png', image)
                    return base64.b64encode(buffer).decode("utf-8")
            
            elif PIL_AVAILABLE and isinstance(image, Image.Image):
                buffer = io.BytesIO()
                image.save(buffer, format="PNG")
                return base64.b64encode(buffer.getvalue()).decode("utf-8")
            
        except Exception as e:
            logger.error(f"Failed to convert image to base64: {e}")
        
        return None
    
    def _build_analysis_prompt(
        self,
        genre: Optional[str] = None,
        style: Optional[str] = None,
        additional_context: Optional[str] = None,
        target_gender: Optional[str] = None,
        target_age: Optional[str] = None
    ) -> str:
        """Build the analysis prompt for the vision model"""
        prompt = """Analyze this image and extract detailed character information for character creation. 
Your description and suggestions MUST strictly adhere to the specified narrative genre.

Provide your response as a JSON object with the following structure:

{
    "description": "A detailed visual description of the character (2-3 sentences)",
    "short_description": "A concise one-sentence description",
    "physical_attributes": {
        "gender": "male/female/androgynous/unclear",
        "age_range": "child/teenager/young adult/middle-aged/elderly",
        "face_shape": "oval/round/square/heart/oblong",
        "eye_color": "brown/blue/green/hazel/gray/other",
        "eye_shape": "almond/round/hooded/upturned/downturned",
        "hair_color": "black/brown/blonde/red/gray/white/other",
        "hair_style": "short/medium/long, straight/wavy/curly, etc.",
        "hair_length": "very short/short/medium/long/very long",
        "skin_tone": "fair/light/medium/olive/tan/dark",
        "body_type": "slim/average/athletic/muscular/heavy",
        "facial_hair": "none/stubble/goatee/beard/full beard",
        "glasses": "none/reading glasses/sunglasses/other",
        "accessories": ["list of visible accessories"],
        "distinctive_features": ["scars", "tattoos", "birthmarks", "piercings", "etc."],
        "clothing_style": "casual/formal/sporty/traditional/etc.",
        "clothing_colors": ["list of main clothing colors"],
        "expression": "neutral/smiling/serious/surprised/etc.",
        "mood_hint": "confident/shy/mysterious/friendly/etc."
    },
    "suggested_name": "A name suggestion based on appearance and genre",
    "suggested_personality": ["trait1", "trait2", "trait3"],
    "suggested_role": "protagonist/antagonist/mentor/sidekick/love interest/etc."
}
"""
        
        if genre:
            prompt += f"\nCRITICAL: This character is for a {genre.upper()} story. "
            prompt += f"STRICT ADHERENCE REQUIRED: DO NOT use fantasy tropes (like medieval armor, swords, magic orcs) if the genre is contemporary or sci-fi. "
            prompt += f"All clothing, accessories, and descriptions MUST be consistent with a {genre} setting.\n"
            prompt += f"Ensure the description, suggested personality, and role are perfectly matched to the {genre} world.\n"
        
        if target_gender:
            prompt += f"\nHINT: The user identifies this character as {target_gender.upper()}. Prioritize this in your analysis.\n"
        
        if target_age:
            prompt += f"\nHINT: The character's age range is estimated as {target_age.upper()}. Use this as a reference.\n"
        
        if style:
            prompt += f"\nThe visual style is {style}. Adapt the description accordingly.\n"
        
        if additional_context:
            prompt += f"\nAdditional context: {additional_context}\n"
        
        prompt += "\nIMPORTANT: Respond ONLY with the JSON object, no additional text."
        
        return prompt
    
    async def _call_ollama_vision(
        self, 
        image_base64: str, 
        prompt: str
    ) -> Optional[str]:
        """Call Ollama vision API"""
        if not AIOHTTP_AVAILABLE:
            # Fallback to synchronous requests
            return self._call_ollama_vision_sync(image_base64, prompt)
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.config.ollama_model,
                    "prompt": prompt,
                    "images": [image_base64],
                    "stream": False,
                    "options": {
                        "num_predict": self.config.max_tokens,
                        "temperature": self.config.temperature
                    }
                }
                
                async with session.post(
                    f"{self.config.ollama_base_url}/api/generate",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.config.timeout_seconds)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("response", "")
                    else:
                        error_text = await response.text()
                        logger.error(f"Ollama API error: {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Ollama vision call failed: {e}")
            return None
    
    def _call_ollama_vision_sync(
        self, 
        image_base64: str, 
        prompt: str
    ) -> Optional[str]:
        """Synchronous Ollama vision call"""
        if not REQUESTS_AVAILABLE:
            return None
        
        try:
            payload = {
                "model": self.config.ollama_model,
                "prompt": prompt,
                "images": [image_base64],
                "stream": False,
                "options": {
                    "num_predict": self.config.max_tokens,
                    "temperature": self.config.temperature
                }
            }
            
            response = requests.post(
                f"{self.config.ollama_base_url}/api/generate",
                json=payload,
                timeout=self.config.timeout_seconds
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "")
            else:
                logger.error(f"Ollama API error: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Ollama vision call failed: {e}")
            return None
    
    async def _call_openai_vision(
        self, 
        image_base64: str, 
        prompt: str
    ) -> Optional[str]:
        """Call OpenAI GPT-4 Vision API"""
        api_key = self.config.openai_api_key or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OpenAI API key not configured")
            return None
        
        if not AIOHTTP_AVAILABLE:
            return self._call_openai_vision_sync(image_base64, prompt)
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "model": self.config.openai_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{image_base64}",
                                        "detail": self.config.detail_level
                                    }
                                }
                            ]
                        }
                    ],
                    "max_tokens": self.config.max_tokens,
                    "temperature": self.config.temperature
                }
                
                async with session.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.config.timeout_seconds)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result["choices"][0]["message"]["content"]
                    else:
                        error_text = await response.text()
                        logger.error(f"OpenAI API error: {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"OpenAI vision call failed: {e}")
            return None
    
    def _call_openai_vision_sync(
        self, 
        image_base64: str, 
        prompt: str
    ) -> Optional[str]:
        """Synchronous OpenAI vision call"""
        if not REQUESTS_AVAILABLE:
            return None
        
        api_key = self.config.openai_api_key or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return None
        
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.config.openai_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_base64}",
                                    "detail": self.config.detail_level
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature
            }
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=self.config.timeout_seconds
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"OpenAI API error: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"OpenAI vision call failed: {e}")
            return None
    
    async def _call_anthropic_vision(
        self, 
        image_base64: str, 
        prompt: str
    ) -> Optional[str]:
        """Call Anthropic Claude Vision API"""
        api_key = self.config.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            logger.error("Anthropic API key not configured")
            return None
        
        if not AIOHTTP_AVAILABLE:
            return self._call_anthropic_vision_sync(image_base64, prompt)
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "model": self.config.anthropic_model,
                    "max_tokens": self.config.max_tokens,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": "image/png",
                                        "data": image_base64
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": prompt
                                }
                            ]
                        }
                    ]
                }
                
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.config.timeout_seconds)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result["content"][0]["text"]
                    else:
                        error_text = await response.text()
                        logger.error(f"Anthropic API error: {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Anthropic vision call failed: {e}")
            return None
    
    def _call_anthropic_vision_sync(
        self, 
        image_base64: str, 
        prompt: str
    ) -> Optional[str]:
        """Synchronous Anthropic vision call"""
        if not REQUESTS_AVAILABLE:
            return None
        
        api_key = self.config.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return None
        
        try:
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.config.anthropic_model,
                "max_tokens": self.config.max_tokens,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": image_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            }
            
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload,
                timeout=self.config.timeout_seconds
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["content"][0]["text"]
            else:
                logger.error(f"Anthropic API error: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Anthropic vision call failed: {e}")
            return None
    
    def _parse_analysis_response(
        self,
        response: str,
        genre: Optional[str] = None,
        style: Optional[str] = None
    ) -> CharacterAnalysisResult:
        """Parse the vision model response"""
        try:
            # Try to extract JSON from response
            json_str = response
            
            # Handle markdown code blocks
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            
            # Parse JSON
            data = json.loads(json_str.strip())
            
            # Extract physical attributes
            attrs_data = data.get("physical_attributes", {})
            physical_attrs = PhysicalAttributes(
                gender=attrs_data.get("gender"),
                age_range=attrs_data.get("age_range"),
                face_shape=attrs_data.get("face_shape"),
                eye_color=attrs_data.get("eye_color"),
                eye_shape=attrs_data.get("eye_shape"),
                hair_color=attrs_data.get("hair_color"),
                hair_style=attrs_data.get("hair_style"),
                hair_length=attrs_data.get("hair_length"),
                skin_tone=attrs_data.get("skin_tone"),
                body_type=attrs_data.get("body_type"),
                facial_hair=attrs_data.get("facial_hair"),
                glasses=attrs_data.get("glasses"),
                accessories=attrs_data.get("accessories", []),
                distinctive_features=attrs_data.get("distinctive_features", []),
                clothing_style=attrs_data.get("clothing_style"),
                clothing_colors=attrs_data.get("clothing_colors", []),
                expression=attrs_data.get("expression"),
                mood_hint=attrs_data.get("mood_hint")
            )
            
            # Generate style adaptations
            style_adaptations = self._generate_style_adaptations(
                physical_attrs, genre, style
            )
            
            return CharacterAnalysisResult(
                success=True,
                description=data.get("description"),
                short_description=data.get("short_description"),
                physical_attributes=physical_attrs,
                suggested_name=data.get("suggested_name"),
                suggested_personality=data.get("suggested_personality", []),
                suggested_role=data.get("suggested_role"),
                style_adaptations=style_adaptations,
                raw_response=response,
                confidence=0.9  # High confidence for successful parse
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            
            # Try to extract information from unstructured response
            return CharacterAnalysisResult(
                success=True,
                description=response[:500] if len(response) > 500 else response,
                raw_response=response,
                confidence=0.5,  # Lower confidence for unstructured
                error_message="Failed to parse structured response, using raw text"
            )
        
        except Exception as e:
            logger.error(f"Failed to parse analysis response: {e}")
            return CharacterAnalysisResult(
                success=False,
                error_message=str(e),
                raw_response=response
            )
    
    def _generate_style_adaptations(
        self,
        physical_attrs: PhysicalAttributes,
        genre: Optional[str],
        style: Optional[str]
    ) -> Dict[str, str]:
        """Generate style-specific adaptations for the character"""
        adaptations = {}
        
        if not genre and not style:
            return adaptations
        
        # Genre-specific adaptations
        genre_styles = {
            "cyberpunk": {
                "clothing": "neon accents, techwear, urban streetwear",
                "accessories": "neural interfaces, cyber implants, holographic gear",
                "hair": "neon highlights, synthetic dreads, tech-integrated styles"
            },
            "fantasy": {
                "clothing": "medieval attire, robes, leather armor",
                "accessories": "mystical amulets, ancient jewelry, enchanted items",
                "hair": "braided, flowing, adorned with natural elements"
            },
            "sci-fi": {
                "clothing": "futuristic bodysuits, sleek uniforms, nanotech fabrics",
                "accessories": "holographic displays, neural links, space-grade gear",
                "hair": "sleek, geometric, holographic hair accessories"
            },
            "horror": {
                "clothing": "dark, weathered, tattered clothing",
                "accessories": "ominous jewelry, supernatural artifacts",
                "hair": "disheveled, mysterious, shadowy"
            },
            "western": {
                "clothing": "rugged denim, leather vests, cowboy hats",
                "accessories": "spurs, bandanas, pocket watches",
                "hair": "practical, tied back, under hat"
            },
            "noir": {
                "clothing": "dark suits, trench coats, formal wear",
                "accessories": "fedora, cigarette case, vintage watch",
                "hair": "slicked back, neat, professional"
            },
            "romance": {
                "clothing": "elegant, flowing fabrics, romantic colors",
                "accessories": "delicate jewelry, flowers, romantic tokens",
                "hair": "soft, romantic styling, natural"
            },
            "comedy": {
                "clothing": "colorful, playful, quirky combinations",
                "accessories": "fun props, statement pieces",
                "hair": "unique, expressive, fun styles"
            }
        }
        
        if genre and genre.lower() in genre_styles:
            genre_adaptations = genre_styles[genre.lower()]
            
            # Create adapted descriptions
            base_desc = []
            if physical_attrs.clothing_style:
                base_desc.append(f"Original style: {physical_attrs.clothing_style}")
            base_desc.append(f"Genre-adapted: {genre_adaptations['clothing']}")
            adaptations["clothing"] = " → ".join(base_desc)
            
            if physical_attrs.accessories:
                adaptations["accessories"] = f"{', '.join(physical_attrs.accessories)} + {genre_adaptations['accessories']}"
            else:
                adaptations["accessories"] = genre_adaptations["accessories"]
            
            if physical_attrs.hair_style:
                adaptations["hair"] = f"{physical_attrs.hair_style} with {genre_adaptations['hair']}"
            else:
                adaptations["hair"] = genre_adaptations["hair"]
        
        # Style-specific adaptations
        if style:
            style_lower = style.lower()
            if "anime" in style_lower:
                adaptations["art_style"] = "anime-style features, large expressive eyes, stylized hair"
            elif "realistic" in style_lower or "photorealistic" in style_lower:
                adaptations["art_style"] = "photorealistic skin detail, natural lighting, realistic proportions"
            elif "cartoon" in style_lower:
                adaptations["art_style"] = "exaggerated features, bold outlines, vibrant colors"
            elif "noir" in style_lower:
                adaptations["art_style"] = "high contrast, dramatic shadows, monochromatic tones"
        
        return adaptations


# Singleton instance
_vision_analyzer: Optional[VisionCharacterAnalyzer] = None


def get_vision_analyzer(
    config: Optional[VisionAnalyzerConfig] = None
) -> VisionCharacterAnalyzer:
    """Get singleton instance of vision analyzer"""
    global _vision_analyzer
    if _vision_analyzer is None:
        _vision_analyzer = VisionCharacterAnalyzer(config)
    return _vision_analyzer