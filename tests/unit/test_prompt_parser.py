"""
Unit tests for PromptParser class.

Tests specific examples and edge cases for prompt parsing functionality.
"""

import pytest
from src.end_to_end.prompt_parser import PromptParser
from src.end_to_end.data_models import ParsedPrompt, CharacterInfo


class TestPromptParserBasicExtraction:
    """Test basic field extraction from prompts"""
    
    def test_extract_cyberpunk_genre(self):
        """Test extraction of cyberpunk genre"""
        parser = PromptParser()
        prompt = "Blanche-Neige Cyberpunk 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
    
    def test_extract_western_genre(self):
        """Test extraction of western genre"""
        parser = PromptParser()
        prompt = "Le Petit Chaperon Rouge × Western post-apo"
        result = parser.parse(prompt)
        
        assert result.genre == "western"
    
    def test_extract_thriller_genre(self):
        """Test extraction of thriller genre"""
        parser = PromptParser()
        prompt = "Cendrillon × Thriller techno-paranoïaque"
        result = parser.parse(prompt)
        
        assert result.genre == "thriller"
    
    def test_extract_title_from_prompt(self):
        """Test title extraction from prompt"""
        parser = PromptParser()
        prompt = "Blanche-Neige Cyberpunk 2048"
        result = parser.parse(prompt)
        
        assert "Blanche-Neige" in result.project_title or "Cyberpunk" in result.project_title
    
    def test_extract_quoted_title(self):
        """Test extraction of quoted title"""
        parser = PromptParser()
        prompt = '"My Amazing Story" is a cyberpunk thriller'
        result = parser.parse(prompt)
        
        assert result.project_title == "My Amazing Story"
    
    def test_extract_trailer_video_type(self):
        """Test extraction of trailer video type"""
        parser = PromptParser()
        prompt = "Create a trailer for a cyberpunk story"
        result = parser.parse(prompt)
        
        assert result.video_type == "trailer"
    
    def test_extract_teaser_video_type(self):
        """Test extraction of teaser video type"""
        parser = PromptParser()
        prompt = "Make a teaser for my horror film"
        result = parser.parse(prompt)
        
        assert result.video_type == "teaser"
    
    def test_extract_dark_mood(self):
        """Test extraction of dark mood"""
        parser = PromptParser()
        prompt = "A dark and mysterious cyberpunk story"
        result = parser.parse(prompt)
        
        assert "dark" in result.mood
        assert "mysterious" in result.mood
    
    def test_extract_city_setting(self):
        """Test extraction of city setting"""
        parser = PromptParser()
        prompt = "A story set in a futuristic city"
        result = parser.parse(prompt)
        
        assert result.setting == "city"
    
    def test_extract_forest_setting(self):
        """Test extraction of forest setting"""
        parser = PromptParser()
        prompt = "Little Red Riding Hood in the dark forest"
        result = parser.parse(prompt)
        
        assert result.setting == "forest"
    
    def test_extract_future_time_period(self):
        """Test extraction of future time period with year"""
        parser = PromptParser()
        prompt = "Cyberpunk story in 2048"
        result = parser.parse(prompt)
        
        assert result.time_period == "2048"
    
    def test_extract_16_9_aspect_ratio(self):
        """Test extraction of 16:9 aspect ratio"""
        parser = PromptParser()
        prompt = "Create a cinematic 16:9 trailer"
        result = parser.parse(prompt)
        
        assert result.aspect_ratio == "16:9"
    
    def test_extract_9_16_aspect_ratio(self):
        """Test extraction of 9:16 aspect ratio"""
        parser = PromptParser()
        prompt = "Make a vertical TikTok video"
        result = parser.parse(prompt)
        
        assert result.aspect_ratio == "9:16"
    
    def test_extract_duration_seconds(self):
        """Test extraction of duration in seconds"""
        parser = PromptParser()
        prompt = "Create a 45 second trailer"
        result = parser.parse(prompt)
        
        assert result.duration_seconds == 45
    
    def test_extract_duration_minutes(self):
        """Test extraction of duration in minutes"""
        parser = PromptParser()
        prompt = "Make a 2 minute short film"
        result = parser.parse(prompt)
        
        assert result.duration_seconds == 120


