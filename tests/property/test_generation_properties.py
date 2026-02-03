"""
Property-based tests for project generation.

Tests universal properties that should hold across all inputs.
Uses hypothesis library with minimum 100 iterations per property.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from hypothesis import given, strategies as st, settings, assume
from src.end_to_end.project_name_generator import ProjectNameGenerator
from src.end_to_end.data_models import ParsedPrompt, CharacterInfo


# Custom strategies for generating test data
@st.composite
def parsed_prompt_data(draw):
    """
    Generate random ParsedPrompt instances with various characteristics.
    
    Generates prompts with different:
    - Titles (short, long, with special characters)
    - Genres
    - Video types
    - Character counts
    """
    # Generate project title with various characteristics
    title_type = draw(st.sampled_from([
        'simple',
        'with_spaces',
        'with_special_chars',
        'very_long',
        'with_numbers',
        'mixed_case'
    ]))
    
    if title_type == 'simple':
        title = draw(st.text(
            min_size=1,
            max_size=20,
            alphabet=st.characters(whitelist_categories=('Ll',))
        ))
    elif title_type == 'with_spaces':
        words = draw(st.lists(
            st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=('Ll',))),
            min_size=2,
            max_size=5
        ))
        title = ' '.join(words)
    elif title_type == 'with_special_chars':
        title = draw(st.text(
            min_size=1,
            max_size=30,
            alphabet=st.characters(whitelist_categories=('Ll', 'Po', 'Zs'))
        ))
    elif title_type == 'very_long':
        title = draw(st.text(
            min_size=100,
            max_size=200,
            alphabet=st.characters(whitelist_categories=('Ll', 'Zs'))
        ))
    elif title_type == 'with_numbers':
        title = draw(st.text(
            min_size=1,
            max_size=30,
            alphabet=st.characters(whitelist_categories=('Ll', 'Nd', 'Zs'))
        ))
    else:  # mixed_case
        title = draw(st.text(
            min_size=1,
            max_size=30,
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs'))
        ))
    
    # Ensure title is not empty after generation
    assume(len(title.strip()) > 0)
    
    # Generate genre
    genre = draw(st.sampled_from([
        'cyberpunk', 'fantasy', 'horror', 'sci-fi', 'western',
        'thriller', 'romance', 'action', 'comedy', 'drama',
        'mystery', 'adventure', 'documentary'
    ]))
    
    # Generate video type
    video_type = draw(st.sampled_from([
        'trailer', 'teaser', 'short film', 'scene', 'music video',
        'commercial', 'promo', 'intro', 'outro'
    ]))
    
    # Generate mood
    mood = draw(st.lists(
        st.sampled_from(['dark', 'mysterious', 'epic', 'tense', 'joyful', 'melancholic']),
        min_size=1,
        max_size=3
    ))
    
    # Generate setting
    setting = draw(st.sampled_from([
        'city', 'forest', 'castle', 'space', 'desert', 'ocean',
        'mountains', 'underground', 'virtual reality'
    ]))
    
    # Generate time period
    time_period = draw(st.sampled_from([
        'present', 'future', 'past', 'medieval', 'victorian',
        '2048', '1920s', 'prehistoric', 'post-apocalyptic'
    ]))
    
    # Generate characters
    num_characters = draw(st.integers(min_value=1, max_value=5))
    characters = []
    for i in range(num_characters):
        char = CharacterInfo(
            name=f"Character{i}",
            role=draw(st.sampled_from(['protagonist', 'antagonist', 'supporting'])),
            description=f"Description for character {i}"
        )
        characters.append(char)
    
    # Generate key elements
    key_elements = draw(st.lists(
        st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Ll',))),
        min_size=1,
        max_size=5
    ))
    
    # Generate visual style
    visual_style = draw(st.lists(
        st.sampled_from(['cinematic', 'noir', 'vibrant', 'minimalist', 'surreal']),
        min_size=1,
        max_size=3
    ))
    
    # Generate aspect ratio
    aspect_ratio = draw(st.sampled_from(['16:9', '9:16', '1:1', '4:3', '21:9']))
    
    # Generate duration
    duration_seconds = draw(st.integers(min_value=10, max_value=300))
    
    return ParsedPrompt(
        project_title=title,
        genre=genre,
        video_type=video_type,
        mood=mood,
        setting=setting,
        time_period=time_period,
        characters=characters,
        key_elements=key_elements,
        visual_style=visual_style,
        aspect_ratio=aspect_ratio,
        duration_seconds=duration_seconds,
        raw_prompt=f"{title} {genre} {video_type}",
        confidence_scores={}
    )


class TestUniqueProjectNameGeneration:
    """
    Property 2: Unique Project Name Generation
    
    **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
    
    For any parsed prompt, the system should generate a unique project name
    by checking for duplicates and automatically creating variants (with
    version numbers or suffixes) until a unique name is found.
    """
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_generates_valid_name(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that a valid project name is always generated.
        
        **Validates: Requirements 2.1, 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify name is not empty
            assert name is not None, "Generated name must not be None"
            assert len(name) > 0, "Generated name must not be empty"
            
            # Verify name is a string
            assert isinstance(name, str), f"Generated name must be string, got {type(name)}"
            
            # Verify name is filesystem-safe (no invalid characters)
            invalid_chars = r'<>:"/\\|?*'
            for char in invalid_chars:
                assert char not in name, f"Generated name contains invalid character: {char}"
            
            # Verify name doesn't contain control characters
            for char in name:
                assert ord(char) >= 32, f"Generated name contains control character: {repr(char)}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_name_is_lowercase(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generated names are lowercase for consistency.
        
        **Validates: Requirements 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify name is lowercase
            assert name == name.lower(), \
                f"Generated name must be lowercase, got: {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_name_uses_hyphens(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generated names use hyphens instead of spaces.
        
        **Validates: Requirements 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify no spaces in name
            assert ' ' not in name, \
                f"Generated name must not contain spaces, got: {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_name_length_bounded(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generated names are within reasonable length bounds.
        
        **Validates: Requirements 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify name length is reasonable
            assert len(name) <= 100, \
                f"Generated name too long (max 100 chars), got {len(name)}: {name}"
            assert len(name) >= 1, \
                f"Generated name too short (min 1 char), got {len(name)}: {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_name_uniqueness_check(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that duplicate names are detected and variants are created.
        
        **Validates: Requirements 2.2, 2.3**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            
            # Generate first name
            name1 = generator.generate_name(parsed_prompt)
            
            # Create project directory to simulate existing project
            project_path1 = Path(temp_dir) / name1
            project_path1.mkdir(parents=True, exist_ok=True)
            
            # Generate second name with same prompt
            name2 = generator.generate_name(parsed_prompt)
            
            # Verify names are different
            assert name1 != name2, \
                f"Second generation must create variant, got same name: {name1}"
            
            # Verify second name is a variant (contains version suffix)
            assert '-v' in name2, \
                f"Variant name must contain version suffix, got: {name2}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_multiple_variants_generation(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that multiple variants can be generated.
        
        **Validates: Requirements 2.2, 2.3**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            
            # Generate multiple names and create directories
            names = []
            for i in range(5):
                name = generator.generate_name(parsed_prompt)
                names.append(name)
                
                # Create directory to simulate existing project
                project_path = Path(temp_dir) / name
                project_path.mkdir(parents=True, exist_ok=True)
            
            # Verify all names are unique
            assert len(names) == len(set(names)), \
                f"All generated names must be unique, got duplicates: {names}"
            
            # Verify variants follow pattern
            base_name = names[0]
            for i, name in enumerate(names[1:], start=2):
                assert f"-v{i}" in name, \
                    f"Variant {i} must contain '-v{i}' suffix, got: {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_idempotent_without_conflicts(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generating a name twice without creating the directory
        produces the same result.
        
        **Validates: Requirements 2.1, 2.2**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            
            # Generate name twice without creating directory
            name1 = generator.generate_name(parsed_prompt)
            name2 = generator.generate_name(parsed_prompt)
            
            # Verify names are identical (no conflict exists)
            assert name1 == name2, \
                f"Without conflicts, same prompt should generate same name: {name1} vs {name2}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_name_based_on_prompt_content(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generated name is based on prompt content.
        
        **Validates: Requirements 2.1**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Extract base name (without version suffix)
            base_name = name.split('-v')[0] if '-v' in name else name
            
            # Verify name contains elements from prompt
            # (title, genre, or video_type should be reflected)
            title_normalized = parsed_prompt.project_title.lower().replace(' ', '-')
            genre_normalized = parsed_prompt.genre.lower().replace(' ', '-')
            video_type_normalized = parsed_prompt.video_type.lower().replace(' ', '-')
            
            # At least one element should be present in the base name
            contains_title = any(
                part in base_name 
                for part in title_normalized.split('-') 
                if len(part) > 2
            )
            contains_genre = genre_normalized in base_name
            contains_video_type = video_type_normalized in base_name
            
            assert contains_title or contains_genre or contains_video_type, \
                f"Generated name '{base_name}' should reflect prompt content " \
                f"(title: {title_normalized}, genre: {genre_normalized}, type: {video_type_normalized})"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_project_path_creation(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that project path can be created from generated name.
        
        **Validates: Requirements 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Get project path
            project_path = generator.get_project_path(name)
            
            # Verify path is valid
            assert isinstance(project_path, Path), \
                f"Project path must be Path instance, got {type(project_path)}"
            
            # Verify path is under projects directory
            assert str(project_path).startswith(temp_dir), \
                f"Project path must be under projects directory: {project_path}"
            
            # Verify path ends with project name
            assert project_path.name == name, \
                f"Project path must end with project name: {project_path.name} vs {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_name_validation(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generated names pass validation.
        
        **Validates: Requirements 2.1, 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Validate the generated name
            is_valid, error_message = generator.validate_name(name)
            
            # Generated names should always be valid
            assert is_valid, \
                f"Generated name must be valid, got error: {error_message}"
            assert error_message == "", \
                f"Valid name should have no error message, got: {error_message}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_no_leading_trailing_hyphens(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generated names don't have leading or trailing hyphens.
        
        **Validates: Requirements 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify no leading/trailing hyphens
            assert not name.startswith('-'), \
                f"Generated name must not start with hyphen: {name}"
            assert not name.endswith('-'), \
                f"Generated name must not end with hyphen: {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_no_consecutive_hyphens(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generated names don't have consecutive hyphens.
        
        **Validates: Requirements 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify no consecutive hyphens
            assert '--' not in name, \
                f"Generated name must not contain consecutive hyphens: {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_property_2_alphanumeric_and_hyphens_only(self, parsed_prompt):
        """
        Property 2: Unique Project Name Generation
        
        Test that generated names contain only alphanumeric characters and hyphens.
        
        **Validates: Requirements 2.5**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify only allowed characters
            import re
            assert re.match(r'^[a-z0-9\-]+$', name), \
                f"Generated name must contain only lowercase alphanumeric and hyphens: {name}"
    
    @settings(max_examples=100)
    @given(
        parsed_prompt=parsed_prompt_data(),
        num_existing=st.integers(min_value=0, max_value=10)
    )
    def test_property_2_handles_many_existing_projects(self, parsed_prompt, num_existing):
        """
        Property 2: Unique Project Name Generation
        
        Test that name generation works with many existing projects.
        
        **Validates: Requirements 2.2, 2.3**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            
            # Create multiple existing projects
            existing_names = []
            for i in range(num_existing):
                name = generator.generate_name(parsed_prompt)
                existing_names.append(name)
                
                # Create directory
                project_path = Path(temp_dir) / name
                project_path.mkdir(parents=True, exist_ok=True)
            
            # Generate one more name
            new_name = generator.generate_name(parsed_prompt)
            
            # Verify new name is unique
            assert new_name not in existing_names, \
                f"New name must be unique, got duplicate: {new_name}"
            
            # Verify new name is valid
            is_valid, _ = generator.validate_name(new_name)
            assert is_valid, f"New name must be valid: {new_name}"


class TestProjectNameGenerationEdgeCases:
    """
    Additional property tests for edge cases in name generation.
    """
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_empty_title_handling(self, parsed_prompt):
        """
        Test that empty or whitespace-only titles are handled gracefully.
        
        **Validates: Requirements 2.1, 2.5**
        """
        # Create prompt with empty title
        parsed_prompt.project_title = "   "
        
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Should still generate valid name
            assert len(name) > 0, "Must generate name even with empty title"
            assert name != "---", "Must not generate only hyphens"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_special_characters_sanitization(self, parsed_prompt):
        """
        Test that special characters are properly sanitized.
        
        **Validates: Requirements 2.5**
        """
        # Add special characters to title
        parsed_prompt.project_title = "Test<>:Project/With\\Special|Chars?"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify no special characters remain
            invalid_chars = r'<>:"/\\|?*'
            for char in invalid_chars:
                assert char not in name, \
                    f"Special character {char} not sanitized from: {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_very_long_title_truncation(self, parsed_prompt):
        """
        Test that very long titles are truncated appropriately.
        
        **Validates: Requirements 2.5**
        """
        # Create very long title
        parsed_prompt.project_title = "a" * 500
        
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify name is truncated
            assert len(name) <= 100, \
                f"Long title must be truncated to max 100 chars, got {len(name)}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_unicode_characters_handling(self, parsed_prompt):
        """
        Test that unicode characters are handled properly.
        
        **Validates: Requirements 2.5**
        """
        # Add unicode characters to title
        parsed_prompt.project_title = "Café Français 日本語 Русский"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = ProjectNameGenerator(temp_dir)
            name = generator.generate_name(parsed_prompt)
            
            # Verify name is ASCII-safe
            assert name.isascii(), \
                f"Generated name must be ASCII-safe: {name}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    def test_deterministic_base_name_generation(self, parsed_prompt):
        """
        Test that base name generation is deterministic.
        
        **Validates: Requirements 2.1**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            generator1 = ProjectNameGenerator(temp_dir)
            generator2 = ProjectNameGenerator(temp_dir)
            
            name1 = generator1.generate_name(parsed_prompt)
            name2 = generator2.generate_name(parsed_prompt)
            
            # Without conflicts, should generate same name
            assert name1 == name2, \
                f"Deterministic generation failed: {name1} vs {name2}"



