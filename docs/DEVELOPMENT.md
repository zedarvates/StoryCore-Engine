# Guide de DéveloppementCe document fournit des instructions détaillées pour contribuer au développement de StoryCore Engine, y compris la configuration de l'environnement, les conventions de code, et les bonnes pratiques.

## 🛠️ Configuration de l'Environnement

### Prérequis

- **Node.js** : Version 18.x ou supérieure
- **Python** : Version 3.10.x ou supérieure
- **Git** : Pour la gestion de version
- **Docker** : Optionnel, pour le déploiement en conteneurs
- **VS Code** : Recommandé avec les extensions spécifiées

### Installation#### 1. Cloner le dépôt

```bash
git clone https://github.com/zedarvates/StoryCore-Engine.git
cd StoryCore-Engine
```

#### 2. Configuration du Frontend

```bash
cd creative-studio-ui

# Installer les dépendancesnpm install

# Vérifier l'installation
npm run dev  # Démarre le serveur de développement sur http://localhost:5173
```

#### 3. Configuration du Backend

```bash
cd ../backend

# Créer un environnement virtuel (recommandé)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements.txt

# Initialiser la base de données
python init_db.py

# Démarrer le serveur
python main.py  # Démarre sur http://localhost:5000```

#### 4. Variables d'Environnement

Copiez le fichier d'exemple et configurez-le :

```bash
# À la racine du projet
cp .env.example .env
```

Éditez `.env` avec vos valeurs :

```env
# FrontendVITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000

# Backend
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///storycore.db

# LLM APIs (obtenir les clés auprès des fournisseurs)
OPENAI_API_KEY=your_openai_keyANTHROPIC_API_KEY=your_anthropic_key
OLLAMA_BASE_URL=http://localhost:11434

# ComfyUI
COMFYUI_URL=http://localhost:8188

# Redis (optionnel pour le cache)
REDIS_URL=redis://localhost:6379
```

### Outils de Développement Recommandés

#### VS Code Extensions

- **ESLint** : Linting JavaScript/TypeScript
- **Prettier** : Formatage de code- **Python** : Support Python complet
- **Pylance** : Language server Python- **GitLens** : Amélioration de Git
- **Tailwind CSS IntelliSense** : Autocomplétion Tailwind
- **Import Cost** : Taille des imports
- **Error Lens** : Affichage amélioré des erreurs

#### Outils en Ligne de Commande

- **npm** : Gestionnaire de paquets Node.js
- **pip** : Gestionnaire de paquets Python
- **prettier** : Formatage de code
- **eslint** : Linting
- **black** : Formatage Python
- **flake8** : Linting Python
- **mypy** : Vérification de types Python

---

## 📋 Conventions de Code

### TypeScript/JavaScript

#### Nommage

- **Fichiers** : `kebab-case.ts` ou `kebab-case.tsx`
- **Composants** : `PascalCase`
- **Fonctions/variables** : `camelCase`
- **Constantes** : `UPPER_SNAKE_CASE`
- **Interfaces/types** : `PascalCase` (préfixé par `I` pour les interfaces optionnel)
- **Enums** : `PascalCase`

#### Structure des Fichiers

```typescript
// 1. Imports (groupés par type)
import React, { useState, useEffect } from 'react';
import { useStore } from '@/stores/appStore';
import api from '@/services/api';

// 2. Types/Interfaces
interface Props {
  title: string;
  onClick: () => void;
}

// 3. Composants/Fonctions
const MyComponent: React.FC<Props> = ({ title, onClick }) => {
  // 4. Hooks
  const [state, setState] = useState(null);
    // 5. Fonctions internes
  const handleClick = () => {
    onClick();
  };
  
  // 6. Effets
  useEffect(() => {
    // logique
  }, []);
  
  // 7. Retour JSX
  return (
    <div onClick={handleClick}>
      <h1>{title}</h1>
    </div>
  );
};

export default MyComponent;
```

#### Bonnes Pratiques

- **Typage strict** : Toujours typer les paramètres et les retours
- **Immutabilité** : Utiliser les opérateurs spread au lieu de mutation directe
- **Gestion des erreurs** : Toujours gérer les promesses rejetées
- **Performance** : Utiliser `React.memo`, `useMemo`, `useCallback` quand approprié
- **Accessibilité** : Ajouter les attributs ARIA nécessaires
- **Commentaires** : Expliquer le pourquoi, pas le quoi

### Python

#### Style (PEP 8)

- **Indentation** : 4 espaces
- **Ligne maximale** : 79 caractères
- **Imports** : Standard library, puis tiers, puis locaux
- **Nommage** :
  - Modules : `snake_case.py`
  - Classes : `PascalCase`
  - Fonctions/variables : `snake_case`
  - Constantes : `UPPER_SNAKE_CASE`
  - Méthodes privées : `_private_method`

#### Structure des Fichiers

```python
"""
Module docstring décrivant le but du fichier"""

# 1. Imports standards
import os
import json
from typing import List, Optional

# 2. Imports tiers
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session

# 3. Imports locaux
from ..models import Character, Project
from ..services.llm_service import LLMService
from ..utils.validators import validate_character_data

# 4. Configuration
blueprint = Blueprint('characters', __name__)

# 5. Classes
class CharacterService:
    """Service pour gérer les opérations sur les personnages"""
    
    def __init__(self, db_session: Session, llm_service: LLMService):
        self.db = db_session
        self.llm = llm_service
    
    # 6. Méthodes    def create_character(self, data: dict) -> Character:
        """Crée un nouveau personnage avec validation"""
        # Validation des données
        validated_data = validate_character_data(data)
        
        # Génération LLM optionnelle
        if validated_data.get('use_llm_enhancement'):
            enhanced_data = self.llm.enhance_character(validated_data)
            validated_data.update(enhanced_data)
        
        # Création en base
        character = Character(**validated_data)
        self.db.add(character)
        self.db.commit()
        self.db.refresh(character)
        
        return character
        # 7. Méthodes privées
    def _calculate_consistency(self, character: Character) -> float:
        """Calcule la cohérence du personnage (méthode privée)"""
        pass

# 8. Fonctions utilitaires (si nécessaire)
def helper_function(param: str) -> bool:
    """Fonction utilitaire"""
    return len(param) > 0
```

