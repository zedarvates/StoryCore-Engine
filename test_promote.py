#!/usr/bin/env python3
"""
Test script for StoryCore promote command functionality.
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

def test_promote_command():
    """Test the promote command functionality."""
    print("=== Testing StoryCore Promote Command ===\n")
    
    # Change to src directory
    os.chdir("src")
    
    # Test 1: Initialize project
    print("1. Initializing test project...")
    success, stdout, stderr = run_command("python3 storycore_cli.py init promo-demo")
    if not success:
        print(f"✗ Failed to initialize project: {stderr}")
        return False
    print("✓ Project initialized")
    
    # Test 2: Generate grid
    print("\n2. Generating 1x2 grid...")
    success, stdout, stderr = run_command("python3 storycore_cli.py grid --project promo-demo --grid 1x2 --cell-size 288")
    if not success:
        print(f"✗ Failed to generate grid: {stderr}")
        return False
    print("✓ Grid generated")
    
    # Test 3: Check panels exist
    panels_dir = Path("promo-demo/assets/images/panels")
    panel_files = list(panels_dir.glob("panel_*.ppm"))
    print(f"✓ Found {len(panel_files)} panel files")
    
    # Test 4: Run promote command
    print("\n3. Running promote command...")
    success, stdout, stderr = run_command("python3 storycore_cli.py promote --project promo-demo --scale 2")
    if not success:
        print(f"✗ Failed to promote panels: {stderr}")
        return False
    print("✓ Panels promoted")
    print(f"Output:\n{stdout}")
    
    # Test 5: Check promoted files exist
    print("\n4. Verifying promoted files...")
    promoted_dir = Path("promo-demo/assets/images/promoted")
    if not promoted_dir.exists():
        print("✗ Promoted directory not created")
        return False
    
    promoted_files = list(promoted_dir.glob("panel_*_promoted.png"))
    print(f"✓ Found {len(promoted_files)} promoted files:")
    for file in promoted_files:
        print(f"  - {file.name}")
    
    # Test 6: Check project.json updated
    print("\n5. Verifying project.json updates...")
    with open("promo-demo/project.json", 'r') as f:
        project_data = json.load(f)
    
    if "promoted_panels" not in project_data.get("asset_manifest", {}):
        print("✗ promoted_panels not found in asset_manifest")
        return False
    
    promoted_panels = project_data["asset_manifest"]["promoted_panels"]
    print(f"✓ Found {len(promoted_panels)} promoted panels in manifest")
    
    if "promotion_metadata" not in project_data.get("asset_manifest", {}):
        print("✗ promotion_metadata not found in asset_manifest")
        return False
    
    metadata = project_data["asset_manifest"]["promotion_metadata"]
    print(f"✓ Promotion metadata: scale={metadata['scale_factor']}, method={metadata['method']}")
    
    if project_data["status"]["current_phase"] != "promoted":
        print("✗ Project phase not updated to 'promoted'")
        return False
    print("✓ Project phase updated to 'promoted'")
    
    # Test 7: Run QA to verify promoted panels validation
    print("\n6. Running QA validation...")
    success, stdout, stderr = run_command("python3 storycore_cli.py qa --project promo-demo")
    if not success:
        print(f"✗ QA failed: {stderr}")
        return False
    print("✓ QA passed with promoted panels")
    
    # Test 8: Test different scale and method
    print("\n7. Testing different scale and method...")
    success, stdout, stderr = run_command("python3 storycore_cli.py promote --project promo-demo --scale 3 --method bicubic")
    if not success:
        print(f"✗ Failed with different parameters: {stderr}")
        return False
    print("✓ Different scale/method worked")
    
    # Test 9: Verify resolution changes
    print("\n8. Verifying resolution changes...")
    with open("promo-demo/project.json", 'r') as f:
        project_data = json.load(f)
    
    promoted_panels = project_data["asset_manifest"]["promoted_panels"]
    for panel in promoted_panels:
        orig_res = panel["original_resolution"]
        prom_res = panel["promoted_resolution"]
        print(f"  {panel['asset_id']}: {orig_res} → {prom_res}")
    
    print("\n=== All Promote Tests Passed! ===")
    return True

def cleanup():
    """Clean up test files."""
    print("\nCleaning up...")
    run_command("rm -rf promo-demo", cwd="src")
    print("✓ Cleanup complete")

if __name__ == "__main__":
    try:
        success = test_promote_command()
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
