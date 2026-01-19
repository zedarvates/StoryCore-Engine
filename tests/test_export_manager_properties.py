#!/usr/bin/env python3
"""
Property-based tests for Export Manager.
Tests universal properties that should hold for export operations.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from export_manager import (
    ExportManager, ExportFormat, OrganizationStructure, ExportSettings,
    FrameExportInfo, ExportManifest
)


# Strategy generators for property-based testing
@composite
def valid_frame_sequence(draw):
    """Generate valid frame sequences for testing."""
    num_frames = draw(st.integers(min_value=2, max_value=8))  # Small for performance
    height = draw(st.integers(min_value=20, max_value=50))
    width = draw(st.integers(min_value=20, max_value=50))
    
    frames = []
    base_color = draw(st.integers(min_value=50, max_value=200))
    
    for i in range(num_frames):
        # Create frame with gradual changes
        color_shift = i * 5
        frame = [[[base_color + color_shift, base_color + color_shift + 10, base_color + color_shift + 20] 
                 for _ in range(width)] for _ in range(height)]
        frames.append(frame)
    
    return frames


@composite
def valid_export_settings(draw):
    """Generate valid export settings."""
    return ExportSettings(
        output_format=draw(st.sampled_from(list(ExportFormat))),
        organization=draw(st.sampled_from(list(OrganizationStructure))),
        include_metadata=draw(st.booleans()),
        include_timeline=draw(st.booleans()),
        include_qa_reports=draw(st.booleans()),
        compress_output=draw(st.booleans()),
        quality_level=draw(st.integers(min_value=1, max_value=100)),
        frame_naming_pattern=draw(st.sampled_from(["frame_{index:06d}", "img_{index:04d}", "f{index:03d}"])),
        metadata_format=draw(st.sampled_from(["json", "xml", "yaml"]))
    )


class TestExportManagerProperties:
    """Property-based tests for Export Manager."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.export_manager = ExportManager(base_export_path=self.temp_dir)
    
    def teardown_method(self):
        """Clean up test environment."""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    @given(valid_frame_sequence(), valid_export_settings())
    @settings(max_examples=5, deadline=4000, suppress_health_check=[HealthCheck.too_slow])
    def test_property_ve_16_export_completeness(self, frames, settings):
        """
        Property VE-16: Export Completeness
        For any valid frame sequence and settings, export should be complete
        and contain all expected files and metadata.
        **Validates: Requirements VE-4.1, VE-4.2, VE-7.5**
        """
        project_name = "test_project"
        
        # Export frame sequence
        manifest = self.export_manager.export_frame_sequence(
            frames=frames,
            project_name=project_name,
            settings=settings
        )
        
        # Verify manifest structure
        assert isinstance(manifest, ExportManifest), f"Invalid manifest type: {type(manifest)}"
        assert manifest.export_id.startswith(project_name), f"Invalid export ID: {manifest.export_id}"
        assert manifest.frame_count == len(frames), f"Frame count mismatch: {manifest.frame_count} != {len(frames)}"
        assert manifest.settings == settings, "Settings mismatch in manifest"
        assert len(manifest.exported_frames) == len(frames), f"Exported frames count mismatch: {len(manifest.exported_frames)} != {len(frames)}"
        
        # Verify export path exists
        assert manifest.export_path.exists(), f"Export path does not exist: {manifest.export_path}"
        assert manifest.export_path.is_dir(), f"Export path is not a directory: {manifest.export_path}"
        
        # Verify frame exports
        for i, frame_info in enumerate(manifest.exported_frames):
            assert isinstance(frame_info, FrameExportInfo), f"Invalid frame info type: {type(frame_info)}"
            assert frame_info.frame_index == i, f"Frame index mismatch: {frame_info.frame_index} != {i}"
            assert frame_info.timestamp >= 0.0, f"Invalid timestamp: {frame_info.timestamp}"
            
            # Check if frame file exists (as JSON in our mock implementation)
            frame_file = frame_info.filepath.with_suffix('.json')
            assert frame_file.exists(), f"Frame file does not exist: {frame_file}"
        
        # Verify metadata files if enabled
        if settings.include_metadata:
            assert len(manifest.metadata_files) > 0, "No metadata files exported when enabled"
            
            for metadata_file in manifest.metadata_files:
                full_path = manifest.export_path / metadata_file
                assert full_path.exists(), f"Metadata file does not exist: {full_path}"
        
        # Verify manifest file exists
        manifest_file = manifest.export_path / "export_manifest.json"
        assert manifest_file.exists(), f"Manifest file does not exist: {manifest_file}"
    
    @given(valid_frame_sequence())
    @settings(max_examples=5, deadline=3000)
    def test_property_ve_17_file_organization_consistency(self, frames):
        """
        Property VE-17: File Organization Consistency
        For any frame sequence, file organization should be consistent
        with the specified organization structure.
        **Validates: Requirements VE-10.1, VE-10.2**
        """
        project_name = "test_org"
        
        # Test different organization structures
        for org_structure in [OrganizationStructure.FLAT, OrganizationStructure.PROFESSIONAL, OrganizationStructure.HIERARCHICAL]:
            settings = ExportSettings(
                output_format=ExportFormat.PNG,
                organization=org_structure,
                include_metadata=True,
                include_timeline=False,
                include_qa_reports=False,
                compress_output=False,
                quality_level=95,
                frame_naming_pattern="frame_{index:06d}",
                metadata_format="json"
            )
            
            manifest = self.export_manager.export_frame_sequence(
                frames=frames,
                project_name=f"{project_name}_{org_structure.value}",
                settings=settings
            )
            
            # Verify organization-specific structure
            if org_structure == OrganizationStructure.PROFESSIONAL:
                assert (manifest.export_path / "frames").exists(), "Professional structure missing frames directory"
                assert (manifest.export_path / "metadata").exists(), "Professional structure missing metadata directory"
                assert (manifest.export_path / "timeline").exists(), "Professional structure missing timeline directory"
                assert (manifest.export_path / "qa_reports").exists(), "Professional structure missing qa_reports directory"
                assert (manifest.export_path / "documentation").exists(), "Professional structure missing documentation directory"
            
            elif org_structure == OrganizationStructure.HIERARCHICAL:
                assert (manifest.export_path / "video" / "frames").exists(), "Hierarchical structure missing video/frames directory"
                assert (manifest.export_path / "video" / "metadata").exists(), "Hierarchical structure missing video/metadata directory"
                assert (manifest.export_path / "audio").exists(), "Hierarchical structure missing audio directory"
                assert (manifest.export_path / "documentation").exists(), "Hierarchical structure missing documentation directory"
            
            # FLAT structure should have files directly in export directory
            elif org_structure == OrganizationStructure.FLAT:
                # Should have frame files directly in export directory
                frame_files = list(manifest.export_path.glob("*.json"))  # Our mock frames are JSON
                assert len(frame_files) > 0, "Flat structure missing frame files in root"
            
            # Verify file structure documentation
            assert "file_structure" in manifest.file_structure, "Missing file structure documentation"
            assert manifest.file_structure["type"] == "directory", "Root should be directory in file structure"
    
    @given(valid_frame_sequence())
    @settings(max_examples=5, deadline=3000)
    def test_property_ve_18_metadata_integrity(self, frames):
        """
        Property VE-18: Metadata Integrity
        For any frame sequence, exported metadata should be complete
        and maintain referential integrity.
        **Validates: Requirements VE-10.3, VE-10.5, VE-10.6, VE-10.7**
        """
        project_name = "test_metadata"
        
        # Create test timeline and QA data
        timeline_data = {
            "frame_rate": 24,
            "total_duration": len(frames) / 24.0,
            "sync_markers": [{"time": 0.0, "type": "start"}]
        }
        
        qa_reports = [
            {
                "overall_score": 0.85,
                "detected_issues": [],
                "recommendations": ["Test recommendation"],
                "processing_time": 0.1
            }
        ]
        
        settings = ExportSettings(
            output_format=ExportFormat.PNG,
            organization=OrganizationStructure.PROFESSIONAL,
            include_metadata=True,
            include_timeline=True,
            include_qa_reports=True,
            compress_output=False,
            quality_level=95,
            frame_naming_pattern="frame_{index:06d}",
            metadata_format="json"
        )
        
        manifest = self.export_manager.export_frame_sequence(
            frames=frames,
            project_name=project_name,
            settings=settings,
            timeline_data=timeline_data,
            qa_reports=qa_reports
        )
        
        # Verify metadata completeness
        assert len(manifest.metadata_files) >= 2, f"Insufficient metadata files: {len(manifest.metadata_files)}"
        
        # Check frame manifest exists and is valid
        frame_manifest_path = manifest.export_path / "metadata" / "frame_manifest.json"
        assert frame_manifest_path.exists(), "Frame manifest missing"
        
        import json
        with open(frame_manifest_path, 'r') as f:
            frame_manifest = json.load(f)
        
        assert frame_manifest["total_frames"] == len(frames), "Frame manifest frame count mismatch"
        assert len(frame_manifest["frames"]) == len(frames), "Frame manifest frames list mismatch"
        
        # Verify frame metadata integrity
        for i, frame_data in enumerate(frame_manifest["frames"]):
            assert frame_data["index"] == i, f"Frame index mismatch in metadata: {frame_data['index']} != {i}"
            assert "filename" in frame_data, f"Missing filename in frame {i} metadata"
            assert "timestamp" in frame_data, f"Missing timestamp in frame {i} metadata"
        
        # Verify timeline data if included
        if timeline_data:
            timeline_file = manifest.export_path / "timeline" / "timeline.json"
            assert timeline_file.exists(), "Timeline file missing"
            
            with open(timeline_file, 'r') as f:
                exported_timeline = json.load(f)
            
            assert exported_timeline["frame_rate"] == timeline_data["frame_rate"], "Timeline frame rate mismatch"
            assert exported_timeline["total_duration"] == timeline_data["total_duration"], "Timeline duration mismatch"
        
        # Verify QA reports if included
        if qa_reports:
            qa_summary_file = manifest.export_path / "qa_reports" / "qa_summary.json"
            assert qa_summary_file.exists(), "QA summary file missing"
            
            with open(qa_summary_file, 'r') as f:
                qa_summary = json.load(f)
            
            assert qa_summary["total_reports"] == len(qa_reports), "QA summary report count mismatch"
    
    @given(valid_frame_sequence(), valid_export_settings())
    @settings(max_examples=5, deadline=3000)
    def test_property_ve_19_export_reproducibility(self, frames, settings):
        """
        Property VE-19: Export Reproducibility
        For identical inputs, exports should produce consistent results
        and be reproducible.
        **Validates: Requirements VE-4.8, VE-10.8**
        """
        project_name = "test_repro"
        
        # Export same sequence twice
        manifest1 = self.export_manager.export_frame_sequence(
            frames=frames,
            project_name=f"{project_name}_1",
            settings=settings
        )
        
        manifest2 = self.export_manager.export_frame_sequence(
            frames=frames,
            project_name=f"{project_name}_2",
            settings=settings
        )
        
        # Verify consistent structure
        assert manifest1.frame_count == manifest2.frame_count, "Frame count inconsistency"
        assert manifest1.total_duration == manifest2.total_duration, "Duration inconsistency"
        assert manifest1.settings.output_format == manifest2.settings.output_format, "Format inconsistency"
        assert manifest1.settings.organization == manifest2.settings.organization, "Organization inconsistency"
        
        # Verify consistent frame information
        assert len(manifest1.exported_frames) == len(manifest2.exported_frames), "Exported frames count inconsistency"
        
        for frame1, frame2 in zip(manifest1.exported_frames, manifest2.exported_frames):
            assert frame1.frame_index == frame2.frame_index, "Frame index inconsistency"
            assert frame1.timestamp == frame2.timestamp, "Frame timestamp inconsistency"
            # Filenames will differ due to different project names, but pattern should be same
            assert frame1.filename.split('_')[0] == frame2.filename.split('_')[0], "Frame naming pattern inconsistency"
    
    @given(st.integers(min_value=1, max_value=5))
    @settings(max_examples=5, deadline=2500)
    def test_property_ve_20_manifest_loading_consistency(self, num_frames):
        """
        Property VE-20: Manifest Loading Consistency
        For any exported sequence, the manifest should be loadable
        and contain consistent information.
        **Validates: Requirements VE-10.7, VE-10.8**
        """
        # Create test frames
        frames = [[[100, 150, 200] for _ in range(30)] for _ in range(30)] * num_frames
        
        project_name = "test_load"
        settings = ExportSettings(
            output_format=ExportFormat.PNG,
            organization=OrganizationStructure.PROFESSIONAL,
            include_metadata=True,
            include_timeline=False,
            include_qa_reports=False,
            compress_output=False,
            quality_level=95,
            frame_naming_pattern="frame_{index:06d}",
            metadata_format="json"
        )
        
        # Export sequence
        original_manifest = self.export_manager.export_frame_sequence(
            frames=frames,
            project_name=project_name,
            settings=settings
        )
        
        # Load manifest back
        loaded_manifest = self.export_manager.load_manifest(original_manifest.export_path)
        
        assert loaded_manifest is not None, "Failed to load manifest"
        
        # Verify consistency
        assert loaded_manifest.export_id == original_manifest.export_id, "Export ID mismatch"
        assert loaded_manifest.frame_count == original_manifest.frame_count, "Frame count mismatch"
        assert loaded_manifest.total_duration == original_manifest.total_duration, "Duration mismatch"
        assert loaded_manifest.settings.output_format == original_manifest.settings.output_format, "Format mismatch"
        assert loaded_manifest.settings.organization == original_manifest.settings.organization, "Organization mismatch"
        assert len(loaded_manifest.exported_frames) == len(original_manifest.exported_frames), "Exported frames count mismatch"


