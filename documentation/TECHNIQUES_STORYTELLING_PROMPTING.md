# Techniques de Storytelling et Prompting pour StoryCore-Engine

**Date**: 15 janvier 2026  
**Source**: Analyses critiques vidéo (`docs v3/`)

---

## 🎯 Objectif

Extraire et systématiser les techniques de storytelling identifiées dans les critiques professionnelles pour améliorer la génération de prompts et la structure narrative dans StoryCore-Engine.

---

## 📖 1. Structure Narrative en 3 Actes

**Source**: `Analyse_complete_critique_presentation_Combo.txt` (Vidéo Fear and Hunger)

### Acte 1: Contexte et Explication
**Durée**: 20-30% du contenu  
**Objectif**: Poser les bases sans ennuyer

```
✅ Faire:
- Expliquer les mécaniques essentielles
- Installer l'univers rapidement
- Créer des questions dans l'esprit du spectateur

❌ Éviter:
- Explications trop longues (> 30% du temps)
- Digressions personnelles excessives
- Redondances inutiles
```

**Application StoryCore**:
```python
# Prompt Template - Acte 1
prompt_act1 = """
Scene: Introduction
Duration: {duration * 0.25} seconds
Goal: Establish context quickly
Style: Dynamic, intriguing
Elements:
- Show the world/environment
- Introduce main character/concept
- Create a question or mystery
Avoid: Long explanations, static shots
"""
```

### Acte 2: Expérience et Émotion
**Durée**: 40-50% du contenu  
**Objectif**: Immerger le spectateur

```
✅ Faire:
- Montrer plutôt que dire
- Créer une expérience sensorielle
- Partager frustration/découverte/émotion
- Maintenir tension narrative

❌ Éviter:
- Explications théoriques
- Rupture d'immersion
- Rythme monotone
```

**Application StoryCore**:
```python
# Prompt Template - Acte 2
prompt_act2 = """
Scene: Experience/Conflict
Duration: {duration * 0.45} seconds
Goal: Immerse viewer emotionally
Style: Show don't tell, sensory experience
Elements:
- Visual/audio immersion
- Emotional journey (frustration, discovery, joy)
- Maintain narrative tension
- Varied camera angles and movements
Avoid: Verbal explanations, static presentation
"""
```

### Acte 3: Révélation et Résolution
**Durée**: 20-30% du contenu  
**Objectif**: Satisfaction cognitive

```
✅ Faire:
- Grand reveal/révélation
- Résoudre la boucle narrative
- Créer moment "Aha!"
- Conclusion satisfaisante

❌ Éviter:
- Fin abrupte
- Questions non résolues
- Longueurs après le climax
```

**Application StoryCore**:
```python
# Prompt Template - Acte 3
prompt_act3 = """
Scene: Revelation/Resolution
Duration: {duration * 0.30} seconds
Goal: Deliver satisfying conclusion
Style: Impactful, clear, memorable
Elements:
- Big reveal or realization
- Resolve narrative loop
- Create "Aha!" moment
- Strong visual/emotional conclusion
Avoid: Abrupt ending, unresolved questions
"""
```

---

## 🎣 2. Le "Master Hook" - Technique d'Accroche

**Source**: `Analyse_complete_critique_presentation_Combo.txt`

### Principe
Créer une **boucle narrative** dès les 3 premières secondes qui sera résolue plus tard.

### Exemples Efficaces
```
❓ Question intrigante: "C'est quoi ce bruit ?"
🎭 Situation mystérieuse: Personnage en danger sans contexte
🔊 Son inhabituel: Élément audio qui intrigue
🎨 Visuel surprenant: Image qui pose question
```

### Template de Hook pour StoryCore
```python
class HookGenerator:
    """Génère des hooks captivants pour les 3 premières secondes"""
    
    HOOK_TYPES = {
        "question": "Start with intriguing question that will be answered later",
        "mystery": "Show mysterious situation without context",
        "sound": "Use unusual sound that creates curiosity",
        "visual": "Display surprising visual that demands explanation",
        "action": "Begin mid-action without setup"
    }
    
    def generate_hook_prompt(self, project_context, hook_type="question"):
        """
        Génère un prompt de hook basé sur le contexte
        
        Args:
            project_context: Contexte du projet (genre, thème, personnages)
            hook_type: Type de hook à générer
        
        Returns:
            Prompt optimisé pour les 3 premières secondes
        """
        base_prompt = f"""
        HOOK SCENE (0-3 seconds)
        Type: {hook_type}
        Goal: Capture attention immediately, create narrative loop
        
        Context: {project_context}
        
        Requirements:
        - Duration: Exactly 3 seconds
        - Create question/mystery to be resolved later
        - High visual/audio impact
        - No explanation yet (show, don't tell)
        
        Style: {self.HOOK_TYPES[hook_type]}
        """
        return base_prompt
```

