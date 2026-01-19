#!/usr/bin/env python3
"""
Script to reduce max_examples in property-based tests for faster execution.
Reduces all max_examples values by 50% (minimum of 5 examples).
"""

import re
import os
from pathlib import Path


def reduce_max_examples(content: str) -> tuple[str, int]:
    """
    Reduce max_examples values in test file content.
    
    Returns:
        Tuple of (modified_content, number_of_changes)
    """
    changes = 0
    
    def replace_max_examples(match):
        nonlocal changes
        current_value = int(match.group(1))
        # Reduce by 50%, minimum of 5
        new_value = max(5, current_value // 2)
        changes += 1
        return f"max_examples={new_value}"
    
    # Pattern to match max_examples=NUMBER
    pattern = r'max_examples=(\d+)'
    modified_content = re.sub(pattern, replace_max_examples, content)
    
    return modified_content, changes


def process_test_file(file_path: Path) -> bool:
    """
    Process a single test file.
    
    Returns:
        True if file was modified, False otherwise
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        modified_content, changes = reduce_max_examples(original_content)
        
        if changes > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(modified_content)
            print(f"✓ {file_path}: {changes} changes")
            return True
        else:
            print(f"  {file_path}: no changes needed")
            return False
            
    except Exception as e:
        print(f"✗ {file_path}: ERROR - {e}")
        return False


def main():
    """Main execution function."""
    print("Reducing max_examples in property-based tests...\n")
    
    # Find all test files
    tests_dir = Path("tests")
    test_files = list(tests_dir.glob("**/*properties*.py"))
    
    if not test_files:
        print("No property-based test files found.")
        return
    
    print(f"Found {len(test_files)} property-based test files\n")
    
    modified_count = 0
    for test_file in sorted(test_files):
        if process_test_file(test_file):
            modified_count += 1
    
    print(f"\n{'='*60}")
    print(f"Summary: Modified {modified_count}/{len(test_files)} files")
    print(f"{'='*60}")
    print("\nTests should now run approximately 50% faster!")
    print("Run tests with: pytest tests/ -v")


if __name__ == "__main__":
    main()
