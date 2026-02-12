#!/usr/bin/env python3
"""
StoryCore-Engine Main API Server Startup Script

Usage:
    python backend/start_main_api.py
    python backend/start_main_api.py --port 8001
    python backend/start_main_api.py --host 127.0.0.1 --port 8001 --reload
"""

import argparse
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Start the StoryCore-Engine Main API Server"
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
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes (default: 1)"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    
    # Override reload setting
    reload = args.reload and not args.no_reload
    
    print("=" * 80)
    print("StoryCore-Engine Main API Server")
    print("=" * 80)
    print(f"Starting server on {args.host}:{args.port}")
    print(f"Auto-reload: {'enabled' if reload else 'disabled'}")
    print(f"Workers: {args.workers}")
    print()
    print("Available API Endpoints:")
    print("  - Projects:    POST /api/projects")
    print("  - Shots:       POST /api/shots")
    print("  - Sequences:    POST /api/sequences/generate")
    print("  - Audio:        POST /api/audio/generate")
    print("  - LLM:          POST /api/llm/generate")
    print()
    print("API Documentation:")
    print(f"  - Swagger UI:   http://{args.host}:{args.port}/docs")
    print(f"  - ReDoc:        http://{args.host}:{args.port}/redoc")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 80)
    print()
    
    # Import uvicorn
    try:
        import uvicorn
    except ImportError:
        print("ERROR: uvicorn is not installed")
        print("Install it with: pip install uvicorn[standard]")
        sys.exit(1)
    
    # Run the server
    uvicorn.run(
        "backend.main_api:app",
        host=args.host,
        port=args.port,
        reload=reload,
        workers=args.workers,
        log_level="info"
    )
