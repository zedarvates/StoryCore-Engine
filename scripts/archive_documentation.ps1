<#
.SYNOPSIS
    Script d'archivage des fichiers de documentation redondants
.DESCRIPTION
    Ce script deplace les fichiers de documentation obsoletes vers le dossier archive/
    selon les regles definies dans DOCUMENTATION_INDEX.md
.PARAMETER DryRun
    Si specifie, affiche les actions sans les executer
.PARAMETER Verbose
    Affiche les details de chaque operation
.EXAMPLE
    .\archive_documentation.ps1 -DryRun
    Affiche les fichiers qui seront archives sans les deplacer
.EXAMPLE
    .\archive_documentation.ps1
    Execute l'archivage des fichiers
#>

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

# Configuration
$ScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent -Path $ScriptRoot
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"

# Dossiers source
$CreativeStudioDocs = Join-Path $ProjectRoot "creative-studio-ui"
$DocumentationFolder = Join-Path $ProjectRoot "documentation"

# Dossiers destination (crees si necessaire)
$ArchiveRoot = Join-Path $ProjectRoot "archive"
$CreativeStudioArchive = Join-Path $ArchiveRoot "creative-studio-ui"
$DocumentationArchive = Join-Path $ArchiveRoot "documentation"

# Fichiers a archiver - Creative Studio UI
$TASK_Files = @(
    "TASK_1_COMPLETION_SUMMARY.md",
    "TASK_4_RECENT_PROJECTS_SERVICE_COMPLETE.md",
    "TASK_5_MENU_CONFIG_SYSTEM_COMPLETE.md",
    "TASK_7_COMPLETION_SUMMARY.md",
    "TASK_7_MODAL_MANAGEMENT_COMPLETE.md",
    "TASK_8_COMPLETION_SUMMARY.md",
    "TASK_8.1_COMPLETION_SUMMARY.md",
    "TASK_8.1_NOTIFICATION_SERVICE_COMPLETE.md",
    "TASK_9_COMPLETION_SUMMARY.md",
    "TASK_9_CORE_MENU_COMPONENTS_COMPLETE.md",
    "TASK_10_COMPLETION_SUMMARY.md",
    "TASK_10_DIALOGUE_PHRASE_EDITOR_COMPLETE.md",
    "TASK_10_MENUBAR_ROOT_COMPONENT_COMPLETE.md",
    "TASK_10_STATE_INTEGRATION_COMPLETE.md",
    "TASK_11_CHECKPOINT_COMPLETE.md",
    "TASK_11_ERROR_HANDLING_COMPLETE.md",
    "TASK_12_FALLBACK_MODE_COMPLETE.md",
    "TASK_12_UI_POLISH_COMPLETE.md",
    "TASK_12_VOICE_GENERATION_PANEL_COMPLETE.md",
    "TASK_12.1_SUMMARY.md",
    "TASK_12.4_SUMMARY.md",
    "TASK_13_AUDIO_TRACK_MANAGER_COMPLETE.md",
    "TASK_13_FINAL_CHECKPOINT_COMPLETE.md",
    "TASK_13.1_SUMMARY.md",
    "TASK_14_BATCH_GENERATION_COMPLETE.md",
    "TASK_14_PERSISTENCE_ENHANCEMENTS_COMPLETE.md",
    "TASK_14_SEQUENCE_GENERATION_COMPLETE.md",
    "TASK_14.1_SUMMARY.md",
    "TASK_15_1_GENERATION_PROGRESS_MODAL_COMPLETE.md",
    "TASK_15_GENERATION_PROGRESS_MODAL_SUMMARY.md",
    "TASK_15_IMPLEMENTATION_SUMMARY.md",
    "TASK_15_PIPELINE_WORKFLOW_COMPLETE.md",
    "TASK_15_VERIFICATION_SUMMARY.md",
    "TASK_15.1_SUMMARY.md",
    "TASK_16_1_SEQUENCE_GENERATION_CONTROL_COMPLETE.md",
    "TASK_16_ASSET_PREVIEW_PANEL_COMPLETE.md",
    "TASK_16_ERROR_HANDLING_COMPLETE.md",
    "TASK_16_MIGRATION_IMPLEMENTATION.md",
    "TASK_16_SEQUENCE_GENERATION_CONTROL_SUMMARY.md",
    "TASK_16.1_SUMMARY.md",
    "TASK_16.2_SUMMARY.md",
    "TASK_17_CHECKPOINT_GENERATION_TESTS_COMPLETE.md",
    "TASK_17_HISTORY_PANEL_COMPLETE.md",
    "TASK_17.1_SUMMARY.md",
    "TASK_18_CHECKPOINT_SUMMARY.md",
    "TASK_18_DATA_PERSISTENCE_COMPLETE.md",
    "TASK_19_1_SHOT_DELETION_COMPLETE.md",
    "TASK_19_ACCESSIBILITY_IMPLEMENTATION.md",
    "TASK_19.1_SUMMARY.md",
    "TASK_19.2_SUMMARY.md",
    "TASK_20_1_BACKGROUND_GENERATION_COMPLETE.md",
    "TASK_20.1_SUMMARY.md",
    "TASK_20.2_SUMMARY.md",
    "TASK_21_1_DASHBOARD_ASSEMBLY_COMPLETE.md",
    "TASK_21_INTEGRATION_COMPLETE.md",
    "TASK_22_ACCESSIBILITY_COMPLETE.md",
    "TASK_22.1_SUMMARY.md",
    "TASK_22.2_SUMMARY.md"
)

