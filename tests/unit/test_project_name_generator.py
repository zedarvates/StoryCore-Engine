"""
Unit tests for ProjectNameGenerator.

Tests name generation, sanitization, duplicate detection, and variant generation.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from src.end_to_end.project_name_generator import ProjectNameGenerator
from src.end_to_end.data_models import ParsedPrompt, CharacterInfo


@pytest.fixture
def temp_projects_dir():
    """Create a temporary projects directory for testing"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def generator(temp_projects_dir):
    """Create a ProjectNameGenerator instance"""
    return ProjectNameGenerator(temp_projects_dir)


@pytest.fixture
def sample_parsed_prompt():
    """Create a sample parsed prompt"""
    return ParsedPrompt(
        project_title="Snow White Cyberpunk",
        genre="cyberpunk",
        video_type="trailer",
        mood=["dark", "futuristic"],
        setting="Neo-Tokyo",
        time_period="2048",
        characters=[
            CharacterInfo(
                name="Snow White",
                role="protagonist",
                description="Cybernetic princess"
            )
        ],
        key_elements=["neon lights", "rain"],
        visual_style=["blade runner", "anime"],
        aspect_ratio="16:9",
        duration_seconds=60,
        raw_prompt="Snow White in cyberpunk 2048",
        confidence_scores={}
    )


class TestBasicNameGeneration:
    """Test basic name generation functionality"""
    
    def test_generate_name_from_prompt(self, generator, sample_parsed_prompt):
        """Test generating a name from a parsed prompt"""
        name = generator.generate_name(sample_parsed_prompt)
        
        assert name is not None
        assert len(name) > 0
        assert "snow-white-cyberpunk" in name.lower()
    
    def test_generated_name_is_filesystem_safe(self, generator, sample_parsed_prompt):
        """Test that generated names are filesystem safe"""
        name = generator.generate_name(sample_parsed_prompt)
        
        # Should not contain invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            assert char not in name
        
        # Should not contain spaces
        assert ' ' not in name
    
    def test_generate_name_with_minimal_prompt(self, generator):
        """Test name generation with minimal prompt data"""
        minimal_prompt = ParsedPrompt(
            project_title="Test Project",
            genre="",
            video_type="",
            mood=[],
            setting="",
            time_period="",
            characters=[],
            key_elements=[],
            visual_style=[],
            aspect_ratio="16:9",
            duration_seconds=30,
            raw_prompt="test",
            confidence_scores={}
        )
        
        name = generator.generate_name(minimal_prompt)
        assert name is not None
        assert "test-project" in name.lower()


class TestNameSanitization:
    """Test name sanitization functionality"""
    
    def test_sanitize_removes_invalid_characters(self, generator):
        """Test that invalid characters are removed"""
        test_cases = [
            ("Project<Name>", "projectname"),
            ("Project:Name", "projectname"),
            ('Project"Name', "projectname"),
            ("Project/Name", "projectname"),
            ("Project\\Name", "projectname"),
            ("Project|Name", "projectname"),
            ("Project?Name", "projectname"),
            ("Project*Name", "projectname"),
        ]
        
        for input_name, expected_pattern in test_cases:
            sanitized = generator._sanitize_name(input_name)
            assert expected_pattern in sanitized.lower()
    
    def test_sanitize_replaces_spaces_with_hyphens(self, generator):
        """Test that spaces are replaced with hyphens"""
        name = generator._sanitize_name("My Project Name")
        assert name == "my-project-name"
    
    def test_sanitize_removes_multiple_hyphens(self, generator):
        """Test that multiple consecutive hyphens are collapsed"""
        name = generator._sanitize_name("My---Project---Name")
        assert "---" not in name
        assert name == "my-project-name"
    
    def test_sanitize_removes_leading_trailing_hyphens(self, generator):
        """Test that leading and trailing hyphens are removed"""
        name = generator._sanitize_name("-My Project-")
        assert not name.startswith("-")
        assert not name.endswith("-")
    
    def test_sanitize_handles_empty_string(self, generator):
        """Test that empty strings are handled"""
        name = generator._sanitize_name("")
        assert name == "project"
    
    def test_sanitize_handles_only_invalid_chars(self, generator):
        """Test handling of strings with only invalid characters"""
        name = generator._sanitize_name("<<<>>>")
        assert name == "project"
    
    def test_sanitize_truncates_long_names(self, generator):
        """Test that very long names are truncated"""
        long_name = "a" * 200
        sanitized = generator._sanitize_name(long_name)
        assert len(sanitized) <= generator.MAX_NAME_LENGTH
    
    def test_sanitize_converts_to_lowercase(self, generator):
        """Test that names are converted to lowercase"""
        name = generator._sanitize_name("MyProjectName")
        assert name == "myprojectname"


