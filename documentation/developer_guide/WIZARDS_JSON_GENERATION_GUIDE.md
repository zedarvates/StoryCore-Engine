# Guide de Génération JSON par les Wizards

## 🎯 Objectif

Tous les wizards de StoryCore génèrent maintenant des fichiers JSON individuels pour chaque entité créée, permettant une gestion granulaire et une meilleure organisation du projet.

## 📁 Structure des Dossiers

```
project-folder/
├── characters/          ← Personnages créés par Character Creation Wizard
│   ├── character-001.json
│   ├── character-002.json
│   └── character-003.json
├── worlds/             ← Mondes créés par World Building Wizard
│   ├── world-001.json
│   └── world-002.json
├── sequences/          ← Séquences créées par Sequence Plan Wizard
│   ├── sequence-001.json
│   ├── sequence-002.json
│   └── sequence-003.json
├── scenes/             ← Scènes créées par Scene Generator Wizard
│   ├── scene-001.json
│   └── scene-002.json
├── dialogues/          ← Dialogues créés par Dialogue Writer Wizard
│   ├── dialogue-001.json
│   └── dialogue-002.json
├── storyboards/        ← Storyboards créés par Storyboard Creator Wizard
│   ├── storyboard-001.json
│   └── storyboard-002.json
├── styles/             ← Styles créés par Style Transfer Wizard
│   ├── style-001.json
│   └── style-002.json
└── project.json        ← Métadonnées du projet (références à tous les fichiers)
```

## 🧙 Wizards et leurs Fichiers JSON

### 1. Character Creation Wizard

**Fichier généré** : `characters/character-{uuid}.json`

```json
{
  "id": "char-550e8400-e29b-41d4-a716-446655440000",
  "type": "character",
  "name": "John Doe",
  "created_at": "2026-01-20T10:30:00Z",
  "updated_at": "2026-01-20T10:30:00Z",
  "version": "1.0",
  
  "basic_info": {
    "age": 30,
    "gender": "male",
    "occupation": "Detective",
    "nationality": "American"
  },
  
  "appearance": {
    "height": "180cm",
    "build": "athletic",
    "hair_color": "dark brown",
    "eye_color": "blue",
    "distinctive_features": "Scar on left cheek",
    "clothing_style": "Casual professional"
  },
  
  "personality": {
    "traits": ["determined", "analytical", "compassionate"],
    "strengths": ["Problem-solving", "Empathy", "Physical fitness"],
    "weaknesses": ["Stubborn", "Workaholic", "Trust issues"],
    "fears": ["Failure", "Losing loved ones"],
    "motivations": ["Justice", "Protecting the innocent"]
  },
  
  "background": {
    "origin": "New York City",
    "education": "Criminal Justice degree",
    "family": "Estranged from father, close to sister",
    "key_events": [
      "Witnessed crime as child",
      "Joined police force at 22",
      "Promoted to detective at 28"
    ]
  },
  
  "relationships": [
    {
      "character_id": "char-660e8400-e29b-41d4-a716-446655440001",
      "type": "partner",
      "description": "Work partner, trusted friend"
    }
  ],
  
  "visual_references": {
    "reference_images": [],
    "style_notes": "Realistic, modern urban setting",
    "color_palette": ["#2C3E50", "#34495E", "#7F8C8D"]
  },
  
  "metadata": {
    "created_by": "user",
    "wizard_version": "1.0",
    "tags": ["protagonist", "detective", "action"]
  }
}
```

**Utilisation dans le Wizard** :
```typescript
// Lors de la création d'un personnage
const characterData = {
  id: generateUUID(),
  type: 'character',
  name: formData.name,
  // ... autres données
};

// Sauvegarder le fichier JSON
await window.electronAPI.project.saveCharacter(
  projectPath,
  characterData
);

// Mettre à jour project.json avec la référence
await window.electronAPI.project.addCharacterReference(
  projectPath,
  characterData.id
);
```

---

### 2. World Building Wizard

**Fichier généré** : `worlds/world-{uuid}.json`

