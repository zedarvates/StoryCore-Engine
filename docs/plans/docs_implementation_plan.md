# Inspirations et Améliorations pour StoryCore-Engine (Vidéo AI & Montage)

Ce document compile les inspirations tirées de l'analyse des ressources externes (DaVinci Resolve, CapCut, Hacks de Montage) pour améliorer les capacités vidéo et IA de **StoryCore-Engine**.

## 🚀 1. Automatisations IA (Inspirations DaVinci & CapCut)

L'objectif est de réduire le temps de montage manuel en utilisant des modèles IA spécifiques.

| Fonctionnalité Inspiration | Description | Application StoryCore |
| :--- | :--- | :--- |
| **Ripple Delete Silence** | Suppression automatique des silences dans les dialogues. | Nettoyage automatique des narrations générées ou enregistrées. |
| **AI Music Remix/Editor** | Ajustement transparent de la durée d'une musique sans couper brutalement (Live Trim). | Adaptation automatique de la bande son à la durée du scénario généré. |
| **Beat-Synced Editing** | Marquage visuel des beats pour caler les changements de scène. | Synchronisation automatique des transitions "cut" avec le rythme de la musique de fond. |
| **Magic Mask / Rotoscopie** | Isolation automatique d'un sujet (personnage) en un clic. | Permettre de placer du texte ou des effets visuels derrière les personnages sans masque manuel. |
| **AI Voice Isolation** | Suppression du bruit de fond et isolation de la voix. | Améliorer la clarté des dialogues enregistrés par l'utilisateur ou générés. |
| **Smooth Cut Transition** | Utilisation de l'IA pour créer des frames intermédiaires entre deux coupes (évite les jump cuts). | Rendre les transitions entre deux prises de vue générées plus fluides. |
| **Character Consistency Sheets** | Génération de planches d'images (face, profil, dos) pour un personnage. | Garantir que le visage et les habits du personnage ne changent pas entre deux scènes. |
| **Multi-Angle Camera AI** | Demander à l'IA la même scène sous différents angles (plongée, drone, contre-plongée). | Créer des montages dynamiques sans multiplier les prompts de base. |

## 🎨 2. Esthétique & Rendu Cinématographique

Inspirations pour donner un look "professionnel" instantané aux vidéos produites par StoryCore.

- **Hellation / Bloom Effect**: Ajouter un halo lumineux autour des sources de lumière pour un look pellicule anamorphique.
- **Color Isolation (HSL Qualifier)**: Outil simplifié pour isoler une couleur (ex: rouge uniquement) et désaturer le reste pour un effet stylistique fort (Style Sin City / Pub Luxe).
- **Face Tracking Dynamique**: Verrouillage de la caméra sur le visage du personnage principal pour créer des plans "POV" ou des suivis sportifs/dynamiques.
- **Vignette & Grain de Pellicule**: Intégration par défaut de réglages de contraste et de grain pour simuler différents styles de caméras.
- **3D-to-AI Layout Rendering**: Utiliser une mise en scène 3D simplifiée (depth map/outline) comme "guide" pour l'IA afin de générer des visuels complexes avec gestion physique (fumée, eau, débris).
- **Style Visual Correlation (Thumbnail hook)**: Animer une miniature (Thumbnail) pour les premières secondes de la vidéo afin de créer une accroche visuelle immédiate.

## 🛠️ 3. Améliorations du Workflow (Productivité)

- **Transcription-Based Navigation**: Pouvoir cliquer sur un mot dans la transcription pour aller directement au moment exact sur la timeline.
- **Soundly "Place It" (Environnements Audio)**: Appliquer instantanément des filtres pour simuler que le son vient d'un téléphone, d'un stade, d'une grotte, etc. (Audio Worldization).
- **Presets d'Animation sans Keyframes**: Proposer des animations pré-configurées (Whip, Spin, Zoom intelligent) que l'utilisateur glisse sur ses éléments.
- **Keyframe System Simplifié**: Permettre de poser des points clés manuels pour l'opacité, l'échelle (zoom) et la position directement dans l'UI.
- **Auto-Ducking Audio**: Baisser automatiquement le volume de la musique de fond au passage d'une narration ou d'un dialogue.
- **AI Start-to-End Frame**: Générer une animation fluide entre deux poses de combat ou deux situations clés définies par l'utilisateur.

