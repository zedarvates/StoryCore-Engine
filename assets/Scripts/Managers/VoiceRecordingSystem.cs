using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// Système principal d'enregistrement vocal intégré dans l'éditeur de séquences
/// Orchestre tous les composants pour une fonctionnalité complète
/// </summary>
public class VoiceRecordingSystem : MonoBehaviour
{
    [SerializeField] private SequenceTimelineSynchronizer synchronizer;
    [SerializeField] private VoiceRecordingPromptUI promptUI;
    [SerializeField] private AudioFileManager fileManager;

    private bool isInitialized;
    private SystemState currentState = SystemState.Idle;

    public event Action<SystemState> OnSystemStateChanged;
    public event Action<string> OnSystemError;

    public enum SystemState
    {
        Idle,
        Initializing,
        Ready,
        Recording,
        Processing,
        Error
    }

    private void Awake()
    {
        InitializeComponents();
        SetupEventHandlers();
    }

    private void InitializeComponents()
    {
        if (synchronizer == null)
        {
            synchronizer = gameObject.AddComponent<SequenceTimelineSynchronizer>();
        }

        if (promptUI == null)
        {
            promptUI = gameObject.AddComponent<VoiceRecordingPromptUI>();
        }

        if (fileManager == null)
        {
            fileManager = gameObject.AddComponent<AudioFileManager>();
        }

        // Connecter les composants
        promptUI.SetSynchronizer(synchronizer);
    }

    private void SetupEventHandlers()
    {
        // Relier les événements UI aux actions système
        promptUI.OnStartRecording += StartCurrentPhraseRecording;
        promptUI.OnStopRecording += StopCurrentPhraseRecording;
        promptUI.OnNextPhrase += MoveToNextPhrase;
        promptUI.OnCancelRecording += CancelRecordingSession;
        promptUI.OnFinishSession += FinishRecordingSession;

        // Gestion des erreurs
        synchronizer.OnSyncError += HandleSystemError;
    }

    /// <summary>
    /// Initialise le système pour une nouvelle session d'enregistrement
    /// </summary>
    public async Task<bool> InitializeSessionAsync(string sequenceId, string backendUrl, List<string> phrases)
    {
        try
        {
            SetState(SystemState.Initializing);

            // Initialiser la synchronisation timeline
            bool syncInit = await synchronizer.InitializeForSequenceAsync(sequenceId, backendUrl);
            if (!syncInit)
            {
                throw new Exception("Failed to initialize timeline synchronization");
            }

            // Générer le chemin de session
            string sessionPath = fileManager.GenerateAudioFilePath("project_temp", sequenceId, 0, AudioFormat.WAV);
            sessionPath = System.IO.Path.GetDirectoryName(sessionPath);

            // Démarrer l'enregistrement synchronisé
            bool recordingInit = await synchronizer.StartSynchronizedRecordingAsync(phrases, sessionPath);
            if (!recordingInit)
            {
                throw new Exception("Failed to initialize synchronized recording");
            }

            // Afficher le prompteur avec la première phrase
            var firstPhrase = synchronizer.phraseRecorder.GetCurrentPhrase();
            if (firstPhrase != null)
            {
                promptUI.ShowPrompt(firstPhrase.Text, 0, phrases.Count);
            }

            SetState(SystemState.Ready);
            isInitialized = true;
            return true;
        }
        catch (Exception ex)
        {
            OnSystemError?.Invoke($"Initialization failed: {ex.Message}");
            SetState(SystemState.Error);
            return false;
        }
    }

    /// <summary>
    /// Démarre l'enregistrement de la phrase actuelle
    /// </summary>
    private async void StartCurrentPhraseRecording()
    {
        if (!isInitialized || currentState == SystemState.Recording) return;

        SetState(SystemState.Recording);
        promptUI.UpdateRecordingState(true);

        // Le synchronizer gère l'enregistrement via PhraseAudioRecorder
        // Les événements sont gérés automatiquement
    }

    /// <summary>
    /// Arrête l'enregistrement de la phrase actuelle
    /// </summary>
    private async void StopCurrentPhraseRecording()
    {
        if (currentState != SystemState.Recording) return;

        SetState(SystemState.Processing);
        promptUI.UpdateRecordingState(false);

        try
        {
            await synchronizer.phraseRecorder.StopCurrentPhraseAsync();
            SetState(SystemState.Ready);
        }
        catch (Exception ex)
        {
            OnSystemError?.Invoke($"Stop recording failed: {ex.Message}");
            SetState(SystemState.Error);
        }
    }

    /// <summary>
    /// Passe à la phrase suivante
    /// </summary>
    private async void MoveToNextPhrase()
    {
        if (!isInitialized) return;

        bool nextStarted = await synchronizer.NextPhraseAsync();
        if (nextStarted)
        {
            var currentPhrase = synchronizer.phraseRecorder.GetCurrentPhrase();
            if (currentPhrase != null)
            {
                int currentIndex = synchronizer.phraseRecorder.GetAllPhrases().FindIndex(p => p.Index == currentPhrase.Index);
                promptUI.ShowPrompt(currentPhrase.Text, currentIndex, synchronizer.phraseRecorder.GetAllPhrases().Count);
            }
        }
    }

    /// <summary>
    /// Annule la session d'enregistrement
    /// </summary>
    private async void CancelRecordingSession()
    {
        if (!isInitialized) return;

        await synchronizer.phraseRecorder.CancelCurrentPhraseAsync();
        promptUI.HidePrompt();
        SetState(SystemState.Idle);
        isInitialized = false;
    }

    /// <summary>
    /// Termine la session d'enregistrement
    /// </summary>
    private async void FinishRecordingSession()
    {
        if (!isInitialized) return;

        SetState(SystemState.Processing);

        try
        {
            bool finished = await synchronizer.FinishRecordingSessionAsync();
            if (finished)
            {
                promptUI.ShowSuccess("Session d'enregistrement terminée avec succès");
                promptUI.HidePrompt();
                SetState(SystemState.Idle);
                isInitialized = false;
            }
            else
            {
                throw new Exception("Failed to finish recording session");
            }
        }
        catch (Exception ex)
        {
            OnSystemError?.Invoke($"Finish session failed: {ex.Message}");
            SetState(SystemState.Error);
        }
    }

    private void HandleSystemError(string error)
    {
        promptUI.ShowError(error);
        OnSystemError?.Invoke(error);
    }

    private void SetState(SystemState newState)
    {
        if (currentState != newState)
        {
            currentState = newState;
            OnSystemStateChanged?.Invoke(newState);
        }
    }

    /// <summary>
    /// Nettoie les ressources système
    /// </summary>
    public void Cleanup()
    {
        if (isInitialized)
        {
            CancelRecordingSession();
        }

        // Nettoyer les fichiers temporaires (optionnel)
        fileManager.CleanupOldFiles(7); // Garder 7 jours
    }

    private void OnDestroy()
    {
        Cleanup();
    }
}