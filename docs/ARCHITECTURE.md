### Structure des Dossiers (Frontend)

```text
src/
├── components/          # Composants React organisés par domaine
│   ├── wizard/         # Wizards de création
│   ├── sequence-editor/ # Éditeur de séquence
│   ├── video/          # Composants vidéo
│   ├── audio/          # Composants audio
│   ├── cinematic/      # Outils cinématiques
│   └── ui/             # Composants UI génériques
├── App.tsx             # Point d'entrée principal (wrapper minimal - 30 lignes)
├── AppProviders.tsx    # Providers centralisés (React Query, Zustand, Router)
├── AppRoutes.tsx       # Configuration du routage et lazy loading
├── AppContent.tsx      # Logique principale de rendu
├── services/           # Services (API, logique métier)
├── hooks/              # Hooks React personnalisés
├── stores/             # Stores Zustand
├── contexts/           # Contextes React
├── types/              # Définitions TypeScript
├── utils/              # Fonctions utilitaires
├── styles/             # Styles CSS/SCSS
└── assets/             # Images, icônes, fonts
```

### Architecture Applicative Refactorée (Mai 2026)

Suite à l'audit qualité de mai 2026, l'architecture frontend a été refactorée pour une meilleure maintenabilité :

#### Avant
- `App.tsx` : 1299 lignes (monolithique)
- Logique métier, routage, providers et rendu mélangés

#### Après
- `App.tsx` : 30 lignes (wrapper minimal)
- `AppProviders.tsx` : Centralise React Query, Zustand, Router, Error Boundaries
- `AppRoutes.tsx` : Configuration déclarative des routes avec lazy loading
- `AppContent.tsx` : Logique de rendu conditionnel et état global

**Bénéfices** :
- Séparation claire des responsabilités
- Meilleure testabilité
- Maintenance facilitée
- Chargement optimisé (code splitting)

### Stack Technologique (Frontend)

- **React 18** : UI library avec Concurrent Mode
- **TypeScript** : Typage statique strict
- **Vite** : Build tool ultra-rapide
- **Tailwind CSS** : Utility-first CSS framework
- **Radix UI** : Accessible component primitives
- **Zustand** : State management léger
- **React Query** : Server state management
- **React Router** : Client-side routing