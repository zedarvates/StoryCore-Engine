#!/usr/bin/env python3
"""
StoryCore API Server Launcher
Production-ready script to start the API server with proper security configuration.

Usage:
    python scripts/start_api_server.py --env production
    python scripts/start_api_server.py --env development
"""

import argparse
import os
import sys
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

import uvicorn
from dotenv import load_dotenv


def load_environment(env: str):
    """Load environment variables based on environment."""
    env_file = f".env.{env}"
    if os.path.exists(env_file):
        load_dotenv(env_file)
        print(f"✓ Loaded environment from {env_file}")
    else:
        print(f"⚠️  Environment file {env_file} not found, using defaults")


def check_security_requirements():
    """Check that security requirements are met."""
    issues = []

    # Check JWT secret
    jwt_secret = os.getenv("STORYCORE_JWT_SECRET_KEY", "")
    if not jwt_secret or jwt_secret == "CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_IN_PRODUCTION":
        issues.append("STORYCORE_JWT_SECRET_KEY must be set to a strong random secret")

    # Check Redis (warn if not available)
    redis_url = os.getenv("STORYCORE_REDIS_URL", "redis://localhost:6379")
    try:
        import redis
        r = redis.Redis.from_url(redis_url)
        r.ping()
        print("✓ Redis connection successful")
    except Exception as e:
        print(f"⚠️  Redis not available: {e} (rate limiting and sessions will use memory)")

    # Check CORS origins
    cors_origins = os.getenv("STORYCORE_CORS_ALLOW_ORIGINS", "[]")
    if cors_origins == '["*"]':
        issues.append("CORS origins should not be wildcard (*) in production")

    if issues:
        print("❌ Security configuration issues:")
        for issue in issues:
            print(f"   - {issue}")
        if "production" in sys.argv:
            print("🚫 Blocking production startup due to security issues")
            sys.exit(1)
    else:
        print("✓ Security configuration validated")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Start StoryCore API Server")
    parser.add_argument(
        "--env",
        choices=["development", "production"],
        default="development",
        help="Environment to run in"
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host to bind to"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port to bind to"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )

    args = parser.parse_args()

    print("🚀 Starting StoryCore API Server"    print(f"   Environment: {args.env}")
    print(f"   Host: {args.host}")
    print(f"   Port: {args.port}")
    print(f"   Workers: {args.workers}")
    print("-" * 50)

    # Load environment
    load_environment(args.env)

    # Check security requirements
    check_security_requirements()

    # Configure uvicorn based on environment
    config = {
        "app": "src.api_server:app",
        "host": args.host,
        "port": args.port,
        "workers": args.workers,
        "log_level": "info",
        "access_log": True,
    }

    if args.env == "development" or args.reload:
        config["reload"] = True
        config["reload_dirs"] = ["src"]
        print("🔄 Development mode: auto-reload enabled")

    if args.env == "production":
        config["workers"] = max(1, args.workers)  # At least 1 worker
        config["log_level"] = "warning"  # Less verbose in production
        print("🏭 Production mode: optimized for performance")

    print("
🌐 API endpoints:"    print(f"   Health: http://{args.host}:{args.port}/health")
    print(f"   Docs: http://{args.host}:{args.port}/docs")
    print(f"   Login: http://{args.host}:{args.port}/auth/login")
    print("-" * 50)

    # Start server
    try:
        uvicorn.run(**config)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server failed to start: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()