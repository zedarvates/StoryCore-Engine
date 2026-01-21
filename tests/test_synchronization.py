"""
Tests for synchronization functionality.
"""

import json
import time
import tempfile
import shutil
from pathlib import Path
from src.synchronization_manager import SynchronizationManager, RealTimeSyncService


def test_synchronization_manager():
    """Test synchronization manager functionality."""
    
    # Create temporary project directory
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        
        # Initialize synchronization manager
        sync_manager = SynchronizationManager(project_path)
        
        # Test initial state
        assert not sync_manager.sync_status["enabled"]
        assert sync_manager.sync_status["status"] == "idle"
        
        # Start synchronization
        sync_manager.start_sync()
        assert sync_manager.sync_status["enabled"]
        assert sync_manager.sync_status["status"] == "monitoring"
        
        # Create test sequence plan
        sequence_plan = {
            "plan_id": "test_plan_1",
            "name": "Test Sequence Plan",
            "shots": [
                {"shot_id": "shot_1", "description": "Test shot"}
            ]
        }
        
        plan_file = project_path / "sequence_plans" / "test_plan_1.json"
        with open(plan_file, 'w') as f:
            json.dump(sequence_plan, f)
        
        # Create test recording
        recording = {
            "recording_id": "recording_1",
            "plan_id": "test_plan_1",
            "data": "test_data"
        }
        
        recording_file = project_path / "recordings" / "recording_1.json"
        with open(recording_file, 'w') as f:
            json.dump(recording, f)
        
        # Wait for synchronization to process
        time.sleep(2)
        
        # Trigger manual sync
        result = sync_manager.sync_sequence_plans()
        assert result["success"]
        assert result["sync_metadata"]["sequence_plan_count"] == 2  # Original + synced
        assert result["sync_metadata"]["recording_count"] == 1
        
        # Check synchronized files
        synced_plan_file = project_path / "sequence_plans" / "test_plan_1_synced.json"
        assert synced_plan_file.exists()
        
        with open(synced_plan_file, 'r') as f:
            synced_data = json.load(f)
            assert synced_data["sync_status"] == "matched"
            assert len(synced_data["recordings"]) == 1
        
        # Stop synchronization
        sync_manager.stop_sync()
        # Give time for the observer to fully stop
        time.sleep(2)
        # Check status after stopping - the status should be idle when not enabled
        status_after_stop = sync_manager.get_sync_status()
        assert not status_after_stop["enabled"]
        assert status_after_stop["status"] == "idle"
        
        print("✓ Synchronization manager tests passed")


def test_realtime_sync_service():
    """Test real-time synchronization service."""
    
    # Create temporary project directory
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        
        # Initialize sync service
        sync_service = RealTimeSyncService(project_path)
        
        # Test service start
        result = sync_service.start_service()
        assert result["status"] == "started"
        
        # Test service status
        status = sync_service.get_status()
        assert status["service_status"] == "running"
        
        # Test manual sync
        result = sync_service.trigger_sync()
        assert result["success"]
        
        # Test service stop
        result = sync_service.stop_service()
        assert result["status"] == "stopped"
        
        print("✓ Real-time sync service tests passed")


def test_unmatched_recordings():
    """Test handling of unmatched recordings."""
    
    # Create temporary project directory
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir)
        
        # Initialize synchronization manager
        sync_manager = SynchronizationManager(project_path)
        sync_manager.start_sync()
        
        # Create test recording without matching plan
        recording = {
            "recording_id": "orphan_recording",
            "plan_id": "nonexistent_plan",
            "data": "orphan_data"
        }
        
        recording_file = project_path / "recordings" / "orphan_recording.json"
        with open(recording_file, 'w') as f:
            json.dump(recording, f)
        
        # Trigger sync
        result = sync_manager.sync_sequence_plans()
        assert result["success"]
        
        # Check unmatched recording file
        unmatched_file = project_path / "recordings" / "orphan_recording_unmatched.json"
        assert unmatched_file.exists()
        
        with open(unmatched_file, 'r') as f:
            unmatched_data = json.load(f)
            assert unmatched_data["sync_status"] == "unmatched"
        
        sync_manager.stop_sync()
        
        print("✓ Unmatched recordings test passed")


if __name__ == "__main__":
    test_synchronization_manager()
    test_realtime_sync_service()
    test_unmatched_recordings()
    print("\n✓ All synchronization tests passed!")