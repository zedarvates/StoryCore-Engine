# Verify Prompt Library Integration
# Checks that all files are in place and ready to use

Write-Host "🔍 Verifying Prompt Library Integration..." -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Check library folder
Write-Host "📁 Checking library folder..." -ForegroundColor Yellow
if (Test-Path "library") {
    Write-Host "  ✅ library/ exists" -ForegroundColor Green
    
    # Check key files
    $libraryFiles = @(
        "library/index.json",
        "library/prompt-library.json",
        "library/PromptLibraryService.ts",
        "library/PromptLibraryBrowser.tsx",
        "library/PromptLibraryBrowser.css",
        "library/README.md"
    )
    
    foreach ($file in $libraryFiles) {
        if (Test-Path $file) {
            Write-Host "  ✅ $file" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $file MISSING" -ForegroundColor Red
            $errors++
        }
    }
    
    # Check prompt folders
    $promptFolders = @(
        "library/01-master-coherence",
        "library/02-genres",
        "library/03-shot-types",
        "library/04-lighting",
        "library/05-scene-elements"
    )
    
    foreach ($folder in $promptFolders) {
        if (Test-Path $folder) {
            $count = (Get-ChildItem $folder -Filter "*.json").Count
            Write-Host "  ✅ $folder ($count prompts)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $folder MISSING" -ForegroundColor Red
            $errors++
        }
    }
} else {
    Write-Host "  ❌ library/ folder MISSING" -ForegroundColor Red
    $errors++
}

Write-Host ""

# Check creative-studio-ui integration
Write-Host "📁 Checking creative-studio-ui integration..." -ForegroundColor Yellow
if (Test-Path "creative-studio-ui/src") {
    Write-Host "  ✅ creative-studio-ui/src/ exists" -ForegroundColor Green
    
    # Check copied library
    if (Test-Path "creative-studio-ui/src/library") {
        $libCount = (Get-ChildItem "creative-studio-ui/src/library" -Recurse -File).Count
        Write-Host "  ✅ creative-studio-ui/src/library/ ($libCount files)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ creative-studio-ui/src/library/ MISSING" -ForegroundColor Red
        Write-Host "     Run: xcopy /E /I /Y library creative-studio-ui\src\library" -ForegroundColor Yellow
        $errors++
    }
    
    # Check integration files
    $integrationFiles = @(
        "creative-studio-ui/src/hooks/usePromptLibrary.ts",
        "creative-studio-ui/src/services/PromptGenerationService.ts",
        "creative-studio-ui/src/components/wizard/PromptLibraryModal.tsx",
        "creative-studio-ui/src/examples/PromptLibraryExample.tsx"
    )
    
    foreach ($file in $integrationFiles) {
        if (Test-Path $file) {
            Write-Host "  ✅ $file" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $file MISSING" -ForegroundColor Red
            $errors++
        }
    }
} else {
    Write-Host "  ❌ creative-studio-ui/src/ folder MISSING" -ForegroundColor Red
    $errors++
}

Write-Host ""

# Check documentation
Write-Host "📚 Checking documentation..." -ForegroundColor Yellow
$docFiles = @(
    "LIBRARY_CREATION_COMPLETE.md",
    "PROMPT_LIBRARY_FINAL_SUMMARY.md",
    "INTEGRATION_COMPLETE.md",
    "creative-studio-ui/PROMPT_LIBRARY_INTEGRATION_COMPLETE.md",
    "creative-studio-ui/TEST_PROMPT_LIBRARY.md"
)

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $file missing" -ForegroundColor Yellow
        $warnings++
    }
}

Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The Prompt Library is fully integrated and ready to use!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. cd creative-studio-ui" -ForegroundColor White
    Write-Host "  2. npm run dev" -ForegroundColor White
    Write-Host "  3. Navigate to /prompt-library-test" -ForegroundColor White
    Write-Host "  4. Test all features" -ForegroundColor White
} elseif ($errors -eq 0) {
    Write-Host "✅ Integration complete with $warnings warning(s)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Some documentation files are missing but core functionality is ready." -ForegroundColor Yellow
} else {
    Write-Host "❌ Integration incomplete: $errors error(s), $warnings warning(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the errors above before proceeding." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  - Copy library: xcopy /E /I /Y library creative-studio-ui\src\library" -ForegroundColor White
    Write-Host "  - Check file paths and names" -ForegroundColor White
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Exit with error code if there are errors
if ($errors -gt 0) {
    exit 1
} else {
    exit 0
}
