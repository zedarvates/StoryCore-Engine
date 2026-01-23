using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// Gestionnaire d'enregistrement vocal phrase par phrase
/// Coordonne l'enregistrement de plusieurs phrases avec synchronisation timeline
/// </summary>
public class PhraseAudioRecorder : MonoBehaviour
{
    [SerializeField] private UnityAudioRecorder audioRecorder;

    private List<PhraseData> phrases = new List<PhraseData>();
    private int currentPhraseIndex = -1;
    private string recordingSessionPath;
    private bool isInitialized;

    public event Action<PhraseData> OnPhraseRecordingCompleted;
    public event Action<int> OnPhraseChanged;
    public event Action OnAllPhrasesCompleted;

    /// <summary>
    /// Initialise le système avec une liste de phrases à enregistrer
    /// </summary>
    public async Task<bool> InitializeAsync(List<string> phraseTexts, string sessionPath)
    {
        if (audioRecorder == null)
        {
            audioRecorder = gameObject.AddComponent<UnityAudioRecorder>();
        }

        recordingSessionPath = sessionPath;

        // Créer le répertoire de session
        if (!Directory.Exists(recordingSessionPath))
        {
            Directory.CreateDirectory(recordingSessionPath);
        }

        // Créer les données de phrases
        phrases.Clear();
        for (int i = 0; i < phraseTexts.Count; i++)
        {
            phrases.Add(new PhraseData
            {
                Index = i,
                Text = phraseTexts[i],
                State = RecordingState.Idle,
                AudioFilePath = null
            });
        }

        // Initialiser l'enregistreur audio
        var settings = new AudioRecordingSettings
        {
            SampleRate = 44100,
            Channels = 1,
            Format = AudioFormat.WAV,
            MaxRecordingTime = 60f, // 1 minute par phrase max
            DeviceIndex = 0
        };

        bool audioInit = await audioRecorder.InitializeAsync(settings);
        if (!audioInit)
        {
            Debug.LogError("Failed to initialize audio recorder");
            return false;
        }

        isInitialized = true;
        return true;
    }

    /// <summary>
    /// Démarre l'enregistrement de la phrase suivante
    /// </summary>
    public async Task<bool> StartNextPhraseAsync()
    {
        if (!isInitialized)
        {
            Debug.LogError("Phrase recorder not initialized");
            return false;
        }

        if (currentPhraseIndex >= phrases.Count - 1)
        {
            OnAllPhrasesCompleted?.Invoke();
            return false;
        }

        currentPhraseIndex++;
        var phrase = phrases[currentPhraseIndex];

        // Générer le chemin du fichier audio
        string fileName = $"phrase_{currentPhraseIndex:D3}_{DateTime.Now:yyyyMMdd_HHmmss}.wav";
        phrase.AudioFilePath = Path.Combine(recordingSessionPath, fileName);

        // Démarrer l'enregistrement
        bool started = await audioRecorder.StartRecordingAsync(phrase.AudioFilePath);
        if (started)
        {
            phrase.State = RecordingState.Recording;
            OnPhraseChanged?.Invoke(currentPhraseIndex);
        }

        return started;
    }

    /// <summary>
    /// Arrête l'enregistrement de la phrase actuelle
    /// </summary>
    public async Task<bool> StopCurrentPhraseAsync()
    {
        if (!isInitialized || currentPhraseIndex < 0 || currentPhraseIndex >= phrases.Count)
        {
            return false;
        }

        var phrase = phrases[currentPhraseIndex];
        if (phrase.State != RecordingState.Recording)
        {
            return false;
        }

        var result = await audioRecorder.StopRecordingAsync();
        if (result.Success)
        {
            phrase.State = RecordingState.Completed;
            phrase.AudioFilePath = result.FilePath;
            phrase.Duration = result.Duration;
            phrase.Metadata = result.Metadata;

            OnPhraseRecordingCompleted?.Invoke(phrase);
            return true;
        }
        else
        {
            phrase.State = RecordingState.Error;
            Debug.LogError($"Failed to stop recording phrase {currentPhraseIndex}: {result.ErrorMessage}");
            return false;
        }
    }