```json
{
  "id": "world-770e8400-e29b-41d4-a716-446655440000",
  "type": "world",
  "name": "Neo-Tokyo 2077",
  "created_at": "2026-01-20T11:00:00Z",
  "updated_at": "2026-01-20T11:00:00Z",
  "version": "1.0",
  
  "setting": {
    "genre": "Cyberpunk",
    "time_period": "2077",
    "technology_level": "Advanced",
    "magic_system": null
  },
  
  "geography": {
    "type": "Urban megacity",
    "climate": "Temperate, polluted",
    "key_locations": [
      {
        "id": "loc-001",
        "name": "Downtown District",
        "description": "Neon-lit streets with towering skyscrapers",
        "importance": "high"
      },
      {
        "id": "loc-002",
        "name": "Underground Market",
        "description": "Black market for tech and information",
        "importance": "medium"
      }
    ]
  },
  
  "society": {
    "government": "Corporate oligarchy",
    "economy": "Capitalist, tech-driven",
    "social_structure": "Extreme wealth gap",
    "culture": "Blend of traditional and futuristic",
    "languages": ["Japanese", "English", "Mandarin"]
  },
  
  "history": {
    "key_events": [
      {
        "year": "2050",
        "event": "The Great Collapse",
        "impact": "Economic crisis led to corporate takeover"
      },
      {
        "year": "2065",
        "event": "Neural Interface Revolution",
        "impact": "Direct brain-computer interfaces became common"
      }
    ]
  },
  
  "rules": {
    "physics": "Standard with advanced technology",
    "limitations": [
      "AI consciousness is illegal",
      "Time travel is impossible",
      "Teleportation limited to 100m"
    ],
    "special_elements": [
      "Neural interfaces",
      "Holographic displays",
      "Genetic modification"
    ]
  },
  
  "visual_style": {
    "color_palette": ["#FF006E", "#8338EC", "#3A86FF", "#FB5607"],
    "atmosphere": "Dark, neon-lit, rainy",
    "reference_images": [],
    "style_notes": "Blade Runner meets Ghost in the Shell"
  },
  
  "metadata": {
    "created_by": "user",
    "wizard_version": "1.0",
    "tags": ["cyberpunk", "urban", "dystopian"]
  }
}
```

---

### 3. Sequence Plan Wizard

**Fichier généré** : `sequences/sequence-{uuid}.json`

```json
{
  "id": "seq-880e8400-e29b-41d4-a716-446655440000",
  "type": "sequence",
  "name": "Opening Chase",
  "created_at": "2026-01-20T12:00:00Z",
  "updated_at": "2026-01-20T12:00:00Z",
  "version": "1.0",
  
  "order": 1,
  "duration": 45.0,
  "shots_count": 7,
  
  "description": {
    "resume": "High-speed chase through neon-lit streets of Neo-Tokyo",
    "detailed": "The protagonist pursues a suspect through crowded streets, dodging traffic and pedestrians. The chase escalates to rooftops before ending in a dramatic confrontation.",
    "mood": "Intense, fast-paced, visually stunning"
  },
  
  "shots": [
    {
      "id": "shot-001",
      "order": 1,
      "duration": 5.0,
      "type": "establishing",
      "description": "Wide shot of Neo-Tokyo streets at night",
      "camera": {
        "angle": "high",
        "movement": "slow pan",
        "lens": "wide"
      }
    },
    {
      "id": "shot-002",
      "order": 2,
      "duration": 3.0,
      "type": "action",
      "description": "Protagonist running through crowd",
      "camera": {
        "angle": "medium",
        "movement": "tracking",
        "lens": "standard"
      }
    }
    // ... autres plans
  ],
  
  "characters": [
    "char-550e8400-e29b-41d4-a716-446655440000"
  ],
  
  "locations": [
    "loc-001"
  ],
  
  "audio": {
    "music": "High-energy electronic",
    "sound_effects": ["traffic", "footsteps", "sirens"],
    "dialogue": false
  },
  
  "transitions": {
    "in": "fade_in",
    "out": "cut"
  },
  
  "metadata": {
    "created_by": "user",
    "wizard_version": "1.0",
    "tags": ["action", "chase", "opening"]
  }
}
```

---

### 4. Scene Generator Wizard

