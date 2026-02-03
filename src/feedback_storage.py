"""
Feedback Storage Module

This module provides local storage functionality for failed feedback report submissions.
When automatic submission to GitHub fails, reports are saved locally and can be retried later.

Storage Location: ~/.storycore/feedback/pending/
File Format: report_{timestamp}_{uuid}.json

Requirements: 8.2 - Local storage on failure with retry capability
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from feedback_error_logger import log_storage_error, log_network_error, log_error


class FeedbackStorage:
    """
    Manages local storage of failed feedback reports.
    
    This class handles saving, listing, retrying, and deleting feedback reports
    that failed to submit automatically to GitHub.
    """
    
    def __init__(self, storage_dir: Optional[str] = None):
        """
        Initialize the FeedbackStorage with a storage directory.
        
        Requirements: 8.3
        
        Args:
            storage_dir: Optional custom storage directory path.
                        Defaults to ~/.storycore/feedback/pending/
        """
        if storage_dir:
            self.storage_dir = Path(storage_dir)
        else:
            self.storage_dir = Path.home() / ".storycore" / "feedback" / "pending"
        
        # Ensure the storage directory exists
        try:
            self._ensure_storage_dir()
        except Exception as e:
            log_storage_error(
                operation="init",
                file_path=str(self.storage_dir),
                error=e,
                context={"action": "storage_initialization_failed"}
            )
            raise
    
    def _ensure_storage_dir(self) -> None:
        """
        Create the storage directory if it doesn't exist.
        
        Requirements: 8.3
        """
        try:
            self.storage_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            log_storage_error(
                operation="create_directory",
                file_path=str(self.storage_dir),
                error=e
            )
            raise IOError(f"Failed to create storage directory {self.storage_dir}: {e}")
    
    def save_failed_report(self, payload: Dict[str, Any]) -> str:
        """
        Save a failed report to local storage.
        
        Generates a unique filename using timestamp and UUID, then writes
        the payload as a JSON file to the pending reports directory.
        
        Requirements: 8.2, 8.3
        
        Args:
            payload: The Report_Payload dictionary to save
            
        Returns:
            str: Unique report ID (filename without extension)
            
        Raises:
            ValueError: If payload is None or empty
            IOError: If file write operation fails
        """
        if not payload:
            error_msg = "Payload cannot be None or empty"
            log_error(
                error_type="ValidationError",
                message=error_msg,
                context={"operation": "save_failed_report"}
            )
            raise ValueError(error_msg)
        
        # Generate unique filename with timestamp and UUID
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]  # Use first 8 chars of UUID for brevity
        report_id = f"report_{timestamp}_{unique_id}"
        filename = f"{report_id}.json"
        filepath = self.storage_dir / filename
        
        try:
            # Write payload as JSON file
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            
            return report_id
        except Exception as e:
            log_storage_error(
                operation="save",
                file_path=str(filepath),
                error=e,
                context={"report_id": report_id}
            )
            raise IOError(f"Failed to save report to {filepath}: {e}")
    
    def list_pending_reports(self) -> List[Dict[str, Any]]:
        """
        Retrieve all unsent reports from local storage.
        
        Requirements: 8.2, 8.3
        
        Returns:
            List[Dict[str, Any]]: List of report metadata dictionaries containing:
                - report_id: Unique identifier
                - filename: Full filename
                - filepath: Absolute path to the file
                - timestamp: Creation timestamp from filename
                - size_bytes: File size in bytes
        """
        pending_reports = []
        
        try:
            # List all JSON files in the storage directory
            for filepath in self.storage_dir.glob("report_*.json"):
                try:
                    # Extract report ID from filename
                    report_id = filepath.stem
                    
                    # Get file metadata
                    stat = filepath.stat()
                    
                    # Extract timestamp from filename (format: report_YYYYMMDD_HHMMSS_uuid)
                    parts = report_id.split('_')
                    timestamp_str = f"{parts[1]}_{parts[2]}" if len(parts) >= 3 else "unknown"
                    
                    pending_reports.append({
                        'report_id': report_id,
                        'filename': filepath.name,
                        'filepath': str(filepath.absolute()),
                        'timestamp': timestamp_str,
                        'size_bytes': stat.st_size
                    })
                except Exception as e:
                    # Log error but continue processing other files
                    log_storage_error(
                        operation="list_file",
                        file_path=str(filepath),
                        error=e,
                        context={"action": "skipping_file"}
                    )
                    continue
            
            # Sort by timestamp (most recent first)
            pending_reports.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return pending_reports
        except Exception as e:
            log_storage_error(
                operation="list",
                file_path=str(self.storage_dir),
                error=e
            )
            raise IOError(f"Failed to list pending reports: {e}")
    
    def get_report_payload(self, report_id: str) -> Dict[str, Any]:
        """
        Load a specific report payload from storage.
        
        Requirements: 8.2, 8.3
        
        Args:
            report_id: Unique identifier of the report
            
        Returns:
            Dict[str, Any]: The report payload
            
        Raises:
            FileNotFoundError: If report doesn't exist
            ValueError: If JSON is invalid
        """
        filepath = self.storage_dir / f"{report_id}.json"
        
        if not filepath.exists():
            error_msg = f"Report {report_id} not found"
            log_storage_error(
                operation="load",
                file_path=str(filepath),
                error=FileNotFoundError(error_msg),
                context={"report_id": report_id}
            )
            raise FileNotFoundError(error_msg)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            log_storage_error(
                operation="load",
                file_path=str(filepath),
                error=e,
                context={"report_id": report_id, "error_type": "invalid_json"}
            )
            raise ValueError(f"Invalid JSON in report {report_id}: {e}")
        except Exception as e:
            log_storage_error(
                operation="load",
                file_path=str(filepath),
                error=e,
                context={"report_id": report_id}
            )
            raise IOError(f"Failed to read report {report_id}: {e}")
    
    def delete_report(self, report_id: str) -> bool:
        """
        Remove a report from local storage.
        
        Requirements: 8.2, 8.3
        
        Args:
            report_id: Unique identifier of the report to delete
            
        Returns:
            bool: True if deletion was successful, False if file didn't exist
            
        Raises:
            IOError: If deletion fails for reasons other than file not existing
        """
        filepath = self.storage_dir / f"{report_id}.json"
        
        if not filepath.exists():
            return False
        
        try:
            filepath.unlink()
            return True
        except Exception as e:
            log_storage_error(
                operation="delete",
                file_path=str(filepath),
                error=e,
                context={"report_id": report_id}
            )
            raise IOError(f"Failed to delete report {report_id}: {e}")
    
    def retry_report(self, report_id: str, backend_url: str = "http://localhost:8000") -> tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Attempt to resend a saved report.
        
        This method loads the report payload and attempts to submit it via:
        1. Automatic Mode (backend proxy to GitHub API)
        2. Manual Mode fallback if backend unavailable
        
        If successful via Automatic Mode, the report is deleted from local storage.
        If fallback to Manual Mode is needed, the report remains in storage.
        
        Requirements: 8.2, 8.3
        
        Args:
            report_id: Unique identifier of the report to retry
            backend_url: URL of the backend proxy service
            
        Returns:
            tuple: (success: bool, error_message: Optional[str], result: Optional[Dict])
                - success: True if submission succeeded
                - error_message: Error description if failed
                - result: Response data from backend (issue_url, issue_number, etc.)
        """
        import requests
        
        # Load the report payload
        try:
            payload = self.get_report_payload(report_id)
        except (FileNotFoundError, ValueError, IOError) as e:
            error_msg = f"Failed to load report {report_id}: {e}"
            log_storage_error(
                operation="retry_load",
                file_path=str(self.storage_dir / f"{report_id}.json"),
                error=e,
                context={"report_id": report_id}
            )
            return False, error_msg, None
        
        # Attempt to submit via Automatic Mode (backend proxy)
        try:
            response = requests.post(
                f"{backend_url}/api/v1/report",
                json=payload,
                timeout=30  # 30 second timeout
            )
            
            if response.status_code == 200:
                # Success - parse response
                result = response.json()
                
                if result.get("status") == "success":
                    # Delete from local storage on success
                    try:
                        self.delete_report(report_id)
                    except Exception as e:
                        log_storage_error(
                            operation="delete_after_retry",
                            file_path=str(self.storage_dir / f"{report_id}.json"),
                            error=e,
                            context={"report_id": report_id, "action": "continuing_despite_delete_failure"}
                        )
                    
                    return True, None, {
                        "issue_url": result.get("issue_url"),
                        "issue_number": result.get("issue_number"),
                        "mode": "automatic"
                    }
                else:
                    # Backend returned error
                    error_msg = result.get("message", "Unknown error")
                    log_network_error(
                        operation="retry_report",
                        url=f"{backend_url}/api/v1/report",
                        error=Exception(error_msg),
                        context={"report_id": report_id, "status": "backend_error"}
                    )
                    return False, error_msg, {"fallback_mode": "manual"}
            
            elif response.status_code == 429:
                # Rate limit exceeded
                error_msg = "Rate limit exceeded. Please try again later."
                log_network_error(
                    operation="retry_report",
                    url=f"{backend_url}/api/v1/report",
                    error=Exception(error_msg),
                    context={"report_id": report_id, "status_code": 429}
                )
                return False, error_msg, {"fallback_mode": "manual"}
            
            elif response.status_code == 413:
                # Payload too large
                error_msg = "Report payload is too large. Please try Manual Mode."
                log_network_error(
                    operation="retry_report",
                    url=f"{backend_url}/api/v1/report",
                    error=Exception(error_msg),
                    context={"report_id": report_id, "status_code": 413}
                )
                return False, error_msg, {"fallback_mode": "manual"}
            
            else:
                # Other error
                error_msg = f"Backend error: {response.status_code} - {response.text}"
                log_network_error(
                    operation="retry_report",
                    url=f"{backend_url}/api/v1/report",
                    error=Exception(error_msg),
                    context={"report_id": report_id, "status_code": response.status_code}
                )
                return False, error_msg, {"fallback_mode": "manual"}
        
        except requests.exceptions.ConnectionError as e:
            # Backend unavailable - suggest Manual Mode fallback
            error_msg = "Backend service unavailable. Please use Manual Mode."
            log_network_error(
                operation="retry_report",
                url=f"{backend_url}/api/v1/report",
                error=e,
                context={"report_id": report_id, "error_type": "connection_error"}
            )
            return False, error_msg, {"fallback_mode": "manual"}
        
        except requests.exceptions.Timeout as e:
            # Request timeout
            error_msg = "Request timeout. Backend service may be overloaded."
            log_network_error(
                operation="retry_report",
                url=f"{backend_url}/api/v1/report",
                error=e,
                context={"report_id": report_id, "error_type": "timeout"}
            )
            return False, error_msg, {"fallback_mode": "manual"}
        
        except Exception as e:
            # Unexpected error
            error_msg = f"Unexpected error: {str(e)}"
            log_error(
                error_type="RetryError",
                message="Unexpected error retrying report",
                context={"report_id": report_id, "backend_url": backend_url},
                exception=e
            )
            return False, error_msg, {"fallback_mode": "manual"}
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the local storage.
        
        Returns:
            Dict[str, Any]: Statistics including:
                - total_reports: Number of pending reports
                - total_size_bytes: Total size of all reports
                - storage_dir: Path to storage directory
                
        Requirements: 8.2
        """
        pending_reports = self.list_pending_reports()
        
        total_size = sum(report['size_bytes'] for report in pending_reports)
        
        return {
            'total_reports': len(pending_reports),
            'total_size_bytes': total_size,
            'storage_dir': str(self.storage_dir.absolute())
        }


# Example usage and testing
if __name__ == "__main__":
    # Create a FeedbackStorage instance
    storage = FeedbackStorage()
    
    # Example payload
    example_payload = {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.now().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux"
        },
        "user_input": {
            "description": "Example bug report",
            "reproduction_steps": "Step 1, Step 2, Step 3"
        }
    }
    
    # Save a report
    print("Saving example report...")
    report_id = storage.save_failed_report(example_payload)
    print(f"Saved report with ID: {report_id}")
    
    # List pending reports
    print("\nListing pending reports...")
    pending = storage.list_pending_reports()
    for report in pending:
        print(f"  - {report['report_id']} ({report['size_bytes']} bytes)")
    
    # Get storage stats
    print("\nStorage statistics:")
    stats = storage.get_storage_stats()
    print(f"  Total reports: {stats['total_reports']}")
    print(f"  Total size: {stats['total_size_bytes']} bytes")
    print(f"  Storage directory: {stats['storage_dir']}")
    
    # Clean up example report
    print(f"\nDeleting example report {report_id}...")
    deleted = storage.delete_report(report_id)
    print(f"Deletion successful: {deleted}")
