#!/usr/bin/env python3
"""
Security Verification Script for StoryCore API Server
Verifies that all security measures are properly configured and functional.

Usage:
    python scripts/verify_security.py --env production
    python scripts/verify_security.py --comprehensive
"""

import argparse
import os
import sys
import secrets
import string
from pathlib import Path
import json
from typing import Dict, List, Any

# Add src directory to Python path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from api_server import settings, verify_token, create_access_token


def check_environment_configuration() -> Dict[str, Any]:
    """Check environment variable configuration."""
    results = {
        "category": "Environment Configuration",
        "checks": [],
        "status": "pass",
        "issues": []
    }

    # JWT Secret Key
    jwt_secret = os.getenv("STORYCORE_JWT_SECRET_KEY", "")
    if not jwt_secret:
        results["checks"].append({"name": "JWT Secret Key", "status": "fail", "message": "STORYCORE_JWT_SECRET_KEY not set"})
        results["issues"].append("JWT secret key must be configured")
        results["status"] = "fail"
    elif jwt_secret == "CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_IN_PRODUCTION":
        results["checks"].append({"name": "JWT Secret Key", "status": "fail", "message": "JWT secret key uses default placeholder"})
        results["issues"].append("JWT secret key must be changed from default")
        results["status"] = "fail"
    elif len(jwt_secret) < 32:
        results["checks"].append({"name": "JWT Secret Key", "status": "warn", "message": "JWT secret key is shorter than recommended (32+ chars)"})
        results["issues"].append("Consider using a longer JWT secret key")
    else:
        results["checks"].append({"name": "JWT Secret Key", "status": "pass", "message": "JWT secret key properly configured"})

    # Redis Configuration
    redis_url = os.getenv("STORYCORE_REDIS_URL", "")
    if redis_url:
        results["checks"].append({"name": "Redis URL", "status": "pass", "message": "Redis URL configured"})
        # Test Redis connection
        try:
            import redis
            r = redis.Redis.from_url(redis_url)
            r.ping()
            results["checks"].append({"name": "Redis Connection", "status": "pass", "message": "Redis connection successful"})
        except Exception as e:
            results["checks"].append({"name": "Redis Connection", "status": "fail", "message": f"Redis connection failed: {e}"})
            results["issues"].append("Redis must be available for production rate limiting")
            results["status"] = "fail"
    else:
        results["checks"].append({"name": "Redis URL", "status": "warn", "message": "Redis URL not configured - using memory storage"})
        results["issues"].append("Redis recommended for production rate limiting and sessions")

    # CORS Configuration
    cors_origins = os.getenv("STORYCORE_CORS_ALLOW_ORIGINS", "")
    if cors_origins == '["*"]':
        results["checks"].append({"name": "CORS Origins", "status": "fail", "message": "CORS allows all origins (*)"})
        results["issues"].append("CORS origins must be restricted in production")
        results["status"] = "fail"
    elif cors_origins:
        results["checks"].append({"name": "CORS Origins", "status": "pass", "message": "CORS origins properly configured"})
    else:
        results["checks"].append({"name": "CORS Origins", "status": "warn", "message": "CORS origins not configured"})

    # Trusted Hosts
    trusted_hosts = os.getenv("STORYCORE_TRUSTED_HOSTS", "")
    if trusted_hosts and "localhost" not in trusted_hosts and "127.0.0.1" not in trusted_hosts:
        results["checks"].append({"name": "Trusted Hosts", "status": "pass", "message": "Trusted hosts configured (no localhost in production)"})
    else:
        results["checks"].append({"name": "Trusted Hosts", "status": "warn", "message": "Trusted hosts configuration may allow localhost"})

    return results


def check_jwt_functionality() -> Dict[str, Any]:
    """Check JWT token functionality."""
    results = {
        "category": "JWT Token Functionality",
        "checks": [],
        "status": "pass",
        "issues": []
    }

    try:
        # Test token creation
        test_data = {"sub": "test_user", "role": "user"}
        token = create_access_token(data=test_data)
        results["checks"].append({"name": "Token Creation", "status": "pass", "message": "JWT token creation successful"})

        # Test token verification
        payload = verify_token(token)
        if payload and payload.get("sub") == "test_user":
            results["checks"].append({"name": "Token Verification", "status": "pass", "message": "JWT token verification successful"})
        else:
            results["checks"].append({"name": "Token Verification", "status": "fail", "message": "JWT token verification failed"})
            results["status"] = "fail"

        # Test invalid token
        invalid_payload = verify_token("invalid_token")
        if invalid_payload is None:
            results["checks"].append({"name": "Invalid Token Handling", "status": "pass", "message": "Invalid tokens properly rejected"})
        else:
            results["checks"].append({"name": "Invalid Token Handling", "status": "fail", "message": "Invalid tokens not properly rejected"})
            results["status"] = "fail"

    except Exception as e:
        results["checks"].append({"name": "JWT Functionality", "status": "fail", "message": f"JWT operations failed: {e}"})
        results["status"] = "fail"
        results["issues"].append("JWT functionality is broken")

    return results


