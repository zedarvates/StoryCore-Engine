"""
Vision Object Analyzer - AI-powered object analysis from images.

This module provides:
- Multi-provider vision analysis (Ollama, OpenAI, Anthropic)
- Object attribute extraction
- Material and texture identification
- Category classification

Requirements: Object Creation Enhancement from User Images
"""

import asyncio
import base64
import json
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

# Try to import requests for API calls
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)


class VisionProvider(str, Enum):
    """Available vision model providers"""
    OLLAMA = "ollama"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class ObjectCategory(str, Enum):
    """Object categories"""
    FURNITURE = "furniture"
    WEAPON = "weapon"
    TOOL = "tool"
    CLOTHING = "clothing"
    ACCESSORY = "accessory"
    VEHICLE = "vehicle"
    CONTAINER = "container"
    DECORATION = "decoration"
    FOOD = "food"
    ELECTRONIC = "electronic"
    MUSICAL_INSTRUMENT = "musical_instrument"
    BOOK_DOCUMENT = "book_document"
    ART = "art"
    JEWELRY = "jewelry"
    TOY = "toy"
    MEDICAL = "medical"
    SPORTS = "sports"
    NATURAL = "natural"
    MAGICAL = "magical"
    UNKNOWN = "unknown"


class MaterialType(str, Enum):
    """Material types"""
    WOOD = "wood"
    METAL = "metal"
    STONE = "stone"
    GLASS = "glass"
    CERAMIC = "ceramic"
    PLASTIC = "plastic"
    FABRIC = "fabric"
    LEATHER = "leather"
    PAPER = "paper"
    ORGANIC = "organic"
    CRYSTAL = "crystal"
    PRECIOUS_STONE = "precious_stone"
    BONE = "bone"
    IVORY = "ivory"
    RUBBER = "rubber"
    CONCRETE = "concrete"
    UNKNOWN = "unknown"


@dataclass
class ObjectAttributes:
    """Extracted object attributes"""
    # Basic identification
    object_type: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    
    # Physical properties
    primary_material: Optional[str] = None
    secondary_materials: List[str] = field(default_factory=list)
    color_primary: Optional[str] = None
    color_secondary: List[str] = field(default_factory=list)
    texture: Optional[str] = None
    finish: Optional[str] = None  # matte, glossy, rough, etc.
    
    # Dimensions
    size_category: Optional[str] = None  # tiny, small, medium, large, huge
    shape: Optional[str] = None
    weight_estimate: Optional[str] = None
    
    # Style and era
    style: Optional[str] = None
    era_period: Optional[str] = None
    cultural_origin: Optional[str] = None
    craftsmanship: Optional[str] = None
    
    # Condition and age
    condition: Optional[str] = None
    age_appearance: Optional[str] = None  # new, worn, antique, ancient
    damage: List[str] = field(default_factory=list)
    
    # Details
    decorative_elements: List[str] = field(default_factory=list)
    functional_parts: List[str] = field(default_factory=list)
    inscriptions: Optional[str] = None
    markings: List[str] = field(default_factory=list)
    
    # Usage context
    primary_use: Optional[str] = None
    secondary_uses: List[str] = field(default_factory=list)
    setting_context: Optional[str] = None  # indoor, outdoor, both
    
    # Special properties
    magical_properties: List[str] = field(default_factory=list)
    technological_features: List[str] = field(default_factory=list)
    unique_features: List[str] = field(default_factory=list)
    
    # Narrative
    story_potential: List[str] = field(default_factory=list)
    emotional_resonance: Optional[str] = None
    symbolic_meaning: Optional[str] = None


@dataclass
class ObjectAnalyzerConfig:
    """Configuration for object analyzer"""
    provider: VisionProvider = VisionProvider.OLLAMA
    model: Optional[str] = None
    ollama_url: str = "http://localhost:11434"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    max_tokens: int = 2048
    temperature: float = 0.3
    timeout: int = 120
    
    # Analysis options
    identify_materials: bool = True
    estimate_size: bool = True
    detect_condition: bool = True


