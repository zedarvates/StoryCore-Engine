package com.storycore.voice;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Système principal enregistrement vocal phrase par phrase en Java 3D.
 */
public final class VoiceRecordingSystem {
    private final MicrophoneAccess microphone;
    private final AudioRecorder recorder;
    private final AudioFileManager fileManager;
    private final VoiceHttpClient httpClient;
    private final PhraseSyncManager syncManager;
    private final UI3DPrompt uiPrompt;

    public VoiceRecordingSystem(String backendUrl, Path audioBaseDir) throws Exception {
        this.microphone = new MicrophoneAccess();
        this.recorder = new AudioRecorder(microphone);
        this.fileManager = new AudioFileManager(audioBaseDir);
        this.httpClient = new VoiceHttpClient(backendUrl);
        this.syncManager = new PhraseSyncManager(httpClient);
        this.uiPrompt = new UI3DPrompt();
        this.uiPrompt.init();
    }

    public void startPhraseRecording(String phraseId, String phraseText) throws IOException {
        uiPrompt.setPhrase(phraseText);
        uiPrompt.show();

        Path audioPath = fileManager.generateAudioFilePath(phraseId, "wav");
        double startTime = System.currentTimeMillis() / 1000.0;

        recorder.startRecording(audioPath);

        // Ici logique pour arrêter enregistrement (à implémenter avec input utilisateur)
    }

    public void stopPhraseRecording(String phraseId) throws Exception {
        recorder.stopRecording();
        uiPrompt.hide();

        double endTime = System.currentTimeMillis() / 1000.0;
        Path audioPath = fileManager.generateAudioFilePath(phraseId, "wav"); // Récupérer vrai path

        syncManager.syncPhraseRecording(phraseId, 0.0, endTime - (System.currentTimeMillis() / 1000.0), audioPath.toString());
    }

    public void shutdown() {
        recorder.shutdown();
        uiPrompt.cleanup();
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.out.println("Usage: VoiceRecordingSystem <backend-url> <audio-dir>");
            return;
        }

        String backendUrl = args[0];
        Path audioDir = Paths.get(args[1]);

        VoiceRecordingSystem system = new VoiceRecordingSystem(backendUrl, audioDir);

        // Test basique
        system.startPhraseRecording("test-phrase", "Dites cette phrase");
        Thread.sleep(2000); // Simuler enregistrement 2s
        system.stopPhraseRecording("test-phrase");

        system.shutdown();
    }
}