class TestPromptParserCharacterExtraction:
    """Test character extraction from prompts"""
    
    def test_extract_snow_white_character(self):
        """Test extraction of Snow White character"""
        parser = PromptParser()
        prompt = "Blanche-Neige in a cyberpunk world"
        result = parser.parse(prompt)
        
        assert len(result.characters) > 0
        assert any(char.name == "Snow White" for char in result.characters)
    
    def test_extract_little_red_riding_hood(self):
        """Test extraction of Little Red Riding Hood"""
        parser = PromptParser()
        prompt = "Le Petit Chaperon Rouge in the western"
        result = parser.parse(prompt)
        
        assert len(result.characters) > 0
        assert any(char.name == "Little Red Riding Hood" for char in result.characters)
    
    def test_extract_cinderella_character(self):
        """Test extraction of Cinderella character"""
        parser = PromptParser()
        prompt = "Cendrillon in a thriller"
        result = parser.parse(prompt)
        
        assert len(result.characters) > 0
        assert any(char.name == "Cinderella" for char in result.characters)
    
    def test_extract_multiple_characters(self):
        """Test extraction of multiple characters"""
        parser = PromptParser()
        prompt = "Snow White and the Wolf in a dark forest"
        result = parser.parse(prompt)
        
        assert len(result.characters) >= 2
        char_names = [char.name for char in result.characters]
        assert "Snow White" in char_names
        assert "Wolf" in char_names
    
    def test_character_roles_assigned(self):
        """Test that character roles are properly assigned"""
        parser = PromptParser()
        prompt = "Snow White fights the evil Queen"
        result = parser.parse(prompt)
        
        snow_white = next((c for c in result.characters if c.name == "Snow White"), None)
        queen = next((c for c in result.characters if c.name == "Queen"), None)
        
        if snow_white:
            assert snow_white.role == "main"
        if queen:
            assert queen.role == "antagonist"


class TestPromptParserDefaults:
    """Test intelligent defaults for missing fields"""
    
    def test_default_genre_when_missing(self):
        """Test default genre is applied when not found"""
        parser = PromptParser()
        prompt = "A story about a person"
        result = parser.parse(prompt)
        
        assert result.genre == "drama"
    
    def test_default_video_type_when_missing(self):
        """Test default video type is applied"""
        parser = PromptParser()
        prompt = "A story"
        result = parser.parse(prompt)
        
        assert result.video_type == "trailer"
    
    def test_default_mood_when_missing(self):
        """Test default moods are applied"""
        parser = PromptParser()
        prompt = "A simple story"
        result = parser.parse(prompt)
        
        assert len(result.mood) > 0
        assert "mysterious" in result.mood or "dramatic" in result.mood
    
    def test_default_setting_when_missing(self):
        """Test default setting is applied"""
        parser = PromptParser()
        prompt = "A story about people"
        result = parser.parse(prompt)
        
        assert result.setting == "city"
    
    def test_default_time_period_when_missing(self):
        """Test default time period is applied"""
        parser = PromptParser()
        prompt = "A story"
        result = parser.parse(prompt)
        
        assert result.time_period == "present"
    
    def test_default_characters_when_missing(self):
        """Test default character is created when none found"""
        parser = PromptParser()
        prompt = "A mysterious story"
        result = parser.parse(prompt)
        
        assert len(result.characters) > 0
        assert result.characters[0].name == "Protagonist"
    
    def test_default_aspect_ratio_when_missing(self):
        """Test default aspect ratio is applied"""
        parser = PromptParser()
        prompt = "A story"
        result = parser.parse(prompt)
        
        assert result.aspect_ratio == "16:9"
    
    def test_default_duration_for_trailer(self):
        """Test default duration for trailer"""
        parser = PromptParser()
        prompt = "Create a trailer"
        result = parser.parse(prompt)
        
        assert result.duration_seconds == 60
    
    def test_default_duration_for_teaser(self):
        """Test default duration for teaser"""
        parser = PromptParser()
        prompt = "Create a teaser"
        result = parser.parse(prompt)
        
        assert result.duration_seconds == 30