$FIX_Files = @(
    "BUG_FIX_CHARACTER_CREATION.md",
    "BUG_FIX_SEQUENCE_LOADING.md",
    "CHARACTER_CREATION_MENU_FIX.md",
    "CHARACTER_PERSISTENCE_FIX.md",
    "COMFYUI_CONNECTION_FIX.md",
    "COMFYUI_CONNECTION_FIX_COMPLETE.md",
    "COMFYUI_ERROR_FIXED.md",
    "CORRECTION_DOUBLONS_INTERFACE.md",
    "CORRECTION_DOUBLONS_PERSONNAGES.md",
    "CORRECTION_ERREURS_CRITIQUES.md",
    "CORRECTION_MENU_FRANCAIS.md",
    "CORRECTION_PERSISTANCE_PORTRAITS.md",
    "CORRECTION_PERSISTANCE_PORTRAITS_COMPLETE.md",
    "CORRECTION_TEXTES_EMMELES.md",
    "CORRECTION_TODO.md",
    "CORRECTIONS_3_PROBLEMES.md",
    "CORRECTIONS_APPLIQUEES.md",
    "CORRECTIONS_PORTRAIT_GENERATION.md",
    "CRITICAL_FIXES_APPLIED.md",
    "CRITICAL_FIXES_NEEDED.md",
    "CSP_AND_WIZARDS_FIX.md",
    "CSP_COMFYUI_IMAGES_FIXED.md",
    "FIX_ALL_IMPORTS.md",
    "FIX_CLONING_ERROR.md",
    "FIX_DIAGNOSTIC_ERRORS.md",
    "FIX_ECRAN_NOIR.md",
    "FIX_FILE_SYSTEM_API_ERROR.md",
    "FIX_SEQUENCE_REFRESH_WEB_SUPPORT.md",
    "FIXES_APPLIED_SESSION.md",
    "INFINITE_LOOP_FIX.md",
    "LLM_API_KEY_FIX.md",
    "LLM_SETTINGS_DECRYPTION_FIX.md",
    "LANGUAGE_FIX_SUMMARY.md",
    "MODEL_DOWNLOAD_FIX.md",
    "MODEL_NAMES_CORRECTION.md",
    "README_MENU_FIXES.md",
    "REDUX_SERIALIZATION_FIX.md",
    "SHOT_WIZARD_SCROLL_FIX.md",
    "SHOT_WIZARD_TYPE_SELECTOR_FIX.md"
)

$Summary_Files = @(
    "CHECKPOINT_6_CORE_SERVICES_TESTS.md",
    "CHANGES_APPLIED.md",
    "COMPLETION_REPORT.md",
    "COMPLETION_STATUS.md",
    "ELECTRON_BLACK_SCREEN_DIAGNOSTIC.md",
    "ELECTRON_ECRAN_NOIR_FIX.md",
    "ELECTRON_ECRAN_NOIR_RESOLU.md",
    "ERROR_HANDLING_IMPLEMENTATION.md",
    "EXPERIMENTAL_FEATURES_IMPLEMENTATION.md",
    "EXPERIMENTAL_FEATURES_TEST.md",
    "FEATURE_CHARACTER_PORTRAIT_SUMMARY.md",
    "FINAL_FIX_SUMMARY.md",
    "FINAL_IMPORT_FIX_SUMMARY.md",
    "FINAL_MENU_VERIFICATION_REPORT.md",
    "FINAL_REPORT.md",
    "GRID_EDITOR_TEST_FIXES_REPORT.md",
    "GRID_EDITOR_VERIFICATION_REPORT.md",
    "GRID_EDITOR_ZOOM_FIX.md",
    "IMPLEMENTATION_COMPLETE.md",
    "IMPLEMENTATION_SUMMARY.md",
    "IMPORT_ERRORS_RESOLUTION_COMPLETE.md",
    "IMPORT_FIXES_SUMMARY.md",
    "MENU_ANALYSIS_COMPLETE.txt",
    "MENU_CHARACTER_STORY_WIZARD_FIX.md",
    "MENU_DUPLICATES_ANALYSIS.md"
)

