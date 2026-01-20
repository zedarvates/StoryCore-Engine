# Fonctionnalité : Gestion de Plusieurs Serveurs ComfyUI

## État Actuel

### ❌ Limitation Actuelle
L'interface ComfyUI Settings permet de configurer **un seul serveur ComfyUI à la fois**.

- Pas de bouton "+" pour ajouter des serveurs
- Pas de liste de serveurs
- Pas de sélection de serveur actif
- Configuration unique stockée dans `localStorage`

### 📁 Fichiers Concernés
- `creative-studio-ui/src/components/settings/ComfyUISettingsPanel.tsx`
- `creative-studio-ui/src/components/settings/ComfyUISettingsModal.tsx`
- `creative-studio-ui/src/services/comfyuiService.ts`

## 🎯 Fonctionnalité Proposée

### Gestion Multi-Serveurs

Permettre aux utilisateurs de :
1. ✅ Ajouter plusieurs serveurs ComfyUI
2. ✅ Nommer chaque serveur (ex: "Local", "Production", "GPU Server")
3. ✅ Sélectionner le serveur actif
4. ✅ Éditer/Supprimer des serveurs
5. ✅ Tester la connexion de chaque serveur
6. ✅ Voir le statut de chaque serveur

### Cas d'Usage

#### Scénario 1 : Développement Local + Production
```
Serveur 1: "Local Dev"
  - URL: http://localhost:8188
  - Status: ✅ Connected
  - Active: ✓

Serveur 2: "Production Server"
  - URL: http://192.168.1.100:8188
  - Status: ⚠️ Disconnected
  - Active: ○
```

#### Scénario 2 : Plusieurs Machines GPU
```
Serveur 1: "GPU Server 1 (RTX 4090)"
  - URL: http://192.168.1.10:8188
  - VRAM: 24GB
  - Active: ✓

Serveur 2: "GPU Server 2 (RTX 3090)"
  - URL: http://192.168.1.11:8188
  - VRAM: 24GB
  - Active: ○

Serveur 3: "CPU Fallback"
  - URL: http://192.168.1.12:8188
  - VRAM: 0GB
  - Active: ○
```

#### Scénario 3 : Load Balancing
```
Serveur 1: "Primary"
  - URL: http://comfyui-1.local:8188
  - Queue: 3/10
  - Active: ✓

Serveur 2: "Secondary"
  - URL: http://comfyui-2.local:8188
  - Queue: 0/10
  - Active: ○ (Auto-switch si Primary full)
```

## 🎨 Design de l'Interface

### Vue Liste de Serveurs

