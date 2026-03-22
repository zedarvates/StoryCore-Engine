# 🎬 Plan d'Amélioration : Vidéo & Cinématique Avancée (StoryCore Engine)

Ce plan détaille les améliorations à apporter au projet StoryCore Engine, en s'inspirant des dernières avancées technologiques de **Kling AI 3.0**, **Wan 2.1/2.2**, et des workflows **ComfyUI (Tetestyle)**.

---

## 🚀 1. Intégration de Nouveaux Modèles de Vidéo

### 1.1 Support de Wan 2.1 / 2.2 (Via Wan2GP)
*   **Objectif :** Offrir une génération vidéo haute performance pour les configurations à VRAM limitée ("GPU Poor").
*   **Implémentation :**
    - Intégrer les nœuds ComfyUI pour Wan 2.1 dans le `comfyuiService.ts`.
    - Ajouter le support des modèles quantifiés (GGUF/NF4) pour permettre la génération en local sur des cartes grand public.
    - Utiliser l'architecture DiT (Diffusion Transformer) pour une meilleure cohérence spatio-temporelle.

### 1.2 Intégration API Kling 3.0
*   **Objectif :** Utiliser Kling 3.0 pour les plans "Hero" nécessitant la plus haute fidélité (visages, expressions, physique fluide).
*   **Fonctionnalités Clés :**
    - **Multishot Natif :** Générer des séquences de 10-15s avec plusieurs changements de plans automatiques tout en gardant la cohérence.
    - **Lip Sync Avancé :** Synchronisation labiale de haute qualité à partir d'audio généré par notre `ttsService`.

---

## 🎭 2. Système de Cohérence "Elements & Assets" (Inspiré de Kling 3.0)

### 2.1 Bibliothèque de Turnarounds Personnages
*   **Concept :** Créer un "Element" pour chaque personnage principal.
*   **Amélioration UI :** Ajouter un module dans le Character Creator pour générer une planche de référence (Face, Profil, 3/4, Top, Bottom).
*   **Usage :** Envoyer cette planche comme `Reference Element` aux modèles vidéo (via Omni Mode ou IP-Adapter dans ComfyUI) pour garantir que le personnage reste identique sous tous les angles.

### 2.2 Cohérence des Décors (World Assets)
*   **Concept :** Transformer les lieux créés dans le `World Builder` en "Background Elements" persistants.
*   **Technique :** Utiliser des ControlNets de profondeur ou des LoRAs de décors pour maintenir l'architecture du lieu entre les plans.

---

## 📸 3. Workflow de Séquençage "Multishot"

### 3.1 Éditeur de Scène Multishot
*   **Nouveau Composant :** `SceneSequenceEditor.tsx`
*   **Fonctionnalité :** Permettre de regrouper jusqu'à 6 shots dans une seule "Scène" de 15 secondes.
*   **Prompting Temporel :** Interface pour définir ce qui change entre les shots (ex: "Shot 1: Gros plan visage -> Shot 2: Elle se lève et part").

### 3.2 Contrôle de Mouvement (Motion Control)
*   **Motion Sliders :** Ajouter des curseurs pour l'intensité du mouvement (0-10) et la complexité de l'action.
*   **Camera Control UI :** Interface visuelle pour Panoramique (Pan), Zoom, Inclinaison (Tilt) et Roulis (Roll).
*   **Visual Reference :** Permettre l'upload d'une vidéo témoin (Motion Reference) pour guider le mouvement du personnage généré.

---

## 🔊 4. Audio & Lip Sync (Breaking the Sound Barrier)

### 4.1 Native Audio Generation
*   **Intégration Wan2GP/Kling Audio :** Générer automatiquement les bruits d'ambiance (foley) synchronisés avec l'action vidéo (ex: bruits de pas, vent, explosions).
*   **Pipeline :** `Prompt histoire -> Script -> TTS -> Video Gen -> Audio Sync -> Master Video`.

### 4.2 Module Lip Sync Dédié
*   **Correction Post-Gen :** Ajouter un outil de "Lip Sync Repair" qui prend une vidéo générée et ré-anime la bouche pour coller parfaitement à un nouveau fichier audio.

---

## 🛠️ 5. Améliorations Techniques & UX (StoryboardGenerator.tsx)

### 5.1 Preview Interactive
*   **Real-time Timeline :** Visualiser la durée totale de la séquence cinématique (jusqu'à 15s) avec les points de transition.
*   **Frame Extraction :** Outil pour extraire une image spécifique d'une vidéo générée pour s'en servir de base (Keyframe) pour le shot suivant.

### 5.2 Optimisation du Prompting "Cinématique"
*   **Template Tetestyle :** Intégrer des mots-clés spécifiques aux workflows cinématiques (lighting, lens data like '35mm', color grading styles).
*   **Aide LLM (Gemini/GPT) :** Utiliser l'assistant pour transformer un simple dialogue en un "Multi-shot Script" structuré avec mouvements de caméra.

---

## 📅 6. Priorités d'Action

| Priorité | Tâche | Impact | Difficulté |
| :--- | :--- | :--- | :--- |
| **P0** | Intégration Wan 2.1 via ComfyUI (Local/GPU Poor) | Très Haut | Moyen |
| **P1** | Génération de Turnarounds Personnages (Cohérence) | Haut | Moyen |
| **P1** | Pipeline Lip Sync (Voix -> Vidéo) | Haut | Élevé |
| **P2** | Éditeur Multishot (15s sequences) | Moyen | Moyen |
| **P3** | Contrôle Camera / Motion Reference | Moyen | Élevé |

---
**Note :** Ce plan complète le document existing `ANALYSE_ET_PLAN_IMPLEMENTATION.md` en se focalisant spécifiquement sur le saut technologique vers la génération vidéo de nouvelle génération (Kling/Wan).
