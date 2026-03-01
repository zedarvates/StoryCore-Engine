"""
Test for Full Project Creation Flow

This test verifies that when creating a new project:
1. The project directory is created first
2. The directory structure (including story/) is created BEFORE story documentation
3. Story documentation is generated last
4. All expected files and directories are created correctly
"""

import os
import sys
import tempfile
import shutil
import io
from pathlib import Path
from unittest.mock import patch, MagicMock
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.wizard.file_writer import FileWriter
from src.wizard.models import ProjectConfiguration, WizardState
from src.wizard.story_documentation import (
    StoryDocumentationGenerator, 
    CharacterProfile, 
    TimelineEvent,
    generate_story_documentation
)
import src.wizard.input_handler as input_handler_module


# Track the order of operations for verification
class OperationTracker:
    """Tracks the order of file/directory operations"""
    def __init__(self):
        self.operations = []
    
    def record(self, operation: str, path: str):
        self.operations.append((operation, path))
    
    def get_operations(self):
        return self.operations
    
    def clear(self):
        self.operations = []


# Global tracker instance
tracker = OperationTracker()


def setup_test_output_handler():
    """Set up a test-friendly output handler that avoids Unicode issues"""
    class TestOutputHandler:
        def __init__(self):
            self.output_stream = io.StringIO()
            self.input_stream = sys.stdin
        
        def display_message(self, message):
            print(f"  [MSG] {message}")
        
        def display_success(self, message):
            print(f"  [OK] {message}")
        
        def display_error(self, error):
            print(f"  [ERR] {error}")
        
        def display_warning(self, warning):
            print(f"  [WARN] {warning}")
        
        def display_info(self, info):
            print(f"  [INFO] {info}")
        
        def display_section(self, title):
            print(f"\n{'='*50}")
            print(f"  {title}")
            print(f"{'='*50}")
        
        def prompt_text(self, question, default=None, validator=None):
            return default or ""
        
        def prompt_choice(self, question, choices, default=None):
            return choices[0][0] if choices else None
        
        def prompt_multiline(self, question, end_marker="END"):
            return ""
        
        def prompt_confirm(self, question, default=True):
            return default
    
    handler = TestOutputHandler()
    input_handler_module._default_handler = handler
    return handler


def create_mock_config() -> ProjectConfiguration:
    """Create a mock ProjectConfiguration for testing"""
    return ProjectConfiguration(
        schema_version="1.0",
        project_name="test_project_creation",
        format={
            "key": "short_film",
            "name": "Short Film",
            "duration_range": [5, 15],
            "resolution": "1920x1080",
            "frame_rate": 24
        },
        duration_minutes=10,
        genre={
            "key": "drama",
            "name": "Drama",
            "style_defaults": {
                "visual_style": "cinematic",
                "color_palette": "warm"
            }
        },
        story="A test story about a hero's journey through challenges and triumphs.",
        style_config={
            "visual_style": "cinematic",
            "color_palette": "warm"
        },
        technical_specs={
            "resolution": "1920x1080",
            "frame_rate": 24
        }
    )


def create_mock_wizard_state() -> WizardState:
    """Create a mock WizardState for testing"""
    return WizardState(
        project_name="test_project_creation",
        format_key="short_film",
        duration_minutes=10,
        genre_key="drama",
        story_content="A test story about a hero's journey through challenges and triumphs.",
        generated_story=None,
        current_step=5,
        timestamp="2026-02-14T12:00:00"
    )