# Fichiers documentation a archiver
$Doc_Files = @(
    "ADDON_CONFIG_FEATURE.md",
    "ADDON_FRONTEND_INTEGRATION.md",
    "ADDON_QUICK_START.md",
    "ADDON_SYSTEM_IMPROVEMENTS.md",
    "AI_ENHANCEMENT_API_REFERENCE.md",
    "AMUSEAI_EVALUATION_MEMO.md",
    "ANALYSE_DOCS_V3_COMPLETE.md",
    "ANALYSE_ERREURS_TACHES.md",
    "API_PYTHON_MIGRATION.md",
    "AUTOMATIC_MODEL_DOWNLOAD.md",
    "BUILDER_IO_NODE_PATH_FIX.md",
    "CHANGELOG_SEQUENCE_REFRESH.md",
    "CLI_ARCHITECTURE.md",
    "CLI_EXTENSIBILITY.md",
    "CODE_SIGNING_SETUP.md",
    "configuration_manager_implementation.md",
    "connection_manager.md",
    "DEPENDENCES_PYTHON.md",
    "ERROR_HANDLING.md",
    "error_recovery_manager_implementation.md",
    "error-handling-implementation.md",
    "EXEMPLES_PROMPTS_AVANT_APRES.md",
    "feedback-error-logging.md",
    "FIX_TESTS.md",
    "INDEX_ANALYSE_DOCS_V3.md",
    "INSIGHTS_AMELIORATION_VIDEO_AUDIO.md",
    "INSTRUCTIONS_UTILISATION_MIGRATION.md",
    "INTEGRATION_GUIDE.md",
    "INTEGRATION_PLAN.md",
    "json_schema_validation_research.md",
    "LLM_MEMORY_SYSTEM_GUIDE.md",
    "LOG_ANONYMIZER_IMPLEMENTATION.md",
    "MIGRATION_GUIDE.md",
    "MODEL_REQUIREMENTS_MATRIX.md",
    "PHASE3_UX_IMPROVEMENTS.md",
    "pipeline_executor_implementation.md",
    "PLAN_ACTION_INTEGRATION_INSIGHTS.md",
    "PLAN_AMELIORATION_EDITEUR_CAPCUT.md",
    "PLAN_PHASE1_UIUX.md",
    "product.md",
    "progress_monitor_implementation.md",
    "project_name_generator_implementation.md",
    "prompt_parser_implementation.md",
    "python_cli_research.md",
    "quality_validation_developer_guide.md",
    "quality_validation_user_guide.md",
    "quality_validator_implementation.md",
    "QUICK_REFERENCE_BUILD.md",
    "README_ANALYSE_DOCS_V3.md",
    "README_CORRECTIONS.md",
    "README_SEQUENCE_REFRESH_FIX.md",
    "README_STORYCORE_COMPLETE.md",
    "README_TESTING.md",
    "REFACTORING_CHANGELOG.md",
    "RESUME_INSIGHTS_AMELIORATIONS.md",
    "roadmap-configuration.md",
    "schema-version-handling.md",
    "SCRIPTS_INSTALLATION_MISE_A_JOUR.md",
    "secret-services-menu.md",
    "SEQUENCE_PLANNING_STUDIO_PLAN.md",
    "SOLUTION_ACTUALISER_SEQUENCES.md",
    "steering.md",
    "STRUCTURE_PROJET_STORYCORE.md",
    "TASK_8_CLI_IMPLEMENTATION_COMPLETE.md",
    "TASK_8_STORY_FILE_IO_IMPLEMENTATION.md",
    "TASK_9_BUILD_LOGGER_COMPLETION.md",
    "TASK_9_CHECKPOINT_COMPLETE.md",
    "TASK_10_INTEGRATION_TESTS_COMPLETE.md",
    "TASK_17_VERIFICATION.md",
    "TASK_20_VERIFICATION.md",
    "TASK_21.1_COMPLETION.md",
    "TASK_21.2_COMPLETION.md",
    "TASK_LLM_INTEGRATION.md",
    "tech.md",
    "TEST_SEQUENCE_REFRESH.md",
    "test_task_20_integration.md",
    "TESTS_INTEGRATION.md",
    "TYPESCRIPT_FIXES_COMPLETE.md",
    "TYPESCRIPT_FIXES_TODO.md",
    "UI_FIXES_PLAN.md",
    "UI_IMPROVEMENTS.md",
    "UI_URGENT_FIXES_TODO.md",
    "ui-improvement-roadmap.md",
    "USER_GUIDE_PUPPET_PIPELINE.md",
    "VIDEO_EDITOR_NEXT_STEPS.md",
    "VIDEO_EDITOR_PROJECT_SUMMARY.md",
    "VIDEO_EDITOR_WIZARD_PLAN.md"
)

