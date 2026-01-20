e# Browser File Picker Implementation

## Problème Résolu

La version web de StoryCore affichait un modal de navigation de dossiers personnalisé (`FolderNavigationModal`) au lieu d'utiliser le dialogue natif du navigateur, contrairement à la version Electron qui utilise correctement le dialogue natif du système d'exploitation.

## Solution Implémentée

### Architecture à Trois Niveaux

L'implémentation utilise maintenant une approche progressive pour offrir la meilleure expérience utilisateur possible :

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ELECTRON MODE                                            │
│    → Native OS Dialog (Windows Explorer, macOS Finder)     │
│    ✓ Meilleure expérience utilisateur                      │
│    ✓ Accès complet au système de fichiers                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BROWSER MODE (Modern)                                    │
│    → File System Access API (showDirectoryPicker)          │
│    ✓ Dialogue natif du navigateur                          │
│    ✓ Chrome, Edge, Opera (2023+)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BROWSER MODE (Legacy)                                    │
│    → Custom FolderNavigationModal                           │
│    ⚠ Fallback pour navigateurs anciens                     │
│    ⚠ Firefox, Safari (sans File System Access API)         │
└─────────────────────────────────────────────────────────────┘
```

## Détails Techniques

### 1. Electron Mode (Optimal)

**Fichier** : `useLandingPage.ts` (lignes 280-300)

```typescript
if (window.electronAPI) {
  const selectedPath = await window.electronAPI.project.selectForOpen();
  if (selectedPath) {
    await handleOpenProjectSubmit(selectedPath);
  }
}
```

**Avantages** :
- Dialogue natif du système d'exploitation
- Accès complet au système de fichiers (lecteurs réseau, raccourcis)
- Navigation clavier complète
- Cohérent avec les autres applications desktop

### 2. Browser Mode - File System Access API (Moderne)

**Fichier** : `useLandingPage.ts` (lignes 302-325)

```typescript
if ('showDirectoryPicker' in window) {
  const dirHandle = await window.showDirectoryPicker({
    mode: 'read',
  });
  const projectPath = dirHandle.name;
  await handleOpenProjectSubmit(projectPath);
}
```

**Avantages** :
- Dialogue natif du navigateur (similaire à l'OS)
- API standard moderne
- Bonne expérience utilisateur

**Support Navigateurs** :
- ✅ Chrome 86+ (2020)
- ✅ Edge 86+ (2020)
- ✅ Opera 72+ (2020)
- ❌ Firefox (en développement)
- ❌ Safari (en développement)

### 3. Browser Mode - Custom Modal (Fallback)

**Fichier** : `LandingPageWithHooks.tsx` (lignes 115-130)

```typescript
{!window.electronAPI && !('showDirectoryPicker' in window) && (
  <FolderNavigationModal
    open={showOpenDialog}
    onOpenChange={setShowOpenDialog}
    onSelectProject={handleOpenProjectSubmit}
  />
)}
```

**Utilisation** :
- Uniquement pour les navigateurs sans File System Access API
- Firefox et Safari (versions actuelles)
- Expérience utilisateur limitée mais fonctionnelle

## Comportement par Environnement

| Environnement | Dialogue Utilisé | Expérience |
|---------------|------------------|------------|
| **Electron (Windows)** | Windows File Explorer | ⭐⭐⭐⭐⭐ Excellent |
| **Electron (macOS)** | macOS Finder | ⭐⭐⭐⭐⭐ Excellent |
| **Chrome/Edge (Web)** | showDirectoryPicker | ⭐⭐⭐⭐ Très bon |
| **Firefox (Web)** | FolderNavigationModal | ⭐⭐⭐ Acceptable |
| **Safari (Web)** | FolderNavigationModal | ⭐⭐⭐ Acceptable |

## Test de l'Implémentation

### Test Electron
```bash
npm run electron:dev
# Cliquer sur "Open Existing Project"
# → Devrait ouvrir Windows File Explorer / macOS Finder
```

### Test Chrome/Edge
```bash
npm run dev
# Ouvrir dans Chrome ou Edge
# Cliquer sur "Open Existing Project"
# → Devrait ouvrir le dialogue natif du navigateur
```

### Test Firefox/Safari
```bash
npm run dev
# Ouvrir dans Firefox ou Safari
# Cliquer sur "Open Existing Project"
# → Devrait ouvrir le FolderNavigationModal personnalisé
```

## Détection de l'API

La détection se fait via :

```typescript
// Electron
if (window.electronAPI) { ... }

// File System Access API
if ('showDirectoryPicker' in window) { ... }

// Fallback
else { ... }
```

## Gestion des Erreurs

### Annulation par l'utilisateur
- **Electron** : `selectedPath === null` → Pas d'erreur affichée
- **Browser API** : `AbortError` → Pas d'erreur affichée
- **Custom Modal** : Fermeture du modal → Pas d'erreur affichée

### Erreurs réelles
- Affichage d'un message d'erreur en haut à droite
- Log dans la console pour le débogage
- État de chargement réinitialisé

## Améliorations Futures

### Court Terme
- [ ] Ajouter un message informatif pour les utilisateurs Firefox/Safari
- [ ] Améliorer le FolderNavigationModal avec plus de fonctionnalités
- [ ] Ajouter des raccourcis clavier dans le modal personnalisé

### Long Terme
- [ ] Migrer vers File System Access API quand Firefox/Safari l'implémenteront
- [ ] Supprimer complètement le FolderNavigationModal
- [ ] Utiliser uniquement les dialogues natifs

## Références

- [File System Access API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [showDirectoryPicker - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker)
- [Browser Compatibility](https://caniuse.com/native-filesystem-api)

## Historique

- **2026-01-19** : Implémentation de l'approche à trois niveaux
- **Précédent** : Utilisation du FolderNavigationModal pour tous les modes web
- **Problème** : Expérience utilisateur incohérente entre Electron et Web

---

**Note** : Cette implémentation garantit que les utilisateurs obtiennent toujours la meilleure expérience possible selon leur environnement, avec une dégradation gracieuse pour les navigateurs plus anciens.
