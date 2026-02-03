"""
Integration Example: Core Services with API Router

This example demonstrates how to integrate authentication, rate limiting,
and observability services with the API router.
"""

from typing import Any, Dict
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.services.auth import AuthenticationService, AuthorizationService, Permission
from src.api.services.rate_limit import RateLimitService
from src.api.services.observability import ObservabilityService
from src.api.middleware import (
    create_auth_middleware,
    create_rate_limit_middleware,
    create_logging_middleware,
)


def create_test_endpoint_handler(obs_service: ObservabilityService):
    """Create a simple test endpoint handler."""
    def handler(params: Dict[str, Any], context: RequestContext) -> Dict[str, Any]:
        """Test endpoint that echoes back the input."""
        # Record metric
        obs_service.record_metric(
            "endpoint.test.called",
            1,
            {"user": context.user.username if context.user else "anonymous"}
        )
        
        return {
            "message": "Hello from test endpoint!",
            "echo": params.get("message", ""),
            "user": context.user.username if context.user else None,
        }
    
    return handler


def main():
    """Run the integration example."""
    print("=" * 70)
    print("API Router + Core Services Integration Example")
    print("=" * 70)
    
    # 1. Create configuration
    print("\n[1] Creating API configuration...")
    config = APIConfig(
        version="v1",
        enable_auth=True,
        enable_rate_limiting=True,
        rate_limit_requests_per_minute=10,
        log_level="INFO",
    )
    print(f"✓ Config created: auth={config.enable_auth}, rate_limit={config.enable_rate_limiting}")
    
    # 2. Create core services
    print("\n[2] Creating core services...")
    auth_service = AuthenticationService(token_ttl_seconds=3600)
    authz_service = AuthorizationService()
    rate_limit_service = RateLimitService(
        default_requests_per_minute=config.rate_limit_requests_per_minute
    )
    obs_service = ObservabilityService(log_level=config.log_level)
    print("✓ Services created: auth, authz, rate_limit, observability")
    
    # 3. Create API router
    print("\n[3] Creating API router...")
    router = APIRouter(config)
    print("✓ Router created")
    
    # 4. Add middleware
    print("\n[4] Adding middleware...")
    router.add_middleware(create_logging_middleware(config.version))
    router.add_middleware(create_auth_middleware(auth_service))
    router.add_middleware(create_rate_limit_middleware(rate_limit_service, config.version))
    print("✓ Middleware added: logging, auth, rate_limit")
    
    # 5. Register test endpoint
    print("\n[5] Registering test endpoint...")
    router.register_endpoint(
        path="storycore.test.echo",
        method="POST",
        handler=create_test_endpoint_handler(obs_service),
        requires_auth=True,
        description="Test endpoint that echoes input",
    )
    print("✓ Endpoint registered: storycore.test.echo")
    
    # 6. Register a user
    print("\n[6] Registering test user...")
    user = auth_service.register_user(
        user_id="test_user_001",
        username="testuser",
        password="testpass",
        email="test@example.com",
        permissions={
            Permission("storycore.test", "execute"),
        }
    )
    print(f"✓ User registered: {user.username}")
    
    # 7. Authenticate and get token
    print("\n[7] Authenticating user...")
    token = auth_service.validate_credentials("testuser", "testpass")
    print(f"✓ Token obtained: {token.token[:20]}...")
    
    # 8. Test successful request
    print("\n[8] Testing successful authenticated request...")
    context = RequestContext()
    response = router.route_request(
        path="storycore.test.echo",
        method="POST",
        params={
            "Authorization": f"Bearer {token.token}",
            "message": "Hello, API!",
        },
        context=context,
    )
    print(f"✓ Response status: {response.status}")
    print(f"  Data: {response.data}")
    print(f"  Duration: {response.metadata.duration_ms:.2f}ms")
    
    # 9. Test request without auth
    print("\n[9] Testing request without authentication...")
    context = RequestContext()
    response = router.route_request(
        path="storycore.test.echo",
        method="POST",
        params={"message": "No auth"},
        context=context,
    )
    print(f"✓ Response status: {response.status}")
    print(f"  Error code: {response.error.code}")
    print(f"  Error message: {response.error.message}")
    
    # 10. Test rate limiting
    print("\n[10] Testing rate limiting (making 12 requests)...")
    success_count = 0
    rate_limited_count = 0
    
    for i in range(12):
        context = RequestContext()
        response = router.route_request(
            path="storycore.test.echo",
            method="POST",
            params={
                "Authorization": f"Bearer {token.token}",
                "message": f"Request {i+1}",
            },
            context=context,
        )
        
        if response.status == "success":
            success_count += 1
        elif response.error and response.error.code == "RATE_LIMIT_EXCEEDED":
            rate_limited_count += 1
    
    print(f"✓ Results: {success_count} successful, {rate_limited_count} rate limited")
    
    # 11. Check observability logs
    print("\n[11] Checking observability logs...")
    logs = obs_service.get_logs(limit=5)
    print(f"✓ Retrieved {len(logs)} recent log entries")
    for log in logs[-3:]:
        print(f"  - {log.endpoint}: {log.status} ({log.duration_ms:.2f}ms)")
    
    # 12. Check metrics
    print("\n[12] Checking recorded metrics...")
    metrics = obs_service.get_metrics(limit=5)
    print(f"✓ Retrieved {len(metrics)} metrics")
    for metric in metrics[-3:]:
        print(f"  - {metric.name}: {metric.value}")
    
    # 13. Test endpoint not found
    print("\n[13] Testing non-existent endpoint...")
    context = RequestContext()
    response = router.route_request(
        path="storycore.nonexistent.endpoint",
        method="POST",
        params={"Authorization": f"Bearer {token.token}"},
        context=context,
    )
    print(f"✓ Response status: {response.status}")
    print(f"  Error code: {response.error.code}")
    print(f"  Error message: {response.error.message}")
    
    # 14. List all registered endpoints
    print("\n[14] Listing registered endpoints...")
    endpoints = router.list_endpoints()
    print(f"✓ Total endpoints: {len(endpoints)}")
    for endpoint in endpoints:
        print(f"  - {endpoint.method} {endpoint.path}")
        print(f"    Auth required: {endpoint.requires_auth}")
        print(f"    Description: {endpoint.description}")
    
    print("\n" + "=" * 70)
    print("Integration example completed successfully!")
    print("=" * 70)
    print("\nKey takeaways:")
    print("  • Authentication middleware validates tokens and sets context.user")
    print("  • Rate limiting middleware enforces request limits per user")
    print("  • Observability service logs all requests and metrics")
    print("  • Router coordinates all middleware and endpoint execution")
    print("  • All services work together seamlessly")


if __name__ == "__main__":
    main()
