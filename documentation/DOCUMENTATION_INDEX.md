# StoryCore Engine - Documentation Index

## Documentation Principale

| Fichier | Description | Dernière mise à jour | Statut |
|---------|-------------|---------------------|--------|
| [`README.md`](README.md) | Page d'accueil du projet | 2026-02-12 | ✅ Actif |
| [`ROADMAP.md`](ROADMAP.md) | Feuille de route | 2026-02-12 | ✅ Actif |
| [`SECURITY.md`](SECURITY.md) | Guide de sécurité | 2026-02-12 | ✅ Actif |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Guide de contribution | 2026-02-12 | ✅ Actif |
| [`TECHNICAL_AUDIT_REPORT_2026_02_12.md`](TECHNICAL_AUDIT_REPORT_2026_02_12.md) | Audit technique complet | 2026-02-12 | ✅ Actif |

---

## Documentation Backend

| Fichier | Description | Statut |
|---------|-------------|--------|
| [`backend/README.md`](backend/README.md) | API Backend principale | ✅ Actif |
| [`backend/config.py`](backend/config.py) | Configuration Pydantic | ✅ Actif |
| [`documentation/API_REFERENCE.md`](documentation/API_REFERENCE.md) | Référence API complète | ⚠️ À vérifier |
| [`documentation/backend_specification.md`](documentation/backend_specification.md) | Spécification backend | ✅ Actif |

## Documentation Frontend (Creative Studio UI)

| Fichier | Description | Statut |
|---------|-------------|--------|
| [`creative-studio-ui/README.md`](creative-studio-ui/README.md) | Frontend Creative Studio | ✅ Actif |
| [`creative-studio-ui/STATE_MANAGEMENT_ARCHITECTURE.md`](creative-studio-ui/STATE_MANAGEMENT_ARCHITECTURE.md) | Architecture Redux | ✅ Actif |
| [`creative-studio-ui/CENTRAL_CONFIG_UI_COMPLETE.md`](creative-studio-ui/CENTRAL_CONFIG_UI_COMPLETE.md) | Configuration UI centralisée | ✅ Actif |

---

## Structure Documentaire Actuelle

```
storycore-engine/
├── README.md                    # Page d'accueil
├── ROADMAP.md                   # Feuille de route
├── SECURITY.md                  # Sécurité
├── CONTRIBUTING.md             # Contribution
├── TECHNICAL_AUDIT_REPORT_2026_02_12.md  # Audit complet
│
├── backend/                    # Backend Python/FastAPI
│   ├── README.md
│   ├── config.py              # Configuration centralisée
│   ├── main_api.py            # API principale
│   └── *.py                   # Services backend
│
├── creative-studio-ui/        # Frontend Electron/React
│   ├── README.md
│   ├── src/
│   └── *.md                   # ~200 fichiers docs
│
└── documentation/             # Documentation diverse
    ├── API_REFERENCE.md
    ├── ROADMAP.md
    ├── TROUBLESHOOTING.md
    ├── *.md                   # ~150 fichiers docs
    └── [dossiers]/
```

---

## Fichiers de Documentation (Creative Studio UI)

### Fichiers de Tâches (TASK_*.md)

