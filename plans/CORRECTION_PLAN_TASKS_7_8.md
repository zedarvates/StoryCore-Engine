# Plan de Correction - Tâches 7 et 8

## 🔴 PROBLÈMES IDENTIFIÉS

### 1. Conflit de Noms - EnhancementType
**Gravité**: CRITIQUE
**Impact**: Impossible d'importer les modules sans erreur

**Fichiers affectés**:
- `src/ai_enhancement_engine.py` - Définit EnhancementType (niveau système)
- `src/quality_optimizer.py` - Redéfinit EnhancementType (niveau qualité)
- `src/advanced_image_quality_monitor.py` - Redéfinit EnhancementType

**Conflit**:
```python
# ai_enhancement_engine.py
class EnhancementType(Enum):
    STYLE_TRANSFER = "style_transfer"
    SUPER_RESOLUTION = "super_resolution"
    ...

# quality_optimizer.py (CONFLIT!)
class EnhancementType(Enum):
    SHARPEN = "sharpen"
    DENOISE = "denoise"
    ...
```

### 2. Statut de Tâche Incorrect
**Gravité**: MOYENNE
**Impact**: Confusion sur l'état d'avancement

Le fichier tasks.md montre:
```markdown
- [ ] 7. Create Quality Optimizer...
```
Mais les sous-tâches 7.1 et 7.3 sont marquées comme complètes.

### 3. Imports Manquants
**Gravité**: HAUTE
**Impact**: Le code ne peut pas s'exécuter

`quality_optimizer.py` importe depuis `ai_enhancement_engine.py`:
```python
from .ai_enhancement_engine import (
    VideoFrame, EnhancedFrame, EnhancementMetadata, EnhancementType,  # CONFLIT!
    QualityLevel, PerformanceMode
)
```

## ✅ SOLUTION PROPOSÉE

### Étape 1: Renommer les Types Conflictuels

**Action**: Créer des noms spécifiques pour chaque contexte

```python
# ai_enhancement_engine.py (GARDER)
class EnhancementType(Enum):
    """Types d'améliorations AI au niveau système"""
    STYLE_TRANSFER = "style_transfer"
    SUPER_RESOLUTION = "super_resolution"
    ...

# quality_optimizer.py (RENOMMER)
class QualityEnhancementType(Enum):
    """Types d'améliorations de qualité spécifiques"""
    SHARPEN = "sharpen"
    DENOISE = "denoise"
    COLOR_CORRECTION = "color_correction"
    ...
```

### Étape 2: Corriger les Imports

**Fichier**: `src/quality_optimizer.py`

```python
# AVANT (incorrect)
from .ai_enhancement_engine import (
    VideoFrame, EnhancedFrame, EnhancementMetadata, EnhancementType,
    QualityLevel, PerformanceMode
)

# APRÈS (correct)
from .ai_enhancement_engine import (
    VideoFrame, EnhancedFrame, EnhancementMetadata,
    QualityLevel, PerformanceMode
)
# EnhancementType renommé en QualityEnhancementType (défini localement)
```

### Étape 3: Mettre à Jour Toutes les Références

**Fichiers à modifier**:
1. `src/quality_optimizer.py` - Remplacer EnhancementType par QualityEnhancementType
2. Mettre à jour toutes les méthodes utilisant ce type
3. Mettre à jour les dataclasses (EnhancementSuggestion, EnhancementResult)

### Étape 4: Corriger le Statut de la Tâche 7

**Fichier**: `.kiro/specs/ai-enhancement/tasks.md`

```markdown
# AVANT
- [ ] 7. Create Quality Optimizer...

# APRÈS
- [x] 7. Create Quality Optimizer...
```

### Étape 5: Implémenter la Tâche 8.1

**Nouveau fichier**: `src/preview_ai_integration.py`

Fonctionnalités requises:
- Génération de preview AI en temps réel
- Ajustement qualité-vitesse
- Amélioration progressive
- Intégration avec le système de preview existant

## 🔧 ORDRE D'EXÉCUTION

1. ✅ Renommer EnhancementType → QualityEnhancementType dans quality_optimizer.py
2. ✅ Corriger tous les imports et références
3. ✅ Tester la compilation du module
4. ✅ Corriger le statut de la tâche 7 dans tasks.md
5. ✅ Implémenter preview_ai_integration.py pour la tâche 8.1
6. ✅ Vérifier l'intégration complète

## 📊 VALIDATION

### Tests de Compilation
```bash
python -m py_compile src/quality_optimizer.py
python -m py_compile src/preview_ai_integration.py
```

### Tests d'Import
```python
from src.quality_optimizer import QualityOptimizer, QualityEnhancementType
from src.ai_enhancement_engine import EnhancementType
# Pas de conflit!
```

### Vérification des Tâches
- [x] Tâche 7.1 complète
- [x] Tâche 7.3 complète
- [x] Tâche 7 marquée comme complète
- [ ] Tâche 8.1 à implémenter
- [ ] Tâche 8.3 à implémenter

## 🎯 RÉSULTAT ATTENDU

Après correction:
- ✅ Aucun conflit de noms
- ✅ Tous les imports fonctionnent
- ✅ Statut des tâches correct
- ✅ Code compilable et exécutable
- ✅ Tâche 8.1 implémentée
