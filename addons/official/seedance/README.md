# Seedance 2.0 Addon

Addon officiel pour StoryCore permettant la génération de vidéos via l'API Seedance 2.0.

## Fonctionnalités

- **Génération de vidéos** : Créez des vidéos IA à partir de descriptions de scènes
- **Audio natif** : Génération audio synchronisée (si disponible via Seedance)
- **Export 3D** : Export des modèles 3D générés
- **Cohérence des personnages** : Maintenez l'apparence des personnages entre les plans
- **Multi-plan** : Créez des séquences de plusieurs plans

## Installation

L'addon est automatiquement découvert et chargé par le système d'addons de StoryCore. Assurez-vous que le dossier `addons/official/seedance` est présent.

## Configuration

Éditez le fichier `config.json` pour configurer l'addon :

```json
{
  "engine": "seedance-v2-turbo",
  "fps": 60,
  "resolution": "2k",
  "creativity_scale": 0.5,
  "physics_fidelity": "high",
  "enable_audio": true,
  "enable_3d_export": true,
  "api_endpoint": "https://api.seedance.ai/v2",
  "api_key": "votre_cle_api"
}
```

### Paramètres disponibles

| Paramètre | Description | Valeur par défaut |
|-----------|-------------|-------------------|
| `engine` | Moteur Seedance à utiliser | `seedance-v2-turbo` |
| `fps` | Images par seconde | `60` |
| `resolution` | Résolution de sortie | `2k` |
| `creativity_scale` | Niveau de créativité (0-1) | `0.5` |
| `physics_fidelity` | Fidélité physique | `high` |
| `enable_audio` | Activer la génération audio | `true` |
| `enable_3d_export` | Activer l'export 3D | `true` |

## Utilisation

### Via l'interface utilisateur

1. Activez l'addon "Seedance 2.0" depuis le menu Add-ons
2. Cliquez sur "Ouvrir" ou "Générer avec Seedance"
3. Remplissez les informations de la scène
4. Configurez les paramètres de génération
5. Cliquez sur "Générer une vidéo"

### Via l'API

```bash
# Générer une vidéo
curl -X POST http://localhost:8000/api/seedance/generate \
  -H "Content-Type: application/json" \
  -d '{
    "scene": {
      "name": "Ma scène",
      "description": "Un personnage marchant dans une forêt",
      "style": "cinématique",
      "character_consistency": true
    },
    "config_overrides": {
      "fps": 60,
      "resolution": "2k"
    }
  }'
```

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/seedance` | Statut de l'addon |
| POST | `/api/seedance/generate` | Générer une vidéo |
| GET | `/api/seedance/config` | Obtenir la configuration |
| PUT | `/api/seedance/config` | Mettre à jour la configuration |
| GET | `/api/seedance/capabilities` | Capacités de l'addon |
| GET | `/api/seedance/engines` | Moteurs disponibles |
| GET | `/api/seedance/presets` | Préréglages disponibles |

## Moteurs disponibles

- **Seedance V2 Turbo** : Génération rapide
- **Seedance V2 Quality** : Haute qualité
- **Seedance V2 Cinematic** : Mode cinématographique

## Structure du projet

```
addons/official/seedance/
├── addon.json          # Manifeste de l'addon
├── config.json         # Configuration par défaut
├── src/
│   ├── __init__.py
│   ├── main.py         # Point d'entrée de l'addon
│   └── seedance_api.py # Client API
└── assets/
    └── icon.png        # Icône de l'addon
```

## Dépannage

### L'addon n'apparaît pas

1. Vérifiez que le dossier `addons/official/seedance` existe
2. Vérifiez que `addon.json` est présent et valide
3. Redémarrez le serveur StoryCore

### Erreur de connexion API

1. Vérifiez votre clé API dans `config.json`
2. Vérifiez la connexion internet
3. Vérifiez le endpoint API de Seedance

## Licence

Propriétaire - StoryCore Team

