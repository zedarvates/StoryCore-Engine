# Guide Rapide : Gestion des Séquences

## 🎯 Vue d'Ensemble

Le dashboard du projet permet maintenant de gérer complètement vos séquences avec une interface intuitive.

## 🔧 Actions Disponibles

### 1. Ajouter une Séquence
```
┌─────────────────────────────┐
│ Plan Sequences         [+]  │  ← Cliquez sur le bouton vert "+"
└─────────────────────────────┘
```

**Résultat** : Crée une nouvelle séquence avec des valeurs par défaut

---

### 2. Éditer une Séquence
```
┌─────────────────────────────────────┐
│ Sequence 1              [✏️] [🗑️]  │  ← Cliquez sur l'icône crayon
│                                     │
│ Ordre: #1                          │
│ Durée: 30s                         │
│ Plans: 5                           │
└─────────────────────────────────────┘
```

**Ouvre un modal permettant de modifier** :
- ✏️ Numéro d'ordre (pour réorganiser)
- ⏱️ Durée en secondes
- 🎬 Nombre de plans
- 📝 Résumé (description)

**Raccourcis** :
- `Ctrl+Enter` : Enregistrer
- `Échap` : Annuler

---

### 3. Supprimer une Séquence
```
┌─────────────────────────────────────┐
│ Sequence 1              [✏️] [🗑️]  │  ← Cliquez sur l'icône poubelle
│                                     │
│ Ordre: #1                          │
│ Durée: 30s                         │
│ Plans: 5                           │
└─────────────────────────────────────┘
```

**Résultat** : 
1. Demande de confirmation
2. Supprime la séquence et ses plans
3. Supprime le fichier JSON associé

---

### 4. Ouvrir l'Éditeur
```
┌─────────────────────────────────────┐
│ Sequence 1              [✏️] [🗑️]  │
│                                     │  ← Cliquez n'importe où sur la carte
│ Ordre: #1                          │     (sauf sur les boutons)
│ Durée: 30s                         │
│ Plans: 5                           │
└─────────────────────────────────────┘
```

**Résultat** : Ouvre l'éditeur de séquence complet

---

## 🤖 Utilisation avec l'Assistant StoryCore

L'assistant dans le Chatterbox peut maintenant gérer vos séquences :

### Exemples de Commandes

**Créer une séquence** :
```
"Crée une nouvelle séquence de 45 secondes avec 6 plans"
"Ajoute une séquence d'action de 1 minute"
```

**Modifier une séquence** :
```
"Modifie la séquence 2 pour durer 60 secondes"
"Change le résumé de la séquence 1 en : [nouveau texte]"
"Augmente le nombre de plans de la séquence 3 à 8"
```

**Réorganiser** :
```
"Mets la séquence 3 en première position"
"Inverse les séquences 1 et 2"
```

**Supprimer** :
```
"Supprime la séquence 4"
"Retire la dernière séquence"
```

**Améliorer** :
```
"Améliore le résumé de la séquence 1"
"Génère un meilleur titre pour la séquence 2"
```

---

## 📁 Structure des Fichiers JSON

Chaque séquence est sauvegardée dans un fichier JSON individuel :

```
project-folder/
├── sequences/
│   ├── sequence-001.json
│   ├── sequence-002.json
│   └── sequence-003.json
├── characters/
│   ├── character-001.json
│   └── character-002.json
└── project.json
```

### Format d'une Séquence
```json
{
  "id": "seq-uuid-123",
  "name": "Sequence 1",
  "type": "sequence",
  "order": 1,
  "duration": 30,
  "shots": 5,
  "resume": "Description de la séquence...",
  "created_at": "2026-01-20T10:30:00Z",
  "updated_at": "2026-01-20T11:45:00Z",
  "metadata": {
    "tags": ["action", "outdoor"],
    "location": "Forest",
    "time_of_day": "day"
  }
}
```

---

## 🎨 Interface Visuelle

### Carte de Séquence Complète
```
╔═══════════════════════════════════════╗
║ Sequence 1              [✏️] [🗑️]    ║  ← Header avec actions
╟───────────────────────────────────────╢
║ Ordre: #1                            ║
║ Durée: 30s                           ║  ← Informations
║ Plans: 5                             ║
╟───────────────────────────────────────╢
║ Resume: Une scène d'action intense   ║  ← Description
║ dans la forêt avec plusieurs         ║
║ personnages...                       ║
╚═══════════════════════════════════════╝
```

