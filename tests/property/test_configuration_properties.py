"""
Property-based tests for Configuration Manager.

Tests Property 9: Optimal Configuration Selection
"""

import pytest
from hypothesis import given, strategies as st, assume
from src.end_to_end.configuration_manager import ConfigurationManager
from src.end_to_end.data_models import (
    ParsedPrompt,
    SystemCapabilities,
    CharacterInfo
)


# Strategies for generating test data
@st.composite
def parsed_prompt_strategy(draw):
    """Generate valid ParsedPrompt instances"""
    video_types = ["trailer", "teaser", "short_film", "social_media", "cinematic", "youtube"]
    genres = ["cyberpunk", "fantasy", "horror", "sci-fi", "drama", "comedy"]
    
    return ParsedPrompt(
        project_title=draw(st.text(min_size=5, max_size=50)),
        genre=draw(st.sampled_from(genres)),
        video_type=draw(st.sampled_from(video_types)),
        mood=draw(st.lists(st.text(min_size=3, max_size=20), min_size=1, max_size=5)),
        setting=draw(st.text(min_size=5, max_size=100)),
        time_period=draw(st.text(min_size=3, max_size=50)),
        characters=[],
        key_elements=draw(st.lists(st.text(min_size=3, max_size=30), min_size=0, max_size=10)),
        visual_style=draw(st.lists(st.text(min_size=3, max_size=30), min_size=1, max_size=5)),
        aspect_ratio=draw(st.sampled_from(["16:9", "9:16", "1:1", "21:9", "4:3", "auto"])),
        duration_seconds=draw(st.integers(min_value=10, max_value=300)),
        raw_prompt=draw(st.text(min_size=20, max_size=500)),
        confidence_scores={}
    )


@st.composite
def system_capabilities_strategy(draw):
    """Generate valid SystemCapabilities instances"""
    return SystemCapabilities(
        cpu_cores=draw(st.integers(min_value=1, max_value=64)),
        ram_gb=draw(st.floats(min_value=2.0, max_value=128.0)),
        gpu_available=draw(st.booleans()),
        disk_space_gb=draw(st.floats(min_value=10.0, max_value=10000.0))
    )


@given(
    parsed_prompt=parsed_prompt_strategy(),
    system_capabilities=system_capabilities_strategy()
)
def test_property_9_optimal_configuration_selection(parsed_prompt, system_capabilities):
    """
    Property 9: Optimal Configuration Selection
    
    For any parsed prompt and system capabilities, the system should automatically
    determine optimal configuration parameters (aspect_ratio, resolution, quality_tier,
    generation_parameters, shot_count, shot_duration, seeds) that are valid and
    appropriate for the project type.
    
    Validates: Requirements 9.1-9.8
    """
    manager = ConfigurationManager()
    
    # Generate optimal configuration
    config = manager.determine_optimal_config(parsed_prompt, system_capabilities)
    
    # Validate aspect ratio is valid (Req 9.1)
    assert config.aspect_ratio in ["16:9", "9:16", "1:1", "21:9", "4:3"]
    
    # Validate resolution is appropriate (Req 9.2)
    assert isinstance(config.resolution, tuple)
    assert len(config.resolution) == 2
    width, height = config.resolution
    assert width > 0 and height > 0
    assert 640 <= width <= 8192  # Reasonable bounds
    assert 480 <= height <= 8192
    
    # Validate quality tier is valid (Req 9.3)
    assert config.quality_tier in ["preview", "standard", "high", "ultra"]
    
    # Validate generation parameters are present and valid (Req 9.4)
    assert "steps" in config.generation_parameters
    assert "cfg_scale" in config.generation_parameters
    assert "denoise" in config.generation_parameters
    
    steps = config.generation_parameters["steps"]
    assert 1 <= steps <= 150
    
    cfg_scale = config.generation_parameters["cfg_scale"]
    assert 1.0 <= cfg_scale <= 20.0
    
    denoise = config.generation_parameters["denoise"]
    assert 0.0 <= denoise <= 1.0
    
    # Validate shot count is reasonable (Req 9.5)
    assert config.shot_count > 0
    assert config.shot_count >= 3  # Minimum shots
    assert config.shot_count <= 100  # Maximum shots
    
    # Validate shot duration distribution (Req 9.6)
    assert len(config.shot_duration_distribution) == config.shot_count
    assert all(d > 0 for d in config.shot_duration_distribution)
    
    # Total duration should match (approximately, allowing for rounding)
    total_distributed = sum(config.shot_duration_distribution)
    assert abs(total_distributed - parsed_prompt.duration_seconds) <= 1
    
    # Validate seeds are present and valid (Req 9.7)
    assert "global" in config.seeds
    assert "master_coherence" in config.seeds
    assert "shots" in config.seeds
    
    assert isinstance(config.seeds["global"], int)
    assert isinstance(config.seeds["master_coherence"], int)
    assert isinstance(config.seeds["shots"], dict)
    
    # Should have seeds for all shots
    assert len(config.seeds["shots"]) == config.shot_count
    
    # All seeds should be valid integers
    for shot_id, seed in config.seeds["shots"].items():
        assert isinstance(seed, int)
        assert 0 <= seed < 2**31
    
    # Validate configuration consistency (Req 9.8)
    # Resolution should match aspect ratio
    aspect_parts = config.aspect_ratio.split(":")
    if len(aspect_parts) == 2:
        expected_ratio = int(aspect_parts[0]) / int(aspect_parts[1])
        actual_ratio = width / height
        # Allow 5% tolerance for rounding
        assert abs(expected_ratio - actual_ratio) / expected_ratio < 0.05