class TestPromptParserEdgeCases:
    """Test edge cases and unusual inputs"""
    
    def test_empty_prompt(self):
        """Test parsing of empty prompt"""
        parser = PromptParser()
        prompt = ""
        result = parser.parse(prompt)
        
        # Should return valid ParsedPrompt with defaults
        assert result.project_title == "Untitled Project"
        assert result.genre == "drama"
        assert result.video_type == "trailer"
        assert len(result.characters) > 0
    
    def test_whitespace_only_prompt(self):
        """Test parsing of prompt with only whitespace"""
        parser = PromptParser()
        prompt = "   \n\t  \r\n  "
        result = parser.parse(prompt)
        
        # Should return valid ParsedPrompt with defaults
        assert result.project_title == "Untitled Project"
        assert result.genre == "drama"
        assert result.video_type == "trailer"
        assert len(result.characters) > 0
    
    def test_very_short_prompt(self):
        """Test parsing of very short prompt"""
        parser = PromptParser()
        prompt = "Cyberpunk"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.project_title == "Cyberpunk"
    
    def test_single_character_prompt(self):
        """Test parsing of single character prompt"""
        parser = PromptParser()
        prompt = "A"
        result = parser.parse(prompt)
        
        # Should return valid ParsedPrompt with defaults
        assert result.project_title == "A"
        assert result.genre == "drama"
        assert len(result.characters) > 0
    
    def test_very_long_prompt(self):
        """Test parsing of very long prompt"""
        parser = PromptParser()
        prompt = "A " + "very " * 100 + "long cyberpunk story in 2048 with Snow White"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
        assert any(char.name == "Snow White" for char in result.characters)
    
    def test_extremely_long_prompt(self):
        """Test parsing of extremely long prompt (10000+ characters)"""
        parser = PromptParser()
        # Create a very long prompt with repeated content
        base_prompt = "Create a cyberpunk trailer in 2048 with Snow White. "
        prompt = base_prompt * 200  # ~10000 characters
        result = parser.parse(prompt)
        
        # Should still extract key information
        assert result.genre == "cyberpunk"
        assert result.video_type == "trailer"
        assert result.time_period == "2048"
        assert any(char.name == "Snow White" for char in result.characters)
    
    def test_prompt_with_special_characters(self):
        """Test parsing of prompt with special characters"""
        parser = PromptParser()
        prompt = "Blanche-Neige × Cyberpunk 2048 !!! @#$%"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_html_tags(self):
        """Test parsing of prompt with HTML-like tags"""
        parser = PromptParser()
        prompt = "<b>Cyberpunk</b> story in <i>2048</i> with <strong>Snow White</strong>"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
        assert any(char.name == "Snow White" for char in result.characters)
    
    def test_prompt_with_code_injection_attempt(self):
        """Test parsing of prompt with code-like content"""
        parser = PromptParser()
        prompt = "Cyberpunk story; DROP TABLE projects; -- in 2048"
        result = parser.parse(prompt)
        
        # Should parse safely without executing anything
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_path_traversal_attempt(self):
        """Test parsing of prompt with path traversal characters"""
        parser = PromptParser()
        prompt = "../../etc/passwd cyberpunk story in 2048"
        result = parser.parse(prompt)
        
        # Should parse safely
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_mixed_case(self):
        """Test parsing with mixed case"""
        parser = PromptParser()
        prompt = "CYBERPUNK Story in 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_unicode_characters(self):
        """Test parsing with unicode characters"""
        parser = PromptParser()
        prompt = "Blanche-Neige Cyberpunk 2048 avec des éléments français"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert "Blanche-Neige" in result.project_title or "Cyberpunk" in result.project_title
    
    def test_prompt_with_emoji(self):
        """Test parsing with emoji characters"""
        parser = PromptParser()
        prompt = "🎬 Cyberpunk story 🤖 in 2048 with Snow White 👸"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
        assert any(char.name == "Snow White" for char in result.characters)
    
    def test_prompt_with_chinese_characters(self):
        """Test parsing with Chinese characters"""
        parser = PromptParser()
        prompt = "赛博朋克 cyberpunk story in 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_arabic_characters(self):
        """Test parsing with Arabic characters"""
        parser = PromptParser()
        prompt = "قصة cyberpunk في 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_japanese_characters(self):
        """Test parsing with Japanese characters"""
        parser = PromptParser()
        prompt = "サイバーパンク cyberpunk story in 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_russian_characters(self):
        """Test parsing with Russian characters"""
        parser = PromptParser()
        prompt = "Киберпанк cyberpunk история в 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_multiple_genres(self):
        """Test parsing with multiple genres (should pick first match)"""
        parser = PromptParser()
        prompt = "A cyberpunk horror thriller"
        result = parser.parse(prompt)
        
        # Should extract at least one genre
        assert result.genre in ["cyberpunk", "horror", "thriller"]
    
    def test_prompt_with_conflicting_aspect_ratios(self):
        """Test parsing with conflicting aspect ratios (should pick first match)"""
        parser = PromptParser()
        prompt = "Create a 16:9 widescreen or 9:16 vertical video"
        result = parser.parse(prompt)
        
        # Should extract one valid aspect ratio
        assert result.aspect_ratio in ["16:9", "9:16"]
    
    def test_prompt_with_invalid_duration(self):
        """Test parsing with unrealistic duration"""
        parser = PromptParser()
        prompt = "Create a 0 second video"
        result = parser.parse(prompt)
        
        # Should use default duration instead
        assert result.duration_seconds > 0
    
    def test_prompt_with_negative_duration(self):
        """Test parsing with negative duration"""
        parser = PromptParser()
        prompt = "Create a -10 second video"
        result = parser.parse(prompt)
        
        # Should use default duration instead
        assert result.duration_seconds > 0
    
    def test_prompt_with_extremely_large_duration(self):
        """Test parsing with unrealistically large duration"""
        parser = PromptParser()
        prompt = "Create a 999999 hour video"
        result = parser.parse(prompt)
        
        # Should extract the duration (even if large)
        # Validation will catch this later
        assert result.duration_seconds > 0
    
    def test_prompt_with_multiple_newlines(self):
        """Test parsing with multiple newlines"""
        parser = PromptParser()
        prompt = """
        
        Cyberpunk
        
        
        story
        
        in
        
        2048
        
        """
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_tabs_and_spaces(self):
        """Test parsing with mixed tabs and spaces"""
        parser = PromptParser()
        prompt = "Cyberpunk\t\tstory\t\tin\t\t2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_repeated_words(self):
        """Test parsing with repeated words"""
        parser = PromptParser()
        prompt = "Cyberpunk cyberpunk CYBERPUNK story story story in 2048 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_only_numbers(self):
        """Test parsing with only numbers"""
        parser = PromptParser()
        prompt = "2048"
        result = parser.parse(prompt)
        
        # Should extract time period
        assert result.time_period == "2048"
        # Should have defaults for other fields
        assert result.genre == "drama"
        assert result.project_title == "2048"
    
    def test_prompt_with_only_special_characters(self):
        """Test parsing with only special characters"""
        parser = PromptParser()
        prompt = "!@#$%^&*()_+-=[]{}|;:',.<>?/"
        result = parser.parse(prompt)
        
        # After cleaning, some characters like _, -, ' may remain
        # If nothing remains after cleaning, should use default
        # The actual behavior is that _, -, ' are preserved
        assert result.project_title  # Should have some title (may be cleaned special chars or default)
        assert result.genre == "drama"
        assert len(result.characters) > 0
    
    def test_prompt_with_url(self):
        """Test parsing with URL in prompt"""
        parser = PromptParser()
        prompt = "Cyberpunk story inspired by https://example.com/story in 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_email(self):
        """Test parsing with email in prompt"""
        parser = PromptParser()
        prompt = "Cyberpunk story by user@example.com in 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_malformed_quotes(self):
        """Test parsing with malformed quotes"""
        parser = PromptParser()
        prompt = '"Cyberpunk story in 2048'
        result = parser.parse(prompt)
        
        # Should handle gracefully
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
    
    def test_prompt_with_nested_quotes(self):
        """Test parsing with nested quotes"""
        parser = PromptParser()
        prompt = '"A story called "Cyberpunk 2048" with Snow White"'
        result = parser.parse(prompt)
        
        # Should extract information
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"


