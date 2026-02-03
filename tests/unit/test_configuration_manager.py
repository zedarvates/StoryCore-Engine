"""
Unit tests for Configuration Manager.

Tests specific examples and edge cases for configuration logic.
"""

import pytest
from src.end_to_end.configuration_manager import ConfigurationManager
from src.end_to_end.data_models import (
    ParsedPrompt,
    SystemCapabilities,
    CharacterInfo
)


@pytest.fixture
def manager():
    """Create ConfigurationManager instance"""
    return ConfigurationManager()


@pytest.fixture
def basic_prompt():
    """Create basic ParsedPrompt for testing"""
    return ParsedPrompt(
        project_title="Test Project",
        genre="sci-fi",
        video_type="trailer",
        mood=["dark", "mysterious"],
        setting="futuristic city",
        time_period="2048",
        characters=[],
        key_elements=["neon lights", "rain"],
        visual_style=["cyberpunk", "noir"],
        aspect_ratio="16:9",
        duration_seconds=60,
        raw_prompt="A cyberpunk trailer set in 2048",
        confidence_scores={}
    )


@pytest.fixture
def basic_capabilities():
    """Create basic SystemCapabilities for testing"""
    return SystemCapabilities(
        cpu_cores=8,
        ram_gb=16.0,
        gpu_available=True,
        disk_space_gb=500.0
    )


class TestAspectRatioSelection:
    """Test aspect ratio selection logic"""
    
    def test_trailer_gets_16_9(self, manager, basic_prompt):
        """Test that trailer video type gets 16:9 aspect ratio"""
        basic_prompt.video_type = "trailer"
        basic_prompt.aspect_ratio = "auto"
        
        ratio = manager._select_aspect_ratio(basic_prompt)
        assert ratio == "16:9"
    
    def test_social_media_gets_9_16(self, manager, basic_prompt):
        """Test that social media gets 9:16 aspect ratio"""
        basic_prompt.video_type = "social_media"
        basic_prompt.aspect_ratio = "auto"
        
        ratio = manager._select_aspect_ratio(basic_prompt)
        assert ratio == "9:16"
    
    def test_cinematic_gets_21_9(self, manager, basic_prompt):
        """Test that cinematic gets 21:9 aspect ratio"""
        basic_prompt.video_type = "cinematic"
        basic_prompt.aspect_ratio = "auto"
        
        ratio = manager._select_aspect_ratio(basic_prompt)
        assert ratio == "21:9"
    
    def test_instagram_gets_1_1(self, manager, basic_prompt):
        """Test that instagram gets 1:1 aspect ratio"""
        basic_prompt.video_type = "instagram"
        basic_prompt.aspect_ratio = "auto"
        
        ratio = manager._select_aspect_ratio(basic_prompt)
        assert ratio == "1:1"
    
    def test_explicit_ratio_is_preserved(self, manager, basic_prompt):
        """Test that explicitly specified ratio is preserved"""
        basic_prompt.aspect_ratio = "21:9"
        
        ratio = manager._select_aspect_ratio(basic_prompt)
        assert ratio == "21:9"
    
    def test_unknown_type_gets_default(self, manager, basic_prompt):
        """Test that unknown video type gets default ratio"""
        basic_prompt.video_type = "unknown_type"
        basic_prompt.aspect_ratio = "auto"
        
        ratio = manager._select_aspect_ratio(basic_prompt)
        assert ratio == "16:9"


