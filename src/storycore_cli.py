#!/usr/bin/env python3
"""
StoryCore-Engine CLI - Modular Architecture
Main CLI entry point that delegates to the modular CLI system.

This file maintains backward compatibility while delegating all functionality
to the modular CLI framework in src/cli/.
"""

import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Import modular CLI system
from cli import CLICore
from cli.errors import CLIError


def main():
    """
    Main CLI entry point using modular architecture.
    
    This function serves as the single entry point for the StoryCore-Engine CLI.
    It delegates all command handling to the modular CLI system while maintaining
    backward compatibility with existing command-line interfaces.
    
    Returns:
        int: Exit code (0 for success, non-zero for errors)
    """
    try:
        # Initialize and run the modular CLI system
        cli = CLICore()
        return cli.run()
        
    except CLIError as e:
        # CLI errors are already formatted and logged
        print(f"[ERROR] {e}", file=sys.stderr)
        return 1
        
    except KeyboardInterrupt:
        # Handle user interruption gracefully
        print("\n[ERROR] Operation cancelled by user", file=sys.stderr)
        return 130  # Standard exit code for SIGINT
        
    except Exception as e:
        # Handle unexpected errors
        print(f"[ERROR] Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