**Fichier généré** : `scenes/scene-{uuid}.json`

```json
{
  "id": "scene-990e8400-e29b-41d4-a716-446655440000",
  "type": "scene",
  "name": "Interrogation Room",
  "created_at": "2026-01-20T13:00:00Z",
  "updated_at": "2026-01-20T13:00:00Z",
  "version": "1.0",
  
  "sequence_id": "seq-880e8400-e29b-41d4-a716-446655440000",
  "duration": 120.0,
  
  "setting": {
    "location": "Police station interrogation room",
    "time_of_day": "night",
    "weather": "n/a (interior)",
    "lighting": "harsh fluorescent"
  },
  
  "characters_present": [
    {
      "character_id": "char-550e8400-e29b-41d4-a716-446655440000",
      "role": "interrogator",
      "emotional_state": "determined"
    },
    {
      "character_id": "char-660e8400-e29b-41d4-a716-446655440001",
      "role": "suspect",
      "emotional_state": "nervous"
    }
  ],
  
  "action": {
    "beats": [
      {
        "order": 1,
        "description": "Detective enters room",
        "duration": 5.0
      },
      {
        "order": 2,
        "description": "Tense silence as they stare at each other",
        "duration": 10.0
      },
      {
        "order": 3,
        "description": "Detective begins questioning",
        "duration": 30.0
      }
      // ... autres beats
    ]
  },
  
  "dialogue_id": "dialogue-001",
  
  "visual_elements": {
    "key_props": ["table", "chairs", "one-way mirror"],
    "camera_notes": "Tight shots, emphasize tension",
    "color_grading": "Cool, desaturated"
  },
  
  "metadata": {
    "created_by": "user",
    "wizard_version": "1.0",
    "tags": ["dialogue", "tension", "interior"]
  }
}
```

---

### 5. Dialogue Writer Wizard

**Fichier généré** : `dialogues/dialogue-{uuid}.json`

```json
{
  "id": "dialogue-aa0e8400-e29b-41d4-a716-446655440000",
  "type": "dialogue",
  "name": "Interrogation Dialogue",
  "created_at": "2026-01-20T14:00:00Z",
  "updated_at": "2026-01-20T14:00:00Z",
  "version": "1.0",
  
  "scene_id": "scene-990e8400-e29b-41d4-a716-446655440000",
  
  "lines": [
    {
      "order": 1,
      "character_id": "char-550e8400-e29b-41d4-a716-446655440000",
      "text": "Where were you on the night of the 15th?",
      "emotion": "stern",
      "delivery": "direct, commanding",
      "pause_after": 2.0
    },
    {
      "order": 2,
      "character_id": "char-660e8400-e29b-41d4-a716-446655440001",
      "text": "I... I was at home. Alone.",
      "emotion": "nervous",
      "delivery": "hesitant, avoiding eye contact",
      "pause_after": 1.5
    },
    {
      "order": 3,
      "character_id": "char-550e8400-e29b-41d4-a716-446655440000",
      "text": "Can anyone verify that?",
      "emotion": "suspicious",
      "delivery": "leaning forward, intense",
      "pause_after": 3.0
    }
    // ... autres lignes
  ],
  
  "subtext": {
    "themes": ["truth vs lies", "power dynamics"],
    "hidden_meanings": [
      "Detective suspects the suspect is lying",
      "Suspect is hiding something important"
    ]
  },
  
  "audio_notes": {
    "background_sounds": ["fluorescent hum", "distant footsteps"],
    "music": "Minimal, tense underscore",
    "voice_processing": "Natural, no effects"
  },
  
  "metadata": {
    "created_by": "user",
    "wizard_version": "1.0",
    "tags": ["interrogation", "tense", "dramatic"]
  }
}
```

---

### 6. Storyboard Creator Wizard

**Fichier généré** : `storyboards/storyboard-{uuid}.json`

