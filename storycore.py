#!/usr/bin/env python3
"""
StoryCore-Engine CLI Entry Point
Proper entry point that handles imports correctly.
"""

import sys
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

# Import and run CLI
from storycore_cli import main

if __name__ == "__main__":
    main()