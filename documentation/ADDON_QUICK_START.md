# 🚀 Add-on System - Quick Start Guide

## Installation rapide

### 1. Backend Setup (déjà fait ✅)

Le backend est déjà configuré et fonctionnel. Pour l'utiliser:

```bash
# Tester le CLI
python addon_cli.py list
python addon_cli.py stats

# Créer un add-on de test
python addon_cli.py create workflow_addon test_addon "Mon add-on de test"
```

### 2. Frontend Setup (nouveau ✅)

#### Installer les dépendances

```bash
cd creative-studio-ui
npm install zustand
```

#### Importer dans votre app

```typescript
// Dans votre App.tsx ou routes
import { AddonMarketplace } from './components/addons';

function App() {
  return (
    <Router>
      <Routes>
        {/* Vos routes existantes */}
        <Route path="/addons" element={<AddonMarketplace />} />
      </Routes>
    </Router>
  );
}
```

### 3. Intégrer l'API Backend

#### Option A: Avec FastAPI (recommandé)

```python
# Dans votre main.py ou app.py
from fastapi import FastAPI
from src.api import addon_router, init_addon_api
from src.addon_manager import AddonManager
from src.addon_validator import AddonValidator
from src.addon_permissions import PermissionManager

app = FastAPI()

# Initialiser les gestionnaires
addon_manager = AddonManager()
addon_validator = AddonValidator()
permission_manager = PermissionManager()

# Initialiser l'API
init_addon_api(addon_manager, addon_validator, permission_manager)

# Ajouter les routes
app.include_router(addon_router)

# Initialiser au démarrage
@app.on_event("startup")
async def startup():
    await addon_manager.initialize_all_addons()
```

#### Option B: Avec proxy Vite (développement)

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### 4. Ajouter au menu de navigation

```typescript
// Dans votre Navigation.tsx
const menuItems = [
  // ... vos items existants
  {
    name: 'Add-ons',
    path: '/addons',
    icon: '📦',
  },
];
```

## Utilisation

### Afficher le marketplace

```typescript
import { AddonMarketplace } from './components/addons';

<AddonMarketplace />
```

### Utiliser le store directement

```typescript
import { useAddonStore } from './stores/addonStore';

function MyComponent() {
  const { 
    addons, 
    loading, 
    fetchAddons, 
    enableAddon 
  } = useAddonStore();
  
  useEffect(() => {
    fetchAddons();
  }, []);
  
  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        addons.map(addon => (
          <div key={addon.name}>
            <h3>{addon.name}</h3>
            <button onClick={() => enableAddon(addon.name)}>
              Enable
            </button>
          </div>
        ))
      )}
    </div>
  );
}
```

### Composants individuels

```typescript
import { AddonCard, AddonDetailsModal } from './components/addons';

function CustomView() {
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      {addons.map(addon => (
        <AddonCard
          key={addon.name}
          addon={addon}
          onSelect={() => {
            setSelectedAddon(addon);
            setIsModalOpen(true);
          }}
          onEnable={() => enableAddon(addon.name)}
          onDisable={() => disableAddon(addon.name)}
        />
      ))}
      
      <AddonDetailsModal
        addon={selectedAddon}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
```

## Test rapide

### 1. Démarrer le backend

```bash
# Terminal 1: Backend Python
uvicorn main:app --reload --port 8000
```

### 2. Démarrer le frontend

```bash
# Terminal 2: Frontend React
cd creative-studio-ui
npm run dev
```

### 3. Ouvrir dans le navigateur

```
http://localhost:5173/addons
```

Vous devriez voir:
- ✅ Liste des add-ons
- ✅ Barre de recherche
- ✅ Filtres (catégorie, type, statut)
- ✅ Cartes d'add-ons cliquables
- ✅ Modal de détails

## Fonctionnalités disponibles

### ✅ Opérationnel maintenant
- Affichage de la liste des add-ons
- Recherche et filtrage
- Activation/désactivation
- Affichage des détails
- Validation de sécurité et qualité
- Gestion des permissions
- Dark mode
- Responsive design

### ⏳ À venir
- Wizard d'installation
- Upload de fichiers ZIP
- Gestionnaire d'add-ons installés
- Paramètres d'add-ons
- Notifications toast
- Intégration avec wizards
- Intégration avec ComfyUI

## Troubleshooting

### Le backend ne répond pas

```bash
# Vérifier que FastAPI tourne
curl http://localhost:8000/api/addons

# Vérifier les logs
python addon_cli.py stats
```

### Les add-ons ne s'affichent pas

```bash
# Vérifier qu'il y a des add-ons
python addon_cli.py list

# Créer un add-on de test
python addon_cli.py create workflow_addon test "Test addon"
```

### Erreur CORS

Ajouter dans votre FastAPI:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Le store ne se met pas à jour

Vérifier que vous appelez `fetchAddons()` au montage:

```typescript
useEffect(() => {
  fetchAddons();
}, []);
```

## Exemples d'utilisation

### Créer un add-on via CLI

```bash
python addon_cli.py create workflow_addon my_workflow "Mon workflow personnalisé" --author "Votre Nom"
```

### Activer un add-on

```bash
python addon_cli.py enable my_workflow
```

### Valider un add-on

```bash
python addon_cli.py validate addons/community/my_workflow --detailed
```

### Installer un add-on via API

```bash
curl -X POST -F "file=@addon.zip" -F "category=community" \
  http://localhost:8000/api/addons/install
```

## Documentation complète

- **Backend:** `ADDON_SYSTEM_IMPROVEMENTS.md`
- **Frontend:** `ADDON_FRONTEND_INTEGRATION.md`
- **Progression:** `.kiro/specs/addon-management-system/IMPLEMENTATION_PROGRESS.md`
- **Spec complète:** `.kiro/specs/addon-management-system/`

## Support

Pour toute question ou problème:
1. Consultez les fichiers de documentation
2. Vérifiez les logs du backend et frontend
3. Testez avec le CLI d'abord
4. Vérifiez que l'API répond correctement

---

**Le système est prêt à l'emploi!** 🎉

Commencez par tester le marketplace, puis explorez les autres fonctionnalités.
