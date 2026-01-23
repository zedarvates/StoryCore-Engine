"""
Basic test script for FileAnalyzer functionality.

This script tests the core functionality of the FileAnalyzer class.
"""

from pathlib import Path
from src.migration.file_analyzer import (
    FileAnalyzer,
    FileCategory,
    ProjectStructure
)


def test_file_analyzer_initialization():
    """Test FileAnalyzer initialization"""
    print("Test 1: FileAnalyzer initialization")
    
    # Test with current directory
    analyzer = FileAnalyzer(Path.cwd())
    assert analyzer.project_root == Path.cwd().resolve()
    print("  ✓ Initialization successful")
    
    # Test with non-existent directory
    try:
        analyzer = FileAnalyzer(Path("/nonexistent/path"))
        print("  ✗ Should have raised FileNotFoundError")
        return False
    except FileNotFoundError:
        print("  ✓ Correctly raises FileNotFoundError for invalid path")
    
    return True


def test_file_categorization():
    """Test file categorization logic"""
    print("\nTest 2: File categorization")
    
    analyzer = FileAnalyzer(Path.cwd())
    
    # Test Python files
    test_cases = [
        ("test_example.py", FileCategory.PYTHON_TEST),
        ("example_test.py", FileCategory.PYTHON_TEST),
        ("module.py", FileCategory.PYTHON_SOURCE),
        ("component.tsx", FileCategory.TYPESCRIPT_SOURCE),
        ("component.test.tsx", FileCategory.TYPESCRIPT_TEST),
        ("config.json", FileCategory.CONFIGURATION),
        ("README.md", FileCategory.DOCUMENTATION),
        ("image.png", FileCategory.ASSET_IMAGE),
        ("icon.png", FileCategory.ASSET_ICON),
        ("audio.mp3", FileCategory.ASSET_AUDIO),
        ("video.mp4", FileCategory.ASSET_VIDEO),
        ("script.sh", FileCategory.TOOL_SCRIPT),
    ]
    
    for filename, expected_category in test_cases:
        # Create a temporary path for testing
        test_path = Path.cwd() / filename
        category = analyzer.categorize_file(test_path)
        
        if category == expected_category:
            print(f"  ✓ {filename} -> {category.value}")
        else:
            print(f"  ✗ {filename} -> Expected {expected_category.value}, got {category.value}")
            return False
    
    return True


def test_project_scanning():
    """Test project scanning functionality"""
    print("\nTest 3: Project scanning")
    
    analyzer = FileAnalyzer(Path.cwd())
    
    try:
        structure = analyzer.scan_project()
        
        print(f"  ✓ Scanned {structure.total_files} files")
        print(f"  ✓ Total size: {structure.total_size / (1024*1024):.2f} MB")
        print(f"  ✓ Python files: {len(structure.python_files)}")
        print(f"  ✓ TypeScript files: {len(structure.typescript_files)}")
        print(f"  ✓ Test files: {len(structure.test_files)}")
        print(f"  ✓ Config files: {len(structure.config_files)}")
        print(f"  ✓ Documentation: {len(structure.doc_files)}")
        
        return True
    except Exception as e:
        print(f"  ✗ Scanning failed: {e}")
        return False


def test_dependency_analysis():
    """Test dependency analysis"""
    print("\nTest 4: Dependency analysis")
    
    analyzer = FileAnalyzer(Path.cwd())
    structure = analyzer.scan_project()
    
    # Get Python files for dependency analysis
    python_files = structure.python_files[:10]  # Test with first 10 files
    
    try:
        graph = analyzer.analyze_dependencies(python_files)
        print(f"  ✓ Analyzed dependencies for {len(python_files)} files")
        print(f"  ✓ Found {len(graph.nodes)} files with dependencies")
        
        return True
    except Exception as e:
        print(f"  ✗ Dependency analysis failed: {e}")
        return False


def test_movement_plan_generation():
    """Test movement plan generation"""
    print("\nTest 5: Movement plan generation")
    
    analyzer = FileAnalyzer(Path.cwd())
    structure = analyzer.scan_project()
    
    try:
        plan = analyzer.generate_movement_plan(structure)
        print(f"  ✓ Generated movement plan with {len(plan.movements)} movements")
        
        # Show sample movements
        if plan.movements:
            print("\n  Sample movements:")
            for movement in plan.movements[:5]:
                print(f"    {movement.source.name} -> {movement.destination}")
        
        return True
    except Exception as e:
        print(f"  ✗ Movement plan generation failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("FileAnalyzer Basic Tests")
    print("=" * 60)
    
    tests = [
        test_file_analyzer_initialization,
        test_file_categorization,
        test_project_scanning,
        test_dependency_analysis,
        test_movement_plan_generation
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n  ✗ Test failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)
    
    return all(results)


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
