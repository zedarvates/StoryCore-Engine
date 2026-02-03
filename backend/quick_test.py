"""Quick test of the feedback proxy without starting a server"""

from fastapi.testclient import TestClient
from backend.feedback_proxy import app
from datetime import datetime

client = TestClient(app)

def test_health():
    """Test health endpoint"""
    response = client.get("/health")
    print(f"Health check: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200

def test_valid_report():
    """Test valid report submission"""
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
    
    response = client.post("/api/v1/report", json=payload)
    print(f"\nValid report: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "issue_url" in response.json()
    assert "issue_number" in response.json()

def test_invalid_short_description():
    """Test invalid report with short description"""
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
            "description": "Short"
        }
    }
    
    response = client.post("/api/v1/report", json=payload)
    print(f"\nShort description: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 422  # Pydantic validation error

def test_minimal_payload():
    """Test minimal valid payload"""
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
    
    response = client.post("/api/v1/report", json=payload)
    print(f"\nMinimal payload: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

if __name__ == "__main__":
    print("="*80)
    print("QUICK TEST - Feedback Proxy Endpoints")
    print("="*80)
    
    try:
        test_health()
        test_valid_report()
        test_invalid_short_description()
        test_minimal_payload()
        
        print("\n" + "="*80)
        print("✓ ALL TESTS PASSED")
        print("="*80)
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
