"""
Tests for API Foundation Components

Tests the core API infrastructure including:
- Configuration
- Models
- Base handler
- Validator
- Formatter
- Error handler
- Router
"""

import pytest
from datetime import datetime

from src.api import (
    APIConfig,
    APIResponse,
    ErrorDetails,
    ErrorCodes,
    ResponseMetadata,
    RequestContext,
    BaseAPIHandler,
    RequestValidator,
    ResponseFormatter,
    ErrorHandler,
    APIRouter,
)


class TestAPIConfig:
    """Test API configuration."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = APIConfig()
        assert config.version == "v1"
        assert config.host == "localhost"
        assert config.port == 8000
        assert config.enable_rate_limiting is True
    
    def test_config_to_dict(self):
        """Test configuration serialization."""
        config = APIConfig()
        config_dict = config.to_dict()
        assert isinstance(config_dict, dict)
        assert config_dict["version"] == "v1"
        assert config_dict["port"] == 8000


class TestAPIModels:
    """Test API data models."""
    
    def test_error_details(self):
        """Test error details model."""
        error = ErrorDetails(
            code=ErrorCodes.VALIDATION_ERROR,
            message="Test error",
            details={"field": "test"},
            remediation="Fix the test field",
        )
        
        error_dict = error.to_dict()
        assert error_dict["code"] == ErrorCodes.VALIDATION_ERROR
        assert error_dict["message"] == "Test error"
        assert error_dict["details"]["field"] == "test"
        assert error_dict["remediation"] == "Fix the test field"
    
    def test_response_metadata(self):
        """Test response metadata model."""
        metadata = ResponseMetadata(
            request_id="test-123",
            timestamp=datetime.now(),
            duration_ms=42.5,
            api_version="v1",
        )
        
        metadata_dict = metadata.to_dict()
        assert metadata_dict["request_id"] == "test-123"
        assert metadata_dict["duration_ms"] == 42.5
        assert metadata_dict["api_version"] == "v1"
    
    def test_success_response(self):
        """Test success response model."""
        metadata = ResponseMetadata(
            request_id="test-123",
            timestamp=datetime.now(),
            duration_ms=10.0,
            api_version="v1",
        )
        
        response = APIResponse(
            status="success",
            data={"result": "test"},
            metadata=metadata,
        )
        
        response_dict = response.to_dict()
        assert response_dict["status"] == "success"
        assert response_dict["data"]["result"] == "test"
        assert "metadata" in response_dict
    
    def test_error_response(self):
        """Test error response model."""
        error = ErrorDetails(
            code=ErrorCodes.VALIDATION_ERROR,
            message="Test error",
        )
        
        metadata = ResponseMetadata(
            request_id="test-123",
            timestamp=datetime.now(),
            duration_ms=5.0,
            api_version="v1",
        )
        
        response = APIResponse(
            status="error",
            error=error,
            metadata=metadata,
        )
        
        response_dict = response.to_dict()
        assert response_dict["status"] == "error"
        assert response_dict["error"]["code"] == ErrorCodes.VALIDATION_ERROR
        assert "metadata" in response_dict
    
    def test_request_context(self):
        """Test request context."""
        context = RequestContext(endpoint="test.endpoint", method="POST")
        assert context.request_id is not None
        assert context.endpoint == "test.endpoint"
        assert context.method == "POST"
        
        # Duration should be calculable
        duration = context.get_duration_ms()
        assert duration >= 0


class TestBaseAPIHandler:
    """Test base API handler."""
    
    def test_create_success_response(self):
        """Test creating success response."""
        config = APIConfig()
        handler = BaseAPIHandler(config)
        context = RequestContext()
        
        response = handler.create_success_response(
            data={"result": "test"},
            context=context,
        )
        
        assert response.status == "success"
        assert response.data["result"] == "test"
        assert response.metadata is not None
    
    def test_create_error_response(self):
        """Test creating error response."""
        config = APIConfig()
        handler = BaseAPIHandler(config)
        context = RequestContext()
        
        response = handler.create_error_response(
            error_code=ErrorCodes.VALIDATION_ERROR,
            message="Test error",
            context=context,
        )
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        assert response.error.message == "Test error"
    
    def test_validate_required_params(self):
        """Test required parameter validation."""
        config = APIConfig()
        handler = BaseAPIHandler(config)
        context = RequestContext()
        
        # Test with missing params
        params = {"field1": "value1"}
        error = handler.validate_required_params(
            params,
            ["field1", "field2"],
            context,
        )
        
        assert error is not None
        assert error.error.code == ErrorCodes.VALIDATION_ERROR
        assert "field2" in error.error.message
        
        # Test with all params present
        params = {"field1": "value1", "field2": "value2"}
        error = handler.validate_required_params(
            params,
            ["field1", "field2"],
            context,
        )
        
        assert error is None


class TestRequestValidator:
    """Test request validator."""
    
    def test_validate_required_fields(self):
        """Test required field validation."""
        validator = RequestValidator()
        
        schema = {
            "required": ["field1", "field2"],
            "properties": {
                "field1": {"type": "string"},
                "field2": {"type": "integer"},
            }
        }
        
        # Missing field
        params = {"field1": "value"}
        error = validator.validate(params, schema)
        assert error is not None
        assert error.code == ErrorCodes.VALIDATION_ERROR
        
        # All fields present
        params = {"field1": "value", "field2": 42}
        error = validator.validate(params, schema)
        assert error is None
    
    def test_validate_types(self):
        """Test type validation."""
        validator = RequestValidator()
        
        schema = {
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
                "active": {"type": "boolean"},
            }
        }
        
        # Correct types
        params = {"name": "test", "age": 25, "active": True}
        error = validator.validate(params, schema)
        assert error is None
        
        # Wrong type
        params = {"name": "test", "age": "not a number"}
        error = validator.validate(params, schema)
        assert error is not None
        assert error.code == ErrorCodes.VALIDATION_ERROR


class TestResponseFormatter:
    """Test response formatter."""
    
    def test_format_success_response(self):
        """Test formatting success response."""
        formatter = ResponseFormatter()
        
        metadata = ResponseMetadata(
            request_id="test-123",
            timestamp=datetime.now(),
            duration_ms=10.0,
            api_version="v1",
        )
        
        response = APIResponse(
            status="success",
            data={"result": "test"},
            metadata=metadata,
        )
        
        formatted = formatter.format(response)
        assert isinstance(formatted, dict)
        assert formatted["status"] == "success"
        assert formatted["data"]["result"] == "test"
    
    def test_get_http_status_code(self):
        """Test HTTP status code mapping."""
        formatter = ResponseFormatter()
        
        # Success
        response = APIResponse(status="success")
        assert formatter.get_http_status_code(response) == 200
        
        # Pending
        response = APIResponse(status="pending")
        assert formatter.get_http_status_code(response) == 202
        
        # Error
        error = ErrorDetails(code=ErrorCodes.NOT_FOUND, message="Not found")
        response = APIResponse(status="error", error=error)
        assert formatter.get_http_status_code(response) == 404


class TestErrorHandler:
    """Test error handler."""
    
    def test_handle_value_error(self):
        """Test handling ValueError."""
        handler = ErrorHandler()
        context = RequestContext()
        
        exception = ValueError("Invalid value")
        response = handler.handle_exception(exception, context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
    
    def test_handle_key_error(self):
        """Test handling KeyError."""
        handler = ErrorHandler()
        context = RequestContext()
        
        exception = KeyError("missing_key")
        response = handler.handle_exception(exception, context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.NOT_FOUND
    
    def test_create_rate_limit_error(self):
        """Test creating rate limit error."""
        handler = ErrorHandler()
        
        error = handler.create_rate_limit_error(
            limit=60,
            window="minute",
            retry_after=30,
        )
        
        assert error.code == ErrorCodes.RATE_LIMIT_EXCEEDED
        assert error.details["limit"] == 60
        assert error.details["retry_after_seconds"] == 30


class TestAPIRouter:
    """Test API router."""
    
    def test_register_endpoint(self):
        """Test endpoint registration."""
        config = APIConfig()
        router = APIRouter(config)
        
        def test_handler(params, context):
            return {"result": "test"}
        
        router.register_endpoint(
            path="test.endpoint",
            method="POST",
            handler=test_handler,
        )
        
        endpoint = router.get_endpoint("test.endpoint", "POST")
        assert endpoint is not None
        assert endpoint.path == "test.endpoint"
        assert endpoint.method == "POST"
    
    def test_route_request_success(self):
        """Test successful request routing."""
        config = APIConfig()
        router = APIRouter(config)
        
        def test_handler(params, context):
            return {"result": params.get("input", "default")}
        
        router.register_endpoint(
            path="test.endpoint",
            method="POST",
            handler=test_handler,
        )
        
        response = router.route_request(
            path="test.endpoint",
            method="POST",
            params={"input": "test_value"},
        )
        
        assert response.status == "success"
        assert response.data["result"] == "test_value"
    
    def test_route_request_not_found(self):
        """Test routing to non-existent endpoint."""
        config = APIConfig()
        router = APIRouter(config)
        
        response = router.route_request(
            path="nonexistent.endpoint",
            method="POST",
            params={},
        )
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.NOT_FOUND
    
    def test_route_request_with_validation(self):
        """Test request routing with validation."""
        config = APIConfig()
        router = APIRouter(config)
        
        def test_handler(params, context):
            return {"result": params["name"]}
        
        schema = {
            "required": ["name"],
            "properties": {
                "name": {"type": "string"}
            }
        }
        
        router.register_endpoint(
            path="test.endpoint",
            method="POST",
            handler=test_handler,
            schema=schema,
        )
        
        # Missing required field
        response = router.route_request(
            path="test.endpoint",
            method="POST",
            params={},
        )
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        
        # Valid request
        response = router.route_request(
            path="test.endpoint",
            method="POST",
            params={"name": "test"},
        )
        
        assert response.status == "success"
        assert response.data["result"] == "test"
    
    def test_list_endpoints(self):
        """Test listing all endpoints."""
        config = APIConfig()
        router = APIRouter(config)
        
        def handler1(params, context):
            return {}
        
        def handler2(params, context):
            return {}
        
        router.register_endpoint("endpoint1", "POST", handler1)
        router.register_endpoint("endpoint2", "GET", handler2)
        
        endpoints = router.list_endpoints()
        assert len(endpoints) == 2
        assert any(e.path == "endpoint1" for e in endpoints)
        assert any(e.path == "endpoint2" for e in endpoints)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