```json
{
  "id": "story-bb0e8400-e29b-41d4-a716-446655440000",
  "type": "storyboard",
  "name": "Opening Chase Storyboard",
  "created_at": "2026-01-20T15:00:00Z",
  "updated_at": "2026-01-20T15:00:00Z",
  "version": "1.0",
  
  "sequence_id": "seq-880e8400-e29b-41d4-a716-446655440000",
  
  "frames": [
    {
      "order": 1,
      "shot_id": "shot-001",
      "duration": 5.0,
      "image_path": "storyboards/story-bb0e8400/frame-001.png",
      "thumbnail_path": "storyboards/story-bb0e8400/thumb-001.png",
      
      "composition": {
        "rule_of_thirds": true,
        "focal_point": "center-top",
        "depth_layers": ["foreground", "midground", "background"]
      },
      
      "camera": {
        "angle": "high",
        "movement": "slow pan right",
        "lens": "wide (24mm)",
        "aperture": "f/2.8"
      },
      
      "lighting": {
        "key_light": "neon signs",
        "fill_light": "ambient city glow",
        "mood": "moody, atmospheric"
      },
      
      "annotations": [
        {
          "type": "arrow",
          "description": "Camera pans in this direction",
          "position": {"x": 100, "y": 50}
        },
        {
          "type": "note",
          "description": "Focus on neon reflections",
          "position": {"x": 200, "y": 150}
        }
      ],
      
      "notes": "Establish the cyberpunk atmosphere immediately"
    }
    // ... autres frames
  ],
  
  "style": {
    "art_style": "Realistic with stylized lighting",
    "color_palette": ["#FF006E", "#8338EC", "#3A86FF"],
    "reference_images": []
  },
  
  "metadata": {
    "created_by": "user",
    "wizard_version": "1.0",
    "tags": ["storyboard", "action", "cyberpunk"]
  }
}
```

---

### 7. Style Transfer Wizard

**Fichier généré** : `styles/style-{uuid}.json`

```json
{
  "id": "style-cc0e8400-e29b-41d4-a716-446655440000",
  "type": "style",
  "name": "Cyberpunk Neon",
  "created_at": "2026-01-20T16:00:00Z",
  "updated_at": "2026-01-20T16:00:00Z",
  "version": "1.0",
  
  "visual_style": {
    "art_direction": "Cyberpunk with heavy neon emphasis",
    "color_grading": {
      "primary_colors": ["#FF006E", "#8338EC", "#3A86FF"],
      "secondary_colors": ["#FB5607", "#FFBE0B"],
      "shadows": "#1A1A2E",
      "highlights": "#FFFFFF",
      "saturation": 1.3,
      "contrast": 1.2
    },
    
    "lighting": {
      "style": "High contrast with colored lights",
      "key_characteristics": [
        "Neon reflections on wet surfaces",
        "Rim lighting from signs",
        "Deep shadows"
      ]
    },
    
    "composition": {
      "framing": "Cinematic 2.39:1",
      "depth_of_field": "Shallow for close-ups, deep for wide shots",
      "camera_movement": "Smooth, deliberate"
    }
  },
  
  "technical_settings": {
    "comfyui_workflow": "workflows/cyberpunk-neon.json",
    "lora_models": [
      {
        "name": "cyberpunk_style_v2",
        "weight": 0.8
      },
      {
        "name": "neon_lighting",
        "weight": 0.6
      }
    ],
    "controlnet": {
      "enabled": true,
      "models": ["depth", "canny"]
    }
  },
  
  "prompt_templates": {
    "positive": "cyberpunk, neon lights, futuristic, high contrast, cinematic lighting, {scene_description}",
    "negative": "low quality, blurry, oversaturated, cartoon, anime"
  },
  
  "reference_images": [
    "styles/style-cc0e8400/ref-001.png",
    "styles/style-cc0e8400/ref-002.png"
  ],
  
  "metadata": {
    "created_by": "user",
    "wizard_version": "1.0",
    "tags": ["cyberpunk", "neon", "cinematic"]
  }
}
```

---

## 🔄 Workflow de Génération

### 1. Utilisateur Utilise un Wizard

