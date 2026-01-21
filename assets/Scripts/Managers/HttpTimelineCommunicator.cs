using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// Implémentation HTTP du communicateur timeline
/// Utilise UnityWebRequest pour communiquer avec le backend Python
/// Note: Pour production, remplacer par WebSocket pour temps réel
/// </summary>
public class HttpTimelineCommunicator : MonoBehaviour, ITimelineCommunicator
{
    private string backendUrl;
    private bool isConnected;

    public event Action<TimelineMetadata> OnTimelineUpdated;
    public event Action<string> OnCommunicationError;

    private void Awake()
    {
        // Assurer que l'objet persiste entre les scènes
        DontDestroyOnLoad(gameObject);
    }

    public async Task<bool> ConnectAsync(string url)
    {
        backendUrl = url.TrimEnd('/');

        try
        {
            // Test de connexion simple
            using (UnityWebRequest request = UnityWebRequest.Get($"{backendUrl}/health"))
            {
                var operation = request.SendWebRequest();
                while (!operation.isDone) { await Task.Yield(); }

                if (request.result == UnityWebRequest.Result.Success)
                {
                    isConnected = true;
                    return true;
                }
                else
                {
                    OnCommunicationError?.Invoke($"Connection failed: {request.error}");
                    return false;
                }
            }
        }
        catch (Exception ex)
        {
            OnCommunicationError?.Invoke($"Connection error: {ex.Message}");
            return false;
        }
    }

    public async Task DisconnectAsync()
    {
        isConnected = false;
        backendUrl = null;
    }

    public async Task<TimelineMetadata> GetTimelineMetadataAsync()
    {
        if (!isConnected)
        {
            OnCommunicationError?.Invoke("Not connected to backend");
            return null;
        }

        try
        {
            using (UnityWebRequest request = UnityWebRequest.Get($"{backendUrl}/timeline/metadata"))
            {
                request.SetRequestHeader("Content-Type", "application/json");

                var operation = request.SendWebRequest();
                while (!operation.isDone) { await Task.Yield(); }

                if (request.result == UnityWebRequest.Result.Success)
                {
                    string jsonResponse = request.downloadHandler.text;
                    TimelineMetadata metadata = JsonUtility.FromJson<TimelineMetadata>(jsonResponse);
                    return metadata;
                }
                else
                {
                    OnCommunicationError?.Invoke($"Failed to get timeline metadata: {request.error}");
                    return null;
                }
            }
        }
        catch (Exception ex)
        {
            OnCommunicationError?.Invoke($"Error getting timeline metadata: {ex.Message}");
            return null;
        }
    }

    public async Task<bool> SendAudioRecordingAsync(AudioRecordingData recordingData)
    {
        if (!isConnected)
        {
            OnCommunicationError?.Invoke("Not connected to backend");
            return false;
        }

        try
        {
            string jsonData = JsonUtility.ToJson(recordingData);

            using (UnityWebRequest request = new UnityWebRequest($"{backendUrl}/audio/recording", "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");

                var operation = request.SendWebRequest();
                while (!operation.isDone) { await Task.Yield(); }

                if (request.result == UnityWebRequest.Result.Success)
                {
                    return true;
                }
                else
                {
                    OnCommunicationError?.Invoke($"Failed to send audio recording: {request.error}");
                    return false;
                }
            }
        }
        catch (Exception ex)
        {
            OnCommunicationError?.Invoke($"Error sending audio recording: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> UpdateAudioSyncPointsAsync(List<AudioSyncPoint> syncPoints)
    {
        if (!isConnected)
        {
            OnCommunicationError?.Invoke("Not connected to backend");
            return false;
        }

        try
        {
            // Créer un wrapper pour la sérialisation
            var syncPointsWrapper = new AudioSyncPointsWrapper { syncPoints = syncPoints };
            string jsonData = JsonUtility.ToJson(syncPointsWrapper);

            using (UnityWebRequest request = new UnityWebRequest($"{backendUrl}/timeline/audio-sync", "PUT"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");

                var operation = request.SendWebRequest();
                while (!operation.isDone) { await Task.Yield(); }

                if (request.result == UnityWebRequest.Result.Success)
                {
                    return true;
                }
                else
                {
                    OnCommunicationError?.Invoke($"Failed to update audio sync points: {request.error}");
                    return false;
                }
            }
        }
        catch (Exception ex)
        {
            OnCommunicationError?.Invoke($"Error updating audio sync points: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Wrapper pour sérialiser une liste d'AudioSyncPoint
    /// Unity JsonUtility ne gère pas directement les listes génériques
    /// </summary>
    [Serializable]
    private class AudioSyncPointsWrapper
    {
        public List<AudioSyncPoint> syncPoints;
    }
}

