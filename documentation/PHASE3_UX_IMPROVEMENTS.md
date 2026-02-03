# Phase 3: Menu & UX Improvements

**Date:** Janvier 2026  
**Priorité:** HAUTE

## Progression

- [x] Phase 1: TypeScript Build - Terminé
- [x] Phase 2: World Wizard LLM - Terminé
- [ ] Phase 3: Menu & UX Improvements

## Tâches Phase 3

### 3.1 ChatBox UX Enhancements ✅ TERMINÉ
- [x] Add smooth animations for open/close/minimize
- [x] Implement dashboard-context aware positioning (getContextAwarePosition)
- [x] Add draggable constraints to keep panel in viewport
- [x] Add maximize/restore functionality (double-click header)
- [x] Add keyboard shortcuts indicator (?) button
- [x] Dynamic max size based on viewport
- [x] Unused imports cleanup

### 3.2 Menu Improvements ✅ TERMINÉ
- [x] Add keyboard shortcuts display in menu items (already exists via `shortcut` prop)
- [x] Create KeyboardShortcutsDialog component with complete reference
- [x] Add `onShowShortcuts` prop to MenuBar for dialog trigger
- [x] Improve accessibility (ARIA labels)

### 3.3 Timeline Controls Enhancement
- [ ] Add zoom in/out controls
- [ ] Add timeline ruler with clickable time markers
- [ ] Add snapping to grid for shots
- [ ] Improve visual feedback for selected shots

### 3.4 AssetPanel Improvements
- [ ] Add grid/list view toggle
- [ ] Add bulk operations (delete, move, organize)
- [ ] Add drag & drop support
- [ ] Add asset preview modal

## Progression

- [x] Phase 1: TypeScript Build - Terminé
- [x] Phase 2: World Wizard LLM - Terminé
- [x] Phase 3.1: ChatBox UX Enhancements - Terminé
- [x] Phase 3.2: Menu Improvements - Terminé
- [ ] Phase 3.3: Timeline Controls - En attente
- [ ] Phase 3.4: AssetPanel - En attente

## Production TTS Manquantes

### Analyse des Providers TTS Actuels

Le service TTS actuel (`src/services/ttsService.ts`) implémente:

| Provider | Statut | Description |
|----------|--------|-------------|
| MockTTSProvider | ✅ Implémenté | Web Speech API + fallback audio généré |
| ElevenLabsTTSProvider | ✅ Implémenté | API ElevenLabs (configuration requise) |

### Production SAPI (Windows Speech API) - ✅ CRÉÉ ✅

**Fichier créé:** `src/services/sapiTTSProvider.ts`

Fournit:
- Intégration voix Windows SAPI via Web Speech API
- Support Coqui TTS (optionnel)
- Mapping automatique des voix par genre/langue
- Fallback vers mock voices si SAPI non disponible

### Production Qwen TTS - ✅ CRÉÉ ✅

**Fichier créé:** `src/services/qwenTTSProvider.ts`

Fournit:
- Support modèles Qwen2-Audio via Ollama
- Vérification disponibilité Ollama
- Présélections voix (male, female, narrator)
- Support multilingue (EN, FR, DE, ES, ZH, JA, KO)
- Fallback Web Audio API si Ollama non disponible

### Priorités de Production TTS

| Priorité | Provider | Utilisation |
|----------|----------|-------------|
| 🔴 HAUTE | SAPI | Interface wizard Character utilise déjà "Voix SAPI" |
| 🟠 MOYENNE | Qwen TTS | Complément aux modèles Qwen LLM |
| 🟢 BASSE | Azure TTS | Alternative cloud Microsoft |
| 🟢 BASSE | Google TTS | Alternative cloud Google |

## Fichiers Créés/Modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/components/ChatPanel.tsx` | MODIFIÉ | Ajout maximize, shortcuts, animations |
| `src/components/MenuBar.tsx` | MODIFIÉ | Ajout prop `onShowShortcuts` |
| `src/components/KeyboardShortcutsDialog.tsx` | CRÉÉ | Dialogue complet des raccourcis |
| `src/services/sapiTTSProvider.ts` | CRÉÉ | Provider Windows SAPI TTS |
| `src/services/qwenTTSProvider.ts` | CRÉÉ | Provider Qwen2-Audio TTS |

```bash
# Build TypeScript
npm run build

# Tests
npm test

# Linting
npm run lint
```

