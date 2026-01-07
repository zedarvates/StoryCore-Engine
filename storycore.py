#!/usr/bin/env python3
"""
StoryCore CLI wrapper script for running from project root.
"""

import sys
import os
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

# Import and run the CLI
from storycore_cli import main

if __name__ == "__main__":
    main()
