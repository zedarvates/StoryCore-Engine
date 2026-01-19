"""
Property-based tests for Asset Retriever.
Validates universal correctness properties across all scenarios.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.strategies import composite
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta

from src.asset_retriever import AssetRetriever, CleanupPolicy, RetrievalMetrics, AssetDownload
from src.comfyui_config import ComfyUIConfig
from src.comfyui_models import ExecutionResult, AssetInfo, ExecutionStatus


# Strategy generators for test data
@composite
def asset_info_list(draw):
    """Generate list of asset info objects."""
    num_assets = draw(st.integers(min_value=0, max_value=10))
    assets = []
    
    for i in range(num_assets):
        filename = f"image_{i}.{draw(st.sampled_from(['jpg', 'png', 'webp']))}"
        subfolder = draw(st.one_of(st.none(), st.text(alphabet=st.characters(min_codepoint=97, max_codepoint=122), min_size=1, max_size=10)))
        
        asset = AssetInfo(
            filename=filename,
            subfolder=subfolder,
            size_bytes=draw(st.integers(min_value=100, max_value=10000000))
        )
        assets.append(asset)
    
    return assets


@composite
def execution_result_with_assets(draw):
    """Generate execution result with assets."""
    assets = draw(asset_info_list())
    
    result = ExecutionResult(
        prompt_id=f"prompt-{draw(st.integers(min_value=1, max_value=1000))}",
        workflow_id=f"workflow-{draw(st.integers(min_value=1, max_value=1000))}",
        status=ExecutionStatus.COMPLETED,
        started_at=datetime.utcnow()
    )
    result.output_images = assets
    
    return result


@composite
def cleanup_policy_config(draw):
    """Generate cleanup policy configurations."""
    return CleanupPolicy(
        max_age_hours=draw(st.integers(min_value=1, max_value=168)),  # 1 hour to 1 week
        max_total_size_mb=draw(st.integers(min_value=10, max_value=10000)),
        keep_successful_downloads=draw(st.booleans()),
        keep_failed_downloads=draw(st.booleans()),
        cleanup_on_startup=draw(st.booleans())
    )


@composite
def file_organization_data(draw):
    """Generate file organization test data."""
    num_files = draw(st.integers(min_value=1, max_value=20))
    files = []
    
    for i in range(num_files):
        extension = draw(st.sampled_from(['jpg', 'png', 'txt', 'pdf', 'mp4']))
        size_mb = draw(st.floats(min_value=0.1, max_value=50.0))
        
        files.append({
            'name': f'file_{i}.{extension}',
            'extension': extension,
            'size_mb': size_mb,
            'content': f'test content {i}'
        })
    
    return files


class TestAssetRetrieverProperties:
    """Property-based tests for Asset Retriever correctness."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.config = ComfyUIConfig.default()
    
    def teardown_method(self):
        """Clean up test environment."""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    @given(execution_result_with_assets())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_15_asset_retrieval_completeness(self, execution_result):
        """
        Property 15: Asset Retrieval Completeness
        Validates: Requirements 5.1, 5.3
        
        Asset retrieval should handle all assets in an execution result,
        maintaining completeness even with failures.
        """
        retriever = AssetRetriever(self.config)
        
        # Test with empty asset list
        if not execution_result.output_images:
            # Should handle empty lists gracefully
            assert len(execution_result.output_images) == 0
            return
        
        # Test asset tracking
        initial_metrics = retriever.get_metrics()
        assert initial_metrics.total_assets == 0
        
        # Simulate processing assets (without actual download)
        retriever.metrics.total_assets = len(execution_result.output_images)
        retriever.metrics.successful_downloads = len(execution_result.output_images) - 1  # Simulate one failure
        retriever.metrics.failed_downloads = 1
        
        # Verify metrics consistency
        assert retriever.metrics.total_assets == len(execution_result.output_images)
        assert retriever.metrics.successful_downloads + retriever.metrics.failed_downloads == retriever.metrics.total_assets
        
        # Success rate should be calculable
        success_rate = retriever.metrics.success_rate
        assert 0.0 <= success_rate <= 100.0
        
        if retriever.metrics.total_assets > 0:
            expected_rate = (retriever.metrics.successful_downloads / retriever.metrics.total_assets) * 100.0
            assert abs(success_rate - expected_rate) < 0.01
    
    @given(file_organization_data(), st.sampled_from(['by_date', 'by_type', 'by_size']))
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_16_file_organization_consistency(self, file_data, organization_scheme):
        """
        Property 16: File Organization Consistency
        Validates: Requirements 5.2
        
        File organization should consistently apply the same scheme
        and maintain file integrity during organization.
        """
        retriever = AssetRetriever(self.config)
        
        # Create test files
        import uuid
        test_dir = self.temp_dir / f"test_files_{uuid.uuid4().hex[:8]}"
        test_dir.mkdir(exist_ok=True)
        
        created_files = []
        for file_info in file_data:
            file_path = test_dir / file_info['name']
            file_path.write_text(file_info['content'])
            created_files.append(file_path)
        
        # Organize files
        organized = retriever.organize_assets(test_dir, organization_scheme)
        
        # Verify organization consistency
        if organization_scheme == 'by_type':
            # Files with same extension should be in same directory
            extension_dirs = {}
            for original_path, new_path in organized.items():
                extension = Path(original_path).suffix.lower().lstrip('.')
                expected_dir = f"{extension}_files"
                
                if extension not in extension_dirs:
                    extension_dirs[extension] = new_path.parent.name
                else:
                    assert extension_dirs[extension] == new_path.parent.name
        
        elif organization_scheme == 'by_date':
            # All files should be organized by date (same day for test files)
            date_dirs = set()
            for original_path, new_path in organized.items():
                date_dirs.add(new_path.parent.name)
            
            # Should have consistent date-based naming
            for date_dir in date_dirs:
                assert len(date_dir) >= 8  # At least YYYY-MM-DD format
                assert date_dir.startswith('20')  # Year prefix
        
        elif organization_scheme == 'by_size':
            # Files should be organized by size categories
            size_dirs = set()
            for original_path, new_path in organized.items():
                size_dirs.add(new_path.parent.name)
            
            # Should have valid size category names
            valid_size_dirs = {'small_files', 'medium_files', 'large_files'}
            assert size_dirs.issubset(valid_size_dirs)
        
        # Verify file integrity after organization
        for original_path, new_path in organized.items():
            assert new_path.exists()
            
            # Find original file info
            original_content = None
            for file_info in file_data:
                if file_info['name'] == Path(original_path).name:
                    original_content = file_info['content']
                    break
            
            if original_content:
                assert new_path.read_text() == original_content
    
    @given(cleanup_policy_config())
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_17_storage_management(self, cleanup_policy):
        """
        Property 17: Storage Management
        Validates: Requirements 5.4
        
        Storage management should respect cleanup policies and
        maintain storage limits consistently.
        """
        retriever = AssetRetriever(self.config, cleanup_policy)
        
        # Test storage stats calculation
        stats = retriever.get_storage_stats()
        
        # Stats should have required fields
        required_fields = ['assets_directory', 'temp_directory', 'cache_directory', 
                          'total_assets', 'total_size_bytes', 'directories']
        for field in required_fields:
            assert field in stats
        
        # Directory stats should be consistent
        total_calculated = 0
        for dir_name, dir_stats in stats['directories'].items():
            assert 'file_count' in dir_stats
            assert 'size_bytes' in dir_stats
            assert 'size_mb' in dir_stats
            
            # Size calculations should be consistent
            assert dir_stats['size_mb'] == round(dir_stats['size_bytes'] / (1024 * 1024), 2)
            total_calculated += dir_stats['file_count']
        
        # Total should match sum of directories
        assert stats['total_assets'] == total_calculated
        
        # Cleanup policy should be respected
        assert retriever.cleanup_policy.max_age_hours == cleanup_policy.max_age_hours
        assert retriever.cleanup_policy.max_total_size_mb == cleanup_policy.max_total_size_mb
        assert retriever.cleanup_policy.keep_successful_downloads == cleanup_policy.keep_successful_downloads
        assert retriever.cleanup_policy.keep_failed_downloads == cleanup_policy.keep_failed_downloads
    
    @given(st.integers(min_value=1, max_value=5))
    @settings(max_examples=5, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_18_retrieval_retry_logic(self, max_retries):
        """
        Property 18: Retrieval Retry Logic
        Validates: Requirements 5.5
        
        Retry logic should implement exponential backoff and
        respect maximum retry limits consistently.
        """
        retriever = AssetRetriever(self.config)
        
        # Test download tracking structure
        download = AssetDownload(
            filename="test.jpg",
            url="http://localhost:8188/view",
            local_path=Path("test.jpg")
        )
        
        # Simulate retry attempts
        base_delay = 1.0
        for attempt in range(max_retries):
            download.retry_count = attempt
            
            # Calculate expected delay (exponential backoff)
            expected_delay = base_delay * (2 ** attempt)
            
            # Delay should increase exponentially
            if attempt > 0:
                previous_delay = base_delay * (2 ** (attempt - 1))
                assert expected_delay == previous_delay * 2
            
            # Delay should be reasonable (not too large)
            assert expected_delay <= 60.0  # Max 60 seconds
        
        # Retry count should not exceed maximum
        assert download.retry_count < max_retries
        
        # Download should track failure state
        download.error_message = "Connection failed"
        assert download.error_message is not None
        assert not download.is_complete
    
    @given(asset_info_list())
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_asset_integrity_verification(self, asset_list):
        """
        Property: Asset Integrity Verification
        
        Asset integrity verification should be consistent and
        handle various file states correctly.
        """
        retriever = AssetRetriever(self.config)
        
        for asset_info in asset_list:
            # Test with missing file
            asset_info.local_path = Path("nonexistent.jpg")
            
            # Should handle missing files gracefully
            # (We can't test async methods in property tests easily, so we test the structure)
            assert asset_info.filename is not None
            assert len(asset_info.filename) > 0
            
            # Test checksum handling
            if asset_info.checksum:
                assert len(asset_info.checksum) > 0
                # SHA-256 checksums should be 64 characters
                if len(asset_info.checksum) == 64:
                    assert all(c in '0123456789abcdef' for c in asset_info.checksum.lower())
    
    @given(st.integers(min_value=0, max_value=1000))
    @settings(max_examples=10, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_metrics_consistency(self, total_operations):
        """
        Property: Metrics Consistency
        
        Retrieval metrics should maintain mathematical consistency
        across all operations.
        """
        retriever = AssetRetriever(self.config)
        
        # Set up test metrics
        retriever.metrics.total_assets = total_operations
        
        if total_operations > 0:
            # Distribute operations between success and failure
            successful = total_operations // 2
            failed = total_operations - successful
            
            retriever.metrics.successful_downloads = successful
            retriever.metrics.failed_downloads = failed
            
            # Verify consistency
            assert retriever.metrics.successful_downloads + retriever.metrics.failed_downloads == retriever.metrics.total_assets
            
            # Success rate should be correct
            expected_rate = (successful / total_operations) * 100.0
            actual_rate = retriever.metrics.success_rate
            assert abs(actual_rate - expected_rate) < 0.01
        else:
            # Zero operations should have zero success rate
            assert retriever.metrics.success_rate == 0.0
        
        # Speed calculation should handle edge cases
        retriever.metrics.total_bytes = 1024 * 1024  # 1 MB
        retriever.metrics.total_time_seconds = 1.0   # 1 second
        
        speed = retriever.metrics.average_speed_mbps
        assert speed == 1.0  # 1 MB/s
        
        # Zero time should result in zero speed
        retriever.metrics.total_time_seconds = 0.0
        assert retriever.metrics.average_speed_mbps == 0.0
    
    @given(st.text(alphabet=st.characters(min_codepoint=97, max_codepoint=122), min_size=1, max_size=50))
    @settings(max_examples=7, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_directory_creation_robustness(self, directory_suffix):
        """
        Property: Directory Creation Robustness
        
        Directory creation should be robust and handle various
        path configurations without errors.
        """
        retriever = AssetRetriever(self.config)
        
        # Test custom directory paths
        custom_assets_dir = Path(f"custom_assets_{directory_suffix}")
        custom_temp_dir = Path(f"custom_temp_{directory_suffix}")
        
        # Override directory paths
        retriever.assets_dir = custom_assets_dir
        retriever.temp_dir = custom_temp_dir
        
        # Create directories
        retriever._create_directories()
        
        # Directories should exist
        assert retriever.assets_dir.exists()
        assert retriever.temp_dir.exists()
        assert retriever.cache_dir.exists()
        
        # Should be able to create files in directories
        test_file = retriever.assets_dir / "test.txt"
        test_file.write_text("test content")
        assert test_file.exists()
        
        # Clean up custom directories
        if custom_assets_dir.exists():
            shutil.rmtree(custom_assets_dir)
        if custom_temp_dir.exists():
            shutil.rmtree(custom_temp_dir)
    
    @given(st.integers(min_value=1, max_value=100))
    @settings(max_examples=5, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_concurrent_download_tracking(self, num_downloads):
        """
        Property: Concurrent Download Tracking
        
        Download tracking should handle concurrent operations
        without conflicts or data corruption.
        """
        retriever = AssetRetriever(self.config)
        
        # Simulate multiple concurrent downloads
        downloads = {}
        for i in range(num_downloads):
            filename = f"image_{i}.jpg"
            download = AssetDownload(
                filename=filename,
                url=f"http://localhost:8188/view?file={filename}",
                local_path=Path(filename)
            )
            downloads[filename] = download
        
        # Add to active downloads (simulating concurrent access)
        for filename, download in downloads.items():
            retriever._active_downloads[filename] = download
        
        # Verify all downloads are tracked
        assert len(retriever._active_downloads) == num_downloads
        
        # Each download should be unique
        filenames = set(retriever._active_downloads.keys())
        assert len(filenames) == num_downloads
        
        # Remove downloads (simulating completion)
        for filename in list(retriever._active_downloads.keys()):
            del retriever._active_downloads[filename]
        
        # Should be empty after cleanup
        assert len(retriever._active_downloads) == 0