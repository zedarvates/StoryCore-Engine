# TypeScript Unused Code Cleanup Script
# This script uses ESLint to automatically fix unused imports and variables

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TypeScript Unused Code Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the creative-studio-ui directory." -ForegroundColor Red
    exit 1
}

# Get initial error count
Write-Host "Counting initial errors..." -ForegroundColor Yellow
$initialErrors = (npm run build 2>&1 | Select-String "error TS" | Measure-Object).Count
Write-Host "Initial error count: $initialErrors" -ForegroundColor White
Write-Host ""

# Confirm before proceeding
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Run ESLint auto-fix on all TypeScript files" -ForegroundColor White
Write-Host "  2. Remove unused imports and variables" -ForegroundColor White
Write-Host "  3. Prefix unused parameters with underscore" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Do you want to proceed? (y/n)"

if ($confirm -ne "y") {
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting cleanup..." -ForegroundColor Green
Write-Host ""

# Create backup
Write-Host "Creating git backup..." -ForegroundColor Yellow
git add -A
git stash push -m "Pre-cleanup backup $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Backup created (use 'git stash pop' to restore if needed)" -ForegroundColor Green
Write-Host ""

# Run ESLint fix on different directories
$directories = @(
    "src/components",
    "src/services",
    "src/hooks",
    "src/stores",
    "src/utils",
    "src/types"
)

$totalDirs = $directories.Count
$currentDir = 0

foreach ($dir in $directories) {
    $currentDir++
    Write-Host "[$currentDir/$totalDirs] Fixing $dir..." -ForegroundColor Cyan
    
    try {
        npx eslint --fix "$dir/**/*.{ts,tsx}" 2>&1 | Out-Null
        Write-Host "  ✓ Completed" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Some errors remain (this is normal)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host ""

# Get final error count
Write-Host "Counting final errors..." -ForegroundColor Yellow
$finalErrors = (npm run build 2>&1 | Select-String "error TS" | Measure-Object).Count
$errorsFixed = $initialErrors - $finalErrors

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Initial errors:  $initialErrors" -ForegroundColor White
Write-Host "Final errors:    $finalErrors" -ForegroundColor White
Write-Host "Errors fixed:    $errorsFixed" -ForegroundColor Green
Write-Host ""

if ($errorsFixed -gt 0) {
    $percentFixed = [math]::Round(($errorsFixed / $initialErrors) * 100, 1)
    Write-Host "Improvement: $percentFixed% reduction" -ForegroundColor Green
} else {
    Write-Host "No errors were automatically fixed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes: git diff" -ForegroundColor White
Write-Host "  2. Run tests: npm test" -ForegroundColor White
Write-Host "  3. Commit changes: git add -A && git commit -m 'fix: remove unused code'" -ForegroundColor White
Write-Host "  4. Or rollback: git stash pop (to restore backup)" -ForegroundColor White
Write-Host ""
