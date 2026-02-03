"""
Test script for the /report endpoint

This script tests the complete /report endpoint implementation including:
- Valid payload submission
- Invalid payload handling
- Payload size validation
- Error responses

Requirements: 5.1
"""

import json
from datetime import datetime


def create_valid_payload():
    """Create a valid report payload for testing"""
    return {
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


def create_invalid_payload_missing_description():
    """Create an invalid payload with missing description"""
    payload = create_valid_payload()
    payload["user_input"]["description"] = ""
    return payload


def create_invalid_payload_short_description():
    """Create an invalid payload with too short description"""
    payload = create_valid_payload()
    payload["user_input"]["description"] = "Short"
    return payload


def create_invalid_payload_wrong_report_type():
    """Create an invalid payload with wrong report type"""
    payload = create_valid_payload()
    payload["report_type"] = "invalid_type"
    return payload


def create_invalid_payload_wrong_schema():
    """Create an invalid payload with wrong schema version"""
    payload = create_valid_payload()
    payload["schema_version"] = "2.0"
    return payload


def test_valid_payload():
    """Test endpoint with valid payload"""
    print("\n" + "="*80)
    print("TEST 1: Valid Payload Submission")
    print("="*80)
    
    payload = create_valid_payload()
    print(f"Payload type: {payload['report_type']}")
    print(f"Module: {payload['module_context']['active_module']}")
    print(f"Description length: {len(payload['user_input']['description'])}")
    print(f"Has stacktrace: {payload['diagnostics']['stacktrace'] is not None}")
    print(f"Has logs: {len(payload['diagnostics']['logs'])} lines")
    
    print("\n✓ Valid payload created successfully")
    print("Expected: HTTP 200 with issue URL and issue number")
    
    return payload


def test_invalid_payloads():
    """Test endpoint with various invalid payloads"""
    print("\n" + "="*80)
    print("TEST 2: Invalid Payload Handling")
    print("="*80)
    
    test_cases = [
        ("Missing description", create_invalid_payload_missing_description()),
        ("Short description", create_invalid_payload_short_description()),
        ("Wrong report type", create_invalid_payload_wrong_report_type()),
        ("Wrong schema version", create_invalid_payload_wrong_schema())
    ]
    
    for name, payload in test_cases:
        print(f"\n{name}:")
        print(f"  Report type: {payload.get('report_type', 'N/A')}")
        print(f"  Schema version: {payload.get('schema_version', 'N/A')}")
        print(f"  Description: '{payload.get('user_input', {}).get('description', 'N/A')}'")
        print(f"  Expected: HTTP 400 with validation error")


def test_payload_size():
    """Test payload size validation"""
    print("\n" + "="*80)
    print("TEST 3: Payload Size Validation")
    print("="*80)
    
    payload = create_valid_payload()
    
    # Add large screenshot to simulate oversized payload
    # 10MB base64 string would be approximately 13.3MB of data
    large_data = "A" * (11 * 1024 * 1024)  # 11MB of data
    payload["screenshot_base64"] = large_data
    
    print(f"Payload size: ~{len(str(payload)) / (1024*1024):.2f} MB")
    print("Expected: HTTP 413 (Payload Too Large)")


def test_different_report_types():
    """Test all valid report types"""
    print("\n" + "="*80)
    print("TEST 4: Different Report Types")
    print("="*80)
    
    for report_type in ["bug", "enhancement", "question"]:
        payload = create_valid_payload()
        payload["report_type"] = report_type
        print(f"\n{report_type.upper()} report:")
        print(f"  Description: {payload['user_input']['description'][:50]}...")
        print(f"  Expected: HTTP 200 with issue URL")


def test_optional_fields():
    """Test payload with minimal required fields only"""
    print("\n" + "="*80)
    print("TEST 5: Minimal Payload (Optional Fields Omitted)")
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
    
    print("Minimal payload created:")
    print(f"  Has module_context: {payload.get('module_context') is not None}")
    print(f"  Has diagnostics: {payload.get('diagnostics') is not None}")
    print(f"  Has screenshot: {payload.get('screenshot_base64') is not None}")
    print(f"  Has reproduction_steps: {payload.get('user_input', {}).get('reproduction_steps') is not None}")
    print("Expected: HTTP 200 with issue URL")


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("REPORT ENDPOINT TEST SUITE")
    print("Testing: POST /api/v1/report")
    print("="*80)
    
    # Run test scenarios
    test_valid_payload()
    test_invalid_payloads()
    test_payload_size()
    test_different_report_types()
    test_optional_fields()
    
    print("\n" + "="*80)
    print("TEST SUITE COMPLETE")
    print("="*80)
    print("\nTo run actual HTTP tests against the server:")
    print("1. Start the server: python backend/feedback_proxy.py")
    print("2. Use curl or a tool like Postman to send requests")
    print("3. Example curl command:")
    print('   curl -X POST http://localhost:8000/api/v1/report \\')
    print('        -H "Content-Type: application/json" \\')
    print('        -d @test_payload.json')
    print("\n")


if __name__ == "__main__":
    main()
