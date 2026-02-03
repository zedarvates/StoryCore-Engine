"""
Unit tests for ComfyUI configuration generator.

Tests the generation of ComfyUI-compatible configuration including
prompts, parameters, and layer-aware conditioning.
"""

import pytest
from datetime import datetime
from pathlib import Path

from src.assistant.comfyui_config import (
    ComfyUIConfigGenerator,
    GenerationParameters,
    VisualPrompt,
    LayerConfig,
    ComfyUIConfig
)
from src.assistant.models import (
    Project,
    ProjectMetadata,
    Scene,
    Character,
    Shot,
    Sequence
)


class TestComfyUIConfigGenerator:
    """Test ComfyUI configuration generation."""
    
    def test_generator_initialization(self):
        """Test that generator initializes correctly."""
        generator = ComfyUIConfigGenerator()
        assert generator is not None
        assert generator.default_negative_prompt is not None
        assert len(generator.default_negative_prompt) > 0
    
    def test_generate_config_for_simple_project(self, sample_project):
        """Test generating configuration for a simple project."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        assert config is not None
        assert config.project_name == sample_project.name
        assert config.master_style_prompt is not None
        assert len(config.character_prompts) > 0
        assert len(config.shot_prompts) > 0
    
    def test_master_style_extraction(self, sample_project):
        """Test extraction of master style prompt."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        # Should contain style information
        assert config.master_style_prompt is not None
        assert len(config.master_style_prompt) > 0
    
    def test_character_prompts_generation(self, sample_project):
        """Test generation of character appearance prompts."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        # Should have prompt for each character
        assert len(config.character_prompts) == len(sample_project.characters)
        
        # Each character should have a non-empty prompt
        for char in sample_project.characters:
            assert char.id in config.character_prompts
            prompt = config.character_prompts[char.id]
            assert prompt is not None
            assert len(prompt) > 0
            # Should include appearance description
            assert char.appearance in prompt
    
    def test_shot_prompts_generation(self, sample_project):
        """Test generation of shot visual prompts."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        # Should have prompt for each shot
        total_shots = sum(len(seq.shots) for seq in sample_project.sequences)
        assert len(config.shot_prompts) == total_shots
        
        # Each shot should have a complete visual prompt
        for sequence in sample_project.sequences:
            for shot in sequence.shots:
                assert shot.id in config.shot_prompts
                visual_prompt = config.shot_prompts[shot.id]
                assert visual_prompt.shot_id == shot.id
                assert visual_prompt.positive_prompt is not None
                assert len(visual_prompt.positive_prompt) > 0
                assert visual_prompt.negative_prompt is not None
    
    def test_shot_prompt_includes_scene_context(self, sample_project):
        """Test that shot prompts include scene location and time."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        scene = sample_project.scenes[0]
        sequence = sample_project.sequences[0]
        shot = sequence.shots[0]
        
        visual_prompt = config.shot_prompts[shot.id]
        
        # Should include scene location
        assert scene.location in visual_prompt.positive_prompt
        # Should include time of day
        assert scene.time_of_day in visual_prompt.positive_prompt
    
    def test_shot_prompt_includes_camera_info(self, sample_project):
        """Test that shot prompts include camera type and movement."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        sequence = sample_project.sequences[0]
        shot = sequence.shots[0]
        
        visual_prompt = config.shot_prompts[shot.id]
        
        # Should include shot type
        assert shot.type in visual_prompt.positive_prompt
        # Should include camera movement
        assert shot.camera_movement in visual_prompt.positive_prompt
    
    def test_shot_prompt_includes_character_appearances(self, sample_project):
        """Test that shot prompts include character appearances."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        scene = sample_project.scenes[0]
        sequence = sample_project.sequences[0]
        shot = sequence.shots[0]
        
        visual_prompt = config.shot_prompts[shot.id]
        
        # Should reference characters in scene
        assert len(visual_prompt.character_references) > 0
        
        # Should include character appearances in prompt
        for char_id in scene.characters:
            char = next(c for c in sample_project.characters if c.id == char_id)
            assert char.name in visual_prompt.positive_prompt
    
    def test_layer_configs_generation(self, sample_project):
        """Test generation of layer-aware conditioning configs."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        # Should have layer config for each shot
        total_shots = sum(len(seq.shots) for seq in sample_project.sequences)
        assert len(config.layer_configs) == total_shots
        
        # Each shot should have at least background and character layers
        for sequence in sample_project.sequences:
            for shot in sequence.shots:
                assert shot.id in config.layer_configs
                layers = config.layer_configs[shot.id]
                assert len(layers) >= 2  # At least background and character
                
                # Check for background layer
                bg_layers = [l for l in layers if l.layer_type == "background"]
                assert len(bg_layers) == 1
                
                # Check for character layer
                char_layers = [l for l in layers if l.layer_type == "character"]
                assert len(char_layers) == 1
    
    def test_generation_parameters_defaults(self, sample_project):
        """Test that default generation parameters are set."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        params = config.generation_parameters
        assert params.resolution == (1024, 576)  # 16:9
        assert params.quality == "high"
        assert params.style_strength == 0.8
        assert params.steps == 30
        assert params.cfg_scale == 7.5
        assert params.sampler == "euler_a"
    
    def test_validation_passes_for_complete_project(self, sample_project):
        """Test that validation passes for a complete project."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        assert config.ready_for_generation is True
        assert len(config.validation_errors) == 0
    
    def test_validation_fails_for_missing_character_prompts(self, sample_project):
        """Test that validation fails if character prompts are missing."""
        # Create character with no appearance
        sample_project.characters[0].appearance = ""
        
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        assert config.ready_for_generation is False
        assert len(config.validation_errors) > 0
        assert any("character" in err.lower() for err in config.validation_errors)
    
    def test_validation_fails_for_project_with_no_scenes(self, sample_project):
        """Test that validation fails if project has no scenes."""
        sample_project.scenes = []
        sample_project.sequences = []
        
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        assert config.ready_for_generation is False
        assert any("no scenes" in err.lower() for err in config.validation_errors)
    
    def test_validation_fails_for_project_with_no_characters(self, sample_project):
        """Test that validation fails if project has no characters."""
        sample_project.characters = []
        
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        assert config.ready_for_generation is False
        assert any("no characters" in err.lower() for err in config.validation_errors)
    
    def test_update_generation_parameters(self, sample_project):
        """Test updating generation parameters."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        # Update parameters
        updated_config = generator.update_generation_parameters(
            config,
            resolution=(1920, 1080),
            quality="ultra",
            style_strength=0.9,
            seed=42
        )
        
        assert updated_config.generation_parameters.resolution == (1920, 1080)
        assert updated_config.generation_parameters.quality == "ultra"
        assert updated_config.generation_parameters.style_strength == 0.9
        assert updated_config.generation_parameters.seed == 42
        assert updated_config.generation_parameters.steps == 50  # Ultra quality
    
    def test_update_generation_parameters_partial(self, sample_project):
        """Test updating only some generation parameters."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        original_resolution = config.generation_parameters.resolution
        
        # Update only quality
        updated_config = generator.update_generation_parameters(
            config,
            quality="low"
        )
        
        assert updated_config.generation_parameters.resolution == original_resolution
        assert updated_config.generation_parameters.quality == "low"
        assert updated_config.generation_parameters.steps == 20  # Low quality
    
    def test_style_strength_clamped_to_valid_range(self, sample_project):
        """Test that style strength is clamped to 0.0-1.0 range."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        # Test upper bound
        updated_config = generator.update_generation_parameters(
            config,
            style_strength=1.5
        )
        assert updated_config.generation_parameters.style_strength == 1.0
        
        # Test lower bound
        updated_config = generator.update_generation_parameters(
            config,
            style_strength=-0.5
        )
        assert updated_config.generation_parameters.style_strength == 0.0
    
    def test_export_config_to_dict(self, sample_project):
        """Test exporting configuration to dictionary."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        config_dict = generator.export_config_to_dict(config)
        
        assert isinstance(config_dict, dict)
        assert "project_name" in config_dict
        assert "master_style_prompt" in config_dict
        assert "character_prompts" in config_dict
        assert "shot_prompts" in config_dict
        assert "generation_parameters" in config_dict
        assert "layer_configs" in config_dict
        assert "ready_for_generation" in config_dict
        assert "validation_errors" in config_dict
    
    def test_exported_dict_has_correct_structure(self, sample_project):
        """Test that exported dictionary has correct nested structure."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        config_dict = generator.export_config_to_dict(config)
        
        # Check shot prompts structure
        for shot_id, shot_data in config_dict["shot_prompts"].items():
            assert "shot_id" in shot_data
            assert "positive_prompt" in shot_data
            assert "negative_prompt" in shot_data
            assert "character_references" in shot_data
            assert "style_tags" in shot_data
            assert "parameters" in shot_data
            
            # Check parameters structure
            params = shot_data["parameters"]
            assert "resolution" in params
            assert "quality" in params
            assert "style_strength" in params
        
        # Check layer configs structure
        for shot_id, layers in config_dict["layer_configs"].items():
            assert isinstance(layers, list)
            for layer in layers:
                assert "layer_type" in layer
                assert "prompt" in layer
                assert "blend_mode" in layer
                assert "opacity" in layer
    
    def test_style_tags_extraction(self, sample_project):
        """Test extraction of style tags from style descriptions."""
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(sample_project)
        
        # Check that style tags are extracted
        for shot_id, visual_prompt in config.shot_prompts.items():
            assert isinstance(visual_prompt.style_tags, list)
            # Tags should be lowercase
            for tag in visual_prompt.style_tags:
                assert tag == tag.lower()
    
    def test_effects_layer_added_for_effects_shots(self):
        """Test that effects layer is added for shots with effects."""
        # Create project with effects shot
        project = create_project_with_effects()
        
        generator = ComfyUIConfigGenerator()
        config = generator.generate_config(project)
        
        # Find the effects shot
        effects_shot = next(
            shot for seq in project.sequences
            for shot in seq.shots
            if "effects" in shot.description.lower()
        )
        
        layers = config.layer_configs[effects_shot.id]
        effects_layers = [l for l in layers if l.layer_type == "effects"]
        
        assert len(effects_layers) == 1
        assert effects_layers[0].blend_mode == "add"


@pytest.fixture
def sample_project():
    """Create a sample project for testing."""
    metadata = ProjectMetadata(
        schema_version="1.0",
        project_name="test_project"
    )
    
    character = Character(
        id="char_1",
        name="Hero",
        role="protagonist",
        description="The main character",
        appearance="tall, athletic build, dark hair, determined expression, wearing tactical gear",
        personality="brave, determined, resourceful"
    )
    
    scene = Scene(
        id="scene_1",
        number=1,
        title="Opening Scene",
        description="Hero enters the abandoned facility",
        location="abandoned industrial facility",
        time_of_day="dusk",
        duration=5.0,
        characters=["char_1"],
        key_actions=["enters", "looks around", "draws weapon"],
        visual_notes="dark, moody, cinematic lighting"
    )
    
    shot = Shot(
        id="scene_1_shot_1",
        number=1,
        type="wide",
        camera_movement="dolly",
        duration=5.0,
        description="Hero walks through the entrance",
        visual_style="cinematic, dramatic lighting, high contrast"
    )
    
    sequence = Sequence(
        id="seq_1",
        scene_id="scene_1",
        shots=[shot],
        total_duration=5.0
    )
    
    project = Project(
        name="test_project",
        path=Path("/test/path"),
        metadata=metadata,
        scenes=[scene],
        characters=[character],
        sequences=[sequence],
        created_at=datetime.now(),
        modified_at=datetime.now()
    )
    
    return project


def create_project_with_effects():
    """Create a project with effects shots for testing."""
    metadata = ProjectMetadata(
        schema_version="1.0",
        project_name="effects_project"
    )
    
    character = Character(
        id="char_1",
        name="Wizard",
        role="protagonist",
        description="A powerful wizard",
        appearance="elderly, long white beard, flowing robes, staff",
        personality="wise, powerful"
    )
    
    scene = Scene(
        id="scene_1",
        number=1,
        title="Magic Scene",
        description="Wizard casts a spell",
        location="ancient tower",
        time_of_day="night",
        duration=3.0,
        characters=["char_1"],
        key_actions=["raises staff", "casts spell"],
        visual_notes="magical, glowing effects"
    )
    
    shot = Shot(
        id="scene_1_shot_1",
        number=1,
        type="medium",
        camera_movement="static",
        duration=3.0,
        description="Wizard casting magic spell with glowing effects",
        visual_style="magical, fantasy, glowing particles"
    )
    
    sequence = Sequence(
        id="seq_1",
        scene_id="scene_1",
        shots=[shot],
        total_duration=3.0
    )
    
    project = Project(
        name="effects_project",
        path=Path("/test/path"),
        metadata=metadata,
        scenes=[scene],
        characters=[character],
        sequences=[sequence],
        created_at=datetime.now(),
        modified_at=datetime.now()
    )
    
    return project
