"""
Test Suite for NewBie Image Integration

Comprehensive tests for anime-style image generation integration
with structured prompts, character definitions, and quality validation.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch, mock_open
import numpy as np

from src.newbie_image_integration import (
    NewBieImageIntegration,
    NewBieConfig,
    CharacterDefinition,
    PromptTemplate,
    GenerationResult,
    AnimeStyle,
    CharacterGender,
    ImageQuality,
    create_newbie_integration
)


class TestNewBieImageIntegration(unittest.TestCase):
    """Test cases for NewBie Image Integration."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = NewBieConfig(
            model_path="test_newbie_model",
            default_resolution=(1024, 1536),
            default_steps=25,
            enable_character_consistency=True
        )
        self.integration = NewBieImageIntegration(self.config)
        
        # Test character data
        self.test_character_data = {
            "name": "TestCharacter",
            "gender": "female",
            "age_range": "teenager",
            "hair_color": "blue",
            "hair_style": "long straight",
            "eye_color": "amber",
            "clothing": "school uniform",
            "personality_traits": ["confident", "cheerful"],
            "physical_features": ["tall", "athletic build"],
            "accessories": ["glasses", "backpack"],
            "reference_tags": ["anime", "student", "protagonist"]
        }
    
    def test_integration_initialization(self):
        """Test NewBie integration initialization."""
        # Test default initialization
        default_integration = NewBieImageIntegration()
        self.assertIsNotNone(default_integration.config)
        self.assertEqual(len(default_integration.character_cache), 0)
        self.assertGreater(len(default_integration.prompt_templates), 0)
        
        # Test custom config initialization
        self.assertEqual(self.integration.config.model_path, "test_newbie_model")
        self.assertEqual(self.integration.config.default_resolution, (1024, 1536))
        self.assertTrue(self.integration.config.enable_character_consistency)
    
    def test_factory_function(self):
        """Test factory function for creating integration."""
        integration = create_newbie_integration()
        self.assertIsInstance(integration, NewBieImageIntegration)
        
        integration_with_config = create_newbie_integration(self.config)
        self.assertEqual(integration_with_config.config.model_path, "test_newbie_model")
    
    def test_character_creation_from_dict(self):
        """Test character creation from dictionary data."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        
        # Verify character properties
        self.assertEqual(character.name, "TestCharacter")
        self.assertEqual(character.gender, CharacterGender.FEMALE)
        self.assertEqual(character.hair_color, "blue")
        self.assertEqual(character.eye_color, "amber")
        self.assertEqual(len(character.personality_traits), 2)
        self.assertEqual(len(character.accessories), 2)
        
        # Verify caching
        self.assertIn("TestCharacter", self.integration.character_cache)
        cached_character = self.integration.character_cache["TestCharacter"]
        self.assertEqual(cached_character.name, character.name)
    
    def test_character_xml_parsing(self):
        """Test character definition parsing from XML."""
        xml_content = """
        <character>
            <name>XMLCharacter</name>
            <gender>male</gender>
            <age_range>young adult</age_range>
            <appearance>
                <hair_color>black</hair_color>
                <hair_style>spiky</hair_style>
                <eye_color>red</eye_color>
            </appearance>
            <clothing>ninja outfit</clothing>
            <personality>
                <trait>mysterious</trait>
                <trait>skilled</trait>
            </personality>
            <physical_features>
                <feature>lean build</feature>
                <feature>scar on cheek</feature>
            </physical_features>
            <accessories>
                <accessory>katana</accessory>
                <accessory>mask</accessory>
            </accessories>
            <background_story>A skilled ninja from the shadow clan</background_story>
            <reference_tags>
                <tag>ninja</tag>
                <tag>warrior</tag>
                <tag>anime</tag>
            </reference_tags>
        </character>
        """
        
        character = self.integration.parse_character_xml(xml_content)
        
        # Verify parsed data
        self.assertEqual(character.name, "XMLCharacter")
        self.assertEqual(character.gender, CharacterGender.MALE)
        self.assertEqual(character.hair_color, "black")
        self.assertEqual(character.hair_style, "spiky")
        self.assertEqual(len(character.personality_traits), 2)
        self.assertEqual(len(character.physical_features), 2)
        self.assertEqual(len(character.accessories), 2)
        self.assertEqual(len(character.reference_tags), 3)
        self.assertIn("ninja", character.reference_tags)
        
        # Verify caching
        self.assertIn("XMLCharacter", self.integration.character_cache)
    
    def test_xml_parsing_error_handling(self):
        """Test XML parsing error handling."""
        # Test invalid XML
        invalid_xml = "<character><name>Test</invalid>"
        with self.assertRaises(ValueError):
            self.integration.parse_character_xml(invalid_xml)
        
        # Test missing required fields (should handle gracefully)
        minimal_xml = "<character><name>MinimalChar</name></character>"
        character = self.integration.parse_character_xml(minimal_xml)
        self.assertEqual(character.name, "MinimalChar")
        self.assertEqual(character.gender, CharacterGender.UNSPECIFIED)
    
    def test_character_description_building(self):
        """Test character description building for prompts."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        description = self.integration._build_character_description(character)
        
        # Verify description contains key elements
        self.assertIn("teenager", description)
        self.assertIn("female", description)
        self.assertIn("blue", description)
        self.assertIn("amber eyes", description)
        self.assertIn("school uniform", description)
        self.assertIn("glasses", description)
        self.assertIn("backpack", description)
    
    def test_personality_to_visuals_mapping(self):
        """Test personality trait to visual element mapping."""
        traits = ["confident", "mysterious", "cheerful", "unknown_trait"]
        visuals = self.integration._map_personality_to_visuals(traits)
        
        # Should map known traits and ignore unknown ones
        self.assertGreater(len(visuals), 0)
        self.assertLess(len(visuals), len(traits))  # unknown_trait should be ignored
        
        # Check specific mappings
        confident_visual = any("confident" in visual for visual in visuals)
        self.assertTrue(confident_visual)
    
    def test_structured_prompt_building(self):
        """Test structured prompt building from templates."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        
        # Test with default template
        prompt = self.integration.build_structured_prompt("classic_portrait", character)
        
        # Verify prompt structure
        self.assertIsInstance(prompt, str)
        self.assertGreater(len(prompt), 50)  # Should be substantial
        self.assertIn("TestCharacter", prompt.lower() or "teenager" in prompt.lower())
        
        # Test with custom parameters
        custom_params = {"additional_detail": "magical aura"}
        custom_prompt = self.integration.build_structured_prompt(
            "classic_portrait", character, custom_params
        )
        self.assertIn("magical aura", custom_prompt)
    
    def test_prompt_template_system(self):
        """Test prompt template system."""
        # Verify default templates exist
        self.assertIn("classic_portrait", self.integration.prompt_templates)
        self.assertIn("modern_scene", self.integration.prompt_templates)
        self.assertIn("fantasy_adventure", self.integration.prompt_templates)
        
        # Test template structure
        template = self.integration.prompt_templates["classic_portrait"]
        self.assertIsInstance(template, PromptTemplate)
        self.assertEqual(template.art_style, AnimeStyle.CLASSIC)
        self.assertGreater(len(template.quality_tags), 0)
        self.assertGreater(len(template.negative_tags), 0)
    
    def test_invalid_template_handling(self):
        """Test handling of invalid template names."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        
        with self.assertRaises(ValueError):
            self.integration.build_structured_prompt("nonexistent_template", character)
    
    def test_image_generation(self):
        """Test image generation functionality."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        prompt = self.integration.build_structured_prompt("classic_portrait", character)
        
        # Mock the image generation
        with patch.object(self.integration, '_mock_generate_image') as mock_gen:
            mock_gen.return_value = "test_image.png"
            
            result = self.integration.generate_image(prompt, character, ImageQuality.HIGH)
            
            # Verify result structure
            self.assertIsInstance(result, GenerationResult)
            self.assertEqual(result.image_path, "test_image.png")
            self.assertEqual(result.prompt_used, prompt)
            self.assertEqual(result.character_definition, character)
            self.assertGreater(result.generation_time, 0)
            self.assertGreaterEqual(result.quality_score, 0.0)
            self.assertLessEqual(result.quality_score, 1.0)
            self.assertEqual(result.resolution, (1024, 1536))  # HIGH quality
    
    def test_image_generation_quality_levels(self):
        """Test image generation with different quality levels."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        prompt = "test prompt"
        
        quality_resolutions = {
            ImageQuality.DRAFT: (512, 768),
            ImageQuality.STANDARD: (768, 1024),
            ImageQuality.HIGH: (1024, 1536),
            ImageQuality.ULTRA: (1536, 2048)
        }
        
        with patch.object(self.integration, '_mock_generate_image') as mock_gen:
            mock_gen.return_value = "test_image.png"
            
            for quality, expected_resolution in quality_resolutions.items():
                result = self.integration.generate_image(prompt, character, quality)
                self.assertEqual(result.resolution, expected_resolution)
    
    def test_image_generation_custom_config(self):
        """Test image generation with custom configuration."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        prompt = "test prompt"
        custom_config = {
            "steps": 50,
            "cfg_scale": 9.0,
            "seed": 12345
        }
        
        with patch.object(self.integration, '_mock_generate_image') as mock_gen:
            mock_gen.return_value = "test_image.png"
            
            result = self.integration.generate_image(prompt, character, custom_config=custom_config)
            
            # Verify custom parameters were used
            self.assertEqual(result.parameters["steps"], 50)
            self.assertEqual(result.parameters["cfg_scale"], 9.0)
            self.assertEqual(result.seed_used, 12345)
    
    def test_generation_error_handling(self):
        """Test error handling during image generation."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        prompt = "test prompt"
        
        # Mock generation failure
        with patch.object(self.integration, '_mock_generate_image') as mock_gen:
            mock_gen.side_effect = Exception("Generation failed")
            
            result = self.integration.generate_image(prompt, character)
            
            # Should return error result
            self.assertEqual(result.image_path, "")
            self.assertEqual(result.quality_score, 0.0)
            self.assertIn("error", result.metadata)
    
    def test_quality_score_calculation(self):
        """Test quality score calculation."""
        # Test with different prompt complexities
        simple_prompt = "girl, anime"
        complex_prompt = "detailed anime girl, blue hair, school uniform, confident expression, high quality, masterpiece"
        
        simple_score = self.integration._calculate_quality_score("test.png", simple_prompt)
        complex_score = self.integration._calculate_quality_score("test.png", complex_prompt)
        
        # Complex prompts should generally get higher scores
        self.assertGreaterEqual(simple_score, 0.0)
        self.assertLessEqual(simple_score, 1.0)
        self.assertGreaterEqual(complex_score, 0.0)
        self.assertLessEqual(complex_score, 1.0)
    
    def test_consistency_score_calculation(self):
        """Test character consistency score calculation."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        
        score = self.integration._calculate_consistency_score("test.png", character)
        
        # Verify score is in valid range
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)
    
    def test_anime_quality_validation(self):
        """Test anime-specific quality validation."""
        result = self.integration.validate_anime_quality("test.png", AnimeStyle.CLASSIC)
        
        # Verify validation result structure
        required_metrics = [
            "style_accuracy", "character_proportions", "color_harmony",
            "line_quality", "background_integration", "overall_composition",
            "anime_authenticity", "overall_anime_quality"
        ]
        
        for metric in required_metrics:
            self.assertIn(metric, result)
            if metric != "overall_anime_quality":
                self.assertGreaterEqual(result[metric], 0.0)
                self.assertLessEqual(result[metric], 1.0)
        
        # Verify style information
        self.assertEqual(result["expected_style"], "classic")
        self.assertIn("style_match", result)
    
    def test_character_consistency_checking(self):
        """Test character consistency checking across images."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        image_paths = ["image1.png", "image2.png", "image3.png"]
        
        result = self.integration.check_character_consistency(image_paths, character)
        
        # Verify consistency result structure
        required_metrics = [
            "hair_consistency", "eye_consistency", "facial_structure",
            "clothing_consistency", "accessory_consistency", "overall_character_identity"
        ]
        
        for metric in required_metrics:
            self.assertIn(metric, result)
            self.assertGreaterEqual(result[metric], 0.0)
            self.assertLessEqual(result[metric], 1.0)
        
        # Verify metadata
        self.assertEqual(result["character_name"], "TestCharacter")
        self.assertEqual(result["images_analyzed"], 3)
        self.assertIn("consistency_grade", result)
    
    def test_consistency_check_insufficient_images(self):
        """Test consistency check with insufficient images."""
        character = self.integration.create_character_from_dict(self.test_character_data)
        
        result = self.integration.check_character_consistency(["single_image.png"], character)
        self.assertIn("error", result)
    
    def test_score_to_grade_conversion(self):
        """Test score to grade conversion."""
        test_cases = [
            (0.96, "A+"),
            (0.92, "A"),
            (0.87, "B+"),
            (0.82, "B"),
            (0.77, "C+"),
            (0.72, "C"),
            (0.65, "D")
        ]
        
        for score, expected_grade in test_cases:
            grade = self.integration._score_to_grade(score)
            self.assertEqual(grade, expected_grade)
    
    def test_generation_statistics(self):
        """Test generation statistics calculation."""
        # Initially no statistics
        stats = self.integration.get_generation_statistics()
        self.assertIn("message", stats)
        
        # Add some mock generations
        character = self.integration.create_character_from_dict(self.test_character_data)
        
        with patch.object(self.integration, '_mock_generate_image') as mock_gen:
            mock_gen.return_value = "test_image.png"
            
            # Generate multiple images
            for i in range(3):
                prompt = f"test prompt {i}"
                self.integration.generate_image(prompt, character)
        
        # Check statistics
        stats = self.integration.get_generation_statistics()
        self.assertEqual(stats["total_generations"], 3)
        self.assertEqual(stats["successful_generations"], 3)
        self.assertGreater(stats["average_quality"], 0.0)
        self.assertGreater(stats["average_consistency"], 0.0)
        self.assertIn("quality_distribution", stats)
        self.assertEqual(stats["characters_used"], 1)
    
    def test_character_library_export(self):
        """Test character library export functionality."""
        # Add characters to library
        character1 = self.integration.create_character_from_dict(self.test_character_data)
        
        character2_data = self.test_character_data.copy()
        character2_data["name"] = "SecondCharacter"
        character2_data["hair_color"] = "red"
        character2 = self.integration.create_character_from_dict(character2_data)
        
        # Test export
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_path = tmp_file.name
        
        try:
            success = self.integration.export_character_library(tmp_path)
            self.assertTrue(success)
            
            # Verify exported data
            with open(tmp_path, 'r', encoding='utf-8') as f:
                exported_data = json.load(f)
            
            self.assertIn("character_library", exported_data)
            self.assertIn("generation_statistics", exported_data)
            self.assertIn("export_timestamp", exported_data)
            
            # Verify characters
            characters = exported_data["character_library"]
            self.assertIn("TestCharacter", characters)
            self.assertIn("SecondCharacter", characters)
            
            # Verify character data
            test_char_data = characters["TestCharacter"]
            self.assertEqual(test_char_data["name"], "TestCharacter")
            self.assertEqual(test_char_data["hair_color"], "blue")
            
        finally:
            # Clean up
            if Path(tmp_path).exists():
                Path(tmp_path).unlink()
    
    def test_export_error_handling(self):
        """Test export error handling."""
        # Test export to invalid path
        success = self.integration.export_character_library("/invalid/path/export.json")
        self.assertFalse(success)
    
    def test_enum_values(self):
        """Test enum value handling."""
        # Test AnimeStyle enum
        self.assertEqual(AnimeStyle.CLASSIC.value, "classic")
        self.assertEqual(AnimeStyle.CYBERPUNK.value, "cyberpunk")
        
        # Test CharacterGender enum
        self.assertEqual(CharacterGender.FEMALE.value, "female")
        self.assertEqual(CharacterGender.NON_BINARY.value, "non_binary")
        
        # Test ImageQuality enum
        self.assertEqual(ImageQuality.HIGH.value, "high")
        self.assertEqual(ImageQuality.ULTRA.value, "ultra")
    
    def test_config_validation(self):
        """Test configuration validation and edge cases."""
        # Test with extreme values
        extreme_config = NewBieConfig(
            default_resolution=(4096, 4096),  # Very high resolution
            default_steps=100,                # Many steps
            batch_size=10                     # Large batch
        )
        
        integration = NewBieImageIntegration(extreme_config)
        self.assertEqual(integration.config.default_resolution, (4096, 4096))
        self.assertEqual(integration.config.default_steps, 100)
    
    def test_template_customization(self):
        """Test custom template creation and usage."""
        # Create custom template
        custom_template = PromptTemplate(
            character_description="{character}",
            scene_setting="cyberpunk city",
            art_style=AnimeStyle.CYBERPUNK,
            mood="futuristic, neon",
            lighting="neon lighting, dramatic shadows",
            composition="dynamic angle, action pose",
            quality_tags=["cyberpunk", "neon", "futuristic"],
            negative_tags=["old fashioned", "medieval"],
            technical_parameters={"steps": 40, "cfg_scale": 8.5}
        )
        
        # Add to integration
        self.integration.prompt_templates["custom_cyberpunk"] = custom_template
        
        # Test usage
        character = self.integration.create_character_from_dict(self.test_character_data)
        prompt = self.integration.build_structured_prompt("custom_cyberpunk", character)
        
        self.assertIn("cyberpunk", prompt.lower())
        self.assertIn("neon", prompt.lower())


