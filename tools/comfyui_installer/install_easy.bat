@echo off
REM ComfyUI Installation Script for StoryCore-Engine - Windows
REM Handles UNC paths, permissions, and complete automation

setlocal enabledelayedexpansion

REM Check for UNC path (WSL network path)
echo %CD% | findstr /C:"\\wsl" >nul
if !errorlevel! equ 0 (
    echo ⚠️  Detected WSL network path. Switching to WSL execution...
    echo Mapping temporary drive for UNC path access...
    
    REM Extract WSL path and convert to WSL format
    set "WSL_PATH=%CD:\=/%"
    set "WSL_PATH=!WSL_PATH:\\wsl.localhost\Ubuntu=/!"
    
    echo Executing via WSL Ubuntu at: !WSL_PATH!
    wsl bash -c "cd '!WSL_PATH!' && chmod +x ./install_wsl.sh && ./install_wsl.sh"
    exit /b !errorlevel!
)

REM Check for Administrator privileges for Windows Defender exclusions
net session >nul 2>&1
if !errorlevel! neq 0 (
    echo 🔒 Administrator privileges required for Windows Defender exclusions
    echo This ensures .safetensors model files are not blocked during download
    echo Requesting elevation...
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%CD%\" && \"%~f0\" %*' -Verb RunAs"
    exit /b 0
)

REM Apply Windows Defender exclusions for model files
echo 🛡️  Configuring Windows Defender exclusions...
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\.."
set "INSTALL_DIR=%PROJECT_ROOT%\comfyui_portable"

powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_DIR%' -Force" 2>nul
powershell -Command "Add-MpPreference -ExclusionExtension '.safetensors' -Force" 2>nul
echo ✅ Windows Defender exclusions applied

set "COMFYUI_DIR=%INSTALL_DIR%\ComfyUI"
set "PORT=%1"
if "%PORT%"=="" set "PORT=8188"

echo 🎬 StoryCore-Engine ComfyUI Installation (Windows)
echo ================================================
echo Project root: %PROJECT_ROOT%
echo Install directory: %INSTALL_DIR%
echo Port: %PORT%
echo.

REM Add Windows Defender exclusion
echo 🛡️  Adding Windows Defender exclusion...
powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_DIR%'" 2>nul
if !errorlevel! equ 0 (
    echo ✅ Windows Defender exclusion added
) else (
    echo ⚠️  Could not add Windows Defender exclusion
)

REM Create install directory
echo 📁 Creating installation directory...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
cd /d "%INSTALL_DIR%"

REM Download ComfyUI if not exists
if exist "ComfyUI" (
    echo ✅ ComfyUI already exists
) else (
    echo 📥 Downloading ComfyUI...
    set "COMFYUI_URL=https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip"
    
    where curl >nul 2>nul
    if !errorlevel! equ 0 (
        curl -C - -L "!COMFYUI_URL!" -o comfyui-master.zip
    ) else (
        powershell -Command "Invoke-WebRequest -Uri '!COMFYUI_URL!' -OutFile 'comfyui-master.zip'"
    )
    
    if not exist "comfyui-master.zip" (
        echo ❌ ComfyUI download failed!
        pause
        exit /b 1
    )
    
    echo 📦 Extracting ComfyUI...
    powershell -Command "Expand-Archive -Path 'comfyui-master.zip' -DestinationPath '.' -Force"
    if exist "ComfyUI-master" (
        ren "ComfyUI-master" "ComfyUI"
        del comfyui-master.zip
        echo ✅ ComfyUI extracted
    ) else (
        echo ❌ Extraction failed!
        pause
        exit /b 1
    )
)

cd /d "%COMFYUI_DIR%"