#### Bonnes Pratiques- **Docstrings** : Toujours documenter les fonctions, classes et modules
- **Type hints** : Utiliser les annotations de type (Python 3.5+)
- **Gestion des erreurs** : Utiliser des exceptions spécifiques plutôt que des `Exception` génériques
- **Context managers** : Utiliser `with` pour les ressources (fichiers, connexions DB)
- **List comprehensions** : Préférer quand lisible
- **Virtual environments** : Toujours utiliser un venv pour l'isolation
- **Requirements** : Maintenir à jour `requirements.txt` avec `pip freeze > requirements.txt`

### CSS/Tailwind

#### Organisation

- **Utiliser les classes utilitaires** Tailwind autant que possible
- **Composants réutilisables** : Créer des composants plutôt que du CSS global
- **Responsive** : Utiliser les préfixes responsive (`sm:`, `md:`, `lg:`, `xl:`)
- **États** : Utiliser les variantes (`hover:`, `focus:`, `active:`, `disabled:`)
- **Dark mode** : Utiliser `dark:` quand approprié

#### Exemple de bon usage

```jsx
<button className="
  bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400
  text-white font-bold py-2 px-4 rounded
  transition-colors duration-200
  dark:bg-blue-500 dark:hover:bg-blue-600
">
  Sauvegarder
</button>
```

#### Quand utiliser du CSS personnalisé

Dans les fichiers `.css` ou `.scss` uniquement pour :
- Animations clés-frame complexes
- Styles qui ne peuvent pas être faits avec les utilitaires- Thèmes globaux
- Print styles```css
/* Dans un fichier .css */
.sequence-track {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  
  /* Animation personnalisée */
  animation: trackPulse 2s ease-in-out infinite;
}

@keyframes trackPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

---

## 🔧 Processus de Développement

### Workflow Git

#### Branches

- **main** : Branche de production stable
- **develop** : Branche d'intégration pour les fonctionnalités terminées
- **feature/** : Nouvelles fonctionnalités (`feature/character-wizard-v2`)
- **bugfix/** : Corrections de bugs (`bugfix/llm-timeout-issue`)
- **hotfix/** : Corrections urgentes en production (`hotfix/security-patch`)
- **release/** : Préparation de release (`release/v2.3.0`)

#### Convention de Commit

Utiliser [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types :**
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage, points-virgules, etc. (pas de changement de logique)
- `refactor` : Refactorisation de code
- `perf` : Amélioration de performance
- `test` : Ajout ou modification de tests- `chore` : Maintenance, build, etc.

**Exemples :**
```
feat(character): add personality trait generation
fix(llm): handle timeout errors in anthropic provider
docs(cli): update reference for generate-video command
refactor(sequence): extract frame interpolation logic
```

#### Pull Request Process

1. **Branche à jour** : `git checkout develop && git pull`
2. **Nouvelle branche** : `git checkout -b feature/nom-fonctionnalite`
3. **Développement** : Faire des commits fréquents et descriptifs
4. **Tests** : S'assurer que tous les tests passent
5. **Rebase** : `git fetch origin && git rebase origin/develop`
6. **Push** : `git push origin feature/nom-fonctionnalite`
7. **PR** : Ouvrir une Pull Request vers `develop`
8. **Review** : Au moins une approbation requise
9. **Merge** : Squash and merge recommandé

### Développement Fonctionnalité

#### Étapes pour ajouter une nouvelle fonctionnalité

1. **Analyse** : Comprendre le besoin et définir les spécifications
2. **Design** : Créer des maquettes si nécessaire (UI/UX)
3. **API** : Définir les endpoints backend si nécessaire
4. **Base de données** : Mettre à jour les modèles si nécessaire5. **Backend** : Implémenter la logique métier
6. **Frontend** : Créer les composants et l'interface7. **Intégration** : Connecter frontend et backend
8. **Tests** : Écrire des tests unitaires et d'intégration
9. **Documentation** : Mettre à jour la documentation
10. **Review** : Faire réviser le code#### Exemple : Ajout d'un nouveau type de média

1. **Backend** :
   - Ajouter le modèle `MediaTrack` dans `models.py`
   - Créer le service `MediaTrackService` dans `services/`
   - Ajouter les endpoints dans `media_api.py`
   - Mettre à jour les migrations avec Alembic

2. **Frontend** :
   - Créer le composant `MediaTrack` dans `components/media/`
   - Ajouter les hooks dans `hooks/useMediaTracks.ts`
   - Mettre à jour les stores si nécessaire
   - Créer l'interface dans l'éditeur de séquence

3. **Intégration** :
   - Créer le service API client dans `services/mediaService.ts`
   - Connecter les composants aux hooks
   - Gérer les états de chargement et d'erreur

4. **Tests** :
   - Écrire des tests backend pour le service
   - Écrire des tests frontend pour le composant
   - Ajouter des tests d'intégration si nécessaire

5. **Documentation** :
   - Mettre à jour la référence CLI si nécessaire
   - Ajouter des exemples dans le guide utilisateur
   - Documenter les nouvelles API endpoints

---

## 🧪 Tests

### Types de Tests#### Unitaires

Testent des fonctions ou méthodes isolées.

**Frontend (Jest + React Testing Library) :**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import CharacterForm from './CharacterForm';

describe('CharacterForm', () => {
  it('should validate required fields', () => {
    render(<CharacterForm />);
    
    fireEvent.click(screen.getByText(/submit/i));
    
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });
  
  it('should call onSubmit with valid data', () => {
    const onSubmit = jest.fn();
    render(<CharacterForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'John Doe' }
    });
    fireEvent.click(screen.getByText(/submit/i));
    
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      // ... autres champs
    });
  });
});
```

