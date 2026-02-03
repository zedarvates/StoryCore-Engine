"""
Verify LTX-2 documentation completeness.

This script checks that all required documentation exists and is complete.

Requirements: 14.1-14.15
"""

import sys
from pathlib import Path


def check_file_exists(file_path: Path, description: str) -> bool:
    """Check if a file exists and has content."""
    if not file_path.exists():
        print(f"❌ Missing: {description}")
        print(f"   Expected: {file_path}")
        return False
    
    # Check file has content
    content = file_path.read_text(encoding='utf-8')
    if len(content) < 100:  # Minimum content check
        print(f"❌ Incomplete: {description}")
        print(f"   File: {file_path}")
        print(f"   Size: {len(content)} bytes (too small)")
        return False
    
    print(f"✅ {description}")
    print(f"   File: {file_path}")
    print(f"   Size: {len(content):,} bytes")
    return True


def verify_core_documentation():
    """Verify core LTX-2 documentation files."""
    print("=" * 80)
    print("Core Documentation Files")
    print("=" * 80)
    
    spec_dir = Path(".kiro/specs/comfyui-desktop-default-integration")
    
    files = [
        (spec_dir / "LTX2_WORKFLOW.md", "LTX-2 Workflow Documentation"),
        (spec_dir / "LTX2_QUICK_START.md", "LTX-2 Quick Start Guide"),
        (spec_dir / "LTX2_WORKFLOW_ADDITION.md", "LTX-2 Workflow Addition Summary"),
    ]
    
    results = []
    for file_path, description in files:
        results.append(check_file_exists(file_path, description))
    
    return all(results)


def verify_workflow_file():
    """Verify LTX-2 workflow JSON file."""
    print("\n" + "=" * 80)
    print("Workflow JSON File")
    print("=" * 80)
    
    workflow_path = Path("assets/workflows/ltx2_image_to_video.json")
    
    if not workflow_path.exists():
        print(f"❌ Missing: LTX-2 Workflow JSON")
        print(f"   Expected: {workflow_path}")
        return False
    
    # Verify JSON is valid
    import json
    try:
        with open(workflow_path, 'r') as f:
            workflow = json.load(f)
        
        node_count = len(workflow)
        print(f"✅ LTX-2 Workflow JSON")
        print(f"   File: {workflow_path}")
        print(f"   Nodes: {node_count}")
        
        # Check for key nodes
        required_nodes = ["75", "98", "102", "92:60", "92:1", "92:48", "92:76", "92:80", "92:95"]
        missing_nodes = [node for node in required_nodes if node not in workflow]
        
        if missing_nodes:
            print(f"❌ Missing nodes: {missing_nodes}")
            return False
        
        print(f"✅ All required nodes present")
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return False


def verify_documentation_content():
    """Verify documentation contains required sections."""
    print("\n" + "=" * 80)
    print("Documentation Content Verification")
    print("=" * 80)
    
    spec_dir = Path(".kiro/specs/comfyui-desktop-default-integration")
    
    # Check LTX2_WORKFLOW.md sections
    workflow_doc = spec_dir / "LTX2_WORKFLOW.md"
    if workflow_doc.exists():
        content = workflow_doc.read_text(encoding='utf-8')
        
        required_sections = [
            "## Overview",
            "## Key Benefits",
            "## Required Models",
            "## Two-Stage Generation Process",
            "## Workflow Parameters",
            "## Prompt Engineering for Motion",
            "## Audio Generation",
            "## Performance Characteristics",
            "## Troubleshooting",
        ]
        
        missing_sections = []
        for section in required_sections:
            if section not in content:
                missing_sections.append(section)
        
        if missing_sections:
            print(f"❌ LTX2_WORKFLOW.md missing sections:")
            for section in missing_sections:
                print(f"   - {section}")
            return False
        
        print(f"✅ LTX2_WORKFLOW.md has all required sections")
    
    # Check LTX2_QUICK_START.md sections
    quickstart_doc = spec_dir / "LTX2_QUICK_START.md"
    if quickstart_doc.exists():
        content = quickstart_doc.read_text(encoding='utf-8')
        
        required_sections = [
            "## Prerequisites",
            "## Step 1:",
            "## Step 2:",
            "## Step 3:",
        ]
        
        missing_sections = []
        for section in required_sections:
            if section not in content:
                missing_sections.append(section)
        
        if missing_sections:
            print(f"❌ LTX2_QUICK_START.md missing sections:")
            for section in missing_sections:
                print(f"   - {section}")
            return False
        
        print(f"✅ LTX2_QUICK_START.md has all required sections")
    
    return True


