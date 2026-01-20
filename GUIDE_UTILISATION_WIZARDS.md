# Guide d'Utilisation des Wizards

## 🎯 Problème Courant

**Symptôme :** Le bouton "Complete" est grisé et vous ne pouvez pas terminer le wizard.

**Cause :** Les champs requis du Step 1 ne sont pas remplis.

## ✅ Solution : Remplir les Champs Requis

### Step 1 - Basic Information (OBLIGATOIRE)

Vous DEVEZ remplir ces champs avant de pouvoir compléter le wizard :

#### 1. World Name (Nom du Monde) ⭐ REQUIS
```
Exemple: Eldoria, Neo-Tokyo, The Wasteland
```
- Cliquez sur "Suggest Name" pour générer automatiquement
- OU tapez manuellement un nom

#### 2. Time Period (Période Temporelle) ⭐ REQUIS
```
Exemple: Medieval Era, Year 2157, Present Day
```
- Tapez la période de votre monde

#### 3. Genre ⭐ REQUIS (au moins 1)
```
Cochez au moins une case:
☑ Fantasy
☐ Sci-Fi
☐ Horror
☐ Mystery
☐ Romance
☐ Historical
☐ Contemporary
☐ Post-Apocalyptic
☐ Cyberpunk
```

#### 4. Tone ⭐ REQUIS (au moins 1)
```
Cochez au moins une case:
☑ Dark
☐ Light
☐ Epic
☐ Intimate
☐ Humorous
☐ Serious
☐ Hopeful
☐ Grim
```

## 📋 Checklist Rapide

Avant de cliquer sur "Next" au Step 1, vérifiez :

- [ ] ✅ World Name est rempli
- [ ] ✅ Time Period est rempli
- [ ] ✅ Au moins 1 Genre est coché
- [ ] ✅ Au moins 1 Tone est coché

## 🤖 Utilisation de l'IA

### Boutons de Génération IA

Chaque step a un bouton "Generate..." qui utilise l'IA pour remplir automatiquement les champs :

#### Step 1 : "Suggest Name"
- Génère un nom de monde basé sur le genre et le tone sélectionnés
- **Prérequis :** Genre et Tone doivent être sélectionnés d'abord

#### Step 2 : "Generate Rules"
- Génère 4-6 règles du monde
- **Prérequis :** Step 1 complété

#### Step 3 : "Generate Locations"
- Génère 3-5 lieux importants
- **Prérequis :** Step 1 complété

#### Step 4 : "Generate Elements"
- Génère éléments culturels (langues, religions, etc.)
- **Prérequis :** Step 1 complété

## 🔧 Dépannage

### Problème : "Generate..." ne fait rien

**Solutions :**
1. Vérifiez que Ollama est lancé : http://localhost:11434
2. Vérifiez que les prérequis sont remplis (voir ci-dessus)
3. Ouvrez la console (F12) et cherchez les erreurs
4. Attendez quelques secondes (le LLM peut être lent)

### Problème : Bouton "Complete" grisé

**Solutions :**
1. Retournez au Step 1
2. Vérifiez que TOUS les champs requis sont remplis :
   - World Name ✓
   - Time Period ✓
   - Genre (au moins 1) ✓
   - Tone (au moins 1) ✓
3. Cliquez sur "Next" pour avancer

### Problème : Les champs ne se remplissent pas après "Generate..."

**Solutions :**
1. Ouvrez la console (F12)
2. Cherchez les logs qui commencent par "=== LLM RESPONSE START ==="
3. Copiez la réponse complète
4. Remplissez manuellement les champs avec les informations générées
5. Signalez le problème avec la réponse LLM copiée

## 📝 Workflow Recommandé

### Méthode 1 : Utilisation Complète de l'IA

```
1. Step 1 - Basic Information
   ├─ Cocher Genre (ex: Fantasy)
   ├─ Cocher Tone (ex: Dark, Epic)
   ├─ Entrer Time Period (ex: Medieval Era)
   ├─ Cliquer "Suggest Name"
   └─ Cliquer "Next"

2. Step 2 - World Rules
   ├─ Cliquer "Generate Rules"
   ├─ Vérifier les règles générées
   ├─ Modifier si nécessaire
   └─ Cliquer "Next"

3. Step 3 - Locations
   ├─ Cliquer "Generate Locations"
   ├─ Vérifier les lieux générés
   ├─ Modifier si nécessaire
   └─ Cliquer "Next"

4. Step 4 - Cultural Elements
   ├─ Cliquer "Generate Elements"
   ├─ Vérifier les éléments générés
   ├─ Modifier si nécessaire
   └─ Cliquer "Next"

5. Step 5 - Review
   ├─ Vérifier toutes les informations
   └─ Cliquer "Complete"
```