```
┌─────────────────────────────────────────────────────────┐
│ ComfyUI Servers                              [+ Add]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ● Local Dev                              ✅ Connected   │
│   http://localhost:8188                                 │
│   [Edit] [Test] [Delete]                                │
│                                                          │
│ ○ Production Server                      ⚠️ Offline     │
│   http://192.168.1.100:8188                            │
│   [Edit] [Test] [Delete]                                │
│                                                          │
│ ○ GPU Server                             ✅ Connected   │
│   http://192.168.1.50:8188                             │
│   VRAM: 24GB | Queue: 2/10                             │
│   [Edit] [Test] [Delete]                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Modal d'Ajout/Édition

```
┌─────────────────────────────────────────────────────────┐
│ Add ComfyUI Server                          [X]         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Server Name *                                           │
│ [Local Dev                                    ]         │
│                                                          │
│ Server URL *                                            │
│ [http://localhost:8188                        ]         │
│                                                          │
│ Authentication                                          │
│ ○ None  ○ Basic  ○ Bearer  ○ API Key                   │
│                                                          │
│ [Advanced Settings ▼]                                   │
│                                                          │
│ [Test Connection]  [Cancel]  [Save]                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Implémentation Technique

### 1. Structure de Données

```typescript
interface ComfyUIServer {
  id: string;                    // UUID unique
  name: string;                  // Nom du serveur
  serverUrl: string;             // URL du serveur
  authentication: {
    type: AuthenticationType;
    username?: string;
    password?: string;
    token?: string;
  };
  isActive: boolean;             // Serveur actif
  lastConnected?: Date;          // Dernière connexion réussie
  status?: 'connected' | 'disconnected' | 'error';
  serverInfo?: ComfyUIServerInfo;
  
  // Advanced settings
  maxQueueSize?: number;
  timeout?: number;
  vramLimit?: number;
  modelsPath?: string;
  autoStart?: boolean;
}

interface ComfyUIServersConfig {
  servers: ComfyUIServer[];
  activeServerId: string | null;
  autoSwitchOnFailure: boolean;  // Basculer auto si serveur actif échoue
  loadBalancing: boolean;         // Distribuer les tâches
}
```

### 2. Service de Gestion

```typescript
// creative-studio-ui/src/services/comfyuiServersService.ts

export class ComfyUIServersService {
  private servers: ComfyUIServer[] = [];
  private activeServerId: string | null = null;

  // CRUD Operations
  addServer(server: Omit<ComfyUIServer, 'id'>): ComfyUIServer;
  updateServer(id: string, updates: Partial<ComfyUIServer>): void;
  deleteServer(id: string): void;
  getServer(id: string): ComfyUIServer | undefined;
  getAllServers(): ComfyUIServer[];
  
  // Active Server Management
  setActiveServer(id: string): void;
  getActiveServer(): ComfyUIServer | null;
  
  // Connection Testing
  async testServer(id: string): Promise<boolean>;
  async testAllServers(): Promise<Map<string, boolean>>;
  
  // Auto-switching
  async getAvailableServer(): Promise<ComfyUIServer | null>;
  
  // Load Balancing
  async getLeastBusyServer(): Promise<ComfyUIServer | null>;
  
  // Persistence
  saveToStorage(): void;
  loadFromStorage(): void;
}
```

### 3. Composant UI

```typescript
// creative-studio-ui/src/components/settings/ComfyUIServersPanel.tsx

export function ComfyUIServersPanel() {
  const [servers, setServers] = useState<ComfyUIServer[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ComfyUIServer | null>(null);

  // Handlers
  const handleAddServer = () => setShowAddModal(true);
  const handleEditServer = (server: ComfyUIServer) => setEditingServer(server);
  const handleDeleteServer = (id: string) => { /* ... */ };
  const handleSetActive = (id: string) => { /* ... */ };
  const handleTestConnection = async (id: string) => { /* ... */ };

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex justify-between items-center">
        <h3>ComfyUI Servers</h3>
        <Button onClick={handleAddServer}>
          <Plus className="mr-2 h-4 w-4" />
          Add Server
        </Button>
      </div>

      {/* Server List */}
      <div className="space-y-2">
        {servers.map(server => (
          <ServerCard
            key={server.id}
            server={server}
            isActive={server.id === activeServerId}
            onSetActive={() => handleSetActive(server.id)}
            onEdit={() => handleEditServer(server)}
            onDelete={() => handleDeleteServer(server.id)}
            onTest={() => handleTestConnection(server.id)}
          />
        ))}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingServer) && (
        <ComfyUIServerModal
          server={editingServer}
          onSave={handleSaveServer}
          onClose={() => {
            setShowAddModal(false);
            setEditingServer(null);
          }}
        />
      )}
    </div>
  );
}
```

### 4. Storage

```typescript
// LocalStorage structure
{
  "comfyui-servers": {
    "servers": [
      {
        "id": "uuid-1",
        "name": "Local Dev",
        "serverUrl": "http://localhost:8188",
        "isActive": true,
        // ...
      },
      {
        "id": "uuid-2",
        "name": "Production",
        "serverUrl": "http://192.168.1.100:8188",
        "isActive": false,
        // ...
      }
    ],
    "activeServerId": "uuid-1",
    "autoSwitchOnFailure": true,
    "loadBalancing": false
  }
}
```

## 🚀 Plan d'Implémentation

### Phase 1 : Structure de Base (2-3h)
- [ ] Créer `ComfyUIServer` interface
- [ ] Créer `ComfyUIServersService`
- [ ] Implémenter CRUD operations
- [ ] Implémenter persistence (LocalStorage)

### Phase 2 : Interface Utilisateur (3-4h)
- [ ] Créer `ComfyUIServersPanel` component
- [ ] Créer `ServerCard` component
- [ ] Créer `ComfyUIServerModal` (Add/Edit)
- [ ] Ajouter bouton "+" et liste de serveurs
- [ ] Implémenter sélection du serveur actif

### Phase 3 : Fonctionnalités Avancées (2-3h)
- [ ] Test de connexion par serveur
- [ ] Affichage du statut en temps réel
- [ ] Auto-switch sur échec
- [ ] Load balancing basique

### Phase 4 : Intégration (1-2h)
- [ ] Intégrer avec le workflow existant
- [ ] Migration des configs existantes
- [ ] Tests end-to-end

### Phase 5 : Polish (1h)
- [ ] Animations et transitions
- [ ] Messages d'erreur clairs
- [ ] Documentation utilisateur

**Total estimé : 9-13 heures**

## 📋 Checklist de Fonctionnalités

### Essentielles (MVP)
- [ ] Ajouter un serveur
- [ ] Éditer un serveur
- [ ] Supprimer un serveur
- [ ] Sélectionner le serveur actif
- [ ] Tester la connexion
- [ ] Sauvegarder dans LocalStorage

### Avancées
- [ ] Auto-switch sur échec
- [ ] Load balancing
- [ ] Affichage du statut en temps réel
- [ ] Statistiques par serveur (queue, VRAM, etc.)
- [ ] Import/Export de configurations
- [ ] Groupes de serveurs

### Nice-to-Have
- [ ] Monitoring en temps réel
- [ ] Alertes sur déconnexion
- [ ] Historique des connexions
- [ ] Benchmarks de performance
- [ ] Réplication de config entre serveurs

## 🎯 Bénéfices Utilisateur

### Pour les Développeurs
- ✅ Basculer facilement entre local et production
- ✅ Tester différentes configurations
- ✅ Pas besoin de re-configurer à chaque fois

### Pour les Studios
- ✅ Gérer plusieurs machines GPU
- ✅ Load balancing manuel ou automatique
- ✅ Fallback sur CPU si GPU occupé

### Pour les Power Users
- ✅ Configurations nommées et organisées
- ✅ Basculement rapide entre serveurs
- ✅ Monitoring de plusieurs serveurs

## 📝 Notes d'Implémentation

### Compatibilité Ascendante
- Migrer automatiquement la config unique existante vers le nouveau format
- Créer un serveur "Default" avec les paramètres actuels
- Marquer comme actif par défaut

### Sécurité
- Chiffrer les credentials dans LocalStorage
- Utiliser le même système que LLM Settings
- Avertir si connexion non-HTTPS avec credentials

### Performance
- Tester les connexions en parallèle
- Cacher les infos serveur (TTL: 30s)
- Lazy loading des statuts

## 🔄 Migration

### Ancien Format
```json
{
  "comfyui-settings": {
    "serverUrl": "http://localhost:8188",
    "authentication": { "type": "none" }
  }
}
```

### Nouveau Format
```json
{
  "comfyui-servers": {
    "servers": [
      {
        "id": "default",
        "name": "Default Server",
        "serverUrl": "http://localhost:8188",
        "authentication": { "type": "none" },
        "isActive": true
      }
    ],
    "activeServerId": "default"
  }
}
```

## ❓ Questions Ouvertes

1. **Limite de serveurs ?** 
   - Suggestion : Max 10 serveurs pour éviter la surcharge UI

2. **Auto-switch intelligent ?**
   - Basé sur la queue size ?
   - Basé sur la VRAM disponible ?
   - Round-robin ?

3. **Synchronisation des modèles ?**
   - Vérifier que les modèles requis sont disponibles sur tous les serveurs ?

4. **Gestion des erreurs ?**
   - Retry automatique ?
   - Notification utilisateur ?

## 🎉 Conclusion

Cette fonctionnalité transformerait ComfyUI Settings d'une **configuration unique** en un **gestionnaire de serveurs professionnel**, adapté aux workflows complexes et aux environnements multi-machines.

**Voulez-vous que j'implémente cette fonctionnalité ?**
