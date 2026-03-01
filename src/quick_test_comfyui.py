#!/usr/bin/env python3
"""
Quick ComfyUI Connection Test

This script performs a rapid validation of ComfyUI connectivity without
running any generation tasks. It's designed for quick health checks and
troubleshooting connection issues.

Usage:
    python quick_test_comfyui.py
    python quick_test_comfyui.py --url http://localhost:8188
    python quick_test_comfyui.py --url http://localhost:8188 --timeout 5

Requirements:
    - ComfyUI server must be running
    - Python 3.9+
    - aiohttp library

Exit Codes:
    0 - Connection successful
    1 - Connection failed

Example Output:
    ✓ ComfyUI Connection Test PASSED
    
    Connection Details:
    - URL: http://localhost:8188
    - Status: Connected
    - Response Time: 0.23s
    
    Server Information:
    - System Stats Available: Yes
    - Server Responding: Yes
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from comfyui_test_framework import (
    ComfyUIConnectionManager,
    ConnectionError,
    AuthenticationError,
    TimeoutError,
)


def print_header():
    """Print test header."""
    print("=" * 60)
    print("ComfyUI Quick Connection Test")
    print("=" * 60)
    print()


def print_success(message: str):
    """Print success message with checkmark."""
    print(f"✓ {message}")


def print_error(message: str):
    """Print error message with X."""
    print(f"✗ {message}")


def print_info(label: str, value: str):
    """Print info line."""
    print(f"  - {label}: {value}")


async def test_connection(url: str, timeout: int) -> bool:
    """
    Test connection to ComfyUI server.
    
    Args:
        url: ComfyUI server URL
        timeout: Connection timeout in seconds
    
    Returns:
        True if connection successful, False otherwise
    """
    print_info("Testing URL", url)
    print_info("Timeout", f"{timeout}s")
    print()
    
    connection = ComfyUIConnectionManager(base_url=url, timeout=timeout)
    
    try:
        # Measure connection time
        start_time = time.time()
        
        # Attempt connection
        print("Connecting to ComfyUI server...")
        await connection.connect()
        
        connection_time = time.time() - start_time
        print_success("Connection established")
        print()
        
        # Check health
        print("Checking server health...")
        health_data = await connection.check_health()
        
        health_time = time.time() - start_time
        print_success("Health check passed")
        print()
        
        # Print results
        print_success("ComfyUI Connection Test PASSED")
        print()
        print("Connection Details:")
        print_info("URL", url)
        print_info("Status", "Connected")
        print_info("Connection Time", f"{connection_time:.2f}s")
        print_info("Total Response Time", f"{health_time:.2f}s")
        print()
        
        print("Server Information:")
        print_info("System Stats Available", "Yes")
        print_info("Server Responding", "Yes")
        
        if health_data:
            # Print some health data if available
            if "system" in health_data:
                system_info = health_data["system"]
                if "os" in system_info:
                    print_info("Operating System", system_info["os"])
            
            if "devices" in health_data:
                devices = health_data["devices"]
                if devices:
                    print_info("GPU Devices", str(len(devices)))
        
        print()
        
        return True
    
    except ConnectionError as e:
        print_error("Connection failed")
        print()
        print("Error Details:")
        print(f"  {str(e)}")
        print()
        print("Troubleshooting:")
        print("  1. Ensure ComfyUI is running")
        print("  2. Check the URL is correct (default: http://localhost:8188)")
        print("  3. Verify no firewall is blocking the connection")
        print("  4. Check ComfyUI logs for errors")
        print()
        return False
    
    except AuthenticationError as e:
        print_error("Authentication failed")
        print()
        print("Error Details:")
        print(f"  {str(e)}")
        print()
        print("Troubleshooting:")
        print("  1. Check your authentication credentials")
        print("  2. Verify ComfyUI authentication settings")
        print()
        return False
    
    except TimeoutError as e:
        print_error("Connection timed out")
        print()
        print("Error Details:")
        print(f"  {str(e)}")
        print()
        print("Troubleshooting:")
        print("  1. Increase timeout with --timeout flag")
        print("  2. Check if ComfyUI is responding slowly")
        print("  3. Verify network connectivity")
        print()
        return False
    
    except Exception as e:
        print_error("Unexpected error occurred")
        print()
        print("Error Details:")
        print(f"  {type(e).__name__}: {str(e)}")
        print()
        return False
    
    finally:
        # Always close connection
        await connection.close()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Quick ComfyUI connection test - validates connectivity without generation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python quick_test_comfyui.py
  python quick_test_comfyui.py --url http://localhost:8000
  python quick_test_comfyui.py --url http://192.168.1.100:8000 --timeout 15

Exit Codes:
  0 - Connection successful
  1 - Connection failed
        """
    )
    
    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:8000",
        help="ComfyUI server URL (default: http://localhost:8000)"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Connection timeout in seconds (default: 10)"
    )
    
    args = parser.parse_args()
    
    # Print header
    print_header()
    
    # Run test
    success = asyncio.run(test_connection(args.url, args.timeout))
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
