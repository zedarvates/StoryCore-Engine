"""
Unit tests for payload size validation.

This module tests the comprehensive payload size validation functionality,
including:
- Actual JSON size calculation
- Base64 screenshot size handling
- Size breakdown analysis
- HTTP 413 error responses for oversized payloads

Requirements: 7.2 - Payload Size Limits (max 10MB)
"""

import pytest
import json
import base64
from backend.payload_size_validator import (
    calculate_json_size,
    calculate_screenshot_decoded_size,
    get_payload_size_breakdown,
    validate_payload_size,
    validate_raw_request_size,
    validate_screenshot_size,
    MAX_PAYLOAD_SIZE_MB,
    MAX_PAYLOAD_SIZE_BYTES
)


class TestCalculateJsonSize:
    """Tests for calculate_json_size function"""
    
    def test_empty_payload(self):
        """Test size calculation for empty payload"""
        payload = {}
        size = calculate_json_size(payload)
        assert size == 2  # "{}" is 2 bytes
    
    def test_simple_payload(self):
        """Test size calculation for simple payload"""
        payload = {"key": "value"}
        size = calculate_json_size(payload)
        expected = len('{"key":"value"}')
        assert size == expected

    def test_nested_payload(self):
        """Test size calculation for nested payload"""
        payload = {
            "level1": {
                "level2": {
                    "level3": "deep value"
                }
            }
        }
        size = calculate_json_size(payload)
        json_str = json.dumps(payload, separators=(',', ':'))
        expected = len(json_str.encode('utf-8'))
        assert size == expected
    
    def test_payload_with_unicode(self):
        """Test size calculation with unicode characters"""
        payload = {"message": "Hello World"}
        size = calculate_json_size(payload)
        json_str = json.dumps(payload, separators=(',', ':'))
        expected = len(json_str.encode('utf-8'))
        assert size == expected
    
    def test_payload_with_arrays(self):
        """Test size calculation with arrays"""
        payload = {
            "items": ["item1", "item2", "item3"],
            "numbers": [1, 2, 3, 4, 5]
        }
        size = calculate_json_size(payload)
        json_str = json.dumps(payload, separators=(',', ':'))
        expected = len(json_str.encode('utf-8'))
        assert size == expected


class TestCalculateScreenshotDecodedSize:
    """Tests for calculate_screenshot_decoded_size function"""
    
    def test_none_screenshot(self):
        """Test with None screenshot"""
        size = calculate_screenshot_decoded_size(None)
        assert size == 0
    
    def test_empty_screenshot(self):
        """Test with empty string screenshot"""
        size = calculate_screenshot_decoded_size("")
        assert size == 0
    
    def test_small_screenshot(self):
        """Test with small base64 screenshot"""
        screenshot = "AAAA"
        size = calculate_screenshot_decoded_size(screenshot)
        assert size == 3
    
    def test_screenshot_with_padding(self):
        """Test screenshot with base64 padding"""
        screenshot = "AAAA=="
        size = calculate_screenshot_decoded_size(screenshot)
        assert size == 3
    
    def test_real_image_screenshot(self):
        """Test with actual base64-encoded image"""
        small_png = base64.b64encode(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01').decode('utf-8')
        size = calculate_screenshot_decoded_size(small_png)
        assert size > 0
        assert size < len(small_png)
    
    def test_large_screenshot(self):
        """Test with large screenshot"""
        data = b'x' * (1024 * 1024)
        screenshot = base64.b64encode(data).decode('utf-8')
        size = calculate_screenshot_decoded_size(screenshot)
        assert 1024 * 1024 - 100 < size < 1024 * 1024 + 100


class TestGetPayloadSizeBreakdown:
    """Tests for get_payload_size_breakdown function"""
    
    def test_minimal_payload(self):
        """Test breakdown for minimal payload"""
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Test description"
            }
        }
        breakdown = get_payload_size_breakdown(payload)
        
        assert 'total_bytes' in breakdown
        assert 'total_mb' in breakdown
        assert breakdown['exceeds_limit'] is False
        assert breakdown['screenshot_base64_bytes'] == 0
        assert breakdown['total_bytes'] > 0
    
    def test_payload_with_screenshot(self):
        """Test breakdown with screenshot"""
        screenshot_data = base64.b64encode(b'x' * 1000).decode('utf-8')
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Test description"
            },
            "screenshot_base64": screenshot_data
        }
        breakdown = get_payload_size_breakdown(payload)
        
        assert breakdown['screenshot_base64_bytes'] > 0
        assert breakdown['screenshot_decoded_bytes'] > 0
    
    def test_large_payload_exceeds_limit(self):
        """Test that large payload is detected as exceeding limit"""
        large_data = 'x' * (11 * 1024 * 1024)
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": large_data
            }
        }
        breakdown = get_payload_size_breakdown(payload)
        
        assert breakdown['exceeds_limit'] is True
        assert breakdown['total_mb'] > MAX_PAYLOAD_SIZE_MB


class TestValidatePayloadSize:
    """Tests for validate_payload_size function"""
    
    def test_valid_small_payload(self):
        """Test validation of small valid payload"""
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Test description"
            }
        }
        is_valid, error, breakdown = validate_payload_size(payload)
        
        assert is_valid is True
        assert error is None
        assert breakdown is not None
        assert breakdown['exceeds_limit'] is False
    
    def test_invalid_large_payload(self):
        """Test validation of oversized payload"""
        large_data = 'x' * (11 * 1024 * 1024)
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "1.0.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": large_data
            }
        }
        is_valid, error, breakdown = validate_payload_size(payload)
        
        assert is_valid is False
        assert error is not None
        assert "exceeds maximum allowed size" in error
        assert breakdown['exceeds_limit'] is True


class TestValidateRawRequestSize:
    """Tests for validate_raw_request_size function"""
    
    def test_none_content_length(self):
        """Test with None content length"""
        is_valid, error = validate_raw_request_size(None)
        assert is_valid is True
        assert error is None
    
    def test_valid_small_request(self):
        """Test with small valid request"""
        content_length = 1024
        is_valid, error = validate_raw_request_size(content_length)
        assert is_valid is True
        assert error is None
    
    def test_invalid_oversized_request(self):
        """Test with oversized request"""
        content_length = 11 * 1024 * 1024
        is_valid, error = validate_raw_request_size(content_length)
        assert is_valid is False
        assert error is not None
        assert "exceeds maximum allowed size" in error


class TestValidateScreenshotSize:
    """Tests for validate_screenshot_size function"""
    
    def test_none_screenshot(self):
        """Test with None screenshot"""
        is_valid, error = validate_screenshot_size(None)
        assert is_valid is True
        assert error is None
    
    def test_small_screenshot(self):
        """Test with small screenshot"""
        screenshot = base64.b64encode(b'x' * 1000).decode('utf-8')
        is_valid, error = validate_screenshot_size(screenshot)
        assert is_valid is True
        assert error is None
    
    def test_oversized_screenshot(self):
        """Test with oversized screenshot (over 5MB)"""
        screenshot = base64.b64encode(b'x' * (6 * 1024 * 1024)).decode('utf-8')
        is_valid, error = validate_screenshot_size(screenshot)
        assert is_valid is False
        assert error is not None
        assert "exceeds maximum allowed size" in error
