"""
Demo script for Diagnostic Collector functionality.

This script demonstrates the basic diagnostic collection capabilities
implemented in Phase 1 of the Feedback & Diagnostics module.
"""

from src.diagnostic_collector import DiagnosticCollector
import json


def main():
    """Demonstrate diagnostic collector functionality."""
    print("=" * 60)
    print("Diagnostic Collector Demo")
    print("=" * 60)
    print()
    
    # Initialize collector
    collector = DiagnosticCollector()
    print(f"✓ Initialized DiagnosticCollector")
    print(f"  StoryCore Version: {collector.storycore_version}")
    print()
    
    # Collect system information
    print("1. System Information Collection")
    print("-" * 60)
    system_info = collector.collect_system_info()
    for key, value in system_info.items():
        print(f"  {key}: {value}")
    print()
    
    # Collect module state
    print("2. Module State Collection")
    print("-" * 60)
    test_modules = ["grid-generator", "promotion-engine", "qa-engine"]
    for module_name in test_modules:
        module_context = collector.collect_module_state(module_name)
        print(f"  Module: {module_context['active_module']}")
        print(f"    State: {json.dumps(module_context['module_state'], indent=6)}")
    print()
    
    # Create a complete report payload
    print("3. Complete Report Payload")
    print("-" * 60)
    payload = collector.create_report_payload(
        report_type="bug",
        description="Example bug report for demonstration",
        reproduction_steps="1. Open application\n2. Navigate to grid generator\n3. Observe issue",
        include_logs=False,
        module_name="grid-generator"
    )
    
    print("  Report Payload Structure:")
    print(f"    Schema Version: {payload['schema_version']}")
    print(f"    Report Type: {payload['report_type']}")
    print(f"    Timestamp: {payload['timestamp']}")
    print(f"    Active Module: {payload['module_context']['active_module']}")
    print(f"    Description: {payload['user_input']['description'][:50]}...")
    print()
    
    # Show full payload as JSON
    print("4. Full Payload (JSON)")
    print("-" * 60)
    print(json.dumps(payload, indent=2))
    print()
    
    print("=" * 60)
    print("✓ Demo completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
