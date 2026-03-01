#!/usr/bin/env python3
"""
ComfyUI Portable Installer with CORS Configuration
Provides automated installation of ComfyUI Portable with proper CORS setup for StoryCore-Engine UI.
"""

import os
import sys
import platform
import subprocess
import zipfile
import shutil
import logging
import json
from pathlib import Path
from typing import Tuple, Optional, List, Callable
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class InstallationResult:
    """Result of ComfyUI installation."""
    success: bool
    comfyui_path: str
    comfyui_url: str
    installed_models: List[str]
    installed_workflows: List[str]
    errors: List[str]


class ComfyUIInstaller:
    """
    Automated ComfyUI Portable installer with CORS configuration.
    
    Handles extraction, CORS setup, model installation, and workflow configuration
    for seamless integration with StoryCore-Engine UI.
    """
    
    def __init__(self):
        """Initialize ComfyUI installer."""
        self.platform_type = self._detect_platform()
        self.installation_path = None
        self.is_installed = False
        
        logger.info(f"ComfyUI installer initialized for {self.platform_type}")
    
    def _detect_platform(self) -> str:
        """Detect current platform."""
        system = platform.system().lower()
        if system == "windows":
            return "windows"
        elif system == "linux":
            return "linux"
        elif system == "darwin":
            return "macos"
        else:
            return "unknown"
    
    def check_existing_installation(self, install_dir: Path) -> Tuple[bool, Optional[str]]:
        """Check if ComfyUI is already installed."""
        try:
            if not install_dir.exists():
                return False, None
            
            # Check for main.py or ComfyUI executable
            main_script = install_dir / "main.py"
            if main_script.exists():
                return True, str(install_dir)
            
            # Check subdirectories
            for subdir in install_dir.iterdir():
                if subdir.is_dir():
                    main_script = subdir / "main.py"
                    if main_script.exists():
                        return True, str(subdir)
            
            return False, None
            
        except Exception as e:
            logger.error(f"Error checking existing installation: {e}")
            return False, None
    
    def install_comfyui_portable(
        self,
        zip_path: str,
        install_dir: str,
        enable_cors: bool = True,
        cors_origin: str = "http://localhost:3000",
        models: Optional[List[str]] = None,
        workflows: Optional[List[str]] = None,
        progress_callback: Optional[Callable[[str, int, str], None]] = None
    ) -> InstallationResult:
        """
        Install ComfyUI Portable from ZIP file.
        
        Args:
            zip_path: Path to ComfyUI Portable ZIP file
            install_dir: Target installation directory
            enable_cors: Whether to configure CORS
            cors_origin: Allowed origin for CORS requests
            models: List of model identifiers to download
            workflows: List of workflow files to install
            progress_callback: Function called with (step, progress, message)
        
        Returns:
            InstallationResult with installation details
        """
        errors = []
        installed_models = []
        installed_workflows = []
        
        try:
            # Validate ZIP file
            zip_file = Path(zip_path)
            if not zip_file.exists():
                return InstallationResult(
                    success=False,
                    comfyui_path="",
                    comfyui_url="",
                    installed_models=[],
                    installed_workflows=[],
                    errors=[f"ZIP file not found: {zip_path}"]
                )
            
            # Create installation directory
            install_path = Path(install_dir)
            install_path.mkdir(parents=True, exist_ok=True)
            
            # Step 1: Extract ZIP file
            if progress_callback:
                progress_callback("extracting", 10, "Extracting ComfyUI Portable...")
            
            logger.info(f"Extracting {zip_path} to {install_dir}")
            try:
                with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                    zip_ref.extractall(install_path)
                logger.info("Extraction completed successfully")
            except Exception as e:
                error_msg = f"Failed to extract ZIP file: {e}"
                logger.error(error_msg)
                errors.append(error_msg)
                return InstallationResult(
                    success=False,
                    comfyui_path="",
                    comfyui_url="",
                    installed_models=[],
                    installed_workflows=[],
                    errors=errors
                )
            
            # Find ComfyUI directory
            comfyui_dir = self._find_comfyui_directory(install_path)
            if not comfyui_dir:
                error_msg = "ComfyUI directory not found after extraction"
                logger.error(error_msg)
                errors.append(error_msg)
                return InstallationResult(
                    success=False,
                    comfyui_path="",
                    comfyui_url="",
                    installed_models=[],
                    installed_workflows=[],
                    errors=errors
                )
            
            self.installation_path = comfyui_dir
            
            # Step 2: Configure CORS
            if enable_cors:
                if progress_callback:
                    progress_callback("configuring", 30, "Configuring CORS...")
                
                cors_success, cors_error = self._configure_cors(comfyui_dir, cors_origin)
                if not cors_success:
                    errors.append(cors_error)
            
            # Step 3: Install models
            if models:
                if progress_callback:
                    progress_callback("models", 50, "Installing models...")
                
                installed_models, model_errors = self._install_models(comfyui_dir, models, progress_callback)
                errors.extend(model_errors)
            
            # Step 4: Install workflows
            if workflows:
                if progress_callback:
                    progress_callback("workflows", 70, "Installing workflows...")
                
                installed_workflows, workflow_errors = self._install_workflows(comfyui_dir, workflows)
                errors.extend(workflow_errors)
            
            # Step 5: Verify installation
            if progress_callback:
                progress_callback("verifying", 90, "Verifying installation...")
            
            verification_success, verification_error = self._verify_installation(comfyui_dir)
            if not verification_success:
                errors.append(verification_error)
            
            # Complete
            if progress_callback:
                progress_callback("complete", 100, "Installation completed!")
            
            self.is_installed = True
            comfyui_url = f"http://127.0.0.1:8188"
            
            return InstallationResult(
                success=len(errors) == 0 or verification_success,
                comfyui_path=str(comfyui_dir),
                comfyui_url=comfyui_url,
                installed_models=installed_models,
                installed_workflows=installed_workflows,
                errors=errors
            )
            
        except Exception as e:
            error_msg = f"Installation failed: {e}"
            logger.error(error_msg)
            errors.append(error_msg)
            return InstallationResult(
                success=False,
                comfyui_path="",
                comfyui_url="",
                installed_models=[],
                installed_workflows=[],
                errors=errors
            )
    
    def _find_comfyui_directory(self, install_path: Path) -> Optional[Path]:
        """Find the ComfyUI directory after extraction."""
        # Check if main.py is directly in install_path
        if (install_path / "main.py").exists():
            return install_path
        
        # Check subdirectories
        for subdir in install_path.iterdir():
            if subdir.is_dir():
                if (subdir / "main.py").exists():
                    return subdir
                # Check one level deeper
                for subsubdir in subdir.iterdir():
                    if subsubdir.is_dir() and (subsubdir / "main.py").exists():
                        return subsubdir
        
        return None
    
    def _configure_cors(self, comfyui_dir: Path, cors_origin: str) -> Tuple[bool, str]:
        """Configure CORS for ComfyUI."""
        try:
            logger.info(f"Configuring CORS for origin: {cors_origin}")
            
            # Create or update extra_model_paths.yaml with CORS settings
            config_file = comfyui_dir / "extra_model_paths.yaml"
            
            # For ComfyUI, CORS is typically configured via command-line arguments
            # We'll create a startup script with CORS enabled
            if self.platform_type == "windows":
                startup_script = comfyui_dir / "run_with_cors.bat"
                script_content = f"""@echo off
cd /d "%~dp0"
python_embeded\\python.exe -s main.py --listen 0.0.0.0 --port 8188 --enable-cors-header "{cors_origin}"
pause
"""
            else:
                startup_script = comfyui_dir / "run_with_cors.sh"
                script_content = f"""#!/bin/bash
cd "$(dirname "$0")"
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header "{cors_origin}"
"""
            
            startup_script.write_text(script_content)
            if self.platform_type != "windows":
                startup_script.chmod(0o755)
            
            logger.info(f"CORS startup script created: {startup_script}")
            return True, ""
            
        except Exception as e:
            error_msg = f"Failed to configure CORS: {e}"
            logger.error(error_msg)
            return False, error_msg
    
    def _install_models(
        self,
        comfyui_dir: Path,
        models: List[str],
        progress_callback: Optional[Callable[[str, int, str], None]] = None
    ) -> Tuple[List[str], List[str]]:
        """
        Install models to ComfyUI.
        
        Models can be specified as:
        - URL to download from (http/https)
        - Local file path to copy
        - Model identifier (name only, assumes it's in a known location)
        
        Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
        """
        installed = []
        errors = []
        
        try:
            models_dir = comfyui_dir / "models"
            models_dir.mkdir(exist_ok=True)
            
            # Create subdirectories for different model types
            checkpoints_dir = models_dir / "checkpoints"
            checkpoints_dir.mkdir(exist_ok=True)
            
            vae_dir = models_dir / "vae"
            vae_dir.mkdir(exist_ok=True)
            
            loras_dir = models_dir / "loras"
            loras_dir.mkdir(exist_ok=True)
            
            total_models = len(models)
            
            for i, model in enumerate(models):
                try:
                    # Calculate progress (50-70% range for models)
                    if progress_callback:
                        progress = 50 + int((i / total_models) * 20)
                        progress_callback("models", progress, f"Installing model {i+1}/{total_models}: {model}")
                    
                    # Determine model type and target directory
                    target_dir = checkpoints_dir
                    if 'vae' in model.lower() or 'ae.safetensors' in model.lower():
                        target_dir = vae_dir
                    elif 'lora' in model.lower():
                        target_dir = loras_dir
                    
                    # Check if model is a URL
                    if model.startswith('http://') or model.startswith('https://'):
                        # Download model from URL
                        model_name = model.split('/')[-1]
                        target_path = target_dir / model_name
                        
                        logger.info(f"Downloading model from URL: {model}")
                        success = self._download_file(model, target_path, progress_callback)
                        
                        if success:
                            # Verify file exists
                            if target_path.exists() and target_path.stat().st_size > 0:
                                installed.append(model_name)
                                logger.info(f"Successfully installed model: {model_name}")
                            else:
                                error_msg = f"Model file verification failed: {model_name}"
                                logger.error(error_msg)
                                errors.append(error_msg)
                        else:
                            error_msg = f"Failed to download model: {model}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                    
                    # Check if model is a local file path
                    elif Path(model).exists():
                        model_path = Path(model)
                        target_path = target_dir / model_path.name
                        
                        logger.info(f"Copying model from local path: {model}")
                        shutil.copy2(model_path, target_path)
                        
                        # Verify file exists
                        if target_path.exists() and target_path.stat().st_size > 0:
                            installed.append(model_path.name)
                            logger.info(f"Successfully installed model: {model_path.name}")
                        else:
                            error_msg = f"Model file verification failed: {model_path.name}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                    
                    # Assume it's just a model name (for testing/placeholder)
                    else:
                        logger.warning(f"Model '{model}' is not a URL or file path, skipping")
                        errors.append(f"Model not found: {model}")
                    
                except Exception as e:
                    error_msg = f"Failed to install model {model}: {e}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    # Continue with next model (resilience requirement 7.4)
            
            # Final progress update
            if progress_callback:
                progress_callback("models", 70, f"Model installation complete: {len(installed)}/{total_models} successful")
            
            return installed, errors
            
        except Exception as e:
            error_msg = f"Model installation failed: {e}"
            logger.error(error_msg)
            return installed, [error_msg]
    
    def _download_file(
        self,
        url: str,
        target_path: Path,
        progress_callback: Optional[Callable[[str, int, str], None]] = None
    ) -> bool:
        """
        Download a file from URL with progress tracking.
        
        Requirements: 7.2
        """
        try:
            import urllib.request
            
            def download_progress(block_num, block_size, total_size):
                """Report download progress."""
                if total_size > 0 and progress_callback:
                    downloaded = block_num * block_size
                    percent = min(int((downloaded / total_size) * 100), 100)
                    mb_downloaded = downloaded / (1024 * 1024)
                    mb_total = total_size / (1024 * 1024)
                    progress_callback(
                        "models",
                        50,  # Keep at model installation phase
                        f"Downloading: {mb_downloaded:.1f}/{mb_total:.1f} MB ({percent}%)"
                    )
            
            # Download file
            urllib.request.urlretrieve(url, target_path, reporthook=download_progress)
            return True
            
        except Exception as e:
            logger.error(f"Download failed for {url}: {e}")
            return False
    
    def _install_workflows(self, comfyui_dir: Path, workflows: List[str]) -> Tuple[List[str], List[str]]:
        """
        Install workflows to ComfyUI.
        
        Workflows can be specified as:
        - Local file path to JSON workflow file
        - URL to download workflow from
        
        Requirements: 7.1, 7.3, 7.4, 7.5
        """
        installed = []
        errors = []
        
        try:
            # ComfyUI workflows are typically stored in user directory
            workflows_dir = comfyui_dir / "user" / "default" / "workflows"
            workflows_dir.mkdir(parents=True, exist_ok=True)
            
            total_workflows = len(workflows)
            
            for i, workflow in enumerate(workflows):
                try:
                    logger.info(f"Installing workflow {i+1}/{total_workflows}: {workflow}")
                    
                    # Check if workflow is a URL
                    if workflow.startswith('http://') or workflow.startswith('https://'):
                        # Download workflow from URL
                        workflow_name = workflow.split('/')[-1]
                        if not workflow_name.endswith('.json'):
                            workflow_name += '.json'
                        
                        target_path = workflows_dir / workflow_name
                        
                        logger.info(f"Downloading workflow from URL: {workflow}")
                        success = self._download_file(workflow, target_path, None)
                        
                        if success:
                            # Verify file exists and is valid JSON
                            if target_path.exists() and target_path.stat().st_size > 0:
                                # Validate JSON format
                                try:
                                    with open(target_path, 'r') as f:
                                        json.load(f)
                                    installed.append(workflow_name)
                                    logger.info(f"Successfully installed workflow: {workflow_name}")
                                except json.JSONDecodeError:
                                    error_msg = f"Workflow file is not valid JSON: {workflow_name}"
                                    logger.error(error_msg)
                                    errors.append(error_msg)
                                    target_path.unlink()  # Remove invalid file
                            else:
                                error_msg = f"Workflow file verification failed: {workflow_name}"
                                logger.error(error_msg)
                                errors.append(error_msg)
                        else:
                            error_msg = f"Failed to download workflow: {workflow}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                    
                    # Check if workflow is a local file path
                    elif Path(workflow).exists():
                        workflow_path = Path(workflow)
                        target_path = workflows_dir / workflow_path.name
                        
                        # Validate it's a JSON file
                        if not workflow_path.suffix == '.json':
                            error_msg = f"Workflow file must be JSON: {workflow}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                            continue
                        
                        # Validate JSON format before copying
                        try:
                            with open(workflow_path, 'r') as f:
                                json.load(f)
                        except json.JSONDecodeError:
                            error_msg = f"Workflow file is not valid JSON: {workflow}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                            continue
                        
                        logger.info(f"Copying workflow from local path: {workflow}")
                        shutil.copy2(workflow_path, target_path)
                        
                        # Verify file exists
                        if target_path.exists() and target_path.stat().st_size > 0:
                            installed.append(workflow_path.name)
                            logger.info(f"Successfully installed workflow: {workflow_path.name}")
                        else:
                            error_msg = f"Workflow file verification failed: {workflow_path.name}"
                            logger.error(error_msg)
                            errors.append(error_msg)
                    
                    # Workflow not found
                    else:
                        error_msg = f"Workflow file not found: {workflow}"
                        logger.error(error_msg)
                        errors.append(error_msg)
                        
                except Exception as e:
                    error_msg = f"Failed to install workflow {workflow}: {e}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    # Continue with next workflow (resilience requirement 7.4)
            
            logger.info(f"Workflow installation complete: {len(installed)}/{total_workflows} successful")
            return installed, errors
            
        except Exception as e:
            error_msg = f"Workflow installation failed: {e}"
            logger.error(error_msg)
            return installed, [error_msg]
    
    def _verify_installation(self, comfyui_dir: Path) -> Tuple[bool, str]:
        """Verify ComfyUI installation."""
        try:
            # Check for main.py
            main_script = comfyui_dir / "main.py"
            if not main_script.exists():
                return False, "main.py not found"
            
            # Check for Python executable (Windows portable)
            if self.platform_type == "windows":
                python_exe = comfyui_dir / "python_embeded" / "python.exe"
                if not python_exe.exists():
                    logger.warning("Embedded Python not found, system Python will be used")
            
            # Check models directory
            models_dir = comfyui_dir / "models"
            if not models_dir.exists():
                models_dir.mkdir(exist_ok=True)
            
            logger.info("Installation verification passed")
            return True, ""
            
        except Exception as e:
            error_msg = f"Verification failed: {e}"
            logger.error(error_msg)
            return False, error_msg
    
    def start_comfyui(self, comfyui_dir: Optional[Path] = None) -> Tuple[bool, str]:
        """Start ComfyUI server."""
        try:
            if comfyui_dir is None:
                comfyui_dir = self.installation_path
            
            if comfyui_dir is None:
                return False, "ComfyUI not installed"
            
            # Use CORS-enabled startup script if available
            if self.platform_type == "windows":
                startup_script = comfyui_dir / "run_with_cors.bat"
            else:
                startup_script = comfyui_dir / "run_with_cors.sh"
            
            if startup_script.exists():
                logger.info(f"Starting ComfyUI with CORS enabled: {startup_script}")
                # Start in background
                if self.platform_type == "windows":
                    subprocess.Popen([str(startup_script)], cwd=str(comfyui_dir), shell=True)
                else:
                    subprocess.Popen([str(startup_script)], cwd=str(comfyui_dir))
                
                return True, f"ComfyUI started at http://127.0.0.1:8188"
            else:
                return False, "Startup script not found"
                
        except Exception as e:
            error_msg = f"Failed to start ComfyUI: {e}"
            logger.error(error_msg)
            return False, error_msg