| Fichier | Tâche | Statut |
|---------|-------|--------|
| [`TASK_1_COMPLETION_SUMMARY.md`](creative-studio-ui/TASK_1_COMPLETION_SUMMARY.md) | Task 1 | 📦 À archiver |
| [`TASK_4_RECENT_PROJECTS_SERVICE_COMPLETE.md`](creative-studio-ui/TASK_4_RECENT_PROJECTS_SERVICE_COMPLETE.md) | Task 4 | 📦 À archiver |
| [`TASK_5_MENU_CONFIG_SYSTEM_COMPLETE.md`](creative-studio-ui/TASK_5_MENU_CONFIG_SYSTEM_COMPLETE.md) | Task 5 | 📦 À archiver |
| [`TASK_7_COMPLETION_SUMMARY.md`](creative-studio-ui/TASK_7_COMPLETION_SUMMARY.md) | Task 7 | 📦 À archiver |
| [`TASK_7_MODAL_MANAGEMENT_COMPLETE.md`](creative-studio-ui/TASK_7_MODAL_MANAGEMENT_COMPLETE.md) | Task 7 | 📦 À archiver |
| [`TASK_8_COMPLETION_SUMMARY.md`](creative-studio-ui/TASK_8_COMPLETION_SUMMARY.md) | Task 8 | 📦 À archiver |
| [`TASK_8.1_COMPLETION_SUMMARY.md`](creative-studio-ui/TASK_8.1_COMPLETION_SUMMARY.md) | Task 8.1 | 📦 À archiver |
| [`TASK_8.1_NOTIFICATION_SERVICE_COMPLETE.md`](creative-studio-ui/TASK_8.1_NOTIFICATION_SERVICE_COMPLETE.md) | Task 8.1 | 📦 À archiver |
| [`TASK_9_COMPLETION_SUMMARY.md`](creative-studio-ui/TASK_9_COMPLETION_SUMMARY.md) | Task 9 | 📦 À archiver |
| [`TASK_9_CORE_MENU_COMPONENTS_COMPLETE.md`](creative-studio-ui/TASK_9_CORE_MENU_COMPONENTS_COMPLETE.md) | Task 9 | 📦 À archiver |
| [`TASK_10_COMPLETION_SUMMARY.md`](creative-studio-ui/TASK_10_COMPLETION_SUMMARY.md) | Task 10 | 📦 À archiver |
| [`TASK_10_DIALOGUE_PHRASE_EDITOR_COMPLETE.md`](creative-studio-ui/TASK_10_DIALOGUE_PHRASE_EDITOR_COMPLETE.md) | Task 10 | 📦 À archiver |
| [`TASK_10_MENUBAR_ROOT_COMPONENT_COMPLETE.md`](creative-studio-ui/TASK_10_MENUBAR_ROOT_COMPONENT_COMPLETE.md) | Task 10 | 📦 À archiver |
| [`TASK_10_STATE_INTEGRATION_COMPLETE.md`](creative-studio-ui/TASK_10_STATE_INTEGRATION_COMPLETE.md) | Task 10 | 📦 À archiver |
| [`TASK_11_CHECKPOINT_COMPLETE.md`](creative-studio-ui/TASK_11_CHECKPOINT_COMPLETE.md) | Task 11 | 📦 À archiver |
| [`TASK_11_ERROR_HANDLING_COMPLETE.md`](creative-studio-ui/TASK_11_ERROR_HANDLING_COMPLETE.md) | Task 11 | 📦 À archiver |
| [`TASK_12_FALLBACK_MODE_COMPLETE.md`](creative-studio-ui/TASK_12_FALLBACK_MODE_COMPLETE.md) | Task 12 | 📦 À archiver |
| [`TASK_12_UI_POLISH_COMPLETE.md`](creative-studio-ui/TASK_12_UI_POLISH_COMPLETE.md) | Task 12 | 📦 À archiver |
| [`TASK_12_VOICE_GENERATION_PANEL_COMPLETE.md`](creative-studio-ui/TASK_12_VOICE_GENERATION_PANEL_COMPLETE.md) | Task 12 | 📦 À archiver |
| [`TASK_12.1_SUMMARY.md`](creative-studio-ui/TASK_12.1_SUMMARY.md) | Task 12.1 | 📦 À archiver |
| [`TASK_12.4_SUMMARY.md`](creative-studio-ui/TASK_12.4_SUMMARY.md) | Task 12.4 | 📦 À archiver |
| [`TASK_13_AUDIO_TRACK_MANAGER_COMPLETE.md`](creative-studio-ui/TASK_13_AUDIO_TRACK_MANAGER_COMPLETE.md) | Task 13 | 📦 À archiver |
| [`TASK_13_FINAL_CHECKPOINT_COMPLETE.md`](creative-studio-ui/TASK_13_FINAL_CHECKPOINT_COMPLETE.md) | Task 13 | 📦 À archiver |
| [`TASK_13.1_SUMMARY.md`](creative-studio-ui/TASK_13.1_SUMMARY.md) | Task 13.1 | 📦 À archiver |
| [`TASK_14_BATCH_GENERATION_COMPLETE.md`](creative-studio-ui/TASK_14_BATCH_GENERATION_COMPLETE.md) | Task 14 | 📦 À archiver |
| [`TASK_14_PERSISTENCE_ENHANCEMENTS_COMPLETE.md`](creative-studio-ui/TASK_14_PERSISTENCE_ENHANCEMENTS_COMPLETE.md) | Task 14 | 📦 À archiver |
| [`TASK_14_SEQUENCE_GENERATION_COMPLETE.md`](creative-studio-ui/TASK_14_SEQUENCE_GENERATION_COMPLETE.md) | Task 14 | 📦 À archiver |
| [`TASK_14.1_SUMMARY.md`](creative-studio-ui/TASK_14.1_SUMMARY.md) | Task 14.1 | 📦 À archiver |
| [`TASK_15_1_GENERATION_PROGRESS_MODAL_COMPLETE.md`](creative-studio-ui/TASK_15_1_GENERATION_PROGRESS_MODAL_COMPLETE.md) | Task 15 | 📦 À archiver |
| [`TASK_15_GENERATION_PROGRESS_MODAL_SUMMARY.md`](creative-studio-ui/TASK_15_GENERATION_PROGRESS_MODAL_SUMMARY.md) | Task 15 | 📦 À archiver |
| [`TASK_15_IMPLEMENTATION_SUMMARY.md`](creative-studio-ui/TASK_15_IMPLEMENTATION_SUMMARY.md) | Task 15 | 📦 À archiver |
| [`TASK_15_PIPELINE_WORKFLOW_COMPLETE.md`](creative-studio-ui/TASK_15_PIPELINE_WORKFLOW_COMPLETE.md) | Task 15 | 📦 À archiver |
| [`TASK_15_VERIFICATION_SUMMARY.md`](creative-studio-ui/TASK_15_VERIFICATION_SUMMARY.md) | Task 15 | 📦 À archiver |
| [`TASK_15.1_SUMMARY.md`](creative-studio-ui/TASK_15.1_SUMMARY.md) | Task 15.1 | 📦 À archiver |
| [`TASK_16_1_SEQUENCE_GENERATION_CONTROL_COMPLETE.md`](creative-studio-ui/TASK_16_1_SEQUENCE_GENERATION_CONTROL_COMPLETE.md) | Task 16 | 📦 À archiver |
| [`TASK_16_ASSET_PREVIEW_PANEL_COMPLETE.md`](creative-studio-ui/TASK_16_ASSET_PREVIEW_PANEL_COMPLETE.md) | Task 16 | 📦 À archiver |
| [`TASK_16_ERROR_HANDLING_COMPLETE.md`](creative-studio-ui/TASK_16_ERROR_HANDLING_COMPLETE.md) | Task 16 | 📦 À archiver |
| [`TASK_16_MIGRATION_IMPLEMENTATION.md`](creative-studio-ui/TASK_16_MIGRATION_IMPLEMENTATION.md) | Task 16 | 📦 À archiver |
| [`TASK_16_SEQUENCE_GENERATION_CONTROL_SUMMARY.md`](creative-studio-ui/TASK_16_SEQUENCE_GENERATION_CONTROL_SUMMARY.md) | Task 16 | 📦 À archiver |
| [`TASK_16.1_SUMMARY.md`](creative-studio-ui/TASK_16.1_SUMMARY.md) | Task 16.1 | 📦 À archiver |
| [`TASK_16.2_SUMMARY.md`](creative-studio-ui/TASK_16.2_SUMMARY.md) | Task 16.2 | 📦 À archiver |
| [`TASK_17_CHECKPOINT_GENERATION_TESTS_COMPLETE.md`](creative-studio-ui/TASK_17_CHECKPOINT_GENERATION_TESTS_COMPLETE.md) | Task 17 | 📦 À archiver |
| [`TASK_17_HISTORY_PANEL_COMPLETE.md`](creative-studio-ui/TASK_17_HISTORY_PANEL_COMPLETE.md) | Task 17 | 📦 À archiver |
| [`TASK_17.1_SUMMARY.md`](creative-studio-ui/TASK_17.1_SUMMARY.md) | Task 17.1 | 📦 À archiver |
| [`TASK_18_CHECKPOINT_SUMMARY.md`](creative-studio-ui/TASK_18_CHECKPOINT_SUMMARY.md) | Task 18 | 📦 À archiver |
| [`TASK_18_DATA_PERSISTENCE_COMPLETE.md`](creative-studio-ui/TASK_18_DATA_PERSISTENCE_COMPLETE.md) | Task 18 | 📦 À archiver |
| [`TASK_19_1_SHOT_DELETION_COMPLETE.md`](creative-studio-ui/TASK_19_1_SHOT_DELETION_COMPLETE.md) | Task 19 | 📦 À archiver |
| [`TASK_19_ACCESSIBILITY_IMPLEMENTATION.md`](creative-studio-ui/TASK_19_ACCESSIBILITY_IMPLEMENTATION.md) | Task 19 | 📦 À archiver |
| [`TASK_19.1_SUMMARY.md`](creative-studio-ui/TASK_19.1_SUMMARY.md) | Task 19.1 | 📦 À archiver |
| [`TASK_19.2_SUMMARY.md`](creative-studio-ui/TASK_19.2_SUMMARY.md) | Task 19.2 | 📦 À archiver |
| [`TASK_20_1_BACKGROUND_GENERATION_COMPLETE.md`](creative-studio-ui/TASK_20_1_BACKGROUND_GENERATION_COMPLETE.md) | Task 20 | 📦 À archiver |
| [`TASK_20.1_SUMMARY.md`](creative-studio-ui/TASK_20.1_SUMMARY.md) | Task 20.1 | 📦 À archiver |
| [`TASK_20.2_SUMMARY.md`](creative-studio-ui/TASK_20.2_SUMMARY.md) | Task 20.2 | 📦 À archiver |
| [`TASK_21_1_DASHBOARD_ASSEMBLY_COMPLETE.md`](creative-studio-ui/TASK_21_1_DASHBOARD_ASSEMBLY_COMPLETE.md) | Task 21 | 📦 À archiver |
| [`TASK_21_INTEGRATION_COMPLETE.md`](creative-studio-ui/TASK_21_INTEGRATION_COMPLETE.md) | Task 21 | 📦 À archiver |
| [`TASK_22_ACCESSIBILITY_COMPLETE.md`](creative-studio-ui/TASK_22_ACCESSIBILITY_COMPLETE.md) | Task 22 | 📦 À archiver |
| [`TASK_22.1_SUMMARY.md`](creative-studio-ui/TASK_22.1_SUMMARY.md) | Task 22.1 | 📦 À archiver |
| [`TASK_22.2_SUMMARY.md`](creative-studio-ui/TASK_22.2_SUMMARY.md) | Task 22.2 | 📦 À archiver |

### Fichiers de Correctifs (FIX_*.md, CORRECTION_*.md)

