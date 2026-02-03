"""
Validate Workflows command handler - Validate workflow compatibility.

Validates: Requirement 4.3
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import SystemError


class ValidateWorkflowsHandler(BaseHandler):
    """Handler for the validate-workflows command - Validate workflow compatibility."""
    
    command_name = "validate-workflows"
    description = "Validate workflow compatibility with ComfyUI"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up validate-workflows command arguments."""
        parser.add_argument(
            "--workflows-dir",
            type=str,
            help="StoryCore workflows directory (default: assets/workflows)"
        )
        
        parser.add_argument(
            "--comfyui-workflows-dir",
            type=str,
            help="ComfyUI workflows directory (default: ~/ComfyUI/user/default/workflows)"
        )
        
        parser.add_argument(
            "--workflow",
            type=str,
            help="Validate specific workflow by name (default: all workflows)"
        )
        
        parser.add_argument(
            "--check-nodes",
            action="store_true",
            help="Check for missing custom nodes (requires ComfyUI connection)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the validate-workflows command."""
        try:
            # Import required modules
            try:
                from end_to_end.workflow_manager import WorkflowManager
            except ImportError as e:
                raise SystemError(
                    f"WorkflowManager not available: {e}",
                    "Ensure end_to_end modules are installed"
                )
            
            # Determine workflow directories
            if args.workflows_dir:
                workflows_dir = Path(args.workflows_dir)
            else:
                workflows_dir = Path("assets") / "workflows"
            
            if args.comfyui_workflows_dir:
                comfyui_workflows_dir = Path(args.comfyui_workflows_dir)
            else:
                comfyui_workflows_dir = Path.home() / "ComfyUI" / "user" / "default" / "workflows"
            
            print("╔══════════════════════════════════════════════════════════════════════════════╗")
            print("║                    ComfyUI Workflow Validation                                ║")
            print("╚══════════════════════════════════════════════════════════════════════════════╝")
            print()
            print(f"  Source Directory: {workflows_dir}")
            print()
            
            if not workflows_dir.exists():
                self.print_error(f"Source workflows directory does not exist: {workflows_dir}")
                return 1
            
            # Initialize workflow manager
            workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
            
            # Determine which workflows to validate
            if args.workflow:
                # Validate specific workflow
                if args.workflow not in workflow_manager.workflow_registry:
                    self.print_error(f"Workflow '{args.workflow}' not found")
                    return 1
                
                workflows_to_validate = [args.workflow]
            else:
                # Validate all workflows
                workflows_to_validate = list(workflow_manager.workflow_registry.keys())
            
            print(f"Validating {len(workflows_to_validate)} workflow(s)...")
            print()
            
            # Get installed nodes if requested
            installed_nodes = None
            if args.check_nodes:
                # TODO: Implement node checking via ComfyUI API
                self.print_warning("Node checking not yet implemented")
                print("  Skipping node compatibility check")
                print()
            
            # Validate workflows
            results = {}
            
            for workflow_name in workflows_to_validate:
                workflow_info = workflow_manager.workflow_registry[workflow_name]
                
                print(f"  Validating {workflow_name}...")
                
                # Validate workflow file
                validation_result = workflow_manager.validate_workflow(
                    workflow_info.file_path,
                    installed_nodes
                )
                
                results[workflow_name] = validation_result
                
                if validation_result.valid:
                    print(f"    ✓ Validation passed")
                else:
                    print(f"    ✗ Validation failed")
                    for error in validation_result.errors:
                        print(f"      Error: {error}")
                
                if validation_result.warnings:
                    for warning in validation_result.warnings:
                        print(f"      Warning: {warning}")
                
                if validation_result.missing_nodes:
                    print(f"      Missing nodes: {', '.join(validation_result.missing_nodes)}")
                
                print()
            
            # Display results
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ Validation Summary                                                            │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            print()
            
            valid_count = sum(1 for result in results.values() if result.valid)
            invalid_count = len(results) - valid_count
            
            for workflow_name, result in results.items():
                status = "✓ VALID" if result.valid else "✗ INVALID"
                print(f"  {workflow_name}: {status}")
                
                if not result.valid and result.errors:
                    for error in result.errors:
                        print(f"    • {error}")
            
            print()
            print(f"  Total: {valid_count} valid, {invalid_count} invalid")
            print()
            
            if invalid_count > 0:
                self.print_error(f"{invalid_count} workflow(s) failed validation")
                print("  Review the errors above and fix the workflow files")
            else:
                self.print_success("All workflows passed validation!")
            
            print()
            print("╔══════════════════════════════════════════════════════════════════════════════╗")
            print("║ Validation complete                                                           ║")
            print("╚══════════════════════════════════════════════════════════════════════════════╝")
            
            return 0 if invalid_count == 0 else 1
            
        except Exception as e:
            return self.handle_error(e, "Workflow validation")
