# World Builder API Reference

## Vue d'ensemble

Cette référence API détaille les interfaces et services backend du World Builder Wizard. L'API est organisée autour de trois services principaux : WorldBuilderService, LLMAugmentationService, et PersistenceService.

## Architecture API

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ WorldBuilder    │    │ LLMAugmentation  │    │ Persistence     │
│ Service (CLI)   │    │ Service (UI)      │    │ Service (UI)    │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • World Gen     │    │ • LLM Calls       │    │ • Multi-layer   │
│ • Validation    │    │ • Streaming       │    │ • Fallbacks     │
│ • Export        │    │ • Retry Logic     │    │ • Sync          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                    ┌──────────────────┐
                    │ Client Interface │
                    │ (WizardService)  │
                    └──────────────────┘
```

## WorldBuilderService (Backend Python)

### Classe Principale

```python
class WorldGenerationEngine:
    """Moteur de génération de monde avec templates par genre."""

    def __init__(self):
        self.world_types = self._load_world_templates()

    def generate_world(self, project_seed: int, genre: str = "fantasy",
                      world_type: Optional[str] = None) -> Dict[str, Any]:
        """Génère un monde complet avec tous les composants."""
        pass

    def validate_world_consistency(self, world_data: Dict[str, Any],
                                  prompts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Valide la cohérence d'un monde avec des prompts de génération."""
        pass

    def save_world(self, world_data: Dict[str, Any], project_path: Path) -> Path:
        """Sauvegarde les données du monde."""
        pass

    def load_world(self, project_path: Path) -> Optional[Dict[str, Any]]:
        """Charge les données du monde."""
        pass
```

### Méthodes de Génération

#### `generate_world(project_seed, genre, world_type) -> Dict`

Génère un monde complet avec tous les composants nécessaires.

**Paramètres :**
- `project_seed` (int): Graine pour reproductibilité
- `genre` (str): Genre primaire ("fantasy", "sci_fi", "horror", etc.)
- `world_type` (Optional[str]): Type spécifique de monde

**Retour :**
```json
{
  "world_id": "world_fantasy_epic_001",
  "name": "Elyndor Realm",
  "type": "high_fantasy",
  "genre": "fantasy",
  "geography": {...},
  "culture": {...},
  "atmosphere": {...},
  "visual_identity": {...},
  "world_features": {...}
}
```

**Erreurs :**
- `ValueError`: Si le genre n'est pas supporté
- `KeyError`: Si le world_type n'existe pas

#### `validate_world_consistency(world_data, prompts) -> Dict`

Valide qu'un monde est cohérent avec des prompts de génération.

**Paramètres :**
- `world_data` (Dict): Données du monde à valider
- `prompts` (List[Dict]): Liste de prompts à vérifier

**Retour :**
```json
{
  "is_consistent": true,
  "issues": [],
  "confidence_score": 0.87,
  "recommendations": [
    "Consider adding more specific lighting characteristics"
  ]
}
```

### Templates de Monde

#### Structure des Templates

```python
WORLD_TEMPLATES = {
    "fantasy": {
        "high_fantasy": {
            "technology_levels": ["medieval_magic", "renaissance_magic"],
            "atmospheres": ["mysterious_epic", "majestic_ancient"],
            "color_palettes": {
                "primary": ["#4A90E2", "#7ED321", "#F5A623"],
                "secondary": ["#BD10E0", "#50E3C2"]
            },
            "architectural_styles": ["gothic_fantasy", "elven_organic"],
            "societal_types": ["feudal_monarchy", "tribal_clans"]
        }
    }
}
```

## LLMAugmentationService (UI TypeScript)

### Interface LLMService

```typescript
interface LLMService {
  generateCompletion(request: LLMRequest): Promise<ApiResponse<LLMResponse>>;
  generateStreamingCompletion(
    request: LLMRequest,
    onChunk: StreamChunkCallback
  ): Promise<ApiResponse<LLMResponse>>;
  validateConnection(): Promise<ApiResponse<boolean>>;
  generateImage(options: ImageGenerationOptions): Promise<ApiResponse<GeneratedImage>>;
}
```

### Types de Requêtes

#### LLMRequest

```typescript
interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  context?: Record<string, any>;
  stream?: boolean;
  temperature?: number;  // 0-2
  maxTokens?: number;
}
```

#### LLMResponse

```typescript
interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
}
```

### Gestion d'Erreurs

#### LLMError Class

```typescript
class LLMError extends Error {
  code: string;
  retryable: boolean;
  category: LLMErrorCategory;
  details?: any;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    details?: any,
    category?: LLMErrorCategory
  );

  getUserMessage(): string;
  getSuggestedActions(): string[];
}
```

#### Catégories d'Erreurs

```typescript
enum LLMErrorCategory {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  INVALID_REQUEST = 'invalid_request',
  CONTENT_FILTER = 'content_filter',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}
