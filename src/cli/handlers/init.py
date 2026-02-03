"""
Init command handler - Initialize new StoryCore-Engine projects.
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime
from typing import Any

from ..base import BaseHandler
from ..errors import UserError, SystemError
from ..help import create_command_help


class InitHandler(BaseHandler):
    """Handler for the init command - project initialization."""
    
    command_name = "init"
    description = "Initialize a new StoryCore-Engine project"
    
    def get_help(self):
        """Get enhanced help for init command."""
        return (create_command_help(self.command_name, self.description)
                .add_example(
                    "storycore init my-project",
                    "Create a new project named 'my-project' in current directory"
                )
                .add_example(
                    "storycore init my-project --enable-memory",
                    "Create project with LLM Memory System enabled"
                )
                .add_example(
                    "storycore init my-project --path ~/projects",
                    "Create project in specific directory"
                )
                .add_example(
                    "storycore init --interactive",
                    "Use interactive wizard for guided project setup"
                )
                .add_note(
                    "Interactive mode provides a guided setup with character creation, "
                    "story generation, and configuration options."
                )
                .add_note(
                    "Legacy mode creates a basic project structure with default settings."
                )
                .add_note(
                    "The --enable-memory flag creates an assistant/ directory structure "
                    "for LLM conversation tracking, automatic summarization, and project memory."
                )
                .add_see_also("validate")
                .add_see_also("grid")
                .add_see_also("memory-validate"))
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up init command arguments."""
        self.setup_help(parser)
        
        parser.add_argument(
            "project_name",
            nargs="?",
            help="Name of the project to create (optional if using --interactive)"
        )
        
        parser.add_argument(
            "--path",
            default=".",
            help="Directory where project will be created (default: current directory)"
        )
        
        parser.add_argument(
            "--interactive", "-i",
            action="store_true",
            help="Use interactive wizard for project setup"
        )
        
        parser.add_argument(
            "--enable-memory",
            action="store_true",
            help="Enable LLM Memory System for this project (creates assistant/ directory structure)"
        )
        
        parser.add_argument(
            "--project-type",
            default="video",
            choices=["video", "script", "creative", "technical"],
            help="Type of project (default: video)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the init command."""
        try:
            # Check if we should use interactive wizard
            use_wizard = args.interactive or args.project_name is None
            
            if use_wizard:
                result = self._execute_wizard_mode(args)
            else:
                result = self._execute_legacy_mode(args)
            
            # After successful project creation, check ComfyUI integration
            if result == 0:
                self._check_comfyui_integration(args)
            
            return result
                
        except Exception as e:
            return self.handle_error(e, "project initialization")
    
    def _check_comfyui_integration(self, args: argparse.Namespace) -> None:
        """
        Check ComfyUI connection, trigger model downloads, and deploy workflows.
        
        Validates: Requirements 3.1, 4.1
        """
        import asyncio
        
        print("\n🔌 Checking ComfyUI Desktop integration...")
        
        try:
            # Import ComfyUI components from main entry point
            import storycore
            
            (config_manager, connection_manager, model_manager,
             workflow_manager, generation_engine, comfyui_config, ui_integration) = storycore.get_comfyui_components()
            
            if not connection_manager:
                print("  ⚠ ComfyUI integration not initialized")
                print("  System will operate in fallback mode")
                return
            
            # Check connection status
            status = connection_manager.get_status()
            
            if status.available:
                print(f"  ✓ Connected to ComfyUI Desktop at {status.url}")
                if status.version:
                    print(f"    Version: {status.version}")
                if status.queue_size > 0:
                    print(f"    Queue depth: {status.queue_size}")
                
                # Check for missing models
                print("\n📦 Checking required models...")
                missing_models = model_manager.check_required_models()
                
                if missing_models:
                    print(f"  ⚠ Found {len(missing_models)} missing models:")
                    for model in missing_models:
                        size_gb = model.file_size / (1024**3)
                        print(f"    - {model.name} ({size_gb:.1f} GB)")
                    
                    # Ask user if they want to download
                    if comfyui_config.auto_download_models:
                        print("\n  Auto-download is enabled. Starting downloads...")
                        self._download_models(model_manager, missing_models)
                    else:
                        response = input("\n  Download missing models now? (y/N): ").strip().lower()
                        if response == 'y':
                            self._download_models(model_manager, missing_models)
                        else:
                            print("  Skipping model downloads. You can download later with:")
                            print("    storycore download-models")
                else:
                    print("  ✓ All required models are present")
                
                # Check and deploy workflows
                print("\n📋 Checking required workflows...")
                workflows = workflow_manager.check_installed_workflows()
                missing_workflows = [w for w in workflows if w.required and not w.installed]
                
                if missing_workflows:
                    print(f"  ⚠ Found {len(missing_workflows)} missing workflows:")
                    for workflow in missing_workflows:
                        print(f"    - {workflow.name}")
                    
                    # Auto-deploy workflows
                    if comfyui_config.auto_deploy_workflows:
                        print("\n  Auto-deploy is enabled. Deploying workflows...")
                        self._deploy_workflows(workflow_manager, missing_workflows)
                    else:
                        response = input("\n  Deploy missing workflows now? (y/N): ").strip().lower()
                        if response == 'y':
                            self._deploy_workflows(workflow_manager, missing_workflows)
                        else:
                            print("  Skipping workflow deployment. You can deploy later with:")
                            print("    storycore deploy-workflows")
                else:
                    print("  ✓ All required workflows are deployed")
                
                # Display setup status
                print("\n✅ ComfyUI Desktop setup complete!")
                print("  System is ready for real asset generation")
                
            else:
                print(f"  ✗ ComfyUI Desktop not available: {status.error_message}")
                print("  System will operate in fallback mode")
                print("\n  To enable ComfyUI integration:")
                print("    1. Start ComfyUI Desktop with --enable-cors-header flag")
                print("    2. Ensure it's running on http://localhost:8000")
                print("    3. Run: storycore test-connection")
                
        except ImportError as e:
            print(f"  ⚠ ComfyUI integration modules not available: {e}")
        except Exception as e:
            print(f"  ✗ Error checking ComfyUI integration: {e}")
            self.logger.error(f"ComfyUI integration check failed: {e}", exc_info=True)
    
    def _download_models(self, model_manager, missing_models: list) -> None:
        """
        Download missing models with progress display.
        
        Args:
            model_manager: ModelManager instance
            missing_models: List of ModelInfo for missing models
        """
        import asyncio
        
        async def download_all():
            def progress_callback(model_name: str, progress):
                # Simple progress display
                percentage = progress.percentage
                speed = progress.speed_mbps
                eta = progress.eta_seconds
                
                print(f"    {model_name}: {percentage:.1f}% ({speed:.1f} MB/s, ETA: {eta}s)", end='\r')
            
            results = await model_manager.download_all_missing(progress_callback)
            
            print()  # New line after progress
            
            successful = sum(1 for success in results.values() if success)
            print(f"\n  Downloaded {successful}/{len(results)} models successfully")
            
            if successful < len(results):
                failed = [name for name, success in results.items() if not success]
                print(f"  Failed to download: {', '.join(failed)}")
        
        try:
            asyncio.run(download_all())
        except Exception as e:
            print(f"  ✗ Error during model download: {e}")
    
    def _deploy_workflows(self, workflow_manager, missing_workflows: list) -> None:
        """
        Deploy missing workflows.
        
        Args:
            workflow_manager: WorkflowManager instance
            missing_workflows: List of WorkflowInfo for missing workflows
        """
        try:
            results = workflow_manager.deploy_all_workflows()
            
            successful = sum(1 for success in results.values() if success)
            print(f"  Deployed {successful}/{len(results)} workflows successfully")
            
            if successful < len(results):
                failed = [name for name, success in results.items() if not success]
                print(f"  Failed to deploy: {', '.join(failed)}")
                
        except Exception as e:
            print(f"  ✗ Error during workflow deployment: {e}")
    
    def _execute_wizard_mode(self, args: argparse.Namespace) -> int:
        """Execute init using interactive wizard."""
        try:
            from wizard.wizard_orchestrator import run_interactive_wizard
            from wizard.config_builder import build_project_configuration
            from wizard.file_writer import create_project_files
        except ImportError as e:
            raise SystemError(
                f"Wizard modules not available: {e}",
                "Ensure wizard package is installed or use legacy mode without --interactive"
            )
        
        print("🎬 StoryCore-Engine Interactive Project Setup")
        print("=" * 50)
        
        # Run wizard
        wizard_state = run_interactive_wizard(args.path)
        
        if wizard_state is None:
            print("Project creation cancelled.")
            return 0
        
        # Build configuration
        config = build_project_configuration(wizard_state)
        
        # Create project files
        success = create_project_files(config, args.path)
        
        if success:
            project_path = Path(args.path) / config.project_name
            self.print_success(f"Project '{config.project_name}' created successfully!")
            print(f"📁 Location: {project_path.absolute()}")
            print(f"📋 Files created:")
            print(f"   ✓ project.json (main configuration)")
            print(f"   ✓ README.md (project documentation)")
            print(f"   ✓ Directory structure (assets, exports, etc.)")
            
            # Initialize memory system if requested
            if args.enable_memory or self._should_enable_memory_wizard(wizard_state):
                memory_success = self._initialize_memory_system(
                    project_path,
                    config.project_name,
                    getattr(args, 'project_type', 'video')
                )
                if memory_success:
                    print(f"   ✓ Memory system initialized (assistant/ directory)")
            
            print(f"\n🚀 Next steps:")
            print(f"   cd {config.project_name}")
            print(f"   storycore grid")
            print(f"   storycore promote")
            print(f"   storycore qa")
            print(f"   storycore export")
            return 0
        else:
            self.print_error("Failed to create project files")
            return 1
    
    def _execute_legacy_mode(self, args: argparse.Namespace) -> int:
        """Execute init using legacy project manager."""
        try:
            from project_manager import ProjectManager
        except ImportError as e:
            raise SystemError(
                f"ProjectManager not available: {e}",
                "Ensure project_manager module is installed"
            )
        
        if not args.project_name:
            raise UserError(
                "Project name is required in legacy mode",
                "Provide a project name or use --interactive flag"
            )
        
        pm = ProjectManager()
        result = pm.init_project(args.project_name, args.path)
        
        # Check if initialization was successful
        if not result["success"]:
            self.print_error(f"Failed to initialize project '{args.project_name}'")
            for error in result["errors"]:
                print(f"  ✗ {error}")
            return 1
        
        project_path = Path(args.path) / args.project_name
        self.print_success(f"Project '{args.project_name}' initialized successfully")
        print(f"  Location: {project_path.absolute()}")
        print(f"  Files created:")
        print(f"    - project.json")
        print(f"    - storyboard.json")
        print(f"    - story.md")
        print(f"    - assets/images/")
        print(f"    - assets/audio/")
        
        # Display warnings if any
        if result["warnings"]:
            print(f"\n  Warnings:")
            for warning in result["warnings"]:
                print(f"    ⚠ {warning}")
        
        # Initialize memory system if requested
        if args.enable_memory:
            memory_success = self._initialize_memory_system(
                project_path,
                args.project_name,
                getattr(args, 'project_type', 'video')
            )
            if memory_success:
                print(f"    - assistant/ (memory system)")
                print(f"    - build_logs/")
                print(f"    - summaries/")
        
        return 0
    
    def _initialize_memory_system(
        self,
        project_path: Path,
        project_name: str,
        project_type: str = "video"
    ) -> bool:
        """
        Initialize memory system for a project.
        
        Args:
            project_path: Path to the project directory
            project_name: Name of the project
            project_type: Type of project
            
        Returns:
            True if initialization succeeded, False otherwise
        """
        try:
            # Import memory system
            from memory_system import MemorySystemCore
            from memory_system.data_models import ProjectConfig
            
            # Create configuration
            config = ProjectConfig(
                project_name=project_name,
                project_type=project_type,
                creation_timestamp=datetime.now().isoformat(),
                objectives=[],
                memory_system_enabled=True
            )
            
            # Initialize memory system
            memory_system = MemorySystemCore(project_path, config)
            success = memory_system.initialize_project(
                project_name=project_name,
                project_type=project_type,
                objectives=[],
                enable_memory_system=True
            )
            
            if success:
                print(f"  ✓ Memory system initialized successfully")
                print(f"    - assistant/discussions_raw/")
                print(f"    - assistant/discussions_summary/")
                print(f"    - assistant/memory.json")
                print(f"    - assistant/variables.json")
                print(f"    - build_logs/")
                print(f"    - summaries/")
                print(f"    - qa_reports/")
                return True
            else:
                print(f"  ✗ Failed to initialize memory system")
                return False
                
        except ImportError as e:
            print(f"  ⚠ Memory system not available: {e}")
            print(f"    Install memory_system module to use this feature")
            return False
        except Exception as e:
            print(f"  ✗ Error initializing memory system: {e}")
            return False
    
    def _should_enable_memory_wizard(self, wizard_state: Any) -> bool:
        """
        Determine if memory system should be enabled based on wizard state.
        
        Args:
            wizard_state: State from interactive wizard
            
        Returns:
            True if memory system should be enabled
        """
        # Check if wizard state has memory system preference
        if hasattr(wizard_state, 'enable_memory_system'):
            return wizard_state.enable_memory_system
        
        # Default to False (user must explicitly enable)
        return False