class TestResolutionCalculation:
    """Test resolution calculation logic"""
    
    def test_16_9_preview_resolution(self, manager):
        """Test 16:9 preview resolution"""
        resolution = manager._calculate_resolution("16:9", "preview")
        assert resolution == (1280, 720)
    
    def test_16_9_standard_resolution(self, manager):
        """Test 16:9 standard resolution"""
        resolution = manager._calculate_resolution("16:9", "standard")
        assert resolution == (1920, 1080)
    
    def test_16_9_high_resolution(self, manager):
        """Test 16:9 high resolution"""
        resolution = manager._calculate_resolution("16:9", "high")
        assert resolution == (2560, 1440)
    
    def test_9_16_standard_resolution(self, manager):
        """Test 9:16 standard resolution"""
        resolution = manager._calculate_resolution("9:16", "standard")
        assert resolution == (1080, 1920)
    
    def test_1_1_standard_resolution(self, manager):
        """Test 1:1 standard resolution"""
        resolution = manager._calculate_resolution("1:1", "standard")
        assert resolution == (1080, 1080)
    
    def test_21_9_standard_resolution(self, manager):
        """Test 21:9 standard resolution"""
        resolution = manager._calculate_resolution("21:9", "standard")
        assert resolution == (2560, 1080)
    
    def test_invalid_ratio_falls_back(self, manager):
        """Test that invalid ratio falls back to 16:9"""
        resolution = manager._calculate_resolution("invalid", "standard")
        assert resolution == (1920, 1080)
    
    def test_invalid_tier_falls_back(self, manager):
        """Test that invalid tier falls back to standard"""
        resolution = manager._calculate_resolution("16:9", "invalid")
        assert resolution == (1920, 1080)


class TestQualityTierSelection:
    """Test quality tier selection logic"""
    
    def test_high_end_system_gets_high_quality(self, manager):
        """Test that high-end system gets high quality"""
        caps = SystemCapabilities(
            cpu_cores=16,
            ram_gb=32.0,
            gpu_available=True,
            disk_space_gb=1000.0
        )
        
        tier = manager._select_quality_tier(caps)
        assert tier == "high"
    
    def test_mid_range_system_gets_standard(self, manager):
        """Test that mid-range system gets standard quality"""
        caps = SystemCapabilities(
            cpu_cores=8,
            ram_gb=8.0,
            gpu_available=True,
            disk_space_gb=500.0
        )
        
        tier = manager._select_quality_tier(caps)
        assert tier == "standard"
    
    def test_low_end_system_gets_preview(self, manager):
        """Test that low-end system gets preview quality"""
        caps = SystemCapabilities(
            cpu_cores=4,
            ram_gb=4.0,
            gpu_available=False,
            disk_space_gb=100.0
        )
        
        tier = manager._select_quality_tier(caps)
        assert tier == "preview"
    
    def test_no_gpu_but_good_ram_gets_standard(self, manager):
        """Test that system without GPU but good RAM gets standard"""
        caps = SystemCapabilities(
            cpu_cores=8,
            ram_gb=16.0,
            gpu_available=False,
            disk_space_gb=500.0
        )
        
        tier = manager._select_quality_tier(caps)
        assert tier == "standard"


class TestGenerationParameters:
    """Test generation parameter configuration"""
    
    def test_preview_parameters(self, manager, basic_prompt):
        """Test preview quality parameters"""
        params = manager._configure_generation_parameters("preview", basic_prompt)
        
        assert params["steps"] == 20
        assert params["cfg_scale"] == 7.0
        assert params["denoise"] == 0.75
        assert "sampler" in params
        assert "scheduler" in params
    
    def test_standard_parameters(self, manager, basic_prompt):
        """Test standard quality parameters"""
        params = manager._configure_generation_parameters("standard", basic_prompt)
        
        assert params["steps"] == 30
        assert params["cfg_scale"] == 7.5
        assert params["denoise"] == 0.8
    
    def test_high_parameters(self, manager, basic_prompt):
        """Test high quality parameters"""
        params = manager._configure_generation_parameters("high", basic_prompt)
        
        assert params["steps"] == 40
        assert params["cfg_scale"] == 8.0
        assert params["denoise"] == 0.85
    
    def test_horror_genre_increases_cfg(self, manager, basic_prompt):
        """Test that horror genre increases cfg_scale"""
        basic_prompt.genre = "horror"
        
        params = manager._configure_generation_parameters("standard", basic_prompt)
        
        # Should be higher than base 7.5
        assert params["cfg_scale"] > 7.5
    
    def test_abstract_genre_decreases_cfg(self, manager, basic_prompt):
        """Test that abstract genre decreases cfg_scale"""
        basic_prompt.genre = "abstract"
        
        params = manager._configure_generation_parameters("standard", basic_prompt)
        
        # Should be lower than base 7.5
        assert params["cfg_scale"] < 7.5


