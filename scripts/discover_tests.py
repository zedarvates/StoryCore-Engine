"""
Script to discover and validate all tests in the codebase.
"""

from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.test_infrastructure_manager import TestInfrastructureManager


def main():
    """Run test discovery and print report."""
    print("Discovering tests in the codebase...")
    print("=" * 80)
    
    manager = TestInfrastructureManager(test_directory=Path("tests"))
    result = manager.generate_discovery_report()
    
    manager.print_report(result)
    
    # Exit with error code if below 95% threshold
    if not result.summary["meets_95_percent_threshold"]:
        print(f"\n⚠️  WARNING: Test executability is below 95% threshold!")
        print(f"   Current: {result.summary['executability_percentage']}%")
        print(f"   Required: 95.0%")
        sys.exit(1)
    else:
        print(f"\n✓ SUCCESS: Test executability meets 95% threshold!")
        sys.exit(0)


if __name__ == "__main__":
    main()
