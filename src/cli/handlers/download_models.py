"""
Download Models command handler - Download required AI models.

Validates: Requirements 3.1, 3.2
"""

import argparse
import asyncio
from pathlib import Path

from ..base import BaseHandler
from ..errors import UserError, SystemError


class DownloadModelsHandler(BaseHandler):
    """Handler for the download-models command - Download required AI models."""
    
    command_name = "download-models"
    description = "Download required AI models for ComfyUI"
    
    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        """Set up download-models command arguments."""
        parser.add_argument(
            "--models-dir",
            type=str,
            help="ComfyUI models directory (default: ~/ComfyUI/models)"
        )
        
        parser.add_argument(
            "--model",
            type=str,
            help="Download specific model by name (default: all missing models)"
        )
        
        parser.add_argument(
            "--skip-validation",
            action="store_true",
            help="Skip hash validation after download"
        )
        
        parser.add_argument(
            "--max-retries",
            type=int,
            default=3,
            help="Maximum download retry attempts (default: 3)"
        )
    
    def execute(self, args: argparse.Namespace) -> int:
        """Execute the download-models command."""
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
                self.print_warning(f"Models directory does not exist: {models_dir}")
                print("  Creating directory...")
                models_dir.mkdir(parents=True, exist_ok=True)
            
            # Run async download
            return asyncio.run(self._download_models_async(
                models_dir,
                args
            ))
            
        except Exception as e:
            return self.handle_error(e, "Model download")
    
    async def _download_models_async(
        self,
        models_dir: Path,
        args: argparse.Namespace
    ) -> int:
        """Async model download implementation."""
        from end_to_end.model_manager import ModelManager
        
        print("╔══════════════════════════════════════════════════════════════════════════════╗")
        print("║                    ComfyUI Model Download                                     ║")
        print("╚══════════════════════════════════════════════════════════════════════════════╝")
        print()
        print(f"  Models Directory: {models_dir}")
        print()
        
        # Initialize model manager
        model_manager = ModelManager(models_dir)
        
        # Check for missing models
        missing_models = model_manager.check_required_models()
        
        if not missing_models:
            self.print_success("All required models are already present")
            return 0
        
        # Filter by specific model if requested
        if args.model:
            missing_models = [m for m in missing_models if m.name == args.model]
            if not missing_models:
                self.print_error(f"Model '{args.model}' not found or already present")
                return 1
        
        # Display models to download
        print(f"Found {len(missing_models)} missing model(s):")
        print()
        
        total_size = 0
        for model_info in missing_models:
            size_gb = model_info.file_size / (1024 ** 3)
            total_size += model_info.file_size
            print(f"  {model_info.priority}. {model_info.name}")
            print(f"     Size: {size_gb:.2f} GB")
            print(f"     Type: {model_info.type.value}")
            print(f"     Description: {model_info.description}")
            print()
        
        total_size_gb = total_size / (1024 ** 3)
        print(f"  Total download size: {total_size_gb:.2f} GB")
        print()
        
        # Confirm download
        print("  This may take a while depending on your internet connection.")
        print("  Downloads will be performed sequentially in priority order.")
        print()
        
        # Progress callback
        def progress_callback(model_name: str, progress):
            """Display download progress."""
            percentage = progress.percentage
            speed = progress.speed_mbps
            eta = progress.eta_seconds
            
            # Format ETA
            if eta > 3600:
                eta_str = f"{eta // 3600}h {(eta % 3600) // 60}m"
            elif eta > 60:
                eta_str = f"{eta // 60}m {eta % 60}s"
            else:
                eta_str = f"{eta}s"
            
            # Display progress bar
            bar_width = 40
            filled = int(bar_width * percentage / 100)
            bar = "█" * filled + "░" * (bar_width - filled)
            
            print(f"\r  {model_name}: [{bar}] {percentage:.1f}% | {speed:.2f} MB/s | ETA: {eta_str}  ", end="", flush=True)
            
            if progress.status == "completed":
                print()  # New line after completion
            elif progress.status == "failed":
                print()
                self.print_error(f"Download failed: {progress.error_message}")
        
        # Download all missing models
        print("Starting downloads...")
        print()
        
        results = await model_manager.download_all_missing(progress_callback)
        
        # Display results
        print()
        print("┌──────────────────────────────────────────────────────────────────────────────┐")
        print("│ Download Summary                                                              │")
        print("└──────────────────────────────────────────────────────────────────────────────┘")
        print()
        
        successful = sum(1 for success in results.values() if success)
        failed = len(results) - successful
        
        for model_name, success in results.items():
            status = "✓ SUCCESS" if success else "✗ FAILED"
            print(f"  {model_name}: {status}")
        
        print()
        print(f"  Total: {successful} successful, {failed} failed")
        print()
        
        if successful == len(results):
            self.print_success("All models downloaded successfully!")
        elif successful > 0:
            self.print_warning(f"Some models failed to download ({failed} failed)")
        else:
            self.print_error("All downloads failed")
        
        print()
        print("╔══════════════════════════════════════════════════════════════════════════════╗")
        print("║ Download complete                                                             ║")
        print("╚══════════════════════════════════════════════════════════════════════════════╝")
        
        return 0 if failed == 0 else 1
