#!/usr/bin/env python3
"""
Test script for extended grid functionality (1x2, 1x4 support).
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

def test_stack_grids():
    """Test 1x2 and 1x4 grid generation."""
    print("Testing stack grid generation...")
    
    # Test 1x2 grid
    print("\n--- Testing 1x2 Grid ---")
    
    # Clean up
    if os.path.exists("stack-demo"):
        subprocess.run("rm -rf stack-demo", shell=True)
    
    # Initialize project
    success, stdout, stderr = run_command("python3 storycore_cli.py init stack-demo")
    if not success:
        print(f"✗ Project initialization failed: {stderr}")
        return False
    print("✓ Project initialized")
    
    # Generate 1x2 grid
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project stack-demo --grid 1x2 --cell-size 288")
    if not success:
        print(f"✗ 1x2 grid generation failed: {stderr}")
        return False
    print("✓ 1x2 grid generated")
    
    # Check files exist
    project_path = Path("stack-demo")
    grid_file = project_path / "assets" / "images" / "grids" / "grid_1x2.ppm"
    if not grid_file.exists():
        print("✗ 1x2 grid file not created")
        return False
    print("✓ 1x2 grid file exists")
    
    # Check 2 panels exist
    panels_dir = project_path / "assets" / "images" / "panels"
    actual_panels = len(list(panels_dir.glob("panel_*.ppm")))
    if actual_panels != 2:
        print(f"✗ Expected 2 panels, found {actual_panels}")
        return False
    print("✓ 2 panels created")
    
    # Check PPM header dimensions
    with open(grid_file, 'r') as f:
        lines = f.readlines()
        # Skip P3 line, get dimensions
        width, height = map(int, lines[1].split())
        expected_width = round(288 * 16 / 9)  # 512
        expected_height = 288 * 2  # 576
        
        if width != expected_width or height != expected_height:
            print(f"✗ Wrong grid dimensions: {width}x{height}, expected {expected_width}x{expected_height}")
            return False
    print(f"✓ Grid dimensions correct: {width}x{height}")
    
    # Check project.json
    with open(project_path / "project.json", 'r') as f:
        project_data = json.load(f)
    
    manifest = project_data["asset_manifest"]
    if manifest["grid"]["dimensions"] != "1x2":
        print(f"✗ Wrong dimensions in manifest: {manifest['grid']['dimensions']}")
        return False
    
    if len(manifest["panels"]) != 2:
        print(f"✗ Wrong panel count in manifest: {len(manifest['panels'])}")
        return False
    
    if len(manifest["panel_to_shot_map"]) != 2:
        print(f"✗ Wrong shot mapping count: {len(manifest['panel_to_shot_map'])}")
        return False
    
    print("✓ Project manifest updated correctly")
    
    # Run QA
    success, stdout, stderr = run_command("python3 storycore_cli.py qa --project stack-demo")
    if not success:
        print(f"✗ QA failed: {stderr}")
        return False
    
    if "PASSED" not in stdout:
        print("✗ QA did not pass")
        return False
    print("✓ QA passed")
    
    # Test 1x4 grid
    print("\n--- Testing 1x4 Grid ---")
    
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project stack-demo --grid 1x4 --cell-size 200")
    if not success:
        print(f"✗ 1x4 grid generation failed: {stderr}")
        return False
    print("✓ 1x4 grid generated")
    
    # Check 4 panels exist
    actual_panels = len(list(panels_dir.glob("panel_*.ppm")))
    if actual_panels != 4:
        print(f"✗ Expected 4 panels, found {actual_panels}")
        return False
    print("✓ 4 panels created")
    
    # Check 1x4 grid dimensions
    grid_file_1x4 = project_path / "assets" / "images" / "grids" / "grid_1x4.ppm"
    with open(grid_file_1x4, 'r') as f:
        lines = f.readlines()
        width, height = map(int, lines[1].split())
        expected_width = round(200 * 16 / 9)  # 356
        expected_height = 200 * 4  # 800
        
        if width != expected_width or height != expected_height:
            print(f"✗ Wrong 1x4 grid dimensions: {width}x{height}, expected {expected_width}x{expected_height}")
            return False
    print(f"✓ 1x4 grid dimensions correct: {width}x{height}")
    
    # Clean up
    subprocess.run("rm -rf stack-demo", shell=True)
    
    return True

def test_invalid_grids():
    """Test invalid grid specifications."""
    print("\nTesting invalid grid specifications...")
    
    # Clean up
    if os.path.exists("invalid-test"):
        subprocess.run("rm -rf invalid-test", shell=True)
    
    # Initialize project
    run_command("python3 storycore_cli.py init invalid-test")
    
    # Test invalid grid
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project invalid-test --grid 2x2")
    if success:
        print("✗ Should have rejected 2x2 grid")
        return False
    print("✓ Correctly rejected 2x2 grid")
    
    # Test another invalid grid
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project invalid-test --grid 3x2")
    if success:
        print("✗ Should have rejected 3x2 grid")
        return False
    print("✓ Correctly rejected 3x2 grid")
    
    # Clean up
    subprocess.run("rm -rf invalid-test", shell=True)
    
    return True

def main():
    """Run all tests."""
    print("Testing Extended Grid Functionality")
    print("=" * 40)
    
    # Change to src directory for testing
    os.chdir("src")
    
    tests = [
        test_stack_grids,
        test_invalid_grids
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