class TestDuplicateDetection:
    """Test duplicate detection and variant generation"""
    
    def test_name_exists_returns_false_for_new_name(self, generator):
        """Test that _name_exists returns False for new names"""
        assert not generator._name_exists("nonexistent-project")
    
    def test_name_exists_returns_true_for_existing_name(self, generator, temp_projects_dir):
        """Test that _name_exists returns True for existing names"""
        # Create a project directory
        project_path = Path(temp_projects_dir) / "existing-project"
        project_path.mkdir()
        
        assert generator._name_exists("existing-project")
    
    def test_generate_unique_name_for_duplicate(self, generator, temp_projects_dir, sample_parsed_prompt):
        """Test that a variant is generated when name exists"""
        # Generate first name
        first_name = generator.generate_name(sample_parsed_prompt)
        
        # Create the project directory
        project_path = Path(temp_projects_dir) / first_name
        project_path.mkdir()
        
        # Generate second name - should be different
        second_name = generator.generate_name(sample_parsed_prompt)
        
        assert second_name != first_name
        assert "-v2" in second_name
    
    def test_generate_multiple_variants(self, generator, temp_projects_dir, sample_parsed_prompt):
        """Test generating multiple variants"""
        names = []
        
        for i in range(5):
            name = generator.generate_name(sample_parsed_prompt)
            names.append(name)
            
            # Create the project directory
            project_path = Path(temp_projects_dir) / name
            project_path.mkdir()
        
        # All names should be unique
        assert len(names) == len(set(names))
        
        # Should have version numbers
        assert any("-v" in name for name in names[1:])
    
    def test_find_unique_name_with_existing_variants(self, generator, temp_projects_dir):
        """Test finding unique name when some variants exist"""
        base_name = "test-project"
        
        # Create base and v2
        (Path(temp_projects_dir) / base_name).mkdir()
        (Path(temp_projects_dir) / f"{base_name}-v2").mkdir()
        
        # Should generate v3
        unique_name = generator._find_unique_name(base_name)
        assert unique_name == f"{base_name}-v3"


