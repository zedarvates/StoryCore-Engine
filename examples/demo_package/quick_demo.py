#!/usr/bin/env python3
"""
Quick Demo - 2-Minute Demonstration of Fact-Checking System

This condensed demo shows the core capabilities in under 2 minutes.
Run with: python examples/demo_package/quick_demo.py
"""

import sys
import time
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from fact_checker.fact_checker_command import FactCheckerCommand
from fact_checker.configuration import get_config

def main():
    """Run quick demo."""
    print("\n" + "=" * 70)
    print("FACT-CHECKING SYSTEM - QUICK DEMO".center(70))
    print("=" * 70 + "\n")
    
    # Initialize
    print("⚙️  Initializing system...")
    config = get_config()
    fact_checker = FactCheckerCommand(config)
    print("✓ Ready\n")
    
    # Demo 1: Text Analysis
    print("📄 DEMO 1: Text Fact-Checking")
    print("-" * 70)
    
    sample_text = """
    The Earth orbits the Sun at an average distance of 93 million miles,
    completing one orbit in approximately 365.25 days. The Moon orbits Earth
    at an average distance of 238,855 miles. Water boils at 100 degrees Celsius
    at sea level. The speed of light in vacuum is approximately 299,792,458
    meters per second. The human body contains approximately 37.2 trillion cells.
    """
    
    print("Input: Scientific claims about astronomy, physics, and biology")
    print("\nAnalyzing...")
    start = time.time()
    
    result = fact_checker.execute(mode="text", input_data=sample_text)
    elapsed = time.time() - start
    
    if result.get("status") == "success":
        report = result["report"]
        summary = report["summary"]
        print(f"✓ Completed in {elapsed:.2f}s")
        print(f"\nResults:")
        print(f"  • Claims extracted: {summary['total_claims']}")
        print(f"  • Average confidence: {summary['average_confidence']:.1f}%")
        print(f"  • High risk claims: {summary['high_risk_count']}")
        print(f"  • Domains: {', '.join(summary['domains_analyzed'])}")
    
    # Demo 2: Video Analysis
    print("\n\n🎥 DEMO 2: Video Transcript Analysis")
    print("-" * 70)
    
    sample_transcript = """
    [00:00:00] SPEAKER: Everyone knows that this policy is terrible. Nobody
    supports it. All the experts agree with me. The opposition wants to destroy
    everything we've built. They wake up every morning thinking about how to
    hurt working families. This is the worst policy in history.
    """
    
    print("Input: Interview transcript with potential manipulation signals")
    print("\nAnalyzing...")
    start = time.time()
    
    result = fact_checker.execute(mode="video", input_data=sample_transcript)
    elapsed = time.time() - start
    
    if result.get("status") == "success":
        report = result["report"]
        print(f"✓ Completed in {elapsed:.2f}s")
        print(f"\nResults:")
        print(f"  • Coherence score: {report['coherence_score']:.1f}%")
        print(f"  • Integrity score: {report['integrity_score']:.1f}%")
        print(f"  • Risk level: {report['risk_level']}")
        print(f"  • Manipulation signals: {len(report['manipulation_signals'])}")
    
    # Demo 3: Caching
    print("\n\n⚡ DEMO 3: Caching Performance")
    print("-" * 70)
    
    print("Running same analysis twice to demonstrate caching...")
    
    # First run
    start = time.time()
    result1 = fact_checker.execute(mode="text", input_data=sample_text)
    time1 = time.time() - start
    
    # Second run (cached)
    start = time.time()
    result2 = fact_checker.execute(mode="text", input_data=sample_text)
    time2 = time.time() - start
    
    print(f"  • First run: {time1:.3f}s (no cache)")
    print(f"  • Second run: {time2:.3f}s (cached: {result2.get('cached', False)})")
    if time2 > 0:
        print(f"  • Speedup: {time1/time2:.1f}x faster")
    
    # Summary
    print("\n" + "=" * 70)
    print("DEMO COMPLETE".center(70))
    print("=" * 70)
    print("\nKey Features Demonstrated:")
    print("  ✓ Scientific fact extraction and verification")
    print("  ✓ Video transcript manipulation detection")
    print("  ✓ High-performance caching")
    print("  ✓ Confidence scoring and risk assessment")
    print("\nFor full demo: python examples/demo_package/run_demo.py")
    print("Documentation: src/fact_checker/README.md\n")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("Make sure you're running from the project root directory.")
        sys.exit(1)