# Fichiers temporaires a supprimer
$Temp_Files = @(
    "test-baseline-results.txt",
    "test-baseline.txt",
    "test-i18n-fix.bat",
    "test-i18n-fix.sh",
    "test-output.txt",
    "test-results.json",
    "test-translations.js",
    "APPLICATION_DEMARREE_SUCCES.txt",
    "AUDIT_FINAL_OLLAMA.txt",
    "AUDIT_LLM_RESUME_VISUEL.txt",
    "DIAGNOSTIC_WIZARD_RAPIDE.txt",
    "FIX_WIZARD_MAINTENANT.txt",
    "FIX_WIZARDS_RESUME.txt",
    "LTX2 le PROMPT parfait pour Image Sound Video resultats bien plus coherents.txt",
    "PROMPT TEST - Bande-annonce .txt",
    "PROMPT TEST - Trailer.txt",
    "QWEN3_VL_RESUME_VISUEL.txt",
    "SOLUTION_CHATBOX_OFFLINE_VISUEL.txt",
    "SOLUTION_IMMEDIATE_WIZARDS.txt",
    "SOLUTION_QWEN_8B_VS_4B.txt",
    "TEST_ENVIRONMENT_ISSUE.txt",
    "TEST_FILE_PICKER.txt",
    "TEST_GUIDE.txt",
    "TEST_I18N_FIX.txt",
    "TEST_LANGUAGE_FIX.txt",
    "TEST_PROMPT_LIBRARY.txt",
    "TEST_ECRAN_NOIR.txt",
    "TEST_CORRECTIONS_VISUELLES.txt",
    "VERIFICATION_COMPLETE_OLLAMA.txt",
    "VERIFICATION_TOUS_MODELES.txt",
    "VUE_ENSEMBLE_CORRECTION.txt",
    "WIZARD_LLM_CONFIG_GUIDE_VISUEL.txt"
)