class TestCollisionHandling:
    """Test comprehensive collision handling scenarios"""
    
    def test_collision_with_sequential_variants(self, generator, temp_projects_dir):
        """Test collision handling with many sequential variants"""
        base_name = "popular-project"
        
        # Create base and first 10 variants
        (Path(temp_projects_dir) / base_name).mkdir()
        for i in range(2, 12):
            (Path(temp_projects_dir) / f"{base_name}-v{i}").mkdir()
        
        # Should generate v12
        unique_name = generator._find_unique_name(base_name)
        assert unique_name == f"{base_name}-v12"
        assert not generator._name_exists(unique_name)
    
    def test_collision_with_gaps_in_variants(self, generator, temp_projects_dir):
        """Test collision handling when there are gaps in version numbers"""
        base_name = "gapped-project"
        
        # Create base, v2, v5, v7 (gaps at v3, v4, v6)
        (Path(temp_projects_dir) / base_name).mkdir()
        (Path(temp_projects_dir) / f"{base_name}-v2").mkdir()
        (Path(temp_projects_dir) / f"{base_name}-v5").mkdir()
        (Path(temp_projects_dir) / f"{base_name}-v7").mkdir()
        
        # Should find first available (v3)
        unique_name = generator._find_unique_name(base_name)
        assert unique_name == f"{base_name}-v3"
    
    def test_collision_with_long_base_name(self, generator, temp_projects_dir):
        """Test collision handling when base name is near max length"""
        # Create a base name that's close to max length
        long_base = "a" * 95  # Leave room for "-v999"
        
        # Create the base name
        (Path(temp_projects_dir) / long_base).mkdir()
        
        # Should generate variant without exceeding max length
        unique_name = generator._find_unique_name(long_base)
        assert len(unique_name) <= generator.MAX_NAME_LENGTH
        assert "-v2" in unique_name
        assert not generator._name_exists(unique_name)
    
    def test_collision_with_max_length_base_name(self, generator, temp_projects_dir):
        """Test collision handling when base name is at max length"""
        # Create a base name at exactly max length
        max_base = "a" * generator.MAX_NAME_LENGTH
        
        # Create the base name
        (Path(temp_projects_dir) / max_base).mkdir()
        
        # Should truncate and add version
        unique_name = generator._find_unique_name(max_base)
        assert len(unique_name) <= generator.MAX_NAME_LENGTH
        assert "-v2" in unique_name
        assert not generator._name_exists(unique_name)
    
    def test_collision_with_sanitized_names(self, generator, temp_projects_dir):
        """Test collision handling with names that need sanitization"""
        # Create a project with sanitized name
        sanitized = generator._sanitize_name("My Project!")
        (Path(temp_projects_dir) / sanitized).mkdir()
        
        # Try to create another with same base but different special chars
        prompt = ParsedPrompt(
            project_title="My Project?",
            genre="",
            video_type="",
            mood=[],
            setting="",
            time_period="",
            characters=[],
            key_elements=[],
            visual_style=[],
            aspect_ratio="16:9",
            duration_seconds=30,
            raw_prompt="test",
            confidence_scores={}
        )
        
        # Should detect collision and create variant
        name = generator.generate_name(prompt)
        assert name != sanitized
        assert "-v2" in name
    
    def test_collision_with_case_insensitive_names(self, generator, temp_projects_dir):
        """Test that collision detection is case-insensitive"""
        # Create project with lowercase name
        (Path(temp_projects_dir) / "myproject").mkdir()
        
        # Try to create with uppercase (should sanitize to lowercase and detect collision)
        prompt = ParsedPrompt(
            project_title="MyProject",
            genre="",
            video_type="",
            mood=[],
            setting="",
            time_period="",
            characters=[],
            key_elements=[],
            visual_style=[],
            aspect_ratio="16:9",
            duration_seconds=30,
            raw_prompt="test",
            confidence_scores={}
        )
        
        name = generator.generate_name(prompt)
        assert "-v2" in name
    
    def test_collision_with_variant_number_overflow(self, generator, temp_projects_dir):
        """Test collision handling with very high version numbers"""
        base_name = "overflow-test"
        
        # Create base and many variants (simulate high version numbers)
        (Path(temp_projects_dir) / base_name).mkdir()
        for i in range(2, 102):  # Create v2 through v101
            (Path(temp_projects_dir) / f"{base_name}-v{i}").mkdir()
        
        # Should still find next available version
        unique_name = generator._find_unique_name(base_name)
        assert unique_name == f"{base_name}-v102"
        assert len(unique_name) <= generator.MAX_NAME_LENGTH
    
    def test_collision_preserves_name_structure(self, generator, temp_projects_dir):
        """Test that collision variants preserve the base name structure"""
        base_name = "my-cool-project"
        
        # Create base
        (Path(temp_projects_dir) / base_name).mkdir()
        
        # Generate variants
        variants = []
        for i in range(5):
            unique_name = generator._find_unique_name(base_name)
            variants.append(unique_name)
            (Path(temp_projects_dir) / unique_name).mkdir()
        
        # All variants should start with base name
        for variant in variants:
            assert variant.startswith(base_name)
            assert "-v" in variant
    
    def test_collision_with_hyphenated_base_names(self, generator, temp_projects_dir):
        """Test collision handling with base names containing hyphens"""
        base_name = "my-multi-part-project-name"
        
        # Create base
        (Path(temp_projects_dir) / base_name).mkdir()
        
        # Should append version correctly
        unique_name = generator._find_unique_name(base_name)
        assert unique_name == f"{base_name}-v2"
        assert unique_name.count("-v") == 1  # Only one version suffix
    
    def test_collision_with_existing_version_like_suffix(self, generator, temp_projects_dir):
        """Test collision when base name already looks like it has a version"""
        # Create a project that looks like it has a version
        base_name = "project-v1"
        (Path(temp_projects_dir) / base_name).mkdir()
        
        # Should still add proper version suffix
        unique_name = generator._find_unique_name(base_name)
        assert unique_name == f"{base_name}-v2"
    
    def test_multiple_collisions_from_same_prompt(self, generator, temp_projects_dir, sample_parsed_prompt):
        """Test generating multiple projects from the same prompt"""
        names = set()
        
        # Generate 10 projects from same prompt
        for i in range(10):
            name = generator.generate_name(sample_parsed_prompt)
            assert name not in names  # Each should be unique
            names.add(name)
            
            # Create the project
            (Path(temp_projects_dir) / name).mkdir()
        
        # Verify all names are unique
        assert len(names) == 10
        
        # First should be base, rest should have versions
        names_list = sorted(names)
        assert "-v" not in names_list[0]  # First one is base
        assert all("-v" in name for name in names_list[1:])  # Rest have versions


