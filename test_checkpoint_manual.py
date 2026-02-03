#!/usr/bin/env python3
"""Manual test script for checkpoint verification."""

import sys
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, 'src')

from project_manager import ProjectManager

def test_project_initialization():
    """Test complete project initialization."""
    print("=" * 60)
    print("CHECKPOINT TEST: Project Initialization")
    print("=" * 60)
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp()
    print(f"\n✓ Created temp directory: {temp_dir}")
    
    try:
        # Initialize project manager
        pm = ProjectManager()
        print("✓ ProjectManager initialized")
        
        # Create a test project
        project_name = "checkpoint-test-project"
        print(f"\n→ Creating project: {project_name}")
        result = pm.init_project(project_name, temp_dir)
        
        # Check result
        if result["success"]:
            print("✓ Project initialization succeeded")
            print(f"  - Project path: {result['project_path']}")
            print(f"  - Created {len(result['created_files'])} files")
            print(f"  - Created {len(result['created_directories'])} directories")
            
            # Verify files exist
            project_path = Path(result['project_path'])
            
            print("\n→ Verifying project structure:")
            
            # Check directories
            dirs_to_check = [
                project_path,
                project_path / "assets",
                project_path / "assets" / "images",
                project_path / "assets" / "audio"
            ]
            
            for dir_path in dirs_to_check:
                if dir_path.exists() and dir_path.is_dir():
                    print(f"  ✓ Directory exists: {dir_path.name}")
                else:
                    print(f"  ✗ Directory missing: {dir_path.name}")
                    return False
            
            # Check files
            files_to_check = [
                project_path / "project.json",
                project_path / "storyboard.json",
                project_path / "story.md"
            ]
            
            for file_path in files_to_check:
                if file_path.exists() and file_path.is_file():
                    size = file_path.stat().st_size
                    print(f"  ✓ File exists: {file_path.name} ({size} bytes)")
                else:
                    print(f"  ✗ File missing: {file_path.name}")
                    return False
            
            # Verify story.md content
            story_content = (project_path / "story.md").read_text(encoding="utf-8")
            if project_name in story_content:
                print(f"  ✓ story.md contains project name")
            else:
                print(f"  ✗ story.md missing project name")
                return False
            
            # Verify UTF-8 encoding
            try:
                (project_path / "story.md").read_text(encoding="utf-8")
                print(f"  ✓ story.md is UTF-8 encoded")
            except UnicodeDecodeError:
                print(f"  ✗ story.md encoding error")
                return False
            
            # Test validation
            print("\n→ Testing validation:")
            is_valid, missing = pm.validate_project_structure(project_path)
            if is_valid:
                print("  ✓ Project structure validation passed")
            else:
                print(f"  ✗ Validation failed. Missing: {missing}")
                return False
            
            print("\n" + "=" * 60)
            print("✓ ALL CHECKPOINT TESTS PASSED")
            print("=" * 60)
            return True
            
        else:
            print(f"✗ Project initialization failed")
            print(f"  Errors: {result['errors']}")
            return False
            
    except Exception as e:
        print(f"\n✗ Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup
        try:
            project_path = Path(temp_dir) / project_name
            if project_path.exists():
                shutil.rmtree(project_path)
                print(f"\n✓ Cleaned up test project")
        except Exception as e:
            print(f"\n⚠ Cleanup warning: {e}")

if __name__ == "__main__":
    success = test_project_initialization()
    sys.exit(0 if success else 1)
