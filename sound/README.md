# Dossier Sound - Annotations Sonores

## Vue d'ensemble

Ce dossier est destiné à stocker les annotations sonores créées par les utilisateurs via la chatbox de l'interface StoryCore Creative Studio.

## Structure

```
sound/
├── annotations/          # Fichiers audio bruts
│   ├── 2026-01-16_16-30-00_user-note.wav
│   ├── 2026-01-16_16-35-12_project-idea.wav
│   └── metadata.json
├── transcriptions/       # Transcriptions textuelles (optionnel)
│   ├── 2026-01-16_16-30-00_user-note.txt
│   └── 2026-01-16_16-35-12_project-idea.txt
└── README.md            # Ce fichier
```

## Utilisation

### Enregistrer une Annotation

1. Ouvrir StoryCore Creative Studio
2. Sur la page d'accueil, localiser la chatbox en bas
3. Cliquer sur l'icône microphone 🎤
4. Parler votre annotation
5. Cliquer à nouveau sur le microphone pour arrêter
6. L'enregistrement est automatiquement sauvegardé ici

### Format des Fichiers

**Nom du fichier** : `YYYY-MM-DD_HH-MM-SS_description.wav`
- Date et heure de création
- Description courte (générée automatiquement ou fournie par l'utilisateur)
- Format WAV pour une qualité optimale

**Métadonnées** : `metadata.json`
```json
{
  "annotations": [
    {
      "id": "unique-id",
      "filename": "2026-01-16_16-30-00_user-note.wav",
      "timestamp": "2026-01-16T16:30:00Z",
      "duration": 15.5,
      "description": "Note utilisateur sur le projet",
      "transcription": "Optionnel - texte transcrit",
      "tags": ["projet", "idée", "personnage"],
      "projectId": "optional-project-id"
    }
  ]
}
```

## Cas d'Usage

### 1. Notes Vocales Rapides

Enregistrer rapidement des idées sans interrompre le flux créatif :
- Idées de scénario
- Descriptions de personnages
- Notes sur l'ambiance sonore
- Références audio

### 2. Annotations de Projet

Associer des notes vocales à des projets spécifiques :
- Directives pour les scènes
- Commentaires sur le montage
- Instructions pour l'équipe
- Feedback client

### 3. Bibliothèque de Références

Créer une collection de références audio :
- Exemples de voix pour les personnages
- Ambiances sonores
- Effets sonores
- Musiques de référence

### 4. Collaboration

Partager des annotations avec l'équipe :
- Exporter les fichiers
- Partager via le cloud
- Intégrer dans les projets

## Intégration Future

### Transcription Automatique

Les annotations pourront être automatiquement transcrites en texte :
- Utilisation de l'API Web Speech
- Ou services cloud (Google Speech-to-Text, AWS Transcribe)
- Sauvegarde dans `transcriptions/`

### Recherche et Indexation

Les annotations seront indexées pour une recherche rapide :
- Recherche par mot-clé
- Recherche par date
- Recherche par projet
- Recherche par tag

### Intégration Projet

Les annotations pourront être liées aux projets :
- Association automatique au projet actif
- Référencement dans les métadonnées du projet
- Lecture directe depuis l'interface

## Bonnes Pratiques

### Nommage

- Utiliser des descriptions courtes et claires
- Éviter les caractères spéciaux
- Préférer les tirets aux espaces

### Organisation

- Créer des sous-dossiers par projet si nécessaire
- Nettoyer régulièrement les anciennes annotations
- Sauvegarder les annotations importantes

### Qualité Audio

- Parler clairement et distinctement
- Éviter les bruits de fond
- Utiliser un microphone de qualité si possible
- Tester le niveau audio avant l'enregistrement

## Formats Supportés

### Actuellement

- **WAV** : Format non compressé, haute qualité
  - Fréquence : 44.1 kHz ou 48 kHz
  - Profondeur : 16 bits ou 24 bits
  - Canaux : Mono ou Stéréo

### Futur

- **MP3** : Format compressé pour économiser l'espace
- **OGG** : Alternative open-source
- **FLAC** : Compression sans perte

## Taille et Limites

### Recommandations

- **Durée maximale** : 5 minutes par annotation
- **Taille maximale** : 50 MB par fichier
- **Espace total** : Surveiller l'utilisation du disque

### Nettoyage

Pour libérer de l'espace :
1. Supprimer les annotations obsolètes
2. Compresser les fichiers WAV en MP3
3. Archiver les anciennes annotations

## Sécurité et Confidentialité

### Données Locales

- Toutes les annotations sont stockées localement
- Aucune donnée n'est envoyée au cloud par défaut
- Vous contrôlez vos données

### Sauvegarde

- Sauvegarder régulièrement ce dossier
- Utiliser un service de cloud personnel si souhaité
- Chiffrer les annotations sensibles

## Dépannage

### L'enregistrement ne fonctionne pas

1. Vérifier les permissions du microphone
2. Vérifier que le microphone est connecté
3. Tester le microphone dans les paramètres système
4. Redémarrer l'application

### Fichiers corrompus

1. Vérifier l'espace disque disponible
2. Vérifier les permissions d'écriture
3. Essayer un autre emplacement de sauvegarde

### Qualité audio médiocre

1. Ajuster le niveau du microphone
2. Réduire les bruits de fond
3. Utiliser un meilleur microphone
4. Ajuster les paramètres d'enregistrement

## Support

Pour toute question ou problème :
- Consulter la documentation principale
- Vérifier les logs de l'application
- Contacter le support technique

---

**Créé le** : 16 janvier 2026  
**Version** : 1.0.0  
**Statut** : 📁 Prêt pour utilisation
