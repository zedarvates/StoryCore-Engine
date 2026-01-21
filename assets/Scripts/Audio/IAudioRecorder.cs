using System;
using System.Threading.Tasks;

/// <summary>
/// Interface pour le système d'enregistrement vocal
/// Définit les contrats pour l'enregistrement audio en temps réel
/// </summary>
public interface IAudioRecorder
{
    /// <summary>
    /// État actuel de l'enregistrement
    /// </summary>
    RecordingState State { get; }

    /// <summary>
    /// Durée actuelle de l'enregistrement en cours
    /// </summary>
    float CurrentRecordingDuration { get; }

    /// <summary>
    /// Initialise l'enregistreur avec les paramètres spécifiés
    /// </summary>
    Task<bool> InitializeAsync(AudioRecordingSettings settings);

    /// <summary>
    /// Démarre l'enregistrement vocal
    /// </summary>
    Task<bool> StartRecordingAsync(string outputFilePath);

    /// <summary>
    /// Arrête l'enregistrement en cours
    /// </summary>
    Task<AudioRecordingResult> StopRecordingAsync();

    /// <summary>
    /// Annule l'enregistrement en cours sans sauvegarder
    /// </summary>
    Task<bool> CancelRecordingAsync();

    /// <summary>
    /// Vérifie les permissions d'accès au microphone
    /// </summary>
    Task<MicrophonePermissionStatus> CheckMicrophonePermissionsAsync();

    /// <summary>
    /// Demande les permissions d'accès au microphone
    /// </summary>
    Task<bool> RequestMicrophonePermissionsAsync();

    /// <summary>
    /// Événement déclenché lors du changement d'état
    /// </summary>
    event Action<RecordingState> OnRecordingStateChanged;

    /// <summary>
    /// Événement déclenché lors d'erreurs d'enregistrement
    /// </summary>
    event Action<string> OnRecordingError;

    /// <summary>
    /// Événement déclenché pendant l'enregistrement avec le niveau audio
    /// </summary>
    event Action<float> OnAudioLevelChanged;
}

/// <summary>
/// États possibles de l'enregistrement
/// </summary>
public enum RecordingState
{
    Idle,
    Initializing,
    Ready,
    Recording,
    Processing,
    Error
}

/// <summary>
/// Statut des permissions microphone
/// </summary>
public enum MicrophonePermissionStatus
{
    Granted,
    Denied,
    Unknown,
    NotRequested
}

/// <summary>
/// Paramètres de configuration pour l'enregistrement audio
/// </summary>
[Serializable]
public class AudioRecordingSettings
{
    public int SampleRate = 44100;
    public int Channels = 1; // Mono pour voix
    public AudioFormat Format = AudioFormat.WAV;
    public float MaxRecordingTime = 300f; // 5 minutes max
    public float SilenceThreshold = 0.01f; // Seuil pour détection silence
    public int DeviceIndex = 0; // Index du device microphone
}

/// <summary>
/// Formats audio supportés
/// </summary>
public enum AudioFormat
{
    WAV,
    MP3
}

/// <summary>
/// Résultat d'un enregistrement terminé
/// </summary>
[Serializable]
public class AudioRecordingResult
{
    public bool Success;
    public string FilePath;
    public float Duration;
    public long FileSize;
    public AudioMetadata Metadata;
    public string ErrorMessage;
}

/// <summary>
/// Métadonnées d'un fichier audio
/// </summary>
[Serializable]
public class AudioMetadata
{
    public int SampleRate;
    public int Channels;
    public AudioFormat Format;
    public float PeakAmplitude;
    public float RMSAmplitude;
}