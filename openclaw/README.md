# OpenClow Skills - StoryCore

Bienvenue dans la structure des skills OpenClow pour StoryCore. Ce système permet de gérer et d'organiser les différents éléments créatifs de vos histoires interactives.

## Structure des dossiers

```
openclow/
├── README.md                  # Ce fichier
├── characters/                # Personnages
├── locations/                 # Lieux
├── objects/                   # Objets
├── worlds/                    # Mondes
├── projects/                  # Projets
├── setup/                     # Configuration de projet
├── stories/                   # Histoires
├── scenarios/                 # Scénarios
├── dialogues/                 # Dialogues
└── consequences/              # Conséquences
```

## Format des Skills

Chaque skill est stocké au format JSON avec la structure suivante :

```json
{
  "id": "unique-identifier",
  "name": "Nom du skill",
  "description": "Description courte du skill",
  "prompt": "Le prompt principal utilisé par l'IA",
  "parameters": {
    "param1": "description du paramètre",
    "param2": "description du paramètre"
  },
  "examples": [
    {
      "input": "Exemple d'entrée",
      "output": "Exemple de sortie attendue"
    }
  ]
}
```

## Catégories de Skills

### characters/
Skills liés à la création et gestion des personnages.
- Création de personnages
- Personnalisation d'apparence
- Définition de la personnalité
- Relations entre personnages

### locations/
Skills liés aux lieux et environnements.
- Création de lieux
- Description d'ambiance
- Connexion entre lieux
- Événements de lieu

### objects/
Skills liés aux objets et éléments physiques.
- Création d'objets
- Propriétés d'objets
- Interactions avec les objets
- Objets spéciaux

### worlds/
Skills liés aux mondes et univers.
- Création de mondes
- Règles du monde
- Histoire du monde
- Factions et groupes

### projects/
Skills liés à la gestion des projets.
- Création de projet
- Organisation du projet
- Export/Import
- Sauvegarde

### setup/
Skills pour la configuration initiale.
- Configuration de projet
- Initialisation des paramètres
- Personnalisation de l'interface

### stories/
Skills pour la gestion des histoires.
- Création d'histoire
- Structure narrative
- Chapitres et actes
- Résumé et synopsis

### scenarios/
Skills pour les scénarios.
- Création de scénario
- Enchaînement des scènes
- Points de décision
- Conditions de scénario

### dialogues/
Skills pour les dialogues.
- Rédaction de dialogues
- Personnalisation vocale
- Expressions et émotions
- Langue et style

### consequences/
Skills pour les conséquences.
- Définition des conséquences
- Choix et ramifications
- Système de conséquences
- Résultats alternatifs

## Utilisation

Pour utiliser un skill, chargez le fichier JSON correspondant et utilisez le prompt fourni pour interagir avec l'IA. Les paramètres vous permettront de personnaliser le comportement du skill.

## Contribution

Pour contribuer à cette structure :
1. Créez un nouveau fichier JSON dans la catégorie appropriée
2. Suivez le format de skill décrit ci-dessus
3. Ajoutez des exemples pertinents
4. Soumettez votre contribution

## Licence

Ce projet fait partie de StoryCore Engine.