REM Create Python virtual environment (PEP 668 compliance)
echo 🐍 Setting up Python virtual environment...
if not exist "venv" (
    python -m venv venv
    if !errorlevel! neq 0 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment and install dependencies
echo 📦 Installing dependencies in virtual environment...
call venv\Scripts\activate.bat
if exist "requirements.txt" (
    pip install -r requirements.txt
) else (
    echo ⚠️  requirements.txt not found
)

REM Create model directories
echo 📁 Creating model directories...
if not exist "models\vae" mkdir "models\vae"
if not exist "models\loras" mkdir "models\loras"
if not exist "models\diffusion_models" mkdir "models\diffusion_models"
if not exist "models\text_encoders" mkdir "models\text_encoders"

REM Download models from links file
echo 📥 Downloading FLUX.2 models...
for /f "usebackq tokens=*" %%i in ("%SCRIPT_DIR%models_links.txt") do (
    set "url=%%i"
    if "!url:~0,8!"=="https://" (
        for %%f in ("!url!") do set "filename=%%~nxf"
        
        REM Determine output path
        if "!filename!" neq "!filename:vae=!" (
            set "output_path=models\vae\!filename!"
        ) else if "!filename!" neq "!filename:morisot=!" (
            set "output_path=models\loras\!filename!"
        ) else if "!filename!" neq "!filename:fp8mixed=!" (
            set "output_path=models\diffusion_models\!filename!"
        ) else if "!filename!" neq "!filename:mistral=!" (
            set "output_path=models\text_encoders\!filename!"
        ) else (
            set "output_path=models\checkpoints\!filename!"
        )
        
        REM Skip if file already exists
        if exist "!output_path!" (
            echo ✅ !filename! already exists, skipping
        ) else (
            echo 📥 Downloading !filename!...
            where curl >nul 2>nul
            if !errorlevel! equ 0 (
                curl -L "!url!" -o "!output_path!"
            ) else (
                powershell -Command "Invoke-WebRequest -Uri '!url!' -OutFile '!output_path!'"
            )
            
            if exist "!output_path!" (
                echo ✅ Downloaded !filename!
            ) else (
                echo ❌ Failed to download !filename!
            )
        )
    )
)
            where curl >nul 2>nul
            if !errorlevel! equ 0 (
                curl -C - -L "!url!" -o "!output_path!"
            ) else (
                powershell -Command "Invoke-WebRequest -Uri '!url!' -OutFile '!output_path!'"
            )
            
            if exist "!output_path!" (
                echo ✅ !filename! downloaded
            ) else (
                echo ❌ !filename! download failed
            )
        ) else (
            echo ✅ !filename! already exists
        )
        
        :continue
    )
)

REM Copy workflow file
echo 📋 Installing StoryCore-Engine workflow...
if exist "%PROJECT_ROOT%\image_flux2 storycore1.json" (
    copy "%PROJECT_ROOT%\image_flux2 storycore1.json" .
    echo ✅ Workflow installed
)

REM Install ComfyUI Manager as fallback
echo 🔧 Installing ComfyUI Manager (fallback system)...
if not exist "custom_nodes\ComfyUI-Manager" (
    cd custom_nodes
    where git >nul 2>nul
    if !errorlevel! equ 0 (
        git clone https://github.com/ltdrdata/ComfyUI-Manager.git
        echo ✅ ComfyUI Manager installed
    ) else (
        echo ⚠️  Git not found, ComfyUI Manager not installed
    )
    cd ..
) else (
    echo ✅ ComfyUI Manager already installed
)

REM Install Workflow Models Downloader
echo 📥 Installing Workflow Models Downloader...
if not exist "custom_nodes\ComfyUI-Workflow-Models-Downloader" (
    cd custom_nodes
    where git >nul 2>nul
    if !errorlevel! equ 0 (
        git clone https://github.com/slahiri/ComfyUI-Workflow-Models-Downloader.git
        echo ✅ Workflow Models Downloader installed
    ) else (
        echo ⚠️  Git not found, Workflow Models Downloader not installed
    )
    cd ..
) else (
    echo ✅ Workflow Models Downloader already installed
)

REM Create custom_nodes directory if it doesn't exist
if not exist "custom_nodes" mkdir "custom_nodes"

echo.
echo 🔍 Validating model installation...
if exist "tools\comfyui_installer\validate_models.sh" (
    bash tools\comfyui_installer\validate_models.sh
) else (
    echo ⚠️  Model validation script not found. Please verify models manually.
)

echo.
echo 🎉 Installation complete!
echo ========================================
echo.
echo 📍 Installation: %COMFYUI_DIR%
echo 🌐 Multimodal Pipe ready for StoryCore-Engine
echo.
echo 🚀 To launch ComfyUI:
echo cd %COMFYUI_DIR%
echo venv\Scripts\activate.bat
echo python main.py --listen 127.0.0.1 --port %PORT% --enable-cors-header
echo.
echo 🌐 ComfyUI will be available at: http://127.0.0.1:%PORT%
echo.
pause
