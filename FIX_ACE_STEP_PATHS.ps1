# PowerShell Script - Correction des chemins ACE-Step ComfyUI
# Exécuter en tant qu'administrateur

$ComfyUIBase = "C:\Users\redga\Documents\ComfyUI"
$ACEModelPath = "$ComfyUIBase\models\TTS\ACE-Step-v1-3.5B"
$ACELoraPath = "$ACEModelPath\loras"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Correction des chemins ACE-Step ComfyUI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Créer le répertoire du modèle ACE-Step
if (-not (Test-Path $ACEModelPath)) {
    Write-Host "Création: $ACEModelPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $ACEModelPath | Out-Null
} else {
    Write-Host "Déjà existant: $ACEModelPath" -ForegroundColor Green
}

# Créer le sous-répertoire loras
if (-not (Test-Path $ACELoraPath)) {
    Write-Host "Création: $ACELoraPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $ACELoraPath | Out-Null
} else {
    Write-Host "Déjà existant: $ACELoraPath" -ForegroundColor Green
}

# Créer des fichiers placeholder
$PlaceholderContent = "# Répertoire ACE-Step - Placeholder
# Téléchargez les modèles depuis: https://huggingface.co/ali-vilab/ACE-Step-v1-3.5B
"
Set-Content -Path "$ACEModelPath\PLACEHOLDER.txt" -Value $PlaceholderContent -ErrorAction SilentlyContinue
Set-Content -Path "$ACELoraPath\PLACEHOLDER.txt" -Value $PlaceholderContent -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Répertoires créés avec succès!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "OPTIONS POUR RÉSOUDRE COMPLÈTEMENT:" -ForegroundColor White
Write-Host ""
Write-Host "Option 1: Télécharger les modèles ACE-Step" -ForegroundColor Yellow
Write-Host "  - URL: https://huggingface.co/ali-vilab/ACE-Step-v1-3.5B" -ForegroundColor Gray
Write-Host "  - Placez les fichiers dans: $ACEModelPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Désactiver le custom node ACE-Step" -ForegroundColor Yellow
Write-Host "  - Ouvrir ComfyUI" -ForegroundColor Gray
Write-Host "  - Settings > Node Library" -ForegroundColor Gray
Write-Host "  - Désactiver: ACE-Step custom nodes" -ForegroundColor Gray
Write-Host "  - Redémarrer ComfyUI" -ForegroundColor Gray
Write-Host ""

# Ouvrir l'URL HuggingFace
$open = Read-Host "Voulez-vous ouvrir la page de téléchargement? (O/N)"
if ($open -match '^[Oo]$') {
    Start-Process "https://huggingface.co/ali-vilab/ACE-Step-v1-3.5B"
}

Write-Host ""
Pause

