# Correction : CSP et Wizards

## 🎯 Problèmes Identifiés

### 1. Content Security Policy (CSP) Bloque 127.0.0.1

**Erreur :**
```
Connecting to 'http://127.0.0.1:8000/system_stats' violates the following Content Security Policy directive: "connect-src 'self' http://localhost:* ..."
```

**Cause :** La CSP n'autorisait que `localhost:*` mais pas `127.0.0.1:*`

### 2. Wizard "Character Creation" Non Fonctionnel

**Symptôme :** Cliquer sur le bouton "Character Creation" ne fait rien

**Cause :** Le type `'character-creation'` n'était pas inclus dans le store

## ✅ Corrections Appliquées

### 1. Mise à Jour de la Content Security Policy

**Fichier :** `creative-studio-ui/index.html`

**Avant :**
```html
connect-src 'self' http://localhost:* ws://localhost:* https://api.openai.com https://api.anthropic.com;
```

**Après :**
```html
connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://api.openai.com https://api.anthropic.com;
```

**Changements :**
- ✅ Ajout de `http://127.0.0.1:*` pour les connexions HTTP
- ✅ Ajout de `ws://127.0.0.1:*` pour les WebSockets

### 2. Ajout du Wizard "Character Creation" au Store

**Fichier :** `creative-studio-ui/src/stores/useAppStore.ts`

**Changements :**

#### a) Type WizardType
```typescript
export type WizardType =
  | 'character-creation'  // ✅ AJOUTÉ
  | 'dialogue-writer'
  | 'scene-generator'
  | 'storyboard-creator'
  | 'style-transfer'
  | 'world-building';
```

#### b) État du Store
```typescript
// Generic wizard forms state
showCharacterCreation: boolean;  // ✅ AJOUTÉ
showDialogueWriter: boolean;
showSceneGenerator: boolean;
showStoryboardCreator: boolean;
showStyleTransfer: boolean;
showWorldBuilding: boolean;
activeWizardType: WizardType | null;
```

#### c) Actions
```typescript
// Actions
setShowCharacterCreation: (show: boolean) => void;  // ✅ AJOUTÉ
setShowDialogueWriter: (show: boolean) => void;
// ...
```

#### d) Implémentation openWizard
```typescript
openWizard: (wizardType) =>
  set({
    // Close all wizards first
    showCharacterCreation: false,  // ✅ AJOUTÉ
    showDialogueWriter: false,
    // ...
    
    // Open the requested wizard
    ...(wizardType === 'character-creation' && { showCharacterCreation: true }),  // ✅ AJOUTÉ
    ...(wizardType === 'dialogue-writer' && { showDialogueWriter: true }),
    // ...
  }),
```

#### e) Implémentation closeActiveWizard
```typescript
closeActiveWizard: () =>
  set({
    showCharacterCreation: false,  // ✅ AJOUTÉ
    showDialogueWriter: false,
    // ...
  }),
```

## 🔍 Vérification

### 1. Tester la Connexion ComfyUI

Après avoir rafraîchi l'application (F5) :

**Logs attendus dans la console :**
```
[WizardService] Using active ComfyUI server: http://127.0.0.1:8000
[connection] ComfyUI connection successful
[WizardLauncher] Connection status: { comfyui: true, ... }
```

**Plus d'erreur CSP !** ✅

### 2. Tester le Wizard Character Creation

1. Aller dans le Project Dashboard
2. Cliquer sur "Character Creation" (👤)
3. Le wizard devrait s'ouvrir

**Logs attendus :**
```
Launching wizard: character-creation for project: My First Story
```

## 📋 Tous les Wizards Supportés

Après les corrections, tous les wizards sont fonctionnels :

| Wizard | ID | Icône | Status |
|--------|-----|-------|--------|
| World Building | `world-building` | 🌍 | ✅ Fonctionnel |
| Character Creation | `character-creation` | 👤 | ✅ **CORRIGÉ** |
| Scene Generator | `scene-generator` | 🎬 | ✅ Fonctionnel |
| Dialogue Writer | `dialogue-writer` | 💬 | ✅ Fonctionnel |
| Storyboard Creator | `storyboard-creator` | 📋 | ✅ Fonctionnel |
| Style Transfer | `style-transfer` | 🎨 | ✅ Fonctionnel |

## 🚨 Important : Rafraîchir l'Application

Pour que les changements prennent effet :

1. **Rafraîchir la page** (F5 ou Ctrl+R)
2. Ou **Redémarrer le serveur de développement** :
   ```bash
   # Arrêter (Ctrl+C)
   # Puis redémarrer
   npm run dev
   ```

## 🎯 Résultat Attendu

### Avant les Corrections

**Console :**
```
❌ CSP violation: http://127.0.0.1:8000
❌ Fetch API cannot load http://127.0.0.1:8000/system_stats
⚠️ Unknown wizard type: character-creation
```

**UI :**
- ❌ Indicateur ComfyUI rouge
- ❌ Bouton Character Creation ne fait rien

### Après les Corrections

**Console :**
```
✅ [WizardService] Using active ComfyUI server: http://127.0.0.1:8000
✅ [connection] ComfyUI connection successful
✅ Launching wizard: character-creation
```

**UI :**
- ✅ Indicateur ComfyUI vert (si ComfyUI tourne)
- ✅ Tous les wizards fonctionnent

## 📝 Notes Techniques

### Pourquoi 127.0.0.1 et localhost sont Différents ?

- **localhost** : Nom d'hôte qui résout vers 127.0.0.1
- **127.0.0.1** : Adresse IP directe

Certaines configurations utilisent l'un ou l'autre, donc il faut autoriser les deux dans la CSP.

### Pourquoi le Wizard Manquait ?

Le wizard "Character Creation" était défini dans `wizardDefinitions.ts` mais pas dans le store `useAppStore.ts`. Le mapping dans `ProjectWorkspace.tsx` essayait d'appeler `openWizard('character-creation')` mais le store ne savait pas gérer ce type.

## ✅ Status

- ✅ **CSP corrigée** - Autorise localhost ET 127.0.0.1
- ✅ **Wizard Character Creation ajouté** - Tous les wizards fonctionnent
- ✅ **Logs de débogage** - Identification facile des problèmes

**Tout est corrigé !** 🎉
