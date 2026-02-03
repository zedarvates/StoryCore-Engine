"""
List Workflows command handler - Show workflow status.

Validates: Requirement 4.1
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import SystemError


class ListWorkflowsHandler(BaseHandler):
    """Handler for the list-workflows command - Show workflow status."""
    
    command_name = "list-workflows"
    description = "List required workflows and their status"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up list-workflows command arguments."""
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
            "--verbose",
            action="store_true",
            help="Show detailed workflow information"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the list-workflows command."""
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
            print("║                    ComfyUI Workflow Status                                    ║")
            print("╚══════════════════════════════════════════════════════════════════════════════╝")
            print()
            print(f"  Source Directory: {workflows_dir}")
            print(f"  Target Directory: {comfyui_workflows_dir}")
            print()
            
            if not workflows_dir.exists():
                self.print_warning(f"Source workflows directory does not exist: {workflows_dir}")
                print()
                return 1
            
            if not comfyui_workflows_dir.exists():
                self.print_warning(f"Target workflows directory does not exist: {comfyui_workflows_dir}")
                print()
            
            # Initialize workflow manager
            workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
            
            # Check installation status
            installed_workflows = workflow_manager.check_installed_workflows()
            
            # Display workflow status
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ Workflow Status                                                               │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            print()
            
            installed_count = 0
            missing_count = 0
            outdated_count = 0
            
            for workflow_info in installed_workflows:
                if workflow_info.installed:
                    if workflow_info.up_to_date:
                        installed_count += 1
                        status = "✓ INSTALLED"
                    else:
                        outdated_count += 1
                        status = "⚠ OUTDATED"
                else:
                    missing_count += 1
                    status = "✗ MISSING"
                
                print(f"  [{status}] {workflow_info.name} v{workflow_info.version}")
                print(f"    Description: {workflow_info.description}")
                
                if args.verbose:
                    print(f"    Source: {workflow_info.file_path}")
                    print(f"    Required Nodes: {', '.join(workflow_info.required_nodes)}")
                    print(f"    Required Models: {', '.join(workflow_info.required_models)}")
                
                print()
            
            # Summary
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ Summary                                                                       │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            print()
            print(f"  Total workflows: {len(installed_workflows)}")
            print(f"  Installed: {installed_count}")
            print(f"  Outdated: {outdated_count}")
            print(f"  Missing: {missing_count}")
            print()
            
            if missing_count > 0 or outdated_count > 0:
                self.print_warning(f"{missing_count + outdated_count} workflow(s) need deployment")
                print("  Run 'python storycore.py deploy-workflows' to deploy/update workflows")
            else:
                self.print_success("All workflows are installed and up-to-date")
            
            print()
            print("╔══════════════════════════════════════════════════════════════════════════════╗")
            print("║ Workflow listing complete                                                     ║")
            print("╚══════════════════════════════════════════════════════════════════════════════╝")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "Workflow listing")