**Backend (pytest) :**
```python
def test_character_creation_valid_data(client, db):
    """Test création personnage avec données valides"""
    response = client.post('/api/characters', json={
        'name': 'Jane Smith',
        'archetype': 'protagonist',
        'age': 25
    })
    
    assert response.status_code == 201
    data = response.get_json()
    assert data['name'] == 'Jane Smith'
    assert data['archetype'] == 'protagonist'

def test_character_creation_invalid_age(client, db):
    """Test création personnage avec âge invalide"""
    response = client.post('/api/characters', json={
        'name': 'Jane Smith',
        'archetype': 'protagonist',
        'age': 150  # Trop vieux
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert 'age' in data['message'].lower()
```

#### Intégration

Testent l'interaction entre plusieurs composants.

**Frontend :**
```typescript
describe('Character Creation Flow', () => {
  it('should create character and show in list', async () => {
    // Mock API calls
    vi.spyOn(api, 'createCharacter').mockResolvedValue({
      id: '1',
      name: 'Test Character',
      archetype: 'hero'
    });
    
    render(<CharacterCreationWizard />);
    
    // Remplir le formulaire
    await userEvent.type(screen.getByLabelText(/name/i), 'Test Character');
    await userEvent.selectOptions(
      screen.getByLabelText(/archetype/i),
      'hero'
    );
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
        // Vérifier la redirection ou l'affichage
    expect(await screen.findByText(/test character/i)).toBeInTheDocument();
  });
});
```

**Backend :**
```pythondef test_character_workflow(client, db):
    """Test workflow complet de personnage"""
    # 1. Créer un projet
    project_resp = client.post('/api/projects', json={
        'name': 'Test Project',
        'description': 'A test project'
    })
    project_id = project_resp.get_json()['id']
    
    # 2. Créer un personnage dans ce projet
    char_resp = client.post('/api/characters', json={
        'name': 'Test Hero',
        'archetype': 'protagonist',
        'project_id': project_id
    })
    assert char_resp.status_code == 201
    
    # 3. Récupérer la liste des personnages du projet
    list_resp = client.get(f'/api/projects/{project_id}/characters')
    chars = list_resp.get_json()
    assert len(chars) == 1
    assert chars[0]['name'] == 'Test Hero'
```

#### End-to-End (E2E)

Testent des scénarios utilisateur complets (utilisant Cypress ou Playwright).

```typescript
// Cypress example
describe('Character Creation E2E', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.login('test@example.com', 'password');  // Custom command
  });
  
  it('should allow user to create a character', () => {
    cy.contains('Create Character').click();
    
    cy.get('#name').type('Aragorn');
    cy.get('#archetype').select('protagonist');
    cy.get('#age').type('87');
    
    cy.contains('Generate Backstory').click();
    cy.get('#backstory').should('not.be.empty');
    
    cy.contains('Save Character').click();
    
    cy.url().should('include', '/characters');
    cy.contains('Aragorn').should('be.visible');
  });
});
```

### Configuration des Tests

#### Frontend

Dans `package.json` :
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

Configuration Vitest (`vitest.config.ts`) :
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.stories.tsx',
        'src/**/*.test.{ts,tsx}'
      ]
    }
  }
});
```

#### Backend

Dans `requirements-dev.txt` :
```
pytest>=7.0.0
pytest-cov>=4.0.0
pytest-mock>=3.0.0
factory-boy>=3.0.0
```

Configuration pytest (`pyproject.toml` ou `pytest.ini`) :
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.pypython_classes = Test*
python_functions = test_*
addopts = 
    -v    --cov=backend
    --cov-report=term-missing
    --cov-report=html:htmlcov
```

#### Exécution des Tests

```bash
# Frontend
npm test
npm run test:watch  # Mode watch pendant le développement
npm run coverage    # Avec couverture de code

# Backend
cd backend
pytest
pytest --cov=backend --cov-report=html
pytest tests/test_character_service.py -v  # Test spécifique
```

### Bonnes Pratiques de Test

#### Arranger-Act-Assert (AAA)

```typescripttest('should do something', () => {
  // Arrange - Préparer les données et l'état initial
  const initialState = { count: 0 };
  const increment = 5;
  
  // Act - Exécuter l'action à tester
  const result = reducer(initialState, { type: 'INCREMENT', payload: increment });
  
  // Assert - Vérifier le résultat attendu
  expect(result.count).toBe(initialState.count + increment);
});
```

#### Noms de Tests Descriptifs

❌ Mauvais : `testAddition()`
✅ Bon : `shouldReturnSumWhenAddingTwoPositiveNumbers()`

#### Éviter les Tests Fragiles

- Ne pas tester les détails d'implémentation
- Se concentrer sur le comportement observable
- Utiliser des mocks pour les dépendances externes
- Isoler les tests les uns des autres

#### Couverture de Code

Viser :
- **80%+** de couverture globale
- **90%+** pour le code critique (authentification, paiement, etc.)
- Toujours regarder **quelles** lignes ne sont pas couvertes, pas juste le pourcentage

---

## 📚 Documentation

### Docstrings et Commentaires

#### TypeScript/JSDoc

```typescript
/**
 * Calcule la durée totale d'une séquence de plans * @param shots - Array de plans à sommer
 * @returns Durée totale en secondes
 * @throws {Error} Si shots est null ou undefined
 * 
 * @example
 * const shots = [
 *   { duration: 5.0 },
 *   { duration: 3.5 },
 *   { duration: 7.2 }
 * ];
 * 
 * const total = calculateTotalDuration(shots);
 * // total retourne 15.7
 */
export function calculateTotalDuration(shots: Shot[]): number {
  if (!shots) {
    throw new Error('Shots array is required');
  }
  
  return shots.reduce((sum, shot) => sum + shot.duration, 0);
}
```

#### Python/Docstrings

