package com.storycore.voice;

import javax.sound.sampled.AudioFileFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Enregistrement audio WAV avec gestion threadée pour performance.
 */
public final class AudioRecorder {
    private final MicrophoneAccess microphone;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile boolean recording = false;
    private Future<?> recordingTask;

    public AudioRecorder(MicrophoneAccess microphone) {
        this.microphone = microphone;
    }

    public void startRecording(Path outputPath) throws IOException {
        if (recording) {
            throw new IllegalStateException("Déjà en enregistrement");
        }

        recording = true;
        microphone.open();

        recordingTask = executor.submit(() -> {
            try {
                recordToFile(outputPath);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
    }

    public void stopRecording() {
        recording = false;
        microphone.close();
        if (recordingTask != null) {
            recordingTask.cancel(true);
        }
    }

    public boolean isRecording() {
        return recording;
    }

    private void recordToFile(Path outputPath) throws IOException {
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[1024];

        while (recording) {
            int bytesRead = microphone.read(buffer);
            if (bytesRead > 0) {
                baos.write(buffer, 0, bytesRead);
            }
        }

        byte[] audioData = baos.toByteArray();
        ByteArrayInputStream bais = new ByteArrayInputStream(audioData);
        AudioInputStream ais = new AudioInputStream(bais, microphone.getFormat(), audioData.length / microphone.getFormat().getFrameSize());

        try {
            AudioSystem.write(ais, AudioFileFormat.Type.WAVE, outputPath.toFile());
        } finally {
            ais.close();
            bais.close();
            baos.close();
        }
    }

    public void shutdown() {
        executor.shutdown();
    }
}