## 📋 4. Plan de Mise en Œuvre Suggéré

### Phase 1: Core Efficiency (Gain immédiat) - ✅ RÉUSSIE

1. **Auto-Trim Silence**: ✅ Implémenté dans `ffmpeg_service.py` et exposé via `/api/ai/audio/auto-trim`.
2. **Beat Detection**: ✅ Implémenté via `librosa/energy-based` dans `ai_audio_service.py` et exposé via `/api/ai/audio/detect-beats`.
3. **Hellation Plugin**: ✅ Ajouté comme type d'amélioration dans `video_enhancement_service.py` et exposé via `/api/ai/enhance`.

### Phase 2: Cinematic Workflow - ✅ NOUVELLE IMPLÉMENTATION

1. **Transcription-Based Navigation**: ✅ Service `TranscriptionService` dans `ai_audio_service.py` avec support Whisper/Vosk.
   - Endpoint: `/api/ai/audio/transcribe` - Transcription avec timestamps mot par mot
   - Endpoint: `/api/ai/audio/transcribe/search` - Recherche dans la transcription
   - Endpoint: `/api/ai/audio/transcribe/timestamp` - Obtention du timestamp d'un mot
2. **Beat-Synced Editing**: ✅ `get_beat_aligned_cuts()` dans `BeatDetectionService` pour aligner les coupes sur les beats.
   - Endpoint: `/api/ai/audio/beat-aligned-cuts` - Calcul des points de coupe alignés
3. **Audio Worldization**: ✅ Service `AudioWorldizationService` pour simuler des environnements audio.
   - Endpoint: `/api/ai/audio/worldize` - Application d'effets d'environnement
   - Environnements: phone, stadium, cave, concert_hall, small_room, bathroom, car, forest, underwater

### Phase 3: Advanced Editing Features - ✅ NOUVELLE IMPLÉMENTATION

1. **Smooth Cut Transition**: ✅ Service `SmoothCutService` pour créer des transitions fluides entre coupes.
   - Endpoint: `/api/ai/video/smooth-cut` - Création de transition smooth entre deux vidéos
   - Endpoint: `/api/ai/video/interpolate-frames` - Interpolation de frames pour motion fluide
2. **Face Tracking Dynamique**: ✅ Service `SmartCropService` avec détection MediaPipe/OpenCV.
   - Endpoint: `/api/ai/video/smart-crop` - Recadrage intelligent avec suivi de visage
   - Endpoint: `/api/ai/video/detect-faces` - Détection des visages dans une vidéo
3. **Multi-Angle Camera AI**: ✅ Service `MultiAngleService` pour génération de prompts multi-angles.
   - Endpoint: `/api/ai/video/multi-angle` - Génération de prompts pour différents angles
   - Endpoint: `/api/ai/video/shot-list` - Génération de shot list complet
   - Endpoint: `/api/ai/video/camera-angles` - Liste des angles disponibles
   - Endpoint: `/api/ai/video/scene-sequences/{scene_type}` - Séquences recommandées par type

### Phase 4: Audio Mastering & Cinematic Polish - ✅ RÉUSSIE

1. **Auto-Ducking Audio**: ✅ Service `AutoDuckingService` avec sidechain compression FFmpeg.
   - Endpoint: `/api/ai/audio/auto-duck` - Ducking automatique musique/dialogue
   - Endpoint: `/api/ai/audio/auto-duck-video` - Ducking sur vidéo avec voix détectée
   - Endpoint: `/api/ai/audio/detect-speech-segments` - Détection des segments de parole
2. **AI Voice Isolation**: ✅ Service `AudioCleaningService` avec plusieurs méthodes.
   - Endpoint: `/api/ai/audio/isolate-voice` - Isolation vocale (spectral/wiener/demucs)
   - Endpoint: `/api/ai/audio/reduce-noise` - Réduction de bruit simple
3. **Color Isolation (HSL Qualifier)**: ✅ Filtre `hsvhold` FFmpeg dans `VideoEnhancementService`.
4. **Smart Pan & Scan**: ✅ Service `SmartCropService` avec suivi MediaPipe/OpenCV.
5. **Dynamic Vignette & Grain**: ✅ Textures cinéma via `_apply_vignette_grain`.

### Phase 5: Multi-Angle & Character Consistency - ✅ RÉUSSIE

