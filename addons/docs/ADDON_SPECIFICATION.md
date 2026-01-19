# StoryCore Add-on Specification

## Vue d'ensemble

Les add-ons StoryCore sont des extensions modulaires qui permettent d'étendre les capacités du moteur StoryCore sans modifier le code source principal. Cette spécification définit l'architecture, les interfaces et les bonnes pratiques pour développer des add-ons compatibles.

## Architecture des Add-ons

### Structure d'un Add-on

```
addon_name/
├── addon.json          # Manifest et métadonnées (obligatoire)
├── src/                # Code source (obligatoire)
│   ├── main.py         # Point d'entrée principal (obligatoire)
│   ├── config.py       # Configuration (optionnel)
│   └── utils.py        # Utilitaires (optionnel)
├── docs/               # Documentation (recommandé)
│   ├── README.md       # Documentation principale
│   └── api.md          # Documentation API
├── examples/           # Exemples d'utilisation (recommandé)
├── tests/              # Tests unitaires (recommandé)
└── requirements.json   # Dépendances (optionnel)
```

### Types d'Add-ons

#### 1. Workflow Add-on (`workflow_addon`)
- **Usage**: Étend les capacités de génération et traitement
- **Permissions**: `model_access`, `file_system_read`
- **Hooks**: `pre_generation`, `post_generation`, `workflow_step`

#### 2. UI Add-on (`ui_addon`)
- **Usage**: Ajoute des composants d'interface utilisateur
- **Permissions**: `ui_access`
- **Hooks**: `ui_render`, `ui_event`

#### 3. Processing Add-on (`processing_addon`)
- **Usage**: Ajoute des algorithmes de traitement personnalisés
- **Permissions**: `file_system_read`, `file_system_write`
- **Hooks**: `pre_processing`, `post_processing`

#### 4. Model Add-on (`model_addon`)
- **Usage**: Intègre de nouveaux modèles IA
- **Permissions**: `model_access`, `file_system_write`, `network_access`
- **Hooks**: `pre_generation`, `post_generation`

#### 5. Export Add-on (`export_addon`)
- **Usage**: Ajoute de nouveaux formats d'export
- **Permissions**: `file_system_write`, `config_access`
- **Hooks**: `pre_export`, `post_export`

## Manifest (`addon.json`)

Le fichier `addon.json` est le point d'entrée obligatoire de tout add-on. Il définit les métadonnées, les permissions et les points d'intégration.

### Schéma Complet

```json
{
  "$schema": "addon_manifest_schema.json",
  "name": "my_custom_addon",
  "version": "1.0.0",
  "type": "workflow_addon",
  "author": "Developer Name",
  "description": "Description détaillée de l'add-on",
  "compatibility": {
    "engine_version": ">=2.0.0",
    "python_version": ">=3.9"
  },
  "permissions": ["model_access", "file_system_read"],
  "entry_points": {
    "main": "src/main.py",
    "config": "src/config.py"
  },
  "dependencies": {
    "torch": ">=2.0.0",
    "transformers": ">=4.30.0"
  },
  "metadata": {
    "tags": ["ai", "generation"],
    "homepage": "https://github.com/user/my-addon",
    "license": "MIT",
    "keywords": ["storycore", "addon", "ai"]
  }
}
```

### Champs Obligatoires

- **name**: Identifiant unique (pattern: `^[a-z][a-z0-9_-]*$`)
- **version**: Version sémantique (pattern: `^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$`)
- **type**: Type d'add-on (enum défini)
- **author**: Nom de l'auteur/développeur
- **description**: Description fonctionnelle

### Champs Optionnels

- **compatibility**: Contraintes de compatibilité
- **permissions**: Liste des permissions requises
- **entry_points**: Points d'entrée du code
- **dependencies**: Dépendances Python
- **metadata**: Métadonnées supplémentaires

## Interface de Programmation

### Classe de Base d'Add-on

Tout add-on doit définir une classe principale qui hérite conceptuellement des interfaces suivantes :

```python
class BaseAddon:
    """Interface de base pour tous les add-ons"""

    def __init__(self):
        self.name = "addon_name"
        self.logger = None

    async def initialize(self, context: Dict[str, Any]) -> None:
        """Initialisation de l'add-on"""
        pass

    async def cleanup(self) -> None:
        """Nettoyage des ressources"""
        pass

    def get_config_schema(self) -> Dict[str, Any]:
        """Schéma de configuration"""
        return {}

    def get_info(self) -> Dict[str, Any]:
        """Informations sur l'add-on"""
        return {
            "name": self.name,
            "version": "1.0.0",
            "capabilities": []
        }
```

### Instance Globale

Chaque add-on doit exposer une instance globale nommée `addon` :

```python
# Dans src/main.py
class MyAddon(BaseAddon):
    def __init__(self):
        super().__init__()
        self.name = "my_addon"

    async def initialize(self, context):
        self.logger = context.get('logger')
        # Initialisation spécifique

# Instance globale obligatoire
addon = MyAddon()
```

## Système de Hooks

Les hooks permettent aux add-ons de s'intégrer dans le cycle de vie du moteur.

### Hooks Système Disponibles

#### Cycle de Vie
- `addon_loaded`: Après chargement de l'add-on
- `addon_enabled`: Après activation
- `addon_disabled`: Après désactivation

#### Traitement
- `pre_processing`: Avant le traitement
- `post_processing`: Après le traitement
- `processing_error`: En cas d'erreur

#### Génération
- `pre_generation`: Avant génération
- `post_generation`: Après génération
- `content_filter`: Filtrage du contenu

#### Workflows
- `workflow_start`: Début de workflow
- `workflow_step`: Chaque étape
- `workflow_end`: Fin de workflow

