"""
Checkpoint 3: Core Infrastructure Validation

This test validates that all core API infrastructure components work together correctly:
- API router can register and route requests
- Request validation works correctly
- Error handling converts exceptions to proper error responses
- Response formatting is consistent
- Middleware integration works
- Services (auth, rate limiting, observability) integrate properly
"""

import pytest
from datetime import datetime
import time

from src.api import (
    APIConfig,
    APIRouter,
    APIResponse,
    ErrorCodes,
    RequestContext,
    BaseAPIHandler,
    AuthenticationService,
    AuthorizationService,
    RateLimitService,
    ObservabilityService,
    User,
    Permission,
    create_auth_middleware,
    create_rate_limit_middleware,
    create_logging_middleware,
)


class TestCoreInfrastructureIntegration:
    """Test that all core infrastructure components work together."""
    
    def test_router_registration_and_routing(self):
        """Test that router can register and route requests correctly."""
        config = APIConfig()
        router = APIRouter(config)
        
        # Register multiple endpoints
        def handler1(params, context):
            return {"endpoint": "handler1", "input": params.get("value")}
        
        def handler2(params, context):
            return {"endpoint": "handler2", "count": params.get("count", 0)}
        
        router.register_endpoint("test.endpoint1", "POST", handler1)
        router.register_endpoint("test.endpoint2", "GET", handler2)
        
        # Verify endpoints are registered
        endpoints = router.list_endpoints()
        assert len(endpoints) == 2
        
        # Route to first endpoint
        response1 = router.route_request(
            path="test.endpoint1",
            method="POST",
            params={"value": "test123"},
        )
        
        assert response1.status == "success"
        assert response1.data["endpoint"] == "handler1"
        assert response1.data["input"] == "test123"
        assert response1.metadata is not None
        assert response1.metadata.api_version == "v1"
        
        # Route to second endpoint
        response2 = router.route_request(
            path="test.endpoint2",
            method="GET",
            params={"count": 42},
        )
        
        assert response2.status == "success"
        assert response2.data["endpoint"] == "handler2"
        assert response2.data["count"] == 42
    
    def test_request_validation_integration(self):
        """Test that request validation works correctly in the router."""
        config = APIConfig()
        router = APIRouter(config)
        
        def handler(params, context):
            return {"name": params["name"], "age": params["age"]}
        
        schema = {
            "required": ["name", "age"],
            "properties": {
                "name": {"type": "string", "minLength": 1},
                "age": {"type": "integer", "minimum": 0, "maximum": 150},
            }
        }
        
        router.register_endpoint(
            path="test.validate",
            method="POST",
            handler=handler,
            schema=schema,
        )
        
        # Test missing required field
        response = router.route_request(
            path="test.validate",
            method="POST",
            params={"name": "John"},
        )
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        assert "age" in response.error.message
        
        # Test invalid type
        response = router.route_request(
            path="test.validate",
            method="POST",
            params={"name": "John", "age": "not a number"},
        )
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        
        # Test constraint violation
        response = router.route_request(
            path="test.validate",
            method="POST",
            params={"name": "John", "age": 200},
        )
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        
        # Test valid request
        response = router.route_request(
            path="test.validate",
            method="POST",
            params={"name": "John", "age": 30},
        )
        
        assert response.status == "success"
        assert response.data["name"] == "John"
        assert response.data["age"] == 30
    
    def test_error_handling_integration(self):
        """Test that error handling converts exceptions correctly."""
        config = APIConfig()
        router = APIRouter(config)
        
        # Handler that raises ValueError
        def value_error_handler(params, context):
            raise ValueError("Invalid input value")
        
        # Handler that raises KeyError
        def key_error_handler(params, context):
            raise KeyError("missing_key")
        
        # Handler that raises generic exception
        def generic_error_handler(params, context):
            raise RuntimeError("Something went wrong")
        
        router.register_endpoint("test.value_error", "POST", value_error_handler)
        router.register_endpoint("test.key_error", "POST", key_error_handler)
        router.register_endpoint("test.generic_error", "POST", generic_error_handler)
        
        # Test ValueError -> VALIDATION_ERROR
        response = router.route_request("test.value_error", "POST", {})
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        assert "Invalid input value" in response.error.message
        
        # Test KeyError -> NOT_FOUND
        response = router.route_request("test.key_error", "POST", {})
        assert response.status == "error"
        assert response.error.code == ErrorCodes.NOT_FOUND
        
        # Test generic exception -> INTERNAL_ERROR
        response = router.route_request("test.generic_error", "POST", {})
        assert response.status == "error"
        assert response.error.code == ErrorCodes.INTERNAL_ERROR
    
    def test_response_consistency(self):
        """Test that all responses follow consistent structure."""
        config = APIConfig()
        router = APIRouter(config)
        
        def success_handler(params, context):
            return {"result": "success"}
        
        def error_handler(params, context):
            raise ValueError("Test error")
        
        router.register_endpoint("test.success", "POST", success_handler)
        router.register_endpoint("test.error", "POST", error_handler)
        
        # Test success response structure
        success_response = router.route_request("test.success", "POST", {})
        assert success_response.status == "success"
        assert success_response.data is not None
        assert success_response.error is None
        assert success_response.metadata is not None
        assert success_response.metadata.request_id is not None
        assert success_response.metadata.api_version == "v1"
        assert success_response.metadata.duration_ms >= 0
        
        # Test error response structure
        error_response = router.route_request("test.error", "POST", {})
        assert error_response.status == "error"
        assert error_response.data is None
        assert error_response.error is not None
        assert error_response.error.code is not None
        assert error_response.error.message is not None
        assert error_response.metadata is not None
        assert error_response.metadata.request_id is not None
        assert error_response.metadata.api_version == "v1"
    
    def test_authentication_middleware_integration(self):
        """Test that authentication middleware integrates correctly."""
        config = APIConfig()
        router = APIRouter(config)
        auth_service = AuthenticationService()
        
        # Register a test user
        user = auth_service.register_user(
            user_id="user123",
            username="testuser",
            password="testpass",
            permissions={Permission("test.endpoint", "execute")},
        )
        
        # Get auth token
        auth_token = auth_service.validate_credentials("testuser", "testpass")
        assert auth_token is not None
        
        # Add auth middleware
        auth_middleware = create_auth_middleware(auth_service)
        router.add_middleware(auth_middleware)
        
        # Register protected endpoint
        def protected_handler(params, context):
            return {
                "user": context.user.username if context.user else None,
                "authenticated": context.user is not None,
            }
        
        router.register_endpoint(
            path="test.protected",
            method="POST",
            handler=protected_handler,
            requires_auth=True,
        )
        
        # Test without auth - should fail
        response = router.route_request("test.protected", "POST", {})
        assert response.status == "error"
        assert response.error.code == ErrorCodes.AUTHENTICATION_REQUIRED
        
        # Test with valid auth - should succeed
        response = router.route_request(
            path="test.protected",
            method="POST",
            params={"Authorization": f"Bearer {auth_token.token}"},
        )
        assert response.status == "success"
        assert response.data["authenticated"] is True
        assert response.data["user"] == "testuser"
        
        # Test with invalid token - should fail
        response = router.route_request(
            path="test.protected",
            method="POST",
            params={"Authorization": "Bearer invalid_token"},
        )
        assert response.status == "error"
        assert response.error.code == ErrorCodes.AUTHENTICATION_REQUIRED
    
    def test_rate_limiting_integration(self):
        """Test that rate limiting integrates correctly."""
        config = APIConfig()
        router = APIRouter(config)
        auth_service = AuthenticationService()
        # Use low limit with no burst to make test predictable
        rate_limit_service = RateLimitService(default_requests_per_minute=3, burst_multiplier=1.0)
        
        # Register user
        user = auth_service.register_user(
            user_id="user123",
            username="testuser",
            password="testpass",
        )
        
        # Get auth token
        auth_token = auth_service.validate_credentials("testuser", "testpass")
        
        # Add middleware
        auth_middleware = create_auth_middleware(auth_service)
        rate_limit_middleware = create_rate_limit_middleware(rate_limit_service)
        router.add_middleware(auth_middleware)
        router.add_middleware(rate_limit_middleware)
        
        # Register endpoint
        def handler(params, context):
            return {"request_count": params.get("count", 0)}
        
        router.register_endpoint("test.rate_limited", "POST", handler)
        
        # Make requests up to the limit (3 requests)
        for i in range(3):
            response = router.route_request(
                path="test.rate_limited",
                method="POST",
                params={
                    "Authorization": f"Bearer {auth_token.token}",
                    "count": i,
                },
            )
            assert response.status == "success", f"Request {i} should succeed"
        
        # Next request should be rate limited
        response = router.route_request(
            path="test.rate_limited",
            method="POST",
            params={"Authorization": f"Bearer {auth_token.token}"},
        )
        assert response.status == "error"
        assert response.error.code == ErrorCodes.RATE_LIMIT_EXCEEDED
        assert response.error.details is not None
        assert "retry_after_seconds" in response.error.details
    
    def test_observability_integration(self):
        """Test that observability service integrates correctly."""
        config = APIConfig()
        router = APIRouter(config)
        observability = ObservabilityService()
        
        # Track if handler was called
        handler_called = False
        
        # Register endpoint
        def handler(params, context):
            nonlocal handler_called
            handler_called = True
            
            # Record metric
            observability.record_metric("test.requests", 1.0)
            
            # Log response (simulating what would happen in production)
            observability.log_response(
                request_id=context.request_id,
                endpoint=context.endpoint,
                method=context.method,
                user_id=None,
                params=params,
                status="success",
                duration_ms=context.get_duration_ms(),
            )
            
            return {"result": "logged"}
        
        router.register_endpoint("test.observable", "POST", handler)
        
        # Make request
        response = router.route_request(
            path="test.observable",
            method="POST",
            params={"test": "value"},
        )
        
        assert response.status == "success"
        assert handler_called, "Handler should have been called"
        
        # Verify logs were recorded
        logs = observability.get_logs(limit=10)
        assert len(logs) > 0, "Logs should have been recorded"
        assert logs[-1].endpoint == "test.observable"
        assert logs[-1].status == "success"
        
        # Verify metrics were recorded
        metrics = observability.get_metrics(metric_name="test.requests")
        assert len(metrics) > 0
        assert metrics[0].value == 1.0
    
    def test_base_handler_integration(self):
        """Test that BaseAPIHandler works correctly with router."""
        config = APIConfig()
        router = APIRouter(config)
        
        class TestHandler(BaseAPIHandler):
            def handle_request(self, params, context):
                # Validate required params
                error = self.validate_required_params(
                    params,
                    ["name"],
                    context,
                )
                if error:
                    return error
                
                # Create success response
                return self.create_success_response(
                    data={"greeting": f"Hello, {params['name']}!"},
                    context=context,
                )
        
        handler = TestHandler(config)
        router.register_endpoint(
            path="test.handler",
            method="POST",
            handler=handler.handle_request,
        )
        
        # Test missing param
        response = router.route_request("test.handler", "POST", {})
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        
        # Test valid request
        response = router.route_request(
            path="test.handler",
            method="POST",
            params={"name": "World"},
        )
        assert response.status == "success"
        assert response.data["greeting"] == "Hello, World!"
    
    def test_end_to_end_request_flow(self):
        """Test complete end-to-end request flow with all components."""
        # Setup
        config = APIConfig()
        router = APIRouter(config)
        auth_service = AuthenticationService()
        rate_limit_service = RateLimitService(default_requests_per_minute=10)
        observability = ObservabilityService()
        
        # Register user
        user = auth_service.register_user(
            user_id="user123",
            username="testuser",
            password="testpass",
            permissions={Permission("test.complete", "execute")},
        )
        
        # Get token
        auth_token = auth_service.validate_credentials("testuser", "testpass")
        
        # Add middleware
        router.add_middleware(create_auth_middleware(auth_service))
        router.add_middleware(create_rate_limit_middleware(rate_limit_service))
        router.add_middleware(create_logging_middleware())
        
        # Register endpoint with validation
        def complete_handler(params, context):
            # Log the request
            observability.log_request(
                request_id=context.request_id,
                endpoint=context.endpoint,
                method=context.method,
                params=params,
                user_id=context.user.user_id if context.user else None,
            )
            
            # Process request
            result = {
                "user": context.user.username,
                "input": params["data"],
                "processed": True,
            }
            
            # Log response
            observability.log_response(
                request_id=context.request_id,
                endpoint=context.endpoint,
                method=context.method,
                user_id=context.user.user_id,
                params=params,
                status="success",
                duration_ms=context.get_duration_ms(),
            )
            
            return result
        
        schema = {
            "required": ["data"],
            "properties": {
                "data": {"type": "string", "minLength": 1},
            }
        }
        
        router.register_endpoint(
            path="test.complete",
            method="POST",
            handler=complete_handler,
            schema=schema,
            requires_auth=True,
        )
        
        # Execute complete request flow
        response = router.route_request(
            path="test.complete",
            method="POST",
            params={
                "Authorization": f"Bearer {auth_token.token}",
                "data": "test input",
            },
        )
        
        # Verify response
        assert response.status == "success"
        assert response.data["user"] == "testuser"
        assert response.data["input"] == "test input"
        assert response.data["processed"] is True
        assert response.metadata is not None
        assert response.metadata.request_id is not None
        
        # Verify observability logs
        logs = observability.get_logs(user_id="user123")
        assert len(logs) > 0
        assert logs[-1].endpoint == "test.complete"
        assert logs[-1].status == "success"


class TestErrorScenarios:
    """Test various error scenarios to ensure proper handling."""
    
    def test_nonexistent_endpoint(self):
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
        assert "endpoint" in response.error.message.lower()
    
    def test_handler_exception(self):
        """Test that handler exceptions are caught and converted."""
        config = APIConfig()
        router = APIRouter(config)
        
        def failing_handler(params, context):
            raise RuntimeError("Handler failed")
        
        router.register_endpoint("test.failing", "POST", failing_handler)
        
        response = router.route_request("test.failing", "POST", {})
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.INTERNAL_ERROR
        assert response.metadata is not None
    
    def test_validation_error_details(self):
        """Test that validation errors include helpful details."""
        config = APIConfig()
        router = APIRouter(config)
        
        def handler(params, context):
            return {}
        
        schema = {
            "required": ["field1", "field2"],
            "properties": {
                "field1": {"type": "string"},
                "field2": {"type": "integer", "minimum": 0},
            }
        }
        
        router.register_endpoint("test.validate", "POST", handler, schema=schema)
        
        # Missing fields
        response = router.route_request("test.validate", "POST", {})
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        assert response.error.details is not None
        assert "missing_fields" in response.error.details
        assert response.error.remediation is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
