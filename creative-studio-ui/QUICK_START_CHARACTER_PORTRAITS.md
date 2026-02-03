# 🚀 Guide Rapide - Génération de Portraits de Personnages

## Prérequis

✅ ComfyUI doit être en cours d'exécution  
✅ Modèle "z image turbo" doit être disponible  
✅ Configuration ComfyUI correcte dans les paramètres  

## Méthode 1: Depuis le Dashboard (Recommandé) ⚡

**Le plus rapide pour générer un portrait!**

1. Allez sur le dashboard des personnages
2. Trouvez un personnage sans image (icône utilisateur grise)
3. Cliquez sur le bouton **"Generate Portrait"** qui apparaît sur la tuile
4. Attendez 2-3 secondes ⏱️
5. ✅ L'image apparaît automatiquement!

**Avantages:**
- Ultra-rapide (pas besoin d'ouvrir l'éditeur)
- Génération en un clic
- Mise à jour visuelle immédiate

## Méthode 2: Depuis l'Éditeur 🎨

**Pour plus de contrôle et prévisualisation**

1. Ouvrez un personnage (double-clic ou bouton Edit)
2. Allez dans l'onglet **"Appearance"**
3. Remplissez les détails physiques du personnage:
   - Cheveux (couleur, style, longueur)
   - Yeux (couleur, forme)
   - Visage (structure)
   - Peau (teinte)
   - Morphologie (corpulence)
   - Vêtements (style)
   - Caractéristiques distinctives
4. Cliquez sur **"Generate Portrait"**
5. Attendez 2-3 secondes ⏱️
6. Prévisualisez l'image générée
7. Cliquez **"Save Changes"** pour sauvegarder

**Avantages:**
- Prévisualisation avant sauvegarde
- Contrôle total sur les détails
- Zone dédiée plus grande

## Exemple de Personnage

### Sarah Connor
```
Cheveux: Brown, Wavy, Medium
Yeux: Blue, Almond
Visage: Angular
Peau: Fair
Morphologie: Athletic
Vêtements: Tactical
Caractéristiques: Scar on left cheek
```

**Prompt généré automatiquement:**
```
Portrait of Sarah Connor, brown wavy hair, blue eyes, angular face, 
fair skin, athletic build, wearing tactical clothing, scar on left cheek, 
high quality, detailed, professional portrait, centered composition
```

## Résultat

- Image 512x512 pixels
- Format carré parfait pour la tuile
- Qualité professionnelle
- Génération en 2-3 secondes avec z image turbo

## Que se passe-t-il après?

1. L'image est **automatiquement sauvegardée** dans le personnage
2. Elle apparaît dans **toutes les tuiles** du dashboard
3. Elle est stockée dans `visual_identity.generated_portrait`
4. Elle persiste entre les sessions

## Dépannage

### Le bouton n'apparaît pas sur la tuile
- ✅ Vérifiez que le personnage n'a pas déjà une image
- ✅ Le bouton n'apparaît que sur les tuiles avec placeholder

### "Generating..." reste bloqué
- ❌ ComfyUI n'est pas en cours d'exécution
- ❌ Le modèle "z image turbo" n'est pas disponible
- ❌ Problème de connexion réseau

### L'image ne se génère pas
1. Vérifiez que ComfyUI tourne sur `http://localhost:8188`
2. Vérifiez la configuration dans les paramètres
3. Consultez la console du navigateur (F12) pour les erreurs
4. Vérifiez que le modèle "z image turbo" est chargé

### L'image est de mauvaise qualité
- Plus de détails dans l'apparence = meilleur résultat
- Remplissez tous les champs disponibles
- Soyez précis dans les descriptions

## Conseils pour de Meilleurs Résultats

### ✅ À Faire
- Remplir tous les champs d'apparence
- Être précis et descriptif
- Utiliser des termes clairs (ex: "angular face" plutôt que "face")
- Ajouter des caractéristiques distinctives

### ❌ À Éviter
- Laisser trop de champs vides
- Descriptions vagues ou génériques
- Termes contradictoires

## Workflow Recommandé

```
1. Créer le personnage avec le wizard
   ↓
2. Remplir l'apparence dans l'éditeur
   ↓
3. Sauvegarder le personnage
   ↓
4. Retourner au dashboard
   ↓
5. Cliquer "Generate Portrait" sur la tuile
   ↓
6. ✅ Portrait créé en 2-3 secondes!
```

## Raccourcis

- **Dashboard → Tuile**: 1 clic, 2-3 secondes ⚡
- **Éditeur → Appearance**: Plus de contrôle 🎨
- **Régénération**: Cliquez à nouveau pour une nouvelle version

## Questions Fréquentes

**Q: Puis-je générer plusieurs versions?**  
A: Oui! Cliquez à nouveau sur "Generate Portrait" pour une nouvelle version avec un seed différent.

**Q: L'image est-elle sauvegardée automatiquement?**  
A: Oui, depuis la tuile. Depuis l'éditeur, cliquez "Save Changes".

**Q: Puis-je utiliser ma propre image?**  
A: Pas encore, mais cette fonctionnalité est prévue.

**Q: Quelle est la résolution?**  
A: 512x512 pixels, optimale pour les tuiles du dashboard.

**Q: Combien de temps ça prend?**  
A: 2-3 secondes avec z image turbo (4 steps).

**Q: Puis-je changer le style (anime, cartoon)?**  
A: Pas encore, mais c'est prévu dans les améliorations futures.

---

**Besoin d'aide?** Consultez `CHARACTER_PORTRAIT_GENERATION.md` pour la documentation complète.