| Fichier | Description | Action |
|---------|-------------|--------|
| [`BUG_FIX_CHARACTER_CREATION.md`](creative-studio-ui/BUG_FIX_CHARACTER_CREATION.md) | Correction création personnages | 📦 Archiver |
| [`BUG_FIX_SEQUENCE_LOADING.md`](creative-studio-ui/BUG_FIX_SEQUENCE_LOADING.md) | Correction chargement séquences | 📦 Archiver |
| [`CHARACTER_CREATION_MENU_FIX.md`](creative-studio-ui/CHARACTER_CREATION_MENU_FIX.md) | Correction menu personnages | 📦 Archiver |
| [`CHARACTER_PERSISTENCE_FIX.md`](creative-studio-ui/CHARACTER_PERSISTENCE_FIX.md) | Correction persistance personnages | 📦 Archiver |
| [`COMFYUI_CONNECTION_FIX.md`](creative-studio-ui/COMFYUI_CONNECTION_FIX.md) | Correction connexion ComfyUI | 📦 Archiver |
| [`COMFYUI_CONNECTION_FIX_COMPLETE.md`](creative-studio-ui/COMFYUI_CONNECTION_FIX_COMPLETE.md) | Correction connexion ComfyUI (complet) | 📦 Archiver |
| [`COMFYUI_ERROR_FIXED.md`](creative-studio-ui/COMFYUI_ERROR_FIXED.md) | Erreur ComfyUI corrigée | 📦 Archiver |
| [`CORRECTION_DOUBLONS_INTERFACE.md`](creative-studio-ui/CORRECTION_DOUBLONS_INTERFACE.md) | Correction doublons interface | 📦 Archiver |
| [`CORRECTION_DOUBLONS_PERSONNAGES.md`](creative-studio-ui/CORRECTION_DOUBLONS_PERSONNAGES.md) | Correction doublons personnages | 📦 Archiver |
| [`CORRECTION_ERREURS_CRITIQUES.md`](creative-studio-ui/CORRECTION_ERREURS_CRITIQUES.md) | Corrections erreurs critiques | 📦 Archiver |
| [`CORRECTION_MENU_FRANCAIS.md`](creative-studio-ui/CORRECTION_MENU_FRANCAIS.md) | Correction menu français | 📦 Archiver |
| [`CORRECTION_PERSISTANCE_PORTRAITS.md`](creative-studio-ui/CORRECTION_PERSISTANCE_PORTRAITS.md) | Correction persistance portraits | 📦 Archiver |
| [`CORRECTION_PERSISTANCE_PORTRAITS_COMPLETE.md`](creative-studio-ui/CORRECTION_PERSISTANCE_PORTRAITS_COMPLETE.md) | Correction portraits (complet) | 📦 Archiver |
| [`CORRECTION_TEXTES_EMMELES.md`](creative-studio-ui/CORRECTION_TEXTES_EMMELES.md) | Correction textes emmêlés | 📦 Archiver |
| [`CORRECTION_TODO.md`](creative-studio-ui/CORRECTION_TODO.md) | Correction TODO | 📦 Archiver |
| [`CORRECTIONS_3_PROBLEMES.md`](creative-studio-ui/CORRECTIONS_3_PROBLEMES.md) | Corrections 3 problèmes | 📦 Archiver |
| [`CORRECTIONS_APPLIQUEES.md`](creative-studio-ui/CORRECTIONS_APPLIQUEES.md) | Corrections appliquées | 📦 Archiver |
| [`CORRECTIONS_PORTRAIT_GENERATION.md`](creative-studio-ui/CORRECTIONS_PORTRAIT_GENERATION.md) | Corrections génération portraits | 📦 Archiver |
| [`CRITICAL_FIXES_APPLIED.md`](creative-studio-ui/CRITICAL_FIXES_APPLIED.md) | Correctifs critiques appliqués | 📦 Archiver |
| [`CRITICAL_FIXES_NEEDED.md`](creative-studio-ui/CRITICAL_FIXES_NEEDED.md) | Correctifs critiques nécessaires | 📦 Archiver |
| [`CSP_AND_WIZARDS_FIX.md`](creative-studio-ui/CSP_AND_WIZARDS_FIX.md) | Correction CSP et wizards | 📦 Archiver |
| [`CSP_COMFYUI_IMAGES_FIXED.md`](creative-studio-ui/CSP_COMFYUI_IMAGES_FIXED.md) | Correction images ComfyUI CSP | 📦 Archiver |
| [`FIX_ALL_IMPORTS.md`](creative-studio-ui/FIX_ALL_IMPORTS.md) | Correction de tous les imports | 📦 Archiver |
| [`FIX_CLONING_ERROR.md`](creative-studio-ui/FIX_CLONING_ERROR.md) | Correction erreur clonage | 📦 Archiver |
| [`FIX_DIAGNOSTIC_ERRORS.md`](creative-studio-ui/FIX_DIAGNOSTIC_ERRORS.md) | Correction erreurs diagnostiques | 📦 Archiver |
| [`FIX_ECRAN_NOIR.md`](creative-studio-ui/FIX_ECRAN_NOIR.md) | Correction écran noir | 📦 Archiver |
| [`FIX_FILE_SYSTEM_API_ERROR.md`](creative-studio-ui/FIX_FILE_SYSTEM_API_ERROR.md) | Correction API système fichiers | 📦 Archiver |
| [`FIX_SEQUENCE_REFRESH_WEB_SUPPORT.md`](creative-studio-ui/FIX_SEQUENCE_REFRESH_WEB_SUPPORT.md) | Correction support web séquences | 📦 Archiver |
| [`FIXES_APPLIED_SESSION.md`](creative-studio-ui/FIXES_APPLIED_SESSION.md) | Correctifs session appliqués | 📦 Archiver |
| [`INFINITE_LOOP_FIX.md`](creative-studio-ui/INFINITE_LOOP_FIX.md) | Correction boucle infinie | 📦 Archiver |
| [`LLM_API_KEY_FIX.md`](creative-studio-ui/LLM_API_KEY_FIX.md) | Correction clé API LLM | 📦 Archiver |
| [`LLM_SETTINGS_DECRYPTION_FIX.md`](creative-studio-ui/LLM_SETTINGS_DECRYPTION_FIX.md) | Correction décryptage settings LLM | 📦 Archiver |
| [`LANGUAGE_FIX_SUMMARY.md`](creative-studio-ui/LANGUAGE_FIX_SUMMARY.md) | Résumé correction langue | 📦 Archiver |
| [`MODEL_DOWNLOAD_FIX.md`](creative-studio-ui/MODEL_DOWNLOAD_FIX.md) | Correction téléchargement modèle | 📦 Archiver |
| [`MODEL_NAMES_CORRECTION.md`](creative-studio-ui/MODEL_NAMES_CORRECTION.md) | Correction noms modèles | 📦 Archiver |
| [`READE_MENU_FIXES.md`](creative-studio-ui/README_MENU_FIXES.md) | Corrections menu README | 📦 Archiver |
| [`REDUX_SERIALIZATION_FIX.md`](creative-studio-ui/REDUX_SERIALIZATION_FIX.md) | Correction sérialisation Redux | 📦 Archiver |
| [`SHOT_WIZARD_SCROLL_FIX.md`](creative-studio-ui/SHOT_WIZARD_SCROLL_FIX.md) | Correction défilement wizard shot | 📦 Archiver |
| [`SHOT_WIZARD_TYPE_SELECTOR_FIX.md`](creative-studio-ui/SHOT_WIZARD_TYPE_SELECTOR_FIX.md) | Correction sélecteur type wizard | 📦 Archiver |

### Fichiers de Résumé (SUMMARY, COMPLETION, etc.)

