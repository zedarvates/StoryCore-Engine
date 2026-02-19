# StoryCore Engine - Changelog

## [2026-02-19] - Directorial Intelligence & Neural Assistant

### ✨ Fonctionnalités (Features) 🚀
- **Neural Production Assistant** - Added an AI-driven directorial sidebar providing real-time production advice and neural manufacturing shortcuts.
- **World Aesthetic Registry** - Implemented "Visual Intent" blueprint for Worlds, including persistent Color Slates, Artistic Signatures, and Vibe keyword registries.
- **Advanced Directing Metadata** - Shot metadata now includes Lens selection (24mm, 35mm, 85mm, etc.), Sensor types (IMAX, 35mm, VHS), and Emotion tracking (intensity 0-100%).
- **Neural Manufacturing** - Direct shortcut for generating Character Reference Sheets within the Production Assistant.
- **Production Guide V2** - Enhanced shot recap with inline editing for Motion Prompts and Technical Rig parameters.

### 🎨 UI/UX
- Integrated `NeuralProductionAssistant` into the main Project Dashboard.
- Added Visual Intent review step to the World Building Wizard (Genesis Verification).
- Improved `ProductionGuide` layout with quick action rows for character composition.

### 🛠️ Qualité & Architecture
- Enhanced `Shot` and `World` types to support aesthetic persistence and technical rig metadata.
- Implemented event-driven communication between `ProductionGuide` and `NeuralProductionAssistant` for asynchronous manifest sequences.
- Fixed `OllamaClient` import paths and improved model selection logic in production assistants.

---

## [2026-02-16] - Mise à Jour Documentation

### Documentation 📚
- **README.md** - Correction des liens d'images (URL encoding)
- **README.md** - Correction du lien YouTube de présententation
- **README.md** - Mise à jour des liens de documentation
- **START_HERE.md** - Correction de tous les chemins de fichiers
- **INDEX_DOCUMENTATION_COMPLETE.md** - Réécriture complète avec structure actuelle
- **QUICK_REFERENCE.md** - Mise à jour des liens et dates
- Mise à jour des dates vers février 2026

### Correctifs 🔧
- Images: `Screenshot-2026-02-15-*.png` → `Screenshot%202026-02-15%20*.png`
- Lien YouTube malformé corrigé
- Liens vers fichiers inexistants supprimés ou corrigés

---

## [2026-02-12] - Correction Sécurité Critique

### Sécurité 🔐
- **CRITIQUE:** Credentials externalisés vers variables d'environnement
- **CRITIQUE:** Vérification JWT implémentée avec PyJWT
- **CRITIQUE:** Mock LLM conditionné par `USE_MOCK_LLM`
- Validation uploads sécurisée (content-type, taille, sanitize)
- Path traversal corrigé avec `pathlib.Path`

### Backend Configuration ⚙️
- `backend/config.py` - Settings Pydantic centralisés
- Variables d'environnement avec `python-dotenv`
- `.env.example` - Template variables d'environnement créé

### Logging Centralisé 📝
- `src/utils/logger.ts` - Logger centralisé créé
- `src/utils/devOnly.ts` - Fonctions dev-only
- ~60 console.log migrés vers logger

### Qualité Code 🛠️
- Exceptions génériques remplacées par gestionnaires spécifiques
- Types TypeScript améliorés (ApiResponse, Dictionary, etc.)
- Validation stricte des entrées

### Documentation 📚
- Comments FR → EN (~100+ convertis)
- `SECURITY.md` créé avec guide de sécurité
- `TECHNICAL_AUDIT_REPORT_2026_02_12.md` généré

### Fichiers Modifiés/Créés
```
backend/config.py              # Configuration centralisée
backend/main_api.py             # API principale
backend/security.py             # Sécurité JWT
backend/requirements.txt        # Dépendances mises à jour
creative-studio-ui/src/utils/logger.ts       # Logger
creative-studio-ui/src/utils/devOnly.ts     # Dev only
creative-studio-ui/src/config/serverConfig.ts # Config frontend
.env.example                    # Template env
SECURITY.md                    # Guide sécurité
```

---

## [2026-02-01] - Améliorations Performance

### Performance 🚀
- Optimisation moteur vidéo
- Cache intelligent implémenté
- Lazy loading des composants

### UI/UX 🎨
- Interface utilisateur modernisée
- Améliorations accessibilité
- Thème sombre optimisé

### Correctifs 🐛
- Correction écran noir Electron
- Correction connexions ComfyUI multiples
- Correction persistance personnages

---

## [2026-01-27] - Release Initiale v1.0.0

### Fonctionnalités Principales ✨
- **Creative Studio UI** - Interface Electron/React complète
- **Backend API** - FastAPI avec endpoints REST
- **Wizard System** - Système de wizards modulaire
- **Character Portraits** - Génération portraits personnages
- **Sequence Editor** - Éditeur de séquences vidéo
- **Multi-ComfyUI** - Support multi-serveurs ComfyUI

### Architecture 🏗️
- State management Redux avec Redux Toolkit
- TypeScript strict avec types partagés
- Communication IPC Electron
- Service workers pour traitement lourd

### Intégrations 🔗
- ComfyUI pour génération images
- Modèles LLM pour prompts
- Audio processing avec effects presets
- Video encoding avec qualité validation

---

## Historique Versions Précédentes

### v0.9.0 (2026-01-15)
- Alpha release avec fonctionnalités core
- Système de projets basique
- Premiers wizards implémentés

### v0.8.0 (2026-01-08)
- Architecture Redux établie
- Menu système Electron
- Composants UI core

### v0.7.0 (2026-01-01)
- Setup initial projet
- Configuration build pipeline
- Structure codebase établie

---

## Guide de Contribution aux Changements

### Format des Entrées
```
## [YYYY-MM-DD] - Description

### Catégorie
- **TYPE:** Description détaillée
- Lien vers PR/issue si applicable
```

### Catégories Disponibles
- **🔐 Sécurité** - Mises à jour sécurité
- **✨ Fonctionnalités** - Nouvelles features
- **🐛 Correctifs** - Bug fixes
- **🚀 Performance** - Optimisations
- **🎨 UI/UX** - Interface utilisateur
- **🛠️ Qualité** - Refactoring, types, tests
- **📚 Documentation** - Docs, guides, comments

---

## Archives de Changements

Les anciens changelogs et fichiers de tâche sont archivés dans:
- `archive/creative-studio-ui/` - Tâches et correctifs UI
- `archive/documentation/` - Ancienne documentation

Pour consulter l'historique complet:
```bash
git log --oneline --all
```

---

## Statistiques

| Métrique | Valeur |
|----------|--------|
| Total commits | ~500+ |
| Fichiers source | ~500+ |
| Lignes de code | ~50,000+ |
| Tests | ~200+ |

---

## Remerciements

Merci à tous les contributeurs qui ont participé au développement de StoryCore Engine!
