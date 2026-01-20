"""
Unit tests for DirectoryStructureCreator

Tests directory creation, kebab-case validation, and .gitkeep file management.
"""

import pytest
import tempfile
import shutil
from pathlib import Path

from src.migration.directory_structure_creator import (
    DirectoryStructureCreator,
    DirectoryTree,
    create_directory_structure,
    validate_kebab_case
)


class TestDirectoryStructureCreator:
    """Test suite for DirectoryStructureCreator class"""
    
    @pytest.fixture
    def temp_project_root(self):
        """Create a temporary project root directory"""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir)
    
    def test_initialization(self, temp_project_root):
        """Test DirectoryStructureCreator initialization"""
        creator = DirectoryStructureCreator(temp_project_root)
        
        assert creator.project_root == temp_project_root
        assert creator.dry_run is False
        assert creator.created_directories == []
        assert creator.validation_errors == []
    
    def test_initialization_with_dry_run(self, temp_project_root):
        """Test DirectoryStructureCreator initialization with dry_run mode"""
        creator = DirectoryStructureCreator(temp_project_root, dry_run=True)
        
        assert creator.dry_run is True
    
    def test_create_structure_creates_all_directories(self, temp_project_root):
        """Test that create_structure creates all required directories"""
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        # Verify tree contains all directories
        assert tree.root == temp_project_root
        assert len(tree.directories) > 0
        
        # Verify key directories exist
        assert (temp_project_root / 'src').exists()
        assert (temp_project_root / 'src' / 'engines').exists()
        assert (temp_project_root / 'src' / 'cli').exists()
        assert (temp_project_root / 'frontend').exists()
        assert (temp_project_root / 'frontend' / 'components').exists()
        assert (temp_project_root / 'tests').exists()
        assert (temp_project_root / 'tests' / 'unit').exists()
        assert (temp_project_root / 'docs').exists()
        assert (temp_project_root / 'docs' / 'api').exists()
        assert (temp_project_root / 'config').exists()
        assert (temp_project_root / 'assets').exists()
        assert (temp_project_root / 'examples' / 'demos').exists()
        assert (temp_project_root / 'models').exists()
    
    def test_create_structure_dry_run_mode(self, temp_project_root):
        """Test that dry_run mode doesn't create actual directories"""
        creator = DirectoryStructureCreator(temp_project_root, dry_run=True)
        tree = creator.create_structure()
        
        # Verify tree is populated
        assert len(tree.directories) > 0
        
        # Verify directories were NOT actually created
        assert not (temp_project_root / 'src').exists()
        assert not (temp_project_root / 'frontend').exists()
        assert not (temp_project_root / 'tests').exists()
    
    def test_validate_directory_name_valid_kebab_case(self):
        """Test validation of valid kebab-case directory names"""
        creator = DirectoryStructureCreator(Path.cwd())
        
        # Valid kebab-case names
        assert creator.validate_directory_name('src') is True
        assert creator.validate_directory_name('my-directory') is True
        assert creator.validate_directory_name('test-123') is True
        assert creator.validate_directory_name('a-b-c-d') is True
        assert creator.validate_directory_name('frontend') is True
    
    def test_validate_directory_name_invalid_kebab_case(self):
        """Test validation of invalid kebab-case directory names"""
        creator = DirectoryStructureCreator(Path.cwd())
        
        # Invalid names
        assert creator.validate_directory_name('MyDirectory') is False
        assert creator.validate_directory_name('my_directory') is False
        assert creator.validate_directory_name('my directory') is False
        assert creator.validate_directory_name('my--directory') is False
        assert creator.validate_directory_name('-mydir') is False
        assert creator.validate_directory_name('mydir-') is False
        assert creator.validate_directory_name('MY-DIR') is False
    
    def test_validate_directory_name_special_directories(self):
        """Test validation of special directories that are allowed"""
        creator = DirectoryStructureCreator(Path.cwd())
        
        # Special directories should be allowed
        assert creator.validate_directory_name('.github') is True
        assert creator.validate_directory_name('.kiro') is True
        assert creator.validate_directory_name('.git') is True
    
    def test_get_all_required_directories(self, temp_project_root):
        """Test getting list of all required directories"""
        creator = DirectoryStructureCreator(temp_project_root)
        directories = creator.get_all_required_directories()
        
        # Verify we get a list of paths
        assert isinstance(directories, list)
        assert len(directories) > 0
        assert all(isinstance(d, Path) for d in directories)
        
        # Verify key directories are in the list
        assert temp_project_root / 'src' in directories
        assert temp_project_root / 'src' / 'engines' in directories
        assert temp_project_root / 'frontend' / 'components' in directories
        assert temp_project_root / 'tests' / 'unit' in directories
    
    def test_verify_structure_completeness_all_exist(self, temp_project_root):
        """Test structure completeness verification when all directories exist"""
        creator = DirectoryStructureCreator(temp_project_root)
        creator.create_structure()
        
        # Verify completeness
        assert creator.verify_structure_completeness() is True
    
    def test_verify_structure_completeness_missing_directories(self, temp_project_root):
        """Test structure completeness verification when directories are missing"""
        creator = DirectoryStructureCreator(temp_project_root)
        
        # Don't create structure, just verify
        assert creator.verify_structure_completeness() is False
    
    def test_add_gitkeep_files(self, temp_project_root):
        """Test that .gitkeep files are added to empty directories"""
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        # Check that .gitkeep files exist in empty directories
        empty_dirs = [
            temp_project_root / 'electron',
            temp_project_root / 'build',
            temp_project_root / 'dist',
            temp_project_root / 'workflows'
        ]
        
        for empty_dir in empty_dirs:
            gitkeep_path = empty_dir / '.gitkeep'
            assert gitkeep_path.exists(), f".gitkeep missing in {empty_dir}"
    
    def test_directory_tree_to_dict(self, temp_project_root):
        """Test DirectoryTree serialization to dictionary"""
        tree = DirectoryTree(root=temp_project_root)
        tree.add_directory(temp_project_root / 'src')
        tree.add_directory(temp_project_root / 'tests')
        
        tree_dict = tree.to_dict()
        
        assert 'root' in tree_dict
        assert 'directories' in tree_dict
        assert 'total_directories' in tree_dict
        assert tree_dict['total_directories'] == 2
    
    def test_get_directory_structure_summary(self, temp_project_root):
        """Test generation of directory structure summary"""
        creator = DirectoryStructureCreator(temp_project_root)
        summary = creator.get_directory_structure_summary()
        
        # Verify summary contains key directories
        assert 'src/' in summary
        assert 'frontend/' in summary
        assert 'tests/' in summary
        assert 'docs/' in summary
        assert isinstance(summary, str)
        assert len(summary) > 0
    
    def test_create_structure_with_existing_directories(self, temp_project_root):
        """Test creating structure when some directories already exist"""
        # Pre-create some directories
        (temp_project_root / 'src').mkdir()
        (temp_project_root / 'tests').mkdir()
        
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        # Verify structure is complete
        assert creator.verify_structure_completeness() is True
        
        # Verify existing directories are in the tree
        assert temp_project_root / 'src' in tree.directories
        assert temp_project_root / 'tests' in tree.directories