class TestPathSanitizationWithCollisions:
    """Test path sanitization in collision scenarios"""
    
    def test_sanitization_before_collision_check(self, generator, temp_projects_dir):
        """Test that names are sanitized before checking for collisions"""
        # Create a sanitized project
        (Path(temp_projects_dir) / "my-project").mkdir()
        
        # Try to create with unsanitized version
        unsanitized = "My Project!"
        sanitized = generator._sanitize_name(unsanitized)
        
        # Should detect collision after sanitization
        unique_name = generator._find_unique_name(sanitized)
        assert "-v2" in unique_name
    
    def test_collision_with_special_characters_removed(self, generator, temp_projects_dir):
        """Test collision when special characters are removed during sanitization"""
        # Create project
        (Path(temp_projects_dir) / "projectname").mkdir()
        
        # Try to create with special chars that will be removed
        prompt1 = ParsedPrompt(
            project_title="Project@Name",
            genre="", video_type="", mood=[], setting="", time_period="",
            characters=[], key_elements=[], visual_style=[],
            aspect_ratio="16:9", duration_seconds=30,
            raw_prompt="test", confidence_scores={}
        )
        
        name = generator.generate_name(prompt1)
        assert "-v2" in name
    
    def test_collision_with_whitespace_normalization(self, generator, temp_projects_dir):
        """Test collision when whitespace is normalized"""
        # Create project with normalized name
        (Path(temp_projects_dir) / "my-project-name").mkdir()
        
        # Try to create with extra spaces
        prompt = ParsedPrompt(
            project_title="My  Project   Name",  # Multiple spaces
            genre="", video_type="", mood=[], setting="", time_period="",
            characters=[], key_elements=[], visual_style=[],
            aspect_ratio="16:9", duration_seconds=30,
            raw_prompt="test", confidence_scores={}
        )
        
        name = generator.generate_name(prompt)
        assert "-v2" in name
    
    def test_collision_with_truncated_names(self, generator, temp_projects_dir):
        """Test collision when long names are truncated to same result"""
        # Create a long name that will be truncated
        long_name = "a" * generator.MAX_NAME_LENGTH
        (Path(temp_projects_dir) / long_name).mkdir()
        
        # Try to create another long name that truncates to same thing
        even_longer = "a" * (generator.MAX_NAME_LENGTH + 50)
        sanitized = generator._sanitize_name(even_longer)
        
        # Should detect collision after truncation
        unique_name = generator._find_unique_name(sanitized)
        assert "-v2" in unique_name
        assert len(unique_name) <= generator.MAX_NAME_LENGTH


class TestPathGeneration:
    """Test project path generation"""
    
    def test_get_project_path(self, generator, temp_projects_dir):
        """Test getting full project path"""
        project_name = "my-project"
        path = generator.get_project_path(project_name)
        
        assert isinstance(path, Path)
        assert path.name == project_name
        assert str(temp_projects_dir) in str(path)
    
    def test_get_project_path_is_absolute(self, generator):
        """Test that project paths are absolute"""
        path = generator.get_project_path("test-project")
        assert path.is_absolute()


class TestNameValidation:
    """Test name validation functionality"""
    
    def test_validate_valid_name(self, generator):
        """Test validation of valid names"""
        is_valid, error = generator.validate_name("valid-project-name")
        assert is_valid
        assert error == ""
    
    def test_validate_empty_name(self, generator):
        """Test validation of empty names"""
        is_valid, error = generator.validate_name("")
        assert not is_valid
        assert "empty" in error.lower()
    
    def test_validate_name_with_invalid_chars(self, generator):
        """Test validation of names with invalid characters"""
        is_valid, error = generator.validate_name("project<name>")
        assert not is_valid
        assert "invalid" in error.lower()
    
    def test_validate_too_long_name(self, generator):
        """Test validation of too long names"""
        long_name = "a" * 200
        is_valid, error = generator.validate_name(long_name)
        assert not is_valid
        assert "long" in error.lower()
    
    def test_validate_existing_name(self, generator, temp_projects_dir):
        """Test validation of existing names"""
        # Create a project
        project_path = Path(temp_projects_dir) / "existing-project"
        project_path.mkdir()
        
        is_valid, error = generator.validate_name("existing-project")
        assert not is_valid
        assert "exists" in error.lower()


