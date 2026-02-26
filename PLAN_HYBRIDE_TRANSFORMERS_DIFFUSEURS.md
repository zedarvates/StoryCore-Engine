# Plan d'Intégration Hybride Transformers/Diffuseurs pour StoryCore Assistant

## Résumé Exécutif

Ce plan décrit l'architecture et l'implémentation d'un système hybride permettant à l'utilisateur final de choisir entre **Transformers** (traditionnels) et **Diffuseurs** (modèles de diffusion) pour l'assistance StoryCore, avec un gain de performance attendu de **5 à 10 fois plus rapide** en exécution locale.

---

## 1. Contexte et Objectifs

### 1.1 Situation Actuelle
- **Architecture LLM** : Providers multiples (OpenAI, Ollama, Gemini, Grok, OpenRouter)
- **Provider local principal** : Ollama avec modèles Transformers (gemma3:1b, llama, etc.)
- **Interface de configuration** : `useAppStore.ts` avec `showLLMSettings`

### 1.2 Objectifs
| Objectif | Description |
|----------|-------------|
| 🎯 **Performance** | Gain de vitesse 5-10x pour les tâches locales |
| 🔧 **Choix utilisateur** | Sélection Transformers vs Diffuseurs dans les settings |
| 🔄 **Compatibilité** | Maintien du fonctionnement existant |
| 📦 **Local-first** | Priorité aux modèles locaux pour la confidentialité |

---

## 2. Architecture Technique

### 2.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    StoryCore Assistant                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              LLMProviderManager (Hybrid)                 │    │
│  │  ┌─────────────────┐    ┌──────────────────────────┐    │    │
│  │  │  Transformers   │    │      Diffuseurs          │    │    │
│  │  │  - OpenAI       │    │  - DiffusionLLM (local)  │    │    │
│  │  │  - Ollama       │    │  - LLaDA                 │    │    │
│  │  │  - Gemini       │    │  - SSEDS                 │    │    │
│  │  │  - Grok         │    │  - Custom Diffusion      │    │    │
│  │  └─────────────────┘    └──────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Provider Selection Layer                  │  │
│  │  - User Preference Check                                   │  │
│  │  - Task Type Routing (creative vs analytical)             │  │
│  │  - Fallback Chain Management                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Composants à Développer

#### A. Interface `DiffusionProvider` (Nouveau)

```typescript
// src/llm/diffusion-interfaces.ts

export interface DiffusionConfig {
  provider: 'diffusion';
  modelPath: string;           // Chemin du modèle local
  modelType: 'llda' | 'sseds' | 'custom';
  steps: number;               // Étapes de diffusion (défaut: 10-20)
  temperature?: number;
  maxTokens?: number;
  device: 'cuda' | 'cpu' | 'metal';  // GPU/CPU/MPS
}

export interface DiffusionProvider extends LLMProvider {
  // Hérite de LLMProvider
  generateText(prompt: string, config?: Partial<DiffusionConfig>): Promise<string>;
  generateCompletion(messages: Message[], config?: Partial<DiffusionConfig>): Promise<string>;
  
  // Méthodes spécifiques diffusion
  setSteps(steps: number): void;
  getProgress(): DiffusionProgress;
  abortGeneration(): void;
}
```

#### B. Implémentation `LLDADiffusionProvider` (Nouveau)

```typescript
// src/llm/diffusion-providers/llda-provider.ts

/**
 * LLaDA (Large Language Diffusion Model) Provider
 * Basé sur les modèles de diffusion pour texte
 * Performance: 5-10x plus rapide que Transformers équivalents
 */
export class LLDADiffusionProvider implements DiffusionProvider {
  private modelPath: string;
  private device: 'cuda' | 'cpu' | 'metal';
  private currentProgress: DiffusionProgress;
  
  constructor(config: DiffusionConfig) {
    this.modelPath = config.modelPath;
    this.device = config.device || this.detectDevice();
  }

  async generateText(prompt: string, config?: Partial<DiffusionConfig>): Promise<string> {
    // Appel au backend Python pour exécution du modèle de diffusion
    const response = await fetch('/api/diffusion/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        steps: config?.steps || 10,
        temperature: config?.temperature || 0.7,
      })
    });
    return response.text();
  }

  async isAvailable(): Promise<boolean> {
    // Vérifier si le modèle est chargé et disponible
    try {
      const response = await fetch('/api/diffusion/status');
      const status = await response.json();
      return status.loaded && status.model === this.modelPath;
    } catch {
      return false;
    }
  }
}
```