1. **Multi-Angle Camera AI**: ✅ Service `MultiAngleService` complet.
2. **Character Consistency Sheets**: ✅ Service `CharacterConsistencyService` complet.
   - Endpoint: `/api/ai/video/character-sheet` - Génération de prompts pour character sheet
   - Endpoint: `/api/ai/video/consistency-prompt` - Prompt avec référence pour cohérence
   - Endpoint: `/api/ai/video/turnaround-prompt` - Prompt pour turnaround sheet
   - Endpoint: `/api/ai/video/character-views` - Vues disponibles
   - Endpoint: `/api/ai/video/expressions` - Expressions disponibles
3. **Image Preview Integration**: ✅ Boutons interactifs dans `ImagePreviewPanel.tsx`.

### Phase Performance & Exports - ✅ RÉUSSIE

1. **GPU Acceleration (NVIDIA/AMD/Intel)**: ✅ Détection matérielle et encodeurs `nvenc/amf/qsv` dans `GPUService`.
2. **Transparents Export (WebM Alpha)**: ✅ Support WebM avec canal alpha.
3. **Sprite Generation**: ✅ `SpriteService` pour extraction automatique.
4. **Global AI Cache**: ✅ `AICacheService` pour éviter les re-calculs.

### Phase 6: Creative Tools & Workflow Enhancement - ✅ NOUVELLE IMPLÉMENTATION

1. **Animation Presets sans Keyframes**: ✅ Service `AnimationPresetsService` avec 18 presets prêts à l'emploi.
   - Endpoint: `/api/ai/creative/animate` - Application de preset à image/vidéo
   - Endpoint: `/api/ai/creative/animations` - Liste des presets disponibles
   - Presets: zoom_in, zoom_out, spin, ken_burns, whip_pan, pulse, shake, glitch, flash, bounce, fade, dissolve, etc.
   - Catégories: transition, motion, effect, entrance, exit

2. **AI Start-to-End Frame (Pose Interpolation)**: ✅ Service `AIPoseInterpolationService` pour animation entre poses.
   - Endpoint: `/api/ai/creative/pose-interpolate` - Création d'animation entre deux poses
   - Endpoint: `/api/ai/creative/pose-detect` - Détection de keypoints MediaPipe
   - Endpoint: `/api/ai/creative/pose-prompts` - Génération de prompts pour animation
   - Support MediaPipe pour détection de 33 points du corps

3. **AI Music Remix**: ✅ Service `AIMusicRemixService` pour adaptation de durée musicale.
   - Endpoint: `/api/ai/creative/music-remix` - Remix intelligent
   - Endpoint: `/api/ai/creative/music-analyze/{path}` - Analyse BPM et sections
   - Endpoint: `/api/ai/creative/music-stretch` - Time-stretch avec préservation du pitch
   - Modes: stretch, cut, remix, loop
   - Détection automatique du BPM avec librosa

4. **Thumbnail Hook Animation**: ✅ Service `ThumbnailHookService` pour miniatures animées.
   - Endpoint: `/api/ai/creative/thumbnail-hook` - Création de miniature animée
   - Endpoint: `/api/ai/creative/thumbnail-animations` - Types d'animation disponibles
   - Animations: zoom_breath, parallax, pulse, glitch, ken_burns
   - Support ajout de texte avec position configurable

### Phase 7: Advanced AI Tools - ✅ NOUVELLE IMPLÉMENTATION

1. **Magic Mask / Rotoscopie**: ✅ Service `MagicMaskService` pour isolation automatique de sujets.
   - Endpoint: `/api/ai/advanced/mask/generate` - Génération de masque pour image
   - Endpoint: `/api/ai/advanced/mask/rotoscope` - Rotoscopie complète de vidéo
   - Endpoint: `/api/ai/advanced/mask/types` - Types de masques disponibles
   - Types: person, face, body, hair, hands, background
   - Support MediaPipe selfie segmentation et OpenCV GrabCut

2. **Depth Map Generation**: ✅ Service `DepthMapService` pour cartes de profondeur.
   - Endpoint: `/api/ai/advanced/depth-map` - Génération de depth map
   - Endpoint: `/api/ai/advanced/depth-prompt` - Prompt pour génération guidée
   - Méthodes: simple (gradients), midas (MiDaS neural network)
   - Support PyTorch/MiDaS pour estimation précise

