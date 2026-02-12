#!/usr/bin/env python3
"""
Test script for connection/endpoint tests.
Can be run as standalone script or as pytest tests.

Usage (standalone):
    python backend/test_connection.py
    python backend/test_connection.py --url http://localhost:8001

Usage (pytest):
    pytest backend/test_connection.py -v

Integration tests (require running server):
    pytest backend/test_connection.py -v --integration
"""

import argparse
import json
import sys
from datetime import datetime
from typing import Generator, Optional
from unittest.mock import MagicMock, patch

import pytest

try:
    import requests
except ImportError:
    print("ERROR: requests library not installed")
    print("Install it with: pip install requests")
    sys.exit(1)


# Pytest fixture for server URL
@pytest.fixture(scope="module")
def base_url() -> Generator[str, None, None]:
    """Provide base URL for tests, configurable via --url CLI argument."""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--url", default="http://localhost:8000")
    args, _ = parser.parse_known_args()
    yield args.url


@pytest.fixture
def mock_requests():
    """Provide mocked requests for unit testing without server."""
    with patch('backend.test_connection.requests') as mock:
        yield mock


# ===== UNIT TESTS WITH MOCKS =====

def test_health_endpoint_unit(mock_requests):
    """Unit test for health endpoint with mocked response."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "service": "StoryCore Feedback Proxy",
        "version": "1.0.0",
        "status": "healthy"
    }
    mock_requests.get.return_value = mock_response
    
    # Import the function after patching
    from backend.test_connection import test_health_endpoint
    test_health_endpoint("http://localhost:8000")
    
    mock_requests.get.assert_called_once_with("http://localhost:8000/health", timeout=5)


def test_report_endpoint_unit(mock_requests):
    """Unit test for report endpoint with mocked response."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "success",
        "issue_url": "https://github.com/test/issue/1",
        "issue_number": 1
    }
    mock_requests.post.return_value = mock_response
    
    from backend.test_connection import test_report_endpoint
    test_report_endpoint("http://localhost:8000")
    
    mock_requests.post.assert_called_once()
    call_args = mock_requests.post.call_args
    assert call_args[0][0] == "http://localhost:8000/api/v1/report"
    assert "json" in call_args[1]


def test_invalid_payload_unit(mock_requests):
    """Unit test for invalid payload rejection with mocked response."""
    mock_response = MagicMock()
    mock_response.status_code = 422
    mock_requests.post.return_value = mock_response
    
    from backend.test_connection import test_invalid_payload
    test_invalid_payload("http://localhost:8000")
    
    mock_requests.post.assert_called_once()


# ===== INTEGRATION TESTS (require running server) =====

@pytest.mark.integration
def test_health_endpoint_integration(base_url: str) -> None:
    """Integration test for health endpoint - requires running server."""
    print(f"\nTesting health endpoint: {base_url}/health")
    response = requests.get(f"{base_url}/health", timeout=5)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data.get("service") == "StoryCore Feedback Proxy"
    print("✓ Health check passed")


@pytest.mark.integration  
def test_report_endpoint_integration(base_url: str) -> None:
    """Integration test for report endpoint - requires running server."""
    print(f"\nTesting report endpoint: {base_url}/api/v1/report")
    
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
            "description": "Test report",
            "reproduction_steps": "1. Run test"
        }
    }
    
    response = requests.post(
        f"{base_url}/api/v1/report",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    print("✓ Report submission successful")


@pytest.mark.integration
def test_invalid_payload_integration(base_url: str) -> None:
    """Integration test for invalid payload - requires running server."""
    print(f"\nTesting validation with invalid payload")
    
    invalid_payload = {
        "schema_version": "1.0",
        "report_type": "invalid_type",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    response = requests.post(
        f"{base_url}/api/v1/report",
        json=invalid_payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    assert response.status_code in [400, 422], f"Expected 400 or 422, got {response.status_code}"
    print("✓ Invalid payload correctly rejected")


# ===== STANDALONE SCRIPT FUNCTIONS =====

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
    
    invalid_payload = {
        "schema_version": "1.0",
        "report_type": "invalid_type",
        "timestamp": datetime.utcnow().isoformat()
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
    """Run all tests as standalone script"""
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
    
    all_passed = True
    
    if not test_health_endpoint(args.url):
        all_passed = False
    
    if not test_report_endpoint(args.url):
        all_passed = False
    
    if not test_invalid_payload(args.url):
        all_passed = False
    
    print()
    print("=" * 80)
    if all_passed:
        print("All tests passed!")
        sys.exit(0)
    else:
        print("Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