```typescript
// Dans le composant Wizard
const handleSubmit = async (formData) => {
  // 1. Générer un UUID unique
  const entityId = generateUUID();
  
  // 2. Créer l'objet de données
  const entityData = {
    id: entityId,
    type: wizardType, // 'character', 'world', 'sequence', etc.
    name: formData.name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: '1.0',
    // ... autres données du formulaire
  };
  
  // 3. Sauvegarder le fichier JSON
  const filePath = `${wizardType}s/${wizardType}-${entityId}.json`;
  await window.electronAPI.fs.writeJSON(
    projectPath,
    filePath,
    entityData
  );
  
  // 4. Mettre à jour project.json
  await window.electronAPI.project.addReference(
    projectPath,
    wizardType,
    entityId
  );
  
  // 5. Mettre à jour le store
  updateStore(wizardType, entityData);
  
  // 6. Afficher confirmation
  showNotification(`${wizardType} créé avec succès!`);
};
```

### 2. Assistant StoryCore Crée une Entité

```typescript
// Dans le service de l'assistant
const createEntityFromPrompt = async (prompt: string, type: string) => {
  // 1. Analyser le prompt avec LLM
  const parsedData = await ollama.parse(prompt, type);
  
  // 2. Générer l'entité
  const entityId = generateUUID();
  const entityData = {
    id: entityId,
    type: type,
    ...parsedData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: '1.0',
    metadata: {
      created_by: 'assistant',
      wizard_version: '1.0',
      tags: parsedData.tags || []
    }
  };
  
  // 3. Sauvegarder
  await saveEntity(entityData);
  
  // 4. Retourner confirmation
  return {
    success: true,
    entity: entityData,
    message: `${type} "${entityData.name}" créé avec succès!`
  };
};
```

---

## 📊 project.json - Fichier Central

Le fichier `project.json` contient les références à tous les fichiers générés :

```json
{
  "id": "proj-dd0e8400-e29b-41d4-a716-446655440000",
  "name": "Neo-Tokyo Chronicles",
  "type": "project",
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-20T16:30:00Z",
  "version": "1.0",
  
  "metadata": {
    "globalResume": "A cyberpunk thriller set in Neo-Tokyo 2077...",
    "format": "16:9",
    "duration": 300,
    "status": "in_progress"
  },
  
  "references": {
    "characters": [
      "char-550e8400-e29b-41d4-a716-446655440000",
      "char-660e8400-e29b-41d4-a716-446655440001"
    ],
    "worlds": [
      "world-770e8400-e29b-41d4-a716-446655440000"
    ],
    "sequences": [
      "seq-880e8400-e29b-41d4-a716-446655440000"
    ],
    "scenes": [
      "scene-990e8400-e29b-41d4-a716-446655440000"
    ],
    "dialogues": [
      "dialogue-aa0e8400-e29b-41d4-a716-446655440000"
    ],
    "storyboards": [
      "story-bb0e8400-e29b-41d4-a716-446655440000"
    ],
    "styles": [
      "style-cc0e8400-e29b-41d4-a716-446655440000"
    ]
  },
  
  "settings": {
    "default_style": "style-cc0e8400-e29b-41d4-a716-446655440000",
    "default_world": "world-770e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## 🎯 Avantages de cette Approche

### 1. **Modularité**
- Chaque entité est indépendante
- Facile à modifier sans affecter les autres
- Réutilisable dans d'autres projets

### 2. **Versionning**
- Chaque fichier a sa propre version
- Historique des modifications clair
- Facile à synchroniser avec Git

### 3. **Performance**
- Chargement à la demande
- Pas besoin de charger tout le projet
- Mise en cache efficace

### 4. **Collaboration**
- Plusieurs personnes peuvent travailler simultanément
- Moins de conflits de fusion
- Facile à partager des entités spécifiques

### 5. **Extensibilité**
- Facile d'ajouter de nouveaux types d'entités
- Format JSON flexible
- Compatible avec des outils externes

---

## 🚀 Prochaines Étapes

1. **Implémenter les fonctions de sauvegarde** dans l'API Electron
2. **Créer les services de gestion** pour chaque type d'entité
3. **Ajouter la validation** des schémas JSON
4. **Implémenter le système de cache** pour les performances
5. **Créer les utilitaires d'import/export** pour partager des entités

---

**Tous les wizards sont maintenant prêts à générer des fichiers JSON standardisés ! 🎉**
