"""
ComfyUI Installation API Endpoints
Provides REST endpoints for the ComfyUI Installation Wizard.

Author: StoryCore-Engine Team
Date: 2026-01-18
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from pathlib import Path
from typing import List, Optional, Dict, Any
import os
import asyncio
import json
import logging

# Import the ComfyUI installer
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from comfyui_installer import ComfyUIInstaller, InstallationResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router for installation endpoints
installation_router = APIRouter(prefix="/api/installation", tags=["installation"])

# Configuration
DOWNLOAD_ZONE_DIR = Path("./comfyui_download_zone")
COMFYUI_INSTALL_DIR = Path("./comfyui_portable")
COMFYUI_DOWNLOAD_URL = "https://github.com/comfyanonymous/ComfyUI/releases/download/latest/ComfyUI_windows_portable_nvidia_cu121_or_cpu.7z"
EXPECTED_FILENAME = "ComfyUI_windows_portable_nvidia_cu121_or_cpu.7z"
EXPECTED_FILE_SIZE = 2500000000  # ~2.5 GB

# Pydantic models for request/response
class InitializeResponse(BaseModel):
    """Response for initialization endpoint."""
    downloadZonePath: str
    downloadUrl: str
    expectedFileName: str
    expectedFileSize: int


class FileCheckResponse(BaseModel):
    """Response for file check endpoint."""
    exists: bool
    valid: bool
    fileName: Optional[str] = None
    fileSize: Optional[int] = None
    validationError: Optional[str] = None


class InstallRequest(BaseModel):
    """Request for installation endpoint."""
    zipFilePath: str
    enableCORS: bool = True
    installModels: List[str] = []
    installWorkflows: List[str] = []


class ProgressUpdate(BaseModel):
    """Progress update during installation."""
    step: str
    progress: int
    message: str
    error: Optional[str] = None


class VerificationResponse(BaseModel):
    """Response for verification endpoint."""
    installed: bool
    running: bool
    corsEnabled: bool
    url: Optional[str] = None
    models: List[str] = []
    workflows: List[str] = []
    errors: List[str] = []


# Endpoint implementations

@installation_router.post("/initialize", response_model=InitializeResponse)
async def initialize_installation():
    """
    Initialize the installation wizard.
    Creates download zone directory and returns configuration.
    
    Requirements: 2.3
    """
    try:
        # Create download zone directory if it doesn't exist
        DOWNLOAD_ZONE_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Download zone directory created/verified: {DOWNLOAD_ZONE_DIR}")
        
        # Return configuration
        return InitializeResponse(
            downloadZonePath=str(DOWNLOAD_ZONE_DIR.absolute()),
            downloadUrl=COMFYUI_DOWNLOAD_URL,
            expectedFileName=EXPECTED_FILENAME,
            expectedFileSize=EXPECTED_FILE_SIZE
        )
        
    except Exception as e:
        logger.error(f"Failed to initialize installation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize installation: {str(e)}"
        )


@installation_router.get("/check-file", response_model=FileCheckResponse)
async def check_file(path: str):
    """
    Check if ZIP file exists and validate it.
    
    Requirements: 3.2, 3.3, 3.5
    
    Args:
        path: Download zone path to check
    """
    try:
        download_zone = Path(path)
        
        # Check if directory exists
        if not download_zone.exists():
            return FileCheckResponse(
                exists=False,
                valid=False,
                validationError="Download zone directory does not exist"
            )
        
        # Look for ZIP files in the directory
        zip_files = list(download_zone.glob("*.zip")) + list(download_zone.glob("*.7z"))
        
        if not zip_files:
            return FileCheckResponse(
                exists=False,
                valid=False,
                validationError="No ZIP or 7z file found in download zone"
            )
        
        # Get the first ZIP file found
        zip_file = zip_files[0]
        file_name = zip_file.name
        file_size = zip_file.stat().st_size
        
        # Validate filename pattern (should contain "ComfyUI")
        if "ComfyUI" not in file_name and "comfyui" not in file_name.lower():
            return FileCheckResponse(
                exists=True,
                valid=False,
                fileName=file_name,
                fileSize=file_size,
                validationError=f"File name '{file_name}' does not match expected ComfyUI pattern"
            )
        
        # Validate file size (within 5% tolerance)
        tolerance = 0.05
        min_size = EXPECTED_FILE_SIZE * (1 - tolerance)
        max_size = EXPECTED_FILE_SIZE * (1 + tolerance)
        
        if file_size < min_size or file_size > max_size:
            expected_mb = EXPECTED_FILE_SIZE / (1024 * 1024)
            actual_mb = file_size / (1024 * 1024)
            return FileCheckResponse(
                exists=True,
                valid=False,
                fileName=file_name,
                fileSize=file_size,
                validationError=f"File size {actual_mb:.1f} MB is outside expected range (expected ~{expected_mb:.1f} MB ±5%)"
            )
        
        # File is valid
        logger.info(f"Valid ComfyUI file detected: {file_name} ({file_size} bytes)")
        return FileCheckResponse(
            exists=True,
            valid=True,
            fileName=file_name,
            fileSize=file_size,
            validationError=None
        )
        
    except Exception as e:
        logger.error(f"Error checking file: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check file: {str(e)}"
        )


@installation_router.websocket("/install")
async def install_comfyui(websocket: WebSocket):
    """
    Execute ComfyUI installation with WebSocket progress updates.
    
    Requirements: 5.1, 5.2, 5.3, 5.4
    
    WebSocket protocol:
    - Client sends: InstallRequest JSON
    - Server sends: ProgressUpdate JSON messages
    - Server sends final: InstallationResult JSON
    """
    await websocket.accept()
    
    try:
        # Receive installation request
        data = await websocket.receive_text()
        request_data = json.loads(data)
        request = InstallRequest(**request_data)
        
        logger.info(f"Starting installation from: {request.zipFilePath}")
        
        # Validate ZIP file exists
        zip_path = Path(request.zipFilePath)
        if not zip_path.exists():
            await websocket.send_json({
                "step": "error",
                "progress": 0,
                "message": "ZIP file not found",
                "error": f"File does not exist: {request.zipFilePath}"
            })
            await websocket.close()
            return
        
        # Create installer instance
        installer = ComfyUIInstaller()
        
        # Progress callback to send updates via WebSocket
        async def progress_callback(step: str, progress: int, message: str):
            try:
                await websocket.send_json({
                    "step": step,
                    "progress": progress,
                    "message": message,
                    "error": None
                })
            except Exception as e:
                logger.error(f"Failed to send progress update: {e}")
        
        # Wrap synchronous progress callback for async
        def sync_progress_callback(step: str, progress: int, message: str):
            asyncio.create_task(progress_callback(step, progress, message))
        
        # Execute installation
        result = installer.install_comfyui_portable(
            zip_path=str(zip_path),
            install_dir=str(COMFYUI_INSTALL_DIR),
            enable_cors=request.enableCORS,
            cors_origin="http://localhost:3000",
            models=request.installModels if request.installModels else None,
            workflows=request.installWorkflows if request.installWorkflows else None,
            progress_callback=sync_progress_callback
        )
        
        # Send final result
        await websocket.send_json({
            "step": "complete" if result.success else "error",
            "progress": 100 if result.success else 0,
            "message": "Installation completed successfully" if result.success else "Installation failed",
            "error": "; ".join(result.errors) if result.errors else None,
            "result": {
                "success": result.success,
                "comfyui_path": result.comfyui_path,
                "comfyui_url": result.comfyui_url,
                "installed_models": result.installed_models,
                "installed_workflows": result.installed_workflows,
                "errors": result.errors
            }
        })
        
        logger.info(f"Installation completed: success={result.success}")
        
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected during installation")
    except Exception as e:
        logger.error(f"Installation error: {e}")
        try:
            await websocket.send_json({
                "step": "error",
                "progress": 0,
                "message": "Installation failed",
                "error": str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@installation_router.get("/verify", response_model=VerificationResponse)
async def verify_installation():
    """
    Verify ComfyUI installation and CORS configuration.
    
    Requirements: 10.1, 10.5
    """
    try:
        errors = []
        
        # Check if installation directory exists
        if not COMFYUI_INSTALL_DIR.exists():
            return VerificationResponse(
                installed=False,
                running=False,
                corsEnabled=False,
                url=None,
                models=[],
                workflows=[],
                errors=["ComfyUI installation directory not found"]
            )
        
        # Create installer to check installation
        installer = ComfyUIInstaller()
        
        # Find ComfyUI directory
        comfyui_dir = installer._find_comfyui_directory(COMFYUI_INSTALL_DIR)
        
        if not comfyui_dir:
            return VerificationResponse(
                installed=False,
                running=False,
                corsEnabled=False,
                url=None,
                models=[],
                workflows=[],
                errors=["ComfyUI directory not found in installation path"]
            )
        
        # Check if main.py exists
        main_script = comfyui_dir / "main.py"
        if not main_script.exists():
            errors.append("main.py not found")
        
        # Check for CORS startup script
        cors_enabled = False
        if (comfyui_dir / "run_with_cors.bat").exists() or (comfyui_dir / "run_with_cors.sh").exists():
            cors_enabled = True
        else:
            errors.append("CORS startup script not found")
        
        # Get installed models
        models = []
        models_dir = comfyui_dir / "models" / "checkpoints"
        if models_dir.exists():
            models = [f.name for f in models_dir.iterdir() if f.is_file()]
        
        # Get installed workflows
        workflows = []
        workflows_dir = comfyui_dir / "user" / "default" / "workflows"
        if workflows_dir.exists():
            workflows = [f.name for f in workflows_dir.iterdir() if f.is_file() and f.suffix == ".json"]
        
        # Check if ComfyUI is running (simplified check)
        # In production, you would make an HTTP request to the ComfyUI API
        running = False
        comfyui_url = "http://127.0.0.1:8188"
        
        # Try to check if server is running
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('127.0.0.1', 8188))
            sock.close()
            running = (result == 0)
        except:
            pass
        
        return VerificationResponse(
            installed=True,
            running=running,
            corsEnabled=cors_enabled,
            url=comfyui_url if running else None,
            models=models,
            workflows=workflows,
            errors=errors
        )
        
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify installation: {str(e)}"
        )


@installation_router.post("/start")
async def start_comfyui():
    """
    Start ComfyUI Portable server with CORS enabled.
    
    Requirements: 10.1
    """
    try:
        # Check if installation directory exists
        if not COMFYUI_INSTALL_DIR.exists():
            raise HTTPException(
                status_code=404,
                detail="ComfyUI installation not found"
            )
        
        # Create installer to start ComfyUI
        installer = ComfyUIInstaller()
        
        # Find ComfyUI directory
        comfyui_dir = installer._find_comfyui_directory(COMFYUI_INSTALL_DIR)
        
        if not comfyui_dir:
            raise HTTPException(
                status_code=404,
                detail="ComfyUI directory not found in installation path"
            )
        
        # Start ComfyUI
        success, message = installer.start_comfyui(comfyui_dir)
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail=message
            )
        
        # Wait a moment for server to start
        await asyncio.sleep(2)
        
        # Verify server is running
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex(('127.0.0.1', 8188))
            sock.close()
            
            if result == 0:
                return {
                    "success": True,
                    "message": "ComfyUI started successfully",
                    "url": "http://127.0.0.1:8188"
                }
            else:
                return {
                    "success": False,
                    "message": "ComfyUI started but server not responding yet. Please wait a moment.",
                    "url": "http://127.0.0.1:8188"
                }
        except Exception as e:
            logger.warning(f"Could not verify server status: {e}")
            return {
                "success": True,
                "message": "ComfyUI started. Server may take a moment to become available.",
                "url": "http://127.0.0.1:8188"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start ComfyUI: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start ComfyUI: {str(e)}"
        )


@installation_router.post("/test-cors")
async def test_cors():
    """
    Test CORS configuration by making a request to ComfyUI.
    
    Requirements: 6.5
    """
    try:
        import aiohttp
        
        comfyui_url = "http://127.0.0.1:8188"
        
        # Try to connect to ComfyUI API
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    f"{comfyui_url}/system_stats",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        # Check CORS headers
                        cors_header = response.headers.get('Access-Control-Allow-Origin')
                        
                        return {
                            "success": True,
                            "running": True,
                            "corsEnabled": cors_header is not None,
                            "corsOrigin": cors_header,
                            "message": "ComfyUI is running and accessible"
                        }
                    else:
                        return {
                            "success": False,
                            "running": True,
                            "corsEnabled": False,
                            "message": f"ComfyUI returned status {response.status}"
                        }
            except asyncio.TimeoutError:
                return {
                    "success": False,
                    "running": False,
                    "corsEnabled": False,
                    "message": "Connection to ComfyUI timed out"
                }
            except aiohttp.ClientError as e:
                return {
                    "success": False,
                    "running": False,
                    "corsEnabled": False,
                    "message": f"Could not connect to ComfyUI: {str(e)}"
                }
                
    except ImportError:
        # aiohttp not available, use basic socket check
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex(('127.0.0.1', 8188))
            sock.close()
            
            if result == 0:
                return {
                    "success": True,
                    "running": True,
                    "corsEnabled": None,
                    "message": "ComfyUI is running (CORS status unknown without aiohttp)"
                }
            else:
                return {
                    "success": False,
                    "running": False,
                    "corsEnabled": False,
                    "message": "ComfyUI is not running"
                }
        except Exception as e:
            return {
                "success": False,
                "running": False,
                "corsEnabled": False,
                "message": f"Connection test failed: {str(e)}"
            }
    except Exception as e:
        logger.error(f"CORS test error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test CORS: {str(e)}"
        )
