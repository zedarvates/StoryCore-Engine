#!/usr/bin/env python3
"""
Simple tests for the grid command functionality.
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def run_command(cmd):
    """Run a command and return success status."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def test_grid_generation():
    """Test basic grid generation functionality."""
    print("Testing grid generation...")
    
    # Clean up any existing test project
    if os.path.exists("test-grid-project"):
        subprocess.run("rm -rf test-grid-project", shell=True)
    
    # Test 1: Initialize project
    success, stdout, stderr = run_command("python3 storycore_cli.py init test-grid-project")
    if not success:
        print(f"✗ Project initialization failed: {stderr}")
        return False
    print("✓ Project initialized")
    
    # Test 2: Generate grid
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project test-grid-project --grid 3x3")
    if not success:
        print(f"✗ Grid generation failed: {stderr}")
        return False
    print("✓ Grid generated")
    
    # Test 3: Check files exist
    project_path = Path("test-grid-project")
    grid_file = project_path / "assets" / "images" / "grids" / "grid_3x3.ppm"
    if not grid_file.exists():
        print("✗ Grid file not created")
        return False
    print("✓ Grid file exists")
    
    # Test 4: Check panels exist
    panels_dir = project_path / "assets" / "images" / "panels"
    expected_panels = 9
    actual_panels = len(list(panels_dir.glob("panel_*.ppm")))
    if actual_panels != expected_panels:
        print(f"✗ Expected {expected_panels} panels, found {actual_panels}")
        return False
    print(f"✓ All {expected_panels} panels created")
    
    # Test 5: Check project.json updated
    project_file = project_path / "project.json"
    with open(project_file, 'r') as f:
        project_data = json.load(f)
    
    if "asset_manifest" not in project_data:
        print("✗ Asset manifest not created")
        return False
    
    manifest = project_data["asset_manifest"]
    if "grid" not in manifest:
        print("✗ Grid asset not in manifest")
        return False
    
    if "panels" not in manifest or len(manifest["panels"]) != 9:
        print("✗ Panels not properly recorded in manifest")
        return False
    
    if "panel_to_shot_map" not in manifest:
        print("✗ Panel to shot mapping not created")
        return False
    
    print("✓ Project manifest updated correctly")
    
    # Test 6: Run QA
    success, stdout, stderr = run_command("python3 storycore_cli.py qa --project test-grid-project")
    if not success:
        print(f"✗ QA failed: {stderr}")
        return False
    
    if "PASSED" not in stdout:
        print("✗ QA did not pass")
        return False
    print("✓ QA passed")
    
    # Clean up
    subprocess.run("rm -rf test-grid-project", shell=True)
    
    return True

def test_grid_validation():
    """Test grid parameter validation."""
    print("\nTesting grid validation...")
    
    # Clean up any existing test project
    if os.path.exists("test-validation"):
        subprocess.run("rm -rf test-validation", shell=True)
    
    # Initialize project
    run_command("python3 storycore_cli.py init test-validation")
    
    # Test invalid grid specification
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project test-validation --grid 2x2")
    if success:
        print("✗ Should have rejected 2x2 grid in MVP")
        return False
    print("✓ Correctly rejected non-3x3 grid")
    
    # Clean up
    subprocess.run("rm -rf test-validation", shell=True)
    
    return True

def main():
    """Run all tests."""
    print("Running StoryCore Grid Command Tests")
    print("=" * 40)
    
    # Change to src directory for testing
    os.chdir("src")
    
    tests = [
        test_grid_generation,
        test_grid_validation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                print("Test failed!")
        except Exception as e:
            print(f"Test error: {e}")
    
    print("\n" + "=" * 40)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("✓ All tests passed!")
        return 0
    else:
        print("✗ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