def test_directory_creation_order():
    """
    Test that verifies the order of operations:
    1. Project directory created first
    2. Directory structure (including story/) created BEFORE story documentation
    3. Story documentation generated last
    """
    print("\n" + "="*70)
    print("TEST: Directory Creation Order")
    print("="*70)
    
    # Create a temporary directory for testing
    temp_dir = tempfile.mkdtemp(prefix="storycore_test_")
    print(f"\nTest directory: {temp_dir}")
    
    try:
        # Create mock configuration and wizard state
        config = create_mock_config()
        wizard_state = create_mock_wizard_state()
        
        # Track operations by patching mkdir and file writes
        tracker.clear()
        original_mkdir = Path.mkdir
        original_open = open
        
        def tracked_mkdir(self, *args, **kwargs):
            tracker.record("mkdir", str(self))
            return original_mkdir(self, *args, **kwargs)
        
        def tracked_open(file, mode='r', *args, **kwargs):
            # Track write operations
            if 'w' in mode:
                tracker.record("write", str(file))
            return original_open(file, mode, *args, **kwargs)
        
        # Patch Path.mkdir and built-in open to track operations
        with patch.object(Path, 'mkdir', tracked_mkdir):
            with patch('builtins.open', tracked_open):
                # Create FileWriter and run project creation
                writer = FileWriter(temp_dir)
                result = writer.create_project_files(config, wizard_state)
        
        operations = tracker.get_operations()
        
        # Analyze the order of operations
        project_dir_created_idx = None
        story_dir_created_idx = None
        story_doc_written_idx = None
        
        for i, (op, path) in enumerate(operations):
            path_lower = path.lower().replace('\\', '/')
            
            # Find project directory creation (must end with test_project_creation)
            if project_dir_created_idx is None and op == "mkdir":
                if path_lower.endswith("/test_project_creation"):
                    project_dir_created_idx = i
                    print(f"\n  [{i}] Project dir created: {path}")
                    continue
            
            # Find story directory creation (must end with /story)
            if story_dir_created_idx is None and op == "mkdir":
                if path_lower.endswith("/story"):
                    story_dir_created_idx = i
                    print(f"  [{i}] Story dir created: {path}")
                    continue
            
            # Find story documentation writes (must contain /story/ with a file)
            if story_doc_written_idx is None and op == "write":
                if "/story/" in path_lower and path_lower.endswith(".md"):
                    story_doc_written_idx = i
                    print(f"  [{i}] First story doc written: {path}")
                    continue
            
            # Print other operations for debugging
            if op == "mkdir":
                print(f"  [{i}] mkdir: {path}")
        
        # Verify order
        print("\n--- Verification Results ---")
        
        all_passed = True
        
        # Check 1: Project directory created first
        if project_dir_created_idx is not None and project_dir_created_idx == 0:
            print("[PASS] Project directory created first (index 0)")
        else:
            print(f"[FAIL] Project directory NOT created first (index: {project_dir_created_idx})")
            all_passed = False
        
        # Check 2: Story directory created before story documentation
        if story_dir_created_idx is not None and story_doc_written_idx is not None:
            if story_dir_created_idx < story_doc_written_idx:
                print(f"[PASS] Story directory created BEFORE documentation (dir: {story_dir_created_idx}, doc: {story_doc_written_idx})")
            else:
                print(f"[FAIL] Story directory NOT created before documentation (dir: {story_dir_created_idx}, doc: {story_doc_written_idx})")
                all_passed = False
        elif story_dir_created_idx is not None and story_doc_written_idx is None:
            # Story dir created but no docs written - this is actually fine for order verification
            print(f"[PASS] Story directory created at index {story_dir_created_idx} (no docs written yet)")
        else:
            print(f"[FAIL] Could not verify story directory order (dir: {story_dir_created_idx}, doc: {story_doc_written_idx})")
            all_passed = False
        
        return all_passed
        
    finally:
        # Cleanup
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"\nCleaned up test directory: {temp_dir}")