@given(
    parsed_prompt=parsed_prompt_strategy(),
    system_capabilities=system_capabilities_strategy()
)
def test_configuration_determinism(parsed_prompt, system_capabilities):
    """
    Test that configuration is deterministic for same inputs.
    
    Note: Seeds will differ due to time-based generation, but other
    parameters should be consistent.
    """
    manager = ConfigurationManager()
    
    config1 = manager.determine_optimal_config(parsed_prompt, system_capabilities)
    config2 = manager.determine_optimal_config(parsed_prompt, system_capabilities)
    
    # These should be identical
    assert config1.aspect_ratio == config2.aspect_ratio
    assert config1.resolution == config2.resolution
    assert config1.quality_tier == config2.quality_tier
    assert config1.shot_count == config2.shot_count
    assert config1.shot_duration_distribution == config2.shot_duration_distribution
    
    # Generation parameters should be identical
    assert config1.generation_parameters == config2.generation_parameters


@given(
    duration=st.integers(min_value=10, max_value=300),
    video_type=st.sampled_from(["trailer", "teaser", "short_film", "social_media", "cinematic"])
)
def test_shot_count_scales_with_duration(duration, video_type):
    """
    Test that shot count scales appropriately with duration.
    """
    manager = ConfigurationManager()
    
    shot_count = manager._calculate_shot_count(duration, video_type)
    
    # Shot count should be positive
    assert shot_count > 0
    
    # Shot count should scale with duration
    # Longer videos should generally have more shots
    shots_per_second = shot_count / duration
    assert 0.1 <= shots_per_second <= 1.0  # Reasonable range


@given(
    total_duration=st.integers(min_value=10, max_value=300),
    shot_count=st.integers(min_value=3, max_value=50)
)
def test_shot_duration_distribution_sums_correctly(total_duration, shot_count):
    """
    Test that shot duration distribution always sums to total duration.
    """
    # Skip invalid configurations where shot_count > total_duration
    # This should never happen in practice due to shot count calculation logic
    assume(shot_count <= total_duration)
    
    manager = ConfigurationManager()
    
    distribution = manager._distribute_shot_durations(total_duration, shot_count)
    
    # Should have correct number of shots
    assert len(distribution) == shot_count
    
    # All durations should be positive
    assert all(d > 0 for d in distribution)
    
    # Should sum to total duration
    assert sum(distribution) == total_duration


@given(
    system_capabilities=system_capabilities_strategy()
)
def test_quality_tier_matches_capabilities(system_capabilities):
    """
    Test that quality tier selection matches system capabilities.
    """
    manager = ConfigurationManager()
    
    quality_tier = manager._select_quality_tier(system_capabilities)
    
    # Should be a valid tier
    assert quality_tier in ["preview", "standard", "high", "ultra"]
    
    # High-end systems should get better quality
    if system_capabilities.gpu_available and system_capabilities.ram_gb >= 16:
        assert quality_tier in ["high", "ultra"]
    
    # Low-end systems should get lower quality
    if not system_capabilities.gpu_available and system_capabilities.ram_gb < 8:
        assert quality_tier in ["preview", "standard"]


@given(
    aspect_ratio=st.sampled_from(["16:9", "9:16", "1:1", "21:9", "4:3"]),
    quality_tier=st.sampled_from(["preview", "standard", "high", "ultra"])
)
def test_resolution_matches_aspect_ratio(aspect_ratio, quality_tier):
    """
    Test that calculated resolution matches the aspect ratio.
    """
    manager = ConfigurationManager()
    
    resolution = manager._calculate_resolution(aspect_ratio, quality_tier)
    
    width, height = resolution
    
    # Calculate actual ratio
    actual_ratio = width / height
    
    # Calculate expected ratio
    parts = aspect_ratio.split(":")
    expected_ratio = int(parts[0]) / int(parts[1])
    
    # Should match within 5% tolerance
    assert abs(actual_ratio - expected_ratio) / expected_ratio < 0.05


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
