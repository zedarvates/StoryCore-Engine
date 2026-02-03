# 🟢 PHASE 4: ADVANCED FIXES - PLAN

**Objectif**: Atteindre 90/100 en fixant les bugs logiques et les problèmes restants  
**Durée estimée**: 3-4 jours  
**Problèmes à fixer**: 7 bugs critiques et majeurs

---

## 🎯 PROBLÈMES À FIXER

### 4.1 Bug - Character ID Mismatch ⚠️
**Fichier**: `src/store/index.ts` (deleteCharacter)  
**Sévérité**: 🟠 MAJEUR  
**Impact**: Les caractères ne peuvent pas être supprimés correctement

**Problème**:
```typescript
// ❌ AVANT - Incohérence
deleteCharacter: (id) => {
  // Cherche par character_id
  const character = state.characters.find(c => c.character_id === id);
  
  // Mais CharactersModal passe character.id!
  // character.id !== character.character_id → BUG
}
```

**Solution**: Standardiser sur `character_id` partout

---

### 4.2 Bug - World Selection ⚠️
**Fichier**: `src/store/index.ts` (selectWorld)  
**Sévérité**: 🟠 MAJEUR  
**Impact**: Impossible de sélectionner un monde

**Problème**:
```typescript
// ❌ AVANT
selectWorld: (id) => set({ selectedWorldId: id }),

// Mais le monde n'est pas chargé dans le store!
// Il faut aussi charger les données du monde
```

**Solution**: Charger les données du monde lors de la sélection

---

### 4.3 Bug - Story Version Tracking ⚠️
**Fichier**: `src/store/index.ts` (updateStory)  
**Sévérité**: 🟠 MAJEUR  
**Impact**: Les versions d'histoire ne sont pas suivies

**Problème**:
```typescript
// ❌ AVANT
updateStory: (id, updates) => {
  // Met à jour l'histoire
  // Mais ne crée pas de version!
}
```

**Solution**: Créer automatiquement une version lors de chaque mise à jour

---

### 4.4 Bug - Async Wizard Completion 🔴
**Fichier**: `src/store/index.ts` (completeWizard)  
**Sévérité**: 🔴 CRITIQUE  
**Impact**: Les wizards ne se terminent pas correctement

**Problème**:
```typescript
// ❌ AVANT
completeWizard: async (output, projectPath) => {
  // Appelle des services async
  // Mais ne gère pas les erreurs
  // Et ne met pas à jour l'état correctement
}
```

**Solution**: Ajouter une gestion d'erreur complète et une mise à jour d'état

---

### 4.5 Liens Cassés - Modal Navigation ⚠️
**Fichier**: `src/App.tsx`  
**Sévérité**: 🟠 MAJEUR  
**Impact**: Impossible de naviguer entre les modales

**Problème**:
```typescript
// ❌ AVANT
// Les modales ne communiquent pas entre elles
// Pas de chaîne de navigation
```

**Solution**: Implémenter une navigation modale avec événements

---

### 4.6 Pas de Contrast Check 🟡
**Fichier**: CSS files  
**Sévérité**: 🟡 MINEUR  
**Impact**: Accessibilité réduite pour les utilisateurs malvoyants

**Problème**:
```css
/* ❌ AVANT - Contraste insuffisant */
.button {
  color: #999;  /* Gris clair */
  background: #f5f5f5;  /* Gris très clair */
  /* Ratio de contraste: 2.5:1 (minimum 4.5:1 requis) */
}
```

**Solution**: Vérifier et corriger tous les contrastes de couleur

---

## 📋 CHECKLIST PHASE 4

- [ ] 4.1: Fixer Character ID Mismatch
- [ ] 4.2: Fixer World Selection
- [ ] 4.3: Fixer Story Version Tracking
- [ ] 4.4: Fixer Async Wizard Completion
- [ ] 4.5: Fixer Modal Navigation
- [ ] 4.6: Fixer Contrast Check
- [ ] Compiler et tester
- [ ] Créer rapport de completion

---

## 🎯 RÉSULTAT ATTENDU

**Score**: 90/100 (+5 points)

- ✅ Tous les bugs logiques fixés
- ✅ Navigation modale fonctionnelle
- ✅ Accessibilité améliorée
- ✅ 0 erreurs de compilation
- ✅ Tests passants

---

## 🚀 COMMENCER PHASE 4

Répondez avec "Commencer Phase 4" pour démarrer l'implémentation.