#### C. Backend Python pour Diffusion (Nouveau)

```python
# src/diffusion/diffusion_server.py

"""
Serveur FastAPI pour les modèles de diffusion texte.
Utilise LLaDA ou modèles similaires pour génération rapide.
"""

from fastapi import FastAPI, WebSocket
from pydantic import BaseModel
import torch
from typing import Optional

# Import conditionnel des modèles de diffusion
try:
    from diffusion_llm import LLaDA
    LLDADA_AVAILABLE = True
except ImportError:
    LLDADA_AVAILABLE = False

app = FastAPI()

class DiffusionRequest(BaseModel):
    prompt: str
    steps: int = 10
    temperature: float = 0.7
    max_tokens: int = 512

class DiffusionResponse(BaseModel):
    text: str
    steps_completed: int
    generation_time_ms: float

# Cache du modèle chargé
_loaded_model = None
_device = None

def get_device():
    if torch.cuda.is_available():
        return "cuda"
    elif torch.backends.mps.is_available():
        return "mps"
    return "cpu"

@app.post("/api/diffusion/generate", response_model=DiffusionResponse)
async def generate_diffusion(request: DiffusionRequest):
    """Génération de texte par diffusion - 5-10x plus rapide"""
    import time
    start = time.time()
    
    model = await get_or_load_model()
    
    # Génération par diffusion
    result = await model.generate(
        prompt=request.prompt,
        steps=request.steps,
        temperature=request.temperature,
        max_tokens=request.max_tokens
    )
    
    elapsed = (time.time() - start) * 1000
    
    return DiffusionResponse(
        text=result.text,
        steps_completed=request.steps,
        generation_time_ms=elapsed
    )

@app.get("/api/diffusion/status")
async def diffusion_status():
    """Statut du modèle de diffusion"""
    return {
        "loaded": _loaded_model is not None,
        "device": _device,
        "lldada_available": LLDADA_AVAILABLE
    }
```

#### D. Gestionnaire Hybride (Modification)

```typescript
// src/llm/hybrid-provider-manager.ts

export type ProviderMode = 'transformers' | 'diffusion' | 'auto';

export interface HybridProviderConfig {
  mode: ProviderMode;
  preferredDiffusionModel?: string;
  fallbackToTransformers: boolean;
  taskRouting: {
    creative: 'diffusion' | 'transformers';
    analytical: 'diffusion' | 'transformers';
    code: 'diffusion' | 'transformers';
  };
}

export class HybridProviderManager extends LLMProviderManager {
  private diffusionProviders: Map<string, DiffusionProvider> = new Map();
  private hybridConfig: HybridProviderConfig;

  constructor(config: HybridProviderConfig) {
    super();
    this.hybridConfig = config;
  }

  /**
   * Sélectionne le provider optimal selon le type de tâche
   */
  async generateText(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
    const taskType = this.detectTaskType(prompt);
    
    if (this.hybridConfig.mode === 'diffusion' || 
        (this.hybridConfig.mode === 'auto' && this.shouldUseDiffusion(taskType))) {
      
      const diffusionProvider = this.getBestDiffusionProvider();
      if (diffusionProvider && await diffusionProvider.isAvailable()) {
        try {
          return await diffusionProvider.generateText(prompt, config);
        } catch (error) {
          if (!this.hybridConfig.fallbackToTransformers) throw error;
          console.warn('Diffusion failed, falling back to transformers');
        }
      }
    }
    
    // Fallback vers Transformers
    return super.generateText(prompt, config);
  }

  private detectTaskType(prompt: string): 'creative' | 'analytical' | 'code' {
    const creativeKeywords = ['story', 'character', 'scene', 'dialogue', 'créer', 'imaginer'];
    const codeKeywords = ['code', 'function', 'script', 'python', 'javascript'];
    
    const lowerPrompt = prompt.toLowerCase();
    
    if (codeKeywords.some(kw => lowerPrompt.includes(kw))) return 'code';
    if (creativeKeywords.some(kw => lowerPrompt.includes(kw))) return 'creative';
    return 'analytical';
  }

  private shouldUseDiffusion(taskType: 'creative' | 'analytical' | 'code'): boolean {
    return this.hybridConfig.taskRouting[taskType] === 'diffusion';
  }
}
```

