# TODO - Correction de l'affichage des projets récents

## Problème
La page d'accueil affiche 4 projets fictifs (Refresh, My First Story, Epic Adventure, Deleted Project) alors qu'un seul projet réel existe ("video de mariage").

## Cause
Les projets supprimés restent dans la liste "recent projects" stockée dans `recent-projects.json` et localStorage.

## Plan de correction

### Étape 1: Modifier `electron/ipcChannels.ts`
- ✅ Ajouter un nettoyage des projets récents invalides dans le handler `PROJECTS_GET_MERGED_LIST`
- ✅ Appeler `cleanupMissingProjects()` avant de fusionner avec les projets découverts

### Étape 2: Modifier `electron/RecentProjectsManager.ts`
- ✅ Améliorer la méthode `cleanupMissingProjects()` pour retourner le nombre de projets supprimés
- S'assurer que les projets inexistants sont correctement identifiés

### Étape 3: Nettoyer localStorage (optionnel)
- Ajouter une fonction pour nettoyer le localStorage du renderer

## Progression

- [x] Modifier ipcChannels.ts pour nettoyer les projets invalides
- [x] Améliorer RecentProjectsManager.ts
- [ ] Tester la correction (redémarrer l'application)


