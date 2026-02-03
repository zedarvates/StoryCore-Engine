# 🐛 Débogage - Personnages Manquants

## Problème

Les personnages n'apparaissent plus dans l'interface alors qu'il y a un fichier de personnages dans le projet.

## Vérifications à Faire

### 1. Ouvrir la Console (F12)

### 2. Vérifier les Logs

Cherchez ces messages:
```
🎬 [CharacterList] Component mounted
🔍 [CharacterList] Recalculating characters list
📊 [CharacterList] Total characters from store: X
```

**Si X = 0** → Le store est vide, les personnages ne sont pas chargés

### 3. Vérifier le Store Directement

Dans la console, tapez:
```javascript
useAppStore.getState().characters
```

**Si le tableau est vide `[]`** → Les personnages ne sont pas dans le store

### 4. Vérifier localStorage

Dans la console, tapez:
```javascript
// Voir toutes les clés
Object.keys(localStorage)

// Chercher les clés de personnages
Object.keys(localStorage).filter(k => k.includes('character'))

// Voir le contenu
const projectName = useAppStore.getState().project?.project_name;
const key = `project-${projectName}-characters`;
const data = localStorage.getItem(key);
console.log('Characters data:', JSON.parse(data));
```

### 5. Vérifier le Fichier du Projet

Si vous utilisez Electron, les personnages peuvent être dans un fichier JSON.

Cherchez un fichier comme:
- `projects/[nom-projet]/characters.json`
- `projects/[nom-projet]/project.json` (avec une section characters)

## Solutions selon le Problème

### Si: Store Vide mais localStorage a des Données

**Cause:** Les données ne sont pas chargées au démarrage

**Solution:**
```javascript
// Dans la console
const projectName = useAppStore.getState().project?.project_name;
const key = `project-${projectName}-characters`;
const data = localStorage.getItem(key);
const characters = JSON.parse(data);

// Charger manuellement
characters.forEach(char => {
  useAppStore.getState().addCharacter(char);
});

// Rafraîchir
location.reload();
```

### Si: localStorage Vide

**Cause:** Les données ont été perdues ou effacées

**Solution:**
1. Vérifier si le fichier du projet existe
2. Recharger le projet
3. Ou recréer les personnages

### Si: Erreur dans la Console

**Cause:** Une erreur empêche le chargement

**Solution:**
1. Copier l'erreur complète
2. Vérifier le fichier mentionné dans l'erreur
3. Corriger le problème

## Commandes de Diagnostic

### Voir l'État Complet

```javascript
const state = useAppStore.getState();
console.log('Project:', state.project);
console.log('Characters:', state.characters);
console.log('Characters count:', state.characters.length);
```

### Voir localStorage

```javascript
console.log('All localStorage keys:', Object.keys(localStorage));
console.log('Character keys:', Object.keys(localStorage).filter(k => k.includes('character')));
```

### Forcer le Rechargement

```javascript
// Si vous connaissez le nom du projet
const projectName = 'mon-projet';
const key = `project-${projectName}-characters`;
const data = localStorage.getItem(key);
console.log('Data:', data);
```

## Corrections Appliquées

J'ai annulé les modifications du store qui pouvaient causer des problèmes:

1. ✅ Annulé la déduplication dans `getAllCharacters()`
2. ✅ Annulé la modification de `addCharacter()`
3. ✅ Gardé seulement:
   - Debounce des événements (sûr)
   - Déduplication dans CharacterList (sûr)
   - Logs de débogage (utile)

## Fichiers Modifiés

- ✅ `src/store/index.ts` - Retour à l'original
- ✅ `src/components/character/CharacterList.tsx` - Garde les améliorations sûres

## Prochaines Étapes

1. **Vérifier les logs** dans la console
2. **Vérifier le store** avec les commandes ci-dessus
3. **Me dire ce que vous voyez** pour que je puisse vous aider

## Si Rien ne Marche

### Option 1: Recharger le Projet

Si vous avez un fichier de projet, rechargez-le.

### Option 2: Restaurer depuis le Fichier

Si vous avez un fichier `characters.json` ou `project.json`:

```javascript
// Lire le fichier (adapter selon votre structure)
const fileContent = /* contenu du fichier */;
const characters = JSON.parse(fileContent);

// Charger dans le store
characters.forEach(char => {
  useAppStore.getState().addCharacter(char);
});
```

### Option 3: Nettoyer et Recommencer

**⚠️ Attention: Cela efface tout!**

```javascript
localStorage.clear();
location.reload();
```

Puis recréez vos personnages.

---

**Date:** 28 janvier 2026  
**Statut:** 🐛 En investigation
