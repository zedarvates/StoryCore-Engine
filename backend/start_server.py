#!/usr/bin/env python3
"""
Convenience script to start the Feedback Proxy server.

Usage:
    python backend/start_server.py
    python backend/start_server.py --port 8001
    python backend/start_server.py --host 127.0.0.1 --port 8001
"""

import argparse
import sys
import os

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.feedback_proxy import main


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Start the StoryCore-Engine Feedback Proxy server"
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host to bind to (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to (default: 8000)"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        default=True,
        help="Enable auto-reload on code changes (default: True)"
    )
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable auto-reload"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    
    # Override reload setting if --no-reload is specified
    reload = args.reload and not args.no_reload
    
    print("=" * 80)
    print("StoryCore-Engine Feedback Proxy Server")
    print("=" * 80)
    print(f"Starting server on {args.host}:{args.port}")
    print(f"Auto-reload: {'enabled' if reload else 'disabled'}")
    print()
    print("API Documentation:")
    print(f"  - Swagger UI: http://{args.host}:{args.port}/docs")
    print(f"  - ReDoc:      http://{args.host}:{args.port}/redoc")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 80)
    print()
    
    # Import uvicorn here to avoid import errors if not installed
    try:
        import uvicorn
    except ImportError:
        print("ERROR: uvicorn is not installed")
        print("Install it with: pip install uvicorn[standard]")
        sys.exit(1)
    
    # Run the server
    uvicorn.run(
        "backend.feedback_proxy:app",
        host=args.host,
        port=args.port,
        reload=reload,
        log_level="info"
    )