class TestUtilityMethods:
    """Test utility methods"""
    
    def test_list_existing_projects_empty(self, generator):
        """Test listing projects when none exist"""
        projects = generator.list_existing_projects()
        assert projects == []
    
    def test_list_existing_projects(self, generator, temp_projects_dir):
        """Test listing existing projects"""
        # Create some projects
        (Path(temp_projects_dir) / "project-1").mkdir()
        (Path(temp_projects_dir) / "project-2").mkdir()
        (Path(temp_projects_dir) / "project-3").mkdir()
        
        projects = generator.list_existing_projects()
        assert len(projects) == 3
        assert "project-1" in projects
        assert "project-2" in projects
        assert "project-3" in projects
    
    def test_list_existing_projects_sorted(self, generator, temp_projects_dir):
        """Test that projects are returned sorted"""
        # Create projects in random order
        (Path(temp_projects_dir) / "zebra").mkdir()
        (Path(temp_projects_dir) / "alpha").mkdir()
        (Path(temp_projects_dir) / "beta").mkdir()
        
        projects = generator.list_existing_projects()
        assert projects == ["alpha", "beta", "zebra"]
    
    def test_suggest_variants(self, generator):
        """Test suggesting name variants"""
        suggestions = generator.suggest_variants("my-project", count=5)
        
        assert len(suggestions) == 5
        assert suggestions[0] == "my-project"
        assert all("-v" in s for s in suggestions[1:])
    
    def test_suggest_variants_with_existing_names(self, generator, temp_projects_dir):
        """Test suggesting variants when some names exist"""
        # Create base name
        (Path(temp_projects_dir) / "my-project").mkdir()
        
        suggestions = generator.suggest_variants("my-project", count=5)
        
        assert len(suggestions) == 5
        assert "my-project" not in suggestions  # Base exists, so not suggested
        assert suggestions[0] == "my-project-v2"


class TestEdgeCases:
    """Test edge cases and special scenarios"""
    
    def test_generate_name_with_special_characters_in_title(self, generator):
        """Test name generation with special characters in title"""
        prompt = ParsedPrompt(
            project_title="Project: The Beginning!",
            genre="action",
            video_type="trailer",
            mood=[],
            setting="",
            time_period="",
            characters=[],
            key_elements=[],
            visual_style=[],
            aspect_ratio="16:9",
            duration_seconds=30,
            raw_prompt="test",
            confidence_scores={}
        )
        
        name = generator.generate_name(prompt)
        assert ":" not in name
        assert "!" not in name
    
    def test_generate_name_with_unicode_characters(self, generator):
        """Test name generation with unicode characters"""
        prompt = ParsedPrompt(
            project_title="Café Français",
            genre="drama",
            video_type="short",
            mood=[],
            setting="",
            time_period="",
            characters=[],
            key_elements=[],
            visual_style=[],
            aspect_ratio="16:9",
            duration_seconds=30,
            raw_prompt="test",
            confidence_scores={}
        )
        
        name = generator.generate_name(prompt)
        # Should handle unicode gracefully
        assert name is not None
        assert len(name) > 0
    
    def test_generate_name_with_very_long_title(self, generator):
        """Test name generation with very long title"""
        long_title = "A" * 200
        prompt = ParsedPrompt(
            project_title=long_title,
            genre="drama",
            video_type="film",
            mood=[],
            setting="",
            time_period="",
            characters=[],
            key_elements=[],
            visual_style=[],
            aspect_ratio="16:9",
            duration_seconds=30,
            raw_prompt="test",
            confidence_scores={}
        )
        
        name = generator.generate_name(prompt)
        assert len(name) <= generator.MAX_NAME_LENGTH
    
    def test_projects_directory_created_if_not_exists(self, temp_projects_dir):
        """Test that projects directory is created if it doesn't exist"""
        # Use a subdirectory that doesn't exist
        new_dir = Path(temp_projects_dir) / "new_projects"
        assert not new_dir.exists()
        
        generator = ProjectNameGenerator(str(new_dir))
        assert new_dir.exists()