class TestConvenienceFunctions:
    """Test suite for convenience functions"""
    
    @pytest.fixture
    def temp_project_root(self):
        """Create a temporary project root directory"""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir)
    
    def test_create_directory_structure_function(self, temp_project_root):
        """Test create_directory_structure convenience function"""
        tree = create_directory_structure(temp_project_root)
        
        assert isinstance(tree, DirectoryTree)
        assert tree.root == temp_project_root
        assert len(tree.directories) > 0
        
        # Verify directories were created
        assert (temp_project_root / 'src').exists()
        assert (temp_project_root / 'frontend').exists()
    
    def test_create_directory_structure_dry_run(self, temp_project_root):
        """Test create_directory_structure with dry_run mode"""
        tree = create_directory_structure(temp_project_root, dry_run=True)
        
        assert isinstance(tree, DirectoryTree)
        
        # Verify directories were NOT created
        assert not (temp_project_root / 'src').exists()
    
    def test_validate_kebab_case_function(self):
        """Test validate_kebab_case convenience function"""
        # Valid names
        assert validate_kebab_case('my-directory') is True
        assert validate_kebab_case('src') is True
        
        # Invalid names
        assert validate_kebab_case('MyDirectory') is False
        assert validate_kebab_case('my_directory') is False


class TestEdgeCases:
    """Test suite for edge cases and error conditions"""
    
    @pytest.fixture
    def temp_project_root(self):
        """Create a temporary project root directory"""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir)
    
    def test_nested_directory_creation(self, temp_project_root):
        """Test creation of deeply nested directories"""
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        # Verify nested directories exist
        assert (temp_project_root / 'src' / 'engines').exists()
        assert (temp_project_root / 'frontend' / 'components').exists()
        assert (temp_project_root / 'tests' / 'unit').exists()
        assert (temp_project_root / 'examples' / 'demos').exists()
    
    def test_directory_tree_add_duplicate(self, temp_project_root):
        """Test that adding duplicate directories doesn't create duplicates"""
        tree = DirectoryTree(root=temp_project_root)
        
        test_dir = temp_project_root / 'test'
        tree.add_directory(test_dir)
        tree.add_directory(test_dir)  # Add same directory again
        
        # Should only appear once
        assert tree.directories.count(test_dir) == 1
    
    def test_empty_directory_detection(self, temp_project_root):
        """Test detection of empty directories for .gitkeep placement"""
        creator = DirectoryStructureCreator(temp_project_root)
        
        # Create a directory with a file
        test_dir = temp_project_root / 'test-dir'
        test_dir.mkdir()
        (test_dir / 'file.txt').write_text('content')
        
        tree = DirectoryTree(root=temp_project_root)
        tree.add_directory(test_dir)
        
        # Add gitkeep files
        creator._add_gitkeep_files(tree)
        
        # Directory with file should not get .gitkeep
        assert not (test_dir / '.gitkeep').exists()


