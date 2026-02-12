# 🎯 Plan d'Intégration UI et Améliorations

## Phase 1: Intégration UI au Séquenceur

### 1.1 Ajouter les Panels au Séquenceur

**Fichiers à modifier:**
- `creative-studio-ui/src/sequence-editor/SequenceEditor.tsx`
- `creative-studio-ui/src/sequence-editor/index.ts`

**Modifications nécessaires:**

```typescript
// Dans SequenceEditor.tsx - Ajouter les imports
import { MediaSearchPanel } from './components/MediaSearchPanel';
import { AudioRemixPanel } from './components/AudioRemixPanel';
import { TranscriptionPanel } from './components/TranscriptionPanel';

// Ajouter dans le state
interface SequenceEditorState {
  activePanel: 'timeline' | 'media-search' | 'audio-remix' | 'transcription';
  // ...
}

// Ajouter les onglets dans l'interface
const EDITOR_PANELS = [
  { id: 'timeline', label: 'Timeline', icon: '📐' },
  { id: 'media-search', label: 'Media Search', icon: '🔍' },
  { id: 'audio-remix', label: 'Audio Remix', icon: '🎵' },
  { id: 'transcription', label: 'Transcription', icon: '📝' },
];
```

### 1.2 Connecter les Services au Redux Store

**Fichiers à créer:**
- `creative-studio-ui/src/stores/mediaSearchStore.ts`
- `creative-studio-ui/src/stores/audioRemixStore.ts`
- `creative-studio-ui/src/stores/transcriptionStore.ts`

**Exemple - mediaSearchStore.ts:**

```typescript
import { create } from 'zustand';
import { mediaSearchService } from '../services/mediaSearchService';

interface MediaSearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  clearResults: () => void;
}

export const useMediaSearchStore = create<MediaSearchState>((set) => ({
  query: '',
  results: [],
  isLoading: false,
  error: null,
  
  search: async (query, filters) => {
    set({ isLoading: true, error: null });
    try {
      const results = await mediaSearchService.search(query, filters);
      set({ results, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  clearResults: () => set({ results: [], query: '' }),
}));
```

### 1.3 Ajouter Boutons dans la Toolbar

**Fichiers à modifier:**
- `creative-studio-ui/src/sequence-editor/components/ToolBar/ToolBar.tsx`

```typescript
// Ajouter actions
const TOOLBAR_ACTIONS = [
  { id: 'search-media', label: 'Media Search', icon: '🔍', action: () => openPanel('media-search') },
  { id: 'remix-audio', label: 'Audio Remix', icon: '🎵', action: () => openPanel('audio-remix') },
  { id: 'transcribe', label: 'Transcription', icon: '📝', action: () => openPanel('transcription') },
  // ... actions existantes
];
```

---

## Phase 2: Système de Cache et Support Offline

### 2.1 Service de Cache

**Fichier à créer:** `creative-studio-ui/src/services/cacheService.ts`

```typescript
// Service de cache pour support offline et performance

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class CacheService {
  private storage: Map<string, CacheEntry<any>> = new Map();
  private maxEntries: number = 100;
  private defaultExpiry: number = 5 * 60 * 1000; // 5 minutes
  
  // Stocker une valeur
  async set<T>(key: string, data: T, expiry?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: expiry || this.defaultExpiry,
    };
    
    this.storage.set(key, entry);
    
    // Persist to localStorage for offline support
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (e) {
      console.warn('Cache storage failed:', e);
    }
    
    // Nettoyer si trop d'entrées
    if (this.storage.size > this.maxEntries) {
      this.cleanup();
    }
  }
  
  // Récupérer une valeur
  async get<T>(key: string): Promise<T | null> {
    const entry = this.storage.get(key);
    
    if (!entry) {
      // Essayer localStorage
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          const parsed: CacheEntry<T> = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < parsed.expiry) {
            this.storage.set(key, parsed);
            return parsed.data;
          }
        }
      } catch (e) {
        console.warn('Cache retrieval failed:', e);
      }
      return null;
    }
    
    // Vérifier expiration
    if (Date.now() - entry.timestamp > entry.expiry) {
      this.storage.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  // Supprimer une entrée
  async delete(key: string): Promise<void> {
    this.storage.delete(key);
    localStorage.removeItem(`cache_${key}`);
  }
  
  // Vider le cache
  async clear(): Promise<void> {
    this.storage.clear();
    Object.keys(localStorage)
      .filter(k => k.startsWith('cache_'))
      .forEach(k => localStorage.removeItem(k));
  }
  
  // Nettoyer les entrées expirées
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage) {
      if (now - entry.timestamp > entry.expiry) {
        this.storage.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();
```

### 2.2 Intégrer Cache dans les Services

**Exemple - mediaSearchService.ts avec cache:**

```typescript
import { cacheService } from './cacheService';

class MediaSearchService {
  private cacheExpiry = 10 * 60 * 1000; // 10 minutes
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const cacheKey = `search_${query}_${JSON.stringify(filters || {})}`;
    
    // Essayer le cache d'abord
    const cached = await cacheService.get<SearchResult[]>(cacheKey);
    if (cached) {
      console.log('Cache hit for search:', query);
      return cached;
    }
    
    // Appeler l'API
    const response = await fetch('/api/v1/media/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ...filters }),
    });
    
    const results = await response.json();
    
    // Mettre en cache
    await cacheService.set(cacheKey, results, this.cacheExpiry);
    
    return results;
  }
}

export const mediaSearchService = new MediaSearchService();
```

### 2.3 Support Offline