class TestPromptParserValidation:
    """Test validation functionality"""
    
    def test_validate_complete_parsed_data(self):
        """Test validation of complete parsed data"""
        parser = PromptParser()
        prompt = "Blanche-Neige Cyberpunk 2048 trailer 60 seconds"
        result = parser.parse(prompt)
        
        is_valid, errors = parser.validate_parsed_data(result)
        assert is_valid
        assert len(errors) == 0
    
    def test_validate_detects_missing_title(self):
        """Test validation detects missing title"""
        parser = PromptParser()
        parsed = ParsedPrompt(
            project_title="",
            genre="cyberpunk",
            video_type="trailer",
            mood=["dark"],
            setting="city",
            time_period="2048",
            characters=[CharacterInfo("Test", "main", "desc")],
            key_elements=["tech"],
            visual_style=["neon"],
            aspect_ratio="16:9",
            duration_seconds=60,
            raw_prompt="test"
        )
        
        is_valid, errors = parser.validate_parsed_data(parsed)
        assert not is_valid
        assert any("title" in err.lower() for err in errors)
    
    def test_validate_detects_invalid_duration(self):
        """Test validation detects invalid duration"""
        parser = PromptParser()
        parsed = ParsedPrompt(
            project_title="Test",
            genre="cyberpunk",
            video_type="trailer",
            mood=["dark"],
            setting="city",
            time_period="2048",
            characters=[CharacterInfo("Test", "main", "desc")],
            key_elements=["tech"],
            visual_style=["neon"],
            aspect_ratio="16:9",
            duration_seconds=0,
            raw_prompt="test"
        )
        
        is_valid, errors = parser.validate_parsed_data(parsed)
        assert not is_valid
        assert any("duration" in err.lower() for err in errors)
    
    def test_validate_detects_invalid_aspect_ratio(self):
        """Test validation detects invalid aspect ratio"""
        parser = PromptParser()
        parsed = ParsedPrompt(
            project_title="Test",
            genre="cyberpunk",
            video_type="trailer",
            mood=["dark"],
            setting="city",
            time_period="2048",
            characters=[CharacterInfo("Test", "main", "desc")],
            key_elements=["tech"],
            visual_style=["neon"],
            aspect_ratio="99:99",
            duration_seconds=60,
            raw_prompt="test"
        )
        
        is_valid, errors = parser.validate_parsed_data(parsed)
        assert not is_valid
        assert any("aspect ratio" in err.lower() for err in errors)


