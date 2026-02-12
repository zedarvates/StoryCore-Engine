# StoryCore Engine - Bundle Size Optimization

## 📊 Analyse du Bundle

### Build Actuel (2026-02-12)

| Fichier | Taille | gzip |
|---------|--------|------|
| `index-BbuGVKkM.js` | 2.62 MB | 689 kB |
| `pdf-export-CZEhCUar.js` | 590 kB | 176 kB |
| `ui-libs-CH-j_U6P.js` | 282 kB | 84 kB |
| `radix-ui-Ct2utmqa.js` | 107 kB | 36 kB |
| `react-vendor-DvjGUD7S.js` | 97 kB | 33 kB |

**Total:** ~3.7 MB (1.0 MB gzipped)

---

## ✅ Optimisations Appliquées

### 1. Configuration Vite Améliorée

**Fichier:** [`creative-studio-ui/vite.config.ts`](creative-studio-ui/vite.config.ts)

Ajout de chunks manuels pour:
- `react-vendor`: React, ReactDOM, React Router
- `radix-ui`: Tous les composants Radix UI
- `pdf-export`: jsPDF, html2canvas
- `ui-libs`: Material UI, Emotion

### 2. Séparation des Dépendances

Les bibliothèques tierces sont maintenant séparées du code applicatif:
- Meilleure mise en cache
- Chargement parallèle possible
- Réduction du temps de build incrémental

---

## ⚠️ Problèmes Identifiés

### 1. Imports Mixtes (Statique + Dynamique)

Le warning Vite indique que plusieurs modules sont importés des deux façons:

```
useAppStore.ts - importé statiquement et dynamiquement
llmService.ts - importé statiquement et dynamiquement
store/index.ts - importé statiquement et dynamiquement
```

**Impact:** Empêche le code-splitting optimal.

### 2. Bundle Principal Volumineux

Le bundle principal (`index-*.js`) contient:
- Todo le code applicatif
- Les composants React
- Les services et hooks

---

## 🔧 Améliorations Futures Recommandées

### Priorité Haute

#### 1. Lazy Loading pour les Composants Lourds

```typescript
// AVANT (statique)
import { HeavyComponent } from '@/components/heavy';

// APRÈS (dynamique)
const HeavyComponent = lazy(() => import('@/components/heavy'));
```

**Candidats pour lazy loading:**
- `StorytellerWizard` (~20+ composants)
- `WorldWizard` (~15 composants)
- `CharacterWizard` (~10 composants)
- Dialogues de génération (Image, Video, Audio)

#### 2. Unifier les Patterns d'Import

Standardiser sur un seul type d'import:
- Soit **tous statiques** (pour les modules critiques)
- Soit **tous dynamiques** (pour le code-splitting)

---

## 📈 Métriques Cibles

| Métrique | Actuel | Cible |
|----------|--------|-------|
| Bundle principal | 2.6 MB | 1.5 MB |
| Temps de chargement | ~3s | ~1.5s |
| TTFB (Time to First Byte) | ~100ms | ~50ms |

---

## 🧪 Vérification

Pour vérifier les optimisations:

```bash
cd creative-studio-ui
npm run build

# Ouvrir le rapport d'analyseur
# dist/stats.html
```

---

*Document créé: 2026-02-12*
