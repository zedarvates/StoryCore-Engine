"""
Location Variation Generator

This module provides:
- Time of day variations (dawn, day, sunset, night)
- Weather variations (clear, rainy, foggy, snowy)
- Season variations (spring, summer, autumn, winter)
- Style variations (realistic, artistic, cinematic)

Requirements: Location Creation Enhancement from User Images
"""

import hashlib
import json
import logging
import os
import random
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

# Configure logging
logger = logging.getLogger(__name__)


class LocationStyle(str, Enum):
    """Location artistic styles"""
    REALISTIC = "realistic"
    CINEMATIC = "cinematic"
    ARTISTIC = "artistic"
    PAINTERLY = "painterly"
    SKETCH = "sketch"
    ANIME = "anime"
    FANTASY = "fantasy"
    SCI_FI = "sci_fi"
    NOIR = "noir"
    VINTAGE = "vintage"
    DRAMATIC = "dramatic"
    MINIMALIST = "minimalist"


class SeasonType(str, Enum):
    """Season variations"""
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class LightingMood(str, Enum):
    """Lighting mood variations"""
    NATURAL = "natural"
    DRAMATIC = "dramatic"
    SOFT = "soft"
    HARSH = "harsh"
    GOLDEN_HOUR = "golden_hour"
    BLUE_HOUR = "blue_hour"
    NIGHT = "night"
    MOONLIGHT = "moonlight"
    SUNRISE = "sunrise"
    SUNSET = "sunset"
    OVERCAST = "overcast"
    STORMY = "stormy"


class TimeVariation(str, Enum):
    """Time of day variations"""
    DAWN = "dawn"
    EARLY_MORNING = "early_morning"
    MORNING = "morning"
    MIDDAY = "midday"
    AFTERNOON = "afternoon"
    LATE_AFTERNOON = "late_afternoon"
    SUNSET = "sunset"
    DUSK = "dusk"
    TWILIGHT = "twilight"
    EARLY_NIGHT = "early_night"
    NIGHT = "night"
    LATE_NIGHT = "late_night"
    MIDNIGHT = "midnight"


class WeatherVariation(str, Enum):
    """Weather variations"""
    CLEAR = "clear"
    SUNNY = "sunny"
    PARTLY_CLOUDY = "partly_cloudy"
    CLOUDY = "cloudy"
    OVERCAST = "overcast"
    FOGGY = "foggy"
    MISTY = "misty"
    HAZY = "hazy"
    RAINY = "rainy"
    HEAVY_RAIN = "heavy_rain"
    STORMY = "stormy"
    SNOWY = "snowy"
    HEAVY_SNOW = "heavy_snow"
    WINDY = "windy"


@dataclass
class LocationVariationConfig:
    """Configuration for location variation generation"""
    styles: List[LocationStyle] = field(default_factory=lambda: [
        LocationStyle.REALISTIC,
        LocationStyle.CINEMATIC
    ])
    times_of_day: List[TimeVariation] = field(default_factory=lambda: [
        TimeVariation.MORNING,
        TimeVariation.MIDDAY,
        TimeVariation.SUNSET,
        TimeVariation.NIGHT
    ])
    weather_options: List[WeatherVariation] = field(default_factory=lambda: [
        WeatherVariation.CLEAR,
        WeatherVariation.CLOUDY,
        WeatherVariation.FOGGY
    ])
    seasons: List[SeasonType] = field(default_factory=lambda: [
        SeasonType.SUMMER,
        SeasonType.WINTER
    ])
    max_variations: int = 20
    cache_enabled: bool = True
    output_dir: str = "./output/location_variations"


@dataclass
class GeneratedLocationVariation:
    """A generated location variation"""
    variation_id: str
    style: LocationStyle
    time_of_day: Optional[TimeVariation] = None
    weather: Optional[WeatherVariation] = None
    season: Optional[SeasonType] = None
    lighting: Optional[LightingMood] = None
    prompt: str = ""
    negative_prompt: str = ""
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    cached: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LocationVariationResult:
    """Result of location variation generation"""
    success: bool
    location_id: str
    variations: List[GeneratedLocationVariation] = field(default_factory=list)
    total_generation_time_ms: int = 0
    error_message: Optional[str] = None