```

### Configuration

#### LLMConfig

```typescript
interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  apiKey: string;
  apiEndpoint?: string;
  model: string;
  parameters: {
    temperature: number;  // 0-2
    maxTokens: number;
    topP: number;  // 0-1
    frequencyPenalty: number;  // -2 to 2
    presencePenalty: number;  // -2 to 2
  };
  systemPrompts: {
    worldGeneration: string;
    characterGeneration: string;
    dialogueGeneration: string;
  };
  timeout: number;  // milliseconds
  retryAttempts: number;
  streamingEnabled: boolean;
}
```

### Prompts Système par Défaut

```typescript
const DEFAULT_SYSTEM_PROMPTS = {
  worldGeneration: `You are a creative world-building assistant for storytelling and visual content creation. Generate rich, coherent, and detailed world descriptions that are internally consistent and visually compelling. Consider genre conventions, cultural elements, visual aesthetics, color palettes, and narrative potential. Provide specific, vivid details that help creators visualize and understand the world. When describing visual elements, be precise about composition, lighting, atmosphere, and mood.`,

  characterGeneration: `You are a character development expert for storytelling and visual media. Create well-rounded, believable characters with consistent traits, motivations, backgrounds, and distinctive visual appearances. Ensure that physical appearance, personality, and backstory align logically. Consider character archetypes, narrative roles, relationship dynamics, and visual design elements like costume, color schemes, and distinctive features. Provide detailed visual descriptions that can guide character design and illustration.`,

  dialogueGeneration: `You are a dialogue writing specialist for narrative content. Create natural, character-appropriate dialogue that reveals personality, advances plot, maintains consistent voice, and feels authentic to the character's background and emotional state. Consider subtext, pacing, and how dialogue can convey visual actions and reactions. Ensure dialogue works well for both text and potential voice acting or animation.`
};
```

## PersistenceService (UI TypeScript)

### Interface PersistenceService

```typescript
interface PersistenceService {
  saveWorld(world: World, projectPath?: string): Promise<PersistenceResult[]>;
  loadWorld(worldId: string, projectPath?: string): Promise<World | null>;
  validateWorld(world: World): ValidationResult;
  syncData(projectPath?: string): Promise<{ synced: number, errors: number }>;
}
```

### Résultats de Persistance

#### PersistenceResult

```typescript
interface PersistenceResult {
  success: boolean;
  layer: 'store' | 'localStorage' | 'file' | 'fallback';
  error?: string;
  retryCount?: number;
}
```

#### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Couches de Persistance

1. **Store Zustand** : État en mémoire de l'application
2. **localStorage** : Persistance navigateur avec organisation par projet
3. **Fichiers JSON** : Sauvegarde dans le système de fichiers du projet
4. **IndexedDB** : Fallback robuste pour gros volumes de données

### Clés de localStorage

```
project-{projectName}-worlds  // Mondes par projet
world-{worldId}-metadata     // Métadonnées spécifiques
world-{worldId}-backup       // Sauvegardes automatiques
```

## API Client (WizardService)

### Interface WizardService

```typescript
interface WizardService {
  launchWizard(
    wizardId: string,
    projectPath?: string,
    options?: Record<string, any>
  ): Promise<WizardLaunchResult>;