---

## 🎬 3. "Montrer plutôt que Dire" (Show Don't Tell)

**Source**: `Analyse_complete_critique_presentation_Combo.txt`

### Principe
Privilégier l'**expérience sensorielle** avant l'explication verbale.

### Mauvais Exemple
```
❌ Narrateur: "Le jeu est très difficile et frustrant"
   [Image: Menu du jeu]
```

### Bon Exemple
```
✅ [Séquence visuelle: Personnage meurt 5 fois en 30 secondes]
   [Audio: Sons de frustration, musique anxiogène]
   [Puis] Narrateur: "Vous comprenez maintenant..."
```

### Template pour StoryCore
```python
def create_show_dont_tell_prompt(concept_to_show):
    """
    Transforme un concept abstrait en expérience visuelle
    
    Args:
        concept_to_show: Concept abstrait (ex: "frustration", "joie", "danger")
    
    Returns:
        Prompt visuel/sensoriel
    """
    
    visual_mappings = {
        "frustration": "Character failing repeatedly, close-up on frustrated expression, dark lighting",
        "joy": "Character smiling, bright colors, uplifting music, dynamic movement",
        "danger": "Shadows, tense music, quick cuts, character looking around nervously",
        "mystery": "Fog, dim lighting, slow camera movement, ambient sounds",
        "excitement": "Fast cuts, vibrant colors, energetic music, dynamic camera angles"
    }
    
    return f"""
    Concept: {concept_to_show}
    
    SHOW (Visual/Audio):
    {visual_mappings.get(concept_to_show, "Express through visual and audio elements")}
    
    DON'T TELL (Avoid):
    - Narrator explaining the emotion
    - Text on screen describing feeling
    - Character stating emotion verbally
    
    Let the viewer FEEL it through sensory experience.
    """
```

---

## 🎭 4. Gimmicks et Signature Vocale

**Source**: `Analyse_complete_critique_presentation_Combo.txt`

### Principe
Créer des **moments de satisfaction cognitive** avec des phrases/expressions récurrentes.

### Exemple Efficace
```
Expression récurrente: "Oh mais c'est pour ça en fait !"
→ Crée anticipation et satisfaction quand elle arrive
→ Devient signature du créateur
```

### Application StoryCore
```python
class SignatureElementGenerator:
    """Génère des éléments de signature pour le projet"""
    
    def suggest_recurring_elements(self, project_style):
        """
        Suggère des éléments récurrents pour créer identité
        
        Returns:
            Dict avec suggestions visuelles, audio, narratives
        """
        return {
            "visual": [
                "Specific camera angle for key moments",
                "Recurring visual motif (color, shape, symbol)",
                "Signature transition style"
            ],
            "audio": [
                "Recurring sound effect for revelations",
                "Signature music sting",
                "Specific voice intonation pattern"
            ],
            "narrative": [
                "Recurring phrase for key moments",
                "Specific storytelling structure",
                "Unique way of presenting information"
            ]
        }
```

---

## 📐 5. Rythme et Pacing

**Sources**: Multiples analyses

### Problèmes Identifiés
```
❌ Formations trop longues (1h40 sans segmentation)
❌ Digressions personnelles excessives
❌ Répétitions inutiles
❌ Promesse non tenue rapidement
❌ Montage monotone
```

### Règles de Rythme
```
✅ Segmentation claire (chapitres < 10 minutes)
✅ Variation du rythme (lent/rapide)
✅ Pics émotionnels réguliers
✅ Éviter longueurs > 30 secondes sans action
✅ Tenir promesse dans les 2 premières minutes
```

