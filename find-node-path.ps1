#!/usr/bin/env pwsh
# find-node-path.ps1 - Script to find the correct Node.js path for Builder.io extension
# Usage: .\find-node-path.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Finding Node.js Installation Path" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$commonPaths = @(
    "C:\Program Files\nodejs\node.exe"
    "C:\Program Files (x86)\nodejs\node.exe"
    "$env:USERPROFILE\AppData\Programs\nodejs\node.exe"
    "$env:USERPROFILE\AppData\Local\Programs\nodejs\node.exe"
    "C:\nodejs\node.exe"
    "D:\nodejs\node.exe"
)

Write-Host "Checking common Node.js installation paths..." -ForegroundColor Yellow
Write-Host ""

$foundPath = $null

foreach ($path in $commonPaths) {
    if (Test-Path $path -PathType Leaf) {
        Write-Host "[FOUND] $path" -ForegroundColor Green
        $foundPath = $path
        break
    } else {
        Write-Host "[CHECK] $path - Not found" -ForegroundColor DarkGray
    }
}

# Method 2: Use Get-Command (most reliable)
if (-not $foundPath) {
    Write-Host ""
    Write-Host "Trying PowerShell Get-Command..." -ForegroundColor Yellow
    try {
        $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
        if ($nodeCommand) {
            $foundPath = $nodeCommand.Source
            Write-Host "[FOUND] $foundPath" -ForegroundColor Green
        }
    } catch {
        Write-Host "Get-Command failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Method 3: Check where.exe
if (-not $foundPath) {
    Write-Host ""
    Write-Host "Trying where command..." -ForegroundColor Yellow
    try {
        $whereOutput = where.exe node.exe 2>$null | Select-Object -First 1
        if ($whereOutput -and (Test-Path $whereOutput -PathType Leaf)) {
            $foundPath = $whereOutput
            Write-Host "[FOUND] $foundPath" -ForegroundColor Green
        }
    } catch {
        Write-Host "where command failed" -ForegroundColor Red
    }
}

# Method 4: Check environment variables
if (-not $foundPath) {
    Write-Host ""
    Write-Host "Checking PATH environment variable..." -ForegroundColor Yellow
    $env:PATH -split ';' | ForEach-Object {
        $nodePath = Join-Path $_ "node.exe"
        if (Test-Path $nodePath -PathType Leaf) {
            $foundPath = $nodePath
            Write-Host "[FOUND] $foundPath" -ForegroundColor Green
            return
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RESULT" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($foundPath) {
    Write-Host "SUCCESS: Node.js found at:" -ForegroundColor Green
    Write-Host $foundPath -ForegroundColor White
    Write-Host ""
    Write-Host "Add this to your VSCode settings.json:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host """builder.nodePath"": ""$foundPath""" -ForegroundColor White
    Write-Host ""
    
    # Offer to update settings.json automatically
    $settingsPath = Join-Path $PSScriptRoot ".vscode\settings.json"
    if (Test-Path $settingsPath) {
        Write-Host ""
        $response = Read-Host "Update .vscode/settings.json automatically? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
            $settings.'builder.nodePath' = $foundPath
            $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
            Write-Host "Updated .vscode/settings.json with correct node path!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Install Node.js from https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Or manually set the path in VSCode settings" -ForegroundColor White
    Write-Host ""
    Write-Host "Common download locations:" -ForegroundColor Yellow
    Write-Host "- https://nodejs.org (LTS version recommended)" -ForegroundColor White
    Write-Host "- https://github.com/nvm-sh/nvm (for multiple versions)" -ForegroundColor White
}

Write-Host ""

