"""
Test script for StoryCore LLM Memory System implementation.

This script verifies that the core functionality works correctly.
"""

import sys
import os
import tempfile
from pathlib import Path

# Add the src directory to the path (project root)
src_path = Path(__file__).resolve().parent.parent.parent
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

# Now we can import from memory_system
from memory_system import (
    MemorySystemCore,
    AssetType,
    Message,
    Conversation,
    create_memory_system,
)


def test_basic_initialization():
    """Test basic project initialization."""
    print("\n=== Test 1: Basic Initialization ===")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create memory system
        core = create_memory_system(
            project_path=tmpdir,
            project_name="Test Project",
            project_type="video",
            objectives=["Test objective 1", "Test objective 2"]
        )
        
        # Verify initialization
        status = core.get_status()
        print(f"  Project path: {status['project_path']}")
        print(f"  Config loaded: {status['config_loaded']}")
        print(f"  Validation valid: {status['validation_valid']}")
        
        # Check directory structure
        project_path = Path(tmpdir)
        required_dirs = [
            "assistant",
            "assistant/discussions_raw",
            "assistant/discussions_summary",
            "build_logs",
            "assets",
            "assets/images",
            "assets/audio",
            "assets/video",
            "assets/documents",
            "summaries",
            "qa_reports",
        ]
        
        all_exist = True
        for dir_name in required_dirs:
            exists = (project_path / dir_name).exists()
            print(f"  Directory '{dir_name}': {'✓' if exists else '✗'}")
            if not exists:
                all_exist = False
        
        # Check required files
        required_files = [
            "project_config.json",
            "assistant/memory.json",
            "assistant/variables.json",
        ]
        
        for file_name in required_files:
            exists = (project_path / file_name).exists()
            print(f"  File '{file_name}': {'✓' if exists else '✗'}")
            if not exists:
                all_exist = False
        
        if all_exist:
            print("  ✓ All directories and files created successfully")
            return True
        else:
            print("  ✗ Some directories or files are missing")
            return False


def test_discussion_recording():
    """Test discussion recording functionality."""
    print("\n=== Test 2: Discussion Recording ===")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        core = create_memory_system(
            project_path=tmpdir,
            project_name="Test Project",
            objectives=["Test objective"]
        )
        
        # Create a conversation
        from datetime import datetime
        messages = [
            {
                "role": "user",
                "content": "We need to create a new feature for video processing.",
                "timestamp": datetime.now().isoformat()
            },
            {
                "role": "assistant",
                "content": "Decision: We'll use FFmpeg for video processing. It's reliable and widely supported.",
                "timestamp": datetime.now().isoformat()
            },
            {
                "role": "user",
                "content": "Good. Also, we must ensure the output format is MP4.",
                "timestamp": datetime.now().isoformat()
            },
        ]
        
        # Record the discussion
        result = core.record_discussion(messages)
        print(f"  Discussion recorded: {'✓' if result else '✗'}")
        
        # Verify discussion file was created
        discussions_path = Path(tmpdir) / "assistant" / "discussions_raw"
        discussion_files = list(discussions_path.glob("*.json"))
        print(f"  Discussion files created: {len(discussion_files)}")
        
        # Get context and verify discussion is included
        context = core.get_project_context()
        has_discussions = len(context.recent_discussions) > 0 if context else False
        print(f"  Discussion in context: {'✓' if has_discussions else '✗'}")
        
        return result and has_discussions


def test_memory_updates():
    """Test memory update functionality."""
    print("\n=== Test 3: Memory Updates ===")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        core = create_memory_system(
            project_path=tmpdir,
            project_name="Test Project",
            objectives=["Initial objective"]
        )
        
        # Add a decision
        result = core.add_memory_decision(
            description="Use Python for backend development",
            rationale="Python has rich ecosystem for AI/ML integration"
        )
        print(f"  Decision added: {'✓' if result else '✗'}")
        
        # Add an entity
        result = core.add_memory_entity(
            name="VideoProcessor",
            entity_type="module",
            description="Handles video encoding and decoding"
        )
        print(f"  Entity added: {'✓' if result else '✗'}")
        
        # Add an objective
        result = core.add_memory_objective("Implement video processing pipeline")
        print(f"  Objective added: {'✓' if result else '✗'}")
        
        # Get context and verify memory
        context = core.get_project_context()
        if context and context.memory:
            decisions_count = len(context.memory.decisions)
            entities_count = len(context.memory.entities)
            objectives_count = len(context.memory.objectives)
            
            print(f"  Decisions in memory: {decisions_count}")
            print(f"  Entities in memory: {entities_count}")
            print(f"  Objectives in memory: {objectives_count}")
            
            return decisions_count > 0 and entities_count > 0 and objectives_count > 0
        
        return False