### Modal d'Édition
```
╔═══════════════════════════════════════╗
║ Éditer Séquence: Sequence 1      [X] ║
╟───────────────────────────────────────╢
║                                       ║
║ Numéro d'ordre:  [  1  ]             ║
║                                       ║
║ Durée (secondes): [ 30.0 ]           ║
║                                       ║
║ Nombre de plans:  [  5  ]            ║
║                                       ║
║ Résumé:                              ║
║ ┌───────────────────────────────┐   ║
║ │ Description de la séquence... │   ║
║ │                               │   ║
║ │                               │   ║
║ └───────────────────────────────┘   ║
║ 125/500 caractères                   ║
║                                       ║
╟───────────────────────────────────────╢
║              [Annuler] [Enregistrer] ║
╟───────────────────────────────────────╢
║ Ctrl+Enter pour enregistrer          ║
╚═══════════════════════════════════════╝
```

---

## 🎯 Workflow Recommandé

### 1. Planification Initiale
```
1. Créez votre résumé global du projet
2. Utilisez le bouton "+" pour ajouter des séquences
3. Cliquez sur chaque séquence pour l'éditer
4. Définissez l'ordre, la durée et le nombre de plans
```

### 2. Utilisation de l'Assistant
```
1. Ouvrez le Chatterbox Assistant
2. Demandez à l'assistant de créer/modifier des séquences
3. L'assistant génère automatiquement les fichiers JSON
4. Vérifiez et ajustez manuellement si nécessaire
```

### 3. Édition Fine
```
1. Cliquez sur l'icône crayon pour éditer
2. Ajustez les paramètres dans le modal
3. Enregistrez avec Ctrl+Enter
4. Les changements sont immédiatement visibles
```

### 4. Organisation
```
1. Utilisez le numéro d'ordre pour réorganiser
2. Supprimez les séquences inutiles avec l'icône poubelle
3. Cliquez sur une séquence pour l'éditer en détail
```

---

## ⚡ Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+Enter` | Enregistrer les modifications (dans le modal) |
| `Échap` | Fermer le modal sans enregistrer |
| `Clic` | Ouvrir l'éditeur de séquence |
| `Clic sur ✏️` | Ouvrir le modal d'édition |
| `Clic sur 🗑️` | Supprimer la séquence |

---

## 💡 Astuces

### Réorganisation Rapide
Au lieu de modifier manuellement l'ordre, demandez à l'assistant :
```
"Réorganise les séquences dans cet ordre : 3, 1, 2, 4"
```

### Génération de Résumés
L'assistant peut améliorer vos résumés :
```
"Améliore tous les résumés de séquences pour qu'ils soient plus descriptifs"
```

### Duplication
Pour créer une séquence similaire :
```
"Duplique la séquence 2 et modifie sa durée à 45 secondes"
```

### Batch Operations
Modifiez plusieurs séquences en une commande :
```
"Augmente la durée de toutes les séquences de 10 secondes"
```

---

## 🔍 Dépannage

### La séquence ne se supprime pas
- Vérifiez que vous avez confirmé la suppression
- Assurez-vous qu'aucun plan n'est en cours d'édition

### Les modifications ne sont pas sauvegardées
- Vérifiez que vous avez cliqué sur "Enregistrer"
- Utilisez Ctrl+Enter pour enregistrer rapidement

### Le modal ne s'ouvre pas
- Cliquez bien sur l'icône crayon (✏️)
- Pas sur la carte elle-même (qui ouvre l'éditeur)

### L'assistant ne répond pas
- Vérifiez que Ollama est connecté (indicateur vert en haut)
- Redémarrez Ollama si nécessaire

---

## 📚 Ressources

- **Documentation complète** : `DASHBOARD_SEQUENCE_MANAGEMENT_COMPLETE.md`
- **Architecture** : `ARCHITECTURE_DASHBOARD.md`
- **Guide visuel** : `DASHBOARD_VISUAL_GUIDE.md`

---

## ✅ Checklist de Vérification

Avant de commencer à travailler sur votre projet :

- [ ] Ollama est connecté (indicateur vert)
- [ ] Le résumé global est défini
- [ ] Au moins une séquence est créée
- [ ] Chaque séquence a un résumé descriptif
- [ ] Les séquences sont dans le bon ordre
- [ ] Les durées sont correctes

---

**Bon travail avec StoryCore ! 🎬**