class TestShotCountCalculation:
    """Test shot count calculation logic"""
    
    def test_trailer_shot_count(self, manager):
        """Test shot count for trailer"""
        count = manager._calculate_shot_count(60, "trailer")
        
        # Trailer: 0.5 shots/sec * 60 = 30 shots
        assert count == 30
    
    def test_teaser_shot_count(self, manager):
        """Test shot count for teaser"""
        count = manager._calculate_shot_count(30, "teaser")
        
        # Teaser: 0.6 shots/sec * 30 = 18 shots
        assert count == 18
    
    def test_short_film_shot_count(self, manager):
        """Test shot count for short film"""
        count = manager._calculate_shot_count(120, "short_film")
        
        # Short film: 0.3 shots/sec * 120 = 36 shots
        assert count == 36
    
    def test_minimum_shot_count(self, manager):
        """Test that minimum shot count is enforced"""
        count = manager._calculate_shot_count(5, "trailer")
        
        # Should be at least 3 shots
        assert count >= 3
    
    def test_maximum_shot_count(self, manager):
        """Test that maximum shot count is enforced"""
        count = manager._calculate_shot_count(1000, "trailer")
        
        # Should be at most 100 shots
        assert count <= 100


class TestShotDurationDistribution:
    """Test shot duration distribution logic"""
    
    def test_equal_distribution(self, manager):
        """Test equal distribution when duration divides evenly"""
        distribution = manager._distribute_shot_durations(60, 10)
        
        assert len(distribution) == 10
        assert sum(distribution) == 60
        assert all(d > 0 for d in distribution)
    
    def test_unequal_distribution(self, manager):
        """Test distribution when duration doesn't divide evenly"""
        distribution = manager._distribute_shot_durations(61, 10)
        
        assert len(distribution) == 10
        assert sum(distribution) == 61
        assert all(d > 0 for d in distribution)
    
    def test_single_shot(self, manager):
        """Test distribution with single shot"""
        distribution = manager._distribute_shot_durations(30, 1)
        
        assert len(distribution) == 1
        assert distribution[0] == 30
    
    def test_many_short_shots(self, manager):
        """Test distribution with many short shots"""
        distribution = manager._distribute_shot_durations(20, 15)
        
        assert len(distribution) == 15
        assert sum(distribution) == 20
        assert all(d > 0 for d in distribution)
    
    def test_all_durations_positive(self, manager):
        """Test that all durations are positive"""
        distribution = manager._distribute_shot_durations(100, 30)
        
        assert all(d > 0 for d in distribution)


class TestSeedGeneration:
    """Test seed generation logic"""
    
    def test_seed_structure(self, manager):
        """Test that seed structure is correct"""
        seeds = manager._generate_seeds(5)
        
        assert "global" in seeds
        assert "master_coherence" in seeds
        assert "shots" in seeds
        
        assert isinstance(seeds["global"], int)
        assert isinstance(seeds["master_coherence"], int)
        assert isinstance(seeds["shots"], dict)
    
    def test_shot_seeds_count(self, manager):
        """Test that correct number of shot seeds are generated"""
        seeds = manager._generate_seeds(10)
        
        assert len(seeds["shots"]) == 10
    
    def test_seeds_are_different(self, manager):
        """Test that different seeds are generated"""
        seeds = manager._generate_seeds(5)
        
        all_seeds = [
            seeds["global"],
            seeds["master_coherence"]
        ] + list(seeds["shots"].values())
        
        # All seeds should be unique
        assert len(all_seeds) == len(set(all_seeds))
    
    def test_seeds_are_valid(self, manager):
        """Test that seeds are valid integers"""
        seeds = manager._generate_seeds(5)
        
        assert 0 <= seeds["global"] < 2**31
        assert 0 <= seeds["master_coherence"] < 2**31
        
        for seed in seeds["shots"].values():
            assert 0 <= seed < 2**31