  checkOllamaConnection(): Promise<ConnectionStatus>;
  checkComfyUIConnection(): Promise<ConnectionStatus>;

  getWizardOptions(wizardId: string): Record<string, any>;
  validateWizardLaunch(wizard: WizardDefinition, projectPath?: string): ValidationResult;
}
```

### Commandes CLI Disponibles

#### World Builder Commands

```typescript
const WORLD_BUILDER_COMMANDS = {
  'world-building': 'storycore world-wizard',
  // Options disponibles :
  // --genre <genre>
  // --world-type <type>
  // --extract-from <file>
  // --llm-enhance
  // --validate
  // --export
};
```

### Résultats de Lancement

#### WizardLaunchResult

```typescript
interface WizardLaunchResult {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
}
```

#### ConnectionStatus

```typescript
interface ConnectionStatus {
  connected: boolean;
  service: 'ollama' | 'comfyui';
  endpoint: string;
  error?: string;
}
```

## Schémas de Données

### Schéma JSON Monde Complet

```json
{
  "$schema": "https://storycore.world/schemas/world-v2.1.json",
  "type": "object",
  "required": ["world_id", "name", "genre"],
  "properties": {
    "world_id": {
      "type": "string",
      "pattern": "^world_[a-z_]+_[0-9]{3}$"
    },
    "name": {
      "type": "string",
      "minLength": 3,
      "maxLength": 50
    },
    "type": {
      "type": "string",
      "enum": ["high_fantasy", "dark_fantasy", "urban_fantasy", "hard_sci_fi", "space_opera", "cyberpunk", "post_apocalyptic", "historical_fantasy", "superhero", "horror_modern"]
    },
    "genre": {
      "type": "string",
      "enum": ["fantasy", "sci_fi", "horror", "action", "drama", "comedy", "romance", "thriller", "crime", "western", "historical", "animation", "documentary", "musical", "family", "experimental"]
    },
    "time_period": {
      "type": "string",
      "enum": ["ancient", "medieval", "renaissance", "industrial", "modern", "future", "distant_future", "alternate_history", "timeless"]
    },
    "geography": {
      "type": "object",
      "properties": {
        "terrain": {
          "type": "array",
          "items": {"type": "string"},
          "minItems": 1
        },
        "climate": {"type": "string"},
        "key_features": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    },
    "culture": {
      "type": "object",
      "properties": {
        "societies": {
          "type": "array",
          "items": {"type": "string"}
        },
        "technology_level": {"type": "string"},
        "customs": {
          "type": "array",
          "items": {"type": "string"}
        },
        "values": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    },
    "atmosphere": {
      "type": "object",
      "properties": {
        "mood": {"type": "string"},
        "sensory_details": {
          "type": "array",
          "items": {"type": "string"}
        },
        "environmental_mood": {"type": "string"}
      }
    },
    "visual_identity": {
      "type": "object",
      "properties": {
        "color_palette": {
          "type": "object",
          "properties": {
            "primary": {
              "type": "array",
              "items": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
              "minItems": 3,
              "maxItems": 5
            },
            "secondary": {
              "type": "array",
              "items": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"}
            }
          }
        },
        "architectural_style": {"type": "string"},
        "lighting_characteristics": {"type": "string"},
        "visual_motifs": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "created_at": {"type": "string", "format": "date-time"},
        "updated_at": {"type": "string", "format": "date-time"},
        "created_by": {"type": "string"},
        "version": {"type": "string"},
        "confidence_score": {"type": "number", "minimum": 0, "maximum": 1}
      }
    }
  }
}
```

## Gestion des Versions

### Changements par Version

#### v2.1.0 (Current)
- Ajout de `confidence_score` dans métadonnées
- Validation améliorée des palettes couleur
- Support des motifs visuels dans `visual_identity`
- Extraction source tracking

#### v2.0.0
- Refonte complète de la structure JSON
- Séparation claire geography/culture/atmosphere
- Validation schema-based
- Support multi-layer persistance

#### v1.5.0
- Ajout de `visual_identity` complet
- Intégration LLM augmentation
- Templates par monde étendus

## Gestion d'Erreurs

### Codes d'Erreur par Service

#### WorldBuilderService
- `WORLD_GEN_FAILED`: Échec génération monde
- `INVALID_GENRE`: Genre non supporté
- `VALIDATION_FAILED`: Données invalides
- `SAVE_FAILED`: Échec sauvegarde

#### LLMAugmentationService
- `LLM_AUTH_FAILED`: Authentification échouée
- `LLM_RATE_LIMIT`: Limite taux dépassée
- `LLM_TIMEOUT`: Timeout requête
- `LLM_NETWORK_ERROR`: Erreur réseau

#### PersistenceService
- `PERSISTENCE_LAYER_FAILED`: Couche persistance échouée
- `VALIDATION_ERRORS`: Erreurs validation
- `SYNC_CONFLICT`: Conflit synchronisation

### Gestion des Timeouts

```typescript
// Configuration des timeouts par opération
const TIMEOUTS = {
  worldGeneration: 30000,    // 30s pour génération monde
  llmCall: 60000,           // 60s pour appels LLM
  fileSave: 10000,          // 10s pour sauvegarde fichiers
  validation: 5000,         // 5s pour validation
};
```

### Retry Logic

```typescript
// Configuration retry avec backoff exponentiel
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,     // 1s
  maxDelay: 10000,     // 10s max
  backoffFactor: 2,    // Multiplicateur
};
```

## Métriques et Monitoring

### Métriques Collectées

```typescript
interface WorldBuilderMetrics {
  generationTime: number;        // Temps génération (ms)
  llmTokensUsed: number;        // Tokens LLM consommés
  validationErrors: number;     // Nombre erreurs validation
  persistenceSuccess: boolean;  // Succès persistance
  confidenceScore: number;      // Score confiance (0-1)
  worldComplexity: number;      // Complexité monde (1-10)
}
```

### Alertes et Seuils

- **Performance** : Génération > 30s → avertissement
- **Qualité** : Confidence < 0.7 → review requise
- **Fiabilité** : Taux erreurs > 5% → investigation
- **Ressources** : Mémoire > 500MB → optimisation

## Sécurité

### Validation d'Entrée

- Sanitisation de tous les inputs utilisateur
- Validation schema JSON strict
- Limitation taille des payloads
- Échappement des caractères spéciaux

### Gestion des Clés API

- Chiffrement des clés en stockage
- Rotation automatique des clés
- Audit des accès API
- Rate limiting côté client

### Isolation des Données

- Sandboxing des opérations LLM
- Séparation des contextes par projet
- Nettoyage automatique des données temporaires
- Logs sécurisés sans données sensibles

## Performance

### Optimisations

- **Caching** : Résultats LLM mis en cache
- **Lazy Loading** : Templates chargés à la demande
- **Streaming** : Réponses LLM en streaming
- **Parallel Processing** : Génération composants en parallèle

### Benchmarks

| Opération | Temps Moyen | P95 | Mémoire Max |
|-----------|-------------|-----|-------------|
| World Generation | 12.5s | 25.0s | 256MB |
| LLM Enhancement | 8.3s | 18.7s | 128MB |
| Validation | 0.8s | 2.1s | 64MB |
| Persistence | 1.2s | 3.5s | 96MB |

### Limitations

- **Taille monde** : Max 50MB par monde
- **Complexité** : Max 20 sociétés, 50 features géographiques
- **Concurrent** : Max 5 générations simultanées
- **Rate limit** : 10 requêtes/minute par utilisateur