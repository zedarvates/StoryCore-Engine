# Exemples d'Utilisation - Gestion des Modèles Locaux

## 📚 Table des matières

1. [Utilisation de base](#utilisation-de-base)
2. [Utilisation avancée](#utilisation-avancée)
3. [Intégration dans l'application](#intégration-dans-lapplication)
4. [Cas d'usage réels](#cas-dusage-réels)
5. [Dépannage](#dépannage)

## Utilisation de base

### Exemple 1: Premier téléchargement

```typescript
// L'utilisateur ouvre les paramètres LLM
// Sélectionne "Local" comme provider
// Le composant LocalModelSelector s'affiche automatiquement

// Interaction utilisateur:
// 1. Clic sur "Download" pour Gemma 3 1B
// 2. Attente du téléchargement (barre de progression)
// 3. Modèle automatiquement sélectionné
// 4. Clic sur "Save Settings"

// Résultat:
// - Modèle téléchargé dans ~/.ollama/models/
// - Configuration LLM mise à jour avec model: "gemma3:1b"
// - Prêt à utiliser dans l'application
```

### Exemple 2: Sélection d'un modèle existant

```typescript
// L'utilisateur a déjà plusieurs modèles installés
// Ouvre les paramètres LLM

// Interaction utilisateur:
// 1. Voir les modèles avec badge "✓ Installed"
// 2. Clic sur "Select" pour Llama 3 8B
// 3. Clic sur "Save Settings"

// Résultat:
// - Configuration mise à jour avec model: "llama3:8b"
// - Changement immédiat pour les prochaines générations
```

### Exemple 3: Suppression d'un modèle

```typescript
// L'utilisateur veut libérer de l'espace disque

// Interaction utilisateur:
// 1. Clic sur l'icône 🗑️ pour Gemma 3 7B
// 2. Confirmation: "Are you sure...?"
// 3. Modèle supprimé

// Résultat:
// - Modèle supprimé de ~/.ollama/models/
// - Espace disque libéré (7GB)
// - Badge "Installed" disparaît
// - Si c'était le modèle sélectionné, sélection effacée
```

## Utilisation avancée

### Exemple 4: Utilisation programmatique du service

```typescript
import { getLocalModelService } from '@/services/localModelService';

async function setupLocalModel() {
  const modelService = getLocalModelService('http://localhost:11434');
  
  // Vérifier si Ollama est en cours d'exécution
  const isRunning = await modelService.isOllamaRunning();
  if (!isRunning) {
    console.error('Ollama is not running');
    return;
  }
  
  // Obtenir les modèles installés
  const installed = await modelService.getInstalledModels();
  console.log('Installed models:', installed);
  
  // Obtenir les recommandations
  const recommended = await modelService.getRecommendedModels();
  console.log('Recommended models:', recommended);
  
  // Télécharger un modèle avec suivi de progression
  const success = await modelService.downloadModel(
    'gemma3:3b',
    (progress) => {
      console.log(`Download progress: ${progress.progress.toFixed(2)}%`);
      console.log(`Downloaded: ${modelService.formatBytes(progress.downloadedBytes)}`);
      console.log(`Total: ${modelService.formatBytes(progress.totalBytes)}`);
    }
  );
  
  if (success) {
    console.log('Model downloaded successfully!');
  }
}
```

### Exemple 5: Intégration dans un composant React

```typescript
import { useState, useEffect } from 'react';
import { getLocalModelService, type LocalModel } from '@/services/localModelService';

function MyModelManager() {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const modelService = getLocalModelService();
  
  useEffect(() => {
    loadModels();
  }, []);
  
  const loadModels = async () => {
    setIsLoading(true);
    
    // Obtenir les modèles recommandés
    const recommended = await modelService.getRecommendedModels();
    setModels(recommended);
    
    // Obtenir les modèles installés
    const installed = await modelService.getInstalledModels();
    
    // Sélectionner le premier modèle installé
    if (installed.length > 0) {
      setSelectedModel(installed[0]);
    }
    
    setIsLoading(false);
  };
  
  const handleDownload = async (modelId: string) => {
    await modelService.downloadModel(modelId, (progress) => {
      // Mettre à jour l'UI avec la progression
      console.log(`Downloading ${modelId}: ${progress.progress}%`);
    });
    
    // Recharger les modèles
    await loadModels();
  };
  
  return (
    <div>
      {isLoading ? (
        <p>Loading models...</p>
      ) : (
        <div>
          {models.map(model => (
            <div key={model.id}>
              <h3>{model.displayName}</h3>
              <p>{model.description}</p>
              <button onClick={() => handleDownload(model.id)}>
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Exemple 6: Détection des capacités système

```typescript
import { getLocalModelService } from '@/services/localModelService';

async function analyzeSystemCapabilities() {
  const modelService = getLocalModelService();
  
  // Obtenir les capacités système
  const capabilities = await modelService.getSystemCapabilities();
  
  console.log('System Analysis:');
  console.log(`Total RAM: ${capabilities.totalRAM}GB`);
  console.log(`Available RAM: ${capabilities.availableRAM}GB`);
  console.log(`Has GPU: ${capabilities.hasGPU}`);
  
  // Obtenir le meilleur modèle pour ce système
  const bestModel = await modelService.getBestModel();
  
  if (bestModel) {
    console.log('\nRecommended Model:');
    console.log(`Name: ${bestModel.displayName}`);
    console.log(`Size: ${bestModel.size}`);
    console.log(`Min RAM: ${bestModel.minRAM}GB`);
    console.log(`Recommended RAM: ${bestModel.recommendedRAM}GB`);
    console.log(`Requires GPU: ${bestModel.requiresGPU}`);
  }
}
```

## Intégration dans l'application

### Exemple 7: Utilisation dans un wizard

```typescript
import { getLocalModelService } from '@/services/localModelService';
import { getLLMService } from '@/services/llmService';

async function generateWithLocalModel(prompt: string) {
  const modelService = getLocalModelService();
  
  // Vérifier qu'un modèle est installé
  const installed = await modelService.getInstalledModels();
  if (installed.length === 0) {
    throw new Error('No local models installed');
  }
  
  // Utiliser le premier modèle installé
  const modelId = installed[0];
  
  // Créer le service LLM avec le modèle local
  const llmService = getLLMService({
    provider: 'local',
    apiEndpoint: 'http://localhost:11434',
    model: modelId,
    apiKey: '', // Pas nécessaire pour local
    parameters: {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    systemPrompts: {
      worldGeneration: 'You are a creative world-building assistant...',
      characterGeneration: 'You are a character development expert...',
      dialogueGeneration: 'You are a dialogue writing specialist...',
    },
    timeout: 30000,
    retryAttempts: 3,
    streamingEnabled: true,
  });
  
  // Générer du contenu
  const response = await llmService.generateCompletion({
    prompt,
    systemPrompt: 'You are a helpful assistant.',
  });
  
  if (response.success && response.data) {
    return response.data.content;
  }
  
  throw new Error('Generation failed');
}

// Utilisation
const worldDescription = await generateWithLocalModel(
  'Create a fantasy world with magic and dragons'
);
console.log(worldDescription);
```

### Exemple 8: Chatbox avec modèle local

```typescript
import { useState } from 'react';
import { getLocalModelService } from '@/services/localModelService';
import { getLLMService } from '@/services/llmService';

function LocalChatbox() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemma3:3b');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Ajouter le message utilisateur
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    
    try {
      // Créer le service LLM
      const llmService = getLLMService({
        provider: 'local',
        apiEndpoint: 'http://localhost:11434',
        model: selectedModel,
        apiKey: '',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1.0,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      });
      
      // Générer la réponse avec streaming
      let assistantMessage = '';
      
      await llmService.generateStreamingCompletion(
        {
          prompt: input,
          systemPrompt: 'You are a helpful assistant.',
        },
        (chunk) => {
          assistantMessage += chunk;
          // Mettre à jour l'UI en temps réel
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = assistantMessage;
            } else {
              newMessages.push({ role: 'assistant', content: assistantMessage });
            }
            return newMessages;
          });
        }
      );
    } catch (error) {
      console.error('Generation failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div>
      <div>
        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          <option value="gemma3:1b">Gemma 3 1B</option>
          <option value="gemma3:3b">Gemma 3 3B</option>
          <option value="llama3:8b">Llama 3 8B</option>
        </select>
      </div>
      
      <div>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      
      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isGenerating}
        />
        <button onClick={handleSend} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

## Cas d'usage réels

### Cas 1: Développeur avec RAM limitée

```typescript
// Situation: Développeur avec 8GB RAM, veut tester localement

async function setupForLimitedRAM() {
  const modelService = getLocalModelService();
  
  // Obtenir les modèles compatibles
  const capabilities = await modelService.getSystemCapabilities();
  console.log(`Available RAM: ${capabilities.availableRAM}GB`);
  
  // Filtrer les modèles par RAM
  const compatibleModels = LOCAL_MODELS.filter(
    model => model.minRAM <= capabilities.availableRAM
  );
  
  console.log('Compatible models:');
  compatibleModels.forEach(model => {
    console.log(`- ${model.displayName} (${model.size})`);
  });
  
  // Recommandation: Gemma 3 1B ou 3B
  const recommended = compatibleModels.find(m => m.id === 'gemma3:3b');
  
  if (recommended) {
    console.log(`\nRecommended: ${recommended.displayName}`);
    console.log(`Reason: Good balance of performance and resource usage`);
    
    // Télécharger le modèle recommandé
    await modelService.downloadModel(recommended.id);
  }
}
```

### Cas 2: Production avec haute performance

```typescript
// Situation: Serveur de production avec 64GB RAM et GPU

async function setupForProduction() {
  const modelService = getLocalModelService();
  
  // Vérifier les capacités
  const capabilities = await modelService.getSystemCapabilities();
  
  if (capabilities.totalRAM >= 48 && capabilities.hasGPU) {
    console.log('High-performance system detected');
    
    // Télécharger Llama 3 70B pour la meilleure qualité
    console.log('Downloading Llama 3 70B...');
    await modelService.downloadModel('llama3:70b', (progress) => {
      if (progress.progress % 10 === 0) {
        console.log(`Progress: ${progress.progress}%`);
      }
    });
    
    console.log('Production model ready!');
  } else {
    console.log('System does not meet requirements for Llama 3 70B');
    console.log('Falling back to Llama 3 8B');
    await modelService.downloadModel('llama3:8b');
  }
}
```

### Cas 3: Multilingue avec Qwen

```typescript
// Situation: Application multilingue nécessitant support international

async function setupMultilingual() {
  const modelService = getLocalModelService();
  
  // Télécharger Qwen 2 7B pour le support multilingue
  console.log('Setting up multilingual support with Qwen 2 7B...');
  
  await modelService.downloadModel('qwen2:7b', (progress) => {
    console.log(`Downloading: ${progress.progress.toFixed(2)}%`);
  });
  
  // Tester avec différentes langues
  const llmService = getLLMService({
    provider: 'local',
    model: 'qwen2:7b',
    apiEndpoint: 'http://localhost:11434',
    apiKey: '',
    parameters: {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    systemPrompts: {
      worldGeneration: '',
      characterGeneration: '',
      dialogueGeneration: '',
    },
    timeout: 30000,
    retryAttempts: 3,
    streamingEnabled: false,
  });
  
  // Test en français
  const frenchResponse = await llmService.generateCompletion({
    prompt: 'Décris un monde fantastique en français',
  });
  
  // Test en chinois
  const chineseResponse = await llmService.generateCompletion({
    prompt: '用中文描述一个奇幻世界',
  });
  
  console.log('Multilingual support verified!');
}
```

## Dépannage

### Problème 1: Ollama ne démarre pas

```typescript
async function troubleshootOllama() {
  const modelService = getLocalModelService();
  
  // Vérifier si Ollama est en cours d'exécution
  const isRunning = await modelService.isOllamaRunning();
  
  if (!isRunning) {
    console.log('Ollama is not running. Troubleshooting steps:');
    console.log('1. Check if Ollama is installed: ollama --version');
    console.log('2. Start Ollama service: ollama serve');
    console.log('3. Check if port 11434 is available');
    console.log('4. Verify firewall settings');
    
    // Essayer avec un endpoint alternatif
    const altService = getLocalModelService('http://127.0.0.1:11434');
    const altRunning = await altService.isOllamaRunning();
    
    if (altRunning) {
      console.log('✓ Ollama found on alternative endpoint: 127.0.0.1:11434');
    }
  } else {
    console.log('✓ Ollama is running correctly');
  }
}
```

### Problème 2: Téléchargement échoue

```typescript
async function troubleshootDownload(modelId: string) {
  const modelService = getLocalModelService();
  
  console.log(`Attempting to download ${modelId}...`);
  
  try {
    const success = await modelService.downloadModel(
      modelId,
      (progress) => {
        if (progress.status === 'error') {
          console.error(`Download error: ${progress.error}`);
          console.log('Troubleshooting steps:');
          console.log('1. Check internet connection');
          console.log('2. Verify disk space is available');
          console.log('3. Try downloading via CLI: ollama pull ' + modelId);
          console.log('4. Check Ollama logs for details');
        }
      }
    );
    
    if (!success) {
      console.log('Download failed. Trying alternative approach...');
      console.log('Run in terminal: ollama pull ' + modelId);
    }
  } catch (error) {
    console.error('Download exception:', error);
  }
}
```

### Problème 3: Modèle lent

```typescript
async function optimizeModelPerformance() {
  const modelService = getLocalModelService();
  
  // Analyser les capacités système
  const capabilities = await modelService.getSystemCapabilities();
  
  console.log('Performance Analysis:');
  console.log(`Available RAM: ${capabilities.availableRAM}GB`);
  console.log(`Has GPU: ${capabilities.hasGPU}`);
  
  // Obtenir les modèles installés
  const installed = await modelService.getInstalledModels();
  
  // Vérifier si le modèle actuel est trop gros
  for (const modelId of installed) {
    const model = modelService.getModelById(modelId);
    if (model) {
      const ramUsage = (model.minRAM / capabilities.availableRAM) * 100;
      
      if (ramUsage > 80) {
        console.log(`⚠️ ${model.displayName} uses ${ramUsage.toFixed(0)}% of available RAM`);
        console.log('Recommendation: Switch to a smaller model');
        
        // Suggérer une alternative
        const alternatives = LOCAL_MODELS.filter(
          m => m.minRAM < model.minRAM && m.family === model.family
        );
        
        if (alternatives.length > 0) {
          console.log('Suggested alternatives:');
          alternatives.forEach(alt => {
            console.log(`- ${alt.displayName} (${alt.size})`);
          });
        }
      }
    }
  }
}
```

---

Ces exemples couvrent les cas d'usage les plus courants et montrent comment intégrer efficacement la gestion des modèles locaux dans votre application!