| Fichier | Description | Action |
|---------|-------------|--------|
| [`CHECKPOINT_6_CORE_SERVICES_TESTS.md`](creative-studio-ui/CHECKPOINT_6_CORE_SERVICES_TESTS.md) | Tests services core | 📦 Archiver |
| [`CHANGES_APPLIED.md`](creative-studio-ui/CHANGES_APPLIED.md) | Changements appliqués | 📦 Archiver |
| [`CHANGELOG_CHARACTER_PORTRAITS.md`](creative-studio-ui/CHANGELOG_CHARACTER_PORTRAITS.md) | Changelog portraits | ⚠️ Conserver recent |
| [`CHANGELOG_FILE_PICKER.md`](creative-studio-ui/CHANGELOG_FILE_PICKER.md) | Changelog sélecteur fichiers | ⚠️ Conserver recent |
| [`COMPLETION_REPORT.md`](creative-studio-ui/COMPLETION_REPORT.md) | Rapport complétion | 📦 Archiver |
| [`COMPLETION_STATUS.md`](creative-studio-ui/COMPLETION_STATUS.md) | Statut complétion | 📦 Archiver |
| [`ELECTRON_BLACK_SCREEN_DIAGNOSTIC.md`](creative-studio-ui/ELECTRON_BLACK_SCREEN_DIAGNOSTIC.md) | Diagnostic écran noir | 📦 Archiver |
| [`ELECTRON_ECRAN_NOIR_FIX.md`](creative-studio-ui/ELECTRON_ECRAN_NOIR_FIX.md) | Correction écran noir Electron | 📦 Archiver |
| [`ELECTRON_ECRAN_NOIR_RESOLU.md`](creative-studio-ui/ELECTRON_ECRAN_NOIR_RESOLU.md) | Écran noir résolu | 📦 Archiver |
| [`ERROR_HANDLING_IMPLEMENTATION.md`](creative-studio-ui/ERROR_HANDLING_IMPLEMENTATION.md) | Implémentation gestion erreurs | 📦 Archiver |
| [`EXPERIMENTAL_FEATURES_IMPLEMENTATION.md`](creative-studio-ui/EXPERIMENTAL_FEATURES_IMPLEMENTATION.md) | Fonctionnalités expérimentales | 📦 Archiver |
| [`EXPERIMENTAL_FEATURES_TEST.md`](creative-studio-ui/EXPERIMENTAL_FEATURES_TEST.md) | Test fonctionnalités expérimentales | 📦 Archiver |
| [`FEATURE_CHARACTER_PORTRAIT_SUMMARY.md`](creative-studio-ui/FEATURE_CHARACTER_PORTRAIT_SUMMARY.md) | Résumé feature portraits | 📦 Archiver |
| [`FILE_PICKER_DOCS_INDEX.md`](creative-studio-ui/FILE_PICKER_DOCS_INDEX.md) | Index documentation sélecteur | ⚠️ Conserver recent |
| [`FILE_PICKER_FIX_SUMMARY.md`](creative-studio-ui/FILE_PICKER_FIX_SUMMARY.md) | Résumé correction sélecteur | ⚠️ Conserver recent |
| [`FILE_PICKER_README.md`](creative-studio-ui/FILE_PICKER_README.md) | README sélecteur fichiers | ⚠️ Conserver recent |
| [`FILE_PICKER_VISUAL_GUIDE.md`](creative-studio-ui/FILE_PICKER_VISUAL_GUIDE.md) | Guide visuel sélecteur | ⚠️ Conserver recent |
| [`FINAL_FIX_SUMMARY.md`](creative-studio-ui/FINAL_FIX_SUMMARY.md) | Résumé corrections finales | 📦 Archiver |
| [`FINAL_IMPORT_FIX_SUMMARY.md`](creative-studio-ui/FINAL_IMPORT_FIX_SUMMARY.md) | Résumé corrections imports | 📦 Archiver |
| [`FINAL_MENU_VERIFICATION_REPORT.md`](creative-studio-ui/FINAL_MENU_VERIFICATION_REPORT.md) | Rapport vérification menu | 📦 Archiver |
| [`FINAL_REPORT.md`](creative-studio-ui/FINAL_REPORT.md) | Rapport final | 📦 Archiver |
| [`GRID_EDITOR_TEST_FIXES_REPORT.md`](creative-studio-ui/GRID_EDITOR_TEST_FIXES_REPORT.md) | Rapport tests éditeur grille | 📦 Archiver |
| [`GRID_EDITOR_VERIFICATION_REPORT.md`](creative-studio-ui/GRID_EDITOR_VERIFICATION_REPORT.md) | Rapport vérification éditeur grille | 📦 Archiver |
| [`GRID_EDITOR_ZOOM_FIX.md`](creative-studio-ui/GRID_EDITOR_ZOOM_FIX.md) | Correction zoom éditeur grille | 📦 Archiver |
| [`IMPLEMENTATION_COMPLETE.md`](creative-studio-ui/IMPLEMENTATION_COMPLETE.md) | Implémentation complète | 📦 Archiver |
| [`IMPLEMENTATION_SUMMARY.md`](creative-studio-ui/IMPLEMENTATION_SUMMARY.md) | Résumé implémentation | 📦 Archiver |
| [`IMPORT_ERRORS_RESOLUTION_COMPLETE.md`](creative-studio-ui/IMPORT_ERRORS_RESOLUTION_COMPLETE.md) | Résolution erreurs imports | 📦 Archiver |
| [`IMPORT_FIXES_SUMMARY.md`](creative-studio-ui/IMPORT_FIXES_SUMMARY.md) | Résumé corrections imports | 📦 Archiver |
| [`MENU_ANALYSIS_COMPLETE.txt`](creative-studio-ui/MENU_ANALYSIS_COMPLETE.txt) | Analyse menu (txt) | 📦 Archiver |
| [`MENU_CHARACTER_STORY_WIZARD_FIX.md`](creative-studio-ui/MENU_CHARACTER_STORY_WIZARD_FIX.md) | Correction wizard personnages | 📦 Archiver |
| [`MENU_DUPLICATES_ANALYSIS.md`](creative-studio-ui/MENU_DUPLICATES_ANALYSIS.md) | Analyse doublons menu | 📦 Archiver |
| [`MENU_DUPLICATES_FIXED.md`](creative-studio-ui/MENU_DUPLICATES_FIXED.md) | Doublons menu corrigés | 📦 Archiver |
| [`MENU_FIXES_EXECUTIVE_SUMMARY.md`](creative-studio-ui/MENU_FIXES_EXECUTIVE_SUMMARY.md) | Résumé corrections menu | 📦 Archiver |
| [`MENU_FIXES_WIZARD_REPORT_ISSUE.md`](creative-studio-ui/MENU_FIXES_WIZARD_REPORT_ISSUE.md) | Issue rapport wizard menu | 📦 Archiver |
| [`MENU_SYSTEM_ANALYSIS_SUMMARY.md`](creative-studio-ui/MENU_SYSTEM_ANALYSIS_SUMMARY.md) | Résumé analyse système menu | 📦 Archiver |
| [`MENU_SYSTEM_CLEANUP_COMPLETE.md`](creative-studio-ui/MENU_SYSTEM_CLEANUP_COMPLETE.md) | Nettoyage système menu | 📦 Archiver |
| [`MENU_SYSTEM_COMPLETE_FIX_SUMMARY.md`](creative-studio-ui/MENU_SYSTEM_COMPLETE_FIX_SUMMARY.md) | Résumé corrections système menu | 📦 Archiver |
| [`MENU_SYSTEM_FINAL_REPORT.md`](creative-studio-ui/MENU_SYSTEM_FINAL_REPORT.md) | Rapport final système menu | 📦 Archiver |
| [`MENU_SYSTEM_FIXES_COMPLETE.md`](creative-studio-ui/MENU_SYSTEM_FIXES_COMPLETE.md) | Corrections système menu | 📦 Archiver |
| [`PERFORMANCE_OPTIMIZATION_COMPLETE.md`](creative-studio-ui/PERFORMANCE_OPTIMIZATION_COMPLETE.md) | Optimisation performance | 📦 Archiver |
| [`PERFORMANCE_OPTIMIZATIONS.md`](creative-studio-ui/PERFORMANCE_OPTIMIZATIONS.md) | Optimisations performance | 📦 Archiver |
| [`PORTRAITS_FEATURE_COMPLETE.md`](creative-studio-ui/PORTRAITS_FEATURE_COMPLETE.md) | Feature portraits complète | 📦 Archiver |
| [`PROJECT_SETUP_WIZARD_FIX.md`](creative-studio-ui/PROJECT_SETUP_WIZARD_FIX.md) | Correction wizard configuration | 📦 Archiver |
| [`PROJECT_SETUP_WIZARD_INTEGRATION_COMPLETE.md`](creative-studio-ui/PROJECT_SETUP_WIZARD_INTEGRATION_COMPLETE.md) | Intégration wizard configuration | 📦 Archiver |
| [`SESSION_2_CRITICAL_FIXES_COMPLETE.md`](creative-studio-ui/SESSION_2_CRITICAL_FIXES_COMPLETE.md) | Correctifs critiques session 2 | 📦 Archiver |
| [`STORYTELLER_WIZARD_DASHBOARD_INTEGRATION_COMPLETE.md`](creative-studio-ui/STORYTELLER_WIZARD_DASHBOARD_INTEGRATION_COMPLETE.md) | Intégration dashboard wizard | 📦 Archiver |
| [`STORYTELLER_WIZARD_FINAL_SUMMARY.md`](creative-studio-ui/STORYTELLER_WIZARD_FINAL_SUMMARY.md) | Résumé final wizard storyteller | 📦 Archiver |
| [`STORYTELLER_WIZARD_IMPLEMENTATION_COMPLETE.md`](creative-studio-ui/STORYTELLER_WIZARD_IMPLEMENTATION_COMPLETE.md) | Implémentation wizard complète | 📦 Archiver |
| [`STORYTELLER_WIZARD_UI_IMPLEMENTATION_COMPLETE.md`](creative-studio-ui/STORYTELLER_WIZARD_UI_IMPLEMENTATION_COMPLETE.md) | Implémentation UI wizard | 📦 Archiver |

---

## Documentation (Dossier documentation/)

### Fichiers Principaux

