# Archive Cleanup Directories Script
# Date: 2026-02-10
# Purpose: Archive obsolete directories that are no longer needed in active codebase

$archiveDate = Get-Date -Format "yyyy-MM-dd"
$archiveBase = "cleanup-archives"

# Directories to archive
$dirsToArchive = @(
    @{
        Path = "archive"
        Name = "archive"
        Reason = "Old cleanup documentation from February 2026"
        Files = "60+ files in root_cleanup_2026_02/, 16 files in resume_legacy/, 1 image"
    },
    @{
        Path = "reports"
        Name = "reports"
        Reason = "Historical report files (50+ reports)"
        Files = "All report markdown files"
    },
    @{
        Path = "plans/storycore-engine-saas-action-plan.md"
        Name = "plans-saas-action-plan"
        Reason = "Outdated SaaS planning document"
        Files = "1 file"
    },
    @{
        Path = "plans/storycore-engine-saas-architecture.md"
        Name = "plans-saas-architecture"
        Reason = "Outdated SaaS planning document"
        Files = "1 file"
    },
    @{
        Path = "plans/storycore-engine-saas-detailed-architecture.md"
        Name = "plans-saas-detailed-architecture"
        Reason = "Outdated SaaS planning document"
        Files = "1 file"
    },
    @{
        Path = "plans/storycore-engine-saas-final-summary.md"
        Name = "plans-saas-final-summary"
        Reason = "Outdated SaaS planning document"
        Files = "1 file"
    },
    @{
        Path = "plans/storycore-engine-saas-payment-workflow.md"
        Name = "plans-saas-payment-workflow"
        Reason = "Outdated SaaS planning document"
        Files = "1 file"
    },
    @{
        Path = "plans/storycore-engine-saas-strategy.md"
        Name = "plans-saas-strategy"
        Reason = "Outdated SaaS planning document"
        Files = "1 file"
    }
)

Write-Host "=========================================="
Write-Host "Archive Cleanup Directories - $archiveDate"
Write-Host "=========================================="
Write-Host ""

# Create base archive directory
if (-not (Test-Path $archiveBase)) {
    New-Item -ItemType Directory -Force -Path $archiveBase | Out-Null
    Write-Host "[CREATED] $archiveBase/"
}

# Option 1: Create ZIP archive (recommended)
Write-Host "[INFO] Creating ZIP archive of directories..."
$zipName = "$archiveBase/cleanup-archives-$archiveDate.zip"

if (Test-Path $zipName) {
    Remove-Item $zipName -Force
}

foreach ($dir in $dirsToArchive) {
    if (Test-Path $dir.Path) {
        Write-Host "[ARCHIVING] $($dir.Path) -> $($dir.Name)"
        Compress-Archive -Path $dir.Path -DestinationPath "$zipName" -Update
    } else {
        Write-Host "[WARNING] $($dir.Path) not found"
    }
}

Write-Host ""
Write-Host "[SUCCESS] Archive created: $zipName"
Write-Host ""

# Option 2: Create deletion manifest (alternative approach)
Write-Host "[INFO] Creating deletion manifest..."
$manifestContent = @"
# Deletion Manifest - Cleanup Directories
# Date: $archiveDate

## Directories to Delete

| Directory | Reason | Files |
|-----------|--------|-------|
| archive/ | Old cleanup documentation from February 2026 | 60+ files |
| reports/ | Historical report files | 50+ reports |
| plans/storycore-engine-saas-*.md | Outdated SaaS planning documents | 6 files |

## Instructions

To delete these directories, run:

```powershell
# Remove archive directory
Remove-Item -Recurse -Force archive/

# Remove reports directory
Remove-Item -Recurse -Force reports/

# Remove SaaS planning documents
Remove-Item -Force plans/storycore-engine-saas-action-plan.md
Remove-Item -Force plans/storycore-engine-saas-architecture.md
Remove-Item -Force plans/storycore-engine-saas-detailed-architecture.md
Remove-Item -Force plans/storycore-engine-saas-final-summary.md
Remove-Item -Force plans/storycore-engine-saas-payment-workflow.md
Remove-Item -Force plans/storycore-engine-saas-strategy.md
```

## Git History Retrieval

If you need to retrieve any files from git history after deletion:

```bash
# List all files in archive/
git ls-tree -r HEAD --name-only | grep '^archive/'

# Restore a specific file
git checkout HEAD -- archive/root_cleanup_2026_02/AUDIT_FILES_MANIFEST.md

# Search for deleted files
git log --all --full-history -- "archive/"

# Restore entire archive directory from a specific commit
git checkout <commit-hash> -- archive/
```
"@

$manifestPath = "$archiveBase/deletion-manifest.md"
$manifestContent | Out-File -Encoding UTF8 $manifestPath
Write-Host "[CREATED] $manifestPath"

Write-Host ""
Write-Host "=========================================="
Write-Host "Archive Complete"
Write-Host "=========================================="
Write-Host "Files created:"
Write-Host "  - $zipName"
Write-Host "  - $manifestPath"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Review the archive and manifest"
Write-Host "  2. Run deletion commands when ready"
Write-Host "  3. Commit changes to git"
