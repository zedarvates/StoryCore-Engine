# Agent Cards - StoryCore

Système de tuiles (cards) pour les agents StoryCore. Chaque agent possède une carte JSON contenant sa personnalité, ses capacités, son comportement et ses fichiers associés.

## Structure

```
agents/
├── README.md                          # Ce fichier
├── scientific_audit_card.json        # Carte de l'agent Scientific Audit
├── antifake_video_card.json           # Carte de l'agent Anti-Fake Video
└── [autres_cartes].json

src/agents/
├── card_generator.py                 # Générateur de cartes
└── image_generator.py                # Générateur d'images (ComfyUI)
```

## Format de Carte JSON

Chaque carte contient:

```json
{
  "agent_id": "identifiant_unique",
  "name": "Nom de l'agent",
  "description": "Brève description",
  "personality": {
    "traits": ["trait1", "trait2"],
    "values": ["valeur1", "valeur2"],
    "communication_style": "style",
    "limitations": ["limitation1"]
  },
  "capabilities": {
    "primary": ["capacité1", "capacité2"],
    "secondary": ["capacité3"],
    "input_types": ["texte"],
    "output_types": ["json"]
  },
  "behavior": {
    "typical_actions": ["action1", "action2"],
    "workflow": "étape1 → étape2 → étape3",
    "safety_constraints": ["contrainte1"]
  },
  "files": {
    "main": "chemin/vers/fichier_principal.py",
    "dependencies": ["dep1.py", "dep2.py"]
  },
  "image": {
    "generated": false,
    "prompt": "prompt pour génération d'image",
    "manual_path": "assets/agents/identifiant_card.png"
  }
}
```

## Utilisation

### Générer une carte

```python
from src.agents.card_generator import create_scientific_audit_card

card = create_scientific_audit_card()
# ou
from src.agents.card_generator import AgentCardGenerator

generator = AgentCardGenerator("C:/storycore-engine")
card = generator.create_card(
    agent_id="mon_agent",
    name="Mon Agent",
    personality={...},
    capabilities={...},
    behavior={...},
    files={...}
)
generator.save_card(card)
```

### Générer une image

```python
from src.agents.image_generator import generate_agent_image

# Avec ComfyUI (si disponible)
result = generate_agent_image("scientific_audit", "portrait professionnel")

# Pour génération manuelle
from src.agents.image_generator import get_prompt_for_manual
prompt = get_prompt_for_manual("scientific_audit")
print(prompt)
```

### Vérifier la disponibilité de ComfyUI

```python
from src.agents.image_generator import AgentImageGenerator

generator = AgentImageGenerator()
if generator.is_comfyui_available():
    print("ComfyUI est disponible!")
else:
    print("ComfyUI non disponible - utiliser génération manuelle")
```

## Génération d'Images

### Option 1: Automatique (ComfyUI)

Si ComfyUI est disponible (serveur local ou distant), le système peut générer automatiquement les images:

```bash
# Définir l'URL de ComfyUI
export COMFYUI_URL=http://localhost:8188

# Ou via configuration
# Fichier: config/comfyui_config.json
{
  "url": "http://localhost:8188"
}
```

### Option 2: Manuelle

Le système génère un prompt optimisé pour la génération manuelle:

```python
from src.agents.image_generator import get_prompt_for_manual

prompt = get_prompt_for_manual("scientific_audit")
# Copier ce prompt dans votre interface de génération d'image favorite
```

## Ajouter un Nouvel Agent

1. **Créer la carte JSON** dans `agents/`:
   ```bash
   cp agents/scientific_audit_card.json agents/mon_nouvel_agent_card.json
   ```

2. **Modifier les champs**:
   - `agent_id`: identifiant unique
   - `name`: nom de l'agent
   - `personality`: traits et caractéristiques
   - `capabilities`: capacités principales et secondaires
   - `behavior`: actions typiques et workflow
   - `files`: fichiers associés

3. **Générer l'image**:
   - Automatique: `python -m src.agents.image_generator mon_nouvel_agent`
   - Manuelle: Utiliser le prompt dans `image.prompt`

## Commandes Utiles

```bash
# Générer toutes les cartes
python -c "from src.agents.card_generator import generate_all_cards; generate_all_cards()"

# Générer toutes les images
python -c "from src.agents.image_generator import AgentImageGenerator; g=AgentImageGenerator(); g.generate_all_images()"

# Lister les agents disponibles
python -c "from src.agents.card_generator import AgentCardGenerator; print(AgentCardGenerator().list_cards())"
```

## Exemples de Prompts pour Génération Manuelle

### Scientific Audit Agent
```
portrait with méthodique, analytique, précis characteristics, 
focused on extraction de faits, vérification de sources, 
professional, badge-style, clean design, blue and white color scheme, 
studio lighting, high quality, detailed face
```

### Anti-Fake Video Agent
```
portrait with vigilant, critique, objectif characteristics, 
focused on détection de manipulations, analyse de cohérence, 
professional, badge-style, clean design, blue and white color scheme, 
studio lighting, high quality, detailed face
```

## Intégration Future

- Génération automatique d'images via API DALL-E
- Système de templates pour différents styles de cartes
- Interface web pour gérer les cartes
- Export vers d'autres formats (Markdown, HTML)

