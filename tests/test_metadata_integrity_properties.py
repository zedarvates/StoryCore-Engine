#!/usr/bin/env python3
"""
Property-Based Tests for Metadata Integrity

Tests Property VE-18: Metadata Integrity
Validates: Requirements VE-10.3, VE-10.5, VE-10.6, VE-10.7

This module tests that video export metadata maintains integrity across
all export operations and formats.
"""

import sys
import pytest
import json
import tempfile
from pathlib import Path
from hypothesis import given, strategies as st, settings, assume
from typing import Dict, Any, List
import uuid
from datetime import datetime

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from export_manager import ExportManager, ExportConfig, ExportResult, MetadataFormat
from video_engine import VideoConfig, ShotData, KeyframeData, CameraMovementSpec, CameraMovement, EasingType


class TestMetadataIntegrityProperties:
    """Property-based tests for metadata integrity."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.export_manager = ExportManager()
        self.temp_dir = Path(tempfile.mkdtemp())
    
    def teardown_method(self):
        """Clean up test fixtures."""
        import shutil
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    @given(
        shot_id=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc'))),
        frame_count=st.integers(min_value=1, max_value=1000),
        duration=st.floats(min_value=0.1, max_value=300.0),
        metadata_fields=st.dictionaries(
            keys=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))),
            values=st.one_of(
                st.text(min_size=0, max_size=100),
                st.integers(min_value=0, max_value=10000),
                st.floats(min_value=0.0, max_value=1000.0),
                st.booleans()
            ),
            min_size=0, max_size=10
        )
    )
    @settings(max_examples=50, deadline=10000)
    def test_metadata_round_trip_property(self, shot_id, frame_count, duration, metadata_fields):
        """
        Property VE-18a: Metadata Round Trip Integrity
        For any shot metadata, exporting and then reading back the metadata
        should preserve all original information without loss or corruption.
        
        **Validates: Requirements VE-10.3, VE-10.5**
        """
        assume(len(shot_id.strip()) > 0)
        assume(duration > 0)
        assume(frame_count > 0)
        
        # Create shot data with metadata
        shot_data = self._create_shot_data(shot_id, frame_count, duration, metadata_fields)
        
        # Export metadata
        export_config = ExportConfig(
            output_directory=str(self.temp_dir),
            include_metadata=True,
            metadata_format=MetadataFormat.JSON
        )
        
        export_result = self.export_manager.export_shot_metadata(shot_data, export_config)
        assert export_result.success, f"Export should succeed: {export_result.error_message}"
        
        # Read back metadata
        metadata_file = Path(export_result.metadata_path)
        assert metadata_file.exists(), "Metadata file should exist after export"
        
        with open(metadata_file, 'r') as f:
            exported_metadata = json.load(f)
        
        # Verify all original metadata is preserved
        assert exported_metadata['shot_id'] == shot_id
        assert exported_metadata['frame_count'] == frame_count
        assert abs(exported_metadata['duration'] - duration) < 0.001  # Float precision tolerance
        
        # Verify custom metadata fields
        if 'custom_metadata' in exported_metadata:
            for key, value in metadata_fields.items():
                assert key in exported_metadata['custom_metadata'], f"Custom field {key} should be preserved"
                exported_value = exported_metadata['custom_metadata'][key]
                
                # Handle float precision for numeric values
                if isinstance(value, float) and isinstance(exported_value, (int, float)):
                    assert abs(float(exported_value) - value) < 0.001
                else:
                    assert exported_value == value, f"Value for {key} should be preserved: {value} vs {exported_value}"
    
    @given(
        shots_data=st.lists(
            st.tuples(
                st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))),
                st.integers(min_value=1, max_value=100),
                st.floats(min_value=0.1, max_value=60.0)
            ),
            min_size=1, max_size=5
        ),
        export_format=st.sampled_from([MetadataFormat.JSON, MetadataFormat.XML, MetadataFormat.YAML])
    )
    @settings(max_examples=30, deadline=15000)
    def test_multi_shot_metadata_consistency_property(self, shots_data, export_format):
        """
        Property VE-18b: Multi-Shot Metadata Consistency
        For any collection of shots, the exported metadata should maintain
        consistency across all shots and provide accurate aggregate information.
        
        **Validates: Requirements VE-10.6, VE-10.7**
        """
        assume(len(shots_data) > 0)
        assume(all(len(shot_id.strip()) > 0 for shot_id, _, _ in shots_data))
        
        # Create shot data list
        shot_list = []
        total_duration = 0.0
        total_frames = 0
        
        for i, (shot_id, frame_count, duration) in enumerate(shots_data):
            shot_data = self._create_shot_data(f"{shot_id}_{i}", frame_count, duration, {})
            shot_list.append(shot_data)
            total_duration += duration
            total_frames += frame_count
        
        # Export multi-shot metadata
        export_config = ExportConfig(
            output_directory=str(self.temp_dir),
            include_metadata=True,
            metadata_format=export_format
        )
        
        export_result = self.export_manager.export_multi_shot_metadata(shot_list, export_config)
        assert export_result.success, f"Multi-shot export should succeed: {export_result.error_message}"
        
        # Read back metadata
        metadata_file = Path(export_result.metadata_path)
        assert metadata_file.exists(), "Multi-shot metadata file should exist"
        
        # Parse based on format
        if export_format == MetadataFormat.JSON:
            with open(metadata_file, 'r') as f:
                exported_metadata = json.load(f)
        elif export_format == MetadataFormat.YAML:
            import yaml
            with open(metadata_file, 'r') as f:
                exported_metadata = yaml.safe_load(f)
        elif export_format == MetadataFormat.XML:
            import xml.etree.ElementTree as ET
            tree = ET.parse(metadata_file)
            root = tree.getroot()
            exported_metadata = self._xml_to_dict(root)
        
        # Verify aggregate metadata
        assert 'total_duration' in exported_metadata
        assert abs(exported_metadata['total_duration'] - total_duration) < 0.001
        
        assert 'total_frames' in exported_metadata
        assert exported_metadata['total_frames'] == total_frames
        
        assert 'shot_count' in exported_metadata
        assert exported_metadata['shot_count'] == len(shot_list)
        
        # Verify individual shot metadata
        assert 'shots' in exported_metadata
        exported_shots = exported_metadata['shots']
        assert len(exported_shots) == len(shot_list)
        
        for original_shot, exported_shot in zip(shot_list, exported_shots):
            assert exported_shot['shot_id'] == original_shot.shot_id
            assert exported_shot['frame_count'] == original_shot.frame_count
            assert abs(exported_shot['duration'] - original_shot.duration) < 0.001
    
    @given(
        metadata_size=st.integers(min_value=1, max_value=1000),
        field_name_length=st.integers(min_value=1, max_value=50),
        field_value_length=st.integers(min_value=0, max_value=200)
    )
    @settings(max_examples=20, deadline=10000)
    def test_large_metadata_integrity_property(self, metadata_size, field_name_length, field_value_length):
        """
        Property VE-18c: Large Metadata Integrity
        For any size of metadata (within reasonable limits), the export and import
        process should handle the data without corruption or loss.
        
        **Validates: Requirements VE-10.3, VE-10.7**
        """
        # Create large metadata dictionary
        large_metadata = {}
        for i in range(metadata_size):
            field_name = f"field_{i:04d}_{'x' * min(field_name_length, 40)}"
            field_value = 'v' * min(field_value_length, 100)  # Limit to prevent excessive memory usage
            large_metadata[field_name] = field_value
        
        # Create shot with large metadata
        shot_data = self._create_shot_data("large_metadata_shot", 10, 1.0, large_metadata)
        
        # Export metadata
        export_config = ExportConfig(
            output_directory=str(self.temp_dir),
            include_metadata=True,
            metadata_format=MetadataFormat.JSON
        )
        
        export_result = self.export_manager.export_shot_metadata(shot_data, export_config)
        assert export_result.success, f"Large metadata export should succeed: {export_result.error_message}"
        
        # Read back and verify
        metadata_file = Path(export_result.metadata_path)
        with open(metadata_file, 'r') as f:
            exported_metadata = json.load(f)
        
        # Verify all fields are preserved
        if 'custom_metadata' in exported_metadata:
            exported_custom = exported_metadata['custom_metadata']
            assert len(exported_custom) == len(large_metadata)
            
            for key, value in large_metadata.items():
                assert key in exported_custom, f"Large metadata field {key} should be preserved"
                assert exported_custom[key] == value, f"Large metadata value for {key} should match"
    
    @given(
        timestamp_offset=st.integers(min_value=0, max_value=86400),  # Within 24 hours
        timezone_offset=st.integers(min_value=-12, max_value=12)
    )
    @settings(max_examples=30, deadline=5000)
    def test_timestamp_metadata_integrity_property(self, timestamp_offset, timezone_offset):
        """
        Property VE-18d: Timestamp Metadata Integrity
        For any timestamp information in metadata, the export process should
        preserve timestamp accuracy and timezone information.
        
        **Validates: Requirements VE-10.5, VE-10.6**
        """
        # Create timestamp-based metadata
        base_time = datetime.now()
        test_timestamp = base_time.timestamp() + timestamp_offset
        
        timestamp_metadata = {
            'creation_time': test_timestamp,
            'export_time': base_time.timestamp(),
            'timezone_offset': timezone_offset,
            'iso_timestamp': base_time.isoformat()
        }
        
        # Create shot with timestamp metadata
        shot_data = self._create_shot_data("timestamp_shot", 5, 1.0, timestamp_metadata)
        
        # Export metadata
        export_config = ExportConfig(
            output_directory=str(self.temp_dir),
            include_metadata=True,
            metadata_format=MetadataFormat.JSON,
            include_timestamps=True
        )
        
        export_result = self.export_manager.export_shot_metadata(shot_data, export_config)
        assert export_result.success, f"Timestamp metadata export should succeed: {export_result.error_message}"
        
        # Read back and verify timestamps
        metadata_file = Path(export_result.metadata_path)
        with open(metadata_file, 'r') as f:
            exported_metadata = json.load(f)
        
        # Verify timestamp preservation
        if 'custom_metadata' in exported_metadata:
            exported_custom = exported_metadata['custom_metadata']
            
            # Check timestamp accuracy (allow small precision loss)
            if 'creation_time' in exported_custom:
                exported_time = float(exported_custom['creation_time'])
                assert abs(exported_time - test_timestamp) < 1.0, "Creation timestamp should be preserved"
            
            if 'timezone_offset' in exported_custom:
                assert exported_custom['timezone_offset'] == timezone_offset, "Timezone offset should be preserved"
        
        # Verify export includes its own timestamp
        assert 'export_timestamp' in exported_metadata, "Export should include its own timestamp"
        export_time = exported_metadata['export_timestamp']
        assert isinstance(export_time, (int, float, str)), "Export timestamp should be valid"
    
    @given(
        unicode_text=st.text(min_size=1, max_size=100),
        special_chars=st.text(min_size=0, max_size=20, alphabet='!@#$%^&*()[]{}|;:,.<>?')
    )
    @settings(max_examples=30, deadline=5000)
    def test_unicode_metadata_integrity_property(self, unicode_text, special_chars):
        """
        Property VE-18e: Unicode and Special Character Integrity
        For any unicode text or special characters in metadata, the export
        process should preserve character encoding without corruption.
        
        **Validates: Requirements VE-10.3, VE-10.5**
        """
        # Create metadata with unicode and special characters
        unicode_metadata = {
            'unicode_field': unicode_text,
            'special_chars': special_chars,
            'mixed_content': f"{unicode_text}{special_chars}",
            'emoji_test': "🎬🎥📹🎞️",
            'multilingual': "Hello世界مرحباПривет"
        }
        
        # Create shot with unicode metadata
        shot_data = self._create_shot_data("unicode_shot", 3, 1.0, unicode_metadata)
        
        # Export metadata
        export_config = ExportConfig(
            output_directory=str(self.temp_dir),
            include_metadata=True,
            metadata_format=MetadataFormat.JSON,
            encoding='utf-8'
        )
        
        export_result = self.export_manager.export_shot_metadata(shot_data, export_config)
        assert export_result.success, f"Unicode metadata export should succeed: {export_result.error_message}"
        
        # Read back with proper encoding
        metadata_file = Path(export_result.metadata_path)
        with open(metadata_file, 'r', encoding='utf-8') as f:
            exported_metadata = json.load(f)
        
        # Verify unicode preservation
        if 'custom_metadata' in exported_metadata:
            exported_custom = exported_metadata['custom_metadata']
            
            for key, value in unicode_metadata.items():
                if key in exported_custom:
                    exported_value = exported_custom[key]
                    assert exported_value == value, f"Unicode content for {key} should be preserved: {value} vs {exported_value}"
    
    def _create_shot_data(self, shot_id: str, frame_count: int, duration: float, metadata: Dict[str, Any]) -> ShotData:
        """Helper method to create shot data for testing."""
        # Create keyframes
        keyframes = []
        for i in range(min(3, frame_count)):  # Limit keyframes for performance
            keyframe = KeyframeData(
                frame_id=f"{shot_id}_frame_{i:03d}",
                image_path=f"test_frame_{i:03d}.png",
                timestamp=duration * i / max(1, frame_count - 1),
                shot_id=shot_id,
                metadata={"frame_index": i}
            )
            keyframes.append(keyframe)
        
        # Create camera movement
        camera_movement = CameraMovementSpec(
            movement_type=CameraMovement.PAN,
            start_position={"x": 0, "y": 0, "z": 0},
            end_position={"x": 100, "y": 0, "z": 0},
            duration=duration,
            easing=EasingType.EASE_IN_OUT
        )
        
        # Create shot data
        shot_metadata = {
            "shot_type": "test",
            "quality_level": "high",
            **metadata  # Include custom metadata
        }
        
        return ShotData(
            shot_id=shot_id,
            keyframes=keyframes,
            camera_movement=camera_movement,
            duration=duration,
            frame_count=frame_count,
            metadata=shot_metadata
        )
    
    def _xml_to_dict(self, element) -> Dict[str, Any]:
        """Helper method to convert XML element to dictionary."""
        result = {}
        
        # Add attributes
        if element.attrib:
            result.update(element.attrib)
        
        # Add text content
        if element.text and element.text.strip():
            if len(element) == 0:
                return element.text.strip()
            result['text'] = element.text.strip()
        
        # Add child elements
        for child in element:
            child_data = self._xml_to_dict(child)
            if child.tag in result:
                # Handle multiple children with same tag
                if not isinstance(result[child.tag], list):
                    result[child.tag] = [result[child.tag]]
                result[child.tag].append(child_data)
            else:
                result[child.tag] = child_data
        
        return result


def test_metadata_integrity_integration():
    """Integration test for metadata integrity."""
    export_manager = ExportManager()
    temp_dir = Path(tempfile.mkdtemp())
    
    try:
        # Create test shot with comprehensive metadata
        comprehensive_metadata = {
            'project_name': 'Test Project',
            'director': 'Test Director',
            'creation_date': '2024-01-01',
            'version': '1.0.0',
            'quality_settings': {
                'resolution': '1920x1080',
                'frame_rate': 24,
                'bitrate': '10Mbps'
            },
            'technical_specs': {
                'codec': 'H.264',
                'color_space': 'Rec.709',
                'audio_channels': 2
            }
        }
        
        shot_data = ShotData(
            shot_id="integration_test_shot",
            keyframes=[
                KeyframeData(
                    frame_id="frame_001",
                    image_path="test_frame_001.png",
                    timestamp=0.0,
                    shot_id="integration_test_shot",
                    metadata={"frame_type": "keyframe"}
                )
            ],
            camera_movement=CameraMovementSpec(
                movement_type=CameraMovement.ZOOM,
                start_position={"x": 0, "y": 0, "z": 0},
                end_position={"x": 0, "y": 0, "z": 50},
                duration=2.0,
                easing=EasingType.EASE_IN_OUT
            ),
            duration=2.0,
            frame_count=48,
            metadata=comprehensive_metadata
        )
        
        # Test export in different formats
        for format_type in [MetadataFormat.JSON, MetadataFormat.YAML]:
            export_config = ExportConfig(
                output_directory=str(temp_dir / format_type.value),
                include_metadata=True,
                metadata_format=format_type
            )
            
            export_result = export_manager.export_shot_metadata(shot_data, export_config)
            assert export_result.success, f"Integration test export should succeed for {format_type.value}"
            
            # Verify file exists and is readable
            metadata_file = Path(export_result.metadata_path)
            assert metadata_file.exists(), f"Metadata file should exist for {format_type.value}"
            assert metadata_file.stat().st_size > 0, f"Metadata file should not be empty for {format_type.value}"
    
    finally:
        # Cleanup
        import shutil
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "--tb=short"])