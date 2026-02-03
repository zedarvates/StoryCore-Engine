"""
Deploy Workflows command handler - Deploy ComfyUI workflows.

Validates: Requirements 4.1, 4.2
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import SystemError


class DeployWorkflowsHandler(BaseHandler):
    """Handler for the deploy-workflows command - Deploy ComfyUI workflows."""
    
    command_name = "deploy-workflows"
    description = "Deploy required workflows to ComfyUI"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up deploy-workflows command arguments."""
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
            help="Deploy specific workflow by name (default: all workflows)"
        )
        
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force deployment even if workflow already exists"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the deploy-workflows command."""
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
            print("║                    ComfyUI Workflow Deployment                                ║")
            print("╚══════════════════════════════════════════════════════════════════════════════╝")
            print()
            print(f"  Source Directory: {workflows_dir}")
            print(f"  Target Directory: {comfyui_workflows_dir}")
            print()
            
            if not workflows_dir.exists():
                self.print_error(f"Source workflows directory does not exist: {workflows_dir}")
                return 1
            
            if not comfyui_workflows_dir.exists():
                self.print_warning(f"Target workflows directory does not exist: {comfyui_workflows_dir}")
                print("  Creating directory...")
                comfyui_workflows_dir.mkdir(parents=True, exist_ok=True)
            
            # Initialize workflow manager
            workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
            
            # Check current installation status
            installed_workflows = workflow_manager.check_installed_workflows()
            
            # Determine which workflows to deploy
            if args.workflow:
                # Deploy specific workflow
                if args.workflow not in workflow_manager.workflow_registry:
                    self.print_error(f"Workflow '{args.workflow}' not found")
                    return 1
                
                workflows_to_deploy = [args.workflow]
            else:
                # Deploy all workflows
                workflows_to_deploy = list(workflow_manager.workflow_registry.keys())
            
            # Filter out already installed workflows unless force is specified
            if not args.force:
                workflows_to_deploy = [
                    name for name in workflows_to_deploy
                    if not workflow_manager.workflow_registry[name].installed
                    or not workflow_manager.workflow_registry[name].up_to_date
                ]
                
                if not workflows_to_deploy:
                    self.print_success("All workflows are already deployed and up-to-date")
                    return 0
            
            print(f"Deploying {len(workflows_to_deploy)} workflow(s)...")
            print()
            
            # Deploy workflows
            results = {}
            
            for workflow_name in workflows_to_deploy:
                workflow_info = workflow_manager.workflow_registry[workflow_name]
                
                print(f"  Deploying {workflow_name} v{workflow_info.version}...")
                success = workflow_manager.deploy_workflow(workflow_name)
                results[workflow_name] = success
                
                if success:
                    print(f"    ✓ Deployed successfully")
                else:
                    print(f"    ✗ Deployment failed")
                
                print()
            
            # Display results
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ Deployment Summary                                                            │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            print()
            
            successful = sum(1 for success in results.values() if success)
            failed = len(results) - successful
            
            for workflow_name, success in results.items():
                status = "✓ SUCCESS" if success else "✗ FAILED"
                print(f"  {workflow_name}: {status}")
            
            print()
            print(f"  Total: {successful} successful, {failed} failed")
            print()
            
            if successful == len(results):
                self.print_success("All workflows deployed successfully!")
            elif successful > 0:
                self.print_warning(f"Some workflows failed to deploy ({failed} failed)")
            else:
                self.print_error("All deployments failed")
            
            print()
            print("╔══════════════════════════════════════════════════════════════════════════════╗")
            print("║ Deployment complete                                                           ║")
            print("╚══════════════════════════════════════════════════════════════════════════════╝")
            
            return 0 if failed == 0 else 1
            
        except Exception as e:
            return self.handle_error(e, "Workflow deployment")
