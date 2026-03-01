#!/usr/bin/env python3
"""
Demo Script for Interactive Project Setup Wizard

This script demonstrates the wizard functionality for the concours.
"""

import sys
import os
from pathlib import Path

def main():
    """Run wizard demo"""
    print("🎬 StoryCore-Engine Interactive Project Setup Wizard Demo")
    print("=" * 60)
    print()
    print("This demo shows the interactive wizard that guides users through")
    print("creating new StoryCore-Engine projects with a simple CLI interface.")
    print()
    print("Features demonstrated:")
    print("  ✓ Interactive project name collection with validation")
    print("  ✓ Format selection (Court/Moyen/Long-métrage)")
    print("  ✓ Duration validation against format constraints")
    print("  ✓ Genre selection with style defaults")
    print("  ✓ Story input (single-line or multi-line)")
    print("  ✓ Configuration summary and confirmation")
    print("  ✓ Complete project creation with files and structure")
    print()
    print("The wizard creates a complete StoryCore project ready for:")
    print("  • Grid generation (storycore grid)")
    print("  • Panel promotion (storycore promote)")
    print("  • Quality analysis (storycore qa)")
    print("  • Export packaging (storycore export)")
    print()
    
    # Check if we're in the right directory
    if not Path("storycore.py").exists():
        print("❌ Please run this demo from the StoryCore-Engine root directory")
        print("   (where storycore.py is located)")
        return 1
    
    print("🚀 Starting interactive wizard...")
    print("   (You can press Ctrl+C at any time to cancel)")
    print()
    
    # Run the wizard
    os.system("python storycore.py init")
    
    print()
    print("🎉 Demo completed!")
    print()
    print("The wizard is now integrated into StoryCore-Engine and ready for use.")
    print("Users can create projects with: python storycore.py init")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())