class TestPromptParserFillDefaults:
    """Test fill_defaults functionality"""
    
    def test_fill_defaults_for_empty_fields(self):
        """Test filling defaults for empty fields"""
        parser = PromptParser()
        parsed = ParsedPrompt(
            project_title="",
            genre="",
            video_type="",
            mood=[],
            setting="",
            time_period="",
            characters=[],
            key_elements=[],
            visual_style=[],
            aspect_ratio="",
            duration_seconds=0,
            raw_prompt="test"
        )
        
        filled = parser.fill_defaults(parsed)
        
        assert filled.project_title == "Untitled Project"
        assert filled.genre == "drama"
        assert filled.video_type == "trailer"
        assert len(filled.mood) > 0
        assert filled.setting == "city"
        assert filled.time_period == "present"
        assert len(filled.characters) > 0
        assert len(filled.key_elements) > 0
        assert len(filled.visual_style) > 0
        assert filled.aspect_ratio == "16:9"
        assert filled.duration_seconds == 60


class TestPromptParserConfidenceScores:
    """Test confidence score calculation"""
    
    def test_confidence_scores_present(self):
        """Test that confidence scores are calculated"""
        parser = PromptParser()
        prompt = "Blanche-Neige Cyberpunk 2048"
        result = parser.parse(prompt)
        
        assert len(result.confidence_scores) > 0
        assert 'title' in result.confidence_scores
        assert 'genre' in result.confidence_scores
    
    def test_high_confidence_for_explicit_fields(self):
        """Test high confidence for explicitly stated fields"""
        parser = PromptParser()
        prompt = "Cyberpunk story in 2048"
        result = parser.parse(prompt)
        
        # Time period should have high confidence (specific year)
        assert result.confidence_scores.get('time_period', 0) > 0.8
    
    def test_lower_confidence_for_defaults(self):
        """Test lower confidence for default values"""
        parser = PromptParser()
        prompt = "A simple story"
        result = parser.parse(prompt)
        
        # Characters should have lower confidence (using defaults)
        assert result.confidence_scores.get('characters', 1.0) < 0.6


