"""
Vision Location Analyzer - AI-powered location analysis from images.

This module provides:
- Multi-provider vision analysis (Ollama, OpenAI, Anthropic)
- Location attribute extraction
- Atmosphere and mood detection
- Genre-specific adaptations

Requirements: Location Creation Enhancement from User Images
"""

import asyncio
import base64
import json
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from io import BytesIO
from typing import Dict, List, Optional

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


class AtmosphereType(str, Enum):
    """Location atmosphere types"""

    PEACEFUL = "peaceful"
    MYSTERIOUS = "mysterious"
    TENSE = "tense"
    WELCOMING = "welcoming"
    FOREBODING = "foreboding"
    MAGICAL = "magical"
    INDUSTRIAL = "industrial"
    NATURAL = "natural"
    URBAN = "urban"
    ANCIENT = "ancient"
    FUTURISTIC = "futuristic"
    ABANDONED = "abandoned"
    LUXURIOUS = "luxurious"
    DANGEROUS = "dangerous"
    SACRED = "sacred"


class TimeOfDay(str, Enum):
    """Time of day options"""

    DAWN = "dawn"
    MORNING = "morning"
    MIDDAY = "midday"
    AFTERNOON = "afternoon"
    SUNSET = "sunset"
    DUSK = "dusk"
    NIGHT = "night"
    MIDNIGHT = "midnight"
    UNKNOWN = "unknown"


class WeatherCondition(str, Enum):
    """Weather conditions"""

    CLEAR = "clear"
    SUNNY = "sunny"
    CLOUDY = "cloudy"
    OVERCAST = "overcast"
    RAINY = "rainy"
    STORMY = "stormy"
    SNOWY = "snowy"
    FOGGY = "foggy"
    MISTY = "misty"
    HAZY = "hazy"
    UNKNOWN = "unknown"


class LocationType(str, Enum):
    """Types of locations"""

    INTERIOR = "interior"
    EXTERIOR = "exterior"
    URBAN = "urban"
    RURAL = "rural"
    NATURAL = "natural"
    ARCHITECTURAL = "architectural"
    UNDERGROUND = "underground"
    UNDERWATER = "underwater"
    AERIAL = "aerial"
    FANTASY = "fantasy"
    SCI_FI = "sci_fi"


@dataclass
class LocationAttributes:
    """Extracted location attributes"""

    # Basic identification
    location_type: Optional[str] = None
    sub_type: Optional[str] = None
    setting: Optional[str] = None  # indoor, outdoor, mixed

    # Physical characteristics
    architectural_style: Optional[str] = None
    era_period: Optional[str] = None
    primary_materials: List[str] = field(default_factory=list)
    dominant_colors: List[str] = field(default_factory=list)
    lighting_type: Optional[str] = None

    # Environment
    terrain: Optional[str] = None
    vegetation: List[str] = field(default_factory=list)
    water_features: List[str] = field(default_factory=list)
    landscape_elements: List[str] = field(default_factory=list)

    # Atmosphere
    atmosphere: Optional[str] = None
    mood: Optional[str] = None
    time_of_day: Optional[str] = None
    weather: Optional[str] = None
    season: Optional[str] = None

    # Details
    key_features: List[str] = field(default_factory=list)
    landmarks: List[str] = field(default_factory=list)
    props: List[str] = field(default_factory=list)
    population_density: Optional[str] = None  # empty, sparse, moderate, dense, crowded

    # Technical
    perspective: Optional[str] = None  # eye-level, bird's-eye, worm's-eye, etc.
    depth: Optional[str] = None  # shallow, medium, deep
    focal_point: Optional[str] = None

    # Genre adaptability
    genre_hints: List[str] = field(default_factory=list)


@dataclass
class LocationAnalyzerConfig:
    """Configuration for location analyzer"""

    provider: VisionProvider = VisionProvider.OLLAMA
    model: Optional[str] = None
    ollama_url: str = "http://localhost:11434"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    max_tokens: int = 2048
    temperature: float = 0.3
    timeout: int = 120

    # Analysis options
    detect_time_of_day: bool = True
    detect_weather: bool = True
    extract_materials: bool = True
    identify_style: bool = True


