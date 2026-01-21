using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// Implémentation Unity de l'enregistreur audio utilisant UnityEngine.Microphone
/// Gère l'enregistrement temps réel et la sauvegarde en WAV/MP3
/// </summary>
public class UnityAudioRecorder : MonoBehaviour, IAudioRecorder
{
    private RecordingState currentState = RecordingState.Idle;
    private AudioRecordingSettings settings;
    private AudioClip recordingClip;
    private string currentOutputPath;
    private float recordingStartTime;
    private Coroutine recordingCoroutine;
    private float currentAudioLevel;

    public RecordingState State => currentState;
    public float CurrentRecordingDuration => recordingClip != null && State == RecordingState.Recording
        ? Time.time - recordingStartTime : 0f;

    public event Action<RecordingState> OnRecordingStateChanged;
    public event Action<string> OnRecordingError;
    public event Action<float> OnAudioLevelChanged;

    private void Awake()
    {
        // Assurer que l'objet persiste
        DontDestroyOnLoad(gameObject);
    }

    private void Update()
    {
        // Mettre à jour le niveau audio pendant l'enregistrement
        if (State == RecordingState.Recording && recordingClip != null)
        {
            UpdateAudioLevel();
        }
    }

    public async Task<bool> InitializeAsync(AudioRecordingSettings settings)
    {
        try
        {
            SetState(RecordingState.Initializing);

            this.settings = settings ?? new AudioRecordingSettings();

            // Vérifier les devices microphone disponibles
            if (Microphone.devices.Length == 0)
            {
                OnRecordingError?.Invoke("No microphone devices found");
                SetState(RecordingState.Error);
                return false;
            }

            // Valider l'index du device
            if (settings.DeviceIndex >= Microphone.devices.Length)
            {
                settings.DeviceIndex = 0; // Fallback au device par défaut
            }

            SetState(RecordingState.Ready);
            return true;
        }
        catch (Exception ex)
        {
            OnRecordingError?.Invoke($"Initialization failed: {ex.Message}");
            SetState(RecordingState.Error);
            return false;
        }
    }

