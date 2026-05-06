#!/usr/bin/env python3
"""
Test script for enhanced StoryCore refine command with metrics.
"""

import os
import sys
import json
import subprocess


def run_command(cmd, cwd=None):
    """Run a command and return success status."""
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd, capture_output=True, text=True
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)


def test_refine_metrics():
    """Test the enhanced refine command with metrics."""
    print("=== Testing StoryCore Refine with Metrics ===\n")

    # Change to src directory
    os.chdir("src")

    # Test 1: Initialize and setup project
    print("1. Setting up test project...")
    success, stdout, stderr = run_command("python3 storycore_cli.py init metrics-test")
    if not success:
        print(f"✗ Failed to initialize project: {stderr}")
        return False

    success, stdout, stderr = run_command(
        "python3 storycore_cli.py grid --project metrics-test --grid 1x2 --cell-size 200"
    )
    if not success:
        print(f"✗ Failed to generate grid: {stderr}")
        return False

    success, stdout, stderr = run_command(
        "python3 storycore_cli.py promote --project metrics-test --scale 2"
    )
    if not success:
        print(f"✗ Failed to promote panels: {stderr}")
        return False
    print("✓ Project setup complete")

    # Test 2: Refine with metrics
    print("\n2. Testing refinement with metrics...")
    success, stdout, stderr = run_command(
        "python3 storycore_cli.py refine --project metrics-test --mode unsharp --strength 1.0 --metrics"
    )
    if not success:
        print(f"✗ Failed to refine with metrics: {stderr}")
        return False

    if "📊 Sharpness Metrics Summary:" not in stdout:
        print("✗ Metrics summary not displayed")
        return False

    if "Per-panel details:" not in stdout:
        print("✗ Per-panel metrics not displayed")
        return False

    print("✓ Metrics computation and display working")

    # Test 3: Check project.json contains metrics
    print("\n3. Verifying metrics in project.json...")
    with open("metrics-test/project.json", "r") as f:
        project_data = json.load(f)

    if "refinement_metrics" not in project_data.get("asset_manifest", {}):
        print("✗ refinement_metrics not found in project.json")
        return False

    metrics = project_data["asset_manifest"]["refinement_metrics"]
    if "panel_metrics" not in metrics or "summary" not in metrics:
        print("✗ Missing panel_metrics or summary in refinement_metrics")
        return False

    panel_metrics = metrics["panel_metrics"]
    summary = metrics["summary"]

    required_panel_fields = [
        "panel",
        "sharpness_before",
        "sharpness_after",
        "improvement_percent",
    ]
    for panel in panel_metrics:
        for field in required_panel_fields:
            if field not in panel:
                print(f"✗ Missing field {field} in panel metrics")
                return False

    required_summary_fields = [
        "min_improvement_percent",
        "mean_improvement_percent",
        "max_improvement_percent",
    ]
    for field in required_summary_fields:
        if field not in summary:
            print(f"✗ Missing field {field} in summary metrics")
            return False

    print("✓ Metrics properly stored in project.json")

    # Test 4: QA integration with metrics
    print("\n4. Testing QA integration with metrics...")
    success, stdout, stderr = run_command(
        "python3 storycore_cli.py qa --project metrics-test"
    )
    if not success:
        print(f"✗ QA failed: {stderr}")
        return False

    # Should detect oversharpen warning
    if "possible oversharpen artifacts" not in stdout:
        print("✗ QA did not detect oversharpen warning")
        return False

    print("✓ QA integration detecting metrics issues")

    # Test 5: Test weak refinement detection
    print("\n5. Testing weak refinement detection...")
    success, stdout, stderr = run_command(
        "python3 storycore_cli.py refine --project metrics-test --mode unsharp --strength 0.01 --metrics"
    )
    if not success:
        print(f"✗ Failed weak refinement: {stderr}")
        return False

    success, stdout, stderr = run_command(
        "python3 storycore_cli.py qa --project metrics-test"
    )
    if not success:
        print(f"✗ QA failed: {stderr}")
        return False

    if "might be too weak" not in stdout:
        print("✗ QA did not detect weak refinement")
        return False

    print("✓ Weak refinement detection working")

    # Test 6: Test without metrics flag (backward compatibility)
    print("\n6. Testing backward compatibility (no metrics)...")
    success, stdout, stderr = run_command(
        "python3 storycore_cli.py refine --project metrics-test --mode sharpen --strength 1.0"
    )
    if not success:
        print(f"✗ Failed refinement without metrics: {stderr}")
        return False

    if "📊 Sharpness Metrics Summary:" in stdout:
        print("✗ Metrics displayed when not requested")
        return False

    print("✓ Backward compatibility maintained")

    # Test 7: Verify metrics are properly stored
    print("\n7. Verifying metrics storage...")
    with open("metrics-test/project.json", "r") as f:
        project_data = json.load(f)

    # Check if refinement_metrics exists and has panel data
    refinement_metrics = project_data["asset_manifest"].get("refinement_metrics", {})
    panel_metrics = refinement_metrics.get("panel_metrics", [])

    if not panel_metrics:
        print("✗ No panel metrics found in refinement_metrics")
        return False

    # Verify each panel has sharpness data
    for panel in panel_metrics:
        if "sharpness_before" not in panel or "sharpness_after" not in panel:
            print(f"✗ Panel {panel.get('panel', 'unknown')} missing sharpness data")
            return False

    print("✓ Metrics properly stored in refinement_metrics")

    print("\n=== All Metrics Tests Passed! ===")
    return True


def cleanup():
    """Clean up test files."""
    print("\nCleaning up...")
    run_command("rm -rf metrics-test", cwd="src")
    print("✓ Cleanup complete")


if __name__ == "__main__":
    try:
        success = test_refine_metrics()
        if success:
            print("\n🎉 All metrics tests passed!")
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