3. **Bloom/Anamorphic Effect**: ✅ Service `BloomEffectService` pour effets cinématiques.
   - Endpoint: `/api/ai/advanced/bloom` - Effet bloom lumineux
   - Endpoint: `/api/ai/advanced/anamorphic-flare` - Flare anamorphique
   - Endpoint: `/api/ai/advanced/bloom-presets` - Présets disponibles
   - Intensités: subtle, moderate, strong, anamorphic

4. **AI Subtitle Generator**: ✅ Service `AISubtitleService` avec Whisper.
   - Endpoint: `/api/ai/advanced/subtitles/generate` - Génération et burn
   - Endpoint: `/api/ai/advanced/subtitles/transcribe` - Transcription seule
   - Endpoint: `/api/ai/advanced/subtitles/translate` - Traduction de sous-titres
   - Endpoint: `/api/ai/advanced/subtitle-styles` - Styles disponibles
   - Styles: default, netflix, youtube, cinematic, minimal, bold, outline, glow

5. **Background Replacement**: ✅ Service `BackgroundReplacementService`.
   - Endpoint: `/api/ai/advanced/background/replace` - Remplacement de fond
   - Endpoint: `/api/ai/advanced/background/colors` - Couleurs prédéfinies
   - Support image ou couleur comme nouveau fond
   - Color matching et lighting matching automatiques

### Phase 8: UI Integration - ✅ NOUVELLE IMPLÉMENTATION

1. **AnimationPresetsPanel**: ✅ Composant React pour drag & drop de presets d'animation.
   - 18 presets disponibles (zoom_in, spin, ken_burns, glitch, etc.)
   - Configuration durée, intensité, easing
   - Catégories: motion, transition, effect, entrance, exit

2. **MagicMaskTool**: ✅ Composant React pour isolation de sujet en un clic.
   - Types: person, face, body, background
   - Edge refinement et feathering
   - Manual refinement avec brush tools

3. **SubtitleEditor**: ✅ Composant React pour génération de sous-titres AI.
   - Styles: default, netflix, youtube, cinematic, etc.
   - Customisation: font size, colors, outline
   - Traduction automatique

### Phase 9: Performance & Production - ✅ NOUVELLE IMPLÉMENTATION

1. **WebSocket Progress Manager**: ✅ Service `WebSocketProgressManager` pour suivi temps réel.
   - Endpoint: `/api/ai/performance/jobs/create` - Création de job
   - Endpoint: `/api/ai/performance/jobs/{job_id}` - Statut du job
   - Endpoint: `/api/ai/performance/jobs/{job_id}/progress` - Mise à jour progression
   - Callbacks pour notifications temps réel

2. **AI Cache Service**: ✅ Service `AICacheService` pour cache intelligent.
   - Endpoint: `/api/ai/performance/cache/stats` - Statistiques cache
   - Endpoint: `/api/ai/performance/cache/get` - Récupération cached
   - Endpoint: `/api/ai/performance/cache/set` - Mise en cache
   - Endpoint: `/api/ai/performance/cache/invalidate` - Invalidation
   - Memory cache + disk cache avec TTL configurable

3. **Batch Processing Service**: ✅ Service `BatchProcessingService` pour traitement parallèle.
   - Endpoint: `/api/ai/performance/batch/process` - Traitement batch
   - Endpoint: `/api/ai/performance/batch/{batch_id}` - Statut batch
   - Parallel processing avec semaphore
   - Progress callbacks

4. **Job Queue Service**: ✅ Service `JobQueueService` pour queue asynchrone.
   - Endpoint: `/api/ai/performance/queue/submit` - Soumettre job
   - Endpoint: `/api/ai/performance/queue/{job_id}` - Statut job
   - Endpoint: `/api/ai/performance/queue/stats` - Statistiques queue
   - Priority queue avec workers configurables

### Phase 10: Pro Features - ✅ NOUVELLE IMPLÉMENTATION

1. **Color Grading & LUTs**: ✅ Service `ColorGradingService` pour étalonnage professionnel.
   - Endpoint: `/api/ai/pro/color-grade` - Application color grading
   - Endpoint: `/api/ai/pro/color-grade/presets` - Liste des presets
   - Endpoint: `/api/ai/pro/color-grade/luts` - Liste des LUTs disponibles
   - Presets: cinematic, vintage, teal_orange, noir, warm, cool, hdr
   - Support LUT .cube, .3dl, .mga, .csp
   - Ajustements: contrast, saturation, gamma, temperature, tint