#### Export
- `pre_export`: Avant export
- `post_export`: Après export
- `export_filter`: Filtrage d'export

#### Interface Utilisateur
- `ui_render`: Rendu UI
- `ui_event`: Gestion d'événements

#### Sécurité
- `security_check`: Vérifications sécurité
- `permission_request`: Demandes de permissions

### Enregistrement de Hooks

```python
from src.addon_hooks import hook_manager

# Enregistrement dans initialize()
async def initialize(self, context):
    # Enregistrement de hooks
    hook_manager.register_hook(
        addon_name=self.name,
        hook_name="post_generation",
        callback=self.on_content_generated,
        priority=HookPriority.NORMAL
    )

async def on_content_generated(self, content: str, **kwargs) -> str:
    """Hook appelé après génération"""
    # Traitement du contenu
    return processed_content
```

## Système d'Événements

Les événements permettent la communication asynchrone entre add-ons.

### Publication d'Événements

```python
from src.addon_events import event_bus

# Publication d'événement
await event_bus.publish_addon_event(
    addon_name=self.name,
    name="custom_event",
    data={"key": "value"},
    scope=EventScope.PROJECT
)
```

### Abonnement aux Événements

```python
# Dans initialize()
event_bus.subscribe(
    addon_name=self.name,
    event_pattern="other_addon.*",
    callback=self.on_other_addon_event
)

async def on_other_addon_event(self, event):
    """Gestionnaire d'événement"""
    print(f"Événement reçu: {event.name}")
```

## Système de Permissions

### Permissions Disponibles

- `model_access`: Accès aux modèles IA
- `file_system_read`: Lecture de fichiers
- `file_system_write`: Écriture de fichiers
- `network_access`: Accès réseau
- `ui_access`: Accès interface utilisateur
- `config_access`: Accès configuration
- `database_access`: Accès base de données
- `system_info_access`: Informations système

### Demande de Permissions

```python
from src.addon_permissions import permission_manager

# Demande de permission
request = permission_manager.create_permission_request(
    addon_name=self.name,
    permission="file_system_write",
    level=PermissionLevel.WRITE,
    justification="Sauvegarde des résultats"
)

grant = await permission_manager.request_permission(request)
if grant.granted:
    # Permission accordée
    pass
else:
    # Permission refusée
    pass
```

## Gestion des Dépendances

### Format des Dépendances

```json
{
  "dependencies": {
    "torch": ">=2.0.0",
    "transformers": ">=4.30.0,<5.0.0",
    "numpy": "==1.24.0"
  }
}
```

### Installation Automatique

Les dépendances sont automatiquement vérifiées lors du chargement de l'add-on. En cas de dépendances manquantes, l'add-on sera marqué comme défaillant.

## Validation et Sécurité

### Validation Automatique

Chaque add-on passe par plusieurs niveaux de validation :

1. **Validation du Manifest**: Conformité du schéma JSON
2. **Validation de Structure**: Présence des fichiers requis
3. **Validation du Code**: Analyse statique de sécurité
4. **Validation des Permissions**: Cohérence des demandes
5. **Validation des Dépendances**: Disponibilité des packages

### Score de Confiance

Chaque add-on reçoit un score de confiance (0-100) basé sur :
- Nombre d'issues de validation
- Sévérité des problèmes détectés
- Conformité aux bonnes pratiques

### Sandboxing

Les add-ons s'exécutent dans un environnement isolé avec :
- Contrôle d'accès aux ressources système
- Limitation des appels système dangereux
- Surveillance des performances
- Gestion automatique des erreurs

## Bonnes Pratiques

### Développement

1. **Validation Régulière**: Testez régulièrement avec le validateur
2. **Documentation**: Documentez toutes les fonctionnalités publiques
3. **Tests**: Écrivez des tests unitaires complets
4. **Logging**: Utilisez le système de logging fourni
5. **Gestion d'Erreurs**: Gérez gracieusement les erreurs

### Sécurité

1. **Principe du Moindre Privilège**:Demandez uniquement les permissions nécessaires
2. **Validation des Entrées**: Validez toutes les entrées utilisateur
3. **Échappement**: Protégez contre les injections
4. **Mises à Jour**: Maintenez les dépendances à jour

### Performance

1. **Async/Await**: Utilisez async pour toutes les opérations I/O
2. **Lazy Loading**: Chargez les ressources à la demande
3. **Cache**: Utilisez le cache pour les données fréquemment accédées
4. **Monitoring**: Surveillez les performances de votre add-on

## Cycle de Vie d'un Add-on

### 1. Découverte
- Le système scanne automatiquement les dossiers `addons/official/` et `addons/community/`
- Recherche de fichiers `addon.json` valides

### 2. Chargement
- Validation du manifest
- Chargement du module principal
- Vérification des dépendances

### 3. Initialisation
- Appel de `initialize()` avec le contexte
- Enregistrement des hooks et événements
- Demande des permissions

### 4. Activation
- L'add-on devient opérationnel
- Participation au traitement normal

### 5. Désactivation
- Arrêt des traitements
- Désenregistrement des hooks
- Nettoyage des ressources

### 6. Déchargement
- Suppression complète de la mémoire
- Nettoyage final

## Exemple Complet

Voir le dossier `examples/` pour des exemples complets d'add-ons pour chaque type.

## Support et Communauté

- **Documentation**: Consultez les guides dans `addons/docs/`
- **Exemples**: Voir `examples/` pour des implémentations complètes
- **Tests**: Les tests sont dans `tests/test_addons.py`

## Versions

- **v1.0**: Spécification initiale avec support basique
- **v1.1**: Ajout des hooks et événements
- **v1.2**: Système de permissions complet
- **v1.3**: Validation automatique et sécurité renforcée
