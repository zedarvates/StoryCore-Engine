# 🔄 Nettoyer le Cache et Redémarrer

## Problème

Vite peut avoir mis en cache d'anciennes versions des fichiers `.js` compilés. Même après les avoir supprimés, le cache peut causer des erreurs d'import.

## Solution

### 1. Arrêter le Serveur

Appuie sur `Ctrl+C` dans le terminal où `npm run dev` tourne.

### 2. Nettoyer le Cache

```bash
cd creative-studio-ui

# Supprimer le cache de Vite
Remove-Item -Recurse -Force node_modules/.vite

# Supprimer le cache de node_modules (optionnel, si le problème persiste)
# Remove-Item -Recurse -Force node_modules
# npm install
```

### 3. Redémarrer

```bash
npm run dev
```

## Alternative : Forcer le Rechargement

Si le problème persiste après le nettoyage du cache :

1. Ouvre le navigateur
2. Appuie sur `Ctrl+Shift+R` (ou `Cmd+Shift+R` sur Mac) pour forcer le rechargement
3. Ou ouvre les DevTools (F12) → Onglet Network → Coche "Disable cache"

## Vérification

L'application devrait maintenant se charger sans erreur d'import !

---

**Note** : Ce problème arrive souvent après avoir supprimé des fichiers compilés pendant que le serveur de développement tourne.
