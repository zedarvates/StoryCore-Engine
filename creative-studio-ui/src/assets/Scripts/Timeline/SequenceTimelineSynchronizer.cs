using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// Synchronisateur entre l'enregistrement vocal et la timeline de séquence
/// Gère la communication avec TimelineManager backend et la mise à jour des métadonnées
/// </summary>
public class SequenceTimelineSynchronizer : MonoBehaviour
{
    [SerializeField] private HttpTimelineCommunicator timelineCommunicator;
    [SerializeField] private PhraseAudioRecorder phraseRecorder;

    private TimelineMetadata currentTimeline;
    private string currentSequenceId;
    private List<AudioSyncPoint> pendingSyncPoints = new List<AudioSyncPoint>();

    public event Action<TimelineMetadata> OnTimelineSynced;
    public event Action<string> OnSyncError;
    public event Action<float> OnRecordingProgress;

    private void Awake()
    {
        DontDestroyOnLoad(gameObject);
        InitializeComponents();
    }

    private void InitializeComponents()
    {
        if (timelineCommunicator == null)
        {
            timelineCommunicator = gameObject.AddComponent<HttpTimelineCommunicator>();
        }

        if (phraseRecorder == null)
        {
            phraseRecorder = gameObject.AddComponent<PhraseAudioRecorder>();
        }

        // S'abonner aux événements
        phraseRecorder.OnPhraseRecordingCompleted += OnPhraseCompleted;
        timelineCommunicator.OnTimelineUpdated += OnTimelineMetadataUpdated;
        timelineCommunicator.OnCommunicationError += OnTimelineCommunicationError;
    }

    /// <summary>
    /// Initialise la synchronisation pour une séquence spécifique
    /// </summary>
    public async Task<bool> InitializeForSequenceAsync(string sequenceId, string backendUrl)
    {
        currentSequenceId = sequenceId;

        // Connecter au backend
        bool connected = await timelineCommunicator.ConnectAsync(backendUrl);
        if (!connected)
        {
            OnSyncError?.Invoke("Failed to connect to timeline backend");
            return false;
        }

        // Récupérer les métadonnées de timeline actuelles
        currentTimeline = await timelineCommunicator.GetTimelineMetadataAsync();
        if (currentTimeline == null)
        {
            OnSyncError?.Invoke("Failed to retrieve timeline metadata");
            return false;
        }

        OnTimelineSynced?.Invoke(currentTimeline);
        return true;
    }

    /// <summary>
    /// Démarre la session d'enregistrement vocal synchronisée
    /// </summary>
    public async Task<bool> StartSynchronizedRecordingAsync(List<string> phrases, string sessionPath)
    {
        if (currentTimeline == null)
        {
            OnSyncError?.Invoke("Timeline not initialized");
            return false;
        }

        // Initialiser l'enregistreur de phrases
        bool initSuccess = await phraseRecorder.InitializeAsync(phrases, sessionPath);
        if (!initSuccess)
        {
            OnSyncError?.Invoke("Failed to initialize phrase recorder");
            return false;
        }

        // Démarrer la première phrase
        bool started = await phraseRecorder.StartNextPhraseAsync();
        if (started)
        {
            OnRecordingProgress?.Invoke(phraseRecorder.GetProgress());
        }

        return started;
    }

    /// <summary>
    /// Passe à la phrase suivante
    /// </summary>
    public async Task<bool> NextPhraseAsync()
    {
        // Sauvegarder la phrase actuelle si en cours
        var currentPhrase = phraseRecorder.GetCurrentPhrase();
        if (currentPhrase != null && currentPhrase.State == RecordingState.Recording)
        {
            await phraseRecorder.StopCurrentPhraseAsync();
        }

        // Démarrer la suivante
        bool started = await phraseRecorder.StartNextPhraseAsync();
        if (started)
        {
            OnRecordingProgress?.Invoke(phraseRecorder.GetProgress());
        }

        return started;
    }

