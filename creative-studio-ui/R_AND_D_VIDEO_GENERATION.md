# Plan R&D : Moteur de Génération et Édition Vidéo (Style CapCut/Canva)

Ce document présente l'analyse des lacunes et le plan de mise en œuvre pour
transformer le **Sequence Editor** en un véritable éditeur vidéo non-linéaire
capable de générer des vidéos, d'utiliser des templates avancés et de
manipuler des alphas/masques.

---

## État d'avancement

| Phase | Statut | Détails |
| :--- | :---: | :--- |
| Phase 1 — Architecture de Rendu & Compositing | ✅ **Fait** | FFmpegRenderService, ElectronFFmpegBridge, types VideoMask/VideoEffects |
| Phase 2 — Outils d'Édition Vidéo Avancés | ✅ **Fait** | VideoEffectsPanel, BackgroundRemovalService |
| Phase 3 — Textes & Templates Utilisables | ✅ **Fait** | Rich Text dans LayerProperties, CompositionTemplateService, TemplateBrowser |
| Phase 4 — Pipeline de Génération Finale | ✅ **Fait** | Electron IPC (main.js + preload.js), Export Save Dialog, Bridge client-side |
| Phase 5 — Intégration dans le Layout | ✅ **Fait** | Onglets "Video FX" et "Templates" dans SequenceEditor |

---

## 1. Fichiers Créés / Modifiés

### ✅ Backend — Services

| Fichier | Description |
| :--- | :--- |
| `src/services/ffmpeg/FFmpegRenderService.ts` | Pipeline de rendu FFmpeg complet. Construit un filtergraph complexe (overlay, drawtext, chromakey, eq, amix). Utilise le bridge Electron IPC quand disponible, sinon mode simulation. |
| `src/services/ffmpeg/ElectronFFmpegBridge.ts` | **NOUVEAU** — Pont client-side vers Electron IPC. Expose `render()`, `cancelRender()`, `probeMedia()`, `showExportSaveDialog()`, `checkRembgAvailability()`, `runRembg()`. |
| `src/services/ffmpeg/FFmpegTypes.ts` | Existant — Types FFmpeg complets (VideoFormat, ExportSettings, FilterGraph, etc.) |
| `src/services/templates/CompositionTemplateService.ts` | Service CRUD pour les "Composition Templates". 3 templates built-in. Création depuis une sélection + instanciation. |
| `src/services/ai/BackgroundRemovalService.ts` | Service "Magic Cut" pour le détourage. 3 backends (rembg, ComfyUI SAM, Cloud). Batch pour frames vidéo. |

### ✅ Electron — Main Process & IPC

| Fichier | Description |
| :--- | :--- |
| `electron/main.js` | **MODIFIÉ** — Ajout de 7 handlers IPC : `ffmpeg:run`, `ffmpeg:cancel`, `ffmpeg:probe`, `ffmpeg:check`, `ffmpeg:save-dialog`, `rembg:check`, `rembg:run`. Gestion des processus FFmpeg actifs avec progression en temps réel via `ffmpeg:progress`. |
| `electron/preload.js` | **NOUVEAU** — Script de préchargement exposant `window.electronAPI` avec méthodes typées pour FFmpeg et rembg. |

### ✅ Frontend — Composants UI

| Fichier | Description |
| :--- | :--- |
| `src/sequence-editor/SequenceEditor.tsx` | **MODIFIÉ** — Ajout des onglets "Video FX" et "Templates" dans le panneau droit. Import et câblage de `VideoEffectsPanel` et `CompositionTemplateBrowser`. |
| `src/sequence-editor/components/VideoEffectsPanel/VideoEffectsPanel.tsx` | Panel d'effets vidéo : Masque (AI + formes), Chroma Key, Correction couleur, Flou. |
| `src/sequence-editor/components/VideoEffectsPanel/videoEffectsPanel.css` | Styles dark theme. |
| `src/sequence-editor/components/CompositionTemplateBrowser/CompositionTemplateBrowser.tsx` | Navigateur de templates avec filtrage, recherche, hover preview, insertion. |
| `src/sequence-editor/components/CompositionTemplateBrowser/compositionTemplateBrowser.css` | Styles grille + hover. |
| `src/sequence-editor/components/LayerPropertiesPanel/LayerPropertiesPanel.tsx` | **MODIFIÉ** — Section "Text Style" pour calques texte. |

### ✅ Types — Modèle de Données

| Fichier | Description |
| :--- | :--- |
| `src/sequence-editor/types/index.ts` | **MODIFIÉ** — `VideoMask`, `VideoEffects`, `RichTextStyle`, extension de `MediaLayerData` et `TextLayerData`. |

---

