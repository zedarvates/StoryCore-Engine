using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

/// <summary>
/// Gestionnaire des fichiers audio enregistrés avec métadonnées et stockage structuré
/// </summary>
public class AudioFileManager : MonoBehaviour
{
    private string baseAudioPath;

    private void Awake()
    {
        baseAudioPath = Path.Combine(Application.persistentDataPath, "AudioRecordings");
        Directory.CreateDirectory(baseAudioPath);
    }

    /// <summary>
    /// Génère un chemin structuré pour un fichier audio
    /// </summary>
    public string GenerateAudioFilePath(string projectId, string sequenceId, int phraseIndex, AudioFormat format)
    {
        string projectPath = Path.Combine(baseAudioPath, projectId);
        string sequencePath = Path.Combine(projectPath, sequenceId);
        Directory.CreateDirectory(sequencePath);

        string extension = format == AudioFormat.WAV ? ".wav" : ".mp3";
        string fileName = $"phrase_{phraseIndex:D3}_{DateTime.Now:yyyyMMdd_HHmmss}{extension}";
        return Path.Combine(sequencePath, fileName);
    }

    /// <summary>
    /// Sauvegarde les métadonnées d'un enregistrement
    /// </summary>
    public void SaveRecordingMetadata(AudioRecordingData data, string metadataFilePath)
    {
        string json = JsonUtility.ToJson(data, true);
        File.WriteAllText(metadataFilePath, json);
    }

    /// <summary>
    /// Charge les métadonnées d'un enregistrement
    /// </summary>
    public AudioRecordingData LoadRecordingMetadata(string metadataFilePath)
    {
        if (!File.Exists(metadataFilePath)) return null;
        string json = File.ReadAllText(metadataFilePath);
        return JsonUtility.FromJson<AudioRecordingData>(json);
    }

    /// <summary>
    /// Liste tous les enregistrements d'une séquence
    /// </summary>
    public List<AudioRecordingData> GetSequenceRecordings(string projectId, string sequenceId)
    {
        string sequencePath = Path.Combine(baseAudioPath, projectId, sequenceId);
        if (!Directory.Exists(sequencePath)) return new List<AudioRecordingData>();

        var recordings = new List<AudioRecordingData>();
        string[] metadataFiles = Directory.GetFiles(sequencePath, "*.meta");

        foreach (string metaFile in metadataFiles)
        {
            var data = LoadRecordingMetadata(metaFile);
            if (data != null) recordings.Add(data);
        }

        return recordings;
    }

    /// <summary>
    /// Nettoie les anciens fichiers (politique de rétention)
    /// </summary>
    public void CleanupOldFiles(int daysToKeep)
    {
        DateTime cutoff = DateTime.Now.AddDays(-daysToKeep);
        string[] allFiles = Directory.GetFiles(baseAudioPath, "*.*", SearchOption.AllDirectories);

        foreach (string file in allFiles)
        {
            if (File.GetLastWriteTime(file) < cutoff)
            {
                try { File.Delete(file); } catch { /* Ignore errors */ }
            }
        }
    }
}