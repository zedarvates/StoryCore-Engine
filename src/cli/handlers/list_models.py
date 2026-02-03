"""
List Models command handler - Show model status.

Validates: Requirement 3.1
"""

import argparse
from pathlib import Path

from ..base import BaseHandler
from ..errors import SystemError


class ListModelsHandler(BaseHandler):
    """Handler for the list-models command - Show model status."""
    
    command_name = "list-models"
    description = "List required AI models and their status"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up list-models command arguments."""
        parser.add_argument(
            "--models-dir",
            type=str,
            help="ComfyUI models directory (default: ~/ComfyUI/models)"
        )
        
        parser.add_argument(
            "--show-optional",
            action="store_true",
            help="Show optional models in addition to required ones"
        )
        
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed model information"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the list-models command."""
        try:
            # Import required modules
            try:
                from end_to_end.model_manager import ModelManager
            except ImportError as e:
                raise SystemError(
                    f"ModelManager not available: {e}",
                    "Ensure end_to_end modules are installed"
                )
            
            # Determine models directory
            if args.models_dir:
                models_dir = Path(args.models_dir)
            else:
                models_dir = Path.home() / "ComfyUI" / "models"
            
            print("╔══════════════════════════════════════════════════════════════════════════════╗")
            print("║                    ComfyUI Model Status                                       ║")
            print("╚══════════════════════════════════════════════════════════════════════════════╝")
            print()
            print(f"  Models Directory: {models_dir}")
            print()
            
            if not models_dir.exists():
                self.print_warning(f"Models directory does not exist: {models_dir}")
                print()
                return 1
            
            # Initialize model manager
            model_manager = ModelManager(models_dir)
            
            # Get all models
            all_models = ModelManager.REQUIRED_MODELS
            
            # Filter models
            if not args.show_optional:
                models_to_show = [m for m in all_models if m.required]
            else:
                models_to_show = all_models
            
            # Sort by priority
            models_to_show.sort(key=lambda m: m.priority)
            
            # Check which models are present
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ Model Status                                                                  │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            print()
            
            present_count = 0
            missing_count = 0
            
            for model_info in models_to_show:
                model_path = model_manager._get_model_path(model_info)
                is_present = model_path.exists()
                
                if is_present:
                    present_count += 1
                    status = "✓ PRESENT"
                else:
                    missing_count += 1
                    status = "✗ MISSING"
                
                required_str = "REQUIRED" if model_info.required else "OPTIONAL"
                size_gb = model_info.file_size / (1024 ** 3)
                
                print(f"  [{status}] {model_info.name}")
                print(f"    Priority: {model_info.priority} | {required_str}")
                print(f"    Type: {model_info.type.value}")
                print(f"    Size: {size_gb:.2f} GB")
                
                if args.verbose:
                    print(f"    Description: {model_info.description}")
                    print(f"    Filename: {model_info.filename}")
                    if is_present:
                        print(f"    Path: {model_path}")
                
                print()
            
            # Summary
            print("┌──────────────────────────────────────────────────────────────────────────────┐")
            print("│ Summary                                                                       │")
            print("└──────────────────────────────────────────────────────────────────────────────┘")
            print()
            print(f"  Total models: {len(models_to_show)}")
            print(f"  Present: {present_count}")
            print(f"  Missing: {missing_count}")
            print()
            
            if missing_count > 0:
                self.print_warning(f"{missing_count} model(s) are missing")
                print("  Run 'python storycore.py download-models' to download missing models")
            else:
                self.print_success("All models are present")
            
            print()
            print("╔══════════════════════════════════════════════════════════════════════════════╗")
            print("║ Model listing complete                                                        ║")
            print("╚══════════════════════════════════════════════════════════════════════════════╝")
            
            return 0
            
        except Exception as e:
            return self.handle_error(e, "Model listing")
