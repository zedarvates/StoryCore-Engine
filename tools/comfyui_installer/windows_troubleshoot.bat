@echo off
REM Windows Security Troubleshooting Helper for StoryCore-Engine ComfyUI
REM Helps diagnose and resolve common Windows security issues

echo.
echo ========================================================================
echo  StoryCore-Engine Windows Security Troubleshooting Helper
echo ========================================================================
echo.
echo This script helps diagnose common Windows security issues with ComfyUI
echo installation and provides guidance for resolution.
echo.
echo Press any key to start diagnostics...
pause >nul

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\.."
set "INSTALL_DIR=%PROJECT_ROOT%\comfyui_portable\ComfyUI"

echo.
echo 🔍 DIAGNOSTIC RESULTS:
echo ========================================================================

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Running as Administrator
) else (
    echo ⚠️  NOT running as Administrator
    echo    Recommendation: Right-click Command Prompt → "Run as administrator"
)

REM Check ComfyUI installation
if exist "%INSTALL_DIR%" (
    echo ✅ ComfyUI directory found: %INSTALL_DIR%
) else (
    echo ❌ ComfyUI not found
    echo    Run: install_easy.bat
)

REM Check Python
where python >nul 2>nul
if %errorlevel% == 0 (
    echo ✅ Python found
    python --version
) else (
    echo ❌ Python not found
    echo    Download: https://www.python.org/downloads/
)

REM Check Git
where git >nul 2>nul
if %errorlevel% == 0 (
    echo ✅ Git found
) else (
    echo ❌ Git not found
    echo    Download: https://git-scm.com/download/win
)

REM Check curl
where curl >nul 2>nul
if %errorlevel% == 0 (
    echo ✅ curl found
) else (
    echo ⚠️  curl not found
    echo    Install: winget install curl
)

REM Check model files
echo.
echo 📁 MODEL FILE STATUS:
if exist "%INSTALL_DIR%\models\vae\flux2-vae.safetensors" (
    echo ✅ VAE model found
) else (
    echo ❌ VAE model missing
)

if exist "%INSTALL_DIR%\models\diffusion_models\flux2_dev_fp8mixed.safetensors" (
    echo ✅ Diffusion model found
) else (
    echo ❌ Diffusion model missing
)

if exist "%INSTALL_DIR%\models\text_encoders\mistral_3_small_flux2_bf16.safetensors" (
    echo ✅ Text encoder found
) else (
    echo ❌ Text encoder missing
)

echo.
echo 🛡️ WINDOWS SECURITY GUIDANCE:
echo ========================================================================
echo.
echo IF DOWNLOADS ARE BLOCKED:
echo 1. Open Windows Security → Virus ^& threat protection
echo 2. Check "Protection history" for quarantined files
echo 3. Restore any .safetensors files from quarantine
echo 4. Add folder exclusion: %INSTALL_DIR%
echo.
echo IF SCRIPTS ARE BLOCKED:
echo 1. Right-click .bat file → Properties → Unblock
echo 2. Or run: powershell -Command "Unblock-File -Path '*.bat'"
echo 3. Run Command Prompt as Administrator
echo.
echo IF PYTHON PACKAGES FAIL:
echo 1. Install Visual C++ Build Tools
echo 2. Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
echo 3. Temporarily disable real-time protection during install
echo.
echo MANUAL DOWNLOAD URLS:
echo - ComfyUI: https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip
echo - Models: See %SCRIPT_DIR%models_links.txt
echo.
echo 🔧 QUICK FIXES:
echo ========================================================================
echo.
echo 1. ADD FOLDER EXCLUSION (Run as Admin):
echo    powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_DIR%'"
echo.
echo 2. UNBLOCK ALL SCRIPTS:
echo    powershell -Command "Get-ChildItem -Path '%SCRIPT_DIR%' -Filter '*.bat' | Unblock-File"
echo.
echo 3. SET EXECUTION POLICY:
echo    powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
echo.
echo 4. CHECK QUARANTINE:
echo    Start ms-settings:windowsdefender
echo.
pause
