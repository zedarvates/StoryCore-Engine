# Tâches Prioritaires - StoryCore Engine

## Tâches Haute Priorité

### ✅ Corrections Effectuées

1. **Erreurs TypeScript ProjectDashboardNew.tsx**
   - Lignes 714-717: Type guard ajouté pour erreur 'unknown'
   - Lignes 735-738: Type guard ajouté pour erreur 'unknown'
   - Ligne 37: Import GeneratedAsset corrigé
   - Statut: ✅ COMPLET

2. **Accessibilité ARIA Menu.tsx**
   - Correction déjà appliquée: aria-expanded={isOpen}
   - Statut: ✅ COMPLET

3. **GitHubAPIError Backend Python**
   - Classe déjà implémentée avec attributs et méthodes
   - Statut: ✅ COMPLET

4. **Service d'Exportation (ExportService)**
   - Emplacement: projectExportService.ts (utilisé dans MenuBar.tsx)
   - Les méthodes exportJSON, exportPDF, exportVideo sont implémentées
   - Gestion des erreurs avec feedback utilisateur
   - Priorité: Haute | Statut: ✅ COMPLET

5. **Support des Add-ons Externes**
   - Emplacement: AddonManager.ts
   - Implémentation de loadExternalAddons() avec scan du dossier addons/
   - Ajout de parseAddonManifest() pour parser les addon.json
   - Ajout de validateAddonSecurity() pour validation des permissions
   - Amélioration de unloadAddon() avec nettoyage complet des ressources
   - Priorité: Moyenne-Haute | Statut: ✅ COMPLET

6. **Création de Répertoires (mkdir)**
   - Emplacement: electron.d.ts (interface mkdir) et AssetManagementService.ts
   - ensureDirectoryExists() retourne maintenant Promise<boolean>
   - Gestion des erreurs avec fallback pour environnements non-Electron
   - Priorité: Moyenne | Statut: ✅ COMPLET

### 🔴 Tâches à Faire

*(Aucune tâche haute priorité restante)*

---

## Tâches Moyenne Priorité

- Marketing Wizard
- Améliorations AddonManager

## Tâches Basse Priorité

- Wizards manquants (Audio Production, Video Editor, Comic-to-Sequence)

---

## Récapitulatif des Corrections

### Fichiers Modifiés pour les Tâches Complétées

| Tâche | Fichiers Modifiés |
|-------|-------------------|
| ExportService | `creative-studio-ui/src/services/projectExportService.ts`, `creative-studio-ui/src/components/menuBar/MenuBar.tsx` |
| Support Add-ons Externes | `creative-studio-ui/src/services/AddonManager.ts` |
| Création de Répertoires | `creative-studio-ui/src/services/AssetManagementService.ts`, `creative-studio-ui/src/types/electron.d.ts` |

### Résumé des Corrections

- **ExportService**: Service complet d'exportation implémenté avec gestion des erreurs
- **AddonManager**: Système de plugins externes avec validation de sécurité
- **AssetManagementService**: Méthode ensureDirectoryExists() améliorée avec support Promise

---

## Recommandations

1. **Cette semaine:** Implémenter ExportService (utilisation fréquente) - ✅ COMPLET
2. **Ce mois:** Support add-ons externes (extensibilité) - ✅ COMPLET
3. **Ce trimestre:** Wizards manquants