### Méthode 2 : Saisie Manuelle

```
1. Step 1 - Basic Information
   ├─ Entrer World Name manuellement
   ├─ Entrer Time Period manuellement
   ├─ Cocher Genre
   ├─ Cocher Tone
   └─ Cliquer "Next"

2-4. Steps suivants
   ├─ Remplir manuellement OU utiliser "Generate..."
   └─ Cliquer "Next"

5. Step 5 - Review
   └─ Cliquer "Complete"
```

### Méthode 3 : Hybride (Recommandée)

```
1. Step 1 - Basic Information
   ├─ Cocher Genre et Tone (rapide)
   ├─ Entrer Time Period (rapide)
   ├─ Cliquer "Suggest Name" (IA)
   └─ Cliquer "Next"

2-4. Steps suivants
   ├─ Cliquer "Generate..." (IA)
   ├─ Modifier/Ajuster les résultats (manuel)
   └─ Cliquer "Next"

5. Step 5 - Review
   └─ Cliquer "Complete"
```

## 🎨 Exemples Complets

### Exemple 1 : Monde Fantasy Sombre

```
Step 1:
- Name: "The Shadowlands"
- Time Period: "Medieval Era"
- Genre: ☑ Fantasy, ☑ Horror
- Tone: ☑ Dark, ☑ Grim

Step 2 (Généré):
- Rule 1: Magic corrupts the soul
- Rule 2: Undead roam at night
- Rule 3: Ancient gods demand sacrifice

Step 3 (Généré):
- Location 1: The Black Citadel
- Location 2: Whispering Woods
- Location 3: Cursed Ruins

Step 4 (Généré):
- Languages: Common, Dark Speech
- Religions: Cult of Shadows, Old Faith
- Traditions: Blood Moon Festival
```

### Exemple 2 : Monde Sci-Fi Futuriste

```
Step 1:
- Name: "Neo-Terra"
- Time Period: "Year 2157"
- Genre: ☑ Sci-Fi, ☑ Cyberpunk
- Tone: ☑ Dark, ☑ Serious

Step 2 (Généré):
- Rule 1: AI controls the economy
- Rule 2: Cybernetic enhancements are common
- Rule 3: Corporations rule the world

Step 3 (Généré):
- Location 1: Neon City
- Location 2: The Undercity
- Location 3: Corporate Towers

Step 4 (Généré):
- Languages: Neo-English, Binary Code
- Religions: Church of the Machine, Naturalists
- Traditions: Upgrade Day, Memory Backup
```

## 💡 Conseils

### Pour Obtenir de Meilleurs Résultats IA

1. **Soyez spécifique avec Genre et Tone**
   - Plus vous cochez de cases, plus l'IA comprend votre vision
   - Mais ne cochez pas tout ! 2-3 genres et 2-3 tones suffisent

2. **Utilisez un Time Period clair**
   - ✅ "Medieval Era" (clair)
   - ✅ "Year 2157" (clair)
   - ❌ "Long ago" (vague)
   - ❌ "Future" (vague)

3. **Modifiez les Résultats Générés**
   - L'IA donne des suggestions, pas des règles absolues
   - Ajoutez, supprimez, modifiez selon votre vision

4. **Utilisez "Generate..." Plusieurs Fois**
   - Si le résultat ne vous plaît pas, cliquez à nouveau
   - Chaque génération est différente

### Pour Gagner du Temps

1. **Utilisez les Boutons IA pour les Steps 2-4**
   - Ces steps sont optionnels mais l'IA les remplit rapidement
   - Vous pouvez toujours modifier après

2. **Remplissez le Minimum au Step 1**
   - Juste les 4 champs requis
   - Vous pouvez revenir modifier plus tard

3. **Sautez les Steps Optionnels**
   - Steps 2, 3, 4 sont optionnels
   - Cliquez juste "Next" si vous voulez aller vite

## ❓ FAQ

**Q: Pourquoi le bouton "Complete" est grisé ?**
R: Les champs requis du Step 1 ne sont pas remplis. Retournez au Step 1 et vérifiez.

**Q: L'IA ne génère rien, que faire ?**
R: 1) Vérifiez Ollama, 2) Attendez 10 secondes, 3) Ouvrez la console (F12) pour voir les erreurs.

**Q: Puis-je sauter des steps ?**
R: Oui ! Steps 2, 3, 4 sont optionnels. Seul le Step 1 est obligatoire.

**Q: Puis-je modifier après avoir cliqué "Complete" ?**
R: Oui, vous pouvez éditer le monde créé depuis le dashboard.

**Q: Combien de temps prend la génération IA ?**
R: 5-15 secondes selon votre machine et le modèle LLM utilisé.

---

**Besoin d'aide ?** Ouvrez la console (F12) et cherchez les messages d'erreur.
