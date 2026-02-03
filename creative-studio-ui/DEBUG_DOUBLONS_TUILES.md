# 🐛 Débogage - Doublons de Tuiles dans l'Interface

## Problème

Les tuiles de personnages se multiplient visuellement dans l'interface (pas dans les données).

## Corrections Appliquées

### 1. Debounce des Événements

**Problème:** Les événements `character-created/updated/deleted` peuvent se déclencher plusieurs fois rapidement, causant des re-renders multiples.

**Solution:** Ajout d'un debounce de 100ms pour grouper les événements.

```typescript
let updateTimeout: NodeJS.Timeout | null = null;

const scheduleUpdate = () => {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  updateTimeout = setTimeout(() => {
    setRefreshTrigger(prev => prev + 1);
  }, 100);
};
```

### 2. Logs de Débogage Détaillés

**Ajout de logs à chaque étape:**

```
🎬 [CharacterList] Component mounted
🔍 [CharacterList] Recalculating characters list
📊 [CharacterList] Total characters from store: 3
✅ [CharacterList] Final result: 3 characters to display
➕ [CharacterList] Character created event received
🔄 [CharacterList] Refreshing character list
```

### 3. Déduplication Multiple

- Déduplication dans le store (`getAllCharacters`)
- Déduplication dans le composant (avant affichage)
- Logs si des doublons sont détectés

## Comment Déboguer

### 1. Ouvrir la Console (F12)

### 2. Aller au Dashboard des Personnages

Vous devriez voir:
```
🎬 [CharacterList] Component mounted
🔍 [CharacterList] Recalculating characters list
📊 [CharacterList] Total characters from store: X
✅ [CharacterList] Final result: X characters to display
```

### 3. Vérifier les Événements

Si vous voyez plusieurs fois:
```
➕ [CharacterList] Character created event received
➕ [CharacterList] Character created event received
➕ [CharacterList] Character created event received
```

**→ Le problème vient des événements multiples**

### 4. Vérifier les Doublons

Si vous voyez:
```
⚠️ [CharacterList] Removed 2 duplicate(s)
```

**→ Le store contient des doublons**

### 5. Vérifier les Montages Multiples

Si vous voyez plusieurs fois:
```
🎬 [CharacterList] Component mounted
🎬 [CharacterList] Component mounted
```

**→ Le composant se monte plusieurs fois**

## Solutions selon le Problème

### Si: Événements Multiples

**Cause:** Un événement est émis plusieurs fois pour la même action

**Solution:**
1. Vérifier où l'événement est émis
2. S'assurer qu'il n'est émis qu'une seule fois
3. Le debounce devrait déjà atténuer le problème

### Si: Doublons dans le Store

**Cause:** Le store contient vraiment des doublons

**Solution:**
```javascript
// Dans la console
localStorage.clear();
location.reload();
```

### Si: Montages Multiples

**Cause:** Le composant CharacterList est monté plusieurs fois

**Solution:**
1. Vérifier qu'il n'y a qu'un seul `<CharacterList />` dans le code
2. Vérifier les conditions de rendu
3. Vérifier les routes

### Si: Re-renders Excessifs

**Cause:** Le composant se re-render trop souvent

**Solution:**
1. Vérifier les dépendances du `useMemo`
2. Vérifier les props qui changent
3. Utiliser React DevTools Profiler

## Commandes de Débogage

### Voir l'État du Store

```javascript
// Dans la console
const store = useAppStore.getState();
console.log('Characters:', store.characters);
console.log('Unique IDs:', new Set(store.characters.map(c => c.character_id)).size);
```

### Forcer un Nettoyage

```javascript
// Dans la console
localStorage.clear();
location.reload();
```

### Voir les Événements

```javascript
// Dans la console
const eventEmitter = require('@/services/eventEmitter').eventEmitter;
eventEmitter.on('character-created', () => console.log('EVENT: character-created'));
eventEmitter.on('character-updated', () => console.log('EVENT: character-updated'));
eventEmitter.on('character-deleted', () => console.log('EVENT: character-deleted'));
```

## Fichiers Modifiés

- ✅ `src/components/character/CharacterList.tsx`
  - Debounce des événements (100ms)
  - Logs détaillés à chaque étape
  - Log de montage/démontage
  - Déduplication avec logs

## Test de la Correction

1. **Ouvrir la console** (F12)
2. **Aller au dashboard**
3. **Créer un personnage**
4. **Observer les logs:**
   - Un seul `Component mounted`
   - Un seul `Recalculating characters list` par action
   - Pas de `Removed X duplicate(s)`
   - Debounce des événements multiples

5. **Vérifier visuellement:**
   - Une seule tuile par personnage
   - Pas de multiplication

## Si le Problème Persiste

### Étape 1: Capturer les Logs

Copiez tous les logs de la console et cherchez:
- Combien de fois `Component mounted` apparaît
- Combien de fois `Recalculating` apparaît
- Si des doublons sont détectés
- Si des événements multiples sont reçus

### Étape 2: Vérifier le Store

```javascript
const chars = useAppStore.getState().characters;
console.log('Total:', chars.length);
console.log('Unique:', new Set(chars.map(c => c.character_id)).size);
console.log('IDs:', chars.map(c => c.character_id));
```

### Étape 3: Nettoyer et Retester

```javascript
localStorage.clear();
location.reload();
```

Puis recréez les personnages un par un en observant les logs.

## Notes Techniques

### Debounce

Le debounce de 100ms signifie:
- Si plusieurs événements arrivent en < 100ms, un seul refresh
- Réduit les re-renders de N à 1
- Améliore les performances

### Déduplication

La déduplication utilise une Map:
```typescript
const uniqueMap = new Map<string, Character>();
for (const character of characters) {
  uniqueMap.set(character.character_id, character);
}
```

Si un ID existe déjà, il est écrasé (garde la dernière version).

---

**Date:** 28 janvier 2026  
**Version:** 2.3  
**Statut:** 🐛 En débogage
