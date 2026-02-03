"""
Unit tests for validator integration with the backend proxy.

These tests verify that the JSON schema validator is properly integrated
into the feedback proxy endpoint and correctly validates payloads.

Requirements: 5.2 - Payload Schema Validation
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from backend.feedback_proxy import app


# Create test client
client = TestClient(app)


def create_valid_payload(**overrides):
    """Create a valid report payload with optional field overrides."""
    payload = {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 22.04",
            "language": "en-US"
        },
        "user_input": {
            "description": "This is a test bug report with sufficient length"
        }
    }
    
    # Apply overrides
    for key, value in overrides.items():
        if '.' in key:
            parts = key.split('.')
            current = payload
            for part in parts[:-1]:
                current = current[part]
            current[parts[-1]] = value
        else:
            payload[key] = value
    
    return payload


class TestValidatorIntegration:
    """Tests for JSON schema validator integration with backend."""
    
    def test_valid_payload_accepted(self):
        """Test that valid payloads are accepted by the endpoint."""
        payload = create_valid_payload()
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "issue_url" in data
        assert "issue_number" in data
    
    def test_invalid_python_version_format_rejected(self):
        """Test that invalid Python version format is rejected by JSON schema."""
        payload = create_valid_payload()
        payload["system_info"]["python_version"] = "invalid"
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert data["status"] == "error"
        assert "validation" in data["message"].lower() or "pattern" in data["message"].lower()
    
    def test_invalid_os_platform_rejected(self):
        """Test that invalid OS platform is rejected by JSON schema."""
        payload = create_valid_payload()
        payload["system_info"]["os_platform"] = "InvalidOS"
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert data["status"] == "error"
        assert "validation" in data["message"].lower()
    
    def test_description_too_short_rejected(self):
        """Test that descriptions shorter than 10 characters are rejected."""
        payload = create_valid_payload()
        payload["user_input"]["description"] = "Short"
        
        response = client.post("/api/v1/report", json=payload)
        
        # Should be rejected by Pydantic first (422) or JSON schema (400)
        assert response.status_code in [400, 422]
        data = response.json()
        # Pydantic returns different structure, so check for either
        if "status" in data:
            assert data["status"] == "error"
    
    def test_additional_properties_in_module_state_allowed(self):
        """Test that module_state and process_state allow additional properties.
        
        Note: Pydantic strips extra fields at defined model levels before they reach JSON schema.
        The JSON schema's additionalProperties: false applies to the fields it validates,
        but module_state and process_state are defined as generic objects that allow any properties.
        """
        payload = create_valid_payload()
        # module_state and process_state are generic objects, so they allow extra fields
        payload["module_context"] = {
            "active_module": "test-module",
            "module_state": {
                "custom_field": "this is allowed",
                "another_field": 123
            }
        }
        
        response = client.post("/api/v1/report", json=payload)
        
        # Should be accepted since module_state allows any properties
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
    
    def test_negative_memory_usage_rejected(self):
        """Test that negative memory usage is rejected by JSON schema."""
        payload = create_valid_payload()
        payload["diagnostics"] = {
            "memory_usage_mb": -100
        }
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert data["status"] == "error"
        assert "validation" in data["message"].lower()
    
    def test_invalid_base64_screenshot_rejected(self):
        """Test that invalid base64 screenshots are rejected by JSON schema."""
        payload = create_valid_payload()
        payload["screenshot_base64"] = "This is not base64!@#$%"
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert data["status"] == "error"
        assert "validation" in data["message"].lower()
    
    def test_valid_base64_screenshot_accepted(self):
        """Test that valid base64 screenshots are accepted."""
        payload = create_valid_payload()
        # Valid base64 string (1x1 transparent PNG)
        payload["screenshot_base64"] = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
    
    def test_all_valid_report_types_accepted(self):
        """Test that all valid report types are accepted."""
        for report_type in ["bug", "enhancement", "question"]:
            payload = create_valid_payload(report_type=report_type)
            
            response = client.post("/api/v1/report", json=payload)
            
            assert response.status_code == 200, f"Report type '{report_type}' should be accepted"
            data = response.json()
            assert data["status"] == "success"
    
    def test_all_valid_os_platforms_accepted(self):
        """Test that all valid OS platforms are accepted."""
        valid_platforms = ["Windows", "Darwin", "Linux", "windows", "darwin", "linux", "macos", "macOS"]
        
        for platform in valid_platforms:
            payload = create_valid_payload()
            payload["system_info"]["os_platform"] = platform
            
            response = client.post("/api/v1/report", json=payload)
            
            assert response.status_code == 200, f"OS platform '{platform}' should be accepted"
            data = response.json()
            assert data["status"] == "success"
    
    def test_minimal_payload_accepted(self):
        """Test that minimal payload with only required fields is accepted."""
        payload = {
            "schema_version": "1.0",
            "report_type": "question",
            "timestamp": datetime.utcnow().isoformat() + "Z",
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
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
    
    def test_complete_payload_with_diagnostics_accepted(self):
        """Test that complete payload with all fields is accepted."""
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "Linux",
                "os_version": "Ubuntu 22.04",
                "language": "en-US"
            },
            "module_context": {
                "active_module": "promotion-engine",
                "module_state": {"status": "active"}
            },
            "user_input": {
                "description": "This is a complete bug report with all fields",
                "reproduction_steps": "1. Do this\n2. Do that\n3. See error"
            },
            "diagnostics": {
                "stacktrace": "Traceback (most recent call last):\n  File test.py, line 1",
                "logs": ["Log line 1", "Log line 2"],
                "memory_usage_mb": 256.5,
                "process_state": {"pid": 12345}
            },
            "screenshot_base64": None
        }
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"


class TestHealthEndpoint:
    """Tests for the health check endpoint."""
    
    def test_health_check_returns_200(self):
        """Test that health check endpoint returns 200."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        assert "version" in data
        assert "timestamp" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
