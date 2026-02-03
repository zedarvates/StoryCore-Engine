"""
Memory Validate command handler - Validate memory system integrity and project state.
"""

import argparse
import json
from pathlib import Path
from typing import Dict, Any, List

from ..base import BaseHandler
from ..errors import UserError, SystemError


class MemoryValidateHandler(BaseHandler):
    """Handler for the memory validate command - memory system validation."""

    command_name = "memory-validate"
    description = "Validate memory system integrity and project state"
    aliases = ["memory-validate", "mem-validate"]

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up memory validate command arguments."""
        parser.add_argument(
            "--project",
            default=".",
            help="Project directory to validate (default: current directory)"
        )

        parser.add_argument(
            "--scope",
            nargs="+",
            choices=["structure", "config", "memory", "discussions", "assets"],
            default=["structure", "config", "memory"],
            help="Validation scope (default: structure, config, memory). Multiple scopes can be specified."
        )

        parser.add_argument(
            "--format",
            choices=["human", "json"],
            default="human",
            help="Output format (default: human)"
        )

        parser.add_argument(
            "--strict",
            action="store_true",
            help="Enable strict validation mode"
        )

        parser.add_argument(
            "--fix",
            action="store_true",
            help="Attempt to fix validation issues automatically"
        )

    def execute(self, args: argparse.Namespace) -> int:
        """Execute the memory validate command."""
        try:
            # Validate project path
            project_path = Path(args.project)
            if not project_path.exists():
                raise UserError(
                    f"Project directory not found: {project_path}",
                    "Check the project path or create a new project with 'storycore init'"
                )

            # Import memory system
            try:
                from memory_system import MemorySystemCore
            except ImportError as e:
                raise SystemError(
                    f"Memory system not available: {e}",
                    "Ensure memory_system module is installed"
                )

            # Initialize memory system
            memory_system = MemorySystemCore(project_path)

            # Determine validation scopes
            scopes = args.scope if isinstance(args.scope, list) else [args.scope]

            # Initialize results
            validation_results = {
                "project": str(project_path.absolute()),
                "scopes": scopes,
                "structure_validation": {},
                "config_validation": {},
                "memory_validation": {},
                "discussion_validation": {},
                "asset_validation": {},
                "overall_passed": True,
                "exit_code": 0
            }

            # Run structure validation if requested
            if "structure" in scopes:
                structure_result = self._validate_structure(memory_system)
                validation_results["structure_validation"] = structure_result
                if not structure_result.get("passed", True):
                    validation_results["overall_passed"] = False
                    validation_results["exit_code"] = 1

            # Run config validation if requested
            if "config" in scopes:
                config_result = self._validate_config(memory_system)
                validation_results["config_validation"] = config_result
                if not config_result.get("passed", True):
                    validation_results["overall_passed"] = False
                    validation_results["exit_code"] = 1

            # Run memory validation if requested
            if "memory" in scopes:
                memory_result = self._validate_memory(memory_system)
                validation_results["memory_validation"] = memory_result
                if not memory_result.get("passed", True):
                    validation_results["overall_passed"] = False
                    validation_results["exit_code"] = 1

            # Run discussion validation if requested
            if "discussions" in scopes:
                discussion_result = self._validate_discussions(memory_system)
                validation_results["discussion_validation"] = discussion_result
                if not discussion_result.get("passed", True):
                    validation_results["overall_passed"] = False
                    validation_results["exit_code"] = 1

            # Run asset validation if requested
            if "assets" in scopes:
                asset_result = self._validate_assets(memory_system)
                validation_results["asset_validation"] = asset_result
                if not asset_result.get("passed", True):
                    validation_results["overall_passed"] = False
                    validation_results["exit_code"] = 1

            # Output results
            if args.format == "json":
                print(json.dumps(validation_results, indent=2))
            else:
                self._print_human_results(validation_results, args)

            # Attempt fixes if requested and there are failures
            if args.fix and not validation_results["overall_passed"]:
                print("\nAttempting to fix validation issues...")
                fixed_count = self._attempt_fixes(memory_system, validation_results)
                if fixed_count > 0:
                    print(f"✓ Fixed {fixed_count} issue(s)")
                    print("Run validation again to verify fixes")

            return validation_results["exit_code"]

        except Exception as e:
            return self.handle_error(e, "memory validation")

    def _validate_structure(self, memory_system: 'MemorySystemCore') -> Dict[str, Any]:
        """Validate project structure."""
        result = {"passed": True, "errors": []}

        # Check required directories
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

        for dir_name in required_dirs:
            dir_path = memory_system.project_path / dir_name
            if not dir_path.exists():
                result["passed"] = False
                result["errors"].append(f"Missing directory: {dir_name}")

        return result

    def _validate_config(self, memory_system: 'MemorySystemCore') -> Dict[str, Any]:
        """Validate project configuration."""
        result = {"passed": True, "errors": []}

        try:
            config = memory_system.config_manager.load_config()
            if config is None:
                result["passed"] = False
                result["errors"].append("Project configuration not found")
                return result

            # Check required fields
            required_fields = ["project_name", "project_type", "objectives"]
            for field in required_fields:
                if not hasattr(config, field):
                    result["passed"] = False
                    result["errors"].append(f"Missing required field: {field}")

        except Exception as e:
            result["passed"] = False
            result["errors"].append(f"Config validation error: {str(e)}")

        return result

    def _validate_memory(self, memory_system: 'MemorySystemCore') -> Dict[str, Any]:
        """Validate memory system."""
        result = {"passed": True, "errors": []}

        try:
            memory = memory_system.memory_manager.load_memory()
            if memory is None:
                result["passed"] = False
                result["errors"].append("Memory not found")
                return result

            # Check memory structure
            required_sections = ["objectives", "entities", "decisions", "current_state"]
            for section in required_sections:
                if not hasattr(memory, section):
                    result["passed"] = False
                    result["errors"].append(f"Missing memory section: {section}")

        except Exception as e:
            result["passed"] = False
            result["errors"].append(f"Memory validation error: {str(e)}")

        return result

    def _validate_discussions(self, memory_system: 'MemorySystemCore') -> Dict[str, Any]:
        """Validate discussion files."""
        result = {"passed": True, "errors": [], "checked": 0, "valid": 0}

        try:
            discussions_dir = memory_system.project_path / "assistant" / "discussions_raw"
            if not discussions_dir.exists():
                result["passed"] = False
                result["errors"].append("Discussions directory not found")
                return result

            # Check discussion files
            discussion_files = list(discussions_dir.glob("*.json"))
            result["checked"] = len(discussion_files)

            for file_path in discussion_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        json.load(f)
                    result["valid"] += 1
                except Exception as e:
                    result["passed"] = False
                    result["errors"].append(f"Invalid discussion file {file_path.name}: {str(e)}")

        except Exception as e:
            result["passed"] = False
            result["errors"].append(f"Discussion validation error: {str(e)}")

        return result

    def _validate_assets(self, memory_system: 'MemorySystemCore') -> Dict[str, Any]:
        """Validate asset files."""
        result = {"passed": True, "errors": [], "checked": 0, "valid": 0}

        try:
            assets_dir = memory_system.project_path / "assets"
            if not assets_dir.exists():
                result["passed"] = False
                result["errors"].append("Assets directory not found")
                return result

            # Check asset files
            asset_files = []
            for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.mp4', '*.avi', '*.mov', '*.mp3', '*.wav', '*.flac']:
                asset_files.extend(assets_dir.glob(ext))

            result["checked"] = len(asset_files)

            for file_path in asset_files:
                if file_path.exists():
                    result["valid"] += 1
                else:
                    result["passed"] = False
                    result["errors"].append(f"Missing asset file: {file_path.name}")

        except Exception as e:
            result["passed"] = False
            result["errors"].append(f"Asset validation error: {str(e)}")

        return result

    def _print_human_results(self, results: Dict[str, Any], args: argparse.Namespace) -> None:
        """Print human-readable validation results."""
        print(f"Memory System Validation: {results['project']}")
        print(f"Validation scopes: {', '.join(results['scopes'])}")
        print()

        # Print structure validation results
        if results.get("structure_validation"):
            print("Structure Validation:")
            if results["structure_validation"].get("passed", True):
                print("  [PASS] Structure validation: PASSED")
            else:
                print("  [FAIL] Structure validation: FAILED")
                for error in results["structure_validation"].get("errors", []):
                    print(f"    - {error}")
            print()

        # Print config validation results
        if results.get("config_validation"):
            print("Config Validation:")
            if results["config_validation"].get("passed", True):
                print("  [PASS] Config validation: PASSED")
            else:
                print("  [FAIL] Config validation: FAILED")
                for error in results["config_validation"].get("errors", []):
                    print(f"    - {error}")
            print()

        # Print memory validation results
        if results.get("memory_validation"):
            print("Memory Validation:")
            if results["memory_validation"].get("passed", True):
                print("  [PASS] Memory validation: PASSED")
            else:
                print("  [FAIL] Memory validation: FAILED")
                for error in results["memory_validation"].get("errors", []):
                    print(f"    - {error}")
            print()

        # Print discussion validation results
        if results.get("discussion_validation"):
            print("Discussion Validation:")
            if results["discussion_validation"].get("passed", True):
                print(f"  [PASS] Discussion validation: PASSED ({results['discussion_validation'].get('valid', 0)}/{results['discussion_validation'].get('checked', 0)} files)")
            else:
                print(f"  [FAIL] Discussion validation: FAILED ({results['discussion_validation'].get('valid', 0)}/{results['discussion_validation'].get('checked', 0)} files)")
                for error in results["discussion_validation"].get("errors", []):
                    print(f"    - {error}")
            print()

        # Print asset validation results
        if results.get("asset_validation"):
            print("Asset Validation:")
            if results["asset_validation"].get("passed", True):
                print(f"  [PASS] Asset validation: PASSED ({results['asset_validation'].get('valid', 0)}/{results['asset_validation'].get('checked', 0)} files)")
            else:
                print(f"  [FAIL] Asset validation: FAILED ({results['asset_validation'].get('valid', 0)}/{results['asset_validation'].get('checked', 0)} files)")
                for error in results["asset_validation"].get("errors", []):
                    print(f"    - {error}")
            print()

        # Print overall result
        if results["overall_passed"]:
            print("SUCCESS: All memory system validations passed!")
        else:
            print("FAILURE: Some memory system validations failed")

    def _attempt_fixes(self, memory_system: 'MemorySystemCore', validation_results: Dict[str, Any]) -> int:
        """Attempt to automatically fix validation issues."""
        fixed_count = 0

        # Fix structure issues
        if not validation_results.get("structure_validation", {}).get("passed", True):
            for error in validation_results["structure_validation"].get("errors", []):
                if "Missing directory:" in error:
                    dir_name = error.replace("Missing directory: ", "")
                    dir_path = memory_system.project_path / dir_name
                    try:
                        dir_path.mkdir(parents=True, exist_ok=True)
                        print(f"  Created directory: {dir_name}")
                        fixed_count += 1
                    except Exception as e:
                        self.logger.warning(f"Failed to create directory {dir_name}: {e}")

        # Fix config issues
        if not validation_results.get("config_validation", {}).get("passed", True):
            # Try to recreate config from defaults
            try:
                config = memory_system.config_manager.create_default_config(
                    project_name="Recovered Project",
                    project_type="video",
                    objectives=[]
                )
                if memory_system.config_manager.save_config(config):
                    print("  Recreated project configuration")
                    fixed_count += 1
            except Exception as e:
                self.logger.warning(f"Failed to recreate config: {e}")

        # Fix memory issues
        if not validation_results.get("memory_validation", {}).get("passed", True):
            # Try to recreate memory from defaults
            try:
                memory_data = {
                    "schema_version": "1.0",
                    "last_updated": datetime.now().isoformat(),
                    "objectives": [],
                    "entities": [],
                    "constraints": [],
                    "decisions": [],
                    "style_rules": [],
                    "task_backlog": [],
                    "current_state": {
                        "phase": "recovery",
                        "progress_percentage": 0,
                        "active_tasks": [],
                        "blockers": [],
                        "last_activity": datetime.now().isoformat()
                    }
                }
                memory_path = memory_system.project_path / "assistant" / "memory.json"
                memory_path.parent.mkdir(parents=True, exist_ok=True)
                with open(memory_path, 'w', encoding='utf-8') as f:
                    json.dump(memory_data, f, indent=2, ensure_ascii=False)
                print("  Recreated memory structure")
                fixed_count += 1
            except Exception as e:
                self.logger.warning(f"Failed to recreate memory: {e}")

        return fixed_count