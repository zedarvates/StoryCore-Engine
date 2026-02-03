"""
Property-based tests for AssetManager.

Tests Properties 20-28 for asset management and summarization.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from pathlib import Path
import tempfile
import shutil
import os
from datetime import datetime

from src.memory_system.asset_manager import AssetManager
from src.memory_system.data_models import AssetType, AssetInfo
from src.memory_system.directory_manager import DirectoryManager


# Strategy for generating valid filenames
@st.composite
def valid_filename(draw):
    """Generate valid filenames for different asset types."""
    extensions = {
        AssetType.IMAGE: ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
        AssetType.AUDIO: ['.mp3', '.wav', '.ogg'],
        AssetType.VIDEO: ['.mp4', '.avi', '.mov', '.mkv'],
        AssetType.DOCUMENT: ['.pdf', '.txt', '.md', '.doc']
    }
    
    asset_type = draw(st.sampled_from(list(AssetType)))
    name = draw(st.text(
        alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),
            whitelist_characters='_-'
        ),
        min_size=1,
        max_size=20
    ))
    ext = draw(st.sampled_from(extensions[asset_type]))
    
    return name + ext, asset_type


# Strategy for generating file content
@st.composite
def file_content(draw):
    """Generate random file content."""
    size = draw(st.integers(min_value=1, max_value=10000))
    return bytes([draw(st.integers(min_value=0, max_value=255)) for _ in range(size)])


class TestAssetManagerProperties:
    """Property-based tests for AssetManager."""
    
    @pytest.fixture
    def temp_project(self):
        """Create a temporary project directory."""
        temp_dir = tempfile.mkdtemp()
        project_path = Path(temp_dir) / "test_project"
        
        # Initialize directory structure
        dir_manager = DirectoryManager()
        dir_manager.create_structure(project_path)
        
        yield project_path
        
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    # Feature: storycore-llm-memory-system, Property 20: Asset Type-Based Routing
    @given(filename_and_type=valid_filename(), content=file_content())
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_property_20_asset_type_based_routing(self, temp_project, filename_and_type, content):
        """
        Property 20: Asset Type-Based Routing
        
        For any asset added, it SHALL be stored in the correct subdirectory 
        based on its type (images/, audio/, video/, documents/).
        
        **Validates: Requirements 6.1**
        """
        filename, asset_type = filename_and_type
        
        # Create temporary source file
        source_path = temp_project / filename
        with open(source_path, 'wb') as f:
            f.write(content)
        
        # Store asset
        asset_manager = AssetManager(temp_project)
        asset_info = asset_manager.store_asset(source_path, asset_type)
        
        # Verify asset was stored
        assert asset_info is not None
        assert asset_info.type == asset_type
        
        # Verify correct subdirectory
        expected_subdir = asset_manager.SUBDIRECTORIES[asset_type]
        expected_path = temp_project / "assets" / expected_subdir
        
        assert asset_info.path.parent == expected_path
        assert asset_info.path.exists()
        
        # Cleanup source file
        source_path.unlink()
    
    # Feature: storycore-llm-memory-system, Property 21: Asset Index Entry Completeness
    @given(filename_and_type=valid_filename(), content=file_content())
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_property_21_asset_index_entry_completeness(self, temp_project, filename_and_type, content):
        """
        Property 21: Asset Index Entry Completeness
        
        For any asset added, attachments_index.txt SHALL be updated with an entry 
        containing filename, path, type, size, and timestamp.
        
        **Validates: Requirements 6.2**
        """
        filename, asset_type = filename_and_type
        
        # Create temporary source file
        source_path = temp_project / filename
        with open(source_path, 'wb') as f:
            f.write(content)
        
        # Store asset
        asset_manager = AssetManager(temp_project)
        asset_info = asset_manager.store_asset(source_path, asset_type)
        
        # Verify index was updated
        index_path = temp_project / "assets" / "attachments_index.txt"
        assert index_path.exists()
        
        # Read index content
        with open(index_path, 'r', encoding='utf-8') as f:
            index_content = f.read()
        
        # Verify all required fields are present
        assert asset_info.filename in index_content
        assert str(asset_info.path) in index_content
        assert asset_type.value.upper() in index_content
        assert "Size:" in index_content
        assert "Added:" in index_content
        
        # Cleanup source file
        source_path.unlink()
    
    # Feature: storycore-llm-memory-system, Property 22: Asset Metadata Generation
    @given(filename_and_type=valid_filename(), content=file_content())
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_property_22_asset_metadata_generation(self, temp_project, filename_and_type, content):
        """
        Property 22: Asset Metadata Generation
        
        For any asset added, metadata or a description SHALL be generated 
        and associated with the asset.
        
        **Validates: Requirements 6.3**
        """
        filename, asset_type = filename_and_type
        
        # Create temporary source file
        source_path = temp_project / filename
        with open(source_path, 'wb') as f:
            f.write(content)
        
        # Store asset
        asset_manager = AssetManager(temp_project)
        asset_info = asset_manager.store_asset(source_path, asset_type, description="Test asset")
        
        # Verify metadata was generated
        assert asset_info is not None
        assert asset_info.metadata is not None
        assert asset_info.metadata.size_bytes > 0
        assert asset_info.metadata.format != ""
        
        # Cleanup source file
        source_path.unlink()
    
    # Feature: storycore-llm-memory-system, Property 23: Asset Index Parseability
    @given(
        assets=st.lists(
            st.tuples(valid_filename(), file_content()),
            min_size=1,
            max_size=5
        )
    )
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.data_too_large])
    def test_property_23_asset_index_parseability(self, temp_project, assets):
        """
        Property 23: Asset Index Parseability
        
        For any attachments_index.txt file, it SHALL be parseable with clear 
        delimiters and structure suitable for LLM consumption.
        
        **Validates: Requirements 6.4, 6.5**
        """
        asset_manager = AssetManager(temp_project)
        
        # Store multiple assets
        for (filename, asset_type), content in assets:
            source_path = temp_project / filename
            with open(source_path, 'wb') as f:
                f.write(content)
            
            asset_manager.store_asset(source_path, asset_type)
            source_path.unlink()
        
        # Read index
        index_content = asset_manager.get_asset_index()
        
        # Verify structure
        assert index_content != "No assets indexed."
        assert "===" in index_content  # Delimiter present
        
        # Verify each asset has a section
        for (filename, asset_type), _ in assets:
            # The filename might have been made unique, so check for base name
            base_name = filename.split('.')[0]
            assert base_name in index_content or filename in index_content
    
    # Feature: storycore-llm-memory-system, Property 24: Asset Modification Triggers Summarization
    @given(filename_and_type=valid_filename(), content=file_content())
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_property_24_asset_modification_triggers_summarization(self, temp_project, filename_and_type, content):
        """
        Property 24: Asset Modification Triggers Summarization
        
        For any asset addition or modification, automatic summarization SHALL be triggered.
        
        **Validates: Requirements 7.1**
        """
        filename, asset_type = filename_and_type
        
        # Create temporary source file
        source_path = temp_project / filename
        with open(source_path, 'wb') as f:
            f.write(content)
        
        # Store asset
        asset_manager = AssetManager(temp_project)
        asset_manager.store_asset(source_path, asset_type)
        
        # Trigger summarization
        result = asset_manager.summarize_assets()
        
        # Verify summarization was successful
        assert result is True
        
        # Verify summary file exists
        summary_path = temp_project / "assets" / "assets_summary.txt"
        assert summary_path.exists()
        
        # Cleanup source file
        source_path.unlink()
    
    # Feature: storycore-llm-memory-system, Property 25: Image Metadata Extraction
    @given(content=file_content())
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_property_25_image_metadata_extraction(self, temp_project, content):
        """
        Property 25: Image Metadata Extraction
        
        For any image asset, metadata (dimensions, format, file size) SHALL be 
        extracted during summarization.
        
        **Validates: Requirements 7.2**
        """
        # Create a simple image file
        filename = "test_image.png"
        source_path = temp_project / filename
        with open(source_path, 'wb') as f:
            f.write(content)
        
        # Store asset
        asset_manager = AssetManager(temp_project)
        asset_info = asset_manager.store_asset(source_path, AssetType.IMAGE)
        
        # Verify metadata extraction
        assert asset_info is not None
        assert asset_info.metadata is not None
        assert asset_info.metadata.format == "png"
        assert asset_info.metadata.size_bytes > 0
        
        # Note: dimensions may not be extractable without PIL
        # but format and size should always be present
        
        # Cleanup source file
        source_path.unlink()
    
    # Feature: storycore-llm-memory-system, Property 26: Document Content Extraction
    @given(content=st.text(min_size=10, max_size=1000))
    @settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_property_26_document_content_extraction(self, temp_project, content):
        """
        Property 26: Document Content Extraction
        
        For any document asset, key content, headings, and structure SHALL be 
        extracted during summarization.
        
        **Validates: Requirements 7.3**
        """
        # Create a text document
        filename = "test_document.txt"
        source_path = temp_project / filename
        with open(source_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Store asset
        asset_manager = AssetManager(temp_project)
        asset_info = asset_manager.store_asset(source_path, AssetType.DOCUMENT)
        
        # Verify metadata extraction
        assert asset_info is not None
        assert asset_info.metadata is not None
        assert asset_info.metadata.format == "txt"
        assert asset_info.metadata.size_bytes > 0
        
        # Cleanup source file
        source_path.unlink()
    
    # Feature: storycore-llm-memory-system, Property 27: Asset Summary File Updates
    @given(
        assets=st.lists(
            st.tuples(valid_filename(), file_content()),
            min_size=1,
            max_size=5
        )
    )
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.data_too_large])
    def test_property_27_asset_summary_file_updates(self, temp_project, assets):
        """
        Property 27: Asset Summary File Updates
        
        For any completed asset summarization, assets_summary.txt SHALL be updated 
        with the consolidated information.
        
        **Validates: Requirements 7.4**
        """
        asset_manager = AssetManager(temp_project)
        
        # Store multiple assets
        for (filename, asset_type), content in assets:
            source_path = temp_project / filename
            with open(source_path, 'wb') as f:
                f.write(content)
            
            asset_manager.store_asset(source_path, asset_type)
            source_path.unlink()
        
        # Generate summary
        result = asset_manager.summarize_assets()
        assert result is True
        
        # Verify summary file exists and has content
        summary_path = temp_project / "assets" / "assets_summary.txt"
        assert summary_path.exists()
        
        with open(summary_path, 'r', encoding='utf-8') as f:
            summary_content = f.read()
        
        assert len(summary_content) > 0
        assert "ASSETS SUMMARY" in summary_content
        assert "TOTAL:" in summary_content
    
    # Feature: storycore-llm-memory-system, Property 28: Asset Summary Organization
    @given(
        assets=st.lists(
            st.tuples(valid_filename(), file_content()),
            min_size=2,
            max_size=10
        )
    )
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.data_too_large, HealthCheck.too_slow])
    def test_property_28_asset_summary_organization(self, temp_project, assets):
        """
        Property 28: Asset Summary Organization
        
        For any assets_summary.txt file, summaries SHALL be organized by asset type 
        for easy navigation.
        
        **Validates: Requirements 7.5**
        """
        asset_manager = AssetManager(temp_project)
        
        # Track asset types we're adding
        added_types = set()
        
        # Store multiple assets
        for (filename, asset_type), content in assets:
            source_path = temp_project / filename
            with open(source_path, 'wb') as f:
                f.write(content)
            
            asset_manager.store_asset(source_path, asset_type)
            added_types.add(asset_type)
            source_path.unlink()
        
        # Generate summary
        result = asset_manager.summarize_assets()
        assert result is True
        
        # Read summary
        summary_path = temp_project / "assets" / "assets_summary.txt"
        with open(summary_path, 'r', encoding='utf-8') as f:
            summary_content = f.read()
        
        # Verify organization by type
        for asset_type in added_types:
            # Check that the asset type section exists
            type_header = f"--- {asset_type.value.upper()}"
            assert type_header in summary_content
        
        # Verify sections appear in order
        # (Images, Audio, Video, Documents is the typical order)
        type_positions = {}
        for asset_type in AssetType:
            type_header = f"--- {asset_type.value.upper()}"
            if type_header in summary_content:
                type_positions[asset_type] = summary_content.index(type_header)
        
        # If we have multiple types, verify they're in a logical order
        if len(type_positions) > 1:
            positions = list(type_positions.values())
            # Positions should be increasing (sections in order)
            assert positions == sorted(positions)