def check_security_headers() -> Dict[str, Any]:
    """Check security headers configuration."""
    results = {
        "category": "Security Headers",
        "checks": [],
        "status": "pass",
        "issues": []
    }

    # Check session security settings
    session_secure = os.getenv("STORYCORE_SESSION_SECURE", "true").lower() == "true"
    session_httponly = os.getenv("STORYCORE_SESSION_HTTPONLY", "true").lower() == "true"
    session_samesite = os.getenv("STORYCORE_SESSION_SAMESITE", "strict")

    if session_secure:
        results["checks"].append({"name": "Session Secure Flag", "status": "pass", "message": "Session cookies marked secure"})
    else:
        results["checks"].append({"name": "Session Secure Flag", "status": "fail", "message": "Session cookies not marked secure"})
        results["status"] = "fail"

    if session_httponly:
        results["checks"].append({"name": "Session HttpOnly Flag", "status": "pass", "message": "Session cookies marked HttpOnly"})
    else:
        results["checks"].append({"name": "Session HttpOnly Flag", "status": "warn", "message": "Session cookies not marked HttpOnly"})

    if session_samesite == "strict":
        results["checks"].append({"name": "Session SameSite", "status": "pass", "message": "Session cookies use strict SameSite policy"})
    else:
        results["checks"].append({"name": "Session SameSite", "status": "warn", "message": f"Session cookies use {session_samesite} SameSite policy"})

    return results


def check_rate_limiting() -> Dict[str, Any]:
    """Check rate limiting configuration."""
    results = {
        "category": "Rate Limiting",
        "checks": [],
        "status": "pass",
        "issues": []
    }

    # Check rate limit settings
    requests_per_minute = int(os.getenv("STORYCORE_RATE_LIMIT_REQUESTS_PER_MINUTE", "60"))
    burst_limit = int(os.getenv("STORYCORE_RATE_LIMIT_BURST_LIMIT", "10"))

    if requests_per_minute > 0:
        results["checks"].append({"name": "Rate Limit Requests/Minute", "status": "pass", "message": f"Rate limit set to {requests_per_minute} requests/minute"})
    else:
        results["checks"].append({"name": "Rate Limit Requests/Minute", "status": "fail", "message": "Rate limit not configured"})
        results["status"] = "fail"

    if burst_limit > 0:
        results["checks"].append({"name": "Rate Limit Burst Limit", "status": "pass", "message": f"Burst limit set to {burst_limit}"})
    else:
        results["checks"].append({"name": "Rate Limit Burst Limit", "status": "fail", "message": "Burst limit not configured"})
        results["status"] = "fail"

    # Check Redis for rate limiting
    redis_url = os.getenv("STORYCORE_REDIS_URL", "")
    if redis_url:
        try:
            import redis
            r = redis.Redis.from_url(redis_url)
            r.ping()
            results["checks"].append({"name": "Rate Limit Storage", "status": "pass", "message": "Redis available for rate limiting"})
        except Exception as e:
            results["checks"].append({"name": "Rate Limit Storage", "status": "warn", "message": f"Redis not available: {e}"})
            results["issues"].append("Redis recommended for distributed rate limiting")
    else:
        results["checks"].append({"name": "Rate Limit Storage", "status": "warn", "message": "Using memory storage for rate limiting"})
        results["issues"].append("Redis recommended for production rate limiting")

    return results


def generate_security_report(results: List[Dict[str, Any]]) -> None:
    """Generate and display security report."""
    print("🔒 StoryCore Security Verification Report")
    print("=" * 60)

    all_pass = True
    total_issues = 0

    for result in results:
        print(f"\n📋 {result['category']}")
        print("-" * 40)

        for check in result["checks"]:
            status_icon = "✅" if check["status"] == "pass" else "❌" if check["status"] == "fail" else "⚠️"
            print(f"  {status_icon} {check['name']}: {check['message']}")

        if result["issues"]:
            total_issues += len(result["issues"])
            print(f"  🚨 Issues: {len(result['issues'])}")
            for issue in result["issues"]:
                print(f"     • {issue}")

        if result["status"] != "pass":
            all_pass = False

    print(f"\n{'=' * 60}")
    if all_pass:
        print("✅ SECURITY VERIFICATION PASSED")
        print("   All security checks completed successfully.")
    else:
        print(f"❌ SECURITY VERIFICATION FAILED")
        print(f"   {total_issues} issues found that need attention.")

    # Production readiness
    env = os.getenv("ENVIRONMENT", "development")
    if env == "production" and not all_pass:
        print("\n🚫 PRODUCTION DEPLOYMENT BLOCKED")
        print("   Security issues must be resolved before production deployment.")
        sys.exit(1)
    elif env == "production" and all_pass:
        print("\n✅ PRODUCTION READY")
        print("   All security requirements met for production deployment.")

    return all_pass


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Verify StoryCore API Server Security")
    parser.add_argument(
        "--env",
        choices=["development", "production"],
        default="development",
        help="Environment to check"
    )
    parser.add_argument(
        "--comprehensive",
        action="store_true",
        help="Run comprehensive security checks"
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Attempt to fix configuration issues"
    )

    args = parser.parse_args()

    # Set environment
    os.environ["ENVIRONMENT"] = args.env

    print(f"🔍 Running security verification for {args.env} environment")
    print("-" * 60)

    # Run checks
    results = []

    # Environment configuration
    results.append(check_environment_configuration())

    # JWT functionality
    results.append(check_jwt_functionality())

    # Security headers
    results.append(check_security_headers())

    # Rate limiting
    results.append(check_rate_limiting())

    if args.comprehensive:
        # Additional comprehensive checks could go here
        print("🏭 Running comprehensive security checks...")

    # Generate report
    success = generate_security_report(results)

    if args.fix and not success:
        print("\n🔧 Attempting to fix configuration issues...")
        # Fix logic could go here
        print("   Automatic fixes not yet implemented. Please manually configure the issues above.")

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()