class TestRequirementValidation:
    """Test suite to validate requirements are met"""
    
    @pytest.fixture
    def temp_project_root(self):
        """Create a temporary project root directory"""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir)
    
    def test_requirement_1_1_directory_structure_categories(self, temp_project_root):
        """
        Requirement 1.1: System SHALL create top-level directory structure
        with categories: source code, documentation, configuration, tests, tools, build artifacts
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        # Verify all required categories exist
        assert (temp_project_root / 'src').exists()  # source code
        assert (temp_project_root / 'docs').exists()  # documentation
        assert (temp_project_root / 'config').exists()  # configuration
        assert (temp_project_root / 'tests').exists()  # tests
        assert (temp_project_root / 'tools').exists()  # tools
        assert (temp_project_root / 'build').exists()  # build artifacts
    
    def test_requirement_1_2_kebab_case_naming(self, temp_project_root):
        """
        Requirement 1.2: System SHALL use kebab-case naming convention
        for all directory names
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        # Verify all created directories follow kebab-case
        for directory in tree.directories:
            dir_name = directory.name
            # Skip special directories
            if dir_name.startswith('.'):
                continue
            
            assert creator.validate_directory_name(dir_name), \
                f"Directory '{dir_name}' does not follow kebab-case convention"
    
    def test_requirement_4_1_docs_directory_with_subdirectories(self, temp_project_root):
        """
        Requirement 4.1: System SHALL create docs directory with subdirectories:
        api, guides, architecture, deployment, troubleshooting
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'docs').exists()
        assert (temp_project_root / 'docs' / 'api').exists()
        assert (temp_project_root / 'docs' / 'guides').exists()
        assert (temp_project_root / 'docs' / 'architecture').exists()
        assert (temp_project_root / 'docs' / 'deployment').exists()
        assert (temp_project_root / 'docs' / 'troubleshooting').exists()
    
    def test_requirement_5_1_tests_directory_with_subdirectories(self, temp_project_root):
        """
        Requirement 5.1: System SHALL create tests directory with subdirectories:
        unit, integration, property, e2e
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'tests').exists()
        assert (temp_project_root / 'tests' / 'unit').exists()
        assert (temp_project_root / 'tests' / 'integration').exists()
        assert (temp_project_root / 'tests' / 'property').exists()
        assert (temp_project_root / 'tests' / 'e2e').exists()
    
    def test_requirement_6_1_config_directory(self, temp_project_root):
        """
        Requirement 6.1: System SHALL create config directory for all configuration files
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'config').exists()
    
    def test_requirement_6_4_config_environment_subdirectories(self, temp_project_root):
        """
        Requirement 6.4: System SHALL create subdirectories in config for
        different environments (development, production, test)
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'config' / 'development').exists()
        assert (temp_project_root / 'config' / 'production').exists()
        assert (temp_project_root / 'config' / 'test').exists()
    
    def test_requirement_7_1_build_directory(self, temp_project_root):
        """
        Requirement 7.1: System SHALL create build directory for compilation outputs
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'build').exists()
    
    def test_requirement_7_2_dist_directory(self, temp_project_root):
        """
        Requirement 7.2: System SHALL create dist directory for distribution packages
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'dist').exists()
    
    def test_requirement_8_1_assets_directory_with_subdirectories(self, temp_project_root):
        """
        Requirement 8.1: System SHALL create assets directory with subdirectories:
        images, audio, video, icons, fonts
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'assets').exists()
        assert (temp_project_root / 'assets' / 'images').exists()
        assert (temp_project_root / 'assets' / 'audio').exists()
        assert (temp_project_root / 'assets' / 'video').exists()
        assert (temp_project_root / 'assets' / 'icons').exists()
        assert (temp_project_root / 'assets' / 'fonts').exists()
    
    def test_requirement_19_1_models_directory(self, temp_project_root):
        """
        Requirement 19.1: System SHALL create models directory for AI model files
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'models').exists()
    
    def test_requirement_20_1_examples_directory(self, temp_project_root):
        """
        Requirement 20.1: System SHALL create examples directory for example code
        """
        creator = DirectoryStructureCreator(temp_project_root)
        tree = creator.create_structure()
        
        assert (temp_project_root / 'examples').exists()
        assert (temp_project_root / 'examples' / 'demos').exists()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