    /// <summary>
    /// Annule l'enregistrement de la phrase actuelle
    /// </summary>
    public async Task<bool> CancelCurrentPhraseAsync()
    {
        if (!isInitialized || currentPhraseIndex < 0 || currentPhraseIndex >= phrases.Count)
        {
            return false;
        }

        var phrase = phrases[currentPhraseIndex];
        if (phrase.State != RecordingState.Recording)
        {
            return false;
        }

        bool cancelled = await audioRecorder.CancelRecordingAsync();
        if (cancelled)
        {
            phrase.State = RecordingState.Idle;
            phrase.AudioFilePath = null;
        }

        return cancelled;
    }

    /// <summary>
    /// Redémarre l'enregistrement de la phrase actuelle
    /// </summary>
    public async Task<bool> RestartCurrentPhraseAsync()
    {
        if (!isInitialized || currentPhraseIndex < 0 || currentPhraseIndex >= phrases.Count)
        {
            return false;
        }

        // Annuler l'enregistrement actuel
        await CancelCurrentPhraseAsync();

        // Redémarrer
        return await StartNextPhraseAsync();
    }

    /// <summary>
    /// Saute à une phrase spécifique
    /// </summary>
    public async Task<bool> JumpToPhraseAsync(int phraseIndex)
    {
        if (!isInitialized || phraseIndex < 0 || phraseIndex >= phrases.Count)
        {
            return false;
        }

        // Arrêter la phrase actuelle si en cours
        if (currentPhraseIndex >= 0 && phrases[currentPhraseIndex].State == RecordingState.Recording)
        {
            await StopCurrentPhraseAsync();
        }

        currentPhraseIndex = phraseIndex - 1; // -1 car StartNextPhraseAsync incrémente
        return await StartNextPhraseAsync();
    }

    /// <summary>
    /// Obtient la phrase actuelle
    /// </summary>
    public PhraseData GetCurrentPhrase()
    {
        if (currentPhraseIndex < 0 || currentPhraseIndex >= phrases.Count)
        {
            return null;
        }
        return phrases[currentPhraseIndex];
    }

    /// <summary>
    /// Obtient toutes les phrases
    /// </summary>
    public List<PhraseData> GetAllPhrases()
    {
        return new List<PhraseData>(phrases);
    }

    /// <summary>
    /// Vérifie si toutes les phrases sont enregistrées
    /// </summary>
    public bool IsComplete()
    {
        foreach (var phrase in phrases)
        {
            if (phrase.State != RecordingState.Completed)
            {
                return false;
            }
        }
        return true;
    }

    /// <summary>
    /// Obtient le progrès (0-1)
    /// </summary>
    public float GetProgress()
    {
        if (phrases.Count == 0) return 0f;

        int completed = 0;
        foreach (var phrase in phrases)
        {
            if (phrase.State == RecordingState.Completed)
            {
                completed++;
            }
        }

        return (float)completed / phrases.Count;
    }

    /// <summary>
    /// Exporte les métadonnées de session au format JSON
    /// </summary>
    public string ExportSessionMetadata()
    {
        var sessionData = new SessionMetadata
        {
            SessionPath = recordingSessionPath,
            Timestamp = DateTime.Now,
            Phrases = phrases
        };

        return JsonUtility.ToJson(sessionData, true);
    }
}

/// <summary>
/// Données d'une phrase à enregistrer
/// </summary>
[Serializable]
public class PhraseData
{
    public int Index;
    public string Text;
    public RecordingState State;
    public string AudioFilePath;
    public float Duration;
    public AudioMetadata Metadata;
}

/// <summary>
/// Métadonnées de la session d'enregistrement
/// </summary>
[Serializable]
public class SessionMetadata
{
    public string SessionPath;
    public DateTime Timestamp;
    public List<PhraseData> Phrases;
}