    /// <summary>
    /// Termine la session d'enregistrement et synchronise avec la timeline
    /// </summary>
    public async Task<bool> FinishRecordingSessionAsync()
    {
        // S'assurer que la dernière phrase est arrêtée
        var currentPhrase = phraseRecorder.GetCurrentPhrase();
        if (currentPhrase != null && currentPhrase.State == RecordingState.Recording)
        {
            await phraseRecorder.StopCurrentPhraseAsync();
        }

        // Synchroniser tous les points audio avec la timeline
        bool syncSuccess = await SyncAudioPointsToTimelineAsync();
        if (syncSuccess)
        {
            // Mettre à jour les métadonnées timeline
            currentTimeline = await timelineCommunicator.GetTimelineMetadataAsync();
            OnTimelineSynced?.Invoke(currentTimeline);
            OnRecordingProgress?.Invoke(1f);
        }

        return syncSuccess;
    }

    /// <summary>
    /// Obtient le progrès de l'enregistrement (0-1)
    /// </summary>
    public float GetRecordingProgress()
    {
        return phraseRecorder.GetProgress();
    }

    /// <summary>
    /// Vérifie si la session d'enregistrement est complète
    /// </summary>
    public bool IsRecordingComplete()
    {
        return phraseRecorder.IsComplete();
    }

    /// <summary>
    /// Exporte les métadonnées de synchronisation
    /// </summary>
    public string ExportSyncMetadata()
    {
        var syncData = new SequenceSyncMetadata
        {
            SequenceId = currentSequenceId,
            TimelineMetadata = currentTimeline,
            RecordingSession = JsonUtility.FromJson<SessionMetadata>(phraseRecorder.ExportSessionMetadata()),
            SyncTimestamp = DateTime.Now
        };

        return JsonUtility.ToJson(syncData, true);
    }

    private async void OnPhraseCompleted(PhraseData completedPhrase)
    {
        // Créer un point de sync audio pour cette phrase
        var syncPoint = new AudioSyncPoint
        {
            timestamp = GetCurrentTimelineTime(),
            type = "phrase_recording",
            shotId = GetCurrentShotId(),
            frameNumber = GetCurrentFrameNumber(),
            audioFilePath = completedPhrase.AudioFilePath
        };

        pendingSyncPoints.Add(syncPoint);

        // Synchronisation périodique pour éviter la surcharge
        if (pendingSyncPoints.Count >= 3) // Sync toutes les 3 phrases
        {
            await SyncAudioPointsToTimelineAsync();
        }
    }

    private async Task<bool> SyncAudioPointsToTimelineAsync()
    {
        if (pendingSyncPoints.Count == 0)
        {
            return true;
        }

        bool success = await timelineCommunicator.UpdateAudioSyncPointsAsync(pendingSyncPoints);
        if (success)
        {
            pendingSyncPoints.Clear();
        }
        else
        {
            OnSyncError?.Invoke("Failed to sync audio points to timeline");
        }

        return success;
    }

    private void OnTimelineMetadataUpdated(TimelineMetadata updatedMetadata)
    {
        currentTimeline = updatedMetadata;
        OnTimelineSynced?.Invoke(updatedMetadata);
    }

    private void OnTimelineCommunicationError(string error)
    {
        OnSyncError?.Invoke($"Timeline communication error: {error}");
    }

    private float GetCurrentTimelineTime()
    {
        // Simulation - en production, obtenir du vrai temps timeline
        // Pour l'instant, utiliser le temps Unity
        return Time.time;
    }

    private string GetCurrentShotId()
    {
        // Simulation - en production, déterminer le shot actuel depuis la timeline
        return "current_shot";
    }

    private int GetCurrentFrameNumber()
    {
        // Simulation - calculer le numéro de frame depuis le temps timeline
        return Mathf.FloorToInt(GetCurrentTimelineTime() * 24f); // Assuming 24fps
    }

    private void OnDestroy()
    {
        // Nettoyer les abonnements
        if (phraseRecorder != null)
        {
            phraseRecorder.OnPhraseRecordingCompleted -= OnPhraseCompleted;
        }

        if (timelineCommunicator != null)
        {
            timelineCommunicator.OnTimelineUpdated -= OnTimelineMetadataUpdated;
            timelineCommunicator.OnCommunicationError -= OnTimelineCommunicationError;
        }
    }
}

/// <summary>
/// Métadonnées de synchronisation pour une séquence complète
/// </summary>
[Serializable]
public class SequenceSyncMetadata
{
    public string SequenceId;
    public TimelineMetadata TimelineMetadata;
    public SessionMetadata RecordingSession;
    public DateTime SyncTimestamp;
}