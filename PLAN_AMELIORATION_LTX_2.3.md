# Plan d'Amélioration StoryCore-Engine : LTX 2.3 & Nano Banana 2 (Édition Cinéma)

Ce document détaille la stratégie pour transformer StoryCore-Engine en une suite de production cinématographique de pointe, en se concentrant sur le contrôle artistique et la fidélité visuelle.

## 1. Intégration de LTX 2.3 : Vidéo & Audio Nadi-Synchronisés

LTX 2.3 est notre moteur multimédia principal pour le rendu cinématographique.

### Objectifs Techniques

- **Fusion Audio-Vidéo** : Workflow natif LTX 2.3 où le son est généré simultanément dans l'espace latent. [MOTEUR PRET ✅]
- **Support CinemaScope Natif** : Utilisation du ratio 2.35:1 natif pour une composition large sans perte. [TERMINE ✅]
- **Optimisation VRAM** : Modèles GGUF et FPA pour production 4K sur GPU RTX. [INTEGRE ✅]

### Actions Immédiates

1. **Service Backend** : Créer `LTXVideoService` dans `backend/ltx_service.py` [TERMINE ✅].
2. **UI Update** : Panneau "Director Mode" avec support complet des ratios et de l'audio [TERMINE ✅].
3. **Audio Prompts** : Champ "Atmosphere Layout" dans le Director Mode [TERMINE ✅].

---

## 2. Nano Banana 2 : Réalité Groundée & Haute Fidélité

Assurer que chaque plan respecte la logique du monde réel et la consistance du film.

### Mode "Historien & Régisseur" (Grounding Visual)

- **Intégration Gemini + Search** : Recherche automatique de données historiques pour enrichir les prompts. [TERMINE ✅]
- **Bénéfice** : Fidélité historique et architecturale absolue pour les films d'époque.

### Consistance Extrême (ADN Locking)

- **Object Lock** : Verrouillage jusqu'à 14 objets critiques et 5 personnages. [TERMINE ✅]
- **Ciné-Coverage** : Génération des 4 angles de base (Master, Close-up, OTS A/B) avec consistance ADN. [TERMINE ✅]

---

## 3. Post-Production Sémantique (Filmmaking Focus)

Modifier et enrichir les plans sans avoir à tout regénérer.

### Kiwiedit : Prop Swapping

- Remplacer des objets dans un clip existant (ex: changer une arme, un vêtement). [MOTEUR PRET ✅]

### Hi-Fi Paint : Precision Placement

- **Product Placement** : Insérer des accessoires de haute qualité avec un rendu neural "Deep Fuse" respectant le grain et le focus. [TERMINE ✅]
- **Validation** : Démo d'insertion ultra-réaliste validée. [OK ✅]

---

## 4. Accélération & Optimisation (Performance)

### Spectrum : Speedup 3.5x

- Accélération ByteDance intégrée pour des retours Director immédiats. [INTEGRE ✅]

### CUDA Agent : Optimisation 4K

- **Low-Level Tuning** : TF32, SDPA (Flash Attention) et allocation de mémoire optimisée pour les latents 4K. [TERMINE ✅]
- **Monitoring** : Statut GPU en temps réel intégré dans l'UI du Director Mode. [TERMINE ✅]

---

> [!IMPORTANT]
> Le StoryCore-Engine est désormais une plateforme de production cinématographique "Full-Stack AI", incluant la recherche, la mise en scène, la couverture multi-angle, l'édition sémantique et l'optimisation matérielle.
