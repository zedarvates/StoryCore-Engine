# Fonctionnalité d'Enregistrement Vocal Phrase par Phrase

## Vue d'ensemble
Cette fonctionnalité permet d'enregistrer des paroles vocales phrase par phrase dans l'éditeur de séquences Unity, avec synchronisation temps réel avec la timeline backend Python.

## Architecture
- **Unity C# 6000.3.2** : Composants principaux
- **Backend Python** : TimelineManager pour synchronisation
- **Communication** : HTTP/WebSocket (extensible)

## Composants Principaux

### VoiceRecordingSystem
Classe principale orchestrant tous les composants.

```csharp
public class VoiceRecordingSystem : MonoBehaviour
{
    // Initialisation pour une séquence
    Task<bool> InitializeSessionAsync(string sequenceId, string backendUrl, List<string> phrases);

    // Événements système
    event Action<SystemState> OnSystemStateChanged;
    event Action<string> OnSystemError;
}
```

### Interfaces Clés

#### IAudioRecorder
Interface pour l'enregistrement audio de base.

#### ITimelineCommunicator
Interface pour la communication avec le backend timeline.

### Classes de Données
- `AudioRecordingSettings` : Configuration enregistrement
- `TimelineMetadata` : Métadonnées timeline
- `PhraseData` : Données d'une phrase

## Utilisation

### Initialisation
```csharp
var system = gameObject.AddComponent<VoiceRecordingSystem>();
await system.InitializeSessionAsync("seq_001", "http://localhost:8000", phrases);
```

### Gestion des Phrases
- Démarrage automatique avec première phrase
- Boutons UI pour contrôler enregistrement
- Progression automatique vers phrases suivantes

## Gestion des Erreurs
- Permissions microphone vérifiées au démarrage
- Gestion des interruptions système
- Validation qualité audio basique

## Stockage
- Fichiers WAV/MP3 structurés par projet/séquence
- Métadonnées JSON pour synchronisation
- Nettoyage automatique des anciens fichiers

## Performances
- Async/await pour éviter blocage UI
- Buffering audio optimisé
- Pas d'allocation GC pendant enregistrement

## Limitations Connues
- Conversion MP3 simulée (nécessite bibliothèque externe en production)
- Sync timeline simulée (intégration complète requise)
- Permissions micro dépendantes plateforme Unity

## Maintenance
- Code strictement typé, zéro any/unknown
- Tests unitaires recommandés avec NUnit
- Documentation API complète