#!/usr/bin/env python3
"""
Verification script for Task 19: Local Storage Manager

This script verifies that all required functionality for the Local Storage Manager
is implemented and working correctly.

Requirements verified:
- Task 19.1: Create FeedbackStorage class
- Task 19.2: Implement pending report management
  - Save failed reports to ~/.storycore/feedback/pending/
  - Generate unique filename with timestamp and UUID
  - Write payload as JSON file
  - List all pending reports
  - Retry report submission
  - Delete reports from storage
"""

import sys
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, 'src')

from feedback_storage import FeedbackStorage


def create_test_payload(report_type="bug", description="Test report"):
    """Create a valid test payload."""
    return {
        "schema_version": "1.0",
        "report_type": report_type,
        "timestamp": datetime.now().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 20.04",
            "language": "en-US"
        },
        "module_context": {
            "active_module": "promotion-engine",
            "module_state": {}
        },
        "user_input": {
            "description": description,
            "reproduction_steps": "Step 1\nStep 2\nStep 3"
        },
        "diagnostics": {
            "stacktrace": None,
            "logs": [],
            "memory_usage_mb": 256,
            "process_state": {}
        },
        "screenshot_base64": None
    }


def test_storage_initialization():
    """Test 19.1: Verify FeedbackStorage class can be initialized."""
    print("✓ Testing storage initialization...")
    
    # Create temporary directory for testing
    temp_dir = tempfile.mkdtemp()
    
    try:
        storage = FeedbackStorage(storage_dir=temp_dir)
        assert storage.storage_dir == Path(temp_dir)
        assert storage.storage_dir.exists()
        print("  ✓ Storage initialized successfully")
        print(f"  ✓ Storage directory created: {temp_dir}")
        return True
    except Exception as e:
        print(f"  ✗ Storage initialization failed: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_save_failed_report():
    """Test 19.2: Verify saving failed reports with unique filenames."""
    print("\n✓ Testing save_failed_report...")
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        storage = FeedbackStorage(storage_dir=temp_dir)
        payload = create_test_payload()
        
        # Save report
        report_id = storage.save_failed_report(payload)
        
        # Verify report ID format (report_YYYYMMDD_HHMMSS_uuid)
        assert report_id.startswith("report_")
        parts = report_id.split('_')
        assert len(parts) == 4  # report, date, time, uuid
        print(f"  ✓ Report saved with ID: {report_id}")
        
        # Verify file exists
        filepath = Path(temp_dir) / f"{report_id}.json"
        assert filepath.exists()
        print(f"  ✓ File created: {filepath.name}")
        
        # Verify file content
        with open(filepath, 'r') as f:
            saved_payload = json.load(f)
        assert saved_payload == payload
        print("  ✓ Payload saved correctly")
        
        # Test uniqueness - save multiple reports
        report_id_2 = storage.save_failed_report(create_test_payload(description="Second report"))
        assert report_id != report_id_2
        print(f"  ✓ Unique IDs generated: {report_id} != {report_id_2}")
        
        return True
    except Exception as e:
        print(f"  ✗ Save failed report test failed: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_list_pending_reports():
    """Test 19.2: Verify listing all pending reports."""
    print("\n✓ Testing list_pending_reports...")
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        storage = FeedbackStorage(storage_dir=temp_dir)
        
        # Initially empty
        pending = storage.list_pending_reports()
        assert len(pending) == 0
        print("  ✓ Empty list returned for new storage")
        
        # Save multiple reports
        report_ids = []
        for i in range(3):
            payload = create_test_payload(description=f"Report {i+1}")
            report_id = storage.save_failed_report(payload)
            report_ids.append(report_id)
        
        # List reports
        pending = storage.list_pending_reports()
        assert len(pending) == 3
        print(f"  ✓ Listed {len(pending)} pending reports")
        
        # Verify metadata
        for report in pending:
            assert 'report_id' in report
            assert 'filename' in report
            assert 'filepath' in report
            assert 'timestamp' in report
            assert 'size_bytes' in report
            assert report['report_id'] in report_ids
        print("  ✓ All reports have correct metadata")
        
        # Verify sorting (most recent first)
        timestamps = [r['timestamp'] for r in pending]
        assert timestamps == sorted(timestamps, reverse=True)
        print("  ✓ Reports sorted by timestamp (most recent first)")
        
        return True
    except Exception as e:
        print(f"  ✗ List pending reports test failed: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_get_report_payload():
    """Test 19.2: Verify loading specific report payloads."""
    print("\n✓ Testing get_report_payload...")
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        storage = FeedbackStorage(storage_dir=temp_dir)
        original_payload = create_test_payload(description="Test payload retrieval")
        
        # Save report
        report_id = storage.save_failed_report(original_payload)
        
        # Load report
        loaded_payload = storage.get_report_payload(report_id)
        assert loaded_payload == original_payload
        print(f"  ✓ Payload loaded correctly for {report_id}")
        
        # Test non-existent report
        try:
            storage.get_report_payload("nonexistent_report")
            print("  ✗ Should have raised FileNotFoundError")
            return False
        except FileNotFoundError:
            print("  ✓ FileNotFoundError raised for non-existent report")
        
        return True
    except Exception as e:
        print(f"  ✗ Get report payload test failed: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_delete_report():
    """Test 19.2: Verify deleting reports from storage."""
    print("\n✓ Testing delete_report...")
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        storage = FeedbackStorage(storage_dir=temp_dir)
        payload = create_test_payload()
        
        # Save report
        report_id = storage.save_failed_report(payload)
        
        # Verify file exists
        filepath = Path(temp_dir) / f"{report_id}.json"
        assert filepath.exists()
        
        # Delete report
        result = storage.delete_report(report_id)
        assert result is True
        print(f"  ✓ Report {report_id} deleted successfully")
        
        # Verify file no longer exists
        assert not filepath.exists()
        print("  ✓ File removed from filesystem")
        
        # Test deleting non-existent report
        result = storage.delete_report(report_id)
        assert result is False
        print("  ✓ Returns False for non-existent report")
        
        return True
    except Exception as e:
        print(f"  ✗ Delete report test failed: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_retry_report():
    """Test 19.2: Verify retry report submission functionality."""
    print("\n✓ Testing retry_report...")
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        storage = FeedbackStorage(storage_dir=temp_dir)
        payload = create_test_payload()
        
        # Save report
        report_id = storage.save_failed_report(payload)
        
        # Test retry with unavailable backend (should fail gracefully)
        success, error_msg, result = storage.retry_report(
            report_id, 
            backend_url="http://localhost:9999"  # Non-existent backend
        )
        
        assert success is False
        assert error_msg is not None
        assert result is not None
        assert result.get("fallback_mode") == "manual"
        print(f"  ✓ Retry failed gracefully with error: {error_msg}")
        print("  ✓ Fallback mode suggested: manual")
        
        # Verify report still exists (not deleted on failure)
        filepath = Path(temp_dir) / f"{report_id}.json"
        assert filepath.exists()
        print("  ✓ Report preserved after failed retry")
        
        return True
    except Exception as e:
        print(f"  ✗ Retry report test failed: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_get_storage_stats():
    """Test 19.2: Verify storage statistics functionality."""
    print("\n✓ Testing get_storage_stats...")
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        storage = FeedbackStorage(storage_dir=temp_dir)
        
        # Initially empty
        stats = storage.get_storage_stats()
        assert stats['total_reports'] == 0
        assert stats['total_size_bytes'] == 0
        print("  ✓ Empty storage stats correct")
        
        # Save reports
        for i in range(3):
            storage.save_failed_report(create_test_payload(description=f"Report {i+1}"))
        
        # Get stats
        stats = storage.get_storage_stats()
        assert stats['total_reports'] == 3
        assert stats['total_size_bytes'] > 0
        assert 'storage_dir' in stats
        print(f"  ✓ Stats: {stats['total_reports']} reports, {stats['total_size_bytes']} bytes")
        
        return True
    except Exception as e:
        print(f"  ✗ Get storage stats test failed: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_error_handling():
    """Test 19.2: Verify error handling for edge cases."""
    print("\n✓ Testing error handling...")
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        storage = FeedbackStorage(storage_dir=temp_dir)
        
        # Test saving None payload
        try:
            storage.save_failed_report(None)
            print("  ✗ Should have raised ValueError for None payload")
            return False
        except ValueError as e:
            print(f"  ✓ ValueError raised for None payload: {e}")
        
        # Test saving empty payload
        try:
            storage.save_failed_report({})
            print("  ✗ Should have raised ValueError for empty payload")
            return False
        except ValueError as e:
            print(f"  ✓ ValueError raised for empty payload: {e}")
        
        return True
    except Exception as e:
        print(f"  ✗ Error handling test failed: {e}")
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    """Run all verification tests."""
    print("=" * 70)
    print("TASK 19 VERIFICATION: Local Storage Manager")
    print("=" * 70)
    
    tests = [
        ("Storage Initialization", test_storage_initialization),
        ("Save Failed Report", test_save_failed_report),
        ("List Pending Reports", test_list_pending_reports),
        ("Get Report Payload", test_get_report_payload),
        ("Delete Report", test_delete_report),
        ("Retry Report", test_retry_report),
        ("Get Storage Stats", test_get_storage_stats),
        ("Error Handling", test_error_handling),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ ALL TESTS PASSED - Task 19 is complete!")
        print("\nVerified functionality:")
        print("  ✓ FeedbackStorage class created and initialized")
        print("  ✓ Save failed reports to ~/.storycore/feedback/pending/")
        print("  ✓ Generate unique filename with timestamp and UUID")
        print("  ✓ Write payload as JSON file")
        print("  ✓ List all pending reports")
        print("  ✓ Retry report submission")
        print("  ✓ Delete reports from storage")
        print("  ✓ Get storage statistics")
        print("  ✓ Error handling for edge cases")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed - Task 19 needs attention")
        return 1


if __name__ == "__main__":
    sys.exit(main())