class LocationPromptBuilder:
    """Builds prompts for location variations"""
    
    # Style templates
    STYLE_TEMPLATES: Dict[LocationStyle, Dict[str, Any]] = {
        LocationStyle.REALISTIC: {
            "base": "photorealistic location",
            "modifiers": ["8k uhd", "photography", "high detail", "professional"],
            "artists": ["national geographic", "architectural photography"]
        },
        LocationStyle.CINEMATIC: {
            "base": "cinematic establishing shot",
            "modifiers": ["movie quality", "widescreen", "dramatic", "film look"],
            "artists": ["roger deakins", "emanuel lubezki"]
        },
        LocationStyle.ARTISTIC: {
            "base": "artistic location illustration",
            "modifiers": ["stylized", "expressive", "creative"],
            "artists": ["concept art", "matte painting"]
        },
        LocationStyle.PAINTERLY: {
            "base": "oil painting of location",
            "modifiers": ["brush strokes", "artistic", "expressive"],
            "artists": ["claude monet", "turner"]
        },
        LocationStyle.SKETCH: {
            "base": "architectural sketch",
            "modifiers": ["hand drawn", "detailed linework", "pencil"],
            "artists": ["architectural sketch"]
        },
        LocationStyle.ANIME: {
            "base": "anime background art",
            "modifiers": ["cel shading", "vibrant", "stylized"],
            "artists": ["makoto shinkai", "studio ghibli backgrounds"]
        },
        LocationStyle.FANTASY: {
            "base": "fantasy location art",
            "modifiers": ["magical", "ethereal", "mystical"],
            "artists": ["fantasy concept art", "greg rutkowski"]
        },
        LocationStyle.SCI_FI: {
            "base": "science fiction environment",
            "modifiers": ["futuristic", "technological", "sci-fi"],
            "artists": ["syd mead", "h.r. giger"]
        },
        LocationStyle.NOIR: {
            "base": "film noir location",
            "modifiers": ["high contrast", "shadows", "dramatic"],
            "artists": ["film noir cinematography"]
        },
        LocationStyle.VINTAGE: {
            "base": "vintage photograph",
            "modifiers": ["film grain", "sepia tones", "nostalgic"],
            "artists": ["vintage photography"]
        },
        LocationStyle.DRAMATIC: {
            "base": "dramatic location shot",
            "modifiers": ["epic", "powerful", "impactful"],
            "artists": ["epic cinematography"]
        },
        LocationStyle.MINIMALIST: {
            "base": "minimalist location",
            "modifiers": ["clean", "simple", "elegant"],
            "artists": ["minimalist photography"]
        }
    }
    
    # Time of day descriptions
    TIME_DESCRIPTIONS: Dict[TimeVariation, str] = {
        TimeVariation.DAWN: "dawn light, early morning glow, pink sky",
        TimeVariation.EARLY_MORNING: "early morning light, fresh atmosphere",
        TimeVariation.MORNING: "morning light, bright and clear",
        TimeVariation.MIDDAY: "midday sun, bright overhead lighting",
        TimeVariation.AFTERNOON: "afternoon light, warm tones",
        TimeVariation.LATE_AFTERNOON: "late afternoon, golden light",
        TimeVariation.SUNSET: "sunset, golden hour, orange sky",
        TimeVariation.DUSK: "dusk, fading light, purple sky",
        TimeVariation.TWILIGHT: "twilight, blue hour, soft light",
        TimeVariation.EARLY_NIGHT: "early night, darkening sky",
        TimeVariation.NIGHT: "night scene, dark sky, artificial lights",
        TimeVariation.LATE_NIGHT: "late night, deep darkness",
        TimeVariation.MIDNIGHT: "midnight, pitch black, stars visible"
    }
    
    # Weather descriptions
    WEATHER_DESCRIPTIONS: Dict[WeatherVariation, str] = {
        WeatherVariation.CLEAR: "clear sky, no clouds",
        WeatherVariation.SUNNY: "bright sunny day, clear blue sky",
        WeatherVariation.PARTLY_CLOUDY: "partly cloudy, scattered clouds",
        WeatherVariation.CLOUDY: "cloudy sky, overcast patches",
        WeatherVariation.OVERCAST: "fully overcast, grey sky",
        WeatherVariation.FOGGY: "thick fog, limited visibility, atmospheric",
        WeatherVariation.MISTY: "light mist, soft atmosphere",
        WeatherVariation.HAZY: "hazy atmosphere, diffused light",
        WeatherVariation.RAINY: "rain falling, wet surfaces, puddles",
        WeatherVariation.HEAVY_RAIN: "heavy rainstorm, dramatic weather",
        WeatherVariation.STORMY: "stormy sky, dark clouds, lightning",
        WeatherVariation.SNOWY: "snow falling, white ground, winter scene",
        WeatherVariation.HEAVY_SNOW: "heavy snowfall, blizzard conditions",
        WeatherVariation.WINDY: "windy conditions, dynamic atmosphere"
    }
    
    # Season descriptions
    SEASON_DESCRIPTIONS: Dict[SeasonType, str] = {
        SeasonType.SPRING: "spring season, blooming flowers, fresh green",
        SeasonType.SUMMER: "summer season, lush vegetation, bright colors",
        SeasonType.AUTUMN: "autumn season, falling leaves, warm colors",
        SeasonType.WINTER: "winter season, bare trees, cold atmosphere"
    }
    
    @classmethod
    def build_prompt(
        cls,
        location_description: str,
        style: LocationStyle,
        time_of_day: Optional[TimeVariation] = None,
        weather: Optional[WeatherVariation] = None,
        season: Optional[SeasonType] = None,
        additional_modifiers: List[str] = None
    ) -> Tuple[str, str]:
        """Build positive and negative prompts for location generation"""
        
        style_template = cls.STYLE_TEMPLATES.get(style, cls.STYLE_TEMPLATES[LocationStyle.REALISTIC])
        
        parts = []
        
        # Base style
        parts.append(style_template["base"])
        
        # Location description
        parts.append(location_description)
        
        # Time of day
        if time_of_day:
            time_desc = cls.TIME_DESCRIPTIONS.get(time_of_day)
            if time_desc:
                parts.append(time_desc)
        
        # Weather
        if weather:
            weather_desc = cls.WEATHER_DESCRIPTIONS.get(weather)
            if weather_desc:
                parts.append(weather_desc)
        
        # Season
        if season:
            season_desc = cls.SEASON_DESCRIPTIONS.get(season)
            if season_desc:
                parts.append(season_desc)
        
        # Style modifiers
        parts.extend(style_template["modifiers"])
        
        # Artist references
        artists = style_template.get("artists", [])
        if artists:
            parts.append(f"style of {', '.join(artists)}")
        
        # Additional modifiers
        if additional_modifiers:
            parts.extend(additional_modifiers)
        
        # Quality modifiers
        parts.extend(["highly detailed", "professional quality"])
        
        positive_prompt = ", ".join(parts)
        
        # Negative prompt
        negative_parts = [
            "blurry", "low quality", "distorted", "bad composition",
            "text", "watermark", "signature", "people", "characters",
            "out of focus", "oversaturated", "undersaturated"
        ]
        negative_prompt = ", ".join(negative_parts)
        
        return positive_prompt, negative_prompt