class TestConfigurationValidation:
    """Test configuration validation logic"""
    
    def test_valid_configuration_passes(self, manager, basic_prompt, basic_capabilities):
        """Test that valid configuration passes validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        
        # Should not raise any exception
        manager._validate_configuration(config)
    
    def test_invalid_aspect_ratio_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that invalid aspect ratio fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.aspect_ratio = "invalid"
        
        with pytest.raises(ValueError, match="Invalid aspect ratio"):
            manager._validate_configuration(config)
    
    def test_invalid_resolution_format_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that invalid resolution format fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.resolution = (1920,)  # Wrong format
        
        with pytest.raises(ValueError, match="Invalid resolution format"):
            manager._validate_configuration(config)
    
    def test_negative_resolution_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that negative resolution fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.resolution = (-1920, 1080)
        
        with pytest.raises(ValueError, match="Invalid resolution dimensions"):
            manager._validate_configuration(config)
    
    def test_invalid_quality_tier_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that invalid quality tier fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.quality_tier = "invalid"
        
        with pytest.raises(ValueError, match="Invalid quality tier"):
            manager._validate_configuration(config)
    
    def test_missing_generation_parameter_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that missing generation parameter fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        del config.generation_parameters["steps"]
        
        with pytest.raises(ValueError, match="Missing generation parameter"):
            manager._validate_configuration(config)
    
    def test_invalid_steps_value_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that invalid steps value fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.generation_parameters["steps"] = 200  # Too high
        
        with pytest.raises(ValueError, match="Invalid steps value"):
            manager._validate_configuration(config)
    
    def test_invalid_cfg_scale_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that invalid cfg_scale fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.generation_parameters["cfg_scale"] = 25.0  # Too high
        
        with pytest.raises(ValueError, match="Invalid cfg_scale value"):
            manager._validate_configuration(config)
    
    def test_zero_shot_count_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that zero shot count fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.shot_count = 0
        
        with pytest.raises(ValueError, match="Invalid shot count"):
            manager._validate_configuration(config)
    
    def test_mismatched_distribution_length_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that mismatched distribution length fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.shot_duration_distribution = [5, 5, 5]  # Wrong length
        
        with pytest.raises(ValueError, match="does not match shot count"):
            manager._validate_configuration(config)
    
    def test_negative_shot_duration_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that negative shot duration fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        config.shot_duration_distribution[0] = -1
        
        with pytest.raises(ValueError, match="Invalid shot duration"):
            manager._validate_configuration(config)
    
    def test_missing_global_seed_fails(self, manager, basic_prompt, basic_capabilities):
        """Test that missing global seed fails validation"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        del config.seeds["global"]
        
        with pytest.raises(ValueError, match="Missing global seed"):
            manager._validate_configuration(config)


class TestEndToEndConfiguration:
    """Test complete configuration workflow"""
    
    def test_complete_workflow(self, manager, basic_prompt, basic_capabilities):
        """Test complete configuration workflow"""
        config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
        
        # Verify all components are present
        assert config.aspect_ratio is not None
        assert config.resolution is not None
        assert config.quality_tier is not None
        assert config.generation_parameters is not None
        assert config.shot_count > 0
        assert len(config.shot_duration_distribution) > 0
        assert config.seeds is not None
    
    def test_different_video_types(self, manager, basic_prompt, basic_capabilities):
        """Test configuration with different video types"""
        video_types = ["trailer", "teaser", "short_film", "social_media", "cinematic"]
        
        for video_type in video_types:
            basic_prompt.video_type = video_type
            config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
            
            # Should produce valid configuration for each type
            assert config.aspect_ratio in ["16:9", "9:16", "1:1", "21:9", "4:3"]
            assert config.shot_count > 0
    
    def test_different_durations(self, manager, basic_prompt, basic_capabilities):
        """Test configuration with different durations"""
        durations = [15, 30, 60, 120, 180]
        
        for duration in durations:
            basic_prompt.duration_seconds = duration
            config = manager.determine_optimal_config(basic_prompt, basic_capabilities)
            
            # Shot count should scale with duration
            assert config.shot_count > 0
            assert sum(config.shot_duration_distribution) == duration


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