---

## 3. Modifications Requises

### 3.1 Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/llm/diffusion-interfaces.ts` | Interfaces TypeScript pour Diffusion |
| `src/llm/diffusion-providers/llda-provider.ts` | Provider LLaDA |
| `src/llm/diffusion-providers/sseds-provider.ts` | Provider SSEDS |
| `src/llm/hybrid-provider-manager.ts` | Gestionnaire hybride |
| `src/diffusion/diffusion_server.py` | Serveur Python diffusion |
| `src/diffusion/__init__.py` | Module Python |

### 3.2 Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/llm/provider-manager.ts` | Ajouter support DiffusionProvider |
| `src/llm/interfaces.ts` | Ajouter types diffusion |
| `creative-studio-ui/src/stores/useAppStore.ts` | État diffusionSettings |
| `creative-studio-ui/src/components/LLMSettings.tsx` | UI sélection Transformers/Diffusion |

### 3.3 Nouveau Composant UI

```tsx
// creative-studio-ui/src/components/DiffusionSettings.tsx

interface DiffusionSettingsProps {
  config: HybridProviderConfig;
  onChange: (config: HybridProviderConfig) => void;
}

export function DiffusionSettings({ config, onChange }: DiffusionSettingsProps) {
  return (
    <div className="diffusion-settings">
      <h3>Mode de Génération</h3>
      
      <RadioGroup value={config.mode} onChange={(mode) => onChange({ ...config, mode })}>
        <RadioOption value="transformers">
          <strong>Transformers (Classique)</strong>
          <p>Haute qualité, plus lent. Idéal pour l'analyse.</p>
        </RadioOption>
        
        <RadioOption value="diffusion">
          <strong>Diffusion (Rapide)</strong>
          <p>5-10x plus rapide en local. Idéal pour la création.</p>
        </RadioOption>
        
        <RadioOption value="auto">
          <strong>Automatique</strong>
          <p>Sélection intelligente selon le type de tâche.</p>
        </RadioOption>
      </RadioGroup>

      {config.mode !== 'transformers' && (
        <>
          <h4>Paramètres Diffusion</h4>
          <Slider label="Étapes de diffusion" min={5} max={50} value={config.steps} />
          <Checkbox label="Fallback vers Transformers" checked={config.fallbackToTransformers} />
        </>
      )}
    </div>
  );
}
```

---

## 4. Modèles de Diffusion Recommandés

### 4.1 Options Disponibles

| Modèle | Taille | Vitesse | Qualité | Utilisation |
|--------|--------|---------|---------|-------------|
| **LLaDA** | 1B-7B | ⚡⚡⚡ | ⭐⭐⭐ | Génération créative rapide |
| **SSEDS** | 350M-1B | ⚡⚡⚡⚡ | ⭐⭐ | Tâches simples, très rapide |
| **Diffusion-LM** | 1B | ⚡⚡ | ⭐⭐⭐⭐ | Équilibré qualité/vitesse |

### 4.2 Recommandation pour StoryCore

```
Configuration par défaut recommandée:
┌─────────────────────────────────────────┐
│ Tâches créatives (scènes, dialogues)    │ → Diffusion (LLaDA)
│ Tâches analytiques (parsing, structure)  │ → Transformers (Ollama)
│ Code/Scripts                             │ → Transformers (fallback)
└─────────────────────────────────────────┘
```

---

## 5. Plan d'Implémentation

