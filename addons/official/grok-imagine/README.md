# Grok Imagine Addon

Add-on officiel pour StoryCore Engine permettant la génération d'images et vidéos via l'API Grok Imagine (xAI).

## Fonctionnalités

- **Génération d'images** : Créez des images haute qualité à partir de descriptions textuelles
- **Génération de vidéos** : Générez des vidéos cinématiques avec mouvement
- **Cohérence des personnages** : Maintenez l'apparence des personnages à travers plusieurs générations
- **Multi-plan** : Créez des séquences avec plusieurs plans
- **Styles multiples** : Cinématique, réaliste, artistique, etc.
- **Contrôle créatif** : Ajustez la créativité, la qualité, le ratio, etc.

## Configuration

### Prérequis

- Un compte xAI avec accès à l'API Grok Imagine
- Une clé API Grok (Premium/SuperGrok requis)

### Configuration de la clé API

1. Ouvrez le fichier `config.json` de l'addon
2. Remplacez la valeur de `api_key` par votre clé API Grok :

```json
{
  "api_key": "votre_clé_api_grok"
}
```

### Options de configuration

| Paramètre | Description | Valeur par défaut |
|-----------|-------------|-------------------|
| `model` | Modèle à utiliser | `grok-image-v1` |
| `fps` | Images par seconde (vidéo) | `30` |
| `resolution` | Résolution de sortie | `1080p` |
| `aspect_ratio` | Ratio d'aspect | `16:9` |
| `style` | Style visuel | `cinematic` |
| `quality` | Qualité de rendu | `high` |
| `duration_seconds` | Durée vidéo (secondes) | `8` |
| `enable_motion` | Activer le mouvement (vidéo) | `true` |
| `creativity_scale` | Niveau de créativité (0-1) | `0.5` |
| `negative_prompt` | Éléments à éviter | (voir config) |

## Utilisation

### Via l'interface utilisateur

1. Activez l'addon depuis le gestionnaire d'addons
2. Ouvrez le panneau "Grok Imagine"
3. Décrivez votre scène dans le champ de description
4. Configurez les paramètres (style, qualité, etc.)
5. Cliquez sur "Générer"

### Via l'API

```python
# Exemple d'utilisation programmatique
from addons.official.grok_imagine.src.main import GrokImagineAddon

# Initialiser l'addon
addon = GrokImagineAddon({'addon_name': 'grok-imagine'})
await addon.initialize()

# Générer une image
scene = {
    "name": "Paysage montagneux",
    "description": "Vue aérienne d'une chaîne de montagnes enneigées au coucher du soleil",
    "style": "cinematic"
}

result = await addon.generate(scene)
print(result)
```

## Structure du projet

```
grok-imagine/
├── addon.json          # Manifeste de l'addon
├── config.json         # Configuration par défaut
├── src/
│   ├── __init__.py     # Initialisation du module
│   ├── main.py         # Classe principale de l'addon
│   └── grok_api.py     # Client API Grok Imagine
├── assets/
│   └── icon.svg        # Icône de l'addon
└── README.md           # Ce fichier
```

## Formats de sortie

- **Images** : PNG, JPEG
- **Vidéos** : MP4 (H.264)

## Limitations

- L'API Grok Imagine nécessite un abonnement Premium
- Les temps de génération varient selon la complexité
- La génération vidéo est plus longue que la génération d'images

## Support

Pour signaler un bug ou demander une fonctionnalité : [GitHub Issues](https://github.com/storycore/storycore-engine/issues)

## Licence

MIT License - StoryCore Engine