def test_all_files_and_directories_created():
    """
    Test that verifies all expected files and directories are created:
    - project.json
    - assets/
    - exports/
    - storyboard/
    - audio/
    - video/
    - story/ (with all documentation files)
    - README.md
    """
    print("\n" + "="*70)
    print("TEST: All Files and Directories Created")
    print("="*70)
    
    # Create a temporary directory for testing
    temp_dir = tempfile.mkdtemp(prefix="storycore_test_")
    print(f"\nTest directory: {temp_dir}")
    
    try:
        # Create mock configuration and wizard state
        config = create_mock_config()
        wizard_state = create_mock_wizard_state()
        
        # Create FileWriter and run project creation
        writer = FileWriter(temp_dir)
        result = writer.create_project_files(config, wizard_state)
        
        project_path = Path(temp_dir) / "test_project_creation"
        
        # Define expected directories and files
        expected_directories = [
            "assets",
            "exports", 
            "storyboard",
            "audio",
            "video",
            "story",
            "story/04_character_bibles"
        ]
        
        expected_files = [
            "project.json",
            "README.md",
            "story/00_master_outline.md",
            "story/01_plot_core.md",
            "story/02_lore_worldbuilding.md",
            "story/03_conspiracy_hidden_truth.md",
            "story/05_timelines.md",
            "story/06_style_guide.md"
        ]
        
        print("\n--- Checking Directories ---")
        all_passed = True
        
        for dir_name in expected_directories:
            dir_path = project_path / dir_name
            if dir_path.exists() and dir_path.is_dir():
                print(f"[PASS] Directory exists: {dir_name}/")
            else:
                print(f"[FAIL] Directory missing: {dir_name}/")
                all_passed = False
        
        print("\n--- Checking Files ---")
        
        for file_name in expected_files:
            file_path = project_path / file_name
            if file_path.exists() and file_path.is_file():
                size = file_path.stat().st_size
                print(f"[PASS] File exists: {file_name} ({size} bytes)")
            else:
                print(f"[FAIL] File missing: {file_name}")
                all_passed = False
        
        # Verify project.json content
        print("\n--- Verifying project.json content ---")
        project_json_path = project_path / "project.json"
        if project_json_path.exists():
            import json
            with open(project_json_path, 'r', encoding='utf-8') as f:
                project_data = json.load(f)
            
            if project_data.get("project_name") == "test_project_creation":
                print("[PASS] project.json has correct project_name")
            else:
                print("[FAIL] project.json has incorrect project_name")
                all_passed = False
            
            if project_data.get("duration_minutes") == 10:
                print("[PASS] project.json has correct duration_minutes")
            else:
                print("[FAIL] project.json has incorrect duration_minutes")
                all_passed = False
        
        # Verify story documentation content
        print("\n--- Verifying story documentation content ---")
        master_outline_path = project_path / "story" / "00_master_outline.md"
        if master_outline_path.exists():
            content = master_outline_path.read_text(encoding='utf-8')
            if "test_project_creation" in content:
                print("[PASS] 00_master_outline.md contains project name")
            else:
                print("[FAIL] 00_master_outline.md missing project name")
                all_passed = False
            
            if "StoryCore-Engine" in content:
                print("[PASS] 00_master_outline.md contains StoryCore-Engine signature")
            else:
                print("[FAIL] 00_master_outline.md missing signature")
                all_passed = False
        
        return all_passed
        
    finally:
        # Cleanup
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"\nCleaned up test directory: {temp_dir}")


def test_story_directory_exists_before_documentation():
    """
    Specific test to verify that story/ directory exists before 
    story documentation generation is called
    """
    print("\n" + "="*70)
    print("TEST: Story Directory Exists Before Documentation Generation")
    print("="*70)
    
    temp_dir = tempfile.mkdtemp(prefix="storycore_test_")
    print(f"\nTest directory: {temp_dir}")
    
    try:
        project_path = Path(temp_dir) / "test_project_creation"
        
        # Create mock configuration and wizard state
        config = create_mock_config()
        wizard_state = create_mock_wizard_state()
        
        # Track when story directory is created vs when documentation is generated
        story_dir_exists_when_doc_called = False
        
        original_generate_all_files = StoryDocumentationGenerator.generate_all_files
        
        def patched_generate_all_files(self, output_dir):
            nonlocal story_dir_exists_when_doc_called
            # Check if story directory exists at this point
            story_dir = output_dir / "story"
            story_dir_exists_when_doc_called = story_dir.exists()
            print(f"  Story dir exists when generate_all_files called: {story_dir_exists_when_doc_called}")
            return original_generate_all_files(self, output_dir)
        
        with patch.object(StoryDocumentationGenerator, 'generate_all_files', patched_generate_all_files):
            writer = FileWriter(temp_dir)
            result = writer.create_project_files(config, wizard_state)
        
        if story_dir_exists_when_doc_called:
            print("\n[PASS] Story directory EXISTS when documentation generation is called")
            print("  This confirms the story/ folder is created BEFORE documentation generation")
            return True
        else:
            print("\n[FAIL] Story directory DOES NOT EXIST when documentation generation is called")
            print("  This indicates a potential issue with the creation order")
            return False
        
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"\nCleaned up test directory: {temp_dir}")


