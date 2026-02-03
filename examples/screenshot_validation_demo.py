"""
Screenshot Validation Demo

Demonstrates the usage of the validate_screenshot function from DiagnosticCollector.
This shows how to validate screenshot files before including them in feedback reports.
"""

import sys
import os
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.diagnostic_collector import DiagnosticCollector


def demo_screenshot_validation():
    """Demonstrate screenshot validation with various scenarios."""
    
    print("=" * 70)
    print("Screenshot Validation Demo")
    print("=" * 70)
    print()
    
    # Create a DiagnosticCollector instance
    collector = DiagnosticCollector()
    
    # Example 1: Valid PNG file (simulated)
    print("Example 1: Validating a PNG file")
    print("-" * 70)
    
    # In a real scenario, you would have an actual file path
    # For demo purposes, we'll show the expected behavior
    
    example_files = [
        ("screenshot.png", "Valid PNG file"),
        ("image.jpg", "Valid JPEG file"),
        ("animation.gif", "Valid GIF file"),
        ("document.pdf", "Invalid format (PDF)"),
        ("large_image.png", "File exceeding 5MB"),
        ("", "Empty file path"),
    ]
    
    for filename, description in example_files:
        print(f"\nFile: {filename}")
        print(f"Description: {description}")
        
        # Note: In actual usage, you would call:
        # is_valid, error = collector.validate_screenshot(file_path)
        
        # Show expected behavior based on file type
        if filename.endswith('.png') or filename.endswith('.jpg') or filename.endswith('.gif'):
            if 'large' in filename:
                print("Expected result: ❌ INVALID")
                print("Expected error: File size exceeds maximum allowed size of 5 MB")
            else:
                print("Expected result: ✅ VALID")
                print("Expected error: None")
        elif filename.endswith('.pdf'):
            print("Expected result: ❌ INVALID")
            print("Expected error: Invalid file format: .pdf. Accepted formats are: .gif, .jpeg, .jpg, .png")
        elif not filename:
            print("Expected result: ❌ INVALID")
            print("Expected error: File not found or invalid path")
        
        print()
    
    print("=" * 70)
    print("\nUsage in Code:")
    print("-" * 70)
    print("""
from src.diagnostic_collector import DiagnosticCollector

# Create collector instance
collector = DiagnosticCollector()

# Validate a screenshot file
file_path = "path/to/screenshot.png"
is_valid, error_message = collector.validate_screenshot(file_path)

if is_valid:
    print("Screenshot is valid and can be included in the report")
    # Proceed with encoding and including in payload
else:
    print(f"Screenshot validation failed: {error_message}")
    # Show error to user and request a different file
    """)
    
    print("\n" + "=" * 70)
    print("Validation Rules:")
    print("-" * 70)
    print("✓ Accepted formats: PNG, JPG, JPEG, GIF")
    print("✓ Maximum file size: 5 MB")
    print("✓ File must exist and be readable")
    print("✓ File content must match the extension (magic byte validation)")
    print("✓ File must not be empty")
    print("=" * 70)


if __name__ == "__main__":
    demo_screenshot_validation()
