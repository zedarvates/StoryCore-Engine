"""
Example usage of Feedback Configuration Manager

Demonstrates how to use the configuration system in the feedback module.

Requirements: 7.3
"""

from feedback_config import get_config, initialize_config
import json


def main():
    """Demonstrate configuration usage."""
    
    print("=" * 60)
    print("Feedback Configuration Manager - Example Usage")
    print("=" * 60)
    
    # Initialize configuration (loads from ~/.storycore/config.json)
    print("\n1. Initializing configuration...")
    config = get_config()
    
    # Display current configuration
    print("\n2. Current Configuration:")
    print(json.dumps(config.get_all(), indent=2))
    
    # Access individual settings using properties
    print("\n3. Accessing Individual Settings:")
    print(f"   Backend Proxy URL: {config.backend_proxy_url}")
    print(f"   Default Mode: {config.default_mode}")
    print(f"   Auto Collect Logs: {config.auto_collect_logs}")
    print(f"   Max Log Lines: {config.max_log_lines}")
    print(f"   Screenshot Max Size: {config.screenshot_max_size_mb} MB")
    print(f"   Enable Crash Reports: {config.enable_crash_reports}")
    print(f"   Privacy Consent Given: {config.privacy_consent_given}")
    
    # Example: Update a setting
    print("\n4. Updating Settings:")
    print("   Setting backend_proxy_url to 'https://feedback.storycore.example.com'...")
    config.backend_proxy_url = "https://feedback.storycore.example.com"
    print(f"   New value: {config.backend_proxy_url}")
    
    # Example: Update multiple settings at once
    print("\n5. Updating Multiple Settings:")
    updates = {
        "default_mode": "automatic",
        "max_log_lines": 1000,
        "privacy_consent_given": True
    }
    print(f"   Applying updates: {updates}")
    config.update(updates)
    print("   Updated configuration:")
    print(json.dumps(config.get_all(), indent=2))
    
    # Example: Reset to defaults
    print("\n6. Resetting to Defaults:")
    response = input("   Reset configuration to defaults? (y/n): ")
    if response.lower() == 'y':
        config.reset_to_defaults()
        print("   Configuration reset to defaults:")
        print(json.dumps(config.get_all(), indent=2))
    else:
        print("   Skipping reset.")
    
    print("\n" + "=" * 60)
    print("Configuration file location: ~/.storycore/config.json")
    print("=" * 60)


if __name__ == "__main__":
    main()