@dataclass
class ObjectAnalysisResult:
    """Result of object analysis"""
    success: bool
    description: str = ""
    short_description: str = ""
    attributes: Optional[ObjectAttributes] = None
    suggested_name: Optional[str] = None
    suggested_tags: List[str] = field(default_factory=list)
    similar_objects: List[str] = field(default_factory=list)
    style_adaptations: Dict[str, str] = field(default_factory=dict)
    confidence: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class VisionObjectAnalyzer:
    """
    Analyzes images to extract object information using vision models.
    """
    
    def __init__(self, config: Optional[ObjectAnalyzerConfig] = None):
        """Initialize object analyzer"""
        self.config = config or ObjectAnalyzerConfig()
        
        # Set API keys from environment if not provided
        if self.config.openai_api_key is None:
            self.config.openai_api_key = os.environ.get("OPENAI_API_KEY")
        if self.config.anthropic_api_key is None:
            self.config.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
        
        logger.info(f"Object analyzer initialized with provider: {self.config.provider.value}")
    
    async def analyze_image(
        self,
        image: np.ndarray,
        genre: Optional[str] = None,
        style: Optional[str] = None,
        additional_context: Optional[str] = None
    ) -> ObjectAnalysisResult:
        """Analyze an image to extract object information"""
        
        import time
        start_time = time.time()
        
        try:
            # Convert image to base64
            image_base64 = self._array_to_base64(image)
            if not image_base64:
                return ObjectAnalysisResult(
                    success=False,
                    error_message="Failed to encode image"
                )
            
            # Build prompt
            prompt = self._build_analysis_prompt(genre, style, additional_context)
            
            # Call vision model
            if self.config.provider == VisionProvider.OLLAMA:
                response = await self._call_ollama(image_base64, prompt)
            elif self.config.provider == VisionProvider.OPENAI:
                response = await self._call_openai(image_base64, prompt)
            elif self.config.provider == VisionProvider.ANTHROPIC:
                response = await self._call_anthropic(image_base64, prompt)
            else:
                return ObjectAnalysisResult(
                    success=False,
                    error_message=f"Unsupported provider: {self.config.provider}"
                )
            
            if response is None:
                return ObjectAnalysisResult(
                    success=False,
                    error_message="No response from vision model"
                )
            
            # Parse response
            result = self._parse_response(response, genre)
            
            result.processing_time_ms = int((time.time() - start_time) * 1000)
            result.success = True
            
            return result
            
        except Exception as e:
            logger.error(f"Object analysis failed: {e}")
            return ObjectAnalysisResult(
                success=False,
                error_message=str(e)
            )
    
    def _build_analysis_prompt(
        self,
        genre: Optional[str] = None,
        style: Optional[str] = None,
        additional_context: Optional[str] = None
    ) -> str:
        """Build analysis prompt for vision model"""
        
        prompt = """Analyze this object/prop image in detail. Provide your analysis in the following JSON format:

{
    "object_type": "specific type of object (e.g., sword, chair, vase)",
    "category": "category (furniture/weapon/tool/clothing/accessory/vehicle/container/decoration/food/electronic/musical_instrument/book_document/art/jewelry/toy/medical/sports/natural/magical)",
    "description": "A detailed description of the object (2-3 sentences)",
    "short_description": "A brief one-line description",
    "primary_material": "main material (wood/metal/stone/glass/ceramic/plastic/fabric/leather/paper/organic/crystal/precious_stone)",
    "secondary_materials": ["any", "other", "materials"],
    "color_primary": "main color",
    "color_secondary": ["other", "colors"],
    "texture": "surface texture (smooth/rough/woven/grainy/etc)",
    "finish": "finish type (matte/glossy/polished/weathered/etc)",
    "size_category": "relative size (tiny/small/medium/large/huge)",
    "shape": "general shape description",
    "style": "artistic style if applicable (modern/vintage/art deco/minimalist/etc)",
    "era_period": "historical period this object evokes",
    "cultural_origin": "culture or region of origin if identifiable",
    "condition": "current condition (pristine/good/worn/damaged/ruined)",
    "age_appearance": "apparent age (new/vintage/antique/ancient)",
    "decorative_elements": ["any", "decorations", "patterns", "ornaments"],
    "functional_parts": ["movable", "or", "functional", "parts"],
    "primary_use": "main purpose or function",
    "secondary_uses": ["other", "possible", "uses"],
    "setting_context": "typical setting (indoor/outdoor/both)",
    "unique_features": ["distinctive", "or", "unusual", "aspects"],
    "suggested_name": "creative name for this object",
    "suggested_tags": ["relevant", "tags", "for", "searching"],
    "story_potential": ["narrative", "possibilities"],
    "emotional_resonance": "emotional feeling the object evokes",
    "symbolic_meaning": "potential symbolic significance"
}

Focus on visual details that would help recreate or use this object in a creative project.
Be specific about materials, textures, and functional details."""

        if genre:
            prompt += f"\n\nConsider how this object could be adapted for a {genre} genre story."
        
        if style:
            prompt += f"\n\nConsider the visual style: {style}."
        
        if additional_context:
            prompt += f"\n\nAdditional context: {additional_context}"
        
        return prompt
    
    async def _call_ollama(self, image_base64: str, prompt: str) -> Optional[str]:
        """Call Ollama API"""
        if not REQUESTS_AVAILABLE:
            return None
        
        model = self.config.model or "llava:13b"
        
        try:
            loop = asyncio.get_event_loop()
            
            def make_request():
                return requests.post(
                    f"{self.config.ollama_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "images": [image_base64],
                        "stream": False,
                        "options": {
                            "num_predict": self.config.max_tokens,
                            "temperature": self.config.temperature
                        }
                    },
                    timeout=self.config.timeout
                )
            
            response = await loop.run_in_executor(None, make_request)
            
            if response.status_code == 200:
                return response.json().get("response", "")
            return None
                
        except Exception as e:
            logger.error(f"Ollama API call failed: {e}")
            return None
    
    async def _call_openai(self, image_base64: str, prompt: str) -> Optional[str]:
        """Call OpenAI GPT-4 Vision API"""
        if not REQUESTS_AVAILABLE or not self.config.openai_api_key:
            return None
        
        try:
            loop = asyncio.get_event_loop()
            
            def make_request():
                return requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.config.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4-vision-preview",
                        "messages": [{
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}", "detail": "high"}}
                            ]
                        }],
                        "max_tokens": self.config.max_tokens
                    },
                    timeout=self.config.timeout
                )
            
            response = await loop.run_in_executor(None, make_request)
            
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            return None
                
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            return None
    
    async def _call_anthropic(self, image_base64: str, prompt: str) -> Optional[str]:
        """Call Anthropic Claude Vision API"""
        if not REQUESTS_AVAILABLE or not self.config.anthropic_api_key:
            return None
        
        try:
            loop = asyncio.get_event_loop()
            
            def make_request():
                return requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.config.anthropic_api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "claude-3-opus-20240229",
                        "max_tokens": self.config.max_tokens,
                        "messages": [{
                            "role": "user",
                            "content": [
                                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_base64}},
                                {"type": "text", "text": prompt}
                            ]
                        }]
                    },
                    timeout=self.config.timeout
                )
            
            response = await loop.run_in_executor(None, make_request)
            
            if response.status_code == 200:
                return response.json()["content"][0]["text"]
            return None
                
        except Exception as e:
            logger.error(f"Anthropic API call failed: {e}")
            return None
    
    def _parse_response(self, response: str, genre: Optional[str] = None) -> ObjectAnalysisResult:
        """Parse vision model response"""
        try:
            # Extract JSON from response
            json_match = self._extract_json(response)
            if json_match:
                data = json.loads(json_match)
            else:
                data = json.loads(response)
            
            # Build attributes
            attributes = ObjectAttributes(
                object_type=data.get("object_type"),
                category=data.get("category"),
                sub_category=data.get("sub_category"),
                primary_material=data.get("primary_material"),
                secondary_materials=data.get("secondary_materials", []),
                color_primary=data.get("color_primary"),
                color_secondary=data.get("color_secondary", []),
                texture=data.get("texture"),
                finish=data.get("finish"),
                size_category=data.get("size_category"),
                shape=data.get("shape"),
                style=data.get("style"),
                era_period=data.get("era_period"),
                cultural_origin=data.get("cultural_origin"),
                condition=data.get("condition"),
                age_appearance=data.get("age_appearance"),
                decorative_elements=data.get("decorative_elements", []),
                functional_parts=data.get("functional_parts", []),
                primary_use=data.get("primary_use"),
                secondary_uses=data.get("secondary_uses", []),
                setting_context=data.get("setting_context"),
                unique_features=data.get("unique_features", []),
                story_potential=data.get("story_potential", []),
                emotional_resonance=data.get("emotional_resonance"),
                symbolic_meaning=data.get("symbolic_meaning")
            )
            
            return ObjectAnalysisResult(
                success=True,
                description=data.get("description", ""),
                short_description=data.get("short_description", ""),
                attributes=attributes,
                suggested_name=data.get("suggested_name"),
                suggested_tags=data.get("suggested_tags", []),
                confidence=0.85
            )
            
        except json.JSONDecodeError:
            return ObjectAnalysisResult(
                success=True,
                description=response,
                short_description=response[:200] if len(response) > 200 else response,
                confidence=0.5
            )
        except Exception as e:
            return ObjectAnalysisResult(
                success=False,
                error_message=str(e)
            )
    
    def _extract_json(self, text: str) -> Optional[str]:
        """Extract JSON from text"""
        import re
        
        patterns = [
            r'```json\s*([\s\S]*?)\s*```',
            r'```\s*([\s\S]*?)\s*```',
            r'\{[\s\S]*\}'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    json_str = match.group(1) if '```' in pattern else match.group(0)
                    json.loads(json_str)
                    return json_str
                except json.JSONDecodeError:
                    continue
        
        return None
    
    def _array_to_base64(self, array: np.ndarray) -> Optional[str]:
        """Convert numpy array to base64 string"""
        try:
            from PIL import Image
            
            if array.dtype != np.uint8:
                array = (array * 255).astype(np.uint8)
            
            if len(array.shape) == 3 and array.shape[2] == 3:
                image = Image.fromarray(array)
            elif len(array.shape) == 3 and array.shape[2] == 4:
                image = Image.fromarray(array, mode='RGBA')
            else:
                image = Image.fromarray(array, mode='L')
            
            buffer = BytesIO()
            image.save(buffer, format="JPEG", quality=90)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Failed to convert array to base64: {e}")
            return None


# Singleton instance
_object_analyzer: Optional[VisionObjectAnalyzer] = None


def get_object_analyzer(config: Optional[ObjectAnalyzerConfig] = None) -> VisionObjectAnalyzer:
    """Get singleton instance of object analyzer"""
    global _object_analyzer
    if _object_analyzer is None:
        _object_analyzer = VisionObjectAnalyzer(config)
    return _object_analyzer