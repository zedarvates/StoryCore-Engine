# Synthèse des Améliorations LLM & Pipeline IA pour StoryCore-Engine

## ├─ Problem summary
L'intégration actuelle de StoryCore-Engine nécessite une transition d'une génération de contenu fragmentée vers un pipeline unifié "One-Prompt", capable de synchroniser la musique (Suno/Udio), le rendu 3D assisté par ControlNet (Blender Bridge) et la cohérence visuelle des personnages, tout en optimisant le storyboarding via des LLM multimodaux.

## ├─ Trade-offs table

| Critère | Performance | Complexité | Maintenabilité | Coût (API/GPU) |
| :--- | :--- | :--- | :--- | :--- |
| **Pipeline One-Prompt** | Élevée (automatisation) | Haute (orchestration) | Moyenne | Élevé (LLM Premium) |
| **ControlNet via Blender** | Moyenne (rendu local) | Très Haute | Basse (dépendances) | Faible (Local) |
| **Suno/Udio Integration** | Basse (latence API) | Moyenne | Haute | Moyen (Abonnement) |
| **Consistent Characters** | Moyenne | Haute | Moyenne | Moyen |

## ├─ Chosen solution + pourquoi les autres sont rejetées
La solution retenue est une **architecture modulaire basée sur des micro-services Python** (déjà présents dans `backend/`) orchestrés par un agent LLM central. 
- **Pourquoi pas un monolithe ?** Trop rigide pour l'évolution rapide des modèles IA (ex: passage de LTX2 à de nouveaux modèles).
- **Pourquoi Blender Bridge ?** Permet un contrôle spatial précis (Layouts 3D) que les générateurs vidéo "pure-AI" ne maîtrisent pas encore (cohérence physique).

## ├─ Résumé des inspirations
1.  **Génération de clips musicaux (Suno/Udio) :** Utilisation de prompts structurés pour générer des pistes audio synchronisées avec l'ambiance émotionnelle du script.
2.  **Pipeline "One-Prompt" :** Un seul prompt utilisateur génère le script, le storyboard, les assets et la musique.
3.  **Rendu IA via Layouts 3D (ControlNet) :** Utilisation de la profondeur (Depth) et des poses (OpenPose) extraites de Blender pour guider la génération d'images/vidéos.
4.  **Effets de clonage & Consistent Characters :** Techniques de LoRA ou d'IP-Adapter pour maintenir l'identité visuelle d'un personnage sur plusieurs scènes.

## ├─ Plan d'action par étapes (Roadmap)

### Phase 1 : Fondations (Court terme)
- [ ] Implémentation du module `backend/audio_api.py` pour le support des prompts musicaux.
- [ ] Création d'un template de prompt "Image-to-Script" pour le storyboarding assisté.

### Phase 2 : Intégration 3D (Moyen terme)
- [ ] Liaison entre `blender_bridge` et les ControlNets de ComfyUI.
- [ ] Automatisation de l'extraction de layouts 3D pour le rendu IA.

### Phase 3 : Cohérence & Transitions (Long terme)
- [ ] Mise en place d'un système de "Consistent Characters" via IP-Adapter.
- [ ] Développement de transitions IA fluides basées sur le flux optique.

## ├─ Exemples de prompts optimisés

### Style Visuel (Sin City / Noir)
> **Prompt:** "Cinematic noir style, high contrast, black and white with selective red color, deep shadows, rainy city streets, 8k resolution, inspired by Sin City, sharp details."

### Storyboarding Assisté (LLM)
> **Prompt:** "Act as a professional storyboard artist. Based on the following script segment: [TEXT], describe 3 camera angles using cinematic terminology (low angle, Dutch tilt, etc.) and provide visual descriptions for an AI image generator."

### Musique (Suno/Udio Style)
> **Prompt:** "Dark synthwave, 110 BPM, melancholic atmosphere, heavy bass, cinematic strings, futuristic cyberpunk vibe."

## └─ Next failure points + mitigation
- **Désynchronisation Audio/Vidéo :** Mitigation via l'utilisation de timestamps forcés dans le script segmenter.
- **Instabilité des ControlNets :** Mitigation par un fallback sur le rendu Blender standard si le score de confiance IA est trop bas.
- **Coûts API :** Mitigation par l'intégration de modèles locaux (Ollama/Local ComfyUI) pour les phases de draft.

---
*Certitude technique : 85%*  
*Estimation Runway : 450h de dev restantes*  
*Scénario d'échec probable : Complexité excessive de l'intégration Blender/ComfyUI entraînant une dette technique insurmontable.*
