"""
Demo script for GitHub Template Generator

This script demonstrates how to use the GitHubTemplateGenerator to create
formatted issue templates and pre-filled GitHub URLs.
"""

from src.diagnostic_collector import DiagnosticCollector
from src.github_template_generator import GitHubTemplateGenerator


def main():
    """Demonstrate GitHub template generation."""
    print("=" * 80)
    print("GitHub Template Generator Demo")
    print("=" * 80)
    print()
    
    # Create instances
    collector = DiagnosticCollector()
    generator = GitHubTemplateGenerator()
    
    # Create a sample report payload
    payload = collector.create_report_payload(
        report_type="bug",
        description="The grid generator crashes when processing large images",
        reproduction_steps="1. Open StoryCore\n2. Load a 4K image\n3. Click 'Generate Grid'\n4. Application crashes",
        include_logs=False,
        module_name="grid-generator"
    )
    
    # Add some sample diagnostics for demonstration
    payload["diagnostics"]["stacktrace"] = """Traceback (most recent call last):
  File "src/grid_generator.py", line 145, in generate_grid
    panel = image.crop(box)
  File "PIL/Image.py", line 1234, in crop
    raise ValueError("Invalid crop box")
ValueError: Invalid crop box"""
    
    # Generate the formatted issue body
    print("1. Formatted Issue Body:")
    print("-" * 80)
    issue_body = generator.format_issue_body(payload)
    print(issue_body)
    print()
    
    # Generate the GitHub URL
    print("\n2. Pre-filled GitHub URL:")
    print("-" * 80)
    github_url = generator.generate_github_url(payload)
    print(github_url)
    print()
    
    # Show the labels that would be applied
    print("\n3. Automatic Labels:")
    print("-" * 80)
    labels = generator._generate_labels(payload)
    for label in labels:
        print(f"  - {label}")
    print()
    
    print("\n" + "=" * 80)
    print("Demo Complete!")
    print("=" * 80)
    print("\nIn Manual Mode, this URL would be:")
    print("  1. Opened in the user's default browser")
    print("  2. Copied to the clipboard for easy pasting")
    print("\nThe user can then review and submit the issue on GitHub.")


if __name__ == "__main__":
    main()