    public async Task<bool> StartRecordingAsync(string outputFilePath)
    {
        if (State != RecordingState.Ready)
        {
            OnRecordingError?.Invoke("Recorder not ready. Call InitializeAsync first.");
            return false;
        }

        if (string.IsNullOrEmpty(outputFilePath))
        {
            OnRecordingError?.Invoke("Output file path cannot be empty");
            return false;
        }

        try
        {
            currentOutputPath = outputFilePath;

            // Créer le répertoire si nécessaire
            string directory = Path.GetDirectoryName(outputFilePath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            SetState(RecordingState.Recording);

            // Démarrer l'enregistrement Unity
            recordingClip = Microphone.Start(
                Microphone.devices[settings.DeviceIndex],
                false, // loop
                Mathf.CeilToInt(settings.MaxRecordingTime),
                settings.SampleRate
            );

            recordingStartTime = Time.time;

            // Démarrer la coroutine de surveillance
            recordingCoroutine = StartCoroutine(MonitorRecording());

            return true;
        }
        catch (Exception ex)
        {
            OnRecordingError?.Invoke($"Failed to start recording: {ex.Message}");
            SetState(RecordingState.Error);
            return false;
        }
    }

    public async Task<AudioRecordingResult> StopRecordingAsync()
    {
        if (State != RecordingState.Recording)
        {
            return new AudioRecordingResult
            {
                Success = false,
                ErrorMessage = "Not currently recording"
            };
        }

        try
        {
            SetState(RecordingState.Processing);

            // Arrêter la coroutine de surveillance
            if (recordingCoroutine != null)
            {
                StopCoroutine(recordingCoroutine);
                recordingCoroutine = null;
            }

            // Arrêter l'enregistrement microphone
            Microphone.End(Microphone.devices[settings.DeviceIndex]);

            float duration = Time.time - recordingStartTime;

            // Attendre que l'AudioClip soit prêt (petit délai)
            await Task.Delay(100);

            // Sauvegarder le fichier
            bool saveSuccess = await SaveRecordingAsync(currentOutputPath, duration);

            if (saveSuccess)
            {
                // Calculer les métadonnées
                var metadata = CalculateMetadata(recordingClip);

                SetState(RecordingState.Idle);

                return new AudioRecordingResult
                {
                    Success = true,
                    FilePath = currentOutputPath,
                    Duration = duration,
                    FileSize = new FileInfo(currentOutputPath).Length,
                    Metadata = metadata
                };
            }
            else
            {
                SetState(RecordingState.Error);
                return new AudioRecordingResult
                {
                    Success = false,
                    ErrorMessage = "Failed to save recording"
                };
            }
        }
        catch (Exception ex)
        {
            SetState(RecordingState.Error);
            return new AudioRecordingResult
            {
                Success = false,
                ErrorMessage = $"Stop recording failed: {ex.Message}"
            };
        }
    }

    public async Task<bool> CancelRecordingAsync()
    {
        if (State != RecordingState.Recording)
        {
            return false;
        }

        try
        {
            // Arrêter la coroutine
            if (recordingCoroutine != null)
            {
                StopCoroutine(recordingCoroutine);
                recordingCoroutine = null;
            }

            // Arrêter l'enregistrement
            Microphone.End(Microphone.devices[settings.DeviceIndex]);

            SetState(RecordingState.Idle);
            return true;
        }
        catch (Exception ex)
        {
            OnRecordingError?.Invoke($"Cancel recording failed: {ex.Message}");
            SetState(RecordingState.Error);
            return false;
        }
    }

    public async Task<MicrophonePermissionStatus> CheckMicrophonePermissionsAsync()
    {
        // Unity gère automatiquement les permissions sur la plupart des plateformes
        // Vérifier simplement si des devices sont disponibles
        if (Microphone.devices.Length == 0)
        {
            return MicrophonePermissionStatus.Denied;
        }

        // Tester un enregistrement court pour vérifier les permissions
        try
        {
            var testClip = Microphone.Start(Microphone.devices[0], false, 1, 44100);
            if (testClip != null)
            {
                Microphone.End(Microphone.devices[0]);
                return MicrophonePermissionStatus.Granted;
            }
        }
        catch
        {
            // Ignore l'exception, considérer comme refusé
        }

        return MicrophonePermissionStatus.Denied;
    }

    public async Task<bool> RequestMicrophonePermissionsAsync()
    {
        // Sur Unity, les permissions sont demandées automatiquement
        // Essayer de démarrer/arrêter un enregistrement pour déclencher la demande
        try
        {
            var testClip = Microphone.Start(Microphone.devices[0], false, 1, 44100);
            await Task.Delay(100);
            Microphone.End(Microphone.devices[0]);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private void SetState(RecordingState newState)
    {
        if (currentState != newState)
        {
            currentState = newState;
            OnRecordingStateChanged?.Invoke(newState);
        }
    }

    private IEnumerator MonitorRecording()
    {
        while (State == RecordingState.Recording)
        {
            // Vérifier les timeouts
            if (Time.time - recordingStartTime >= settings.MaxRecordingTime)
            {
                OnRecordingError?.Invoke("Recording timeout reached");
                yield break;
            }

            yield return new WaitForSeconds(0.1f);
        }
    }

    private void UpdateAudioLevel()
    {
        if (recordingClip != null)
        {
            float[] samples = new float[128];
            recordingClip.GetData(samples, recordingClip.frequency * Mathf.FloorToInt(Time.time - recordingStartTime));

            float sum = 0f;
            for (int i = 0; i < samples.Length; i++)
            {
                sum += samples[i] * samples[i];
            }

            currentAudioLevel = Mathf.Sqrt(sum / samples.Length);
            OnAudioLevelChanged?.Invoke(currentAudioLevel);
        }
    }

    private async Task<bool> SaveRecordingAsync(string filePath, float duration)
    {
        try
        {
            if (settings.Format == AudioFormat.WAV)
            {
                return SaveAsWAV(filePath, recordingClip, duration);
            }
            else if (settings.Format == AudioFormat.MP3)
            {
                return await SaveAsMP3Async(filePath, recordingClip, duration);
            }
            else
            {
                OnRecordingError?.Invoke("Unsupported audio format");
                return false;
            }
        }
        catch (Exception ex)
        {
            OnRecordingError?.Invoke($"Save failed: {ex.Message}");
            return false;
        }
    }

    private bool SaveAsWAV(string filePath, AudioClip clip, float duration)
    {
        if (clip == null)
        {
            OnRecordingError?.Invoke("No audio clip to save");
            return false;
        }

        // Obtenir les samples
        int sampleCount = Mathf.FloorToInt(duration * clip.frequency * clip.channels);
        float[] samples = new float[sampleCount];
        clip.GetData(samples, 0);

        // Convertir en WAV
        byte[] wavData = ConvertToWAV(samples, clip.frequency, clip.channels);
        File.WriteAllBytes(filePath, wavData);

        return true;
    }

    private async Task<bool> SaveAsMP3Async(string filePath, AudioClip clip, float duration)
    {
        // Pour MP3, nous sauvegardons d'abord en WAV puis convertissons
        // Note: Conversion MP3 nécessiterait une bibliothèque externe en production
        // Ici nous sauvegardons en WAV avec extension .mp3 (temporaire)

        string tempWavPath = filePath + ".temp.wav";
        bool wavSaved = SaveAsWAV(tempWavPath, clip, duration);

        if (!wavSaved) return false;

        try
        {
            // Simulation de conversion MP3 (remplacer par vraie conversion en production)
            File.Move(tempWavPath, filePath);
            return true;
        }
        catch (Exception ex)
        {
            OnRecordingError?.Invoke($"MP3 conversion failed: {ex.Message}");
            return false;
        }
    }

    private byte[] ConvertToWAV(float[] samples, int sampleRate, int channels)
    {
        // Implémentation basique de conversion WAV
        // Header WAV standard
        int byteRate = sampleRate * channels * 2; // 16-bit
        int dataSize = samples.Length * 2;
        int fileSize = 36 + dataSize;

        using (MemoryStream stream = new MemoryStream())
        using (BinaryWriter writer = new BinaryWriter(stream))
        {
            // RIFF header
            writer.Write("RIFF".ToCharArray());
            writer.Write(fileSize);
            writer.Write("WAVE".ToCharArray());

            // Format chunk
            writer.Write("fmt ".ToCharArray());
            writer.Write(16); // Chunk size
            writer.Write((short)1); // Audio format (PCM)
            writer.Write((short)channels);
            writer.Write(sampleRate);
            writer.Write(byteRate);
            writer.Write((short)(channels * 2)); // Block align
            writer.Write((short)16); // Bits per sample

            // Data chunk
            writer.Write("data".ToCharArray());
            writer.Write(dataSize);

            // Convertir samples float à 16-bit PCM
            foreach (float sample in samples)
            {
                short pcmSample = (short)(sample * short.MaxValue);
                writer.Write(pcmSample);
            }

            return stream.ToArray();
        }
    }

    private AudioMetadata CalculateMetadata(AudioClip clip)
    {
        float[] samples = new float[clip.samples];
        clip.GetData(samples, 0);

        float peak = 0f;
        float sumSquares = 0f;

        foreach (float sample in samples)
        {
            float absSample = Math.Abs(sample);
            if (absSample > peak) peak = absSample;
            sumSquares += sample * sample;
        }

        return new AudioMetadata
        {
            SampleRate = clip.frequency,
            Channels = clip.channels,
            Format = settings.Format,
            PeakAmplitude = peak,
            RMSAmplitude = Mathf.Sqrt(sumSquares / samples.Length)
        };
    }
}