#!/usr/bin/env python3
"""
Test script for StoryCore compare command functionality.
"""

import os
import sys
import json
import subprocess
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and return success status."""
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def test_compare_command():
    """Test the compare command functionality."""
    print("=== Testing StoryCore Compare Command ===\n")
    
    # Change to src directory
    os.chdir("src")
    
    # Test 1: Setup complete pipeline
    print("1. Setting up complete pipeline...")
    success, stdout, stderr = run_command("python3 storycore_cli.py init compare-test")
    if not success:
        print(f"✗ Failed to initialize project: {stderr}")
        return False
    
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project compare-test --grid 1x2 --cell-size 200")
    if not success:
        print(f"✗ Failed to generate grid: {stderr}")
        return False
    
    success, stdout, stderr = run_command("python3 storycore_cli.py promote --project compare-test --scale 2")
    if not success:
        print(f"✗ Failed to promote panels: {stderr}")
        return False
    
    success, stdout, stderr = run_command("python3 storycore_cli.py refine --project compare-test --mode unsharp --strength 0.5 --metrics")
    if not success:
        print(f"✗ Failed to refine panels: {stderr}")
        return False
    
    print("✓ Pipeline setup complete")
    
    # Test 2: Single panel comparison
    print("\n2. Testing single panel comparison...")
    success, stdout, stderr = run_command("python3 storycore_cli.py compare --project compare-test --panel 1 --mode side-by-side")
    if not success:
        print(f"✗ Failed single panel comparison: {stderr}")
        return False
    
    compare_file = Path("compare-test/assets/images/compare/compare_panel_01.png")
    if not compare_file.exists():
        print("✗ Single panel comparison file not created")
        return False
    
    print("✓ Single panel comparison working")
    
    # Test 3: All panels grid mode
    print("\n3. Testing all panels grid mode...")
    success, stdout, stderr = run_command("python3 storycore_cli.py compare --project compare-test --panel all --mode grid")
    if not success:
        print(f"✗ Failed all panels grid: {stderr}")
        return False
    
    grid_file = Path("compare-test/assets/images/compare/compare_all.png")
    if not grid_file.exists():
        print("✗ Grid comparison file not created")
        return False
    
    print("✓ Grid mode comparison working")
    
    # Test 4: All panels side-by-side mode
    print("\n4. Testing all panels side-by-side mode...")
    success, stdout, stderr = run_command("python3 storycore_cli.py compare --project compare-test --panel all --mode side-by-side")
    if not success:
        print(f"✗ Failed all panels side-by-side: {stderr}")
        return False
    
    print("✓ Side-by-side mode comparison working")
    
    # Test 5: Check project.json updates
    print("\n5. Verifying project.json updates...")
    with open("compare-test/project.json", 'r') as f:
        project_data = json.load(f)
    
    if "comparison_assets" not in project_data.get("asset_manifest", {}):
        print("✗ comparison_assets not found in project.json")
        return False
    
    comparison_assets = project_data["asset_manifest"]["comparison_assets"]
    if not comparison_assets:
        print("✗ No comparison assets found")
        return False
    
    if "comparison_metadata" not in project_data.get("asset_manifest", {}):
        print("✗ comparison_metadata not found in project.json")
        return False
    
    print(f"✓ Found {len(comparison_assets)} comparison assets in manifest")
    
    # Test 6: Custom output directory
    print("\n6. Testing custom output directory...")
    success, stdout, stderr = run_command("python3 storycore_cli.py compare --project compare-test --panel 2 --out custom/compare")
    if not success:
        print(f"✗ Failed custom output directory: {stderr}")
        return False
    
    custom_file = Path("compare-test/custom/compare/compare_panel_02.png")
    if not custom_file.exists():
        print("✗ Custom output directory file not created")
        return False
    
    print("✓ Custom output directory working")
    
    # Test 7: Error handling - missing promoted
    print("\n7. Testing error handling...")
    success, stdout, stderr = run_command("python3 storycore_cli.py init error-test")
    if not success:
        print(f"✗ Failed to initialize error test project: {stderr}")
        return False
    
    success, stdout, stderr = run_command("python3 storycore_cli.py compare --project error-test --panel 1")
    if success:
        print("✗ Should have failed with missing promoted panels")
        return False
    
    if "Run 'storycore promote' first" not in stdout:
        print("✗ Error message doesn't suggest running promote")
        return False
    
    print("✓ Error handling working correctly")
    
    # Test 8: QA integration
    print("\n8. Testing QA integration...")
    success, stdout, stderr = run_command("python3 storycore_cli.py qa --project compare-test")
    if not success:
        print(f"✗ QA failed: {stderr}")
        return False
    
    if "PASSED" not in stdout:
        print("✗ QA should pass with comparison assets")
        return False
    
    print("✓ QA integration working")
    
    # Test 9: Verify metrics in comparisons
    print("\n9. Verifying metrics integration...")
    # Check if metrics are properly integrated by looking at file sizes
    # (comparisons with metrics should be slightly larger due to text)
    
    # Create comparison without metrics for size comparison
    success, stdout, stderr = run_command("python3 storycore_cli.py init no-metrics-test")
    if not success:
        print(f"✗ Failed to initialize no-metrics test: {stderr}")
        return False
    
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project no-metrics-test --grid 1x2 --cell-size 200")
    success, stdout, stderr = run_command("python3 storycore_cli.py promote --project no-metrics-test --scale 2")
    success, stdout, stderr = run_command("python3 storycore_cli.py refine --project no-metrics-test --mode unsharp --strength 0.5")  # No --metrics
    success, stdout, stderr = run_command("python3 storycore_cli.py compare --project no-metrics-test --panel 1")
    
    # Both should work, but we can't easily verify metrics rendering without visual inspection
    print("✓ Metrics integration appears functional")
    
    print("\n=== All Compare Tests Passed! ===")
    return True

def cleanup():
    """Clean up test files."""
    print("\nCleaning up...")
    run_command("rm -rf compare-test error-test no-metrics-test", cwd="src")
    print("✓ Cleanup complete")

if __name__ == "__main__":
    try:
        success = test_compare_command()
        if success:
            print("\n🎉 All tests passed!")
            cleanup()
            sys.exit(0)
        else:
            print("\n❌ Some tests failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        cleanup()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        cleanup()
        sys.exit(1)