class TestNewBieDataClasses(unittest.TestCase):
    """Test NewBie-related data classes."""
    
    def test_character_definition_creation(self):
        """Test CharacterDefinition creation and validation."""
        character = CharacterDefinition(
            name="TestChar",
            gender=CharacterGender.FEMALE,
            age_range="teenager",
            hair_color="purple",
            hair_style="twin tails",
            eye_color="violet",
            clothing="magical girl outfit",
            personality_traits=["brave", "kind"],
            physical_features=["petite", "energetic"]
        )
        
        self.assertEqual(character.name, "TestChar")
        self.assertEqual(character.gender, CharacterGender.FEMALE)
        self.assertEqual(len(character.personality_traits), 2)
        self.assertEqual(len(character.accessories), 0)  # Default empty list
    
    def test_newbie_config_defaults(self):
        """Test NewBieConfig default values."""
        config = NewBieConfig()
        
        self.assertEqual(config.model_path, "newbie_anime_model")
        self.assertEqual(config.default_resolution, (1024, 1536))
        self.assertEqual(config.default_steps, 30)
        self.assertEqual(config.default_cfg_scale, 7.5)
        self.assertTrue(config.enable_character_consistency)
        self.assertTrue(config.use_dual_clip)
    
    def test_generation_result_structure(self):
        """Test GenerationResult structure and validation."""
        result = GenerationResult(
            image_path="test.png",
            prompt_used="test prompt",
            character_definition=None,
            generation_time=2.5,
            quality_score=0.85,
            consistency_score=0.80,
            resolution=(1024, 1536),
            seed_used=12345,
            parameters={"steps": 30}
        )
        
        self.assertEqual(result.image_path, "test.png")
        self.assertEqual(result.generation_time, 2.5)
        self.assertEqual(result.quality_score, 0.85)
        self.assertEqual(result.resolution, (1024, 1536))
        self.assertEqual(len(result.metadata), 0)  # Default empty dict


if __name__ == "__main__":
    unittest.main(verbosity=2)