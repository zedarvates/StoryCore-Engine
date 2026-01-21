# Documentation ComfyUI et Settings - Index

Ce document sert d'index pour toute la documentation relative à ComfyUI et à l'unification des paramètres.

## 📚 Documentation Principale

### 1. Unification des Paramètres (NOUVEAU)
- **[SETTINGS_UNIFICATION_COMPLETE.md](./SETTINGS_UNIFICATION_COMPLETE.md)**
  - Documentation complète de l'unification
  - Modifications effectuées
  - Architecture finale
  - Tests recommandés

- **[SETTINGS_UNIFICATION_VISUAL_SUMMARY.md](./SETTINGS_UNIFICATION_VISUAL_SUMMARY.md)**
  - Résumé visuel avant/après
  - Diagrammes et comparaisons
  - Flux utilisateur
  - Checklist de validation

- **[COMFYUI_SETTINGS_CLARIFICATION.md](./COMFYUI_SETTINGS_CLARIFICATION.md)**
  - Historique des modifications
  - Évolution de l'architecture
  - Décisions de design

## 🎨 Documentation ComfyUI

### Configuration et Setup
- **[docs/COMFYUI_DOCS_INDEX.md](./docs/COMFYUI_DOCS_INDEX.md)**
  - Index principal de la documentation ComfyUI
  - Liens vers tous les guides

- **[docs/COMFYUI_QUICK_START.md](./docs/COMFYUI_QUICK_START.md)**
  - Guide de démarrage rapide
  - Configuration initiale

- **[docs/COMFYUI_DESKTOP_SETUP.md](./docs/COMFYUI_DESKTOP_SETUP.md)**
  - Installation ComfyUI Desktop
  - Configuration spécifique

- **[docs/COMFYUI_PORT_REFERENCE.md](./docs/COMFYUI_PORT_REFERENCE.md)**
  - Référence des ports
  - Configuration réseau

### Résolution de Problèmes
- **[COMFYUI_PORT_8000_UPDATE.md](./COMFYUI_PORT_8000_UPDATE.md)**
  - Mise à jour port 8000
  - Migration de configuration

- **[COMFYUI_DESKTOP_DOCUMENTATION_UPDATE.md](./COMFYUI_DESKTOP_DOCUMENTATION_UPDATE.md)**
  - Mises à jour documentation Desktop
  - Changements récents

## 🔧 Documentation Technique

### Architecture
- **[creative-studio-ui/src/components/configuration/ComfyUIConfigurationWindow.tsx](./creative-studio-ui/src/components/configuration/ComfyUIConfigurationWindow.tsx)**
  - Composant de configuration avancée
  - Multi-serveurs, workflows, CORS

- **[src/ui/ComfyUIConfigurationWindow.tsx](./src/ui/ComfyUIConfigurationWindow.tsx)**
  - Composant de configuration simple (legacy)
  - Configuration basique

### Services
- **[creative-studio-ui/src/services/settingsPropagation.ts](./creative-studio-ui/src/services/settingsPropagation.ts)**
  - Propagation des paramètres
  - Synchronisation LLM et ComfyUI

- **[creative-studio-ui/src/services/backendApiService.ts](./creative-studio-ui/src/services/backendApiService.ts)**
  - Service API backend
  - Intégration ComfyUI

## 🎯 Guides par Cas d'Usage

### Pour les Nouveaux Utilisateurs
1. Lire [SETTINGS_UNIFICATION_VISUAL_SUMMARY.md](./SETTINGS_UNIFICATION_VISUAL_SUMMARY.md)
2. Suivre [docs/COMFYUI_QUICK_START.md](./docs/COMFYUI_QUICK_START.md)
3. Configurer via Settings > ComfyUI Configuration

### Pour les Développeurs
1. Lire [SETTINGS_UNIFICATION_COMPLETE.md](./SETTINGS_UNIFICATION_COMPLETE.md)
2. Consulter les composants de configuration
3. Comprendre la propagation des settings

### Pour le Troubleshooting
1. Vérifier [docs/COMFYUI_PORT_REFERENCE.md](./docs/COMFYUI_PORT_REFERENCE.md)
2. Consulter les messages d'erreur CORS
3. Tester la connexion via Settings menu

## 📋 Résumé des Changements Récents

### Janvier 2026 - Unification des Paramètres
- ✅ Suppression des boutons LLM/ComfyUI du dashboard
- ✅ Point d'accès unique via Settings menu
- ✅ Messages informatifs ajoutés
- ✅ Install ComfyUI Portable commenté

### Documentation Créée
- `SETTINGS_UNIFICATION_COMPLETE.md`
- `SETTINGS_UNIFICATION_VISUAL_SUMMARY.md`
- `COMFYUI_SETTINGS_CLARIFICATION.md`
- `COMFYUI_DOCUMENTATION_INDEX.md` (ce fichier)

## 🔍 Recherche Rapide

### Je veux configurer ComfyUI
→ Settings menu > ComfyUI Configuration

### Je veux configurer LLM
→ Settings menu > LLM Configuration

### J'ai un problème CORS
→ Settings > ComfyUI Configuration (voir banner CORS)

### Je cherche la documentation complète
→ [docs/COMFYUI_DOCS_INDEX.md](./docs/COMFYUI_DOCS_INDEX.md)

### Je veux comprendre l'architecture
→ [SETTINGS_UNIFICATION_COMPLETE.md](./SETTINGS_UNIFICATION_COMPLETE.md)

### Je veux un résumé visuel
→ [SETTINGS_UNIFICATION_VISUAL_SUMMARY.md](./SETTINGS_UNIFICATION_VISUAL_SUMMARY.md)

## 📞 Support

Pour toute question:
1. Consulter cette documentation
2. Vérifier les messages informatifs dans l'UI
3. Consulter les logs de développement
4. Ouvrir une issue GitHub

---

**Dernière mise à jour**: Janvier 2026
**Version**: 1.0.0
**Statut**: ✅ Complet et à jour