@dataclass
class LocationAnalysisResult:
    """Result of location analysis"""

    success: bool
    description: str = ""
    short_description: str = ""
    attributes: Optional[LocationAttributes] = None
    suggested_name: Optional[str] = None
    suggested_tags: List[str] = field(default_factory=list)
    narrative_purpose: Optional[str] = None
    story_potential: List[str] = field(default_factory=list)
    style_adaptations: Dict[str, str] = field(default_factory=dict)
    confidence: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class VisionLocationAnalyzer:
    """
    Analyzes images to extract location information using vision models.

    Supports:
    - Ollama (LLaVA, BakLLaVA, etc.)
    - OpenAI (GPT-4 Vision)
    - Anthropic (Claude Vision)
    """

    def __init__(self, config: Optional[LocationAnalyzerConfig] = None):
        """Initialize location analyzer"""
        self.config = config or LocationAnalyzerConfig()

        # Set API keys from environment if not provided
        if self.config.openai_api_key is None:
            self.config.openai_api_key = os.environ.get("OPENAI_API_KEY")
        if self.config.anthropic_api_key is None:
            self.config.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")

        logger.info(
            f"Location analyzer initialized with provider: {self.config.provider.value}"
        )

    async def analyze_image(
        self,
        image: np.ndarray,
        genre: Optional[str] = None,
        style: Optional[str] = None,
        additional_context: Optional[str] = None,
    ) -> LocationAnalysisResult:
        """
        Analyze an image to extract location information.

        Args:
            image: numpy array of the image (RGB)
            genre: Optional genre for style adaptation
            style: Optional visual style
            additional_context: Additional context for analysis

        Returns:
            LocationAnalysisResult with extracted information
        """
        import time

        start_time = time.time()

        try:
            # Convert image to base64
            image_base64 = self._array_to_base64(image)
            if not image_base64:
                return LocationAnalysisResult(
                    success=False, error_message="Failed to encode image"
                )

            # Build prompt
            prompt = self._build_analysis_prompt(genre, style, additional_context)

            # Call vision model based on provider
            if self.config.provider == VisionProvider.OLLAMA:
                response = await self._call_ollama(image_base64, prompt)
            elif self.config.provider == VisionProvider.OPENAI:
                response = await self._call_openai(image_base64, prompt)
            elif self.config.provider == VisionProvider.ANTHROPIC:
                response = await self._call_anthropic(image_base64, prompt)
            else:
                return LocationAnalysisResult(
                    success=False,
                    error_message=f"Unsupported provider: {self.config.provider}",
                )

            if response is None:
                return LocationAnalysisResult(
                    success=False, error_message="No response from vision model"
                )

            # Parse response
            result = self._parse_response(response, genre)

            result.processing_time_ms = int((time.time() - start_time) * 1000)
            result.success = True

            return result

        except Exception as e:
            logger.error(f"Location analysis failed: {e}")
            return LocationAnalysisResult(success=False, error_message=str(e))

    def _build_analysis_prompt(
        self,
        genre: Optional[str] = None,
        style: Optional[str] = None,
        additional_context: Optional[str] = None,
    ) -> str:
        """Build analysis prompt for vision model"""

        prompt = """Analyze this location/environment image in detail. Provide your analysis in the following JSON format:

{
    "location_type": "interior/exterior/urban/rural/natural/etc",
    "setting": "indoor/outdoor/mixed",
    "description": "A detailed description of the location (2-3 sentences)",
    "short_description": "A brief one-line description",
    "architectural_style": "specific architectural style if visible (e.g., Gothic, Brutalist, Traditional Japanese)",
    "era_period": "historical period this location evokes",
    "primary_materials": ["list", "of", "main", "materials", "visible"],
    "dominant_colors": ["list", "of", "dominant", "colors"],
    "lighting_type": "natural/artificial/mixed/ambient/etc",
    "terrain": "ground type if visible (paved, grass, sand, etc)",
    "vegetation": ["any", "plants", "trees", "visible"],
    "water_features": ["any", "water", "elements"],
    "landscape_elements": ["hills", "mountains", "valleys", "etc"],
    "atmosphere": "peaceful/mysterious/tense/welcoming/etc",
    "mood": "emotional feeling the location evokes",
    "time_of_day": "dawn/morning/midday/afternoon/sunset/dusk/night",
    "weather": "clear/cloudy/rainy/foggy/etc",
    "season": "spring/summer/autumn/winter if determinable",
    "key_features": ["notable", "features", "of", "the", "location"],
    "landmarks": ["any", "recognizable", "landmarks"],
    "props": ["visible", "objects", "or", "furniture"],
    "population_density": "empty/sparse/moderate/dense/crowded",
    "perspective": "eye-level/birds-eye/worms-eye/etc",
    "depth": "shallow/medium/deep spatial depth",
    "focal_point": "main visual focus of the scene",
    "suggested_name": "creative name for this location",
    "suggested_tags": ["relevant", "tags", "for", "searching"],
    "narrative_purpose": "potential narrative role (hideout, meeting place, etc)",
    "story_potential": ["possible", "scene", "types", "here"],
    "genre_hints": ["genres", "this", "fits", "well"]
}

Focus on visual details that would help recreate or use this location in a creative project.
Be specific about materials, colors, and atmospheric elements."""

        if genre:
            prompt += f"\n\nConsider how this location could be adapted for a {genre} genre story."

        if style:
            prompt += f"\n\nConsider the visual style: {style}."

        if additional_context:
            prompt += f"\n\nAdditional context: {additional_context}"

        return prompt

    async def _call_ollama(self, image_base64: str, prompt: str) -> Optional[str]:
        """Call Ollama API for vision analysis"""
        if not REQUESTS_AVAILABLE:
            logger.error("Requests not available")
            return None

        model = self.config.model or "llava:13b"

        try:
            # Use sync requests in async context
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
                            "temperature": self.config.temperature,
                        },
                    },
                    timeout=self.config.timeout,
                )

            response = await loop.run_in_executor(None, make_request)

            if response.status_code == 200:
                result = response.json()
                return result.get("response", "")
            else:
                logger.error(
                    f"Ollama API error: {response.status_code} - {response.text}"
                )
                return None

        except Exception as e:
            logger.error(f"Ollama API call failed: {e}")
            return None

    async def _call_openai(self, image_base64: str, prompt: str) -> Optional[str]:
        """Call OpenAI GPT-4 Vision API"""
        if not REQUESTS_AVAILABLE or not self.config.openai_api_key:
            logger.error("OpenAI API key not configured")
            return None

        try:
            loop = asyncio.get_event_loop()

            def make_request():
                return requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.config.openai_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4-vision-preview",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/jpeg;base64,{image_base64}",
                                            "detail": "high",
                                        },
                                    },
                                ],
                            }
                        ],
                        "max_tokens": self.config.max_tokens,
                        "temperature": self.config.temperature,
                    },
                    timeout=self.config.timeout,
                )

            response = await loop.run_in_executor(None, make_request)

            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"OpenAI API error: {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            return None

    async def _call_anthropic(self, image_base64: str, prompt: str) -> Optional[str]:
        """Call Anthropic Claude Vision API"""
        if not REQUESTS_AVAILABLE or not self.config.anthropic_api_key:
            logger.error("Anthropic API key not configured")
            return None

        try:
            loop = asyncio.get_event_loop()

            def make_request():
                return requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.config.anthropic_api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "claude-3-opus-20240229",
                        "max_tokens": self.config.max_tokens,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image",
                                        "source": {
                                            "type": "base64",
                                            "media_type": "image/jpeg",
                                            "data": image_base64,
                                        },
                                    },
                                    {"type": "text", "text": prompt},
                                ],
                            }
                        ],
                    },
                    timeout=self.config.timeout,
                )

            response = await loop.run_in_executor(None, make_request)

            if response.status_code == 200:
                result = response.json()
                return result["content"][0]["text"]
            else:
                logger.error(f"Anthropic API error: {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"Anthropic API call failed: {e}")
            return None

    def _parse_response(
        self, response: str, genre: Optional[str] = None
    ) -> LocationAnalysisResult:
        """Parse vision model response into LocationAnalysisResult"""
        try:
            # Extract JSON from response
            json_match = self._extract_json(response)
            if json_match:
                data = json.loads(json_match)
            else:
                # Fallback: try to parse entire response as JSON
                data = json.loads(response)

            # Build attributes
            attributes = LocationAttributes(
                location_type=data.get("location_type"),
                sub_type=data.get("sub_type"),
                setting=data.get("setting"),
                architectural_style=data.get("architectural_style"),
                era_period=data.get("era_period"),
                primary_materials=data.get("primary_materials", []),
                dominant_colors=data.get("dominant_colors", []),
                lighting_type=data.get("lighting_type"),
                terrain=data.get("terrain"),
                vegetation=data.get("vegetation", []),
                water_features=data.get("water_features", []),
                landscape_elements=data.get("landscape_elements", []),
                atmosphere=data.get("atmosphere"),
                mood=data.get("mood"),
                time_of_day=data.get("time_of_day"),
                weather=data.get("weather"),
                season=data.get("season"),
                key_features=data.get("key_features", []),
                landmarks=data.get("landmarks", []),
                props=data.get("props", []),
                population_density=data.get("population_density"),
                perspective=data.get("perspective"),
                depth=data.get("depth"),
                focal_point=data.get("focal_point"),
                genre_hints=data.get("genre_hints", []),
            )

            # Build style adaptations
            style_adaptations = {}
            if genre:
                style_adaptations = self._generate_style_adaptations(attributes, genre)

            return LocationAnalysisResult(
                success=True,
                description=data.get("description", ""),
                short_description=data.get("short_description", ""),
                attributes=attributes,
                suggested_name=data.get("suggested_name"),
                suggested_tags=data.get("suggested_tags", []),
                narrative_purpose=data.get("narrative_purpose"),
                story_potential=data.get("story_potential", []),
                style_adaptations=style_adaptations,
                confidence=0.85,
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse response as JSON: {e}")
            # Return a basic result with raw response
            return LocationAnalysisResult(
                success=True,
                description=response,
                short_description=response[:200] if len(response) > 200 else response,
                confidence=0.5,
            )
        except Exception as e:
            logger.error(f"Failed to parse response: {e}")
            return LocationAnalysisResult(success=False, error_message=str(e))

    def _extract_json(self, text: str) -> Optional[str]:
        """Extract JSON from text that might contain other content"""
        import re

        # Try to find JSON block
        json_patterns = [
            r"```json\s*([\s\S]*?)\s*```",  # JSON in code block
            r"```\s*([\s\S]*?)\s*```",  # Any code block
            r"\{[\s\S]*\}",  # Raw JSON object
        ]

        for pattern in json_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    # Validate it's valid JSON
                    json_str = match.group(1) if "```" in pattern else match.group(0)
                    json.loads(json_str)
                    return json_str
                except json.JSONDecodeError:
                    continue

        return None

    def _generate_style_adaptations(
        self, attributes: LocationAttributes, genre: str
    ) -> Dict[str, str]:
        """Generate style adaptations for a specific genre"""
        adaptations = {}

        genre_lower = genre.lower()

        if "cyberpunk" in genre_lower or "sci-fi" in genre_lower:
            adaptations["lighting"] = (
                "Add neon lighting, holographic elements, or futuristic light sources"
            )
            adaptations["atmosphere"] = (
                "Enhance with tech elements, digital displays, synthetic materials"
            )
            adaptations["props"] = (
                "Add futuristic vehicles, drones, holographic interfaces"
            )

        elif "fantasy" in genre_lower:
            adaptations["lighting"] = (
                "Add magical glows, ethereal lighting, or mystical elements"
            )
            adaptations["atmosphere"] = (
                "Enhance with magical elements, ancient runes, fantasy creatures"
            )
            adaptations["props"] = (
                "Add fantasy elements like crystals, potions, ancient tomes"
            )

        elif "horror" in genre_lower:
            adaptations["lighting"] = (
                "Add dramatic shadows, flickering lights, eerie atmosphere"
            )
            adaptations["atmosphere"] = "Enhance with decay, cobwebs, ominous elements"
            adaptations["props"] = (
                "Add horror elements like blood trails, broken objects, sinister symbols"
            )

        elif "noir" in genre_lower:
            adaptations["lighting"] = (
                "Add dramatic chiaroscuro, venetian blind shadows, smoke"
            )
            adaptations["atmosphere"] = "Enhance with rain, fog, reflective surfaces"
            adaptations["props"] = (
                "Add period-appropriate elements, vintage items, shadows"
            )

        elif "western" in genre_lower:
            adaptations["lighting"] = (
                "Add warm sunlight, dusty atmosphere, long shadows"
            )
            adaptations["atmosphere"] = (
                "Enhance with desert elements, wooden structures, horses"
            )
            adaptations["props"] = (
                "Add western elements like wagons, barrels, hitching posts"
            )

        return adaptations

    def _array_to_base64(self, array: np.ndarray) -> Optional[str]:
        """Convert numpy array to base64 string"""
        try:
            from PIL import Image

            # Convert array to PIL Image
            if array.dtype != np.uint8:
                array = (array * 255).astype(np.uint8)

            if len(array.shape) == 3 and array.shape[2] == 3:
                image = Image.fromarray(array)
            elif len(array.shape) == 3 and array.shape[2] == 4:
                image = Image.fromarray(array, mode="RGBA")
            else:
                image = Image.fromarray(array, mode="L")

            # Convert to base64
            buffer = BytesIO()
            image.save(buffer, format="JPEG", quality=90)
            return base64.b64encode(buffer.getvalue()).decode("utf-8")

        except Exception as e:
            logger.error(f"Failed to convert array to base64: {e}")
            return None


# Singleton instance
_location_analyzer: Optional[VisionLocationAnalyzer] = None


def get_location_analyzer(
    config: Optional[LocationAnalyzerConfig] = None,
) -> VisionLocationAnalyzer:
    """Get singleton instance of location analyzer"""
    global _location_analyzer
    if _location_analyzer is None:
        _location_analyzer = VisionLocationAnalyzer(config)
    return _location_analyzer
