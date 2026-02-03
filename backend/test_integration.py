"""
Integration tests for the Feedback Proxy Service

This script tests the actual HTTP endpoints by making real requests.
Run the server first with: python backend/feedback_proxy.py

Requirements: 5.1
"""

import requests
import json
from datetime import datetime
import sys


BASE_URL = "http://localhost:8000"


def test_health_check():
    """Test the health check endpoint"""
    print("\n" + "="*80)
    print("TEST: Health Check")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, "Health check should return 200"
        assert response.json()["status"] == "healthy", "Status should be healthy"
        print("✓ Health check passed")
        return True
    except requests.exceptions.ConnectionError:
        print("✗ Connection failed - is the server running?")
        print("  Start server with: python backend/feedback_proxy.py")
        return False
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def test_valid_report():
    """Test submitting a valid report"""
    print("\n" + "="*80)
    print("TEST: Valid Report Submission")
    print("="*80)
    
    payload = {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.utcnow().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 22.04",
            "language": "en-US"
        },
        "module_context": {
            "active_module": "promotion-engine",
            "module_state": {"status": "processing"}
        },
        "user_input": {
            "description": "This is a test bug report with sufficient length to pass validation",
            "reproduction_steps": "1. Open app\n2. Click button\n3. See error"
        },
        "diagnostics": {
            "stacktrace": "Traceback (most recent call last):\n  File test.py, line 10\n    raise Exception('Test')",
            "logs": ["Log line 1", "Log line 2", "Log line 3"],
            "memory_usage_mb": 256.5,
            "process_state": {"cpu_percent": 15.2}
        },
        "screenshot_base64": None
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/report",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "success", "Status should be success"
        assert "issue_url" in data, "Response should contain issue_url"
        assert "issue_number" in data, "Response should contain issue_number"
        assert data["issue_number"] > 0, "Issue number should be positive"
        
        print("✓ Valid report submission passed")
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def test_invalid_report_short_description():
    """Test submitting a report with too short description"""
    print("\n" + "="*80)
    print("TEST: Invalid Report - Short Description")
    print("="*80)
    
    payload = {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.utcnow().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux"
        },
        "user_input": {
            "description": "Short"  # Too short - minimum is 10 characters
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/report",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 422, f"Expected 422 (validation error), got {response.status_code}"
        
        print("✓ Short description validation passed")
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def test_invalid_report_wrong_type():
    """Test submitting a report with invalid report type"""
    print("\n" + "="*80)
    print("TEST: Invalid Report - Wrong Report Type")
    print("="*80)
    
    payload = {
        "schema_version": "1.0",
        "report_type": "invalid_type",  # Should be bug, enhancement, or question
        "timestamp": datetime.utcnow().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux"
        },
        "user_input": {
            "description": "This is a test report with invalid type"
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/report",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 422, f"Expected 422 (validation error), got {response.status_code}"
        
        print("✓ Invalid report type validation passed")
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def test_minimal_payload():
    """Test submitting a minimal payload with only required fields"""
    print("\n" + "="*80)
    print("TEST: Minimal Payload")
    print("="*80)
    
    payload = {
        "schema_version": "1.0",
        "report_type": "question",
        "timestamp": datetime.utcnow().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Windows"
        },
        "user_input": {
            "description": "This is a minimal question with just required fields"
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/report",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "success", "Status should be success"
        
        print("✓ Minimal payload submission passed")
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def test_all_report_types():
    """Test all valid report types"""
    print("\n" + "="*80)
    print("TEST: All Report Types")
    print("="*80)
    
    results = []
    
    for report_type in ["bug", "enhancement", "question"]:
        print(f"\nTesting {report_type} report...")
        
        payload = {
            "schema_version": "1.0",
            "report_type": report_type,
            "timestamp": datetime.utcnow().isoformat(),
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "macOS"
            },
            "user_input": {
                "description": f"This is a test {report_type} report with sufficient length"
            }
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/report",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"  Status Code: {response.status_code}")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert response.json()["status"] == "success"
            
            print(f"  ✓ {report_type} report passed")
            results.append(True)
        except Exception as e:
            print(f"  ✗ {report_type} report failed: {e}")
            results.append(False)
    
    if all(results):
        print("\n✓ All report types passed")
        return True
    else:
        print(f"\n✗ {results.count(False)} report type(s) failed")
        return False


def test_with_full_diagnostics():
    """Test report with complete diagnostic information"""
    print("\n" + "="*80)
    print("TEST: Full Diagnostics")
    print("="*80)
    
    payload = {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.utcnow().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 22.04",
            "language": "en-US"
        },
        "module_context": {
            "active_module": "qa-engine",
            "module_state": {
                "current_panel": 7,
                "total_panels": 9,
                "qa_score": 85.5
            }
        },
        "user_input": {
            "description": "QA engine crashes when analyzing panel 7 with specific image characteristics",
            "reproduction_steps": "1. Generate grid\n2. Promote panels\n3. Run QA on panel 7\n4. Crash occurs"
        },
        "diagnostics": {
            "stacktrace": "Traceback (most recent call last):\n  File 'qa_engine.py', line 89\n    variance = calculate_laplacian(image)\nValueError: Invalid image dimensions",
            "logs": [
                "[INFO] Starting QA analysis",
                "[INFO] Panel 1: PASS (score: 92.3)",
                "[INFO] Panel 2: PASS (score: 88.7)",
                "[ERROR] Panel 7: Analysis failed"
            ],
            "memory_usage_mb": 1024.5,
            "process_state": {
                "cpu_percent": 78.3,
                "threads": 12,
                "open_files": 45
            }
        },
        "screenshot_base64": None
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/report",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["status"] == "success"
        
        print("✓ Full diagnostics submission passed")
        return True
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


def main():
    """Run all integration tests"""
    print("\n" + "="*80)
    print("FEEDBACK PROXY INTEGRATION TEST SUITE")
    print("="*80)
    print(f"Testing server at: {BASE_URL}")
    
    # First check if server is running
    if not test_health_check():
        print("\n" + "="*80)
        print("TESTS ABORTED - Server not running")
        print("="*80)
        print("\nPlease start the server first:")
        print("  python backend/feedback_proxy.py")
        sys.exit(1)
    
    # Run all tests
    tests = [
        test_valid_report,
        test_invalid_report_short_description,
        test_invalid_report_wrong_type,
        test_minimal_payload,
        test_all_report_types,
        test_with_full_diagnostics
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = results.count(True)
    failed = results.count(False)
    total = len(results)
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n✓ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print(f"\n✗ {failed} TEST(S) FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