## 2. Architecture Complète du Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     RENDERER PROCESS (React)                     │
│                                                                  │
│  ┌──────────────────┐  ┌─────────────────────┐                  │
│  │ VideoEffectsPanel │  │CompositionTemplate  │                  │
│  │  (Masks, Chroma,  │  │    Browser          │                  │
│  │   Color, Blur)    │  │  (Insert templates) │                  │
│  └────────┬─────────┘  └─────────┬───────────┘                  │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌──────────────────────────────────────┐                       │
│  │        Redux Store (Timeline)         │                       │
│  │   Shots → Layers → LayerData          │                       │
│  └────────────────┬─────────────────────┘                       │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────┐                       │
│  │     FFmpegRenderService              │                       │
│  │  • flattenTimeline()                  │                       │
│  │  • buildComplexFiltergraph()          │                       │
│  │  • buildMediaLayerFilters()           │                       │
│  │  • buildDrawtextFilter()              │                       │
│  └────────────────┬─────────────────────┘                       │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────┐                       │
│  │     ElectronFFmpegBridge             │                       │
│  │  • render() → ipcRenderer.invoke()    │                       │
│  │  • probeMedia()                       │                       │
│  │  • showSaveDialog()                   │                       │
│  │  • onRenderProgress()                 │                       │
│  └────────────────┬─────────────────────┘                       │
│                   │ IPC                                           │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS (Electron)                      │
│                                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │   ipcMain handlers (main.js)          │                        │
│  │  • ffmpeg:run → spawn('ffmpeg', ...)  │                        │
│  │  • ffmpeg:cancel → proc.kill()        │                        │
│  │  • ffmpeg:probe → execFile('ffprobe') │                        │
│  │  • ffmpeg:check → ffmpeg -version     │                        │
│  │  • ffmpeg:save-dialog → dialog.show() │                        │
│  │  • rembg:check → rembg --version      │                        │
│  │  • rembg:run → spawn('rembg', ...)    │                        │
│  └──────────────────────────────────────┘                        │
│                                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │   preload.js                          │                        │
│  │  → window.electronAPI                  │                        │
│  └──────────────────────────────────────┘                        │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Spécifications Techniques

### Structure de Données Layer

```typescript
interface MediaLayerData {
  sourceUrl: string;
  trim: { start: number; end: number };
  transform: Transform;
  mask?: VideoMask;      // shape, image, alpha (AI)
  effects?: VideoEffects; // chromaKey, colorCorrection, blur
}

interface VideoMask {
  type: 'shape' | 'image' | 'alpha';
  source?: string;
  invert?: boolean;
}

interface VideoEffects {
  chromaKey?: { color: string; similarity: number };
  colorCorrection?: { brightness: number; contrast: number; saturation: number; hue: number };
  blur?: number;
}

interface TextLayerData {
  content: string;
  style: RichTextStyle;
  transform: Transform;
  animation?: TextAnimation;
}

interface RichTextStyle {
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  padding?: number;
  textAlign?: 'left' | 'center' | 'right';
}
```

### Commande FFmpeg Cible

```bash
ffmpeg -i bg.mp4 -i character.mp4 \
  -filter_complex "
    color=c=black:s=1920x1080:d=10[base];
    [0:v]scale=1920:1080[bg];
    [base][bg]overlay=0:0:enable='between(t,0,10)'[comp0];
    [1:v]chromakey=0x00FF00:0.4:0.1[ck1];
    [ck1]format=rgba,colorchannelmixer=aa=0.9[alpha1];
    [comp0][alpha1]overlay=200:100:enable='between(t,1,8)'[comp1];
    [comp1]drawtext=text='Title':fontsize=72:fontcolor=white:x=960:y=100[out]
  " \
  -map "[out]" -c:v libx264 -preset medium -crf 23 -y output.mp4
```

---

## 4. Ce qui reste à faire (améliorations futures)

| Fonctionnalité | Priorité | Détails |
| :--- | :---: | :--- |
| Preview canvas 2D temps réel (PixiJS/Fabric.js) | 🟡 Moyenne | Le preview actuel ne rend pas masques/effets en live |
| Drag & Drop templates sur la timeline | 🟡 Moyenne | Glisser un template à un point précis |
| Éditeur de texte WYSIWYG inline | 🟡 Moyenne | Double-clic sur un calque texte pour l'éditer |
| Speed control par clip | 🟢 Basse | 0.25x à 4x |
| Proxy media basse résolution | 🟢 Basse | Édition fluide puis rendu haute qualité |
| Export Queue persistante | 🟢 Basse | Survit aux redémarrages |
| ComfyUI SAM workflow intégré | 🟡 Moyenne | Workflow SegmentAnything dans BackgroundRemovalService |
| Transitions xfade/blend | 🟡 Moyenne | Filtres FFmpeg xfade entre clips |
