"""
Configuration Manager for End-to-End Project Creation.

This module automatically determines optimal configuration parameters
based on the parsed prompt and system capabilities.
"""

from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from src.end_to_end.data_models import (
    ParsedPrompt,
    SystemCapabilities,
    OptimalConfig
)


class ConfigurationManager:
    """
    Manages automatic configuration of project parameters.
    
    Determines optimal settings for:
    - Aspect ratio selection
    - Resolution calculation
    - Quality tier selection
    - Generation parameters
    - Shot distribution
    - Seed management
    """
    
    # Aspect ratio mappings
    ASPECT_RATIOS = {
        "trailer": "16:9",
        "teaser": "16:9",
        "short_film": "21:9",
        "social_media": "9:16",
        "instagram": "1:1",
        "tiktok": "9:16",
        "youtube": "16:9",
        "cinematic": "21:9",
        "default": "16:9"
    }
    
    # Resolution mappings (width, height)
    RESOLUTIONS = {
        "16:9": {
            "preview": (1280, 720),
            "standard": (1920, 1080),
            "high": (2560, 1440),
            "ultra": (3840, 2160)
        },
        "9:16": {
            "preview": (720, 1280),
            "standard": (1080, 1920),
            "high": (1440, 2560),
            "ultra": (2160, 3840)
        },
        "1:1": {
            "preview": (720, 720),
            "standard": (1080, 1080),
            "high": (1440, 1440),
            "ultra": (2160, 2160)
        },
        "21:9": {
            "preview": (1680, 720),
            "standard": (2560, 1080),
            "high": (3440, 1440),
            "ultra": (5120, 2160)
        },
        "4:3": {
            "preview": (960, 720),
            "standard": (1440, 1080),
            "high": (1920, 1440),
            "ultra": (2880, 2160)
        }
    }
    
    # Quality tier parameters
    QUALITY_TIERS = {
        "preview": {
            "steps": 20,
            "cfg_scale": 7.0,
            "denoise": 0.75,
            "upscale_factor": 1.0
        },
        "standard": {
            "steps": 30,
            "cfg_scale": 7.5,
            "denoise": 0.8,
            "upscale_factor": 1.5
        },
        "high": {
            "steps": 40,
            "cfg_scale": 8.0,
            "denoise": 0.85,
            "upscale_factor": 2.0
        },
        "ultra": {
            "steps": 50,
            "cfg_scale": 8.5,
            "denoise": 0.9,
            "upscale_factor": 2.0
        }
    }
    
    # Shot count recommendations by video type and duration
    SHOT_RECOMMENDATIONS = {
        "trailer": 0.5,  # shots per second
        "teaser": 0.6,
        "short_film": 0.3,
        "social_media": 0.7,
        "cinematic": 0.25,
        "default": 0.4
    }
    
    def __init__(self):
        """Initialize configuration manager"""
        pass
    
    def determine_optimal_config(
        self,
        parsed_prompt: ParsedPrompt,
        system_capabilities: SystemCapabilities
    ) -> OptimalConfig:
        """
        Determine optimal configuration based on prompt and system.
        
        Args:
            parsed_prompt: Parsed user prompt
            system_capabilities: System capabilities
            
        Returns:
            OptimalConfig with all parameters
            
        Validates: Requirements 9.1-9.8
        """
        # Select aspect ratio (Req 9.1)
        aspect_ratio = self._select_aspect_ratio(parsed_prompt)
        
        # Calculate resolution (Req 9.2)
        quality_tier = self._select_quality_tier(system_capabilities)
        resolution = self._calculate_resolution(aspect_ratio, quality_tier)
        
        # Configure generation parameters (Req 9.4)
        generation_parameters = self._configure_generation_parameters(
            quality_tier,
            parsed_prompt
        )
        
        # Calculate shot distribution (Req 9.5, 9.6)
        shot_count = self._calculate_shot_count(
            parsed_prompt.duration_seconds,
            parsed_prompt.video_type
        )
        shot_duration_distribution = self._distribute_shot_durations(
            parsed_prompt.duration_seconds,
            shot_count
        )
        
        # Generate seeds (Req 9.7)
        seeds = self._generate_seeds(shot_count)
        
        # Create optimal config
        config = OptimalConfig(
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            quality_tier=quality_tier,
            generation_parameters=generation_parameters,
            shot_count=shot_count,
            shot_duration_distribution=shot_duration_distribution,
            seeds=seeds
        )
        
        # Validate configuration (Req 9.8)
        self._validate_configuration(config)
        
        return config
    
    def _select_aspect_ratio(self, parsed_prompt: ParsedPrompt) -> str:
        """
        Select optimal aspect ratio based on video type.
        
        Validates: Requirement 9.1
        """
        # Check if aspect ratio already specified in prompt
        if parsed_prompt.aspect_ratio and parsed_prompt.aspect_ratio != "auto":
            # Validate it's a known ratio
            if parsed_prompt.aspect_ratio in self.RESOLUTIONS:
                return parsed_prompt.aspect_ratio
        
        # Select based on video type
        video_type = parsed_prompt.video_type.lower()
        
        # Check for exact match
        if video_type in self.ASPECT_RATIOS:
            return self.ASPECT_RATIOS[video_type]
        
        # Check for partial matches
        for key, ratio in self.ASPECT_RATIOS.items():
            if key in video_type or video_type in key:
                return ratio
        
        # Default fallback
        return self.ASPECT_RATIOS["default"]
    
    def _calculate_resolution(
        self,
        aspect_ratio: str,
        quality_tier: str
    ) -> Tuple[int, int]:
        """
        Calculate resolution based on aspect ratio and quality tier.
        
        Validates: Requirement 9.2
        """
        if aspect_ratio not in self.RESOLUTIONS:
            aspect_ratio = "16:9"  # Fallback
        
        if quality_tier not in self.QUALITY_TIERS:
            quality_tier = "standard"  # Fallback
        
        return self.RESOLUTIONS[aspect_ratio][quality_tier]
    
    def _select_quality_tier(
        self,
        system_capabilities: SystemCapabilities
    ) -> str:
        """
        Select optimal quality tier based on system capabilities.
        
        Validates: Requirement 9.3
        """
        # Determine tier based on system resources
        if system_capabilities.gpu_available and system_capabilities.ram_gb >= 16:
            return "high"
        elif system_capabilities.gpu_available and system_capabilities.ram_gb >= 8:
            return "standard"
        elif system_capabilities.ram_gb >= 8:
            return "standard"
        else:
            return "preview"
    
    def _configure_generation_parameters(
        self,
        quality_tier: str,
        parsed_prompt: ParsedPrompt
    ) -> Dict[str, Any]:
        """
        Configure generation parameters based on quality tier.
        
        Validates: Requirement 9.4
        """
        if quality_tier not in self.QUALITY_TIERS:
            quality_tier = "standard"
        
        params = self.QUALITY_TIERS[quality_tier].copy()
        
        # Add additional parameters based on prompt
        params["sampler"] = "euler_a"
        params["scheduler"] = "normal"
        
        # Adjust based on genre/style
        if "horror" in parsed_prompt.genre.lower():
            params["cfg_scale"] += 0.5  # More adherence to prompt
        elif "abstract" in parsed_prompt.genre.lower():
            params["cfg_scale"] -= 0.5  # More creative freedom
        
        return params
    
    def _calculate_shot_count(
        self,
        duration_seconds: int,
        video_type: str
    ) -> int:
        """
        Calculate optimal number of shots based on duration and type.
        
        Validates: Requirement 9.5
        """
        video_type_lower = video_type.lower()
        
        # Get shots per second recommendation
        shots_per_second = self.SHOT_RECOMMENDATIONS.get(
            video_type_lower,
            self.SHOT_RECOMMENDATIONS["default"]
        )
        
        # Check for partial matches
        if video_type_lower not in self.SHOT_RECOMMENDATIONS:
            for key, rate in self.SHOT_RECOMMENDATIONS.items():
                if key in video_type_lower or video_type_lower in key:
                    shots_per_second = rate
                    break
        
        # Calculate shot count
        shot_count = int(duration_seconds * shots_per_second)
        
        # Ensure minimum and maximum bounds
        shot_count = max(3, shot_count)  # At least 3 shots
        shot_count = min(100, shot_count)  # At most 100 shots
        
        return shot_count
    
    def _distribute_shot_durations(
        self,
        total_duration: int,
        shot_count: int
    ) -> List[int]:
        """
        Distribute total duration across shots.
        
        Validates: Requirement 9.6
        """
        if shot_count <= 0:
            return []
        
        # Edge case: if shot count exceeds duration, each shot gets 1 second minimum
        # This means total will be shot_count, not total_duration
        # This is an invalid configuration that should be caught earlier
        if shot_count > total_duration:
            # Return minimum valid distribution
            return [1] * shot_count
        
        # Calculate base duration per shot
        base_duration = total_duration // shot_count
        remainder = total_duration % shot_count
        
        # Create distribution - start with base duration for all shots
        durations = [base_duration] * shot_count
        
        # Distribute remainder across first shots
        for i in range(remainder):
            durations[i] += 1
        
        # Add some variation for more natural pacing
        # Only if we have enough duration per shot (base_duration > 1)
        if shot_count >= 5 and base_duration > 1:
            # Make first and last shots slightly longer (establishing/closing)
            # by borrowing from middle shots
            mid_idx = shot_count // 2
            third_idx = shot_count // 3
            
            if durations[mid_idx] > 1:
                durations[0] += 1
                durations[mid_idx] -= 1
            
            if shot_count > 2 and durations[third_idx] > 1:
                durations[-1] += 1
                durations[third_idx] -= 1
        
        # Verify total matches exactly (should always be true with this logic)
        total = sum(durations)
        assert total == total_duration, \
            f"Duration mismatch: {total} != {total_duration}, durations={durations}"
        
        # Verify all durations are positive
        assert all(d > 0 for d in durations), \
            f"Found non-positive duration in {durations}"
        
        return durations
    
    def _generate_seeds(self, shot_count: int) -> Dict[str, int]:
        """
        Generate seeds for reproducibility.
        
        Validates: Requirement 9.7
        """
        import random
        import time
        
        # Use current time as base seed for uniqueness
        base_seed = int(time.time() * 1000) % (2**31)
        
        seeds = {
            "global": base_seed,
            "master_coherence": base_seed + 1,
            "shots": {}
        }
        
        # Generate individual shot seeds
        for i in range(shot_count):
            seeds["shots"][f"shot_{i+1}"] = base_seed + 2 + i
        
        return seeds
    
    def _validate_configuration(self, config: OptimalConfig) -> None:
        """
        Validate that configuration is valid and consistent.
        
        Validates: Requirement 9.8
        
        Raises:
            ValueError: If configuration is invalid
        """
        # Validate aspect ratio
        if config.aspect_ratio not in self.RESOLUTIONS:
            raise ValueError(f"Invalid aspect ratio: {config.aspect_ratio}")
        
        # Validate resolution
        if not isinstance(config.resolution, tuple) or len(config.resolution) != 2:
            raise ValueError(f"Invalid resolution format: {config.resolution}")
        
        width, height = config.resolution
        if width <= 0 or height <= 0:
            raise ValueError(f"Invalid resolution dimensions: {width}x{height}")
        
        # Validate quality tier
        if config.quality_tier not in self.QUALITY_TIERS:
            raise ValueError(f"Invalid quality tier: {config.quality_tier}")
        
        # Validate generation parameters
        required_params = ["steps", "cfg_scale", "denoise"]
        for param in required_params:
            if param not in config.generation_parameters:
                raise ValueError(f"Missing generation parameter: {param}")
        
        # Validate parameter ranges
        steps = config.generation_parameters["steps"]
        if not (1 <= steps <= 150):
            raise ValueError(f"Invalid steps value: {steps}")
        
        cfg_scale = config.generation_parameters["cfg_scale"]
        if not (1.0 <= cfg_scale <= 20.0):
            raise ValueError(f"Invalid cfg_scale value: {cfg_scale}")
        
        # Validate shot count
        if config.shot_count <= 0:
            raise ValueError(f"Invalid shot count: {config.shot_count}")
        
        # Validate shot duration distribution
        if len(config.shot_duration_distribution) != config.shot_count:
            raise ValueError(
                f"Shot duration distribution length ({len(config.shot_duration_distribution)}) "
                f"does not match shot count ({config.shot_count})"
            )
        
        for duration in config.shot_duration_distribution:
            if duration <= 0:
                raise ValueError(f"Invalid shot duration: {duration}")
        
        # Validate seeds
        if "global" not in config.seeds:
            raise ValueError("Missing global seed")
        
        if "master_coherence" not in config.seeds:
            raise ValueError("Missing master_coherence seed")
        
        if "shots" not in config.seeds:
            raise ValueError("Missing shots seeds")