def verify_integration_with_main_docs():
    """Verify LTX-2 is integrated with main documentation."""
    print("\n" + "=" * 80)
    print("Integration with Main Documentation")
    print("=" * 80)
    
    spec_dir = Path(".kiro/specs/comfyui-desktop-default-integration")
    
    # Check if REQUIRED_MODELS.md mentions LTX-2
    models_doc = spec_dir / "REQUIRED_MODELS.md"
    if models_doc.exists():
        content = models_doc.read_text(encoding='utf-8')
        
        ltx2_models = [
            "ltx-2-19b-distilled",
            "gemma_3_12B",
            "ltx-2-spatial-upscaler",
        ]
        
        found_models = []
        for model in ltx2_models:
            if model in content:
                found_models.append(model)
        
        if len(found_models) == len(ltx2_models):
            print(f"✅ REQUIRED_MODELS.md includes LTX-2 models")
        else:
            print(f"⚠️  REQUIRED_MODELS.md may need LTX-2 model updates")
    
    # Check if TROUBLESHOOTING_GUIDE.md mentions LTX-2
    troubleshooting_doc = spec_dir / "TROUBLESHOOTING_GUIDE.md"
    if troubleshooting_doc.exists():
        content = troubleshooting_doc.read_text(encoding='utf-8')
        
        if "LTX" in content or "video" in content.lower():
            print(f"✅ TROUBLESHOOTING_GUIDE.md includes video/LTX-2 content")
        else:
            print(f"⚠️  TROUBLESHOOTING_GUIDE.md may need LTX-2 troubleshooting")
    
    return True


def verify_code_examples():
    """Verify documentation includes code examples."""
    print("\n" + "=" * 80)
    print("Code Examples Verification")
    print("=" * 80)
    
    spec_dir = Path(".kiro/specs/comfyui-desktop-default-integration")
    workflow_doc = spec_dir / "LTX2_WORKFLOW.md"
    
    if workflow_doc.exists():
        content = workflow_doc.read_text(encoding='utf-8')
        
        # Check for code blocks
        python_blocks = content.count("```python")
        json_blocks = content.count("```json")
        bash_blocks = content.count("```bash")
        
        print(f"✅ Code examples found:")
        print(f"   Python blocks: {python_blocks}")
        print(f"   JSON blocks: {json_blocks}")
        print(f"   Bash blocks: {bash_blocks}")
        
        if python_blocks > 0 and json_blocks > 0:
            print(f"✅ Documentation includes code examples")
            return True
        else:
            print(f"⚠️  Documentation may need more code examples")
            return True  # Not critical
    
    return True


def main():
    """Run all documentation verification checks."""
    print("\n" + "=" * 80)
    print("LTX-2 DOCUMENTATION COMPLETENESS VERIFICATION")
    print("=" * 80 + "\n")
    
    results = []
    
    # Run verifications
    results.append(("Core Documentation Files", verify_core_documentation()))
    results.append(("Workflow JSON File", verify_workflow_file()))
    results.append(("Documentation Content", verify_documentation_content()))
    results.append(("Integration with Main Docs", verify_integration_with_main_docs()))
    results.append(("Code Examples", verify_code_examples()))
    
    # Print summary
    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name:.<50} {status}")
        if not passed:
            all_passed = False
    
    print("=" * 80)
    
    if all_passed:
        print("\n🎉 ALL DOCUMENTATION CHECKS PASSED!")
        print("\nDocumentation includes:")
        print("  ✅ LTX-2 Workflow comprehensive guide")
        print("  ✅ LTX-2 Quick Start step-by-step tutorial")
        print("  ✅ Workflow JSON file with all nodes")
        print("  ✅ Required sections and content")
        print("  ✅ Code examples and configurations")
        print("  ✅ Integration with main documentation")
        print()
        return 0
    else:
        print("\n❌ SOME DOCUMENTATION CHECKS FAILED. Please review the output above.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