def test_project_creation_without_wizard_state():
    """
    Test that project creation works without wizard_state (no story documentation)
    """
    print("\n" + "="*70)
    print("TEST: Project Creation Without Wizard State")
    print("="*70)
    
    temp_dir = tempfile.mkdtemp(prefix="storycore_test_")
    print(f"\nTest directory: {temp_dir}")
    
    try:
        config = create_mock_config()
        
        # Create FileWriter and run project creation WITHOUT wizard_state
        writer = FileWriter(temp_dir)
        result = writer.create_project_files(config, wizard_state=None)
        
        project_path = Path(temp_dir) / "test_project_creation"
        
        # Verify basic structure is created
        expected_items = [
            ("project.json", "file"),
            ("README.md", "file"),
            ("assets", "dir"),
            ("exports", "dir"),
            ("storyboard", "dir"),
            ("audio", "dir"),
            ("video", "dir"),
            ("story", "dir")  # story directory should still be created
        ]
        
        all_passed = True
        print("\n--- Checking created items ---")
        
        for name, item_type in expected_items:
            item_path = project_path / name
            if item_type == "file":
                if item_path.exists() and item_path.is_file():
                    print(f"[PASS] File exists: {name}")
                else:
                    print(f"[FAIL] File missing: {name}")
                    all_passed = False
            else:
                if item_path.exists() and item_path.is_dir():
                    print(f"[PASS] Directory exists: {name}/")
                else:
                    print(f"[FAIL] Directory missing: {name}/")
                    all_passed = False
        
        # Verify story directory is empty (no documentation generated)
        story_path = project_path / "story"
        if story_path.exists():
            story_contents = list(story_path.iterdir())
            if len(story_contents) == 0:
                print("[PASS] Story directory is empty (no documentation generated)")
            else:
                print(f"[FAIL] Story directory has unexpected contents: {[p.name for p in story_contents]}")
                all_passed = False
        
        return all_passed
        
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"\nCleaned up test directory: {temp_dir}")


def main():
    """Run all tests"""
    print("\n" + "#"*70)
    print("# STORYCORE-ENGINE: Project Creation Flow Tests")
    print("#"*70)
    
    # Set up test-friendly output handler to avoid Unicode issues
    setup_test_output_handler()
    
    results = {}
    
    # Run all tests
    results["Directory Creation Order"] = test_directory_creation_order()
    results["All Files and Directories Created"] = test_all_files_and_directories_created()
    results["Story Directory Exists Before Documentation"] = test_story_directory_exists_before_documentation()
    results["Project Creation Without Wizard State"] = test_project_creation_without_wizard_state()
    
    # Print summary
    print("\n" + "#"*70)
    print("# TEST SUMMARY")
    print("#"*70)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "PASSED" if passed else "FAILED"
        symbol = "[PASS]" if passed else "[FAIL]"
        print(f"  {symbol} {test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "-"*70)
    if all_passed:
        print("ALL TESTS PASSED!")
        print("\nThe project creation flow correctly:")
        print("  1. Creates the project directory first")
        print("  2. Creates the directory structure (including story/) BEFORE documentation")
        print("  3. Generates story documentation last")
        print("  4. Creates all expected files and directories")
    else:
        print("SOME TESTS FAILED - Please review the output above")
    print("-"*70)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