2. **Speed Ramping**: ✅ Service `SpeedRampingService` pour variations de vitesse.
   - Endpoint: `/api/ai/pro/speed-ramp` - Application speed ramping
   - Endpoint: `/api/ai/pro/speed-ramp/curve` - Génération courbe
   - Types: linear, ease_in, ease_out, ease_in_out, exponential
   - Preserve pitch et frame interpolation

3. **AI Scene Detection**: ✅ Service `SceneDetectionService` pour détection de scènes.
   - Endpoint: `/api/ai/pro/scene-detect` - Détection de scènes
   - Endpoint: `/api/ai/pro/scene-detect/methods` - Méthodes disponibles
   - Méthodes: threshold, content (OpenCV), adaptive
   - Export JSON des timestamps

4. **Keyframe System Backend**: ✅ Service `KeyframeService` pour animations.
   - Endpoint: `/api/ai/pro/keyframes/add` - Ajouter keyframe
   - Endpoint: `/api/ai/pro/keyframes/value` - Valeur interpolée
   - Endpoint: `/api/ai/pro/keyframes/tracks` - Liste des tracks
   - Endpoint: `/api/ai/pro/keyframes/export` - Export JSON
   - Easing: linear, ease_in, ease_out, ease_in_out, bezier
   - Interpolation: linear, step, bezier

### Phase 11: Workflow Orchestration - ✅ NOUVELLE IMPLÉMENTATION

1. **Pipeline Chaining**: ✅ Service `AIWorkflowOrchestrator` pour enchaîner les opérations AI.
   - Endpoint: `/api/ai/workflow/run` - Lancer un workflow
   - Endpoint: `/api/ai/workflow/{workflow_id}` - Statut du workflow
   - Endpoint: `/api/ai/workflow/templates/available` - Templates prédéfinis
   - 30+ types d'étapes disponibles

2. **Step Types**: ✅ 30+ types d'étapes supportées.
   - **Generation**: generate_image, generate_video, generate_audio, generate_music, generate_voiceover
   - **Identity**: extract_identity, apply_identity, character_sheet
   - **Video**: color_grade, apply_vfx, add_subtitles, speed_ramp, smooth_cut
   - **Audio**: auto_duck, isolate_voice, beat_sync, audio_worldize
   - **AI Tools**: magic_mask, depth_map, scene_detect, background_replace
   - **Animation**: animation_preset, pose_interpolate, thumbnail_hook
   - **Post-Production**: lip_sync, batch_render, export_final

3. **Control Flow**: ✅ Étapes de contrôle de flux.
   - **PARALLEL_GROUP**: Exécuter plusieurs étapes en parallèle
   - **CONDITIONAL**: Branchement conditionnel (if/else)
   - **WAIT**: Attente durée ou autre workflow

4. **Predefined Templates**: ✅ 7 templates prêts à l'emploi.
   - `cinematic_hero`: Generate → Extract → Video → Color Grade → Export
   - `batch_promo`: Extract Identity → Batch Render → Color Grade → Export
   - `music_video`: Generate → Beat Sync → VFX → Color Grade → Export
   - `social_content`: Generate → Subtitles → Thumbnail Hook → Export
   - `full_production`: Pipeline complet 8 étapes
   - `parallel_audio_video`: Traitement parallèle audio/vidéo
   - `conditional_vfx`: VFX conditionnel

5. **Condition Evaluation**: ✅ Syntaxe de conditions.
   - `context.video_path exists` - Vérifier existence
   - `context.identity_id == 'abc123'` - Égalité
   - `context.duration > 60` - Comparaison numérique
   - `context.status in ['completed', 'pending']` - Appartenance

---

> [!TIP]
> De nombreuses fonctionnalités comme le **Color Grading** et le **VFX Node-based** sont déjà esquissées dans le `PLAN_DAVINCI_RESOLVE_INTEGRATION.md`. L'ajout de ces "micro-fonctionnalités" d'automatisation (Speed Warp, Remix Audio) rendra l'outil StoryCore beaucoup plus accessible pour les non-monteurs.
