#!/usr/bin/env python3
"""
Test script for StoryCore refine command functionality.
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

def test_refine_command():
    """Test the refine command functionality."""
    print("=== Testing StoryCore Refine Command ===\n")
    
    # Change to src directory
    os.chdir("src")
    
    # Test 1: Initialize project
    print("1. Initializing test project...")
    success, stdout, stderr = run_command("python3 storycore_cli.py init refine-demo")
    if not success:
        print(f"✗ Failed to initialize project: {stderr}")
        return False
    print("✓ Project initialized")
    
    # Test 2: Generate grid
    print("\n2. Generating 1x2 grid...")
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project refine-demo --grid 1x2 --cell-size 288")
    if not success:
        print(f"✗ Failed to generate grid: {stderr}")
        return False
    print("✓ Grid generated")
    
    # Test 3: Promote panels
    print("\n3. Promoting panels...")
    success, stdout, stderr = run_command("python3 storycore_cli.py promote --project refine-demo --scale 2")
    if not success:
        print(f"✗ Failed to promote panels: {stderr}")
        return False
    print("✓ Panels promoted")
    
    # Test 4: Refine promoted panels (default)
    print("\n4. Refining promoted panels (unsharp, strength 1.0)...")
    success, stdout, stderr = run_command("python3 storycore_cli.py refine --project refine-demo --mode unsharp --strength 1.0")
    if not success:
        print(f"✗ Failed to refine panels: {stderr}")
        return False
    print("✓ Panels refined")
    print(f"Output:\n{stdout}")
    
    # Test 5: Check refined files exist
    print("\n5. Verifying refined files...")
    refined_dir = Path("refine-demo/assets/images/refined")
    if not refined_dir.exists():
        print("✗ Refined directory not created")
        return False
    
    refined_files = list(refined_dir.glob("panel_*_refined.png"))
    print(f"✓ Found {len(refined_files)} refined files:")
    for file in refined_files:
        print(f"  - {file.name}")
    
    # Test 6: Check project.json updated
    print("\n6. Verifying project.json updates...")
    with open("refine-demo/project.json", 'r') as f:
        project_data = json.load(f)
    
    if "refined_panels" not in project_data.get("asset_manifest", {}):
        print("✗ refined_panels not found in asset_manifest")
        return False
    
    refined_panels = project_data["asset_manifest"]["refined_panels"]
    print(f"✓ Found {len(refined_panels)} refined panels in manifest")
    
    if "refinement_metadata" not in project_data.get("asset_manifest", {}):
        print("✗ refinement_metadata not found in asset_manifest")
        return False
    
    metadata = project_data["asset_manifest"]["refinement_metadata"]
    print(f"✓ Refinement metadata: input={metadata['input']}, mode={metadata['mode']}, strength={metadata['strength']}")
    
    if project_data["status"]["current_phase"] != "refined":
        print("✗ Project phase not updated to 'refined'")
        return False
    print("✓ Project phase updated to 'refined'")
    
    # Test 7: Run QA to verify refined panels validation
    print("\n7. Running QA validation...")
    success, stdout, stderr = run_command("python3 storycore_cli.py qa --project refine-demo")
    if not success:
        print(f"✗ QA failed: {stderr}")
        return False
    print("✓ QA passed with refined panels")
    
    # Test 8: Test refining from panels directly
    print("\n8. Testing refinement from panels (sharpen mode)...")
    success, stdout, stderr = run_command("python3 storycore_cli.py refine --project refine-demo --input panels --mode sharpen --strength 1.5")
    if not success:
        print(f"✗ Failed with panels input: {stderr}")
        return False
    print("✓ Panels input refinement worked")
    
    # Test 9: Verify metadata updates
    print("\n9. Verifying final metadata...")
    with open("refine-demo/project.json", 'r') as f:
        project_data = json.load(f)
    
    metadata = project_data["asset_manifest"]["refinement_metadata"]
    print(f"  Final settings: input={metadata['input']}, mode={metadata['mode']}, strength={metadata['strength']}")
    
    refined_panels = project_data["asset_manifest"]["refined_panels"]
    for panel in refined_panels:
        print(f"  {panel['asset_id']}: {panel['resolution']} from {panel['original_source']}")
    
    print("\n=== All Refine Tests Passed! ===")
    return True

def cleanup():
    """Clean up test files."""
    print("\nCleaning up...")
    run_command("rm -rf refine-demo", cwd="src")
    print("✓ Cleanup complete")

if __name__ == "__main__":
    try:
        success = test_refine_command()
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