```python
def calculate_shot_duration(shots: List[Shot]) -> float:
    """
    Calcule la durée totale d'une séquence de plans.
    
    Cette fonction parcours la liste des plans et somme leurs durées individuelles.
    Elle gère les cas où certains plans pourraient avoir une durée nulle ou négative
    en les ignorant dans le calcul final.
    
    Args:
        shots: Liste d'objets Shot contenant les plans à sommer
        
    Returns:
        float: Durée totale en secondes
        
    Raises:
        ValueError: Si la liste shots est None
        TypeError: Si shots n'est pas une liste
        
    Examples:
        >>> shots = [
        ...     Shot(duration=5.0),
        ...     Shot(duration=3.5),
        ...     Shot(duration=7.2)
        ... ]
        >>> calculate_shot_duration(shots)
        15.7
        
        >>> calculate_shot_duration([])
        0.0
    """
    if shots is None:
        raise ValueError("Shots list cannot be None")
    
    if not isinstance(shots, list):
        raise TypeError("Shots must be a list")
    
    return sum(max(0, shot.duration) for shot in shots)
```

### Fichiers de Documentation Markdown

#### StructureUtiliser une structure cohérente pour tous les fichiers `.md` :

```markdown# Titre Principal

## Section Principale

### Sous-section

#### Détail si nécessaire

- Liste à puces
  - Sous-élément
- Deuxième élément

1. Liste numérotée
2. Deuxième élément
3. Troisième élément

> Bloc de citation pour des notes importantes

```language
// Bloc de code avec coloration syntaxique
const example = "code";
```

| Tableau | d'Exemple |
|---------|-----------|
| Colonne 1 | Colonne 2 |
| Valeur A  | Valeur B  |

**Important** : Mettre en gras les points cruciaux*Italique* : Pour l'emphase légère`code inline` : Pour les références de code

[Lien vers une section](#section-liée)
[Lien externe](https://example.com)
```

#### Éléments à Inclure

- **But** : Pourquoi ce fichier/composant existe
- **Utilisation** : Comment l'utiliser avec des exemples
- **Paramètres** : Pour les fonctions/composants
- **Valeur de retour** : Ce que la fonction retourne
- **Exceptions/Erreurs** : Quand et pourquoi elle peut échouer
- **Exemples** : Cas d'utilisation réels- **Voir aussi** : Références à d'autres documents liés

### Génération Automatique de Documentation

#### TypeDoc (TypeScript)

Installation :
```bash
npm install --save-dev typedoc
```

Configuration (`typedoc.json`) :
```json
{
  "entryPoints": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["**/*.test.ts", "**/*.stories.ts"],
  "out": "docs/api",
  "name": "StoryCore Engine API",
  "theme": "default",
  "hideGenerator": true,
  "hidePageTitle": false,
  "disableSources": false,
  "includeVersion": true
}
```

Script dans `package.json` :
```json
{
  "scripts": {
    "docs:api": "typedoc"
  }
}
```

#### Sphinx (Python)

Installation :
```bash
pip install sphinx sphinx-rtd-theme
```

Configuration (`docs/conf.py`) :
```python
project = 'StoryCore Engine'
copyright = '2026, StoryCore Team'
author = 'StoryCore Team'

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.viewcode',
    'sphinx.ext.napoleon',
    'sphinx.ext.autosummary',
]

autodoc_default_options = {
    'members': True,
    'member-order': 'bysource',
    'special-members': '__init__',
    'undoc-members': True,
    'exclude-members': '__weakref__'
}

html_theme = 'sphinx_rtd_theme'
```

Scripts :
```bash
# Construire la documentation
sphinx-build -b html docs/source docs/build/html

# Ou avec makefile
make html
```

---

## ⚡ Performance et Optimisation

### Frontend Optimizations

#### Bundle Analysis

Utiliser `rollup-plugin-visualizer` ou `vite-bundle-visualizer` :

```bash
# Dans package.json
{
  "scripts": {
    "build:analyze": "vite build --mode analyzer"
  }
}
```

#### Code Splitting

Chargement dynamique des routes :
```typescriptconst routes = [
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/editor',
    element: lazy(() => import('./pages/Editor')),
  },
  {
    path: '/wizards',
    element: lazy(() => import('./pages/Wizards')),
  },
];
```

Chargement dynamique des composants lourds :
```typescript
const VideoEditor = lazy(() => {
  return import('./components/video/VideoEditor').then(module => {
    return { default: module.VideoEditor };
  });
});

// Dans le composant parent<Suspense fallback={<VideoEditorLoading />}>
  <VideoEditor />
</Suspense>
```

#### Memoization

```typescript
import { useMemo, useCallback } from 'react';

const VideoList = ({ videos, filters }) => {
  // Memoize les calculs coûteux
  const filteredVideos = useMemo(() => {
    return videos.filter(video => 
      matchesFilters(video, filters)
    );
  }, [videos, filters]);
    // Memoize les fonctions de rappel  const handlePlay = useCallback((videoId) => {
    playVideo(videoId);
  }, []); // Dépendances vides si aucune
  
  return (
    <div>
      {filteredVideos.map(video => (
        <VideoItem 
          key={video.id}
          video={video}
          onPlay={() => handlePlay(video.id)}
        />
      ))}
    </div>
  );
};
```

#### Virtual Scrolling

Pour les longues listes :
```typescript
import { VirtualScroll } from '@tanstack/react-virtual';

const ShotList = ({ shots }) => {
  return (
    <VirtualScroll
      items={shots}
      itemSize={80} // hauteur de chaque élément en px
    >
      {({ index, style }) => (
        <ShotItem 
          key={shots[index].id}
          shot={shots[index]}
          style={style}
        />
      )}
    </VirtualScroll>
  );
};
```

#### Image Optimization

- Utiliser les formats modernes : WebP, AVIF- Implémenter le lazy loading : `loading="lazy"`
- Utiliser `srcset` pour différentes résolutions
- Compresser les images lors du build