class TestPromptParserRealWorldExamples:
    """Test with real-world example prompts"""
    
    def test_blanche_neige_cyberpunk_2048(self):
        """Test: Blanche-Neige Cyberpunk 2048"""
        parser = PromptParser()
        prompt = "Blanche-Neige Cyberpunk 2048"
        result = parser.parse(prompt)
        
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
        assert any(char.name == "Snow White" for char in result.characters)
        assert result.duration_seconds > 0
        assert result.aspect_ratio in ["16:9", "9:16", "1:1", "4:3", "21:9"]
    
    def test_petit_chaperon_rouge_western(self):
        """Test: Le Petit Chaperon Rouge × Western post-apo"""
        parser = PromptParser()
        prompt = "Le Petit Chaperon Rouge × Western post-apo"
        result = parser.parse(prompt)
        
        assert result.genre in ["western", "post-apocalyptic"]
        assert any(char.name == "Little Red Riding Hood" for char in result.characters)
    
    def test_cendrillon_thriller(self):
        """Test: Cendrillon × Thriller techno-paranoïaque"""
        parser = PromptParser()
        prompt = "Cendrillon × Thriller techno-paranoïaque"
        result = parser.parse(prompt)
        
        assert result.genre == "thriller"
        assert any(char.name == "Cinderella" for char in result.characters)
    
    def test_complex_prompt_with_all_details(self):
        """Test complex prompt with many details"""
        parser = PromptParser()
        prompt = """
        Create a 90 second cinematic 16:9 trailer for a dark cyberpunk thriller
        set in 2077 in a neon-lit city. Features Snow White as a hacker fighting
        against an evil corporation. Mysterious and tense atmosphere.
        """
        result = parser.parse(prompt)
        
        assert result.genre in ["cyberpunk", "thriller"]
        assert result.video_type == "trailer"
        assert result.duration_seconds == 90
        assert result.aspect_ratio == "16:9"
        assert result.time_period == "2077"
        assert "dark" in result.mood or "mysterious" in result.mood or "tense" in result.mood
        assert result.setting == "city"
        assert any(char.name == "Snow White" for char in result.characters)
