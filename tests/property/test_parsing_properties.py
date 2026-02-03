"""
Property-based tests for prompt parsing.

Tests universal properties that should hold across all inputs.
Uses hypothesis library with minimum 100 iterations per property.
"""

import pytest
from hypothesis import given, strategies as st, settings
from src.end_to_end.prompt_parser import PromptParser
from src.end_to_end.data_models import ParsedPrompt


# Custom strategies for generating test data
@st.composite
def prompt_text(draw):
    """
    Generate random prompt text with various characteristics.
    
    Generates prompts that may include:
    - Genre keywords
    - Character names
    - Time periods
    - Settings
    - Durations
    - Aspect ratios
    - Moods
    - Or completely random text
    """
    # Choose prompt type
    prompt_type = draw(st.sampled_from([
        'minimal',
        'genre_focused',
        'character_focused',
        'technical_focused',
        'complex',
        'random'
    ]))
    
    if prompt_type == 'minimal':
        # Very short prompts
        return draw(st.text(min_size=1, max_size=20, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
            blacklist_characters='\n\r\t'
        )))
    
    elif prompt_type == 'genre_focused':
        # Prompts with genre keywords
        genre = draw(st.sampled_from([
            'cyberpunk', 'fantasy', 'horror', 'sci-fi', 'western',
            'thriller', 'romance', 'action', 'comedy', 'drama'
        ]))
        context = draw(st.text(min_size=0, max_size=100, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
            blacklist_characters='\n\r\t'
        )))
        return f"{genre} {context}"
    
    elif prompt_type == 'character_focused':
        # Prompts with character names
        character = draw(st.sampled_from([
            'Snow White', 'Little Red Riding Hood', 'Cinderella',
            'Prince', 'Princess', 'Queen', 'King', 'Wolf', 'Hunter'
        ]))
        context = draw(st.text(min_size=0, max_size=100, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
            blacklist_characters='\n\r\t'
        )))
        return f"{character} {context}"
    
    elif prompt_type == 'technical_focused':
        # Prompts with technical specifications
        aspect_ratio = draw(st.sampled_from(['16:9', '9:16', '1:1', '4:3', '21:9']))
        duration = draw(st.integers(min_value=10, max_value=300))
        video_type = draw(st.sampled_from(['trailer', 'teaser', 'short film', 'scene']))
        context = draw(st.text(min_size=0, max_size=50, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
            blacklist_characters='\n\r\t'
        )))
        return f"{video_type} {duration} seconds {aspect_ratio} {context}"
    
    elif prompt_type == 'complex':
        # Complex prompts with multiple elements
        genre = draw(st.sampled_from(['cyberpunk', 'fantasy', 'horror', 'sci-fi']))
        character = draw(st.sampled_from(['Snow White', 'Cinderella', 'Prince']))
        year = draw(st.integers(min_value=2000, max_value=3000))
        mood = draw(st.sampled_from(['dark', 'mysterious', 'epic', 'tense']))
        setting = draw(st.sampled_from(['city', 'forest', 'castle', 'space']))
        return f"{character} {genre} {year} {mood} {setting}"
    
    else:  # random
        # Completely random text
        return draw(st.text(min_size=1, max_size=500, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs', 'Po'),
            blacklist_characters='\n\r\t'
        )))


