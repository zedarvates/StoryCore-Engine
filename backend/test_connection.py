#!/usr/bin/env python3
"""
Simple test script to verify the Feedback Proxy server is running and responding.

Usage:
    python backend/test_connection.py
    python backend/test_connection.py --url http://localhost:8001
"""

import argparse
import json
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    print("ERROR: requests library not installed")
    print("Install it with: pip install requests")
    sys.exit(1)


def test_health_endpoint(base_url: str) -> bool:
    """Test the health check endpoint"""
    print(f"Testing health endpoint: {base_url}/health")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✓ Health check passed")
            print(f"  Service: {data.get('service')}")
            print(f"  Version: {data.get('version')}")
            print(f"  Status: {data.get('status')}")
            return True
        else:
            print(f"✗ Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Connection failed - is the server running?")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def test_report_endpoint(base_url: str) -> bool:
    """Test the report submission endpoint with a sample payload"""
    print(f"\nTesting report endpoint: {base_url}/api/v1/report")
    
    # Create a minimal valid payload
    payload = {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.utcnow().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 20.04",
            "language": "en"
        },
        "user_input": {
            "description": "This is a test report to verify the backend is working correctly.",
            "reproduction_steps": "1. Run test script\n2. Observe results"
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/v1/report",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Report submission successful")
            print(f"  Status: {data.get('status')}")
            print(f"  Issue URL: {data.get('issue_url')}")
            print(f"  Issue Number: {data.get('issue_number')}")
            return True
        else:
            print(f"✗ Report submission failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"  Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"  Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Connection failed - is the server running?")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def test_invalid_payload(base_url: str) -> bool:
    """Test that invalid payloads are rejected"""
    print(f"\nTesting validation with invalid payload")
    
    # Create an invalid payload (missing required fields)
    invalid_payload = {
        "schema_version": "1.0",
        "report_type": "invalid_type",  # Invalid type
        "timestamp": datetime.utcnow().isoformat()
        # Missing system_info and user_input
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/v1/report",
            json=invalid_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 422 or response.status_code == 400:
            print("✓ Invalid payload correctly rejected")
            return True
        else:
            print(f"✗ Expected validation error, got status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def main():
    """Run all tests"""
    parser = argparse.ArgumentParser(
        description="Test the Feedback Proxy server"
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL of the server (default: http://localhost:8000)"
    )
    args = parser.parse_args()
    
    print("=" * 80)
    print("StoryCore-Engine Feedback Proxy - Connection Test")
    print("=" * 80)
    print(f"Testing server at: {args.url}")
    print()
    
    # Run tests
    results = []
    results.append(("Health Check", test_health_endpoint(args.url)))
    results.append(("Report Submission", test_report_endpoint(args.url)))
    results.append(("Validation", test_invalid_payload(args.url)))
    
    # Print summary
    print("\n" + "=" * 80)
    print("Test Summary")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 80)
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