```jsx<img 
  src="/images/hero.webp"
  srcset="
    /images/hero-400w.webp 400w,
    /images/hero-800w.webp 800w,
    /images/hero-1200w.webp 1200w
  "
  sizes="(max-width: 800px) 100vw, 800px"
  alt="Hero image"
  loading="lazy"
  width="1200"
  height="675"
/>
```

### Backend Optimizations

#### Database Optimization

```python
# Utiliser le chargement eager quand approprié
from sqlalchemy.orm import joinedload

# Au lieu de faire des requêtes N+1
characters = Character.query.all()
for character in characters:
    shots = character.shots  # Cela déclenche une requête pour chaque personnage

# Utiliser le chargement eager
characters = Character.query.options(joinedload(Character.shots)).all()
# Maintenant character.shots est déjà chargé# Indexer les colonnes fréquemment recherchées
__table_args__ = (
    Index('idx_character_name', 'name'),
    Index('idx_character_archetype', 'archetype'),
    Index('idx_shot_project_time', 'project_id', 'start_time'),
)
```

#### Caching

```python
from functools import lru_cache
import redis

# Cache en mémoire pour les fonctions pures
@lru_cache(maxsize=128)
def get_character_archetype_traits(archetype: str) -> dict:
    """Retourne les traits de personnalité associés à un archétype"""
    # Coûteux à calculer, donc mis en cache
    return ARCHETYPE_TRAITS.get(archetype, {})

# Cache Redis pour les données coûteuses
def get_project_stats(project_id: str) -> dict:
    """Récupère les statistiques d'un projet avec mise en cache"""
    cache_key = f"project_stats:{project_id}"
    
    # Essayer de récupérer depuis le cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Sinon, calculer et mettre en cache
    stats = calculate_project_stats(project_id)
    redis_client.setex(
        cache_key, 
        300,  # 5 minutes
        json.dumps(stats)
    )
    
    return stats
```

#### Async et Concurrency

```python
import asyncio
import aiohttp

# Au lieu de faire des appels séquentiels
async def generate_multiple_images(prompts: List[str]) -> List[str]:
    """Génère plusieurs images en parallèle"""
    
    async def generate_one(session, prompt):
        async with session.post(
            f"{COMFYUI_URL}/generate",
            json={"prompt": prompt}
        ) as resp:
            return await resp.json()
    
    # Créer une session et lancer toutes les requêtes en parallèle    async with aiohttp.ClientSession() as session:
        tasks = [generate_one(session, prompt) for prompt in prompts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filtrer les exceptions
        return [r for r in results if not isinstance(r, Exception)]
```

#### Profiling

```python
# Utiliser cProfile pour identifier les goulots d'étranglement
import cProfile
import pstats
from io import StringIO

def profile_function(func):
    """Décorateur pour profiler une fonction"""
    def wrapper(*args, **kwargs):
        profiler = cProfile.Profile()
        profiler.enable()
        
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            profiler.disable()
            s = StringIO()
            ps = pstats.Stats(profiler, stream=s).sort_stats('cumulative')
            ps.print_stats(20)  # Top 20 fonctions
            print(s.getvalue())
    
    return wrapper

# Utilisation@profile_function
def expensive_operation():
    # Code à profiler
    pass
```

---

## 🔒 Sécurité

### Authentification et Autorisation

#### JWT Best Practices

```python
import jwt
import datetimefrom functools import wraps

def generate_token(user_id: str, expires_in: int = 3600) -> str:
    """Génère un token JWT sécurisé"""
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in),
        'iat': datetime.datetime.utcnow(),
        'iss': 'storycore-engine',
        'aud': 'storycore-users'
    }
    
    # Utiliser une clé secrète forte depuis les variables d'environnement
    secret_key = os.environ.get('JWT_SECRET_KEY')
    if not secret_key:
        raise ValueError("JWT_SECRET_KEY must be set")
    
    return jwt.encode(payload, secret_key, algorithm='HS256')

def verify_token(token: str) -> dict:
    """Vérifie et décode un token JWT"""
    try:
        secret_key = os.environ.get('JWT_SECRET_KEY')
        payload = jwt.decode(
            token, 
            secret_key, 
            algorithms=['HS256'],
            issuer='storycore-engine',
            audience='storycore-users'
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")

def token_required(f):
    """Décorateur pour protéger les endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Vérifier différents endroits où le token pourrait être
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
                try:
            data = verify_token(token)
            current_user_id = data['user_id']
        except ValueError as e:
            return jsonify({'message': str(e)}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated
```

#### Password Security

```python
import bcrypt
import secrets

def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt"""
    # Générer un salt et hasher le mot de passe
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_password(password: str, hashed: str) -> bool:
    """Vérifie un mot de passe contre son hash"""
    return bcrypt.checkpw(
        password.encode('utf-8'), 
        hashed.encode('utf-8')
    )

def generate_secure_token(length: int = 32) -> str:
    """Génère un token cryptographiquement sécurisé"""
    return secrets.token_urlsafe(length)
```

### Input Validation and Sanitization

#### Utiliser des bibliothèques de validation

```python
from marshmallow import Schema, fields, validate, validates, ValidationError

class CharacterSchema(Schema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100),
        error_messages={
            'required': 'Name is required',
            'validator_failed': 'Name must be between 1 and 100 characters'
        }
    )
    age = fields.Int(
        validate=validate.Range(min=0, max=150),
        error_messages={
            'validator_failed': 'Age must be between 0 and 150'
        }
    )
    archetype = fields.Str(
        required=True,
        validate=validate.OneOf([
            'protagonist', 
            'antagonist', 
            'supporting',
            'mentor',
            'trickster'
        ])
    )
    backstory = fields.Str(
        validate=validate.Length(max=5000),
        missing=''
    )
    
    @validates('name')
    def validate_name(self, value):
        """Validation personnalisée pour le nom"""
        # Vérifier qu'il ne contient pas de caractères dangereux
        if any(char in value for char in ['<', '>', '&', '"', "'"]):
            raise ValidationError('Name contains invalid characters')
        return value

# Utilisation dans un endpoint
@character_api.route('/', methods=['POST'])
def create_character():
    try:
        schema = CharacterSchema()
        data = schema.load(request.get_json())
        # Les données sont maintenant validées et sûres à utiliser
        character = CharacterService.create(data)
        return jsonify(character.to_dict()), 201
    except ValidationError as err:
        return jsonify({'errors': err.messages}), 400
```