def test_variables():
    """Test variables management."""
    print("\n=== Test 4: Variables Management ===")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        core = create_memory_system(
            project_path=tmpdir,
            project_name="Test Project",
            objectives=[]
        )
        
        # Set some variables
        result = core.set_variable("max_resolution", 1080, "Maximum video resolution")
        print(f"  Set numeric variable: {'✓' if result else '✗'}")
        
        result = core.set_variable("enable_hd", True, "Enable HD output")
        print(f"  Set boolean variable: {'✓' if result else '✗'}")
        
        result = core.set_variable("output_formats", ["mp4", "webm"], "Supported output formats")
        print(f"  Set array variable: {'✓' if result else '✗'}")
        
        # Get variables
        max_res = core.get_variable("max_resolution")
        enable_hd = core.get_variable("enable_hd")
        formats = core.get_variable("output_formats")
        
        print(f"  Retrieved max_resolution: {max_res}")
        print(f"  Retrieved enable_hd: {enable_hd}")
        print(f"  Retrieved output_formats: {formats}")
        
        return max_res == 1080 and enable_hd is True and formats == ["mp4", "webm"]


def test_validation():
    """Test project validation."""
    print("\n=== Test 5: Project Validation ===")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        core = create_memory_system(
            project_path=tmpdir,
            project_name="Test Project",
            objectives=[]
        )
        
        # Run validation
        result = core.validate_project_state()
        print(f"  Validation valid: {'✓' if result.valid else '✗'}")
        print(f"  Errors found: {len(result.errors)}")
        print(f"  Warnings: {len(result.warnings)}")
        
        return result.valid


def test_quality_check():
    """Test quality assurance checks."""
    print("\n=== Test 6: Quality Check ===")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        core = create_memory_system(
            project_path=tmpdir,
            project_name="Test Project",
            objectives=[]
        )
        
        # Add some content first
        core.add_memory_decision("Test decision", "Test rationale")
        core.add_memory_objective("Test objective")
        
        # Run quality check
        qa_result = core.run_quality_check()
        print(f"  QA Score: {qa_result['overall_score']:.1f}%")
        print(f"  Checks passed: {qa_result['checks_passed']}")
        print(f"  Checks failed: {qa_result['checks_failed']}")
        print(f"  Recommendations: {len(qa_result['recommendations'])}")
        
        return qa_result['overall_score'] >= 0


def test_recovery():
    """Test recovery functionality."""
    print("\n=== Test 7: Recovery Functionality ===")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        core = create_memory_system(
            project_path=tmpdir,
            project_name="Test Project",
            objectives=[]
        )
        
        # Simulate an error by creating an invalid JSON file
        error_file = Path(tmpdir) / "assistant" / "test_error.json"
        with open(error_file, 'w') as f:
            f.write("{ invalid json }")
        
        # Run validation to detect the error
        result = core.validate_project_state()
        print(f"  Errors detected: {len(result.errors)}")
        
        # Trigger recovery
        recovery_result = core.trigger_recovery()
        print(f"  Recovery success: {'✓' if recovery_result.success else '✗'}")
        
        # Clean up test file
        if error_file.exists():
            error_file.unlink()
        
        return True  # Recovery ran without errors


def run_all_tests():
    """Run all tests."""
    print("=" * 60)
    print("StoryCore LLM Memory System - Test Suite")
    print("=" * 60)
    
    tests = [
        ("Basic Initialization", test_basic_initialization),
        ("Discussion Recording", test_discussion_recording),
        ("Memory Updates", test_memory_updates),
        ("Variables Management", test_variables),
        ("Project Validation", test_validation),
        ("Quality Check", test_quality_check),
        ("Recovery Functionality", test_recovery),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"  ✗ Error: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    passed_count = 0
    failed_count = 0
    
    for name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"  {name}: {status}")
        if passed:
            passed_count += 1
        else:
            failed_count += 1
    
    print(f"\nTotal: {passed_count} passed, {failed_count} failed")
    print("=" * 60)
    
    return failed_count == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

