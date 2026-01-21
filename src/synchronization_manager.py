"""
Synchronization Manager for StoryCore Engine
Handles real-time synchronization between sequence plans and recordings.
"""

import json
import threading
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class SynchronizationManager:
    """Manages real-time synchronization between sequence plans and recordings."""

    def __init__(self, project_path: Path):
        self.project_path = project_path
        self.sequence_plans_path = project_path / "sequence_plans"
        self.recordings_path = project_path / "recordings"
        self.sync_status = {"enabled": False, "last_sync": None, "status": "idle"}
        self.observer = None
        self.lock = threading.Lock()

        # Ensure directories exist
        self.sequence_plans_path.mkdir(exist_ok=True)
        self.recordings_path.mkdir(exist_ok=True)

    def start_sync(self) -> None:
        """Start real-time synchronization monitoring."""
        with self.lock:
            if self.sync_status["enabled"]:
                return

            self.sync_status["enabled"] = True
            self.sync_status["status"] = "monitoring"
            self.sync_status["last_sync"] = time.time()

            # Start file system observer
            self.observer = Observer()
            event_handler = SyncEventHandler(self)
            self.observer.schedule(event_handler, str(self.sequence_plans_path), recursive=True)
            self.observer.schedule(event_handler, str(self.recordings_path), recursive=True)
            self.observer.start()

    def stop_sync(self) -> None:
        """Stop real-time synchronization monitoring."""
        with self.lock:
            if not self.sync_status["enabled"]:
                self.sync_status["status"] = "stopped"
                return

            self.sync_status["enabled"] = False
            self.sync_status["status"] = "stopped"

            if self.observer:
                self.observer.stop()
                self.observer.join()

    def sync_sequence_plans(self) -> Dict[str, Any]:
        """Synchronize sequence plans with recordings."""
        with self.lock:
            if not self.sync_status["enabled"]:
                return {"success": False, "message": "Synchronization not enabled"}

            self.sync_status["status"] = "syncing"
            self.sync_status["last_sync"] = time.time()

        try:
            # Load sequence plans
            sequence_plans = self._load_sequence_plans()
            
            # Load recordings
            recordings = self._load_recordings()
            
            # Synchronize data
            sync_result = self._synchronize_data(sequence_plans, recordings)
            
            # Save synchronized data
            self._save_synchronized_data(sync_result)
            
            self.sync_status["status"] = "idle"
            return {"success": True, "message": "Synchronization completed", **sync_result}
            
        except Exception as e:
            self.sync_status["status"] = "error"
            return {"success": False, "message": f"Synchronization failed: {str(e)}"}

    def _load_sequence_plans(self) -> List[Dict[str, Any]]:
        """Load sequence plans from files."""
        sequence_plans = []
        
        for plan_file in self.sequence_plans_path.glob("*.json"):
            try:
                with open(plan_file, 'r') as f:
                    plan_data = json.load(f)
                    sequence_plans.append(plan_data)
            except json.JSONDecodeError:
                continue
        
        return sequence_plans

    def _load_recordings(self) -> List[Dict[str, Any]]:
        """Load recordings from files."""
        recordings = []
        
        for recording_file in self.recordings_path.glob("*.json"):
            try:
                with open(recording_file, 'r') as f:
                    recording_data = json.load(f)
                    recordings.append(recording_data)
            except json.JSONDecodeError:
                continue
        
        return recordings

    def _synchronize_data(self, sequence_plans: List[Dict[str, Any]], recordings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Synchronize sequence plans with recordings."""
        synchronized_data = {
            "sequence_plans": [],
            "recordings": [],
            "sync_metadata": {
                "timestamp": time.time(),
                "sequence_plan_count": len(sequence_plans),
                "recording_count": len(recordings)
            }
        }
        
        # Match recordings to sequence plans
        for plan in sequence_plans:
            plan_id = plan.get("plan_id")
            matched_recordings = [r for r in recordings if r.get("plan_id") == plan_id]
            
            # Update plan with recording data
            if matched_recordings:
                plan["recordings"] = matched_recordings
                plan["sync_status"] = "matched"
            else:
                plan["sync_status"] = "unmatched"
            
            synchronized_data["sequence_plans"].append(plan)
        
        # Add unmatched recordings
        plan_ids = {p.get("plan_id") for p in sequence_plans}
        unmatched_recordings = [r for r in recordings if r.get("plan_id") not in plan_ids]
        
        for recording in unmatched_recordings:
            recording["sync_status"] = "unmatched"
            synchronized_data["recordings"].append(recording)
        
        return synchronized_data

    def _save_synchronized_data(self, sync_result: Dict[str, Any]) -> None:
        """Save synchronized data to files."""
        # Save synchronized sequence plans
        for plan in sync_result["sequence_plans"]:
            plan_file = self.sequence_plans_path / f"{plan.get('plan_id', 'unknown')}_synced.json"
            with open(plan_file, 'w') as f:
                json.dump(plan, f, indent=2)
        
        # Save unmatched recordings
        for recording in sync_result["recordings"]:
            recording_file = self.recordings_path / f"{recording.get('recording_id', 'unknown')}_unmatched.json"
            with open(recording_file, 'w') as f:
                json.dump(recording, f, indent=2)
        
        # Save sync metadata
        sync_metadata_file = self.project_path / "sync_metadata.json"
        with open(sync_metadata_file, 'w') as f:
            json.dump(sync_result["sync_metadata"], f, indent=2)

    def get_sync_status(self) -> Dict[str, Any]:
        """Get current synchronization status."""
        with self.lock:
            return self.sync_status.copy()


class SyncEventHandler(FileSystemEventHandler):
    """Handles file system events for synchronization."""

    def __init__(self, sync_manager: SynchronizationManager):
        self.sync_manager = sync_manager

    def on_modified(self, event) -> None:
        """Handle file modification events."""
        if not event.is_directory:
            if self.sync_manager.sync_status["enabled"]:
                # Trigger synchronization when files are modified
                self.sync_manager.sync_sequence_plans()

    def on_created(self, event) -> None:
        """Handle file creation events."""
        if not event.is_directory:
            if self.sync_manager.sync_status["enabled"]:
                # Trigger synchronization when new files are created
                self.sync_manager.sync_sequence_plans()


class RealTimeSyncService:
    """Service for managing real-time synchronization."""

    def __init__(self, project_path: Path):
        self.project_path = project_path
        self.sync_manager = SynchronizationManager(project_path)

    def start_service(self) -> Dict[str, Any]:
        """Start the real-time synchronization service."""
        self.sync_manager.start_sync()
        return {"status": "started", "message": "Real-time synchronization service started"}

    def stop_service(self) -> Dict[str, Any]:
        """Stop the real-time synchronization service."""
        self.sync_manager.stop_sync()
        return {"status": "stopped", "message": "Real-time synchronization service stopped"}

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the synchronization service."""
        return {
            "service_status": "running" if self.sync_manager.sync_status["enabled"] else "stopped",
            "sync_status": self.sync_manager.get_sync_status()
        }

    def trigger_sync(self) -> Dict[str, Any]:
        """Manually trigger synchronization."""
        return self.sync_manager.sync_sequence_plans()