#### Sanitization du HTML

```python
import bleach

def sanitize_html(text: str, tags: List[str] = None, attributes: dict = None) -> str:
    """Nettoie le HTML pour prévenir les XSS"""
    if tags is None:
        tags = ['b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br']
    
    if attributes is None:
        attributes = {
            'a': ['href', 'title', 'target'],
            '*': ['class']
        }
    
    # Nettoyer le texte
    cleaned = bleach.clean(
        text,
        tags=tags,
        attributes=attributes,
        strip=True  # Supprimer les balises non autorisées plutôt que de les échapper
    )
    
    # Optionnellement, linker les URLs
    cleaned = bleach.linkify(cleaned)
    
    return cleaned
```

### Security Headers

```python
from flask_talisman import Talisman

# Dans main.py ou l'initialisation de l'app
def create_app():
    app = Flask(__name__)
    
    # Configurer Talisman pour les en-têtes de sécurité
    csp = {
        'default-src': [
            '\'self\'',
            'https://cdn.jsdelivr.net',
            'https://unpkg.com'
        ],
        'style-src': [
            '\'self\'',
            '\'unsafe-inline\'',  # Nécessaire pour Tailwind/JIT
            'https://fonts.googleapis.com'
        ],
        'font-src': [
            '\'self\'',
            'https://fonts.gstatic.com'
        ],
        'img-src': [
            '\'self\'',
            'data:',
            'https:',
            'blob:'
        ],
        'script-src': [
            '\'self\'',
            '\'unsafe-inline\''  # Peut être nécessaire pour certains libs
        ]
    }
    
    Talisman(
        app,
        content_security_policy=csp,
        force_https=False,  # Mettre à True en production avec HTTPS
        session_cookie_secure=False,  # Mettre à True en production
        session_cookie_http_only=True,
        session_cookie_same_site='Lax',
        referrer_policy='strict-origin-when-cross-origin'
    )
        return app
```

### Dependencies Security#### Vérification régulière des dépendances

```bash
# Pour Node.js
npm audit
npm audit fix

# Pour Python
pip install safety
safety check
# Ou
pip list --outdated  # Puis mettre à jour individuellement
```

#### Lock Files

Toujours commiter les lock files :
- `package-lock.json` ou `yarn.lock` pour Node.js
- `requirements.txt` généré avec `pip freeze > requirements.txt` pour Python

---

## 🚀 Déploiement

### Environnements

#### Développement

- **Frontend** : `npm run dev` (Vite dev server)
- **Backend** : `python main.py` (Flask dev server)
- **Base de données** : SQLite ou PostgreSQL local
- **Hot reload** : Activé des deux côtés
- **Logs** : Niveau DEBUG

#### Staging

- **Frontend** : Build optimisé servi par Nginx
- **Backend** : Gunicorn avec workers multiples
- **Base de données** : PostgreSQL
- **Cache** : Redis activé
- **Logs** : Niveau INFO- **HTTPS** : Terminé au niveau du load balancer

#### Production

- **Frontend** : CDN pour les assets statiques
- **Backend** : Kubernetes ou Docker Swarm avec scaling
- **Base de données** : PostgreSQL avec réplication
- **Cache** : Redis Cluster
- **Monitoring** : Prometheus + Grafana
- **Logs** : ELK Stack ou équivalent
- **HTTPS** : Terminé au niveau du ingress
- **DDoS protection** : Cloudflare ou équivalent

### Scripts de Déploiement

#### Docker

```bash
# Construire les images
docker-compose build

# Démarrer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

#### Kubernetes

```yaml# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storycore-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: storycore-backend
  template:
    metadata:
      labels:
        app: storycore-backend
    spec:
      containers:
      - name: backend
        image: storycore/backend:latest
        ports:
        - containerPort: 5000        envFrom:
        - secretRef:
            name: storycore-secrets
        - configMapRef:
            name: storycore-config        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: storycore-backend
spec:
  selector:
    app: storycore-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: LoadBalancer
```

### Variables d'Environnement par Environnement

#### .env.development
```env
FLASK_ENV=development
FLASK_DEBUG=1
DATABASE_URL=sqlite:///dev_storycore.db
LOG_LEVEL=DEBUG
```

#### .env.staging
```env
FLASK_ENV=production
FLASK_DEBUG=0
DATABASE_URL=postgresql://user:pass@staging-db:5432/storycore
LOG_LEVEL=INFO
REDIS_URL=redis://staging-redis:6379
```

#### .env.production
```env
FLASK_ENV=production
FLASK_DEBUG=0DATABASE_URL=postgresql://user:pass@prod-db:5432/storycore?sslmode=require
LOG_LEVEL=WARNING
REDIS_URL=redis://prod-redis:6379
SECRET_KEY=$(openssl rand -hex 32)
```

### Health Checks

#### Backend Health Endpoints

```python
from flask import Blueprint, jsonify
import psutil
import time

health_bp = Blueprint('health', __name__)

@health_bp.route('/health')
def health_check():
    """Vérification de base de l'application"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'version': '2.3.0'
    }), 200

@health_bp.route('/ready')
def readiness_check():
    """Vérifie si l'application est prête à recevoir du trafic"""
    checks = {
        'database': check_database_connection(),
        'cache': check_cache_connection(),
        'llm_services': check_llm_services()
    }
    
    all_healthy = all(checks.values())
    
    status_code = 200 if all_healthy else 503
    return jsonify({
        'status': 'ready' if all_healthy else 'not ready',
        'timestamp': time.time(),
        'checks': checks
    }), status_code