**Fichier à créer:** `creative-studio-ui/src/services/offlineService.ts`

```typescript
// Service pour gérer le mode offline

type NetworkStatus = 'online' | 'offline' | 'connecting';

class OfflineService {
  private status: NetworkStatus = 'online';
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private queue: Array<{ action: () => Promise<void>; retries: number }> = [];
  
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setStatus('online'));
      window.addEventListener('offline', () => this.setStatus('offline'));
    }
  }
  
  private setStatus(status: NetworkStatus): void {
    this.status = status;
    this.listeners.forEach(listener => listener(status));
    
    if (status === 'online') {
      this.processQueue();
    }
  }
  
  // S'abonner aux changements de statut
  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // Vérifier si en ligne
  isOnline(): boolean {
    return this.status === 'online';
  }
  
  // Ajouter une action à la file d'attente
  async queueAction(action: () => Promise<void>): Promise<void> {
    if (this.isOnline()) {
      await action();
    } else {
      this.queue.push({ action, retries: 0 });
    }
  }
  
  // Traiter la file d'attente
  private async processQueue(): Promise<void> {
    const actions = [...this.queue];
    this.queue = [];
    
    for (const { action } of actions) {
      try {
        await action();
      } catch (e) {
        console.error('Queued action failed:', e);
      }
    }
  }
  
  // Obtenir le nombre d'actions en attente
  getQueueLength(): number {
    return this.queue.length;
  }
}

export const offlineService = new OfflineService();
```

---

## Phase 3: Documentation Utilisateur

### 3.1 Guide Utilisateur - Media Search

**Fichier à créer:** `docs/MEDIA_SEARCH_GUIDE.md`

```markdown
# Guide Media Search

## Introduction

Media Search vous permet de trouver rapidement vos assets multimédias
en utilisant le langage naturel.

## Utilisation

### Recherche basique

1. Ouvrez le panneau "Media Search"
2. Tapez votre requête dans le champ de recherche
3. Appuyez sur Entrée ou cliquez sur "Rechercher"

### Exemples de requêtes

```
"vidéos avec des personnages"
"images de paysage avec coucher de soleil"
"musiques de type suspense"
"podcasts en français"
```

### Filtres

Vous pouvez filtrer par type d'asset:
- Images
- Vidéos
- Audio

## Raccourcis

| Raccourci | Action |
|-----------|--------|
| Ctrl+F | Focus recherche |
| Escape | Effacer recherche |
```

### 3.2 Guide Utilisateur - Audio Remix

**Fichier à créer:** `docs/AUDIO_REMIX_GUIDE.md`

```markdown
# Guide Audio Remix

## Introduction

Audio Remix adapte automatiquement votre musique à la durée
de votre vidéo sans coupure audible.

## Styles disponibles

### Smooth
Crossfade fluide entre les sections. Idéal pour les transitions douces.

### Beat-Cut
Coupures précisément sur les beats. Idéal pour les montages rythmiques.

### Structural
Préserve la structure musicale (intro, verse, chorus, bridge, outro).

### Dynamic
Analyse le contenu et adapte dynamiquement.

## Utilisation

1. Sélectionnez un fichier audio
2. Définissez la durée cible
3. Choisissez un style
4. Cliquez sur "Prévisualiser"
5. Appliquez le remix
```

### 3.3 Guide Utilisateur - Transcription

**Fichier à créer:** `docs/TRANSCRIPTION_GUIDE.md`

```markdown
# Guide Transcription

## Introduction

Transcrivez automatiquement vos fichiers audio en texte
avec détection des locuteurs.

## Fonctionnalités

### Transcription
- Supporte plusieurs langues (FR, EN, ES, DE)
- Haute précision avec détection automatique
- Timestamps précis pour chaque segment

### Speaker Diarization
Identification automatique des différents locuteurs

### Export
- SRT (Sous-titres)
- VTT (WebVTT)
- ASS (Advanced Substation Alpha)

## Montage basé sur le texte

1. Transcrivez votre audio
2. Copiez-collez le texte pour éditer
3. Le montage se synchronise automatiquement
```

---

## Fichiers à Créer/Modifier

### Phase 1: UI Integration
```
creative-studio-ui/src/
├── stores/
│   ├── mediaSearchStore.ts      [NOUVEAU]
│   ├── audioRemixStore.ts       [NOUVEAU]
│   └── transcriptionStore.ts    [NOUVEAU]
├── sequence-editor/
│   ├── SequenceEditor.tsx       [MODIFIER]
│   └── components/
│       └── ToolBar/
│           └── ToolBar.tsx      [MODIFIER]
```

### Phase 2: Cache & Offline
```
creative-studio-ui/src/
├── services/
│   ├── cacheService.ts         [NOUVEAU]
│   └── offlineService.ts       [NOUVEAU]
└── services/
    └── mediaSearchService.ts   [MODIFIER]
    └── musicRemixService.ts    [MODIFIER]
    └── transcriptionService.ts [MODIFIER]
```

### Phase 3: Documentation
```
docs/
├── MEDIA_SEARCH_GUIDE.md       [NOUVEAU]
├── AUDIO_REMIX_GUIDE.md        [NOUVEAU]
├── TRANSCRIPTION_GUIDE.md      [NOUVEAU]
└── INSTALLATION_GUIDE.md       [NOUVEAU]
```

---

## Ordre de Priorité

1. ✅ Backend APIs (complet)
2. 🔄 Phase 1: UI Integration (en cours)
3. ⏳ Phase 2: Cache & Offline
4. ⏳ Phase 3: Documentation