# Fonction pour deplacer un fichier
function Move-FileToArchive {
    param(
        [string]$SourcePath,
        [string]$DestinationPath,
        [string]$Category
    )

    if (-not (Test-Path $SourcePath)) {
        if ($Verbose) {
            Write-Warning "Fichier non trouve: $SourcePath"
        }
        return $false
    }

    $DestinationDir = Split-Path -Parent $DestinationPath
    if (-not (Test-Path $DestinationDir)) {
        New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
    }

    $FileInfo = Get-Item $SourcePath
    $RelativePath = $SourcePath.Replace($ProjectRoot, "").TrimStart("\", "/")

    if ($DryRun) {
        Write-Host "[DRY-RUN] Deplacer: $RelativePath" -ForegroundColor Cyan
        Write-Host "       Vers: $DestinationPath" -ForegroundColor DarkGray
    } else {
        Move-Item -Path $SourcePath -Destination $DestinationPath -Force
        Write-Host "[OK] Deplace: $RelativePath" -ForegroundColor Green
    }

    return $true
}

# Fonction pour supprimer un fichier temporaire
function Remove-TempFile {
    param(
        [string]$FilePath
    )

    if (-not (Test-Path $FilePath)) {
        return $false
    }

    $RelativePath = $FilePath.Replace($ProjectRoot, "").TrimStart("\", "/")

    if ($DryRun) {
        Write-Host "[DRY-RUN] Supprimer: $RelativePath" -ForegroundColor Yellow
    } else {
        Remove-Item -Path $FilePath -Force
        Write-Host "[DEL] Supprime: $RelativePath" -ForegroundColor Red
    }

    return $true
}

# En-tete
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Archivage Documentation StoryCore" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Mode: $(if ($DryRun) { 'SIMULATION (DryRun)' } else { 'EXECUTION' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Green' })
Write-Host "Date: $Timestamp" -ForegroundColor Gray
Write-Host ""

# Creation des dossiers d'archive
if (-not $DryRun) {
    if (-not (Test-Path $ArchiveRoot)) {
        New-Item -ItemType Directory -Path $ArchiveRoot -Force | Out-Null
    }
    if (-not (Test-Path $CreativeStudioArchive)) {
        New-Item -ItemType Directory -Path $CreativeStudioArchive -Force | Out-Null
    }
    if (-not (Test-Path $DocumentationArchive)) {
        New-Item -ItemType Directory -Path $DocumentationArchive -Force | Out-Null
    }
}

# Compteurs
$TotalArchived = 0
$TotalErrors = 0

# Traitement des fichiers TASK_*.md
Write-Host "--- Archivage fichiers TASK_*.md ---" -ForegroundColor Cyan
foreach ($File in $TASK_Files) {
    $Source = Join-Path $CreativeStudioDocs $File
    $Dest = Join-Path $CreativeStudioArchive $File
    if (Move-FileToArchive -SourcePath $Source -DestinationPath $Dest -Category "TASK") {
        $TotalArchived++
    } else {
        $TotalErrors++
    }
}

# Traitement des fichiers FIX_*.md et CORRECTION_*.md
Write-Host ""
Write-Host "--- Archivage fichiers FIX_*.md et CORRECTION_*.md ---" -ForegroundColor Cyan
foreach ($File in $FIX_Files) {
    $Source = Join-Path $CreativeStudioDocs $File
    $Dest = Join-Path $CreativeStudioArchive $File
    if (Move-FileToArchive -SourcePath $Source -DestinationPath $Dest -Category "FIX") {
        $TotalArchived++
    } else {
        $TotalErrors++
    }
}

# Traitement des fichiers SUMMARY/RAPPORT
Write-Host ""
Write-Host "--- Archivage fichiers SUMMARY/RAPPORT ---" -ForegroundColor Cyan
foreach ($File in $Summary_Files) {
    $Source = Join-Path $CreativeStudioDocs $File
    $Dest = Join-Path $CreativeStudioArchive $File
    if (Move-FileToArchive -SourcePath $Source -DestinationPath $Dest -Category "SUMMARY") {
        $TotalArchived++
    } else {
        $TotalErrors++
    }
}

# Traitement des fichiers documentation
Write-Host ""
Write-Host "--- Archivage fichiers documentation/*.md ---" -ForegroundColor Cyan
foreach ($File in $Doc_Files) {
    $Source = Join-Path $DocumentationFolder $File
    $Dest = Join-Path $DocumentationArchive $File
    if (Move-FileToArchive -SourcePath $Source -DestinationPath $Dest -Category "DOC") {
        $TotalArchived++
    } else {
        $TotalErrors++
    }
}

# Suppression des fichiers temporaires
Write-Host ""
Write-Host "--- Suppression fichiers temporaires ---" -ForegroundColor Yellow
foreach ($File in $Temp_Files) {
    $Source = Join-Path $CreativeStudioDocs $File
    if (Remove-TempFile -FilePath $Source) {
        $TotalArchived++
    }
}

# Resume
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Resume de l'archivage" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Fichiers traites: $TotalArchived" -ForegroundColor $(if ($TotalArchived -gt 0) { 'Green' } else { 'Gray' })
Write-Host "Erreurs: $TotalErrors" -ForegroundColor $(if ($TotalErrors -gt 0) { 'Red' } else { 'Green' })
Write-Host ""
Write-Host "Repartition:" -ForegroundColor Gray
Write-Host "  - TASK_*.md: $($TASK_Files.Count) fichiers" -ForegroundColor Gray
Write-Host "  - FIX_*.md/CORRECTION_*.md: $($FIX_Files.Count) fichiers" -ForegroundColor Gray
Write-Host "  - SUMMARY/RAPPORT: $($Summary_Files.Count) fichiers" -ForegroundColor Gray
Write-Host "  - documentation/*.md: $($Doc_Files.Count) fichiers" -ForegroundColor Gray
Write-Host "  - Fichiers temporaires: $($Temp_Files.Count) fichiers" -ForegroundColor Gray
Write-Host ""
Write-Host "Total fichiers a archiver: $($TASK_Files.Count + $FIX_Files.Count + $Summary_Files.Count + $Doc_Files.Count + $Temp_Files.Count)" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "Pour executer l'archivage reel, lancez:" -ForegroundColor Yellow
    Write-Host "  .\scripts\archive_documentation.ps1" -ForegroundColor White
} else {
    Write-Host "Archives creees dans:" -ForegroundColor Green
    Write-Host "  - $CreativeStudioArchive" -ForegroundColor Gray
    Write-Host "  - $DocumentationArchive" -ForegroundColor Gray
}