### Phase 1: Infrastructure (Semaine 1-2)
- [ ] Créer `diffusion-interfaces.ts`
- [ ] Implémenter `diffusion_server.py`
- [ ] Ajouter support GPU/CPU dans le backend
- [ ] Tests unitaires pour la couche diffusion

### Phase 2: Providers (Semaine 3-4)
- [ ] Implémenter `LLDADiffusionProvider`
- [ ] Implémenter `SSEDSProvider`
- [ ] Intégrer dans `HybridProviderManager`
- [ ] Tests d'intégration

### Phase 3: UI/UX (Semaine 5)
- [ ] Ajouter `DiffusionSettings.tsx`
- [ ] Modifier `LLMSettings.tsx` existant
- [ ] Ajouter indicateur de performance en temps réel
- [ ] Documentation utilisateur

### Phase 4: Optimisation (Semaine 6)
- [ ] Benchmarks performance
- [ ] Optimisation mémoire GPU
- [ ] Cache intelligent
- [ ] Tests de charge

---

## 6. Gains de Performance Attendus

### 6.1 Métriques Cibles

| Métrique | Transformers | Diffusion | Gain |
|----------|--------------|-----------|------|
| Latence moyenne | 2000ms | 300-500ms | **4-6x** |
| Tokens/sec | 15-30 | 100-200 | **5-7x** |
| Mémoire GPU | 4-8GB | 2-4GB | **2x moins** |
| Qualité sortie | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Comparable |

### 6.2 Cas d'Usage StoryCore

```
Génération de scène:
┌──────────────────────────────────────────────────┐
│ Transformers: 8-15 secondes ( qualité maximale)  │
│ Diffusion: 1-3 secondes (excellent pour itérations)│
│ → Gain utilisateur: Itérations rapides en créa   │
└──────────────────────────────────────────────────┘

Génération de dialogue:
┌──────────────────────────────────────────────────┐
│ Transformers: 5-10 secondes                      │
│ Diffusion: 0.5-2 secondes                        │
│ → Gain: Expérimentation instantanée              │
└──────────────────────────────────────────────────┘
```

---

## 7. Risques et Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Modèle non disponible | Moyenne | Moyen | Fallback automatique vers Transformers |
| Qualité inférieure | Basse | Moyen | Paramètre `steps` ajustable |
| Conflit GPU avec ComfyUI | Moyenne | Élevé | Gestionnaire de ressources GPU partagé |
| Dépendances Python | Basse | Faible | Installation automatique via pip |

---

## 8. Dépendances

### Python (Backend)
```txt
# requirements-diffusion.txt
torch>=2.0.0
diffusion-lm>=0.1.0  # ou équivalent
fastapi>=0.100.0
uvicorn>=0.22.0
```

### Node.js (Frontend)
```json
{
  "dependencies": {
    // Pas de nouvelles dépendances requises
  }
}
```

---

## 9. Tests

### 9.1 Tests Unitaires
```typescript
// src/llm/__tests__/hybrid-provider-manager.test.ts

describe('HybridProviderManager', () => {
  it('should use diffusion for creative tasks in auto mode', async () => {
    // ...
  });
  
  it('should fallback to transformers if diffusion fails', async () => {
    // ...
  });
  
  it('should respect user preference for transformers', async () => {
    // ...
  });
});
```

### 9.2 Tests de Performance
```python
# tests/test_diffusion_performance.py

def benchmark_generation():
    """Compare diffusion vs transformers performance"""
    # ...
```

---

## 10. Conclusion

Cette architecture hybride permet à l'utilisateur de bénéficier:

1. **De la vitesse des Diffuseurs** pour les tâches créatives itératives
2. **De la qualité des Transformers** pour les tâches analytiques
3. **D'un choix flexible** selon ses préférences et matériel

Le gain de **5-10x en vitesse** pour les tâches créatives locales améliore significativement l'expérience utilisateur, particulièrement pour:
- Génération de scènes et dialogues
- Expérimentation rapide d'idées
- Workflow itératif de création

---

**Document créé le**: 2026-02-25  
**Version**: 1.0  
**Auteur**: StoryCore Team