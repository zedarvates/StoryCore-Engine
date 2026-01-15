#!/usr/bin/env python3
"""
End-to-End Test for Interactive Project Setup Wizard

This script tests the complete wizard flow programmatically.
"""

import sys
import tempfile
import shutil
from pathlib import Path
from io import StringIO
import json

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from wizard.wizard_orchestrator import WizardOrchestrator
from wizard.config_builder import build_project_configuration
from wizard.file_writer import create_project_files


class MockInputHandler:
    """Mock input handler that provides predefined responses"""
    
    def __init__(self, responses):
        self.responses = responses
        self.response_index = 0
    
    def prompt_text(self, question, default=None, validator=None):
        if self.response_index < len(self.responses):
            response = self.responses[self.response_index]
            self.response_index += 1
            
            # Validate if validator provided
            if validator:
                is_valid, error = validator(response)
                if not is_valid:
                    print(f"Validation error: {error}")
                    return self.prompt_text(question, default, validator)
            
            return response
        return default or ""
    
    def prompt_choice(self, question, choices, default=None):
        if self.response_index < len(self.responses):
            choice_index = int(self.responses[self.response_index]) - 1
            self.response_index += 1
            return choices[choice_index][0]
        return choices[0][0] if choices else ""
    
    def prompt_multiline(self, question, end_marker="END"):
        if self.response_index < len(self.responses):
            response = self.responses[self.response_index]
            self.response_index += 1
            return response
        return ""
    
    def prompt_confirm(self, question, default=True):
        if self.response_index < len(self.responses):
            response = self.responses[self.response_index].lower()
            self.response_index += 1
            return response in ['y', 'yes', 'oui', '1', 'true']
        return default
    
    def display_message(self, message):
        print(f"[INFO] {message}")
    
    def display_error(self, error):
        print(f"[ERROR] {error}")
    
    def display_success(self, message):
        print(f"[SUCCESS] {message}")
    
    def display_section(self, title):
        print(f"\n=== {title} ===")


def test_wizard_e2e():
    """Test complete wizard flow end-to-end"""
    print("🧪 Testing Interactive Project Setup Wizard End-to-End")
    print("=" * 60)
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp()
    print(f"Using temporary directory: {temp_dir}")
    
    try:
        # Mock responses for wizard
        responses = [
            "test-e2e-project",           # Project name
            "1",                          # Format (court_metrage)
            "5",                          # Duration (5 minutes)
            "1",                          # Genre (action)
            "This is a test story for the end-to-end wizard test. It demonstrates the complete flow from user input through project creation. The story has enough content to pass validation and shows how the wizard collects all necessary information to create a complete StoryCore-Engine project.",  # Story content
            "y"                           # Confirm
        ]
        
        # Create orchestrator with mock input handler
        orchestrator = WizardOrchestrator(temp_dir)
        orchestrator.input_handler = MockInputHandler(responses)
        
        print("\n🎬 Running wizard...")
        
        # Run wizard
        wizard_state = orchestrator.run_wizard()
        
        if wizard_state is None:
            print("❌ Wizard returned None - test failed")
            return False
        
        print("✅ Wizard completed successfully")
        print(f"   Project name: {wizard_state.project_name}")
        print(f"   Format: {wizard_state.format_key}")
        print(f"   Duration: {wizard_state.duration_minutes} minutes")
        print(f"   Genre: {wizard_state.genre_key}")
        print(f"   Story length: {len(wizard_state.story_content)} characters")
        
        # Build configuration
        print("\n⚙️ Building configuration...")
        config = build_project_configuration(wizard_state)
        
        print("✅ Configuration built successfully")
        print(f"   Schema version: {config.schema_version}")
        print(f"   Estimated shots: {config.format['estimated_shot_count']}")
        print(f"   Style lighting: {config.style_config['visual']['lighting']}")
        
        # Create project files
        print("\n📁 Creating project files...")
        success = create_project_files(config, temp_dir)
        
        if not success:
            print("❌ Failed to create project files")
            return False
        
        print("✅ Project files created successfully")
        
        # Verify project structure
        project_path = Path(temp_dir) / "test-e2e-project"
        
        print("\n🔍 Verifying project structure...")
        
        # Check project directory
        if not project_path.exists():
            print("❌ Project directory not created")
            return False
        print("✅ Project directory exists")
        
        # Check project.json
        project_json = project_path / "project.json"
        if not project_json.exists():
            print("❌ project.json not created")
            return False
        
        with open(project_json, 'r', encoding='utf-8') as f:
            project_data = json.load(f)
        
        if project_data['project_name'] != 'test-e2e-project':
            print("❌ project.json has incorrect project name")
            return False
        print("✅ project.json is valid")
        
        # Check README
        readme_path = project_path / "README.md"
        if not readme_path.exists():
            print("❌ README.md not created")
            return False
        print("✅ README.md exists")
        
        # Check directory structure
        expected_dirs = ["assets", "exports", "storyboard", "audio", "video"]
        for dir_name in expected_dirs:
            dir_path = project_path / dir_name
            if not dir_path.exists():
                print(f"❌ Directory {dir_name} not created")
                return False
        print("✅ All expected directories created")
        
        print("\n🎉 End-to-End Test PASSED!")
        print("=" * 60)
        print("The Interactive Project Setup Wizard is working correctly.")
        print(f"Test project created at: {project_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Clean up
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"Cleaned up temporary directory: {temp_dir}")


if __name__ == "__main__":
    success = test_wizard_e2e()
    sys.exit(0 if success else 1)