class LocationVariationGenerator:
    """
    Generates variations of locations with different times, weather, and styles.
    """
    
    def __init__(
        self,
        config: Optional[LocationVariationConfig] = None,
        output_dir: Optional[str] = None
    ):
        """Initialize variation generator"""
        self.config = config or LocationVariationConfig()
        
        # Set output directory
        self.output_dir = Path(output_dir or self.config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Cache directory
        self.cache_dir = self.output_dir / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Prompt builder
        self.prompt_builder = LocationPromptBuilder()
        
        logger.info(f"Location variation generator initialized")
    
    def generate_variations(
        self,
        location_description: str,
        location_id: str,
        custom_config: Optional[LocationVariationConfig] = None
    ) -> LocationVariationResult:
        """
        Generate location variations.
        
        Args:
            location_description: Description of the location
            location_id: Unique location identifier
            custom_config: Optional custom configuration
            
        Returns:
            LocationVariationResult with all variations
        """
        import time
        start_time = time.time()
        
        config = custom_config or self.config
        variations = []
        
        try:
            total_variations = 0
            max_variations = config.max_variations
            
            # Generate time of day variations
            for time_var in config.times_of_day:
                if total_variations >= max_variations:
                    break
                
                for style in config.styles:
                    if total_variations >= max_variations:
                        break
                    
                    variation = self._generate_single_variation(
                        location_description=location_description,
                        location_id=location_id,
                        style=style,
                        time_of_day=time_var
                    )
                    if variation:
                        variations.append(variation)
                        total_variations += 1
            
            # Generate weather variations
            for weather in config.weather_options:
                if total_variations >= max_variations:
                    break
                
                for style in config.styles[:1]:  # Only primary style for weather
                    if total_variations >= max_variations:
                        break
                    
                    variation = self._generate_single_variation(
                        location_description=location_description,
                        location_id=location_id,
                        style=style,
                        weather=weather
                    )
                    if variation:
                        variations.append(variation)
                        total_variations += 1
            
            # Generate season variations
            for season in config.seasons:
                if total_variations >= max_variations:
                    break
                
                variation = self._generate_single_variation(
                    location_description=location_description,
                    location_id=location_id,
                    style=config.styles[0],
                    season=season
                )
                if variation:
                    variations.append(variation)
                    total_variations += 1
            
            total_time = int((time.time() - start_time) * 1000)
            
            return LocationVariationResult(
                success=True,
                location_id=location_id,
                variations=variations,
                total_generation_time_ms=total_time
            )
            
        except Exception as e:
            logger.error(f"Variation generation failed: {e}")
            return LocationVariationResult(
                success=False,
                location_id=location_id,
                error_message=str(e)
            )
    
    def _generate_single_variation(
        self,
        location_description: str,
        location_id: str,
        style: LocationStyle,
        time_of_day: Optional[TimeVariation] = None,
        weather: Optional[WeatherVariation] = None,
        season: Optional[SeasonType] = None
    ) -> Optional[GeneratedLocationVariation]:
        """Generate a single variation"""
        
        try:
            # Build prompt
            positive_prompt, negative_prompt = self.prompt_builder.build_prompt(
                location_description=location_description,
                style=style,
                time_of_day=time_of_day,
                weather=weather,
                season=season
            )
            
            # Generate cache key
            cache_key = self._get_cache_key(location_id, style, time_of_day, weather, season)
            
            # Check cache
            cached_result = None
            if self.config.cache_enabled:
                cached_result = self._check_cache(cache_key)
            
            if cached_result:
                return GeneratedLocationVariation(
                    variation_id=cache_key,
                    style=style,
                    time_of_day=time_of_day,
                    weather=weather,
                    season=season,
                    prompt=positive_prompt,
                    negative_prompt=negative_prompt,
                    image_base64=cached_result,
                    cached=True
                )
            
            # Placeholder for actual generation
            # In production, would call ComfyUI or other generation service
            
            return GeneratedLocationVariation(
                variation_id=cache_key,
                style=style,
                time_of_day=time_of_day,
                weather=weather,
                season=season,
                prompt=positive_prompt,
                negative_prompt=negative_prompt,
                cached=False
            )
            
        except Exception as e:
            logger.error(f"Failed to generate variation: {e}")
            return None
    
    def _get_cache_key(
        self,
        location_id: str,
        style: LocationStyle,
        time_of_day: Optional[TimeVariation],
        weather: Optional[WeatherVariation],
        season: Optional[SeasonType]
    ) -> str:
        """Generate cache key"""
        key_parts = [
            location_id,
            style.value,
            time_of_day.value if time_of_day else "none",
            weather.value if weather else "none",
            season.value if season else "none"
        ]
        key_str = "_".join(key_parts)
        return hashlib.md5(key_str.encode()).hexdigest()[:12]
    
    def _check_cache(self, cache_key: str) -> Optional[str]:
        """Check cache for existing variation"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    return data.get("image_base64")
            except Exception:
                pass
        return None
    
    def generate_prompts_only(
        self,
        location_description: str,
        style: LocationStyle = LocationStyle.REALISTIC,
        time_of_day: Optional[TimeVariation] = None,
        weather: Optional[WeatherVariation] = None,
        season: Optional[SeasonType] = None
    ) -> Dict[str, str]:
        """Generate prompts without actual image generation"""
        
        positive, negative = self.prompt_builder.build_prompt(
            location_description=location_description,
            style=style,
            time_of_day=time_of_day,
            weather=weather,
            season=season
        )
        
        return {
            "positive_prompt": positive,
            "negative_prompt": negative,
            "style": style.value,
            "time_of_day": time_of_day.value if time_of_day else None,
            "weather": weather.value if weather else None,
            "season": season.value if season else None
        }
    
    def get_available_styles(self) -> List[Dict[str, str]]:
        """Get list of available styles"""
        return [
            {
                "id": style.value,
                "name": style.name.replace("_", " ").title(),
                "description": self.prompt_builder.STYLE_TEMPLATES.get(style, {}).get("base", "")
            }
            for style in LocationStyle
        ]
    
    def get_available_times(self) -> List[Dict[str, str]]:
        """Get list of available times of day"""
        return [
            {
                "id": time.value,
                "name": time.name.replace("_", " ").title(),
                "description": self.prompt_builder.TIME_DESCRIPTIONS.get(time, "")
            }
            for time in TimeVariation
        ]
    
    def get_available_weather(self) -> List[Dict[str, str]]:
        """Get list of available weather options"""
        return [
            {
                "id": weather.value,
                "name": weather.name.replace("_", " ").title(),
                "description": self.prompt_builder.WEATHER_DESCRIPTIONS.get(weather, "")
            }
            for weather in WeatherVariation
        ]
    
    def get_available_seasons(self) -> List[Dict[str, str]]:
        """Get list of available seasons"""
        return [
            {
                "id": season.value,
                "name": season.name.title(),
                "description": self.prompt_builder.SEASON_DESCRIPTIONS.get(season, "")
            }
            for season in SeasonType
        ]


# Singleton instance
_variation_generator: Optional[LocationVariationGenerator] = None


def get_location_variation_generator(
    config: Optional[LocationVariationConfig] = None,
    output_dir: Optional[str] = None
) -> LocationVariationGenerator:
    """Get singleton instance of location variation generator"""
    global _variation_generator
    if _variation_generator is None:
        _variation_generator = LocationVariationGenerator(config, output_dir)
    return _variation_generator