"""
Root conftest.py for test configuration.

This file configures the Python path to allow imports from the src directory.
"""
import sys
from pathlib import Path

# Add the project root and src directory to Python path
project_root = Path(__file__).parent.parent
src_dir = project_root / "src"

if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))