| Fichier | Description | Statut |
|---------|-------------|--------|
| [`documentation/README.md`](documentation/README.md) | Page documentation principale | ✅ Actif |
| [`documentation/INDEX.md`](documentation/INDEX.md) | Index documentation | ✅ Actif |
| [`documentation/API_INDEX.md`](documentation/API_INDEX.md) | Index API | ✅ Actif |
| [`documentation/ROADMAP.md`](documentation/ROADMAP.md) | Roadmap documentation | ⚠️ À synchroniser |
| [`documentation/TROUBLESHOOTING.md`](documentation/TROUBLESHOOTING.md) | Dépannage | ✅ Actif |
| [`documentation/USER_GUIDE.md`](documentation/USER_GUIDE.md) | Guide utilisateur | ✅ Actif |
| [`documentation/DEVELOPER_GUIDE.md`](documentation/DEVELOPER_GUIDE.md) | Guide développeur | ✅ Actif |

### Fichiers Techniques

| Fichier | Description | Action |
|---------|-------------|--------|
| [`documentation/TECHNICAL_GUIDE.md`](documentation/TECHNICAL_GUIDE.md) | Guide technique | ✅ Actif |
| [`documentation/TECHNICAL_AUDIT_REPORT_2026_02_12.md`](TECHNICAL_AUDIT_REPORT_2026_02_12.md) | Audit technique | ✅ Actif |
| [`documentation/ Lessons_Learned.md`](documentation/%20Lessons_Learned.md) | Leçons apprises | 📦 À archiver |
| [`documentation/TECHNIQUES_STORYTELLING_PROMPTING.md`](documentation/TECHNIQUES_STORYTELLING_PROMPTING.md) | Techniques prompting | ✅ Actif |
| [`documentation/PROJECT_STRUCTURE.md`](documentation/PROJECT_STRUCTURE.md) | Structure projet | ✅ Actif |
| [`documentation/STRUCTURE.md`](documentation/STRUCTURE.md) | Structure | ⚠️ Duplicata possible |
| [`documentation/TECHNICAL_ROADMAP.md`](documentation/TECHNICAL_ROADMAP.md) | Roadmap technique | ⚠️ À synchroniser |

### Fichiers à Archiver