class TestCompletePromptParsing:
    """
    Property 1: Complete Prompt Parsing
    
    **Validates: Requirements 1.1-1.12**
    
    For any user prompt, the parser should extract all required fields
    (title, genre, video_type, mood, setting, time_period, characters,
    key_elements, aspect_ratio, duration) and fill missing fields with
    intelligent defaults, ensuring a complete ParsedPrompt is always produced.
    """
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_all_fields_present(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that all required fields are present in the parsed result,
        regardless of input prompt content.
        
        **Validates: Requirements 1.1-1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Verify result is a ParsedPrompt instance
        assert isinstance(result, ParsedPrompt), \
            f"Parser must return ParsedPrompt instance, got {type(result)}"
        
        # Verify all required fields are present and not None
        assert result.project_title is not None, \
            "project_title must not be None"
        assert result.genre is not None, \
            "genre must not be None"
        assert result.video_type is not None, \
            "video_type must not be None"
        assert result.mood is not None, \
            "mood must not be None"
        assert result.setting is not None, \
            "setting must not be None"
        assert result.time_period is not None, \
            "time_period must not be None"
        assert result.characters is not None, \
            "characters must not be None"
        assert result.key_elements is not None, \
            "key_elements must not be None"
        assert result.visual_style is not None, \
            "visual_style must not be None"
        assert result.aspect_ratio is not None, \
            "aspect_ratio must not be None"
        assert result.duration_seconds is not None, \
            "duration_seconds must not be None"
        assert result.raw_prompt is not None, \
            "raw_prompt must not be None"
        assert result.confidence_scores is not None, \
            "confidence_scores must not be None"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_valid_field_types(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that all fields have the correct types.
        
        **Validates: Requirements 1.1-1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Verify field types
        assert isinstance(result.project_title, str), \
            f"project_title must be str, got {type(result.project_title)}"
        assert isinstance(result.genre, str), \
            f"genre must be str, got {type(result.genre)}"
        assert isinstance(result.video_type, str), \
            f"video_type must be str, got {type(result.video_type)}"
        assert isinstance(result.mood, list), \
            f"mood must be list, got {type(result.mood)}"
        assert isinstance(result.setting, str), \
            f"setting must be str, got {type(result.setting)}"
        assert isinstance(result.time_period, str), \
            f"time_period must be str, got {type(result.time_period)}"
        assert isinstance(result.characters, list), \
            f"characters must be list, got {type(result.characters)}"
        assert isinstance(result.key_elements, list), \
            f"key_elements must be list, got {type(result.key_elements)}"
        assert isinstance(result.visual_style, list), \
            f"visual_style must be list, got {type(result.visual_style)}"
        assert isinstance(result.aspect_ratio, str), \
            f"aspect_ratio must be str, got {type(result.aspect_ratio)}"
        assert isinstance(result.duration_seconds, int), \
            f"duration_seconds must be int, got {type(result.duration_seconds)}"
        assert isinstance(result.raw_prompt, str), \
            f"raw_prompt must be str, got {type(result.raw_prompt)}"
        assert isinstance(result.confidence_scores, dict), \
            f"confidence_scores must be dict, got {type(result.confidence_scores)}"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_non_empty_strings(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that string fields are not empty.
        
        **Validates: Requirements 1.1-1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Verify string fields are not empty
        assert len(result.project_title) > 0, \
            "project_title must not be empty"
        assert len(result.genre) > 0, \
            "genre must not be empty"
        assert len(result.video_type) > 0, \
            "video_type must not be empty"
        assert len(result.setting) > 0, \
            "setting must not be empty"
        assert len(result.time_period) > 0, \
            "time_period must not be empty"
        assert len(result.aspect_ratio) > 0, \
            "aspect_ratio must not be empty"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_non_empty_lists(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that list fields are not empty.
        
        **Validates: Requirements 1.1-1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Verify list fields are not empty
        assert len(result.mood) > 0, \
            "mood list must not be empty"
        assert len(result.characters) > 0, \
            "characters list must not be empty"
        assert len(result.key_elements) > 0, \
            "key_elements list must not be empty"
        assert len(result.visual_style) > 0, \
            "visual_style list must not be empty"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_valid_aspect_ratio(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that aspect_ratio is always a valid value.
        
        **Validates: Requirements 1.9**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        valid_ratios = ["16:9", "9:16", "1:1", "4:3", "21:9"]
        assert result.aspect_ratio in valid_ratios, \
            f"aspect_ratio must be one of {valid_ratios}, got {result.aspect_ratio}"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_positive_duration(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that duration_seconds is always positive.
        
        **Validates: Requirements 1.10**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        assert result.duration_seconds > 0, \
            f"duration_seconds must be positive, got {result.duration_seconds}"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_reasonable_duration(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that duration_seconds is within reasonable bounds.
        
        **Validates: Requirements 1.10**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Duration should be between 10 seconds and 1 hour
        assert 10 <= result.duration_seconds <= 3600, \
            f"duration_seconds must be between 10 and 3600, got {result.duration_seconds}"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_raw_prompt_preserved(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that the raw prompt is preserved in the result.
        
        **Validates: Requirements 1.1-1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        assert result.raw_prompt == prompt, \
            "raw_prompt must match the input prompt"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_confidence_scores_present(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that confidence scores are calculated for all fields.
        
        **Validates: Requirements 1.1-1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Verify confidence scores exist
        assert len(result.confidence_scores) > 0, \
            "confidence_scores must not be empty"
        
        # Verify confidence scores are between 0 and 1
        for field, score in result.confidence_scores.items():
            assert 0.0 <= score <= 1.0, \
                f"confidence score for {field} must be between 0 and 1, got {score}"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_character_structure(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that characters have proper structure.
        
        **Validates: Requirements 1.7**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Verify each character has required fields
        for char in result.characters:
            assert hasattr(char, 'name'), \
                "Character must have 'name' attribute"
            assert hasattr(char, 'role'), \
                "Character must have 'role' attribute"
            assert hasattr(char, 'description'), \
                "Character must have 'description' attribute"
            
            assert isinstance(char.name, str) and len(char.name) > 0, \
                "Character name must be non-empty string"
            assert isinstance(char.role, str) and len(char.role) > 0, \
                "Character role must be non-empty string"
            assert isinstance(char.description, str) and len(char.description) > 0, \
                "Character description must be non-empty string"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_validation_passes(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that parsed data passes validation.
        
        **Validates: Requirements 1.11, 1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Validate the parsed data
        is_valid, errors = parser.validate_parsed_data(result)
        
        assert is_valid, \
            f"Parsed data must pass validation. Errors: {errors}"
        assert len(errors) == 0, \
            f"Validation must not produce errors. Got: {errors}"
    
    @settings(max_examples=100)
    @given(prompt=prompt_text())
    def test_property_1_complete_parsing_idempotent(self, prompt):
        """
        Property 1: Complete Prompt Parsing
        
        Test that parsing the same prompt twice produces the same result.
        
        **Validates: Requirements 1.1-1.12**
        """
        parser = PromptParser()
        result1 = parser.parse(prompt)
        result2 = parser.parse(prompt)
        
        # Compare all fields
        assert result1.project_title == result2.project_title
        assert result1.genre == result2.genre
        assert result1.video_type == result2.video_type
        assert result1.mood == result2.mood
        assert result1.setting == result2.setting
        assert result1.time_period == result2.time_period
        assert result1.aspect_ratio == result2.aspect_ratio
        assert result1.duration_seconds == result2.duration_seconds
        assert len(result1.characters) == len(result2.characters)
        assert len(result1.key_elements) == len(result2.key_elements)
        assert len(result1.visual_style) == len(result2.visual_style)


class TestPromptParsingEdgeCases:
    """
    Additional property tests for edge cases.
    """
    
    @settings(max_examples=100)
    @given(prompt=st.text(min_size=0, max_size=0))
    def test_empty_prompt_handling(self, prompt):
        """
        Test that empty prompts are handled gracefully.
        
        **Validates: Requirements 1.11, 1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Should still produce valid ParsedPrompt with defaults
        assert result.project_title == "Untitled Project"
        assert result.genre == "drama"
        assert result.video_type == "trailer"
        assert len(result.characters) > 0
        assert result.duration_seconds > 0
    
    @settings(max_examples=100)
    @given(prompt=st.text(min_size=1, max_size=10, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll'),
        blacklist_characters='\n\r\t'
    )))
    def test_very_short_prompt_handling(self, prompt):
        """
        Test that very short prompts are handled gracefully.
        
        **Validates: Requirements 1.11, 1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Should produce valid ParsedPrompt
        assert isinstance(result, ParsedPrompt)
        assert len(result.project_title) > 0
        assert len(result.genre) > 0
        assert result.duration_seconds > 0
    
    @settings(max_examples=100)
    @given(prompt=st.text(min_size=1000, max_size=2000, alphabet=st.characters(
        whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
        blacklist_characters='\n\r\t'
    )))
    def test_very_long_prompt_handling(self, prompt):
        """
        Test that very long prompts are handled gracefully.
        
        **Validates: Requirements 1.11, 1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Should produce valid ParsedPrompt
        assert isinstance(result, ParsedPrompt)
        assert len(result.project_title) > 0
        # Title should be truncated to reasonable length
        assert len(result.project_title) <= 100
    
    @settings(max_examples=100)
    @given(prompt=st.text(min_size=10, max_size=100, alphabet=st.characters(
        whitelist_categories=('Po', 'Zs'),
    )))
    def test_special_characters_only_prompt(self, prompt):
        """
        Test that prompts with only special characters are handled.
        
        **Validates: Requirements 1.11, 1.12**
        """
        parser = PromptParser()
        result = parser.parse(prompt)
        
        # Should produce valid ParsedPrompt with defaults
        assert isinstance(result, ParsedPrompt)
        assert len(result.project_title) > 0
        assert result.duration_seconds > 0
    
    @settings(max_examples=100)
    @given(
        prompt=st.text(min_size=10, max_size=200, alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs'),
            blacklist_characters='\n\r\t'
        )),
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    def test_parsing_determinism_with_seed(self, prompt, seed):
        """
        Test that parsing is deterministic (same input produces same output).
        
        **Validates: Requirements 1.1-1.12**
        """
        parser1 = PromptParser()
        parser2 = PromptParser()
        
        result1 = parser1.parse(prompt)
        result2 = parser2.parse(prompt)
        
        # Results should be identical
        assert result1.project_title == result2.project_title
        assert result1.genre == result2.genre
        assert result1.video_type == result2.video_type
        assert result1.aspect_ratio == result2.aspect_ratio
        assert result1.duration_seconds == result2.duration_seconds
