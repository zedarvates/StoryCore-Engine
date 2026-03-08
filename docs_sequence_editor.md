# Plan de Nettoyage - Fichiers Non Nécessaires

Ce document liste les fichiers et répertoires qui ne sont plus nécessaires dans le projet StoryCore Engine et peuvent être supprimés ou archivés.

---

## 📁 Répertoires à Supprimer

### 1. `archive/` - Archives anciennes
**Contenu**: Documentation historique, rapports de correction, anciennes versions UI
**Action**: Supprimer ou déplacer vers un stockage externe

#### Sous-répertoires:
- `archive/creative-studio-ui/` - ~80 fichiers MD de corrections UI historiques
- `archive/documentation/` - Ancienne documentation
- `archive/resume_legacy/` - Anciens fichiers de reprise
- `archive/root_cleanup_2026_02/` - Rapports de nettoyage anciens
- `archive/src-ui-simplified/` - Ancien code UI simplifié

### 2. `quarantine/` - Fichiers en quarantaine
**Contenu**: 
- `tmp_0bh7q49.safetensors.1769004273`
- `tmp_0bh7q49.safetensors.report.json`
- `tmp7ozls8qu.safetensors.1769009584`
- `tmp7ozls8qu.safetensors.report.json`
- `tmplrals0jo.safetensors.1769008125`
- `tmplrals0jo.safetensors.report.json`
- `tmpwh0o14yd.safetensors.1769014675`
- `tmpwh0o14yd.safetensors.report.json`
**Action**: Supprimer (fichiers temporaires de modèle)

### 3. `temp_assets/` - Assets temporaires
**Contenu**:
- `old_file.txt`
- `test2.jpg`
**Action**: Supprimer

### 4. `temp_audio_export/` - Export audio temporaire
**Contenu**: Fichiers d'export audio avec métadonnées
**Action**: Supprimer si pas d'export en cours

---

## 📄 Fichiers à Supprimer (Racine)

| Fichier | Type | Raison |
|---------|------|--------|
| `ltx2AllInOneComfyui_ltx2DistilledAIOV21.zip` | Archive | Ancien modèle ComfyUI |
| `StorycoreIconeV2.png~` | Backup |Fichier backup (~) |
| `build_output.txt` | Log | Log de build temporaire |
| `tsc_errors.txt` | Log | Erreurs TypeScript (peut être regénéré) |
| `image_flux2 storycore1.json:Zone.Identifier` | Metadata | Métadonnées Windows inutile |
| `=10.0.0` | Inconnu | Fichier étrange à la racine |

---

## 🔄 Fichiers de Débogage/Log à Supprimer

### Dans le répertoire racine:
- `*.log` files (si présents)
- `*.tmp` files
- `*.bak` files
- Base de données temporaires: `*.db` (sauf si nécessaire)

### Dans `coverage/`, `htmlcov/`:
- Fichiers de coverage générés automatiquement - peut être regénéré

---

## 🗑️ Fichiers Dupliqués ou Obsolètes

### Dans `src/`:

| Fichier | Statut |
|---------|--------|
| `storycore_cli_backup.py` | Backup - peut être supprimé |
| `api_server.py` | Possible doublon de `api_server_fastapi.py` |
| `api_server_simple.py` | Version simple - peut être consolidée |
| `error_handler.py` | Ancien - voir si remplacé par `ai_error_handler.py` |
| `advanced_error_handling.py` | Possible doublon |

---

## ✅ Plan d'Action Recommandé

### Phase 1: Sauvegarde
1. Créer une sauvegarde complète avant suppression
2. Vérifier que le projet fonctionne

### Phase 2: Suppression Sécurisée
1. Supprimer `quarantine/` (fichiers temporaires)
2. Supprimer `temp_assets/`
3. Supprimer `temp_audio_export/` (si pas d'export en cours)
4. Supprimer les fichiers identifiés à la racine

### Phase 3: Archives
1. Créer un package `archive_old_<date>.zip` contenant:
   - `archive/creative-studio-ui/`
   - `archive/documentation/`
   - `archive/root_cleanup_2026_02/`
2. Supprimer le répertoire `archive/` après packaging

### Phase 4: Nettoyage Code
1. Consolider les fichiers API servers
2. Supprimer les fichiers backup dans `src/`
3. Vérifier les doublons dans `src/`

---

## ⚠️ Avertissements

- **Toujours** faire une sauvegarde avant suppression
- **Vérifier** que les fichiers ne sont pas utilisés par le code actif
- **Conserver** les logs de production nécessaires
- **Conserver** les fichiers de configuration `.env`

---

*Généré le: 2026-02-15*
*Projet: StoryCore Engine*