def main():
    """Main function for ComfyUI installer."""
    import argparse
    
    parser = argparse.ArgumentParser(description="ComfyUI Portable Installer")
    parser.add_argument("--zip", required=True, help="Path to ComfyUI Portable ZIP file")
    parser.add_argument("--install-dir", default="./comfyui_portable", help="Installation directory")
    parser.add_argument("--cors-origin", default="http://localhost:3000", help="CORS origin")
    parser.add_argument("--no-cors", action="store_true", help="Disable CORS configuration")
    parser.add_argument("--start", action="store_true", help="Start ComfyUI after installation")
    
    args = parser.parse_args()
    
    installer = ComfyUIInstaller()
    
    # Check existing installation
    install_path = Path(args.install_dir)
    is_installed, existing_path = installer.check_existing_installation(install_path)
    
    if is_installed:
        print(f"ComfyUI already installed at: {existing_path}")
        response = input("Reinstall? (y/n): ")
        if response.lower() != 'y':
            print("Installation cancelled")
            return
    
    # Install ComfyUI
    def progress_callback(step: str, progress: int, message: str):
        print(f"[{progress}%] {message}")
    
    result = installer.install_comfyui_portable(
        zip_path=args.zip,
        install_dir=args.install_dir,
        enable_cors=not args.no_cors,
        cors_origin=args.cors_origin,
        progress_callback=progress_callback
    )
    
    # Print results
    print("\n" + "=" * 50)
    print(f"Installation: {'✓ Success' if result.success else '✗ Failed'}")
    print(f"Path: {result.comfyui_path}")
    print(f"URL: {result.comfyui_url}")
    
    if result.installed_models:
        print(f"Models: {', '.join(result.installed_models)}")
    
    if result.installed_workflows:
        print(f"Workflows: {', '.join(result.installed_workflows)}")
    
    if result.errors:
        print("\nErrors:")
        for error in result.errors:
            print(f"  - {error}")
    
    # Start ComfyUI if requested
    if args.start and result.success:
        print("\nStarting ComfyUI...")
        success, message = installer.start_comfyui(Path(result.comfyui_path))
        print(message)


if __name__ == "__main__":
    main()
