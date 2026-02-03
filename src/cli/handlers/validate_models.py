"""
Validate Models command handler - Validate model integrity.

Validates: Requirement 3.5
"""

import argparse
import asyncio
from pathlib import Path

from ..base import BaseHandler
from ..errors import SystemError


class ValidateModelsHandler(BaseHandler):
    """Handler for the validate-models command - Validate model integrity."""
    
    command_name = "validate-models"
    description = "Validate integrity of downloaded AI models"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up validate-models command arguments."""
        parser.add_argument(
            "--models-dir",
            type=str,
            help="ComfyUI models directory (default: ~/ComfyUI/models)"
        )
        
        parser.add_argument(
            "--model",
            type=str,
            help="Validate specific model by name (default: all present models)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the validate-models command."""
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
            
            if not models_dir.exists():
                self.print_error(f"Models directory does not exist: {models_dir}")
                return 1
            
            # Run async validation
            return asyncio.run(self._validate_models_async(
                models_dir,
                args
            ))
            
        except Exception as e:
            return self.handle_error(e, "Model validation")
    
    async def _validate_models_async(
        self,
        models_dir: Path,
        args: argparse.Namespace
    ) -> int:
        """Async model validation implementation."""
        from end_to_end.model_manager import ModelManager
        
        print("╔══════════════════════════════════════════════════════════════════════════════╗")
        print("║                    ComfyUI Model Validation                                   ║")
        print("╚══════════════════════════════════════════════════════════════════════════════╝")
        print()
        print(f"  Models Directory: {models_dir}")
        print()
        
        # Initialize model manager
        model_manager = ModelManager(models_dir)
        
        # Get all models
        all_models = ModelManager.REQUIRED_MODELS
        
        # Filter by specific model if requested
        if args.model:
            models_to_validate = [m for m in all_models if m.name == args.model]
            if not models_to_validate:
                self.print_error(f"Model '{args.model}' not found")
                return 1
        else:
            models_to_validate = all_models
        
        # Filter to only present models
        models_to_validate = [
            m for m in models_to_validate
            if model_manager._get_model_path(m).exists()
        ]
        
        if not models_to_validate:
            self.print_warning("No models found to validate")
            return 1
        
        print(f"Validating {len(models_to_validate)} model(s)...")
        print()
        
        # Validate each model
        results = {}
        
        for model_info in models_to_validate:
            model_path = model_manager._get_model_path(model_info)
            
            print(f"  Validating {model_info.name}...")
            
            # Check file size
            actual_size = model_path.stat().st_size
            expected_size = model_info.file_size
            size_match = actual_size == expected_size
            
            if not size_match:
                print(f"    ⚠️  Size mismatch: expected {expected_size}, got {actual_size}")
            
            # Validate hash if provided
            if model_info.sha256_hash:
                print(f"    Calculating SHA256 hash...")
                is_valid = await model_manager.validate_model(model_path, model_info.sha256_hash)
                
                if is_valid:
                    print(f"    ✓ Hash validation passed")
                    results[model_info.name] = True
                else:
                    print(f"    ✗ Hash validation failed")
                    results[model_info.name] = False
            else:
                print(f"    ⚠️  No hash provided, skipping hash validation")
                if size_match:
                    print(f"    ✓ Size validation passed")
                    results[model_info.name] = True
                else:
                    results[model_info.name] = False
            
            print()
        
        # Display results
        print("┌──────────────────────────────────────────────────────────────────────────────┐")
        print("│ Validation Summary                                                            │")
        print("└──────────────────────────────────────────────────────────────────────────────┘")
        print()
        
        valid_count = sum(1 for valid in results.values() if valid)
        invalid_count = len(results) - valid_count
        
        for model_name, is_valid in results.items():
            status = "✓ VALID" if is_valid else "✗ INVALID"
            print(f"  {model_name}: {status}")
        
        print()
        print(f"  Total: {valid_count} valid, {invalid_count} invalid")
        print()
        
        if invalid_count > 0:
            self.print_error(f"{invalid_count} model(s) failed validation")
            print("  Consider re-downloading the invalid models")
        else:
            self.print_success("All models passed validation!")
        
        print()
        print("╔══════════════════════════════════════════════════════════════════════════════╗")
        print("║ Validation complete                                                           ║")
        print("╚══════════════════════════════════════════════════════════════════════════════╝")
        
        return 0 if invalid_count == 0 else 1
