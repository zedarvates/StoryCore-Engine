#!/usr/bin/env python3
"""
File Size Monitor - Automated large file detection for StoryCore-Engine
Enforces 1500-line threshold with warnings at 1200 lines
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple

def check_file_sizes(directory: str = "src", threshold: int = 1500, warning: int = 1200) -> int:
    """Monitor Python file sizes and report violations"""
    violations: List[Tuple[Path, int]] = []
    warnings: List[Tuple[Path, int]] = []
    
    for py_file in Path(directory).rglob("*.py"):
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                line_count = sum(1 for _ in f)
            
            if line_count >= threshold:
                violations.append((py_file, line_count))
            elif line_count >= warning:
                warnings.append((py_file, line_count))
                
        except (IOError, UnicodeDecodeError) as e:
            print(f"⚠️  Could not read {py_file}: {e}")
    
    # Report results
    if warnings:
        print("⚠️  Files approaching 1500-line limit:")
        for file_path, lines in sorted(warnings, key=lambda x: x[1], reverse=True):
            print(f"   {file_path}: {lines} lines")
        print()
    
    if violations:
        print("🚨 Files requiring IMMEDIATE refactoring:")
        for file_path, lines in sorted(violations, key=lambda x: x[1], reverse=True):
            print(f"   {file_path}: {lines} lines")
        print()
        print("Run: python3 tools/refactor_assistant.py <file> for refactoring suggestions")
        return 1
    
    if not warnings and not violations:
        print("✅ All files within size limits")
    
    return 0

def generate_report(directory: str = "src") -> None:
    """Generate detailed file size report"""
    files_data = []
    
    for py_file in Path(directory).rglob("*.py"):
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                line_count = sum(1 for _ in f)
            files_data.append((py_file, line_count))
        except (IOError, UnicodeDecodeError):
            continue
    
    # Sort by line count (descending)
    files_data.sort(key=lambda x: x[1], reverse=True)
    
    print("📊 File Size Report (Top 10 largest files):")
    print("-" * 50)
    for i, (file_path, lines) in enumerate(files_data[:10], 1):
        status = "🚨" if lines >= 1500 else "⚠️ " if lines >= 1200 else "✅"
        print(f"{i:2d}. {status} {file_path}: {lines} lines")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--report":
        generate_report()
    else:
        sys.exit(check_file_sizes())