def test_export_manager_basic_functionality():
    """Test basic functionality of export manager."""
    with tempfile.TemporaryDirectory() as temp_dir:
        export_manager = ExportManager(base_export_path=Path(temp_dir))
        
        # Create simple test frames
        frames = []
        for i in range(3):
            frame = [[[100 + i * 10, 150, 200] for _ in range(20)] for _ in range(20)]
            frames.append(frame)
        
        # Test export
        manifest = export_manager.export_frame_sequence(
            frames=frames,
            project_name="test_basic"
        )
        
        assert manifest.frame_count == 3
        assert manifest.total_duration > 0.0
        assert len(manifest.exported_frames) == 3
        assert manifest.export_path.exists()
        assert manifest.export_path.is_dir()
        
        # Test manifest loading
        loaded_manifest = export_manager.load_manifest(manifest.export_path)
        if loaded_manifest is None:
            # Debug: check what files exist
            print(f"Export path: {manifest.export_path}")
            print(f"Files in export path: {list(manifest.export_path.iterdir())}")
            manifest_file = manifest.export_path / "export_manifest.json"
            print(f"Manifest file exists: {manifest_file.exists()}")
            if manifest_file.exists():
                with open(manifest_file, 'r') as f:
                    content = f.read()
                print(f"Manifest content: {content[:200]}...")
        
        assert loaded_manifest is not None
        assert loaded_manifest.export_id == manifest.export_id
        
        # Test export listing
        exports = export_manager.list_exports()
        assert len(exports) >= 1
        
        print("✓ Basic export manager tests passed")


if __name__ == "__main__":
    # Run basic functionality test
    test_export_manager_basic_functionality()
    
    print("Export manager property tests ready for execution")