class TestCompleteComponentGeneration:
    """
    Property 3: Complete Component Generation
    
    **Validates: Requirements 3.1-3.8**
    
    For any validated project name and parsed prompt, the system should generate
    all required components (WorldConfig, Characters, StoryStructure, DialogueScript,
    SequencePlan, MusicDescription) and validate their mutual coherence, automatically
    correcting any detected inconsistencies.
    """
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_all_components_generated(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that all required components are generated.
        
        **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify all components exist
        assert components.world_config is not None, "WorldConfig must be generated"
        assert components.characters is not None, "Characters must be generated"
        assert components.story_structure is not None, "StoryStructure must be generated"
        assert components.dialogue_script is not None, "DialogueScript must be generated"
        assert components.sequence_plan is not None, "SequencePlan must be generated"
        assert components.music_description is not None, "MusicDescription must be generated"
        assert components.metadata is not None, "Metadata must be generated"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_components_have_ids(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that all components have unique IDs.
        
        **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify all components have IDs
        assert components.world_config.world_id, "WorldConfig must have ID"
        assert components.story_structure.story_id, "StoryStructure must have ID"
        assert components.dialogue_script.script_id, "DialogueScript must have ID"
        assert components.sequence_plan.sequence_id, "SequencePlan must have ID"
        assert components.music_description.music_id, "MusicDescription must have ID"
        
        # Verify character IDs
        for char in components.characters:
            assert char.character_id, f"Character {char.name} must have ID"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_world_config_matches_prompt(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that WorldConfig matches prompt genre and setting.
        
        **Validates: Requirement 3.1**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify world config matches prompt
        assert components.world_config.genre == parsed_prompt.genre, \
            f"WorldConfig genre must match prompt: {components.world_config.genre} vs {parsed_prompt.genre}"
        assert components.world_config.setting == parsed_prompt.setting, \
            f"WorldConfig setting must match prompt: {components.world_config.setting} vs {parsed_prompt.setting}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_characters_match_prompt_count(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that generated characters match prompt character count.
        
        **Validates: Requirement 3.2**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify character count matches
        assert len(components.characters) == len(parsed_prompt.characters), \
            f"Character count must match: {len(components.characters)} vs {len(parsed_prompt.characters)}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_story_has_acts(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that story structure has acts.
        
        **Validates: Requirement 3.3**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify story has acts
        assert len(components.story_structure.acts) > 0, \
            "StoryStructure must have at least one act"
        
        # Verify acts have required fields
        for act in components.story_structure.acts:
            assert act.act_number > 0, "Act must have positive number"
            assert act.name, "Act must have name"
            assert act.duration > 0, "Act must have positive duration"
            assert len(act.scenes) > 0, "Act must have scenes"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_sequences_match_acts(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that sequences match story acts.
        
        **Validates: Requirements 3.3, 3.5, 3.7**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify sequence count matches act count
        assert len(components.sequence_plan.sequences) == len(components.story_structure.acts), \
            f"Sequence count must match act count: {len(components.sequence_plan.sequences)} vs {len(components.story_structure.acts)}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_coherence_validation_runs(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that coherence validation runs and returns results.
        
        **Validates: Requirements 3.7, 3.8**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Run coherence validation
        result = generator.validate_coherence(components)
        
        # Verify validation result structure
        assert "is_coherent" in result, "Validation must return is_coherent"
        assert "issues" in result, "Validation must return issues list"
        assert "total_issues" in result, "Validation must return total_issues count"
        
        # Verify types
        assert isinstance(result["is_coherent"], bool), "is_coherent must be boolean"
        assert isinstance(result["issues"], list), "issues must be list"
        assert isinstance(result["total_issues"], int), "total_issues must be integer"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_duration_consistency(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that durations are consistent across components.
        
        **Validates: Requirements 3.3, 3.5, 3.7**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify sequence plan total duration matches prompt
        assert components.sequence_plan.total_duration == parsed_prompt.duration_seconds, \
            f"Sequence plan duration must match prompt: {components.sequence_plan.total_duration} vs {parsed_prompt.duration_seconds}"
        
        # Verify story acts duration sums to approximately total
        story_duration = sum(act.duration for act in components.story_structure.acts)
        # Allow small rounding differences
        assert abs(story_duration - parsed_prompt.duration_seconds) <= len(components.story_structure.acts), \
            f"Story acts duration must sum to total: {story_duration} vs {parsed_prompt.duration_seconds}"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_music_timeline_covers_duration(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that music timeline covers the full duration.
        
        **Validates: Requirements 3.6, 3.7**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify music timeline has cues
        assert len(components.music_description.timeline) > 0, \
            "Music timeline must have cues"
        
        # Verify timeline covers duration
        last_cue = components.music_description.timeline[-1]
        assert last_cue.timestamp >= parsed_prompt.duration_seconds * 0.8, \
            f"Music timeline must cover duration: last cue at {last_cue.timestamp} for {parsed_prompt.duration_seconds}s"
    
    @settings(max_examples=100)
    @given(parsed_prompt=parsed_prompt_data())
    @pytest.mark.asyncio
    async def test_property_3_metadata_populated(self, parsed_prompt):
        """
        Property 3: Complete Component Generation
        
        Test that metadata is properly populated.
        
        **Validates: Requirements 3.1-3.8**
        """
        from src.end_to_end.component_generator import ComponentGenerator
        
        generator = ComponentGenerator()
        components = await generator.generate_all_components(parsed_prompt)
        
        # Verify metadata fields
        assert components.metadata.created_at, "Metadata must have created_at"
        assert components.metadata.updated_at, "Metadata must have updated_at"
        assert components.metadata.version, "Metadata must have version"
        assert components.metadata.author, "Metadata must have author"