| Fichier | Description | Action |
|---------|-------------|--------|
| [`documentation/ADDON_CONFIG_FEATURE.md`](documentation/ADDON_CONFIG_FEATURE.md) | Feature addons | 📦 Archiver |
| [`documentation/ADDON_FRONTEND_INTEGRATION.md`](documentation/ADDON_FRONTEND_INTEGRATION.md) | Intégration frontend addons | 📦 Archiver |
| [`documentation/ADDON_QUICK_START.md`](documentation/ADDON_QUICK_START.md) | Démarrage rapide addons | 📦 Archiver |
| [`documentation/ADDON_SYSTEM_IMPLEVEMENTS.md`](documentation/ADDON_SYSTEM_IMPROVEMENTS.md) | Améliorations système addons | 📦 Archiver |
| [`documentation/AI_ENHANCEMENT_API_REFERENCE.md`](documentation/AI_ENHANCEMENT_API_REFERENCE.md) | Référence API AI | 📦 Archiver |
| [`documentation/AMUSEAI_EVALUATION_MEMO.md`](documentation/AMUSEAI_EVALUATION_MEMO.md) | Memo évaluation AmuseAI | 📦 Archiver |
| [`documentation/ANALYSE_DOCS_V3_COMPLETE.md`](documentation/ANALYSE_DOCS_V3_COMPLETE.md) | Analyse docs V3 | 📦 Archiver |
| [`documentation/ANALYSE_ERREURS_TACHES.md`](documentation/ANALYSE_ERREURS_TACHES.md) | Analyse erreurs tâches | 📦 Archiver |
| [`documentation/API_PYTHON_MIGRATION.md`](documentation/API_PYTHON_MIGRATION.md) | Migration Python API | 📦 Archiver |
| [`documentation/AUTOMATIC_MODEL_DOWNLOAD.md`](documentation/AUTOMATIC_MODEL_DOWNLOAD.md) | Téléchargement automatique modèle | 📦 Archiver |
| [`documentation/BUILDER_IO_NODE_PATH_FIX.md`](documentation/BUILDER_IO_NODE_PATH_FIX.md) | Correction chemin Builder.io | 📦 Archiver |
| [`documentation/CHANGELOG_SEQUENCE_REFRESH.md`](documentation/CHANGELOG_SEQUENCE_REFRESH.md) | Changelog rafraîchissement séquences | 📦 Archiver |
| [`documentation/CLI_ARCHITECTURE.md`](documentation/CLI_ARCHITECTURE.md) | Architecture CLI | 📦 Archiver |
| [`documentation/CLI_EXTENSIBILITY.md`](documentation/CLI_EXTENSIBILITY.md) | Extensibilité CLI | 📦 Archiver |
| [`documentation/CODE_SIGNING_SETUP.md`](documentation/CODE_SIGNING_SETUP.md) | Configuration signature code | 📦 Archiver |
| [`documentation/configuration_manager_implementation.md`](documentation/configuration_manager_implementation.md) | Implémentation manager config | 📦 Archiver |
| [`documentation/connection_manager.md`](documentation/connection_manager.md) | Manager connexion | 📦 Archiver |
| [`documentation/DEPENDENCES_PYTHON.md`](documentation/DEPENDENCES_PYTHON.md) | Dépendances Python | 📦 Archiver |
| [`documentation/DEPLOYMENT_GUIDE.md`](documentation/DEPLOYMENT_GUIDE.md) | Guide déploiement | ✅ Conserver recent |
| [`documentation/ERROR_HANDLING.md`](documentation/ERROR_HANDLING.md) | Gestion erreurs | 📦 Archiver |
| [`documentation/error_recovery_manager_implementation.md`](documentation/error_recovery_manager_implementation.md) | Implémentation récupération erreurs | 📦 Archiver |
| [`documentation/error-handling-implementation.md`](documentation/error-handling-implementation.md) | Implémentation gestion erreurs | 📦 Archiver |
| [`documentation/EXEMPLES_PROMPTS_AVANT_APRES.md`](documentation/EXEMPLES_PROMPTS_AVANT_APRES.md) | Exemples prompts avant/après | 📦 Archiver |
| [`documentation/FEEDBACK-ERROR-LOGGING.md`](documentation/feedback-error-logging.md) | Logging erreurs feedback | 📦 Archiver |
| [`documentation/FIX_TESTS.md`](documentation/FIX_TESTS.md) | Correction tests | 📦 Archiver |
| [`documentation/INDEX_ANALYSE_DOCS_V3.md`](documentation/INDEX_ANALYSE_DOCS_V3.md) | Index analyse docs V3 | 📦 Archiver |
| [`documentation/INSIGHTS_AMELIORATION_VIDEO_AUDIO.md`](documentation/INSIGHTS_AMELIORATION_VIDEO_AUDIO.md) | Améliorations video/audio | 📦 Archiver |
| [`documentation/INSTRUCTIONS_UTILISATION_MIGRATION.md`](documentation/INSTRUCTIONS_UTILISATION_MIGRATION.md) | Instructions migration | 📦 Archiver |
| [`documentation/INTEGRATION_GUIDE.md`](documentation/INTEGRATION_GUIDE.md) | Guide intégration | 📦 Archiver |
| [`documentation/INTEGRATION_PLAN.md`](documentation/INTEGRATION_PLAN.md) | Plan intégration | 📦 Archiver |
| [`documentation/json_schema_validation_research.md`](documentation/json_schema_validation_research.md) | Recherche validation JSON schema | 📦 Archiver |
| [`documentation/LLM_MEMORY_SYSTEM_GUIDE.md`](documentation/LLM_MEMORY_SYSTEM_GUIDE.md) | Guide système mémoire LLM | 📦 Archiver |
| [`documentation/LOG_ANONYMIZER_IMPLEMENTATION.md`](documentation/LOG_ANONYMIZER_IMPLEMENTATION.md) | Implémentation anonymiseur logs | 📦 Archiver |
| [`documentation/MIGRATION_GUIDE.md`](documentation/MIGRATION_GUIDE.md) | Guide migration | 📦 Archiver |
| [`documentation/MODEL_REQUIREMENTS_MATRIX.md`](documentation/MODEL_REQUIREMENTS_MATRIX.md) | Matrice exigences modèles | 📦 Archiver |
| [`documentation/PHASE3_UX_IMPROVEMENTS.md`](documentation/PHASE3_UX_IMPROVEMENTS.md) | Améliorations UX phase 3 | 📦 Archiver |
| [`documentation/pipeline_executor_implementation.md`](documentation/pipeline_executor_implementation.md) | Implémentation exécuteur pipeline | 📦 Archiver |
| [`documentation/PLAN_ACTION_INTEGRATION_INSIGHTS.md`](documentation/PLAN_ACTION_INTEGRATION_INSIGHTS.md) | Plan action intégration | 📦 Archiver |
| [`documentation/PLAN_AMELIORATION_EDITEUR_CAPCUT.md`](documentation/PLAN_AMELIORATION_EDITEUR_CAPCUT.md) | Plan amélioration éditeur CapCut | 📦 Archiver |
| [`documentation/PLAN_PHASE1_UIUX.md`](documentation/PLAN_PHASE1_UIUX.md) | Plan phase 1 UI/UX | 📦 Archiver |
| [`documentation/product.md`](documentation/product.md) | Produit | 📦 Archiver |
| [`documentation/progress_monitor_implementation.md`](documentation/progress_monitor_implementation.md) | Implémentation moniteur progression | 📦 Archiver |
| [`documentation/project_name_generator_implementation.md`](documentation/project_name_generator_implementation.md) | Implémentation générateur nom projet | 📦 Archiver |
| [`documentation/prompt_parser_implementation.md`](documentation/prompt_parser_implementation.md) | Implémentation parseur prompts | 📦 Archiver |
| [`documentation/python_cli_research.md`](documentation/python_cli_research.md) | Recherche CLI Python | 📦 Archiver |
| [`documentation/quality_validation_developer_guide.md`](documentation/quality_validation_developer_guide.md) | Guide développeur validation qualité | 📦 Archiver |
| [`documentation/quality_validation_user_guide.md`](documentation/quality_validation_user_guide.md) | Guide utilisateur validation qualité | 📦 Archiver |
| [`documentation/quality_validator_implementation.md`](documentation/quality_validator_implementation.md) | Implémentation validateur qualité | 📦 Archiver |
| [`documentation/QUICK_REFERENCE_BUILD.md`](documentation/QUICK_REFERENCE_BUILD.md) | Référence rapide build | 📦 Archiver |
| [`documentation/README_ANALYSE_DOCS_V3.md`](documentation/README_ANALYSE_DOCS_V3.md) | README analyse docs V3 | 📦 Archiver |
| [`documentation/README_CORRECTIONS.md`](documentation/README_CORRECTIONS.md) | README corrections | 📦 Archiver |
| [`documentation/README_SEQUENCE_REFRESH_FIX.md`](documentation/README_SEQUENCE_REFRESH_FIX.md) | README correction séquences | 📦 Archiver |
| [`documentation/README_STORYCORE_COMPLETE.md`](documentation/README_STORYCORE_COMPLETE.md) | README complet StoryCore | 📦 Archiver |
| [`documentation/README_TESTING.md`](documentation/README_TESTING.md) | README tests | 📦 Archiver |
| [`documentation/REFACTORING_CHANGELOG.md`](documentation/REFACTORING_CHANGELOG.md) | Changelog refactoring | 📦 Archiver |
| [`documentation/RESUME_INSIGHTS_AMELIORATIONS.md`](documentation/RESUME_INSIGHTS_AMELIORATIONS.md) | Résumé améliorations insights | 📦 Archiver |
| [`documentation/roadmap-configuration.md`](documentation/roadmap-configuration.md) | Configuration roadmap | 📦 Archiver |
| [`documentation/schema-version-handling.md`](documentation/schema-version-handling.md) | Gestion version schema | 📦 Archiver |
| [`documentation/SCRIPTS_INSTALLATION_MISE_A_JOUR.md`](documentation/SCRIPTS_INSTALLATION_MISE_A_JOUR.md) | Scripts installation/maj | 📦 Archiver |
| [`documentation/secret-services-menu.md`](documentation/secret-services-menu.md) | Menu services secrets | 📦 Archiver |
| [`documentation/SEQUENCE_PLANNING_STUDIO_PLAN.md`](documentation/SEQUENCE_PLANNING_STUDIO_PLAN.md) | Plan studio planification séquences | 📦 Archiver |
| [`documentation/SOLUTION_ACTUALISER_SEQUENCES.md`](documentation/SOLUTION_ACTUALISER_SEQUENCES.md) | Solution actualiser séquences | 📦 Archiver |
| [`documentation/steering.md`](documentation/steering.md) | Direction/Stérage | 📦 Archiver |
| [`documentation/STRUCTURE_PROJET_STORYCORE.md`](documentation/STRUCTURE_PROJET_STORYCORE.md) | Structure projet StoryCore | 📦 Archiver |
| [`documentation/TASK_8_CLI_IMPLEMENTATION_COMPLETE.md`](documentation/TASK_8_CLI_IMPLEMENTATION_COMPLETE.md) | Implémentation CLI tâche 8 | 📦 Archiver |
| [`documentation/TASK_8_STORY_FILE_IO_IMPLEMENTATION.md`](documentation/TASK_8_STORY_FILE_IO_IMPLEMENTATION.md) | Implémentation IO fichiers tâche 8 | 📦 Archiver |
| [`documentation/TASK_9_BUILD_LOGGER_COMPLETION.md`](documentation/TASK_9_BUILD_LOGGER_COMPLETION.md) | Complétion logger build tâche 9 | 📦 Archiver |
| [`documentation/TASK_9_CHECKPOINT_COMPLETE.md`](documentation/TASK_9_CHECKPOINT_COMPLETE.md) | Checkpoint tâche 9 | 📦 Archiver |
| [`documentation/TASK_10_INTEGRATION_TESTS_COMPLETE.md`](documentation/TASK_10_INTEGRATION_TESTS_COMPLETE.md) | Tests intégration tâche 10 | 📦 Archiver |
| [`documentation/TASK_17_VERIFICATION.md`](documentation/TASK_17_VERIFICATION.md) | Vérification tâche 17 | 📦 Archiver |
| [`documentation/TASK_20_VERIFICATION.md`](documentation/TASK_20_VERIFICATION.md) | Vérification tâche 20 | 📦 Archiver |
| [`documentation/TASK_21.1_COMPLETION.md`](documentation/TASK_21.1_COMPLETION.md) | Complétion tâche 21.1 | 📦 Archiver |
| [`documentation/TASK_21.2_COMPLETION.md`](documentation/TASK_21.2_COMPLETION.md) | Complétion tâche 21.2 | 📦 Archiver |
| [`documentation/TASK_LLM_INTEGRATION.md`](documentation/TASK_LLM_INTEGRATION.md) | Intégration LLM tâche | 📦 Archiver |
| [`documentation/tech.md`](documentation/tech.md) | Tech | 📦 Archiver |
| [`documentation/TEST_SEQUENCE_REFRESH.md`](documentation/TEST_SEQUENCE_REFRESH.md) | Test rafraîchissement séquences | 📦 Archiver |
| [`documentation/test_task_20_integration.md`](documentation/test_task_20_integration.md) | Test intégration tâche 20 | 📦 Archiver |
| [`documentation/TESTS_INTEGRATION.md`](documentation/TESTS_INTEGRATION.md) | Tests intégration | 📦 Archiver |
| [`documentation/TYPESCRIPT_FIXES_COMPLETE.md`](documentation/TYPESCRIPT_FIXES_COMPLETE.md) | Corrections TypeScript complètes | 📦 Archiver |
| [`documentation/TYPESCRIPT_FIXES_TODO.md`](documentation/TYPESCRIPT_FIXES_TODO.md) | Corrections TypeScript TODO | 📦 Archiver |
| [`documentation/UI_FIXES_PLAN.md`](documentation/UI_FIXES_PLAN.md) | Plan corrections UI | 📦 Archiver |
| [`documentation/UI_IMPROVEMENTS.md`](documentation/UI_IMPROVEMENTS.md) | Améliorations UI | 📦 Archiver |
| [`documentation/UI_URGENT_FIXES_TODO.md`](documentation/UI_URGENT_FIXES_TODO.md) | Corrections urgentes UI TODO | 📦 Archiver |
| [`documentation/ui-improvement-roadmap.md`](documentation/ui-improvement-roadmap.md) | Roadmap améliorations UI | 📦 Archiver |
| [`documentation/USER_GUIDE_PUPPET_PIPELINE.md`](documentation/USER_GUIDE_PUPPET_PIPELINE.md) | Guide utilisateur pipeline puppet | 📦 Archiver |
| [`documentation/VIDEO_EDITOR_NEXT_STEPS.md`](documentation/VIDEO_EDITOR_NEXT_STEPS.md) | Prochaines étapes éditeur vidéo | 📦 Archiver |
| [`documentation/VIDEO_EDITOR_PROJECT_SUMMARY.md`](documentation/VIDEO_EDITOR_PROJECT_SUMMARY.md) | Résumé projet éditeur vidéo | 📦 Archiver |
| [`documentation/VIDEO_EDITOR_WIZARD_PLAN.md`](documentation/VIDEO_EDITOR_WIZARD_PLAN.md) | Plan wizard éditeur vidéo | 📦 Archiver |
| [`documentation/video_engine_api.md`](documentation/video_engine_api.md) | API moteur vidéo | ✅ Conserver recent |
| [`documentation/video_engine_examples.md`](documentation/video_engine_examples.md) | Exemples moteur vidéo | ✅ Conserver recent |
| [`documentation/video_engine_performance.md`](documentation/video_engine_performance.md) | Performance moteur vidéo | ✅ Conserver recent |
| [`documentation/video_engine_troubleshooting.md`](documentation/video_engine_troubleshooting.md) | Dépannage moteur vidéo | ✅ Conserver recent |
| [`documentation/world-builder-api.md`](documentation/world-builder-api.md) | API constructeur mondes | ✅ Conserver recent |
| [`documentation/world-builder-user-guide.md`](documentation/world-builder-user-guide.md) | Guide utilisateur constructeur mondes | ✅ Conserver recent |