### Template de Pacing pour StoryCore
```python
class PacingOptimizer:
    """Optimise le rythme narratif"""
    
    def analyze_pacing(self, timeline):
        """
        Analyse le rythme d'une timeline
        
        Returns:
            Dict avec problèmes et suggestions
        """
        issues = []
        
        # Détecter segments trop longs sans action
        for segment in timeline.segments:
            if segment.duration > 30 and segment.action_density < 0.3:
                issues.append({
                    "type": "slow_segment",
                    "timestamp": segment.start,
                    "suggestion": "Add visual variety or cut duration"
                })
        
        # Détecter manque de pics émotionnels
        emotional_peaks = self.detect_emotional_peaks(timeline)
        if len(emotional_peaks) < timeline.duration / 60:  # < 1 pic par minute
            issues.append({
                "type": "flat_emotion",
                "suggestion": "Add emotional peaks every 45-60 seconds"
            })
        
        return issues
    
    def suggest_rhythm_variation(self, current_rhythm):
        """Suggère variations de rythme"""
        if current_rhythm == "slow":
            return "fast_cut_sequence"
        elif current_rhythm == "fast":
            return "slow_contemplative_moment"
        else:
            return "maintain_current"
```

---

## 🎨 6. Variété Visuelle et Dynamisme

**Source**: `Analyse_complete_critique_musculation.txt`

### Problèmes Identifiés
```
❌ Style visuel répétitif ("banane banane")
❌ Plans similaires sans variation
❌ Manque de dynamisme
❌ Illustrations peu pertinentes
```

### Solutions
```
✅ Varier angles de caméra (plan large, moyen, serré)
✅ Alterner mouvements caméra (fixe, travelling, panoramique)
✅ Changer éclairage selon émotion
✅ Utiliser illustrations significatives
✅ Créer rythme visuel (lent/rapide)
```

### Template pour StoryCore
```python
class VisualVarietyEngine:
    """Génère variation visuelle intelligente"""
    
    SHOT_TYPES = [
        "extreme_wide_shot",  # Contexte, environnement
        "wide_shot",          # Action complète
        "medium_shot",        # Interaction, dialogue
        "close_up",           # Émotion, détail
        "extreme_close_up"    # Impact dramatique
    ]
    
    CAMERA_MOVEMENTS = [
        "static",             # Stabilité, contemplation
        "pan",                # Révélation, suivi
        "tilt",               # Échelle, puissance
        "dolly",              # Immersion, approche
        "crane",              # Grandeur, vue d'ensemble
        "handheld"            # Urgence, réalisme
    ]
    
    def suggest_next_shot(self, previous_shots, scene_emotion):
        """
        Suggère le prochain type de plan pour éviter répétition
        
        Args:
            previous_shots: Liste des 3 derniers plans
            scene_emotion: Émotion de la scène actuelle
        
        Returns:
            Suggestion de plan avec justification
        """
        # Éviter répétition
        recent_types = [shot.type for shot in previous_shots[-3:]]
        
        # Sélectionner type différent
        available_types = [t for t in self.SHOT_TYPES if t not in recent_types]
        
        # Adapter à l'émotion
        emotion_mapping = {
            "tension": ["close_up", "extreme_close_up"],
            "action": ["medium_shot", "handheld"],
            "contemplation": ["wide_shot", "static"],
            "revelation": ["dolly", "crane"]
        }
        
        preferred = emotion_mapping.get(scene_emotion, available_types)
        suggested = random.choice([t for t in preferred if t in available_types])
        
        return {
            "shot_type": suggested,
            "camera_movement": self._match_movement(suggested, scene_emotion),
            "reason": f"Varies from recent shots, matches {scene_emotion} emotion"
        }
```

---

## 🎵 7. Sound Design et Musique

**Sources**: Multiples analyses

### Problèmes Identifiés
```
❌ Musique trop discrète
❌ Son plat sans dynamique
❌ Pas de soutien du discours
❌ Trous dans le son
```

### Principes de Sound Design
```
✅ Musique soutient l'émotion (pas juste fond)
✅ Volume adapté au contexte (baisse pendant voix)
✅ Sound design immersif (ambiances, effets)
✅ Continuité audio entre plans
✅ Pics sonores pour moments clés
```