def check_database_connection():
    try:
        # Essayer une requête simple        db.session.execute('SELECT 1')
        return True
    except:
        return Falsedef check_cache_connection():
    try:
        redis_client.ping()
        return True
    except:
        return False

def check_llm_services():
    # Vérifier au moins un service LLM
    services = ['openai', 'anthropic', 'ollama']
    return any(check_service(s) for s in services)
```

#### Frontend Health Check

```typescript
// Dans un composant ou service
export const checkFrontendHealth = async () => {
  try {
    const start = performance.now();
    const response = await fetch('/api/health');
    const end = performance.now();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const latency = end - start;
    
    return {
      status: 'healthy',
      latency: `${latency.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
      backend: data
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};
```

---

## 📅 Release Process

### Pré-release

1. **Branche de release** : Créer à partir de `develop`
   ```bash
   git checkout develop   git pull
   git checkout -b release/v2.3.0
   ```

2. **Mettre à jour les versions** :
   - `package.json` : `"version": "2.3.0"`
   - `setup.py` ou `pyproject.toml` : version correspondante
   - `docs/CHANGELOG.md` : Ajouter les notes de version3. **Exécuter les tests** :
   ```bash
   # Frontend
   npm test
   npm run build
      # Backend
   cd backend
   pytest
   ```

4. **Mettre à jour la documentation** :
   - Générer l'API documentation
   - Vérifier que tous les guides sont à jour
   - Construire la documentation du site

5. **Pre-merge checklist** :
   - [ ] Tous les tests passent
   - [ ] Revue de code approuvée
   - [ ] Documentation mise à jour   - [ ] Changelog complet
   - [ ] Build de production réussi

### Release

1. **Merger la branche de release** :
   ```bash
   git checkout main   git pull
   git merge --no-ff release/v2.3.0
   git tag -a v2.3.0 -m "Release version 2.3.0"
   git push origin main --tags
   ```

2. **Déployer en staging** :
   - Déployer la branche `main` sur l'environnement de staging
   - Effectuer des tests de fumée
   - Vérifier les performances

3. **Déployer en production** :
   - Suivre la procédure de déploiement production
   - Surveiller les métriques et les logs
   - Vérifier que tout fonctionne correctement

### Post-release

1. **Merger back into develop** :
   ```bash
   git checkout develop
   git pull   git merge main
   git push origin develop
   ```

2. **Nettoyer les branches** :
   ```bash
   git branch -d release/v2.3.0   git push origin --delete release/v2.3.0
   ```

3. **Annonce** :
   - Mettre à jour le README si nécessaire
   - Annoncer sur les canaux de communication
   - Préparer les notes de version pour les utilisateurs

---

## 🔍 Debugging et Troubleshooting

### Outils de Debugging

#### Frontend- **React DevTools** : Inspecter l'état et les props
- **Redux DevTools** : Si utilisant Redux (Zustand a ses propres outils)
- **Vue.js devtools** : Pour les composants Vue si applicable
- **Console API** : `console.log`, `console.warn`, `console.error`
- **Breakpoints** : Dans les sources du navigateur- **Network tab** : Inspector les requêtes API
- **Performance tab** : Analyser le rendu et les interactions

#### Backend- **PDB** : Python Debugger  ```python
  import pdb; pdb.set_trace()  # Breakpoint
  ```
- **IDE Debuggers** : PyCharm, VS Code avec extension Python
- **Logging** : Utiliser le module `logging` au lieu de `print`
- **Profiling** : `cProfile`, `line_profiler`, `memory_profiler`
- **API Testing** : Postman, Insomnia, ou curl### Techniques de Debugging Courantes

#### Reproduction du Bug

1. **Isoler** : Trouver le scénario minimal qui reproduit le bug
2. **Documenter** : Écrire les étapes exactes pour reproduire
3. **Versionner** : Noter la version/git commit où le bug apparaît
4. **Environnement** : Documenter l'OS, navigateur, dépendances

#### Debugging Frontend

```typescript
// Utiliser console.log de manière stratégique
const expensiveComputation = (data) => {
  console.log('[ExpensiveComp] Input:', data);
  const result = /* opération coûteuse */;
  console.log('[ExpensiveComp] Output:', result);
  return result;
};

// Ou mieux, utiliser des markers de performance
const measurePerformance = (label: string, fn: Function) => {
  console.time(label);
  try {
    return fn();
  } finally {
    console.timeEnd(label);
  }
};

// Dans un useEffect
useEffect(() => {
  return measurePerformance('Data fetching', () => {
    fetchData().then(setData);
  });
}, []);
```

#### Debugging Backend

```python
import logging
import traceback

logger = logging.getLogger(__name__)

def risky_operation(data):
    try:
        # Opération qui pourrait échouer        result = process_data(data)
        logger.info(f"Operation successful: {result}")
        return result
    except Exception as e:
        # Logger l'erreur complète avec traceback
        logger.error(
            f"Operation failed with data: {data}",
            exc_info=True  # Cela inclut le traceback
        )
        # Ou alternativement:
        logger.error(f"Operation failed: {str(e)}\n{traceback.format_exc()}")
        raise  # Re-lever l'exception si nécessaire
```

#### Debugging des Performances

##### Frontend```typescript
// Utiliser l'API Performanceconst measureRender = () => {
  const start = performance.now();
  
  // Votre logique de rendu ici
  const result = renderComponent();
  
  const end = performance.now();
  console.log(`Render took ${end - start}ms`);
  
  return result;
};

// Détecter les re-renders inutiles
import { useWhyDidYouUpdate } from '@welldone-software/why-did-you-update';

function MyComponent(props) {
  useWhyDidYouUpdate(props, 'MyComponent');
  // Reste du composant
}
```

##### Backend

```python
import time
from functools import wraps

def timing_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            end = time.time()
            logger.info(f"{func.__name__} took {end - start:.4f} seconds")
    return wrapper

# Utilisation
@timing_decoratordef expensive_database_query():
    # Votre requête ici
    pass
```

### Logging Strategy#### Niveaux de Log

- **DEBUG** : Informations détaillées, principalement pour le développement
- **INFO** : Confirmation que les choses fonctionnent comme attendu
- **WARNING** : Indication qu'il y a eu un problème inattendu, mais pas d'erreur
- **ERROR** : En raison d'un problème plus grave, la fonction n'a pas pu exécuter sa tâche
- **CRITICAL** : Erreur grave indiquant que l'application elle-même peut être incapable de continuer à fonctionner

#### Configuration Python Logging

```python
import logging
import logging.handlers
import os
from datetime import datetimedef setup_logging(log_level: str = 'INFO'):
    """Configure le logging pour l'application"""
    
    # Créer le formateur
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
        # Logger racine
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Handler pour la console
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
        # Handler pour fichier avec rotation
    log_dir = 'logs'
    os.makedirs(log_dir, exist_ok=True)
    
    file_handler = logging.handlers.RotatingFileHandler(
        f'{log_dir}/storycore.log',
        maxBytes=10*1024*1024,  # 10 MB
        backupCount=5
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
        # Handler séparé pour les erreurs    error_handler = logging.handlers.RotatingFileHandler(
        f'{log_dir}/error.log',
        maxBytes=10*1024*1024,  # 10 MB
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)
        return logger

# Utilisation dans l'application
logger = setup_logging(os.getenv('LOG_LEVEL', 'INFO'))

# Dans le code
logger.debug("Debug information")
logger.info("Informational message")
logger.warning("Warning message")
logger.error("Error message: %s", str(error))
logger.critical("Critical error!")
```

#### Frontend Logging

```typescript
// Créer un service de logging
class Logger {
  private static instance: Logger;
  private readonly prefix: string;
    private constructor(prefix: string = '[StoryCore]') {
    this.prefix = prefix;
  }
  
  static getInstance(prefix: string = '[StoryCore]'): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(prefix);
    }
    return Logger.instance;
  }
  
  debug(...args: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.prefix, ...args);
    }
  }
    info(...args: any[]) {
    console.info(this.prefix, ...args);
  }
  
  warn(...args: any[]) {
    console.warn(this.prefix, ...args);
  }
  
  error(...args: any[]) {
    console.error(this.prefix, ...args);
  }
  
  // Méthode spéciale pour logger les erreurs avec contexte  errorWithContext(error: Error, context: Record<string, any> = {}) {
    console.error(this.prefix, {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

// Utilisationconst logger = Logger.getInstance('[CharacterService]');

logger.info('Creating character', { name: 'John', archetype: 'hero' });
try {
  // opération qui pourrait échouer
} catch (error) {
  logger.errorWithContext(error, { operation: 'createCharacter' });
}
```

---

## 🤝 Contribution Guidelines### Comment Contribuer

1. **Fork le dépôt**
2. **Créer une branche** pour votre contribution
3. **Faire vos changements** en suivant ce guide
4. **Ajouter des tests** pour les nouvelles fonctionnalités
5. **Mettre à jour la documentation** si nécessaire
6. **Soumettre une Pull Request**
7. **Participer à la revue de code**

### Code de Conduite

Nous nous engageons à fournir un environnement accueillant et respectueux pour tous. Veuillez lire notre [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) pour plus de détails.

### Questions et Support

- **Issues** : Utiliser le GitHub Issues pour les bugs et les demandes de fonctionnalités- **Discussions** : Utiliser GitHub Discussions pour les questions générales
- **Documentation** : Consulter les guides dans le dossier `docs/`
- **Communauté** : Rejoindre notre Discord/Slack pour l'aide en temps réel

### Reconnaissance

Les contributeurs seront reconnus dans :
- Le fichier `CONTRIBUTORS.md`
- Les notes de version- Le site web du projet (section "Team" ou "Contributors")

---

## 🔍 Audit Qualité Récent (Mai 2026)

### Résumé de l'Audit

Une refonte majeure de la qualité du code a été réalisée en mai 2026 :

- **Réduction des erreurs Ruff** : 6000+ → 171 (97% de réduction)
- **F821 (noms non définis)** : 84 → 0 ✅
- **F811 (redéfinitions)** : 7 → 0 ✅
- **E712 (comparaisons == True/False)** : 6 → 0 ✅
- **E741 (nom de variable 'l')** : 28 → 0 ✅
- **E701 (instructions multiples)** : 67 → 0 ✅
- **E402 (ordre des imports)** : 93 → 0 ✅

### Reste à corriger (non critiques)

- **F401 (imports non utilisés)** : 140 — intentionnels pour les dépendances ML optionnelles (cv2, torch, librosa, mediapipe)
- **F405 (imports wildcard)** : 12
- **F403 (imports wildcard en __init__)** : 6
- **F402 (imports redéfinis)** : 2
- **E842 (continuation de ligne invalide)** : 11

### Refactoring Architecturel

- **App.tsx** : Découpage de 1299 lignes en modules séparés :
  - `AppProviders.tsx` — Providers centralisés (React Query, Zustand, Router)
  - `AppRoutes.tsx` — Routage et lazy loading
  - `AppContent.tsx` — Logique principale de rendu
  - `App.tsx` — Wrapper minimal (30 lignes)

### Statut du Build

- **TypeScript** : 0 erreur ✅
- **Vitest** : 170 pass / 248 fail (échecs préexistants non liés au refactoring)
- **Ruff** : 171 warnings restants (non critiques)

### Documentation

- Rapport d'audit complet : [AUDIT_200_TASKS.md](../../AUDIT_200_TASKS.md)
- 200 tâches planifiées pour améliorations futures

### Bonnes Pratiques

1. **Vérifiez avec Ruff** avant de commit : `ruff check . --fix`
2. **TypeScript strict** : Évitez `any`, utilisez les types explicites
3. **Architecture modulaire** : Gardez les composants < 300 lignes
4. **Tests** : Ajoutez des tests pour les nouvelles fonctionnalités
5. **Documentation** : Mettez à jour la doc en même temps que le code