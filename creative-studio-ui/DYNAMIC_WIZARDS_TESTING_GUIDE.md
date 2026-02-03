# Guide de Test: Affichage Dynamique des Wizards

## 🎯 Objectif
Vérifier que tous les 16 wizards sont maintenant affichés dynamiquement dans le menu et le dashboard.

## ✅ Tests à Effectuer

### 1. Test du Menu Wizards (MenuBar)

**Étapes:**
1. Lancez l'application StoryCore
2. Cliquez sur le menu "Wizards" en haut de l'écran
3. Vérifiez que vous voyez **16 wizards** dans le menu déroulant

**Wizards attendus:**
- 📁 Project Setup
- 🌍 World Builder
- 👤 Character Wizard
- 🎥 Shot Planning
- 🖼️ Shot References
- 💬 Dialogue Wizard
- 🎬 Scene Generator
- 📋 Storyboard Creator
- 🎨 Style Transfer
- 👻 Ghost Tracker Advisor
- 🤖 Roger Data Extractor
- 🎵 SonicCrafter
- 🎬 EditForge
- 🚀 ViralForge
- 🎭 PanelForge

**Vérifications:**
- [ ] Tous les wizards affichent leur icône emoji
- [ ] Les wizards avec des exigences de service affichent "LLM" ou "COMFYUI"
- [ ] Les wizards sans services disponibles sont grisés (disabled)

### 2. Test du Dashboard

**Étapes:**
1. Ouvrez ou créez un projet
2. Allez sur le Project Dashboard
3. Scrollez jusqu'à la section "Creative Wizards"
4. Vérifiez que vous voyez **16 cartes de wizards**

**Vérifications:**
- [ ] Chaque carte affiche: icône, nom, description
- [ ] Les indicateurs de statut Ollama et ComfyUI sont visibles en haut
- [ ] Les badges "Requires: LLM, ComfyUI" apparaissent sur les cartes appropriées
- [ ] Les wizards indisponibles sont visuellement différenciés

### 3. Test de Disponibilité des Services

**Test avec Ollama déconnecté:**
1. Arrêtez Ollama (si en cours d'exécution)
2. Attendez 30 secondes (temps de polling)
3. Vérifiez que:
   - [ ] L'indicateur Ollama montre "disconnected"
   - [ ] Les wizards nécessitant LLM sont désactivés:
     - World Builder
     - Character Wizard
     - Dialogue Wizard
     - Scene Generator
     - Storyboard Creator
     - Ghost Tracker Advisor

**Test avec Ollama connecté:**
1. Démarrez Ollama
2. Attendez 30 secondes
3. Vérifiez que:
   - [ ] L'indicateur Ollama montre "connected"
   - [ ] Les wizards LLM deviennent disponibles

### 4. Test de Lancement des Wizards

**Depuis le Menu:**
1. Cliquez sur "Wizards" → "World Builder"
2. Vérifiez que le wizard World Building s'ouvre

**Depuis le Dashboard:**
1. Cliquez sur la carte "Character Wizard"
2. Vérifiez que le wizard Character Creation s'ouvre

**Wizards à tester:**
- [ ] World Builder (menu + dashboard)
- [ ] Character Wizard (menu + dashboard)
- [ ] Dialogue Wizard (menu + dashboard)
- [ ] Au moins 2 autres wizards de votre choix

### 5. Test de Dépendances de Données

**Test avec projet vide (sans characters):**
1. Créez un nouveau projet vide
2. Vérifiez que les wizards nécessitant des characters sont désactivés:
   - [ ] Dialogue Wizard
   - [ ] Scene Generator

**Test après création de character:**
1. Créez un character via le Character Wizard
2. Vérifiez que:
   - [ ] Dialogue Wizard devient disponible
   - [ ] Scene Generator devient disponible

### 6. Test d'Ajout de Nouveau Wizard

**Étapes:**
1. Ouvrez `creative-studio-ui/src/data/wizardDefinitions.ts`
2. Ajoutez un nouveau wizard de test:
```typescript
{
  id: 'test-wizard',
  name: 'Test Wizard',
  description: 'A test wizard for verification',
  icon: '🧪',
  enabled: true,
  requiredConfig: [],
  requiresCharacters: false,
  requiresShots: false,
}
```
3. Sauvegardez et rechargez l'application
4. Vérifiez que:
   - [ ] Le nouveau wizard apparaît dans le menu Wizards
   - [ ] Le nouveau wizard apparaît dans le dashboard
   - [ ] Aucune modification de code n'a été nécessaire ailleurs

## 🐛 Problèmes Connus

Si vous rencontrez des problèmes:

1. **Les wizards n'apparaissent pas:**
   - Vérifiez la console pour les erreurs
   - Assurez-vous que `getEnabledWizards()` retourne bien les wizards

2. **Les indicateurs de service ne se mettent pas à jour:**
   - Attendez 30 secondes (intervalle de polling)
   - Vérifiez que le hook `useServiceStatus` fonctionne

3. **Les wizards ne se lancent pas:**
   - Vérifiez que `handleLaunchWizard` est bien appelé
   - Vérifiez les logs de la console

## 📊 Résultats Attendus

**Avant l'implémentation:**
- Menu Wizards: 6 wizards
- Dashboard: 6 wizards

**Après l'implémentation:**
- Menu Wizards: 16 wizards ✅
- Dashboard: 16 wizards ✅
- Mise à jour automatique: Oui ✅
- Indicateurs de service: Oui ✅
- Vérification de disponibilité: Oui ✅

## 🎉 Succès!

Si tous les tests passent, l'implémentation est réussie! Tous les wizards sont maintenant affichés dynamiquement et se mettent à jour automatiquement.
