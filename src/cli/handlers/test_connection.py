"""
Test Connection command handler - Test ComfyUI Desktop connection.

Validates: Requirements 9.6
"""

import argparse
import asyncio
import sys
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class TestConnectionHandler(BaseHandler):
    """Handler for the test-connection command - Test ComfyUI Desktop connection."""
    
    command_name = "test-connection"
    description = "Test connection to ComfyUI Desktop and validate configuration"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up test-connection command arguments."""
        parser.add_argument(
            "--url",
            default="http://localhost:8000",
            help="ComfyUI server URL (default: http://localhost:8000)"
        )
        
        parser.add_argument(
            "--timeout",
            type=int,
            default=30,
            help="Connection timeout in seconds (default: 30)"
        )
        
        parser.add_argument(
            "--check-cors",
            action="store_true",
            default=True,
            help="Check CORS configuration (default: enabled)"
        )
        
        parser.add_argument(
            "--check-models",
            action="store_true",
            help="Check for required models"
        )
        
        parser.add_argument(
            "--check-workflows",
            action="store_true",
            help="Check for required workflows"
        )
        
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed connection information"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the test-connection command."""
        try:
            # Import required modules
            try:
                from end_to_end.connection_manager import ConnectionManager, ComfyUIConfig
                from end_to_end.cors_validator import CORSValidator
                from end_to_end.model_manager import ModelManager
                from end_to_end.workflow_manager import WorkflowManager
            except ImportError as e:
                raise SystemError(
                    f"Required modules not available: {e}",
                    "Ensure end_to_end modules are installed"
                )
            
            # Parse URL to extract host and port
            url = args.url
            if url.startswith("http://"):
                url = url[7:]
            elif url.startswith("https://"):
                url = url[8:]
            
            parts = url.split(":")
            host = parts[0]
            port = int(parts[1]) if len(parts) > 1 else 8000
            
            # Create configuration
            config = ComfyUIConfig(
                host=host,
                port=port,
                timeout=args.timeout,
                enable_cors_check=args.check_cors
            )
            
            # Validate configuration
            errors = config.validate()
            if errors:
                self.print_error("Configuration validation failed:")
                for error in errors:
                    print(f"  • {error}")
                return 1
            
            # Run async connection test
            return asyncio.run(self._test_connection_async(
                config,
                args
            ))
            
        except Exception as e:
            return self.handle_error(e, "Connection test")
    
    async def _test_connection_async(
        self,
        config,
        args: argparse.Namespace
    ) -> int:
        """Async connection test implementation."""
        from end_to_end.connection_manager import ConnectionManager
        from end_to_end.cors_validator import CORSValidator
        from end_to_end.model_manager import ModelManager
        from end_to_end.workflow_manager import WorkflowManager
        
        print("╔══════════════════════════════════════════════════════════════════════════════╗")
        print("║                    ComfyUI Desktop Connection Test                            ║")
        print("╚══════════════════════════════════════════════════════════════════════════════╝")
        print()
        
        # Initialize connection manager
        connection_manager = ConnectionManager(config)
        
        # Test 1: Basic Connection
        print("┌──────────────────────────────────────────────────────────────────────────────┐")
        print("│ TEST 1: Basic Connection                                                      │")
        print("└──────────────────────────────────────────────────────────────────────────────┘")
        print(f"  Target URL: {config.url}")
        print(f"  Timeout: {config.timeout}s")
        print()
        
        status = await connection_manager.connect()
        
        if status.available:
            self.print_success(f"Connected to ComfyUI Desktop")
            print(f"  Version: {status.version or 'Unknown'}")
            print(f"  Queue Size: {status.queue_size}")
            print()
        else:
            self.print_error(f"Failed to connect to ComfyUI Desktop")
            print(f"  Error: {status.error_message}")
            print()
            print("  Troubleshooting:")
            print("    • Ensure ComfyUI Desktop is running")
            print("    • Check the URL and port are correct")
            print("    • Verify no firewall is blocking the connection")
            print(f"    • Try accessing {config.url} in your browser")
            print()
            
            # Cleanup
            await connection_manager.disconnect()
            return 1
        
        # Test 2: CORS Validation
        if args.check_cors:
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ TEST 2: CORS Configuration                                                    │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            
            cors_validator = CORSValidator(connection_manager)
            cors_result = await cors_validator.validate_cors()
            
            if cors_result.valid:
                self.print_success("CORS is properly configured")
                if args.verbose:
                    print(f"  Headers present: {', '.join(cors_result.headers_present)}")
                print()
            else:
                self.print_warning("CORS configuration issues detected")
                print(f"  Missing headers: {', '.join(cors_result.headers_missing)}")
                print()
                print("  ⚠️  Browser-based interfaces may not work without CORS")
                print()
                if args.verbose:
                    print(cors_result.instructions)
                    print()
                else:
                    print("  Run with --verbose to see setup instructions")
                    print()
        
        # Test 3: Model Availability
        if args.check_models:
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ TEST 3: Required Models                                                       │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            
            # Determine ComfyUI models directory
            # This is a simplified approach - in production, this should be configurable
            comfyui_models_dir = Path.home() / "ComfyUI" / "models"
            
            if not comfyui_models_dir.exists():
                self.print_warning(f"ComfyUI models directory not found: {comfyui_models_dir}")
                print("  Skipping model check")
                print()
            else:
                model_manager = ModelManager(comfyui_models_dir)
                missing_models = model_manager.check_required_models()
                
                if not missing_models:
                    self.print_success("All required models are present")
                    print()
                else:
                    self.print_warning(f"{len(missing_models)} required models are missing")
                    print()
                    for model_info in missing_models:
                        size_gb = model_info.file_size / (1024 ** 3)
                        print(f"  • {model_info.name} ({size_gb:.1f} GB)")
                        if args.verbose:
                            print(f"    Type: {model_info.type.value}")
                            print(f"    Priority: {model_info.priority}")
                            print(f"    Description: {model_info.description}")
                    print()
                    print("  Run 'python storycore.py download-models' to download missing models")
                    print()
        
        # Test 4: Workflow Availability
        if args.check_workflows:
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ TEST 4: Required Workflows                                                    │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            
            # Determine workflow directories
            workflows_dir = Path("assets") / "workflows"
            comfyui_workflows_dir = Path.home() / "ComfyUI" / "user" / "default" / "workflows"
            
            if not workflows_dir.exists():
                self.print_warning(f"StoryCore workflows directory not found: {workflows_dir}")
                print("  Skipping workflow check")
                print()
            elif not comfyui_workflows_dir.exists():
                self.print_warning(f"ComfyUI workflows directory not found: {comfyui_workflows_dir}")
                print("  Skipping workflow check")
                print()
            else:
                workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
                installed_workflows = workflow_manager.check_installed_workflows()
                
                missing_workflows = [w for w in installed_workflows if not w.installed]
                outdated_workflows = [w for w in installed_workflows if w.installed and not w.up_to_date]
                
                if not missing_workflows and not outdated_workflows:
                    self.print_success("All required workflows are installed and up-to-date")
                    print()
                else:
                    if missing_workflows:
                        self.print_warning(f"{len(missing_workflows)} required workflows are missing")
                        print()
                        for workflow in missing_workflows:
                            print(f"  • {workflow.name} v{workflow.version}")
                            if args.verbose:
                                print(f"    Description: {workflow.description}")
                        print()
                    
                    if outdated_workflows:
                        self.print_warning(f"{len(outdated_workflows)} workflows need updates")
                        print()
                        for workflow in outdated_workflows:
                            print(f"  • {workflow.name} (installed version outdated)")
                        print()
                    
                    print("  Run 'python storycore.py deploy-workflows' to install/update workflows")
                    print()
        
        # Summary
        print("┌──────────────────────────────────────────────────────────────────────────────┐")
        print("│ Summary                                                                       │")
        print("└──────────────────────────────────────────────────────────────────────────────┘")
        
        all_checks_passed = True
        
        print(f"  Connection: {'✓ PASSED' if status.available else '✗ FAILED'}")
        
        if args.check_cors:
            cors_status = "✓ PASSED" if cors_result.valid else "⚠ WARNING"
            print(f"  CORS: {cors_status}")
            if not cors_result.valid:
                all_checks_passed = False
        
        if args.check_models:
            models_status = "✓ PASSED" if not missing_models else "⚠ WARNING"
            print(f"  Models: {models_status}")
            if missing_models:
                all_checks_passed = False
        
        if args.check_workflows:
            workflows_status = "✓ PASSED" if not missing_workflows and not outdated_workflows else "⚠ WARNING"
            print(f"  Workflows: {workflows_status}")
            if missing_workflows or outdated_workflows:
                all_checks_passed = False
        
        print()
        
        if all_checks_passed:
            self.print_success("All checks passed! ComfyUI Desktop is ready for use.")
        else:
            self.print_warning("Some checks failed. Review the output above for details.")
        
        print()
        print("╔══════════════════════════════════════════════════════════════════════════════╗")
        print("║ Connection test complete                                                      ║")
        print("╚══════════════════════════════════════════════════════════════════════════════╝")
        
        # Cleanup
        await connection_manager.disconnect()
        
        return 0 if all_checks_passed else 1
