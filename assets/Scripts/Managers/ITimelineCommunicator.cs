using System;
using System.Collections.Generic;
using System.Threading.Tasks;

/// <summary>
/// Interface pour la communication avec le backend Python TimelineManager
/// Définit les contrats pour synchroniser les données de timeline et enregistrements audio
/// </summary>
public interface ITimelineCommunicator
{
    /// <summary>
    /// Établit la connexion avec le backend
    /// </summary>
    Task<bool> ConnectAsync(string backendUrl);

    /// <summary>
    /// Ferme la connexion proprement
    /// </summary>
    Task DisconnectAsync();

    /// <summary>
    /// Récupère les métadonnées de timeline actuelles
    /// </summary>
    Task<TimelineMetadata> GetTimelineMetadataAsync();

    /// <summary>
    /// Envoie les métadonnées d'un enregistrement audio pour synchronisation
    /// </summary>
    Task<bool> SendAudioRecordingAsync(AudioRecordingData recordingData);

    /// <summary>
    /// Met à jour les points de sync audio sur la timeline
    /// </summary>
    Task<bool> UpdateAudioSyncPointsAsync(List<AudioSyncPoint> syncPoints);

    /// <summary>
    /// Événement déclenché lors de changements sur la timeline
    /// </summary>
    event Action<TimelineMetadata> OnTimelineUpdated;

    /// <summary>
    /// Événement déclenché en cas d'erreur de communication
    /// </summary>
    event Action<string> OnCommunicationError;
}

/// <summary>
/// Données de métadonnées de timeline synchronisées avec TimelineManager.py
/// </summary>
[Serializable]
public class TimelineMetadata
{
    public float totalDuration;
    public int totalFrames;
    public float frameRate;
    public List<ShotTiming> shotTimings;
    public List<FrameTiming> frameTimings;
    public List<AudioSyncPoint> audioSyncPoints;
}

/// <summary>
/// Timing d'un shot dans la timeline
/// </summary>
[Serializable]
public class ShotTiming
{
    public string shotId;
    public float startTime;
    public float endTime;
    public float duration;
    public int frameCount;
    public float frameRate;
}

/// <summary>
/// Timing d'une frame individuelle
/// </summary>
[Serializable]
public class FrameTiming
{
    public int frameNumber;
    public float timestamp;
    public float duration;
    public string shotId;
    public int sequencePosition;
}

/// <summary>
/// Point de synchronisation audio
/// </summary>
[Serializable]
public class AudioSyncPoint
{
    public float timestamp;
    public string type;
    public string shotId;
    public int frameNumber;
    public string audioFilePath;
}

/// <summary>
/// Données d'un enregistrement audio à envoyer au backend
/// </summary>
[Serializable]
public class AudioRecordingData
{
    public string phraseId;
    public string audioFilePath;
    public float startTime;
    public float endTime;
    public float duration;
    public string shotId;
    public Dictionary<string, string> metadata;
}