### Template pour StoryCore
```python
class SoundDesignEngine:
    """Génère design sonore adapté au contexte"""
    
    def generate_audio_prompt(self, scene_context, emotion, has_dialogue=False):
        """
        Génère prompt audio adapté à la scène
        
        Args:
            scene_context: Contexte de la scène
            emotion: Émotion cible
            has_dialogue: Présence de dialogue/voix
        
        Returns:
            Prompt audio détaillé
        """
        
        # Mapping émotion → style musical
        music_styles = {
            "tension": "Dark ambient, low frequency drones, sparse percussion",
            "action": "Fast tempo, driving rhythm, energetic instrumentation",
            "joy": "Uplifting melody, major key, bright instrumentation",
            "mystery": "Atmospheric pads, subtle textures, minimal melody",
            "sadness": "Slow tempo, minor key, emotional strings/piano"
        }
        
        # Ajuster volume si dialogue
        music_volume = "-12 dB" if has_dialogue else "-3 dB"
        
        prompt = f"""
        AUDIO DESIGN
        
        Scene: {scene_context}
        Emotion: {emotion}
        
        Music:
        - Style: {music_styles.get(emotion, "Neutral, supportive")}
        - Volume: {music_volume}
        - Role: Support emotion, don't overpower
        
        Sound Effects:
        - Ambient: Match scene environment
        - Foley: Natural, immersive
        - Impact: Emphasize key moments
        
        Mix:
        - Clear dialogue (if present)
        - Smooth transitions between scenes
        - No audio gaps
        - Dynamic range appropriate to emotion
        """
        
        return prompt
```

---

## 📋 8. Checklist de Prompting Efficace

### Pour Chaque Scène
```
✅ Objectif clair (informer, émouvoir, révéler)
✅ Durée spécifiée
✅ Style visuel défini
✅ Émotion cible
✅ Variation par rapport scène précédente
✅ Cohérence avec arc narratif global
✅ Éléments audio spécifiés
✅ "Show don't tell" appliqué
```

### Pour Le Projet Global
```
✅ Hook dans les 3 premières secondes
✅ Structure en 3 actes respectée
✅ Rythme varié (lent/rapide)
✅ Pics émotionnels réguliers
✅ Boucles narratives résolues
✅ Signature visuelle/audio identifiable
✅ Pas de longueurs (> 30s sans action)
✅ Conclusion satisfaisante
```

---

## 🚀 9. Intégration dans StoryCore-Engine

### Système de Prompting Intelligent
```python
class IntelligentPromptGenerator:
    """Génère prompts optimisés basés sur storytelling professionnel"""
    
    def __init__(self):
        self.hook_generator = HookGenerator()
        self.pacing_optimizer = PacingOptimizer()
        self.visual_variety = VisualVarietyEngine()
        self.sound_design = SoundDesignEngine()
    
    def generate_project_prompts(self, script, duration, style):
        """
        Génère tous les prompts pour un projet
        
        Returns:
            Liste de prompts optimisés pour chaque scène
        """
        prompts = []
        
        # 1. Générer hook (3 premières secondes)
        hook_prompt = self.hook_generator.generate_hook_prompt(
            project_context=script.context,
            hook_type="question"
        )
        prompts.append(hook_prompt)
        
        # 2. Structurer en 3 actes
        act1_duration = duration * 0.25
        act2_duration = duration * 0.45
        act3_duration = duration * 0.30
        
        # 3. Générer prompts pour chaque acte
        # ... (logique de génération)
        
        # 4. Optimiser pacing
        prompts = self.pacing_optimizer.optimize_prompts(prompts)
        
        # 5. Ajouter variété visuelle
        prompts = self.visual_variety.add_variety(prompts)
        
        # 6. Intégrer sound design
        prompts = self.sound_design.enhance_prompts(prompts)
        
        return prompts
```

---

## 📚 Conclusion

Ces techniques de storytelling extraites des critiques professionnelles doivent être **systématisées** dans StoryCore-Engine pour:

1. ✅ Générer des prompts plus efficaces
2. ✅ Structurer narrativement les projets
3. ✅ Créer des hooks captivants
4. ✅ Optimiser le rythme et le pacing
5. ✅ Assurer variété visuelle et audio
6. ✅ Produire contenu professionnel

**Prochaine étape**: Intégrer ces modules dans le pipeline de génération.

---

**Document connexe**: `docs/INSIGHTS_AMELIORATION_VIDEO_AUDIO.md`
