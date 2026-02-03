# Test Écran Noir - Instructions

## Étapes de Test

### 1. Ouvrir l'Application
```
URL: http://localhost:5174/
```

### 2. Ouvrir DevTools
```
Touche: F12
ou
Clic droit > Inspecter
```

### 3. Vérifier la Console
Dans l'onglet "Console", chercher :

#### ✅ Messages Normaux (OK)
```
[Vite] connected.
[HMR] connected
```

#### ❌ Erreurs Possibles

**Erreur 1: Buffer**
```
Uncaught ReferenceError: Buffer is not defined
```
**Solution**: ✅ Déjà corrigé dans imageStorageService.ts

**Erreur 2: Module Import**
```
Failed to fetch dynamically imported module
```
**Solution**: 
```bash
npm run clean
npm run build
npm run dev
```

**Erreur 3: Electron API**
```
Cannot read property 'fs' of undefined
```
**Solution**: ✅ Déjà corrigé avec vérification

**Erreur 4: React**
```
Uncaught Error: Minified React error
```
**Solution**: Vérifier les hooks (useState, useEffect)

### 4. Vérifier Network
Dans l'onglet "Network" :
- Tous les fichiers doivent avoir status 200
- Pas de fichiers en rouge (404 ou 500)

### 5. Vérifier Elements
Dans l'onglet "Elements" :
```html
<div id="root">
  <!-- Doit contenir du HTML, pas vide -->
  <div class="app">...</div>
</div>
```

## Actions Correctives

### Si Console Vide et Écran Noir
```bash
# 1. Arrêter le serveur (Ctrl+C)
# 2. Nettoyer
npm run clean

# 3. Rebuild
npm run build

# 4. Redémarrer
npm run dev

# 5. Vider le cache du navigateur
# Chrome: Ctrl+Shift+Delete > Cocher "Cached images and files" > Clear
```

### Si Erreur JavaScript
1. Noter l'erreur exacte
2. Noter le fichier et la ligne
3. Vérifier ce fichier

### Si Erreur de Module
```bash
# Réinstaller les dépendances
rm -rf node_modules
npm install
npm run dev
```

## Test Minimal

Pour tester si React fonctionne, modifier temporairement `src/App.tsx` :

```typescript
// Remplacer tout le contenu par :
export default function App() {
  return <div style={{ color: 'white', padding: '20px' }}>
    <h1>Test - Application Fonctionne</h1>
    <p>Si vous voyez ce message, React fonctionne.</p>
  </div>;
}
```

Si ce test fonctionne :
- ✅ React fonctionne
- ❌ Problème dans un composant spécifique

Si ce test ne fonctionne pas :
- ❌ Problème de build ou de configuration

## Résultats Attendus

### ✅ Application Fonctionne
- Interface visible
- Pas d'erreurs dans la console
- Tous les fichiers chargés (Network)

### ❌ Application Ne Fonctionne Pas
- Écran noir
- Erreurs dans la console
- Fichiers non chargés

## Commandes Utiles

```bash
# Vérifier le processus
ps aux | grep vite

# Tuer le processus si bloqué
pkill -f vite

# Redémarrer proprement
npm run clean && npm run dev

# Vérifier les ports utilisés
netstat -ano | findstr :5174
```

## Informations à Collecter

Si le problème persiste, collecter :

1. **Screenshot de la console** (F12 > Console)
2. **Screenshot de Network** (F12 > Network)
3. **Logs du terminal** (où npm run dev tourne)
4. **Version de Node**: `node --version`
5. **Version de npm**: `npm --version`
6. **Navigateur utilisé**: Chrome/Edge/Firefox + version

---

**Action Immédiate**: Ouvrir http://localhost:5174/ et vérifier la console (F12)