---

## Statistiques Documentation

| Catégorie | Nombre de fichiers | À conserver | À archiver |
|-----------|-------------------|------------|------------|
| TASK_*.md (Creative Studio) | ~60 | 0 | ~60 |
| FIX_*.md / CORRECTION_*.md | ~40 | 0 | ~40 |
| SUMMARY / COMPLETION | ~30 | ~5 | ~25 |
| CHANGELOG | ~5 | ~2 | ~3 |
| GUIDE | ~20 | ~10 | ~10 |
| documentation/*.md | ~100 | ~30 | ~70 |
| **Total** | **~255** | **~47** | **~208** |

---

## Fichiers à Archiver (Liste Complète)

### Creative Studio UI - À archiver vers `archive/creative-studio-ui/`

```
# Tâches (TASK_*.md) - 60 fichiers
TASK_1_COMPLETION_SUMMARY.md
TASK_4_RECENT_PROJECTS_SERVICE_COMPLETE.md
TASK_5_MENU_CONFIG_SYSTEM_COMPLETE.md
TASK_7_COMPLETION_SUMMARY.md
TASK_7_MODAL_MANAGEMENT_COMPLETE.md
TASK_8_COMPLETION_SUMMARY.md
TASK_8.1_COMPLETION_SUMMARY.md
TASK_8.1_NOTIFICATION_SERVICE_COMPLETE.md
TASK_9_COMPLETION_SUMMARY.md
TASK_9_CORE_MENU_COMPONENTS_COMPLETE.md
TASK_10_COMPLETION_SUMMARY.md
TASK_10_DIALOGUE_PHRASE_EDITOR_COMPLETE.md
TASK_10_MENUBAR_ROOT_COMPONENT_COMPLETE.md
TASK_10_STATE_INTEGRATION_COMPLETE.md
TASK_11_CHECKPOINT_COMPLETE.md
TASK_11_ERROR_HANDLING_COMPLETE.md
TASK_12_FALLBACK_MODE_COMPLETE.md
TASK_12_UI_POLISH_COMPLETE.md
TASK_12_VOICE_GENERATION_PANEL_COMPLETE.md
TASK_12.1_SUMMARY.md
TASK_12.4_SUMMARY.md
TASK_13_AUDIO_TRACK_MANAGER_COMPLETE.md
TASK_13_FINAL_CHECKPOINT_COMPLETE.md
TASK_13.1_SUMMARY.md
TASK_14_BATCH_GENERATION_COMPLETE.md
TASK_14_PERSISTENCE_ENHANCEMENTS_COMPLETE.md
TASK_14_SEQUENCE_GENERATION_COMPLETE.md
TASK_14.1_SUMMARY.md
TASK_15_1_GENERATION_PROGRESS_MODAL_COMPLETE.md
TASK_15_GENERATION_PROGRESS_MODAL_SUMMARY.md
TASK_15_IMPLEMENTATION_SUMMARY.md
TASK_15_PIPELINE_WORKFLOW_COMPLETE.md
TASK_15_VERIFICATION_SUMMARY.md
TASK_15.1_SUMMARY.md
TASK_16_1_SEQUENCE_GENERATION_CONTROL_COMPLETE.md
TASK_16_ASSET_PREVIEW_PANEL_COMPLETE.md
TASK_16_ERROR_HANDLING_COMPLETE.md
TASK_16_MIGRATION_IMPLEMENTATION.md
TASK_16_SEQUENCE_GENERATION_CONTROL_SUMMARY.md
TASK_16.1_SUMMARY.md
TASK_16.2_SUMMARY.md
TASK_17_CHECKPOINT_GENERATION_TESTS_COMPLETE.md
TASK_17_HISTORY_PANEL_COMPLETE.md
TASK_17.1_SUMMARY.md
TASK_18_CHECKPOINT_SUMMARY.md
TASK_18_DATA_PERSISTENCE_COMPLETE.md
TASK_19_1_SHOT_DELETION_COMPLETE.md
TASK_19_ACCESSIBILITY_IMPLEMENTATION.md
TASK_19.1_SUMMARY.md
TASK_19.2_SUMMARY.md
TASK_20_1_BACKGROUND_GENERATION_COMPLETE.md
TASK_20.1_SUMMARY.md
TASK_20.2_SUMMARY.md
TASK_21_1_DASHBOARD_ASSEMBLY_COMPLETE.md
TASK_21_INTEGRATION_COMPLETE.md
TASK_22_ACCESSIBILITY_COMPLETE.md
TASK_22.1_SUMMARY.md
TASK_22.2_SUMMARY.md

# Correctifs (FIX_*.md, CORRECTION_*.md) - 40 fichiers
BUG_FIX_CHARACTER_CREATION.md
BUG_FIX_SEQUENCE_LOADING.md
CHARACTER_CREATION_MENU_FIX.md
CHARACTER_PERSISTENCE_FIX.md
COMFYUI_CONNECTION_FIX.md
COMFYUI_CONNECTION_FIX_COMPLETE.md
COMFYUI_ERROR_FIXED.md
CORRECTION_DOUBLONS_INTERFACE.md
CORRECTION_DOUBLONS_PERSONNAGES.md
CORRECTION_ERREURS_CRITIQUES.md
CORRECTION_MENU_FRANCAIS.md
CORRECTION_PERSISTANCE_PORTRAITS.md
CORRECTION_PERSISTANCE_PORTRAITS_COMPLETE.md
CORRECTION_TEXTES_EMMELES.md
CORRECTION_TODO.md
CORRECTIONS_3_PROBLEMES.md
CORRECTIONS_APPLIQUEES.md
CORRECTIONS_PORTRAIT_GENERATION.md
CRITICAL_FIXES_APPLIED.md
CRITICAL_FIXES_NEEDED.md
CSP_AND_WIZARDS_FIX.md
CSP_COMFYUI_IMAGES_FIXED.md
FIX_ALL_IMPORTS.md
FIX_CLONING_ERROR.md
FIX_DIAGNOSTIC_ERRORS.md
FIX_ECRAN_NOIR.md
FIX_FILE_SYSTEM_API_ERROR.md
FIX_SEQUENCE_REFRESH_WEB_SUPPORT.md
FIXES_APPLIED_SESSION.md
INFINITE_LOOP_FIX.md
LLM_API_KEY_FIX.md
LLM_SETTINGS_DECRYPTION_FIX.md
LANGUAGE_FIX_SUMMARY.md
MODEL_DOWNLOAD_FIX.md
MODEL_NAMES_CORRECTION.md
README_MENU_FIXES.md
REDUX_SERIALIZATION_FIX.md
SHOT_WIZARD_SCROLL_FIX.md
SHOT_WIZARD_TYPE_SELECTOR_FIX.md

# Résumés et rapports (SUMMARY, COMPLETION, REPORT) - 25 fichiers
CHECKPOINT_6_CORE_SERVICES_TESTS.md
CHANGES_APPLIED.md
COMPLETION_REPORT.md
COMPLETION_STATUS.md
ELECTRON_BLACK_SCREEN_DIAGNOSTIC.md
ELECTRON_ECRAN_NOIR_FIX.md
ELECTRON_ECRAN_NOIR_RESOLU.md
ERROR_HANDLING_IMPLEMENTATION.md
EXPERIMENTAL_FEATURES_IMPLEMENTATION.md
EXPERIMENTAL_FEATURES_TEST.md
FEATURE_CHARACTER_PORTRAIT_SUMMARY.md
FINAL_FIX_SUMMARY.md
FINAL_IMPORT_FIX_SUMMARY.md
FINAL_MENU_VERIFICATION_REPORT.md
FINAL_REPORT.md
GRID_EDITOR_TEST_FIXES_REPORT.md
GRID_EDITOR_VERIFICATION_REPORT.md
GRID_EDITOR_ZOOM_FIX.md
IMPLEMENTATION_COMPLETE.md
IMPLEMENTATION_SUMMARY.md
IMPORT_ERRORS_RESOLUTION_COMPLETE.md
IMPORT_FIXES_SUMMARY.md
MENU_ANALYSIS_COMPLETE.txt
MENU_CHARACTER_STORY_WIZARD_FIX.md
MENU_DUPLICATES_ANALYSIS.md
```

### Documentation - À archiver vers `archive/documentation/`

```
# Fichiers de documentation (70 fichiers)
ADDON_CONFIG_FEATURE.md
ADDON_FRONTEND_INTEGRATION.md
ADDON_QUICK_START.md
ADDON_SYSTEM_IMPROVEMENTS.md
AI_ENHANCEMENT_API_REFERENCE.md
AMUSEAI_EVALUATION_MEMO.md
ANALYSE_DOCS_V3_COMPLETE.md
ANALYSE_ERREURS_TACHES.md
API_PYTHON_MIGRATION.md
AUTOMATIC_MODEL_DOWNLOAD.md
BUILDER_IO_NODE_PATH_FIX.md
CHANGELOG_SEQUENCE_REFRESH.md
CLI_ARCHITECTURE.md
CLI_EXTENSIBILITY.md
CODE_SIGNING_SETUP.md
configuration_manager_implementation.md
connection_manager.md
DEPENDENCES_PYTHON.md
ERROR_HANDLING.md
error_recovery_manager_implementation.md
error-handling-implementation.md
EXEMPLES_PROMPTS_AVANT_APRES.md
feedback-error-logging.md
FIX_TESTS.md
INDEX_ANALYSE_DOCS_V3.md
INSIGHTS_AMELIORATION_VIDEO_AUDIO.md
INSTRUCTIONS_UTILISATION_MIGRATION.md
INTEGRATION_GUIDE.md
INTEGRATION_PLAN.md
json_schema_validation_research.md
LLM_MEMORY_SYSTEM_GUIDE.md
LOG_ANONYMIZER_IMPLEMENTATION.md
MIGRATION_GUIDE.md
MODEL_REQUIREMENTS_MATRIX.md
PHASE3_UX_IMPROVEMENTS.md
pipeline_executor_implementation.md
PLAN_ACTION_INTEGRATION_INSIGHTS.md
PLAN_AMELIORATION_EDITEUR_CAPCUT.md
PLAN_PHASE1_UIUX.md
product.md
progress_monitor_implementation.md
project_name_generator_implementation.md
prompt_parser_implementation.md
python_cli_research.md
quality_validation_developer_guide.md
quality_validation_user_guide.md
quality_validator_implementation.md
QUICK_REFERENCE_BUILD.md
README_ANALYSE_DOCS_V3.md
README_CORRECTIONS.md
README_SEQUENCE_REFRESH_FIX.md
README_STORYCORE_COMPLETE.md
README_TESTING.md
REFACTORING_CHANGELOG.md
RESUME_INSIGHTS_AMELIORATIONS.md
roadmap-configuration.md
schema-version-handling.md
SCRIPTS_INSTALLATION_MISE_A_JOUR.md
secret-services-menu.md
SEQUENCE_PLANNING_STUDIO_PLAN.md
SOLUTION_ACTUALISER_SEQUENCES.md
steering.md
STRUCTURE_PROJET_STORYCORE.md
TASK_8_CLI_IMPLEMENTATION_COMPLETE.md
TASK_8_STORY_FILE_IO_IMPLEMENTATION.md
TASK_9_BUILD_LOGGER_COMPLETION.md
TASK_9_CHECKPOINT_COMPLETE.md
TASK_10_INTEGRATION_TESTS_COMPLETE.md
TASK_17_VERIFICATION.md
TASK_20_VERIFICATION.md
TASK_21.1_COMPLETION.md
TASK_21.2_COMPLETION.md
TASK_LLM_INTEGRATION.md
tech.md
TEST_SEQUENCE_REFRESH.md
test_task_20_integration.md
TESTS_INTEGRATION.md
TYPESCRIPT_FIXES_COMPLETE.md
TYPESCRIPT_FIXES_TODO.md
UI_FIXES_PLAN.md
UI_IMPROVEMENTS.md
UI_URGENT_FIXES_TODO.md
ui-improvement-roadmap.md
USER_GUIDE_PUPPET_PIPELINE.md
VIDEO_EDITOR_NEXT_STEPS.md
VIDEO_EDITOR_PROJECT_SUMMARY.md
VIDEO_EDITOR_WIZARD_PLAN.md
```

---

## Structure Documentaire Recommandée

```
docs/
├── README.md                    # Page d'accueil documentation
├── ARCHITECTURE.md              # Architecture générale
├── API_REFERENCE.md             # Référence API
│
├── guides/
│   ├── INSTALLATION.md          # Guide d'installation
│   ├── CONFIGURATION.md         # Guide de configuration
│   ├── DEVELOPMENT.md           # Guide de développement
│   └── DEPLOYMENT.md            # Guide de déploiement
│
├── user_guide/
│   ├── QUICK_START.md           # Démarrage rapide
│   ├── USER_GUIDE.md            # Guide utilisateur complet
│   ├── WORLD_BUILDER_GUIDE.md  # Guide constructeur mondes
│   └── VIDEO_EDITOR_GUIDE.md    # Guide éditeur vidéo
│
├── developer_guide/
│   ├── CONTRIBUTING.md          # Guide contribution
│   ├── CODING_STANDARDS.md      # Standards de code
│   └── TESTING.md              # Guide tests
│
├── best-practices/
│   ├── SECURITY.md              # Bonnes pratiques sécurité
│   └── PERFORMANCE.md          # Bonnes pratiques performance
│
├── troubleshooting/
│   ├── TROUBLESHOOTING.md       # Dépannage général
│   └── FAQ.md                   # Questions fréquentes
│
└── changelogs/
    ├── CHANGELOG.md             # Changelog principal
    └── ARCHIVE/
        ├── TASK_*.md            # Tâches archivées
        └── FIX_*.md             # Correctifs archivés
```

---

## Actions Recommandées

### 1. Immédiat (Aujourd'hui)
- [ ] Créer ce `DOCUMENTATION_INDEX.md`
- [ ] Créer `CHANGELOG.md` consolidé (voir fichier associé)
- [ ] Mettre à jour `README.md` principal avec lien vers documentation

### 2. Cette semaine
- [ ] Créer `archive/creative-studio-ui/` si inexistant
- [ ] Créer `archive/documentation/` si inexistant
- [ ] Déplacer 60+ fichiers TASK_*.md vers archive
- [ ] Déplacer 40+ fichiers FIX_*.md vers archive
- [ ] Déplacer 25+ fichiers SUMMARY/RAPPORT vers archive
- [ ] Supprimer fichiers temporaires (test-*.txt, etc.)

### 3. Ce mois
- [ ] Réorganiser structure `docs/` selon recommandation
- [ ] Créer guides consolidés (INSTALLATION, CONFIGURATION, DEVELOPMENT)
- [ ] Mettre à jour références dans code source
- [ ] Documenter la nouvelle structure dans CONTRIBUTING.md

---

## À Faire

- [x] Créer DOCUMENTATION_INDEX.md
- [ ] Créer CHANGELOG.md consolidé
- [ ] Exécuter script d'archivage
- [ ] Vérifier liens rompus après archivage
- [ ] Mettre à jour README.md principal
